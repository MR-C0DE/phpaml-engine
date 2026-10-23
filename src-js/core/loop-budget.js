// Shared by event, function, generator and iterator execution.
export const checkIteration = (context, count, limit = 1000) => {
  const budget = context.loopBudget ||= {remaining: 10000};
  const perLoop = count > limit;
  if (perLoop || --budget.remaining < 0) {
    throw Object.assign(new RangeError(perLoop
      ? `Frontend loop exceeds its safe iteration limit (${limit} iterations per loop).`
      : 'Frontend execution exceeds its total iteration limit (10000 iterations shared by all loops).'), {
      code: 'PHP_LOOP_LIMIT', limitKind: perLoop ? 'loop' : 'execution', limit: perLoop ? limit : 10000,
    });
  }
};
