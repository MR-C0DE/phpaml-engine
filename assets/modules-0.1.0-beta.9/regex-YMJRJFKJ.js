import {
  arrayEntries,
  arrayKind,
  bounded,
  byteString,
  bytes,
  failure,
  fromByteString,
  isFrontendCallable,
  limit,
  makeArray,
  phpString,
  phpType,
  warn,
  work
} from "./chunk-HCVTEZMH.js";
import {
  __export,
  registerModule
} from "./chunk-RFV3LKK7.js";

// src-js/core/php-builtin-regex.js
var php_builtin_regex_exports = {};
__export(php_builtin_regex_exports, {
  runRegex: () => runRegex
});

// src-js/core/php-regex-vm.js
var php_regex_vm_exports = {};
__export(php_regex_vm_exports, {
  regexVM: () => regexVM
});
var regexVM = (source, flags, context) => {
  let i = 0, groups = 0;
  const names = /* @__PURE__ */ new Map(), unicode = flags.includes("u");
  const error = (message) => {
    throw new SyntaxError(message);
  };
  const choice = () => {
    const branches = [sequence()];
    while (source[i] === "|") {
      i++;
      branches.push(sequence());
    }
    return branches.length === 1 ? branches[0] : { type: "or", branches };
  };
  const sequence = () => {
    const nodes = [];
    while (i < source.length && source[i] !== ")" && source[i] !== "|") nodes.push(repetition());
    return { type: "sequence", nodes };
  };
  const repetition = () => {
    let node = atom();
    const match2 = source.slice(i).match(/^(\*|\+|\?|\{(\d+)(?:,(\d*))?\})/);
    if (!match2) return node;
    i += match2[0].length;
    const min = match2[1] === "*" || match2[1] === "?" ? 0 : match2[1] === "+" ? 1 : Number(match2[2]), max = match2[1] === "?" ? 1 : match2[1] === "*" || match2[1] === "+" ? Infinity : match2[3] === void 0 ? min : match2[3] === "" ? Infinity : Number(match2[3]);
    if (max < min) error("numbers out of order in quantifier");
    if (min > 1e3 || Number.isFinite(max) && max > 1e3) error("quantifier exceeds frontend limit");
    const lazy = source[i] === "?", possessive = source[i] === "+";
    if (lazy || possessive) i++;
    return { type: "repeat", node, min, max, lazy, possessive };
  };
  const atom = () => {
    const start = i, c = source[i++];
    if (c === "(") {
      let type = "capture", number = ++groups, name = null, negative = false, behind = false;
      if (source[i] === "?") {
        groups--;
        i++;
        const marker = source[i++];
        if (marker === ":") type = "group";
        else if (marker === ">") type = "atomic";
        else if (marker === "=" || marker === "!") {
          type = "look";
          negative = marker === "!";
        } else if (marker === "<") {
          if (source[i] === "=" || source[i] === "!") {
            type = "look";
            behind = true;
            negative = source[i++] === "!";
          } else {
            const end = source.indexOf(">", i);
            if (end < 0) error("unterminated group name");
            name = source.slice(i, end);
            i = end + 1;
            type = "capture";
            number = ++groups;
            names.set(name, number);
          }
        } else error("unsupported group prefix");
      }
      const node = choice();
      if (source[i++] !== ")") error("missing closing parenthesis");
      return { type, node, number, name, negative, behind };
    }
    if (c === "^") return { type: "start" };
    if (c === "$") return { type: "end" };
    if (c === "\\") {
      const next = source[i++];
      if (next === void 0) error("trailing backslash");
      if (/[1-9]/.test(next)) {
        let number = next;
        while (/\d/.test(source[i] || "")) number += source[i++];
        return { type: "backref", number: Number(number) };
      }
      if (next === "k" && source[i] === "<") {
        const end = source.indexOf(">", ++i);
        if (end < 0) error("unterminated backreference");
        const name = source.slice(i, end);
        i = end + 1;
        return { type: "backref", name };
      }
      if (next === "b" || next === "B") return { type: "boundary", negative: next === "B" };
      if (next === "p" || next === "P" || next === "u" && source[i] === "{") {
        if (source[i] === "{") {
          const end = source.indexOf("}", i);
          if (end < 0) error("unterminated escape");
          i = end + 1;
        }
      } else if (next === "x") i += 2;
      else if (next === "u") i += 4;
    } else if (c === "[") {
      let escaped = false;
      while (i < source.length) {
        const ch = source[i++];
        if (ch === "]" && !escaped) break;
        if (ch === "\\" && !escaped) escaped = true;
        else escaped = false;
      }
      if (source[i - 1] !== "]") error("missing closing bracket");
    } else if ("*+?{}".includes(c || "")) error("quantifier without atom");
    const raw = source.slice(start, i);
    let regex;
    try {
      regex = new RegExp(raw, "y" + flags.replace(/[gdy]/g, ""));
    } catch (e) {
      error(e.message);
    }
    return { type: "atom", regex };
  };
  const tree = choice();
  if (i !== source.length) error("unexpected closing parenthesis");
  let steps = 0;
  const tick = () => {
    if (++steps > 2e5) throw Object.assign(new Error("Backtrack limit exhausted"), { pcreError: 2 });
  };
  function* match(node, state, input, depth = 0) {
    tick();
    if (depth > 256) throw Object.assign(new Error("Recursion limit exhausted"), { pcreError: 3 });
    switch (node.type) {
      case "atom": {
        node.regex.lastIndex = state.pos;
        const found = node.regex.exec(input);
        if (found) yield { ...state, pos: node.regex.lastIndex };
        return;
      }
      case "start":
        if (state.pos === 0) yield state;
        return;
      case "end":
        if (state.pos === input.length) yield state;
        return;
      case "boundary": {
        const word = (c) => c !== void 0 && /[A-Za-z0-9_]/.test(c);
        if (word(input[state.pos - 1]) !== word(input[state.pos]) !== node.negative) yield state;
        return;
      }
      case "backref": {
        const capture = state.caps[node.number ?? names.get(node.name)];
        if (!capture) return;
        const text = input.slice(...capture), part = input.slice(state.pos, state.pos + text.length);
        if (flags.includes("i") ? part.toLowerCase() === text.toLowerCase() : part === text) yield { ...state, pos: state.pos + text.length };
        return;
      }
      case "or":
        for (const branch of node.branches) yield* match(branch, state, input, depth + 1);
        return;
      case "sequence":
        yield* chain(node.nodes, 0, state, input, depth + 1);
        return;
      case "group":
        yield* match(node.node, state, input, depth + 1);
        return;
      case "atomic": {
        for (const found of match(node.node, state, input, depth + 1)) {
          yield found;
          break;
        }
        return;
      }
      case "capture":
        for (const found of match(node.node, state, input, depth + 1)) {
          const caps = [...found.caps];
          caps[node.number] = [state.pos, found.pos];
          yield { ...found, caps };
        }
        return;
      case "look": {
        let found = null;
        if (node.behind) {
          for (let start = state.pos; start >= 0 && !found; start--) for (const result of match(node.node, { ...state, pos: start }, input, depth + 1)) if (result.pos === state.pos) {
            found = result;
            break;
          }
        } else for (const result of match(node.node, state, input, depth + 1)) {
          found = result;
          break;
        }
        if (node.negative ? !found : !!found) yield found && !node.negative ? { ...found, pos: state.pos } : state;
        return;
      }
      case "repeat": {
        let count = 0;
        for (const found of repeat(node, state, input, 0, depth + 1)) {
          yield found;
          if (node.possessive && ++count) break;
        }
        return;
      }
    }
  }
  function* chain(nodes, index, state, input, depth) {
    if (index === nodes.length) {
      yield state;
      return;
    }
    for (const found of match(nodes[index], state, input, depth)) yield* chain(nodes, index + 1, found, input, depth + 1);
  }
  function* repeat(node, state, input, count, depth) {
    tick();
    if (count > 1e3) throw Object.assign(new Error("Backtrack limit exhausted"), { pcreError: 2 });
    if (node.lazy && count >= node.min) yield state;
    if (count < node.max) for (const found of match(node.node, state, input, depth)) {
      if (found.pos === state.pos) {
        if (count + 1 >= node.min) yield found;
        else yield* repeat(node, found, input, count + 1, depth + 1);
      } else yield* repeat(node, found, input, count + 1, depth + 1);
    }
    if (!node.lazy && count >= node.min) yield state;
  }
  const engine = { lastIndex: 0, execAt(input, start, nonempty = false) {
    steps = 0;
    for (let offset = start; offset <= input.length; ) {
      for (const found of match(tree, { pos: offset, caps: [] }, input)) {
        if (nonempty && found.pos === offset) continue;
        const indices = [[offset, found.pos], ...Array.from({ length: groups }, (_, n) => found.caps[n + 1])];
        const result = indices.map((span) => span ? input.slice(...span) : void 0);
        result.indices = indices;
        result.index = offset;
        engine.lastIndex = found.pos;
        return result;
      }
      if (nonempty) break;
      offset += unicode && input.codePointAt(offset) > 65535 ? 2 : 1;
    }
    engine.lastIndex = 0;
    return null;
  }, exec(input) {
    return engine.execAt(input, engine.lastIndex);
  }, test(input) {
    return engine.exec(input) !== null;
  } };
  return engine;
};

