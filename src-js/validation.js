export const validateValue = (rules, value) => {
  for (const rule of rules) {
    if (rule.type === 'required' && String(value ?? '').trim() === '') return rule.message;
    if (rule.type === 'min-length' && String(value ?? '').length > 0 && String(value).length < Number(rule.value)) return rule.message;
    if (rule.type === 'email' && String(value ?? '').length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return rule.message;
  }
  return '';
};

export const validationMessage = (control) => {
  const rules = JSON.parse(control.dataset.amlValidate || '[]');
  const value = control.type === 'checkbox' ? (control.checked ? control.value : '') : control.value;
  return validateValue(rules, value);
};
