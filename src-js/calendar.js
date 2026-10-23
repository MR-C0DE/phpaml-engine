// Civil dates deliberately use UTC arithmetic, never local timestamp offsets.
const DAY = 86400000;
const calendars = new WeakMap();
export const civilDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0); date.setUTCFullYear(year, month - 1, day);
  return year >= 1 && year <= 9999 && date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
};
const iso = date => date && date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999
  ? date.toISOString().slice(0, 10) : null;
export const moveCalendarDay = (value, count) => {
  const date = civilDate(value); return date ? iso(new Date(date.getTime() + count * DAY)) : null;
};
export const moveCalendarMonth = (value, count) => {
  const date = civilDate(value); if (!date) return null;
  const month = date.getUTCFullYear() * 12 + date.getUTCMonth() + count;
  const year = Math.floor(month / 12); if (year < 1 || year > 9999) return null;
  const last = new Date(0); last.setUTCFullYear(year, month % 12 + 1, 0);
  const result = new Date(0); result.setUTCFullYear(year, month % 12, Math.min(date.getUTCDate(), last.getUTCDate()));
  return iso(result);
};
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const inputOf = calendar => calendar.querySelector(':scope > input[data-aml-calendar-input]');
const limits = input => ({min: civilDate(input.min) ? input.min : '0001-01-01', max: civilDate(input.max) ? input.max : '9999-12-31'});
const clamp = (value, input) => { const {min, max} = limits(input); return value < min ? min : value > max ? max : value; };
const selectable = (value, input) => {
  const date = civilDate(value); if (!date) return false;
  const {min, max} = limits(input);
  if (value < min || value > max) return false;
  if (input.step === 'any') return true;
  const step = Number(input.step) > 0 ? Number(input.step) : 1;
  const base = civilDate(input.min) || civilDate(input.getAttribute('value')) || civilDate('1970-01-01');
  const steps = (date - base) / DAY / step;
  return Math.abs(steps - Math.round(steps)) < 1e-8;
};
const monthChoices = (value, input) => {
  if (!value) return [];
  const first = value.slice(0, 7) + '-01', result = [];
  for (let day = first; day && day.slice(0, 7) === first.slice(0, 7); day = moveCalendarDay(day, 1)) {
    if (selectable(day, input)) result.push(day);
  }
  return result;
};
const node = (tag, text, attributes = {}) => {
  const element = document.createElement(tag);
  if (text !== null) element.textContent = text;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};

