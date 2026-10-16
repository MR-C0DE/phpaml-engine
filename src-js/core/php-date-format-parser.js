import {dateParts, fromParts, timezone, safeTimestamp, dateUnsupported as unsupported} from './php-date-values.js';
import {makeArray} from './php-arrays.js';
import {work} from './php-builtin-support.js';
const encoder = new TextEncoder();
const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const baseline = () => ({year:1970,month:1,day:1,hour:0,minute:0,second:0,microsecond:0});
export const lastDateErrors = (context) => context.builtinMemory?.dateErrors ?? false;
export const parseDateFormat = (format, text, zone, context) => {
  if (format.length > 4096 || text.length > 4096) throw unsupported('format and date input are limited to 4096 characters');
  if (text.includes('\0')) throw unsupported('DateTime::createFromFormat(): datetime must not contain null bytes');
  const tokens = [...format];
  for (let i=0;i<tokens.length;i++) {if (tokens[i] === '\\') {i++;continue;} if (!'!|+YymndjHGhgisuvaAOPpeUMFDlSz #;:/.,-()'.includes(tokens[i])) throw unsupported(`createFromFormat token ${tokens[i]} is unavailable; escape literal characters`);}
  let parts = {...dateParts(Math.floor(Date.now()/1000),zone),microsecond:0}, cursor=0, timeSeen=false, period=null, weekday=null, dayOfYear=null, timestamp=null, trailing=false;
  const parsed = new Set(), warnings = new Map(), errors = new Map(); let warningCount=0,errorCount=0;
  const offset = () => encoder.encode(text.slice(0,cursor)).length;
  const problem = (message, warning=false) => {if(warning){warnings.set(offset(),message);warningCount++;}else{errors.set(offset(),message);errorCount++;}};
  const read = (pattern, message, numeric=false, minimum=1) => {
    const start=cursor;let found=text.slice(cursor).match(pattern);
    if(!found&&numeric){problem('Unexpected data found.');while(cursor<text.length&&!/^\d/.test(text.slice(cursor))){cursor++;work(context);}found=text.slice(cursor).match(pattern);if(!found){const end=cursor;cursor=start;problem(message);cursor=end;return null;}}
    if(!found){problem(cursor===text.length?'Not enough data available to satisfy format':message);return null;}
    cursor+=found[0].length;if(found[0].length<minimum){problem(message);return null;}return found[0];
  };
  const put = (field,value) => {if(['hour','minute','second','microsecond'].includes(field) && !timeSeen){parts.hour=parts.minute=parts.second=parts.microsecond=0;timeSeen=true;}parts[field]=value;parsed.add(field);};
  for(let index=0;index<tokens.length;index++) {
    const token=tokens[index];work(context);
    if(token==='!'){parts=baseline();parsed.clear();timeSeen=false;timestamp=null;continue;}
    if(token==='|'){for(const [key,value] of Object.entries(baseline()))if(!parsed.has(key))parts[key]=value;continue;}
    if(token==='+'){trailing=true;continue;}
    if(cursor===text.length && token!==' ') {problem('Not enough data available to satisfy format');break;}
    if(token===' '){cursor+=(text.slice(cursor).match(/^[ \t\u00a0\u202f]*/)?.[0].length||0);continue;}
    if(token==='\\' || '#;:/.,-()'.includes(token)) {const literal=token==='\\'?tokens[++index]:token; if(literal===undefined)throw unsupported('a trailing format escape is unavailable'); if(token==='#' && /^[;:/.,\-()]/.test(text.slice(cursor)))cursor++;else if(text.startsWith(literal,cursor))cursor+=literal.length;else problem('The separation symbol could not be found');continue;}
    const specs={Y:['year',/^\d{1,4}/,'A four digit year could not be found'],y:['year',/^\d{2}/,'A two digit year could not be found'],m:['month',/^\d{1,2}/,'A two digit month could not be found'],n:['month',/^\d{1,2}/,'A two digit month could not be found'],d:['day',/^\d{1,2}/,'A two digit day could not be found'],j:['day',/^\d{1,2}/,'A two digit day could not be found'],H:['hour',/^\d{1,2}/,'A two digit hour could not be found'],G:['hour',/^\d{1,2}/,'A two digit hour could not be found'],h:['hour',/^\d{1,2}/,'A two digit hour could not be found'],g:['hour',/^\d{1,2}/,'A two digit hour could not be found'],i:['minute',/^\d{1,2}/,'A two digit minute could not be found'],s:['second',/^\d{1,2}/,'A two digit second could not be found'],u:['microsecond',/^\d{1,6}/,'A six digit microsecond could not be found'],v:['microsecond',/^\d{1,3}/,'A three digit millisecond could not be found']};
    if(specs[token]) {const [field,pattern,message]=specs[token],raw=read(pattern,message,true,['i','s','y'].includes(token)?2:1);if(raw!==null){let value=Number(raw);if(token==='y')value+=value<70?2000:1900;if(token==='u'||token==='v')value=Number(raw.padEnd(6,'0'));if((token==='h'||token==='g')&&value>12)problem('Hour cannot be higher than 12');put(field,value);}continue;}
    if(token==='a'||token==='A'){const raw=read(/^(?:am|pm)/i,'A meridian could not be found');if(raw!==null)period=raw.toLowerCase();continue;}
    if(token==='M'||token==='F'){const raw=read(/^[A-Za-z]+/,'A textual month could not be found');if(raw!==null){const month=monthNames.findIndex((name)=>name===raw.toLowerCase()||name.slice(0,3)===raw.toLowerCase()||name==='september'&&raw.toLowerCase()==='sept');if(month<0)problem('A textual month could not be found');else put('month',month+1);}continue;}
    if(token==='D'||token==='l'){const raw=read(/^[A-Za-z]+/,'A textual day could not be found');if(raw!==null){const day=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].findIndex(name=>name===raw.toLowerCase()||name.slice(0,3)===raw.toLowerCase());if(day<0)problem('A textual day could not be found');else weekday=day;}continue;}
    if(token==='S'){const raw=text.slice(cursor).match(/^(st|nd|rd|th)/i);if(raw)cursor+=raw[0].length;continue;}
    if(token==='z'){const raw=read(/^\d{1,3}/,'A day of year could not be found',true);if(!parsed.has('year'))problem('A \"day of year\" can only come after a year has been found');else if(raw!==null)dayOfYear=Number(raw);continue;}
    if(token==='U'){const raw=read(/^-?\d+/,'Found unexpected data');if(raw!==null){timestamp=safeTimestamp(Number(raw));zone=timezone('+00:00',context);parts={...dateParts(timestamp,zone),microsecond:0};for(const key of Object.keys(parts))parsed.add(key);}continue;}
    if(/^[A-Za-z]+(?:$|[ \t])/.test(text.slice(cursor))&&!/^(?:UTC|GMT|Z)(?:$|[ \t])/.test(text.slice(cursor)))throw unsupported('use UTC, an explicit numeric offset or an IANA timezone identifier');
    const raw=read(/^(?:Z|UTC|GMT|[+-]\d{2}:?\d{2}|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)/,'The timezone could not be found in the database');
    if(raw!==null){try{zone=timezone(raw,context);}catch(error){if(error.name==='ValueError')throw error;cursor-=raw.length;problem('The timezone could not be found in the database');cursor+=raw.length;}}
  }
  if(period!==null)parts.hour=parts.hour%12+(period==='pm'?12:0);
  if(parts.hour>23||parts.minute>59||parts.second>59)problem('The parsed time was invalid',true);
  const days=new Date(Date.UTC(parts.year,parts.month,0)).getUTCDate();
  if(parts.month<1||parts.month>12||parts.day<1||parts.day>days)problem('The parsed date was invalid',true);
  if(cursor<text.length)problem('Trailing data',trailing);
  (context.builtinMemory ||= {}).dateErrors=warningCount||errorCount?{warning_count:warningCount,warnings:makeArray([...warnings]),error_count:errorCount,errors:makeArray([...errors])}:false;
  if(errorCount)return false;
  if(dayOfYear!==null){parts.month=1;parts.day=dayOfYear+1;}
  if(weekday!==null){const calendar=new Date(0);calendar.setUTCFullYear(parts.year,parts.month-1,parts.day);parts.day+=(weekday-calendar.getUTCDay()+7)%7;}
  return {timestamp:fromParts(parts,zone),microsecond:parts.microsecond,zone};
};
