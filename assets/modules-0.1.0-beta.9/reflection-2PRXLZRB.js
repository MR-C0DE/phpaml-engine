import {
  arrayEntries,
  arrayKind,
  bindMethod,
  evaluateObject,
  invokeFunction,
  makeArray,
  makeObject,
  objectData,
  objectIs,
  objectMemberLookup,
  objectPropertyReference,
  phpType,
  resolvedNode,
  staticPropertyReference
} from "./chunk-AK2NYU3I.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-reflection.js
var php_reflection_exports = {};
__export(php_reflection_exports, {
  nativeReflectionMethod: () => nativeReflectionMethod
});

// src-js/core/reflection-definitions.json
var reflection_definitions_default = {
  reflectionclass: {
    class: {
      name: "ReflectionClass",
      parent: null,
      ancestors: [
        "Stringable",
        "Reflector"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        IS_IMPLICIT_ABSTRACT: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 16
        },
        IS_EXPLICIT_ABSTRACT: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 64
        },
        IS_FINAL: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 32
        },
        IS_READONLY: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 65536
        },
        SKIP_INITIALIZATION_ON_SERIALIZE: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 8
        },
        SKIP_DESTRUCTOR: {
          owner: "ReflectionClass",
          visibility: "public",
          value: 16
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@reflection:reflectionclass::__construct",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getname: {
          name: "getName",
          id: "@reflection:reflectionclass::getname",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getshortname: {
          name: "getShortName",
          id: "@reflection:reflectionclass::getshortname",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getnamespacename: {
          name: "getNamespaceName",
          id: "@reflection:reflectionclass::getnamespacename",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        innamespace: {
          name: "inNamespace",
          id: "@reflection:reflectionclass::innamespace",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isabstract: {
          name: "isAbstract",
          id: "@reflection:reflectionclass::isabstract",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isfinal: {
          name: "isFinal",
          id: "@reflection:reflectionclass::isfinal",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinterface: {
          name: "isInterface",
          id: "@reflection:reflectionclass::isinterface",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        istrait: {
          name: "isTrait",
          id: "@reflection:reflectionclass::istrait",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isenum: {
          name: "isEnum",
          id: "@reflection:reflectionclass::isenum",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isreadonly: {
          name: "isReadOnly",
          id: "@reflection:reflectionclass::isreadonly",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinstantiable: {
          name: "isInstantiable",
          id: "@reflection:reflectionclass::isinstantiable",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        iscloneable: {
          name: "isCloneable",
          id: "@reflection:reflectionclass::iscloneable",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinternal: {
          name: "isInternal",
          id: "@reflection:reflectionclass::isinternal",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isuserdefined: {
          name: "isUserDefined",
          id: "@reflection:reflectionclass::isuserdefined",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasmethod: {
          name: "hasMethod",
          id: "@reflection:reflectionclass::hasmethod",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getmethod: {
          name: "getMethod",
          id: "@reflection:reflectionclass::getmethod",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getmethods: {
          name: "getMethods",
          id: "@reflection:reflectionclass::getmethods",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasproperty: {
          name: "hasProperty",
          id: "@reflection:reflectionclass::hasproperty",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getproperty: {
          name: "getProperty",
          id: "@reflection:reflectionclass::getproperty",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getproperties: {
          name: "getProperties",
          id: "@reflection:reflectionclass::getproperties",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasconstant: {
          name: "hasConstant",
          id: "@reflection:reflectionclass::hasconstant",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getconstant: {
          name: "getConstant",
          id: "@reflection:reflectionclass::getconstant",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getconstants: {
          name: "getConstants",
          id: "@reflection:reflectionclass::getconstants",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getparentclass: {
          name: "getParentClass",
          id: "@reflection:reflectionclass::getparentclass",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getinterfacenames: {
          name: "getInterfaceNames",
          id: "@reflection:reflectionclass::getinterfacenames",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        issubclassof: {
          name: "isSubclassOf",
          id: "@reflection:reflectionclass::issubclassof",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        implementsinterface: {
          name: "implementsInterface",
          id: "@reflection:reflectionclass::implementsinterface",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinstance: {
          name: "isInstance",
          id: "@reflection:reflectionclass::isinstance",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        newinstanceargs: {
          name: "newInstanceArgs",
          id: "@reflection:reflectionclass::newinstanceargs",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        newinstancewithoutconstructor: {
          name: "newInstanceWithoutConstructor",
          id: "@reflection:reflectionclass::newinstancewithoutconstructor",
          owner: "ReflectionClass",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      nativeReflection: true
    },
    functions: {
      "@reflection:reflectionclass::__construct": {
        name: "ReflectionClass::__construct",
        parameters: [
          {
            id: "v6f626a6563744f72436c617373",
            name: "objectOrClass",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "string"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getname": {
        name: "ReflectionClass::getName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getshortname": {
        name: "ReflectionClass::getShortName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getshortname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getnamespacename": {
        name: "ReflectionClass::getNamespaceName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getnamespacename"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::innamespace": {
        name: "ReflectionClass::inNamespace",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "innamespace"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isabstract": {
        name: "ReflectionClass::isAbstract",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isabstract"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isfinal": {
        name: "ReflectionClass::isFinal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isfinal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isinterface": {
        name: "ReflectionClass::isInterface",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isinterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::istrait": {
        name: "ReflectionClass::isTrait",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "istrait"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isenum": {
        name: "ReflectionClass::isEnum",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isenum"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isreadonly": {
        name: "ReflectionClass::isReadOnly",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isreadonly"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isinstantiable": {
        name: "ReflectionClass::isInstantiable",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isinstantiable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::iscloneable": {
        name: "ReflectionClass::isCloneable",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "iscloneable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isinternal": {
        name: "ReflectionClass::isInternal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isinternal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isuserdefined": {
        name: "ReflectionClass::isUserDefined",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isuserdefined"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::hasmethod": {
        name: "ReflectionClass::hasMethod",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "hasmethod"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getmethod": {
        name: "ReflectionClass::getMethod",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getmethod"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getmethods": {
        name: "ReflectionClass::getMethods",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getmethods"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::hasproperty": {
        name: "ReflectionClass::hasProperty",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "hasproperty"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getproperty": {
        name: "ReflectionClass::getProperty",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getproperty"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getproperties": {
        name: "ReflectionClass::getProperties",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getproperties"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::hasconstant": {
        name: "ReflectionClass::hasConstant",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "hasconstant"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getconstant": {
        name: "ReflectionClass::getConstant",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getconstant"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getconstants": {
        name: "ReflectionClass::getConstants",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getconstants"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getparentclass": {
        name: "ReflectionClass::getParentClass",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getparentclass"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::getinterfacenames": {
        name: "ReflectionClass::getInterfaceNames",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "getinterfacenames"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::issubclassof": {
        name: "ReflectionClass::isSubclassOf",
        parameters: [
          {
            id: "v636c617373",
            name: "class",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "reflectionclass",
                "string"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "issubclassof"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::implementsinterface": {
        name: "ReflectionClass::implementsInterface",
        parameters: [
          {
            id: "v696e74657266616365",
            name: "interface",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "reflectionclass",
                "string"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "implementsinterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::isinstance": {
        name: "ReflectionClass::isInstance",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "isinstance"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::newinstanceargs": {
        name: "ReflectionClass::newInstanceArgs",
        parameters: [
          {
            id: "v61726773",
            name: "args",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            },
            default: []
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "newinstanceargs"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionclass::newinstancewithoutconstructor": {
        name: "ReflectionClass::newInstanceWithoutConstructor",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionClass",
          method: "newinstancewithoutconstructor"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  reflectionobject: {
    class: {
      name: "ReflectionObject",
      parent: null,
      ancestors: [
        "ReflectionClass",
        "Reflector",
        "Stringable"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        IS_IMPLICIT_ABSTRACT: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 16
        },
        IS_EXPLICIT_ABSTRACT: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 64
        },
        IS_FINAL: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 32
        },
        IS_READONLY: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 65536
        },
        SKIP_INITIALIZATION_ON_SERIALIZE: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 8
        },
        SKIP_DESTRUCTOR: {
          owner: "ReflectionObject",
          visibility: "public",
          value: 16
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@reflection:reflectionobject::__construct",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getname: {
          name: "getName",
          id: "@reflection:reflectionobject::getname",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getshortname: {
          name: "getShortName",
          id: "@reflection:reflectionobject::getshortname",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getnamespacename: {
          name: "getNamespaceName",
          id: "@reflection:reflectionobject::getnamespacename",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        innamespace: {
          name: "inNamespace",
          id: "@reflection:reflectionobject::innamespace",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isabstract: {
          name: "isAbstract",
          id: "@reflection:reflectionobject::isabstract",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isfinal: {
          name: "isFinal",
          id: "@reflection:reflectionobject::isfinal",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinterface: {
          name: "isInterface",
          id: "@reflection:reflectionobject::isinterface",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        istrait: {
          name: "isTrait",
          id: "@reflection:reflectionobject::istrait",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isenum: {
          name: "isEnum",
          id: "@reflection:reflectionobject::isenum",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isreadonly: {
          name: "isReadOnly",
          id: "@reflection:reflectionobject::isreadonly",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinstantiable: {
          name: "isInstantiable",
          id: "@reflection:reflectionobject::isinstantiable",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        iscloneable: {
          name: "isCloneable",
          id: "@reflection:reflectionobject::iscloneable",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinternal: {
          name: "isInternal",
          id: "@reflection:reflectionobject::isinternal",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isuserdefined: {
          name: "isUserDefined",
          id: "@reflection:reflectionobject::isuserdefined",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasmethod: {
          name: "hasMethod",
          id: "@reflection:reflectionobject::hasmethod",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getmethod: {
          name: "getMethod",
          id: "@reflection:reflectionobject::getmethod",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getmethods: {
          name: "getMethods",
          id: "@reflection:reflectionobject::getmethods",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasproperty: {
          name: "hasProperty",
          id: "@reflection:reflectionobject::hasproperty",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getproperty: {
          name: "getProperty",
          id: "@reflection:reflectionobject::getproperty",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getproperties: {
          name: "getProperties",
          id: "@reflection:reflectionobject::getproperties",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        hasconstant: {
          name: "hasConstant",
          id: "@reflection:reflectionobject::hasconstant",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getconstant: {
          name: "getConstant",
          id: "@reflection:reflectionobject::getconstant",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getconstants: {
          name: "getConstants",
          id: "@reflection:reflectionobject::getconstants",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getparentclass: {
          name: "getParentClass",
          id: "@reflection:reflectionobject::getparentclass",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getinterfacenames: {
          name: "getInterfaceNames",
          id: "@reflection:reflectionobject::getinterfacenames",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        issubclassof: {
          name: "isSubclassOf",
          id: "@reflection:reflectionobject::issubclassof",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        implementsinterface: {
          name: "implementsInterface",
          id: "@reflection:reflectionobject::implementsinterface",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinstance: {
          name: "isInstance",
          id: "@reflection:reflectionobject::isinstance",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        newinstanceargs: {
          name: "newInstanceArgs",
          id: "@reflection:reflectionobject::newinstanceargs",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        newinstancewithoutconstructor: {
          name: "newInstanceWithoutConstructor",
          id: "@reflection:reflectionobject::newinstancewithoutconstructor",
          owner: "ReflectionObject",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      nativeReflection: true
    },
    functions: {
      "@reflection:reflectionobject::__construct": {
        name: "ReflectionObject::__construct",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getname": {
        name: "ReflectionObject::getName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getshortname": {
        name: "ReflectionObject::getShortName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getshortname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getnamespacename": {
        name: "ReflectionObject::getNamespaceName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getnamespacename"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::innamespace": {
        name: "ReflectionObject::inNamespace",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "innamespace"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isabstract": {
        name: "ReflectionObject::isAbstract",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isabstract"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isfinal": {
        name: "ReflectionObject::isFinal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isfinal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isinterface": {
        name: "ReflectionObject::isInterface",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isinterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::istrait": {
        name: "ReflectionObject::isTrait",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "istrait"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isenum": {
        name: "ReflectionObject::isEnum",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isenum"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isreadonly": {
        name: "ReflectionObject::isReadOnly",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isreadonly"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isinstantiable": {
        name: "ReflectionObject::isInstantiable",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isinstantiable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::iscloneable": {
        name: "ReflectionObject::isCloneable",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "iscloneable"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isinternal": {
        name: "ReflectionObject::isInternal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isinternal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isuserdefined": {
        name: "ReflectionObject::isUserDefined",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isuserdefined"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::hasmethod": {
        name: "ReflectionObject::hasMethod",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "hasmethod"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getmethod": {
        name: "ReflectionObject::getMethod",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getmethod"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getmethods": {
        name: "ReflectionObject::getMethods",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getmethods"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::hasproperty": {
        name: "ReflectionObject::hasProperty",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "hasproperty"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getproperty": {
        name: "ReflectionObject::getProperty",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getproperty"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getproperties": {
        name: "ReflectionObject::getProperties",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getproperties"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::hasconstant": {
        name: "ReflectionObject::hasConstant",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "hasconstant"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getconstant": {
        name: "ReflectionObject::getConstant",
        parameters: [
          {
            id: "v6e616d65",
            name: "name",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getconstant"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getconstants": {
        name: "ReflectionObject::getConstants",
        parameters: [
          {
            id: "v66696c746572",
            name: "filter",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "int"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getconstants"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getparentclass": {
        name: "ReflectionObject::getParentClass",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getparentclass"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::getinterfacenames": {
        name: "ReflectionObject::getInterfaceNames",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "getinterfacenames"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::issubclassof": {
        name: "ReflectionObject::isSubclassOf",
        parameters: [
          {
            id: "v636c617373",
            name: "class",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "reflectionclass",
                "string"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "issubclassof"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::implementsinterface": {
        name: "ReflectionObject::implementsInterface",
        parameters: [
          {
            id: "v696e74657266616365",
            name: "interface",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "reflectionclass",
                "string"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "implementsinterface"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::isinstance": {
        name: "ReflectionObject::isInstance",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "isinstance"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::newinstanceargs": {
        name: "ReflectionObject::newInstanceArgs",
        parameters: [
          {
            id: "v61726773",
            name: "args",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            },
            default: []
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "newinstanceargs"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionobject::newinstancewithoutconstructor": {
        name: "ReflectionObject::newInstanceWithoutConstructor",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionObject",
          method: "newinstancewithoutconstructor"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  reflectionmethod: {
    class: {
      name: "ReflectionMethod",
      parent: null,
      ancestors: [
        "ReflectionFunctionAbstract",
        "Stringable",
        "Reflector"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        IS_STATIC: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 16
        },
        IS_PUBLIC: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 1
        },
        IS_PROTECTED: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 2
        },
        IS_PRIVATE: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 4
        },
        IS_ABSTRACT: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 64
        },
        IS_FINAL: {
          owner: "ReflectionMethod",
          visibility: "public",
          value: 32
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@reflection:reflectionmethod::__construct",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getname: {
          name: "getName",
          id: "@reflection:reflectionmethod::getname",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getdeclaringclass: {
          name: "getDeclaringClass",
          id: "@reflection:reflectionmethod::getdeclaringclass",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        ispublic: {
          name: "isPublic",
          id: "@reflection:reflectionmethod::ispublic",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isprotected: {
          name: "isProtected",
          id: "@reflection:reflectionmethod::isprotected",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isprivate: {
          name: "isPrivate",
          id: "@reflection:reflectionmethod::isprivate",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isstatic: {
          name: "isStatic",
          id: "@reflection:reflectionmethod::isstatic",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isfinal: {
          name: "isFinal",
          id: "@reflection:reflectionmethod::isfinal",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isabstract: {
          name: "isAbstract",
          id: "@reflection:reflectionmethod::isabstract",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isconstructor: {
          name: "isConstructor",
          id: "@reflection:reflectionmethod::isconstructor",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isdestructor: {
          name: "isDestructor",
          id: "@reflection:reflectionmethod::isdestructor",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getnumberofparameters: {
          name: "getNumberOfParameters",
          id: "@reflection:reflectionmethod::getnumberofparameters",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getnumberofrequiredparameters: {
          name: "getNumberOfRequiredParameters",
          id: "@reflection:reflectionmethod::getnumberofrequiredparameters",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        invokeargs: {
          name: "invokeArgs",
          id: "@reflection:reflectionmethod::invokeargs",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setaccessible: {
          name: "setAccessible",
          id: "@reflection:reflectionmethod::setaccessible",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isuserdefined: {
          name: "isUserDefined",
          id: "@reflection:reflectionmethod::isuserdefined",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinternal: {
          name: "isInternal",
          id: "@reflection:reflectionmethod::isinternal",
          owner: "ReflectionMethod",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      nativeReflection: true
    },
    functions: {
      "@reflection:reflectionmethod::__construct": {
        name: "ReflectionMethod::__construct",
        parameters: [
          {
            id: "v6f626a6563744f724d6574686f64",
            name: "objectOrMethod",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v6d6574686f64",
            name: "method",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::getname": {
        name: "ReflectionMethod::getName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "getname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::getdeclaringclass": {
        name: "ReflectionMethod::getDeclaringClass",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "getdeclaringclass"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::ispublic": {
        name: "ReflectionMethod::isPublic",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "ispublic"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isprotected": {
        name: "ReflectionMethod::isProtected",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isprotected"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isprivate": {
        name: "ReflectionMethod::isPrivate",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isprivate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isstatic": {
        name: "ReflectionMethod::isStatic",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isstatic"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isfinal": {
        name: "ReflectionMethod::isFinal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isfinal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isabstract": {
        name: "ReflectionMethod::isAbstract",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isabstract"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isconstructor": {
        name: "ReflectionMethod::isConstructor",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isconstructor"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isdestructor": {
        name: "ReflectionMethod::isDestructor",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isdestructor"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::getnumberofparameters": {
        name: "ReflectionMethod::getNumberOfParameters",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "getnumberofparameters"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::getnumberofrequiredparameters": {
        name: "ReflectionMethod::getNumberOfRequiredParameters",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "getnumberofrequiredparameters"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::invokeargs": {
        name: "ReflectionMethod::invokeArgs",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: true
            }
          },
          {
            id: "v61726773",
            name: "args",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "array"
              ],
              nullable: false
            }
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "invokeargs"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::setaccessible": {
        name: "ReflectionMethod::setAccessible",
        parameters: [
          {
            id: "v61636365737369626c65",
            name: "accessible",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "setaccessible"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isuserdefined": {
        name: "ReflectionMethod::isUserDefined",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isuserdefined"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionmethod::isinternal": {
        name: "ReflectionMethod::isInternal",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionMethod",
          method: "isinternal"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  },
  reflectionproperty: {
    class: {
      name: "ReflectionProperty",
      parent: null,
      ancestors: [
        "Stringable",
        "Reflector"
      ],
      abstract: false,
      final: false,
      properties: [],
      staticProperties: [],
      constants: {
        IS_STATIC: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 16
        },
        IS_READONLY: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 128
        },
        IS_PUBLIC: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 1
        },
        IS_PROTECTED: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 2
        },
        IS_PRIVATE: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 4
        },
        IS_ABSTRACT: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 64
        },
        IS_PROTECTED_SET: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 2048
        },
        IS_PRIVATE_SET: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 4096
        },
        IS_VIRTUAL: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 512
        },
        IS_FINAL: {
          owner: "ReflectionProperty",
          visibility: "public",
          value: 32
        }
      },
      methods: {
        __construct: {
          name: "__construct",
          id: "@reflection:reflectionproperty::__construct",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getname: {
          name: "getName",
          id: "@reflection:reflectionproperty::getname",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getdeclaringclass: {
          name: "getDeclaringClass",
          id: "@reflection:reflectionproperty::getdeclaringclass",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        ispublic: {
          name: "isPublic",
          id: "@reflection:reflectionproperty::ispublic",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isprotected: {
          name: "isProtected",
          id: "@reflection:reflectionproperty::isprotected",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isprivate: {
          name: "isPrivate",
          id: "@reflection:reflectionproperty::isprivate",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isstatic: {
          name: "isStatic",
          id: "@reflection:reflectionproperty::isstatic",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isreadonly: {
          name: "isReadOnly",
          id: "@reflection:reflectionproperty::isreadonly",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isdefault: {
          name: "isDefault",
          id: "@reflection:reflectionproperty::isdefault",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        isinitialized: {
          name: "isInitialized",
          id: "@reflection:reflectionproperty::isinitialized",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        getvalue: {
          name: "getValue",
          id: "@reflection:reflectionproperty::getvalue",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setvalue: {
          name: "setValue",
          id: "@reflection:reflectionproperty::setvalue",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        },
        setaccessible: {
          name: "setAccessible",
          id: "@reflection:reflectionproperty::setaccessible",
          owner: "ReflectionProperty",
          visibility: "public",
          static: false,
          abstract: false,
          final: false
        }
      },
      nativeReflection: true
    },
    functions: {
      "@reflection:reflectionproperty::__construct": {
        name: "ReflectionProperty::__construct",
        parameters: [
          {
            id: "v636c617373",
            name: "class",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object",
                "string"
              ],
              nullable: false
            }
          },
          {
            id: "v70726f7065727479",
            name: "property",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "__construct"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::getname": {
        name: "ReflectionProperty::getName",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "getname"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::getdeclaringclass": {
        name: "ReflectionProperty::getDeclaringClass",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "getdeclaringclass"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::ispublic": {
        name: "ReflectionProperty::isPublic",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "ispublic"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isprotected": {
        name: "ReflectionProperty::isProtected",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isprotected"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isprivate": {
        name: "ReflectionProperty::isPrivate",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isprivate"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isstatic": {
        name: "ReflectionProperty::isStatic",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isstatic"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isreadonly": {
        name: "ReflectionProperty::isReadOnly",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isreadonly"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isdefault": {
        name: "ReflectionProperty::isDefault",
        parameters: [],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isdefault"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::isinitialized": {
        name: "ReflectionProperty::isInitialized",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "isinitialized"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::getvalue": {
        name: "ReflectionProperty::getValue",
        parameters: [
          {
            id: "v6f626a656374",
            name: "object",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "object"
              ],
              nullable: true
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "getvalue"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::setvalue": {
        name: "ReflectionProperty::setValue",
        parameters: [
          {
            id: "v6f626a6563744f7256616c7565",
            name: "objectOrValue",
            reference: false,
            variadic: false,
            rule: {
              types: [
                "mixed"
              ],
              nullable: true
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
            },
            default: null
          }
        ],
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "setvalue"
        },
        body: {
          type: "sequence",
          actions: []
        }
      },
      "@reflection:reflectionproperty::setaccessible": {
        name: "ReflectionProperty::setAccessible",
        parameters: [
          {
            id: "v61636365737369626c65",
            name: "accessible",
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
        returnType: null,
        declared: true,
        nativeReflection: {
          class: "ReflectionProperty",
          method: "setaccessible"
        },
        body: {
          type: "sequence",
          actions: []
        }
      }
    }
  }
};

// src-js/core/php-reflection.js
var storage = /* @__PURE__ */ new WeakMap();
var fail = (message) => {
  throw Object.assign(new Error(message), { name: "ReflectionException" });
};
var create = (name, data) => {
  const object = makeObject(reflection_definitions_default[name.toLowerCase()].class);
  storage.set(object, data);
  return object;
};
var className = (value) => storage.get(value)?.className || objectData(value)?.definition.name || value;
var lineage = (name, context) => {
  const output = [];
  while (name) {
    const data = context.classes[name.toLowerCase()];
    if (!data) fail("Class " + name + " does not exist");
    output.push(data);
    name = data.parent;
  }
  return output;
};
var table = (data, type, context) => Object.assign({}, ...lineage(data.className, context).reverse().map((row) => row[type]));
var nativeReflectionMethod = (definition, context) => {
  const operation = definition.nativeReflection.method, name = definition.nativeReflection.class, values = definition.parameters.map((p) => context.locals[p.id]), object = context.thisObject, state = context.objectState || {}, result = (value) => ({ value, kind: phpType(value) });
  if (operation === "__construct") {
    let target = className(values[0]), member2 = values[1];
    if (name === "ReflectionMethod" && !member2 && typeof target === "string" && target.includes("::")) [target, member2] = target.split("::");
    if (typeof target !== "string") fail("Expected a compiled class");
    const type = name === "ReflectionMethod" ? "methods" : name === "ReflectionProperty" ? "properties" : null;
    const klass2 = lineage(target, context)[0];
    const found = type ? objectMemberLookup(klass2.name, type === "methods" ? member2.toLowerCase() : member2, type, context, false) || type === "properties" && objectMemberLookup(klass2.name, member2, "staticProperties", context, false) : null;
    if (type && !found) fail("Unknown reflected member " + member2);
    storage.set(object, { className: klass2.name, member: found, type });
    return result(null);
  }
  const data = storage.get(object);
  if (!data) fail("Uninitialized reflection");
  const klass = lineage(data.className, context)[0], member = data.member;
  if (operation === "getname") return result(member?.name || klass.name);
  if (operation === "getshortname") return result(klass.name.split("\\").at(-1));
  if (operation === "getnamespacename") return result(klass.name.split("\\").slice(0, -1).join("\\"));
  if (operation === "innamespace") return result(klass.name.includes("\\"));
  if (operation === "isinternal") return result(!!(klass.nativeDate || klass.nativeIntl || klass.nativeSpl || klass.nativeReflection));
  if (operation === "isuserdefined") return result(!(klass.nativeDate || klass.nativeIntl || klass.nativeSpl || klass.nativeReflection));
  if (operation === "getdeclaringclass") return result(create("ReflectionClass", { className: member.owner }));
  if (["ispublic", "isprivate", "isprotected"].includes(operation)) return result(member.visibility === operation.slice(2));
  if (operation === "isstatic") return result(!!member.static || Object.values(table(data, "staticProperties", context)).includes(member));
  if (["isabstract", "isfinal", "isinterface", "istrait", "isenum", "isreadonly"].includes(operation)) return result(!!(member || klass)[operation.slice(2)]);
  if (operation === "isinstantiable") return result(!klass.abstract && !klass.interface && !klass.enum && (!klass.methods.__construct || klass.methods.__construct.visibility === "public"));
  if (operation === "iscloneable") return result(!klass.enum && !klass.interface && !klass.abstract);
  if (operation === "setaccessible") return result(null);
  if (operation === "isconstructor" || operation === "isdestructor") return result(member.name.toLowerCase() === (operation === "isconstructor" ? "__construct" : "__destruct"));
  if (operation === "isdefault") return result(true);
  if (operation === "getnumberofparameters" || operation === "getnumberofrequiredparameters") {
    const params = context.functions[member.id].parameters;
    return result(params.filter((p) => operation === "getnumberofparameters" || !Object.hasOwn(p, "default") && !p.variadic).length);
  }
  if (operation === "invokeargs") {
    const args = arrayEntries(values[1]).map(([key, value]) => ({ value, kind: arrayKind(values[1], key), ...typeof key === "string" ? { name: key } : {} }));
    return invokeFunction(bindMethod(member.id, member.static ? null : values[0], member.owner, data.className), args, state, context);
  }
  if (["getvalue", "setvalue", "isinitialized"].includes(operation)) {
    const scoped = { ...context, objectScope: member.owner }, isStatic = Object.values(table(data, "staticProperties", context)).includes(member), ref = isStatic ? staticPropertyReference({ left: member.owner, right: { name: member.name } }, state, scoped) : objectPropertyReference({ left: resolvedNode({ value: values[0], kind: "object" }), right: { name: member.name } }, state, scoped);
    if (operation === "setvalue") {
      const next = isStatic && context.functionArguments.length === 1 ? values[0] : values[1];
      ref.set(next, phpType(next));
      return result(null);
    }
    if (operation === "isinitialized") return result(ref.initialized());
    return ref.get();
  }
  if (operation === "getparentclass") return result(klass.parent ? create("ReflectionClass", { className: klass.parent }) : false);
  if (operation === "getinterfacenames") return result(klass.ancestors.filter((name2) => context.classes[name2.toLowerCase()]?.interface));
  if (operation === "issubclassof" || operation === "implementsinterface") return result(klass.ancestors.some((name2) => name2.toLowerCase() === className(values[0]).toLowerCase()));
  if (operation === "isinstance") return result(objectIs(values[0], klass.name));
  if (operation === "newinstanceargs" || operation === "newinstancewithoutconstructor") {
    const arguments_ = operation === "newinstanceargs" ? arrayEntries(values[0]).map(([key, value]) => ({ value: resolvedNode({ value, kind: arrayKind(values[0], key) }), ...typeof key === "string" ? { name: key } : {} })) : [];
    return evaluateObject({ operation: "objectNew", left: klass.name, right: { arguments: arguments_, skipConstructor: operation === "newinstancewithoutconstructor" } }, state, context);
  }
  if (["hasmethod", "getmethod", "hasproperty", "getproperty", "hasconstant", "getconstant"].includes(operation)) {
    const type = operation.endsWith("method") ? "methods" : operation.endsWith("property") ? "properties" : "constants", key = type === "methods" ? values[0].toLowerCase() : values[0], found = objectMemberLookup(klass.name, key, type, context, false) || type === "properties" && objectMemberLookup(klass.name, key, "staticProperties", context, false);
    if (operation.startsWith("has")) return result(!!found);
    if (!found) {
      if (type === "constants") return result(false);
      fail("Unknown reflected member " + key);
    }
    if (type === "constants") return evaluateObject({ operation: "objectConstant", left: klass.name, right: key }, state, { ...context, objectScope: found.owner });
    return result(create(type === "methods" ? "ReflectionMethod" : "ReflectionProperty", { className: klass.name, member: found, type }));
  }
  if (operation === "getconstants") {
    const entries = [];
    for (const [key, constant] of Object.entries(table(data, "constants", context))) {
      const item = evaluateObject({ operation: "objectConstant", left: klass.name, right: key }, state, { ...context, objectScope: constant.owner });
      entries.push([key, item.value, item.kind]);
    }
    return result(makeArray(entries));
  }
  if (operation === "getmethods" || operation === "getproperties") {
    const type = operation === "getmethods" ? "methods" : "properties", members = Object.values({ ...table(data, type, context), ...type === "properties" ? table(data, "staticProperties", context) : {} });
    const mask = values[0];
    return result(members.filter((member2) => mask === null || mask & ({ public: 1, protected: 2, private: 4 }[member2.visibility] | (member2.static ? 16 : 0) | (member2.final ? 32 : 0) | (member2.abstract ? 64 : 0))).map((member2) => create(type === "methods" ? "ReflectionMethod" : "ReflectionProperty", { className: klass.name, member: member2, type })));
  }
  fail("Unsupported reflection method " + operation);
};

// phpaml-module:reflection
registerModule("reflection", "0.1.0-beta.9", { ...php_reflection_exports });
