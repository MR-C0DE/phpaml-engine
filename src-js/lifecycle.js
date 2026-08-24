import { stateHistories } from './context.js';
import { clone } from './core/state.js';

export const remember = (root, state, reason = 'update') => {
  const limit = Math.max(0, Math.min(100, Number.parseInt(root.dataset.amlHistory || '0', 10) || 0));
  if (limit === 0) return;
  const history = stateHistories.get(root) || [];
  history.push({at: Date.now(), reason, state: clone(state)});
  if (history.length > limit) history.splice(0, history.length - limit);
  stateHistories.set(root, history);
};

export const lifecycle = (root, phase, detail = {}) => {
  root.dispatchEvent(new CustomEvent(`aml:${phase}`, {detail}));
  root.querySelectorAll('[data-aml-component]').forEach((component) => {
    component.dispatchEvent(new CustomEvent(`aml:${phase}`, {detail: {...detail, component: component.dataset.amlComponent}}));
  });
};
