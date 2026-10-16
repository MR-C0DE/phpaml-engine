import {ENGINE_VERSION} from '../core/version.js';
import {moduleDependencies, requiredModules, scopeRequirements} from './requirements.js';

const installed = new Map(), pending = new Map();
let loaders = null;
export const configureModules = value => {loaders = value;};
export const registerModule = (name, version, exports) => {
  if (version !== ENGINE_VERSION || !Object.hasOwn(moduleDependencies, name)) throw new Error(`Incompatible PHPAML module: ${name}`);
  if (installed.has(name)) throw new Error(`PHPAML module already registered: ${name}`);
  installed.set(name, Object.freeze(exports));
};
export const moduleExport = (name, operation, optional = false) => {
  const implementation = installed.get(name)?.[operation];
  if (implementation !== undefined || optional) return implementation;
  throw Object.assign(new Error(`PHPAML module ${name} must load before ${operation}`), {code: 'AML_MODULE_MISSING', module: name});
};
const load = name => {
  if (installed.has(name)) return Promise.resolve();
  if (pending.has(name)) return pending.get(name);
  if (!loaders || !Object.hasOwn(loaders, name)) return Promise.reject(new Error(`Unknown PHPAML module: ${name}`));
  const promise = Promise.all(moduleDependencies[name].map(load)).then(() => loaders[name]()).then(() => {
    if (!installed.has(name)) throw new Error(`PHPAML module did not register: ${name}`);
  }).catch(cause => {
    pending.delete(name);
    throw Object.assign(new Error(`Unable to load PHPAML module ${name}`, {cause}), {code: 'AML_MODULE_LOAD', module: name});
  });
  pending.set(name, promise);
  return promise;
};
export const prepareModules = requirements => {
  if (!loaders) return null; // The existing complete runtime remains synchronous.
  const missing = requirements.filter(name => !installed.has(name));
  return missing.length ? Promise.all(missing.map(load)) : null;
};
export const prepareInstructionModules = instruction => loaders ? prepareModules(requiredModules(instruction)) : null;
export const prepareScopeModules = scope => loaders ? prepareModules(scopeRequirements(scope)) : null;
