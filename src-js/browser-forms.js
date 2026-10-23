import {validationControllers, validationTimers} from './context.js';
import {resolveData} from './state-runtime.js';
import {prepareApiRequest} from './http.js';
import {validateControl, showValidation} from './forms-runtime.js';

const draftControls = form => {
    const controls = [...form.elements].filter(control => control.name && control.matches('input,select,textarea'));
    const excluded = new Set(controls.filter(control => {
      const autocomplete = (control.getAttribute('autocomplete') || form.getAttribute('autocomplete') || '').toLowerCase().split(/\s+/);
      return ['password', 'hidden', 'file', 'submit', 'reset', 'button', 'image'].includes(control.type)
        || control.matches(':disabled')
        || autocomplete.some(token => ['off', 'current-password', 'new-password', 'one-time-code'].includes(token) || token.startsWith('cc-'));
    }).map(control => control.name));
    // A sensitive field excludes the whole name, including duplicate controls.
    return controls.filter(control => !excluded.has(control.name));
  };

export const preserveForm = (form) => {
    const controls = draftControls(form), allowed = new Set(controls.map(control => control.name));
    const values = Object.create(null);
    for (const [name, value] of new FormData(form).entries()) {
      if (value instanceof File || !allowed.has(name)) continue;
      if (Object.prototype.hasOwnProperty.call(values, name)) values[name] = Array.isArray(values[name]) ? [...values[name], value] : [values[name], value];
      else values[name] = value;
    }
    controls.filter(control => control.type === 'checkbox').forEach((control) => {
      if (!Object.prototype.hasOwnProperty.call(values, control.name)) values[control.name] = false;
    });
    try { sessionStorage.setItem(`phpaml.form.${form.dataset.amlFormPreserve}`, JSON.stringify(values)); }
    catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
export const restoreForm = (form) => {
    try {
      const saved = sessionStorage.getItem(`phpaml.form.${form.dataset.amlFormPreserve}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError('Invalid form draft.');
      const controls = draftControls(form), allowed = new Set(controls.map(control => control.name));
      const values = Object.fromEntries(Object.entries(parsed).filter(([name]) => allowed.has(name)));
      // Remove sensitive values left by an older runtime before restoring anything.
      sessionStorage.setItem(`phpaml.form.${form.dataset.amlFormPreserve}`, JSON.stringify(values));
      const positions = Object.create(null);
      controls.forEach((control) => {
        if (!Object.prototype.hasOwnProperty.call(values, control.name)) return;
        const stored = values[control.name]; const list = Array.isArray(stored) ? stored : [stored];
        if (control.type === 'checkbox') control.checked = stored === true || list.map(String).includes(control.value);
        else if (control.type === 'radio') control.checked = list.map(String).includes(control.value);
        else if (control.matches('select[multiple]')) [...control.options].forEach((option) => option.selected = list.map(String).includes(option.value));
        else { const index = positions[control.name] || 0; control.value = list[Math.min(index, list.length - 1)] ?? ''; positions[control.name] = index + 1; }
        control.dispatchEvent(new Event('input', {bubbles: true}));
      });
    } catch (error) { form.dispatchEvent(new CustomEvent('aml:form-preserve-error', {detail: {error}})); }
  };
export const validateRemote = async (root, state, control) => {
    if (control.willValidate === false || control.matches(':disabled')) return true;
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
    if (control.willValidate === false || control.matches(':disabled')) return;
    if (!control.dataset.amlValidateApi || !validateControl(control)) return;
    clearTimeout(validationTimers.get(control));
    const config = JSON.parse(control.dataset.amlValidateApi);
    validationTimers.set(control, setTimeout(() => validateRemote(root, state, control), Number(config.debounce ?? 400)));
  };
