import {
  arrayEntries,
  assignTarget,
  assignType,
  bindOffsetPattern,
  bindReferenceTarget,
  bindRow,
  checkIteration,
  clone,
  clonePhp,
  coerce,
  declareFunction,
  deletePath,
  destructure,
  destructureReference,
  exceptionFlow,
  foreachEntries,
  isPhpArray,
  ownArray,
  owningTarget,
  pathAffects,
  phpArithmetic,
  phpBool,
  phpDump,
  phpIncrement,
  phpMatches,
  phpString,
  phpType,
  prepareEval,
  readPath,
  recomputeComputed,
  referenceEntries,
  releaseArrays,
  releaseLocalReferences,
  resolveData,
  resolveType,
  resolveWritePath,
  restoreArrayMetadata,
  rowToken,
  safeSegments,
  serviceRuntime,
  snapshotPhp,
  statePathAffects,
  unbindRows,
  validatePhpValue,
  validateStateReferences,
  warn,
  withSource,
  writePath
} from "./chunk-URCPTMHR.js";
import {
  moduleExport,
  prepareInstructionModules,
  prepareModules,
  prepareScopeModules
} from "./chunk-DER6LTKY.js";

// src-js/context.js
var rootStates = /* @__PURE__ */ new WeakMap();
var rootConfigs = /* @__PURE__ */ new WeakMap();
var mountedRoots = /* @__PURE__ */ new Set();
var sharedState = /* @__PURE__ */ Object.create(null);
var sharedTypes = /* @__PURE__ */ Object.create(null);
var sharedValueTypes = /* @__PURE__ */ Object.create(null);
var rootControllers = /* @__PURE__ */ new WeakMap();
var rootCleanups = /* @__PURE__ */ new WeakMap();
var validationTimers2 = /* @__PURE__ */ new WeakMap();
var validationControllers2 = /* @__PURE__ */ new WeakMap();
var transactions = /* @__PURE__ */ new WeakMap();
var stateHistories = /* @__PURE__ */ new WeakMap();
var pendingBatches = /* @__PURE__ */ new WeakMap();
var pendingEffectOrigins = /* @__PURE__ */ new WeakMap();
var effectRuntimes = /* @__PURE__ */ new WeakMap();
var navigationRuntimes = /* @__PURE__ */ new WeakMap();
var toastTimers2 = /* @__PURE__ */ new WeakMap();

// src-js/control-state.js
var controls = /* @__PURE__ */ new WeakMap();
var pending = /* @__PURE__ */ new WeakMap();
var stateFor = (node2) => {
  if (!controls.has(node2)) controls.set(node2, { initial: Boolean(node2.disabled), rule: null, reasons: /* @__PURE__ */ new Set() });
  return controls.get(node2);
};
var applyDisabled = (node2, entry) => {
  const disabled = (entry.rule ?? entry.initial) || entry.reasons.size > 0;
  node2.disabled = disabled;
  if (entry.rule !== null || node2.hasAttribute("aria-disabled")) node2.setAttribute("aria-disabled", String(disabled));
};
var setDisabledRule = (node2, disabled) => {
  const entry = stateFor(node2);
  entry.rule = disabled;
  applyDisabled(node2, entry);
};
var setDisabledReason = (node2, owner, disabled) => {
  const entry = stateFor(node2);
  if (disabled) entry.reasons.add(owner);
  else entry.reasons.delete(owner);
  applyDisabled(node2, entry);
};
var setBoundText = (node2, text) => {
  (pending.get(node2)?.content || node2).textContent = text;
};
var markBusy = (trigger) => {
  if (!trigger) return () => {
  };
  let entry = pending.get(trigger);
  if (!entry) {
    entry = { count: 0, aria: trigger.getAttribute("aria-busy"), content: null, label: null };
    pending.set(trigger, entry);
    if (trigger.tagName === "BUTTON") {
      setDisabledReason(trigger, entry, true);
      if (trigger.hasAttribute("data-aml-loading-label")) {
        entry.content = document.createElement("span");
        entry.content.hidden = true;
        entry.content.append(...trigger.childNodes);
        entry.label = document.createTextNode(trigger.getAttribute("data-aml-loading-label"));
        trigger.append(entry.content, entry.label);
      }
    }
    trigger.setAttribute("aria-busy", "true");
  }
  entry.count++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--entry.count) return;
    pending.delete(trigger);
    if (entry.aria === null) trigger.removeAttribute("aria-busy");
    else trigger.setAttribute("aria-busy", entry.aria);
    if (trigger.tagName === "BUTTON") setDisabledReason(trigger, entry, false);
    if (entry.content) {
      entry.label.remove();
      entry.content.replaceWith(...entry.content.childNodes);
    }
  };
};

// src-js/calendar.js
var DAY = 864e5;
var calendars = /* @__PURE__ */ new WeakMap();
var civilDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return year >= 1 && year <= 9999 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
};
var iso = (date) => date && date.getUTCFullYear() >= 1 && date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 10) : null;
var moveCalendarDay = (value, count) => {
  const date = civilDate(value);
  return date ? iso(new Date(date.getTime() + count * DAY)) : null;
};
var moveCalendarMonth = (value, count) => {
  const date = civilDate(value);
  if (!date) return null;
  const month = date.getUTCFullYear() * 12 + date.getUTCMonth() + count;
  const year = Math.floor(month / 12);
  if (year < 1 || year > 9999) return null;
  const last = /* @__PURE__ */ new Date(0);
  last.setUTCFullYear(year, month % 12 + 1, 0);
  const result = /* @__PURE__ */ new Date(0);
  result.setUTCFullYear(year, month % 12, Math.min(date.getUTCDate(), last.getUTCDate()));
  return iso(result);
};
var today = () => {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
var inputOf = (calendar) => calendar.querySelector(":scope > input[data-aml-calendar-input]");
var limits = (input) => ({ min: civilDate(input.min) ? input.min : "0001-01-01", max: civilDate(input.max) ? input.max : "9999-12-31" });
var clamp = (value, input) => {
  const { min, max } = limits(input);
  return value < min ? min : value > max ? max : value;
};
var selectable = (value, input) => {
  const date = civilDate(value);
  if (!date) return false;
  const { min, max } = limits(input);
  if (value < min || value > max) return false;
  if (input.step === "any") return true;
  const step = Number(input.step) > 0 ? Number(input.step) : 1;
  const base = civilDate(input.min) || civilDate(input.getAttribute("value")) || civilDate("1970-01-01");
  const steps = (date - base) / DAY / step;
  return Math.abs(steps - Math.round(steps)) < 1e-8;
};
var monthChoices = (value, input) => {
  if (!value) return [];
  const first = value.slice(0, 7) + "-01", result = [];
  for (let day = first; day && day.slice(0, 7) === first.slice(0, 7); day = moveCalendarDay(day, 1)) {
    if (selectable(day, input)) result.push(day);
  }
  return result;
};
var node = (tag, text, attributes = {}) => {
  const element = document.createElement(tag);
  if (text !== null) element.textContent = text;
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
};
var draw = (calendar, focus = false) => {
  const input = inputOf(calendar), panel = calendar.querySelector(":scope > [data-aml-calendar-panel]");
  if (!input || !panel) return;
  calendar.hidden = input.hidden;
  const configuration = JSON.parse(calendar.dataset.amlCalendar);
  let state = calendars.get(calendar);
  const selected = civilDate(input.value) ? input.value : "";
  if (!state) {
    state = { selected, date: clamp(selected || today(), input), signature: "" };
    calendars.set(calendar, state);
  }
  if (state.selected !== selected) {
    state.selected = selected;
    state.date = clamp(selected || today(), input);
  }
  state.date = clamp(state.date, input);
  const disabled = input.matches(":disabled") || input.readOnly;
  if (!selectable(state.date, input)) {
    const available = monthChoices(state.date, input);
    if (available.length) state.date = available.find((day) => day >= state.date) || available[available.length - 1];
  }
  const signature = JSON.stringify([state.date, selected, disabled, input.min, input.max, input.step, configuration]);
  if (state.signature === signature && !focus) return;
  state.signature = signature;
  const focusInside = panel.contains(document.activeElement);
  const focusedMove = typeof focus === "string" ? focus : !focus && document.activeElement?.dataset?.amlCalendarMove;
  const locale = configuration.locale || "en", firstDay = configuration.firstDayOfWeek ?? 1;
  const french = locale.toLowerCase().startsWith("fr");
  const format = (options) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options });
  const month = format({ month: "long", year: "numeric" }).format(civilDate(state.date));
  const shortWeekday = format({ weekday: "short" }), longWeekday = format({ weekday: "long" });
  const fullDate = format({ weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const header = panel.querySelector(":scope > .aml-calendar-header") || node("div", null, { class: "aml-calendar-header" });
  const previous = header.querySelector('[data-aml-calendar-move="-1"]') || node("button", "\u2039", { type: "button", "data-aml-calendar-move": "-1" });
  const next = header.querySelector('[data-aml-calendar-move="1"]') || node("button", "\u203A", { type: "button", "data-aml-calendar-move": "1" });
  previous.setAttribute("aria-label", french ? "Mois pr\xE9c\xE9dent" : "Previous month");
  next.setAttribute("aria-label", french ? "Mois suivant" : "Next month");
  const { min, max } = limits(input);
  const previousMonth = moveCalendarMonth(state.date, -1), nextMonth = moveCalendarMonth(state.date, 1);
  previous.disabled = disabled || !previousMonth || previousMonth.slice(0, 7) < min.slice(0, 7);
  next.disabled = disabled || !nextMonth || nextMonth.slice(0, 7) > max.slice(0, 7);
  const monthLabel = header.querySelector(".aml-calendar-month") || node("span", null, { "aria-live": "polite", "aria-atomic": "true", class: "aml-calendar-month" });
  if (!header.childElementCount) header.append(previous, monthLabel, next);
  if (!header.parentElement) panel.append(header);
  if (monthLabel.textContent !== month) monthLabel.textContent = month;
  const table = node("table", null, { role: "grid", "aria-label": month, class: "aml-calendar-grid" });
  const headings = node("tr", null);
  for (let i = 0; i < 7; i++) {
    const date = civilDate(moveCalendarDay("2024-01-07", (firstDay + i) % 7));
    headings.append(node("th", shortWeekday.format(date), { scope: "col", abbr: longWeekday.format(date) }));
  }
  const head = node("thead", null);
  head.append(headings);
  table.append(head);
  const body = node("tbody", null), first = state.date.slice(0, 7) + "-01";
  const offset = (civilDate(first).getUTCDay() - firstDay + 7) % 7;
  const currentDate = today();
  for (let row = 0; row < 6; row++) {
    const tr = node("tr", null);
    for (let column = 0; column < 7; column++) {
      const date = moveCalendarDay(first, row * 7 + column - offset), cell = node("td", null);
      if (date && date.slice(0, 7) === first.slice(0, 7)) {
        cell.setAttribute("aria-selected", date === selected ? "true" : "false");
        const button = node("button", String(Number(date.slice(-2))), {
          type: "button",
          "data-aml-calendar-day": date,
          "aria-label": fullDate.format(civilDate(date)),
          tabindex: date === state.date && !disabled ? "0" : "-1"
        });
        button.disabled = disabled || !selectable(date, input);
        if (date === currentDate) button.setAttribute("aria-current", "date");
        cell.append(button);
      }
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  const oldTable = panel.querySelector(":scope > .aml-calendar-grid");
  if (oldTable) oldTable.replaceWith(table);
  else panel.append(table);
  panel.hidden = false;
  if (focus || focusInside) {
    const headerButton = focusedMove && panel.querySelector(`button[data-aml-calendar-move="${focusedMove}"]:not(:disabled)`);
    (headerButton || panel.querySelector(`button[data-aml-calendar-day="${state.date}"]:not(:disabled)`))?.focus();
  }
};
var renderCalendars = (root) => root.querySelectorAll("[data-aml-calendar]").forEach((calendar) => draw(calendar));
var calendarClick = (root, event) => {
  const button = event.target.closest("[data-aml-calendar-day],[data-aml-calendar-move]");
  const calendar = button?.closest("[data-aml-calendar]");
  if (!calendar || !root.contains(calendar)) return false;
  event.preventDefault();
  const input = inputOf(calendar), state = calendars.get(calendar);
  if (!input || !state || button.disabled || input.matches(":disabled") || input.readOnly) return true;
  if (button.dataset.amlCalendarDay) {
    const date = button.dataset.amlCalendarDay;
    if (!selectable(date, input)) return true;
    if (input.value !== date) {
      input.value = date;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else {
    state.date = moveCalendarMonth(state.date, Number(button.dataset.amlCalendarMove)) || state.date;
  }
  draw(calendar, button.dataset.amlCalendarMove || true);
  return true;
};
var calendarKey = (root, event) => {
  const button = event.target.closest("[data-aml-calendar-day]"), calendar = button?.closest("[data-aml-calendar]");
  if (!calendar || !root.contains(calendar) || event.altKey || event.ctrlKey || event.metaKey) return false;
  const input = inputOf(calendar), state = calendars.get(calendar);
  if (!state || input.matches(":disabled") || input.readOnly) return false;
  const date = button.dataset.amlCalendarDay;
  const firstDay = JSON.parse(calendar.dataset.amlCalendar).firstDayOfWeek ?? 1;
  const weekday = (civilDate(date).getUTCDay() - firstDay + 7) % 7;
  const days = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
  let next;
  if (Object.prototype.hasOwnProperty.call(days, event.key)) next = moveCalendarDay(date, days[event.key]);
  else if (event.key === "PageUp" || event.key === "PageDown") next = moveCalendarMonth(date, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
  else return false;
  event.preventDefault();
  if (next) {
    next = clamp(next, input);
    const direction = next < date ? -1 : 1;
    const { min, max } = limits(input);
    for (let count = 0; next && !selectable(next, input) && count < 366; count++) {
      next = moveCalendarDay(next, direction);
      if (next && (next < min || next > max)) {
        next = null;
        break;
      }
    }
    if (next && selectable(next, input)) {
      state.date = next;
      draw(calendar, true);
    }
  }
  return true;
};

// phpaml-proxy:../browser-storage.js
var persistState = (...args) => moduleExport("browser", "persistState")(...args);
var restorePersisted = (...args) => moduleExport("browser", "restorePersisted", true)?.(...args) ?? null;
var restoreIndexed = (...args) => moduleExport("browser", "restoreIndexed", true)?.(...args) ?? null;
var restoreContexts = (...args) => moduleExport("browser", "restoreContexts", true)?.(...args) ?? null;
var persistContext = (...args) => moduleExport("browser", "persistContext")(...args);

// src-js/list-bindings.js
var bindings = /* @__PURE__ */ new WeakMap();
var errors = /* @__PURE__ */ new WeakMap();
var dependencies = (value, paths = /* @__PURE__ */ new Set()) => {
  if (value && typeof value === "object") {
    if (typeof value.$state === "string") paths.add(value.$state);
    Object.values(value).forEach((child) => dependencies(child, paths));
  }
  return [...paths];
};
var listItems = (list, state, target, context2) => {
  const source = list.dataset.amlListValue;
  if (source === void 0) {
    if (target && list.dataset.amlList && !pathAffects(list.dataset.amlList, target) && !list.dataset.amlList.includes(".rows.")) return null;
    if (list.dataset.amlList === void 0) return null;
    const items = readPath(state, list.dataset.amlList);
    if (list.dataset.amlIlist !== void 0 && !Array.isArray(items)) throw new TypeError("IList expects an indexed array of items.");
    return Array.isArray(items) ? items : [];
  }
  let cached = bindings.get(list);
  if (!cached || cached.source !== source) {
    const expression = JSON.parse(source);
    cached = { source, expression, dependencies: dependencies(expression), initialized: false };
    bindings.set(list, cached);
  }
  if (cached.initialized && target && !cached.dependencies.some((path) => pathAffects(path, target))) return null;
  const value = resolveData(cached.expression, state, { ...context2 });
  if (!isPhpArray(value)) throw new TypeError("A calculated IList must return an array.");
  cached.initialized = true;
  return arrayEntries(value).map(([, item]) => item);
};
var listDependencies = (list) => bindings.get(list)?.dependencies || [];
var listRendered = (list) => {
  errors.delete(list);
};
var reportListError = (scope, list, error) => {
  if (list.dataset.amlListValue === void 0 && list.dataset.amlIlist === void 0) throw error;
  const binding = bindings.get(list);
  error = withSource(error, binding?.expression?.$expression?.right?.source);
  if (errors.get(list) === error.message) return;
  errors.set(list, error.message);
  scope.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, node: list } }));
  console.error(error);
};
var listOptions = (list, state, context2) => {
  if (!list.dataset.amlListOptions) return null;
  const expressions = JSON.parse(list.dataset.amlListOptions);
  const values = Object.fromEntries(Object.entries(expressions).map(([name, expression]) => [name, resolveData(expression, state, { ...context2 })]));
  const markers = ["disc", "circle", "square", "none", "decimal", "decimal-leading-zero", "lower-alpha", "upper-alpha", "lower-latin", "upper-latin", "lower-roman", "upper-roman", "lower-greek", "armenian", "georgian"];
  for (const [name, value] of Object.entries(values)) {
    const valid = name === "type" ? typeof value === "string" && ["unordered", "ordered"].includes(value.trim().toLowerCase()) : name === "start" ? Number.isSafeInteger(value) : name === "reversed" ? typeof value === "boolean" : name === "marker" ? markers.includes(value) : name === "markerPosition" ? ["inside", "outside"].includes(value) : false;
    if (!valid) throw new TypeError("Invalid IList " + name + " value.");
  }
  return values;
};
var applyListOptions = (list, values) => {
  if (!values) return list;
  const tag = values.type === void 0 ? list.localName : values.type.trim().toLowerCase() === "ordered" ? "ol" : "ul";
  const focus = list.contains(document.activeElement) ? document.activeElement : null;
  const selection = focus && typeof focus.selectionStart === "number" ? [focus.selectionStart, focus.selectionEnd] : null;
  if (tag !== list.localName) {
    const replacement = document.createElement(tag);
    for (const attribute of list.attributes) replacement.setAttribute(attribute.name, attribute.value);
    replacement.append(...list.childNodes);
    list.replaceWith(replacement);
    list = replacement;
    if (focus) {
      focus.focus({ preventScroll: true });
      if (selection) focus.setSelectionRange(...selection);
    }
  }
  if (tag === "ol" && values.start !== void 0) {
    if (list.getAttribute("start") !== String(values.start)) list.setAttribute("start", values.start);
  } else list.removeAttribute("start");
  if (list.hasAttribute("reversed") !== (tag === "ol" && values.reversed === true)) list.toggleAttribute("reversed", tag === "ol" && values.reversed === true);
  if (values.marker !== void 0 && list.style.listStyleType !== values.marker) list.style.listStyleType = values.marker;
  if (values.markerPosition !== void 0 && list.style.listStylePosition !== values.markerPosition) list.style.listStylePosition = values.markerPosition;
  return list;
};

// src-js/style-bindings.js
var dimensions = /^(?:(?:min-|max-)?(?:width|height)|(?:margin|padding)(?:-(?:top|right|bottom|left|inline|block)(?:-start|-end)?)?|(?:row-|column-)?gap|top|right|bottom|left|inset|font-size|letter-spacing|word-spacing|text-indent|outline-(?:width|offset)|border(?:-(?:top|right|bottom|left))?-width|border(?:-(?:top|bottom)-(?:left|right))?-radius)$/;
var bindings2 = /* @__PURE__ */ new WeakMap();
var keywords = ["initial", "inherit", "unset", "revert", "revert-layer"];
var normalizeStyleValue = (property, value, rule = "css") => {
  const invalid = (message) => {
    throw new TypeError(`CSS ${property}: ${message}`);
  };
  if (!["string", "number"].includes(typeof value) || typeof value === "number" && !Number.isFinite(value)) invalid("expected a string or finite number");
  if (rule === "iconDimension") {
    const plain = typeof value === "string" ? styleDeclaration(property, value).value.replace(/\/\*.*?\*\//gs, " ").trim() : value;
    const number = typeof plain === "string" && plain.match(/^(-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)(?:[a-zA-Z]+|%)?$/);
    if (typeof plain === "number" ? plain < 0 : number && Number(number[1]) < 0) invalid("icon dimension must not be negative");
  }
  if (["padding", "fontSize", "letterSpacing", "lineHeight"].includes(rule)) {
    if (typeof value !== "number") invalid("expected a number");
    if (rule === "padding") value = Math.max(0, value);
    if (rule === "fontSize" && (value <= 0 || value > 1e3) || rule === "lineHeight" && (value <= 0 || value > 20) || rule === "letterSpacing" && (value < -100 || value > 100)) invalid("out of range");
  }
  if (rule === "fontWeight") {
    value = String(value).toLowerCase();
    if (!["normal", "bold", "bolder", "lighter"].includes(value) && !(/^\d+$/.test(value) && Number(value) >= 100 && Number(value) <= 900 && Number(value) % 100 === 0)) invalid("unknown font weight");
  }
  if (rule === "textAlign") {
    value = String(value).toLowerCase();
    if (!["start", "end", "left", "right", "center", "justify"].includes(value)) invalid("unknown alignment");
  }
  if (rule === "alignment") {
    value = { leading: "flex-start", start: "flex-start", top: "flex-start", center: "center", trailing: "flex-end", end: "flex-end", bottom: "flex-end", stretch: "stretch" }[String(value).toLowerCase()];
    if (!value) invalid("unknown alignment");
  }
  if (rule === "textColor" && value === "") invalid("empty color");
  if (rule !== "raw" && typeof value === "number") value = String(value) + (dimensions.test(property) ? "px" : "");
  value = String(value);
  if (/[;{}<>\x00-\x1F\x7F]/.test(value)) invalid("unsafe value");
  styleDeclaration(property, value);
  return value;
};
var styleDeclaration = (property, value, keyframe = false) => {
  const stack = [];
  let quote = null, priority = null;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "\\") {
      if (++i >= value.length) throw new TypeError("Unclosed CSS escape.");
      continue;
    }
    if (quote !== null) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (value.slice(i, i + 2) === "/*") {
      const end = value.indexOf("*/", i + 2);
      if (end === -1) throw new TypeError("Unclosed CSS comment.");
      i = end + 1;
      continue;
    }
    if (char === "(" || char === "[") stack.push(char);
    if ((char === ")" || char === "]") && stack.pop() !== (char === ")" ? "(" : "[")) throw new TypeError("Unbalanced CSS value.");
    if (char === "!" && !stack.length) priority = i;
  }
  if (quote !== null || stack.length) throw new TypeError("Unbalanced CSS value.");
  const important = priority !== null && /^!\s*important\s*$/i.test(value.slice(priority).replace(/\/\*.*?\*\//gs, " "));
  if (important) value = value.slice(0, priority).trimEnd();
  const plain = value.replace(/\/\*.*?\*\//gs, " ").trim();
  const keyword = keywords.includes(plain.toLowerCase()) ? plain.toLowerCase() : null;
  if (keyframe && keyword !== null && !important) throw new TypeError("Write CSS-wide keywords statically in keyframes; reactive keyframe values require a concrete value.");
  const active = (plain !== "" || property.startsWith("--")) && !(keyframe && important);
  if (active && value === "") value = " ";
  return { value, important: important && active, active, keyword };
};
var dependencies2 = (value, paths = /* @__PURE__ */ new Set()) => {
  if (value && typeof value === "object") {
    if (typeof value.$state === "string") paths.add(value.$state);
    Object.values(value).forEach((child) => dependencies2(child, paths));
  }
  return [...paths];
};
var renderStyles = (scope, state, target, context2) => {
  const nodes = [...scope.querySelectorAll("[data-aml-style-bindings]")];
  if (scope.matches?.("[data-aml-style-bindings]")) nodes.unshift(scope);
  for (const node2 of nodes) {
    const active = new Set((node2.getAttribute("data-aml-style-active") || "").split(/\s+/).filter(Boolean));
    const important = new Set((node2.getAttribute("data-aml-style-important") || "").split(/\s+/).filter(Boolean));
    const source = node2.dataset.amlStyleBindings;
    let cached = bindings2.get(node2);
    if (!cached || cached.source !== source) {
      cached = { source, rules: Object.entries(JSON.parse(source)).map(([variable, rule]) => ({ variable, ...rule, dependencies: dependencies2(rule.value), initialized: false })) };
      bindings2.set(node2, cached);
    }
    for (const binding of cached.rules) {
      if (binding.initialized && target && !binding.dependencies.some((path) => pathAffects(path, target))) continue;
      try {
        const normalized = normalizeStyleValue(binding.property, resolveData(binding.value, state, { ...context2 }), binding.rule);
        const declaration = styleDeclaration(binding.property, normalized, binding.keyframe);
        for (const suffix of ["", ...keywords.map((keyword) => "-" + keyword)]) {
          active.delete(binding.variable + suffix);
          important.delete(binding.variable + suffix);
        }
        const token = binding.variable + (declaration.keyword === null ? "" : "-" + declaration.keyword);
        if (declaration.active && declaration.keyword === null) {
          if (node2.style.getPropertyValue(binding.variable) !== declaration.value) node2.style.setProperty(binding.variable, declaration.value);
        } else node2.style.removeProperty(binding.variable);
        if (declaration.active) active.add(token);
        if (declaration.important) important.add(token);
        binding.initialized = true;
        binding.error = null;
      } catch (error) {
        if (binding.error !== error.message) {
          binding.error = error.message;
          scope.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, node: node2, property: binding.property } }));
          console.error(error);
        }
      }
    }
    for (const [attribute, tokens] of [["data-aml-style-active", active], ["data-aml-style-important", important]]) {
      const value = [...tokens].join(" ");
      if (node2.getAttribute(attribute) !== value) node2.setAttribute(attribute, value);
    }
  }
};