// src-js/core/php-builtin-regex.js
var errorMessages = ["No error", "Internal error", "Backtrack limit exhausted", "Recursion limit exhausted", "Malformed UTF-8 characters, possibly incorrectly encoded", "The offset did not correspond to the beginning of a valid UTF-8 code point", "JIT stack limit exhausted"];
var unsupported = (message) => failure("ValueError", "Frontend PCRE subset: " + message);
var pattern = (raw, context) => {
  if (bytes(raw).length > 4096) throw limit("Frontend regex patterns are limited to 4096 bytes");
  if (!raw || /[A-Za-z0-9\\\s]/.test(raw[0])) throw new SyntaxError("Delimiter must not be alphanumeric, backslash, or whitespace");
  const open = raw[0], close = { "(": ")", "[": "]", "{": "}", "<": ">" }[open] || open;
  let end = -1;
  for (let i = raw.length - 1; i > 0; i--) if (raw[i] === close) {
    let escapes = 0;
    for (let j = i - 1; j >= 0 && raw[j] === "\\"; j--) escapes++;
    if (escapes % 2 === 0) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new SyntaxError("No ending delimiter found");
  const modifiers = raw.slice(end + 1);
  if (/[^imsuxAD]/.test(modifiers)) throw unsupported("supported modifiers are i, m, s, u, x, A and D");
  let body = raw.slice(1, end), clean = "", inClass = false, escaped = false, captures = [], group = 0, unbounded = 0, combinations = 1;
  if (modifiers.includes("x")) {
    for (let i = 0; i < body.length; i++) {
      const c = body[i];
      if (c === "\\") {
        clean += c + (body[++i] || "");
        continue;
      }
      if (c === "[") inClass = true;
      if (c === "]") inClass = false;
      if (!inClass && c === "#") {
        while (i < body.length && body[i] !== "\n") i++;
        continue;
      }
      if (!inClass && /[\t\n\r\f\v ]/.test(c)) continue;
      clean += c;
    }
    body = clean;
  }
  if (/\(\?(?:[a-z-]+[:)]|\(|\||R|[0-9])/.test(body)) throw unsupported("inline modes, conditionals and recursion are unavailable");
  if (/\\(?:[gKCRXhHvVNQEG])|\(\*|\[\[:/.test(body)) throw unsupported("PCRE-only escapes and POSIX classes are unavailable");
  body = body.replace(/\(\?P<([A-Za-z_][A-Za-z0-9_]*)>/g, "(?<$1>");
  inClass = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c === "[") {
      inClass = true;
      continue;
    }
    if (c === "]") {
      inClass = false;
      continue;
    }
    if (inClass) continue;
    if (c === "(" && body[i + 1] !== "?") {
      captures[++group] = null;
    } else if (c === "(" && body.slice(i, i + 3) === "(?<") {
      const found = body.slice(i).match(/^\(\?<([A-Za-z_][A-Za-z0-9_]*)>/);
      if (found) captures[++group] = found[1];
    }
    if (c === "|" || c === "?" && body[i - 1] !== "(" && !"*+}?".includes(body[i - 1] || "")) combinations *= 2;
    if ("*+".includes(c) || c === "{") {
      if (c === "{") {
        const match = body.slice(i).match(/^\{(\d+)(?:,(\d*))?\}/);
        if (!match) continue;
        const maximum = match[2] === "" ? Infinity : Number(match[2] ?? match[1]);
        if (!Number.isFinite(maximum)) unbounded++;
        else {
          if (maximum > 1e3) throw unsupported("bounded repetitions are limited to 1000");
          combinations *= Math.max(1, maximum - Number(match[1]) + 1);
        }
        i += match[0].length - 1;
      } else unbounded++;
    }
  }
  if (group > 32) throw unsupported("use at most 32 captures per pattern");
  const advanced = /\)[*+?{]|\(\?[=!>]|\(\?<[=!]|\\[1-9k]|[*+?]\?|[*+?}]\+|\|/.test(body) || unbounded > 1 || combinations > 1e3;
  body = body.replace(/\\A/g, "(?<![\\s\\S])").replace(/\\z/g, "(?![\\s\\S])").replace(/\\Z/g, "(?=\\n?(?![\\s\\S]))");
  const unicode = modifiers.includes("u");
  const word = unicode ? "\\p{L}\\p{N}_" + ((context.source?.phpVersion ?? 80400) >= 80400 ? "\\p{Mn}\\p{Pc}" : "") : "A-Za-z0-9_";
  let rewritten = "";
  inClass = false;
  for (let i = 0; i < body.length; i++) {
    let c = body[i];
    if (c === "[") inClass = true;
    if (c === "]") inClass = false;
    if (c === "\\" && i + 1 < body.length) {
      const next = body[++i];
      const classes = { s: unicode ? "\\p{Z}\\t\\n\\v\\f\\r" : "\\t\\n\\v\\f\\r ", w: word, d: unicode ? "\\p{Nd}" : "0-9" };
      if (classes[next.toLowerCase()]) {
        if (inClass && next === next.toUpperCase()) throw unsupported("negated shorthand classes inside a character class are unavailable");
        rewritten += inClass ? classes[next] : "[" + (next === next.toUpperCase() ? "^" : "") + classes[next.toLowerCase()] + "]";
      } else if (unicode && !inClass && (next === "b" || next === "B")) {
        const boundary = "(?:(?<=[" + word + "])(?![" + word + "])|(?<![" + word + "])(?=[" + word + "]))";
        rewritten += next === "b" ? boundary : "(?!" + boundary + ")";
      } else rewritten += "\\" + next;
    } else if (!inClass && c === "." && !modifiers.includes("s")) rewritten += "[^\\n]";
    else if (!inClass && c === "^" && modifiers.includes("m")) rewritten += "(?:^|(?<=\\n))";
    else if (!inClass && c === "$" && modifiers.includes("m")) rewritten += "(?=\\n|(?![\\s\\S]))";
    else if (!inClass && c === "$" && modifiers.includes("D") && !modifiers.includes("m")) rewritten += "(?![\\s\\S])";
    else if (!inClass && c === "$" && !modifiers.includes("m")) rewritten += "(?=\\n?(?![\\s\\S]))";
    else rewritten += c;
  }
  body = rewritten;
  if (modifiers.includes("A")) body = "^(?:" + body + ")";
  if (!unicode) body = byteString(body);
  const flags = "gd" + (unicode ? "u" : "") + (modifiers.includes("i") ? "i" : "") + (modifiers.includes("s") ? "s" : "");
  let regex;
  try {
    regex = advanced ? regexVM(body, flags, context) : new RegExp(body, flags);
  } catch (error) {
    throw new SyntaxError(error.message);
  }
  work(context, raw.length);
  return { regex, unicode, captures };
};
var subject = (raw, compiled, context) => {
  bounded(raw);
  if (bytes(raw).length > 16384) throw limit("Frontend regex subjects are limited to 16384 bytes");
  work(context, raw.length * 2);
  return compiled.unicode ? raw : byteString(raw);
};
var offsetIndex = (raw, offset, unicode) => {
  const length = bytes(raw).length;
  if (offset < 0) offset = length + offset;
  if (offset < 0 || offset > length) return -1;
  if (!unicode) return offset;
  let byte = 0, index = 0;
  for (const char of raw) {
    if (byte === offset) return index;
    byte += bytes(char).length;
    index += char.length;
  }
  return byte === offset ? index : -2;
};
var capturesArray = (match, compiled, flags, raw) => {
  const entries = [];
  let end = match.length;
  if (!(flags & 512)) while (end > 1 && match[end - 1] === void 0) end--;
  for (let i = 0; i < end; i++) {
    const present = match[i] !== void 0, value = present ? compiled.unicode ? match[i] : fromByteString(match[i]) : flags & 512 ? null : "";
    const index = present ? match.indices[i][0] : -1, offset = index < 0 ? -1 : compiled.unicode ? bytes(raw.slice(0, index)).length : index;
    const item = flags & 256 ? makeArray([[0, value], [1, offset]]) : value;
    if (compiled.captures[i]) entries.push([compiled.captures[i], item]);
    entries.push([i, item]);
  }
  return makeArray(entries);
};
var allMatches = (compiled, input, start, context, maximum = 1e4) => {
  const matches = [];
  compiled.regex.lastIndex = start;
  while (matches.length < maximum) {
    const match = compiled.regex.exec(input);
    if (!match) break;
    matches.push(match);
    work(context, Math.max(1, match[0].length));
    if (!match[0].length && matches.length < maximum) {
      const position = compiled.regex.lastIndex;
      const retry = compiled.regex.execAt?.(input, position, true);
      if (retry) {
        matches.push(retry);
        continue;
      }
      const char = input.codePointAt(position);
      compiled.regex.lastIndex = position + (compiled.unicode && char > 65535 ? 2 : 1);
    }
  }
  if (matches.length >= 1e4) throw limit("Frontend regex matches are limited to 10000");
  return matches;
};
var runRegex = (name, items, context, invoke) => {
  if (!name.startsWith("preg_")) return null;
  const memory = context.builtinMemory ||= {}, result = (value) => ({ value, kind: phpType(value) }), values = items.map((item) => item.value);
  if (name === "preg_last_error") return result(memory.pregError || 0);
  if (name === "preg_last_error_msg") return result(errorMessages[memory.pregError || 0]);
  if (name === "preg_quote") return result([...values[0]].map((char) => ".\\+*?[]^$(){}=!<>|:-#".includes(char) || values[1] && char === values[1][0] ? "\\" + char : char).join(""));
  memory.pregError = 0;
  try {
    if (name === "preg_replace_callback_array") {
      const [callbacks, input, maximum, , flags] = values;
      if (flags & ~(256 | 512)) throw failure("ValueError", name + "(): invalid flags");
      for (const [, callback] of arrayEntries(callbacks)) if (!isFrontendCallable(callback, context)) throw new TypeError(name + "(): every value must be a valid callback");
      let output = input, total = 0;
      for (const [rawPattern, callback] of arrayEntries(callbacks)) {
        if (typeof rawPattern !== "string") throw new TypeError(name + "(): pattern must be a string");
        const args = [{ value: rawPattern }, { value: callback }, { value: output }, { value: maximum }, { value: 0, ref: { set: (n) => {
          total += n;
        } } }, { value: flags }];
        output = runRegex("preg_replace_callback", args, context, invoke).value;
        if (output === null) break;
      }
      items[3].ref?.set(total, "integer");
      return result(output);
    }
    if (name === "preg_match" || name === "preg_match_all") {
      const [rawPattern, raw, , flags, offset] = values;
      if (flags & ~(256 | 512 | (name === "preg_match_all" ? 3 : 0)) || name === "preg_match_all" && (flags & 3) === 3) throw failure("ValueError", `${name}(): invalid flags`);
      const compiled = pattern(rawPattern, context), input = subject(raw, compiled, context), start = offsetIndex(raw, offset, compiled.unicode);
      if (start < 0) {
        memory.pregError = start === -2 ? 5 : 1;
        return result(false);
      }
      const matches = allMatches(compiled, input, start, context, name === "preg_match" ? 1 : 1e4);
      let output;
      if (name === "preg_match") output = matches.length ? capturesArray(matches[0], compiled, flags, raw) : makeArray();
      else if (flags & 2) output = matches.map((match) => capturesArray(match, compiled, flags, raw));
      else {
        const rows = matches.map((match) => capturesArray(match, compiled, flags | 512, raw)), entries = [];
        for (let i = 0; i <= compiled.captures.length - 1; i++) {
          const column = rows.map((row) => {
            const value = row[i];
            return flags & 512 ? value : flags & 256 && value[0] === null ? ["", -1] : value === null ? "" : value;
          });
          if (compiled.captures[i]) entries.push([compiled.captures[i], column]);
          entries.push([i, column]);
        }
        if (!compiled.captures.length) entries.push([0, rows.map((row) => row[0])]);
        output = makeArray(entries);
      }
      items[2].ref?.set(output, "array");
      return result(matches.length);
    }
    if (name === "preg_split") {
      const [rawPattern, raw, maximum, flags] = values;
      if (flags & ~7) throw failure("ValueError", "preg_split(): invalid flags");
      const compiled = pattern(rawPattern, context), input = subject(raw, compiled, context), matches = allMatches(compiled, input, 0, context), parts = [];
      let cursor = 0, splits = 0;
      const append = (value, index) => {
        if (flags & 1 && value === "") return;
        const text = compiled.unicode ? value : fromByteString(value);
        const offset = compiled.unicode ? bytes(raw.slice(0, index)).length : index;
        parts.push(flags & 4 ? [text, offset] : text);
      };
      for (const match of matches) {
        if (maximum > 0 && splits >= maximum - 1) break;
        const previous = parts.length;
        append(input.slice(cursor, match.index), cursor);
        if (parts.length > previous) splits++;
        if (flags & 2) {
          for (let i = 1; i < match.length; i++) if (match[i] !== void 0) append(match[i], match.indices[i][0]);
        }
        cursor = match.index + match[0].length;
      }
      append(input.slice(cursor), cursor);
      return result(parts);
    }
    if (name === "preg_grep") {
      const [rawPattern, input, flags] = values;
      if (flags & ~1) throw failure("ValueError", "preg_grep(): invalid flags");
      const compiled = pattern(rawPattern, context), entries = [];
      for (const [key, value] of arrayEntries(input)) {
        const raw = phpString(value, arrayKind(input, key), context), text = subject(raw, compiled, context);
        compiled.regex.lastIndex = 0;
        if (compiled.regex.test(text) !== !!(flags & 1)) entries.push([key, value]);
      }
      return result(makeArray(entries));
    }
    if (["preg_replace", "preg_filter", "preg_replace_callback"].includes(name)) {
      const [rawPattern, replacement, input, maximum] = values, callback = name === "preg_replace_callback";
      const patterns = typeof rawPattern === "string" ? [rawPattern] : arrayEntries(rawPattern).map(([, value]) => value), replacements = typeof replacement === "string" || callback ? null : arrayEntries(replacement).map(([, value]) => value);
      if (typeof rawPattern === "string" && replacements) throw new TypeError(`${name}(): replacement must be a string when pattern is a string`);
      const compiled = patterns.map((raw) => pattern(raw, context));
      let count = 0;
      const replace = (raw, kind = "string") => {
        let current = phpString(raw, kind, context), changed = false;
        for (let p = 0; p < compiled.length; p++) {
          const info = compiled[p], text = subject(current, info, context), matches = maximum === 0 ? [] : allMatches(info, text, 0, context, maximum > 0 ? Math.min(1e4, maximum) : 1e4), chunks = [];
          let cursor = 0;
          for (const match of matches) {
            chunks.push(text.slice(cursor, match.index));
            let insert;
            if (callback) {
              const returned = invoke(replacement, [{ value: capturesArray(match, info, values[5] || 0, current), kind: "array" }]);
              insert = phpString(returned.value, returned.kind, context);
              if (!info.unicode) insert = byteString(insert);
            } else {
              const rawTemplate = replacements ? phpString(replacements[p] ?? "", void 0, context) : replacement, template = info.unicode ? rawTemplate : byteString(rawTemplate);
              insert = template.replace(/\\\\|\\\$|\$(?:\{(\d+)\}|(\d{1,2}))|\\(\d{1,2})/g, (token, a, b, c) => token === "\\\\" ? "\\" : token === "\\$" ? "$" : match[Number(a ?? b ?? c)] ?? "");
            }
            chunks.push(insert);
            cursor = match.index + match[0].length;
            count++;
            changed = true;
          }
          chunks.push(text.slice(cursor));
          current = info.unicode ? bounded(chunks.join("")) : bounded(fromByteString(chunks.join("")));
        }
        return { current, changed };
      };
      let output;
      if (typeof input === "string") {
        const row = replace(input);
        output = name === "preg_filter" && !row.changed ? null : row.current;
      } else {
        const entries = [];
        for (const [key, value] of arrayEntries(input)) {
          const row = replace(value, arrayKind(input, key));
          if (name !== "preg_filter" || row.changed) entries.push([key, row.current]);
        }
        output = makeArray(entries);
      }
      items[4].ref?.set(count, "integer");
      return result(output);
    }
  } catch (error) {
    if (error.pcreError) {
      memory.pregError = error.pcreError;
      return result(["preg_replace", "preg_filter", "preg_replace_callback", "preg_replace_callback_array"].includes(name) ? null : false);
    }
    if (!(error instanceof SyntaxError)) throw error;
    memory.pregError = 1;
    warn(context, `${name}(): Compilation failed: ${error.message}`);
    return result(["preg_replace", "preg_filter", "preg_replace_callback"].includes(name) ? null : false);
  }
  return null;
};

// phpaml-module:regex
registerModule("regex", "0.1.0-beta.9", { ...php_builtin_regex_exports, ...php_regex_vm_exports });