const draw = (calendar, focus = false) => {
  const input = inputOf(calendar), panel = calendar.querySelector(':scope > [data-aml-calendar-panel]');
  if (!input || !panel) return;
  calendar.hidden = input.hidden;
  const configuration = JSON.parse(calendar.dataset.amlCalendar);
  let state = calendars.get(calendar);
  const selected = civilDate(input.value) ? input.value : '';
  if (!state) { state = {selected, date: clamp(selected || today(), input), signature: ''}; calendars.set(calendar, state); }
  if (state.selected !== selected) { state.selected = selected; state.date = clamp(selected || today(), input); }
  state.date = clamp(state.date, input);
  const disabled = input.matches(':disabled') || input.readOnly;
  if (!selectable(state.date, input)) {
    const available = monthChoices(state.date, input);
    if (available.length) state.date = available.find(day => day >= state.date) || available[available.length - 1];
  }
  const signature = JSON.stringify([state.date, selected, disabled, input.min, input.max, input.step, configuration]);
  if (state.signature === signature && !focus) return;
  state.signature = signature;
  const focusInside = panel.contains(document.activeElement);
  const focusedMove = typeof focus === 'string' ? focus : !focus && document.activeElement?.dataset?.amlCalendarMove;
  const locale = configuration.locale || 'en', firstDay = configuration.firstDayOfWeek ?? 1;
  const french = locale.toLowerCase().startsWith('fr');
  const format = options => new Intl.DateTimeFormat(locale, {timeZone: 'UTC', ...options});
  const month = format({month: 'long', year: 'numeric'}).format(civilDate(state.date));
  const shortWeekday = format({weekday: 'short'}), longWeekday = format({weekday: 'long'});
  const fullDate = format({weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
  // Keep the live region mounted so month changes can be announced.
  const header = panel.querySelector(':scope > .aml-calendar-header') || node('div', null, {class: 'aml-calendar-header'});
  const previous = header.querySelector('[data-aml-calendar-move="-1"]') || node('button', '‹', {type: 'button', 'data-aml-calendar-move': '-1'});
  const next = header.querySelector('[data-aml-calendar-move="1"]') || node('button', '›', {type: 'button', 'data-aml-calendar-move': '1'});
  previous.setAttribute('aria-label', french ? 'Mois précédent' : 'Previous month');
  next.setAttribute('aria-label', french ? 'Mois suivant' : 'Next month');
  const {min, max} = limits(input);
  const previousMonth = moveCalendarMonth(state.date, -1), nextMonth = moveCalendarMonth(state.date, 1);
  previous.disabled = disabled || !previousMonth || previousMonth.slice(0, 7) < min.slice(0, 7);
  next.disabled = disabled || !nextMonth || nextMonth.slice(0, 7) > max.slice(0, 7);
  const monthLabel = header.querySelector('.aml-calendar-month') || node('span', null, {'aria-live': 'polite', 'aria-atomic': 'true', class: 'aml-calendar-month'});
  if (!header.childElementCount) header.append(previous, monthLabel, next);
  if (!header.parentElement) panel.append(header);
  if (monthLabel.textContent !== month) monthLabel.textContent = month;
  const table = node('table', null, {role: 'grid', 'aria-label': month, class: 'aml-calendar-grid'});
  const headings = node('tr', null);
  for (let i = 0; i < 7; i++) {
    const date = civilDate(moveCalendarDay('2024-01-07', (firstDay + i) % 7));
    headings.append(node('th', shortWeekday.format(date), {scope: 'col', abbr: longWeekday.format(date)}));
  }
  const head = node('thead', null); head.append(headings); table.append(head);
  const body = node('tbody', null), first = state.date.slice(0, 7) + '-01';
  const offset = (civilDate(first).getUTCDay() - firstDay + 7) % 7;
  const currentDate = today();
  for (let row = 0; row < 6; row++) {
    const tr = node('tr', null);
    for (let column = 0; column < 7; column++) {
      const date = moveCalendarDay(first, row * 7 + column - offset), cell = node('td', null);
      if (date && date.slice(0, 7) === first.slice(0, 7)) {
        cell.setAttribute('aria-selected', date === selected ? 'true' : 'false');
        const button = node('button', String(Number(date.slice(-2))), {type: 'button', 'data-aml-calendar-day': date,
          'aria-label': fullDate.format(civilDate(date)),
          tabindex: date === state.date && !disabled ? '0' : '-1'});
        button.disabled = disabled || !selectable(date, input);
        if (date === currentDate) button.setAttribute('aria-current', 'date');
        cell.append(button);
      }
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  const oldTable = panel.querySelector(':scope > .aml-calendar-grid');
  if (oldTable) oldTable.replaceWith(table); else panel.append(table);
  panel.hidden = false;
  if (focus || focusInside) {
    const headerButton = focusedMove && panel.querySelector(`button[data-aml-calendar-move="${focusedMove}"]:not(:disabled)`);
    (headerButton || panel.querySelector(`button[data-aml-calendar-day="${state.date}"]:not(:disabled)`))?.focus();
  }
};

export const renderCalendars = root => root.querySelectorAll('[data-aml-calendar]').forEach(calendar => draw(calendar));
export const calendarClick = (root, event) => {
  const button = event.target.closest('[data-aml-calendar-day],[data-aml-calendar-move]');
  const calendar = button?.closest('[data-aml-calendar]');
  if (!calendar || !root.contains(calendar)) return false;
  event.preventDefault();
  const input = inputOf(calendar), state = calendars.get(calendar);
  if (!input || !state || button.disabled || input.matches(':disabled') || input.readOnly) return true;
  if (button.dataset.amlCalendarDay) {
    const date = button.dataset.amlCalendarDay;
    if (!selectable(date, input)) return true;
    if (input.value !== date) {
      input.value = date;
      input.dispatchEvent(new Event('input', {bubbles: true}));
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }
  } else {
    state.date = moveCalendarMonth(state.date, Number(button.dataset.amlCalendarMove)) || state.date;
  }
  draw(calendar, button.dataset.amlCalendarMove || true);
  return true;
};
export const calendarKey = (root, event) => {
  const button = event.target.closest('[data-aml-calendar-day]'), calendar = button?.closest('[data-aml-calendar]');
  if (!calendar || !root.contains(calendar) || event.altKey || event.ctrlKey || event.metaKey) return false;
  const input = inputOf(calendar), state = calendars.get(calendar);
  if (!state || input.matches(':disabled') || input.readOnly) return false;
  const date = button.dataset.amlCalendarDay;
  const firstDay = JSON.parse(calendar.dataset.amlCalendar).firstDayOfWeek ?? 1;
  const weekday = (civilDate(date).getUTCDay() - firstDay + 7) % 7;
  const days = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday};
  let next;
  if (Object.prototype.hasOwnProperty.call(days, event.key)) next = moveCalendarDay(date, days[event.key]);
  else if (event.key === 'PageUp' || event.key === 'PageDown') next = moveCalendarMonth(date, (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1));
  else return false;
  event.preventDefault();
  if (next) {
    next = clamp(next, input);
    const direction = next < date ? -1 : 1;
    const {min, max} = limits(input);
    for (let count = 0; next && !selectable(next, input) && count < 366; count++) {
      next = moveCalendarDay(next, direction);
      if (next && (next < min || next > max)) { next = null; break; }
    }
    if (next && selectable(next, input)) { state.date = next; draw(calendar, true); }
  }
  return true;
};
