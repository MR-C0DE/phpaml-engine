import {releaseLocalReferences} from './core/php-references.js';
import {prepareInstructionModules} from './modules/runtime.js';
import {declareFunction} from './core/php-functions.js';
import {prepareEval} from './core/php-eval.js';
import {assignTarget} from './core/value.js';
import {executeFlow, controlSignal} from './control-flow.js';
import {restoreArrayMetadata, releaseArrays, ownArray, clonePhp, snapshotPhp, validatePhpValue, validateStateReferences} from './core/php-arrays.js';
import {executeFile} from './files-runtime.js';
import {request} from './browser-api.js';
export {request} from './browser-api.js';
export const matches = (state, action, eventData = null) => {
    const current = Object.hasOwn(action, 'left') ? resolveData(action.left, state, eventData) : readPath(state, action.state);
    const expected = resolveData(action.value, state, eventData);
    const leftExpression = Object.hasOwn(action, 'left') ? action.left : {$state: action.state};
    return phpMatches(action.operator, current, expected, resolveType(leftExpression, state, eventData, current), resolveType(action.value, state, eventData, expected));
  };
import {serviceRuntime} from './core/php-static-properties.js';

export const execute = async (root, state, action, trigger = null, executionContext = null) => {
    const modules = prepareInstructionModules(action);
    if (modules) {
      const mountedConfig = rootConfigs.get(root);
      await modules;
      if (mountedConfig && rootConfigs.get(root) !== mountedConfig) return false;
    }
    const config = rootConfigs.get(root);
    if (config?.arrayMetadata && !config.arrayMetadataApplied) {
      for (const [target, descriptor] of Object.entries(config.arrayMetadata)) restoreArrayMetadata(readPath(state, target), descriptor);
      config.arrayMetadataApplied = true;
    }
    const source = action.phpSource || executionContext?.eventData?.source;
    const context = {...(executionContext || {}), eventData: {
      ...(executionContext?.eventData || {}),
      stateTypes: config?.types || executionContext?.eventData?.stateTypes || {},
      valueTypes: config?.valueTypes || executionContext?.eventData?.valueTypes || {},
      source,
      loopBudget: executionContext?.eventData?.loopBudget || {remaining: 10000},
      builtinBudget: executionContext?.eventData?.builtinBudget || {remaining: 1000000},
      builtinMemory: executionContext?.eventData?.builtinMemory || {},
      reportWarning: (warning) => {
        root.dispatchEvent(new CustomEvent('aml:warning', {detail: warning}));
        console.warn(warning.message + (warning.source ? ` [PHP ${warning.source.file}:${warning.source.line}]` : ''));
      },
    }};
    context.eventData.assignState = (target, value, valueType, source = context.eventData.source) => {
      commit(root, state, target, value, {...context, eventData: {...context.eventData, source}, valueType});
      const assigned = readPath(state, target);
      return {value: assigned, kind: rootConfigs.get(root)?.valueTypes?.[target] || valueType};
    };
    try { return await executeInstruction(root, state, action, trigger, context); }
    catch (error) { throw withSource(error, source); }
  };
