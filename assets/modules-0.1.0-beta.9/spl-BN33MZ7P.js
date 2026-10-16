import {
  arrayEntries,
  arrayKey,
  arrayKind,
  arrayRead,
  arrayUnset,
  arrayWithReference,
  arrayWrite,
  clonePhp,
  foreachEntries,
  invokeBuiltin,
  invokeFunction,
  isPhpArray,
  isPhpObject,
  makeArray,
  makeObject,
  objectData,
  objectIs,
  phpBool,
  phpType,
  resolveData,
  resolveType,
  work
} from "./chunk-PVACVZCB.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-spl.js
var php_spl_exports = {};
__export(php_spl_exports, {
  cloneSpl: () => cloneSpl,
  isSplObject: () => isSplObject,
  runIterators: () => runIterators,
  splMethod: () => splMethod,
  splStorageReference: () => splStorageReference
});

// src-js/core/php-spl-list.js
var php_spl_list_exports = {};
__export(php_spl_list_exports, {
  cloneSplList: () => cloneSplList,
  isSplList: () => isSplList,
  splListMethod: () => splListMethod
});
var storage = /* @__PURE__ */ new WeakMap();
var isSplList = (value) => ["SplDoublyLinkedList", "SplQueue", "SplStack"].includes(objectData(value)?.definition.name);
var failure = (name, message) => {
  throw Object.assign(new Error(message), { name });
};
var cloneSplList = (original, copy) => {
  const data = storage.get(original);
  if (data) storage.set(copy, { ...data, items: data.items.map((item) => ({ ...item, value: clonePhp(item.value) })) });
};
var splListMethod = (value, method, args, context) => {
  if (!isSplList(value)) return null;
  const name = objectData(value).definition.name;
  let data = storage.get(value);
  if (!data) {
    data = { items: [], mode: name === "SplStack" ? 2 : 0, position: 0 };
    storage.set(value, data);
  }
  const result2 = (value2, kind = phpType(value2)) => ({ value: value2, kind }), size = () => data.items.length, reverse = () => !!(data.mode & 2), step = () => reverse() ? -1 : 1;
  const index = (offset, insertion = false) => {
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0 || offset >= size() + (insertion ? 1 : 0)) failure("OutOfRangeException", "Offset out of range");
    return reverse() ? size() - (insertion ? 0 : 1) - offset : offset;
  };
  const copy = (item) => ({ ...item, value: clonePhp(item.value) }), put = (item) => {
    if (size() >= 1e4) throw new RangeError("Frontend SPL list exceeds 10000 items");
    work(context);
    return copy(item);
  };
  if (["push", "enqueue", "unshift"].includes(method)) {
    data.items[method === "unshift" ? "unshift" : "push"](put(args[0]));
    return result2(null);
  }
  if (["pop", "shift", "dequeue", "top", "bottom"].includes(method)) {
    if (!size()) failure("RuntimeException", "Cannot read from an empty datastructure");
    const item = method === "pop" ? data.items.pop() : ["shift", "dequeue"].includes(method) ? data.items.shift() : data.items[method === "top" ? size() - 1 : 0];
    return copy(item);
  }
  if (method === "add") {
    data.items.splice(index(args[0].value, true), 0, put(args[1]));
    return result2(null);
  }
  if (method === "count") return result2(size(), "integer");
  if (method === "isempty") return result2(!size(), "boolean");
  if (method === "offsetexists") {
    const offset = args[0].value;
    return result2(Number.isInteger(offset) && offset >= 0 && offset < size(), "boolean");
  }
  if (method === "offsetget") return copy(data.items[index(args[0].value)]);
  if (method === "offsetset") {
    if (args[0].value === null) data.items.push(put(args[1]));
    else data.items[index(args[0].value)] = copy(args[1]);
    return result2(null);
  }
  if (method === "offsetunset") {
    data.items.splice(index(args[0].value), 1);
    return result2(null);
  }
  if (method === "getiteratormode") return result2(data.mode, "integer");
  if (method === "setiteratormode") {
    const mode = args[0].value & 3;
    if (name === "SplStack" && !(mode & 2) || name === "SplQueue" && mode & 2) failure("RuntimeException", "Iterator mode cannot change stack/queue direction");
    data.mode = mode;
    return result2(mode, "integer");
  }
  if (method === "rewind") {
    data.position = reverse() ? size() - 1 : 0;
    return result2(null);
  }
  if (method === "valid") return result2(data.position >= 0 && data.position < size(), "boolean");
  if (method === "key") return result2(data.position, "integer");
  if (method === "current") return data.items[data.position] ? copy(data.items[data.position]) : result2(null);
  if (method === "next" || method === "prev") {
    const direction = method === "next" ? step() : -step();
    if (data.mode & 1 && data.position >= 0 && data.position < size()) {
      data.items.splice(data.position, 1);
      if (direction < 0) data.position--;
    } else data.position += direction;
    return result2(null);
  }
  failure("Error", "Unsupported SPL list method " + method);
};

