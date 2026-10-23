if (!globalThis.AMLPhpEval) {
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/php-parser/src/lexer/attribute.js
  var require_attribute = __commonJS({
    "node_modules/php-parser/src/lexer/attribute.js"(exports, module) {
      "use strict";
      module.exports = {
        attributeIndex: 0,
        attributeListDepth: {},
        matchST_ATTRIBUTE() {
          const ch = this.input();
          if (this.is_WHITESPACE()) {
            do {
              this.input();
            } while (this.is_WHITESPACE());
            this.unput(1);
            return null;
          }
          switch (ch) {
            case "]":
              if (this.attributeListDepth[this.attributeIndex] === 0) {
                delete this.attributeListDepth[this.attributeIndex];
                this.attributeIndex--;
                this.popState();
              } else {
                this.attributeListDepth[this.attributeIndex]--;
              }
              return "]";
            case "(":
            case ")":
            case ":":
            case "=":
            case ";":
            case "|":
            case "&":
            case "^":
            case "-":
            case "+":
            case "*":
            case "%":
            case "~":
            case "<":
            case ">":
            case "!":
            case ".":
            case "{":
            case "}":
            case "$":
              return this.consume_TOKEN();
            case "[":
              this.attributeListDepth[this.attributeIndex]++;
              return "[";
            case ",":
              return ",";
            case '"':
              return this.ST_DOUBLE_QUOTES();
            case "'":
              return this.T_CONSTANT_ENCAPSED_STRING();
            case "/":
              if (this._input[this.offset] === "/") {
                return this.T_COMMENT();
              } else if (this._input[this.offset] === "*") {
                this.input();
                return this.T_DOC_COMMENT();
              } else {
                return this.consume_TOKEN();
              }
          }
          if (this.is_LABEL_START() || ch === "\\") {
            while (this.offset < this.size) {
              const ch2 = this.input();
              if (!(this.is_LABEL() || ch2 === "\\")) {
                if (ch2) this.unput(1);
                break;
              }
            }
            return this.T_STRING();
          } else if (this.is_NUM()) {
            return this.consume_NUM();
          }
          throw new Error(
            `Bad terminal sequence "${ch}" at line ${this.yylineno} (offset ${this.offset})`
          );
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/comments.js
  var require_comments = __commonJS({
    "node_modules/php-parser/src/lexer/comments.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a single line comment
         */
        T_COMMENT() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (ch === "\n" || ch === "\r") {
              return this.tok.T_COMMENT;
            } else if (ch === "?" && !this.aspTagMode && this._input[this.offset] === ">") {
              this.unput(1);
              return this.tok.T_COMMENT;
            } else if (ch === "%" && this.aspTagMode && this._input[this.offset] === ">") {
              this.unput(1);
              return this.tok.T_COMMENT;
            }
          }
          return this.tok.T_COMMENT;
        },
        /*
         * Behaviour : https://github.com/php/php-src/blob/master/Zend/zend_language_scanner.l#L1927
         */
        T_DOC_COMMENT() {
          let ch = this.input();
          let token = this.tok.T_COMMENT;
          if (ch === "*") {
            ch = this.input();
            if (this.is_WHITESPACE()) {
              token = this.tok.T_DOC_COMMENT;
            }
            if (ch === "/") {
              return token;
            } else {
              this.unput(1);
            }
          }
          while (this.offset < this.size) {
            ch = this.input();
            if (ch === "*" && this._input[this.offset] === "/") {
              this.input();
              break;
            }
          }
          return token;
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/initial.js
  var require_initial = __commonJS({
    "node_modules/php-parser/src/lexer/initial.js"(exports, module) {
      "use strict";
      module.exports = {
        nextINITIAL() {
          if (this.conditionStack.length > 1 && this.conditionStack[this.conditionStack.length - 1] === "INITIAL") {
            this.popState();
          } else {
            this.begin("ST_IN_SCRIPTING");
          }
          return this;
        },
        matchINITIAL() {
          while (this.offset < this.size) {
            let ch = this.input();
            if (ch == "<") {
              ch = this.ahead(1);
              if (ch == "?") {
                if (this.tryMatch("?=")) {
                  this.unput(1).appendToken(this.tok.T_OPEN_TAG_WITH_ECHO, 3).nextINITIAL();
                  break;
                } else if (this.tryMatchCaseless("?php")) {
                  ch = this._input[this.offset + 4];
                  if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
                    this.unput(1).appendToken(this.tok.T_OPEN_TAG, 6).nextINITIAL();
                    break;
                  }
                }
                if (this.short_tags) {
                  this.unput(1).appendToken(this.tok.T_OPEN_TAG, 2).nextINITIAL();
                  break;
                }
              } else if (this.asp_tags && ch == "%") {
                if (this.tryMatch("%=")) {
                  this.aspTagMode = true;
                  this.unput(1).appendToken(this.tok.T_OPEN_TAG_WITH_ECHO, 3).nextINITIAL();
                  break;
                } else {
                  this.aspTagMode = true;
                  this.unput(1).appendToken(this.tok.T_OPEN_TAG, 2).nextINITIAL();
                  break;
                }
              }
            }
          }
          if (this.yytext.length > 0) {
            return this.tok.T_INLINE_HTML;
          } else {
            return false;
          }
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/numbers.js
  var require_numbers = __commonJS({
    "node_modules/php-parser/src/lexer/numbers.js"(exports, module) {
      "use strict";
      var MAX_LENGTH_OF_LONG = 10;
      var long_min_digits = "2147483648";
      if (true) {
        MAX_LENGTH_OF_LONG = 19;
        long_min_digits = "9223372036854775808";
      }
      module.exports = {
        consume_NUM() {
          let ch = this.yytext[0];
          let hasPoint = ch === ".";
          if (ch === "0") {
            ch = this.input();
            if (ch === "x" || ch === "X") {
              ch = this.input();
              if (ch !== "_" && this.is_HEX()) {
                return this.consume_HNUM();
              } else {
                this.unput(ch ? 2 : 1);
              }
            } else if (ch === "b" || ch === "B") {
              ch = this.input();
              if (ch !== "_" && ch === "0" || ch === "1") {
                return this.consume_BNUM();
              } else {
                this.unput(ch ? 2 : 1);
              }
            } else if (ch === "o" || ch === "O") {
              ch = this.input();
              if (ch !== "_" && this.is_OCTAL()) {
                return this.consume_ONUM();
              } else {
                this.unput(ch ? 2 : 1);
              }
            } else if (!this.is_NUM()) {
              if (ch) this.unput(1);
            }
          }
          while (this.offset < this.size) {
            const prev = ch;
            ch = this.input();
            if (ch === "_") {
              if (prev === "_") {
                this.unput(2);
                break;
              }
              if (prev === ".") {
                this.unput(1);
                break;
              }
              if (prev === "e" || prev === "E") {
                this.unput(2);
                break;
              }
            } else if (ch === ".") {
              if (hasPoint) {
                this.unput(1);
                break;
              }
              if (prev === "_") {
                this.unput(2);
                break;
              }
              hasPoint = true;
              continue;
            } else if (ch === "e" || ch === "E") {
              if (prev === "_") {
                this.unput(1);
                break;
              }
              let undo = 2;
              ch = this.input();
              if (ch === "+" || ch === "-") {
                undo = 3;
                ch = this.input();
              }
              if (this.is_NUM_START()) {
                this.consume_LNUM();
                return this.tok.T_DNUMBER;
              }
              this.unput(ch ? undo : undo - 1);
              break;
            }
            if (!this.is_NUM()) {
              if (ch) this.unput(1);
              break;
            }
          }
          if (hasPoint) {
            return this.tok.T_DNUMBER;
          } else if (this.yytext.length < MAX_LENGTH_OF_LONG - 1) {
            return this.tok.T_LNUMBER;
          } else {
            if (this.yytext.length < MAX_LENGTH_OF_LONG || this.yytext.length == MAX_LENGTH_OF_LONG && this.yytext < long_min_digits) {
              return this.tok.T_LNUMBER;
            }
            return this.tok.T_DNUMBER;
          }
        },
        // read hexa
        consume_HNUM() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (!this.is_HEX()) {
              if (ch) this.unput(1);
              break;
            }
          }
          return this.tok.T_LNUMBER;
        },
        // read a generic number
        consume_LNUM() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (!this.is_NUM()) {
              if (ch) this.unput(1);
              break;
            }
          }
          return this.tok.T_LNUMBER;
        },
        // read binary
        consume_BNUM() {
          let ch;
          while (this.offset < this.size) {
            ch = this.input();
            if (ch !== "0" && ch !== "1" && ch !== "_") {
              if (ch) this.unput(1);
              break;
            }
          }
          return this.tok.T_LNUMBER;
        },
        // read an octal number
        consume_ONUM() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (!this.is_OCTAL()) {
              if (ch) this.unput(1);
              break;
            }
          }
          return this.tok.T_LNUMBER;
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/property.js
  var require_property = __commonJS({
    "node_modules/php-parser/src/lexer/property.js"(exports, module) {
      "use strict";
      module.exports = {
        matchST_LOOKING_FOR_PROPERTY() {
          let ch = this.input();
          if (ch === "-") {
            ch = this.input();
            if (ch === ">") {
              return this.tok.T_OBJECT_OPERATOR;
            }
            if (ch) this.unput(1);
          } else if (this.is_WHITESPACE()) {
            return this.tok.T_WHITESPACE;
          } else if (this.is_LABEL_START()) {
            this.consume_LABEL();
            this.popState();
            return this.tok.T_STRING;
          }
          this.popState();
          if (ch) this.unput(1);
          return false;
        },
        matchST_LOOKING_FOR_VARNAME() {
          let ch = this.input();
          this.popState();
          this.begin("ST_IN_SCRIPTING");
          if (this.is_LABEL_START()) {
            this.consume_LABEL();
            ch = this.input();
            if (ch === "[" || ch === "}") {
              this.unput(1);
              return this.tok.T_STRING_VARNAME;
            } else {
              this.unput(this.yytext.length);
            }
          } else {
            if (ch) this.unput(1);
          }
          return false;
        },
        matchST_VAR_OFFSET() {
          const ch = this.input();
          if (this.is_NUM_START()) {
            this.consume_NUM();
            return this.tok.T_NUM_STRING;
          } else if (ch === "]") {
            this.popState();
            return "]";
          } else if (ch === "$") {
            this.input();
            if (this.is_LABEL_START()) {
              this.consume_LABEL();
              return this.tok.T_VARIABLE;
            } else {
              throw new Error("Unexpected terminal");
            }
          } else if (this.is_LABEL_START()) {
            this.consume_LABEL();
            return this.tok.T_STRING;
          } else if (this.is_WHITESPACE() || ch === "\\" || ch === "'" || ch === "#") {
            return this.tok.T_ENCAPSED_AND_WHITESPACE;
          } else if (ch === "[" || ch === "{" || ch === "}" || ch === '"' || ch === "`" || this.is_TOKEN()) {
            return ch;
          } else {
            throw new Error("Unexpected terminal");
          }
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/scripting.js
  var require_scripting = __commonJS({
    "node_modules/php-parser/src/lexer/scripting.js"(exports, module) {
      "use strict";
      module.exports = {
        matchST_IN_SCRIPTING() {
          let ch = this.input();
          switch (ch) {
            case " ":
            case "	":
            case "\n":
            case "\r":
            case "\r\n":
              return this.T_WHITESPACE();
            case "#":
              if (this.version >= 800 && this._input[this.offset] === "[") {
                this.input();
                this.attributeListDepth[++this.attributeIndex] = 0;
                this.begin("ST_ATTRIBUTE");
                return this.tok.T_ATTRIBUTE;
              }
              return this.T_COMMENT();
            case "/":
              if (this._input[this.offset] === "/") {
                return this.T_COMMENT();
              } else if (this._input[this.offset] === "*") {
                this.input();
                return this.T_DOC_COMMENT();
              }
              return this.consume_TOKEN();
            case "'":
              return this.T_CONSTANT_ENCAPSED_STRING();
            case '"':
              return this.ST_DOUBLE_QUOTES();
            case "`":
              this.begin("ST_BACKQUOTE");
              return "`";
            case "?":
              if (!this.aspTagMode && this.tryMatch(">")) {
                this.input();
                const nextCH = this._input[this.offset];
                if (nextCH === "\n" || nextCH === "\r") this.input();
                if (this.conditionStack.length > 1) {
                  this.begin("INITIAL");
                }
                return this.tok.T_CLOSE_TAG;
              }
              return this.consume_TOKEN();
            case "%":
              if (this.aspTagMode && this._input[this.offset] === ">") {
                this.input();
                ch = this._input[this.offset];
                if (ch === "\n" || ch === "\r") {
                  this.input();
                }
                this.aspTagMode = false;
                if (this.conditionStack.length > 1) {
                  this.begin("INITIAL");
                }
                return this.tok.T_CLOSE_TAG;
              }
              return this.consume_TOKEN();
            case "{":
              this.begin("ST_IN_SCRIPTING");
              return "{";
            case "}":
              if (this.conditionStack.length > 2) {
                this.popState();
              }
              return "}";
            default:
              if (ch === ".") {
                ch = this.input();
                if (this.is_NUM_START()) {
                  return this.consume_NUM();
                } else {
                  if (ch) this.unput(1);
                }
              }
              if (this.is_NUM_START()) {
                return this.consume_NUM();
              } else if (this.is_LABEL_START()) {
                return this.consume_LABEL().T_STRING();
              } else if (this.is_TOKEN()) {
                return this.consume_TOKEN();
              }
          }
          throw new Error(
            'Bad terminal sequence "' + ch + '" at line ' + this.yylineno + " (offset " + this.offset + ")"
          );
        },
        T_WHITESPACE() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
              continue;
            }
            if (ch) this.unput(1);
            break;
          }
          return this.tok.T_WHITESPACE;
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/strings.js
  var require_strings = __commonJS({
    "node_modules/php-parser/src/lexer/strings.js"(exports, module) {
      "use strict";
      var newline = ["\n", "\r"];
      var valid_after_heredoc = ["\n", "\r", ";"];
      var valid_after_heredoc_73 = valid_after_heredoc.concat([
        "	",
        " ",
        ",",
        "]",
        ")",
        "/",
        "=",
        "!",
        "."
      ]);
      module.exports = {
        T_CONSTANT_ENCAPSED_STRING() {
          let ch;
          while (this.offset < this.size) {
            ch = this.input();
            if (ch == "\\") {
              this.input();
            } else if (ch == "'") {
              break;
            }
          }
          return this.tok.T_CONSTANT_ENCAPSED_STRING;
        },
        // check if matching a HEREDOC state
        is_HEREDOC() {
          const revert = this.offset;
          if (this._input[this.offset - 1] === "<" && this._input[this.offset] === "<" && this._input[this.offset + 1] === "<") {
            this.offset += 3;
            if (this.is_TABSPACE()) {
              while (this.offset < this.size) {
                this.offset++;
                if (!this.is_TABSPACE()) {
                  break;
                }
              }
            }
            let tChar = this._input[this.offset - 1];
            if (tChar === "'" || tChar === '"') {
              this.offset++;
            } else {
              tChar = null;
            }
            if (this.is_LABEL_START()) {
              let yyoffset = this.offset - 1;
              while (this.offset < this.size) {
                this.offset++;
                if (!this.is_LABEL()) {
                  break;
                }
              }
              const yylabel = this._input.substring(yyoffset, this.offset - 1);
              if (!tChar || tChar === this._input[this.offset - 1]) {
                if (tChar) this.offset++;
                if (newline.includes(this._input[this.offset - 1])) {
                  this.heredoc_label.label = yylabel;
                  this.heredoc_label.length = yylabel.length;
                  this.heredoc_label.finished = false;
                  yyoffset = this.offset - revert;
                  this.offset = revert;
                  this.consume(yyoffset);
                  if (tChar === "'") {
                    this.begin("ST_NOWDOC");
                  } else {
                    this.begin("ST_HEREDOC");
                  }
                  this.prematch_ENDOFDOC();
                  return this.tok.T_START_HEREDOC;
                }
              }
            }
          }
          this.offset = revert;
          return false;
        },
        ST_DOUBLE_QUOTES() {
          let ch;
          while (this.offset < this.size) {
            ch = this.input();
            if (ch == "\\") {
              this.input();
            } else if (ch == '"') {
              break;
            } else if (ch == "$") {
              ch = this.input();
              if (ch == "{" || this.is_LABEL_START()) {
                this.unput(2);
                break;
              }
              if (ch) this.unput(1);
            } else if (ch == "{") {
              ch = this.input();
              if (ch == "$") {
                this.unput(2);
                break;
              }
              if (ch) this.unput(1);
            }
          }
          if (ch == '"') {
            return this.tok.T_CONSTANT_ENCAPSED_STRING;
          } else {
            let prefix = 1;
            if (this.yytext[0] === "b" || this.yytext[0] === "B") {
              prefix = 2;
            }
            if (this.yytext.length > 2) {
              this.appendToken(
                this.tok.T_ENCAPSED_AND_WHITESPACE,
                this.yytext.length - prefix
              );
            }
            this.unput(this.yytext.length - prefix);
            this.begin("ST_DOUBLE_QUOTES");
            return this.yytext;
          }
        },
        // check if its a DOC end sequence
        isDOC_MATCH(offset, consumeLeadingSpaces) {
          const prev_ch = this._input[offset - 2];
          if (!newline.includes(prev_ch)) {
            return false;
          }
          let indentation_uses_spaces = false;
          let indentation_uses_tabs = false;
          let indentation = 0;
          let leading_ch = this._input[offset - 1];
          if (this.version >= 703) {
            while (leading_ch === "	" || leading_ch === " ") {
              if (leading_ch === " ") {
                indentation_uses_spaces = true;
              } else if (leading_ch === "	") {
                indentation_uses_tabs = true;
              }
              leading_ch = this._input[offset + indentation];
              indentation++;
            }
            offset = offset + indentation;
            if (newline.includes(this._input[offset - 1])) {
              return false;
            }
          }
          if (this._input.substring(
            offset - 1,
            offset - 1 + this.heredoc_label.length
          ) === this.heredoc_label.label) {
            const ch = this._input[offset - 1 + this.heredoc_label.length];
            if ((this.version >= 703 ? valid_after_heredoc_73 : valid_after_heredoc).includes(ch)) {
              if (consumeLeadingSpaces) {
                this.consume(indentation);
                if (indentation_uses_spaces && indentation_uses_tabs) {
                  throw new Error(
                    "Parse error:  mixing spaces and tabs in ending marker at line " + this.yylineno + " (offset " + this.offset + ")"
                  );
                }
              } else {
                this.heredoc_label.indentation = indentation;
                this.heredoc_label.indentation_uses_spaces = indentation_uses_spaces;
                this.heredoc_label.first_encaps_node = true;
              }
              return true;
            }
          }
          return false;
        },
        /*
         * Prematch the end of HEREDOC/NOWDOC end tag to preset the
         * context of this.heredoc_label
         */
        prematch_ENDOFDOC() {
          this.heredoc_label.indentation_uses_spaces = false;
          this.heredoc_label.indentation = 0;
          this.heredoc_label.first_encaps_node = true;
          let offset = this.offset + 1;
          while (offset < this._input.length) {
            if (this.isDOC_MATCH(offset, false)) {
              return;
            }
            if (!newline.includes(this._input[offset - 1])) {
              while (!newline.includes(this._input[offset++]) && offset < this._input.length) {
              }
            }
            offset++;
          }
        },
        matchST_NOWDOC() {
          if (this.isDOC_MATCH(this.offset, true)) {
            this.consume(this.heredoc_label.length);
            this.popState();
            return this.tok.T_END_HEREDOC;
          }
          let ch = this._input[this.offset - 1];
          while (this.offset < this.size) {
            if (newline.includes(ch)) {
              ch = this.input();
              if (this.isDOC_MATCH(this.offset, true)) {
                this.unput(1).popState();
                this.appendToken(this.tok.T_END_HEREDOC, this.heredoc_label.length);
                return this.tok.T_ENCAPSED_AND_WHITESPACE;
              }
            } else {
              ch = this.input();
            }
          }
          return this.tok.T_ENCAPSED_AND_WHITESPACE;
        },
        matchST_HEREDOC() {
          let ch = this.input();
          if (this.isDOC_MATCH(this.offset, true)) {
            this.consume(this.heredoc_label.length - 1);
            this.popState();
            return this.tok.T_END_HEREDOC;
          }
          while (this.offset < this.size) {
            if (ch === "\\") {
              ch = this.input();
              if (!newline.includes(ch)) {
                ch = this.input();
              }
            }
            if (newline.includes(ch)) {
              ch = this.input();
              if (this.isDOC_MATCH(this.offset, true)) {
                this.unput(1).popState();
                this.appendToken(this.tok.T_END_HEREDOC, this.heredoc_label.length);
                return this.tok.T_ENCAPSED_AND_WHITESPACE;
              }
            } else if (ch === "$") {
              ch = this.input();
              if (ch === "{") {
                this.begin("ST_LOOKING_FOR_VARNAME");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_DOLLAR_OPEN_CURLY_BRACES, 2);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return this.tok.T_DOLLAR_OPEN_CURLY_BRACES;
                }
              } else if (this.is_LABEL_START()) {
                const yyoffset = this.offset;
                const next = this.consume_VARIABLE();
                if (this.yytext.length > this.offset - yyoffset + 2) {
                  this.appendToken(next, this.offset - yyoffset + 2);
                  this.unput(this.offset - yyoffset + 2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return next;
                }
              }
            } else if (ch === "{") {
              ch = this.input();
              if (ch === "$") {
                this.begin("ST_IN_SCRIPTING");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_CURLY_OPEN, 1);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  this.unput(1);
                  return this.tok.T_CURLY_OPEN;
                }
              }
            } else {
              ch = this.input();
            }
          }
          return this.tok.T_ENCAPSED_AND_WHITESPACE;
        },
        consume_VARIABLE() {
          this.consume_LABEL();
          const ch = this.input();
          if (ch == "[") {
            this.unput(1);
            this.begin("ST_VAR_OFFSET");
            return this.tok.T_VARIABLE;
          } else if (ch === "-") {
            if (this.input() === ">") {
              this.input();
              if (this.is_LABEL_START()) {
                this.begin("ST_LOOKING_FOR_PROPERTY");
              }
              this.unput(3);
              return this.tok.T_VARIABLE;
            } else {
              this.unput(2);
            }
          } else {
            if (ch) this.unput(1);
          }
          return this.tok.T_VARIABLE;
        },
        // HANDLES BACKQUOTES
        matchST_BACKQUOTE() {
          let ch = this.input();
          if (ch === "$") {
            ch = this.input();
            if (ch === "{") {
              this.begin("ST_LOOKING_FOR_VARNAME");
              return this.tok.T_DOLLAR_OPEN_CURLY_BRACES;
            } else if (this.is_LABEL_START()) {
              const tok = this.consume_VARIABLE();
              return tok;
            }
          } else if (ch === "{") {
            if (this._input[this.offset] === "$") {
              this.begin("ST_IN_SCRIPTING");
              return this.tok.T_CURLY_OPEN;
            }
          } else if (ch === "`") {
            this.popState();
            return "`";
          }
          while (this.offset < this.size) {
            if (ch === "\\") {
              this.input();
            } else if (ch === "`") {
              this.unput(1);
              this.popState();
              this.appendToken("`", 1);
              break;
            } else if (ch === "$") {
              ch = this.input();
              if (ch === "{") {
                this.begin("ST_LOOKING_FOR_VARNAME");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_DOLLAR_OPEN_CURLY_BRACES, 2);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return this.tok.T_DOLLAR_OPEN_CURLY_BRACES;
                }
              } else if (this.is_LABEL_START()) {
                const yyoffset = this.offset;
                const next = this.consume_VARIABLE();
                if (this.yytext.length > this.offset - yyoffset + 2) {
                  this.appendToken(next, this.offset - yyoffset + 2);
                  this.unput(this.offset - yyoffset + 2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return next;
                }
              }
              continue;
            } else if (ch === "{") {
              ch = this.input();
              if (ch === "$") {
                this.begin("ST_IN_SCRIPTING");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_CURLY_OPEN, 1);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  this.unput(1);
                  return this.tok.T_CURLY_OPEN;
                }
              }
              continue;
            }
            ch = this.input();
          }
          return this.tok.T_ENCAPSED_AND_WHITESPACE;
        },
        matchST_DOUBLE_QUOTES() {
          let ch = this.input();
          if (ch === "$") {
            ch = this.input();
            if (ch === "{") {
              this.begin("ST_LOOKING_FOR_VARNAME");
              return this.tok.T_DOLLAR_OPEN_CURLY_BRACES;
            } else if (this.is_LABEL_START()) {
              const tok = this.consume_VARIABLE();
              return tok;
            }
          } else if (ch === "{") {
            if (this._input[this.offset] === "$") {
              this.begin("ST_IN_SCRIPTING");
              return this.tok.T_CURLY_OPEN;
            }
          } else if (ch === '"') {
            this.popState();
            return '"';
          }
          while (this.offset < this.size) {
            if (ch === "\\") {
              this.input();
            } else if (ch === '"') {
              this.unput(1);
              this.popState();
              this.appendToken('"', 1);
              break;
            } else if (ch === "$") {
              ch = this.input();
              if (ch === "{") {
                this.begin("ST_LOOKING_FOR_VARNAME");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_DOLLAR_OPEN_CURLY_BRACES, 2);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return this.tok.T_DOLLAR_OPEN_CURLY_BRACES;
                }
              } else if (this.is_LABEL_START()) {
                const yyoffset = this.offset;
                const next = this.consume_VARIABLE();
                if (this.yytext.length > this.offset - yyoffset + 2) {
                  this.appendToken(next, this.offset - yyoffset + 2);
                  this.unput(this.offset - yyoffset + 2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  return next;
                }
              }
              if (ch) this.unput(1);
            } else if (ch === "{") {
              ch = this.input();
              if (ch === "$") {
                this.begin("ST_IN_SCRIPTING");
                if (this.yytext.length > 2) {
                  this.appendToken(this.tok.T_CURLY_OPEN, 1);
                  this.unput(2);
                  return this.tok.T_ENCAPSED_AND_WHITESPACE;
                } else {
                  this.unput(1);
                  return this.tok.T_CURLY_OPEN;
                }
              }
              if (ch) this.unput(1);
            }
            ch = this.input();
          }
          return this.tok.T_ENCAPSED_AND_WHITESPACE;
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/tokens.js
  var require_tokens = __commonJS({
    "node_modules/php-parser/src/lexer/tokens.js"(exports, module) {
      "use strict";
      module.exports = {
        T_STRING() {
          const token = this.yytext.toLowerCase();
          let id = this.keywords[token];
          if (typeof id !== "number") {
            if (token === "yield") {
              if (this.version >= 700 && this.tryMatch(" from")) {
                this.consume(5);
                id = this.tok.T_YIELD_FROM;
              } else {
                id = this.tok.T_YIELD;
              }
            } else {
              id = this.tok.T_STRING;
              if (token === "b" || token === "B") {
                const ch = this.input();
                if (ch === '"') {
                  return this.ST_DOUBLE_QUOTES();
                } else if (ch === "'") {
                  return this.T_CONSTANT_ENCAPSED_STRING();
                } else if (ch) {
                  this.unput(1);
                }
              }
            }
          }
          if (id === this.tok.T_ENUM) {
            if (this.version < 801) {
              return this.tok.T_STRING;
            }
            const initial = this.offset;
            let ch = this.input();
            while (ch == " ") {
              ch = this.input();
            }
            let isEnum = false;
            if (this.is_LABEL_START()) {
              while (this.is_LABEL()) {
                ch += this.input();
              }
              const label = ch.slice(0, -1).toLowerCase();
              isEnum = label !== "extends" && label !== "implements";
            }
            this.unput(this.offset - initial);
            return isEnum ? this.tok.T_ENUM : this.tok.T_STRING;
          }
          if (this.offset < this.size && id !== this.tok.T_YIELD_FROM) {
            let ch = this.input();
            if (ch === "\\") {
              id = token === "namespace" ? this.tok.T_NAME_RELATIVE : this.tok.T_NAME_QUALIFIED;
              do {
                if (this._input[this.offset] === "{") {
                  this.input();
                  break;
                }
                this.consume_LABEL();
                ch = this.input();
              } while (ch === "\\");
            }
            if (ch) {
              this.unput(1);
            }
          }
          return id;
        },
        // reads a custom token
        consume_TOKEN() {
          const ch = this._input[this.offset - 1];
          const fn = this.tokenTerminals[ch];
          if (fn) {
            return fn.apply(this, []);
          } else {
            return this.yytext;
          }
        },
        // list of special char tokens
        tokenTerminals: {
          $() {
            this.offset++;
            if (this.is_LABEL_START()) {
              this.offset--;
              this.consume_LABEL();
              return this.tok.T_VARIABLE;
            } else {
              this.offset--;
              return "$";
            }
          },
          "-"() {
            const nchar = this._input[this.offset];
            if (nchar === ">") {
              this.begin("ST_LOOKING_FOR_PROPERTY").input();
              return this.tok.T_OBJECT_OPERATOR;
            } else if (nchar === "-") {
              this.input();
              return this.tok.T_DEC;
            } else if (nchar === "=") {
              this.input();
              return this.tok.T_MINUS_EQUAL;
            }
            return "-";
          },
          "\\"() {
            if (this.offset < this.size) {
              this.input();
              if (this.is_LABEL_START()) {
                let ch;
                do {
                  if (this._input[this.offset] === "{") {
                    this.input();
                    break;
                  }
                  this.consume_LABEL();
                  ch = this.input();
                } while (ch === "\\");
                this.unput(1);
                return this.tok.T_NAME_FULLY_QUALIFIED;
              } else {
                this.unput(1);
              }
            }
            return this.tok.T_NS_SEPARATOR;
          },
          "/"() {
            if (this._input[this.offset] === "=") {
              this.input();
              return this.tok.T_DIV_EQUAL;
            }
            return "/";
          },
          ":"() {
            if (this._input[this.offset] === ":") {
              this.input();
              return this.tok.T_DOUBLE_COLON;
            } else {
              return ":";
            }
          },
          "("() {
            const initial = this.offset;
            this.input();
            if (this.is_TABSPACE()) {
              this.consume_TABSPACE().input();
            }
            if (this.is_LABEL_START()) {
              const yylen = this.yytext.length;
              this.consume_LABEL();
              const castToken = this.yytext.substring(yylen - 1).toLowerCase();
              const castId = this.castKeywords[castToken];
              if (typeof castId === "number") {
                this.input();
                if (this.is_TABSPACE()) {
                  this.consume_TABSPACE().input();
                }
                if (this._input[this.offset - 1] === ")") {
                  return castId;
                }
              }
            }
            this.unput(this.offset - initial);
            return "(";
          },
          "="() {
            const nchar = this._input[this.offset];
            if (nchar === ">") {
              this.input();
              return this.tok.T_DOUBLE_ARROW;
            } else if (nchar === "=") {
              if (this._input[this.offset + 1] === "=") {
                this.consume(2);
                return this.tok.T_IS_IDENTICAL;
              } else {
                this.input();
                return this.tok.T_IS_EQUAL;
              }
            }
            return "=";
          },
          "+"() {
            const nchar = this._input[this.offset];
            if (nchar === "+") {
              this.input();
              return this.tok.T_INC;
            } else if (nchar === "=") {
              this.input();
              return this.tok.T_PLUS_EQUAL;
            }
            return "+";
          },
          "!"() {
            if (this._input[this.offset] === "=") {
              if (this._input[this.offset + 1] === "=") {
                this.consume(2);
                return this.tok.T_IS_NOT_IDENTICAL;
              } else {
                this.input();
                return this.tok.T_IS_NOT_EQUAL;
              }
            }
            return "!";
          },
          "?"() {
            if (this.version >= 700 && this._input[this.offset] === "?") {
              if (this.version >= 704 && this._input[this.offset + 1] === "=") {
                this.consume(2);
                return this.tok.T_COALESCE_EQUAL;
              } else {
                this.input();
                return this.tok.T_COALESCE;
              }
            }
            if (this.version >= 800 && this._input[this.offset] === "-" && this._input[this.offset + 1] === ">") {
              this.consume(1);
              this.begin("ST_LOOKING_FOR_PROPERTY").input();
              return this.tok.T_NULLSAFE_OBJECT_OPERATOR;
            }
            return "?";
          },
          "<"() {
            let nchar = this._input[this.offset];
            if (nchar === "<") {
              nchar = this._input[this.offset + 1];
              if (nchar === "=") {
                this.consume(2);
                return this.tok.T_SL_EQUAL;
              } else if (nchar === "<") {
                if (this.is_HEREDOC()) {
                  return this.tok.T_START_HEREDOC;
                }
              }
              this.input();
              return this.tok.T_SL;
            } else if (nchar === "=") {
              this.input();
              if (this.version >= 700 && this._input[this.offset] === ">") {
                this.input();
                return this.tok.T_SPACESHIP;
              } else {
                return this.tok.T_IS_SMALLER_OR_EQUAL;
              }
            } else if (nchar === ">") {
              this.input();
              return this.tok.T_IS_NOT_EQUAL;
            }
            return "<";
          },
          ">"() {
            let nchar = this._input[this.offset];
            if (nchar === "=") {
              this.input();
              return this.tok.T_IS_GREATER_OR_EQUAL;
            } else if (nchar === ">") {
              nchar = this._input[this.offset + 1];
              if (nchar === "=") {
                this.consume(2);
                return this.tok.T_SR_EQUAL;
              } else {
                this.input();
                return this.tok.T_SR;
              }
            }
            return ">";
          },
          "*"() {
            const nchar = this._input[this.offset];
            if (nchar === "=") {
              this.input();
              return this.tok.T_MUL_EQUAL;
            } else if (nchar === "*") {
              this.input();
              if (this._input[this.offset] === "=") {
                this.input();
                return this.tok.T_POW_EQUAL;
              } else {
                return this.tok.T_POW;
              }
            }
            return "*";
          },
          "."() {
            const nchar = this._input[this.offset];
            if (nchar === "=") {
              this.input();
              return this.tok.T_CONCAT_EQUAL;
            } else if (nchar === "." && this._input[this.offset + 1] === ".") {
              this.consume(2);
              return this.tok.T_ELLIPSIS;
            }
            return ".";
          },
          "%"() {
            if (this._input[this.offset] === "=") {
              this.input();
              return this.tok.T_MOD_EQUAL;
            }
            return "%";
          },
          "&"() {
            const nchar = this._input[this.offset];
            if (nchar === "=") {
              this.input();
              return this.tok.T_AND_EQUAL;
            } else if (nchar === "&") {
              this.input();
              return this.tok.T_BOOLEAN_AND;
            }
            return "&";
          },
          "|"() {
            const nchar = this._input[this.offset];
            if (nchar === "=") {
              this.input();
              return this.tok.T_OR_EQUAL;
            } else if (nchar === "|") {
              this.input();
              return this.tok.T_BOOLEAN_OR;
            } else if (nchar === ">") {
              this.input();
              return this.tok.T_PIPE;
            }
            return "|";
          },
          "^"() {
            if (this._input[this.offset] === "=") {
              this.input();
              return this.tok.T_XOR_EQUAL;
            }
            return "^";
          }
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer/utils.js
  var require_utils = __commonJS({
    "node_modules/php-parser/src/lexer/utils.js"(exports, module) {
      "use strict";
      var tokens = ";:,.\\[]()|^&+-/*=%!~$<>?@";
      module.exports = {
        // check if the char can be a numeric
        is_NUM() {
          const ch = this._input.charCodeAt(this.offset - 1);
          return ch > 47 && ch < 58 || ch === 95;
        },
        // check if the char can be a numeric
        is_NUM_START() {
          const ch = this._input.charCodeAt(this.offset - 1);
          return ch > 47 && ch < 58;
        },
        // check if current char can be a label
        is_LABEL() {
          const ch = this._input.charCodeAt(this.offset - 1);
          return ch > 96 && ch < 123 || ch > 64 && ch < 91 || ch === 95 || ch > 47 && ch < 58 || ch > 126;
        },
        // check if current char can be a label
        is_LABEL_START() {
          const ch = this._input.charCodeAt(this.offset - 1);
          if (ch > 64 && ch < 91) return true;
          if (ch > 96 && ch < 123) return true;
          if (ch === 95) return true;
          if (ch > 126) return true;
          return false;
        },
        // reads each char of the label
        consume_LABEL() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (!this.is_LABEL()) {
              if (ch) this.unput(1);
              break;
            }
          }
          return this;
        },
        // check if current char is a token char
        is_TOKEN() {
          const ch = this._input[this.offset - 1];
          return tokens.indexOf(ch) !== -1;
        },
        // check if current char is a whitespace
        is_WHITESPACE() {
          const ch = this._input[this.offset - 1];
          return ch === " " || ch === "	" || ch === "\n" || ch === "\r";
        },
        // check if current char is a whitespace (without newlines)
        is_TABSPACE() {
          const ch = this._input[this.offset - 1];
          return ch === " " || ch === "	";
        },
        // consume all whitespaces (excluding newlines)
        consume_TABSPACE() {
          while (this.offset < this.size) {
            const ch = this.input();
            if (!this.is_TABSPACE()) {
              if (ch) this.unput(1);
              break;
            }
          }
          return this;
        },
        // check if current char can be a hexadecimal number
        is_HEX() {
          const ch = this._input.charCodeAt(this.offset - 1);
          if (ch > 47 && ch < 58) return true;
          if (ch > 64 && ch < 71) return true;
          if (ch > 96 && ch < 103) return true;
          if (ch === 95) return true;
          return false;
        },
        // check if current char can be an octal number
        is_OCTAL() {
          const ch = this._input.charCodeAt(this.offset - 1);
          if (ch > 47 && ch < 56) return true;
          if (ch === 95) return true;
          return false;
        }
      };
    }
  });

  // node_modules/php-parser/src/lexer.js
  var require_lexer = __commonJS({
    "node_modules/php-parser/src/lexer.js"(exports, module) {
      "use strict";
      var Lexer = function(engine) {
        this.engine = engine;
        this.tok = this.engine.tokens.names;
        this.EOF = 1;
        this.debug = false;
        this.all_tokens = true;
        this.comment_tokens = false;
        this.mode_eval = false;
        this.asp_tags = false;
        this.short_tags = false;
        this.version = 803;
        this.yyprevcol = 0;
        this.keywords = {
          __class__: this.tok.T_CLASS_C,
          __trait__: this.tok.T_TRAIT_C,
          __function__: this.tok.T_FUNC_C,
          __method__: this.tok.T_METHOD_C,
          __line__: this.tok.T_LINE,
          __file__: this.tok.T_FILE,
          __dir__: this.tok.T_DIR,
          __namespace__: this.tok.T_NS_C,
          exit: this.tok.T_EXIT,
          die: this.tok.T_EXIT,
          function: this.tok.T_FUNCTION,
          const: this.tok.T_CONST,
          return: this.tok.T_RETURN,
          try: this.tok.T_TRY,
          catch: this.tok.T_CATCH,
          finally: this.tok.T_FINALLY,
          throw: this.tok.T_THROW,
          if: this.tok.T_IF,
          elseif: this.tok.T_ELSEIF,
          endif: this.tok.T_ENDIF,
          else: this.tok.T_ELSE,
          while: this.tok.T_WHILE,
          endwhile: this.tok.T_ENDWHILE,
          do: this.tok.T_DO,
          for: this.tok.T_FOR,
          endfor: this.tok.T_ENDFOR,
          foreach: this.tok.T_FOREACH,
          endforeach: this.tok.T_ENDFOREACH,
          declare: this.tok.T_DECLARE,
          enddeclare: this.tok.T_ENDDECLARE,
          instanceof: this.tok.T_INSTANCEOF,
          as: this.tok.T_AS,
          switch: this.tok.T_SWITCH,
          endswitch: this.tok.T_ENDSWITCH,
          case: this.tok.T_CASE,
          default: this.tok.T_DEFAULT,
          break: this.tok.T_BREAK,
          continue: this.tok.T_CONTINUE,
          goto: this.tok.T_GOTO,
          echo: this.tok.T_ECHO,
          print: this.tok.T_PRINT,
          class: this.tok.T_CLASS,
          interface: this.tok.T_INTERFACE,
          trait: this.tok.T_TRAIT,
          enum: this.tok.T_ENUM,
          extends: this.tok.T_EXTENDS,
          implements: this.tok.T_IMPLEMENTS,
          new: this.tok.T_NEW,
          clone: this.tok.T_CLONE,
          var: this.tok.T_VAR,
          eval: this.tok.T_EVAL,
          include: this.tok.T_INCLUDE,
          include_once: this.tok.T_INCLUDE_ONCE,
          require: this.tok.T_REQUIRE,
          require_once: this.tok.T_REQUIRE_ONCE,
          namespace: this.tok.T_NAMESPACE,
          use: this.tok.T_USE,
          insteadof: this.tok.T_INSTEADOF,
          global: this.tok.T_GLOBAL,
          isset: this.tok.T_ISSET,
          empty: this.tok.T_EMPTY,
          __halt_compiler: this.tok.T_HALT_COMPILER,
          static: this.tok.T_STATIC,
          abstract: this.tok.T_ABSTRACT,
          final: this.tok.T_FINAL,
          private: this.tok.T_PRIVATE,
          protected: this.tok.T_PROTECTED,
          public: this.tok.T_PUBLIC,
          unset: this.tok.T_UNSET,
          list: this.tok.T_LIST,
          array: this.tok.T_ARRAY,
          callable: this.tok.T_CALLABLE,
          or: this.tok.T_LOGICAL_OR,
          and: this.tok.T_LOGICAL_AND,
          xor: this.tok.T_LOGICAL_XOR,
          match: this.tok.T_MATCH,
          readonly: this.tok.T_READ_ONLY
        };
        this.castKeywords = {
          int: this.tok.T_INT_CAST,
          integer: this.tok.T_INT_CAST,
          real: this.tok.T_DOUBLE_CAST,
          double: this.tok.T_DOUBLE_CAST,
          float: this.tok.T_DOUBLE_CAST,
          string: this.tok.T_STRING_CAST,
          binary: this.tok.T_STRING_CAST,
          array: this.tok.T_ARRAY_CAST,
          object: this.tok.T_OBJECT_CAST,
          bool: this.tok.T_BOOL_CAST,
          boolean: this.tok.T_BOOL_CAST,
          unset: this.tok.T_UNSET_CAST
        };
      };
      Lexer.prototype.setInput = function(input) {
        this._input = input;
        this.size = input.length;
        this.yylineno = 1;
        this.offset = 0;
        this.yyprevcol = 0;
        this.yytext = "";
        this.yylloc = {
          first_offset: 0,
          first_line: 1,
          first_column: 0,
          prev_offset: 0,
          prev_line: 1,
          prev_column: 0,
          last_line: 1,
          last_column: 0
        };
        this.tokens = [];
        if (this.version > 703) {
          this.keywords.fn = this.tok.T_FN;
        } else {
          delete this.keywords.fn;
        }
        this.done = this.offset >= this.size;
        if (!this.all_tokens && this.mode_eval) {
          this.conditionStack = ["INITIAL"];
          this.begin("ST_IN_SCRIPTING");
        } else {
          this.conditionStack = [];
          this.begin("INITIAL");
        }
        this.heredoc_label = {
          label: "",
          length: 0,
          indentation: 0,
          indentation_uses_spaces: false,
          finished: false,
          /*
           * this used for parser to detemine the if current node segment is first encaps node.
           * if ture, the indentation will remove from the begining. and if false, the prev node
           * might be a variable '}' ,and the leading spaces should not be removed util meet the
           * first \n
           */
          first_encaps_node: false,
          // for backward compatible
          /* istanbul ignore next */
          toString() {
            this.label;
          }
        };
        return this;
      };
      Lexer.prototype.input = function() {
        const ch = this._input[this.offset];
        if (!ch) return "";
        this.yytext += ch;
        this.offset++;
        if (ch === "\r" && this._input[this.offset] === "\n") {
          this.yytext += "\n";
          this.offset++;
        }
        if (ch === "\n" || ch === "\r") {
          this.yylloc.last_line = ++this.yylineno;
          this.yyprevcol = this.yylloc.last_column;
          this.yylloc.last_column = 0;
        } else {
          this.yylloc.last_column++;
        }
        return ch;
      };
      Lexer.prototype.unput = function(size) {
        if (size === 1) {
          this.offset--;
          if (this._input[this.offset] === "\n" && this._input[this.offset - 1] === "\r") {
            this.offset--;
            size++;
          }
          if (this._input[this.offset] === "\r" || this._input[this.offset] === "\n") {
            this.yylloc.last_line--;
            this.yylineno--;
            this.yylloc.last_column = this.yyprevcol;
          } else {
            this.yylloc.last_column--;
          }
          this.yytext = this.yytext.substring(0, this.yytext.length - size);
        } else if (size > 0) {
          this.offset -= size;
          if (size < this.yytext.length) {
            this.yytext = this.yytext.substring(0, this.yytext.length - size);
            this.yylloc.last_line = this.yylloc.first_line;
            this.yylloc.last_column = this.yyprevcol = this.yylloc.first_column;
            for (let i = 0; i < this.yytext.length; i++) {
              let c = this.yytext[i];
              if (c === "\r") {
                c = this.yytext[++i];
                this.yyprevcol = this.yylloc.last_column;
                this.yylloc.last_line++;
                this.yylloc.last_column = 0;
                if (c !== "\n") {
                  if (c === "\r") {
                    this.yylloc.last_line++;
                  } else {
                    this.yylloc.last_column++;
                  }
                }
              } else if (c === "\n") {
                this.yyprevcol = this.yylloc.last_column;
                this.yylloc.last_line++;
                this.yylloc.last_column = 0;
              } else {
                this.yylloc.last_column++;
              }
            }
            this.yylineno = this.yylloc.last_line;
          } else {
            this.yytext = "";
            this.yylloc.last_line = this.yylineno = this.yylloc.first_line;
            this.yylloc.last_column = this.yylloc.first_column;
          }
        }
        return this;
      };
      Lexer.prototype.tryMatch = function(text) {
        return text === this.ahead(text.length);
      };
      Lexer.prototype.tryMatchCaseless = function(text) {
        return text === this.ahead(text.length).toLowerCase();
      };
      Lexer.prototype.ahead = function(size) {
        let text = this._input.substring(this.offset, this.offset + size);
        if (text[text.length - 1] === "\r" && this._input[this.offset + size + 1] === "\n") {
          text += "\n";
        }
        return text;
      };
      Lexer.prototype.consume = function(size) {
        for (let i = 0; i < size; i++) {
          const ch = this._input[this.offset];
          if (!ch) break;
          this.yytext += ch;
          this.offset++;
          if (ch === "\r" && this._input[this.offset] === "\n") {
            this.yytext += "\n";
            this.offset++;
            i++;
          }
          if (ch === "\n" || ch === "\r") {
            this.yylloc.last_line = ++this.yylineno;
            this.yyprevcol = this.yylloc.last_column;
            this.yylloc.last_column = 0;
          } else {
            this.yylloc.last_column++;
          }
        }
        return this;
      };
      Lexer.prototype.getState = function() {
        return {
          yytext: this.yytext,
          offset: this.offset,
          yylineno: this.yylineno,
          yyprevcol: this.yyprevcol,
          yylloc: {
            first_offset: this.yylloc.first_offset,
            first_line: this.yylloc.first_line,
            first_column: this.yylloc.first_column,
            last_line: this.yylloc.last_line,
            last_column: this.yylloc.last_column
          },
          heredoc_label: this.heredoc_label
        };
      };
      Lexer.prototype.setState = function(state) {
        this.yytext = state.yytext;
        this.offset = state.offset;
        this.yylineno = state.yylineno;
        this.yyprevcol = state.yyprevcol;
        this.yylloc = state.yylloc;
        if (state.heredoc_label) {
          this.heredoc_label = state.heredoc_label;
        }
        return this;
      };
      Lexer.prototype.appendToken = function(value, ahead) {
        this.tokens.push([value, ahead]);
        return this;
      };
      Lexer.prototype.lex = function() {
        this.yylloc.prev_offset = this.offset;
        this.yylloc.prev_line = this.yylloc.last_line;
        this.yylloc.prev_column = this.yylloc.last_column;
        let token = this.next() || this.lex();
        if (!this.all_tokens) {
          while (token === this.tok.T_WHITESPACE || // ignore white space
          !this.comment_tokens && (token === this.tok.T_COMMENT || // ignore single lines comments
          token === this.tok.T_DOC_COMMENT) || // ignore doc comments
          // ignore open tags
          token === this.tok.T_OPEN_TAG) {
            token = this.next() || this.lex();
          }
          if (token == this.tok.T_OPEN_TAG_WITH_ECHO) {
            return this.tok.T_ECHO;
          } else if (token === this.tok.T_CLOSE_TAG) {
            return ";";
          }
        }
        if (!this.yylloc.prev_offset) {
          this.yylloc.prev_offset = this.yylloc.first_offset;
          this.yylloc.prev_line = this.yylloc.first_line;
          this.yylloc.prev_column = this.yylloc.first_column;
        }
        return token;
      };
      Lexer.prototype.begin = function(condition) {
        this.conditionStack.push(condition);
        this.curCondition = condition;
        this.stateCb = this["match" + condition];
        if (typeof this.stateCb !== "function") {
          throw new Error('Undefined condition state "' + condition + '"');
        }
        return this;
      };
      Lexer.prototype.popState = function() {
        const n = this.conditionStack.length - 1;
        const condition = n > 0 ? this.conditionStack.pop() : this.conditionStack[0];
        this.curCondition = this.conditionStack[this.conditionStack.length - 1];
        this.stateCb = this["match" + this.curCondition];
        if (typeof this.stateCb !== "function") {
          throw new Error('Undefined condition state "' + this.curCondition + '"');
        }
        return condition;
      };
      Lexer.prototype.next = function() {
        let token;
        if (!this._input) {
          this.done = true;
        }
        this.yylloc.first_offset = this.offset;
        this.yylloc.first_line = this.yylloc.last_line;
        this.yylloc.first_column = this.yylloc.last_column;
        this.yytext = "";
        if (this.done) {
          this.yylloc.prev_offset = this.yylloc.first_offset;
          this.yylloc.prev_line = this.yylloc.first_line;
          this.yylloc.prev_column = this.yylloc.first_column;
          return this.EOF;
        }
        if (this.tokens.length > 0) {
          token = this.tokens.shift();
          if (typeof token[1] === "object") {
            this.setState(token[1]);
          } else {
            this.consume(token[1]);
          }
          token = token[0];
        } else {
          token = this.stateCb.apply(this, []);
        }
        if (this.offset >= this.size && this.tokens.length === 0) {
          this.done = true;
        }
        if (this.debug) {
          let tName = token;
          if (typeof tName === "number") {
            tName = this.engine.tokens.values[tName];
          } else {
            tName = '"' + tName + '"';
          }
          const e = new Error(
            tName + "	from " + this.yylloc.first_line + "," + this.yylloc.first_column + "	 - to " + this.yylloc.last_line + "," + this.yylloc.last_column + '	"' + this.yytext + '"'
          );
          console.error(e.stack);
        }
        return token;
      };
      [
        require_attribute(),
        require_comments(),
        require_initial(),
        require_numbers(),
        require_property(),
        require_scripting(),
        require_strings(),
        require_tokens(),
        require_utils()
      ].forEach(function(ext) {
        for (const k in ext) {
          Lexer.prototype[k] = ext[k];
        }
      });
      module.exports = Lexer;
    }
  });

  // node_modules/php-parser/src/ast/position.js
  var require_position = __commonJS({
    "node_modules/php-parser/src/ast/position.js"(exports, module) {
      "use strict";
      var Position = function(line, column, offset) {
        this.line = line;
        this.column = column;
        this.offset = offset;
      };
      module.exports = Position;
    }
  });

  // node_modules/php-parser/src/parser/array.js
  var require_array = __commonJS({
    "node_modules/php-parser/src/parser/array.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Parse an array
         * ```ebnf
         * array ::= T_ARRAY '(' array_pair_list ')' |
         *   '[' array_pair_list ']'
         * ```
         */
        read_array() {
          let expect;
          let shortForm = false;
          const result = this.node("array");
          if (this.token === this.tok.T_ARRAY) {
            this.next().expect("(");
            expect = ")";
          } else {
            shortForm = true;
            expect = "]";
          }
          let items = [];
          if (this.next().token !== expect) {
            items = this.read_array_pair_list(shortForm);
          }
          this.expect(expect);
          this.next();
          return result(shortForm, items);
        },
        /*
         * Reads an array of items
         * ```ebnf
         * array_pair_list ::= array_pair (',' array_pair?)*
         * ```
         */
        read_array_pair_list(shortForm) {
          const self = this;
          return this.read_list(
            function() {
              return self.read_array_pair(shortForm);
            },
            ",",
            true
          );
        },
        /*
         * Reads an entry
         * array_pair:
         *  expr T_DOUBLE_ARROW expr
         *  | expr
         *  | expr T_DOUBLE_ARROW '&' variable
         *  | '&' variable
         *  | expr T_DOUBLE_ARROW T_LIST '(' array_pair_list ')'
         *  | T_LIST '(' array_pair_list ')'
         */
        read_array_pair(shortForm) {
          if (!shortForm && this.token === ")" || shortForm && this.token === "]") {
            return;
          }
          if (this.token === ",") {
            return this.node("noop")();
          }
          const entry = this.node("entry");
          let key = null;
          let value;
          let byRef = false;
          let unpack = false;
          if (this.token === "&") {
            this.next();
            byRef = true;
            value = this.read_variable(true, false);
          } else if (this.token === this.tok.T_ELLIPSIS && this.version >= 704) {
            this.next();
            if (this.token === "&") {
              this.error();
            }
            unpack = true;
            value = this.read_expr();
          } else {
            const expr2 = this.read_expr();
            if (this.token === this.tok.T_DOUBLE_ARROW) {
              this.next();
              key = expr2;
              if (this.token === "&") {
                this.next();
                byRef = true;
                value = this.read_variable(true, false);
              } else {
                value = this.read_expr();
              }
            } else {
              value = expr2;
            }
          }
          return entry(key, value, byRef, unpack);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/class.js
  var require_class = __commonJS({
    "node_modules/php-parser/src/parser/class.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * reading a class
         * ```ebnf
         * class ::= class_scope? T_CLASS T_STRING (T_EXTENDS NAMESPACE_NAME)? (T_IMPLEMENTS (NAMESPACE_NAME ',')* NAMESPACE_NAME)? '{' CLASS_BODY '}'
         * ```
         */
        read_class_declaration_statement(attrs) {
          const result = this.node("class");
          const flag = this.read_class_modifiers();
          if (this.token !== this.tok.T_CLASS) {
            this.error(this.tok.T_CLASS);
            this.next();
            return null;
          }
          this.next().expect(this.tok.T_STRING);
          let propName = this.node("identifier");
          const name = this.text();
          this.next();
          propName = propName(name);
          const propExtends = this.read_extends_from();
          const propImplements = this.read_implements_list();
          this.expect("{");
          const body = this.next().read_class_body(true, false);
          const node = result(propName, propExtends, propImplements, body, flag);
          if (attrs) node.attrGroups = attrs;
          return node;
        },
        read_class_modifiers() {
          const modifier = this.read_class_modifier({
            readonly: 0,
            final_or_abstract: 0
          });
          return [0, 0, modifier.final_or_abstract, modifier.readonly];
        },
        read_class_modifier(memo) {
          if (this.token === this.tok.T_READ_ONLY) {
            this.next();
            memo.readonly = 1;
            memo = this.read_class_modifier(memo);
          } else if (memo.final_or_abstract === 0 && this.token === this.tok.T_ABSTRACT) {
            this.next();
            memo.final_or_abstract = 1;
            memo = this.read_class_modifier(memo);
          } else if (memo.final_or_abstract === 0 && this.token === this.tok.T_FINAL) {
            this.next();
            memo.final_or_abstract = 2;
            memo = this.read_class_modifier(memo);
          }
          return memo;
        },
        /*
         * Reads a class body
         * ```ebnf
         *   class_body ::= (member_flags? (T_VAR | T_STRING | T_FUNCTION))*
         * ```
         */
        read_class_body(allow_variables, allow_enum_cases) {
          let result = [];
          let attrs = [];
          while (this.token !== this.EOF && this.token !== "}") {
            if (this.token === this.tok.T_COMMENT) {
              result.push(this.read_comment());
              continue;
            }
            if (this.token === this.tok.T_DOC_COMMENT) {
              result.push(this.read_doc_comment());
              continue;
            }
            if (this.token === this.tok.T_USE) {
              result = result.concat(this.read_trait_use_statement());
              continue;
            }
            const locStart = this.position();
            if (this.token === this.tok.T_ATTRIBUTE) {
              attrs = this.read_attr_list();
            }
            if (allow_enum_cases && this.token === this.tok.T_CASE) {
              const enumcase = this.read_enum_case(attrs);
              attrs = [];
              if (this.expect(";")) {
                this.next();
              }
              result = result.concat(enumcase);
              continue;
            }
            const flags = this.read_member_flags(false);
            if (this.token === this.tok.T_CONST) {
              if (flags[0][1] !== -1) {
                this.raiseError("Cannot use asymmetric visibility on constants");
              }
              const constants = this.read_constant_list(flags, attrs, locStart);
              if (this.expect(";")) {
                this.next();
              }
              result = result.concat(constants);
              continue;
            }
            if (allow_variables && this.token === this.tok.T_VAR) {
              this.next().expect(this.tok.T_VARIABLE);
              flags[0][0] = null;
              flags[1] = 0;
            }
            if (this.token === this.tok.T_FUNCTION) {
              result.push(this.read_function(false, flags, attrs, locStart));
              attrs = [];
            } else if (allow_variables && (this.token === this.tok.T_VARIABLE || this.version >= 801 && this.token === this.tok.T_READ_ONLY || // support https://wiki.php.net/rfc/typed_properties_v2
            this.version >= 704 && (this.token === "?" || this.token === this.tok.T_ARRAY || this.token === this.tok.T_CALLABLE || this.token === this.tok.T_NAMESPACE || this.token === this.tok.T_NAME_FULLY_QUALIFIED || this.token === this.tok.T_NAME_QUALIFIED || this.token === this.tok.T_NAME_RELATIVE || this.token === this.tok.T_NS_SEPARATOR || this.token === this.tok.T_STRING))) {
              const variables = this.read_variable_list(flags, attrs, locStart);
              attrs = [];
              result = result.concat(variables);
            } else {
              this.error([
                this.tok.T_CONST,
                ...allow_variables ? [this.tok.T_VARIABLE] : [],
                ...allow_enum_cases ? [this.tok.T_CASE] : [],
                this.tok.T_FUNCTION
              ]);
              this.next();
            }
          }
          this.expect("}");
          this.next();
          return result;
        },
        /*
         * Reads variable list
         * ```ebnf
         *  variable_list ::= (variable_declaration ',')* variable_declaration
         * ```
         */
        read_variable_list(flags, attrs, locStart) {
          let property_statement = this.node("propertystatement");
          const properties = this.read_list(
            /*
             * Reads a variable declaration
             *
             * ```ebnf
             *  variable_declaration ::= T_VARIABLE '=' scalar
             * ```
             */
            function read_variable_declaration() {
              const result = this.node("property");
              let readonly = flags[3] === 1;
              if (!readonly && this.token === this.tok.T_READ_ONLY) {
                readonly = true;
                this.next();
              }
              const [nullable, type] = this.read_optional_type();
              this.expect(this.tok.T_VARIABLE);
              let propName = this.node("identifier");
              const name = this.text().substring(1);
              this.next();
              propName = propName(name);
              let value = null;
              let property_hooks = [];
              this.expect([",", ";", "=", "{"]);
              if (this.token === "=") {
                value = this.next().read_expr();
              }
              if (this.token === "{") {
                property_hooks = this.read_property_hooks();
              } else {
                this.expect([";", ","]);
              }
              return result(
                propName,
                value,
                readonly,
                nullable,
                type,
                attrs || [],
                property_hooks
              );
            },
            ","
          );
          property_statement = property_statement(null, properties, flags);
          if (locStart && property_statement.loc) {
            property_statement.loc.start = locStart;
            if (property_statement.loc.source) {
              property_statement.loc.source = this.lexer._input.substr(
                property_statement.loc.start.offset,
                property_statement.loc.end.offset - property_statement.loc.start.offset
              );
            }
          }
          if (this.token === ";") {
            this.next();
          }
          return property_statement;
        },
        /*
         * Reads property hooks
         */
        read_property_hooks() {
          if (this.version < 804) {
            this.raiseError("Parse Error: Property hooks require PHP 8.4+");
          }
          this.expect("{");
          this.next();
          const hooks = [];
          while (this.token !== this.EOF && this.token !== "}") {
            hooks.push(this.read_property_hook());
          }
          this.expect("}");
          this.next();
          return hooks;
        },
        read_property_hook() {
          const property_hooks = this.node("propertyhook");
          let attrs = [];
          if (this.token === this.tok.T_ATTRIBUTE) {
            attrs = this.read_attr_list();
          }
          const is_final = this.token === this.tok.T_FINAL;
          if (is_final) this.next();
          const is_reference = this.token === "&";
          if (is_reference) this.next();
          const method_name = this.text();
          if (method_name !== "get" && method_name !== "set") {
            this.raiseError(
              "Parse Error: Property hooks must be either 'get' or 'set'"
            );
          }
          this.next();
          let parameter = null;
          let body = null;
          this.expect([this.tok.T_DOUBLE_ARROW, "{", "(", ";"]);
          if (this.token === ";") {
            this.next();
            return property_hooks(
              method_name,
              is_final,
              is_reference,
              parameter,
              body,
              attrs
            );
          }
          if (this.token === "(") {
            this.next();
            parameter = this.read_parameter(false);
            this.expect(")");
            this.next();
          }
          if (this.token === this.tok.T_DOUBLE_ARROW) {
            this.next();
            body = this.read_expr();
            this.next();
          } else if (this.token === "{") {
            body = this.read_code_block();
          }
          return property_hooks(
            method_name,
            is_final,
            is_reference,
            parameter,
            body,
            attrs
          );
        },
        /*
         * Reads constant list
         * ```ebnf
         *  constant_list ::= T_CONST [type] (constant_declaration ',')* constant_declaration
         * ```
         */
        read_constant_list(flags, attrs, locStart) {
          const result = this.node("classconstant");
          if (this.expect(this.tok.T_CONST)) {
            this.next();
          }
          if (flags[1] === 1 || flags[2] === 1 || flags[3] === 1) {
            this.error();
          }
          if (flags[2] === 2 && this.version < 801) {
            this.raiseError("Final class constants are not allowed before PHP 8.1");
          }
          const [nullable, type] = this.version >= 803 ? this.read_optional_type() : [false, null];
          const items = this.read_list(
            /*
             * Reads a constant declaration
             *
             * ```ebnf
             *  constant_declaration ::= (T_STRING | IDENTIFIER) '=' expr
             * ```
             * @return {Constant} [:link:](AST.md#constant)
             */
            function read_constant_declaration() {
              const result2 = this.node("constant");
              let constName = null;
              let value = null;
              if (this.token === this.tok.T_STRING || this.version >= 700 && this.is("IDENTIFIER")) {
                constName = this.node("identifier");
                const name = this.text();
                this.next();
                constName = constName(name);
              } else {
                this.expect("IDENTIFIER");
              }
              if (this.expect("=")) {
                value = this.next().read_expr();
              }
              return result2(constName, value);
            },
            ","
          );
          const node = result(null, items, flags, nullable, type, attrs || []);
          if (locStart && node.loc) {
            node.loc.start = locStart;
            if (node.loc.source) {
              node.loc.source = this.lexer._input.substr(
                node.loc.start.offset,
                node.loc.end.offset - node.loc.start.offset
              );
            }
          }
          return node;
        },
        /*
         * Read member flags
         * @return array
         *  1st index : [get, set] visibility tuple
         *    get/set: -1 => no visibility, 0 => public, 1 => protected, 2 => private
         *  2nd index : 0 => instance member, 1 => static member
         *  3rd index : 0 => normal, 1 => abstract member, 2 => final member
         *  4th index : 0 => no readonly, 1 => readonly
         */
        read_member_flags(asInterface) {
          const result = [[-1, -1], 0, 0, 0];
          const seen = /* @__PURE__ */ new Set();
          while (this.is("T_MEMBER_FLAGS")) {
            let idx = -1, val = -1;
            switch (this.token) {
              case this.tok.T_PUBLIC:
              case this.tok.T_PROTECTED:
              case this.tok.T_PRIVATE: {
                idx = 0;
                val = this.token === this.tok.T_PUBLIC ? 0 : this.token === this.tok.T_PROTECTED ? 1 : 2;
                if (asInterface && val === 2) {
                  this.expect([this.tok.T_PUBLIC, this.tok.T_PROTECTED]);
                  val = -1;
                }
                this.next();
                if (this.version >= 804 && this.token === "(") {
                  if (result[0][0] === -1) {
                    result[0][0] = 0;
                  }
                  this.next();
                  if (this.token !== this.tok.T_STRING || this.text() !== "set") {
                    this.error("set");
                  } else {
                    this.next();
                  }
                  if (this.expect(")")) {
                    this.next();
                  }
                  if (seen.has("set")) {
                    this.error();
                  } else if (val !== -1) {
                    seen.add("set");
                    result[0][1] = val;
                  }
                  continue;
                }
                if (seen.has(idx)) {
                  this.error();
                } else if (val !== -1) {
                  seen.add(idx);
                  result[0][0] = val;
                }
                continue;
              }
              case this.tok.T_STATIC:
                idx = 1;
                val = 1;
                break;
              case this.tok.T_ABSTRACT:
                idx = 2;
                val = 1;
                break;
              case this.tok.T_FINAL:
                idx = 2;
                val = 2;
                break;
              case this.tok.T_READ_ONLY:
                idx = 3;
                val = 1;
                break;
            }
            if (asInterface && idx === 2 && val === 1) {
              this.error();
              val = -1;
            }
            if (seen.has(idx)) {
              this.error();
            } else if (val !== -1) {
              seen.add(idx);
              result[idx] = val;
            }
            this.next();
          }
          return result;
        },
        /*
         * optional_type:
         *	  /- empty -/	{ $$ = NULL; }
         *   |	type_expr	{ $$ = $1; }
         * ;
         *
         * type_expr:
         *		type		{ $$ = $1; }
         *	|	'?' type	{ $$ = $2; $$->attr |= ZEND_TYPE_NULLABLE; }
         *	|	union_type	{ $$ = $1; }
         * ;
         *
         * type:
         * 		T_ARRAY		{ $$ = zend_ast_create_ex(ZEND_AST_TYPE, IS_ARRAY); }
         * 	|	T_CALLABLE	{ $$ = zend_ast_create_ex(ZEND_AST_TYPE, IS_CALLABLE); }
         * 	|	name		{ $$ = $1; }
         * ;
         *
         * union_type:
         * 		type '|' type       { $$ = zend_ast_create_list(2, ZEND_AST_TYPE_UNION, $1, $3); }
         * 	|	union_type '|' type { $$ = zend_ast_list_add($1, $3); }
         * ;
         */
        read_optional_type() {
          const nullable = this.token === "?";
          if (nullable) {
            this.next();
          }
          if (this.peekSkipComments() === "=") {
            return [false, null];
          }
          let type = this.read_types();
          if (nullable && !type) {
            this.raiseError(
              "Expecting a type definition combined with nullable operator"
            );
          }
          if (!nullable && !type) {
            return [false, null];
          }
          if (this.token === "|") {
            type = [type];
            do {
              this.next();
              const variant = this.read_type();
              if (!variant) {
                this.raiseError("Expecting a type definition");
                break;
              }
              type.push(variant);
            } while (this.token === "|");
          }
          return [nullable, type];
        },
        peekSkipComments() {
          const lexerState = this.lexer.getState();
          let nextToken;
          do {
            nextToken = this.lexer.lex();
          } while (nextToken === this.tok.T_COMMENT || nextToken === this.tok.T_WHITESPACE);
          this.lexer.setState(lexerState);
          return nextToken;
        },
        /*
         * reading an interface
         * ```ebnf
         * interface ::= T_INTERFACE T_STRING (T_EXTENDS (NAMESPACE_NAME ',')* NAMESPACE_NAME)? '{' INTERFACE_BODY '}'
         * ```
         */
        read_interface_declaration_statement(attrs) {
          const result = this.node("interface");
          if (this.token !== this.tok.T_INTERFACE) {
            this.error(this.tok.T_INTERFACE);
            this.next();
            return null;
          }
          this.next().expect(this.tok.T_STRING);
          let propName = this.node("identifier");
          const name = this.text();
          this.next();
          propName = propName(name);
          const propExtends = this.read_interface_extends_list();
          this.expect("{");
          const body = this.next().read_interface_body();
          return result(propName, propExtends, body, attrs || []);
        },
        /*
         * Reads an interface body
         * ```ebnf
         *   interface_body ::= (member_flags? (T_CONST | T_FUNCTION))*
         * ```
         */
        read_interface_body() {
          let result = [];
          let attrs;
          while (this.token !== this.EOF && this.token !== "}") {
            if (this.token === this.tok.T_COMMENT) {
              result.push(this.read_comment());
              continue;
            }
            if (this.token === this.tok.T_DOC_COMMENT) {
              result.push(this.read_doc_comment());
              continue;
            }
            const locStart = this.position();
            attrs = [];
            if (this.token === this.tok.T_ATTRIBUTE) {
              attrs = this.read_attr_list();
            }
            const flags = this.read_member_flags(true);
            if (this.token === this.tok.T_CONST) {
              if (flags[0][1] !== -1) {
                this.raiseError("Cannot use asymmetric visibility on constants");
              }
              const constants = this.read_constant_list(flags, attrs, locStart);
              if (this.expect(";")) {
                this.next();
              }
              result = result.concat(constants);
            } else if (this.token === this.tok.T_FUNCTION) {
              const method = this.read_function_declaration(
                2,
                flags,
                attrs,
                locStart
              );
              method.parseFlags(flags);
              result.push(method);
              if (this.expect(";")) {
                this.next();
              }
            } else if (this.token === this.tok.T_STRING) {
              result.push(this.read_variable_list(flags, attrs, locStart));
            } else {
              this.error([this.tok.T_CONST, this.tok.T_FUNCTION, this.tok.T_STRING]);
              this.next();
            }
          }
          if (this.expect("}")) {
            this.next();
          }
          return result;
        },
        /*
         * reading a trait
         * ```ebnf
         * trait ::= T_TRAIT T_STRING (T_EXTENDS (NAMESPACE_NAME ',')* NAMESPACE_NAME)? '{' FUNCTION* '}'
         * ```
         */
        read_trait_declaration_statement(attrs) {
          const result = this.node("trait");
          if (this.token !== this.tok.T_TRAIT) {
            this.error(this.tok.T_TRAIT);
            this.next();
            return null;
          }
          this.next().expect(this.tok.T_STRING);
          let propName = this.node("identifier");
          const name = this.text();
          this.next();
          propName = propName(name);
          this.expect("{");
          const body = this.next().read_class_body(true, false);
          const node = result(propName, body);
          if (attrs) node.attrGroups = attrs;
          return node;
        },
        /*
         * reading a use statement
         * ```ebnf
         * trait_use_statement ::= namespace_name (',' namespace_name)* ('{' trait_use_alias '}')?
         * ```
         */
        read_trait_use_statement() {
          const node = this.node("traituse");
          this.expect(this.tok.T_USE) && this.next();
          const traits = [this.read_namespace_name()];
          let adaptations = null;
          while (this.token === ",") {
            traits.push(this.next().read_namespace_name());
          }
          if (this.token === "{") {
            adaptations = [];
            while (this.next().token !== this.EOF) {
              if (this.token === "}") break;
              adaptations.push(this.read_trait_use_alias());
              this.expect(";");
            }
            if (this.expect("}")) {
              this.next();
            }
          } else {
            if (this.expect(";")) {
              this.next();
            }
          }
          return node(traits, adaptations);
        },
        /*
         * Reading trait alias
         * ```ebnf
         * trait_use_alias ::= namespace_name ( T_DOUBLE_COLON T_STRING )? (T_INSTEADOF namespace_name) | (T_AS member_flags? T_STRING)
         * ```
         * name list : https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L303
         * trait adaptation : https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L742
         */
        read_trait_use_alias() {
          const node = this.node();
          let trait = null;
          let method;
          if (this.is("IDENTIFIER")) {
            method = this.node("identifier");
            const methodName = this.text();
            this.next();
            method = method(methodName);
          } else {
            method = this.read_namespace_name();
            if (this.token === this.tok.T_DOUBLE_COLON) {
              this.next();
              if (this.token === this.tok.T_STRING || this.version >= 700 && this.is("IDENTIFIER")) {
                trait = method;
                method = this.node("identifier");
                const methodName = this.text();
                this.next();
                method = method(methodName);
              } else {
                this.expect(this.tok.T_STRING);
              }
            } else {
              method = method.name;
            }
          }
          if (this.token === this.tok.T_INSTEADOF) {
            return node(
              "traitprecedence",
              trait,
              method,
              this.next().read_name_list()
            );
          } else if (this.token === this.tok.T_AS) {
            let flags = null;
            let alias = null;
            if (this.next().is("T_MEMBER_FLAGS")) {
              flags = this.read_member_flags();
            }
            if (this.token === this.tok.T_STRING || this.version >= 700 && this.is("IDENTIFIER")) {
              alias = this.node("identifier");
              const name = this.text();
              this.next();
              alias = alias(name);
            } else if (flags === null) {
              this.expect(this.tok.T_STRING);
            }
            return node("traitalias", trait, method, alias, flags);
          }
          this.expect([this.tok.T_AS, this.tok.T_INSTEADOF]);
          return node("traitalias", trait, method, null, null);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/comment.js
  var require_comment = __commonJS({
    "node_modules/php-parser/src/parser/comment.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         *  Comments with // or # or / * ... * /
         */
        read_comment() {
          const text = this.text();
          let result = this.ast.prepare(
            text.substring(0, 2) === "/*" ? "commentblock" : "commentline",
            null,
            this
          );
          const offset = this.lexer.yylloc.first_offset;
          const prev = this.prev;
          this.prev = [
            this.lexer.yylloc.last_line,
            this.lexer.yylloc.last_column,
            this.lexer.offset
          ];
          this.lex();
          result = result(text);
          result.offset = offset;
          this.prev = prev;
          return result;
        },
        /*
         * Comments with / ** ... * /
         */
        read_doc_comment() {
          let result = this.ast.prepare("commentblock", null, this);
          const offset = this.lexer.yylloc.first_offset;
          const text = this.text();
          const prev = this.prev;
          this.prev = [
            this.lexer.yylloc.last_line,
            this.lexer.yylloc.last_column,
            this.lexer.offset
          ];
          this.lex();
          result = result(text);
          result.offset = offset;
          this.prev = prev;
          return result;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/expr.js
  var require_expr = __commonJS({
    "node_modules/php-parser/src/parser/expr.js"(exports, module) {
      "use strict";
      module.exports = {
        read_expr(expr2) {
          const result = this.node();
          if (this.token === "@") {
            if (!expr2) {
              expr2 = this.next().read_expr();
            }
            return result("silent", expr2);
          }
          if (!expr2) {
            expr2 = this.read_expr_item();
          }
          if (this.token === "|") {
            return result("bin", "|", expr2, this.next().read_expr());
          }
          if (this.token === "&") {
            return result("bin", "&", expr2, this.next().read_expr());
          }
          if (this.token === "^") {
            return result("bin", "^", expr2, this.next().read_expr());
          }
          if (this.token === ".") {
            return result("bin", ".", expr2, this.next().read_expr());
          }
          if (this.token === "+") {
            return result("bin", "+", expr2, this.next().read_expr());
          }
          if (this.token === "-") {
            return result("bin", "-", expr2, this.next().read_expr());
          }
          if (this.token === "*") {
            return result("bin", "*", expr2, this.next().read_expr());
          }
          if (this.token === "/") {
            return result("bin", "/", expr2, this.next().read_expr());
          }
          if (this.token === "%") {
            return result("bin", "%", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_POW) {
            return result("bin", "**", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_SL) {
            return result("bin", "<<", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_SR) {
            return result("bin", ">>", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_BOOLEAN_OR) {
            return result("bin", "||", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_LOGICAL_OR) {
            return result("bin", "or", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_BOOLEAN_AND) {
            return result("bin", "&&", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_LOGICAL_AND) {
            return result("bin", "and", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_LOGICAL_XOR) {
            return result("bin", "xor", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_IDENTICAL) {
            return result("bin", "===", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_NOT_IDENTICAL) {
            return result("bin", "!==", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_EQUAL) {
            return result("bin", "==", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_NOT_EQUAL) {
            return result("bin", "!=", expr2, this.next().read_expr());
          }
          if (this.token === "<") {
            return result("bin", "<", expr2, this.next().read_expr());
          }
          if (this.token === ">") {
            return result("bin", ">", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_SMALLER_OR_EQUAL) {
            return result("bin", "<=", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_IS_GREATER_OR_EQUAL) {
            return result("bin", ">=", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_SPACESHIP) {
            return result("bin", "<=>", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_INSTANCEOF) {
            expr2 = result(
              "bin",
              "instanceof",
              expr2,
              this.next().read_class_name_reference()
            );
            if (this.token !== ";" && this.token !== this.tok.T_INLINE_HTML && this.token !== this.EOF) {
              expr2 = this.read_expr(expr2);
            }
          }
          if (this.token === this.tok.T_NULLSAFE_OBJECT_OPERATOR) {
            expr2 = result("nullsafepropertylookup", expr2, this.read_what());
            expr2 = this.recursive_variable_chain_scan(expr2, false, true);
          }
          if (this.token === this.tok.T_COALESCE) {
            return result("bin", "??", expr2, this.next().read_expr());
          }
          if (this.token === this.tok.T_PIPE) {
            if (this.version < 805) {
              this.raiseError("PHP 8.5+ is required to use pipe operator");
            }
            const right = this.next().read_expr();
            if (right.kind === "arrowfunc" && !right.parenthesizedExpression) {
              this.raiseError(
                "Arrow functions in a pipe chain must be wrapped in parentheses"
              );
            }
            return result("bin", "|>", expr2, right);
          }
          if (this.token === "?") {
            let trueArg = null;
            if (this.next().token !== ":") {
              trueArg = this.read_expr();
            }
            this.expect(":") && this.next();
            return result("retif", expr2, trueArg, this.read_expr());
          } else {
            result.destroy(expr2);
          }
          return expr2;
        },
        /*
         * Reads a cast expression
         */
        read_expr_cast(type) {
          return this.node("cast")(type, this.text(), this.next().read_expr());
        },
        /*
         * Read a isset variable
         */
        read_isset_variable() {
          return this.read_expr();
        },
        /*
         * Reads isset variables
         */
        read_isset_variables() {
          return this.read_function_list(this.read_isset_variable, ",");
        },
        /*
         * Reads internal PHP functions
         */
        read_internal_functions_in_yacc() {
          let result = null;
          switch (this.token) {
            case this.tok.T_ISSET:
              {
                result = this.node("isset");
                if (this.next().expect("(")) {
                  this.next();
                }
                const variables = this.read_isset_variables();
                if (this.expect(")")) {
                  this.next();
                }
                result = result(variables);
              }
              break;
            case this.tok.T_EMPTY:
              {
                result = this.node("empty");
                if (this.next().expect("(")) {
                  this.next();
                }
                const expression2 = this.read_expr();
                if (this.expect(")")) {
                  this.next();
                }
                result = result(expression2);
              }
              break;
            case this.tok.T_INCLUDE:
              result = this.node("include")(false, false, this.next().read_expr());
              break;
            case this.tok.T_INCLUDE_ONCE:
              result = this.node("include")(true, false, this.next().read_expr());
              break;
            case this.tok.T_EVAL:
              {
                result = this.node("eval");
                if (this.next().expect("(")) {
                  this.next();
                }
                const expr2 = this.read_expr();
                if (this.expect(")")) {
                  this.next();
                }
                result = result(expr2);
              }
              break;
            case this.tok.T_REQUIRE:
              result = this.node("include")(false, true, this.next().read_expr());
              break;
            case this.tok.T_REQUIRE_ONCE:
              result = this.node("include")(true, true, this.next().read_expr());
              break;
          }
          return result;
        },
        /*
         * Reads optional expression
         */
        read_optional_expr(stopToken) {
          if (this.token !== stopToken) {
            return this.read_expr();
          }
          return null;
        },
        /*
         * Reads exit expression
         */
        read_exit_expr() {
          let expression2 = null;
          if (this.token === "(") {
            this.next();
            expression2 = this.read_optional_expr(")");
            this.expect(")") && this.next();
          }
          return expression2;
        },
        /*
         * ```ebnf
         * Reads an expression
         *  expr ::= @todo
         * ```
         */
        read_expr_item() {
          let result, expr2, attrs = [];
          if (this.token === "+") {
            return this.node("unary")("+", this.next().read_expr());
          }
          if (this.token === "-") {
            return this.node("unary")("-", this.next().read_expr());
          }
          if (this.token === "!") {
            return this.node("unary")("!", this.next().read_expr());
          }
          if (this.token === "~") {
            return this.node("unary")("~", this.next().read_expr());
          }
          if (this.token === "(") {
            expr2 = this.next().read_expr();
            expr2.parenthesizedExpression = true;
            this.expect(")") && this.next();
            return this.handleDereferencable(expr2);
          }
          if (this.token === "`") {
            return this.read_encapsed_string("`");
          }
          if (this.token === this.tok.T_LIST) {
            let assign = null;
            const isInner = this.innerList;
            result = this.node("list");
            if (!isInner) {
              assign = this.node("assign");
            }
            if (this.next().expect("(")) {
              this.next();
            }
            if (!this.innerList) this.innerList = true;
            const assignList = this.read_array_pair_list(false);
            if (this.expect(")")) {
              this.next();
            }
            let hasItem = false;
            for (let i = 0; i < assignList.length; i++) {
              if (assignList[i] !== null && assignList[i].kind !== "noop") {
                hasItem = true;
                break;
              }
            }
            if (!hasItem) {
              this.raiseError(
                "Fatal Error :  Cannot use empty list on line " + this.lexer.yylloc.first_line
              );
            }
            if (!isInner) {
              this.innerList = false;
              if (this.expect("=")) {
                return assign(
                  result(assignList, false),
                  this.next().read_expr(),
                  "="
                );
              } else {
                return result(assignList, false);
              }
            } else {
              return result(assignList, false);
            }
          }
          if (this.token === this.tok.T_ATTRIBUTE) {
            attrs = this.read_attr_list();
          }
          if (this.token === this.tok.T_CLONE) {
            const node = this.node("clone");
            this.next();
            if (this.version >= 805 && this.token === "(") {
              this.next();
              let what2 = this.read_variable(false, false);
              what2 = this.handleDereferencable(what2);
              let properties = null;
              if (this.token === ",") {
                properties = this.next().read_expr();
              }
              this.expect(")") && this.next();
              return node(what2, properties);
            }
            let what = this.read_variable(false, false);
            what = this.handleDereferencable(what);
            return node(what, null);
          }
          switch (this.token) {
            case this.tok.T_INC:
              return this.node("pre")("+", this.next().read_variable(false, false));
            case this.tok.T_DEC:
              return this.node("pre")("-", this.next().read_variable(false, false));
            case this.tok.T_NEW:
              expr2 = this.read_new_expr();
              if (this.token === this.tok.T_OBJECT_OPERATOR && this.version < 804) {
                this.raiseError(
                  "New without parenthesis is not allowed before PHP 8.4"
                );
              }
              return this.handleDereferencable(expr2);
            case this.tok.T_ISSET:
            case this.tok.T_EMPTY:
            case this.tok.T_INCLUDE:
            case this.tok.T_INCLUDE_ONCE:
            case this.tok.T_EVAL:
            case this.tok.T_REQUIRE:
            case this.tok.T_REQUIRE_ONCE:
              return this.read_internal_functions_in_yacc();
            case this.tok.T_MATCH:
              return this.read_match_expression();
            case this.tok.T_INT_CAST:
              return this.read_expr_cast("int");
            case this.tok.T_DOUBLE_CAST:
              return this.read_expr_cast("float");
            case this.tok.T_STRING_CAST:
              return this.read_expr_cast(
                this.text().indexOf("binary") !== -1 ? "binary" : "string"
              );
            case this.tok.T_ARRAY_CAST:
              return this.read_expr_cast("array");
            case this.tok.T_OBJECT_CAST:
              return this.read_expr_cast("object");
            case this.tok.T_BOOL_CAST:
              return this.read_expr_cast("bool");
            case this.tok.T_UNSET_CAST:
              return this.read_expr_cast("unset");
            case this.tok.T_THROW: {
              if (this.version < 800) {
                this.raiseError("PHP 8+ is required to use throw as an expression");
              }
              const result2 = this.node("throw");
              const expr3 = this.next().read_expr();
              return result2(expr3);
            }
            case this.tok.T_EXIT: {
              const useDie = this.lexer.yytext.toLowerCase() === "die";
              result = this.node("exit");
              this.next();
              const expression2 = this.read_exit_expr();
              return result(expression2, useDie);
            }
            case this.tok.T_PRINT:
              return this.node("print")(this.next().read_expr());
            // T_YIELD (expr (T_DOUBLE_ARROW expr)?)?
            case this.tok.T_YIELD: {
              let value = null;
              let key = null;
              result = this.node("yield");
              if (this.next().is("EXPR")) {
                value = this.read_expr();
                if (this.token === this.tok.T_DOUBLE_ARROW) {
                  key = value;
                  value = this.next().read_expr();
                }
              }
              return result(value, key);
            }
            // T_YIELD_FROM expr
            case this.tok.T_YIELD_FROM:
              result = this.node("yieldfrom");
              expr2 = this.next().read_expr();
              return result(expr2);
            case this.tok.T_FN:
            case this.tok.T_FUNCTION:
              return this.read_inline_function(void 0, attrs);
            case this.tok.T_STATIC: {
              const backup = [this.token, this.lexer.getState()];
              this.next();
              if (this.token === this.tok.T_FUNCTION || this.version >= 704 && this.token === this.tok.T_FN) {
                return this.read_inline_function([0, 1, 0], attrs);
              } else {
                this.lexer.tokens.push(backup);
                this.next();
              }
            }
          }
          if (this.is("VARIABLE")) {
            result = this.node();
            expr2 = this.read_variable(false, false);
            const isConst = expr2.kind === "identifier" || expr2.kind === "staticlookup" && expr2.offset.kind === "identifier";
            switch (this.token) {
              case "=": {
                if (isConst) this.error("VARIABLE");
                if (this.next().token == "&") {
                  return this.read_assignref(result, expr2);
                }
                return result("assign", expr2, this.read_expr(), "=");
              }
              // operations :
              case this.tok.T_PLUS_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "+=");
              case this.tok.T_MINUS_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "-=");
              case this.tok.T_MUL_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "*=");
              case this.tok.T_POW_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "**=");
              case this.tok.T_DIV_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "/=");
              case this.tok.T_CONCAT_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), ".=");
              case this.tok.T_MOD_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "%=");
              case this.tok.T_AND_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "&=");
              case this.tok.T_OR_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "|=");
              case this.tok.T_XOR_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "^=");
              case this.tok.T_SL_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "<<=");
              case this.tok.T_SR_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), ">>=");
              case this.tok.T_COALESCE_EQUAL:
                if (isConst) this.error("VARIABLE");
                return result("assign", expr2, this.next().read_expr(), "??=");
              case this.tok.T_INC:
                if (isConst) this.error("VARIABLE");
                this.next();
                return result("post", "+", expr2);
              case this.tok.T_DEC:
                if (isConst) this.error("VARIABLE");
                this.next();
                return result("post", "-", expr2);
              default:
                result.destroy(expr2);
            }
          } else if (this.is("SCALAR")) {
            result = this.node();
            expr2 = this.read_scalar();
            if (expr2.kind === "array" && expr2.shortForm && this.token === "=") {
              const list = this.convertToList(expr2);
              if (expr2.loc) list.loc = expr2.loc;
              const right = this.next().read_expr();
              return result("assign", list, right, "=");
            } else {
              result.destroy(expr2);
            }
            return this.handleDereferencable(expr2);
          } else {
            this.error("EXPR");
            this.next();
          }
          return expr2;
        },
        /*
         * Recursively convert nested array to nested list.
         */
        convertToList(array) {
          const convertedItems = array.items.map((entry) => {
            if (entry.value && entry.value.kind === "array" && entry.value.shortForm) {
              entry.value = this.convertToList(entry.value);
            }
            return entry;
          });
          const node = this.node("list")(convertedItems, true);
          if (array.loc) node.loc = array.loc;
          if (array.leadingComments) node.leadingComments = array.leadingComments;
          if (array.trailingComments) node.trailingComments = array.trailingComments;
          return node;
        },
        /*
         * Reads assignment
         * @param {*} left
         */
        read_assignref(result, left) {
          this.next();
          let right;
          if (this.token === this.tok.T_NEW) {
            if (this.version >= 700) {
              this.error();
            }
            right = this.read_new_expr();
          } else if (this.token === "(") {
            right = this.next().read_expr();
            this.expect(")") && this.next();
            right = this.recursive_variable_chain_scan(right, false, false);
          } else {
            right = this.read_variable(false, false);
          }
          return result("assignref", left, right);
        },
        /*
         *
         * inline_function:
         * 		function returns_ref backup_doc_comment '(' parameter_list ')' lexical_vars return_type
         * 		backup_fn_flags '{' inner_statement_list '}' backup_fn_flags
         * 			{ $$ = zend_ast_create_decl(ZEND_AST_CLOSURE, $2 | $13, $1, $3,
         * 				  zend_string_init("{closure}", sizeof("{closure}") - 1, 0),
         * 				  $5, $7, $11, $8); CG(extra_fn_flags) = $9; }
         * 	|	fn returns_ref '(' parameter_list ')' return_type backup_doc_comment T_DOUBLE_ARROW backup_fn_flags backup_lex_pos expr backup_fn_flags
         * 			{ $$ = zend_ast_create_decl(ZEND_AST_ARROW_FUNC, $2 | $12, $1, $7,
         * 				  zend_string_init("{closure}", sizeof("{closure}") - 1, 0), $4, NULL,
         * 				  zend_ast_create(ZEND_AST_RETURN, $11), $6);
         * 				  ((zend_ast_decl *) $$)->lex_pos = $10;
         * 				  CG(extra_fn_flags) = $9; }   *
         */
        read_inline_function(flags, attrs) {
          if (this.token === this.tok.T_FUNCTION) {
            const result2 = this.read_function(true, flags, attrs);
            result2.attrGroups = attrs;
            return result2;
          }
          if (this.version < 704) {
            this.raiseError("Arrow Functions are not allowed");
          }
          const node = this.node("arrowfunc");
          if (this.expect(this.tok.T_FN)) this.next();
          const isRef = this.is_reference();
          if (this.expect("(")) this.next();
          const params = this.read_parameter_list();
          if (this.expect(")")) this.next();
          let nullable = false;
          let returnType = null;
          if (this.token === ":") {
            if (this.next().token === "?") {
              nullable = true;
              this.next();
            }
            returnType = this.read_types();
          }
          if (this.expect(this.tok.T_DOUBLE_ARROW)) this.next();
          const body = this.read_expr();
          const result = node(
            params,
            isRef,
            body,
            returnType,
            nullable,
            flags ? true : false
          );
          result.attrGroups = attrs;
          return result;
        },
        read_match_expression() {
          const node = this.node("match");
          this.expect(this.tok.T_MATCH) && this.next();
          if (this.version < 800) {
            this.raiseError("Match statements are not allowed before PHP 8");
          }
          if (this.expect("(")) this.next();
          const cond = this.read_expr();
          if (this.expect(")")) this.next();
          if (this.expect("{")) this.next();
          const arms = this.read_match_arms();
          if (this.expect("}")) this.next();
          return node(cond, arms);
        },
        read_match_arms() {
          return this.read_list(() => this.read_match_arm(), ",", true);
        },
        read_match_arm() {
          if (this.token === "}") {
            return;
          }
          return this.node("matcharm")(this.read_match_arm_conds(), this.read_expr());
        },
        read_match_arm_conds() {
          let conds = [];
          if (this.token === this.tok.T_DEFAULT) {
            conds = null;
            this.next();
          } else {
            conds.push(this.read_expr());
            while (this.token === ",") {
              this.next();
              if (this.token === this.tok.T_DOUBLE_ARROW) {
                this.next();
                return conds;
              }
              conds.push(this.read_expr());
            }
          }
          if (this.expect(this.tok.T_DOUBLE_ARROW)) {
            this.next();
          }
          return conds;
        },
        read_attribute() {
          const node = this.node("attribute");
          const name = this.text();
          let args = [];
          this.next();
          if (this.token === "(") {
            args = this.read_argument_list();
          }
          return node(name, args);
        },
        read_attr_list() {
          const list = [];
          if (this.token === this.tok.T_ATTRIBUTE) {
            do {
              const node = this.node("attrgroup");
              this.next();
              const attrs = [this.read_attribute()];
              while (this.token === ",") {
                this.next();
                if (this.token !== "]") attrs.push(this.read_attribute());
              }
              this.expect("]");
              this.next();
              list.push(node(attrs));
            } while (this.token === this.tok.T_ATTRIBUTE);
          }
          return list;
        },
        /*
         * ```ebnf
         *    new_expr ::= T_NEW (namespace_name function_argument_list) | (T_CLASS ... class declaration)
         * ```
         * https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L850
         */
        read_new_expr() {
          const result = this.node("new");
          this.expect(this.tok.T_NEW) && this.next();
          let args = [];
          if (this.token === "(") {
            this.next();
            const newExp = this.read_expr();
            this.expect(")");
            this.next();
            if (this.token === "(") {
              args = this.read_argument_list();
            }
            return result(newExp, args);
          }
          const attrs = this.read_attr_list();
          const isReadonly = this.token === this.tok.T_READ_ONLY;
          if (isReadonly) {
            if (this.version < 803) {
              this.raiseError(
                "Anonymous readonly classes are not allowed before PHP 8.3"
              );
            }
            this.next();
          }
          if (this.token === this.tok.T_CLASS) {
            const what = this.node("class");
            if (this.next().token === "(") {
              args = this.read_argument_list();
            }
            const propExtends = this.read_extends_from();
            const propImplements = this.read_implements_list();
            let body = null;
            if (this.expect("{")) {
              body = this.next().read_class_body(true, false);
            }
            const whatNode = what(null, propExtends, propImplements, body, [
              0,
              0,
              0,
              isReadonly ? 1 : 0
            ]);
            whatNode.attrGroups = attrs;
            return result(whatNode, args);
          }
          let name = this.read_new_class_name();
          while (this.token === "[") {
            const offsetNode = this.node("offsetlookup");
            const offset = this.next().read_encaps_var_offset();
            this.expect("]") && this.next();
            name = offsetNode(name, offset);
          }
          if (this.token === "(") {
            args = this.read_argument_list();
          }
          return result(name, args);
        },
        /*
         * Reads a class name
         * ```ebnf
         * read_new_class_name ::= namespace_name | variable
         * ```
         */
        read_new_class_name() {
          if (this.token === this.tok.T_NS_SEPARATOR || this.token === this.tok.T_NAME_RELATIVE || this.token === this.tok.T_NAME_QUALIFIED || this.token === this.tok.T_NAME_FULLY_QUALIFIED || this.token === this.tok.T_STRING || this.token === this.tok.T_NAMESPACE) {
            let result = this.read_namespace_name(true);
            if (this.token === this.tok.T_DOUBLE_COLON) {
              result = this.read_static_getter(result);
              return this.recursive_variable_chain_scan(result, true, false);
            }
            return result;
          } else if (this.is("VARIABLE")) {
            return this.read_variable(true, false);
          } else {
            this.expect([this.tok.T_STRING, "VARIABLE"]);
          }
        },
        handleDereferencable(expr2) {
          while (this.token !== this.EOF) {
            if (this.token === this.tok.T_OBJECT_OPERATOR || this.token === this.tok.T_DOUBLE_COLON || this.token === this.tok.T_NULLSAFE_OBJECT_OPERATOR) {
              expr2 = this.recursive_variable_chain_scan(expr2, false, false, true);
            } else if (this.token === this.tok.T_CURLY_OPEN || this.token === "[") {
              expr2 = this.read_dereferencable(expr2);
            } else if (this.token === "(") {
              expr2 = this.node("call")(expr2, this.read_argument_list());
            } else {
              return expr2;
            }
          }
          return expr2;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/enum.js
  var require_enum = __commonJS({
    "node_modules/php-parser/src/parser/enum.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * reading an enum
         * ```ebnf
         * enum ::= enum_scope? T_ENUM T_STRING (':' NAMESPACE_NAME)? (T_IMPLEMENTS (NAMESPACE_NAME ',')* NAMESPACE_NAME)? '{' ENUM_BODY '}'
         * ```
         */
        read_enum_declaration_statement(attrs) {
          const result = this.node("enum");
          if (!this.expect(this.tok.T_ENUM)) {
            return null;
          }
          this.next().expect(this.tok.T_STRING);
          let propName = this.node("identifier");
          const name = this.text();
          this.next();
          propName = propName(name);
          const valueType = this.read_enum_value_type();
          const propImplements = this.read_implements_list();
          this.expect("{");
          const body = this.next().read_class_body(false, true);
          const node = result(propName, valueType, propImplements, body);
          if (attrs) node.attrGroups = attrs;
          return node;
        },
        read_enum_value_type() {
          if (this.token === ":") {
            return this.next().read_namespace_name();
          }
          return null;
        },
        read_enum_case(attrs) {
          this.expect(this.tok.T_CASE);
          const result = this.node("enumcase");
          let caseName = this.node("identifier");
          const name = this.next().text();
          this.next();
          caseName = caseName(name);
          const value = this.token === "=" ? this.next().read_expr() : null;
          this.expect(";");
          const node = result(caseName, value);
          if (attrs && attrs.length > 0) node.attrGroups = attrs;
          return node;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/function.js
  var require_function = __commonJS({
    "node_modules/php-parser/src/parser/function.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * checks if current token is a reference keyword
         */
        is_reference() {
          if (this.token === "&") {
            this.next();
            return true;
          }
          return false;
        },
        /*
         * checks if current token is a variadic keyword
         */
        is_variadic() {
          if (this.token === this.tok.T_ELLIPSIS) {
            this.next();
            return true;
          }
          return false;
        },
        /*
         * reading a function
         * ```ebnf
         * function ::= function_declaration code_block
         * ```
         */
        read_function(closure, flag, attrs, locStart) {
          const result = this.read_function_declaration(
            closure ? 1 : flag ? 2 : 0,
            flag && flag[1] === 1,
            attrs || [],
            locStart
          );
          if (flag && flag[2] == 1) {
            result.parseFlags(flag);
            if (this.expect(";")) {
              this.next();
            }
          } else {
            if (this.expect("{")) {
              result.body = this.read_code_block(false);
              if (result.loc && result.body.loc) {
                result.loc.end = result.body.loc.end;
              }
            }
            if (!closure && flag) {
              result.parseFlags(flag);
            }
          }
          return result;
        },
        /*
         * reads a function declaration (without his body)
         * ```ebnf
         * function_declaration ::= T_FUNCTION '&'?  T_STRING '(' parameter_list ')'
         * ```
         */
        read_function_declaration(type, isStatic, attrs, locStart) {
          let nodeName = "function";
          if (type === 1) {
            nodeName = "closure";
          } else if (type === 2) {
            nodeName = "method";
          }
          const result = this.node(nodeName);
          if (this.expect(this.tok.T_FUNCTION)) {
            this.next();
          }
          const isRef = this.is_reference();
          let name = false, use = [], returnType = null, nullable = false;
          if (type !== 1) {
            const nameNode = this.node("identifier");
            if (type === 2) {
              if (this.version >= 700) {
                if (this.token === this.tok.T_STRING || this.is("IDENTIFIER")) {
                  name = this.text();
                  this.next();
                } else if (this.version < 704) {
                  this.error("IDENTIFIER");
                }
              } else if (this.token === this.tok.T_STRING) {
                name = this.text();
                this.next();
              } else {
                this.error("IDENTIFIER");
              }
            } else {
              if (this.version >= 700) {
                if (this.token === this.tok.T_STRING) {
                  name = this.text();
                  this.next();
                } else if (this.version >= 704) {
                  if (!this.expect("(")) {
                    this.next();
                  }
                } else {
                  this.error(this.tok.T_STRING);
                  this.next();
                }
              } else {
                if (this.expect(this.tok.T_STRING)) {
                  name = this.text();
                }
                this.next();
              }
            }
            name = nameNode(name);
          }
          if (this.expect("(")) this.next();
          const params = this.read_parameter_list(name.name === "__construct");
          if (this.expect(")")) this.next();
          if (type === 1) {
            use = this.read_lexical_vars();
          }
          if (this.token === ":") {
            if (this.next().token === "?") {
              nullable = true;
              this.next();
            }
            returnType = this.read_types();
          }
          const apply_attrgroup_location = (node) => {
            node.attrGroups = attrs || [];
            if (locStart && node.loc) {
              node.loc.start = locStart;
              if (node.loc.source) {
                node.loc.source = this.lexer._input.substr(
                  node.loc.start.offset,
                  node.loc.end.offset - node.loc.start.offset
                );
              }
            }
            return node;
          };
          if (type === 1) {
            return apply_attrgroup_location(
              result(params, isRef, use, returnType, nullable, isStatic)
            );
          }
          return apply_attrgroup_location(
            result(name, params, isRef, returnType, nullable)
          );
        },
        read_lexical_vars() {
          let result = [];
          if (this.token === this.tok.T_USE) {
            this.next();
            this.expect("(") && this.next();
            result = this.read_lexical_var_list();
            this.expect(")") && this.next();
          }
          return result;
        },
        read_list_with_dangling_comma(item) {
          const result = [];
          while (this.token != this.EOF) {
            result.push(item());
            if (this.token == ",") {
              this.next();
              if (this.version >= 800 && this.token === ")") {
                return result;
              }
            } else if (this.token == ")") {
              break;
            } else {
              this.error([",", ")"]);
              break;
            }
          }
          return result;
        },
        read_lexical_var_list() {
          return this.read_list_with_dangling_comma(this.read_lexical_var.bind(this));
        },
        /*
         * ```ebnf
         * lexical_var ::= '&'? T_VARIABLE
         * ```
         */
        read_lexical_var() {
          if (this.token === "&") {
            return this.read_byref(this.read_lexical_var.bind(this));
          }
          const result = this.node("variable");
          this.expect(this.tok.T_VARIABLE);
          const name = this.text().substring(1);
          this.next();
          return result(name, false);
        },
        /*
         * reads a list of parameters
         * ```ebnf
         *  parameter_list ::= (parameter ',')* parameter?
         * ```
         */
        read_parameter_list(is_class_constructor) {
          if (this.token !== ")") {
            let wasVariadic = false;
            return this.read_list_with_dangling_comma(
              function() {
                const parameter = this.read_parameter(is_class_constructor);
                if (parameter) {
                  if (wasVariadic) {
                    this.raiseError(
                      "Unexpected parameter after a variadic parameter"
                    );
                  }
                  if (parameter.variadic) {
                    wasVariadic = true;
                  }
                }
                return parameter;
              }.bind(this),
              ","
            );
          }
          return [];
        },
        /*
         * ```ebnf
         *  parameter ::= type? '&'? T_ELLIPSIS? T_VARIABLE ('=' expr)?
         * ```
         * @see https://github.com/php/php-src/blob/493524454d66adde84e00d249d607ecd540de99f/Zend/zend_language_parser.y#L640
         */
        read_parameter(is_class_constructor) {
          const node = this.node("parameter");
          let parameterName = null;
          let value = null;
          let nullable = false;
          let readonly = false;
          let attrs = [];
          if (this.token === this.tok.T_ATTRIBUTE) attrs = this.read_attr_list();
          if (this.version >= 801 && this.token === this.tok.T_READ_ONLY) {
            if (is_class_constructor) {
              this.next();
              readonly = true;
            } else {
              this.raiseError(
                "readonly properties can be used only on class constructor"
              );
            }
          }
          const [flags, flagsSet] = this.read_promoted();
          if (!readonly && this.version >= 801 && this.token === this.tok.T_READ_ONLY) {
            if (is_class_constructor) {
              this.next();
              readonly = true;
            } else {
              this.raiseError(
                "readonly properties can be used only on class constructor"
              );
            }
          }
          if (this.token === "?") {
            this.next();
            nullable = true;
          }
          const types = this.read_types();
          if (nullable && !types) {
            this.raiseError(
              "Expecting a type definition combined with nullable operator"
            );
          }
          const isRef = this.is_reference();
          const isVariadic = this.is_variadic();
          if (this.expect(this.tok.T_VARIABLE)) {
            parameterName = this.node("identifier");
            const name = this.text().substring(1);
            this.next();
            parameterName = parameterName(name);
          }
          if (this.token == "=") {
            value = this.next().read_expr();
          }
          let hooks = [];
          if (this.version >= 804 && flags && this.token === "{") {
            hooks = this.read_property_hooks();
          }
          const result = node(
            parameterName,
            types,
            value,
            isRef,
            isVariadic,
            readonly,
            nullable,
            flags,
            hooks,
            flagsSet
          );
          if (attrs) result.attrGroups = attrs;
          return result;
        },
        read_types() {
          const MODE_UNSET = "unset";
          const MODE_UNION = "union";
          const MODE_INTERSECTION = "intersection";
          const types = [];
          let mode = MODE_UNSET;
          const node = this.node();
          const type = this.read_type();
          if (!type) {
            node.destroy();
            return null;
          }
          types.push(type);
          while (this.token === "|" || this.version >= 801 && this.token === "&") {
            const nextToken = this.peek();
            if (nextToken === this.tok.T_ELLIPSIS || nextToken === this.tok.T_VARIABLE) {
              break;
            }
            if (mode === MODE_UNSET) {
              mode = this.token === "|" ? MODE_UNION : MODE_INTERSECTION;
            } else {
              if (mode === MODE_UNION && this.token !== "|" || mode === MODE_INTERSECTION && this.token !== "&") {
                this.raiseError(
                  'Unexpect token "' + this.token + '", "|" and "&" can not be mixed'
                );
              }
            }
            this.next();
            types.push(this.read_type());
          }
          if (types.length === 1) {
            node.destroy();
            return types[0];
          } else {
            return mode === MODE_INTERSECTION ? node("intersectiontype", types) : node("uniontype", types);
          }
        },
        read_promoted() {
          const MODIFIER_PUBLIC = 1;
          const MODIFIER_PROTECTED = 2;
          const MODIFIER_PRIVATE = 4;
          let firstModifier;
          if (this.token === this.tok.T_PUBLIC) {
            this.next();
            firstModifier = MODIFIER_PUBLIC;
          } else if (this.token === this.tok.T_PROTECTED) {
            this.next();
            firstModifier = MODIFIER_PROTECTED;
          } else if (this.token === this.tok.T_PRIVATE) {
            this.next();
            firstModifier = MODIFIER_PRIVATE;
          } else {
            return [0, 0];
          }
          if (this.version >= 804) {
            if (this.token === "(") {
              this.next();
              if (this.token !== this.tok.T_STRING || this.text() !== "set") {
                this.error("set");
              } else {
                this.next();
              }
              if (this.expect(")")) {
                this.next();
              }
              return [0, firstModifier];
            }
            let setModifier = 0;
            if (this.token === this.tok.T_PUBLIC) {
              this.next();
              setModifier = MODIFIER_PUBLIC;
            } else if (this.token === this.tok.T_PROTECTED) {
              this.next();
              setModifier = MODIFIER_PROTECTED;
            } else if (this.token === this.tok.T_PRIVATE) {
              this.next();
              setModifier = MODIFIER_PRIVATE;
            }
            if (setModifier > 0) {
              if (this.expect("(")) {
                this.next();
              }
              if (this.token !== this.tok.T_STRING || this.text() !== "set") {
                this.error("set");
              } else {
                this.next();
              }
              if (this.expect(")")) {
                this.next();
              }
              return [firstModifier, setModifier];
            }
          }
          return [firstModifier, 0];
        },
        /*
         * Reads a list of arguments
         * ```ebnf
         *  function_argument_list ::= '(' (argument_list (',' argument_list)*)? ')'
         * ```
         */
        read_argument_list() {
          let result = [];
          this.expect("(") && this.next();
          if (this.version >= 801 && this.token === this.tok.T_ELLIPSIS && this.peek() === ")") {
            const variadicNode = this.node("variadicplaceholder");
            this.next();
            result.push(variadicNode());
          } else if (this.token !== ")") {
            result = this.read_non_empty_argument_list();
          }
          this.expect(")") && this.next();
          return result;
        },
        /*
         * Reads non empty argument list
         */
        read_non_empty_argument_list() {
          let wasVariadic = false;
          return this.read_function_list(
            function() {
              const argument = this.read_argument();
              if (argument) {
                const isVariadic = argument.kind === "variadic";
                if (wasVariadic && !isVariadic) {
                  this.raiseError(
                    "Unexpected non-variadic argument after a variadic argument"
                  );
                }
                if (isVariadic) {
                  wasVariadic = true;
                }
              }
              return argument;
            }.bind(this),
            ","
          );
        },
        /*
         * ```ebnf
         *    argument_list ::= T_STRING ':' expr | T_ELLIPSIS? expr
         * ```
         */
        read_argument() {
          if (this.token === this.tok.T_ELLIPSIS) {
            return this.node("variadic")(this.next().read_expr());
          }
          if (this.token === this.tok.T_STRING || Object.values(this.lexer.keywords).includes(this.token)) {
            const nextToken = this.peek();
            if (nextToken === ":") {
              if (this.version < 800) {
                this.raiseError("PHP 8+ is required to use named arguments");
              }
              return this.node("namedargument")(
                this.text(),
                this.next().next().read_expr()
              );
            }
          }
          return this.read_expr();
        },
        /*
         * read type hinting
         * ```ebnf
         *  type ::= T_ARRAY | T_CALLABLE | namespace_name
         * ```
         */
        read_type() {
          const result = this.node();
          if (this.token === this.tok.T_ARRAY || this.token === this.tok.T_CALLABLE) {
            const type = this.text();
            this.next();
            return result("typereference", type.toLowerCase(), type);
          } else if (this.token === this.tok.T_NAME_RELATIVE || this.token === this.tok.T_NAME_QUALIFIED || this.token === this.tok.T_NAME_FULLY_QUALIFIED || this.token === this.tok.T_STRING || this.token === this.tok.T_STATIC) {
            const type = this.text();
            const backup = [this.token, this.lexer.getState()];
            this.next();
            if (this.token !== this.tok.T_NS_SEPARATOR && this.ast.typereference.types.indexOf(type.toLowerCase()) > -1) {
              return result("typereference", type.toLowerCase(), type);
            } else {
              this.lexer.tokens.push(backup);
              this.next();
              result.destroy();
              return this.read_namespace_name();
            }
          } else if (this.version >= 802 && this.token === "(") {
            this.next();
            const innerTypes = [];
            innerTypes.push(this.read_type());
            while (this.token === "&") {
              const nextToken = this.peek();
              if (nextToken === this.tok.T_ELLIPSIS || nextToken === this.tok.T_VARIABLE) {
                break;
              }
              this.next();
              innerTypes.push(this.read_type());
            }
            this.expect(")") && this.next();
            return result("intersectiontype", innerTypes);
          }
          result.destroy();
          return null;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/if.js
  var require_if = __commonJS({
    "node_modules/php-parser/src/parser/if.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads an IF statement
         *
         * ```ebnf
         *  if ::= T_IF '(' expr ')' ':' ...
         * ```
         */
        read_if() {
          const result = this.node("if");
          const test = this.next().read_if_expr();
          let body;
          let alternate = null;
          let shortForm = false;
          if (this.token === ":") {
            shortForm = true;
            body = this.node("block");
            this.next();
            const items = [];
            while (this.token !== this.EOF && this.token !== this.tok.T_ENDIF) {
              if (this.token === this.tok.T_ELSEIF) {
                alternate = this.read_elseif_short();
                break;
              } else if (this.token === this.tok.T_ELSE) {
                alternate = this.read_else_short();
                break;
              }
              items.push(this.read_inner_statement());
            }
            if (items.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
              items.push(this.node("noop")());
            }
            body = body(null, items);
            this.expect(this.tok.T_ENDIF) && this.next();
            this.expectEndOfStatement();
          } else {
            body = this.read_statement();
            if (this.token === this.tok.T_ELSEIF) {
              alternate = this.read_if();
            } else if (this.token === this.tok.T_ELSE) {
              alternate = this.next().read_statement();
            }
          }
          return result(test, body, alternate, shortForm);
        },
        /*
         * reads an if expression : '(' expr ')'
         */
        read_if_expr() {
          this.expect("(") && this.next();
          const result = this.read_expr();
          this.expect(")") && this.next();
          return result;
        },
        /*
         * reads an elseif (expr): statements
         */
        read_elseif_short() {
          let alternate = null;
          const result = this.node("if");
          const test = this.next().read_if_expr();
          const body = this.node("block");
          if (this.expect(":")) this.next();
          const items = [];
          while (this.token != this.EOF && this.token !== this.tok.T_ENDIF) {
            if (this.token === this.tok.T_ELSEIF) {
              alternate = this.read_elseif_short();
              break;
            } else if (this.token === this.tok.T_ELSE) {
              alternate = this.read_else_short();
              break;
            }
            items.push(this.read_inner_statement());
          }
          if (items.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
            items.push(this.node("noop")());
          }
          return result(test, body(null, items), alternate, true);
        },
        /*
         *
         */
        read_else_short() {
          this.next();
          const body = this.node("block");
          if (this.expect(":")) this.next();
          const items = [];
          while (this.token != this.EOF && this.token !== this.tok.T_ENDIF) {
            items.push(this.read_inner_statement());
          }
          if (items.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
            items.push(this.node("noop")());
          }
          return body(null, items);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/loops.js
  var require_loops = __commonJS({
    "node_modules/php-parser/src/parser/loops.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a while statement
         * ```ebnf
         * while ::= T_WHILE (statement | ':' inner_statement_list T_ENDWHILE ';')
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L587
         * @return {While}
         */
        read_while() {
          const result = this.node("while");
          this.expect(this.tok.T_WHILE) && this.next();
          let body;
          let shortForm = false;
          if (this.expect("(")) this.next();
          const test = this.read_expr();
          if (this.expect(")")) this.next();
          if (this.token === ":") {
            shortForm = true;
            body = this.read_short_form(this.tok.T_ENDWHILE);
          } else {
            body = this.read_statement();
          }
          return result(test, body, shortForm);
        },
        /*
         * Reads a do / while loop
         * ```ebnf
         * do ::= T_DO statement T_WHILE '(' expr ')' ';'
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L423
         * @return {Do}
         */
        read_do() {
          const result = this.node("do");
          this.expect(this.tok.T_DO) && this.next();
          let test = null;
          const body = this.read_statement();
          if (this.expect(this.tok.T_WHILE)) {
            if (this.next().expect("(")) this.next();
            test = this.read_expr();
            if (this.expect(")")) this.next();
            if (this.expect(";")) this.next();
          }
          return result(test, body);
        },
        /*
         * Read a for incremental loop
         * ```ebnf
         * for ::= T_FOR '(' for_exprs ';' for_exprs ';' for_exprs ')' for_statement
         * for_statement ::= statement | ':' inner_statement_list T_ENDFOR ';'
         * for_exprs ::= expr? (',' expr)*
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L425
         * @return {For}
         */
        read_for() {
          const result = this.node("for");
          this.expect(this.tok.T_FOR) && this.next();
          let init = [];
          let test = [];
          let increment = [];
          let body;
          let shortForm = false;
          if (this.expect("(")) this.next();
          if (this.token !== ";") {
            init = this.read_list(this.read_expr, ",");
            if (this.expect(";")) this.next();
          } else {
            this.next();
          }
          if (this.token !== ";") {
            test = this.read_list(this.read_expr, ",");
            if (this.expect(";")) this.next();
          } else {
            this.next();
          }
          if (this.token !== ")") {
            increment = this.read_list(this.read_expr, ",");
            if (this.expect(")")) this.next();
          } else {
            this.next();
          }
          if (this.token === ":") {
            shortForm = true;
            body = this.read_short_form(this.tok.T_ENDFOR);
          } else {
            body = this.read_statement();
          }
          return result(init, test, increment, body, shortForm);
        },
        /*
         * Reads a foreach loop
         * ```ebnf
         * foreach ::= '(' expr T_AS foreach_variable (T_DOUBLE_ARROW foreach_variable)? ')' statement
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L438
         * @return {Foreach}
         */
        read_foreach() {
          const result = this.node("foreach");
          this.expect(this.tok.T_FOREACH) && this.next();
          let key = null;
          let value = null;
          let body;
          let shortForm = false;
          if (this.expect("(")) this.next();
          const source = this.read_expr();
          if (this.expect(this.tok.T_AS)) {
            this.next();
            value = this.read_foreach_variable();
            if (this.token === this.tok.T_DOUBLE_ARROW) {
              key = value;
              value = this.next().read_foreach_variable();
            }
          }
          if (key && key.kind === "list") {
            this.raiseError("Fatal Error : Cannot use list as key element");
          }
          if (this.expect(")")) this.next();
          if (this.token === ":") {
            shortForm = true;
            body = this.read_short_form(this.tok.T_ENDFOREACH);
          } else {
            body = this.read_statement();
          }
          return result(source, key, value, body, shortForm);
        },
        /*
         * Reads a foreach variable statement
         * ```ebnf
         * foreach_variable =
         *    variable |
         *    '&' variable |
         *    T_LIST '(' assignment_list ')' |
         *    '[' assignment_list ']'
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L544
         * @return {Expression}
         */
        read_foreach_variable() {
          if (this.token === this.tok.T_LIST || this.token === "[") {
            const isShort = this.token === "[";
            const result = this.node("list");
            this.next();
            if (!isShort && this.expect("(")) this.next();
            const assignList = this.read_array_pair_list(isShort);
            if (this.expect(isShort ? "]" : ")")) this.next();
            return result(assignList, isShort);
          } else {
            return this.read_variable(false, false);
          }
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/main.js
  var require_main = __commonJS({
    "node_modules/php-parser/src/parser/main.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * ```ebnf
         * start ::= (namespace | top_statement)*
         * ```
         */
        read_start() {
          if (this.token == this.tok.T_NAMESPACE) {
            return this.read_namespace();
          } else {
            return this.read_top_statement();
          }
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/namespace.js
  var require_namespace = __commonJS({
    "node_modules/php-parser/src/parser/namespace.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a namespace declaration block
         * ```ebnf
         * namespace ::= T_NAMESPACE namespace_name? '{'
         *    top_statements
         * '}'
         * | T_NAMESPACE namespace_name ';' top_statements
         * ```
         * @see http://php.net/manual/en/language.namespaces.php
         * @return {Namespace}
         */
        read_namespace() {
          const result = this.node("namespace");
          let body;
          this.expect(this.tok.T_NAMESPACE) && this.next();
          let name;
          if (this.token === "{") {
            name = {
              name: [""]
            };
          } else {
            name = this.read_namespace_name();
          }
          this.currentNamespace = name;
          if (this.token === ";") {
            this.currentNamespace = name;
            body = this.next().read_top_statements(true);
            return result(name.name, body, false);
          } else if (this.token === "{") {
            this.currentNamespace = name;
            body = this.next().read_top_statements();
            this.expect("}") && this.next();
            if (body.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
              body.push(this.node("noop")());
            }
            return result(name.name, body, true);
          } else {
            this.error(["{", ";"]);
            this.currentNamespace = name;
            body = this.read_top_statements();
            this.expect(this.EOF);
            return result(name, body, false);
          }
        },
        /*
         * Reads a namespace name
         * ```ebnf
         *  namespace_name ::= T_NS_SEPARATOR? (T_STRING T_NS_SEPARATOR)* T_STRING
         * ```
         * @see http://php.net/manual/en/language.namespaces.rules.php
         * @return {Reference}
         */
        read_namespace_name(resolveReference) {
          const result = this.node();
          let resolution;
          let name = this.text();
          switch (this.token) {
            case this.tok.T_NAME_RELATIVE:
              resolution = this.ast.name.RELATIVE_NAME;
              name = name.replace(/^namespace\\/, "");
              break;
            case this.tok.T_NAME_QUALIFIED:
              resolution = this.ast.name.QUALIFIED_NAME;
              break;
            case this.tok.T_NAME_FULLY_QUALIFIED:
              resolution = this.ast.name.FULL_QUALIFIED_NAME;
              break;
            default:
              resolution = this.ast.name.UNQUALIFIED_NAME;
              if (!this.expect(this.tok.T_STRING)) {
                return result("name", "", this.ast.name.FULL_QUALIFIED_NAME);
              }
          }
          this.next();
          if (resolveReference || this.token !== "(") {
            if (name.toLowerCase() === "parent") {
              return result("parentreference", name);
            } else if (name.toLowerCase() === "self") {
              return result("selfreference", name);
            }
          }
          return result("name", name, resolution);
        },
        /*
         * Reads a use statement
         * ```ebnf
         * use_statement ::= T_USE
         *   use_type? use_declarations |
         *   use_type use_statement '{' use_declarations '}' |
         *   use_statement '{' use_declarations(=>typed) '}'
         * ';'
         * ```
         * @see http://php.net/manual/en/language.namespaces.importing.php
         * @return {UseGroup}
         */
        read_use_statement() {
          let result = this.node("usegroup");
          let items = [];
          let name = null;
          this.expect(this.tok.T_USE) && this.next();
          const type = this.read_use_type();
          items.push(this.read_use_declaration(false));
          if (this.token === ",") {
            items = items.concat(this.next().read_use_declarations(false));
          } else if (this.token === "{") {
            name = items[0].name;
            items = this.next().read_use_declarations(type === null);
            this.expect("}") && this.next();
          }
          result = result(name, type, items);
          this.expect(";") && this.next();
          return result;
        },
        /*
         *
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L1045
         */
        read_class_name_reference() {
          return this.read_variable(true, false);
        },
        /*
         * Reads a use declaration
         * ```ebnf
         * use_declaration ::= use_type? namespace_name use_alias
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L380
         * @return {UseItem}
         */
        read_use_declaration(typed) {
          const result = this.node("useitem");
          let type = null;
          if (typed) type = this.read_use_type();
          const name = this.read_namespace_name();
          const alias = this.read_use_alias();
          return result(name.name, alias, type);
        },
        /*
         * Reads a list of use declarations
         * ```ebnf
         * use_declarations ::= use_declaration (',' use_declaration)*
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L380
         * @return {UseItem[]}
         */
        read_use_declarations(typed) {
          const result = [this.read_use_declaration(typed)];
          while (this.token === ",") {
            this.next();
            if (typed) {
              if (this.token !== this.tok.T_NAME_RELATIVE && this.token !== this.tok.T_NAME_QUALIFIED && this.token !== this.tok.T_NAME_FULLY_QUALIFIED && this.token !== this.tok.T_FUNCTION && this.token !== this.tok.T_CONST && this.token !== this.tok.T_STRING) {
                break;
              }
            } else if (this.token !== this.tok.T_NAME_RELATIVE && this.token !== this.tok.T_NAME_QUALIFIED && this.token !== this.tok.T_NAME_FULLY_QUALIFIED && this.token !== this.tok.T_STRING && this.token !== this.tok.T_NS_SEPARATOR) {
              break;
            }
            result.push(this.read_use_declaration(typed));
          }
          return result;
        },
        /*
         * Reads a use statement
         * ```ebnf
         * use_alias ::= (T_AS T_STRING)?
         * ```
         * @return {String|null}
         */
        read_use_alias() {
          let result = null;
          if (this.token === this.tok.T_AS) {
            if (this.next().expect(this.tok.T_STRING)) {
              const aliasName = this.node("identifier");
              const name = this.text();
              this.next();
              result = aliasName(name);
            }
          }
          return result;
        },
        /*
         * Reads the namespace type declaration
         * ```ebnf
         * use_type ::= (T_FUNCTION | T_CONST)?
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L335
         * @return {String|null} Possible values : function, const
         */
        read_use_type() {
          if (this.token === this.tok.T_FUNCTION) {
            this.next();
            return this.ast.useitem.TYPE_FUNCTION;
          } else if (this.token === this.tok.T_CONST) {
            this.next();
            return this.ast.useitem.TYPE_CONST;
          }
          return null;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/scalar.js
  var require_scalar = __commonJS({
    "node_modules/php-parser/src/parser/scalar.js"(exports, module) {
      "use strict";
      var specialChar = {
        "\\": "\\",
        $: "$",
        n: "\n",
        r: "\r",
        t: "	",
        f: String.fromCharCode(12),
        v: String.fromCharCode(11),
        e: String.fromCharCode(27)
      };
      module.exports = {
        /*
         * Unescape special chars
         */
        resolve_special_chars(text, doubleQuote) {
          if (!doubleQuote) {
            return text.replace(/\\\\/g, "\\").replace(/\\'/g, "'");
          }
          return text.replace(/\\"/g, '"').replace(
            /\\([\\$nrtfve]|[xX][0-9a-fA-F]{1,2}|[0-7]{1,3}|u{([0-9a-fA-F]+)})/g,
            ($match, p1, p2) => {
              if (specialChar[p1]) {
                return specialChar[p1];
              } else if ("x" === p1[0] || "X" === p1[0]) {
                return String.fromCodePoint(parseInt(p1.substr(1), 16));
              } else if ("u" === p1[0]) {
                return String.fromCodePoint(parseInt(p2, 16));
              } else {
                return String.fromCodePoint(parseInt(p1, 8));
              }
            }
          );
        },
        /*
         * Remove all leading spaces each line for heredoc text if there is a indentation
         * @param {string} text
         * @param {number} indentation
         * @param {boolean} indentation_uses_spaces
         * @param {boolean} first_encaps_node if it is behind a variable, the first N spaces should not be removed
         */
        remove_heredoc_leading_whitespace_chars(text, indentation, indentation_uses_spaces, first_encaps_node) {
          if (indentation === 0) {
            return text;
          }
          this.check_heredoc_indentation_level(
            text,
            indentation,
            indentation_uses_spaces,
            first_encaps_node
          );
          const matchedChar = indentation_uses_spaces ? " " : "	";
          const removementRegExp = new RegExp(
            `\\n${matchedChar}{${indentation}}`,
            "g"
          );
          const removementFirstEncapsNodeRegExp = new RegExp(
            `^${matchedChar}{${indentation}}`
          );
          if (first_encaps_node) {
            text = text.replace(removementFirstEncapsNodeRegExp, "");
          }
          return text.replace(removementRegExp, "\n");
        },
        /*
         * Check indentation level of heredoc in text, if mismatch, raiseError
         * @param {string} text
         * @param {number} indentation
         * @param {boolean} indentation_uses_spaces
         * @param {boolean} first_encaps_node if it is behind a variable, the first N spaces should not be removed
         */
        check_heredoc_indentation_level(text, indentation, indentation_uses_spaces, first_encaps_node) {
          const textSize = text.length;
          let offset = 0;
          let leadingWhitespaceCharCount = 0;
          let inCountingState = true;
          const chToCheck = indentation_uses_spaces ? " " : "	";
          let inCheckState = false;
          if (!first_encaps_node) {
            offset = text.indexOf("\n");
            if (offset === -1) {
              return;
            }
            offset++;
          }
          while (offset < textSize) {
            if (inCountingState) {
              if (text[offset] === chToCheck) {
                leadingWhitespaceCharCount++;
              } else {
                inCheckState = true;
              }
            }
            if (text[offset] !== "\n" && inCheckState && leadingWhitespaceCharCount < indentation) {
              this.raiseError(
                `Invalid body indentation level (expecting an indentation at least ${indentation})`
              );
            } else {
              inCheckState = false;
            }
            if (text[offset] === "\n") {
              inCountingState = true;
              leadingWhitespaceCharCount = 0;
            }
            offset++;
          }
        },
        /*
         * Reads dereferencable scalar
         */
        read_dereferencable_scalar() {
          let result = null;
          switch (this.token) {
            case this.tok.T_CONSTANT_ENCAPSED_STRING:
              {
                let value = this.node("string");
                const text = this.text();
                let offset = 0;
                if (text[0] === "b" || text[0] === "B") {
                  offset = 1;
                }
                const isDoubleQuote = text[offset] === '"';
                this.next();
                const textValue = this.resolve_special_chars(
                  text.substring(offset + 1, text.length - 1),
                  isDoubleQuote
                );
                value = value(
                  isDoubleQuote,
                  textValue,
                  offset === 1,
                  // unicode flag
                  text
                );
                if (this.token === this.tok.T_DOUBLE_COLON) {
                  result = this.read_static_getter(value);
                } else {
                  result = value;
                }
              }
              break;
            case this.tok.T_ARRAY:
              result = this.read_array();
              break;
            case "[":
              result = this.read_array();
              break;
          }
          return result;
        },
        /*
         * ```ebnf
         *  scalar ::= T_MAGIC_CONST
         *       | T_LNUMBER | T_DNUMBER
         *       | T_START_HEREDOC T_ENCAPSED_AND_WHITESPACE? T_END_HEREDOC
         *       | '"' encaps_list '"'
         *       | T_START_HEREDOC encaps_list T_END_HEREDOC
         *       | namespace_name (T_DOUBLE_COLON T_STRING)?
         * ```
         */
        read_scalar() {
          if (this.is("T_MAGIC_CONST")) {
            return this.get_magic_constant();
          } else {
            let value, node;
            switch (this.token) {
              // NUMERIC
              case this.tok.T_LNUMBER:
              // long
              case this.tok.T_DNUMBER: {
                const result = this.node("number");
                value = this.text();
                this.next();
                return result(value, null);
              }
              case this.tok.T_START_HEREDOC:
                if (this.lexer.curCondition === "ST_NOWDOC") {
                  const start = this.lexer.yylloc.first_offset;
                  node = this.node("nowdoc");
                  value = this.next().text();
                  if (this.lexer.heredoc_label.indentation > 0) {
                    value = value.substring(
                      0,
                      value.length - this.lexer.heredoc_label.indentation
                    );
                  }
                  const lastCh = value[value.length - 1];
                  if (lastCh === "\n") {
                    if (value[value.length - 2] === "\r") {
                      value = value.substring(0, value.length - 2);
                    } else {
                      value = value.substring(0, value.length - 1);
                    }
                  } else if (lastCh === "\r") {
                    value = value.substring(0, value.length - 1);
                  }
                  this.expect(this.tok.T_ENCAPSED_AND_WHITESPACE) && this.next();
                  this.expect(this.tok.T_END_HEREDOC) && this.next();
                  const raw = this.lexer._input.substring(
                    start,
                    this.lexer.yylloc.first_offset
                  );
                  node = node(
                    this.remove_heredoc_leading_whitespace_chars(
                      value,
                      this.lexer.heredoc_label.indentation,
                      this.lexer.heredoc_label.indentation_uses_spaces,
                      this.lexer.heredoc_label.first_encaps_node
                    ),
                    raw,
                    this.lexer.heredoc_label.label
                  );
                  this.lexer.heredoc_label.finished = true;
                  return node;
                } else {
                  return this.read_encapsed_string(this.tok.T_END_HEREDOC);
                }
              case '"':
                return this.read_encapsed_string('"');
              case 'b"':
              case 'B"': {
                return this.read_encapsed_string('"', true);
              }
              // TEXTS
              case this.tok.T_CONSTANT_ENCAPSED_STRING:
              case this.tok.T_ARRAY:
              // array parser
              case "[":
                return this.read_dereferencable_scalar();
              default: {
                const err = this.error("SCALAR");
                this.next();
                return err;
              }
            }
          }
        },
        /*
         * Handles the dereferencing
         */
        read_dereferencable(expr2) {
          let result, offset;
          const node = this.node("offsetlookup");
          if (this.token === "[") {
            offset = this.next().read_expr();
            if (this.expect("]")) this.next();
            result = node(expr2, offset);
          } else if (this.token === this.tok.T_DOLLAR_OPEN_CURLY_BRACES) {
            offset = this.read_encapsed_string_item(false);
            result = node(expr2, offset);
          }
          return result;
        },
        /*
         * Reads and extracts an encapsed item
         * ```ebnf
         * encapsed_string_item ::= T_ENCAPSED_AND_WHITESPACE
         *  | T_DOLLAR_OPEN_CURLY_BRACES expr '}'
         *  | T_DOLLAR_OPEN_CURLY_BRACES T_STRING_VARNAME '}'
         *  | T_DOLLAR_OPEN_CURLY_BRACES T_STRING_VARNAME '[' expr ']' '}'
         *  | T_CURLY_OPEN variable '}'
         *  | variable
         *  | variable '[' expr ']'
         *  | variable T_OBJECT_OPERATOR T_STRING
         * ```
         * @return {String|Variable|Expr|Lookup}
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L1219
         */
        read_encapsed_string_item(isDoubleQuote) {
          const encapsedPart = this.node("encapsedpart");
          let syntax = null;
          let curly = false;
          let result = this.node(), offset, node, name;
          if (this.token === this.tok.T_ENCAPSED_AND_WHITESPACE) {
            const text = this.text();
            this.next();
            result = result(
              "string",
              false,
              this.version >= 703 && !this.lexer.heredoc_label.finished ? this.resolve_special_chars(
                this.remove_heredoc_leading_whitespace_chars(
                  text,
                  this.lexer.heredoc_label.indentation,
                  this.lexer.heredoc_label.indentation_uses_spaces,
                  this.lexer.heredoc_label.first_encaps_node
                ),
                isDoubleQuote
              ) : this.resolve_special_chars(text, isDoubleQuote),
              false,
              text
            );
          } else if (this.token === this.tok.T_DOLLAR_OPEN_CURLY_BRACES) {
            syntax = "simple";
            curly = true;
            if (this.next().token === this.tok.T_STRING_VARNAME) {
              name = this.node("variable");
              const varName = this.text();
              this.next();
              result.destroy();
              if (this.token === "[") {
                name = name(varName, false);
                node = this.node("offsetlookup");
                offset = this.next().read_expr();
                this.expect("]") && this.next();
                result = node(name, offset);
              } else {
                result = name(varName, false);
              }
            } else {
              result = result("variable", this.read_expr(), false);
            }
            this.expect("}") && this.next();
          } else if (this.token === this.tok.T_CURLY_OPEN) {
            syntax = "complex";
            result.destroy();
            result = this.next().read_variable(false, false);
            this.expect("}") && this.next();
          } else if (this.token === this.tok.T_VARIABLE) {
            syntax = "simple";
            result.destroy();
            result = this.read_simple_variable();
            if (this.token === "[") {
              node = this.node("offsetlookup");
              offset = this.next().read_encaps_var_offset();
              this.expect("]") && this.next();
              result = node(result, offset);
            }
            if (this.token === this.tok.T_OBJECT_OPERATOR) {
              node = this.node("propertylookup");
              this.next().expect(this.tok.T_STRING);
              const what = this.node("identifier");
              name = this.text();
              this.next();
              result = node(result, what(name));
            }
          } else {
            this.expect(this.tok.T_ENCAPSED_AND_WHITESPACE);
            const value = this.text();
            this.next();
            result.destroy();
            result = result("string", false, value, false, value);
          }
          this.lexer.heredoc_label.first_encaps_node = false;
          return encapsedPart(result, syntax, curly);
        },
        /*
         * Reads an encapsed string
         */
        read_encapsed_string(expect, isBinary = false) {
          const labelStart = this.lexer.yylloc.first_offset;
          let node = this.node("encapsed");
          this.next();
          const start = this.lexer.yylloc.prev_offset - (isBinary ? 1 : 0);
          const value = [];
          let type;
          if (expect === "`") {
            type = this.ast.encapsed.TYPE_SHELL;
          } else if (expect === '"') {
            type = this.ast.encapsed.TYPE_STRING;
          } else {
            type = this.ast.encapsed.TYPE_HEREDOC;
          }
          while (this.token !== expect && this.token !== this.EOF) {
            value.push(this.read_encapsed_string_item(true));
          }
          if (type === this.ast.encapsed.TYPE_HEREDOC && value.length > 0 && value[value.length - 1].kind === "encapsedpart" && value[value.length - 1].expression.kind === "string") {
            const node2 = value[value.length - 1].expression;
            const lastCh = node2.value[node2.value.length - 1];
            if (lastCh === "\n") {
              if (node2.value[node2.value.length - 2] === "\r") {
                node2.value = node2.value.substring(0, node2.value.length - 2);
              } else {
                node2.value = node2.value.substring(0, node2.value.length - 1);
              }
            } else if (lastCh === "\r") {
              node2.value = node2.value.substring(0, node2.value.length - 1);
            }
          }
          this.expect(expect) && this.next();
          const raw = this.lexer._input.substring(
            type === "heredoc" ? labelStart : start - 1,
            this.lexer.yylloc.first_offset
          );
          node = node(value, raw, type);
          if (expect === this.tok.T_END_HEREDOC) {
            node.label = this.lexer.heredoc_label.label;
            this.lexer.heredoc_label.finished = true;
          }
          return node;
        },
        /*
         * Constant token
         */
        get_magic_constant() {
          const result = this.node("magic");
          const name = this.text();
          this.next();
          return result(name.toUpperCase(), name);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/statement.js
  var require_statement = __commonJS({
    "node_modules/php-parser/src/parser/statement.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * reading a list of top statements (helper for top_statement*)
         * ```ebnf
         *  top_statements ::= top_statement*
         * ```
         */
        read_top_statements(stopAtNamespace) {
          let result = [];
          while (this.token !== this.EOF && this.token !== "}") {
            if (stopAtNamespace && this.token === this.tok.T_NAMESPACE) break;
            const statement = this.read_top_statement();
            if (statement) {
              if (Array.isArray(statement)) {
                result = result.concat(statement);
              } else {
                result.push(statement);
              }
            }
          }
          return result;
        },
        /*
         * reading a top statement
         * ```ebnf
         *  top_statement ::=
         *       namespace | function | class
         *       | interface | trait
         *       | use_statements | const_list
         *       | statement
         * ```
         */
        read_top_statement() {
          let attrs = [];
          if (this.token === this.tok.T_ATTRIBUTE) {
            attrs = this.read_attr_list();
          }
          switch (this.token) {
            case this.tok.T_FUNCTION:
              return this.read_function(false, false, attrs);
            // optional flags
            case this.tok.T_ABSTRACT:
            case this.tok.T_FINAL:
            case this.tok.T_READ_ONLY:
            case this.tok.T_CLASS:
              return this.read_class_declaration_statement(attrs);
            case this.tok.T_INTERFACE:
              return this.read_interface_declaration_statement(attrs);
            case this.tok.T_TRAIT:
              return this.read_trait_declaration_statement(attrs);
            case this.tok.T_ENUM:
              return this.read_enum_declaration_statement(attrs);
            case this.tok.T_USE:
              return this.read_use_statement();
            case this.tok.T_CONST: {
              const result = this.node("constantstatement");
              const items = this.next().read_const_list();
              this.expectEndOfStatement();
              return result(null, items);
            }
            case this.tok.T_NAMESPACE:
              return this.read_namespace();
            case this.tok.T_HALT_COMPILER: {
              const result = this.node("halt");
              if (this.next().expect("(")) this.next();
              if (this.expect(")")) this.next();
              this.expect(";");
              this.lexer.done = true;
              return result(this.lexer._input.substring(this.lexer.offset));
            }
            default:
              return this.read_statement();
          }
        },
        /*
         * reads a list of simple inner statements (helper for inner_statement*)
         * ```ebnf
         *  inner_statements ::= inner_statement*
         * ```
         */
        read_inner_statements() {
          let result = [];
          while (this.token != this.EOF && this.token !== "}") {
            const statement = this.read_inner_statement();
            if (statement) {
              if (Array.isArray(statement)) {
                result = result.concat(statement);
              } else {
                result.push(statement);
              }
            }
          }
          return result;
        },
        /*
         * Reads a list of constants declaration
         * ```ebnf
         *   const_list ::= T_CONST T_STRING '=' expr (',' T_STRING '=' expr)* ';'
         * ```
         */
        read_const_list() {
          return this.read_list(
            function() {
              this.expect(this.tok.T_STRING);
              const result = this.node("constant");
              let constName = this.node("identifier");
              const name = this.text();
              this.next();
              constName = constName(name);
              if (this.expect("=")) {
                return result(constName, this.next().read_expr());
              } else {
                return result(constName, null);
              }
            },
            ",",
            false
          );
        },
        /*
         * Reads a list of constants declaration
         * ```ebnf
         *   declare_list ::= IDENTIFIER '=' expr (',' IDENTIFIER '=' expr)*
         * ```
         * @retrurn {Array}
         */
        read_declare_list() {
          const result = [];
          while (this.token != this.EOF && this.token !== ")") {
            this.expect(this.tok.T_STRING);
            const directive = this.node("declaredirective");
            let key = this.node("identifier");
            const name = this.text();
            this.next();
            key = key(name);
            let value = null;
            if (this.expect("=")) {
              value = this.next().read_expr();
            }
            result.push(directive(key, value));
            if (this.token !== ",") break;
            this.next();
          }
          return result;
        },
        /*
         * reads a simple inner statement
         * ```ebnf
         *  inner_statement ::= '{' inner_statements '}' | token
         * ```
         */
        read_inner_statement() {
          let attrs = [];
          if (this.token === this.tok.T_ATTRIBUTE) {
            attrs = this.read_attr_list();
          }
          switch (this.token) {
            case this.tok.T_FUNCTION: {
              const result = this.read_function(false, false);
              result.attrGroups = attrs;
              return result;
            }
            // optional flags
            case this.tok.T_ABSTRACT:
            case this.tok.T_FINAL:
            case this.tok.T_CLASS:
              return this.read_class_declaration_statement();
            case this.tok.T_INTERFACE:
              return this.read_interface_declaration_statement();
            case this.tok.T_TRAIT:
              return this.read_trait_declaration_statement(attrs);
            case this.tok.T_ENUM:
              return this.read_enum_declaration_statement(attrs);
            case this.tok.T_HALT_COMPILER: {
              this.raiseError(
                "__HALT_COMPILER() can only be used from the outermost scope"
              );
              let node = this.node("halt");
              this.next().expect("(") && this.next();
              this.expect(")") && this.next();
              node = node(this.lexer._input.substring(this.lexer.offset));
              this.expect(";") && this.next();
              return node;
            }
            default:
              return this.read_statement();
          }
        },
        /*
         * Reads statements
         */
        read_statement() {
          switch (this.token) {
            case "{":
              return this.read_code_block(false);
            case this.tok.T_IF:
              return this.read_if();
            case this.tok.T_SWITCH:
              return this.read_switch();
            case this.tok.T_FOR:
              return this.read_for();
            case this.tok.T_FOREACH:
              return this.read_foreach();
            case this.tok.T_WHILE:
              return this.read_while();
            case this.tok.T_DO:
              return this.read_do();
            case this.tok.T_COMMENT:
              return this.read_comment();
            case this.tok.T_DOC_COMMENT:
              return this.read_doc_comment();
            case this.tok.T_RETURN: {
              const result = this.node("return");
              this.next();
              const expr2 = this.read_optional_expr(";");
              this.expectEndOfStatement();
              return result(expr2);
            }
            // https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L429
            case this.tok.T_BREAK:
            case this.tok.T_CONTINUE: {
              const result = this.node(
                this.token === this.tok.T_CONTINUE ? "continue" : "break"
              );
              this.next();
              const level = this.read_optional_expr(";");
              this.expectEndOfStatement();
              return result(level);
            }
            case this.tok.T_GLOBAL: {
              const result = this.node("global");
              const items = this.next().read_list(this.read_simple_variable, ",");
              this.expectEndOfStatement();
              return result(items);
            }
            case this.tok.T_STATIC: {
              const current = [this.token, this.lexer.getState()];
              const result = this.node();
              if (this.next().token === this.tok.T_DOUBLE_COLON) {
                this.lexer.tokens.push(current);
                const expr2 = this.next().read_expr();
                this.expectEndOfStatement(expr2);
                return result("expressionstatement", expr2);
              }
              if (this.token === this.tok.T_FUNCTION) {
                return this.read_function(true, [0, 1, 0]);
              }
              const items = this.read_variable_declarations();
              this.expectEndOfStatement();
              return result("static", items);
            }
            case this.tok.T_ECHO: {
              const result = this.node("echo");
              const text = this.text();
              const shortForm = text === "<?=" || text === "<%=";
              const expressions = this.next().read_function_list(this.read_expr, ",");
              this.expectEndOfStatement();
              return result(expressions, shortForm);
            }
            case this.tok.T_INLINE_HTML: {
              const value = this.text();
              let prevChar = this.lexer.yylloc.first_offset > 0 ? this.lexer._input[this.lexer.yylloc.first_offset - 1] : null;
              const fixFirstLine = prevChar === "\r" || prevChar === "\n";
              if (fixFirstLine) {
                if (prevChar === "\n" && this.lexer.yylloc.first_offset > 1 && this.lexer._input[this.lexer.yylloc.first_offset - 2] === "\r") {
                  prevChar = "\r\n";
                }
              }
              const result = this.node("inline");
              this.next();
              return result(value, fixFirstLine ? prevChar + value : value);
            }
            case this.tok.T_UNSET: {
              const result = this.node("unset");
              this.next().expect("(") && this.next();
              const variables = this.read_function_list(this.read_variable, ",");
              this.expect(")") && this.next();
              this.expect(";") && this.next();
              return result(variables);
            }
            case this.tok.T_DECLARE: {
              const result = this.node("declare");
              const body = [];
              let mode;
              this.next().expect("(") && this.next();
              const directives = this.read_declare_list();
              this.expect(")") && this.next();
              if (this.token === ":") {
                this.next();
                while (this.token != this.EOF && this.token !== this.tok.T_ENDDECLARE) {
                  body.push(this.read_top_statement());
                }
                if (body.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
                  body.push(this.node("noop")());
                }
                this.expect(this.tok.T_ENDDECLARE) && this.next();
                this.expectEndOfStatement();
                mode = this.ast.declare.MODE_SHORT;
              } else if (this.token === "{") {
                this.next();
                while (this.token != this.EOF && this.token !== "}") {
                  body.push(this.read_top_statement());
                }
                if (body.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
                  body.push(this.node("noop")());
                }
                this.expect("}") && this.next();
                mode = this.ast.declare.MODE_BLOCK;
              } else {
                this.expect(";") && this.next();
                mode = this.ast.declare.MODE_NONE;
              }
              return result(directives, body, mode);
            }
            case this.tok.T_TRY:
              return this.read_try();
            case this.tok.T_THROW: {
              const result = this.node("throw");
              const expr2 = this.next().read_expr();
              this.expectEndOfStatement();
              return result(expr2);
            }
            // ignore this (extra ponctuation)
            case ";": {
              this.next();
              return null;
            }
            case this.tok.T_STRING: {
              const result = this.node();
              const current = [this.token, this.lexer.getState()];
              const labelNameText = this.text();
              let labelName = this.node("identifier");
              if (this.next().token === ":") {
                labelName = labelName(labelNameText);
                this.next();
                return result("label", labelName);
              } else {
                labelName.destroy();
              }
              result.destroy();
              this.lexer.tokens.push(current);
              const statement = this.node("expressionstatement");
              const expr2 = this.next().read_expr();
              this.expectEndOfStatement(expr2);
              return statement(expr2);
            }
            case this.tok.T_GOTO: {
              const result = this.node("goto");
              let labelName = null;
              if (this.next().expect(this.tok.T_STRING)) {
                labelName = this.node("identifier");
                const name = this.text();
                this.next();
                labelName = labelName(name);
                this.expectEndOfStatement();
              }
              return result(labelName);
            }
            default: {
              const statement = this.node("expressionstatement");
              const expr2 = this.read_expr();
              this.expectEndOfStatement(expr2);
              return statement(expr2);
            }
          }
        },
        /*
         * ```ebnf
         *  code_block ::= '{' (inner_statements | top_statements) '}'
         * ```
         */
        read_code_block(top) {
          const result = this.node("block");
          this.expect("{") && this.next();
          const body = top ? this.read_top_statements() : this.read_inner_statements();
          if (body.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
            body.push(this.node("noop")());
          }
          this.expect("}") && this.next();
          return result(null, body);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/switch.js
  var require_switch = __commonJS({
    "node_modules/php-parser/src/parser/switch.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a switch statement
         * ```ebnf
         *  switch ::= T_SWITCH '(' expr ')' switch_case_list
         * ```
         * @return {Switch}
         * @see http://php.net/manual/en/control-structures.switch.php
         */
        read_switch() {
          const result = this.node("switch");
          this.expect(this.tok.T_SWITCH) && this.next();
          this.expect("(") && this.next();
          const test = this.read_expr();
          this.expect(")") && this.next();
          const shortForm = this.token === ":";
          const body = this.read_switch_case_list();
          return result(test, body, shortForm);
        },
        /*
         * ```ebnf
         *  switch_case_list ::= '{' ';'? case_list* '}' | ':' ';'? case_list* T_ENDSWITCH ';'
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L566
         */
        read_switch_case_list() {
          let expect = null;
          const result = this.node("block");
          const items = [];
          if (this.token === "{") {
            expect = "}";
          } else if (this.token === ":") {
            expect = this.tok.T_ENDSWITCH;
          } else {
            this.expect(["{", ":"]);
          }
          this.next();
          if (this.token === ";") {
            this.next();
          }
          while (this.token !== this.EOF && this.token !== expect) {
            items.push(this.read_case_list(expect));
          }
          if (items.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
            items.push(this.node("noop")());
          }
          this.expect(expect) && this.next();
          if (expect === this.tok.T_ENDSWITCH) {
            this.expectEndOfStatement();
          }
          return result(null, items);
        },
        /*
         * ```ebnf
         *   case_list ::= ((T_CASE expr) | T_DEFAULT) (':' | ';') inner_statement*
         * ```
         */
        read_case_list(stopToken) {
          const result = this.node("case");
          let test = null;
          if (this.token === this.tok.T_CASE) {
            test = this.next().read_expr();
          } else if (this.token === this.tok.T_DEFAULT) {
            this.next();
          } else {
            this.expect([this.tok.T_CASE, this.tok.T_DEFAULT]);
          }
          this.expect([":", ";"]) && this.next();
          const body = this.node("block");
          const items = [];
          while (this.token !== this.EOF && this.token !== stopToken && this.token !== this.tok.T_CASE && this.token !== this.tok.T_DEFAULT) {
            items.push(this.read_inner_statement());
          }
          return result(test, body(null, items));
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/try.js
  var require_try = __commonJS({
    "node_modules/php-parser/src/parser/try.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * ```ebnf
         *  try ::= T_TRY '{' inner_statement* '}'
         *          (
         *              T_CATCH '(' namespace_name (variable)? ')' '{'  inner_statement* '}'
         *          )*
         *          (T_FINALLY '{' inner_statement* '}')?
         * ```
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L448
         * @return {Try}
         */
        read_try() {
          this.expect(this.tok.T_TRY);
          const result = this.node("try");
          let always = null;
          const catches = [];
          const body = this.next().read_statement();
          while (this.token === this.tok.T_CATCH) {
            const item = this.node("catch");
            this.next().expect("(") && this.next();
            const what = this.read_list(this.read_namespace_name, "|", false);
            let variable = null;
            if (this.version < 800 || this.token === this.tok.T_VARIABLE) {
              variable = this.read_variable(true, false);
            }
            this.expect(")");
            catches.push(item(this.next().read_statement(), what, variable));
          }
          if (this.token === this.tok.T_FINALLY) {
            always = this.next().read_statement();
          }
          return result(body, catches, always);
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/utils.js
  var require_utils2 = __commonJS({
    "node_modules/php-parser/src/parser/utils.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a short form of tokens
         * @param {Number} token - The ending token
         * @return {Block}
         */
        read_short_form(token) {
          const body = this.node("block");
          const items = [];
          if (this.expect(":")) this.next();
          while (this.token != this.EOF && this.token !== token) {
            items.push(this.read_inner_statement());
          }
          if (items.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
            items.push(this.node("noop")());
          }
          if (this.expect(token)) this.next();
          this.expectEndOfStatement();
          return body(null, items);
        },
        /*
         * https://wiki.php.net/rfc/trailing-comma-function-calls
         * @param {*} item
         * @param {*} separator
         */
        read_function_list(item, separator) {
          const result = [];
          do {
            if (this.token == separator && this.version >= 703 && result.length > 0) {
              result.push(this.node("noop")());
              break;
            }
            result.push(item.apply(this, []));
            if (this.token != separator) {
              break;
            }
            if (this.next().token == ")" && this.version >= 703) {
              break;
            }
          } while (this.token != this.EOF);
          return result;
        },
        /*
         * Helper : reads a list of tokens / sample : T_STRING ',' T_STRING ...
         * ```ebnf
         * list ::= separator? ( item separator )* item
         * ```
         */
        read_list(item, separator, preserveFirstSeparator) {
          const result = [];
          if (this.token == separator) {
            if (preserveFirstSeparator) {
              result.push(typeof item === "function" ? this.node("noop")() : null);
              this.next();
            } else {
              this.error();
              return result;
            }
          }
          if (typeof item === "function") {
            do {
              const itemResult = item.apply(this, []);
              if (itemResult) {
                result.push(itemResult);
              }
              if (this.token != separator) {
                break;
              }
            } while (this.next().token != this.EOF);
          } else {
            if (this.expect(item)) {
              result.push(this.text());
            } else {
              return [];
            }
            while (this.next().token != this.EOF) {
              if (this.token != separator) break;
              if (this.next().token != item) break;
              result.push(this.text());
            }
          }
          return result;
        },
        /*
         * Reads a list of names separated by a comma
         *
         * ```ebnf
         * name_list ::= namespace (',' namespace)*
         * ```
         *
         * Sample code :
         * ```php
         * <?php class foo extends bar, baz { }
         * ```
         *
         * @see https://github.com/php/php-src/blob/master/Zend/zend_language_parser.y#L726
         * @return {Reference[]}
         */
        read_name_list() {
          return this.read_list(this.read_namespace_name, ",", false);
        },
        /*
         * Reads the byref token and assign it to the specified node
         * @param {*} cb
         */
        read_byref(cb) {
          let byref = this.node("byref");
          this.next();
          byref = byref(null);
          const result = cb();
          if (result) {
            this.ast.swapLocations(result, byref, result, this);
            result.byref = true;
          }
          return result;
        },
        /*
         * Reads a list of variables declarations
         *
         * ```ebnf
         * variable_declaration ::= T_VARIABLE ('=' expr)?*
         * variable_declarations ::= variable_declaration (',' variable_declaration)*
         * ```
         *
         * Sample code :
         * ```php
         * <?php static $a = 'hello', $b = 'world';
         * ```
         * @return {StaticVariable[]} Returns an array composed by a list of variables, or
         * assign values
         */
        read_variable_declarations() {
          return this.read_list(function() {
            const node = this.node("staticvariable");
            let variable = this.node("variable");
            if (this.expect(this.tok.T_VARIABLE)) {
              const name = this.text().substring(1);
              this.next();
              variable = variable(name, false);
            } else {
              variable = variable("#ERR", false);
            }
            if (this.token === "=") {
              return node(variable, this.next().read_expr());
            } else {
              return variable;
            }
          }, ",");
        },
        /*
         * Reads class extends
         */
        read_extends_from() {
          if (this.token === this.tok.T_EXTENDS) {
            return this.next().read_namespace_name();
          }
          return null;
        },
        /*
         * Reads interface extends list
         */
        read_interface_extends_list() {
          if (this.token === this.tok.T_EXTENDS) {
            return this.next().read_name_list();
          }
          return null;
        },
        /*
         * Reads implements list
         */
        read_implements_list() {
          if (this.token === this.tok.T_IMPLEMENTS) {
            return this.next().read_name_list();
          }
          return null;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser/variable.js
  var require_variable = __commonJS({
    "node_modules/php-parser/src/parser/variable.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Reads a variable
         *
         * ```ebnf
         *   variable ::= &? ...complex @todo
         * ```
         *
         * Some samples of parsed code :
         * ```php
         *  &$var                      // simple var
         *  $var                      // simple var
         *  classname::CONST_NAME     // dynamic class name with const retrieval
         *  foo()                     // function call
         *  $var->func()->property    // chained calls
         * ```
         */
        read_variable(read_only, encapsed) {
          let result;
          if (this.token === "&") {
            return this.read_byref(
              this.read_variable.bind(this, read_only, encapsed)
            );
          }
          if (this.is([this.tok.T_VARIABLE, "$"])) {
            result = this.read_reference_variable(encapsed);
          } else if (this.is([
            this.tok.T_NS_SEPARATOR,
            this.tok.T_STRING,
            this.tok.T_NAME_RELATIVE,
            this.tok.T_NAME_QUALIFIED,
            this.tok.T_NAME_FULLY_QUALIFIED,
            this.tok.T_NAMESPACE
          ])) {
            result = this.node();
            const name = this.read_namespace_name();
            if (this.token != this.tok.T_DOUBLE_COLON && this.token != "(" && ["parentreference", "selfreference"].indexOf(name.kind) === -1) {
              const literal = name.name.toLowerCase();
              if (literal === "true") {
                result = name.destroy(result("boolean", true, name.name));
              } else if (literal === "false") {
                result = name.destroy(result("boolean", false, name.name));
              } else if (literal === "null") {
                result = name.destroy(result("nullkeyword", name.name));
              } else {
                result.destroy(name);
                result = name;
              }
            } else {
              result.destroy(name);
              result = name;
            }
          } else if (this.token === this.tok.T_STATIC) {
            result = this.node("staticreference");
            const raw = this.text();
            this.next();
            result = result(raw);
          } else {
            this.expect("VARIABLE");
          }
          if (this.token === this.tok.T_DOUBLE_COLON) {
            result = this.read_static_getter(result, encapsed);
          }
          return this.recursive_variable_chain_scan(result, read_only, encapsed);
        },
        // resolves a static call
        read_static_getter(what, encapsed) {
          const result = this.node("staticlookup");
          let offset, name;
          if (this.next().is([this.tok.T_VARIABLE, "$"])) {
            offset = this.read_reference_variable(encapsed);
          } else if (this.token === this.tok.T_STRING || this.token === this.tok.T_CLASS || this.version >= 700 && this.is("IDENTIFIER")) {
            offset = this.node("identifier");
            name = this.text();
            this.next();
            offset = offset(name);
          } else if (this.token === "{") {
            offset = this.node("literal");
            name = this.next().read_expr();
            this.expect("}") && this.next();
            offset = offset("literal", name, null);
          } else {
            this.error([this.tok.T_VARIABLE, this.tok.T_STRING]);
            offset = this.node("identifier");
            name = this.text();
            this.next();
            offset = offset(name);
          }
          return result(what, offset);
        },
        read_what(is_static_lookup = false) {
          let what;
          let name;
          switch (this.next().token) {
            case this.tok.T_STRING:
              what = this.node("identifier");
              name = this.text();
              this.next();
              what = what(name);
              if (is_static_lookup && this.token === this.tok.T_OBJECT_OPERATOR) {
                this.error();
              }
              break;
            case this.tok.T_VARIABLE:
              what = this.node("variable");
              name = this.text().substring(1);
              this.next();
              what = what(name, false);
              break;
            case this.tok.T_CLASS:
              if (!is_static_lookup) {
                this.error();
              }
              what = this.node("identifier");
              name = this.text();
              this.next();
              what = what(name, false);
              break;
            case "$":
              what = this.node();
              this.next().expect(["$", "{", this.tok.T_VARIABLE]);
              if (this.token === "{") {
                name = this.next().read_expr();
                this.expect("}") && this.next();
                what = what("variable", name, true);
              } else {
                name = this.read_expr();
                what = what("variable", name, false);
              }
              break;
            case "{":
              what = this.node("encapsedpart");
              name = this.next().read_expr();
              this.expect("}") && this.next();
              what = what(name, "complex", false);
              break;
            default:
              this.error([this.tok.T_STRING, this.tok.T_VARIABLE, "$", "{"]);
              what = this.node("identifier");
              name = this.text();
              this.next();
              what = what(name);
              break;
          }
          return what;
        },
        recursive_variable_chain_scan(result, read_only, encapsed) {
          let node, offset;
          recursive_scan_loop: while (this.token != this.EOF) {
            switch (this.token) {
              case "(":
                if (read_only) {
                  return result;
                } else {
                  result = this.node("call")(result, this.read_argument_list());
                }
                break;
              case "[":
              case "{": {
                const backet = this.token;
                const isSquareBracket = backet === "[";
                node = this.node("offsetlookup");
                this.next();
                offset = false;
                if (encapsed) {
                  offset = this.read_encaps_var_offset();
                  this.expect(isSquareBracket ? "]" : "}") && this.next();
                } else {
                  const isCallableVariable = isSquareBracket ? this.token !== "]" : this.token !== "}";
                  if (isCallableVariable) {
                    offset = this.read_expr();
                    this.expect(isSquareBracket ? "]" : "}") && this.next();
                  } else {
                    this.next();
                  }
                }
                result = node(result, offset);
                break;
              }
              case this.tok.T_DOUBLE_COLON:
                node = this.node("staticlookup");
                result = node(result, this.read_what(true));
                break;
              case this.tok.T_OBJECT_OPERATOR: {
                node = this.node("propertylookup");
                result = node(result, this.read_what());
                break;
              }
              case this.tok.T_NULLSAFE_OBJECT_OPERATOR: {
                node = this.node("nullsafepropertylookup");
                result = node(result, this.read_what());
                break;
              }
              default:
                break recursive_scan_loop;
            }
          }
          return result;
        },
        /*
         * https://github.com/php/php-src/blob/493524454d66adde84e00d249d607ecd540de99f/Zend/zend_language_parser.y#L1231
         */
        read_encaps_var_offset() {
          let offset = this.node();
          if (this.token === this.tok.T_STRING) {
            const text = this.text();
            this.next();
            offset = offset("identifier", text);
          } else if (this.token === this.tok.T_NUM_STRING) {
            const num = this.text();
            this.next();
            offset = offset("number", num, null);
          } else if (this.token === "-") {
            this.next();
            const num = -1 * this.text();
            this.expect(this.tok.T_NUM_STRING) && this.next();
            offset = offset("number", num, null);
          } else if (this.token === this.tok.T_VARIABLE) {
            const name = this.text().substring(1);
            this.next();
            offset = offset("variable", name, false);
          } else {
            this.expect([
              this.tok.T_STRING,
              this.tok.T_NUM_STRING,
              "-",
              this.tok.T_VARIABLE
            ]);
            const text = this.text();
            this.next();
            offset = offset("identifier", text);
          }
          return offset;
        },
        /*
         * ```ebnf
         *  reference_variable ::=  simple_variable ('[' OFFSET ']')* | '{' EXPR '}'
         * ```
         * <code>
         *  $foo[123];      // foo is an array ==> gets its entry
         *  $foo{1};        // foo is a string ==> get the 2nd char offset
         *  ${'foo'}[123];  // get the dynamic var $foo
         *  $foo[123]{1};   // gets the 2nd char from the 123 array entry
         * </code>
         */
        read_reference_variable(encapsed) {
          let result = this.read_simple_variable();
          let offset;
          while (this.token != this.EOF) {
            const node = this.node();
            if (this.token == "{" && !encapsed) {
              offset = this.next().read_expr();
              this.expect("}") && this.next();
              result = node("offsetlookup", result, offset);
            } else {
              node.destroy();
              break;
            }
          }
          return result;
        },
        /*
         * ```ebnf
         *  simple_variable ::= T_VARIABLE | '$' '{' expr '}' | '$' simple_variable
         * ```
         */
        read_simple_variable() {
          let result = this.node("variable");
          let name;
          if (this.expect([this.tok.T_VARIABLE, "$"]) && this.token === this.tok.T_VARIABLE) {
            name = this.text().substring(1);
            this.next();
            result = result(name, false);
          } else {
            if (this.token === "$") this.next();
            switch (this.token) {
              case "{": {
                const expr2 = this.next().read_expr();
                this.expect("}") && this.next();
                result = result(expr2, true);
                break;
              }
              case "$":
                result = result(this.read_simple_variable(), false);
                break;
              case this.tok.T_VARIABLE: {
                name = this.text().substring(1);
                const node = this.node("variable");
                this.next();
                result = result(node(name, false), false);
                break;
              }
              default:
                this.error(["{", "$", this.tok.T_VARIABLE]);
                name = this.text();
                this.next();
                result = result(name, false);
            }
          }
          return result;
        }
      };
    }
  });

  // node_modules/php-parser/src/parser.js
  var require_parser = __commonJS({
    "node_modules/php-parser/src/parser.js"(exports, module) {
      "use strict";
      var Position = require_position();
      function isNumber(n) {
        return n != "." && n != "," && !isNaN(parseFloat(n)) && isFinite(n);
      }
      var Parser2 = function(lexer, ast) {
        this.lexer = lexer;
        this.ast = ast;
        this.tok = lexer.tok;
        this.EOF = lexer.EOF;
        this.token = null;
        this.prev = null;
        this.debug = false;
        this.version = 803;
        this.extractDoc = false;
        this.extractTokens = false;
        this.suppressErrors = false;
        const mapIt = function(item) {
          return [item, null];
        };
        this.entries = {
          // reserved_non_modifiers
          IDENTIFIER: new Map(
            [
              this.tok.T_ABSTRACT,
              this.tok.T_ARRAY,
              this.tok.T_AS,
              this.tok.T_BREAK,
              this.tok.T_CALLABLE,
              this.tok.T_CASE,
              this.tok.T_CATCH,
              this.tok.T_CLASS,
              this.tok.T_CLASS_C,
              this.tok.T_CLONE,
              this.tok.T_CONST,
              this.tok.T_CONTINUE,
              this.tok.T_DECLARE,
              this.tok.T_DEFAULT,
              this.tok.T_DIR,
              this.tok.T_DO,
              this.tok.T_ECHO,
              this.tok.T_ELSE,
              this.tok.T_ELSEIF,
              this.tok.T_EMPTY,
              this.tok.T_ENDDECLARE,
              this.tok.T_ENDFOR,
              this.tok.T_ENDFOREACH,
              this.tok.T_ENDIF,
              this.tok.T_ENDSWITCH,
              this.tok.T_ENDWHILE,
              this.tok.T_ENUM,
              this.tok.T_EVAL,
              this.tok.T_EXIT,
              this.tok.T_EXTENDS,
              this.tok.T_FILE,
              this.tok.T_FINAL,
              this.tok.T_FINALLY,
              this.tok.T_FN,
              this.tok.T_FOR,
              this.tok.T_FOREACH,
              this.tok.T_FUNC_C,
              this.tok.T_FUNCTION,
              this.tok.T_GLOBAL,
              this.tok.T_GOTO,
              this.tok.T_IF,
              this.tok.T_IMPLEMENTS,
              this.tok.T_INCLUDE,
              this.tok.T_INCLUDE_ONCE,
              this.tok.T_INSTANCEOF,
              this.tok.T_INSTEADOF,
              this.tok.T_INTERFACE,
              this.tok.T_ISSET,
              this.tok.T_LINE,
              this.tok.T_LIST,
              this.tok.T_LOGICAL_AND,
              this.tok.T_LOGICAL_OR,
              this.tok.T_LOGICAL_XOR,
              this.tok.T_MATCH,
              this.tok.T_METHOD_C,
              this.tok.T_NAMESPACE,
              this.tok.T_NEW,
              this.tok.T_NS_C,
              this.tok.T_PRINT,
              this.tok.T_PRIVATE,
              this.tok.T_PROTECTED,
              this.tok.T_PUBLIC,
              this.tok.T_READ_ONLY,
              this.tok.T_REQUIRE,
              this.tok.T_REQUIRE_ONCE,
              this.tok.T_RETURN,
              this.tok.T_STATIC,
              this.tok.T_SWITCH,
              this.tok.T_THROW,
              this.tok.T_TRAIT,
              this.tok.T_TRY,
              this.tok.T_UNSET,
              this.tok.T_USE,
              this.tok.T_VAR,
              this.tok.T_WHILE,
              this.tok.T_YIELD
            ].map(mapIt)
          ),
          VARIABLE: new Map(
            [
              this.tok.T_VARIABLE,
              "$",
              "&",
              this.tok.T_STRING,
              this.tok.T_NAME_RELATIVE,
              this.tok.T_NAME_QUALIFIED,
              this.tok.T_NAME_FULLY_QUALIFIED,
              this.tok.T_NAMESPACE,
              this.tok.T_STATIC
            ].map(mapIt)
          ),
          SCALAR: new Map(
            [
              this.tok.T_CONSTANT_ENCAPSED_STRING,
              this.tok.T_START_HEREDOC,
              this.tok.T_LNUMBER,
              this.tok.T_DNUMBER,
              this.tok.T_ARRAY,
              "[",
              this.tok.T_CLASS_C,
              this.tok.T_TRAIT_C,
              this.tok.T_FUNC_C,
              this.tok.T_METHOD_C,
              this.tok.T_LINE,
              this.tok.T_FILE,
              this.tok.T_DIR,
              this.tok.T_NS_C,
              '"',
              'b"',
              'B"',
              "-",
              this.tok.T_NS_SEPARATOR
            ].map(mapIt)
          ),
          T_MAGIC_CONST: new Map(
            [
              this.tok.T_CLASS_C,
              this.tok.T_TRAIT_C,
              this.tok.T_FUNC_C,
              this.tok.T_METHOD_C,
              this.tok.T_LINE,
              this.tok.T_FILE,
              this.tok.T_DIR,
              this.tok.T_NS_C
            ].map(mapIt)
          ),
          T_MEMBER_FLAGS: new Map(
            [
              this.tok.T_PUBLIC,
              this.tok.T_PRIVATE,
              this.tok.T_PROTECTED,
              this.tok.T_STATIC,
              this.tok.T_ABSTRACT,
              this.tok.T_FINAL,
              this.tok.T_READ_ONLY
            ].map(mapIt)
          ),
          EOS: new Map([";", this.EOF, this.tok.T_INLINE_HTML].map(mapIt)),
          EXPR: new Map(
            [
              "@",
              "-",
              "+",
              "!",
              "~",
              "(",
              "`",
              this.tok.T_LIST,
              this.tok.T_CLONE,
              this.tok.T_INC,
              this.tok.T_DEC,
              this.tok.T_NEW,
              this.tok.T_ISSET,
              this.tok.T_EMPTY,
              this.tok.T_MATCH,
              this.tok.T_INCLUDE,
              this.tok.T_INCLUDE_ONCE,
              this.tok.T_REQUIRE,
              this.tok.T_REQUIRE_ONCE,
              this.tok.T_EVAL,
              this.tok.T_INT_CAST,
              this.tok.T_DOUBLE_CAST,
              this.tok.T_STRING_CAST,
              this.tok.T_ARRAY_CAST,
              this.tok.T_OBJECT_CAST,
              this.tok.T_BOOL_CAST,
              this.tok.T_UNSET_CAST,
              this.tok.T_EXIT,
              this.tok.T_PRINT,
              this.tok.T_YIELD,
              this.tok.T_STATIC,
              this.tok.T_FUNCTION,
              this.tok.T_FN,
              // using VARIABLES :
              this.tok.T_VARIABLE,
              "$",
              this.tok.T_NS_SEPARATOR,
              this.tok.T_STRING,
              this.tok.T_NAME_RELATIVE,
              this.tok.T_NAME_QUALIFIED,
              this.tok.T_NAME_FULLY_QUALIFIED,
              // using SCALAR :
              this.tok.T_STRING,
              // @see variable.js line 45 > conflict with variable = shift/reduce :)
              this.tok.T_CONSTANT_ENCAPSED_STRING,
              this.tok.T_START_HEREDOC,
              this.tok.T_LNUMBER,
              this.tok.T_DNUMBER,
              this.tok.T_ARRAY,
              "[",
              this.tok.T_CLASS_C,
              this.tok.T_TRAIT_C,
              this.tok.T_FUNC_C,
              this.tok.T_METHOD_C,
              this.tok.T_LINE,
              this.tok.T_FILE,
              this.tok.T_DIR,
              this.tok.T_NS_C,
              '"',
              'b"',
              'B"',
              "-",
              this.tok.T_NS_SEPARATOR
            ].map(mapIt)
          )
        };
      };
      Parser2.prototype.getTokenName = function(token) {
        if (!isNumber(token)) {
          return "'" + token + "'";
        } else {
          if (token == this.EOF) return "the end of file (EOF)";
          return this.lexer.engine.tokens.values[token];
        }
      };
      Parser2.prototype.parse = function(code, filename) {
        this._errors = [];
        this.filename = filename || "eval";
        this.currentNamespace = [""];
        if (this.extractDoc) {
          this._docs = [];
        } else {
          this._docs = null;
        }
        if (this.extractTokens) {
          this._tokens = [];
        } else {
          this._tokens = null;
        }
        this._docIndex = 0;
        this._lastNode = null;
        this.lexer.setInput(code);
        this.lexer.all_tokens = this.extractTokens;
        this.lexer.comment_tokens = this.extractDoc;
        this.length = this.lexer._input.length;
        this.innerList = false;
        this.innerListForm = false;
        const program = this.node("program");
        const childs = [];
        this.next();
        while (this.token != this.EOF) {
          childs.push(this.read_start());
        }
        if (childs.length === 0 && this.extractDoc && this._docs.length > this._docIndex) {
          childs.push(this.node("noop")());
        }
        this.prev = [
          this.lexer.yylloc.last_line,
          this.lexer.yylloc.last_column,
          this.lexer.offset
        ];
        const result = program(childs, this._errors, this._docs, this._tokens);
        if (this.debug) {
          const errors = this.ast.checkNodes();
          if (errors.length > 0) {
            errors.forEach(function(error) {
              if (error.position) {
                console.log(
                  "Node at line " + error.position.line + ", column " + error.position.column
                );
              }
              console.log(error.stack.join("\n"));
            });
            throw new Error("Some nodes are not closed");
          }
        }
        return result;
      };
      Parser2.prototype.raiseError = function(message, msgExpect, expect, token) {
        message += " on line " + this.lexer.yylloc.first_line;
        if (!this.suppressErrors) {
          const err = new SyntaxError(
            message,
            this.filename,
            this.lexer.yylloc.first_line
          );
          err.lineNumber = this.lexer.yylloc.first_line;
          err.fileName = this.filename;
          err.columnNumber = this.lexer.yylloc.first_column;
          throw err;
        }
        const savedPrev = this.prev;
        this.prev = [
          this.lexer.yylloc.last_line,
          this.lexer.yylloc.last_column,
          this.lexer.offset
        ];
        const node = this.ast.prepare("error", null, this)(
          message,
          token,
          this.lexer.yylloc.first_line,
          expect
        );
        this.prev = savedPrev;
        this._errors.push(node);
        return node;
      };
      Parser2.prototype.error = function(expect) {
        let msg = "Parse Error : syntax error";
        let token = this.getTokenName(this.token);
        let msgExpect = "";
        if (this.token !== this.EOF) {
          if (isNumber(this.token)) {
            let symbol = this.text();
            if (symbol.length > 10) {
              symbol = symbol.substring(0, 7) + "...";
            }
            token = "'" + symbol + "' (" + token + ")";
          }
          msg += ", unexpected " + token;
        }
        if (expect && !Array.isArray(expect)) {
          if (isNumber(expect) || expect.length === 1) {
            msgExpect = ", expecting " + this.getTokenName(expect);
          }
          msg += msgExpect;
        }
        return this.raiseError(msg, msgExpect, expect, token);
      };
      Parser2.prototype.position = function() {
        return new Position(
          this.lexer.yylloc.first_line,
          this.lexer.yylloc.first_column,
          this.lexer.yylloc.first_offset
        );
      };
      Parser2.prototype.node = function(name) {
        if (this.extractDoc) {
          let docs = null;
          if (this._docIndex < this._docs.length) {
            docs = this._docs.slice(this._docIndex);
            this._docIndex = this._docs.length;
            if (this.debug) {
              console.log(new Error("Append docs on " + name));
              console.log(docs);
            }
          }
          const node = this.ast.prepare(name, docs, this);
          node.postBuild = function(self) {
            if (this._docIndex < this._docs.length) {
              if (this._lastNode) {
                const offset = this.prev[2];
                let max = this._docIndex;
                for (; max < this._docs.length; max++) {
                  if (this._docs[max].offset > offset) {
                    break;
                  }
                }
                if (max > this._docIndex) {
                  this._lastNode.setTrailingComments(
                    this._docs.slice(this._docIndex, max)
                  );
                  this._docIndex = max;
                }
              } else if (this.token === this.EOF) {
                self.setTrailingComments(this._docs.slice(this._docIndex));
                this._docIndex = this._docs.length;
              }
            }
            this._lastNode = self;
          }.bind(this);
          return node;
        }
        return this.ast.prepare(name, null, this);
      };
      Parser2.prototype.expectEndOfStatement = function(node) {
        if (this.token === ";") {
          if (node && this.lexer.yytext === ";") {
            node.includeToken(this);
          }
        } else if (this.token !== this.tok.T_INLINE_HTML && this.token !== this.EOF) {
          this.error(";");
          return false;
        }
        this.next();
        return true;
      };
      var ignoreStack = ["parser.next", "parser.node", "parser.showlog"];
      Parser2.prototype.showlog = function() {
        const stack = new Error().stack.split("\n");
        let line;
        for (let offset = 2; offset < stack.length; offset++) {
          line = stack[offset].trim();
          let found = false;
          for (let i = 0; i < ignoreStack.length; i++) {
            if (line.substring(3, 3 + ignoreStack[i].length) === ignoreStack[i]) {
              found = true;
              break;
            }
          }
          if (!found) {
            break;
          }
        }
        console.log(
          "Line " + this.lexer.yylloc.first_line + " : " + this.getTokenName(this.token) + ">" + this.lexer.yytext + "< @-->" + line
        );
        return this;
      };
      Parser2.prototype.expect = function(token) {
        if (Array.isArray(token)) {
          if (token.indexOf(this.token) === -1) {
            this.error(token);
            return false;
          }
        } else if (this.token != token) {
          this.error(token);
          return false;
        }
        return true;
      };
      Parser2.prototype.text = function() {
        return this.lexer.yytext;
      };
      Parser2.prototype.next = function() {
        if (this.token !== ";" || this.lexer.yytext === ";") {
          this.prev = [
            this.lexer.yylloc.last_line,
            this.lexer.yylloc.last_column,
            this.lexer.offset
          ];
        }
        this.lex();
        if (this.debug) {
          this.showlog();
        }
        if (this.extractDoc) {
          while (this.token === this.tok.T_COMMENT || this.token === this.tok.T_DOC_COMMENT) {
            if (this.token === this.tok.T_COMMENT) {
              this._docs.push(this.read_comment());
            } else {
              this._docs.push(this.read_doc_comment());
            }
          }
        }
        return this;
      };
      Parser2.prototype.peek = function() {
        const lexerState = this.lexer.getState();
        const nextToken = this.lexer.lex();
        this.lexer.setState(lexerState);
        return nextToken;
      };
      Parser2.prototype.lex = function() {
        if (this.extractTokens) {
          do {
            this.token = this.lexer.lex() || /* istanbul ignore next */
            this.EOF;
            if (this.token === this.EOF) return this;
            let entry = this.lexer.yytext;
            if (Object.prototype.hasOwnProperty.call(
              this.lexer.engine.tokens.values,
              this.token
            )) {
              entry = [
                this.lexer.engine.tokens.values[this.token],
                entry,
                this.lexer.yylloc.first_line,
                this.lexer.yylloc.first_offset,
                this.lexer.offset
              ];
            } else {
              entry = [
                null,
                entry,
                this.lexer.yylloc.first_line,
                this.lexer.yylloc.first_offset,
                this.lexer.offset
              ];
            }
            this._tokens.push(entry);
            if (this.token === this.tok.T_CLOSE_TAG) {
              this.token = ";";
              return this;
            } else if (this.token === this.tok.T_OPEN_TAG_WITH_ECHO) {
              this.token = this.tok.T_ECHO;
              return this;
            }
          } while (this.token === this.tok.T_WHITESPACE || // ignore white space
          !this.extractDoc && (this.token === this.tok.T_COMMENT || // ignore single lines comments
          this.token === this.tok.T_DOC_COMMENT) || // ignore doc comments
          // ignore open tags
          this.token === this.tok.T_OPEN_TAG);
        } else {
          this.token = this.lexer.lex() || /* istanbul ignore next */
          this.EOF;
        }
        return this;
      };
      Parser2.prototype.is = function(type) {
        if (Array.isArray(type)) {
          return type.indexOf(this.token) !== -1;
        }
        return this.entries[type].has(this.token);
      };
      [
        require_array(),
        require_class(),
        require_comment(),
        require_expr(),
        require_enum(),
        require_function(),
        require_if(),
        require_loops(),
        require_main(),
        require_namespace(),
        require_scalar(),
        require_statement(),
        require_switch(),
        require_try(),
        require_utils2(),
        require_variable()
      ].forEach(function(ext) {
        for (const k in ext) {
          if (Object.prototype.hasOwnProperty.call(Parser2.prototype, k)) {
            throw new Error("Function " + k + " is already defined - collision");
          }
          Parser2.prototype[k] = ext[k];
        }
      });
      module.exports = Parser2;
    }
  });

  // node_modules/php-parser/src/tokens.js
  var require_tokens2 = __commonJS({
    "node_modules/php-parser/src/tokens.js"(exports, module) {
      "use strict";
      var TokenNames = {
        T_HALT_COMPILER: 101,
        T_USE: 102,
        T_ENCAPSED_AND_WHITESPACE: 103,
        T_OBJECT_OPERATOR: 104,
        T_STRING: 105,
        T_DOLLAR_OPEN_CURLY_BRACES: 106,
        T_STRING_VARNAME: 107,
        T_CURLY_OPEN: 108,
        T_NUM_STRING: 109,
        T_ISSET: 110,
        T_EMPTY: 111,
        T_INCLUDE: 112,
        T_INCLUDE_ONCE: 113,
        T_EVAL: 114,
        T_REQUIRE: 115,
        T_REQUIRE_ONCE: 116,
        T_NAMESPACE: 117,
        T_NS_SEPARATOR: 118,
        T_AS: 119,
        T_IF: 120,
        T_ENDIF: 121,
        T_WHILE: 122,
        T_DO: 123,
        T_FOR: 124,
        T_SWITCH: 125,
        T_BREAK: 126,
        T_CONTINUE: 127,
        T_RETURN: 128,
        T_GLOBAL: 129,
        T_STATIC: 130,
        T_ECHO: 131,
        T_INLINE_HTML: 132,
        T_UNSET: 133,
        T_FOREACH: 134,
        T_DECLARE: 135,
        T_TRY: 136,
        T_THROW: 137,
        T_GOTO: 138,
        T_FINALLY: 139,
        T_CATCH: 140,
        T_ENDDECLARE: 141,
        T_LIST: 142,
        T_CLONE: 143,
        T_PLUS_EQUAL: 144,
        T_MINUS_EQUAL: 145,
        T_MUL_EQUAL: 146,
        T_DIV_EQUAL: 147,
        T_CONCAT_EQUAL: 148,
        T_MOD_EQUAL: 149,
        T_AND_EQUAL: 150,
        T_OR_EQUAL: 151,
        T_XOR_EQUAL: 152,
        T_SL_EQUAL: 153,
        T_SR_EQUAL: 154,
        T_INC: 155,
        T_DEC: 156,
        T_BOOLEAN_OR: 157,
        T_BOOLEAN_AND: 158,
        T_LOGICAL_OR: 159,
        T_LOGICAL_AND: 160,
        T_LOGICAL_XOR: 161,
        T_SL: 162,
        T_SR: 163,
        T_IS_IDENTICAL: 164,
        T_IS_NOT_IDENTICAL: 165,
        T_IS_EQUAL: 166,
        T_IS_NOT_EQUAL: 167,
        T_IS_SMALLER_OR_EQUAL: 168,
        T_IS_GREATER_OR_EQUAL: 169,
        T_INSTANCEOF: 170,
        T_INT_CAST: 171,
        T_DOUBLE_CAST: 172,
        T_STRING_CAST: 173,
        T_ARRAY_CAST: 174,
        T_OBJECT_CAST: 175,
        T_BOOL_CAST: 176,
        T_UNSET_CAST: 177,
        T_EXIT: 178,
        T_PRINT: 179,
        T_YIELD: 180,
        T_YIELD_FROM: 181,
        T_FUNCTION: 182,
        T_DOUBLE_ARROW: 183,
        T_DOUBLE_COLON: 184,
        T_ARRAY: 185,
        T_CALLABLE: 186,
        T_CLASS: 187,
        T_ABSTRACT: 188,
        T_TRAIT: 189,
        T_FINAL: 190,
        T_EXTENDS: 191,
        T_INTERFACE: 192,
        T_IMPLEMENTS: 193,
        T_VAR: 194,
        T_PUBLIC: 195,
        T_PROTECTED: 196,
        T_PRIVATE: 197,
        T_CONST: 198,
        T_NEW: 199,
        T_INSTEADOF: 200,
        T_ELSEIF: 201,
        T_ELSE: 202,
        T_ENDSWITCH: 203,
        T_CASE: 204,
        T_DEFAULT: 205,
        T_ENDFOR: 206,
        T_ENDFOREACH: 207,
        T_ENDWHILE: 208,
        T_CONSTANT_ENCAPSED_STRING: 209,
        T_LNUMBER: 210,
        T_DNUMBER: 211,
        T_LINE: 212,
        T_FILE: 213,
        T_DIR: 214,
        T_TRAIT_C: 215,
        T_METHOD_C: 216,
        T_FUNC_C: 217,
        T_NS_C: 218,
        T_START_HEREDOC: 219,
        T_END_HEREDOC: 220,
        T_CLASS_C: 221,
        T_VARIABLE: 222,
        T_OPEN_TAG: 223,
        T_OPEN_TAG_WITH_ECHO: 224,
        T_CLOSE_TAG: 225,
        T_WHITESPACE: 226,
        T_COMMENT: 227,
        T_DOC_COMMENT: 228,
        T_ELLIPSIS: 229,
        T_COALESCE: 230,
        T_POW: 231,
        T_POW_EQUAL: 232,
        T_SPACESHIP: 233,
        T_COALESCE_EQUAL: 234,
        T_FN: 235,
        T_NULLSAFE_OBJECT_OPERATOR: 236,
        T_MATCH: 237,
        T_ATTRIBUTE: 238,
        T_ENUM: 239,
        T_READ_ONLY: 240,
        T_NAME_RELATIVE: 241,
        T_NAME_QUALIFIED: 242,
        T_NAME_FULLY_QUALIFIED: 243,
        T_PIPE: 244
      };
      var tokens = {
        values: Object.entries(TokenNames).reduce(
          (result, [key, value]) => ({ ...result, [value]: key }),
          {}
        ),
        names: TokenNames
      };
      module.exports = Object.freeze(tokens);
    }
  });

  // node_modules/php-parser/src/ast/location.js
  var require_location = __commonJS({
    "node_modules/php-parser/src/ast/location.js"(exports, module) {
      "use strict";
      var Location = function(source, start, end) {
        this.source = source;
        this.start = start;
        this.end = end;
      };
      module.exports = Location;
    }
  });

  // node_modules/php-parser/src/ast/node.js
  var require_node = __commonJS({
    "node_modules/php-parser/src/ast/node.js"(exports, module) {
      "use strict";
      var Node = function Node2(kind, docs, location) {
        this.kind = kind;
        if (docs) {
          this.leadingComments = docs;
        }
        if (location) {
          this.loc = location;
        }
      };
      Node.prototype.setTrailingComments = function(docs) {
        this.trailingComments = docs;
      };
      Node.prototype.destroy = function(node) {
        if (!node) {
          throw new Error(
            "Node already initialized, you must swap with another node"
          );
        }
        if (this.leadingComments) {
          if (node.leadingComments) {
            node.leadingComments = Array.concat(
              this.leadingComments,
              node.leadingComments
            );
          } else {
            node.leadingComments = this.leadingComments;
          }
        }
        if (this.trailingComments) {
          if (node.trailingComments) {
            node.trailingComments = Array.concat(
              this.trailingComments,
              node.trailingComments
            );
          } else {
            node.trailingComments = this.trailingComments;
          }
        }
        return node;
      };
      Node.prototype.includeToken = function(parser) {
        if (this.loc) {
          if (this.loc.end) {
            this.loc.end.line = parser.lexer.yylloc.last_line;
            this.loc.end.column = parser.lexer.yylloc.last_column;
            this.loc.end.offset = parser.lexer.offset;
          }
          if (parser.ast.withSource) {
            this.loc.source = parser.lexer._input.substring(
              this.loc.start.offset,
              parser.lexer.offset
            );
          }
        }
        return this;
      };
      Node.extends = function(type, constructor) {
        constructor.prototype = Object.create(this.prototype);
        constructor.extends = this.extends;
        constructor.prototype.constructor = constructor;
        constructor.kind = type;
        return constructor;
      };
      module.exports = Node;
    }
  });

  // node_modules/php-parser/src/ast/expression.js
  var require_expression = __commonJS({
    "node_modules/php-parser/src/ast/expression.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "expression";
      module.exports = Node.extends(KIND, function Expression(kind, docs, location) {
        Node.apply(this, [kind || KIND, docs, location]);
      });
    }
  });

  // node_modules/php-parser/src/ast/array.js
  var require_array2 = __commonJS({
    "node_modules/php-parser/src/ast/array.js"(exports, module) {
      "use strict";
      var Expr = require_expression();
      var KIND = "array";
      module.exports = Expr.extends(
        KIND,
        function Array2(shortForm, items, docs, location) {
          Expr.apply(this, [KIND, docs, location]);
          this.items = items;
          this.shortForm = shortForm;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/arrowfunc.js
  var require_arrowfunc = __commonJS({
    "node_modules/php-parser/src/ast/arrowfunc.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "arrowfunc";
      module.exports = Expression.extends(
        KIND,
        function Closure(args, byref, body, type, nullable, isStatic, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.arguments = args;
          this.byref = byref;
          this.body = body;
          this.type = type;
          this.nullable = nullable;
          this.isStatic = isStatic || false;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/assign.js
  var require_assign = __commonJS({
    "node_modules/php-parser/src/ast/assign.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "assign";
      module.exports = Expression.extends(
        KIND,
        function Assign(left, right, operator, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.left = left;
          this.right = right;
          this.operator = operator;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/assignref.js
  var require_assignref = __commonJS({
    "node_modules/php-parser/src/ast/assignref.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "assignref";
      module.exports = Expression.extends(
        KIND,
        function AssignRef(left, right, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.left = left;
          this.right = right;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/attribute.js
  var require_attribute2 = __commonJS({
    "node_modules/php-parser/src/ast/attribute.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "attribute";
      module.exports = Node.extends(
        KIND,
        function Attribute(name, args, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.name = name;
          this.args = args;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/attrgroup.js
  var require_attrgroup = __commonJS({
    "node_modules/php-parser/src/ast/attrgroup.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "attrgroup";
      module.exports = Node.extends(KIND, function AttrGroup(attrs, docs, location) {
        Node.apply(this, [KIND, docs, location]);
        this.attrs = attrs || [];
      });
    }
  });

  // node_modules/php-parser/src/ast/operation.js
  var require_operation = __commonJS({
    "node_modules/php-parser/src/ast/operation.js"(exports, module) {
      "use strict";
      var Expr = require_expression();
      var KIND = "operation";
      module.exports = Expr.extends(KIND, function Operation(kind, docs, location) {
        Expr.apply(this, [kind || KIND, docs, location]);
      });
    }
  });

  // node_modules/php-parser/src/ast/bin.js
  var require_bin = __commonJS({
    "node_modules/php-parser/src/ast/bin.js"(exports, module) {
      "use strict";
      var Operation = require_operation();
      var KIND = "bin";
      module.exports = Operation.extends(
        KIND,
        function Bin(type, left, right, docs, location) {
          Operation.apply(this, [KIND, docs, location]);
          this.type = type;
          this.left = left;
          this.right = right;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/statement.js
  var require_statement2 = __commonJS({
    "node_modules/php-parser/src/ast/statement.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "statement";
      module.exports = Node.extends(KIND, function Statement(kind, docs, location) {
        Node.apply(this, [kind || KIND, docs, location]);
      });
    }
  });

  // node_modules/php-parser/src/ast/block.js
  var require_block = __commonJS({
    "node_modules/php-parser/src/ast/block.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "block";
      module.exports = Statement.extends(
        KIND,
        function Block(kind, children, docs, location) {
          Statement.apply(this, [kind || KIND, docs, location]);
          this.children = children.filter(Boolean);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/literal.js
  var require_literal = __commonJS({
    "node_modules/php-parser/src/ast/literal.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "literal";
      module.exports = Expression.extends(
        KIND,
        function Literal(kind, value, raw, docs, location) {
          Expression.apply(this, [kind || KIND, docs, location]);
          this.value = value;
          if (raw) {
            this.raw = raw;
          }
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/boolean.js
  var require_boolean = __commonJS({
    "node_modules/php-parser/src/ast/boolean.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "boolean";
      module.exports = Literal.extends(
        KIND,
        function Boolean2(value, raw, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/break.js
  var require_break = __commonJS({
    "node_modules/php-parser/src/ast/break.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "break";
      module.exports = Statement.extends(KIND, function Break(level, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.level = level;
      });
    }
  });

  // node_modules/php-parser/src/ast/byref.js
  var require_byref = __commonJS({
    "node_modules/php-parser/src/ast/byref.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "byref";
      module.exports = Expression.extends(KIND, function ByRef(what, docs, location) {
        Expression.apply(this, [KIND, docs, location]);
        this.what = what;
      });
    }
  });

  // node_modules/php-parser/src/ast/call.js
  var require_call = __commonJS({
    "node_modules/php-parser/src/ast/call.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "call";
      module.exports = Expression.extends(
        KIND,
        function Call(what, args, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.what = what;
          this.arguments = args;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/case.js
  var require_case = __commonJS({
    "node_modules/php-parser/src/ast/case.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "case";
      module.exports = Statement.extends(
        KIND,
        function Case(test, body, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.test = test;
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/cast.js
  var require_cast = __commonJS({
    "node_modules/php-parser/src/ast/cast.js"(exports, module) {
      "use strict";
      var Operation = require_operation();
      var KIND = "cast";
      module.exports = Operation.extends(
        KIND,
        function Cast(type, raw, expr2, docs, location) {
          Operation.apply(this, [KIND, docs, location]);
          this.type = type;
          this.raw = raw;
          this.expr = expr2;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/catch.js
  var require_catch = __commonJS({
    "node_modules/php-parser/src/ast/catch.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "catch";
      module.exports = Statement.extends(
        KIND,
        function Catch(body, what, variable, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.body = body;
          this.what = what;
          this.variable = variable;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/declaration.js
  var require_declaration = __commonJS({
    "node_modules/php-parser/src/ast/declaration.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "declaration";
      var IS_UNDEFINED = "";
      var IS_PUBLIC = "public";
      var IS_PROTECTED = "protected";
      var IS_PRIVATE = "private";
      var VISIBILITY_MAP = [IS_PUBLIC, IS_PROTECTED, IS_PRIVATE];
      var Declaration = Statement.extends(
        KIND,
        function Declaration2(kind, name, docs, location) {
          Statement.apply(this, [kind || KIND, docs, location]);
          this.name = name;
        }
      );
      Declaration.prototype.parseFlags = function(flags) {
        this.isAbstract = flags[2] === 1;
        this.isFinal = flags[2] === 2;
        this.isReadonly = flags[3] === 1;
        if (this.kind !== "class") {
          const [getVis, setVis] = flags[0];
          if (getVis === -1) {
            this.visibility = IS_UNDEFINED;
          } else if (getVis === null) {
            this.visibility = null;
          } else {
            this.visibility = VISIBILITY_MAP[getVis];
          }
          this.isStatic = flags[1] === 1;
          this.visibilitySet = setVis !== -1 ? VISIBILITY_MAP[setVis] : null;
        }
      };
      module.exports = Declaration;
    }
  });

  // node_modules/php-parser/src/ast/class.js
  var require_class2 = __commonJS({
    "node_modules/php-parser/src/ast/class.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "class";
      module.exports = Declaration.extends(
        KIND,
        function Class(name, ext, impl, body, flags, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.isAnonymous = name ? false : true;
          this.extends = ext;
          this.implements = impl;
          this.body = body;
          this.attrGroups = [];
          this.parseFlags(flags);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/constantstatement.js
  var require_constantstatement = __commonJS({
    "node_modules/php-parser/src/ast/constantstatement.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "constantstatement";
      module.exports = Statement.extends(
        KIND,
        function ConstantStatement(kind, constants, docs, location) {
          Statement.apply(this, [kind || KIND, docs, location]);
          this.constants = constants;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/classconstant.js
  var require_classconstant = __commonJS({
    "node_modules/php-parser/src/ast/classconstant.js"(exports, module) {
      "use strict";
      var ConstantStatement = require_constantstatement();
      var KIND = "classconstant";
      var IS_UNDEFINED = "";
      var IS_PUBLIC = "public";
      var IS_PROTECTED = "protected";
      var IS_PRIVATE = "private";
      var ClassConstant = ConstantStatement.extends(
        KIND,
        function ClassConstant2(kind, constants, flags, nullable, type, attrGroups, docs, location) {
          ConstantStatement.apply(this, [kind || KIND, constants, docs, location]);
          this.parseFlags(flags);
          this.nullable = nullable;
          this.type = type;
          this.attrGroups = attrGroups;
        }
      );
      ClassConstant.prototype.parseFlags = function(flags) {
        const getVis = flags[0][0];
        if (getVis === -1) {
          this.visibility = IS_UNDEFINED;
        } else if (getVis === null) {
          this.visibility = null;
        } else if (getVis === 0) {
          this.visibility = IS_PUBLIC;
        } else if (getVis === 1) {
          this.visibility = IS_PROTECTED;
        } else if (getVis === 2) {
          this.visibility = IS_PRIVATE;
        }
        this.final = flags[2] === 2;
      };
      module.exports = ClassConstant;
    }
  });

  // node_modules/php-parser/src/ast/clone.js
  var require_clone = __commonJS({
    "node_modules/php-parser/src/ast/clone.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "clone";
      module.exports = Expression.extends(
        KIND,
        function Clone(what, properties, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.what = what;
          if (properties) {
            this.properties = properties;
          }
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/closure.js
  var require_closure = __commonJS({
    "node_modules/php-parser/src/ast/closure.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "closure";
      module.exports = Expression.extends(
        KIND,
        function Closure(args, byref, uses, type, nullable, isStatic, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.uses = uses;
          this.arguments = args;
          this.byref = byref;
          this.type = type;
          this.nullable = nullable;
          this.isStatic = isStatic || false;
          this.body = null;
          this.attrGroups = [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/comment.js
  var require_comment2 = __commonJS({
    "node_modules/php-parser/src/ast/comment.js"(exports, module) {
      "use strict";
      var Node = require_node();
      module.exports = Node.extends(
        "comment",
        function Comment(kind, value, docs, location) {
          Node.apply(this, [kind, docs, location]);
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/commentblock.js
  var require_commentblock = __commonJS({
    "node_modules/php-parser/src/ast/commentblock.js"(exports, module) {
      "use strict";
      var Comment = require_comment2();
      var KIND = "commentblock";
      module.exports = Comment.extends(
        KIND,
        function CommentBlock(value, docs, location) {
          Comment.apply(this, [KIND, value, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/commentline.js
  var require_commentline = __commonJS({
    "node_modules/php-parser/src/ast/commentline.js"(exports, module) {
      "use strict";
      var Comment = require_comment2();
      var KIND = "commentline";
      module.exports = Comment.extends(
        KIND,
        function CommentLine(value, docs, location) {
          Comment.apply(this, [KIND, value, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/constant.js
  var require_constant = __commonJS({
    "node_modules/php-parser/src/ast/constant.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "constant";
      module.exports = Node.extends(
        KIND,
        function Constant(name, value, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.name = name;
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/continue.js
  var require_continue = __commonJS({
    "node_modules/php-parser/src/ast/continue.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "continue";
      module.exports = Statement.extends(
        KIND,
        function Continue(level, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.level = level;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/declare.js
  var require_declare = __commonJS({
    "node_modules/php-parser/src/ast/declare.js"(exports, module) {
      "use strict";
      var Block = require_block();
      var KIND = "declare";
      var Declare = Block.extends(
        KIND,
        function Declare2(directives, body, mode, docs, location) {
          Block.apply(this, [KIND, body, docs, location]);
          this.directives = directives;
          this.mode = mode;
        }
      );
      Declare.MODE_SHORT = "short";
      Declare.MODE_BLOCK = "block";
      Declare.MODE_NONE = "none";
      module.exports = Declare;
    }
  });

  // node_modules/php-parser/src/ast/declaredirective.js
  var require_declaredirective = __commonJS({
    "node_modules/php-parser/src/ast/declaredirective.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "declaredirective";
      module.exports = Node.extends(
        KIND,
        function DeclareDirective(key, value, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.key = key;
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/do.js
  var require_do = __commonJS({
    "node_modules/php-parser/src/ast/do.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "do";
      module.exports = Statement.extends(
        KIND,
        function Do(test, body, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.test = test;
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/echo.js
  var require_echo = __commonJS({
    "node_modules/php-parser/src/ast/echo.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "echo";
      module.exports = Statement.extends(
        KIND,
        function Echo(expressions, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.shortForm = shortForm;
          this.expressions = expressions;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/empty.js
  var require_empty = __commonJS({
    "node_modules/php-parser/src/ast/empty.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "empty";
      module.exports = Expression.extends(
        KIND,
        function Empty(expression2, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.expression = expression2;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/encapsed.js
  var require_encapsed = __commonJS({
    "node_modules/php-parser/src/ast/encapsed.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "encapsed";
      var Encapsed = Literal.extends(
        KIND,
        function Encapsed2(value, raw, type, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
          this.type = type;
        }
      );
      Encapsed.TYPE_STRING = "string";
      Encapsed.TYPE_SHELL = "shell";
      Encapsed.TYPE_HEREDOC = "heredoc";
      Encapsed.TYPE_OFFSET = "offset";
      module.exports = Encapsed;
    }
  });

  // node_modules/php-parser/src/ast/encapsedpart.js
  var require_encapsedpart = __commonJS({
    "node_modules/php-parser/src/ast/encapsedpart.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "encapsedpart";
      module.exports = Expression.extends(
        KIND,
        function EncapsedPart(expression2, syntax, curly, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.expression = expression2;
          this.syntax = syntax;
          this.curly = curly;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/entry.js
  var require_entry = __commonJS({
    "node_modules/php-parser/src/ast/entry.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "entry";
      module.exports = Expression.extends(
        KIND,
        function Entry(key, value, byRef, unpack, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.key = key;
          this.value = value;
          this.byRef = byRef;
          this.unpack = unpack;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/enum.js
  var require_enum2 = __commonJS({
    "node_modules/php-parser/src/ast/enum.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "enum";
      module.exports = Declaration.extends(
        KIND,
        function Enum(name, valueType, impl, body, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.valueType = valueType;
          this.implements = impl;
          this.body = body;
          this.attrGroups = [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/enumcase.js
  var require_enumcase = __commonJS({
    "node_modules/php-parser/src/ast/enumcase.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "enumcase";
      module.exports = Node.extends(
        KIND,
        function EnumCase(name, value, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.name = name;
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/error.js
  var require_error = __commonJS({
    "node_modules/php-parser/src/ast/error.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "error";
      module.exports = Node.extends(
        KIND,
        function Error2(message, token, line, expected, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.message = message;
          this.token = token;
          this.line = line;
          this.expected = expected;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/eval.js
  var require_eval = __commonJS({
    "node_modules/php-parser/src/ast/eval.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "eval";
      module.exports = Expression.extends(
        KIND,
        function Eval(source, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.source = source;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/exit.js
  var require_exit = __commonJS({
    "node_modules/php-parser/src/ast/exit.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "exit";
      module.exports = Expression.extends(
        KIND,
        function Exit(expression2, useDie, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.expression = expression2;
          this.useDie = useDie;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/expressionstatement.js
  var require_expressionstatement = __commonJS({
    "node_modules/php-parser/src/ast/expressionstatement.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "expressionstatement";
      module.exports = Statement.extends(
        KIND,
        function ExpressionStatement(expr2, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.expression = expr2;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/for.js
  var require_for = __commonJS({
    "node_modules/php-parser/src/ast/for.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "for";
      module.exports = Statement.extends(
        KIND,
        function For(init, test, increment, body, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.init = init;
          this.test = test;
          this.increment = increment;
          this.shortForm = shortForm;
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/foreach.js
  var require_foreach = __commonJS({
    "node_modules/php-parser/src/ast/foreach.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "foreach";
      module.exports = Statement.extends(
        KIND,
        function Foreach(source, key, value, body, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.source = source;
          this.key = key;
          this.value = value;
          this.shortForm = shortForm;
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/function.js
  var require_function2 = __commonJS({
    "node_modules/php-parser/src/ast/function.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "function";
      module.exports = Declaration.extends(
        KIND,
        function _Function(name, args, byref, type, nullable, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.arguments = args;
          this.byref = byref;
          this.type = type;
          this.nullable = nullable;
          this.body = null;
          this.attrGroups = [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/global.js
  var require_global = __commonJS({
    "node_modules/php-parser/src/ast/global.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "global";
      module.exports = Statement.extends(
        KIND,
        function Global(items, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.items = items;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/goto.js
  var require_goto = __commonJS({
    "node_modules/php-parser/src/ast/goto.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "goto";
      module.exports = Statement.extends(KIND, function Goto(label, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.label = label;
      });
    }
  });

  // node_modules/php-parser/src/ast/halt.js
  var require_halt = __commonJS({
    "node_modules/php-parser/src/ast/halt.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "halt";
      module.exports = Statement.extends(KIND, function Halt(after, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.after = after;
      });
    }
  });

  // node_modules/php-parser/src/ast/identifier.js
  var require_identifier = __commonJS({
    "node_modules/php-parser/src/ast/identifier.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "identifier";
      var Identifier = Node.extends(
        KIND,
        function Identifier2(name, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.name = name;
        }
      );
      module.exports = Identifier;
    }
  });

  // node_modules/php-parser/src/ast/if.js
  var require_if2 = __commonJS({
    "node_modules/php-parser/src/ast/if.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "if";
      module.exports = Statement.extends(
        KIND,
        function If(test, body, alternate, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.test = test;
          this.body = body;
          this.alternate = alternate;
          this.shortForm = shortForm;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/include.js
  var require_include = __commonJS({
    "node_modules/php-parser/src/ast/include.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "include";
      module.exports = Expression.extends(
        KIND,
        function Include(once, require2, target, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.once = once;
          this.require = require2;
          this.target = target;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/inline.js
  var require_inline = __commonJS({
    "node_modules/php-parser/src/ast/inline.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "inline";
      module.exports = Literal.extends(
        KIND,
        function Inline(value, raw, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/interface.js
  var require_interface = __commonJS({
    "node_modules/php-parser/src/ast/interface.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "interface";
      module.exports = Declaration.extends(
        KIND,
        function Interface(name, ext, body, attrGroups, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.extends = ext;
          this.body = body;
          this.attrGroups = attrGroups;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/intersectiontype.js
  var require_intersectiontype = __commonJS({
    "node_modules/php-parser/src/ast/intersectiontype.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "intersectiontype";
      module.exports = Declaration.extends(
        KIND,
        function IntersectionType(types, docs, location) {
          Declaration.apply(this, [KIND, null, docs, location]);
          this.types = types;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/isset.js
  var require_isset = __commonJS({
    "node_modules/php-parser/src/ast/isset.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "isset";
      module.exports = Expression.extends(
        KIND,
        function Isset(variables, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.variables = variables;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/label.js
  var require_label = __commonJS({
    "node_modules/php-parser/src/ast/label.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "label";
      module.exports = Statement.extends(KIND, function Label(name, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.name = name;
      });
    }
  });

  // node_modules/php-parser/src/ast/list.js
  var require_list = __commonJS({
    "node_modules/php-parser/src/ast/list.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "list";
      module.exports = Expression.extends(
        KIND,
        function List(items, shortForm, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.items = items;
          this.shortForm = shortForm;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/lookup.js
  var require_lookup = __commonJS({
    "node_modules/php-parser/src/ast/lookup.js"(exports, module) {
      "use strict";
      var Expr = require_expression();
      var KIND = "lookup";
      module.exports = Expr.extends(
        KIND,
        function Lookup(kind, what, offset, docs, location) {
          Expr.apply(this, [kind || KIND, docs, location]);
          this.what = what;
          this.offset = offset;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/magic.js
  var require_magic = __commonJS({
    "node_modules/php-parser/src/ast/magic.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "magic";
      module.exports = Literal.extends(
        KIND,
        function Magic(value, raw, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/match.js
  var require_match = __commonJS({
    "node_modules/php-parser/src/ast/match.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "match";
      module.exports = Expression.extends(
        KIND,
        function Match(cond, arms, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.cond = cond;
          this.arms = arms;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/matcharm.js
  var require_matcharm = __commonJS({
    "node_modules/php-parser/src/ast/matcharm.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "matcharm";
      module.exports = Expression.extends(
        KIND,
        function MatchArm(conds, body, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.conds = conds;
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/method.js
  var require_method = __commonJS({
    "node_modules/php-parser/src/ast/method.js"(exports, module) {
      "use strict";
      var Function_ = require_function2();
      var KIND = "method";
      module.exports = Function_.extends(KIND, function Method() {
        Function_.apply(this, arguments);
        this.kind = KIND;
      });
    }
  });

  // node_modules/php-parser/src/ast/reference.js
  var require_reference = __commonJS({
    "node_modules/php-parser/src/ast/reference.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "reference";
      var Reference = Node.extends(KIND, function Reference2(kind, docs, location) {
        Node.apply(this, [kind || KIND, docs, location]);
      });
      module.exports = Reference;
    }
  });

  // node_modules/php-parser/src/ast/name.js
  var require_name = __commonJS({
    "node_modules/php-parser/src/ast/name.js"(exports, module) {
      "use strict";
      var Reference = require_reference();
      var KIND = "name";
      var Name = Reference.extends(
        KIND,
        function Name2(name, resolution, docs, location) {
          Reference.apply(this, [KIND, docs, location]);
          this.name = name.replace(/\\$/, "");
          this.resolution = resolution;
        }
      );
      Name.UNQUALIFIED_NAME = "uqn";
      Name.QUALIFIED_NAME = "qn";
      Name.FULL_QUALIFIED_NAME = "fqn";
      Name.RELATIVE_NAME = "rn";
      module.exports = Name;
    }
  });

  // node_modules/php-parser/src/ast/namespace.js
  var require_namespace2 = __commonJS({
    "node_modules/php-parser/src/ast/namespace.js"(exports, module) {
      "use strict";
      var Block = require_block();
      var KIND = "namespace";
      module.exports = Block.extends(
        KIND,
        function Namespace(name, children, withBrackets, docs, location) {
          Block.apply(this, [KIND, children, docs, location]);
          this.name = name;
          this.withBrackets = withBrackets || false;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/namedargument.js
  var require_namedargument = __commonJS({
    "node_modules/php-parser/src/ast/namedargument.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "namedargument";
      module.exports = Expression.extends(
        KIND,
        function namedargument(name, value, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.name = name;
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/new.js
  var require_new = __commonJS({
    "node_modules/php-parser/src/ast/new.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "new";
      module.exports = Expression.extends(
        KIND,
        function New(what, args, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.what = what;
          this.arguments = args;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/noop.js
  var require_noop = __commonJS({
    "node_modules/php-parser/src/ast/noop.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "noop";
      module.exports = Node.extends(KIND, function Noop(docs, location) {
        Node.apply(this, [KIND, docs, location]);
      });
    }
  });

  // node_modules/php-parser/src/ast/nowdoc.js
  var require_nowdoc = __commonJS({
    "node_modules/php-parser/src/ast/nowdoc.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "nowdoc";
      module.exports = Literal.extends(
        KIND,
        function Nowdoc(value, raw, label, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
          this.label = label;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/nullkeyword.js
  var require_nullkeyword = __commonJS({
    "node_modules/php-parser/src/ast/nullkeyword.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "nullkeyword";
      module.exports = Node.extends(KIND, function NullKeyword(raw, docs, location) {
        Node.apply(this, [KIND, docs, location]);
        this.raw = raw;
      });
    }
  });

  // node_modules/php-parser/src/ast/nullsafepropertylookup.js
  var require_nullsafepropertylookup = __commonJS({
    "node_modules/php-parser/src/ast/nullsafepropertylookup.js"(exports, module) {
      "use strict";
      var Lookup = require_lookup();
      var KIND = "nullsafepropertylookup";
      module.exports = Lookup.extends(
        KIND,
        function NullSafePropertyLookup(what, offset, docs, location) {
          Lookup.apply(this, [KIND, what, offset, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/number.js
  var require_number = __commonJS({
    "node_modules/php-parser/src/ast/number.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "number";
      module.exports = Literal.extends(
        KIND,
        function Number2(value, raw, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/offsetlookup.js
  var require_offsetlookup = __commonJS({
    "node_modules/php-parser/src/ast/offsetlookup.js"(exports, module) {
      "use strict";
      var Lookup = require_lookup();
      var KIND = "offsetlookup";
      module.exports = Lookup.extends(
        KIND,
        function OffsetLookup(what, offset, docs, location) {
          Lookup.apply(this, [KIND, what, offset, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/parameter.js
  var require_parameter = __commonJS({
    "node_modules/php-parser/src/ast/parameter.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "parameter";
      module.exports = Declaration.extends(
        KIND,
        function Parameter(name, type, value, isRef, isVariadic, readonly, nullable, flags, hooks, flagsSet, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.value = value;
          this.type = type;
          this.byref = isRef;
          this.variadic = isVariadic;
          this.readonly = readonly;
          this.nullable = nullable;
          this.flags = flags || 0;
          this.hooks = hooks || [];
          this.flagsSet = flagsSet || 0;
          this.attrGroups = [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/parentreference.js
  var require_parentreference = __commonJS({
    "node_modules/php-parser/src/ast/parentreference.js"(exports, module) {
      "use strict";
      var Reference = require_reference();
      var KIND = "parentreference";
      var ParentReference = Reference.extends(
        KIND,
        function ParentReference2(raw, docs, location) {
          Reference.apply(this, [KIND, docs, location]);
          this.raw = raw;
        }
      );
      module.exports = ParentReference;
    }
  });

  // node_modules/php-parser/src/ast/post.js
  var require_post = __commonJS({
    "node_modules/php-parser/src/ast/post.js"(exports, module) {
      "use strict";
      var Operation = require_operation();
      var KIND = "post";
      module.exports = Operation.extends(
        KIND,
        function Post(type, what, docs, location) {
          Operation.apply(this, [KIND, docs, location]);
          this.type = type;
          this.what = what;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/pre.js
  var require_pre = __commonJS({
    "node_modules/php-parser/src/ast/pre.js"(exports, module) {
      "use strict";
      var Operation = require_operation();
      var KIND = "pre";
      module.exports = Operation.extends(
        KIND,
        function Pre(type, what, docs, location) {
          Operation.apply(this, [KIND, docs, location]);
          this.type = type;
          this.what = what;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/print.js
  var require_print = __commonJS({
    "node_modules/php-parser/src/ast/print.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "print";
      module.exports = Expression.extends(
        KIND,
        function Print(expression2, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.expression = expression2;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/program.js
  var require_program = __commonJS({
    "node_modules/php-parser/src/ast/program.js"(exports, module) {
      "use strict";
      var Block = require_block();
      var KIND = "program";
      module.exports = Block.extends(
        KIND,
        function Program(children, errors, comments, tokens, docs, location) {
          Block.apply(this, [KIND, children, docs, location]);
          this.errors = errors;
          if (comments) {
            this.comments = comments;
          }
          if (tokens) {
            this.tokens = tokens;
          }
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/property.js
  var require_property2 = __commonJS({
    "node_modules/php-parser/src/ast/property.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "property";
      module.exports = Statement.extends(
        KIND,
        function Property(name, value, readonly, nullable, type, attrGroups, hooks, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.name = name;
          this.value = value;
          this.readonly = readonly;
          this.nullable = nullable;
          this.type = type;
          this.attrGroups = attrGroups;
          this.hooks = hooks || [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/propertyhook.js
  var require_propertyhook = __commonJS({
    "node_modules/php-parser/src/ast/propertyhook.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "propertyhook";
      module.exports = Node.extends(
        KIND,
        function PropertyHook(name, isFinal, byref, parameter, body, attrGroups, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.name = name;
          this.isFinal = isFinal;
          this.byref = byref;
          this.parameter = parameter;
          this.body = body;
          this.attrGroups = attrGroups || [];
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/propertylookup.js
  var require_propertylookup = __commonJS({
    "node_modules/php-parser/src/ast/propertylookup.js"(exports, module) {
      "use strict";
      var Lookup = require_lookup();
      var KIND = "propertylookup";
      module.exports = Lookup.extends(
        KIND,
        function PropertyLookup(what, offset, docs, location) {
          Lookup.apply(this, [KIND, what, offset, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/propertystatement.js
  var require_propertystatement = __commonJS({
    "node_modules/php-parser/src/ast/propertystatement.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "propertystatement";
      var IS_UNDEFINED = "";
      var IS_PUBLIC = "public";
      var IS_PROTECTED = "protected";
      var IS_PRIVATE = "private";
      var VISIBILITY_MAP = [IS_PUBLIC, IS_PROTECTED, IS_PRIVATE];
      var PropertyStatement = Statement.extends(
        KIND,
        function PropertyStatement2(kind, properties, flags, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.properties = properties;
          this.parseFlags(flags);
        }
      );
      PropertyStatement.prototype.parseFlags = function(flags) {
        const [getVis, setVis] = flags[0];
        if (getVis === -1) {
          this.visibility = IS_UNDEFINED;
        } else if (getVis === null) {
          this.visibility = null;
        } else {
          this.visibility = VISIBILITY_MAP[getVis];
        }
        this.isStatic = flags[1] === 1;
        this.isAbstract = flags[2] === 1;
        this.isFinal = flags[2] === 2;
        this.visibilitySet = setVis !== -1 ? VISIBILITY_MAP[setVis] : null;
      };
      module.exports = PropertyStatement;
    }
  });

  // node_modules/php-parser/src/ast/retif.js
  var require_retif = __commonJS({
    "node_modules/php-parser/src/ast/retif.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "retif";
      module.exports = Expression.extends(
        KIND,
        function RetIf(test, trueExpr, falseExpr, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.test = test;
          this.trueExpr = trueExpr;
          this.falseExpr = falseExpr;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/return.js
  var require_return = __commonJS({
    "node_modules/php-parser/src/ast/return.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "return";
      module.exports = Statement.extends(KIND, function Return(expr2, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.expr = expr2;
      });
    }
  });

  // node_modules/php-parser/src/ast/selfreference.js
  var require_selfreference = __commonJS({
    "node_modules/php-parser/src/ast/selfreference.js"(exports, module) {
      "use strict";
      var Reference = require_reference();
      var KIND = "selfreference";
      var SelfReference = Reference.extends(
        KIND,
        function SelfReference2(raw, docs, location) {
          Reference.apply(this, [KIND, docs, location]);
          this.raw = raw;
        }
      );
      module.exports = SelfReference;
    }
  });

  // node_modules/php-parser/src/ast/silent.js
  var require_silent = __commonJS({
    "node_modules/php-parser/src/ast/silent.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "silent";
      module.exports = Expression.extends(
        KIND,
        function Silent(expr2, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.expr = expr2;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/static.js
  var require_static = __commonJS({
    "node_modules/php-parser/src/ast/static.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "static";
      module.exports = Statement.extends(
        KIND,
        function Static(variables, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.variables = variables;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/staticvariable.js
  var require_staticvariable = __commonJS({
    "node_modules/php-parser/src/ast/staticvariable.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "staticvariable";
      module.exports = Node.extends(
        KIND,
        function StaticVariable(variable, defaultValue, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.variable = variable;
          this.defaultValue = defaultValue;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/staticlookup.js
  var require_staticlookup = __commonJS({
    "node_modules/php-parser/src/ast/staticlookup.js"(exports, module) {
      "use strict";
      var Lookup = require_lookup();
      var KIND = "staticlookup";
      module.exports = Lookup.extends(
        KIND,
        function StaticLookup(what, offset, docs, location) {
          Lookup.apply(this, [KIND, what, offset, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/staticreference.js
  var require_staticreference = __commonJS({
    "node_modules/php-parser/src/ast/staticreference.js"(exports, module) {
      "use strict";
      var Reference = require_reference();
      var KIND = "staticreference";
      var StaticReference = Reference.extends(
        KIND,
        function StaticReference2(raw, docs, location) {
          Reference.apply(this, [KIND, docs, location]);
          this.raw = raw;
        }
      );
      module.exports = StaticReference;
    }
  });

  // node_modules/php-parser/src/ast/string.js
  var require_string = __commonJS({
    "node_modules/php-parser/src/ast/string.js"(exports, module) {
      "use strict";
      var Literal = require_literal();
      var KIND = "string";
      module.exports = Literal.extends(
        KIND,
        function String2(isDoubleQuote, value, unicode, raw, docs, location) {
          Literal.apply(this, [KIND, value, raw, docs, location]);
          this.unicode = unicode;
          this.isDoubleQuote = isDoubleQuote;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/switch.js
  var require_switch2 = __commonJS({
    "node_modules/php-parser/src/ast/switch.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "switch";
      module.exports = Statement.extends(
        KIND,
        function Switch(test, body, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.test = test;
          this.body = body;
          this.shortForm = shortForm;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/throw.js
  var require_throw = __commonJS({
    "node_modules/php-parser/src/ast/throw.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "throw";
      module.exports = Statement.extends(KIND, function Throw(what, docs, location) {
        Statement.apply(this, [KIND, docs, location]);
        this.what = what;
      });
    }
  });

  // node_modules/php-parser/src/ast/trait.js
  var require_trait = __commonJS({
    "node_modules/php-parser/src/ast/trait.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "trait";
      module.exports = Declaration.extends(
        KIND,
        function Trait(name, body, docs, location) {
          Declaration.apply(this, [KIND, name, docs, location]);
          this.body = body;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/traitalias.js
  var require_traitalias = __commonJS({
    "node_modules/php-parser/src/ast/traitalias.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "traitalias";
      var IS_UNDEFINED = "";
      var IS_PUBLIC = "public";
      var IS_PROTECTED = "protected";
      var IS_PRIVATE = "private";
      module.exports = Node.extends(
        KIND,
        function TraitAlias(trait, method, as, flags, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.trait = trait;
          this.method = method;
          this.as = as;
          this.visibility = IS_UNDEFINED;
          if (flags) {
            const getVis = flags[0][0];
            if (getVis === 0) {
              this.visibility = IS_PUBLIC;
            } else if (getVis === 1) {
              this.visibility = IS_PROTECTED;
            } else if (getVis === 2) {
              this.visibility = IS_PRIVATE;
            }
          }
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/traitprecedence.js
  var require_traitprecedence = __commonJS({
    "node_modules/php-parser/src/ast/traitprecedence.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "traitprecedence";
      module.exports = Node.extends(
        KIND,
        function TraitPrecedence(trait, method, instead, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.trait = trait;
          this.method = method;
          this.instead = instead;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/traituse.js
  var require_traituse = __commonJS({
    "node_modules/php-parser/src/ast/traituse.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "traituse";
      module.exports = Node.extends(
        KIND,
        function TraitUse(traits, adaptations, docs, location) {
          Node.apply(this, [KIND, docs, location]);
          this.traits = traits;
          this.adaptations = adaptations;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/try.js
  var require_try2 = __commonJS({
    "node_modules/php-parser/src/ast/try.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "try";
      module.exports = Statement.extends(
        KIND,
        function Try(body, catches, always, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.body = body;
          this.catches = catches;
          this.always = always;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/typereference.js
  var require_typereference = __commonJS({
    "node_modules/php-parser/src/ast/typereference.js"(exports, module) {
      "use strict";
      var Reference = require_reference();
      var KIND = "typereference";
      var TypeReference = Reference.extends(
        KIND,
        function TypeReference2(name, raw, docs, location) {
          Reference.apply(this, [KIND, docs, location]);
          this.name = name;
          this.raw = raw;
        }
      );
      TypeReference.types = [
        "int",
        "float",
        "string",
        "bool",
        "object",
        "array",
        "callable",
        "iterable",
        "void",
        "static",
        "null",
        "never",
        "mixed",
        "true",
        "false"
      ];
      module.exports = TypeReference;
    }
  });

  // node_modules/php-parser/src/ast/unary.js
  var require_unary = __commonJS({
    "node_modules/php-parser/src/ast/unary.js"(exports, module) {
      "use strict";
      var Operation = require_operation();
      var KIND = "unary";
      module.exports = Operation.extends(
        KIND,
        function Unary(type, what, docs, location) {
          Operation.apply(this, [KIND, docs, location]);
          this.type = type;
          this.what = what;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/uniontype.js
  var require_uniontype = __commonJS({
    "node_modules/php-parser/src/ast/uniontype.js"(exports, module) {
      "use strict";
      var Declaration = require_declaration();
      var KIND = "uniontype";
      module.exports = Declaration.extends(
        KIND,
        function UnionType(types, docs, location) {
          Declaration.apply(this, [KIND, null, docs, location]);
          this.types = types;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/unset.js
  var require_unset = __commonJS({
    "node_modules/php-parser/src/ast/unset.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "unset";
      module.exports = Statement.extends(
        KIND,
        function Unset(variables, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.variables = variables;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/usegroup.js
  var require_usegroup = __commonJS({
    "node_modules/php-parser/src/ast/usegroup.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "usegroup";
      module.exports = Statement.extends(
        KIND,
        function UseGroup(name, type, items, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.name = name;
          this.type = type;
          this.items = items;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/useitem.js
  var require_useitem = __commonJS({
    "node_modules/php-parser/src/ast/useitem.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "useitem";
      var UseItem = Statement.extends(
        KIND,
        function UseItem2(name, alias, type, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.name = name;
          this.alias = alias;
          this.type = type;
        }
      );
      UseItem.TYPE_CONST = "const";
      UseItem.TYPE_FUNCTION = "function";
      module.exports = UseItem;
    }
  });

  // node_modules/php-parser/src/ast/variable.js
  var require_variable2 = __commonJS({
    "node_modules/php-parser/src/ast/variable.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "variable";
      module.exports = Expression.extends(
        KIND,
        function Variable(name, curly, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.name = name;
          this.curly = curly || false;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/variadic.js
  var require_variadic = __commonJS({
    "node_modules/php-parser/src/ast/variadic.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "variadic";
      module.exports = Expression.extends(
        KIND,
        function variadic(what, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.what = what;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/variadicplaceholder.js
  var require_variadicplaceholder = __commonJS({
    "node_modules/php-parser/src/ast/variadicplaceholder.js"(exports, module) {
      "use strict";
      var Node = require_node();
      var KIND = "variadicplaceholder";
      module.exports = Node.extends(
        KIND,
        function VariadicPlaceholder(docs, location) {
          Node.apply(this, [KIND, docs, location]);
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/while.js
  var require_while = __commonJS({
    "node_modules/php-parser/src/ast/while.js"(exports, module) {
      "use strict";
      var Statement = require_statement2();
      var KIND = "while";
      module.exports = Statement.extends(
        KIND,
        function While(test, body, shortForm, docs, location) {
          Statement.apply(this, [KIND, docs, location]);
          this.test = test;
          this.body = body;
          this.shortForm = shortForm;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/yield.js
  var require_yield = __commonJS({
    "node_modules/php-parser/src/ast/yield.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "yield";
      module.exports = Expression.extends(
        KIND,
        function Yield(value, key, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.value = value;
          this.key = key;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast/yieldfrom.js
  var require_yieldfrom = __commonJS({
    "node_modules/php-parser/src/ast/yieldfrom.js"(exports, module) {
      "use strict";
      var Expression = require_expression();
      var KIND = "yieldfrom";
      module.exports = Expression.extends(
        KIND,
        function YieldFrom(value, docs, location) {
          Expression.apply(this, [KIND, docs, location]);
          this.value = value;
        }
      );
    }
  });

  // node_modules/php-parser/src/ast.js
  var require_ast = __commonJS({
    "node_modules/php-parser/src/ast.js"(exports, module) {
      "use strict";
      var Location = require_location();
      var Position = require_position();
      var AST = function(withPositions, withSource) {
        this.withPositions = withPositions;
        this.withSource = withSource;
      };
      AST.precedence = {};
      [
        ["or"],
        ["xor"],
        ["and"],
        ["="],
        ["?"],
        ["??"],
        ["||"],
        ["&&"],
        ["|"],
        ["^"],
        ["&"],
        [
          "==",
          "!=",
          "===",
          "!==",
          /* '<>', */
          "<=>"
        ],
        ["<", "<=", ">", ">="],
        ["<<", ">>"],
        ["+", "-", "."],
        ["*", "/", "%"],
        ["!"],
        ["instanceof"],
        ["u-", "u+", "u~"],
        ["cast", "silent"],
        ["**"]
        // TODO: [ (array)
        // TODO: new
      ].forEach(function(list, index) {
        list.forEach(function(operator) {
          AST.precedence[operator] = index + 1;
        });
      });
      AST.prototype.isRightAssociative = function(operator) {
        return operator === "**" || operator === "??";
      };
      AST.prototype.swapLocations = function(target, first, last, parser) {
        if (this.withPositions) {
          if (!target || !target.loc || !first || !first.loc || !last || !last.loc) {
            return;
          }
          target.loc.start = first.loc.start;
          target.loc.end = last.loc.end;
          if (this.withSource) {
            target.loc.source = parser.lexer._input.substring(
              target.loc.start.offset,
              target.loc.end.offset
            );
          }
        }
      };
      AST.prototype.resolveLocations = function(target, first, last, parser) {
        if (this.withPositions) {
          if (!target || !target.loc || !first || !first.loc || !last || !last.loc) {
            return;
          }
          if (target.loc.start.offset > first.loc.start.offset) {
            target.loc.start = first.loc.start;
          }
          if (target.loc.end.offset < last.loc.end.offset) {
            target.loc.end = last.loc.end;
          }
          if (this.withSource) {
            target.loc.source = parser.lexer._input.substring(
              target.loc.start.offset,
              target.loc.end.offset
            );
          }
        }
      };
      AST.prototype.resolvePrecedence = function(result, parser) {
        let buffer, lLevel, rLevel;
        if (result.kind === "call") {
          this.resolveLocations(result, result.what, result, parser);
        } else if (result.kind === "propertylookup" || result.kind === "nullsafepropertylookup" || result.kind === "staticlookup" || result.kind === "offsetlookup" && result.offset) {
          this.resolveLocations(result, result.what, result.offset, parser);
        } else if (result.kind === "bin") {
          if (result.right && !result.right.parenthesizedExpression) {
            if (result.right.kind === "bin") {
              lLevel = AST.precedence[result.type];
              rLevel = AST.precedence[result.right.type];
              if (lLevel && rLevel && rLevel <= lLevel && (result.type !== result.right.type || !this.isRightAssociative(result.type))) {
                buffer = result.right;
                result.right = result.right.left;
                this.swapLocations(result, result.left, result.right, parser);
                buffer.left = this.resolvePrecedence(result, parser);
                this.swapLocations(buffer, buffer.left, buffer.right, parser);
                result = buffer;
              }
            } else if (result.right.kind === "retif") {
              lLevel = AST.precedence[result.type];
              rLevel = AST.precedence["?"];
              if (lLevel && rLevel && rLevel <= lLevel) {
                buffer = result.right;
                result.right = result.right.test;
                this.swapLocations(result, result.left, result.right, parser);
                buffer.test = this.resolvePrecedence(result, parser);
                this.swapLocations(buffer, buffer.test, buffer.falseExpr, parser);
                result = buffer;
              }
            }
          }
        } else if ((result.kind === "silent" || result.kind === "cast") && result.expr && !result.expr.parenthesizedExpression) {
          if (result.expr.kind === "bin") {
            buffer = result.expr;
            result.expr = result.expr.left;
            this.swapLocations(result, result, result.expr, parser);
            buffer.left = this.resolvePrecedence(result, parser);
            this.swapLocations(buffer, buffer.left, buffer.right, parser);
            result = buffer;
          } else if (result.expr.kind === "retif") {
            buffer = result.expr;
            result.expr = result.expr.test;
            this.swapLocations(result, result, result.expr, parser);
            buffer.test = this.resolvePrecedence(result, parser);
            this.swapLocations(buffer, buffer.test, buffer.falseExpr, parser);
            result = buffer;
          }
        } else if (result.kind === "unary") {
          if (result.what && !result.what.parenthesizedExpression) {
            if (result.what.kind === "bin") {
              lLevel = AST.precedence["u" + result.type] || AST.precedence[result.type];
              rLevel = AST.precedence[result.what.type];
              if (lLevel && rLevel && rLevel < lLevel) {
                buffer = result.what;
                result.what = result.what.left;
                this.swapLocations(result, result, result.what, parser);
                buffer.left = this.resolvePrecedence(result, parser);
                this.swapLocations(buffer, buffer.left, buffer.right, parser);
                result = buffer;
              }
            } else if (result.what.kind === "retif") {
              buffer = result.what;
              result.what = result.what.test;
              this.swapLocations(result, result, result.what, parser);
              buffer.test = this.resolvePrecedence(result, parser);
              this.swapLocations(buffer, buffer.test, buffer.falseExpr, parser);
              result = buffer;
            }
          }
        } else if (result.kind === "retif") {
          if (result.falseExpr && result.falseExpr.kind === "retif" && !result.falseExpr.parenthesizedExpression) {
            buffer = result.falseExpr;
            result.falseExpr = buffer.test;
            this.swapLocations(result, result.test, result.falseExpr, parser);
            buffer.test = this.resolvePrecedence(result, parser);
            this.swapLocations(buffer, buffer.test, buffer.falseExpr, parser);
            result = buffer;
          }
        } else if (result.kind === "assign") {
          if (result.right && result.right.kind === "bin" && !result.right.parenthesizedExpression) {
            lLevel = AST.precedence["="];
            rLevel = AST.precedence[result.right.type];
            if (lLevel && rLevel && rLevel < lLevel) {
              buffer = result.right;
              result.right = result.right.left;
              buffer.left = result;
              this.swapLocations(buffer, buffer.left, result.right, parser);
              result = buffer;
            }
          }
        } else if (result.kind === "expressionstatement") {
          this.swapLocations(result, result.expression, result, parser);
        }
        return result;
      };
      AST.prototype.prepare = function(kind, docs, parser) {
        let start = null;
        if (this.withPositions || this.withSource) {
          start = parser.position();
        }
        const self = this;
        const result = function() {
          const args = Array.prototype.slice.call(arguments);
          args.push(docs);
          if (self.withPositions || self.withSource) {
            let nodeStart = start;
            let nodeEnd = new Position(
              parser.prev[0],
              parser.prev[1],
              parser.prev[2]
            );
            if (nodeStart.offset > nodeEnd.offset) {
              const tmp = nodeStart;
              nodeStart = nodeEnd;
              nodeEnd = tmp;
            }
            let src = null;
            if (self.withSource) {
              src = parser.lexer._input.substring(nodeStart.offset, nodeEnd.offset);
            }
            const location = new Location(src, nodeStart, nodeEnd);
            args.push(location);
          }
          if (!kind) {
            kind = args.shift();
          }
          const node = self[kind];
          if (typeof node !== "function") {
            throw new Error('Undefined node "' + kind + '"');
          }
          const astNode = Object.create(node.prototype);
          node.apply(astNode, args);
          result.instance = astNode;
          if (result.trailingComments) {
            astNode.trailingComments = result.trailingComments;
          }
          if (typeof result.postBuild === "function") {
            result.postBuild(astNode);
          }
          if (parser.debug) {
            delete self.stack[result.stackUid];
          }
          return self.resolvePrecedence(astNode, parser);
        };
        if (parser.debug) {
          if (!this.stack) {
            this.stack = {};
            this.stackUid = 1;
          }
          this.stack[++this.stackUid] = {
            position: start,
            stack: new Error().stack.split("\n").slice(3, 5)
          };
          result.stackUid = this.stackUid;
        }
        result.setTrailingComments = function(docs2) {
          if (result.instance) {
            result.instance.setTrailingComments(docs2);
          } else {
            result.trailingComments = docs2;
          }
        };
        result.destroy = function(target) {
          if (docs) {
            if (target) {
              if (!target.leadingComments) {
                target.leadingComments = docs;
              } else {
                target.leadingComments = docs.concat(target.leadingComments);
              }
            } else {
              parser._docIndex = parser._docs.length - docs.length;
            }
          }
          if (parser.debug) {
            delete self.stack[result.stackUid];
          }
        };
        return result;
      };
      AST.prototype.checkNodes = function() {
        const errors = [];
        for (const k in this.stack) {
          if (Object.prototype.hasOwnProperty.call(this.stack, k)) {
            this.stack[k].key = k;
            errors.push(this.stack[k]);
          }
        }
        this.stack = {};
        return errors;
      };
      [
        require_array2(),
        require_arrowfunc(),
        require_assign(),
        require_assignref(),
        require_attribute2(),
        require_attrgroup(),
        require_bin(),
        require_block(),
        require_boolean(),
        require_break(),
        require_byref(),
        require_call(),
        require_case(),
        require_cast(),
        require_catch(),
        require_class2(),
        require_classconstant(),
        require_clone(),
        require_closure(),
        require_comment2(),
        require_commentblock(),
        require_commentline(),
        require_constant(),
        require_constantstatement(),
        require_continue(),
        require_declaration(),
        require_declare(),
        require_declaredirective(),
        require_do(),
        require_echo(),
        require_empty(),
        require_encapsed(),
        require_encapsedpart(),
        require_entry(),
        require_enum2(),
        require_enumcase(),
        require_error(),
        require_eval(),
        require_exit(),
        require_expression(),
        require_expressionstatement(),
        require_for(),
        require_foreach(),
        require_function2(),
        require_global(),
        require_goto(),
        require_halt(),
        require_identifier(),
        require_if2(),
        require_include(),
        require_inline(),
        require_interface(),
        require_intersectiontype(),
        require_isset(),
        require_label(),
        require_list(),
        require_literal(),
        require_lookup(),
        require_magic(),
        require_match(),
        require_matcharm(),
        require_method(),
        require_name(),
        require_namespace2(),
        require_namedargument(),
        require_new(),
        require_node(),
        require_noop(),
        require_nowdoc(),
        require_nullkeyword(),
        require_nullsafepropertylookup(),
        require_number(),
        require_offsetlookup(),
        require_operation(),
        require_parameter(),
        require_parentreference(),
        require_post(),
        require_pre(),
        require_print(),
        require_program(),
        require_property2(),
        require_propertyhook(),
        require_propertylookup(),
        require_propertystatement(),
        require_reference(),
        require_retif(),
        require_return(),
        require_selfreference(),
        require_silent(),
        require_statement2(),
        require_static(),
        require_staticvariable(),
        require_staticlookup(),
        require_staticreference(),
        require_string(),
        require_switch2(),
        require_throw(),
        require_trait(),
        require_traitalias(),
        require_traitprecedence(),
        require_traituse(),
        require_try2(),
        require_typereference(),
        require_unary(),
        require_uniontype(),
        require_unset(),
        require_usegroup(),
        require_useitem(),
        require_variable2(),
        require_variadic(),
        require_variadicplaceholder(),
        require_while(),
        require_yield(),
        require_yieldfrom()
      ].forEach(function(ctor) {
        AST.prototype[ctor.kind] = ctor;
      });
      module.exports = AST;
    }
  });

  // node_modules/php-parser/src/index.js
  var require_src = __commonJS({
    "node_modules/php-parser/src/index.js"(exports, module) {
      "use strict";
      var lexer = require_lexer();
      var parser = require_parser();
      var tokens = require_tokens2();
      var AST = require_ast();
      function combine(src, to) {
        const keys = Object.keys(src);
        let i = keys.length;
        while (i--) {
          const k = keys[i];
          if (k === "__proto__" || k === "constructor" || k === "prototype") {
            continue;
          }
          const val = src[k];
          if (val === null) {
            delete to[k];
          } else if (typeof val === "function") {
            to[k] = val.bind(to);
          } else if (Array.isArray(val)) {
            to[k] = Array.isArray(to[k]) ? to[k].concat(val) : val;
          } else if (typeof val === "object") {
            to[k] = typeof to[k] === "object" ? combine(val, to[k]) : val;
          } else {
            to[k] = val;
          }
        }
        return to;
      }
      var Engine = function(options) {
        if (typeof this === "function") {
          return new this(options);
        }
        this.tokens = tokens;
        this.lexer = new lexer(this);
        this.ast = new AST();
        this.parser = new parser(this.lexer, this.ast);
        if (options && typeof options === "object") {
          if (options.parser) {
            if (!options.lexer) {
              options.lexer = {};
            }
            if (options.parser.version) {
              if (typeof options.parser.version === "string") {
                let version = options.parser.version.split(".");
                version = parseInt(version[0]) * 100 + parseInt(version[1]);
                if (isNaN(version)) {
                  throw new Error("Bad version number : " + options.parser.version);
                } else {
                  options.parser.version = version;
                }
              } else if (typeof options.parser.version !== "number") {
                throw new Error("Expecting a number for version");
              }
              if (options.parser.version < 500 || options.parser.version > 900) {
                throw new Error("Can only handle versions between 5.x to 8.x");
              }
            }
          }
          combine(options, this);
          this.lexer.version = this.parser.version;
        }
      };
      var getStringBuffer = function(buffer) {
        return typeof buffer.write === "function" ? buffer.toString() : buffer;
      };
      Engine.create = function(options) {
        return new Engine(options);
      };
      Engine.parseEval = function(buffer, options) {
        const self = new Engine(options);
        return self.parseEval(buffer);
      };
      Engine.prototype.parseEval = function(buffer) {
        this.lexer.mode_eval = true;
        this.lexer.all_tokens = false;
        buffer = getStringBuffer(buffer);
        return this.parser.parse(buffer, "eval");
      };
      Engine.parseCode = function(buffer, filename, options) {
        if (typeof filename === "object" && !options) {
          options = filename;
          filename = "unknown";
        }
        const self = new Engine(options);
        return self.parseCode(buffer, filename);
      };
      Engine.prototype.parseCode = function(buffer, filename) {
        this.lexer.mode_eval = false;
        this.lexer.all_tokens = false;
        buffer = getStringBuffer(buffer);
        return this.parser.parse(buffer, filename);
      };
      Engine.tokenGetAll = function(buffer, options) {
        const self = new Engine(options);
        return self.tokenGetAll(buffer);
      };
      Engine.prototype.tokenGetAll = function(buffer) {
        this.lexer.mode_eval = false;
        this.lexer.all_tokens = true;
        buffer = getStringBuffer(buffer);
        const EOF = this.lexer.EOF;
        const names = this.tokens.values;
        this.lexer.setInput(buffer);
        let token = this.lexer.lex() || EOF;
        const result = [];
        while (token != EOF) {
          let entry = this.lexer.yytext;
          if (Object.prototype.hasOwnProperty.call(names, token)) {
            entry = [names[token], entry, this.lexer.yylloc.first_line];
          }
          result.push(entry);
          token = this.lexer.lex() || EOF;
        }
        return result;
      };
      module.exports = Engine;
      module.exports.tokens = tokens;
      module.exports.lexer = lexer;
      module.exports.AST = AST;
      module.exports.parser = parser;
      module.exports.combine = combine;
      module.exports.Engine = Engine;
      module.exports.default = Engine;
    }
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

  // src-js/eval/reflection.js
  var registerReflection = (compiler, name) => {
    if (!reflection_definitions_default[name.toLowerCase()]) return false;
    for (const [key, definition] of Object.entries(reflection_definitions_default)) {
      compiler.classes[key] = compiler.environment.classes[key] = definition.class;
      for (const [id, fn] of Object.entries(definition.functions)) compiler.functions[id] = { ...fn, source: compiler.source };
    }
    return true;
  };

  // src-js/eval/namespaces.js
  var resolveNamespaces = (ast, environment) => {
    const functions = new Set(Object.values(environment.functions || {}).map((fn) => fn.name.toLowerCase()));
    const collect = (node, namespace = "") => {
      if (!node || typeof node !== "object") return;
      if (node.kind === "namespace") namespace = node.name || "";
      if (node.kind === "function") functions.add(((namespace ? namespace + "\\" : "") + node.name.name).toLowerCase());
      for (const [key, value] of Object.entries(node)) if (key !== "loc") {
        if (Array.isArray(value)) value.forEach((part) => collect(part, namespace));
        else if (value && typeof value === "object") collect(value, namespace);
      }
    };
    collect(ast);
    const resolve = (name, type, namespace, aliases) => {
      if (name.startsWith("\\")) return name.slice(1);
      if (name.toLowerCase().startsWith("namespace\\")) return (namespace ? namespace + "\\" : "") + name.slice(10);
      const parts = name.split("\\"), alias = aliases[type][parts[0].toLowerCase()];
      if (alias) return [alias, ...parts.slice(1)].join("\\");
      const qualified = (namespace ? namespace + "\\" : "") + name;
      return type === "function" && !name.includes("\\") && !functions.has(qualified.toLowerCase()) ? name : qualified;
    };
    const walk = (node, namespace, aliases, parent = null, key = null) => {
      if (!node || typeof node !== "object") return node;
      if (node.kind === "namespace") return { kind: "block", namespaceBlock: true, loc: node.loc, children: scope(node.children, node.name || "") };
      if (["class", "interface", "trait", "enum", "function"].includes(node.kind) && node.name) {
        node.name.name = (namespace ? namespace + "\\" : "") + node.name.name;
      }
      if (node.kind === "name" && !(parent?.kind === "enum" && key === "valueType")) node.name = resolve(node.name, parent?.kind === "call" && key === "what" ? "function" : "class", namespace, aliases);
      for (const [field, value] of Object.entries(node)) if (field !== "loc") {
        if (Array.isArray(value)) node[field] = value.map((part) => walk(part, namespace, aliases, node, field));
        else if (value && typeof value === "object") walk(value, namespace, aliases, node, field);
      }
      return node;
    };
    const scope = (nodes, namespace) => {
      const aliases = { class: {}, function: {}, const: {} };
      for (const node of nodes) if (node.kind === "usegroup") for (const item of node.items) {
        const type = item.type || node.type || "class", name = (node.name ? node.name + "\\" : "") + item.name, alias = item.alias?.name || name.split("\\").at(-1);
        aliases[type][alias.toLowerCase()] = name.replace(/^\\/, "");
      }
      return nodes.filter((node) => node.kind !== "usegroup").flatMap((node) => {
        const result = walk(node, namespace, aliases);
        return result.namespaceBlock ? result.children : [result];
      });
    };
    ast.children = scope(ast.children, "");
    return ast;
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

  // src-js/eval/spl.js
  var registerSpl = (compiler, name) => {
    const key = name.toLowerCase();
    if (!Object.hasOwn(spl_definitions_default, key)) return false;
    for (const [key2, definition] of Object.entries(spl_definitions_default)) {
      compiler.classes[key2] = definition.class;
      compiler.environment.classes[key2] = definition.class;
      for (const [id, fn] of Object.entries(definition.functions)) compiler.functions[id] = { ...fn, source: compiler.source };
    }
    return true;
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

  // src-js/eval/intl.js
  var registerIntl = (compiler, name) => {
    if (!Object.hasOwn(intl_definitions_default, name.toLowerCase())) return false;
    for (const [key, definition] of Object.entries(intl_definitions_default)) {
      compiler.classes[key] = definition.class;
      compiler.environment.classes[key] = definition.class;
      for (const [id, fn] of Object.entries(definition.functions)) compiler.functions[id] = { ...fn, source: compiler.source };
    }
    return true;
  };

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

  // src-js/eval/dates.js
  var registerDates = (compiler, name) => {
    const key = name.toLowerCase();
    if (!Object.hasOwn(date_definitions_default, key)) return false;
    for (const [key2, definition] of Object.entries(date_definitions_default)) {
      compiler.classes[key2] = definition.class;
      compiler.environment.classes[key2] = definition.class;
      for (const [id, fn] of Object.entries(definition.functions)) compiler.functions[id] = { ...fn, source: compiler.source };
    }
    return true;
  };

  // src-js/eval/generators.js
  var containsYield = (node) => {
    if (!node || typeof node !== "object") return false;
    const rule = node.$expression;
    if (["yield", "yieldFrom"].includes(rule?.operation)) return true;
    if (rule?.operation === "eval") return containsYield(rule.left);
    return Object.values(node).some(containsYield);
  };
  var markGenerator = (fn) => {
    validateStaticLocals(fn.body, fn.source?.phpVersion);
    fn.generator = containsYield(fn.body);
    if (fn.generator && fn.name.toLowerCase().endsWith("::__construct")) throw new Error("A constructor cannot be a generator.");
    if (fn.generator && fn.returnType && !fn.returnType.types.some((type) => ["generator", "iterator", "traversable", "iterable", "object", "mixed"].includes(type))) throw new Error("A generator return type must accept Generator.");
  };
  var validateStaticLocals = (body, version = 80400) => {
    if (version < 80300) return;
    const seen = /* @__PURE__ */ new Set();
    const scan = (node) => {
      if (!node || typeof node !== "object" || node.$expression?.operation === "eval") return;
      if (node.$expression?.operation === "staticLocal") {
        const id = node.$expression.left;
        if (seen.has(id)) throw Object.assign(new Error("Duplicate declaration of static variable"), { name: "ParseError" });
        seen.add(id);
      }
      for (const child of Object.values(node)) scan(child);
    };
    scan(body);
  };

  // src-js/eval/compiler.js
  var import_src = __toESM(require_src(), 1);

  // src-js/eval/internal-interfaces.js
  var internalInterface = (key) => {
    const name = { jsonserializable: "JsonSerializable", stringable: "Stringable", countable: "Countable", arrayaccess: "ArrayAccess", traversable: "Traversable", iterator: "Iterator", iteratoraggregate: "IteratorAggregate" }[key];
    if (!name) return null;
    const signatures = {
      jsonserializable: [["jsonSerialize", [], null]],
      stringable: [["__toString", [], { types: ["string"], nullable: false }]],
      countable: [["count", [], null]],
      arrayaccess: [["offsetExists", ["offset"], null], ["offsetGet", ["offset"], null], ["offsetSet", ["offset", "value"], null], ["offsetUnset", ["offset"], null]],
      traversable: [],
      iterator: ["current", "next", "key", "valid", "rewind"].map((method) => [method, [], null]),
      iteratoraggregate: [["getIterator", [], null]]
    }[key];
    return { name, parent: null, ancestors: ["iterator", "iteratoraggregate"].includes(key) ? ["Traversable"] : [], interface: true, abstract: true, properties: {}, staticProperties: {}, constants: {}, methods: Object.fromEntries(signatures.map(([method, args, returnType]) => [method.toLowerCase(), {
      name: method,
      owner: name,
      visibility: "public",
      static: false,
      abstract: true,
      contract: { parameters: args.map((parameter) => ({ name: parameter, reference: false, variadic: false, rule: { types: ["mixed"], nullable: false } })), returnType }
    }])) };
  };

  // src-js/eval/anonymous.js
  var expr = (operation, left, right = null) => ({ $expression: { operation, left, right } });
  var idFor = (name) => "v" + [...new TextEncoder().encode(name)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  var visibility = (flags) => flags === 4 ? "private" : flags === 2 ? "protected" : "public";
  var subtype = (a, b, classes) => {
    if (!b || b.types.includes("mixed")) return true;
    if (!a) return false;
    return [...a.types, ...a.nullable ? ["null"] : []].every((group) => group === "never" || [...b.types, ...b.nullable ? ["null"] : []].some((target) => target.split("&").every((sup) => group.split("&").some((sub) => sub === sup || sub === "generator" && ["iterator", "traversable", "iterable", "object"].includes(sup) || ["true", "false"].includes(sub) && sup === "bool" || (sub === "array" || sub === "traversable" || classes[sub]?.ancestors.some((name) => name.toLowerCase() === "traversable")) && sup === "iterable" || sup === "object" && !!classes[sub] || classes[sub]?.ancestors.some((name) => name.toLowerCase() === sup)))));
  };
  var constant = (c, node) => {
    const value = c.value(node);
    const check = (item) => {
      if (!item || typeof item !== "object") return;
      const op = item.$expression?.operation;
      if (item.$local || item.$state || op && !["array", "add", "subtract", "multiply", "divide", "modulo", "power", "concat", "negate", "positive", "not", "objectConstant", "objectClass", "roundingMode"].includes(op)) c.fail(node, "Anonymous member defaults must be constant expressions");
      Object.values(item).forEach(check);
    };
    check(value);
    return value;
  };
  var compileAnonymous = (c, creation, declaredName = null) => {
    var _a;
    const node = creation.what, args = c.arguments(creation.arguments);
    if (!node.isAnonymous && !declaredName || node.attrGroups?.length || node.isAbstract) c.unsupported(node);
    if (node.isReadonly && (c.source.phpVersion ?? 80400) < 80300) c.fail(node, "Readonly anonymous classes require PHP 8.3");
    const name = declaredName || "class@anonymous:" + c.prefix + node.loc.start.offset, key = name.toLowerCase();
    if (c.environment.classes?.[key]) return expr("objectNew", name, { arguments: args, source: c.at(creation) });
    (_a = c.environment).classes || (_a.classes = {});
    if (Object.keys(c.environment.classes).length >= 64) c.fail(node, "Frontend class graph exceeds 64 definitions", "ValueError");
    const parentName = node.extends ? c.name(node.extends) : null, parent = parentName && c.environment.classes[parentName.toLowerCase()];
    if (["arrayiterator", "arrayobject"].includes(parentName?.toLowerCase())) c.fail(node, "Frontend classes cannot extend internal SPL classes");
    if (parent?.nativeDate) c.fail(node, "Frontend classes cannot extend internal date classes");
    if (parentName && !parent || parent?.final || parent?.interface) c.fail(node, "Anonymous classes require a compiled, non-final parent class");
    if (parent && !!parent.readonly !== !!node.isReadonly) c.fail(node, "A class and its parent must agree on readonly");
    const interfaces = (node.implements || []).map((item) => {
      const requested = c.name(item).toLowerCase();
      let found = c.environment.classes[requested];
      if (!found && (found = internalInterface(requested))) {
        if (Object.keys(c.environment.classes).length >= 64) c.fail(item, "Frontend class graph exceeds 64 definitions");
        c.classes[requested] = c.environment.classes[requested] = found;
        for (const ancestor of found.ancestors) if (!c.environment.classes[ancestor.toLowerCase()]) {
          if (Object.keys(c.environment.classes).length >= 64) c.fail(item, "Frontend class graph exceeds 64 definitions");
          c.classes[ancestor.toLowerCase()] = c.environment.classes[ancestor.toLowerCase()] = internalInterface(ancestor.toLowerCase());
        }
      }
      if (!found?.interface) c.fail(item, "Anonymous classes require compiled interfaces");
      return found;
    });
    const definition = { name, parent: parent?.name || null, ancestors: [.../* @__PURE__ */ new Set([...parent ? [parent.name, ...parent.ancestors] : [], ...interfaces.flatMap((i) => [i.name, ...i.ancestors])])], abstract: false, readonly: !!node.isReadonly, final: false, properties: {}, staticProperties: {}, methods: {}, constants: Object.assign({}, ...interfaces.map((i) => i.constants)) };
    const ancestry = definition.ancestors.map((name2) => name2.toLowerCase());
    const iterator = ancestry.includes("iterator"), aggregate = ancestry.includes("iteratoraggregate");
    if (iterator && aggregate || ancestry.includes("traversable") && !iterator && !aggregate) c.fail(node, "A frontend Traversable class must implement either Iterator or IteratorAggregate, not both");
    c.classes[key] = c.environment.classes[key] = definition;
    const previous = [c.options, c.allowThis, c.functionName, c.loops];
    c.options = { ...c.options, objectScope: name };
    const pending = [];
    try {
      for (const member of node.body) {
        if (member.attrGroups?.length) c.unsupported(member);
        if (member.kind === "method") {
          const method = c.name(member.name), lower = method.toLowerCase(), access = member.visibility || "public";
          if (member.isAbstract || !member.body || definition.methods[lower]) c.fail(member, "Anonymous methods need a unique body and cannot return a reference");
          if (lower.startsWith("__") && (!["__construct", "__get", "__set", "__isset", "__unset", "__call", "__callstatic", "__invoke", "__tostring", "__clone", "__debuginfo", "__serialize", "__unserialize", "__sleep", "__wakeup"].includes(lower) || !["__construct", "__clone"].includes(lower) && access !== "public")) c.fail(member, "Unsupported or non-public frontend magic method");
          const promoted = [];
          const parameters = member.arguments.map((arg) => {
            if (arg.attrGroups?.length || arg.hooks?.length || arg.flagsSet) c.unsupported(arg);
            const field = c.name(arg.name), rule = c.rule(arg.type, arg.nullable);
            if (arg.flags) {
              if (lower !== "__construct" || arg.variadic || definition.properties[field]) c.fail(arg, "Invalid promoted property");
              const readonly = !!node.isReadonly || !!arg.readonly;
              if (readonly && !rule) c.fail(arg, "Readonly properties must be typed");
              definition.properties[field] = { name: field, owner: name, visibility: visibility(arg.flags), readonly, rule, ...!rule ? { default: null } : {} };
              promoted.push({ name: field, id: idFor(field) });
            }
            return { name: field, id: idFor(field), rule, reference: !!arg.byref, variadic: !!arg.variadic, ...arg.value ? { default: constant(c, arg.value) } : {} };
          });
          const id = c.prefix + c.serial++;
          if (Object.keys(c.functions).length >= 256) c.fail(member, "Frontend eval exceeds 256 function definitions", "ValueError");
          const fn = { name: name + "::" + method, returnsReference: !!member.byref, parameters, returnType: c.rule(member.type, member.nullable) || (lower === "__tostring" ? { types: ["string"], nullable: false, property: "(function)" } : null), source: { ...c.at(member), function: method }, objectScope: name, bindThis: !member.isStatic, declared: true, promoted };
          if (lower === "__debuginfo" && (member.isStatic || parameters.length || fn.returnType && fn.returnType.types.some((type) => !["array", "null"].includes(type)))) c.fail(member, "__debugInfo() must be non-static, take no arguments and declare array or ?array if typed");
          c.functions[id] = fn;
          definition.methods[lower] = { name: method, id, owner: name, visibility: access, static: !!member.isStatic, abstract: false, final: !!member.isFinal };
          pending.push([id, member]);
          if (lower === "__tostring" && !definition.ancestors.includes("Stringable")) definition.ancestors.push("Stringable");
        } else if (member.kind === "propertystatement") {
          if (member.visibilitySet || member.isAbstract || member.isFinal) c.unsupported(member);
          let rule = null;
          for (const [index, property] of member.properties.entries()) {
            if (property.hooks?.length || property.attrGroups?.length) c.unsupported(property);
            if (!index) rule = c.rule(property.type, property.nullable);
            const field = c.name(property.name), readonly = !!node.isReadonly || !!member.properties[0].readonly, table = member.isStatic ? definition.staticProperties : definition.properties;
            if (table[field]) c.fail(property, "Cannot redeclare anonymous property");
            if (readonly && (member.isStatic || !rule || property.value)) c.fail(property, "Readonly properties must be typed instance properties without a default");
            table[field] = { name: field, owner: name, visibility: member.visibility || "public", readonly, rule, ...property.value ? { default: constant(c, property.value) } : !rule ? { default: null } : {} };
          }
        } else if (member.kind === "classconstant") {
          if (member.type) c.fail(member, "Anonymous constants require an untyped constant declaration");
          for (const entry of member.constants) definition.constants[c.name(entry.name)] = { owner: name, visibility: member.visibility || "public", value: constant(c, entry.value) };
        } else c.unsupported(member);
      }
      for (const [id, method] of pending) {
        c.allowThis = !method.isStatic;
        c.functionName = c.name(method.name);
        c.loops = 0;
        c.functions[id].body = c.statement(method.body);
        markGenerator(c.functions[id]);
        if (c.functions[id].generator && c.functions[id].returnsReference && JSON.stringify(c.functions[id].body).includes('"yieldFrom"')) c.fail(method, "Cannot use yield from inside a by-reference generator");
      }
      for (const table of ["properties", "staticProperties"]) for (const [field, property] of Object.entries(definition[table])) {
        if (Object.hasOwn(property, "default") && property.rule && (property.default == null || typeof property.default !== "object")) {
          const value = property.default, actual = value == null ? "null" : typeof value === "number" ? "int" : typeof value === "boolean" ? "bool" : typeof value;
          const rule = property.rule;
          if (!rule.types.includes("mixed") && !rule.types.includes(actual) && !(value == null && rule.nullable) && !(actual === "int" && rule.types.includes("float")) && !(value === true && rule.types.includes("true")) && !(value === false && rule.types.includes("false"))) c.fail(node, `Invalid default for typed property ${field}`);
        }
        let base2 = parent;
        while (base2) {
          const inherited2 = base2.properties[field] || base2.staticProperties[field];
          if (inherited2 && inherited2.visibility !== "private") {
            if (!base2[table][field] || !!property.readonly !== !!inherited2.readonly || !subtype(property.rule, inherited2.rule, c.environment.classes) || !subtype(inherited2.rule, property.rule, c.environment.classes) || ["public", "protected", "private"].indexOf(property.visibility) > ["public", "protected", "private"].indexOf(inherited2.visibility)) c.fail(node, `Incompatible inherited property ${field}`);
            break;
          }
          base2 = base2.parent && c.environment.classes[base2.parent.toLowerCase()];
        }
      }
      const inherited = {};
      let base = parent;
      while (base) {
        for (const [key2, member] of Object.entries(base.methods)) inherited[key2] || (inherited[key2] = member);
        base = base.parent && c.environment.classes[base.parent.toLowerCase()];
      }
      const methods = { ...inherited, ...definition.methods };
      const validate = (actual, required, key2) => {
        if (!actual || actual.abstract || actual.static !== required.static || ["public", "protected", "private"].indexOf(actual.visibility) > ["public", "protected", "private"].indexOf(required.visibility)) c.fail(node, `Anonymous method ${key2}() does not implement its inherited contract`);
        const a = actual.contract || c.functions[actual.id] || c.environment.functions?.[actual.id], b = required.contract || c.functions[required.id] || c.environment.functions?.[required.id];
        if (!a || !b) c.fail(node, "Missing inherited method signature");
        for (const [i, param] of b.parameters.entries()) {
          const candidate = a.parameters[i] || a.parameters.at(-1);
          if (!candidate || !a.parameters[i] && !candidate.variadic || !!param.reference !== !!candidate.reference || param.variadic && !candidate.variadic || Object.hasOwn(param, "default") && !Object.hasOwn(candidate, "default") && !candidate.variadic || !subtype(param.rule, candidate.rule, c.environment.classes)) c.fail(node, `Incompatible anonymous method ${key2}() parameter`);
        }
        if (a.parameters.slice(b.parameters.length).some((param) => !Object.hasOwn(param, "default") && !param.variadic) || !subtype(a.returnType, b.returnType, c.environment.classes)) c.fail(node, `Incompatible anonymous method ${key2}() signature`);
      };
      for (const protocol of interfaces) for (const [key2, required] of Object.entries(protocol.methods)) validate(methods[key2], required, key2);
      for (const [key2, required] of Object.entries(inherited)) {
        if (required.abstract) validate(methods[key2], required, key2);
        else if (definition.methods[key2] && required.visibility !== "private") {
          if (required.final) c.fail(node, `Cannot override final method ${key2}()`);
          if (key2 !== "__construct") validate(methods[key2], required, key2);
        }
      }
    } finally {
      [c.options, c.allowThis, c.functionName, c.loops] = previous;
    }
    return expr("objectNew", name, { arguments: args, source: c.at(creation) });
  };

  // src-js/eval/compiler.js
  import_src.default.AST.precedence["."] = 13.5;
  var expression = (operation, left, right = null) => ({ $expression: { operation, left, right } });
  var sequence = (actions) => ({ type: "sequence", actions });
  var encoder = new TextEncoder();
  var decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  var localId = (name) => "v" + [...encoder.encode(name)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  var binary = { "<<": "shiftLeft", ">>": "shiftRight", xor: "xor", "+": "add", "-": "subtract", "*": "multiply", "/": "divide", "%": "modulo", "**": "power", ".": "concat", "&&": "and", and: "and", "||": "or", or: "or", "??": "coalesce", "==": "equal", "!=": "notEqual", "<>": "notEqual", "===": "identical", "!==": "notIdentical", "<": "less", "<=": "lessEqual", ">": "greater", ">=": "greaterEqual", "<=>": "compare", "|": "bitOr", "&": "bitAnd", "^": "bitXor" };
  var parents = {
    Exception: ["Throwable", "Stringable"],
    Error: ["Throwable", "Stringable"],
    ReflectionException: ["Exception"],
    JsonException: ["Exception"],
    DateException: ["Exception"],
    DateMalformedStringException: ["DateException"],
    DateInvalidTimeZoneException: ["DateException"],
    DateMalformedIntervalStringException: ["DateException"],
    DateMalformedPeriodStringException: ["DateException"],
    DateInvalidOperationException: ["DateException"],
    LogicException: ["Exception"],
    RuntimeException: ["Exception"],
    ErrorException: ["Exception"],
    InvalidArgumentException: ["LogicException"],
    DomainException: ["LogicException"],
    LengthException: ["LogicException"],
    OutOfRangeException: ["LogicException"],
    OutOfBoundsException: ["RuntimeException"],
    OverflowException: ["RuntimeException"],
    RangeException: ["RuntimeException"],
    UnderflowException: ["RuntimeException"],
    UnexpectedValueException: ["RuntimeException"],
    TypeError: ["Error"],
    ArgumentCountError: ["TypeError"],
    ValueError: ["Error"],
    ArithmeticError: ["Error"],
    DivisionByZeroError: ["ArithmeticError"],
    AssertionError: ["Error"],
    UnhandledMatchError: ["Error"],
    CompileError: ["Error"],
    ParseError: ["CompileError"]
  };
  var hierarchy = (name) => (parents[name] || []).flatMap((parent) => [parent, ...hierarchy(parent)]);
  var hash = (text) => {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return (value >>> 0).toString(16);
  };
  var string = (raw, double) => {
    const output = [];
    let text = "";
    const flush = () => {
      output.push(...encoder.encode(text));
      text = "";
    };
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] !== "\\" || i + 1 === raw.length) {
        text += raw[i];
        continue;
      }
      const next = raw[i + 1];
      if (!double) {
        if (next === "\\" || next === "'") {
          text += next;
          i++;
        } else text += "\\";
        continue;
      }
      const escapes = { n: "\n", r: "\r", t: "	", v: "\v", e: "\x1B", f: "\f", "\\": "\\", "$": "$", '"': '"' };
      if (Object.hasOwn(escapes, next)) {
        text += escapes[next];
        i++;
        continue;
      }
      let match;
      if (match = raw.slice(i + 1).match(/^x([\da-f]{1,2})/i)) {
        flush();
        output.push(parseInt(match[1], 16));
        i += match[0].length;
      } else if (match = raw.slice(i + 1).match(/^([0-7]{1,3})/)) {
        flush();
        output.push(parseInt(match[1], 8) % 256);
        i += match[0].length;
      } else if (match = raw.slice(i + 1).match(/^u\{([\da-f]+)\}/i)) {
        text += String.fromCodePoint(parseInt(match[1], 16));
        i += match[0].length;
      } else text += "\\";
    }
    flush();
    try {
      return decoder.decode(new Uint8Array(output));
    } catch {
      throw Object.assign(new Error("Frontend strings must remain valid UTF-8"), { name: "ValueError" });
    }
  };
  var Compiler = class {
    constructor(code, options, environment, source) {
      this.code = code;
      this.options = options;
      this.environment = { ...environment, classes: { ...environment.classes } };
      this.classes = {};
      this.source = source;
      this.functions = /* @__PURE__ */ Object.create(null);
      this.declarations = /* @__PURE__ */ new WeakMap();
      this.prefix = "eval_" + hash(source.file + code) + "_";
      this.serial = 0;
      this.loops = 0;
      this.allowThis = options.boundThis !== false;
      this.functionName = "eval";
    }
    predeclare(node) {
      if (!node || typeof node !== "object") return;
      if (node.kind === "function") {
        if (Object.keys(this.functions).length >= 256) this.fail(node, "Frontend eval exceeds 256 function definitions", "ValueError");
        const id = this.prefix + this.serial++;
        this.declarations.set(node, id);
        this.functions[id] = { name: this.name(node.name), declared: false };
      }
      for (const [key, value] of Object.entries(node)) if (key !== "loc") {
        if (Array.isArray(value)) value.forEach((child) => this.predeclare(child));
        else this.predeclare(value);
      }
    }
    at(node) {
      return { ...this.source, line: node?.loc?.start?.line || 1, function: this.functionName };
    }
    fail(node, message, name = "Error") {
      throw Object.assign(new Error(message), { name, source: this.at(node) });
    }
    unsupported(node) {
      this.fail(node, `Frontend eval does not support PHP ${node?.kind || "syntax"}`);
    }
    name(node) {
      if (["staticreference", "selfreference", "parentreference"].includes(node?.kind)) return node.raw;
      if (node?.kind !== "name" && node?.kind !== "identifier" && node?.kind !== "typereference") this.unsupported(node);
      return node.name.replace(/^\\/, "");
    }
    variable(node) {
      if (node.name === "this" && this.options.objectScope && this.allowThis) return expression("objectThis", null);
      if (typeof node.name !== "string") return expression("dynamicLocal", this.value(node.name));
      if (node.name === "this" || /^(?:GLOBALS|_SERVER|_GET|_POST|_FILES|_COOKIE|_SESSION|_REQUEST|_ENV)$/.test(node.name)) this.fail(node, "Frontend eval requires an ordinary local variable");
      return { $local: localId(node.name) };
    }
    hasNullsafeReceiver(node) {
      while (node) {
        if (node.kind === "nullsafepropertylookup") return true;
        if (["propertylookup", "offsetlookup", "staticlookup"].includes(node.kind)) node = node.what;
        else if (node.kind === "call" && ["propertylookup", "nullsafepropertylookup", "staticlookup"].includes(node.what.kind)) node = node.what;
        else break;
      }
      return false;
    }
    target(node, append = false, write = true) {
      if (write && this.hasNullsafeReceiver(node)) this.fail(node, "Can't use nullsafe operator in write context");
      if (node.kind === "variable") return this.variable(node);
      if (node.kind === "propertylookup" && node.what.kind === "variable" && node.what.name === "this" && !this.options.objectScope && node.offset.kind === "identifier") {
        if (!this.allowThis || !Object.hasOwn(this.options.states || {}, node.offset.name)) this.fail(node, `Unknown frontend State $this->${node.offset.name}`);
        return this.options.states[node.offset.name];
      }
      if (node.kind === "staticlookup" && node.offset.kind === "variable") return this.staticProperty(node);
      if (node.kind === "propertylookup") return expression("objectProperty", this.value(node.what), { name: node.offset.kind === "identifier" ? this.name(node.offset) : this.value(node.offset) });
      if (node.kind === "offsetlookup") {
        if (!node.offset && !append) this.fail(node, "Cannot read an array append target");
        return expression(node.offset ? "offset" : "appendOffset", ["call", "new"].includes(node.what.kind) || node.what.kind === "variable" && node.what.name === "this" ? this.value(node.what) : this.target(node.what, append, write), node.offset ? this.value(node.offset) : null);
      }
      this.fail(node, "Frontend eval assignment requires a local, State or array offset");
    }
    staticProperty(node) {
      const target = this.classTarget(node.what);
      return expression("objectStaticProperty", target, { name: typeof node.offset.name === "string" ? node.offset.name : this.value(node.offset.name) });
    }
    arguments(nodes) {
      return nodes.map((node) => node.kind === "namedargument" ? { name: node.name, value: this.value(node.value) } : node.kind === "variadic" ? { spread: true, value: this.value(node.what) } : { value: this.value(node) });
    }
    typeName(node) {
      const name = this.name(node).toLowerCase(), scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()];
      return name === "self" ? scope?.name?.toLowerCase() || name : name === "parent" ? scope?.parent?.toLowerCase() || name : name === "static" && scope ? "@static" : name;
    }
    rule(node, nullable = false) {
      if (!node) return null;
      if (node.kind === "intersectiontype" && node.types.some((member) => ["int", "float", "string", "bool", "array", "object", "iterable", "callable", "mixed", "null", "true", "false", "void", "never", "self", "parent", "static"].includes(this.name(member).toLowerCase()))) this.fail(node, "Intersection members must be class or interface names");
      const types = node.kind === "uniontype" ? node.types.flatMap((type) => this.rule(type).types) : node.kind === "intersectiontype" ? [node.types.map((type) => this.name(type).toLowerCase()).join("&")] : [this.typeName(node)];
      for (const type of types.flatMap((group) => group.split("&"))) if (!this.environment.classes[type]) {
        registerIntl(this, type) || registerSpl(this, type) || registerReflection(this, type) || registerDates(this, type);
      }
      if (types.flatMap((group) => group.split("&")).some((type) => !["int", "float", "string", "bool", "null", "true", "false", "mixed", "array", "object", "iterable", "callable", "closure", "void", "never", "@static", "roundingmode", "unitenum", "backedenum", "jsonserializable", "stringable", "countable", "arrayaccess", "traversable", "iterator", "iteratoraggregate", "generator", "arrayiterator", "arrayobject", "throwable", ...Object.keys(parents).map((name) => name.toLowerCase()), ...Object.values(this.environment.classes || {}).flatMap((item) => [item.name, ...item.ancestors].map((name) => name.toLowerCase()))].includes(type))) this.fail(node, "Frontend eval supports scalar, array and callable type declarations");
      return { types, nullable: nullable || types.includes("null") || types.includes("mixed"), property: "(function)" };
    }
    function(node) {
      if (node.attrGroups?.length) this.fail(node, "Frontend eval does not support attributes or returns by reference");
      const id = this.declarations.get(node) || this.prefix + this.serial++, named = node.kind === "function", name = named ? this.name(node.name) : "{closure}";
      if (!this.declarations.has(node) && Object.keys(this.functions).length >= 256) this.fail(node, "Frontend eval exceeds 256 function definitions", "ValueError");
      const parameters = node.arguments.map((arg) => {
        if (arg.attrGroups?.length || arg.flags) this.unsupported(arg);
        return { name: arg.name.name, id: localId(arg.name.name), reference: arg.byref, variadic: arg.variadic, rule: this.rule(arg.type, arg.nullable), ...arg.value ? { default: this.value(arg.value) } : {} };
      });
      const captures = [];
      if (node.kind === "closure") for (const use of node.uses || []) captures.push({ id: localId(use.name), reference: !!use.byref, value: this.variable(use) });
      if (node.kind === "arrowfunc") {
        const names = /* @__PURE__ */ new Set();
        const scan = (child, bound) => {
          if (!child || typeof child !== "object" || child.kind === "function") return;
          if (child.kind === "variable" && typeof child.name === "string" && child.name !== "this" && !bound.has(child.name)) names.add(child.name);
          if (child.kind === "staticlookup" && child.offset.kind === "variable") {
            scan(child.what, bound);
            return;
          }
          if (child.kind === "closure") {
            for (const use of child.uses || []) scan(use, bound);
            return;
          }
          if (child.kind === "arrowfunc") {
            scan(child.body, /* @__PURE__ */ new Set([...bound, ...child.arguments.map((arg) => arg.name.name)]));
            return;
          }
          for (const [key, value] of Object.entries(child)) if (key !== "loc") {
            if (Array.isArray(value)) value.forEach((part) => scan(part, bound));
            else scan(value, bound);
          }
        };
        scan(node.body, new Set(parameters.map((arg) => arg.name)));
        for (const name2 of names) captures.push({ id: localId(name2), reference: false, value: { $local: localId(name2) } });
      }
      const previous = [this.allowThis, this.functionName, this.loops];
      this.allowThis = !named && !node.isStatic && this.allowThis;
      this.functionName = name;
      this.loops = 0;
      this.functions[id] = { name, declared: !named };
      try {
        const body = node.kind === "arrowfunc" ? { type: "return", value: this.value(node.body), hasValue: true, phpSource: this.at(node.body) } : this.statement(node.body);
        this.functions[id] = { name, returnsReference: !!node.byref, parameters, returnType: this.rule(node.type, node.nullable), body, source: this.at(node), declared: !named, objectScope: named ? null : this.options.objectScope || null, bindThis: !named && !node.isStatic && this.allowThis && !!this.options.objectScope };
        markGenerator(this.functions[id]);
        if (this.functions[id].generator && node.byref && JSON.stringify(this.functions[id].body).includes('"yieldFrom"')) this.fail(node, "Cannot use yield from inside a by-reference generator");
      } finally {
        [this.allowThis, this.functionName, this.loops] = previous;
      }
      return named ? { type: "function-declare", id } : expression("closure", id, captures);
    }
    classTarget(node) {
      if (!["name", "identifier", "typereference", "staticreference", "selfreference", "parentreference"].includes(node?.kind)) return expression("objectClassName", this.value(node));
      const raw = this.name(node), lower = raw.toLowerCase(), scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()];
      registerDates(this, raw);
      registerSpl(this, raw);
      registerIntl(this, raw);
      registerReflection(this, raw);
      return lower === "static" ? "@static" : lower === "self" ? scope?.name : lower === "parent" ? scope?.parent : raw;
    }
    value(node) {
      const result = this.rawValue(node);
      let cursor = result;
      while (cursor?.$expression) {
        const e = cursor.$expression;
        if (e.operation === "nullsafeChain" || ["objectProperty", "objectCall"].includes(e.operation) && e.right?.nullable) return expression("nullsafeChain", result);
        if (!["objectProperty", "objectCall", "objectMethodRef", "offset", "objectClassName", "objectStaticProperty", "objectClass", "objectConstant"].includes(e.operation)) break;
        cursor = e.left ?? e.right?.class;
      }
      return result;
    }
    rawValue(node) {
      if (!node) return null;
      switch (node.kind) {
        case "yield":
          return expression("yield", this.value(node.key), { value: this.value(node.value), keyed: !!node.key });
        case "yieldfrom":
          return expression("yieldFrom", this.value(node.value));
        case "variable":
          return this.variable(node);
        case "boolean":
          return node.value;
        case "nullkeyword":
          return null;
        case "number": {
          const raw = node.value.replaceAll("_", ""), integer = /^(?:0[xX][\da-fA-F]+|0[bB][01]+|0[oO][0-7]+|\d+)$/.test(raw);
          const number = /^0[0-7]+$/.test(raw) ? parseInt(raw, 8) : Number(raw);
          if (!Number.isFinite(number) || integer && !Number.isSafeInteger(number)) this.fail(node, "Frontend numeric literal exceeds its safe range", "ValueError");
          return integer ? number : { $float: Object.is(number, -0) ? "-0" : number };
        }
        case "string":
          return string(node.raw.replace(/^[bB]?(?:'|")/, "").slice(0, -1), node.isDoubleQuote);
        case "nowdoc":
          return node.value;
        case "encapsedpart":
          return this.value(node.expression);
        case "encapsed": {
          if (node.type !== "string") this.unsupported(node);
          return node.value.reduce((left, part) => expression("concat", left, part.expression.kind === "string" ? string(part.expression.raw, true) : this.value(part.expression)), "");
        }
        case "name": {
          const name = this.name(node);
          if (Object.hasOwn(this.options.constants || {}, name)) return this.options.constants[name];
          this.fail(node, `Undefined frontend constant ${name}`);
          break;
        }
        case "magic":
          if (node.value === "__LINE__") return node.loc.start.line;
          this.unsupported(node);
          break;
        case "array":
          return expression("array", node.items.map((item) => {
            if (!item) this.fail(node, "Frontend array entries cannot be references or holes");
            return item.unpack ? { spread: this.value(item.value) } : { value: item.byRef ? this.target(item.value, true) : this.value(item.value), reference: !!item.byRef, ...item.key ? { key: this.value(item.key) } : {} };
          }));
        case "offsetlookup":
          return expression("offset", this.value(node.what), node.offset ? this.value(node.offset) : this.fail(node, "Cannot read an array append target"));
        case "propertylookup":
          return this.target(node, false, false);
        case "nullsafepropertylookup":
          return expression("objectProperty", this.value(node.what), { name: node.offset.kind === "identifier" ? this.name(node.offset) : this.value(node.offset), nullable: true });
        case "clone":
          return expression("objectClone", this.value(node.what));
        case "staticlookup": {
          if (node.offset.kind === "variable") return this.staticProperty(node);
          if (!["name", "identifier", "typereference", "staticreference", "selfreference", "parentreference"].includes(node.what.kind)) return expression(this.name(node.offset).toLowerCase() === "class" ? "objectClass" : "objectConstant", this.name(node.offset).toLowerCase() === "class" ? this.value(node.what) : this.classTarget(node.what), this.name(node.offset).toLowerCase() === "class" ? { dynamic: true } : this.name(node.offset));
          registerIntl(this, this.name(node.what));
          registerReflection(this, this.name(node.what));
          if (this.name(node.what).toLowerCase() === "roundingmode") return expression("roundingMode", this.name(node.offset));
          const raw = this.name(node.what), scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()];
          const target = raw.toLowerCase() === "static" ? "@static" : raw.toLowerCase() === "self" ? scope?.name : raw.toLowerCase() === "parent" ? scope?.parent : raw;
          if (target && (this.name(node.offset).toLowerCase() === "class" || target === "@static" || this.environment.classes?.[target.toLowerCase()])) return expression(this.name(node.offset).toLowerCase() === "class" ? "objectClass" : "objectConstant", target, this.name(node.offset));
          this.unsupported(node);
          break;
        }
        case "bin": {
          if (node.type === "instanceof") return expression("exceptionIs", this.value(node.left), ["name", "identifier", "typereference", "staticreference", "selfreference", "parentreference"].includes(node.right.kind) ? this.classTarget(node.right) : this.value(node.right));
          for (const group of [["<", "<=", ">", ">="], ["==", "!=", "===", "!==", "<>", "<=>"]]) if (group.includes(node.type) && [node.left, node.right].some((part) => part.kind === "bin" && group.includes(part.type) && !part.parenthesizedExpression)) this.fail(node, "Comparison operators are not associative", "ParseError");
          if (!Object.hasOwn(binary, node.type)) this.unsupported(node);
          return expression(binary[node.type], this.value(node.left), this.value(node.right));
        }
        case "unary": {
          const value = this.value(node.what);
          if (node.type === "~") return expression("bitNot", value);
          if (node.type === "!") return expression("not", value);
          if (node.type === "+") return expression("multiply", 1, value);
          if (node.type === "-") return expression("multiply", -1, value);
          this.unsupported(node);
          break;
        }
        case "cast": {
          const operation = { int: "toInt", float: "toFloat", string: "toString", bool: "toBool", array: "toArray", object: "toObject" }[node.type];
          if (!operation) this.unsupported(node);
          return expression(operation, this.value(node.expr));
        }
        case "retif":
          if ([node.test, node.falseExpr].some((part) => part?.kind === "retif" && !part.parenthesizedExpression && (part.trueExpr || node.trueExpr))) this.fail(node, "Unparenthesized nested ternary expressions are not supported by PHP 8", "ParseError");
          return node.trueExpr ? { $conditional: { left: this.value(node.test), operator: "truthy", right: true, then: this.value(node.trueExpr), otherwise: this.value(node.falseExpr) } } : expression("elvis", this.value(node.test), this.value(node.falseExpr));
        case "match":
          return expression("match", this.value(node.cond), node.arms.map((arm) => ({ default: !arm.conds, conditions: arm.conds?.map((cond) => this.value(cond)) || [], value: this.value(arm.body) })));
        case "isset":
          return node.variables.map((variable) => expression("isset", this.value(variable))).reduce((a, b) => expression("and", a, b));
        case "empty":
          return expression("empty", this.value(node.expression));
        case "assignref":
          if (this.hasNullsafeReceiver(node.right)) this.fail(node, "Cannot take reference of a nullsafe chain");
          return expression("assignReference", this.target(node.left, true), node.right.kind === "call" ? this.value(node.right) : this.target(node.right, true));
        case "assign": {
          const target = this.target(node.left, true), value = this.value(node.right);
          if (node.operator === "=") return expression("assign", target, value);
          if (node.operator === "??=") return expression("coalesceAssign", target, value);
          const operator = node.operator.slice(0, -1);
          if (!["+", "-", "*", "/", "%", "**", ".", "<<", ">>", "&", "|", "^"].includes(operator)) this.unsupported(node);
          return expression("compoundAssign", target, { operator, value });
        }
        case "pre":
        case "post":
          return expression(node.kind + (node.type === "+" ? "Increment" : "Decrement"), this.target(node.what));
        case "closure":
        case "arrowfunc":
          return this.function(node);
        case "eval":
          return expression("eval", this.value(node.source), { ...this.options, states: this.allowThis ? this.options.states : {}, boundThis: this.allowThis, source: this.at(node), program: void 0 });
        case "call": {
          if (["propertylookup", "nullsafepropertylookup"].includes(node.what.kind)) {
            const reference = node.arguments[0]?.kind === "variadicplaceholder";
            if (reference && this.hasNullsafeReceiver(node.what)) this.fail(node, "Cannot combine nullsafe operator with Closure creation");
            return expression(reference ? "objectMethodRef" : "objectCall", this.value(node.what.what), { name: node.what.offset.kind === "identifier" ? this.name(node.what.offset) : this.value(node.what.offset), nullable: node.what.kind === "nullsafepropertylookup", arguments: reference ? [] : this.arguments(node.arguments), source: this.at(node) });
          }
          if (node.what.kind === "staticlookup") {
            const name2 = this.classTarget(node.what.what), reference = node.arguments[0]?.kind === "variadicplaceholder";
            if (reference && this.hasNullsafeReceiver(node.what)) this.fail(node, "Cannot combine nullsafe operator with Closure creation");
            const lower = ["staticreference", "selfreference", "parentreference", "name"].includes(node.what.what.kind) ? this.name(node.what.what).toLowerCase() : "";
            return expression(reference ? "objectMethodRef" : "objectCall", null, { class: name2, name: node.what.offset.kind === "identifier" ? this.name(node.what.offset) : this.value(node.what.offset), forward: ["self", "parent", "static"].includes(lower), arguments: reference ? [] : this.arguments(node.arguments), source: this.at(node) });
          }
          const name = node.what.kind === "name" ? this.name(node.what) : null, target = name || this.value(node.what);
          if (name && /^numfmt_/i.test(name)) registerIntl(this, "NumberFormatter");
          if (name && /^(?:date_|timezone_)/i.test(name)) registerDates(this, "DateTime");
          if (node.arguments[0]?.kind === "variadicplaceholder") {
            if (!name) return target;
            const builtin = (this.environment.builtinNames || []).includes(name.toLowerCase());
            const found = Object.entries({ ...this.environment.functions, ...this.functions }).find(([, fn]) => fn?.name.toLowerCase() === name.toLowerCase());
            if (found) return expression("functionRef", found[0]);
            if (!builtin) this.fail(node, `Unknown frontend callable ${name}`);
            const id = this.prefix + this.serial++;
            this.functions[id] = { name, builtin: name.toLowerCase(), parameters: [], declared: true, source: this.at(node) };
            return expression("functionRef", id);
          }
          const args = this.arguments(node.arguments);
          if (name?.toLowerCase() === "assert") return expression("assert", args, { description: this.code.slice(node.loc.start.offset, node.loc.end.offset), source: this.at(node) });
          return expression("call", target, { arguments: args, source: { ...this.at(node), ...["call_user_func", "call_user_func_array"].includes(name?.toLowerCase()) ? { callbackDirect: true, callbackStrictTypes: this.at(node).strictTypes ?? true } : {} } });
        }
        case "new": {
          if (!["class", "name", "identifier", "typereference", "staticreference", "selfreference", "parentreference"].includes(node.what.kind)) return expression("objectNew", this.classTarget(node.what), { arguments: this.arguments(node.arguments), source: this.at(node) });
          if (node.what?.kind === "name") {
            registerSpl(this, this.name(node.what));
            registerDates(this, this.name(node.what));
            registerIntl(this, this.name(node.what));
            registerReflection(this, this.name(node.what));
          }
          if (node.what.kind === "class") return compileAnonymous(this, node);
          const requested = this.name(node.what), name = Object.keys(parents).find((key) => key.toLowerCase() === requested.toLowerCase());
          if (!name) {
            const scope = this.environment.classes?.[this.options.objectScope?.toLowerCase()], lower = requested.toLowerCase();
            const target = lower === "self" ? scope?.name : lower === "parent" ? scope?.parent : lower === "static" ? "@static" : requested;
            if (target !== "@static" && !this.environment.classes?.[target?.toLowerCase()]) this.fail(node, `Unknown compiled frontend class ${requested}`);
            return expression("objectNew", target, { arguments: this.arguments(node.arguments), source: this.at(node) });
          }
          return expression("exception", { name, parents: hierarchy(name), ctorKind: name === "ErrorException" ? name : hierarchy(name).includes("Exception") || name === "Exception" ? "Exception" : "Error" }, { arguments: this.arguments(node.arguments), source: this.at(node) });
        }
        case "throw":
          return expression("throw", this.value(node.what), this.at(node));
        default:
          this.unsupported(node);
      }
    }
    bindings(node, path = [], slots = []) {
      if (node.kind !== "list" && node.kind !== "array") return [{ target: this.target(node), path }];
      return node.items.flatMap((item, index) => {
        if (!item || !item.value) return [];
        if (item.unpack) this.unsupported(item);
        return this.bindings(item.value, [...path, item.key ? this.value(item.key) : index], [...slots, index]).map((binding) => ({ ...binding, reference: !!item.byRef }));
      });
    }
    statement(node) {
      if (!node) return sequence([]);
      const source = this.at(node), statement = this.instruction(node);
      return { ...statement, phpSource: source };
    }
    instruction(node) {
      const evaluate = (value) => ({ type: "evaluate", value: this.value(value), phpSource: this.at(value) });
      switch (node.kind) {
        case "program":
        case "block":
          return sequence(node.children.map((child) => this.statement(child)));
        case "expressionstatement": {
          const expr2 = node.expression;
          if (expr2.kind === "assign" && ["list", "array"].includes(expr2.left.kind) && expr2.operator === "=") return { type: "destructure", value: this.value(expr2.right), bindings: this.bindings(expr2.left) };
          if (expr2.kind === "call" && expr2.what.kind === "name" && this.name(expr2.what).toLowerCase() === "var_dump") return { type: "console", level: "dump", values: expr2.arguments.map((arg) => this.value(arg)) };
          return evaluate(expr2);
        }
        case "echo":
          return { type: "console", level: "echo", values: node.expressions.map((expr2) => this.value(expr2)) };
        case "return":
          return { type: "return", value: this.value(node.expr), hasValue: !!node.expr };
        case "if":
          return { type: "condition", left: this.value(node.test), operator: "truthy", value: true, then: this.statement(node.body), otherwise: node.alternate ? this.statement(node.alternate) : null };
        case "while":
        case "do":
        case "for": {
          this.loops++;
          try {
            return { type: "loop", kind: node.kind, init: sequence((node.init || []).map(evaluate)), conditions: node.kind === "for" ? node.test.map((expr2) => this.value(expr2)) : [this.value(node.test)], update: sequence((node.increment || []).map(evaluate)), action: this.statement(node.body), limit: 1e3 };
          } finally {
            this.loops--;
          }
        }
        case "foreach": {
          this.loops++;
          try {
            return { type: "foreach-local", source: node.value.byref ? this.target(node.source) : this.value(node.source), reference: !!node.value.byref, key: node.key ? this.target(node.key) : null, bindings: this.bindings(node.value), action: this.statement(node.body), limit: 1e3 };
          } finally {
            this.loops--;
          }
        }
        case "break":
        case "continue": {
          const levels = node.level ? this.value(node.level) : 1;
          if (!Number.isInteger(levels) || levels < 1 || levels > this.loops) this.fail(node, `Cannot ${node.kind} ${levels} levels`, "ParseError");
          return { type: "loop-control", operation: node.kind, levels };
        }
        case "switch": {
          this.loops++;
          try {
            return { type: "switch", value: this.value(node.test), cases: node.body.children.map((arm) => ({ default: !arm.test, ...arm.test ? { value: this.value(arm.test) } : {}, action: this.statement(arm.body) })) };
          } finally {
            this.loops--;
          }
        }
        case "try":
          return { type: "try", action: this.statement(node.body), catches: node.catches.map((branch) => ({ types: branch.what.map((type) => this.name(type)), variable: branch.variable ? this.target(branch.variable) : null, action: this.statement(branch.body) })), finally: node.always ? this.statement(node.always) : null };
        case "throw":
          return evaluate(node);
        case "enum": {
          const name = this.name(node.name), backing = node.valueType?.name || null, cases = Object.fromEntries(node.body.filter((member) => member.kind === "enumcase").map((member) => [this.name(member.name), member.value ? this.value(member.value) : null]));
          compileAnonymous(this, { what: { ...node, kind: "class", body: node.body.filter((member) => member.kind !== "enumcase") }, arguments: [], loc: node.loc }, name);
          const definition = this.classes[name.toLowerCase()];
          Object.assign(definition, { enum: true, backingType: backing, enumCases: cases, final: true, runtimeDeclaration: true });
          definition.ancestors.push("UnitEnum", ...backing ? ["BackedEnum"] : []);
          for (const [property, type] of Object.entries({ name: "string", ...backing ? { value: backing } : {} })) definition.properties[property] = { name: property, owner: name, visibility: "public", readonly: true, rule: { types: [type], nullable: false } };
          for (const key of Object.keys(cases)) definition.constants[key] = { owner: name, visibility: "public", value: expression("enumCase", name, key) };
          for (const method of ["cases", ...backing ? ["from", "tryFrom"] : []]) {
            const id = this.prefix + this.serial++;
            definition.methods[method.toLowerCase()] = { name: method, id, owner: name, static: true, visibility: "public", abstract: false, final: false };
            this.functions[id] = { name: name + "::" + method, parameters: method === "cases" ? [] : [{ id: "v76616c7565", name: "value", reference: false, variadic: false, rule: { types: [backing], nullable: false } }], returnType: null, declared: true, internal: true, objectScope: name, source: this.at(node), body: { type: "return", hasValue: true, value: expression(method === "cases" ? "enumCases" : "enumFrom", name, method === "cases" ? null : { value: { $local: "v76616c7565" }, nullable: method === "tryFrom" }) } };
          }
          return { type: "evaluate", value: expression("objectDeclare", name, definition) };
        }
        case "class": {
          const name = this.name(node.name);
          compileAnonymous(this, { what: node, arguments: [], loc: node.loc }, name);
          const definition = this.classes[name.toLowerCase()];
          definition.final = !!node.isFinal;
          definition.runtimeDeclaration = true;
          return { type: "evaluate", value: expression("objectDeclare", name, definition) };
        }
        case "function":
          return this.function(node);
        case "static":
          return sequence(node.variables.map((item) => {
            const variable = item.kind === "staticvariable" ? item.variable : item;
            const value = item.kind === "staticvariable" ? this.value(item.defaultValue) : null;
            const check = (part) => {
              if (!part || typeof part !== "object") return;
              if (part.$local || part.$state || part.$expression && !["array", "add", "subtract", "multiply", "divide", "modulo", "power", "concat", "not", "objectConstant", "objectClass", "roundingMode", "enumCase"].includes(part.$expression.operation)) this.fail(item, "Frontend static initializers must be constant expressions");
              Object.values(part).forEach(check);
            };
            if ((this.source.phpVersion ?? 80400) < 80300) check(value);
            return { type: "evaluate", value: expression("staticLocal", localId(variable.name), { value, scope: this.source.file + ":" + this.functionName + ":" + node.loc.start.line }) };
          }));
        case "unset":
          return sequence(node.variables.map((variable) => ({ type: "evaluate", value: expression("unsetOffset", this.target(variable)) })));
        default:
          this.unsupported(node);
      }
    }
  };
  var compileEval = (code, options = {}, environment = {}) => {
    const origin = options.source || { file: "[browser]", line: 1 };
    const source = { ...origin, file: `${origin.file}(${origin.line}) : eval()'d code`, line: 1, function: "eval", strictTypes: false };
    try {
      if (encoder.encode(code).length > 65536) throw Object.assign(new Error("Frontend eval source exceeds 64 KiB"), { name: "ValueError" });
      if (code === "") return { empty: true, source };
      const parser = new import_src.default({ parser: { version: "8.4" }, ast: { withPositions: true } }), ast = parser.parseEval(code);
      let count = 0;
      const scan = (node, depth = 0) => {
        if (!node || typeof node !== "object") return;
        if (depth > 128 || node.kind && ++count > 1e4) throw Object.assign(new Error("Frontend eval syntax exceeds its size or nesting limit"), { name: "ValueError" });
        for (const [key, value] of Object.entries(node)) if (key !== "loc") {
          if (Array.isArray(value)) value.forEach((child) => scan(child, depth + 1));
          else scan(value, depth + 1);
        }
      };
      scan(ast);
      resolveNamespaces(ast, environment);
      if (ast.children[0]?.kind === "declare") {
        const declaration = ast.children.shift(), [directive] = declaration.directives;
        if (declaration.mode !== "none" || declaration.directives.length !== 1 || directive.key.name !== "strict_types" || !["0", "1"].includes(directive.value.value)) throw new Error("Frontend eval only supports declare(strict_types=0 or 1);");
        source.strictTypes = directive.value.value === "1";
      }
      const compiler = new Compiler(code, options, environment, source);
      compiler.predeclare(ast);
      const declarations = ast.children.filter((node) => node.kind === "function").map((node) => compiler.statement(node));
      const rest = ast.children.filter((node) => node.kind !== "function").map((node) => compiler.statement(node));
      validateStaticLocals([...declarations, ...rest], source.phpVersion);
      if (containsYield([...declarations, ...rest])) throw new Error("yield is only allowed inside a generator function.");
      return { body: sequence([...declarations, ...rest]), functions: compiler.functions, classes: compiler.classes, source };
    } catch (error) {
      const parse = error instanceof SyntaxError || error.lineNumber !== void 0;
      return { error: { name: parse || error.name === "ParseError" ? "ParseError" : error.name === "ValueError" || error instanceof RangeError ? "ValueError" : "Error", message: error.message, source: error.source || { ...source, line: error.lineNumber || 1 } } };
    }
  };

  // src-js/core/version.js
  var ENGINE_VERSION = "0.1.0-beta.10";

  // src-js/eval-entry.js
  globalThis.AMLPhpEval = Object.freeze({ version: ENGINE_VERSION, compile: compileEval });
})();
}