// phpaml-proxy:../animations-runtime.js
var animateIn = (...args) => moduleExport("animations", "animateIn", true)?.(...args) ?? null;
var animateNavigation = (...args) => moduleExport("animations", "animateNavigation")(...args);

// src-js/effects.js
var newEffectRuntime = (id, definition) => ({
  id,
  controllers: /* @__PURE__ */ new Set(),
  debounceTimer: null,
  timer: null,
  listener: null,
  mode: null,
  selfRuns: [],
  disabled: false,
  generation: 0,
  inFlight: false,
  queued: false,
  invoke: null,
  definition,
  hasRun: false,
  lastActivated: 0
});
var eventPayload = (event) => {
  if (!event) return null;
  let detail = null;
  try {
    detail = clone(event.detail ?? null);
  } catch (_) {
  }
  return {
    type: event.type,
    detail,
    key: event.key,
    code: event.code,
    repeat: Boolean(event.repeat),
    button: event.button,
    clientX: event.clientX,
    clientY: event.clientY,
    value: event.target?.value,
    checked: event.target?.checked
  };
};

// src-js/control-flow.js
var controlSignal = (signal) => signal === "break" || signal === "continue" ? { operation: signal, levels: 1 } : signal?.operation === "return" || signal?.operation === "break" || signal?.operation === "continue" ? signal : null;
var outerSignal = (signal) => signal.operation === "return" ? signal : signal.levels === 2 ? signal.operation : { ...signal, levels: signal.levels - 1 };
var bind = (bindings4, source, sourceKind, state, data) => bindOffsetPattern(
  bindings4,
  { value: source, kind: sourceKind },
  (key) => {
    const value = resolveData(key, state, data);
    return { value, kind: resolveType(key, state, data, value) };
  },
  (target, item) => assignTarget(target, item.value, item.kind, state, data),
  data
);
var executeFlow = async (root, state, action, trigger, context2) => {
  const data = context2.eventData;
  const run = (instruction) => execute(root, state, instruction, trigger, context2);
  if (action.type === "try") {
    const flow = exceptionFlow(action, (target, error) => assignTarget(target, error, "object", state, data), data);
    let step = flow.next();
    while (!step.done) {
      try {
        step = flow.next(await run(step.value));
      } catch (error) {
        step = flow.throw(error);
      }
    }
    return step.value;
  }
  if (action.type === "destructure") {
    destructure(action, state, data);
    return;
  }
  if (action.type === "switch") {
    const subject = resolveData(action.value, state, data), kind = resolveType(action.value, state, data, subject);
    let start = -1, fallback = -1;
    for (let index = 0; index < action.cases.length; index++) {
      const branch = action.cases[index];
      if (branch.default) {
        fallback = index;
        continue;
      }
      const candidate = resolveData(branch.value, state, data);
      if (phpMatches("looseEq", subject, candidate, kind, resolveType(branch.value, state, data, candidate))) {
        start = index;
        break;
      }
    }
    if (start < 0) start = fallback;
    for (let index = start; index >= 0 && index < action.cases.length; index++) {
      const signal = controlSignal(await run(action.cases[index].action));
      if (!signal) continue;
      if (signal.operation === "return" || signal.levels > 1) return outerSignal(signal);
      if (signal.operation === "continue") warn(data, "continue targeting switch is equivalent to break; use continue 2 to continue an outer loop");
      break;
    }
    return;
  }
  const limit = Math.max(1, Math.min(1e4, action.limit || 1e3));
  if (action.type === "foreach-local") {
    const patternReference = action.bindings.some((binding) => binding.reference), byReference = action.reference || patternReference;
    const source = byReference ? null : clonePhp(resolveData(action.source, state, data));
    let count2 = 0;
    for (const { key, item, reference } of byReference ? referenceEntries(action.source, state, data, () => checkIteration(data, ++count2, limit)) : foreachEntries(source, !!action.key, data, () => checkIteration(data, ++count2, limit))) {
      if (reference && patternReference) destructureReference(action.bindings, reference, state, data);
      else if (reference) bindReferenceTarget(action.bindings[0].target, reference, state, data);
      else bind(action.bindings, item.value, item.kind, state, data);
      if (action.key) assignTarget(action.key, key.value, key.kind, state, data);
      const signal = controlSignal(await run(action.action));
      if (signal?.operation === "return" || signal?.levels > 1) return outerSignal(signal);
      if (signal?.operation === "break") break;
    }
    return;
  }
  await run(action.init);
  let count = 0;
  const condition = () => {
    let result = true;
    for (const item of action.conditions) result = resolveData(item, state, data);
    return phpBool(result);
  };
  while (action.kind === "do" && count === 0 || condition()) {
    checkIteration(data, ++count, limit);
    const signal = controlSignal(await run(action.action));
    if (signal?.operation === "return" || signal?.levels > 1) return outerSignal(signal);
    if (signal?.operation === "break") break;
    await run(action.update);
  }
};

// phpaml-proxy:../files-runtime.js
var executeFile = (...args) => moduleExport("files", "executeFile")(...args);

// phpaml-proxy:../browser-api.js
var request = (...args) => moduleExport("browser", "request")(...args);

