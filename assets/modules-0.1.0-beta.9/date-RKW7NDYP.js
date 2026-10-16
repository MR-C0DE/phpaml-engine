import {
  bounded,
  failure,
  makeArray,
  makeObject,
  objectData,
  phpType,
  warn,
  work
} from "./chunk-HCVTEZMH.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-date-values.js
var php_date_values_exports = {};
__export(php_date_values_exports, {
  cloneDate: () => cloneDate,
  createDateObject: () => createDateObject,
  dateData: () => dateData,
  dateDebugEntries: () => dateDebugEntries,
  dateDefinition: () => dateDefinition,
  dateParts: () => dateParts,
  dateStorage: () => dateStorage,
  dateUnsupported: () => dateUnsupported,
  defaultTimezone: () => defaultTimezone,
  formatDate: () => formatDate,
  fromParts: () => fromParts,
  isDateObject: () => isDateObject,
  nativeDateMethod: () => nativeDateMethod,
  parseDate: () => parseDate,
  runDates: () => runDates,
  safeTimestamp: () => safeTimestamp,
  timezone: () => timezone,
  zoneOffset: () => zoneOffset
});

// src-js/core/date-definitions.json
var date_definitions_default = {
  datetime: {
    class: {
      name: "DateTime",
      parent: null,
      ancestors: [
        "DateTimeInterface"
      ],
      interface: false,
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        ATOM: {
          owner: "DateTime",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        COOKIE: {
          owner: "DateTime",
          visibility: "public",
          value: "l, d-M-Y H:i:s T"
        },
        ISO8601: {
          owner: "DateTime",
          visibility: "public",
          value: "Y-m-d\\TH:i:sO"
        },
        ISO8601_EXPANDED: {
          owner: "DateTime",
          visibility: "public",
          value: "X-m-d\\TH:i:sP"
        },
        RFC822: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC850: {
          owner: "DateTime",
          visibility: "public",
          value: "l, d-M-y H:i:s T"
        },
        RFC1036: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC1123: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC7231: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M Y H:i:s \\G\\M\\T"
        },
        RFC2822: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC3339: {
          owner: "DateTime",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        RFC3339_EXTENDED: {
          owner: "DateTime",
          visibility: "public",
          value: "Y-m-d\\TH:i:s.vP"
        },
        RSS: {
          owner: "DateTime",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        W3C: {
          owner: "DateTime",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@date:datetime::__construct",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        format: {
          name: "format",
          id: "@date:datetime::format",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimestamp: {
          name: "getTimestamp",
          id: "@date:datetime::gettimestamp",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getoffset: {
          name: "getOffset",
          id: "@date:datetime::getoffset",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimezone: {
          name: "getTimezone",
          id: "@date:datetime::gettimezone",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settimestamp: {
          name: "setTimestamp",
          id: "@date:datetime::settimestamp",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settimezone: {
          name: "setTimezone",
          id: "@date:datetime::settimezone",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        modify: {
          name: "modify",
          id: "@date:datetime::modify",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setdate: {
          name: "setDate",
          id: "@date:datetime::setdate",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settime: {
          name: "setTime",
          id: "@date:datetime::settime",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfrominterface: {
          name: "createFromInterface",
          id: "@date:datetime::createfrominterface",
          owner: "DateTime",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfromimmutable: {
          name: "createFromImmutable",
          id: "@date:datetime::createfromimmutable",
          owner: "DateTime",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfromformat: {
          name: "createFromFormat",
          id: "@date:datetime::createfromformat",
          owner: "DateTime",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        getlasterrors: {
          name: "getLastErrors",
          id: "@date:datetime::getlasterrors",
          owner: "DateTime",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        add: {
          name: "add",
          id: "@date:datetime::add",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        sub: {
          name: "sub",
          id: "@date:datetime::sub",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        diff: {
          name: "diff",
          id: "@date:datetime::diff",
          owner: "DateTime",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:datetime::__construct": {
        name: "DateTime::__construct",
        parameters: [
          {
            id: "v6461746574696d65",
            name: "datetime",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            },
            default: "now"
          },
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::format": {
        name: "DateTime::format",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
        nativeDate: {
          class: "DateTime",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::gettimestamp": {
        name: "DateTime::getTimestamp",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "gettimestamp"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::getoffset": {
        name: "DateTime::getOffset",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "getoffset"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::gettimezone": {
        name: "DateTime::getTimezone",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "gettimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::settimestamp": {
        name: "DateTime::setTimestamp",
        parameters: [
          {
            id: "v74696d657374616d70",
            name: "timestamp",
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
        nativeDate: {
          class: "DateTime",
          method: "settimestamp"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::settimezone": {
        name: "DateTime::setTimezone",
        parameters: [
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "settimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::modify": {
        name: "DateTime::modify",
        parameters: [
          {
            id: "v6d6f646966696572",
            name: "modifier",
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
        nativeDate: {
          class: "DateTime",
          method: "modify"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::setdate": {
        name: "DateTime::setDate",
        parameters: [
          {
            id: "v79656172",
            name: "year",
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
            id: "v6d6f6e7468",
            name: "month",
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
            id: "v646179",
            name: "day",
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
        nativeDate: {
          class: "DateTime",
          method: "setdate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::settime": {
        name: "DateTime::setTime",
        parameters: [
          {
            id: "v686f7572",
            name: "hour",
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
            id: "v6d696e757465",
            name: "minute",
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
            id: "v7365636f6e64",
            name: "second",
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
            id: "v6d6963726f7365636f6e64",
            name: "microsecond",
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
        nativeDate: {
          class: "DateTime",
          method: "settime"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::createfrominterface": {
        name: "DateTime::createFromInterface",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "createfrominterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::createfromimmutable": {
        name: "DateTime::createFromImmutable",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeimmutable"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "createfromimmutable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::createfromformat": {
        name: "DateTime::createFromFormat",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
            id: "v6461746574696d65",
            name: "datetime",
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
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "createfromformat"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::getlasterrors": {
        name: "DateTime::getLastErrors",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "getlasterrors"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::add": {
        name: "DateTime::add",
        parameters: [
          {
            id: "v696e74657276616c",
            name: "interval",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "dateinterval"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "add"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::sub": {
        name: "DateTime::sub",
        parameters: [
          {
            id: "v696e74657276616c",
            name: "interval",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "dateinterval"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "sub"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetime::diff": {
        name: "DateTime::diff",
        parameters: [
          {
            id: "v7461726765744f626a656374",
            name: "targetObject",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          },
          {
            id: "v6162736f6c757465",
            name: "absolute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "bool"
              ],
              nullable: false
            },
            default: false
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTime",
          method: "diff"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  datetimeimmutable: {
    class: {
      name: "DateTimeImmutable",
      parent: null,
      ancestors: [
        "DateTimeInterface"
      ],
      interface: false,
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        ATOM: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        COOKIE: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "l, d-M-Y H:i:s T"
        },
        ISO8601: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "Y-m-d\\TH:i:sO"
        },
        ISO8601_EXPANDED: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "X-m-d\\TH:i:sP"
        },
        RFC822: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC850: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "l, d-M-y H:i:s T"
        },
        RFC1036: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC1123: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC7231: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M Y H:i:s \\G\\M\\T"
        },
        RFC2822: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC3339: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        RFC3339_EXTENDED: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "Y-m-d\\TH:i:s.vP"
        },
        RSS: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        W3C: {
          owner: "DateTimeImmutable",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@date:datetimeimmutable::__construct",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        format: {
          name: "format",
          id: "@date:datetimeimmutable::format",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimestamp: {
          name: "getTimestamp",
          id: "@date:datetimeimmutable::gettimestamp",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getoffset: {
          name: "getOffset",
          id: "@date:datetimeimmutable::getoffset",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimezone: {
          name: "getTimezone",
          id: "@date:datetimeimmutable::gettimezone",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settimestamp: {
          name: "setTimestamp",
          id: "@date:datetimeimmutable::settimestamp",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settimezone: {
          name: "setTimezone",
          id: "@date:datetimeimmutable::settimezone",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        modify: {
          name: "modify",
          id: "@date:datetimeimmutable::modify",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        setdate: {
          name: "setDate",
          id: "@date:datetimeimmutable::setdate",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        settime: {
          name: "setTime",
          id: "@date:datetimeimmutable::settime",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfrominterface: {
          name: "createFromInterface",
          id: "@date:datetimeimmutable::createfrominterface",
          owner: "DateTimeImmutable",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfrommutable: {
          name: "createFromMutable",
          id: "@date:datetimeimmutable::createfrommutable",
          owner: "DateTimeImmutable",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        createfromformat: {
          name: "createFromFormat",
          id: "@date:datetimeimmutable::createfromformat",
          owner: "DateTimeImmutable",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        getlasterrors: {
          name: "getLastErrors",
          id: "@date:datetimeimmutable::getlasterrors",
          owner: "DateTimeImmutable",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        add: {
          name: "add",
          id: "@date:datetimeimmutable::add",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        sub: {
          name: "sub",
          id: "@date:datetimeimmutable::sub",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        diff: {
          name: "diff",
          id: "@date:datetimeimmutable::diff",
          owner: "DateTimeImmutable",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:datetimeimmutable::__construct": {
        name: "DateTimeImmutable::__construct",
        parameters: [
          {
            id: "v6461746574696d65",
            name: "datetime",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false
            },
            default: "now"
          },
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::format": {
        name: "DateTimeImmutable::format",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
        nativeDate: {
          class: "DateTimeImmutable",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::gettimestamp": {
        name: "DateTimeImmutable::getTimestamp",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "gettimestamp"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::getoffset": {
        name: "DateTimeImmutable::getOffset",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "getoffset"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::gettimezone": {
        name: "DateTimeImmutable::getTimezone",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "gettimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::settimestamp": {
        name: "DateTimeImmutable::setTimestamp",
        parameters: [
          {
            id: "v74696d657374616d70",
            name: "timestamp",
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
        nativeDate: {
          class: "DateTimeImmutable",
          method: "settimestamp"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::settimezone": {
        name: "DateTimeImmutable::setTimezone",
        parameters: [
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "settimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::modify": {
        name: "DateTimeImmutable::modify",
        parameters: [
          {
            id: "v6d6f646966696572",
            name: "modifier",
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
        nativeDate: {
          class: "DateTimeImmutable",
          method: "modify"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::setdate": {
        name: "DateTimeImmutable::setDate",
        parameters: [
          {
            id: "v79656172",
            name: "year",
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
            id: "v6d6f6e7468",
            name: "month",
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
            id: "v646179",
            name: "day",
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
        nativeDate: {
          class: "DateTimeImmutable",
          method: "setdate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::settime": {
        name: "DateTimeImmutable::setTime",
        parameters: [
          {
            id: "v686f7572",
            name: "hour",
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
            id: "v6d696e757465",
            name: "minute",
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
            id: "v7365636f6e64",
            name: "second",
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
            id: "v6d6963726f7365636f6e64",
            name: "microsecond",
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
        nativeDate: {
          class: "DateTimeImmutable",
          method: "settime"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::createfrominterface": {
        name: "DateTimeImmutable::createFromInterface",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "createfrominterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::createfrommutable": {
        name: "DateTimeImmutable::createFromMutable",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetime"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "createfrommutable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::createfromformat": {
        name: "DateTimeImmutable::createFromFormat",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
            id: "v6461746574696d65",
            name: "datetime",
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
            id: "v74696d657a6f6e65",
            name: "timezone",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimezone"
              ],
              nullable: true
            },
            default: null
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "createfromformat"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::getlasterrors": {
        name: "DateTimeImmutable::getLastErrors",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "getlasterrors"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::add": {
        name: "DateTimeImmutable::add",
        parameters: [
          {
            id: "v696e74657276616c",
            name: "interval",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "dateinterval"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "add"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::sub": {
        name: "DateTimeImmutable::sub",
        parameters: [
          {
            id: "v696e74657276616c",
            name: "interval",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "dateinterval"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "sub"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeimmutable::diff": {
        name: "DateTimeImmutable::diff",
        parameters: [
          {
            id: "v7461726765744f626a656374",
            name: "targetObject",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          },
          {
            id: "v6162736f6c757465",
            name: "absolute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "bool"
              ],
              nullable: false
            },
            default: false
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeImmutable",
          method: "diff"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  datetimezone: {
    class: {
      name: "DateTimeZone",
      parent: null,
      ancestors: [],
      interface: false,
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        AFRICA: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 1
        },
        AMERICA: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 2
        },
        ANTARCTICA: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 4
        },
        ARCTIC: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 8
        },
        ASIA: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 16
        },
        ATLANTIC: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 32
        },
        AUSTRALIA: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 64
        },
        EUROPE: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 128
        },
        INDIAN: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 256
        },
        PACIFIC: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 512
        },
        UTC: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 1024
        },
        ALL: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 2047
        },
        ALL_WITH_BC: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 4095
        },
        PER_COUNTRY: {
          owner: "DateTimeZone",
          visibility: "public",
          value: 4096
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@date:datetimezone::__construct",
          owner: "DateTimeZone",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getname: {
          name: "getName",
          id: "@date:datetimezone::getname",
          owner: "DateTimeZone",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getoffset: {
          name: "getOffset",
          id: "@date:datetimezone::getoffset",
          owner: "DateTimeZone",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:datetimezone::__construct": {
        name: "DateTimeZone::__construct",
        parameters: [
          {
            id: "v74696d657a6f6e65",
            name: "timezone",
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
        nativeDate: {
          class: "DateTimeZone",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimezone::getname": {
        name: "DateTimeZone::getName",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeZone",
          method: "getname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimezone::getoffset": {
        name: "DateTimeZone::getOffset",
        parameters: [
          {
            id: "v6461746574696d65",
            name: "datetime",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeZone",
          method: "getoffset"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  datetimeinterface: {
    class: {
      name: "DateTimeInterface",
      parent: null,
      ancestors: [],
      interface: true,
      abstract: true,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        ATOM: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        COOKIE: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "l, d-M-Y H:i:s T"
        },
        ISO8601: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "Y-m-d\\TH:i:sO"
        },
        ISO8601_EXPANDED: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "X-m-d\\TH:i:sP"
        },
        RFC822: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC850: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "l, d-M-y H:i:s T"
        },
        RFC1036: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M y H:i:s O"
        },
        RFC1123: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC7231: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M Y H:i:s \\G\\M\\T"
        },
        RFC2822: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        RFC3339: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        },
        RFC3339_EXTENDED: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "Y-m-d\\TH:i:s.vP"
        },
        RSS: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "D, d M Y H:i:s O"
        },
        W3C: {
          owner: "DateTimeInterface",
          visibility: "public",
          value: "Y-m-d\\TH:i:sP"
        }
      },
      methods: {
        format: {
          name: "format",
          id: "@date:datetimeinterface::format",
          owner: "DateTimeInterface",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimestamp: {
          name: "getTimestamp",
          id: "@date:datetimeinterface::gettimestamp",
          owner: "DateTimeInterface",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getoffset: {
          name: "getOffset",
          id: "@date:datetimeinterface::getoffset",
          owner: "DateTimeInterface",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        gettimezone: {
          name: "getTimezone",
          id: "@date:datetimeinterface::gettimezone",
          owner: "DateTimeInterface",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        diff: {
          name: "diff",
          id: "@date:datetimeinterface::diff",
          owner: "DateTimeInterface",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:datetimeinterface::format": {
        name: "DateTimeInterface::format",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
        nativeDate: {
          class: "DateTimeInterface",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeinterface::gettimestamp": {
        name: "DateTimeInterface::getTimestamp",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeInterface",
          method: "gettimestamp"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeinterface::getoffset": {
        name: "DateTimeInterface::getOffset",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeInterface",
          method: "getoffset"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeinterface::gettimezone": {
        name: "DateTimeInterface::getTimezone",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeInterface",
          method: "gettimezone"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:datetimeinterface::diff": {
        name: "DateTimeInterface::diff",
        parameters: [
          {
            id: "v7461726765744f626a656374",
            name: "targetObject",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "datetimeinterface"
              ],
              nullable: false
            }
          },
          {
            id: "v6162736f6c757465",
            name: "absolute",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "bool"
              ],
              nullable: false
            },
            default: false
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DateTimeInterface",
          method: "diff"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  dateinterval: {
    class: {
      name: "DateInterval",
      parent: null,
      ancestors: [],
      interface: false,
      abstract: false,
      final: false,
      properties: {
        y: {
          name: "y",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        m: {
          name: "m",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        d: {
          name: "d",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        h: {
          name: "h",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        i: {
          name: "i",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        s: {
          name: "s",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        f: {
          name: "f",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        invert: {
          name: "invert",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        days: {
          name: "days",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        },
        from_string: {
          name: "from_string",
          owner: "DateInterval",
          visibility: "public",
          readonly: false,
          rule: null
        }
      },
      staticProperties: [],
      constants: [],
      methods: {
        __construct: {
          name: "__construct",
          id: "@date:dateinterval::__construct",
          owner: "DateInterval",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        format: {
          name: "format",
          id: "@date:dateinterval::format",
          owner: "DateInterval",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:dateinterval::__construct": {
        name: "DateInterval::__construct",
        parameters: [
          {
            id: "v6475726174696f6e",
            name: "duration",
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
        nativeDate: {
          class: "DateInterval",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateinterval::format": {
        name: "DateInterval::format",
        parameters: [
          {
            id: "v666f726d6174",
            name: "format",
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
        nativeDate: {
          class: "DateInterval",
          method: "format"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  dateperiod: {
    class: {
      name: "DatePeriod",
      parent: null,
      ancestors: [
        "IteratorAggregate",
        "Traversable"
      ],
      interface: false,
      abstract: false,
      final: false,
      properties: {
        start: {
          name: "start",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        current: {
          name: "current",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        end: {
          name: "end",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        interval: {
          name: "interval",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        recurrences: {
          name: "recurrences",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        include_start_date: {
          name: "include_start_date",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        },
        include_end_date: {
          name: "include_end_date",
          owner: "DatePeriod",
          visibility: "public",
          readonly: true,
          rule: null
        }
      },
      staticProperties: [],
      constants: {
        EXCLUDE_START_DATE: {
          owner: "DatePeriod",
          visibility: "public",
          value: 1
        },
        INCLUDE_END_DATE: {
          owner: "DatePeriod",
          visibility: "public",
          value: 2
        }
      },
      methods: {
        createfromiso8601string: {
          name: "createFromISO8601String",
          id: "@date:dateperiod::createfromiso8601string",
          owner: "DatePeriod",
          static: true,
          visibility: "public",
          abstract: false,
          final: false
        },
        __construct: {
          name: "__construct",
          id: "@date:dateperiod::__construct",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getstartdate: {
          name: "getStartDate",
          id: "@date:dateperiod::getstartdate",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getenddate: {
          name: "getEndDate",
          id: "@date:dateperiod::getenddate",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getdateinterval: {
          name: "getDateInterval",
          id: "@date:dateperiod::getdateinterval",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getrecurrences: {
          name: "getRecurrences",
          id: "@date:dateperiod::getrecurrences",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        getiterator: {
          name: "getIterator",
          id: "@date:dateperiod::getiterator",
          owner: "DatePeriod",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:dateperiod::createfromiso8601string": {
        name: "DatePeriod::createFromISO8601String",
        parameters: [
          {
            id: "v73706563696669636174696f6e",
            name: "specification",
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
            id: "v6f7074696f6e73",
            name: "options",
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
        nativeDate: {
          class: "DatePeriod",
          method: "createfromiso8601string"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::__construct": {
        name: "DatePeriod::__construct",
        parameters: [
          {
            id: "v7374617274",
            name: "start",
            reference: false,
            variadic: false,
            rule: null
          },
          {
            id: "v696e74657276616c",
            name: "interval",
            reference: false,
            variadic: false,
            rule: null,
            default: null
          },
          {
            id: "v656e64",
            name: "end",
            reference: false,
            variadic: false,
            rule: null,
            default: null
          },
          {
            id: "v6f7074696f6e73",
            name: "options",
            reference: false,
            variadic: false,
            rule: null,
            default: 0
          }
        ],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::getstartdate": {
        name: "DatePeriod::getStartDate",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "getstartdate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::getenddate": {
        name: "DatePeriod::getEndDate",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "getenddate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::getdateinterval": {
        name: "DatePeriod::getDateInterval",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "getdateinterval"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::getrecurrences": {
        name: "DatePeriod::getRecurrences",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "getrecurrences"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:dateperiod::getiterator": {
        name: "DatePeriod::getIterator",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "DatePeriod",
          method: "getiterator"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  internaliterator: {
    class: {
      name: "InternalIterator",
      parent: null,
      ancestors: [
        "Iterator",
        "Traversable"
      ],
      interface: false,
      abstract: true,
      final: true,
      properties: [],
      staticProperties: [],
      constants: [],
      methods: {
        current: {
          name: "current",
          id: "@date:internaliterator::current",
          owner: "InternalIterator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        key: {
          name: "key",
          id: "@date:internaliterator::key",
          owner: "InternalIterator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        next: {
          name: "next",
          id: "@date:internaliterator::next",
          owner: "InternalIterator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        valid: {
          name: "valid",
          id: "@date:internaliterator::valid",
          owner: "InternalIterator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        },
        rewind: {
          name: "rewind",
          id: "@date:internaliterator::rewind",
          owner: "InternalIterator",
          static: false,
          visibility: "public",
          abstract: false,
          final: false
        }
      },
      nativeDate: true
    },
    functions: {
      "@date:internaliterator::current": {
        name: "InternalIterator::current",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "InternalIterator",
          method: "current"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:internaliterator::key": {
        name: "InternalIterator::key",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "InternalIterator",
          method: "key"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:internaliterator::next": {
        name: "InternalIterator::next",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "InternalIterator",
          method: "next"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:internaliterator::valid": {
        name: "InternalIterator::valid",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "InternalIterator",
          method: "valid"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@date:internaliterator::rewind": {
        name: "InternalIterator::rewind",
        parameters: [],
        declared: true,
        returnType: null,
        nativeDate: {
          class: "InternalIterator",
          method: "rewind"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  stdclass: {
    class: {
      name: "stdClass",
      parent: null,
      ancestors: [],
      interface: false,
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: [],
      methods: [],
      nativeDate: false
    },
    functions: []
  }
};

// src-js/core/php-date-advanced.js
var php_date_advanced_exports = {};
__export(php_date_advanced_exports, {
  addInterval: () => addInterval,
  advancedDateEntries: () => advancedDateEntries,
  advancedDateMethod: () => advancedDateMethod,
  advancedDateProperty: () => advancedDateProperty,
  cloneAdvancedDate: () => cloneAdvancedDate,
  intervalData: () => intervalData
});

// src-js/core/php-date-format-parser.js
var php_date_format_parser_exports = {};
__export(php_date_format_parser_exports, {
  lastDateErrors: () => lastDateErrors,
  parseDateFormat: () => parseDateFormat
});
var encoder = new TextEncoder();
var monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
var baseline = () => ({ year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, microsecond: 0 });
var lastDateErrors = (context) => context.builtinMemory?.dateErrors ?? false;
var parseDateFormat = (format, text, zone, context) => {
  if (format.length > 4096 || text.length > 4096) throw dateUnsupported("format and date input are limited to 4096 characters");
  if (text.includes("\0")) throw dateUnsupported("DateTime::createFromFormat(): datetime must not contain null bytes");
  const tokens = [...format];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === "\\") {
      i++;
      continue;
    }
    if (!"!|+YymndjHGhgisuvaAOPpeUMFDlSz #;:/.,-()".includes(tokens[i])) throw dateUnsupported(`createFromFormat token ${tokens[i]} is unavailable; escape literal characters`);
  }
  let parts = { ...dateParts(Math.floor(Date.now() / 1e3), zone), microsecond: 0 }, cursor = 0, timeSeen = false, period = null, weekday = null, dayOfYear = null, timestamp = null, trailing = false;
  const parsed = /* @__PURE__ */ new Set(), warnings = /* @__PURE__ */ new Map(), errors = /* @__PURE__ */ new Map();
  let warningCount = 0, errorCount = 0;
  const offset = () => encoder.encode(text.slice(0, cursor)).length;
  const problem = (message, warning = false) => {
    if (warning) {
      warnings.set(offset(), message);
      warningCount++;
    } else {
      errors.set(offset(), message);
      errorCount++;
    }
  };
  const read = (pattern, message, numeric = false, minimum = 1) => {
    const start = cursor;
    let found = text.slice(cursor).match(pattern);
    if (!found && numeric) {
      problem("Unexpected data found.");
      while (cursor < text.length && !/^\d/.test(text.slice(cursor))) {
        cursor++;
        work(context);
      }
      found = text.slice(cursor).match(pattern);
      if (!found) {
        const end = cursor;
        cursor = start;
        problem(message);
        cursor = end;
        return null;
      }
    }
    if (!found) {
      problem(cursor === text.length ? "Not enough data available to satisfy format" : message);
      return null;
    }
    cursor += found[0].length;
    if (found[0].length < minimum) {
      problem(message);
      return null;
    }
    return found[0];
  };
  const put = (field, value) => {
    if (["hour", "minute", "second", "microsecond"].includes(field) && !timeSeen) {
      parts.hour = parts.minute = parts.second = parts.microsecond = 0;
      timeSeen = true;
    }
    parts[field] = value;
    parsed.add(field);
  };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    work(context);
    if (token === "!") {
      parts = baseline();
      parsed.clear();
      timeSeen = false;
      timestamp = null;
      continue;
    }
    if (token === "|") {
      for (const [key, value] of Object.entries(baseline())) if (!parsed.has(key)) parts[key] = value;
      continue;
    }
    if (token === "+") {
      trailing = true;
      continue;
    }
    if (cursor === text.length && token !== " ") {
      problem("Not enough data available to satisfy format");
      break;
    }
    if (token === " ") {
      cursor += text.slice(cursor).match(/^[ \t\u00a0\u202f]*/)?.[0].length || 0;
      continue;
    }
    if (token === "\\" || "#;:/.,-()".includes(token)) {
      const literal = token === "\\" ? tokens[++index] : token;
      if (literal === void 0) throw dateUnsupported("a trailing format escape is unavailable");
      if (token === "#" && /^[;:/.,\-()]/.test(text.slice(cursor))) cursor++;
      else if (text.startsWith(literal, cursor)) cursor += literal.length;
      else problem("The separation symbol could not be found");
      continue;
    }
    const specs = { Y: ["year", /^\d{1,4}/, "A four digit year could not be found"], y: ["year", /^\d{2}/, "A two digit year could not be found"], m: ["month", /^\d{1,2}/, "A two digit month could not be found"], n: ["month", /^\d{1,2}/, "A two digit month could not be found"], d: ["day", /^\d{1,2}/, "A two digit day could not be found"], j: ["day", /^\d{1,2}/, "A two digit day could not be found"], H: ["hour", /^\d{1,2}/, "A two digit hour could not be found"], G: ["hour", /^\d{1,2}/, "A two digit hour could not be found"], h: ["hour", /^\d{1,2}/, "A two digit hour could not be found"], g: ["hour", /^\d{1,2}/, "A two digit hour could not be found"], i: ["minute", /^\d{1,2}/, "A two digit minute could not be found"], s: ["second", /^\d{1,2}/, "A two digit second could not be found"], u: ["microsecond", /^\d{1,6}/, "A six digit microsecond could not be found"], v: ["microsecond", /^\d{1,3}/, "A three digit millisecond could not be found"] };
    if (specs[token]) {
      const [field, pattern, message] = specs[token], raw2 = read(pattern, message, true, ["i", "s", "y"].includes(token) ? 2 : 1);
      if (raw2 !== null) {
        let value = Number(raw2);
        if (token === "y") value += value < 70 ? 2e3 : 1900;
        if (token === "u" || token === "v") value = Number(raw2.padEnd(6, "0"));
        if ((token === "h" || token === "g") && value > 12) problem("Hour cannot be higher than 12");
        put(field, value);
      }
      continue;
    }
    if (token === "a" || token === "A") {
      const raw2 = read(/^(?:am|pm)/i, "A meridian could not be found");
      if (raw2 !== null) period = raw2.toLowerCase();
      continue;
    }
    if (token === "M" || token === "F") {
      const raw2 = read(/^[A-Za-z]+/, "A textual month could not be found");
      if (raw2 !== null) {
        const month = monthNames.findIndex((name) => name === raw2.toLowerCase() || name.slice(0, 3) === raw2.toLowerCase() || name === "september" && raw2.toLowerCase() === "sept");
        if (month < 0) problem("A textual month could not be found");
        else put("month", month + 1);
      }
      continue;
    }
    if (token === "D" || token === "l") {
      const raw2 = read(/^[A-Za-z]+/, "A textual day could not be found");
      if (raw2 !== null) {
        const day = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].findIndex((name) => name === raw2.toLowerCase() || name.slice(0, 3) === raw2.toLowerCase());
        if (day < 0) problem("A textual day could not be found");
        else weekday = day;
      }
      continue;
    }
    if (token === "S") {
      const raw2 = text.slice(cursor).match(/^(st|nd|rd|th)/i);
      if (raw2) cursor += raw2[0].length;
      continue;
    }
    if (token === "z") {
      const raw2 = read(/^\d{1,3}/, "A day of year could not be found", true);
      if (!parsed.has("year")) problem('A "day of year" can only come after a year has been found');
      else if (raw2 !== null) dayOfYear = Number(raw2);
      continue;
    }
    if (token === "U") {
      const raw2 = read(/^-?\d+/, "Found unexpected data");
      if (raw2 !== null) {
        timestamp = safeTimestamp(Number(raw2));
        zone = timezone("+00:00", context);
        parts = { ...dateParts(timestamp, zone), microsecond: 0 };
        for (const key of Object.keys(parts)) parsed.add(key);
      }
      continue;
    }
    if (/^[A-Za-z]+(?:$|[ \t])/.test(text.slice(cursor)) && !/^(?:UTC|GMT|Z)(?:$|[ \t])/.test(text.slice(cursor))) throw dateUnsupported("use UTC, an explicit numeric offset or an IANA timezone identifier");
    const raw = read(/^(?:Z|UTC|GMT|[+-]\d{2}:?\d{2}|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)/, "The timezone could not be found in the database");
    if (raw !== null) {
      try {
        zone = timezone(raw, context);
      } catch (error) {
        if (error.name === "ValueError") throw error;
        cursor -= raw.length;
        problem("The timezone could not be found in the database");
        cursor += raw.length;
      }
    }
  }
  if (period !== null) parts.hour = parts.hour % 12 + (period === "pm" ? 12 : 0);
  if (parts.hour > 23 || parts.minute > 59 || parts.second > 59) problem("The parsed time was invalid", true);
  const days = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > days) problem("The parsed date was invalid", true);
  if (cursor < text.length) problem("Trailing data", trailing);
  (context.builtinMemory ||= {}).dateErrors = warningCount || errorCount ? { warning_count: warningCount, warnings: makeArray([...warnings]), error_count: errorCount, errors: makeArray([...errors]) } : false;
  if (errorCount) return false;
  if (dayOfYear !== null) {
    parts.month = 1;
    parts.day = dayOfYear + 1;
  }
  if (weekday !== null) {
    const calendar = /* @__PURE__ */ new Date(0);
    calendar.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    parts.day += (weekday - calendar.getUTCDay() + 7) % 7;
  }
  return { timestamp: fromParts(parts, zone), microsecond: parts.microsecond, zone };
};

// src-js/core/php-date-advanced.js
var intervalKeys = ["y", "m", "d", "h", "i", "s", "f", "invert", "days", "from_string"];
var zeroInterval = () => ({ type: "interval", y: 0, m: 0, d: 0, h: 0, i: 0, s: 0, f: 0, invert: 0, days: false, from_string: false });
var compareDates = (a, b) => a.timestamp - b.timestamp || a.microsecond - b.microsecond;
var monthDays = (year, month) => {
  const date = /* @__PURE__ */ new Date(0);
  date.setUTCFullYear(year, month, 0);
  return date.getUTCDate();
};
var sameTime = (a, b) => a.hour === b.hour && a.minute === b.minute && a.second === b.second;
var cloneData = (object, context) => {
  const copy = createDateObject(objectData(object).definition.name, { ...dateStorage.get(object) }, context);
  if (dateStorage.get(copy).type === "interval") syncInterval(copy);
  return copy;
};
var syncInterval = (object) => {
  const data = dateStorage.get(object), fields = objectData(object).fields;
  for (const key of intervalKeys) fields.set(key, { value: data[key], kind: key === "f" ? "double" : phpType(data[key]) });
};
var intervalData = (text, context) => {
  if (text.length > 4096) throw dateUnsupported("interval input is limited to 4096 characters");
  const extended = text.match(/^P(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (extended) text = `P${Number(extended[1])}Y${Number(extended[2])}M${Number(extended[3])}DT${Number(extended[4])}H${Number(extended[5])}M${Number(extended[6])}S`;
  const match = text.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match || !match.slice(1).some((v) => v !== void 0) || text.endsWith("T")) throw failure((context.source?.phpVersion ?? 80400) >= 80300 ? "DateMalformedIntervalStringException" : "Exception", "Unknown or bad format (" + text + ")");
  const values2 = match.slice(1).map((v) => Number(v || 0));
  if (values2.some((v) => v > 1e6)) throw dateUnsupported("interval fields are limited to 1000000 units");
  const [y, m, w, d, h, i, s] = values2;
  return { ...zeroInterval(), y, m, d: d + w * 7, h, i, s };
};
var addInterval = (data, interval, direction, context) => {
  const sign = (interval.invert ? -1 : 1) * direction, p = dateParts(data.timestamp, data.zone);
  p.year += sign * interval.y;
  p.month += sign * interval.m;
  p.day += sign * interval.d;
  const micro = data.microsecond + Math.round(sign * interval.f * 1e6), carry = Math.floor(micro / 1e6);
  const base = fromParts(p, data.zone);
  return { ...data, timestamp: safeTimestamp(base + sign * (interval.h * 3600 + interval.i * 60 + interval.s) + carry), microsecond: (micro % 1e6 + 1e6) % 1e6 };
};
var diffInterval = (first, second, absolute, context) => {
  const sameZone = first.zone.name === second.zone.name;
  if (!sameZone) {
    first = { ...first, zone: timezone("UTC", context) };
    second = { ...second, zone: timezone("UTC", context) };
  }
  const pa = dateParts(first.timestamp, first.zone), pb = dateParts(second.timestamp, second.zone);
  if (zoneOffset(first.timestamp, first.zone) !== zoneOffset(second.timestamp, second.zone) && (!sameTime(pa, pb) || first.microsecond !== second.microsecond)) throw dateUnsupported("diff across an offset transition requires matching local times; convert both to UTC for elapsed time");
  const invert = compareDates(first, second) > 0, low = invert ? second : first, high = invert ? first : second;
  const a = dateParts(low.timestamp, low.zone), b = dateParts(high.timestamp, high.zone), r = { ...zeroInterval(), y: b.year - a.year, m: b.month - a.month, d: b.day - a.day, h: b.hour - a.hour, i: b.minute - a.minute, s: b.second - a.second, f: (high.microsecond - low.microsecond) / 1e6, invert: absolute ? 0 : Number(invert) };
  if (r.f < 0) {
    r.f = (high.microsecond - low.microsecond + 1e6) / 1e6;
    r.s--;
  }
  for (const [small, big, base] of [["s", "i", 60], ["i", "h", 60], ["h", "d", 24]]) {
    const borrow = Math.floor(r[small] / base);
    r[small] -= borrow * base;
    r[big] += borrow;
  }
  let year = invert ? a.year : b.year, month = invert ? a.month : b.month;
  while (r.d < 0) {
    if (!invert) {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
    }
    r.d += monthDays(year, month);
    r.m--;
    if (invert) {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    work(context);
  }
  const years = Math.floor(r.m / 12);
  r.m -= years * 12;
  r.y += years;
  const civil = (p) => {
    const d = /* @__PURE__ */ new Date(0);
    d.setUTCFullYear(p.year, p.month - 1, p.day);
    d.setUTCHours(p.hour, p.minute, p.second, 0);
    return d.getTime() / 1e3;
  };
  const civilSeconds = civil(b) - civil(a);
  r.days = Math.floor(civilSeconds / 86400) - (civilSeconds % 86400 === 0 && high.microsecond < low.microsecond ? 1 : 0);
  return r;
};
var intervalFormat = (format, data, context) => {
  const lookup = { y: data.y, m: data.m, d: data.d, h: data.h, i: data.i, s: data.s, f: Math.round(data.f * 1e6), a: data.days === false ? "(unknown)" : data.days, r: data.invert ? "-" : "", R: data.invert ? "-" : "+", "%": "%" };
  for (const key of ["y", "m", "d", "h", "i", "s"]) lookup[key.toUpperCase()] = String(data[key]).padStart(2, "0");
  lookup.F = String(lookup.f).padStart(6, "0");
  return bounded(format.replace(/%([\s\S])/g, (match, key) => {
    work(context);
    return Object.hasOwn(lookup, key) ? lookup[key] : match;
  }));
};
var periodCopy = (value, context) => value === null ? null : cloneData(value, context);
var syncPeriod = (object, context) => {
  const data = dateStorage.get(object), fields = objectData(object).fields;
  if (!fields.has("start")) for (const [key, value] of Object.entries({ start: periodCopy(data.start, context), end: periodCopy(data.end, context), interval: periodCopy(data.interval, context), recurrences: data.recurrences === null ? Number(data.includeStart) + Number(data.includeEnd) : data.recurrences + Number(data.includeStart) + Number(data.includeEnd), include_start_date: data.includeStart, include_end_date: data.includeEnd })) fields.set(key, { value, kind: phpType(value) });
  if (!fields.has("current") || data.currentSource !== data.current) {
    data.currentSource = data.current;
    const value = periodCopy(data.current, context);
    fields.set("current", { value, kind: phpType(value) });
  }
  const ordered = new Map(["start", "current", "end", "interval", "recurrences", "include_start_date", "include_end_date"].map((key) => [key, fields.get(key)]));
  fields.clear();
  for (const [key, value] of ordered) fields.set(key, value);
};
var isoPeriodData = (text, options, context) => {
  const match = text.match(/^R(\d+)\/(.+)\/(P[^/]+)$/);
  if (!match) throw dateUnsupported("ISO DatePeriod requires R<count>/<ISO start>/<duration>");
  const start = createDateObject("DateTime", parseDate(match[2], timezone("UTC", context), context), context);
  const interval = createDateObject("DateInterval", intervalData(match[3], context), context);
  syncInterval(interval);
  return periodData([start, interval, Number(match[1]), options], context);
};
var periodData = (args, context) => {
  if (typeof args[0] === "string") return isoPeriodData(args[0], args[1] ?? 0, context);
  const [start, interval, end, options = 0] = args;
  if (dateStorage.get(start)?.timestamp === void 0 || dateStorage.get(interval)?.type !== "interval") throw dateUnsupported("DatePeriod requires a DateTimeInterface start, a DateInterval and an end date or recurrence count");
  if (options !== 0 && options !== 1 && options !== 2 && options !== 3) throw dateUnsupported("DatePeriod options must combine EXCLUDE_START_DATE and INCLUDE_END_DATE only");
  const data = { type: "period", start: cloneData(start, context), interval: cloneData(interval, context), current: null, end: null, recurrences: null, includeStart: !(options & 1), includeEnd: !!(options & 2) };
  if (typeof end === "number" && Number.isInteger(end)) {
    if (end < 1) throw failure((context.source?.phpVersion ?? 80400) >= 80300 ? "DateMalformedPeriodStringException" : "Exception", "DatePeriod::__construct(): Recurrence count must be greater than 0");
    if (end > 1e3) throw dateUnsupported("DatePeriod recurrence count is limited to 1000");
    data.recurrences = end;
  } else if (dateStorage.get(end)?.timestamp !== void 0) data.end = cloneData(end, context);
  else throw new TypeError("DatePeriod::__construct(): end must be a DateTimeInterface or int");
  const initial = dateStorage.get(data.start), next = addInterval(initial, dateStorage.get(interval), 1, context);
  if (compareDates(next, initial) <= 0) throw dateUnsupported("DatePeriod requires an interval that advances time");
  return data;
};
var resetIterator = (data, context) => {
  const period = dateStorage.get(data.period);
  data.position = 0;
  data.current = { ...dateStorage.get(period.start) };
  if (!period.includeStart) data.current = addInterval(data.current, dateStorage.get(period.interval), 1, context);
  period.current = createDateObject(objectData(period.start).definition.name, { ...data.current }, context);
  syncPeriod(data.period, context);
};
var validIterator = (data) => {
  const period = dateStorage.get(data.period);
  if (period.recurrences !== null) return data.position < period.recurrences + Number(period.includeStart) + Number(period.includeEnd);
  const comparison = compareDates(data.current, dateStorage.get(period.end));
  return period.includeEnd ? comparison <= 0 : comparison < 0;
};
var advancedDateEntries = (object, context) => {
  const data = dateStorage.get(object);
  if (!data?.type) return null;
  if (data.type === "interval") {
    data.inspected = true;
    syncInterval(object);
  } else if (data.type === "period") syncPeriod(object, context);
  return [...objectData(object).fields];
};
var advancedDateProperty = (object, name, context, parent = null) => {
  const data = dateStorage.get(object);
  if (!data?.type || !dateDefinition(objectData(object).definition.name)?.properties[name]) return null;
  const get = (quiet = false) => {
    if (name === "from_string" && !data.inspected) {
      if (!quiet) warn(context, "Undefined property: DateInterval::$from_string");
      return { value: null, kind: "NULL" };
    }
    if (data.type === "interval") syncInterval(object);
    else advancedDateEntries(object, context);
    return objectData(object).fields.get(name);
  };
  const ref = { get, probe: () => get(true), set: (value, kind) => {
    if (context.readOnly) throw new Error("Reactive text cannot modify date objects");
    if (dateStorage.get(parent)?.type === "period") throw new Error("Cannot modify readonly property DatePeriod");
    if (data.type !== "interval") throw new Error("Cannot modify readonly property DatePeriod::$" + name);
    if (name === "days") return get();
    if (name === "from_string") throw dateUnsupported("DateInterval::from_string is debug metadata");
    if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("DateInterval properties require numeric values");
    if (name === "f") {
      if (value < 0 || value >= 1) throw dateUnsupported("DateInterval::f must be between 0 inclusive and 1 exclusive");
      value = Math.trunc(value * 1e6) / 1e6;
      kind = "double";
    } else {
      if (!Number.isInteger(value) || Math.abs(value) > 1e6) throw dateUnsupported("interval fields must be integers within 1000000 units");
      kind = "integer";
    }
    data[name] = value;
    syncInterval(object);
    return { value, kind };
  }, remove: () => {
    throw dateUnsupported("date properties cannot be unset");
  } };
  ref.reference = () => {
    throw dateUnsupported("date properties cannot be bound by reference");
  };
  return ref;
};
var cloneAdvancedDate = (object, context) => {
  const data = dateStorage.get(object);
  if (!data?.type) return null;
  if (data.type === "iterator") throw new Error("Trying to clone an uncloneable object of class InternalIterator");
  const copy = createDateObject(objectData(object).definition.name, data.type === "period" ? { ...data, start: cloneData(data.start, context), interval: cloneData(data.interval, context), end: periodCopy(data.end, context), current: periodCopy(data.current, context) } : { ...data }, context);
  if (data.type === "interval") syncInterval(copy);
  else {
    for (const [key, item] of objectData(object).fields) objectData(copy).fields.set(key, { ...item });
    dateStorage.get(copy).currentSource = dateStorage.get(copy).current;
  }
  return copy;
};
var advancedDateMethod = (definition, context) => {
  const { class: name, method } = definition.nativeDate, args = definition.parameters.map((p) => context.locals[p.id]), object = context.thisObject, result = (value) => ({ value, kind: phpType(value) });
  if (method === "getlasterrors") return result(lastDateErrors(context));
  if (method === "createfromformat") {
    const parsed = parseDateFormat(args[0], args[1], args[2] ? dateStorage.get(args[2]).zone : timezone(defaultTimezone(context), context), context);
    return result(parsed === false ? false : createDateObject(name, parsed, context));
  }
  if (name === "DateInterval") {
    if (method === "__construct") {
      dateStorage.set(object, intervalData(args[0], context));
      syncInterval(object);
      return result(null);
    }
    return result(intervalFormat(args[0], dateStorage.get(object), context));
  }
  if (name === "DatePeriod") {
    if (method === "createfromiso8601string") {
      const value = createDateObject("DatePeriod", isoPeriodData(args[0], args[1], context), context);
      syncPeriod(value, context);
      return result(value);
    }
    if (method === "__construct") {
      if (typeof args[0] === "string" && (context.source?.phpVersion ?? 80400) >= 80400) warn(context, "Calling DatePeriod::__construct(string $isostr, int $options = 0) is deprecated", "PHP_DEPRECATED");
      dateStorage.set(object, periodData(args, context));
      syncPeriod(object, context);
      return result(null);
    }
    const data = dateStorage.get(object);
    if (method === "getrecurrences") return result(data.recurrences);
    if (method === "getiterator") {
      const iterator = createDateObject("InternalIterator", { type: "iterator", period: object, position: 0, current: null }, context);
      resetIterator(dateStorage.get(iterator), context);
      return result(iterator);
    }
    const key = { getstartdate: "start", getenddate: "end", getdateinterval: "interval" }[method];
    return result(periodCopy(data[key], context));
  }
  if (name === "InternalIterator") {
    const data = dateStorage.get(object), period = dateStorage.get(data.period);
    if (method === "rewind") {
      resetIterator(data, context);
      return result(null);
    }
    if (method === "valid") return result(validIterator(data));
    if (method === "key") return result(data.position);
    if (method === "current") return result(createDateObject(objectData(period.start).definition.name, { ...data.current }, context));
    if (method === "next") {
      if (data.position >= 1e3) throw dateUnsupported("DatePeriod iteration is limited to 1000 dates");
      const next = addInterval(data.current, dateStorage.get(period.interval), 1, context);
      if (compareDates(next, data.current) <= 0) throw dateUnsupported("DatePeriod interval must keep advancing time");
      data.current = next;
      data.position++;
      period.current = createDateObject(objectData(period.start).definition.name, { ...next }, context);
      syncPeriod(data.period, context);
      return result(null);
    }
  }
  if (method === "diff") {
    const interval = createDateObject("DateInterval", diffInterval(dateStorage.get(object), dateStorage.get(args[0]), args[1], context), context);
    syncInterval(interval);
    return result(interval);
  }
  if (method === "add" || method === "sub") {
    const changed = addInterval(dateStorage.get(object), dateStorage.get(args[0]), method === "add" ? 1 : -1, context);
    if (name === "DateTimeImmutable") return result(createDateObject(name, changed, context));
    dateStorage.set(object, changed);
    return result(object);
  }
  return null;
};

// src-js/core/php-date-values.js
var values = /* @__PURE__ */ new WeakMap();
var zones = /* @__PURE__ */ new Map();
var dateStorage = values;
var pad = (value, length = 2) => String(value).padStart(length, "0");
var unsupported = (message) => failure("ValueError", "Frontend dates: " + message);
var dateUnsupported = unsupported;
var dateDefinition = (name) => typeof name === "string" ? date_definitions_default[name.toLowerCase()]?.class || null : null;
var dateData = (value) => {
  const data = values.get(value);
  if (data?.type === "interval") data.inspected = true;
  return data?.type ? null : data;
};
var isDateObject = (value) => values.has(value);
var dateDebugEntries = (value, context = {}) => {
  const data = values.get(value);
  if (!data) return null;
  if (data.type) return advancedDateEntries(value, context);
  return [...data.timestamp === void 0 ? [] : [["date", { value: formatDate("Y-m-d H:i:s.u", data, context), kind: "string" }]], ["timezone_type", { value: data.zone.type, kind: "integer" }], ["timezone", { value: data.zone.name, kind: "string" }]];
};
var defaultTimezone = (context) => context.builtinMemory?.dateTimezone || context.source?.dateTimezone || "UTC";
var dateError = (context, kind, message) => failure((context.source?.phpVersion ?? 80400) >= 80300 ? kind : "Exception", message);
var fixedOffset = (name) => {
  const match = name.match(/^([+-])(\d{2}):?(\d{2})(?::?(\d{2}))?$/);
  return match ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] || 0)) : null;
};
var timezone = (name, context = {}) => {
  if (zones.has(name)) return zones.get(name);
  const fixed = fixedOffset(name);
  if (fixed !== null) {
    if (Math.abs(fixed) > 86400) throw unsupported("timezone offsets must be within 24 hours");
    const normalized = (fixed < 0 ? "-" : "+") + pad(Math.floor(Math.abs(fixed) / 3600)) + ":" + pad(Math.floor(Math.abs(fixed) / 60) % 60) + (fixed % 60 ? ":" + pad(Math.abs(fixed) % 60) : "");
    const zone = { name: normalized, fixed, type: 1 };
    zones.set(name, zone);
    return zone;
  }
  if (name === "Z") return { name: "Z", fixed: 0, type: 2 };
  if (!name.includes("/") && !["UTC", "GMT", "Etc/UTC"].includes(name)) throw unsupported("use UTC, an explicit numeric offset or an IANA timezone identifier");
  try {
    const formatter = new Intl.DateTimeFormat("en-GB-u-ca-gregory-nu-latn", { timeZone: name, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
    const zone = { name, fixed: ["UTC", "GMT"].includes(name) ? 0 : null, type: name === "GMT" ? 2 : 3, formatter };
    zones.set(name, zone);
    return zone;
  } catch {
    throw dateError(context, "DateInvalidTimeZoneException", `DateTimeZone::__construct(): Unknown or bad timezone (${name})`);
  }
};
var utc = (year, month, day, hour = 0, minute = 0, second = 0) => {
  const d = /* @__PURE__ */ new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, second, 0);
  return d.getTime() / 1e3;
};
var safeTimestamp = (value) => {
  if (!Number.isSafeInteger(value) || value < -62135596800 || value > 253402300799) throw unsupported("supported calendar years are 0001 through 9999");
  return value;
};
var dateParts = (timestamp, zone) => {
  safeTimestamp(timestamp);
  if (zone.fixed !== null) {
    const d = new Date((timestamp + zone.fixed) * 1e3);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
  }
  const parts = Object.fromEntries(zone.formatter.formatToParts(new Date(timestamp * 1e3)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
};
var zoneOffset = (timestamp, zone) => {
  if (zone.fixed !== null) return zone.fixed;
  const p = dateParts(timestamp, zone);
  return utc(p.year, p.month, p.day, p.hour, p.minute, p.second) - timestamp;
};
var fromParts = (parts, zone) => {
  const desired = utc(parts.year, parts.month, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  if (zone.fixed !== null) return safeTimestamp(desired - zone.fixed);
  const offsets = [...new Set([-86400, 0, 86400].map((shift) => zoneOffset(desired + shift, zone)))];
  const candidates = offsets.map((offset) => desired - offset).filter((timestamp) => timestamp + zoneOffset(timestamp, zone) === desired);
  return safeTimestamp(candidates.length ? Math.min(...candidates) : Math.max(...offsets.map((offset) => desired - offset)));
};
var now = (zone) => {
  const milliseconds = Date.now();
  return { timestamp: Math.floor(milliseconds / 1e3), microsecond: milliseconds % 1e3 * 1e3, zone };
};
var modify = (data, expression, context) => {
  let text = expression.trim();
  if (text === "now" || text === "") return { ...data };
  const p = dateParts(data.timestamp, data.zone);
  if (["today", "midnight", "tomorrow", "yesterday", "noon"].includes(text.toLowerCase())) {
    p.hour = text.toLowerCase() === "noon" ? 12 : 0;
    p.minute = p.second = 0;
    if (text === "tomorrow") p.day++;
    if (text === "yesterday") p.day--;
    return { ...data, timestamp: fromParts(p, data.zone), microsecond: 0 };
  }
  const calendar = text.toLowerCase().match(/^(first|last) day of (?:(this|next|last) )?(month|year)$/);
  if (calendar) {
    const direction = { this: 0, next: 1, last: -1 }[calendar[2] || "this"];
    if (calendar[3] === "year") {
      p.year += direction;
    } else p.month += direction;
    p.day = calendar[1] === "first" ? 1 : 0;
    if (calendar[1] === "last") p.month++;
    return { ...data, timestamp: fromParts(p, data.zone) };
  }
  const weekday = text.toLowerCase().match(/^(next|last|this) (sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (weekday) {
    const target = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(weekday[2]), current = new Date(utc(p.year, p.month, p.day) * 1e3).getUTCDay();
    let difference = (target - current + 7) % 7;
    if (weekday[1] === "next" && difference === 0) difference = 7;
    if (weekday[1] === "last") difference = difference === 0 ? -7 : difference - 7;
    p.day += difference;
    p.hour = p.minute = p.second = 0;
    return { ...data, timestamp: fromParts(p, data.zone), microsecond: 0 };
  }
  text = text.replace(/^(next|last|this)\s+(year|month|week|day|hour|minute|second)s?$/i, (_, direction, unit) => ({ next: "+1", last: "-1", this: "0" })[direction.toLowerCase()] + " " + unit);
  if (/\s+ago$/i.test(text)) text = text.replace(/([+-]?\d+)\s*(years?|months?|weeks?|days?|hours?|minutes?|seconds?)/gi, (_, n, u) => -Number(n) + " " + u).replace(/\s+ago$/i, "");
  const relative = /^([+-]?\d+)\s*(years?|months?|weeks?|days?|hours?|minutes?|seconds?)(?:\s+|$)/i;
  let matched = false;
  while (text) {
    const match = text.match(relative);
    if (!match) throw unsupported("relative dates support signed years, months, weeks, days, hours, minutes and seconds");
    matched = true;
    const amount = Number(match[1]);
    if (Math.abs(amount) > 1e6) throw unsupported("relative adjustments are limited to 1000000 units");
    const unit = match[2].toLowerCase().replace(/s$/, "");
    if (unit === "week") p.day += amount * 7;
    else p[unit] += amount;
    text = text.slice(match[0].length).trim();
    work(context);
  }
  return matched ? { ...data, timestamp: fromParts(p, data.zone) } : data;
};
var parseDate = (text, zone, context = {}, base = null) => {
  (context.builtinMemory ||= {}).dateErrors = false;
  if (text.length > 4096) throw unsupported("date input is limited to 4096 characters");
  if (text === "" || text.toLowerCase() === "now") return now(zone);
  if (/^@-?\d+(?:\.\d{1,6})?$/.test(text)) {
    const number = Number(text.slice(1)), timestamp = Math.floor(number), microsecond = Math.round((number - timestamp) * 1e6);
    return { timestamp: safeTimestamp(timestamp), microsecond, zone: timezone("+00:00", context) };
  }
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?(?:\s*(Z|[+-]\d{2}:?\d{2}|UTC|GMT|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?))?$/);
  if (!match) {
    let alternate;
    if (alternate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/)) return parseDate(`${alternate[3]}-${alternate[1]}-${alternate[2]}${alternate[4]}`, zone, context, base);
    if (alternate = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(.*)$/)) return parseDate(`${alternate[3]}-${alternate[2]}-${alternate[1]}${alternate[4]}`, zone, context, base);
    if (alternate = text.match(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(.*)$/i)) {
      const month = months.findIndex((m) => m.toLowerCase() === alternate[2].toLowerCase() || m.slice(0, 3).toLowerCase() === alternate[2].toLowerCase());
      if (month >= 0) return parseDate(`${alternate[3]}-${month + 1}-${alternate[1]}${alternate[4]}`, zone, context, base);
    }
    if (alternate = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(.*)$/)) {
      const month = months.findIndex((m) => m.toLowerCase() === alternate[1].toLowerCase() || m.slice(0, 3).toLowerCase() === alternate[1].toLowerCase());
      if (month >= 0) return parseDate(`${alternate[3]}-${month + 1}-${alternate[2]}${alternate[4]}`, zone, context, base);
    }
    if (/^(?:first|last|next|this)\b/i.test(text) || /\sago$/i.test(text)) return modify(base || now(zone), text, context);
    if (/^(?:[+-]?\d+\s*(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?)|today$|midnight$|tomorrow$|yesterday$|noon$)/i.test(text)) return modify(base || now(zone), text, context);
    throw unsupported("use YYYY-MM-DD, an ISO date/time, @timestamp, now or a supported relative adjustment");
  }
  if (match[8]) zone = timezone(match[8], context);
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4] || 0), minute: Number(match[5] || 0), second: Number(match[6] || 0) };
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31 || parts.hour > 24 || parts.minute > 59 || parts.second > 60) throw dateError(context, "DateMalformedStringException", "Failed to parse time string");
  return { timestamp: fromParts(parts, zone), microsecond: Number((match[7] || "").padEnd(6, "0")), zone };
};
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var formatDate = (format, data, context = {}) => {
  const { timestamp, microsecond = 0, zone } = data, p = dateParts(timestamp, zone), offset = zoneOffset(timestamp, zone), day = new Date(utc(p.year, p.month, p.day) * 1e3).getUTCDay();
  const dayOfYear = Math.floor((utc(p.year, p.month, p.day) - utc(p.year, 1, 1)) / 86400), leap = p.year % 4 === 0 && (p.year % 100 !== 0 || p.year % 400 === 0);
  const thursday = new Date((utc(p.year, p.month, p.day) + (4 - (day || 7)) * 86400) * 1e3), isoYear = thursday.getUTCFullYear(), isoWeek = Math.ceil(((thursday.getTime() / 1e3 - utc(isoYear, 1, 1)) / 86400 + 1) / 7);
  const offsetText = (colon) => (offset < 0 ? "-" : "+") + pad(Math.floor(Math.abs(offset) / 3600)) + (colon ? ":" : "") + pad(Math.floor(Math.abs(offset) / 60) % 60);
  const shortZone = () => {
    if (zone.fixed === null && !["America/Toronto", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Halifax", "America/Anchorage", "Pacific/Honolulu", "America/Winnipeg", "America/Vancouver"].includes(zone.name)) throw unsupported("the T format is unavailable for this timezone; use e or P");
    if (zone.fixed !== null) return zone.type === 1 ? "GMT" + offsetText(false) : zone.name;
    const label = new Intl.DateTimeFormat("en-US", { timeZone: zone.name, timeZoneName: "short" }).formatToParts(new Date(timestamp * 1e3)).find((part) => part.type === "timeZoneName").value;
    if (/^GMT[+-]/.test(label)) throw unsupported("the T format is unavailable for this timezone; use e or P");
    return label;
  };
  const lookup = {
    d: () => pad(p.day),
    D: () => weekdays[day].slice(0, 3),
    j: () => p.day,
    l: () => weekdays[day],
    N: () => day || 7,
    S: () => p.day >= 11 && p.day <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[p.day % 10] || "th",
    w: () => day,
    z: () => dayOfYear,
    W: () => pad(isoWeek),
    F: () => months[p.month - 1],
    m: () => pad(p.month),
    M: () => months[p.month - 1].slice(0, 3),
    n: () => p.month,
    t: () => new Date(utc(p.year, p.month + 1, 0) * 1e3).getUTCDate(),
    L: () => Number(leap),
    o: () => isoYear,
    Y: () => pad(p.year, 4),
    X: () => "+" + pad(p.year, 4),
    x: () => pad(p.year, 4),
    y: () => pad(p.year % 100),
    a: () => p.hour < 12 ? "am" : "pm",
    A: () => p.hour < 12 ? "AM" : "PM",
    B: () => pad(Math.floor(((timestamp + 3600) % 86400 + 86400) % 86400 / 86.4), 3),
    g: () => p.hour % 12 || 12,
    G: () => p.hour,
    h: () => pad(p.hour % 12 || 12),
    H: () => pad(p.hour),
    i: () => pad(p.minute),
    s: () => pad(p.second),
    u: () => pad(microsecond, 6),
    v: () => pad(Math.floor(microsecond / 1e3), 3),
    e: () => zone.name,
    I: () => Number(offset > Math.min(zoneOffset(utc(p.year, 1, 1), zone), zoneOffset(utc(p.year, 7, 1), zone))),
    O: () => offsetText(false),
    P: () => offsetText(true),
    p: () => offset === 0 ? "Z" : offsetText(true),
    T: shortZone,
    Z: () => offset,
    U: () => timestamp,
    c: () => formatDate("Y-m-d\\TH:i:sP", data, context),
    r: () => formatDate("D, d M Y H:i:s O", data, context)
  };
  let result = "";
  for (let i = 0; i < format.length; i++) {
    const char = format[i];
    result += char === "\\" ? format[++i] || "\0" : Object.hasOwn(lookup, char) ? lookup[char]() : char;
    work(context);
  }
  return bounded(result);
};
var createDateObject = (name, data, context) => {
  if (--(context.objectBudget ||= { remaining: 1e4 }).remaining < 0) throw unsupported("object allocation limit exceeded");
  const object = makeObject(dateDefinition(name));
  values.set(object, data);
  return object;
};
var cloneDate = (value, context) => {
  const data = values.get(value);
  return data?.type ? cloneAdvancedDate(value, context) : data ? createDateObject(objectData(value).definition.name, { ...data }, context) : null;
};
var nativeDateMethod = (definition, context) => {
  const advanced = advancedDateMethod(definition, context);
  if (advanced) return advanced;
  const options = definition.nativeDate, name = options.class, method = options.method, args = definition.parameters.map((parameter) => context.locals[parameter.id]), object = context.thisObject;
  const result = (value) => ({ value, kind: phpType(value) });
  if (method === "__construct") {
    values.set(object, name === "DateTimeZone" ? { zone: timezone(args[0], context) } : parseDate(args[0], args[1] ? values.get(args[1]).zone : timezone(defaultTimezone(context), context), context));
    return result(null);
  }
  if (method.startsWith("createfrom")) {
    const data2 = values.get(args[0]);
    if (!data2?.timestamp && data2?.timestamp !== 0) throw new TypeError("Expected a DateTimeInterface");
    return result(createDateObject(name, { ...data2 }, context));
  }
  const data = values.get(object);
  if (!data) throw new Error("Date object has not been initialized");
  if (method === "getname") return result(data.zone.name);
  if (method === "getoffset") return result(zoneOffset(name === "DateTimeZone" ? values.get(args[0]).timestamp : data.timestamp, data.zone));
  if (method === "format") return result(formatDate(args[0], data, context));
  if (method === "gettimestamp") return result(data.timestamp);
  if (method === "gettimezone") return result(createDateObject("DateTimeZone", { zone: data.zone }, context));
  let changed = { ...data };
  if (method === "settimestamp") {
    changed.timestamp = safeTimestamp(args[0]);
    changed.microsecond = 0;
  } else if (method === "settimezone") changed.zone = values.get(args[0]).zone;
  else if (method === "modify") changed = modify(data, args[0], context);
  else if (method === "setdate") {
    const p = dateParts(data.timestamp, data.zone);
    [p.year, p.month, p.day] = args;
    changed.timestamp = fromParts(p, data.zone);
  } else if (method === "settime") {
    const p = dateParts(data.timestamp, data.zone);
    [p.hour, p.minute, p.second] = args;
    changed.timestamp = fromParts(p, data.zone);
    changed.microsecond = args[3];
    if (changed.microsecond < 0 || changed.microsecond > 999999) throw unsupported("microseconds must be between 0 and 999999");
  } else throw unsupported(`method ${name}::${method}() is unavailable`);
  if (name === "DateTimeImmutable") return result(createDateObject(name, changed, context));
  values.set(object, changed);
  return result(object);
};
var dateNames = /* @__PURE__ */ new Set(["time", "microtime", "date", "gmdate", "strtotime", "mktime", "gmmktime", "checkdate", "getdate", "date_default_timezone_get", "date_default_timezone_set", "date_create", "date_create_immutable", "date_format", "date_timestamp_get", "date_timestamp_set", "date_modify", "date_timezone_get", "date_timezone_set", "timezone_open", "timezone_name_get", "timezone_offset_get", "date_create_from_format", "date_create_immutable_from_format", "date_get_last_errors", "date_diff", "date_add", "date_sub", "date_interval_format"]);
var runDates = (name, items, context) => {
  if (!dateNames.has(name)) return null;
  if (context.readOnly) throw new Error("Date/time functions must be used in an event, then displayed through State");
  const args = items.map((item) => item.value), result = (value) => ({ value, kind: phpType(value) }), zone = () => timezone(defaultTimezone(context), context);
  if (["date_create_from_format", "date_create_immutable_from_format", "date_get_last_errors"].includes(name)) {
    const className = name === "date_create_immutable_from_format" ? "DateTimeImmutable" : "DateTime", method2 = name === "date_get_last_errors" ? "getlasterrors" : "createfromformat", definition = date_definitions_default[className.toLowerCase()].functions["@date:" + className.toLowerCase() + "::" + method2];
    return nativeDateMethod(definition, { ...context, thisObject: null, locals: Object.fromEntries(definition.parameters.map((p, index) => [p.id, args[index]])) });
  }
  if (name === "time") return result(Math.floor(Date.now() / 1e3));
  if (name === "microtime") {
    const value = Date.now() / 1e3;
    return args[0] ? { value, kind: "double" } : result((value % 1).toFixed(8) + " " + Math.floor(value));
  }
  if (name === "date_default_timezone_get") return result(defaultTimezone(context));
  if (name === "date_default_timezone_set") {
    try {
      timezone(args[0], context);
    } catch {
      warn(context, `date_default_timezone_set(): Timezone ID '${args[0]}' is invalid`);
      return result(false);
    }
    (context.builtinMemory ||= {}).dateTimezone = args[0];
    return result(true);
  }
  if (name === "checkdate") {
    const [month, day, year] = args;
    return result(year > 0 && year <= 32767 && month > 0 && month < 13 && day > 0 && day <= new Date(utc(year, month + 1, 0) * 1e3).getUTCDate());
  }
  if (name === "date" || name === "gmdate") return result(formatDate(args[0], { timestamp: safeTimestamp(args[1] ?? Math.floor(Date.now() / 1e3)), microsecond: 0, zone: name === "gmdate" ? timezone("GMT", context) : zone() }, context));
  if (name === "strtotime") {
    if (args[0].trim() === "") return result(false);
    try {
      const tz = zone(), base = { timestamp: args[1] ?? Math.floor(Date.now() / 1e3), microsecond: 0, zone: tz };
      return result(parseDate(args[0], tz, context, base).timestamp);
    } catch (error) {
      if (error.name === "ValueError") throw error;
      return result(false);
    }
  }
  if (name === "mktime" || name === "gmmktime") {
    const tz = name === "gmmktime" ? timezone("UTC", context) : zone(), p = dateParts(Math.floor(Date.now() / 1e3), tz);
    for (const [i, field] of ["hour", "minute", "second", "month", "day", "year"].entries()) if (args[i] !== null) p[field] = args[i];
    if (p.year >= 0 && p.year <= 69) p.year += 2e3;
    else if (p.year >= 70 && p.year <= 100) p.year += 1900;
    return result(fromParts(p, tz));
  }
  if (name === "getdate") {
    const timestamp = args[0] ?? Math.floor(Date.now() / 1e3), tz = zone(), p = dateParts(timestamp, tz), data = { timestamp, microsecond: 0, zone: tz };
    return result({ seconds: p.second, minutes: p.minute, hours: p.hour, mday: p.day, wday: Number(formatDate("w", data, context)), mon: p.month, year: p.year, yday: Number(formatDate("z", data, context)), weekday: formatDate("l", data, context), month: formatDate("F", data, context), 0: timestamp });
  }
  if (name === "timezone_open") {
    try {
      return result(createDateObject("DateTimeZone", { zone: timezone(args[0], context) }, context));
    } catch (error) {
      if (error.name === "ValueError") throw error;
      return result(false);
    }
  }
  if (name === "date_create" || name === "date_create_immutable") {
    try {
      return result(createDateObject(name === "date_create" ? "DateTime" : "DateTimeImmutable", parseDate(args[0], args[1] ? values.get(args[1]).zone : zone(), context), context));
    } catch (error) {
      if (error.name === "ValueError") throw error;
      return result(false);
    }
  }
  const mapping = { date_diff: "diff", date_add: "add", date_sub: "sub", date_interval_format: "format", date_format: "format", date_timestamp_get: "gettimestamp", date_timestamp_set: "settimestamp", date_modify: "modify", date_timezone_get: "gettimezone", date_timezone_set: "settimezone", timezone_name_get: "getname", timezone_offset_get: "getoffset" }, method = mapping[name];
  if (method) {
    const object = args.shift(), className = objectData(object)?.definition.name, definition = date_definitions_default[className?.toLowerCase()]?.functions["@date:" + className?.toLowerCase() + "::" + method];
    if (!definition) throw new TypeError(`${name}(): expected a supported date object`);
    const locals = Object.fromEntries(definition.parameters.map((parameter, index) => [parameter.id, args[index]]));
    return nativeDateMethod(definition, { ...context, thisObject: object, locals });
  }
  return null;
};

// phpaml-module:date
registerModule("date", "0.1.0-beta.9", { ...php_date_values_exports, ...php_date_advanced_exports, ...php_date_format_parser_exports });
