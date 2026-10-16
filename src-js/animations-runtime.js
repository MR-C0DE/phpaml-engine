export const animateIn = (node) => {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const source = node.closest('[data-aml-transition]') || (node.matches?.('[data-aml-transition]') ? node : null);
    if (!source || typeof node.animate !== 'function') return;
    const duration = Number(source.dataset.amlTransitionDuration || 180);
    const name = source.dataset.amlTransition || 'fade';
    const from = name === 'slide' ? {opacity: 0, transform: 'translateY(10px)'}
      : (name === 'scale' ? {opacity: 0, transform: 'scale(.97)'} : {opacity: 0});
    node.animate([from, {opacity: 1, transform: 'none'}], {duration, easing: 'ease-out'});
  };

export const animateNavigation = (replacement) => {
      replacement?.animate?.(
        [{opacity: .82, transform: 'translateY(4px)'}, {opacity: 1, transform: 'none'}],
        {duration: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160, easing: 'ease-out'},
      );
};