// src-js/core/action-analysis.js
var hasAsyncAction = (action) => {
  if (!action) return false;
  if (action.type === "try") return hasAsyncAction(action.action) || hasAsyncAction(action.finally) || (action.catches || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === "local-scope") return hasAsyncAction(action.action);
  if (action.type === "api" || action.type === "file") return true;
  if (action.type === "action-state") return hasAsyncAction(action.action);
  if (action.type === "form-state-action") return hasAsyncAction(action.action);
  if (action.type === "sequence" || action.type === "transaction") return (action.actions || []).some(hasAsyncAction);
  if (action.type === "condition") return hasAsyncAction(action.then) || hasAsyncAction(action.otherwise);
  if (action.type === "loop") return [action.init, action.update, action.action].some(hasAsyncAction);
  if (action.type === "switch") return (action.cases || []).some((branch) => hasAsyncAction(branch.action));
  if (action.type === "foreach-local") return hasAsyncAction(action.action);
  if (action.type === "foreach") return hasAsyncAction(action.action);
  return false;
};

// src-js/validation.js
var validateValue = (rules, value) => {
  for (const rule of rules) {
    if (rule.type === "required" && String(value ?? "").trim() === "") return rule.message;
    if (rule.type === "min-length" && String(value ?? "").length > 0 && String(value).length < Number(rule.value)) return rule.message;
    if (rule.type === "email" && String(value ?? "").length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return rule.message;
  }
  return "";
};
var validationMessage = (control) => {
  if (control.willValidate === false || control.matches?.(":disabled")) return "";
  const rules = JSON.parse(control.dataset.amlValidate || "[]");
  const checked = control.type === "radio" ? control.checked || control.name && [...control.form?.elements || control.ownerDocument.querySelectorAll('input[type="radio"]')].some((other) => other.type === "radio" && other.name === control.name && other.form === control.form && other.checked) : control.checked;
  const value = ["checkbox", "radio"].includes(control.type) ? checked ? control.value : "" : control.value;
  return validateValue(rules, value) || (control.validity?.valid === false ? control.validationMessage : "");
};

// phpaml-proxy:../browser-forms.js
var preserveForm = (...args) => moduleExport("browser", "preserveForm")(...args);
var restoreForm = (...args) => moduleExport("browser", "restoreForm")(...args);
var validateRemote = (...args) => moduleExport("browser", "validateRemote")(...args);
var scheduleRemoteValidation = (...args) => moduleExport("browser", "scheduleRemoteValidation", true)?.(...args) ?? null;

// src-js/forms-runtime.js
var updateModel = (root, state, control) => {
  const target = control.dataset.amlModel;
  if (!target) return;
  if (control.type === "radio" && !control.checked) return;
  const raw = control.type === "file" ? [...control.files || []].map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })) : control.matches("select[multiple]") ? [...control.selectedOptions].map((option) => option.value) : control.type === "checkbox" ? control.checked : control.value;
  const declared = rootConfigs.get(root)?.types?.[target];
  const type = ["int", "float", "bool", "string", "array"].includes(declared) ? declared : control.dataset.amlModelType || (Array.isArray(raw) ? "array" : control.type === "checkbox" ? "bool" : control.type === "number" ? "float" : "string");
  const value = coerce(type, raw);
  try {
    commit(root, state, target, value);
  } catch (error) {
    const previous = readPath(state, target);
    if (control.type === "checkbox") control.checked = Boolean(previous);
    else if (control.type !== "file") control.value = previous ?? "";
    root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, control, target } }));
    console.error(error);
  }
};
var validationErrors = /* @__PURE__ */ new WeakMap();
var validationId = 0;
var showValidation = (control, message) => {
  const base = control.dataset.amlModel || control.name || "field";
  let error = validationErrors.get(control);
  const describedBy = new Set((control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
  control.setAttribute("aria-invalid", message ? "true" : "false");
  if (!message) {
    if (error) describedBy.delete(error.id);
    if (describedBy.size) control.setAttribute("aria-describedby", [...describedBy].join(" "));
    else control.removeAttribute("aria-describedby");
    error?.remove();
    validationErrors.delete(control);
    return true;
  }
  if (!error) {
    error = document.createElement("small");
    do {
      error.id = `aml-error-${base.replace(/[^a-zA-Z0-9_-]/g, "-")}-${++validationId}`;
    } while (document.getElementById(error.id));
    error.dataset.amlValidationFor = base;
    error.setAttribute("role", "alert");
    validationErrors.set(control, error);
    control.insertAdjacentElement("afterend", error);
  }
  describedBy.add(error.id);
  control.setAttribute("aria-describedby", [...describedBy].join(" "));
  error.textContent = message;
  return false;
};
var validateControl = (control) => showValidation(control, validationMessage(control));
var validateForm = (form) => {
  let valid = true;
  form.querySelectorAll("input,select,textarea").forEach((control) => {
    if (!validateControl(control)) valid = false;
  });
  if (!valid) form.querySelector('[aria-invalid="true"]:not(:disabled)')?.focus();
  return valid;
};

// src-js/actions-runtime.js
var matches = (state, action, eventData = null) => {
  const current = Object.hasOwn(action, "left") ? resolveData(action.left, state, eventData) : readPath(state, action.state);
  const expected = resolveData(action.value, state, eventData);
  const leftExpression = Object.hasOwn(action, "left") ? action.left : { $state: action.state };
  return phpMatches(action.operator, current, expected, resolveType(leftExpression, state, eventData, current), resolveType(action.value, state, eventData, expected));
};
var execute = async (root, state, action, trigger = null, executionContext = null) => {
  const modules = prepareInstructionModules(action);
  if (modules) {
    const mountedConfig = rootConfigs.get(root);
    await modules;
    if (mountedConfig && rootConfigs.get(root) !== mountedConfig) return false;
  }
  const config = rootConfigs.get(root);
  if (config?.arrayMetadata && !config.arrayMetadataApplied) {
    for (const [target, descriptor] of Object.entries(config.arrayMetadata)) restoreArrayMetadata(readPath(state, target), descriptor);
    config.arrayMetadataApplied = true;
  }
  const source = action.phpSource || executionContext?.eventData?.source;
  const context2 = { ...executionContext || {}, eventData: {
    ...executionContext?.eventData || {},
    stateTypes: config?.types || executionContext?.eventData?.stateTypes || {},
    valueTypes: config?.valueTypes || executionContext?.eventData?.valueTypes || {},
    source,
    loopBudget: executionContext?.eventData?.loopBudget || { remaining: 1e4 },
    builtinBudget: executionContext?.eventData?.builtinBudget || { remaining: 1e6 },
    builtinMemory: executionContext?.eventData?.builtinMemory || {},
    reportWarning: (warning) => {
      root.dispatchEvent(new CustomEvent("aml:warning", { detail: warning }));
      console.warn(warning.message + (warning.source ? ` [PHP ${warning.source.file}:${warning.source.line}]` : ""));
    }
  } };
  context2.eventData.assignState = (target, value, valueType, source2 = context2.eventData.source) => {
    commit(root, state, target, value, { ...context2, eventData: { ...context2.eventData, source: source2 }, valueType });
    const assigned = readPath(state, target);
    return { value: assigned, kind: rootConfigs.get(root)?.valueTypes?.[target] || valueType };
  };
  try {
    return await executeInstruction(root, state, action, trigger, context2);
  } catch (error) {
    throw withSource(error, source);
  }
};
var executeInstruction = async (root, state, action, trigger = null, executionContext = null) => {
  if (action.type === "local-scope") {
    const config = rootConfigs.get(root);
    const services = serviceRuntime(config, action);
    await prepareEval({ ...action, functions: services.functions });
    const evalFunctions = config ? config.evalFunctions ||= {} : {};
    const childContext = { ...executionContext || {}, eventData: {
      ...executionContext?.eventData || {},
      locals: /* @__PURE__ */ Object.create(null),
      localTypes: /* @__PURE__ */ Object.create(null),
      stateTypes: rootConfigs.get(root)?.types || {},
      functions: { ...services.functions, ...evalFunctions },
      evalFunctions,
      classes: services.classes,
      staticFields: services.fields,
      objectBudget: { remaining: 1e4 },
      thisObject: null,
      objectScope: null,
      calledClass: null,
      localReferences: /* @__PURE__ */ Object.create(null),
      callBudget: { depth: 0, remaining: 1e4 },
      functionDeclarations: config?.functionDeclarations || /* @__PURE__ */ new Set(),
      functionDefinitionIds: config?.functionDefinitionIds || /* @__PURE__ */ new Map()
    } };
    if (config) {
      config.functionDeclarations = childContext.eventData.functionDeclarations;
      config.functionDefinitionIds = childContext.eventData.functionDefinitionIds;
    }
    try {
      return await execute(root, state, action.action, trigger, childContext);
    } finally {
      releaseLocalReferences(childContext.eventData);
      releaseArrays(childContext.eventData.locals);
    }
  }
  if (action.type === "local-set") {
    if (!/^v[0-9a-f]+$/.test(action.name) || !executionContext?.eventData?.locals) throw new Error("Invalid frontend local assignment");
    const data = executionContext.eventData;
    const value = resolveData(action.value, state, data);
    const type = resolveType(action.value, state, data, value);
    assignTarget({ $local: action.name }, value, type, state, data);
    return;
  }
  if (action.type === "function-declare") {
    declareFunction(action.id, executionContext.eventData);
    return;
  }
  if (action.type === "return") {
    const value = resolveData(action.value, state, executionContext.eventData);
    return { operation: "return", value, kind: resolveType(action.value, state, executionContext.eventData, value), hasValue: action.hasValue };
  }
  if (action.type === "evaluate") {
    resolveData(action.value, state, executionContext?.eventData);
    return;
  }
  if (action.type === "loop-control") return (action.levels || 1) === 1 ? action.operation : { operation: action.operation, levels: action.levels };
  if (["loop", "switch", "foreach-local", "destructure", "try"].includes(action.type)) {
    if (!transactions.has(root) && !hasAsyncAction(action)) return execute(root, state, { type: "transaction", actions: [action] }, trigger, executionContext);
    return executeFlow(root, state, action, trigger, executionContext);
  }
  if (action.type === "element-ref") {
    const element = root.querySelector(`[data-aml-ref="${CSS.escape(String(action.ref || ""))}"]`);
    if (!element) throw new Error(`Unknown AML element ref: ${action.ref}`);
    if (!["focus", "blur", "select", "play", "pause"].includes(action.operation)) throw new Error(`Unsupported AML ref operation: ${action.operation}`);
    if (typeof element[action.operation] !== "function") throw new Error(`Element ref does not support ${action.operation}`);
    const result = element[action.operation]();
    if (result && typeof result.then === "function") await result;
    return;
  }
  if (action.type === "form-state-reset") {
    const form = trigger?.closest?.("form[data-aml-form-state]");
    form?.reset();
    if (form) queueMicrotask(() => form.querySelectorAll("[data-aml-model]").forEach((control) => updateModel(root, state, control)));
    commit(root, state, action.dirty, false, executionContext);
    commit(root, state, action.touched, false, executionContext);
    commit(root, state, action.valid, true, executionContext);
    commit(root, state, action.invalid, false, executionContext);
    commit(root, state, action.submitting, false, executionContext);
    commit(root, state, action.submitted, false, executionContext);
    commit(root, state, action.error, "", executionContext);
    return;
  }
  if (action.type === "form-state-action") {
    const childContext = executionContext || {};
    commit(root, state, action.submitting, true, executionContext);
    commit(root, state, action.submitted, true, executionContext);
    commit(root, state, action.error, "", executionContext);
    try {
      const result = await execute(root, state, action.action, trigger, childContext);
      if (result?.cancelled) return result;
      root.dispatchEvent(new CustomEvent("aml:form-success", { detail: { action } }));
    } catch (error) {
      commit(root, state, action.error, error?.message || String(error), executionContext);
      root.dispatchEvent(new CustomEvent("aml:form-error", { detail: { action, error } }));
    } finally {
      commit(root, state, action.submitting, false, executionContext);
    }
    return;
  }
  if (action.type === "action-state") {
    const childContext = executionContext || {};
    commit(root, state, action.pending, true, executionContext);
    commit(root, state, action.success, false, executionContext);
    commit(root, state, action.error, "", executionContext);
    try {
      const result = await execute(root, state, action.action, trigger, childContext);
      if (result?.cancelled) return result;
      commit(root, state, action.success, true, executionContext);
      if (action.onSuccess) await execute(root, state, action.onSuccess, trigger, childContext);
      root.dispatchEvent(new CustomEvent("aml:action-success", { detail: { action } }));
    } catch (error) {
      commit(root, state, action.error, error?.message || String(error), executionContext);
      if (action.onError) await execute(root, state, action.onError, trigger, childContext);
      root.dispatchEvent(new CustomEvent("aml:action-error", { detail: { action, error } }));
    } finally {
      commit(root, state, action.pending, false, executionContext);
      if (action.onFinally) await execute(root, state, action.onFinally, trigger, childContext);
    }
    return;
  }
  if (action.type === "transaction") {
    const parent = transactions.get(root);
    const context2 = parent || { changes: /* @__PURE__ */ new Map(), snapshot: snapshotPhp(state), valueTypes: clone(rootConfigs.get(root)?.valueTypes || {}) };
    transactions.set(root, context2);
    try {
      for (const child of action.actions || []) {
        const signal = await execute(root, state, child, trigger, executionContext);
        if (controlSignal(signal)) {
          validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
          if (!parent) {
            transactions.delete(root);
            context2.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), { ...executionContext || {}, valueType: rootConfigs.get(root)?.valueTypes?.[target] }));
          }
          return signal;
        }
      }
      validateStateReferences(state, rootConfigs.get(root)?.valueTypes || {});
    } catch (error) {
      if (!parent) {
        transactions.delete(root);
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, context2.snapshot);
        ownArray(state, "@state", state);
        const config = rootConfigs.get(root);
        if (config) config.valueTypes = context2.valueTypes;
        render(root, state);
        root.dispatchEvent(new CustomEvent("aml:transaction-error", { detail: { error, state: clone(state) } }));
      }
      throw error;
    }
    if (!parent) {
      transactions.delete(root);
      context2.changes.forEach((_, target) => commit(root, state, target, readPath(state, target), { ...executionContext || {}, valueType: rootConfigs.get(root)?.valueTypes?.[target] }));
      queueMicrotask(() => {
        const detail = { changes: Object.fromEntries(context2.changes), state: clone(state) };
        root.dispatchEvent(new CustomEvent("aml:transaction", { detail }));
      });
    }
    return;
  }
  if (action.type === "sequence") {
    if (!transactions.has(root) && !hasAsyncAction(action)) {
      return await execute(root, state, { type: "transaction", actions: action.actions || [] }, trigger, executionContext);
    }
    for (const child of action.actions || []) {
      const signal = await execute(root, state, child, trigger, executionContext);
      if (controlSignal(signal)) return signal;
    }
    return;
  }
  if (action.type === "foreach") {
    const collection = typeof action.source === "string" ? readPath(state, action.source) : resolveData(action.source, state, executionContext?.eventData);
    const entries = Array.isArray(collection) ? collection.map((value, key) => [key, value]) : collection && typeof collection === "object" ? Object.entries(collection) : [];
    const limit = Math.max(1, Math.min(1e4, Number(action.limit || 1e3)));
    if (entries.length > limit) throw new Error(`AML foreach exceeds its safe limit of ${limit} iterations`);
    for (const [key, value] of entries) {
      const childContext = {
        ...executionContext || {},
        eventData: {
          ...executionContext?.eventData || {},
          loop: {
            ...executionContext?.eventData?.loop || {},
            [action.value]: value,
            ...action.key ? { [action.key]: key } : {}
          }
        }
      };
      const signal = await execute(root, state, action.action, trigger, childContext);
      if (signal === "break") break;
      if (signal === "continue") continue;
    }
    return;
  }
  if (action.type === "condition") {
    const selected = matches(state, action, executionContext?.eventData) ? action.then : action.otherwise;
    if (selected) return await execute(root, state, selected, trigger, executionContext);
    return;
  }
  if (action.type === "console") {
    if (action.level === "echo") {
      console.log((action.values || []).map((node2) => {
        const value = resolveData(node2, state, executionContext.eventData);
        return phpString(value, resolveType(node2, state, executionContext.eventData, value), executionContext.eventData);
      }).join(""));
      return;
    }
    if (action.level === "dump") {
      const data = executionContext.eventData;
      const values = (action.values || []).map((node2) => {
        const value = resolveData(node2, state, data);
        return { value, kind: resolveType(node2, state, data, value) };
      });
      console.log(values.map(({ value, kind }) => phpDump(value, kind, 0, void 0, data)).join(""));
      return;
    }
    const method = action.level === "warn" ? "warn" : action.level === "error" ? "error" : "log";
    console[method](...resolveData(action.values || [], state, executionContext?.eventData));
    return;
  }
  if (action.type === "navigate") await navigate(action.destination, !action.replace, root);
  else if (action.type === "api") await request(root, state, action, trigger, executionContext);
  else if (action.type === "file") return await executeFile(root, state, action, trigger, executionContext);
  else apply(root, state, action, executionContext);
};