const executeInstruction = async (root, state, action, trigger = null, executionContext = null) => {
    if (action.type === 'local-scope') {
      const config = rootConfigs.get(root);
      const services = serviceRuntime(config, action);
      await prepareEval({...action, functions: services.functions});
      const evalFunctions = config ? (config.evalFunctions ||= {}) : {};
      const childContext = {...(executionContext || {}), eventData: {
        ...(executionContext?.eventData || {}), locals: Object.create(null), localTypes: Object.create(null),
        stateTypes: rootConfigs.get(root)?.types || {},
        functions: {...services.functions, ...evalFunctions}, evalFunctions,
        classes: services.classes, staticFields: services.fields, objectBudget: {remaining: 10000}, thisObject: null, objectScope: null, calledClass: null,
        localReferences: Object.create(null),
        callBudget: {depth: 0, remaining: 10000},
        functionDeclarations: config?.functionDeclarations || new Set(),
        functionDefinitionIds: config?.functionDefinitionIds || new Map(),
      }};
      if (config) {config.functionDeclarations = childContext.eventData.functionDeclarations; config.functionDefinitionIds = childContext.eventData.functionDefinitionIds;}
      try {return await execute(root, state, action.action, trigger, childContext);} finally {releaseLocalReferences(childContext.eventData); releaseArrays(childContext.eventData.locals);}
    }
    if (action.type === 'local-set') {
      if (!/^v[0-9a-f]+$/.test(action.name) || !executionContext?.eventData?.locals) throw new Error('Invalid frontend local assignment');
      const data = executionContext.eventData;
      const value = resolveData(action.value, state, data);
      const type = resolveType(action.value, state, data, value);
      assignTarget({$local: action.name}, value, type, state, data);
      return;
    }
    if (action.type === 'function-declare') {declareFunction(action.id, executionContext.eventData); return;}
    if (action.type === 'return') {const value = resolveData(action.value, state, executionContext.eventData); return {operation: 'return', value, kind: resolveType(action.value, state, executionContext.eventData, value), hasValue: action.hasValue};}
    if (action.type === 'evaluate') { resolveData(action.value, state, executionContext?.eventData); return; }
    if (action.type === 'loop-control') return (action.levels || 1) === 1 ? action.operation : {operation: action.operation, levels: action.levels};
    if (['loop', 'switch', 'foreach-local', 'destructure', 'try'].includes(action.type)) {
      if (!transactions.has(root) && !hasAsyncAction(action)) return execute(root, state, {type: 'transaction', actions: [action]}, trigger, executionContext);
      return executeFlow(root, state, action, trigger, executionContext);
    }
    if (action.type === 'element-ref') {
      const element = root.querySelector(`[data-aml-ref="${CSS.escape(String(action.ref || ''))}"]`);
      if (!element) throw new Error(`Unknown AML element ref: ${action.ref}`);
      if (!['focus', 'blur', 'select', 'play', 'pause'].includes(action.operation)) throw new Error(`Unsupported AML ref operation: ${action.operation}`);
      if (typeof element[action.operation] !== 'function') throw new Error(`Element ref does not support ${action.operation}`);
      const result = element[action.operation]();
      if (result && typeof result.then === 'function') await result;
      return;
    }
    if (action.type === 'form-state-reset') {
      const form = trigger?.closest?.('form[data-aml-form-state]');
      form?.reset();
      if (form) queueMicrotask(() => form.querySelectorAll('[data-aml-model]').forEach((control) => updateModel(root, state, control)));
      commit(root, state, action.dirty, false, executionContext);
      commit(root, state, action.touched, false, executionContext);
      commit(root, state, action.valid, true, executionContext);
      commit(root, state, action.invalid, false, executionContext);
      commit(root, state, action.submitting, false, executionContext);
      commit(root, state, action.submitted, false, executionContext);
      commit(root, state, action.error, '', executionContext);
      return;
    }
    if (action.type === 'form-state-action') {
      const childContext = executionContext || {};
      commit(root, state, action.submitting, true, executionContext);
      commit(root, state, action.submitted, true, executionContext);
      commit(root, state, action.error, '', executionContext);
      try {
        const result = await execute(root, state, action.action, trigger, childContext);
        if (result?.cancelled) return result;
        root.dispatchEvent(new CustomEvent('aml:form-success', {detail: {action}}));
      } catch (error) {
        commit(root, state, action.error, error?.message || String(error), executionContext);
        root.dispatchEvent(new CustomEvent('aml:form-error', {detail: {action, error}}));
      } finally {
        commit(root, state, action.submitting, false, executionContext);
      }
      return;
    }
    if (action.type === 'action-state') {
      const childContext = executionContext || {};
      commit(root, state, action.pending, true, executionContext);
      commit(root, state, action.success, false, executionContext);
      commit(root, state, action.error, '', executionContext);
      try {
        const result = await execute(root, state, action.action, trigger, childContext);
        if (result?.cancelled) return result;
        commit(root, state, action.success, true, executionContext);
        if (action.onSuccess) await execute(root, state, action.onSuccess, trigger, childContext);
        root.dispatchEvent(new CustomEvent('aml:action-success', {detail: {action}}));
      } catch (error) {
        commit(root, state, action.error, error?.message || String(error), executionContext);
        if (action.onError) await execute(root, state, action.onError, trigger, childContext);
        root.dispatchEvent(new CustomEvent('aml:action-error', {detail: {action, error}}));
      } finally {
        commit(root, state, action.pending, false, executionContext);
        if (action.onFinally) await execute(root, state, action.onFinally, trigger, childContext);
      }
      return;
    }
    if (action.type === 'transaction') {
      const parent = transactions.get(root);
      const context = parent || {changes: new Map(), snapshot: snapshotPhp(state), valueTypes: clone(rootConfigs.get(root)?.valueTypes || {})};
      transactions.set(root, context);
      try {
        for (const child of action.actions || []) {
          const signal = await execute(root, state, child, trigger, executionContext);
          if (controlSignal(signal)) {
            validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
            if (!parent) {
              transactions.delete(root);
              context.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), {...(executionContext || {}), valueType: rootConfigs.get(root)?.valueTypes?.[target]}));
            }
            return signal;
          }
        }
        validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
      } catch (error) {
        if (!parent) {
          transactions.delete(root);
          Object.keys(state).forEach((key) => delete state[key]);
          Object.assign(state, context.snapshot); ownArray(state, '@state', state);
          const config = rootConfigs.get(root);
          if (config) config.valueTypes = context.valueTypes;
          render(root, state);
          root.dispatchEvent(new CustomEvent('aml:transaction-error', {detail: {error, state: clone(state)}}));
        }
        throw error;
      }
      if (!parent) {
        transactions.delete(root);
        context.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), {...(executionContext || {}), valueType: rootConfigs.get(root)?.valueTypes?.[target]}));
        queueMicrotask(() => {
          const detail = {changes: Object.fromEntries(context.changes), state: clone(state)};
          root.dispatchEvent(new CustomEvent('aml:transaction', {detail}));
        });
      }
      return;
    }
    if (action.type === 'sequence') {
      if (!transactions.has(root) && !hasAsyncAction(action)) {
        return await execute(root, state, {type: 'transaction', actions: action.actions || []}, trigger, executionContext);
      }
      for (const child of action.actions || []) {
        const signal = await execute(root, state, child, trigger, executionContext);
        if (controlSignal(signal)) return signal;
      }
      return;
    }
    if (action.type === 'foreach') {
      const collection = typeof action.source === 'string'
        ? readPath(state, action.source)
        : resolveData(action.source, state, executionContext?.eventData);
      const entries = Array.isArray(collection)
        ? collection.map((value, key) => [key, value])
        : collection && typeof collection === 'object'
          ? Object.entries(collection)
          : [];
      const limit = Math.max(1, Math.min(10_000, Number(action.limit || 1000)));
      if (entries.length > limit) throw new Error(`AML foreach exceeds its safe limit of ${limit} iterations`);
      for (const [key, value] of entries) {
        const childContext = {
          ...(executionContext || {}),
          eventData: {
            ...(executionContext?.eventData || {}),
            loop: {
              ...(executionContext?.eventData?.loop || {}),
              [action.value]: value,
              ...(action.key ? {[action.key]: key} : {}),
            },
          },
        };
        const signal = await execute(root, state, action.action, trigger, childContext);
        if (signal === 'break') break;
        if (signal === 'continue') continue;
      }
      return;
    }
    if (action.type === 'condition') {
      const selected = matches(state, action, executionContext?.eventData) ? action.then : action.otherwise;
      if (selected) return await execute(root, state, selected, trigger, executionContext);
      return;
    }
    if (action.type === 'console') {
      if (action.level === 'echo') {
        console.log((action.values || []).map((node) => {const value = resolveData(node, state, executionContext.eventData); return phpString(value, resolveType(node, state, executionContext.eventData, value), executionContext.eventData);}).join(''));
        return;
      }
      if (action.level === 'dump') {
        const data = executionContext.eventData;
        const values = (action.values || []).map((node) => {const value = resolveData(node, state, data); return {value, kind: resolveType(node, state, data, value)};});
        console.log(values.map(({value, kind}) => phpDump(value, kind, 0, undefined, data)).join(''));
        return;
      }
      const method = action.level === 'warn' ? 'warn' : action.level === 'error' ? 'error' : 'log';
      console[method](...resolveData(action.values || [], state, executionContext?.eventData));
      return;
    }
    if (action.type === 'navigate') await navigate(action.destination, !action.replace, root);
    else if (action.type === 'api') await request(root, state, action, trigger, executionContext);
    else if (action.type === 'file') return await executeFile(root, state, action, trigger, executionContext);
    else apply(root, state, action, executionContext);
  };
import { rootConfigs, transactions } from './context.js';
import { clone, readPath } from './core/state.js';
import { apply, commit, resolveData } from './state-runtime.js';
import { hasAsyncAction } from './core/action-analysis.js';
import { render } from './rendering.js';
import { navigate } from './navigation.js';
import { updateModel } from './forms-runtime.js';

import { resolveType } from './core/value.js';
import { phpDump, phpString } from './core/php-values.js';

import { withSource } from './core/diagnostics.js';

import { phpMatches } from './core/php-operators.js';
