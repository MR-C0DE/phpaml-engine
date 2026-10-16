var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src-js/core/version.js
var ENGINE_VERSION = "0.1.0-beta.9";

// src-js/modules/catalogue.json
var catalogue_default = {
  unicode: {
    functions: [
      "grapheme_strlen",
      "grapheme_substr",
      "grapheme_str_split",
      "grapheme_strpos",
      "grapheme_stripos",
      "grapheme_strrpos",
      "grapheme_strripos",
      "grapheme_strstr",
      "grapheme_stristr",
      "grapheme_extract",
      "normalizer_normalize",
      "normalizer_is_normalized",
      "normalizer_get_raw_decomposition",
      "mb_strlen",
      "mb_substr",
      "mb_strpos",
      "mb_strrpos",
      "mb_stripos",
      "mb_strripos",
      "mb_strstr",
      "mb_stristr",
      "mb_strrchr",
      "mb_strrichr",
      "mb_substr_count",
      "mb_strtolower",
      "mb_strtoupper",
      "mb_convert_case",
      "mb_str_split",
      "mb_strcut",
      "mb_strwidth",
      "mb_strimwidth",
      "mb_ord",
      "mb_chr",
      "mb_check_encoding",
      "mb_scrub",
      "mb_str_pad",
      "mb_ucfirst",
      "mb_lcfirst",
      "mb_trim",
      "mb_ltrim",
      "mb_rtrim"
    ],
    classes: [],
    dependencies: []
  },
  intl: {
    functions: [
      "numfmt_create",
      "numfmt_format",
      "numfmt_format_currency",
      "numfmt_get_attribute",
      "numfmt_set_attribute",
      "numfmt_get_text_attribute",
      "numfmt_set_text_attribute"
    ],
    classes: [
      "normalizer",
      "collator",
      "intldateformatter",
      "numberformatter"
    ],
    dependencies: [
      "date",
      "unicode"
    ]
  },
  bcmath: {
    functions: [
      "bcadd",
      "bcsub",
      "bcmul",
      "bcdiv",
      "bcmod",
      "bcdivmod",
      "bcpowmod",
      "bcpow",
      "bcsqrt",
      "bccomp",
      "bcscale",
      "bcfloor",
      "bcceil",
      "bcround"
    ],
    classes: [],
    dependencies: []
  },
  regex: {
    functions: [
      "preg_replace_callback_array",
      "preg_match",
      "preg_match_all",
      "preg_replace",
      "preg_replace_callback",
      "preg_filter",
      "preg_split",
      "preg_grep",
      "preg_quote",
      "preg_last_error",
      "preg_last_error_msg"
    ],
    classes: [],
    dependencies: []
  },
  date: {
    functions: [
      "time",
      "microtime",
      "date",
      "gmdate",
      "strtotime",
      "mktime",
      "gmmktime",
      "checkdate",
      "getdate",
      "date_default_timezone_get",
      "date_default_timezone_set",
      "date_create",
      "date_create_immutable",
      "date_format",
      "date_timestamp_get",
      "date_timestamp_set",
      "date_modify",
      "date_timezone_get",
      "date_timezone_set",
      "timezone_open",
      "timezone_name_get",
      "timezone_offset_get",
      "date_create_from_format",
      "date_create_immutable_from_format",
      "date_get_last_errors",
      "date_diff",
      "date_add",
      "date_sub",
      "date_interval_format"
    ],
    classes: [
      "datetime",
      "datetimeimmutable",
      "datetimezone",
      "datetimeinterface",
      "dateinterval",
      "dateperiod",
      "internaliterator",
      "stdclass"
    ],
    dependencies: []
  },
  spl: {
    functions: [
      "iterator_to_array",
      "iterator_count",
      "iterator_apply"
    ],
    classes: [
      "arrayiterator",
      "arrayobject",
      "spldoublylinkedlist",
      "splstack",
      "splqueue"
    ],
    dependencies: []
  },
  reflection: {
    functions: [],
    classes: [
      "reflectionclass",
      "reflectionobject",
      "reflectionmethod",
      "reflectionproperty"
    ],
    dependencies: []
  },
  files: {
    kind: "browser",
    functions: [],
    classes: [],
    dependencies: []
  },
  browser: {
    kind: "browser",
    functions: [],
    classes: [],
    dependencies: []
  },
  animations: {
    kind: "browser",
    functions: [],
    classes: [],
    dependencies: []
  }
};

