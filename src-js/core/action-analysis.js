export const hasAsyncAction = (action) => {
  if (!action) return false;
  if (action.type === 'api') return true;
  if (action.type === 'sequence' || action.type === 'transaction') return (action.actions || []).some(hasAsyncAction);
  if (action.type === 'condition') return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
  return false;
};