// src-js/effects-runtime.js
var registerEffect = (root, state, id, definition, mounting = false) => {
  const runtimes = effectRuntimes.get(root);
  if (!runtimes) return;
  if (runtimes.has(id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
  runtimes.set(id, newEffectRuntime(id, definition));
  if (!mounting || definition.runOnMount) activateEffect(root, state, id, definition);
};
var cleanupEffect = (root, id, reason = "rerun") => {
  const runtime = effectRuntimes.get(root)?.get(id);
  if (!runtime) return;
  runtime.generation++;
  if (runtime.debounceTimer) clearTimeout(runtime.debounceTimer);
  if (runtime.timer) runtime.mode === "interval" ? clearInterval(runtime.timer) : clearTimeout(runtime.timer);
  if (runtime.listener) runtime.listener.target.removeEventListener(runtime.listener.event, runtime.listener.handler);
  runtime.controllers.forEach((controller) => controller.abort());
  runtime.controllers.clear();
  runtime.debounceTimer = runtime.timer = runtime.listener = null;
  runtime.queued = false;
  if (runtime.hasRun && runtime.definition.cleanup && rootStates.has(root)) {
    const cleanupAction = runtime.definition.cleanup;
    runtime.hasRun = false;
    execute(root, rootStates.get(root), cleanupAction, null, { owner: runtime, eventData: null }).catch((error) => {
      root.dispatchEvent(new CustomEvent("aml:effect-error", { detail: { id, phase: "cleanup", error } }));
      console.error(error);
    });
  }
  root.dispatchEvent(new CustomEvent("aml:effect-cleanup", { detail: { id, reason } }));
};
var activateEffect = (root, state, id, definition, selfTriggered = false) => {
  const runtimes = effectRuntimes.get(root);
  const runtime = runtimes?.get(id);
  if (!runtime || runtime.disabled) return;
  const activatedAt = Date.now();
  if (Number(definition.throttle || 0) > 0 && activatedAt - runtime.lastActivated < Number(definition.throttle)) return;
  runtime.lastActivated = activatedAt;
  cleanupEffect(root, id);
  const start = () => {
    if (!rootStates.has(root) || runtime.disabled) return;
    const now = Date.now();
    runtime.selfRuns = selfTriggered ? [...runtime.selfRuns.filter((timestamp) => now - timestamp < 6e4), now] : [];
    const rapidRuns = runtime.selfRuns.filter((timestamp) => now - timestamp < 50).length;
    if (rapidRuns > 25 || runtime.selfRuns.length > 60) {
      runtime.disabled = true;
      cleanupEffect(root, id, "cycle");
      root.dispatchEvent(new CustomEvent("aml:effect-cycle", { detail: { id, rapidLimit: 25, sustainedLimit: 60 } }));
      return;
    }
    const run = (event = null) => {
      const strategy = definition.concurrency || "latest";
      if (runtime.inFlight && strategy === "exhaust") return;
      if (runtime.inFlight && strategy === "queue") {
        runtime.queued = true;
        return;
      }
      if (runtime.inFlight && strategy === "latest") {
        runtime.generation++;
        runtime.controllers.forEach((controller) => controller.abort());
        runtime.controllers.clear();
      }
      const generation = runtime.generation;
      runtime.inFlight = true;
      runtime.hasRun = true;
      root.dispatchEvent(new CustomEvent("aml:effect-run", { detail: { id, mode: definition.mode } }));
      execute(root, state, definition.action, null, { owner: runtime, eventData: eventPayload(event) }).catch((error) => {
        if (error?.name === "AbortError") return;
        root.dispatchEvent(new CustomEvent("aml:effect-error", { detail: { id, error } }));
        console.error(error);
      }).finally(() => {
        if (strategy !== "parallel" && runtime.generation !== generation) return;
        runtime.inFlight = false;
        if (runtime.queued) {
          runtime.queued = false;
          queueMicrotask(run);
        }
      });
    };
    runtime.invoke = run;
    runtime.mode = definition.mode;
    runtime.concurrency = definition.concurrency || "latest";
    if (definition.mode === "timeout") runtime.timer = setTimeout(run, Number(definition.delay));
    else if (definition.mode === "interval") runtime.timer = setInterval(run, Number(definition.delay));
    else if (definition.mode === "listener") {
      const target = definition.target === "window" ? window : document;
      const handler = (event) => run(event);
      target.addEventListener(definition.event, handler);
      runtime.listener = { target, event: definition.event, handler };
    } else run();
  };
  if (Number(definition.debounce || 0) > 0) runtime.debounceTimer = setTimeout(start, Number(definition.debounce));
  else start();
};
var runEffects = (root, state, changedTargets = null, mounting = false, origins = /* @__PURE__ */ new Map()) => {
  const effects = rootConfigs.get(root)?.effects || {};
  Object.entries(effects).forEach(([id, definition]) => {
    if (mounting && !definition.runOnMount) return;
    if (!mounting && (!changedTargets || !(definition.dependencies || []).some((dependency) => changedTargets.some((target) => statePathAffects(state, dependency, target))))) return;
    const selfTriggered = !mounting && changedTargets.some((target) => origins.get(target) === id && (definition.dependencies || []).some((dependency) => statePathAffects(state, dependency, target)));
    activateEffect(root, state, id, definition, selfTriggered);
  });
};

// src-js/rendering.js
var dynamicTarget = (target, token) => {
  const segments = safeSegments(target);
  const property = segments.pop();
  return [...segments, "items", token, property].join(".");
};
var rewriteDynamic = (value, mapping) => {
  if (Array.isArray(value)) return value.map((item) => rewriteDynamic(item, mapping));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteDynamic(item, mapping)]));
  if (typeof value !== "string") return value;
  const source = Object.keys(mapping).sort((a, b) => b.length - a.length).find((path) => value === path || value.startsWith(`${path}.`));
  return source ? mapping[source] + value.slice(source.length) : value;
};
var rewriteRow = (node2, mapping) => {
  const walk = (root) => root.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (!attribute.name.startsWith("data-aml-")) continue;
      try {
        const rewrite = (value) => Array.isArray(value) ? value.map(rewrite) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, child]) => [rewriteDynamic(key, mapping), rewrite(child)])) : rewriteDynamic(value, mapping);
        element.setAttribute(attribute.name, JSON.stringify(rewrite(JSON.parse(attribute.value))));
      } catch (_) {
        element.setAttribute(attribute.name, rewriteDynamic(attribute.value, mapping));
      }
    }
    if (element.localName === "template") walk(element.content);
  });
  walk(node2);
};
var trackInitialRow = (node2) => {
  const targets = [], effects = [];
  node2.querySelectorAll("template[data-aml-state]").forEach((manifest) => {
    targets.push(...Object.keys(JSON.parse(manifest.dataset.amlState || "{}")));
    effects.push(...Object.keys(JSON.parse(manifest.dataset.amlStateConfig || "{}").effects || {}));
  });
  node2.dataset.amlDynamicState = JSON.stringify(targets);
  node2.dataset.amlDynamicEffects = JSON.stringify(effects);
};
var releaseServiceScopes = (root, node2) => {
  const scopes = rootConfigs.get(root)?.serviceScopes;
  if (!scopes) return;
  if (node2.matches?.("template[data-aml-service-scope]")) scopes.delete(node2.dataset.amlServiceScope);
  node2.querySelectorAll("template[data-aml-service-scope]").forEach((marker) => scopes.delete(marker.dataset.amlServiceScope));
};
var hydrateDynamicItem = (root, state, node2, key) => {
  const token = rowToken(key);
  const config = rootConfigs.get(root);
  if (!config) return;
  const mapping = {};
  const dynamicEffects = [];
  const dynamicStateTargets = [];
  const all = [];
  const collect = (parent) => parent.querySelectorAll("*").forEach((element) => {
    all.push(element);
    if (element.localName === "template") collect(element.content);
  });
  collect(node2);
  all.filter((element) => element.matches("template[data-aml-state]")).forEach((manifest) => {
    const values = JSON.parse(manifest.dataset.amlState || "{}");
    Object.keys(values).forEach((target) => {
      mapping[target] = dynamicTarget(target, token);
    });
    const addition = JSON.parse(manifest.dataset.amlStateConfig || "{}");
    Object.keys(addition.effects || {}).forEach((id) => {
      const scope = id.split(".").slice(0, -1).join(".");
      if (scope && !mapping[scope]) mapping[scope] = `${scope}.items.${token}`;
    });
  });
  all.forEach((element) => {
    const scope = element.dataset.amlServiceScope || element.dataset.amlFileSource;
    if (scope) mapping[scope] = `${scope}.items.${token}`;
  });
  if (Object.keys(mapping).length === 0) return;
  rewriteRow(node2, mapping);
  node2.querySelectorAll("template[data-aml-state]").forEach((manifest) => {
    const values = JSON.parse(manifest.dataset.amlState || "{}");
    const addition = JSON.parse(manifest.dataset.amlStateConfig || "{}");
    Object.entries(values).forEach(([target, initial]) => {
      dynamicStateTargets.push(target);
      writePath(state, target, initial);
    });
    for (const group of ["shared", "persisted", "types", "typeRules", "valueTypes", "arrayMetadata", "computed", "effects"]) {
      Object.entries(addition[group] || {}).forEach(([target, value]) => {
        if (group === "persisted") value.key += `.${token}`;
        (config[group] ||= {})[target] = value;
        if (group === "effects") dynamicEffects.push(target);
      });
    }
    manifest.dataset.amlStateConfig = JSON.stringify(addition);
  });
  node2.dataset.amlDynamicState = JSON.stringify(dynamicStateTargets);
  node2.dataset.amlDynamicEffects = JSON.stringify(dynamicEffects);
  recomputeComputed(root, state, config);
  dynamicEffects.forEach((id) => registerEffect(root, state, id, config.effects[id], true));
};
var releaseDynamicItem = (root, state, node2) => {
  releaseServiceScopes(root, node2);
  if (node2.dataset.amlRowScope) unbindRows(state, node2.dataset.amlRowScope);
  node2.querySelectorAll("[data-aml-row-scope]").forEach((child) => unbindRows(state, child.dataset.amlRowScope));
  const owned = [node2, ...node2.querySelectorAll("[data-aml-dynamic-state], [data-aml-dynamic-effects]")];
  const targets = new Set(owned.flatMap((child) => JSON.parse(child.dataset.amlDynamicState || "[]")));
  const effects = new Set(owned.flatMap((child) => JSON.parse(child.dataset.amlDynamicEffects || "[]")));
  const config = rootConfigs.get(root) || {};
  targets.forEach((target) => {
    deletePath(state, target);
    for (const group of ["shared", "persisted", "types", "typeRules", "valueTypes", "arrayMetadata", "computed"]) delete config[group]?.[target];
  });
  effects.forEach((id) => {
    cleanupEffect(root, id, "dynamic-unmount");
    effectRuntimes.get(root)?.delete(id);
    delete config.effects?.[id];
  });
};
var renderRichComponents = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-modal]").forEach((dialog) => {
    const rule = JSON.parse(dialog.dataset.amlModal);
    if (target && !pathAffects(rule.state, target)) return;
    const open = Boolean(readPath(state, rule.state));
    if (open && !dialog.open) {
      dialog.showModal?.();
      animateIn(dialog);
      queueMicrotask(() => dialog.querySelector('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')?.focus());
    } else if (!open && dialog.open) dialog.close?.();
  });
  root.querySelectorAll("[data-aml-tab]").forEach((tab) => {
    const rule = JSON.parse(tab.dataset.amlTab);
    if (target && !pathAffects(rule.state, target)) return;
    const selected = String(readPath(state, rule.state)) === String(rule.value);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  });
  root.querySelectorAll("[data-aml-tab-panel]").forEach((panel) => {
    const rule = JSON.parse(panel.dataset.amlTabPanel);
    if (target && !pathAffects(rule.state, target)) return;
    panel.hidden = String(readPath(state, rule.state)) !== String(rule.value);
  });
  root.querySelectorAll("[data-aml-accordion-trigger]").forEach((trigger) => {
    const rule = JSON.parse(trigger.dataset.amlAccordionTrigger);
    if (target && !pathAffects(rule.state, target)) return;
    const expanded = String(readPath(state, rule.state)) === String(rule.value);
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    const panel = trigger.parentElement?.querySelector(":scope > [data-aml-accordion-panel]");
    if (panel) panel.hidden = !expanded;
  });
  root.querySelectorAll("[data-aml-toast]").forEach((toast) => {
    const rule = JSON.parse(toast.dataset.amlToast);
    if (target && !pathAffects(rule.state, target)) return;
    const visible = Boolean(readPath(state, rule.state));
    toast.hidden = !visible;
    clearTimeout(toastTimers2.get(toast));
    if (visible) {
      animateIn(toast);
      if (Number(rule.duration) > 0) toastTimers2.set(toast, setTimeout(() => commit(root, state, rule.state, false), Number(rule.duration)));
    }
  });
  root.querySelectorAll("[data-aml-disclosure-trigger]").forEach((trigger) => {
    const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
    if (target && !pathAffects(rule.state, target)) return;
    const open = Boolean(readPath(state, rule.state));
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    const panel = document.getElementById(trigger.getAttribute("aria-controls"));
    if (panel && root.contains(panel)) {
      panel.hidden = !open;
      if (open) animateIn(panel);
    }
  });
  root.querySelectorAll("[data-aml-multi-step-form]").forEach((form) => {
    const rule = JSON.parse(form.dataset.amlMultiStepForm);
    if (target && !pathAffects(rule.state, target)) return;
    const step = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
    if (Number(readPath(state, rule.state)) !== step) writePath(state, rule.state, step);
    form.querySelectorAll("[data-aml-form-step]").forEach((panel) => {
      const active = Number(panel.dataset.amlFormStep) === step;
      panel.setAttribute("aria-current", active ? "step" : "false");
      panel.hidden = !active;
      if (active) panel.removeAttribute("inert");
      else panel.setAttribute("inert", "");
      panel.querySelectorAll("input,select,textarea,button").forEach((control) => {
        setDisabledReason(control, panel, !active);
      });
    });
    if (target) queueMicrotask(() => form.querySelector(`[data-aml-form-step="${step}"] h2`)?.focus?.({ preventScroll: true }));
  });
};
var renderVirtualLists = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-virtual-list]").forEach((list) => {
    const rule = JSON.parse(list.dataset.amlVirtualList);
    if (target && !pathAffects(rule.state, target)) return;
    const items = readPath(state, rule.state);
    const content = list.querySelector(":scope > [data-aml-virtual-content]");
    const template = content?.querySelector(":scope > template[data-aml-virtual-template]");
    if (!content || !template) return;
    const rowHeight = Number(rule.rowHeight);
    const overscan = Number(rule.overscan || 0);
    const start = Math.max(0, Math.floor(list.scrollTop / rowHeight) - overscan);
    const visible = Math.ceil(list.clientHeight / rowHeight) + overscan * 2;
    const end = Math.min(Array.isArray(items) ? items.length : 0, start + visible);
    const existing = new Map([...content.children].filter((node2) => node2 !== template && node2.dataset.amlVirtualKey !== void 0).map((node2) => [node2.dataset.amlVirtualKey, node2]));
    const fragment = document.createDocumentFragment();
    for (let index = start; index < end; index++) {
      const item = items[index];
      const key = String(readPath(item, rule.key) ?? index);
      const node2 = existing.get(key) || document.createElement("div");
      const isNew = !node2.hasChildNodes();
      existing.delete(key);
      if (isNew) {
        node2.appendChild(template.content.cloneNode(true));
        hydrateDynamicItem(root, state, node2, key);
        animateIn(node2);
      }
      node2.querySelectorAll("[data-aml-item-bind]").forEach((binding) => {
        binding.textContent = readPath(item, binding.dataset.amlItemBind) ?? "";
      });
      node2.dataset.amlVirtualKey = key;
      node2.style.cssText = `position:absolute;left:0;right:0;height:${rowHeight}px;transform:translateY(${index * rowHeight}px)`;
      fragment.appendChild(node2);
    }
    existing.forEach((node2) => releaseDynamicItem(root, state, node2));
    content.replaceChildren(fragment, template);
    content.style.height = `${(Array.isArray(items) ? items.length : 0) * rowHeight}px`;
  });
};
var matchingContextProvider = (node2, name, root = null) => {
  let provider = node2?.closest?.("[data-aml-context-provider]") || null;
  while (provider) {
    const rule = JSON.parse(provider.dataset.amlContextProvider);
    if (rule.name === name) return provider;
    provider = provider.parentElement?.closest?.("[data-aml-context-provider]") || null;
    if (root && provider && !root.contains(provider)) return null;
  }
  return null;
};
var renderContexts = (root, state, target = null) => {
  root.querySelectorAll("[data-aml-context-provider]").forEach((provider) => {
    const rule = JSON.parse(provider.dataset.amlContextProvider);
    if (target && rule.state && !pathAffects(rule.state, target)) return;
    let value = rule.state ? readPath(state, rule.state) : rule.value;
    if (rule.persist) persistContext(root, rule, value);
    provider.dataset.amlContextValue = JSON.stringify(value);
    provider.querySelectorAll("[data-aml-context-bind]").forEach((binding) => {
      const nearest = matchingContextProvider(binding, binding.dataset.amlContextBind, root);
      if (nearest === provider) {
        binding.textContent = value && typeof value === "object" ? JSON.stringify(value) : value ?? "";
      }
    });
    if (rule.name === "theme") {
      const resolved = value === "system" && typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : value;
      document.documentElement.dataset.theme = String(resolved || "light");
      document.documentElement.style.colorScheme = String(resolved || "light");
      provider.querySelectorAll("[data-aml-theme-choice]").forEach((choice) => choice.setAttribute("aria-pressed", String(choice.dataset.amlThemeChoice === value)));
    }
    if (rule.name === "locale" && typeof value === "string" && /^[a-zA-Z]{2,3}([_-][a-zA-Z0-9]{2,8})*$/.test(value)) {
      document.documentElement.lang = value.replace("_", "-");
    }
  });
};
var render = (scope, state, target = null) => {
  const config = rootConfigs.get(scope) || rootConfigs.get(scope.closest?.("[data-aml-client]")) || {};
  const textContext = { valueTypes: config.valueTypes || {}, stateTypes: config.types || {} };
  const structureSelector = "[data-aml-list], [data-aml-list-value], [data-aml-ilist], [data-aml-when]";
  const pendingLists = [...scope.querySelectorAll(structureSelector)];
  const visitedLists = /* @__PURE__ */ new Set();
  while (pendingLists.length) {
    let list = pendingLists.shift();
    if (!scope.contains(list) || visitedLists.has(list)) continue;
    visitedLists.add(list);
    if (list.dataset.amlWhen !== void 0) {
      const row = list.closest("[data-aml-row-scope]");
      const rule = JSON.parse(list.dataset.amlWhen);
      const branch = readPath(state, rule.state) === rule.equals ? "then" : "else";
      const content = list.querySelector(":scope > [data-aml-when-content]");
      if (content && list.dataset.amlWhenActive !== branch) {
        const template = list.querySelector(`:scope > template[data-aml-when-${branch}]`);
        if (row) releaseDynamicItem(scope, state, content);
        else releaseServiceScopes(scope, content);
        content.replaceChildren(template?.content.cloneNode(true) || document.createDocumentFragment());
        if (row) hydrateDynamicItem(scope, state, content, branch);
        list.dataset.amlWhenActive = branch;
        target = null;
      }
      if (row && content && !content.dataset.amlDynamicState) trackInitialRow(content);
      pendingLists.unshift(...list.querySelectorAll(structureSelector));
      continue;
    }
    try {
      const options = listOptions(list, state, textContext);
      const items = listItems(list, state, target, textContext);
      if (items === null) {
        applyListOptions(list, options);
        continue;
      }
      const labelPath = list.dataset.amlListLabel || "";
      const keyPath = list.dataset.amlListKey || "";
      const itemTag = list.dataset.amlListItemTag || "li";
      const template = list.querySelector(":scope > template[data-aml-list-template]");
      const existing = new Map([...list.children].filter((child) => child !== template && child.dataset.amlListKey !== void 0).map((child) => [child.dataset.amlListKey, child]));
      const seenKeys = /* @__PURE__ */ new Set();
      const calculated = list.dataset.amlListValue !== void 0 || list.dataset.amlIlist !== void 0;
      const rows = items.map((item, index) => {
        const record = item !== null && typeof item === "object";
        const itemValues = record ? item : { value: item };
        const label = record && labelPath ? readPath(item, labelPath) : item;
        const key = (keyPath ? readPath(item, keyPath) : index) ?? index;
        if (calculated && typeof key !== "string" && !(typeof key === "number" && Number.isSafeInteger(key))) throw new TypeError("AML collection keys must be strings or integers.");
        const keyString = String(key);
        if (seenKeys.has(keyString)) throw new Error(`Duplicate AML collection key: ${keyString}`);
        if (calculated && !template && label != null && !["string", "number", "boolean"].includes(typeof label)) throw new TypeError("AML collection labels must be scalar values.");
        seenKeys.add(keyString);
        return { index, itemValues, label, keyString };
      });
      list = applyListOptions(list, options);
      const focus = list.contains(document.activeElement) ? document.activeElement : null;
      const selection = focus && typeof focus.selectionStart === "number" ? [focus.selectionStart, focus.selectionEnd] : null;
      let cursor = [...list.children].find((child) => child.dataset.amlListKey !== void 0) || null;
      rows.forEach(({ index, itemValues, label, keyString }) => {
        const node2 = existing.get(keyString) || document.createElement(itemTag);
        const isNew = !node2.hasChildNodes();
        existing.delete(keyString);
        node2.dataset.amlListIndex = String(index);
        node2.dataset.amlListKey = keyString;
        const rowScope = list.dataset.amlIlist ? `${list.dataset.amlIlist}.rows.${rowToken(keyString)}` : null;
        if (rowScope) {
          bindRow(state, rowScope, { dependencies: listDependencies(list), value: itemValues, key: keyString, keyPath, source: list.dataset.amlListEditable || list.dataset.amlList, direct: list.dataset.amlListValue === void 0 });
          node2.dataset.amlRowScope = rowScope;
        }
        if (template && isNew) {
          node2.appendChild(template.content.cloneNode(true));
          if (rowScope) {
            const mapping = { [`${list.dataset.amlIlist}.rows.template`]: rowScope };
            const scopes = (root) => root.querySelectorAll("*").forEach((child) => {
              if (child.dataset.amlIlist) mapping[child.dataset.amlIlist] = `${child.dataset.amlIlist}.items.${rowToken(keyString)}`;
              if (child.localName === "template") scopes(child.content);
            });
            scopes(node2);
            rewriteRow(node2, mapping);
          }
          hydrateDynamicItem(scope, state, node2, keyString);
        }
        if (template) {
          node2.querySelectorAll("[data-aml-item-bind]").forEach((binding) => {
            if (binding.closest("[data-aml-list-key]") !== node2) return;
            binding.textContent = phpString(readPath(itemValues, binding.dataset.amlItemBind) ?? "");
          });
        } else node2.textContent = phpString(label ?? "");
        node2.dataset.amlListIndex = String(index);
        node2.dataset.amlListKey = keyString;
        if (list.dataset.amlSortable === "true") {
          node2.draggable = true;
          node2.tabIndex = 0;
          node2.setAttribute("aria-keyshortcuts", "Alt+ArrowUp Alt+ArrowDown");
        }
        if (node2 !== cursor) {
          if (list.moveBefore && node2.parentNode === list) list.moveBefore(node2, cursor);
          else list.insertBefore(node2, cursor);
        }
        cursor = node2.nextElementSibling;
        if (rowScope && !node2.dataset.amlDynamicState) trackInitialRow(node2);
        pendingLists.unshift(...node2.querySelectorAll(structureSelector));
        if (isNew) animateIn(node2);
      });
      existing.forEach((node2) => {
        releaseDynamicItem(scope, state, node2);
        node2.remove();
      });
      const empty = list.querySelector(":scope > [data-aml-list-empty]");
      if (empty) empty.hidden = items.length > 0;
      if (focus?.isConnected && document.activeElement !== focus) {
        focus.focus({ preventScroll: true });
        if (selection) focus.setSelectionRange(...selection);
      }
      if (list.dataset.amlIlist) target = null;
      listRendered(list);
    } catch (error) {
      reportListError(scope, list, error);
    }
  }
  renderIcons(scope, state, textContext);
  scope.querySelectorAll("[data-aml-href]").forEach((node2) => {
    try {
      const value = resolveData(JSON.parse(node2.dataset.amlHref), state, { ...textContext });
      if (typeof value !== "string" || /[\x00-\x1f\x7f]/.test(value) || /^([a-z][a-z0-9+.-]*):/i.test(value.trim()) && !/^(https?|mailto|tel):/i.test(value.trim())) throw new TypeError("Unsafe or unsupported reactive link URL.");
      if (node2.getAttribute("href") !== value.trim()) node2.setAttribute("href", value.trim());
    } catch (error) {
      scope.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, node: node2 } }));
    }
  });
  scope.querySelectorAll("[data-aml-bind-value]").forEach((node2) => {
    const expression = JSON.parse(node2.dataset.amlBindValue), context2 = { ...textContext };
    const value = resolveData(expression, state, context2);
    setBoundText(node2, phpString(value, resolveType(expression, state, context2, value), context2));
  });
  scope.querySelectorAll("[data-aml-bind]").forEach((node2) => {
    if (target && !pathAffects(node2.dataset.amlBind, target)) return;
    const value = readPath(state, node2.dataset.amlBind);
    if (node2.matches("progress,meter")) {
      node2.value = Number(value ?? 0);
    } else if (node2.matches("button[data-aml-model]")) {
      node2.value = value == null ? "" : String(value);
    } else if (node2.matches("input,textarea,select")) {
      if (node2.type === "file") return;
      if (node2.type === "checkbox") node2.checked = Boolean(value);
      else if (node2.type === "radio") node2.checked = node2.value === String(value ?? "");
      else if (node2.matches("select[multiple]")) {
        const selected = new Set((Array.isArray(value) ? value : [value ?? ""]).map(String));
        [...node2.options].forEach((option) => {
          option.selected = selected.has(option.value);
        });
      } else if (document.activeElement !== node2) node2.value = value ?? "";
    } else {
      setBoundText(node2, phpString(value, resolveType({ $state: node2.dataset.amlBind }, state, textContext, value), textContext));
    }
  });
  scope.querySelectorAll("[data-aml-show-when]").forEach((node2) => {
    const rule = JSON.parse(node2.dataset.amlShowWhen);
    if (target && !pathAffects(rule.state, target)) return;
    const hidden = readPath(state, rule.state) !== rule.equals;
    node2.toggleAttribute("hidden", hidden);
    if (hidden) node2.setAttribute("inert", "");
    else node2.removeAttribute("inert");
    const controls2 = [...node2.querySelectorAll("input,select,textarea,button")];
    if (node2.matches("input,select,textarea,button")) controls2.push(node2);
    controls2.forEach((control) => setDisabledReason(control, node2, hidden));
  });
  scope.querySelectorAll("[data-aml-class-when]").forEach((node2) => {
    JSON.parse(node2.dataset.amlClassWhen).forEach((rule) => {
      if (target && !pathAffects(rule.state, target)) return;
      node2.classList.toggle(rule.class, readPath(state, rule.state) === rule.equals);
    });
  });
  scope.querySelectorAll("[data-aml-disabled-when]").forEach((node2) => {
    const rule = JSON.parse(node2.dataset.amlDisabledWhen);
    if (target && !pathAffects(rule.state, target)) return;
    const disabled = readPath(state, rule.state) === rule.equals;
    setDisabledRule(node2, disabled);
  });
  renderRichComponents(scope, state, target);
  renderVirtualLists(scope, state);
  renderContexts(scope, state, target);
  renderCalendars(scope);
  renderStyles(scope, state, target, textContext);
};

