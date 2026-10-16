export const hasAsyncAction = (action) => {
  if (!action) return false;
  if (action.type === 'try') return hasAsyncAction(action.action) || hasAsyncAction(action.finally) || (action.catches || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === 'local-scope') return hasAsyncAction(action.action);
  if (action.type === 'api' || action.type === 'file') return true;
  if (action.type === 'action-state') return hasAsyncAction(action.action);
  if (action.type === 'form-state-action') return hasAsyncAction(action.action);
  if (action.type === 'sequence' || action.type === 'transaction') return (action.actions || []).some(hasAsyncAction);
  if (action.type === 'condition') return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
  if (action.type === 'loop') return [action.init, action.update, action.action].some(hasAsyncAction);
  if (action.type === 'switch') return (action.cases || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === 'foreach-local') return hasAsyncAction(action.action);
  if (action.type === 'foreach') return hasAsyncAction(action.action);
  return false;
};
