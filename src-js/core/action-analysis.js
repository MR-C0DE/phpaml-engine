export const hasAsyncAction = (action) => {
  if (!action) return false;
  if (action.type === 'api') return true;
  if (action.type === 'action-state') return hasAsyncAction(action.action);
  if (action.type === 'form-state-action') return hasAsyncAction(action.action);
  if (action.type === 'sequence' || action.type === 'transaction') return (action.actions || []).some(hasAsyncAction);
  if (action.type === 'condition') return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
  if (action.type === 'foreach') return hasAsyncAction(action.action);
  return false;
};
