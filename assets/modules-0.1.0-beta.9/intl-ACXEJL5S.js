import {
  arrayEntries,
  arrayKind,
  bounded,
  clonePhp,
  dateData,
  dateParts,
  failure,
  makeArray,
  makeObject,
  objectData,
  phpString,
  phpType,
  runGrapheme,
  timezone,
  work
} from "./chunk-PVACVZCB.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-intl.js
var php_intl_exports = {};
__export(php_intl_exports, {
  cloneIntl: () => cloneIntl,
  intlDefinition: () => intlDefinition,
  nativeIntlMethod: () => nativeIntlMethod,
  runIntl: () => runIntl
});

// src-js/core/php-intl-extra.js
var php_intl_extra_exports = {};
__export(php_intl_extra_exports, {
  cloneExtraIntl: () => cloneExtraIntl,
  extraIntl: () => extraIntl
});
var storage = /* @__PURE__ */ new WeakMap();
var localeTag = (name, context) => (name || context.source?.intlLocale || "en_US").replaceAll("_", "-").replace(/-POSIX$/, "");
var fail = (message) => {
  throw Object.assign(new Error("Frontend Intl: " + message), { name: "ValueError" });
};
var strengthOptions = (data) => ({ sensitivity: data.attributes.get(3) === 17 ? data.strength === 0 ? "case" : "variant" : data.strength === 0 ? "base" : data.strength === 1 ? "accent" : "variant", numeric: data.attributes.get(7) === 17, ignorePunctuation: data.attributes.get(1) === 20, caseFirst: data.attributes.get(2) === 24 ? "upper" : data.attributes.get(2) === 25 ? "lower" : "false" });
var formatter = (data) => new Intl.DateTimeFormat(data.locale, { ...data.dateType < 0 ? {} : { dateStyle: ["full", "long", "medium", "short"][data.dateType] }, ...data.timeType < 0 ? {} : { timeStyle: ["full", "long", "medium", "short"][data.timeType] }, timeZone: data.zone });
var patternFormat = (data, timestamp) => {
  const date = new Date(timestamp * 1e3), zone = timezone(data.zone), p = dateParts(Math.floor(timestamp), zone), pad = (n, w = 2) => String(n).padStart(w, "0");
  const part = (options, key) => new Intl.DateTimeFormat(data.locale, { ...options, timeZone: data.zone }).formatToParts(date).find((p2) => p2.type === key)?.value || "";
  let output = "", quoted = false;
  for (let i = 0; i < data.pattern.length; ) {
    const char = data.pattern[i];
    if (char === "'") {
      if (data.pattern[i + 1] === "'") {
        output += "'";
        i += 2;
      } else {
        quoted = !quoted;
        i++;
      }
      continue;
    }
    if (quoted || !/[A-Za-z]/.test(char)) {
      output += char;
      i++;
      continue;
    }
    let end = i + 1;
    while (data.pattern[end] === char) end++;
    const width = end - i;
    const fields = { y: () => width === 2 ? pad(p.year % 100) : pad(p.year, width), M: () => width < 3 ? pad(p.month, width) : part({ month: width === 3 ? "short" : width === 4 ? "long" : "narrow" }, "month"), L: () => width < 3 ? pad(p.month, width) : part({ month: width === 3 ? "short" : width === 4 ? "long" : "narrow" }, "month"), d: () => pad(p.day, width), E: () => part({ weekday: width < 4 ? "short" : width === 4 ? "long" : "narrow" }, "weekday"), H: () => pad(p.hour, width), h: () => pad(p.hour % 12 || 12, width), m: () => pad(p.minute, width), s: () => pad(p.second, width), a: () => part({ hour: "numeric", hour12: true }, "dayPeriod"), G: () => part({ era: width < 4 ? "short" : width === 4 ? "long" : "narrow" }, "era"), z: () => part({ timeZoneName: width < 4 ? "short" : "long" }, "timeZoneName"), S: () => pad(Math.floor(timestamp % 1 * 1e3), 3).slice(0, width).padEnd(width, "0") };
    if (!fields[char]) fail("unsupported date pattern letter " + char);
    output += fields[char]();
    i = end;
  }
  return output;
};
var extraIntl = (name, operation, values, context, definition) => {
  if (!["Collator", "IntlDateFormatter"].includes(name)) return null;
  const result = (value) => ({ value, kind: phpType(value) });
  let object = context.thisObject;
  if (operation === "__construct" || operation === "create") {
    const locale = localeTag(values[0], context);
    Intl.getCanonicalLocales(locale);
    const data2 = name === "Collator" ? { locale, strength: 2, attributes: /* @__PURE__ */ new Map([[0, 16], [1, 21], [2, 16], [3, 16], [4, 16], [5, 2], [7, 16]]) } : { locale, dateType: values[1], timeType: values[2], zone: typeof values[3] === "string" ? values[3] : dateData(values[3])?.zone?.name || context.source?.dateTimezone || "UTC", calendar: values[4] ?? 1, pattern: values[5] || "", lenient: true };
    if (name === "IntlDateFormatter") {
      if (![-1, 0, 1, 2, 3].includes(data2.dateType) || ![-1, 0, 1, 2, 3].includes(data2.timeType) || data2.calendar !== 1) fail("formatter requires supported styles and the Gregorian calendar");
      timezone(data2.zone);
    }
    object ||= makeObject(definition);
    storage.set(object, data2);
    return result(operation === "create" ? object : null);
  }
  const data = storage.get(object);
  if (!data) throw new Error("Uninitialized " + name);
  if (operation === "getlocale") return result(name === "IntlDateFormatter" && data.dateType === -1 && data.timeType === -1 ? "" : data.locale.replaceAll("-", "_"));
  if (operation === "geterrorcode") return result(0);
  if (operation === "geterrormessage") return result("U_ZERO_ERROR");
  if (name === "Collator") {
    if (operation === "setstrength") {
      if (![0, 1, 2].includes(values[0])) fail("invalid collation strength");
      data.strength = values[0];
      data.attributes.set(5, values[0]);
      return result(true);
    }
    if (operation === "getstrength") return result(data.strength);
    if (operation === "setattribute") {
      if (![0, 1, 2, 3, 4, 5, 7].includes(values[0])) fail("unsupported collation attribute");
      if (values[0] === 5) {
        if (![0, 1, 2].includes(values[1])) fail("unsupported collation strength");
        data.strength = values[1];
      }
      data.attributes.set(values[0], values[1]);
      return result(true);
    }
    if (operation === "getattribute") return result(data.attributes.get(values[0]) ?? 16);
    const collator = new Intl.Collator(data.locale, strengthOptions(data));
    if (operation === "compare") return result(Math.sign(collator.compare(values[0], values[1])));
    if (["sort", "asort", "sortwithsortkeys"].includes(operation)) {
      const input = values[0], entries = arrayEntries(input);
      entries.sort((a, b) => {
        if (values[1] === 2) return Number(a[1]) - Number(b[1]);
        return collator.compare(phpString(a[1], arrayKind(input, a[0]), context), phpString(b[1], arrayKind(input, b[0]), context));
      });
      const sorted = makeArray(entries.map(([key, value], index) => [operation === "asort" ? key : index, clonePhp(value), arrayKind(input, key)]));
      context.localReferences[context.intlParameters[0].id].set(sorted, "array");
      return result(true);
    }
  } else {
    if (operation === "format") {
      const value = dateData(values[0]), timestamp = value ? value.timestamp + (value.microsecond || 0) / 1e6 : values[0];
      if (typeof timestamp !== "number") fail("format expects a timestamp or DateTimeInterface");
      return result(data.pattern ? patternFormat(data, timestamp) : formatter(data).format(new Date(timestamp * 1e3)));
    }
    if (operation === "getpattern") {
      if (!data.pattern) fail("getPattern requires an explicit pattern");
      return result(data.pattern);
    }
    if (operation === "setpattern") {
      data.pattern = values[0];
      return result(true);
    }
    if (operation === "gettimezoneid") return result(data.zone);
    if (operation === "settimezone") {
      data.zone = typeof values[0] === "string" ? values[0] : dateData(values[0])?.zone?.name;
      timezone(data.zone);
      return result(true);
    }
    if (operation === "getdatetype") return result(data.dateType);
    if (operation === "gettimetype") return result(data.timeType);
    if (operation === "getcalendar") return result(data.calendar);
    if (operation === "islenient") return result(data.lenient);
    if (operation === "setlenient") {
      data.lenient = values[0];
      return result(null);
    }
  }
  fail("unsupported " + name + "::" + operation);
};
var cloneExtraIntl = (value) => {
  const data = storage.get(value);
  if (!data) return null;
  const copy = makeObject(objectData(value).definition);
  storage.set(copy, { ...data, ...data.attributes ? { attributes: new Map(data.attributes) } : {} });
  return copy;
};

