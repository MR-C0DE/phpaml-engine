import definitions from './date-definitions.json' with {type: 'json'};
import {makeObject, objectData} from './php-object-values.js';
import {phpType} from './php-values.js';
import {failure, bounded, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';
import {advancedDateMethod, advancedDateEntries, cloneAdvancedDate} from './php-date-advanced.js';

const values = new WeakMap(), zones = new Map();
export const dateStorage = values;
const pad = (value, length = 2) => String(value).padStart(length, '0');
const unsupported = (message) => failure('ValueError', 'Frontend dates: ' + message);
export const dateUnsupported = unsupported;
export const dateDefinition = (name) => typeof name === 'string' ? definitions[name.toLowerCase()]?.class || null : null;
export const dateData = (value) => {const data = values.get(value); if(data?.type==='interval')data.inspected=true; return data?.type ? null : data;};
export const isDateObject = (value) => values.has(value);
export const dateDebugEntries = (value, context = {}) => {const data = values.get(value); if (!data) return null; if (data.type) return advancedDateEntries(value, context); return [...(data.timestamp === undefined ? [] : [['date', {value: formatDate('Y-m-d H:i:s.u', data, context), kind: 'string'}]]), ['timezone_type', {value: data.zone.type, kind: 'integer'}], ['timezone', {value: data.zone.name, kind: 'string'}]];};
export const defaultTimezone = (context) => context.builtinMemory?.dateTimezone || context.source?.dateTimezone || 'UTC';
const dateError = (context, kind, message) => failure((context.source?.phpVersion ?? 80400) >= 80300 ? kind : 'Exception', message);
const fixedOffset = (name) => {const match = name.match(/^([+-])(\d{2}):?(\d{2})(?::?(\d{2}))?$/); return match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 3600 + Number(match[3]) * 60 + Number(match[4] || 0)) : null;};
export const timezone = (name, context = {}) => {
  if (zones.has(name)) return zones.get(name);
  const fixed = fixedOffset(name);
  if (fixed !== null) {if (Math.abs(fixed) > 86400) throw unsupported('timezone offsets must be within 24 hours'); const normalized = (fixed < 0 ? '-' : '+') + pad(Math.floor(Math.abs(fixed) / 3600)) + ':' + pad(Math.floor(Math.abs(fixed) / 60) % 60) + (fixed % 60 ? ':' + pad(Math.abs(fixed) % 60) : ''); const zone = {name: normalized, fixed, type: 1}; zones.set(name, zone); return zone;}
  if (name === 'Z') return {name: 'Z', fixed: 0, type: 2};
  if (!name.includes('/') && !['UTC', 'GMT', 'Etc/UTC'].includes(name)) throw unsupported('use UTC, an explicit numeric offset or an IANA timezone identifier');
  try {const formatter = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {timeZone: name, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'}); const zone = {name, fixed: ['UTC', 'GMT'].includes(name) ? 0 : null, type: name === 'GMT' ? 2 : 3, formatter}; zones.set(name, zone); return zone;}
  catch {throw dateError(context, 'DateInvalidTimeZoneException', `DateTimeZone::__construct(): Unknown or bad timezone (${name})`);}
};
const utc = (year, month, day, hour = 0, minute = 0, second = 0) => {const d = new Date(0); d.setUTCFullYear(year, month - 1, day); d.setUTCHours(hour, minute, second, 0); return d.getTime() / 1000;};
export const safeTimestamp = (value) => {if (!Number.isSafeInteger(value) || value < -62135596800 || value > 253402300799) throw unsupported('supported calendar years are 0001 through 9999'); return value;};
export const dateParts = (timestamp, zone) => {
  safeTimestamp(timestamp);
  if (zone.fixed !== null) {const d = new Date((timestamp + zone.fixed) * 1000); return {year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds()};}
  const parts = Object.fromEntries(zone.formatter.formatToParts(new Date(timestamp * 1000)).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
  return {year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second};
};
export const zoneOffset = (timestamp, zone) => {if (zone.fixed !== null) return zone.fixed; const p = dateParts(timestamp, zone); return utc(p.year, p.month, p.day, p.hour, p.minute, p.second) - timestamp;};
export const fromParts = (parts, zone) => {
  const desired = utc(parts.year, parts.month, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0);
  if (zone.fixed !== null) return safeTimestamp(desired - zone.fixed);
  const offsets = [...new Set([-86400, 0, 86400].map((shift) => zoneOffset(desired + shift, zone)))];
  const candidates = offsets.map((offset) => desired - offset).filter((timestamp) => timestamp + zoneOffset(timestamp, zone) === desired);
  // PHP chooses the earlier occurrence of a repeated time and advances a gap.
  return safeTimestamp(candidates.length ? Math.min(...candidates) : Math.max(...offsets.map((offset) => desired - offset)));
};
const now = (zone) => {const milliseconds = Date.now(); return {timestamp: Math.floor(milliseconds / 1000), microsecond: milliseconds % 1000 * 1000, zone};};
const modify = (data, expression, context) => {
  let text = expression.trim(); if (text === 'now' || text === '') return {...data};
  const p = dateParts(data.timestamp, data.zone);
  if (['today', 'midnight', 'tomorrow', 'yesterday', 'noon'].includes(text.toLowerCase())) {p.hour = text.toLowerCase() === 'noon' ? 12 : 0; p.minute = p.second = 0; if (text === 'tomorrow') p.day++; if (text === 'yesterday') p.day--; return {...data, timestamp: fromParts(p, data.zone), microsecond: 0};}
  const calendar=text.toLowerCase().match(/^(first|last) day of (?:(this|next|last) )?(month|year)$/);
  if(calendar){const direction={this:0,next:1,last:-1}[calendar[2]||'this'];if(calendar[3]==='year'){p.year+=direction;}else p.month+=direction;p.day=calendar[1]==='first'?1:0;if(calendar[1]==='last')p.month++;return {...data,timestamp:fromParts(p,data.zone)};}
  const weekday=text.toLowerCase().match(/^(next|last|this) (sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if(weekday){const target=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday[2]),current=new Date(utc(p.year,p.month,p.day)*1000).getUTCDay();let difference=(target-current+7)%7;if(weekday[1]==='next'&&difference===0)difference=7;if(weekday[1]==='last')difference=difference===0?-7:difference-7;p.day+=difference;p.hour=p.minute=p.second=0;return {...data,timestamp:fromParts(p,data.zone),microsecond:0};}
  text=text.replace(/^(next|last|this)\s+(year|month|week|day|hour|minute|second)s?$/i,(_,direction,unit)=>({next:'+1',last:'-1',this:'0'})[direction.toLowerCase()]+' '+unit);
  if(/\s+ago$/i.test(text))text=text.replace(/([+-]?\d+)\s*(years?|months?|weeks?|days?|hours?|minutes?|seconds?)/gi,(_,n,u)=>-Number(n)+' '+u).replace(/\s+ago$/i,'');
  const relative = /^([+-]?\d+)\s*(years?|months?|weeks?|days?|hours?|minutes?|seconds?)(?:\s+|$)/i; let matched = false;
  while (text) {
    const match = text.match(relative); if (!match) throw unsupported('relative dates support signed years, months, weeks, days, hours, minutes and seconds');
    matched = true; const amount = Number(match[1]); if (Math.abs(amount) > 1000000) throw unsupported('relative adjustments are limited to 1000000 units');
    const unit = match[2].toLowerCase().replace(/s$/, ''); if (unit === 'week') p.day += amount * 7; else p[unit] += amount; text = text.slice(match[0].length).trim(); work(context);
  }
  return matched ? {...data, timestamp: fromParts(p, data.zone)} : data;
};
export const parseDate = (text, zone, context = {}, base = null) => {
  (context.builtinMemory ||= {}).dateErrors = false;
  if (text.length > 4096) throw unsupported('date input is limited to 4096 characters');
  if (text === '' || text.toLowerCase() === 'now') return now(zone);
  if (/^@-?\d+(?:\.\d{1,6})?$/.test(text)) {const number = Number(text.slice(1)), timestamp = Math.floor(number), microsecond = Math.round((number - timestamp) * 1e6); return {timestamp: safeTimestamp(timestamp), microsecond, zone: timezone('+00:00', context)};}
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?(?:\s*(Z|[+-]\d{2}:?\d{2}|UTC|GMT|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?))?$/);
  if (!match) {
    let alternate;
    if((alternate=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/)))return parseDate(`${alternate[3]}-${alternate[1]}-${alternate[2]}${alternate[4]}`,zone,context,base);
    if((alternate=text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(.*)$/)))return parseDate(`${alternate[3]}-${alternate[2]}-${alternate[1]}${alternate[4]}`,zone,context,base);
    if((alternate=text.match(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(.*)$/i))){const month=months.findIndex(m=>m.toLowerCase()===alternate[2].toLowerCase()||m.slice(0,3).toLowerCase()===alternate[2].toLowerCase());if(month>=0)return parseDate(`${alternate[3]}-${month+1}-${alternate[1]}${alternate[4]}`,zone,context,base);}
    if((alternate=text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(.*)$/))){const month=months.findIndex(m=>m.toLowerCase()===alternate[1].toLowerCase()||m.slice(0,3).toLowerCase()===alternate[1].toLowerCase());if(month>=0)return parseDate(`${alternate[3]}-${month+1}-${alternate[2]}${alternate[4]}`,zone,context,base);}
    if(/^(?:first|last|next|this)\b/i.test(text)||/\sago$/i.test(text))return modify(base||now(zone),text,context);
    if (/^(?:[+-]?\d+\s*(?:years?|months?|weeks?|days?|hours?|minutes?|seconds?)|today$|midnight$|tomorrow$|yesterday$|noon$)/i.test(text)) return modify(base || now(zone), text, context);
    throw unsupported('use YYYY-MM-DD, an ISO date/time, @timestamp, now or a supported relative adjustment');
  }
  if (match[8]) zone = timezone(match[8], context);
  const parts = {year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(match[4] || 0), minute: Number(match[5] || 0), second: Number(match[6] || 0)};
  if (parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > 31 || parts.hour > 24 || parts.minute > 59 || parts.second > 60) throw dateError(context, 'DateMalformedStringException', 'Failed to parse time string');
  return {timestamp: fromParts(parts, zone), microsecond: Number((match[7] || '').padEnd(6, '0')), zone};
};
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const formatDate = (format, data, context = {}) => {
  const {timestamp, microsecond = 0, zone} = data, p = dateParts(timestamp, zone), offset = zoneOffset(timestamp, zone), day = new Date(utc(p.year, p.month, p.day) * 1000).getUTCDay();
  const dayOfYear = Math.floor((utc(p.year, p.month, p.day) - utc(p.year, 1, 1)) / 86400), leap = p.year % 4 === 0 && (p.year % 100 !== 0 || p.year % 400 === 0);
  const thursday = new Date((utc(p.year, p.month, p.day) + (4 - (day || 7)) * 86400) * 1000), isoYear = thursday.getUTCFullYear(), isoWeek = Math.ceil(((thursday.getTime() / 1000 - utc(isoYear, 1, 1)) / 86400 + 1) / 7);
  const offsetText = (colon) => (offset < 0 ? '-' : '+') + pad(Math.floor(Math.abs(offset) / 3600)) + (colon ? ':' : '') + pad(Math.floor(Math.abs(offset) / 60) % 60);
  const shortZone = () => {if (zone.fixed === null && !['America/Toronto','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Halifax','America/Anchorage','Pacific/Honolulu','America/Winnipeg','America/Vancouver'].includes(zone.name)) throw unsupported('the T format is unavailable for this timezone; use e or P'); if (zone.fixed !== null) return zone.type === 1 ? 'GMT' + offsetText(false) : zone.name; const label = new Intl.DateTimeFormat('en-US', {timeZone: zone.name, timeZoneName: 'short'}).formatToParts(new Date(timestamp * 1000)).find((part) => part.type === 'timeZoneName').value; if (/^GMT[+-]/.test(label)) throw unsupported('the T format is unavailable for this timezone; use e or P'); return label;};
  const lookup = {
    d: () => pad(p.day), D: () => weekdays[day].slice(0, 3), j: () => p.day, l: () => weekdays[day], N: () => day || 7, S: () => p.day >= 11 && p.day <= 13 ? 'th' : ({1:'st',2:'nd',3:'rd'})[p.day % 10] || 'th', w: () => day, z: () => dayOfYear,
    W: () => pad(isoWeek), F: () => months[p.month - 1], m: () => pad(p.month), M: () => months[p.month - 1].slice(0, 3), n: () => p.month, t: () => new Date(utc(p.year, p.month + 1, 0) * 1000).getUTCDate(), L: () => Number(leap), o: () => isoYear, Y: () => pad(p.year, 4), X: () => '+' + pad(p.year, 4), x: () => pad(p.year, 4), y: () => pad(p.year % 100),
    a: () => p.hour < 12 ? 'am' : 'pm', A: () => p.hour < 12 ? 'AM' : 'PM', B: () => pad(Math.floor((((timestamp + 3600) % 86400 + 86400) % 86400) / 86.4), 3), g: () => p.hour % 12 || 12, G: () => p.hour, h: () => pad(p.hour % 12 || 12), H: () => pad(p.hour), i: () => pad(p.minute), s: () => pad(p.second), u: () => pad(microsecond, 6), v: () => pad(Math.floor(microsecond / 1000), 3),
    e: () => zone.name, I: () => Number(offset > Math.min(zoneOffset(utc(p.year, 1, 1), zone), zoneOffset(utc(p.year, 7, 1), zone))), O: () => offsetText(false), P: () => offsetText(true), p: () => offset === 0 ? 'Z' : offsetText(true), T: shortZone, Z: () => offset, U: () => timestamp,
    c: () => formatDate('Y-m-d\\TH:i:sP', data, context), r: () => formatDate('D, d M Y H:i:s O', data, context),
  };
  let result = ''; for (let i = 0; i < format.length; i++) {const char = format[i]; result += char === '\\' ? format[++i] || '\0' : Object.hasOwn(lookup, char) ? lookup[char]() : char; work(context);} return bounded(result);
};
export const createDateObject = (name, data, context) => {if (--(context.objectBudget ||= {remaining:10000}).remaining < 0) throw unsupported('object allocation limit exceeded'); const object = makeObject(dateDefinition(name)); values.set(object, data); return object;};
export const cloneDate = (value, context) => {const data = values.get(value); return data?.type ? cloneAdvancedDate(value, context) : data ? createDateObject(objectData(value).definition.name, {...data}, context) : null;};
export const nativeDateMethod = (definition, context) => {
  const advanced = advancedDateMethod(definition, context); if (advanced) return advanced;
  const options = definition.nativeDate, name = options.class, method = options.method, args = definition.parameters.map((parameter) => context.locals[parameter.id]), object = context.thisObject;
  const result = (value) => ({value, kind: phpType(value)});
  if (method === '__construct') {values.set(object, name === 'DateTimeZone' ? {zone: timezone(args[0], context)} : parseDate(args[0], args[1] ? values.get(args[1]).zone : timezone(defaultTimezone(context), context), context)); return result(null);}
  if (method.startsWith('createfrom')) {const data = values.get(args[0]); if (!data?.timestamp && data?.timestamp !== 0) throw new TypeError('Expected a DateTimeInterface'); return result(createDateObject(name, {...data}, context));}
  const data = values.get(object); if (!data) throw new Error('Date object has not been initialized');
  if (method === 'getname') return result(data.zone.name);
  if (method === 'getoffset') return result(zoneOffset(name === 'DateTimeZone' ? values.get(args[0]).timestamp : data.timestamp, data.zone));
  if (method === 'format') return result(formatDate(args[0], data, context));
  if (method === 'gettimestamp') return result(data.timestamp);
  if (method === 'gettimezone') return result(createDateObject('DateTimeZone', {zone: data.zone}, context));
  let changed = {...data};
  if (method === 'settimestamp') {changed.timestamp = safeTimestamp(args[0]); changed.microsecond = 0;}
  else if (method === 'settimezone') changed.zone = values.get(args[0]).zone;
  else if (method === 'modify') changed = modify(data, args[0], context);
  else if (method === 'setdate') {const p = dateParts(data.timestamp, data.zone); [p.year, p.month, p.day] = args; changed.timestamp = fromParts(p, data.zone);}
  else if (method === 'settime') {const p = dateParts(data.timestamp, data.zone); [p.hour, p.minute, p.second] = args; changed.timestamp = fromParts(p, data.zone); changed.microsecond = args[3]; if (changed.microsecond < 0 || changed.microsecond > 999999) throw unsupported('microseconds must be between 0 and 999999');}
  else throw unsupported(`method ${name}::${method}() is unavailable`);
  if (name === 'DateTimeImmutable') return result(createDateObject(name, changed, context)); values.set(object, changed); return result(object);
};