// src-js/core/spl-definitions.json
var spl_definitions_default = {
  arrayiterator: {
    class: {
      name: "ArrayIterator",
      parent: null,
      ancestors: [
        "SeekableIterator",
        "Iterator",
        "Traversable",
        "ArrayAccess",
        "Serializable",
        "Countable"
      ],
      abstract: false,
      final: false,
      readonly: false,
      properties: [],
      staticProperties: [],
      methods: {
        __construct: {
          name: "__construct",
          id: "@spl:arrayiterator:__construct",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        append: {
          name: "append",
          id: "@spl:arrayiterator:append",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        count: {
          name: "count",
          id: "@spl:arrayiterator:count",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getarraycopy: {
          name: "getArrayCopy",
          id: "@spl:arrayiterator:getarraycopy",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getflags: {
          name: "getFlags",
          id: "@spl:arrayiterator:getflags",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        setflags: {
          name: "setFlags",
          id: "@spl:arrayiterator:setflags",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetexists: {
          name: "offsetExists",
          id: "@spl:arrayiterator:offsetexists",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetget: {
          name: "offsetGet",
          id: "@spl:arrayiterator:offsetget",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetset: {
          name: "offsetSet",
          id: "@spl:arrayiterator:offsetset",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetunset: {
          name: "offsetUnset",
          id: "@spl:arrayiterator:offsetunset",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        asort: {
          name: "asort",
          id: "@spl:arrayiterator:asort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        ksort: {
          name: "ksort",
          id: "@spl:arrayiterator:ksort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        natsort: {
          name: "natsort",
          id: "@spl:arrayiterator:natsort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        natcasesort: {
          name: "natcasesort",
          id: "@spl:arrayiterator:natcasesort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        uasort: {
          name: "uasort",
          id: "@spl:arrayiterator:uasort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        uksort: {
          name: "uksort",
          id: "@spl:arrayiterator:uksort",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        current: {
          name: "current",
          id: "@spl:arrayiterator:current",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        key: {
          name: "key",
          id: "@spl:arrayiterator:key",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        next: {
          name: "next",
          id: "@spl:arrayiterator:next",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        rewind: {
          name: "rewind",
          id: "@spl:arrayiterator:rewind",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        valid: {
          name: "valid",
          id: "@spl:arrayiterator:valid",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        seek: {
          name: "seek",
          id: "@spl:arrayiterator:seek",
          owner: "ArrayIterator",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        }
      },
      methodOrder: [
        "__construct",
        "append",
        "count",
        "getarraycopy",
        "getflags",
        "setflags",
        "offsetexists",
        "offsetget",
        "offsetset",
        "offsetunset",
        "asort",
        "ksort",
        "natsort",
        "natcasesort",
        "uasort",
        "uksort",
        "current",
        "key",
        "next",
        "rewind",
        "valid",
        "seek"
      ],
      constants: {
        STD_PROP_LIST: {
          owner: "ArrayIterator",
          visibility: "public",
          value: 1
        },
        ARRAY_AS_PROPS: {
          owner: "ArrayIterator",
          visibility: "public",
          value: 2
        }
      }
    },
    functions: {
      "@spl:arrayiterator:__construct": {
        name: "ArrayIterator::__construct",
        parameters: [
          {
            name: "array",
            id: "v6172726179",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "array"
              ],
              nullable: false,
              property: "(function)"
            },
            default: []
          },
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "__construct",
                arguments: [
                  {
                    $local: "v6172726179"
                  },
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:append": {
        name: "ArrayIterator::append",
        parameters: [
          {
            name: "value",
            id: "v76616c7565",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "append",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:count": {
        name: "ArrayIterator::count",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "count",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:getarraycopy": {
        name: "ArrayIterator::getArrayCopy",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getarraycopy",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:getflags": {
        name: "ArrayIterator::getFlags",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getflags",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:setflags": {
        name: "ArrayIterator::setFlags",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "setflags",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:offsetexists": {
        name: "ArrayIterator::offsetExists",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetexists",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:offsetget": {
        name: "ArrayIterator::offsetGet",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetget",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:offsetset": {
        name: "ArrayIterator::offsetSet",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          },
          {
            name: "value",
            id: "v76616c7565",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetset",
                arguments: [
                  {
                    $local: "v6b6579"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:offsetunset": {
        name: "ArrayIterator::offsetUnset",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetunset",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:asort": {
        name: "ArrayIterator::asort",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "asort",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:ksort": {
        name: "ArrayIterator::ksort",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "ksort",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:natsort": {
        name: "ArrayIterator::natsort",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "natsort",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:natcasesort": {
        name: "ArrayIterator::natcasesort",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "natcasesort",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:uasort": {
        name: "ArrayIterator::uasort",
        parameters: [
          {
            name: "callback",
            id: "v63616c6c6261636b",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "callable"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "uasort",
                arguments: [
                  {
                    $local: "v63616c6c6261636b"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:uksort": {
        name: "ArrayIterator::uksort",
        parameters: [
          {
            name: "callback",
            id: "v63616c6c6261636b",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "callable"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "uksort",
                arguments: [
                  {
                    $local: "v63616c6c6261636b"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayiterator:current": {
        name: "ArrayIterator::current",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "current",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:key": {
        name: "ArrayIterator::key",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "key",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:next": {
        name: "ArrayIterator::next",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "next",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:rewind": {
        name: "ArrayIterator::rewind",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "rewind",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:valid": {
        name: "ArrayIterator::valid",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "valid",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayiterator:seek": {
        name: "ArrayIterator::seek",
        parameters: [
          {
            name: "offset",
            id: "v6f6666736574",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayIterator",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "seek",
                arguments: [
                  {
                    $local: "v6f6666736574"
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  arrayobject: {
    class: {
      name: "ArrayObject",
      parent: null,
      ancestors: [
        "IteratorAggregate",
        "Traversable",
        "ArrayAccess",
        "Serializable",
        "Countable"
      ],
      abstract: false,
      final: false,
      readonly: false,
      properties: [],
      staticProperties: [],
      methods: {
        __construct: {
          name: "__construct",
          id: "@spl:arrayobject:__construct",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        append: {
          name: "append",
          id: "@spl:arrayobject:append",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        count: {
          name: "count",
          id: "@spl:arrayobject:count",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getarraycopy: {
          name: "getArrayCopy",
          id: "@spl:arrayobject:getarraycopy",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getflags: {
          name: "getFlags",
          id: "@spl:arrayobject:getflags",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        setflags: {
          name: "setFlags",
          id: "@spl:arrayobject:setflags",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetexists: {
          name: "offsetExists",
          id: "@spl:arrayobject:offsetexists",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetget: {
          name: "offsetGet",
          id: "@spl:arrayobject:offsetget",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetset: {
          name: "offsetSet",
          id: "@spl:arrayobject:offsetset",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        offsetunset: {
          name: "offsetUnset",
          id: "@spl:arrayobject:offsetunset",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        asort: {
          name: "asort",
          id: "@spl:arrayobject:asort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        ksort: {
          name: "ksort",
          id: "@spl:arrayobject:ksort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        natsort: {
          name: "natsort",
          id: "@spl:arrayobject:natsort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        natcasesort: {
          name: "natcasesort",
          id: "@spl:arrayobject:natcasesort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        uasort: {
          name: "uasort",
          id: "@spl:arrayobject:uasort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        uksort: {
          name: "uksort",
          id: "@spl:arrayobject:uksort",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        exchangearray: {
          name: "exchangeArray",
          id: "@spl:arrayobject:exchangearray",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getiterator: {
          name: "getIterator",
          id: "@spl:arrayobject:getiterator",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        getiteratorclass: {
          name: "getIteratorClass",
          id: "@spl:arrayobject:getiteratorclass",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        },
        setiteratorclass: {
          name: "setIteratorClass",
          id: "@spl:arrayobject:setiteratorclass",
          owner: "ArrayObject",
          static: false,
          abstract: false,
          final: false,
          visibility: "public"
        }
      },
      methodOrder: [
        "__construct",
        "append",
        "count",
        "getarraycopy",
        "getflags",
        "setflags",
        "offsetexists",
        "offsetget",
        "offsetset",
        "offsetunset",
        "asort",
        "ksort",
        "natsort",
        "natcasesort",
        "uasort",
        "uksort",
        "exchangearray",
        "getiterator",
        "getiteratorclass",
        "setiteratorclass"
      ],
      constants: {
        STD_PROP_LIST: {
          owner: "ArrayObject",
          visibility: "public",
          value: 1
        },
        ARRAY_AS_PROPS: {
          owner: "ArrayObject",
          visibility: "public",
          value: 2
        }
      }
    },
    functions: {
      "@spl:arrayobject:__construct": {
        name: "ArrayObject::__construct",
        parameters: [
          {
            name: "array",
            id: "v6172726179",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "array"
              ],
              nullable: false,
              property: "(function)"
            },
            default: []
          },
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          },
          {
            name: "iteratorClass",
            id: "v6974657261746f72436c617373",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false,
              property: "(function)"
            },
            default: "ArrayIterator"
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "__construct",
                arguments: [
                  {
                    $local: "v6172726179"
                  },
                  {
                    $local: "v666c616773"
                  },
                  {
                    $local: "v6974657261746f72436c617373"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:append": {
        name: "ArrayObject::append",
        parameters: [
          {
            name: "value",
            id: "v76616c7565",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "append",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:count": {
        name: "ArrayObject::count",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "count",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:getarraycopy": {
        name: "ArrayObject::getArrayCopy",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getarraycopy",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:getflags": {
        name: "ArrayObject::getFlags",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getflags",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:setflags": {
        name: "ArrayObject::setFlags",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "setflags",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:offsetexists": {
        name: "ArrayObject::offsetExists",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetexists",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:offsetget": {
        name: "ArrayObject::offsetGet",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetget",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:offsetset": {
        name: "ArrayObject::offsetSet",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          },
          {
            name: "value",
            id: "v76616c7565",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetset",
                arguments: [
                  {
                    $local: "v6b6579"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:offsetunset": {
        name: "ArrayObject::offsetUnset",
        parameters: [
          {
            name: "key",
            id: "v6b6579",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "offsetunset",
                arguments: [
                  {
                    $local: "v6b6579"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:asort": {
        name: "ArrayObject::asort",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "asort",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:ksort": {
        name: "ArrayObject::ksort",
        parameters: [
          {
            name: "flags",
            id: "v666c616773",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: false,
              property: "(function)"
            },
            default: 0
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "ksort",
                arguments: [
                  {
                    $local: "v666c616773"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:natsort": {
        name: "ArrayObject::natsort",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "natsort",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:natcasesort": {
        name: "ArrayObject::natcasesort",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "natcasesort",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:uasort": {
        name: "ArrayObject::uasort",
        parameters: [
          {
            name: "callback",
            id: "v63616c6c6261636b",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "callable"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "uasort",
                arguments: [
                  {
                    $local: "v63616c6c6261636b"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:uksort": {
        name: "ArrayObject::uksort",
        parameters: [
          {
            name: "callback",
            id: "v63616c6c6261636b",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "callable"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "uksort",
                arguments: [
                  {
                    $local: "v63616c6c6261636b"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:exchangearray": {
        name: "ArrayObject::exchangeArray",
        parameters: [
          {
            name: "array",
            id: "v6172726179",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "array"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "exchangearray",
                arguments: [
                  {
                    $local: "v6172726179"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:arrayobject:getiterator": {
        name: "ArrayObject::getIterator",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getiterator",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:getiteratorclass": {
        name: "ArrayObject::getIteratorClass",
        parameters: [],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "getiteratorclass",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:arrayobject:setiteratorclass": {
        name: "ArrayObject::setIteratorClass",
        parameters: [
          {
            name: "iteratorClass",
            id: "v6974657261746f72436c617373",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "string"
              ],
              nullable: false,
              property: "(function)"
            }
          }
        ],
        returnType: null,
        declared: true,
        generator: false,
        objectScope: "ArrayObject",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null,
                  right: null
                }
              },
              right: {
                method: "setiteratorclass",
                arguments: [
                  {
                    $local: "v6974657261746f72436c617373"
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  spldoublylinkedlist: {
    class: {
      name: "SplDoublyLinkedList",
      parent: null,
      ancestors: [
        "Iterator",
        "Traversable",
        "Countable",
        "ArrayAccess",
        "Serializable"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      methods: {
        push: {
          name: "push",
          id: "@spl:spldoublylinkedlist::push",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        pop: {
          name: "pop",
          id: "@spl:spldoublylinkedlist::pop",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        shift: {
          name: "shift",
          id: "@spl:spldoublylinkedlist::shift",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        unshift: {
          name: "unshift",
          id: "@spl:spldoublylinkedlist::unshift",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        top: {
          name: "top",
          id: "@spl:spldoublylinkedlist::top",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        bottom: {
          name: "bottom",
          id: "@spl:spldoublylinkedlist::bottom",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        add: {
          name: "add",
          id: "@spl:spldoublylinkedlist::add",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        count: {
          name: "count",
          id: "@spl:spldoublylinkedlist::count",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isempty: {
          name: "isEmpty",
          id: "@spl:spldoublylinkedlist::isempty",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetexists: {
          name: "offsetExists",
          id: "@spl:spldoublylinkedlist::offsetexists",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetget: {
          name: "offsetGet",
          id: "@spl:spldoublylinkedlist::offsetget",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetset: {
          name: "offsetSet",
          id: "@spl:spldoublylinkedlist::offsetset",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetunset: {
          name: "offsetUnset",
          id: "@spl:spldoublylinkedlist::offsetunset",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        rewind: {
          name: "rewind",
          id: "@spl:spldoublylinkedlist::rewind",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        next: {
          name: "next",
          id: "@spl:spldoublylinkedlist::next",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        prev: {
          name: "prev",
          id: "@spl:spldoublylinkedlist::prev",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        valid: {
          name: "valid",
          id: "@spl:spldoublylinkedlist::valid",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        key: {
          name: "key",
          id: "@spl:spldoublylinkedlist::key",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        current: {
          name: "current",
          id: "@spl:spldoublylinkedlist::current",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getiteratormode: {
          name: "getIteratorMode",
          id: "@spl:spldoublylinkedlist::getiteratormode",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setiteratormode: {
          name: "setIteratorMode",
          id: "@spl:spldoublylinkedlist::setiteratormode",
          owner: "SplDoublyLinkedList",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      constants: {
        IT_MODE_LIFO: {
          owner: "SplDoublyLinkedList",
          visibility: "public",
          value: 2
        },
        IT_MODE_FIFO: {
          owner: "SplDoublyLinkedList",
          visibility: "public",
          value: 0
        },
        IT_MODE_DELETE: {
          owner: "SplDoublyLinkedList",
          visibility: "public",
          value: 1
        },
        IT_MODE_KEEP: {
          owner: "SplDoublyLinkedList",
          visibility: "public",
          value: 0
        }
      },
      nativeSpl: true
    },
    functions: {
      "@spl:spldoublylinkedlist::push": {
        name: "SplDoublyLinkedList::push",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "push",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::pop": {
        name: "SplDoublyLinkedList::pop",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "pop",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::shift": {
        name: "SplDoublyLinkedList::shift",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "shift",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::unshift": {
        name: "SplDoublyLinkedList::unshift",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "unshift",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::top": {
        name: "SplDoublyLinkedList::top",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "top",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::bottom": {
        name: "SplDoublyLinkedList::bottom",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "bottom",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::add": {
        name: "SplDoublyLinkedList::add",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
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
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "add",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::count": {
        name: "SplDoublyLinkedList::count",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "count",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::isempty": {
        name: "SplDoublyLinkedList::isEmpty",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "isempty",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::offsetexists": {
        name: "SplDoublyLinkedList::offsetExists",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetexists",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::offsetget": {
        name: "SplDoublyLinkedList::offsetGet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetget",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::offsetset": {
        name: "SplDoublyLinkedList::offsetSet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetset",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::offsetunset": {
        name: "SplDoublyLinkedList::offsetUnset",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetunset",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::rewind": {
        name: "SplDoublyLinkedList::rewind",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "rewind",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::next": {
        name: "SplDoublyLinkedList::next",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "next",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::prev": {
        name: "SplDoublyLinkedList::prev",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "prev",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::valid": {
        name: "SplDoublyLinkedList::valid",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "valid",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::key": {
        name: "SplDoublyLinkedList::key",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "key",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::current": {
        name: "SplDoublyLinkedList::current",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "current",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::getiteratormode": {
        name: "SplDoublyLinkedList::getIteratorMode",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "getiteratormode",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:spldoublylinkedlist::setiteratormode": {
        name: "SplDoublyLinkedList::setIteratorMode",
        parameters: [
          {
            id: "v6d6f6465",
            name: "mode",
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
        returnType: null,
        declared: true,
        objectScope: "SplDoublyLinkedList",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "setiteratormode",
                arguments: [
                  {
                    $local: "v6d6f6465"
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  splstack: {
    class: {
      name: "SplStack",
      parent: null,
      ancestors: [
        "SplDoublyLinkedList",
        "Serializable",
        "ArrayAccess",
        "Countable",
        "Traversable",
        "Iterator"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      methods: {
        push: {
          name: "push",
          id: "@spl:splstack::push",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        pop: {
          name: "pop",
          id: "@spl:splstack::pop",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        shift: {
          name: "shift",
          id: "@spl:splstack::shift",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        unshift: {
          name: "unshift",
          id: "@spl:splstack::unshift",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        top: {
          name: "top",
          id: "@spl:splstack::top",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        bottom: {
          name: "bottom",
          id: "@spl:splstack::bottom",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        add: {
          name: "add",
          id: "@spl:splstack::add",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        count: {
          name: "count",
          id: "@spl:splstack::count",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isempty: {
          name: "isEmpty",
          id: "@spl:splstack::isempty",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetexists: {
          name: "offsetExists",
          id: "@spl:splstack::offsetexists",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetget: {
          name: "offsetGet",
          id: "@spl:splstack::offsetget",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetset: {
          name: "offsetSet",
          id: "@spl:splstack::offsetset",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetunset: {
          name: "offsetUnset",
          id: "@spl:splstack::offsetunset",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        rewind: {
          name: "rewind",
          id: "@spl:splstack::rewind",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        next: {
          name: "next",
          id: "@spl:splstack::next",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        prev: {
          name: "prev",
          id: "@spl:splstack::prev",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        valid: {
          name: "valid",
          id: "@spl:splstack::valid",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        key: {
          name: "key",
          id: "@spl:splstack::key",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        current: {
          name: "current",
          id: "@spl:splstack::current",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getiteratormode: {
          name: "getIteratorMode",
          id: "@spl:splstack::getiteratormode",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setiteratormode: {
          name: "setIteratorMode",
          id: "@spl:splstack::setiteratormode",
          owner: "SplStack",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      constants: {
        IT_MODE_LIFO: {
          owner: "SplStack",
          visibility: "public",
          value: 2
        },
        IT_MODE_FIFO: {
          owner: "SplStack",
          visibility: "public",
          value: 0
        },
        IT_MODE_DELETE: {
          owner: "SplStack",
          visibility: "public",
          value: 1
        },
        IT_MODE_KEEP: {
          owner: "SplStack",
          visibility: "public",
          value: 0
        }
      },
      nativeSpl: true
    },
    functions: {
      "@spl:splstack::push": {
        name: "SplStack::push",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "push",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::pop": {
        name: "SplStack::pop",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "pop",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::shift": {
        name: "SplStack::shift",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "shift",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::unshift": {
        name: "SplStack::unshift",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "unshift",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::top": {
        name: "SplStack::top",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "top",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::bottom": {
        name: "SplStack::bottom",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "bottom",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::add": {
        name: "SplStack::add",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
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
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "add",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::count": {
        name: "SplStack::count",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "count",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::isempty": {
        name: "SplStack::isEmpty",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "isempty",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::offsetexists": {
        name: "SplStack::offsetExists",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetexists",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::offsetget": {
        name: "SplStack::offsetGet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetget",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::offsetset": {
        name: "SplStack::offsetSet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetset",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::offsetunset": {
        name: "SplStack::offsetUnset",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetunset",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splstack::rewind": {
        name: "SplStack::rewind",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "rewind",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::next": {
        name: "SplStack::next",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "next",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::prev": {
        name: "SplStack::prev",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "prev",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::valid": {
        name: "SplStack::valid",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "valid",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::key": {
        name: "SplStack::key",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "key",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::current": {
        name: "SplStack::current",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "current",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::getiteratormode": {
        name: "SplStack::getIteratorMode",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "getiteratormode",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splstack::setiteratormode": {
        name: "SplStack::setIteratorMode",
        parameters: [
          {
            id: "v6d6f6465",
            name: "mode",
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
        returnType: null,
        declared: true,
        objectScope: "SplStack",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "setiteratormode",
                arguments: [
                  {
                    $local: "v6d6f6465"
                  }
                ]
              }
            }
          }
        }
      }
    }
  },
  splqueue: {
    class: {
      name: "SplQueue",
      parent: null,
      ancestors: [
        "SplDoublyLinkedList",
        "Serializable",
        "ArrayAccess",
        "Countable",
        "Traversable",
        "Iterator"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      methods: {
        push: {
          name: "push",
          id: "@spl:splqueue::push",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        pop: {
          name: "pop",
          id: "@spl:splqueue::pop",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        shift: {
          name: "shift",
          id: "@spl:splqueue::shift",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        unshift: {
          name: "unshift",
          id: "@spl:splqueue::unshift",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        top: {
          name: "top",
          id: "@spl:splqueue::top",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        bottom: {
          name: "bottom",
          id: "@spl:splqueue::bottom",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        add: {
          name: "add",
          id: "@spl:splqueue::add",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        count: {
          name: "count",
          id: "@spl:splqueue::count",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isempty: {
          name: "isEmpty",
          id: "@spl:splqueue::isempty",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetexists: {
          name: "offsetExists",
          id: "@spl:splqueue::offsetexists",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetget: {
          name: "offsetGet",
          id: "@spl:splqueue::offsetget",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetset: {
          name: "offsetSet",
          id: "@spl:splqueue::offsetset",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        offsetunset: {
          name: "offsetUnset",
          id: "@spl:splqueue::offsetunset",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        rewind: {
          name: "rewind",
          id: "@spl:splqueue::rewind",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        next: {
          name: "next",
          id: "@spl:splqueue::next",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        prev: {
          name: "prev",
          id: "@spl:splqueue::prev",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        valid: {
          name: "valid",
          id: "@spl:splqueue::valid",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        key: {
          name: "key",
          id: "@spl:splqueue::key",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        current: {
          name: "current",
          id: "@spl:splqueue::current",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getiteratormode: {
          name: "getIteratorMode",
          id: "@spl:splqueue::getiteratormode",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setiteratormode: {
          name: "setIteratorMode",
          id: "@spl:splqueue::setiteratormode",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        enqueue: {
          name: "enqueue",
          id: "@spl:splqueue::enqueue",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        dequeue: {
          name: "dequeue",
          id: "@spl:splqueue::dequeue",
          owner: "SplQueue",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      constants: {
        IT_MODE_LIFO: {
          owner: "SplQueue",
          visibility: "public",
          value: 2
        },
        IT_MODE_FIFO: {
          owner: "SplQueue",
          visibility: "public",
          value: 0
        },
        IT_MODE_DELETE: {
          owner: "SplQueue",
          visibility: "public",
          value: 1
        },
        IT_MODE_KEEP: {
          owner: "SplQueue",
          visibility: "public",
          value: 0
        }
      },
      nativeSpl: true
    },
    functions: {
      "@spl:splqueue::push": {
        name: "SplQueue::push",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "push",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::pop": {
        name: "SplQueue::pop",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "pop",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::shift": {
        name: "SplQueue::shift",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "shift",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::unshift": {
        name: "SplQueue::unshift",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "unshift",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::top": {
        name: "SplQueue::top",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "top",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::bottom": {
        name: "SplQueue::bottom",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "bottom",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::add": {
        name: "SplQueue::add",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
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
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "add",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::count": {
        name: "SplQueue::count",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "count",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::isempty": {
        name: "SplQueue::isEmpty",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "isempty",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::offsetexists": {
        name: "SplQueue::offsetExists",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetexists",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::offsetget": {
        name: "SplQueue::offsetGet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetget",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::offsetset": {
        name: "SplQueue::offsetSet",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          },
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetset",
                arguments: [
                  {
                    $local: "v696e646578"
                  },
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::offsetunset": {
        name: "SplQueue::offsetUnset",
        parameters: [
          {
            id: "v696e646578",
            name: "index",
            reference: false,
            variadic: false,
            rule: null
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "offsetunset",
                arguments: [
                  {
                    $local: "v696e646578"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::rewind": {
        name: "SplQueue::rewind",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "rewind",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::next": {
        name: "SplQueue::next",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "next",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::prev": {
        name: "SplQueue::prev",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "prev",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::valid": {
        name: "SplQueue::valid",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "valid",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::key": {
        name: "SplQueue::key",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "key",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::current": {
        name: "SplQueue::current",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "current",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::getiteratormode": {
        name: "SplQueue::getIteratorMode",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "getiteratormode",
                arguments: []
              }
            }
          }
        }
      },
      "@spl:splqueue::setiteratormode": {
        name: "SplQueue::setIteratorMode",
        parameters: [
          {
            id: "v6d6f6465",
            name: "mode",
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
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "setiteratormode",
                arguments: [
                  {
                    $local: "v6d6f6465"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::enqueue": {
        name: "SplQueue::enqueue",
        parameters: [
          {
            id: "v76616c7565",
            name: "value",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
            }
          }
        ],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "enqueue",
                arguments: [
                  {
                    $local: "v76616c7565"
                  }
                ]
              }
            }
          }
        }
      },
      "@spl:splqueue::dequeue": {
        name: "SplQueue::dequeue",
        parameters: [],
        returnType: null,
        declared: true,
        objectScope: "SplQueue",
        bindThis: true,
        body: {
          type: "return",
          hasValue: true,
          value: {
            $expression: {
              operation: "splMethod",
              left: {
                $expression: {
                  operation: "objectThis",
                  left: null
                }
              },
              right: {
                method: "dequeue",
                arguments: []
              }
            }
          }
        }
      }
    }
  }
};

// src-js/core/php-spl.js
var storage2 = /* @__PURE__ */ new WeakMap();
var fail = (name, message) => {
  throw Object.assign(new Error(message), { name });
};
var isSplObject = (value) => isPhpObject(value) && ["arrayiterator", "arrayobject"].includes(objectData(value).definition.name.toLowerCase());
var result = (value, kind = phpType(value)) => ({ value, kind });
var cloneSpl = (original, copy) => {
  cloneSplList(original, copy);
  const info = storage2.get(original);
  if (info) storage2.set(copy, { cell: objectData(original).definition.name === "ArrayIterator" ? info.cell : { array: clonePhp(info.cell.array) }, position: 0 });
};
var splMethod = (expression, state, context) => {
  const value = resolveData(expression.left, state, context), method = expression.right.method;
  if (!isSplObject(value) && !isSplList(value)) throw new TypeError("Invalid frontend SPL receiver");
  const args = expression.right.arguments.map((node) => {
    const value2 = resolveData(node, state, context);
    return { value: value2, kind: resolveType(node, state, context, value2) };
  });
  const extra = splListMethod(value, method, args, context);
  if (extra) return extra;
  const [a, b, c] = args.map((item) => item.value);
  if (storage2.get(value)?.cell.sorting && ["__construct", "offsetset", "append", "offsetunset", "exchangearray", "asort", "ksort", "natsort", "natcasesort", "uasort", "uksort"].includes(method)) throw new Error("Modification of ArrayObject during sorting is prohibited");
  if (method === "__construct") {
    if (!isPhpArray(a)) throw new TypeError("Frontend SPL constructors currently require an array");
    if (b !== 0) fail("ValueError", "Frontend SPL currently supports flags = 0");
    if (c != null && c.replace(/^\\/, "").toLowerCase() !== "arrayiterator") fail("ValueError", "Frontend ArrayObject currently requires ArrayIterator");
    storage2.set(value, { cell: { array: clonePhp(a) }, position: 0 });
    return result(null);
  }
  const data = storage2.get(value);
  if (!data) throw new Error("Uninitialized frontend SPL object");
  const entries = () => arrayEntries(data.cell.array);
  const current = () => entries()[data.position];
  if (method === "getarraycopy") return result(clonePhp(data.cell.array), "array");
  if (method === "count") return result(entries().length, "integer");
  if (method === "getflags") return result(0, "integer");
  if (method === "setflags") {
    if (a !== 0) fail("ValueError", "Frontend SPL currently supports flags = 0");
    return result(null);
  }
  if (method === "getiteratorclass") return result("ArrayIterator", "string");
  if (method === "setiteratorclass") {
    if (a.replace(/^\\/, "").toLowerCase() !== "arrayiterator") fail("ValueError", "Frontend ArrayObject currently requires ArrayIterator");
    return result(null);
  }
  if (method === "offsetexists") {
    const key = arrayKey(a, context);
    return result(Object.hasOwn(data.cell.array, key), "boolean");
  }
  if (method === "offsetget") return arrayRead(data.cell.array, a, context);
  if (method === "offsetset" || method === "append") {
    const item = method === "append" ? args[0] : args[1];
    data.cell.array = arrayWrite(data.cell.array, a, item.value, item.kind, context, method === "append" || a === null);
    return result(null);
  }
  if (method === "offsetunset") {
    const key = arrayKey(a, context), index = entries().findIndex(([candidate]) => candidate === key);
    data.cell.array = arrayUnset(data.cell.array, key, context);
    if (index >= 0 && index < data.position) data.position--;
    return result(null);
  }
  if (method === "current") {
    const entry = current();
    return entry ? result(entry[1], arrayKind(data.cell.array, entry[0])) : result(null);
  }
  if (method === "key") return result(current()?.[0] ?? null);
  if (method === "valid") return result(!!current(), "boolean");
  if (method === "rewind") {
    data.position = 0;
    return result(null);
  }
  if (method === "next") {
    data.position++;
    return result(null);
  }
  if (method === "seek") {
    if (a < 0 || a >= entries().length) fail("OutOfBoundsException", "Seek position is out of range");
    data.position = a;
    return result(null);
  }
  if (method === "exchangearray") {
    if (!isPhpArray(a)) throw new TypeError("Frontend exchangeArray() currently requires an array");
    const old = data.cell.array;
    data.cell.array = clonePhp(a);
    data.position = 0;
    return result(clonePhp(old), "array");
  }
  if (method === "getiterator") {
    if (--(context.objectBudget ||= { remaining: 1e4 }).remaining < 0) throw new RangeError("Frontend object allocation limit exceeded");
    const copy = makeObject(spl_definitions_default.arrayiterator.class);
    storage2.set(copy, { cell: data.cell, position: 0 });
    return result(copy, "object");
  }
  if (["asort", "ksort", "natsort", "natcasesort", "uasort", "uksort"].includes(method)) {
    const ref = { get: () => result(data.cell.array, "array"), set: (array) => {
      data.cell.array = array;
      return result(array, "array");
    } };
    data.cell.sorting = true;
    try {
      const output = invokeBuiltin(method, [{ ...ref.get(), ref }, ...args], state, context);
      data.position = 0;
      return output;
    } finally {
      data.cell.sorting = false;
    }
  }
  throw new Error(`Unsupported frontend SPL method ${method}()`);
};
var runIterators = (name, items, context, invoke) => {
  if (!["iterator_to_array", "iterator_count", "iterator_apply"].includes(name)) return null;
  const source = items[0].value;
  if (name === "iterator_apply" && !objectIs(source, "Traversable")) throw new TypeError("iterator_apply(): Argument #1 must be Traversable");
  let count = 0, output = makeArray();
  const iteration = () => {
    if (count >= 1e3 || --(context.loopBudget ||= { remaining: 1e4 }).remaining < 0) throw Object.assign(new RangeError("Frontend loop limit exceeded"), { code: "PHP_LOOP_LIMIT" });
  };
  for (const { key, item } of foreachEntries(source, name === "iterator_to_array" && items[1].value, context, iteration)) {
    count++;
    if (name === "iterator_to_array") output = item.reference ? arrayWithReference(output, key?.value, item.reference, context, !items[1].value) : arrayWrite(output, key?.value, item.value, item.kind, context, !items[1].value);
    if (name === "iterator_apply") {
      const args = arrayEntries(items[2].value).map(([key2, value]) => ({ value, kind: arrayKind(items[2].value, key2), ...typeof key2 === "string" ? { name: key2 } : {} }));
      if (!phpBool(invokeFunction(items[1].value, args, context.objectState || {}, { ...context, source: { ...context.source, strictTypes: false } }).value)) break;
    }
  }
  return name === "iterator_to_array" ? result(output, "array") : result(count, "integer");
};
var splStorageReference = (value) => {
  const data = storage2.get(value);
  if (!data) throw new Error("Uninitialized frontend SPL object");
  return { get: () => result(data.cell.array, "array"), set: (array) => {
    if (data.cell.sorting) throw new Error("Modification of ArrayObject during sorting is prohibited");
    data.cell.array = array;
    return result(array, "array");
  } };
};

// phpaml-module:spl
registerModule("spl", "0.1.0-beta.9", { ...php_spl_exports, ...php_spl_list_exports });