// src-js/lifecycle.js
var remember = (root, state, reason = "update") => {
  const limit = Math.max(0, Math.min(100, Number.parseInt(root.dataset.amlHistory || "0", 10) || 0));
  if (limit === 0) return;
  const history = stateHistories.get(root) || [];
  history.push({ at: Date.now(), reason, state: clone(state) });
  if (history.length > limit) history.splice(0, history.length - limit);
  stateHistories.set(root, history);
};
var lifecycle = (root, phase, detail = {}) => {
  root.dispatchEvent(new CustomEvent(`aml:${phase}`, { detail }));
  root.querySelectorAll("[data-aml-component]").forEach((component) => {
    component.dispatchEvent(new CustomEvent(`aml:${phase}`, { detail: { ...detail, component: component.dataset.amlComponent } }));
  });
};

// src-js/state-runtime.js
var scheduleUpdate = (root, state, changes, originEffectId = null) => {
  let pending2 = pendingBatches.get(root);
  if (!pending2) {
    pending2 = /* @__PURE__ */ new Map();
    pendingBatches.set(root, pending2);
    queueMicrotask(() => {
      const batch = pendingBatches.get(root);
      const origins = pendingEffectOrigins.get(root) || /* @__PURE__ */ new Map();
      pendingBatches.delete(root);
      pendingEffectOrigins.delete(root);
      if (!batch || batch.size === 0 || !rootStates.has(root)) return;
      const targets = [...batch.keys()];
      try {
        render(root, state, targets.length === 1 ? targets[0] : null);
      } catch (error) {
        root.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, changes: Object.fromEntries(batch) } }));
        console.error(error);
        return;
      }
      batch.forEach((value, target) => root.dispatchEvent(new CustomEvent("aml:state", { detail: { target, value } })));
      const detail = { changes: Object.fromEntries(batch), state: clone(state) };
      if (batch.size > 1) root.dispatchEvent(new CustomEvent("aml:batch", { detail }));
      lifecycle(root, "update", detail);
      remember(root, state, batch.size > 1 ? "batch" : targets[0]);
      runEffects(root, state, targets, false, origins);
    });
  }
  changes.forEach((value, target) => pending2.set(target, value));
  if (originEffectId) {
    const origins = pendingEffectOrigins.get(root) || /* @__PURE__ */ new Map();
    changes.forEach((_, target) => origins.set(target, originEffectId));
    pendingEffectOrigins.set(root, origins);
  }
};
var commit = (root, state, target, value, executionContext = null) => {
  target = resolveWritePath(state, target);
  validatePhpValue(value, executionContext?.valueType || phpType(value));
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Frontend state must contain finite floats");
  const config = rootConfigs.get(root) || { shared: {}, persisted: {}, types: {}, computed: {} };
  const data = executionContext?.eventData;
  const typed = assignType(config.typeRules?.[target], value, executionContext?.valueType || phpType(value), data?.source?.strictTypes ?? true, data);
  value = typed.value;
  if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError("Frontend state must contain finite floats");
  value = clone(value);
  writePath(state, target, value);
  ownArray(state, "@state", state);
  if (config.valueTypes) config.valueTypes[target] = typed.kind;
  const changes = /* @__PURE__ */ new Map([[target, value]]);
  recomputeComputed(root, state, config, target).forEach((computed, name) => changes.set(name, computed));
  const transaction = transactions.get(root);
  if (transaction) {
    changes.forEach((changed, name) => transaction.changes.set(name, changed));
    return;
  }
  const persistedTarget = owningTarget(config.persisted, target);
  const persisted = persistedTarget ? config.persisted[persistedTarget] : null;
  if (persisted) persistState(root, persistedTarget, persisted, readPath(state, persistedTarget), config.valueTypes?.[persistedTarget]);
  const sharedTarget = owningTarget(config.shared, target);
  const sharedKey = sharedTarget ? config.shared[sharedTarget] : null;
  if (sharedKey) {
    const sharedValue = readPath(state, sharedTarget);
    sharedState[sharedKey] = sharedValue;
    sharedValueTypes[sharedKey] = config.valueTypes?.[sharedTarget] || phpType(sharedValue);
    mountedRoots.forEach((otherRoot) => {
      if (otherRoot === root) return;
      const otherConfig = rootConfigs.get(otherRoot) || {};
      const otherTarget = Object.keys(otherConfig.shared || {}).find((name) => otherConfig.shared[name] === sharedKey);
      if (!otherTarget) return;
      const otherState = rootStates.get(otherRoot);
      writePath(otherState, otherTarget, sharedValue);
      if (otherConfig.valueTypes) otherConfig.valueTypes[otherTarget] = sharedValueTypes[sharedKey];
      const otherChanges = /* @__PURE__ */ new Map([[otherTarget, sharedValue]]);
      recomputeComputed(otherRoot, otherState, otherConfig, otherTarget).forEach((computed, name) => otherChanges.set(name, computed));
      const otherPersisted = otherConfig.persisted?.[otherTarget];
      if (otherPersisted) persistState(otherRoot, otherTarget, otherPersisted, sharedValue, sharedValueTypes[sharedKey]);
      scheduleUpdate(otherRoot, otherState, otherChanges);
    });
  }
  scheduleUpdate(root, state, changes, (executionContext?.owner || executionContext)?.id);
};
var apply = (scope, state, action, executionContext = null) => {
  if (action.target) action = { ...action, target: resolveWritePath(state, action.target) };
  if (action.type === "remove-path") {
    const segments = safeSegments(action.target);
    if (segments.length < 2) throw new Error("AML remove-path requires a nested state path");
    const rootTarget = segments.shift();
    const next2 = clone(readPath(state, rootTarget));
    const leaf = segments.pop();
    const parent = segments.reduce((current2, key) => current2?.[key], next2);
    if (Array.isArray(parent) && /^\d+$/.test(leaf)) parent.splice(Number(leaf), 1);
    else if (parent && typeof parent === "object") delete parent[leaf];
    commit(scope, state, rootTarget, next2, executionContext);
    return;
  }
  const current = readPath(state, action.target);
  const value = resolveData(action.value, state, executionContext?.eventData);
  let next, updatedKind;
  if (["increment", "decrement"].includes(action.type) && (value ?? 1) === 1) {
    const updated = phpIncrement(current, resolveType({ $state: action.target }, state, executionContext?.eventData, current), action.type === "increment" ? 1 : -1, executionContext?.eventData);
    next = updated.value;
    updatedKind = updated.kind;
  } else if (action.type === "increment") next = phpArithmetic("add", current, value ?? 1, resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double", executionContext?.eventData);
  else if (action.type === "decrement") next = phpArithmetic("subtract", current, value ?? 1, resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double", executionContext?.eventData);
  else if (action.type === "toggle") next = !phpBool(current);
  else if (action.type === "set") next = value;
  else if (action.type === "append") next = [...Array.isArray(current) ? current : [], value];
  else if (action.type === "prepend") next = [value, ...Array.isArray(current) ? current : []];
  else if (action.type === "remove-at") {
    const items = Array.isArray(current) ? current : [];
    const requested = Number(value);
    const index = requested < 0 ? items.length + requested : requested;
    next = items.filter((_, itemIndex) => itemIndex !== index);
  } else if (action.type === "remove-by") next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) !== value.value);
  else if (action.type === "update-by") next = (Array.isArray(current) ? current : []).map((item) => readPath(item, value.key) === value.value ? { ...item, ...value.changes } : item);
  else if (action.type === "sort-by") next = [...Array.isArray(current) ? current : []].sort((left, right) => {
    const a = readPath(left, value.key);
    const b = readPath(right, value.key);
    const result = typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : a > b ? 1 : a < b ? -1 : 0;
    return value.direction === "desc" ? -result : result;
  });
  else if (action.type === "reverse") next = [...Array.isArray(current) ? current : []].reverse();
  else if (action.type === "filter-by") next = (Array.isArray(current) ? current : []).filter((item) => readPath(item, value.key) === value.value === value.keepMatches);
  else if (action.type === "move") {
    next = [...Array.isArray(current) ? current : []];
    const from = Number(value.from);
    const to = Number(value.to);
    if (Number.isInteger(from) && Number.isInteger(to) && from >= 0 && from < next.length && to >= 0 && to < next.length && from !== to) {
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
    }
  } else if (action.type === "merge") next = { ...current && typeof current === "object" && !Array.isArray(current) ? current : {}, ...value };
  else if (action.type === "clear") next = [];
  else throw new Error(`Unknown AML client action: ${action.type}`);
  const valueType = updatedKind || (action.type === "set" ? resolveType(action.value, state, executionContext?.eventData, next) : ["increment", "decrement"].includes(action.type) && resolveType({ $state: action.target }, state, executionContext?.eventData, current) === "double" ? "double" : phpType(next));
  if (valueType === "integer" && !Number.isSafeInteger(next)) throw new RangeError("Frontend integer exceeds JavaScript safe integer precision");
  commit(scope, state, action.target, next, { ...executionContext || {}, valueType });
};