// src-js/modules/callables.json
var callables_default = {
  call_user_func: [
    {
      index: 0,
      name: "callback"
    }
  ],
  call_user_func_array: [
    {
      index: 0,
      name: "callback"
    }
  ],
  iterator_apply: [
    {
      index: 1,
      name: "callback"
    }
  ],
  preg_replace_callback: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_all: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_any: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_filter: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_find: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_find_key: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_map: [
    {
      index: 0,
      name: "callback"
    }
  ],
  array_reduce: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_walk: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_walk_recursive: [
    {
      index: 1,
      name: "callback"
    }
  ],
  uasort: [
    {
      index: 1,
      name: "callback"
    }
  ],
  uksort: [
    {
      index: 1,
      name: "callback"
    }
  ],
  usort: [
    {
      index: 1,
      name: "callback"
    }
  ],
  array_udiff: [
    {
      index: -1,
      name: null
    }
  ],
  array_udiff_assoc: [
    {
      index: -1,
      name: null
    }
  ],
  array_diff_uassoc: [
    {
      index: -1,
      name: null
    }
  ],
  array_diff_ukey: [
    {
      index: -1,
      name: null
    }
  ],
  array_uintersect: [
    {
      index: -1,
      name: null
    }
  ],
  array_uintersect_assoc: [
    {
      index: -1,
      name: null
    }
  ],
  array_intersect_uassoc: [
    {
      index: -1,
      name: null
    }
  ],
  array_intersect_ukey: [
    {
      index: -1,
      name: null
    }
  ],
  array_udiff_uassoc: [
    {
      index: -2,
      name: null
    },
    {
      index: -1,
      name: null
    }
  ],
  array_uintersect_uassoc: [
    {
      index: -2,
      name: null
    },
    {
      index: -1,
      name: null
    }
  ],
  preg_replace_callback_array: [
    {
      index: 0,
      name: "pattern"
    }
  ]
};

