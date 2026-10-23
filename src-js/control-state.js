// Keep independent owners (visibility, reactive rules and asynchronous work)
// from undoing each other's disabled state. Entries follow the DOM node lifetime.
const controls = new WeakMap();
const pending = new WeakMap();
const stateFor = node => {
  if (!controls.has(node)) controls.set(node, {initial: Boolean(node.disabled), rule: null, reasons: new Set()});
  return controls.get(node);
};
const applyDisabled = (node, entry) => {
  const disabled = (entry.rule ?? entry.initial) || entry.reasons.size > 0;
  node.disabled = disabled;
  if (entry.rule !== null || node.hasAttribute('aria-disabled')) node.setAttribute('aria-disabled', String(disabled));
};
export const setDisabledRule = (node, disabled) => {
  const entry = stateFor(node); entry.rule = disabled; applyDisabled(node, entry);
};
export const setDisabledReason = (node, owner, disabled) => {
  const entry = stateFor(node);
  if (disabled) entry.reasons.add(owner); else entry.reasons.delete(owner);
  applyDisabled(node, entry);
};

export const setBoundText = (node, text) => {
  // A binding directly on a busy button must update its retained content too.
  (pending.get(node)?.content || node).textContent = text;
};

export const markBusy = trigger => {
  if (!trigger) return () => {};
  let entry = pending.get(trigger);
  if (!entry) {
    entry = {count: 0, aria: trigger.getAttribute('aria-busy'), content: null, label: null};
    pending.set(trigger, entry);
    if (trigger.tagName === 'BUTTON') {
      setDisabledReason(trigger, entry, true);
      if (trigger.hasAttribute('data-aml-loading-label')) {
        // Retain the original nodes in the DOM so bindings continue updating
        // and icons, element refs and listeners survive restoration.
        entry.content = document.createElement('span'); entry.content.hidden = true;
        entry.content.append(...trigger.childNodes);
        entry.label = document.createTextNode(trigger.getAttribute('data-aml-loading-label'));
        trigger.append(entry.content, entry.label);
      }
    }
    trigger.setAttribute('aria-busy', 'true');
  }
  entry.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--entry.count) return;
    pending.delete(trigger);
    if (entry.aria === null) trigger.removeAttribute('aria-busy'); else trigger.setAttribute('aria-busy', entry.aria);
    if (trigger.tagName === 'BUTTON') setDisabledReason(trigger, entry, false);
    if (entry.content) { entry.label.remove(); entry.content.replaceWith(...entry.content.childNodes); }
  };
};