// src-js/icon-bindings.js
var shapes = { path: ["d"], circle: ["cx", "cy", "r", "fill"], ellipse: ["cx", "cy", "rx", "ry"], rect: ["x", "y", "width", "height", "rx", "ry"], line: ["x1", "y1", "x2", "y2"], polyline: ["points"], polygon: ["points"] };
var cache = /* @__PURE__ */ new Map();
var bindings3 = /* @__PURE__ */ new WeakMap();
var retries = /* @__PURE__ */ new Set();
var retryDelays = [500, 1500, 4e3];
var iconName = (name) => {
  if (typeof name !== "string" || name.length > 100 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) throw new TypeError("Icon expects a Lucide name such as heart or arrow-right.");
  return name;
};
var iconGeometry = (nodes) => {
  if (!Array.isArray(nodes) || !nodes.length || nodes.length > 128) throw new TypeError("Invalid icon geometry.");
  for (const node2 of nodes) {
    if (!Array.isArray(node2) || node2.length !== 2 || typeof node2[0] !== "string" || !Object.hasOwn(shapes, node2[0]) || !node2[1] || typeof node2[1] !== "object" || Array.isArray(node2[1]) || !Object.keys(node2[1]).length) throw new TypeError("Invalid icon shape.");
    for (const [key, value] of Object.entries(node2[1])) {
      if (!shapes[node2[0]].includes(key) || typeof value !== "string" || value.length > 16e3 || (key === "fill" ? value !== "currentColor" : !(key === "d" ? /^[MmZzLlHhVvCcSsQqTtAaEe0-9.,+\s-]+$/ : /^[Ee0-9.,+\s-]+$/).test(value))) throw new TypeError("Unsafe icon geometry attribute.");
    }
  }
  return nodes;
};
var remember2 = (key, value) => {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > 256) cache.delete(cache.keys().next().value);
  return value;
};
var load = (url) => {
  if (cache.has(url)) return cache.get(url);
  const networkError = (error) => {
    error.iconRetryable = true;
    throw error;
  };
  const promise = fetch(url, { credentials: "same-origin", redirect: "error", cache: "no-cache", headers: { Accept: "application/json" } }).catch(networkError).then(async (response) => {
    if (!response.ok) {
      const error = new Error("Unknown or unavailable Lucide icon: " + url.split("/").pop().replace(/\.json$/, "") + ".");
      error.iconRetryable = [408, 429].includes(response.status) || response.status >= 500;
      throw error;
    }
    if (Number(response.headers.get("content-length")) > 65536) throw new Error("Icon data is too large.");
    const text = await response.text().catch(networkError);
    if (text.length > 65536) throw new Error("Icon data is too large.");
    return iconGeometry(JSON.parse(text));
  });
  remember2(url, promise);
  promise.catch(() => {
    if (cache.get(url) === promise) cache.delete(url);
  });
  return promise;
};
var report = (scope, node2, binding, error) => {
  const key = error.message;
  if (binding.error === key) return;
  binding.error = key;
  scope.dispatchEvent(new CustomEvent("aml:render-error", { detail: { error, node: node2 } }));
  console.error(error);
};
var cancelRetry = (binding) => {
  if (!binding.retry) return;
  clearTimeout(binding.retry.timer);
  retries.delete(binding.retry);
  binding.retry = null;
};
var retryIcon = (retry) => {
  const { binding, ticket, url, name, catalog } = retry;
  const scope = retry.scope.deref(), node2 = retry.node.deref();
  cancelRetry(binding);
  if (!scope || !node2?.isConnected || !scope.contains(node2) || ticket !== binding.ticket) return;
  requestIcon(scope, node2, binding, ticket, url, name, catalog);
};
var requestIcon = (scope, node2, binding, ticket, url, name, catalog) => {
  load(url).then((geometry) => {
    if (ticket !== binding.ticket || !node2.isConnected || !scope.contains(node2)) return;
    const children = geometry.map(([tag, attributes]) => {
      const child = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
      return child;
    });
    node2.replaceChildren(...children);
    node2.dataset.amlIconName = name;
    binding.catalog = catalog;
    binding.error = null;
    binding.attempts = 0;
  }).catch((error) => {
    if (ticket !== binding.ticket || !node2.isConnected || !scope.contains(node2)) return;
    report(scope, node2, binding, error);
    if (!error.iconRetryable) return;
    const retry = { scope: new WeakRef(scope), node: new WeakRef(node2), binding, ticket, url, name, catalog };
    binding.retry = retry;
    retries.add(retry);
    if (navigator.onLine !== false && binding.attempts < retryDelays.length) {
      retry.timer = setTimeout(() => retryIcon(retry), retryDelays[binding.attempts++]);
    }
  });
};
if (typeof window !== "undefined") window.addEventListener("online", () => {
  for (const retry of [...retries]) {
    retry.binding.attempts = 0;
    retryIcon(retry);
  }
});
var cleanupIcons = (scope) => {
  const nodes = [...scope.querySelectorAll("[data-aml-icon], [data-aml-icon-label]")];
  if (scope.matches?.("[data-aml-icon], [data-aml-icon-label]")) nodes.unshift(scope);
  for (const node2 of nodes) {
    const binding = bindings3.get(node2);
    if (binding) {
      ++binding.ticket;
      cancelRetry(binding);
      bindings3.delete(node2);
    }
  }
  for (const retry of retries) if (!retry.scope.deref() || retry.scope.deref() === scope) cancelRetry(retry.binding);
};
var renderIcons = (scope, state, context2) => {
  const nodes = [...scope.querySelectorAll("[data-aml-icon], [data-aml-icon-label]")];
  if (scope.matches?.("[data-aml-icon], [data-aml-icon-label]")) nodes.unshift(scope);
  for (const node2 of nodes) {
    let binding = bindings3.get(node2);
    if (!binding) {
      binding = { ticket: 0 };
      bindings3.set(node2, binding);
    }
    try {
      if (node2.hasAttribute("data-aml-icon-label")) {
        const label = resolveData(JSON.parse(node2.dataset.amlIconLabel), state, { ...context2 });
        if (label !== null && (typeof label !== "string" || !label.trim())) throw new TypeError("Icon label must be a nonempty string or null.");
        if (label === null) {
          node2.removeAttribute("role");
          node2.removeAttribute("aria-label");
          if (node2.getAttribute("aria-hidden") !== "true") node2.setAttribute("aria-hidden", "true");
        } else {
          node2.removeAttribute("aria-hidden");
          if (node2.getAttribute("role") !== "img") node2.setAttribute("role", "img");
          if (node2.getAttribute("aria-label") !== label) node2.setAttribute("aria-label", label);
        }
      }
      if (!node2.hasAttribute("data-aml-icon")) {
        ++binding.ticket;
        cancelRetry(binding);
        binding.requested = null;
        binding.error = null;
        continue;
      }
      const name = iconName(resolveData(JSON.parse(node2.dataset.amlIcon), state, { ...context2 }));
      const catalog = node2.dataset.amlIconCatalog;
      if (typeof catalog !== "string" || !/^\/(?:[a-zA-Z0-9_-]+\/)*assets\/phpaml\/lucide\/\d+\.\d+\.\d+$/.test(catalog)) throw new TypeError("Invalid local icon catalogue URL.");
      const url = new URL(`${catalog}/${name}.json`, location.origin).href;
      if (binding.requested === url) continue;
      cancelRetry(binding);
      const ticket = ++binding.ticket;
      binding.requested = url;
      binding.error = null;
      binding.attempts = 0;
      if (!binding.seeded) {
        binding.seeded = true;
        const initial = iconName(node2.dataset.amlIconName);
        remember2(
          new URL(`${catalog}/${initial}.json`, location.origin).href,
          Promise.resolve(iconGeometry([...node2.children].map((child) => [child.localName, Object.fromEntries([...child.attributes].map((attr) => [attr.name, attr.value]))])))
        );
      }
      if (node2.dataset.amlIconName === name && binding.catalog === catalog) continue;
      if (node2.dataset.amlIconName === name && binding.catalog === void 0) {
        binding.catalog = catalog;
        continue;
      }
      requestIcon(scope, node2, binding, ticket, url, name, catalog);
    } catch (error) {
      ++binding.ticket;
      cancelRetry(binding);
      binding.requested = null;
      report(scope, node2, binding, error);
    }
  }
};