const dateNames = new Set(['time', 'microtime', 'date', 'gmdate', 'strtotime', 'mktime', 'gmmktime', 'checkdate', 'getdate', 'date_default_timezone_get', 'date_default_timezone_set', 'date_create', 'date_create_immutable', 'date_format', 'date_timestamp_get', 'date_timestamp_set', 'date_modify', 'date_timezone_get', 'date_timezone_set', 'timezone_open', 'timezone_name_get', 'timezone_offset_get', 'date_create_from_format', 'date_create_immutable_from_format', 'date_get_last_errors', 'date_diff', 'date_add', 'date_sub', 'date_interval_format']);
export const runDates = (name, items, context) => {
  if (!dateNames.has(name)) return null;
  if (context.readOnly) throw new Error('Date/time functions must be used in an event, then displayed through State');
  const args = items.map((item) => item.value), result = (value) => ({value, kind: phpType(value)}), zone = () => timezone(defaultTimezone(context), context);
  if (['date_create_from_format', 'date_create_immutable_from_format', 'date_get_last_errors'].includes(name)) { const className = name === 'date_create_immutable_from_format' ? 'DateTimeImmutable' : 'DateTime', method = name === 'date_get_last_errors' ? 'getlasterrors' : 'createfromformat', definition = definitions[className.toLowerCase()].functions['@date:' + className.toLowerCase() + '::' + method]; return nativeDateMethod(definition, {...context, thisObject:null, locals:Object.fromEntries(definition.parameters.map((p,index)=>[p.id,args[index]]))}); }
  if (name === 'time') return result(Math.floor(Date.now() / 1000));
  if (name === 'microtime') {const value = Date.now() / 1000; return args[0] ? {value, kind:'double'} : result((value % 1).toFixed(8) + ' ' + Math.floor(value));}
  if (name === 'date_default_timezone_get') return result(defaultTimezone(context));
  if (name === 'date_default_timezone_set') {try {timezone(args[0], context);} catch {warn(context, `date_default_timezone_set(): Timezone ID '${args[0]}' is invalid`); return result(false);} (context.builtinMemory ||= {}).dateTimezone = args[0]; return result(true);}
  if (name === 'checkdate') {const [month, day, year] = args; return result(year > 0 && year <= 32767 && month > 0 && month < 13 && day > 0 && day <= new Date(utc(year, month + 1, 0) * 1000).getUTCDate());}
  if (name === 'date' || name === 'gmdate') return result(formatDate(args[0], {timestamp: safeTimestamp(args[1] ?? Math.floor(Date.now() / 1000)), microsecond: 0, zone: name === 'gmdate' ? timezone('GMT', context) : zone()}, context));
  if (name === 'strtotime') {if (args[0].trim() === '') return result(false); try {const tz = zone(), base = {timestamp: args[1] ?? Math.floor(Date.now() / 1000), microsecond:0, zone:tz}; return result(parseDate(args[0], tz, context, base).timestamp);} catch (error) {if (error.name === 'ValueError') throw error; return result(false);}}
  if (name === 'mktime' || name === 'gmmktime') {const tz = name === 'gmmktime' ? timezone('UTC', context) : zone(), p = dateParts(Math.floor(Date.now() / 1000), tz); for (const [i, field] of ['hour','minute','second','month','day','year'].entries()) if (args[i] !== null) p[field] = args[i]; if (p.year >= 0 && p.year <= 69) p.year += 2000; else if (p.year >= 70 && p.year <= 100) p.year += 1900; return result(fromParts(p, tz));}
  if (name === 'getdate') {const timestamp = args[0] ?? Math.floor(Date.now() / 1000), tz = zone(), p = dateParts(timestamp, tz), data = {timestamp, microsecond:0, zone:tz}; return result({seconds:p.second, minutes:p.minute, hours:p.hour, mday:p.day, wday:Number(formatDate('w',data,context)), mon:p.month, year:p.year, yday:Number(formatDate('z',data,context)), weekday:formatDate('l',data,context), month:formatDate('F',data,context), 0:timestamp});}
  if (name === 'timezone_open') {try {return result(createDateObject('DateTimeZone', {zone: timezone(args[0], context)}, context));} catch (error) {if (error.name === 'ValueError') throw error; return result(false);}}
  if (name === 'date_create' || name === 'date_create_immutable') {try {return result(createDateObject(name === 'date_create' ? 'DateTime' : 'DateTimeImmutable', parseDate(args[0], args[1] ? values.get(args[1]).zone : zone(), context), context));} catch (error) {if (error.name === 'ValueError') throw error; return result(false);}}
  const mapping = {date_diff:'diff', date_add:'add', date_sub:'sub', date_interval_format:'format', date_format:'format', date_timestamp_get:'gettimestamp', date_timestamp_set:'settimestamp', date_modify:'modify', date_timezone_get:'gettimezone', date_timezone_set:'settimezone', timezone_name_get:'getname', timezone_offset_get:'getoffset'}, method = mapping[name];
  if (method) {
    const object = args.shift(), className = objectData(object)?.definition.name, definition = definitions[className?.toLowerCase()]?.functions['@date:' + className?.toLowerCase() + '::' + method];
    if (!definition) throw new TypeError(`${name}(): expected a supported date object`);
    const locals = Object.fromEntries(definition.parameters.map((parameter, index) => [parameter.id, args[index]])); return nativeDateMethod(definition, {...context, thisObject: object, locals});
  }
  return null;
};
