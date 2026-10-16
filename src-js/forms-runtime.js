export const updateModel = (root, state, control) => {
    const target = control.dataset.amlModel;
    if (!target) return;
    const raw = control.type === 'file'
      ? [...(control.files || [])].map((file) => ({name: file.name, size: file.size, type: file.type, lastModified: file.lastModified}))
      : (control.type === 'checkbox' ? control.checked : control.value);
    const declared = rootConfigs.get(root)?.types?.[target];
    const type = ['int', 'float', 'bool', 'string', 'array'].includes(declared) ? declared
      : control.dataset.amlModelType || (control.type === 'checkbox' ? 'bool' : control.type === 'number' ? 'float' : 'string');
    const value = coerce(type, raw);
    commit(root, state, target, value);
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
export const validateForm = (form) => {
    let valid = true;
    form.querySelectorAll('[data-aml-validate]:not([disabled])').forEach((control) => { if (!validateControl(control)) valid = false; });
    if (!valid) form.querySelector('[aria-invalid="true"]')?.focus();
    return valid;
  };
import { rootConfigs } from './context.js';
import { coerce } from './core/state.js';
import { commit } from './state-runtime.js';
import { validationMessage } from './validation.js';

export {preserveForm, restoreForm, validateRemote, scheduleRemoteValidation} from './browser-forms.js';