// src-js/lifecycle-runtime.js
var formState = (form) => {
  if (!form?.dataset?.amlFormState) return null;
  try {
    return JSON.parse(form.dataset.amlFormState);
  } catch (_) {
    return null;
  }
};
var commitFormState = (root, state, rule, target, value) => {
  const path = rule?.[target];
  if (path && !Object.is(readPath(state, path), value)) commit(root, state, path, value);
};
var updateFormValidityState = (root, state, form, rule) => {
  const valid = form.checkValidity() && !form.querySelector('[aria-invalid="true"]:not(:disabled)');
  commitFormState(root, state, rule, "valid", valid);
  commitFormState(root, state, rule, "invalid", !valid);
  return valid;
};
var pendingMounts = /* @__PURE__ */ new WeakMap();
var mount = (scope = document) => {
  const roots = [...scope.querySelectorAll("[data-aml-client]")];
  const loading = prepareScopeModules(scope);
  if (!loading) return mountRoots(roots);
  const requests = roots.map((root) => {
    const request2 = { connected: root.isConnected };
    pendingMounts.set(root, request2);
    return [root, request2];
  });
  return loading.then(() => mountRoots(requests.filter(([root, request2]) => {
    if (pendingMounts.get(root) !== request2) return false;
    pendingMounts.delete(root);
    return !request2.connected || root.isConnected;
  }).map(([root]) => root)));
};
var mountRoots = (roots) => {
  roots.forEach((root) => {
    if (root.dataset.amlEngineMounted === "true") return;
    const manifests = [...root.querySelectorAll("template[data-aml-state]")];
    const state = {};
    const config = { shared: {}, persisted: {}, types: {}, typeRules: {}, valueTypes: {}, arrayMetadata: {}, computed: {}, effects: {} };
    manifests.forEach((manifest) => {
      const values = JSON.parse(manifest.dataset.amlState || "{}");
      const addition = JSON.parse(manifest.dataset.amlStateConfig || '{"shared":{},"persisted":{},"types":{},"computed":{},"effects":{}}');
      Object.entries(values).forEach(([target, value]) => {
        if (readPath(state, target) !== void 0) throw new Error(`Duplicate AML state target: ${target}`);
        writePath(state, target, restoreArrayMetadata(value, addition.arrayMetadata?.[target]));
      });
      for (const group of ["shared", "persisted", "types", "typeRules", "valueTypes", "arrayMetadata", "computed", "effects"]) {
        if (group === "effects") Object.keys(addition.effects || {}).forEach((id) => {
          if (Object.prototype.hasOwnProperty.call(config.effects, id)) throw new Error(`Duplicate AML effect identifier: ${id}`);
        });
        Object.assign(config[group], addition[group] || {});
      }
    });
    restorePersisted(root, state, config);
    Object.entries(config.shared || {}).forEach(([target, key]) => {
      const type = config.types?.[target] || "mixed";
      if (sharedTypes[key] && sharedTypes[key] !== type) throw new Error(`Incompatible AML shared state types for ${key}: ${sharedTypes[key]} and ${type}`);
      sharedTypes[key] = type;
      if (Object.prototype.hasOwnProperty.call(sharedState, key)) {
        writePath(state, target, sharedState[key]);
        config.valueTypes[target] = sharedValueTypes[key] || phpType(sharedState[key]);
      } else {
        sharedState[key] = readPath(state, target);
        sharedValueTypes[key] = config.valueTypes[target] || phpType(sharedState[key]);
      }
    });
    restoreContexts(root, state);
    recomputeComputed(root, state, config);
    rootStates.set(root, state);
    config.arrayMetadataApplied = true;
    rootConfigs.set(root, config);
    mountedRoots.add(root);
    rootControllers.set(root, /* @__PURE__ */ new Set());
    rootCleanups.set(root, /* @__PURE__ */ new Set());
    const listen = (type, listener, options) => {
      root.addEventListener(type, listener, options);
      rootCleanups.get(root).add(() => root.removeEventListener(type, listener, options));
    };
    const executeClientEvent = (target, eventName, event = null) => {
      if (!target || !root.contains(target)) return Promise.resolve(false);
      const encoded = target.getAttribute(`data-aml-client-${eventName}`);
      if (!encoded) return Promise.resolve(false);
      let action;
      try {
        action = JSON.parse(encoded);
      } catch (error) {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, event: eventName } }));
        return Promise.reject(error);
      }
      const trigger = eventName === "submit" ? event?.submitter || target : target;
      return execute(root, state, action, trigger, { eventData: eventPayload(event) }).then(() => true).catch((error) => {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, action, event: eventName } }));
        console.error(error);
        return false;
      });
    };
    if (typeof ResizeObserver === "function") {
      const virtualResizeObserver = new ResizeObserver((entries) => {
        if (entries.some((entry) => entry.target.matches?.("[data-aml-virtual-list]"))) renderVirtualLists(root, state);
      });
      root.querySelectorAll("[data-aml-virtual-list]").forEach((list) => virtualResizeObserver.observe(list));
      rootCleanups.get(root).add(() => virtualResizeObserver.disconnect());
    }
    effectRuntimes.set(root, /* @__PURE__ */ new Map());
    stateHistories.set(root, []);
    root.dataset.amlEngineMounted = "true";
    listen("click", async (event) => {
      if (calendarClick(root, event)) return;
      const stepControl = event.target.closest("[data-aml-step-next],[data-aml-step-previous]");
      if (stepControl && root.contains(stepControl)) {
        event.preventDefault();
        const form = stepControl.closest("[data-aml-multi-step-form]");
        const rule = JSON.parse(form.dataset.amlMultiStepForm);
        const current = Math.max(0, Math.min(Number(rule.count) - 1, Number(readPath(state, rule.state)) || 0));
        if (stepControl.matches("[data-aml-step-next]")) {
          const panel = form.querySelector(`[data-aml-form-step="${current}"]`);
          let valid = true;
          panel?.querySelectorAll("input,select,textarea").forEach((control) => {
            if (!validateControl(control)) valid = false;
          });
          const remote = [...panel?.querySelectorAll("[data-aml-validate-api]:not(:disabled)") || []];
          if (valid) valid = (await Promise.all(remote.map((control) => validateRemote(root, state, control)))).every(Boolean);
          if (!valid) {
            panel?.querySelector('[aria-invalid="true"]')?.focus();
            return;
          }
          commit(root, state, rule.state, Math.min(Number(rule.count) - 1, current + 1));
        } else commit(root, state, rule.state, Math.max(0, current - 1));
        return;
      }
      const disclosure = event.target.closest("[data-aml-disclosure-trigger]");
      if (disclosure && root.contains(disclosure)) {
        const rule = JSON.parse(disclosure.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, !Boolean(readPath(state, rule.state)));
        queueMicrotask(() => {
          const panel = document.getElementById(disclosure.getAttribute("aria-controls"));
          panel?.querySelector('[role="menuitem"],button,a[href],input,[tabindex]:not([tabindex="-1"])')?.focus();
        });
        return;
      }
      root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger2) => {
        const panel = document.getElementById(trigger2.getAttribute("aria-controls"));
        if (panel?.contains(event.target)) return;
        const rule = JSON.parse(trigger2.dataset.amlDisclosureTrigger);
        commit(root, state, rule.state, false);
      });
      const selectedMenuItem = event.target.closest('[role="menuitem"]');
      if (selectedMenuItem) {
        const panel = selectedMenuItem.closest("[data-aml-disclosure-panel]");
        const trigger2 = panel && root.querySelector(`[data-aml-disclosure-trigger][aria-controls="${CSS.escape(panel.id)}"]`);
        if (trigger2) {
          const rule = JSON.parse(trigger2.dataset.amlDisclosureTrigger);
          commit(root, state, rule.state, false);
        }
      }
      const themeChoice = event.target.closest("[data-aml-theme-choice]");
      if (themeChoice && root.contains(themeChoice)) {
        const provider = matchingContextProvider(themeChoice, "theme", root);
        if (provider) {
          const rule = JSON.parse(provider.dataset.amlContextProvider);
          const value = themeChoice.dataset.amlThemeChoice;
          if (rule.name === "theme") {
            if (rule.state) commit(root, state, rule.state, value);
            else {
              rule.value = value;
              provider.dataset.amlContextProvider = JSON.stringify(rule);
              renderContexts(root, state);
            }
            root.querySelectorAll("[data-aml-theme-choice]").forEach((choice) => choice.setAttribute("aria-pressed", choice === themeChoice ? "true" : "false"));
            return;
          }
        }
      }
      const accordion = event.target.closest("[data-aml-accordion-trigger]");
      if (accordion && root.contains(accordion)) {
        const rule = JSON.parse(accordion.dataset.amlAccordionTrigger);
        commit(root, state, rule.state, String(readPath(state, rule.state)) === String(rule.value) ? "" : rule.value);
        return;
      }
      const sort = event.target.closest("[data-aml-table-sort]");
      if (sort && root.contains(sort)) {
        const rule = JSON.parse(sort.dataset.amlTableSort);
        const direction = sort.getAttribute("aria-sort") === "ascending" ? "desc" : "asc";
        sort.closest("table")?.querySelectorAll("[data-aml-table-sort]").forEach((header) => header.setAttribute("aria-sort", "none"));
        sort.setAttribute("aria-sort", direction === "asc" ? "ascending" : "descending");
        apply(root, state, { type: "sort-by", target: rule.state, value: { key: rule.key, direction } });
        return;
      }
      const trigger = event.target.closest("[data-aml-client-click]");
      if (!trigger || !root.contains(trigger)) return;
      event.preventDefault();
      const actionForm = trigger.closest("form");
      const action = JSON.parse(trigger.dataset.amlClientClick);
      if (actionForm && action.type !== "form-state-reset" && !validateForm(actionForm)) {
        const rule = formState(actionForm);
        commitFormState(root, state, rule, "submitted", true);
        updateFormValidityState(root, state, actionForm, rule);
        actionForm.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      execute(root, state, action, trigger, { eventData: eventPayload(event) }).catch((error) => {
        root.dispatchEvent(new CustomEvent("aml:error", { detail: { error, action } }));
        console.error(error);
      });
    });
    listen("keydown", (event) => {
      if (calendarKey(root, event)) return;
      if (event.key === "Escape") {
        const openTriggers = [...root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]')];
        const focusedPanel = document.activeElement?.closest?.("[data-aml-disclosure-panel]");
        const trigger = focusedPanel && openTriggers.find((candidate) => candidate.getAttribute("aria-controls") === focusedPanel.id) || openTriggers.reverse()[0];
        if (trigger) {
          const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
          event.preventDefault();
          commit(root, state, rule.state, false);
          trigger.focus();
          return;
        }
      }
      const menuItem = event.target.closest('[role="menuitem"]');
      if (menuItem && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        const items = [...menuItem.closest('[role="menu"]').querySelectorAll('[role="menuitem"]:not([disabled])')];
        let position = items.indexOf(menuItem);
        if (event.key === "Home") position = 0;
        else if (event.key === "End") position = items.length - 1;
        else position = (position + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        event.preventDefault();
        items[position]?.focus();
        return;
      }
      const disclosureTrigger = event.target.closest("[data-aml-disclosure-trigger]");
      if (disclosureTrigger && event.key === "ArrowDown") {
        event.preventDefault();
        if (disclosureTrigger.getAttribute("aria-expanded") !== "true") disclosureTrigger.click();
        else document.getElementById(disclosureTrigger.getAttribute("aria-controls"))?.querySelector('[role="menuitem"],button,a[href],[tabindex]:not([tabindex="-1"])')?.focus();
        return;
      }
      const openDialog = root.querySelector("dialog[data-aml-modal][open]");
      if (openDialog && event.key === "Tab") {
        const focusable = [...openDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      const sortable = event.target.closest("[data-aml-table-sort]");
      if (sortable && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        sortable.click();
        return;
      }
      const sortableItem = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (sortableItem && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
        const list = sortableItem.parentElement;
        const from = Number(sortableItem.dataset.amlListIndex);
        const to = from + (event.key === "ArrowUp" ? -1 : 1);
        const collection = readPath(state, list.dataset.amlList);
        const length = Array.isArray(collection) ? collection.length : 0;
        if (to >= 0 && to < length) {
          event.preventDefault();
          apply(root, state, { type: "move", target: list.dataset.amlList, value: { from, to } });
          queueMicrotask(() => list.querySelector(`[data-aml-list-index="${to}"]`)?.focus());
          root.dispatchEvent(new CustomEvent("aml:sort", { detail: { state: list.dataset.amlList, from, to, input: "keyboard" } }));
        }
        return;
      }
      executeClientEvent(event.target.closest("[data-aml-client-keydown]"), "keydown", event);
      const tab = event.target.closest("[data-aml-tab]");
      if (!tab || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      const tabs = [...tab.closest('[role="tablist"]').querySelectorAll("[data-aml-tab]")];
      let index = tabs.indexOf(tab);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = tabs.length - 1;
      else index = (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[index].focus();
      tabs[index].click();
    });
    listen("keyup", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-keyup]"), "keyup", event);
    });
    listen("mouseover", (event) => {
      const target = event.target.closest("[data-aml-client-mouseenter]");
      if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, "mouseenter", event);
    });
    listen("mouseout", (event) => {
      const target = event.target.closest("[data-aml-client-mouseleave]");
      if (target && !target.contains(event.relatedTarget)) executeClientEvent(target, "mouseleave", event);
    });
    listen("cancel", (event) => {
      const dialog = event.target.closest("[data-aml-modal]");
      if (!dialog) return;
      event.preventDefault();
      const rule = JSON.parse(dialog.dataset.amlModal);
      commit(root, state, rule.state, false);
    });
    listen("dragstart", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-dragstart]"), "dragstart", event);
      const item = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (!item || !event.dataTransfer) return;
      const list = item.parentElement;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/x-aml-index", JSON.stringify({ index: Number(item.dataset.amlListIndex), state: list.dataset.amlList }));
      item.setAttribute("aria-grabbed", "true");
    });
    listen("dragend", (event) => {
      event.target.closest('[aria-grabbed="true"]')?.removeAttribute("aria-grabbed");
      executeClientEvent(event.target.closest("[data-aml-client-dragend]"), "dragend", event);
    });
    listen("dragover", (event) => {
      const clientTarget = event.target.closest("[data-aml-client-dragover]");
      if (clientTarget) {
        event.preventDefault();
        executeClientEvent(clientTarget, "dragover", event);
      }
      if (event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]')) event.preventDefault();
    });
    listen("drop", (event) => {
      const clientTarget = event.target.closest("[data-aml-client-drop]");
      if (clientTarget) {
        event.preventDefault();
        executeClientEvent(clientTarget, "drop", event);
      }
      const destination = event.target.closest('[data-aml-sortable="true"] > [data-aml-list-index]');
      if (!destination || !event.dataTransfer || !Array.from(event.dataTransfer.types).includes("text/x-aml-index")) return;
      event.preventDefault();
      const list = destination.parentElement;
      let source;
      try {
        source = JSON.parse(event.dataTransfer.getData("text/x-aml-index"));
      } catch (_) {
        return;
      }
      if (!source || source.state !== list.dataset.amlList) return;
      const from = Number(source.index);
      const to = Number(destination.dataset.amlListIndex);
      if (Number.isInteger(from) && Number.isInteger(to)) {
        apply(root, state, { type: "move", target: list.dataset.amlList, value: { from, to } });
        root.dispatchEvent(new CustomEvent("aml:sort", { detail: { state: list.dataset.amlList, from, to, input: "pointer" } }));
      }
    });
    listen("scroll", (event) => {
      if (event.target.matches?.("[data-aml-virtual-list]")) renderVirtualLists(root, state);
    }, true);
    listen("input", (event) => {
      const control = event.target.closest("[data-aml-model]");
      if (control && root.contains(control) && control.type !== "checkbox") {
        updateModel(root, state, control);
        if (control.dataset.amlValidate) validateControl(control);
        scheduleRemoteValidation(root, state, control);
      }
      const preserved = event.target.closest("form[data-aml-form-preserve]");
      if (preserved) preserveForm(preserved);
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "dirty", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-input]"), "input", event);
      if (event.target.matches("[data-aml-calendar-input]")) renderCalendars(root);
    });
    listen("change", (event) => {
      const control = event.target.closest("[data-aml-model]");
      if (control && root.contains(control)) {
        updateModel(root, state, control);
        if (control.dataset.amlValidate) validateControl(control);
        scheduleRemoteValidation(root, state, control);
      }
      const preserved = event.target.closest("form[data-aml-form-preserve]");
      if (preserved) preserveForm(preserved);
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "dirty", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-change]"), "change", event);
      if (event.target.matches("[data-aml-calendar-input]")) renderCalendars(root);
    });
    listen("focusin", (event) => {
      executeClientEvent(event.target.closest("[data-aml-client-focus]"), "focus", event);
    });
    listen("focusout", (event) => {
      const tracked = event.target.closest("form[data-aml-form-state]");
      if (tracked) {
        const rule = formState(tracked);
        commitFormState(root, state, rule, "touched", true);
        updateFormValidityState(root, state, tracked, rule);
      }
      executeClientEvent(event.target.closest("[data-aml-client-blur]"), "blur", event);
    });
    listen("submit", async (event) => {
      const form = event.target.closest("form");
      if (!form || !root.contains(form)) return;
      if (form.dataset.amlValidationPassed === "true") {
        delete form.dataset.amlValidationPassed;
        return;
      }
      event.preventDefault();
      const rule = formState(form);
      commitFormState(root, state, rule, "submitted", true);
      if (!validateForm(form)) {
        updateFormValidityState(root, state, form, rule);
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const controls2 = [...form.querySelectorAll("[data-aml-validate-api]:not(:disabled)")];
      const valid = (await Promise.all(controls2.map((control) => validateRemote(root, state, control)))).every(Boolean);
      updateFormValidityState(root, state, form, rule);
      if (valid) {
        if (form.hasAttribute("data-aml-client-submit")) {
          await executeClientEvent(form, "submit", event);
          return;
        }
        form.dataset.amlValidationPassed = "true";
        form.requestSubmit(event.submitter || void 0);
      }
    });
    const revealTooltip = (event, visible) => {
      const trigger = event.target.closest("[data-aml-tooltip-trigger]");
      if (!trigger || !root.contains(trigger)) return;
      if (!visible && event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
      const content = document.getElementById(trigger.getAttribute("aria-describedby"));
      if (content) content.hidden = !visible;
    };
    listen("pointerover", (event) => revealTooltip(event, true));
    listen("pointerout", (event) => revealTooltip(event, false));
    listen("focusin", (event) => revealTooltip(event, true));
    listen("focusout", (event) => revealTooltip(event, false));
    const closeOutsideDisclosures = (event) => root.querySelectorAll('[data-aml-disclosure-trigger][aria-expanded="true"]').forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (trigger.contains(event.target) || panel?.contains(event.target)) return;
      const rule = JSON.parse(trigger.dataset.amlDisclosureTrigger);
      commit(root, state, rule.state, false);
    });
    document.addEventListener("click", closeOutsideDisclosures);
    rootCleanups.get(root).add(() => document.removeEventListener("click", closeOutsideDisclosures));
    render(root, state);
    root.querySelectorAll("form[data-aml-form-state]").forEach((form) => {
      updateFormValidityState(root, state, form, formState(form));
    });
    root.querySelectorAll("form[data-aml-form-preserve]").forEach(restoreForm);
    root.querySelectorAll("template[data-aml-redirect]").forEach((redirect) => {
      const rule = JSON.parse(redirect.dataset.amlRedirect);
      queueMicrotask(() => navigate(rule.destination, !rule.replace, root));
    });
    remember(root, state, "mount");
    lifecycle(root, "mount", { state: clone(state) });
    Object.entries(config.effects).forEach(([id, definition]) => effectRuntimes.get(root).set(id, newEffectRuntime(id, definition)));
    const indexedRestores = restoreIndexed(root, state, config) || [];
    Promise.all(indexedRestores).finally(() => {
      if (!rootStates.has(root)) return;
      Object.entries(config.effects).forEach(([id, definition]) => {
        if (definition.runOnMount) activateEffect(root, state, id, definition);
      });
    });
  });
};
var unmount = (root) => {
  if (root) pendingMounts.delete(root);
  if (!root || root.dataset.amlEngineMounted !== "true") return;
  lifecycle(root, "unmount", { state: clone(rootStates.get(root) || {}) });
  cleanupIcons(root);
  effectRuntimes.get(root)?.forEach((_, id) => cleanupEffect(root, id, "unmount"));
  rootControllers.get(root)?.forEach((controller) => controller.abort());
  navigationRuntimes.get(root)?.controller?.abort();
  navigationRuntimes.delete(root);
  root.querySelectorAll("[data-aml-validate-api]").forEach((control) => {
    clearTimeout(validationTimers.get(control));
    validationControllers.get(control)?.abort();
  });
  root.querySelectorAll("[data-aml-toast]").forEach((toast) => clearTimeout(toastTimers.get(toast)));
  rootCleanups.get(root)?.forEach((cleanup) => {
    try {
      cleanup();
    } catch (error) {
      console.error(error);
    }
  });
  rootControllers.delete(root);
  rootCleanups.delete(root);
  effectRuntimes.delete(root);
  rootStates.delete(root);
  rootConfigs.delete(root);
  stateHistories.delete(root);
  mountedRoots.delete(root);
  delete root.dataset.amlEngineMounted;
};
var on = (root, phase, handler) => {
  if (!["mount", "update", "unmount"].includes(phase)) throw new Error(`Unknown AML lifecycle phase: ${phase}`);
  const eventName = `aml:${phase}`;
  root.addEventListener(eventName, handler);
  const dispose = () => root.removeEventListener(eventName, handler);
  const cleanups = rootCleanups.get(root) || /* @__PURE__ */ new Set();
  cleanups.add(dispose);
  rootCleanups.set(root, cleanups);
  if (phase === "mount" && root.dataset.amlEngineMounted === "true") {
    queueMicrotask(() => handler(new CustomEvent(eventName, { detail: { state: clone(rootStates.get(root) || {}) } })));
  }
  return dispose;
};

