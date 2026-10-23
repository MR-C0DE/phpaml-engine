export const updateModel = (root, state, control) => {
    const target = control.dataset.amlModel;
    if (!target) return;
    if (control.type === 'radio' && !control.checked) return;
    const raw = control.type === 'file'
      ? [...(control.files || [])].map((file) => ({name: file.name, size: file.size, type: file.type, lastModified: file.lastModified}))
      : control.matches('select[multiple]') ? [...control.selectedOptions].map(option => option.value)
      : (control.type === 'checkbox' ? control.checked : control.value);
    const declared = rootConfigs.get(root)?.types?.[target];
    const type = ['int', 'float', 'bool', 'string', 'array'].includes(declared) ? declared
      : control.dataset.amlModelType || (Array.isArray(raw) ? 'array' : control.type === 'checkbox' ? 'bool' : control.type === 'number' ? 'float' : 'string');
    const value = coerce(type, raw);
    try { commit(root, state, target, value); }
    catch (error) {
      const previous = readPath(state, target);
      if (control.type === 'checkbox') control.checked = Boolean(previous);
      else if (control.type !== 'file') control.value = previous ?? '';
      root.dispatchEvent(new CustomEvent('aml:error', {detail: {error, control, target}}));
      console.error(error);
    }
  };
const validationErrors = new WeakMap();
let validationId = 0;
export const showValidation = (control, message) => {
    const base = control.dataset.amlModel || control.name || 'field';
    let error = validationErrors.get(control);
    const describedBy = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    control.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (!message) {
      if (error) describedBy.delete(error.id);
      if (describedBy.size) control.setAttribute('aria-describedby', [...describedBy].join(' ')); else control.removeAttribute('aria-describedby');
      error?.remove();
      validationErrors.delete(control);
      return true;
    }
    if (!error) {
      error = document.createElement('small');
      do { error.id = `aml-error-${base.replace(/[^a-zA-Z0-9_-]/g, '-')}-${++validationId}`; } while (document.getElementById(error.id));
      error.dataset.amlValidationFor = base;
      error.setAttribute('role', 'alert');
      validationErrors.set(control, error);
      control.insertAdjacentElement('afterend', error);
    }
    describedBy.add(error.id);
    control.setAttribute('aria-describedby', [...describedBy].join(' '));
    error.textContent = message;
    return false;
  };
export const validateControl = (control) => showValidation(control, validationMessage(control));
export const validateForm = (form) => {
    let valid = true;
    form.querySelectorAll('input,select,textarea').forEach((control) => { if (!validateControl(control)) valid = false; });
    if (!valid) form.querySelector('[aria-invalid="true"]:not(:disabled)')?.focus();
    return valid;
  };
import { rootConfigs } from './context.js';
import { coerce, readPath } from './core/state.js';
import { commit } from './state-runtime.js';
import { validationMessage } from './validation.js';

export {preserveForm, restoreForm, validateRemote, scheduleRemoteValidation} from './browser-forms.js';
