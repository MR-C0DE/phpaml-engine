export const validateValue = (rules, value) => {
  for (const rule of rules) {
    if (rule.type === 'required' && String(value ?? '').trim() === '') return rule.message;
    if (rule.type === 'min-length' && String(value ?? '').length > 0 && String(value).length < Number(rule.value)) return rule.message;
    if (rule.type === 'email' && String(value ?? '').length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return rule.message;
  }
  return '';
};

export const validationMessage = (control) => {
  if (control.willValidate === false || control.matches?.(':disabled')) return '';
  const rules = JSON.parse(control.dataset.amlValidate || '[]');
  const checked = control.type === 'radio'
    ? control.checked || (control.name && [...(control.form?.elements || control.ownerDocument.querySelectorAll('input[type="radio"]'))]
      .some(other => other.type === 'radio' && other.name === control.name && other.form === control.form && other.checked))
    : control.checked;
  const value = ['checkbox', 'radio'].includes(control.type) ? (checked ? control.value : '') : control.value;
  return validateValue(rules, value) || (control.validity?.valid === false ? control.validationMessage : '');
};