// src-js/navigation.js
var updateActiveLinks = () => {
  document.querySelectorAll("a[href]").forEach((link) => {
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch (_) {
      return;
    }
    if (url.origin !== location.origin) return;
    const active = url.pathname === location.pathname;
    if (active) link.setAttribute("aria-current", "page");
    else if (link.getAttribute("aria-current") === "page") link.removeAttribute("aria-current");
  });
};
var clearNavigationState = (current) => {
  const boundary = current.querySelector("[data-aml-navigation-boundary]");
  if (!boundary) return;
  boundary.querySelector(":scope > [data-aml-navigation-overlay]")?.remove();
  const content = boundary.querySelector(":scope > [data-aml-navigation-content]");
  content?.removeAttribute("inert");
  content?.removeAttribute("aria-hidden");
};
var showNavigationState = (current, status, message = "", url = location.href, signal = null) => {
  const boundary = current.querySelector("[data-aml-navigation-boundary]");
  if (!boundary) return false;
  boundary.querySelector(":scope > [data-aml-navigation-overlay]")?.remove();
  const template = boundary.querySelector(`:scope > template[data-aml-navigation-state="${status}"]`);
  if (!template) return false;
  const overlay = document.createElement("div");
  overlay.dataset.amlNavigationOverlay = status;
  overlay.setAttribute("role", status === "error" ? "alert" : "status");
  overlay.appendChild(template.content.cloneNode(true));
  const content = boundary.querySelector(":scope > [data-aml-navigation-content]");
  content?.setAttribute("inert", "");
  content?.setAttribute("aria-hidden", "true");
  boundary.appendChild(overlay);
  const live = boundary.querySelector(":scope > [data-aml-navigation-live]");
  if (live) live.textContent = message || status;
  fetch(url, { mode: "same-origin", headers: { "X-AML-Navigation": "true", "X-AML-Navigation-State": status }, signal }).then((response) => response.text()).then(async (html) => {
    if (signal?.aborted || !overlay.isConnected) return;
    const stateDocument = new DOMParser().parseFromString(html, "text/html");
    const stateRoot = stateDocument.querySelector("[data-aml-client]");
    const stateContent = stateDocument.querySelector("[data-aml-navigation-state-content]");
    if (!stateRoot || !stateContent || stateContent.dataset.amlNavigationStateContent !== status) return;
    const modules = prepareScopeModules(stateRoot);
    if (modules) await modules;
    if (signal?.aborted || !overlay.isConnected) return;
    overlay.replaceChildren(document.importNode(stateRoot, true));
    await mount(overlay);
    const target = overlay.querySelector('[data-aml-navigation-focus],h1,[role="alert"],[role="status"]');
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }).catch((error) => {
    if (error?.name !== "AbortError") current.dispatchEvent(new CustomEvent("aml:navigation-state-error", { detail: { status, error } }));
  });
  return true;
};
var focusNavigatedPage = (url) => {
  if (url.hash) {
    document.querySelector(url.hash)?.scrollIntoView();
    return;
  }
  scrollTo({ top: 0, behavior: "instant" });
  const target = document.querySelector("[data-aml-navigation-focus]") || document.querySelector('main,[role="main"]') || document.querySelector("h1");
  if (!target) return;
  const hadTabIndex = target.hasAttribute("tabindex");
  if (!hadTabIndex) target.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => target.focus({ preventScroll: true }));
  if (!hadTabIndex) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
};
var syncHead = (nextDocument) => {
  document.title = nextDocument.title || document.title;
  const selector = 'meta[name="description"],meta[name="robots"],link[rel="canonical"],meta[property^="og:"],meta[name^="twitter:"]';
  document.head.querySelectorAll(selector).forEach((node2) => node2.remove());
  nextDocument.head.querySelectorAll(selector).forEach((node2) => document.head.appendChild(document.importNode(node2, true)));
};
var navigate = async (destination, push = true, sourceRoot = null) => {
  const url = new URL(destination, location.href);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsupported AML navigation protocol: ${url.protocol}`);
  if (url.origin !== location.origin) {
    location.href = url.href;
    return;
  }
  const current = sourceRoot?.matches?.("[data-aml-client]") && document.contains(sourceRoot) ? sourceRoot : document.querySelector("[data-aml-client]");
  if (!current) {
    location.href = url.href;
    return;
  }
  const rootIndex = [...document.querySelectorAll("[data-aml-client]")].indexOf(current);
  const previous = navigationRuntimes.get(current);
  previous?.controller?.abort();
  const controller = new AbortController();
  const generation = (previous?.generation || 0) + 1;
  navigationRuntimes.set(current, { controller, generation });
  const active = () => navigationRuntimes.get(current)?.generation === generation && !controller.signal.aborted;
  current.setAttribute("aria-busy", "true");
  showNavigationState(current, "loading", "Loading page", location.href, controller.signal);
  document.dispatchEvent(new CustomEvent("aml:navigation-start", { detail: { url: url.href } }));
  try {
    const response = await fetch(url.href, { mode: "same-origin", headers: { "X-AML-Navigation": "true" }, signal: controller.signal });
    const html = await response.text();
    if (!active()) return;
    const nextDocument = new DOMParser().parseFromString(html, "text/html");
    const next = nextDocument.querySelector("[data-aml-client]");
    if (!next) {
      if (response.status === 404 && showNavigationState(current, "not-found", "Page not found", location.href, controller.signal)) {
        current.removeAttribute("aria-busy");
        return;
      }
      throw new Error(`AML navigation failed: ${response.status}`);
    }
    const modules = prepareScopeModules(next), animations = prepareModules(["animations"]);
    if (modules || animations) await Promise.all([modules, animations]);
    if (!active()) return;
    clearNavigationState(current);
    unmount(current);
    current.replaceWith(document.importNode(next, true));
    syncHead(nextDocument);
    if (push) window.history.pushState({ aml: true }, "", url.href);
    else if (location.href !== url.href) window.history.replaceState({ aml: true }, "", url.href);
    mount(document);
    updateActiveLinks();
    focusNavigatedPage(url);
    const mounted = document.querySelectorAll("[data-aml-client]");
    const replacement = mounted[Math.min(Math.max(rootIndex, 0), mounted.length - 1)] || mounted[0];
    animateNavigation(replacement);
    document.dispatchEvent(new CustomEvent("aml:navigation-end", { detail: { url: url.href, status: response.status } }));
  } catch (error) {
    if (error?.name === "AbortError" || !active()) return;
    current.removeAttribute("aria-busy");
    const handled = showNavigationState(current, "error", "Navigation failed", location.href, controller.signal);
    document.dispatchEvent(new CustomEvent("aml:navigation-error", { detail: { url: url.href, error } }));
    if (!handled) throw error;
  } finally {
    if (navigationRuntimes.get(current)?.generation === generation) navigationRuntimes.delete(current);
  }
};
var listenersInstalled = false;
var installNavigationListeners = () => {
  if (listenersInstalled) return;
  listenersInstalled = true;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.hasAttribute("download") || link.target === "_blank" || link.dataset.amlNativeNavigation !== void 0) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    navigate(url.href, true, link.closest("[data-aml-client]")).catch((error) => {
      console.error(error);
      location.href = url.href;
    });
  });
  addEventListener("popstate", () => navigate(location.href, false).catch(() => location.reload()));
};
var context = (root, name, fallback = null) => {
  const providers = [...root.querySelectorAll("[data-aml-context-provider]")];
  const provider = providers.reverse().find((candidate) => JSON.parse(candidate.dataset.amlContextProvider).name === name);
  if (!provider) return fallback;
  try {
    return JSON.parse(provider.dataset.amlContextValue);
  } catch (_) {
    return fallback;
  }
};
var route = () => {
  const url = new URL(location.href);
  const query = {};
  url.searchParams.forEach((value, key) => {
    if (Object.prototype.hasOwnProperty.call(query, key)) query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value];
    else query[key] = value;
  });
  return Object.freeze({ path: url.pathname, query: Object.freeze(query), hash: url.hash });
};

export {
  rootStates,
  rootConfigs,
  mountedRoots,
  rootControllers,
  rootCleanups,
  validationTimers2 as validationTimers,
  validationControllers2 as validationControllers,
  transactions,
  stateHistories,
  effectRuntimes,
  markBusy,
  updateActiveLinks,
  navigate,
  installNavigationListeners,
  context,
  route,
  showValidation,
  validateControl,
  cleanupEffect,
  activateEffect,
  runEffects,
  render,
  remember,
  lifecycle,
  scheduleUpdate,
  commit,
  mount,
  unmount,
  on
};