// src-js/core/intl-definitions.json
var intl_definitions_default = {
  normalizer: {
    class: {
      name: "Normalizer",
      parent: null,
      ancestors: [],
      abstract: true,
      final: true,
      properties: [],
      staticProperties: [],
      constants: {
        FORM_D: {
          owner: "Normalizer",
          visibility: "public",
          value: 4
        },
        NFD: {
          owner: "Normalizer",
          visibility: "public",
          value: 4
        },
        FORM_KD: {
          owner: "Normalizer",
          visibility: "public",
          value: 8
        },
        NFKD: {
          owner: "Normalizer",
          visibility: "public",
          value: 8
        },
        FORM_C: {
          owner: "Normalizer",
          visibility: "public",
          value: 16
        },
        NFC: {
          owner: "Normalizer",
          visibility: "public",
          value: 16
        },
        FORM_KC: {
          owner: "Normalizer",
          visibility: "public",
          value: 32
        },
        NFKC: {
          owner: "Normalizer",
          visibility: "public",
          value: 32
        },
        FORM_KC_CF: {
          owner: "Normalizer",
          visibility: "public",
          value: 48
        },
        NFKC_CF: {
          owner: "Normalizer",
          visibility: "public",
          value: 48
        }
      },
      methods: {
        normalize: {
          name: "normalize",
          id: "@intl:normalizer::normalize",
          owner: "Normalizer",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        isnormalized: {
          name: "isNormalized",
          id: "@intl:normalizer::isnormalized",
          owner: "Normalizer",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        getrawdecomposition: {
          name: "getRawDecomposition",
          id: "@intl:normalizer::getrawdecomposition",
          owner: "Normalizer",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeIntl: true
    },
    functions: {
      "@intl:normalizer::normalize": {
        name: "Normalizer::normalize",
        parameters: [
          {
            id: "v737472696e67",
            name: "string",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v666f726d",
            name: "form",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 16
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Normalizer",
          method: "normalize"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:normalizer::isnormalized": {
        name: "Normalizer::isNormalized",
        parameters: [
          {
            id: "v737472696e67",
            name: "string",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v666f726d",
            name: "form",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 16
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Normalizer",
          method: "isnormalized"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:normalizer::getrawdecomposition": {
        name: "Normalizer::getRawDecomposition",
        parameters: [
          {
            id: "v737472696e67",
            name: "string",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v666f726d",
            name: "form",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 16
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Normalizer",
          method: "getrawdecomposition"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  collator: {
    class: {
      name: "Collator",
      parent: null,
      ancestors: [],
      abstract: false,
      final: true,
      properties: [],
      staticProperties: [],
      constants: {
        DEFAULT_VALUE: {
          owner: "Collator",
          visibility: "public",
          value: -1
        },
        PRIMARY: {
          owner: "Collator",
          visibility: "public",
          value: 0
        },
        SECONDARY: {
          owner: "Collator",
          visibility: "public",
          value: 1
        },
        TERTIARY: {
          owner: "Collator",
          visibility: "public",
          value: 2
        },
        DEFAULT_STRENGTH: {
          owner: "Collator",
          visibility: "public",
          value: 2
        },
        QUATERNARY: {
          owner: "Collator",
          visibility: "public",
          value: 3
        },
        IDENTICAL: {
          owner: "Collator",
          visibility: "public",
          value: 15
        },
        OFF: {
          owner: "Collator",
          visibility: "public",
          value: 16
        },
        ON: {
          owner: "Collator",
          visibility: "public",
          value: 17
        },
        SHIFTED: {
          owner: "Collator",
          visibility: "public",
          value: 20
        },
        NON_IGNORABLE: {
          owner: "Collator",
          visibility: "public",
          value: 21
        },
        LOWER_FIRST: {
          owner: "Collator",
          visibility: "public",
          value: 24
        },
        UPPER_FIRST: {
          owner: "Collator",
          visibility: "public",
          value: 25
        },
        FRENCH_COLLATION: {
          owner: "Collator",
          visibility: "public",
          value: 0
        },
        ALTERNATE_HANDLING: {
          owner: "Collator",
          visibility: "public",
          value: 1
        },
        CASE_FIRST: {
          owner: "Collator",
          visibility: "public",
          value: 2
        },
        CASE_LEVEL: {
          owner: "Collator",
          visibility: "public",
          value: 3
        },
        NORMALIZATION_MODE: {
          owner: "Collator",
          visibility: "public",
          value: 4
        },
        STRENGTH: {
          owner: "Collator",
          visibility: "public",
          value: 5
        },
        HIRAGANA_QUATERNARY_MODE: {
          owner: "Collator",
          visibility: "public",
          value: 6
        },
        NUMERIC_COLLATION: {
          owner: "Collator",
          visibility: "public",
          value: 7
        },
        SORT_REGULAR: {
          owner: "Collator",
          visibility: "public",
          value: 0
        },
        SORT_STRING: {
          owner: "Collator",
          visibility: "public",
          value: 1
        },
        SORT_NUMERIC: {
          owner: "Collator",
          visibility: "public",
          value: 2
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@intl:collator::__construct",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        create: {
          name: "create",
          id: "@intl:collator::create",
          owner: "Collator",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        compare: {
          name: "compare",
          id: "@intl:collator::compare",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        sort: {
          name: "sort",
          id: "@intl:collator::sort",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        asort: {
          name: "asort",
          id: "@intl:collator::asort",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        sortwithsortkeys: {
          name: "sortWithSortKeys",
          id: "@intl:collator::sortwithsortkeys",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getstrength: {
          name: "getStrength",
          id: "@intl:collator::getstrength",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setstrength: {
          name: "setStrength",
          id: "@intl:collator::setstrength",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getattribute: {
          name: "getAttribute",
          id: "@intl:collator::getattribute",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setattribute: {
          name: "setAttribute",
          id: "@intl:collator::setattribute",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getlocale: {
          name: "getLocale",
          id: "@intl:collator::getlocale",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        geterrorcode: {
          name: "getErrorCode",
          id: "@intl:collator::geterrorcode",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        geterrormessage: {
          name: "getErrorMessage",
          id: "@intl:collator::geterrormessage",
          owner: "Collator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeIntl: true
    },
    functions: {
      "@intl:collator::__construct": {
        name: "Collator::__construct",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::create": {
        name: "Collator::create",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "create"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::compare": {
        name: "Collator::compare",
        parameters: [
          {
            id: "v737472696e6731",
            name: "string1",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v737472696e6732",
            name: "string2",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "compare"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::sort": {
        name: "Collator::sort",
        parameters: [
          {
            id: "v6172726179",
            name: "array",
            reference: true,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            }
          },
          {
            id: "v666c616773",
            name: "flags",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "sort"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::asort": {
        name: "Collator::asort",
        parameters: [
          {
            id: "v6172726179",
            name: "array",
            reference: true,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            }
          },
          {
            id: "v666c616773",
            name: "flags",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "asort"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::sortwithsortkeys": {
        name: "Collator::sortWithSortKeys",
        parameters: [
          {
            id: "v6172726179",
            name: "array",
            reference: true,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "sortwithsortkeys"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::getstrength": {
        name: "Collator::getStrength",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "getstrength"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::setstrength": {
        name: "Collator::setStrength",
        parameters: [
          {
            id: "v737472656e677468",
            name: "strength",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "setstrength"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::getattribute": {
        name: "Collator::getAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "getattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::setattribute": {
        name: "Collator::setAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "setattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::getlocale": {
        name: "Collator::getLocale",
        parameters: [
          {
            id: "v74797065",
            name: "type",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "getlocale"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::geterrorcode": {
        name: "Collator::getErrorCode",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "geterrorcode"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:collator::geterrormessage": {
        name: "Collator::getErrorMessage",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "Collator",
          method: "geterrormessage"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  intldateformatter: {
    class: {
      name: "IntlDateFormatter",
      parent: null,
      ancestors: [],
      abstract: false,
      final: true,
      properties: [],
      staticProperties: [],
      constants: {
        FULL: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 0
        },
        LONG: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 1
        },
        MEDIUM: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 2
        },
        SHORT: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 3
        },
        NONE: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: -1
        },
        RELATIVE_FULL: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 128
        },
        RELATIVE_LONG: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 129
        },
        RELATIVE_MEDIUM: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 130
        },
        RELATIVE_SHORT: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 131
        },
        PATTERN: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: -2
        },
        GREGORIAN: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 1
        },
        TRADITIONAL: {
          owner: "IntlDateFormatter",
          visibility: "public",
          value: 0
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@intl:intldateformatter::__construct",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        create: {
          name: "create",
          id: "@intl:intldateformatter::create",
          owner: "IntlDateFormatter",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        format: {
          name: "format",
          id: "@intl:intldateformatter::format",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getpattern: {
          name: "getPattern",
          id: "@intl:intldateformatter::getpattern",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setpattern: {
          name: "setPattern",
          id: "@intl:intldateformatter::setpattern",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimezoneid: {
          name: "getTimeZoneId",
          id: "@intl:intldateformatter::gettimezoneid",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settimezone: {
          name: "setTimeZone",
          id: "@intl:intldateformatter::settimezone",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getdatetype: {
          name: "getDateType",
          id: "@intl:intldateformatter::getdatetype",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimetype: {
          name: "getTimeType",
          id: "@intl:intldateformatter::gettimetype",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getcalendar: {
          name: "getCalendar",
          id: "@intl:intldateformatter::getcalendar",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        islenient: {
          name: "isLenient",
          id: "@intl:intldateformatter::islenient",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setlenient: {
          name: "setLenient",
          id: "@intl:intldateformatter::setlenient",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getlocale: {
          name: "getLocale",
          id: "@intl:intldateformatter::getlocale",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        geterrorcode: {
          name: "getErrorCode",
          id: "@intl:intldateformatter::geterrorcode",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        geterrormessage: {
          name: "getErrorMessage",
          id: "@intl:intldateformatter::geterrormessage",
          owner: "IntlDateFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeIntl: true
    },
    functions: {
      "@intl:intldateformatter::__construct": {
        name: "IntlDateFormatter::__construct",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            }
          },
          {
            id: "v6461746554797065",
            name: "dateType",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          },
          {
            id: "v74696d6554797065",
            name: "timeType",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          },
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: null,
            default: null
          },
          {
            id: "v63616c656e646172",
            name: "calendar",
            reference: false,
            variadic: false,
            rule: null,
            default: null
          },
          {
            id: "v7061747465726e",
            name: "pattern",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::create": {
        name: "IntlDateFormatter::create",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            }
          },
          {
            id: "v6461746554797065",
            name: "dateType",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          },
          {
            id: "v74696d6554797065",
            name: "timeType",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          },
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: null,
            default: null
          },
          {
            id: "v63616c656e646172",
            name: "calendar",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "intlcalendar",
                "int",
                "null"
              ],
              nullable: true
            },
            default: null
          },
          {
            id: "v7061747465726e",
            name: "pattern",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "create"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::format": {
        name: "IntlDateFormatter::format",
        parameters: [
          {
            id: "v6461746574696d65",
            name: "datetime",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::getpattern": {
        name: "IntlDateFormatter::getPattern",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "getpattern"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::setpattern": {
        name: "IntlDateFormatter::setPattern",
        parameters: [
          {
            id: "v7061747465726e",
            name: "pattern",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "setpattern"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::gettimezoneid": {
        name: "IntlDateFormatter::getTimeZoneId",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "gettimezoneid"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::settimezone": {
        name: "IntlDateFormatter::setTimeZone",
        parameters: [
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "settimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::getdatetype": {
        name: "IntlDateFormatter::getDateType",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "getdatetype"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::gettimetype": {
        name: "IntlDateFormatter::getTimeType",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "gettimetype"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::getcalendar": {
        name: "IntlDateFormatter::getCalendar",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "getcalendar"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::islenient": {
        name: "IntlDateFormatter::isLenient",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "islenient"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::setlenient": {
        name: "IntlDateFormatter::setLenient",
        parameters: [
          {
            id: "v6c656e69656e74",
            name: "lenient",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "bool"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "setlenient"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::getlocale": {
        name: "IntlDateFormatter::getLocale",
        parameters: [
          {
            id: "v74797065",
            name: "type",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "getlocale"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::geterrorcode": {
        name: "IntlDateFormatter::getErrorCode",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "geterrorcode"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:intldateformatter::geterrormessage": {
        name: "IntlDateFormatter::getErrorMessage",
        parameters: [],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "IntlDateFormatter",
          method: "geterrormessage"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  numberformatter: {
    class: {
      name: "NumberFormatter",
      parent: null,
      ancestors: [],
      abstract: false,
      final: true,
      properties: [],
      staticProperties: [],
      constants: {
        PATTERN_DECIMAL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        DECIMAL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        CURRENCY: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        PERCENT: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        SCIENTIFIC: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        },
        SPELLOUT: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 5
        },
        ORDINAL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 6
        },
        DURATION: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 7
        },
        PATTERN_RULEBASED: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 9
        },
        IGNORE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        CURRENCY_ACCOUNTING: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 12
        },
        DEFAULT_STYLE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        ROUND_CEILING: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        ROUND_FLOOR: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        ROUND_DOWN: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        ROUND_UP: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        ROUND_TOWARD_ZERO: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        ROUND_AWAY_FROM_ZERO: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        ROUND_HALFEVEN: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        },
        ROUND_HALFODD: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 8
        },
        ROUND_HALFDOWN: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 5
        },
        ROUND_HALFUP: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 6
        },
        PAD_BEFORE_PREFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        PAD_AFTER_PREFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        PAD_BEFORE_SUFFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        PAD_AFTER_SUFFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        PARSE_INT_ONLY: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        GROUPING_USED: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        DECIMAL_ALWAYS_SHOWN: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        MAX_INTEGER_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        MIN_INTEGER_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        },
        INTEGER_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 5
        },
        MAX_FRACTION_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 6
        },
        MIN_FRACTION_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 7
        },
        FRACTION_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 8
        },
        MULTIPLIER: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 9
        },
        GROUPING_SIZE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 10
        },
        ROUNDING_MODE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 11
        },
        ROUNDING_INCREMENT: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 12
        },
        FORMAT_WIDTH: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 13
        },
        PADDING_POSITION: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 14
        },
        SECONDARY_GROUPING_SIZE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 15
        },
        SIGNIFICANT_DIGITS_USED: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 16
        },
        MIN_SIGNIFICANT_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 17
        },
        MAX_SIGNIFICANT_DIGITS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 18
        },
        LENIENT_PARSE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 19
        },
        POSITIVE_PREFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        POSITIVE_SUFFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        NEGATIVE_PREFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        NEGATIVE_SUFFIX: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        PADDING_CHARACTER: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        },
        CURRENCY_CODE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 5
        },
        DEFAULT_RULESET: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 6
        },
        PUBLIC_RULESETS: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 7
        },
        DECIMAL_SEPARATOR_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        GROUPING_SEPARATOR_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        PATTERN_SEPARATOR_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        PERCENT_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        ZERO_DIGIT_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        },
        DIGIT_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 5
        },
        MINUS_SIGN_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 6
        },
        PLUS_SIGN_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 7
        },
        CURRENCY_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 8
        },
        INTL_CURRENCY_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 9
        },
        MONETARY_SEPARATOR_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 10
        },
        EXPONENTIAL_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 11
        },
        PERMILL_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 12
        },
        PAD_ESCAPE_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 13
        },
        INFINITY_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 14
        },
        NAN_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 15
        },
        SIGNIFICANT_DIGIT_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 16
        },
        MONETARY_GROUPING_SEPARATOR_SYMBOL: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 17
        },
        TYPE_DEFAULT: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 0
        },
        TYPE_INT32: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 1
        },
        TYPE_INT64: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 2
        },
        TYPE_DOUBLE: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 3
        },
        TYPE_CURRENCY: {
          owner: "NumberFormatter",
          visibility: "public",
          value: 4
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@intl:numberformatter::__construct",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        create: {
          name: "create",
          id: "@intl:numberformatter::create",
          owner: "NumberFormatter",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        format: {
          name: "format",
          id: "@intl:numberformatter::format",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        formatcurrency: {
          name: "formatCurrency",
          id: "@intl:numberformatter::formatcurrency",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getattribute: {
          name: "getAttribute",
          id: "@intl:numberformatter::getattribute",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setattribute: {
          name: "setAttribute",
          id: "@intl:numberformatter::setattribute",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettextattribute: {
          name: "getTextAttribute",
          id: "@intl:numberformatter::gettextattribute",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settextattribute: {
          name: "setTextAttribute",
          id: "@intl:numberformatter::settextattribute",
          owner: "NumberFormatter",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeIntl: true
    },
    functions: {
      "@intl:numberformatter::__construct": {
        name: "NumberFormatter::__construct",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v7374796c65",
            name: "style",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          },
          {
            id: "v7061747465726e",
            name: "pattern",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::create": {
        name: "NumberFormatter::create",
        parameters: [
          {
            id: "v6c6f63616c65",
            name: "locale",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v7374796c65",
            name: "style",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          },
          {
            id: "v7061747465726e",
            name: "pattern",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "create"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::format": {
        name: "NumberFormatter::format",
        parameters: [
          {
            id: "v6e756d",
            name: "num",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int",
                "float"
              ],
              nullable: false
            }
          },
          {
            id: "v74797065",
            name: "type",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            },
            default: 0
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::formatcurrency": {
        name: "NumberFormatter::formatCurrency",
        parameters: [
          {
            id: "v616d6f756e74",
            name: "amount",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "float"
              ],
              nullable: false
            }
          },
          {
            id: "v63757272656e6379",
            name: "currency",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "formatcurrency"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::getattribute": {
        name: "NumberFormatter::getAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "getattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::setattribute": {
        name: "NumberFormatter::setAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int",
                "float"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "setattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::gettextattribute": {
        name: "NumberFormatter::getTextAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "gettextattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@intl:numberformatter::settextattribute": {
        name: "NumberFormatter::setTextAttribute",
        parameters: [
          {
            id: "v617474726962757465",
            name: "attribute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false
            }
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeIntl: {
          class: "NumberFormatter",
          method: "settextattribute"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  }
};

// src-js/core/intl-currencies.json
var intl_currencies_default = { af: "XXX", "af-na": "NAD", "af-za": "ZAR", agq: "XXX", "agq-cm": "XAF", ak: "XXX", "ak-gh": "GHS", am: "XXX", "am-et": "ETB", ar: "XXX", "ar-001": "XXX", "ar-ae": "AED", "ar-bh": "BHD", "ar-dj": "DJF", "ar-dz": "DZD", "ar-eg": "EGP", "ar-eh": "MAD", "ar-er": "ERN", "ar-il": "ILS", "ar-iq": "IQD", "ar-jo": "JOD", "ar-km": "KMF", "ar-kw": "KWD", "ar-lb": "LBP", "ar-ly": "LYD", "ar-ma": "MAD", "ar-mr": "MRU", "ar-om": "OMR", "ar-ps": "ILS", "ar-qa": "QAR", "ar-sa": "SAR", "ar-sd": "SDG", "ar-so": "SOS", "ar-ss": "SSP", "ar-sy": "SYP", "ar-td": "XAF", "ar-tn": "TND", "ar-ye": "YER", as: "XXX", "as-in": "INR", asa: "XXX", "asa-tz": "TZS", ast: "XXX", "ast-es": "EUR", az: "XXX", "az-cyrl": "XXX", "az-cyrl-az": "AZN", "az-latn": "XXX", "az-latn-az": "AZN", bas: "XXX", "bas-cm": "XAF", be: "XXX", "be-by": "BYN", bem: "XXX", "bem-zm": "ZMW", bez: "XXX", "bez-tz": "TZS", bg: "XXX", "bg-bg": "BGN", bgc: "XXX", "bgc-in": "INR", bho: "XXX", "bho-in": "INR", blo: "XXX", "blo-bj": "XOF", bm: "XXX", "bm-ml": "XOF", bn: "XXX", "bn-bd": "BDT", "bn-in": "INR", bo: "XXX", "bo-cn": "CNY", "bo-in": "INR", br: "XXX", "br-fr": "EUR", brx: "XXX", "brx-in": "INR", bs: "XXX", "bs-cyrl": "XXX", "bs-cyrl-ba": "BAM", "bs-latn": "XXX", "bs-latn-ba": "BAM", ca: "XXX", "ca-ad": "EUR", "ca-es": "EUR", "ca-fr": "EUR", "ca-it": "EUR", ccp: "XXX", "ccp-bd": "BDT", "ccp-in": "INR", ce: "XXX", "ce-ru": "RUB", ceb: "XXX", "ceb-ph": "PHP", cgg: "XXX", "cgg-ug": "UGX", chr: "XXX", "chr-us": "USD", ckb: "XXX", "ckb-iq": "IQD", "ckb-ir": "IRR", cs: "XXX", "cs-cz": "CZK", csw: "XXX", "csw-ca": "CAD", cv: "XXX", "cv-ru": "RUB", cy: "XXX", "cy-gb": "GBP", da: "XXX", "da-dk": "DKK", "da-gl": "DKK", dav: "XXX", "dav-ke": "KES", de: "XXX", "de-at": "EUR", "de-be": "EUR", "de-ch": "CHF", "de-de": "EUR", "de-it": "EUR", "de-li": "CHF", "de-lu": "EUR", dje: "XXX", "dje-ne": "XOF", doi: "XXX", "doi-in": "INR", dsb: "XXX", "dsb-de": "EUR", dua: "XXX", "dua-cm": "XAF", dyo: "XXX", "dyo-sn": "XOF", dz: "XXX", "dz-bt": "BTN", ebu: "XXX", "ebu-ke": "KES", ee: "XXX", "ee-gh": "GHS", "ee-tg": "XOF", el: "XXX", "el-cy": "EUR", "el-gr": "EUR", en: "XXX", "en-001": "XXX", "en-150": "XXX", "en-ae": "AED", "en-ag": "XCD", "en-ai": "XCD", "en-as": "USD", "en-at": "EUR", "en-au": "AUD", "en-bb": "BBD", "en-be": "EUR", "en-bi": "BIF", "en-bm": "BMD", "en-bs": "BSD", "en-bw": "BWP", "en-bz": "BZD", "en-ca": "CAD", "en-cc": "AUD", "en-ch": "CHF", "en-ck": "NZD", "en-cm": "XAF", "en-cx": "AUD", "en-cy": "EUR", "en-cz": "CZK", "en-de": "EUR", "en-dg": "USD", "en-dk": "DKK", "en-dm": "XCD", "en-er": "ERN", "en-es": "EUR", "en-fi": "EUR", "en-fj": "FJD", "en-fk": "FKP", "en-fm": "USD", "en-fr": "EUR", "en-gb": "GBP", "en-gd": "XCD", "en-gg": "GBP", "en-gh": "GHS", "en-gi": "GIP", "en-gm": "GMD", "en-gs": "GBP", "en-gu": "USD", "en-gy": "GYD", "en-hk": "HKD", "en-hu": "HUF", "en-id": "IDR", "en-ie": "EUR", "en-il": "ILS", "en-im": "GBP", "en-in": "INR", "en-io": "USD", "en-it": "EUR", "en-je": "GBP", "en-jm": "JMD", "en-ke": "KES", "en-ki": "AUD", "en-kn": "XCD", "en-ky": "KYD", "en-lc": "XCD", "en-lr": "LRD", "en-ls": "ZAR", "en-mg": "MGA", "en-mh": "USD", "en-mo": "MOP", "en-mp": "USD", "en-ms": "XCD", "en-mt": "EUR", "en-mu": "MUR", "en-mv": "MVR", "en-mw": "MWK", "en-my": "MYR", "en-na": "NAD", "en-nf": "AUD", "en-ng": "NGN", "en-nl": "EUR", "en-no": "NOK", "en-nr": "AUD", "en-nu": "NZD", "en-nz": "NZD", "en-pg": "PGK", "en-ph": "PHP", "en-pk": "PKR", "en-pl": "PLN", "en-pn": "NZD", "en-pr": "USD", "en-pt": "EUR", "en-pw": "USD", "en-ro": "RON", "en-rw": "RWF", "en-sb": "SBD", "en-sc": "SCR", "en-sd": "SDG", "en-se": "SEK", "en-sg": "SGD", "en-sh": "SHP", "en-si": "EUR", "en-sk": "EUR", "en-sl": "SLE", "en-ss": "SSP", "en-sx": "XCG", "en-sz": "SZL", "en-tc": "USD", "en-tk": "NZD", "en-to": "TOP", "en-tt": "TTD", "en-tv": "AUD", "en-tz": "TZS", "en-ug": "UGX", "en-um": "USD", "en-us": "USD", "en-us-posix": "USD", "en-vc": "XCD", "en-vg": "USD", "en-vi": "USD", "en-vu": "VUV", "en-ws": "WST", "en-za": "ZAR", "en-zm": "ZMW", "en-zw": "ZWG", eo: "XXX", "eo-001": "XXX", es: "XXX", "es-419": "XXX", "es-ar": "ARS", "es-bo": "BOB", "es-br": "BRL", "es-bz": "BZD", "es-cl": "CLP", "es-co": "COP", "es-cr": "CRC", "es-cu": "CUP", "es-do": "DOP", "es-ea": "EUR", "es-ec": "USD", "es-es": "EUR", "es-gq": "XAF", "es-gt": "GTQ", "es-hn": "HNL", "es-ic": "EUR", "es-mx": "MXN", "es-ni": "NIO", "es-pa": "PAB", "es-pe": "PEN", "es-ph": "PHP", "es-pr": "USD", "es-py": "PYG", "es-sv": "USD", "es-us": "USD", "es-uy": "UYU", "es-ve": "VES", et: "XXX", "et-ee": "EUR", eu: "XXX", "eu-es": "EUR", ewo: "XXX", "ewo-cm": "XAF", fa: "XXX", "fa-af": "AFN", "fa-ir": "IRR", ff: "XXX", "ff-adlm": "XXX", "ff-adlm-bf": "XOF", "ff-adlm-cm": "XAF", "ff-adlm-gh": "GHS", "ff-adlm-gm": "GMD", "ff-adlm-gn": "GNF", "ff-adlm-gw": "XOF", "ff-adlm-lr": "LRD", "ff-adlm-mr": "MRU", "ff-adlm-ne": "XOF", "ff-adlm-ng": "NGN", "ff-adlm-sl": "SLE", "ff-adlm-sn": "XOF", "ff-latn": "XXX", "ff-latn-bf": "XOF", "ff-latn-cm": "XAF", "ff-latn-gh": "GHS", "ff-latn-gm": "GMD", "ff-latn-gn": "GNF", "ff-latn-gw": "XOF", "ff-latn-lr": "LRD", "ff-latn-mr": "MRU", "ff-latn-ne": "XOF", "ff-latn-ng": "NGN", "ff-latn-sl": "SLE", "ff-latn-sn": "XOF", fi: "XXX", "fi-fi": "EUR", fil: "XXX", "fil-ph": "PHP", fo: "XXX", "fo-dk": "DKK", "fo-fo": "DKK", fr: "XXX", "fr-be": "EUR", "fr-bf": "XOF", "fr-bi": "BIF", "fr-bj": "XOF", "fr-bl": "EUR", "fr-ca": "CAD", "fr-cd": "CDF", "fr-cf": "XAF", "fr-cg": "XAF", "fr-ch": "CHF", "fr-ci": "XOF", "fr-cm": "XAF", "fr-dj": "DJF", "fr-dz": "DZD", "fr-fr": "EUR", "fr-ga": "XAF", "fr-gf": "EUR", "fr-gn": "GNF", "fr-gp": "EUR", "fr-gq": "XAF", "fr-ht": "HTG", "fr-km": "KMF", "fr-lu": "EUR", "fr-ma": "MAD", "fr-mc": "EUR", "fr-mf": "EUR", "fr-mg": "MGA", "fr-ml": "XOF", "fr-mq": "EUR", "fr-mr": "MRU", "fr-mu": "MUR", "fr-nc": "XPF", "fr-ne": "XOF", "fr-pf": "XPF", "fr-pm": "EUR", "fr-re": "EUR", "fr-rw": "RWF", "fr-sc": "SCR", "fr-sn": "XOF", "fr-sy": "SYP", "fr-td": "XAF", "fr-tg": "XOF", "fr-tn": "TND", "fr-vu": "VUV", "fr-wf": "XPF", "fr-yt": "EUR", fur: "XXX", "fur-it": "EUR", fy: "XXX", "fy-nl": "EUR", ga: "XXX", "ga-gb": "GBP", "ga-ie": "EUR", gaa: "XXX", "gaa-gh": "GHS", gd: "XXX", "gd-gb": "GBP", gl: "XXX", "gl-es": "EUR", gsw: "XXX", "gsw-ch": "CHF", "gsw-fr": "EUR", "gsw-li": "CHF", gu: "XXX", "gu-in": "INR", guz: "XXX", "guz-ke": "KES", gv: "XXX", "gv-im": "GBP", ha: "XXX", "ha-gh": "GHS", "ha-ne": "XOF", "ha-ng": "NGN", haw: "XXX", "haw-us": "USD", he: "XXX", "he-il": "ILS", hi: "XXX", "hi-in": "INR", "hi-latn": "XXX", "hi-latn-in": "INR", hr: "XXX", "hr-ba": "BAM", "hr-hr": "EUR", hsb: "XXX", "hsb-de": "EUR", hu: "XXX", "hu-hu": "HUF", hy: "XXX", "hy-am": "AMD", ia: "XXX", "ia-001": "XXX", id: "XXX", "id-id": "IDR", ie: "XXX", "ie-ee": "EUR", ig: "XXX", "ig-ng": "NGN", ii: "XXX", "ii-cn": "CNY", is: "XXX", "is-is": "ISK", it: "XXX", "it-ch": "CHF", "it-it": "EUR", "it-sm": "EUR", "it-va": "EUR", ja: "XXX", "ja-jp": "JPY", jgo: "XXX", "jgo-cm": "XAF", jmc: "XXX", "jmc-tz": "TZS", jv: "XXX", "jv-id": "IDR", ka: "XXX", "ka-ge": "GEL", kab: "XXX", "kab-dz": "DZD", kam: "XXX", "kam-ke": "KES", kde: "XXX", "kde-tz": "TZS", kea: "XXX", "kea-cv": "CVE", kgp: "XXX", "kgp-br": "BRL", khq: "XXX", "khq-ml": "XOF", ki: "XXX", "ki-ke": "KES", kk: "XXX", "kk-cyrl": "XXX", "kk-cyrl-kz": "KZT", "kk-kz": "KZT", kkj: "XXX", "kkj-cm": "XAF", kl: "XXX", "kl-gl": "DKK", kln: "XXX", "kln-ke": "KES", km: "XXX", "km-kh": "KHR", kn: "XXX", "kn-in": "INR", ko: "XXX", "ko-cn": "CNY", "ko-kp": "KPW", "ko-kr": "KRW", kok: "XXX", "kok-deva": "XXX", "kok-deva-in": "INR", "kok-latn": "XXX", "kok-latn-in": "INR", ks: "XXX", "ks-arab": "XXX", "ks-arab-in": "INR", "ks-deva": "XXX", "ks-deva-in": "INR", ksb: "XXX", "ksb-tz": "TZS", ksf: "XXX", "ksf-cm": "XAF", ksh: "XXX", "ksh-de": "EUR", ku: "XXX", "ku-tr": "TRY", kw: "XXX", "kw-gb": "GBP", kxv: "XXX", "kxv-deva": "XXX", "kxv-deva-in": "INR", "kxv-latn": "XXX", "kxv-latn-in": "INR", "kxv-orya": "XXX", "kxv-orya-in": "INR", "kxv-telu": "XXX", "kxv-telu-in": "INR", ky: "XXX", "ky-kg": "KGS", lag: "XXX", "lag-tz": "TZS", lb: "XXX", "lb-lu": "EUR", lg: "XXX", "lg-ug": "UGX", lij: "XXX", "lij-it": "EUR", lkt: "XXX", "lkt-us": "USD", lmo: "XXX", "lmo-it": "EUR", ln: "XXX", "ln-ao": "AOA", "ln-cd": "CDF", "ln-cf": "XAF", "ln-cg": "XAF", lo: "XXX", "lo-la": "LAK", lrc: "XXX", "lrc-iq": "IQD", "lrc-ir": "IRR", lt: "XXX", "lt-lt": "EUR", lu: "XXX", "lu-cd": "CDF", luo: "XXX", "luo-ke": "KES", luy: "XXX", "luy-ke": "KES", lv: "XXX", "lv-lv": "EUR", mai: "XXX", "mai-in": "INR", mas: "XXX", "mas-ke": "KES", "mas-tz": "TZS", mer: "XXX", "mer-ke": "KES", mfe: "XXX", "mfe-mu": "MUR", mg: "XXX", "mg-mg": "MGA", mgh: "XXX", "mgh-mz": "MZN", mgo: "XXX", "mgo-cm": "XAF", mi: "XXX", "mi-nz": "NZD", mk: "XXX", "mk-mk": "MKD", ml: "XXX", "ml-in": "INR", mn: "XXX", "mn-mn": "MNT", mni: "XXX", "mni-beng": "XXX", "mni-beng-in": "INR", mr: "XXX", "mr-in": "INR", ms: "XXX", "ms-bn": "BND", "ms-id": "IDR", "ms-my": "MYR", "ms-sg": "SGD", mt: "XXX", "mt-mt": "EUR", mua: "XXX", "mua-cm": "XAF", my: "XXX", "my-mm": "MMK", mzn: "XXX", "mzn-ir": "IRR", naq: "XXX", "naq-na": "NAD", nb: "XXX", "nb-no": "NOK", "nb-sj": "NOK", nd: "XXX", "nd-zw": "ZWG", nds: "XXX", "nds-de": "EUR", "nds-nl": "EUR", ne: "XXX", "ne-in": "INR", "ne-np": "NPR", nl: "XXX", "nl-aw": "AWG", "nl-be": "EUR", "nl-bq": "USD", "nl-cw": "XCG", "nl-nl": "EUR", "nl-sr": "SRD", "nl-sx": "XCG", nmg: "XXX", "nmg-cm": "XAF", nn: "XXX", "nn-no": "NOK", nnh: "XXX", "nnh-cm": "XAF", no: "XXX", nqo: "XXX", "nqo-gn": "GNF", nso: "XXX", "nso-za": "ZAR", nus: "XXX", "nus-ss": "SSP", nyn: "XXX", "nyn-ug": "UGX", oc: "XXX", "oc-es": "EUR", "oc-fr": "EUR", om: "XXX", "om-et": "ETB", "om-ke": "KES", or: "XXX", "or-in": "INR", os: "XXX", "os-ge": "GEL", "os-ru": "RUB", pa: "XXX", "pa-arab": "XXX", "pa-arab-pk": "PKR", "pa-guru": "XXX", "pa-guru-in": "INR", pcm: "XXX", "pcm-ng": "NGN", pl: "XXX", "pl-pl": "PLN", prg: "XXX", "prg-pl": "PLN", ps: "XXX", "ps-af": "AFN", "ps-pk": "PKR", pt: "XXX", "pt-ao": "AOA", "pt-br": "BRL", "pt-ch": "CHF", "pt-cv": "CVE", "pt-gq": "XAF", "pt-gw": "XOF", "pt-lu": "EUR", "pt-mo": "MOP", "pt-mz": "MZN", "pt-pt": "EUR", "pt-st": "STN", "pt-tl": "USD", qu: "XXX", "qu-bo": "BOB", "qu-ec": "USD", "qu-pe": "PEN", raj: "XXX", "raj-in": "INR", rm: "XXX", "rm-ch": "CHF", rn: "XXX", "rn-bi": "BIF", ro: "XXX", "ro-md": "MDL", "ro-ro": "RON", rof: "XXX", "rof-tz": "TZS", ru: "XXX", "ru-by": "BYN", "ru-kg": "KGS", "ru-kz": "KZT", "ru-md": "MDL", "ru-ru": "RUB", "ru-ua": "UAH", rw: "XXX", "rw-rw": "RWF", rwk: "XXX", "rwk-tz": "TZS", sa: "XXX", "sa-in": "INR", sah: "XXX", "sah-ru": "RUB", saq: "XXX", "saq-ke": "KES", sat: "XXX", "sat-olck": "XXX", "sat-olck-in": "INR", sbp: "XXX", "sbp-tz": "TZS", sc: "XXX", "sc-it": "EUR", sd: "XXX", "sd-arab": "XXX", "sd-arab-pk": "PKR", "sd-deva": "XXX", "sd-deva-in": "INR", se: "XXX", "se-fi": "EUR", "se-no": "NOK", "se-se": "SEK", seh: "XXX", "seh-mz": "MZN", ses: "XXX", "ses-ml": "XOF", sg: "XXX", "sg-cf": "XAF", shi: "XXX", "shi-latn": "XXX", "shi-latn-ma": "MAD", "shi-tfng": "XXX", "shi-tfng-ma": "MAD", si: "XXX", "si-lk": "LKR", sk: "XXX", "sk-sk": "EUR", sl: "XXX", "sl-si": "EUR", smn: "XXX", "smn-fi": "EUR", sn: "XXX", "sn-zw": "ZWG", so: "XXX", "so-dj": "DJF", "so-et": "ETB", "so-ke": "KES", "so-so": "SOS", sq: "XXX", "sq-al": "ALL", "sq-mk": "MKD", "sq-xk": "EUR", sr: "XXX", "sr-cyrl": "XXX", "sr-cyrl-ba": "BAM", "sr-cyrl-me": "EUR", "sr-cyrl-rs": "RSD", "sr-cyrl-xk": "EUR", "sr-latn": "XXX", "sr-latn-ba": "BAM", "sr-latn-me": "EUR", "sr-latn-rs": "RSD", "sr-latn-xk": "EUR", st: "XXX", "st-ls": "ZAR", "st-za": "ZAR", su: "XXX", "su-latn": "XXX", "su-latn-id": "IDR", sv: "XXX", "sv-ax": "EUR", "sv-fi": "EUR", "sv-se": "SEK", sw: "XXX", "sw-cd": "CDF", "sw-ke": "KES", "sw-tz": "TZS", "sw-ug": "UGX", syr: "XXX", "syr-iq": "IQD", "syr-sy": "SYP", szl: "XXX", "szl-pl": "PLN", ta: "XXX", "ta-in": "INR", "ta-lk": "LKR", "ta-my": "MYR", "ta-sg": "SGD", te: "XXX", "te-in": "INR", teo: "XXX", "teo-ke": "KES", "teo-ug": "UGX", tg: "XXX", "tg-tj": "TJS", th: "XXX", "th-th": "THB", ti: "XXX", "ti-er": "ERN", "ti-et": "ETB", tk: "XXX", "tk-tm": "TMT", tn: "XXX", "tn-bw": "BWP", "tn-za": "ZAR", to: "XXX", "to-to": "TOP", tok: "XXX", "tok-001": "XXX", tr: "XXX", "tr-cy": "EUR", "tr-tr": "TRY", tt: "XXX", "tt-ru": "RUB", twq: "XXX", "twq-ne": "XOF", tzm: "XXX", "tzm-ma": "MAD", ug: "XXX", "ug-cn": "CNY", uk: "XXX", "uk-ua": "UAH", ur: "XXX", "ur-in": "INR", "ur-pk": "PKR", uz: "XXX", "uz-arab": "XXX", "uz-arab-af": "AFN", "uz-cyrl": "XXX", "uz-cyrl-uz": "UZS", "uz-latn": "XXX", "uz-latn-uz": "UZS", vai: "XXX", "vai-latn": "XXX", "vai-latn-lr": "LRD", "vai-vaii": "XXX", "vai-vaii-lr": "LRD", vec: "XXX", "vec-it": "EUR", vi: "XXX", "vi-vn": "VND", vmw: "XXX", "vmw-mz": "MZN", vun: "XXX", "vun-tz": "TZS", wae: "XXX", "wae-ch": "CHF", wo: "XXX", "wo-sn": "XOF", xh: "XXX", "xh-za": "ZAR", xnr: "XXX", "xnr-in": "INR", xog: "XXX", "xog-ug": "UGX", yav: "XXX", "yav-cm": "XAF", yi: "XXX", "yi-ua": "UAH", yo: "XXX", "yo-bj": "XOF", "yo-ng": "NGN", yrl: "XXX", "yrl-br": "BRL", "yrl-co": "COP", "yrl-ve": "VES", yue: "XXX", "yue-hans": "XXX", "yue-hans-cn": "CNY", "yue-hant": "XXX", "yue-hant-cn": "CNY", "yue-hant-hk": "HKD", "yue-hant-mo": "MOP", za: "XXX", "za-cn": "CNY", zgh: "XXX", "zgh-ma": "MAD", zh: "XXX", "zh-hans": "XXX", "zh-hans-cn": "CNY", "zh-hans-hk": "HKD", "zh-hans-mo": "MOP", "zh-hans-my": "MYR", "zh-hans-sg": "SGD", "zh-hant": "XXX", "zh-hant-hk": "HKD", "zh-hant-mo": "MOP", "zh-hant-my": "MYR", "zh-hant-tw": "TWD", zu: "XXX", "zu-za": "ZAR" };

// src-js/core/php-intl.js
var storage2 = /* @__PURE__ */ new WeakMap();
var styles = { 1: "decimal", 2: "currency", 3: "percent", 12: "currency" };
var rounding = { 0: "ceil", 1: "floor", 2: "trunc", 3: "expand", 4: "halfEven", 5: "halfTrunc", 6: "halfExpand" };
var intlDefinition = (name) => typeof name === "string" ? intl_definitions_default[name.toLowerCase()]?.class || null : null;
var unsupported = (message) => failure("ValueError", "Frontend Intl: " + message);
var createData = (locale, style, pattern, context) => {
  if (!Object.hasOwn(styles, style) || pattern !== null) throw unsupported("NumberFormatter supports DECIMAL, CURRENCY, CURRENCY_ACCOUNTING and PERCENT without a custom pattern");
  locale = locale || context.source?.intlLocale || "en_US_POSIX";
  if (locale.length > 128 || locale.includes("@") || locale === "root" || locale.endsWith("_POSIX")) throw unsupported("use an explicit language or language-region locale, for example fr_CA");
  let tag;
  try {
    tag = Intl.getCanonicalLocales(locale.replaceAll("_", "-"))[0];
  } catch {
    throw unsupported("invalid locale");
  }
  if (!Intl.NumberFormat.supportedLocalesOf([tag]).length) throw unsupported("locale is not available in this browser");
  let currency = "XXX";
  if (styles[style] === "currency" || context.source?.intlCurrencyFromLocale) {
    const key = tag.toLowerCase();
    currency = intl_currencies_default[key] || intl_currencies_default[key.split("-")[0]] || "XXX";
  }
  const options = { style: styles[style], ...styles[style] === "currency" ? { currency, currencySign: style === 12 ? "accounting" : "standard" } : {} };
  const defaults = new Intl.NumberFormat(tag, options).resolvedOptions();
  if (!new Intl.NumberFormat(tag, { roundingMode: "halfEven" }).resolvedOptions().roundingMode) throw unsupported("this browser does not support the required Intl rounding modes");
  return { locale: tag, style, currency, textAttributes: /* @__PURE__ */ new Map(), attributes: /* @__PURE__ */ new Map([[9, style === 3 ? 100 : 1], [1, 1], [4, 1], [6, defaults.maximumFractionDigits], [7, defaults.minimumFractionDigits], [11, 4], [16, 0]]), fractionSet: false };
};
var format = (data, number, type, currency, context) => {
  if (![0, 1, 2, 3].includes(type)) throw unsupported("NumberFormatter::format supports TYPE_DEFAULT, TYPE_INT32, TYPE_INT64 and TYPE_DOUBLE");
  if (type === 1) number = Number(BigInt.asIntN(32, BigInt(Math.trunc(number))));
  else if (type === 2) number = Math.trunc(number);
  const attrs = data.attributes, options = { style: styles[data.style], useGrouping: attrs.get(1) !== 0, minimumIntegerDigits: attrs.get(4), roundingMode: rounding[attrs.get(11)] };
  if (options.style === "currency") {
    currency = currency ?? data.currency;
    if (!/^[a-z]{3}$/i.test(currency)) throw unsupported("currency must be a three-letter ISO currency code");
    options.currency = currency;
    options.currencySign = data.style === 12 ? "accounting" : "standard";
  }
  if (attrs.get(16)) {
    options.minimumSignificantDigits = attrs.get(17) ?? 1;
    options.maximumSignificantDigits = attrs.get(18) ?? 6;
  } else if (currency == null || currency === data.currency || data.fractionSet || options.style !== "currency") {
    options.minimumFractionDigits = attrs.get(7);
    options.maximumFractionDigits = attrs.get(6);
  }
  number *= attrs.get(9) / (options.style === "percent" ? 100 : 1);
  work(context);
  const formatter2 = new Intl.NumberFormat(data.locale, options), parts = formatter2.formatToParts(number);
  const first = parts.findIndex((p) => ["integer", "nan", "infinity"].includes(p.type));
  let last = parts.length - 1;
  while (last >= 0 && !["integer", "fraction", "nan", "infinity"].includes(parts[last].type)) last--;
  const prefix = data.textAttributes.get(number < 0 ? 2 : 0), suffix = data.textAttributes.get(number < 0 ? 3 : 1);
  return bounded((prefix ?? parts.slice(0, first).map((p) => p.value).join("")) + parts.slice(first, last + 1).map((p) => p.value).join("") + (suffix ?? parts.slice(last + 1).map((p) => p.value).join("")));
};
var method = (object, operation, values, context) => {
  if (context.readOnly) throw new Error("Use NumberFormatter in an event, then display the resulting State");
  if (operation === "__construct") {
    storage2.set(object, createData(...values, context));
    return null;
  }
  const data = storage2.get(object);
  if (!data) throw new Error("Uninitialized NumberFormatter");
  if (operation === "format") return format(data, values[0], values[1], null, context);
  if (operation === "formatcurrency") return format(data, values[0], 3, values[1], context);
  if (operation === "getattribute" || operation === "setattribute") {
    const [attribute, value] = values;
    if (![1, 4, 6, 7, 8, 9, 11, 16, 17, 18].includes(attribute)) throw unsupported("unsupported NumberFormatter attribute");
    if (operation === "getattribute") return attribute === 8 ? data.attributes.get(7) : data.attributes.get(attribute) ?? false;
    if (!Number.isFinite(value)) throw unsupported("attribute must be finite");
    const n = Math.trunc(value), attrs = data.attributes;
    if (attribute === 11 && !Object.hasOwn(rounding, n)) throw unsupported("unsupported rounding mode");
    if ([4, 17, 18].includes(attribute) && (n < 1 || n > 21) || [6, 7, 8].includes(attribute) && (n < 0 || n > 100)) throw unsupported("digit settings exceed the browser formatting range");
    if ([6, 7, 8].includes(attribute)) {
      data.fractionSet = true;
      if (attribute !== 6) attrs.set(7, n);
      if (attribute !== 7) attrs.set(6, n);
      if (attrs.get(7) > attrs.get(6)) attrs.set(attribute === 6 ? 7 : 6, n);
    } else attrs.set(attribute, [1, 16].includes(attribute) ? Number(!!n) : n);
    if (attribute === 17 || attribute === 18) {
      attrs.set(16, 1);
      if ((attrs.get(17) ?? 1) > (attrs.get(18) ?? 6)) attrs.set(attribute === 17 ? 18 : 17, n);
    }
    return true;
  }
  if (operation === "gettextattribute" || operation === "settextattribute") {
    if ([0, 1, 2, 3].includes(values[0])) {
      if (operation === "settextattribute") {
        data.textAttributes.set(values[0], values[1]);
        return true;
      }
      if (data.textAttributes.has(values[0])) return data.textAttributes.get(values[0]);
      const parts = new Intl.NumberFormat(data.locale, { style: styles[data.style], ...styles[data.style] === "currency" ? { currency: data.currency } : {}, currencySign: data.style === 12 ? "accounting" : "standard" }).formatToParts(values[0] >= 2 ? -1 : 1);
      const first = parts.findIndex((p) => p.type === "integer");
      let last = parts.length - 1;
      while (last >= 0 && !["integer", "fraction"].includes(parts[last].type)) last--;
      return (values[0] % 2 === 0 ? parts.slice(0, first) : parts.slice(last + 1)).map((p) => p.value).join("");
    }
    if (values[0] !== 5) throw unsupported("unsupported NumberFormatter text attribute");
    if (operation === "gettextattribute") return data.currency;
    if (!/^[a-z]{3}$/i.test(values[1])) throw unsupported("currency must be a three-letter ISO currency code");
    data.currency = values[1].toUpperCase();
    if (styles[data.style] === "currency" && !data.fractionSet) {
      const options = new Intl.NumberFormat(data.locale, { style: "currency", currency: data.currency }).resolvedOptions();
      data.attributes.set(6, options.maximumFractionDigits);
      data.attributes.set(7, options.minimumFractionDigits);
    }
    return true;
  }
  throw unsupported("unsupported method " + operation);
};
var create = (values, context) => {
  const data = createData(...values, context), object = makeObject(intlDefinition("NumberFormatter"));
  storage2.set(object, data);
  return object;
};
var nativeIntlMethod = (definition, context) => {
  const values = definition.parameters.map((p) => context.locals[p.id]), { class: name, method: operation } = definition.nativeIntl;
  if (["Collator", "IntlDateFormatter"].includes(name)) return extraIntl(name, operation, values, { ...context, intlParameters: definition.parameters }, intlDefinition(name));
  if (name === "Normalizer") {
    const builtin = { normalize: "normalizer_normalize", isnormalized: "normalizer_is_normalized", getrawdecomposition: "normalizer_get_raw_decomposition" }[operation];
    return runGrapheme(builtin, values.map((value2) => ({ value: value2, kind: phpType(value2) })), context);
  }
  const value = operation === "create" ? create(values, context) : method(context.thisObject, operation, values, context);
  return { value, kind: phpType(value) };
};
var operations = { numfmt_format: "format", numfmt_format_currency: "formatcurrency", numfmt_get_attribute: "getattribute", numfmt_set_attribute: "setattribute", numfmt_get_text_attribute: "gettextattribute", numfmt_set_text_attribute: "settextattribute" };
var runIntl = (name, items, context) => {
  if (!name.startsWith("numfmt_")) return null;
  const values = items.map((item) => item.value);
  if (context.readOnly) throw new Error("Use NumberFormatter in an event, then display the resulting State");
  const value = name === "numfmt_create" ? create(values, context) : method(values[0], operations[name], values.slice(1), context);
  return { value, kind: phpType(value) };
};
var cloneIntl = (value) => {
  const extra = cloneExtraIntl(value);
  if (extra) return extra;
  const data = storage2.get(value);
  if (!data) return null;
  const copy = makeObject(objectData(value).definition);
  storage2.set(copy, { ...data, attributes: new Map(data.attributes), textAttributes: new Map(data.textAttributes) });
  return copy;
};

// phpaml-module:intl
registerModule("intl", "0.1.0-beta.9", { ...php_intl_exports, ...php_intl_extra_exports });