// src-js/modules/requirements.js
var moduleNames = Object.freeze(Object.keys(catalogue_default));
var phpModuleNames = Object.freeze(moduleNames.filter((name) => catalogue_default[name].kind !== "browser"));
var moduleDependencies = Object.fromEntries(Object.entries(catalogue_default).map(([name, item]) => [name, item.dependencies]));
var functions = new Map(Object.entries(catalogue_default).flatMap(([module, item]) => item.functions.map((name) => [name, module])));
var classes = new Map(Object.entries(catalogue_default).flatMap(([module, item]) => item.classes.map((name) => [name, module])));
var nativeModules = { nativeDate: "date", nativeIntl: "intl", nativeSpl: "spl", nativeReflection: "reflection" };
var normalize = (name) => typeof name === "string" ? name.replace(/^\\/, "").toLowerCase() : "";
var requiredModules = (node) => {
  const needed = /* @__PURE__ */ new Set(), seen = /* @__PURE__ */ new WeakSet();
  const add = (name) => {
    if (!Object.hasOwn(catalogue_default, name) || needed.has(name)) return;
    needed.add(name);
    moduleDependencies[name].forEach(add);
  };
  const all = () => phpModuleNames.forEach(add);
  const builtin = (name, args = []) => {
    name = normalize(name);
    if (functions.has(name)) add(functions.get(name));
    if (Object.hasOwn(callables_default, name)) {
      if (args.some((argument) => argument.spread)) all();
      for (const parameter of callables_default[name]) {
        const argument = args.find((argument2) => argument2.name && argument2.name === parameter.name) || args.at(parameter.index);
        const value = argument?.value;
        if (typeof value === "string") {
          if (functions.has(normalize(value))) add(functions.get(normalize(value)));
        } else if (value && typeof value === "object" && !["closure", "functionRef"].includes(value.$expression?.operation)) all();
      }
    }
    if (name === "filter_var" || name === "filter_var_array") {
      add("regex");
      const optionsIndex = name === "filter_var_array" ? 1 : 2;
      if (args.some((argument, index) => argument.spread || argument.name === "options" || index === optionsIndex)) all();
    }
  };
  const visit = (value) => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (value.type === "file") add("files");
    if (value.type === "api") add("browser");
    if (Array.isArray(value.phpModules)) value.phpModules.forEach(add);
    for (const [key, module] of Object.entries(nativeModules)) if (value[key]) add(module);
    if (typeof value.builtin === "string") builtin(value.builtin);
    const expression = value.$expression;
    if (expression) {
      const { operation, left, right } = expression;
      if (operation === "builtin") builtin(left, right?.arguments || []);
      if (operation === "call") {
        if (typeof left === "string") builtin(left, right?.arguments || []);
        else if (!["closure", "functionRef"].includes(left?.$expression?.operation)) all();
      }
      if (operation === "eval" && !right?.program) all();
      if (operation === "splMethod") add("spl");
      if (["objectNew", "objectCall", "objectConstant", "objectStaticProperty", "isObject"].includes(operation)) {
        const name = normalize(left);
        if (classes.has(name)) add(classes.get(name));
      }
    }
    Object.values(value).forEach(visit);
  };
  visit(node);
  return moduleNames.filter((name) => needed.has(name));
};
var scopeRequirements = (scope) => {
  const needed = /* @__PURE__ */ new Set();
  const scan = (parent) => {
    const elements = [...parent.matches?.("*") ? [parent] : [], ...parent.querySelectorAll("*")];
    for (const element of elements) {
      if (element.hasAttribute("data-aml-transition")) needed.add("animations");
      if (element.hasAttribute("data-aml-form-preserve") || element.hasAttribute("data-aml-validate-api")) needed.add("browser");
      for (const attribute of element.attributes) {
        if (!attribute.name.startsWith("data-aml-") || attribute.name === "data-aml-state" || !/^[\[{]/.test(attribute.value)) continue;
        let value;
        try {
          value = JSON.parse(attribute.value);
        } catch {
          continue;
        }
        if (attribute.name === "data-aml-state-config" && Object.keys(value.persisted || {}).length) needed.add("browser");
        if (attribute.name === "data-aml-context-provider" && value.persist) needed.add("browser");
        requiredModules(value).forEach((name) => needed.add(name));
      }
      if (element.tagName === "TEMPLATE") scan(element.content);
    }
  };
  scan(scope);
  return moduleNames.filter((name) => needed.has(name));
};

// src-js/modules/runtime.js
var installed = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
var loaders = null;
var configureModules = (value) => {
  loaders = value;
};
var registerModule = (name, version, exports) => {
  if (version !== ENGINE_VERSION || !Object.hasOwn(moduleDependencies, name)) throw new Error(`Incompatible PHPAML module: ${name}`);
  if (installed.has(name)) throw new Error(`PHPAML module already registered: ${name}`);
  installed.set(name, Object.freeze(exports));
};
var moduleExport = (name, operation, optional = false) => {
  const implementation = installed.get(name)?.[operation];
  if (implementation !== void 0 || optional) return implementation;
  throw Object.assign(new Error(`PHPAML module ${name} must load before ${operation}`), { code: "AML_MODULE_MISSING", module: name });
};
var load = (name) => {
  if (installed.has(name)) return Promise.resolve();
  if (pending.has(name)) return pending.get(name);
  if (!loaders || !Object.hasOwn(loaders, name)) return Promise.reject(new Error(`Unknown PHPAML module: ${name}`));
  const promise = Promise.all(moduleDependencies[name].map(load)).then(() => loaders[name]()).then(() => {
    if (!installed.has(name)) throw new Error(`PHPAML module did not register: ${name}`);
  }).catch((cause) => {
    pending.delete(name);
    throw Object.assign(new Error(`Unable to load PHPAML module ${name}`, { cause }), { code: "AML_MODULE_LOAD", module: name });
  });
  pending.set(name, promise);
  return promise;
};
var prepareModules = (requirements) => {
  if (!loaders) return null;
  const missing = requirements.filter((name) => !installed.has(name));
  return missing.length ? Promise.all(missing.map(load)) : null;
};
var prepareInstructionModules = (instruction) => loaders ? prepareModules(requiredModules(instruction)) : null;
var prepareScopeModules = (scope) => loaders ? prepareModules(scopeRequirements(scope)) : null;

export {
  __export,
  ENGINE_VERSION,
  configureModules,
  registerModule,
  moduleExport,
  prepareModules,
  prepareInstructionModules,
  prepareScopeModules
};
