export const updateModel = (root, state, control) => {
    const target = control.dataset.amlModel;
    if (!target) return;
    const raw = control.type === 'file'
      ? [...(control.files || [])].map((file) => ({name: file.name, size: file.size, type: file.type, lastModified: file.lastModified}))
      : (control.type === 'checkbox' ? control.checked : control.value);
    const type = rootConfigs.get(root)?.types?.[target] || 'string';
    const value = coerce(type, raw);
    commit(root, state, target, value);
  };
export const preserveForm = (form) => {
    const values = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (value instanceof File) continue;
      if (Object.prototype.hasOwnProperty.call(values, name)) values[name] = Array.isArray(values[name]) ? [...values[name], value] : [values[name], value];
      else values[name] = value;
    }
    [...form.querySelectorAll('input[type="checkbox"][name]')].forEach((control) => {
      if (!Object.prototype.hasOwnProperty.call(values, control.name)) values[control.name] = false;
    });
    try { sessionStorage.setItem(`phpaml.form.${form.dataset.amlFormPreserve}`, JSON.stringify(values)); }
    catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
export const restoreForm = (form) => {
    try {
      const saved = sessionStorage.getItem(`phpaml.form.${form.dataset.amlFormPreserve}`);
      if (!saved) return;
      const values = JSON.parse(saved);
      const positions = {};
      [...form.elements].forEach((control) => {
        if (!control.name || !Object.prototype.hasOwnProperty.call(values, control.name) || control.type === 'file') return;
        const stored = values[control.name]; const list = Array.isArray(stored) ? stored : [stored];
        if (control.type === 'checkbox') control.checked = stored === true || list.map(String).includes(control.value);
        else if (control.type === 'radio') control.checked = list.map(String).includes(control.value);
        else if (control.matches('select[multiple]')) [...control.options].forEach((option) => option.selected = list.map(String).includes(option.value));
        else { const index = positions[control.name] || 0; control.value = list[Math.min(index, list.length - 1)] ?? ''; positions[control.name] = index + 1; }
        control.dispatchEvent(new Event('input', {bubbles: true}));
      });
    } catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
export const showValidation = (control, message) => {
    const base = control.dataset.amlModel || control.name || 'field';
    const id = `aml-error-${base.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
    let error = control.parentElement?.querySelector(`:scope > [data-aml-validation-for="${CSS.escape(base)}"]`);
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!message) {
      if (control.getAttribute('aria-describedby') === id) control.removeAttribute('aria-describedby');
      error?.remove();
      return true;
    }
    control.setAttribute('aria-describedby', id);
    if (!error) {
      error = document.createElement('small');
      error.id = id;
      error.dataset.amlValidationFor = base;
      error.setAttribute('role', 'alert');
      control.insertAdjacentElement('afterend', error);
    }
    error.textContent = message;
    return false;
  };
export const validateControl = (control) => showValidation(control, validationMessage(control));
export const validateRemote = async (root, state, control) => {
    if (!control.dataset.amlValidateApi || !validateControl(control)) return !control.matches('[aria-invalid="true"]');
    const config = JSON.parse(control.dataset.amlValidateApi);
    const action = config.request;
    const data = resolveData(action.data || {}, state);
    const url = new URL(action.url, location.origin);
    if (url.origin !== location.origin) return showValidation(control, 'Validation API must remain same-origin.');
    validationControllers.get(control)?.abort();
    const controller = new AbortController();
    validationControllers.set(control, controller);
    control.setAttribute('aria-busy', 'true');
    const options = prepareApiRequest(url, action, data, controller.signal, '', 'validation');
    try {
      const response = await fetch(url, options);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || `Validation failed: ${response.status}`);
      return showValidation(control, result.valid === true ? '' : (result.message || config.message));
    } catch (error) {
      if (error.name === 'AbortError') return false;
      return showValidation(control, error.message || config.message);
    } finally {
      if (validationControllers.get(control) === controller) {
        validationControllers.delete(control);
        control.removeAttribute('aria-busy');
      }
    }
  };
export const scheduleRemoteValidation = (root, state, control) => {
    if (!control.dataset.amlValidateApi || !validateControl(control)) return;
    clearTimeout(validationTimers.get(control));
    const config = JSON.parse(control.dataset.amlValidateApi);
    validationTimers.set(control, setTimeout(() => validateRemote(root, state, control), Number(config.debounce ?? 400)));
  };
export const validateForm = (form) => {
    let valid = true;
    form.querySelectorAll('[data-aml-validate]:not([disabled])').forEach((control) => { if (!validateControl(control)) valid = false; });
    if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  };
import { rootConfigs, validationControllers, validationTimers } from './context.js';
import { coerce } from './core/state.js';
import { commit, resolveData } from './state-runtime.js';
import { prepareApiRequest } from './http.js';
import { validationMessage } from './validation.js';
