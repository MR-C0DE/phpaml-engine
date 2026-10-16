import {parseDate, dateParts, fromParts, timezone, safeTimestamp, zoneOffset, createDateObject, dateDefinition, dateStorage, dateUnsupported as unsupported, defaultTimezone} from './php-date-values.js';
import {objectData} from './php-object-values.js';
import {phpType} from './php-values.js';
import {bounded, failure, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';
import {parseDateFormat, lastDateErrors} from './php-date-format-parser.js';
const intervalKeys=['y','m','d','h','i','s','f','invert','days','from_string'];
const zeroInterval=()=>({type:'interval',y:0,m:0,d:0,h:0,i:0,s:0,f:0,invert:0,days:false,from_string:false});
const compareDates=(a,b)=>a.timestamp-b.timestamp||a.microsecond-b.microsecond;
const monthDays=(year,month)=>{const date=new Date(0);date.setUTCFullYear(year,month,0);return date.getUTCDate();};
const sameTime=(a,b)=>a.hour===b.hour&&a.minute===b.minute&&a.second===b.second;
const cloneData=(object,context)=>{const copy=createDateObject(objectData(object).definition.name,{...dateStorage.get(object)},context);if(dateStorage.get(copy).type==='interval')syncInterval(copy);return copy;};
const syncInterval=(object)=>{const data=dateStorage.get(object), fields=objectData(object).fields;for(const key of intervalKeys)fields.set(key,{value:data[key],kind:key==='f'?'double':phpType(data[key])});};
export const intervalData=(text,context)=>{
  if(text.length>4096)throw unsupported('interval input is limited to 4096 characters');
  const extended=text.match(/^P(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);if(extended)text=`P${Number(extended[1])}Y${Number(extended[2])}M${Number(extended[3])}DT${Number(extended[4])}H${Number(extended[5])}M${Number(extended[6])}S`;
  const match=text.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if(!match||!match.slice(1).some((v)=>v!==undefined)||text.endsWith('T'))throw failure((context.source?.phpVersion??80400)>=80300?'DateMalformedIntervalStringException':'Exception','Unknown or bad format ('+text+')');
  const values=match.slice(1).map((v)=>Number(v||0));if(values.some((v)=>v>1000000))throw unsupported('interval fields are limited to 1000000 units');
  const [y,m,w,d,h,i,s]=values;return {...zeroInterval(),y,m,d:d+w*7,h,i,s};
};
export const addInterval=(data,interval,direction,context)=>{
  const sign=(interval.invert?-1:1)*direction,p=dateParts(data.timestamp,data.zone);
  p.year+=sign*interval.y;p.month+=sign*interval.m;p.day+=sign*interval.d;
  const micro=data.microsecond+Math.round(sign*interval.f*1e6),carry=Math.floor(micro/1e6);
  const base=fromParts(p,data.zone);
  return {...data,timestamp:safeTimestamp(base+sign*(interval.h*3600+interval.i*60+interval.s)+carry),microsecond:((micro%1e6)+1e6)%1e6};
};
const diffInterval=(first,second,absolute,context)=>{
  const sameZone=first.zone.name===second.zone.name;if(!sameZone){first={...first,zone:timezone('UTC',context)};second={...second,zone:timezone('UTC',context)};}
  const pa=dateParts(first.timestamp,first.zone),pb=dateParts(second.timestamp,second.zone);
  if(zoneOffset(first.timestamp,first.zone)!==zoneOffset(second.timestamp,second.zone) && (!sameTime(pa,pb)||first.microsecond!==second.microsecond))throw unsupported('diff across an offset transition requires matching local times; convert both to UTC for elapsed time');
  const invert=compareDates(first,second)>0,low=invert?second:first,high=invert?first:second;
  const a=dateParts(low.timestamp,low.zone),b=dateParts(high.timestamp,high.zone),r={...zeroInterval(),y:b.year-a.year,m:b.month-a.month,d:b.day-a.day,h:b.hour-a.hour,i:b.minute-a.minute,s:b.second-a.second,f:(high.microsecond-low.microsecond)/1e6,invert:absolute?0:Number(invert)};
  if(r.f<0){r.f=(high.microsecond-low.microsecond+1000000)/1000000;r.s--;}
  for(const [small,big,base] of [['s','i',60],['i','h',60],['h','d',24]]){const borrow=Math.floor(r[small]/base);r[small]-=borrow*base;r[big]+=borrow;}
  let year=invert?a.year:b.year,month=invert?a.month:b.month;
  while(r.d<0){if(!invert){month--;if(month<1){month=12;year--;}}r.d+=monthDays(year,month);r.m--;if(invert){month++;if(month>12){month=1;year++;}}work(context);}
  const years=Math.floor(r.m/12);r.m-=years*12;r.y+=years;
  const civil=(p)=>{const d=new Date(0);d.setUTCFullYear(p.year,p.month-1,p.day);d.setUTCHours(p.hour,p.minute,p.second,0);return d.getTime()/1000;};
  const civilSeconds=civil(b)-civil(a);r.days=Math.floor(civilSeconds/86400)-(civilSeconds%86400===0&&high.microsecond<low.microsecond?1:0);
  return r;
};
const intervalFormat=(format,data,context)=>{
  const lookup={y:data.y,m:data.m,d:data.d,h:data.h,i:data.i,s:data.s,f:Math.round(data.f*1e6),a:data.days===false?'(unknown)':data.days,r:data.invert?'-':'',R:data.invert?'-':'+','%':'%'};
  for(const key of ['y','m','d','h','i','s'])lookup[key.toUpperCase()]=String(data[key]).padStart(2,'0');lookup.F=String(lookup.f).padStart(6,'0');
  return bounded(format.replace(/%([\s\S])/g,(match,key)=>{work(context);return Object.hasOwn(lookup,key)?lookup[key]:match;}));
};
const periodCopy=(value,context)=>value===null?null:cloneData(value,context);
const syncPeriod=(object,context)=>{
  const data=dateStorage.get(object),fields=objectData(object).fields;
  if(!fields.has('start'))for(const [key,value] of Object.entries({start:periodCopy(data.start,context),end:periodCopy(data.end,context),interval:periodCopy(data.interval,context),recurrences:data.recurrences===null?Number(data.includeStart)+Number(data.includeEnd):data.recurrences+Number(data.includeStart)+Number(data.includeEnd),include_start_date:data.includeStart,include_end_date:data.includeEnd}))fields.set(key,{value,kind:phpType(value)});
  if(!fields.has('current')||data.currentSource!==data.current){data.currentSource=data.current;const value=periodCopy(data.current,context);fields.set('current',{value,kind:phpType(value)});}
  const ordered=new Map(['start','current','end','interval','recurrences','include_start_date','include_end_date'].map((key)=>[key,fields.get(key)]));fields.clear();for(const [key,value] of ordered)fields.set(key,value);
};
const isoPeriodData=(text,options,context)=>{
  const match=text.match(/^R(\d+)\/(.+)\/(P[^/]+)$/);
  if(!match)throw unsupported('ISO DatePeriod requires R<count>/<ISO start>/<duration>');
  const start=createDateObject('DateTime',parseDate(match[2],timezone('UTC',context),context),context);
  const interval=createDateObject('DateInterval',intervalData(match[3],context),context);syncInterval(interval);
  return periodData([start,interval,Number(match[1]),options],context);
};
const periodData=(args,context)=>{
  if(typeof args[0]==='string')return isoPeriodData(args[0],args[1]??0,context);
  const [start,interval,end,options=0]=args;
  if(dateStorage.get(start)?.timestamp===undefined||dateStorage.get(interval)?.type!=='interval')throw unsupported('DatePeriod requires a DateTimeInterface start, a DateInterval and an end date or recurrence count');
  if(options!==0&&options!==1&&options!==2&&options!==3)throw unsupported('DatePeriod options must combine EXCLUDE_START_DATE and INCLUDE_END_DATE only');
  const data={type:'period',start:cloneData(start,context),interval:cloneData(interval,context),current:null,end:null,recurrences:null,includeStart:!(options&1),includeEnd:!!(options&2)};
  if(typeof end==='number'&&Number.isInteger(end)){if(end<1)throw failure((context.source?.phpVersion??80400)>=80300?'DateMalformedPeriodStringException':'Exception','DatePeriod::__construct(): Recurrence count must be greater than 0');if(end>1000)throw unsupported('DatePeriod recurrence count is limited to 1000');data.recurrences=end;}
  else if(dateStorage.get(end)?.timestamp!==undefined)data.end=cloneData(end,context);
  else throw new TypeError('DatePeriod::__construct(): end must be a DateTimeInterface or int');
  const initial=dateStorage.get(data.start),next=addInterval(initial,dateStorage.get(interval),1,context);
  if(compareDates(next,initial)<=0)throw unsupported('DatePeriod requires an interval that advances time');
  return data;
};
const resetIterator=(data,context)=>{
  const period=dateStorage.get(data.period);data.position=0;data.current={...dateStorage.get(period.start)};
  if(!period.includeStart)data.current=addInterval(data.current,dateStorage.get(period.interval),1,context);
  period.current=createDateObject(objectData(period.start).definition.name,{...data.current},context);syncPeriod(data.period,context);
};
const validIterator=(data)=>{const period=dateStorage.get(data.period);if(period.recurrences!==null)return data.position<period.recurrences+Number(period.includeStart)+Number(period.includeEnd);const comparison=compareDates(data.current,dateStorage.get(period.end));return period.includeEnd?comparison<=0:comparison<0;};
export const advancedDateEntries=(object,context)=>{
  const data=dateStorage.get(object);if(!data?.type)return null;
  if(data.type==='interval'){data.inspected=true;syncInterval(object);}else if(data.type==='period')syncPeriod(object,context);
  return [...objectData(object).fields];
};
export const advancedDateProperty=(object,name,context,parent=null)=>{
  const data=dateStorage.get(object);if(!data?.type||!dateDefinition(objectData(object).definition.name)?.properties[name])return null;
  const get=(quiet=false)=>{if(name==='from_string'&&!data.inspected){if(!quiet)warn(context,'Undefined property: DateInterval::$from_string');return {value:null,kind:'NULL'};}if(data.type==='interval')syncInterval(object);else advancedDateEntries(object,context);return objectData(object).fields.get(name);};
  const ref={get,probe:()=>get(true),set:(value,kind)=>{
    if(context.readOnly)throw new Error('Reactive text cannot modify date objects');
    if(dateStorage.get(parent)?.type==='period')throw new Error('Cannot modify readonly property DatePeriod');
    if(data.type!=='interval')throw new Error('Cannot modify readonly property DatePeriod::$'+name);
    if(name==='days')return get();if(name==='from_string')throw unsupported('DateInterval::from_string is debug metadata');
    if(typeof value!=='number'||!Number.isFinite(value))throw new TypeError('DateInterval properties require numeric values');
    if(name==='f'){if(value<0||value>=1)throw unsupported('DateInterval::f must be between 0 inclusive and 1 exclusive');value=Math.trunc(value*1e6)/1e6;kind='double';}
    else {if(!Number.isInteger(value)||Math.abs(value)>1000000)throw unsupported('interval fields must be integers within 1000000 units');kind='integer';}
    data[name]=value;syncInterval(object);return {value,kind};
  },remove:()=>{throw unsupported('date properties cannot be unset');}};
  ref.reference=()=>{throw unsupported('date properties cannot be bound by reference');};return ref;
};
export const cloneAdvancedDate=(object,context)=>{
  const data=dateStorage.get(object);if(!data?.type)return null;
  if(data.type==='iterator')throw new Error('Trying to clone an uncloneable object of class InternalIterator');
  const copy=createDateObject(objectData(object).definition.name,data.type==='period'?{...data,start:cloneData(data.start,context),interval:cloneData(data.interval,context),end:periodCopy(data.end,context),current:periodCopy(data.current,context)}:{...data},context);if(data.type==='interval')syncInterval(copy);else {for(const [key,item] of objectData(object).fields)objectData(copy).fields.set(key,{...item});dateStorage.get(copy).currentSource=dateStorage.get(copy).current;}return copy;
};
export const advancedDateMethod=(definition,context)=>{
  const {class:name,method}=definition.nativeDate,args=definition.parameters.map((p)=>context.locals[p.id]),object=context.thisObject,result=(value)=>({value,kind:phpType(value)});
  if(method==='getlasterrors')return result(lastDateErrors(context));
  if(method==='createfromformat'){const parsed=parseDateFormat(args[0],args[1],args[2]?dateStorage.get(args[2]).zone:timezone(defaultTimezone(context),context),context);return result(parsed===false?false:createDateObject(name,parsed,context));}
  if(name==='DateInterval'){
    if(method==='__construct'){dateStorage.set(object,intervalData(args[0],context));syncInterval(object);return result(null);}
    return result(intervalFormat(args[0],dateStorage.get(object),context));
  }
  if(name==='DatePeriod'){
    if(method==='createfromiso8601string'){const value=createDateObject('DatePeriod',isoPeriodData(args[0],args[1],context),context);syncPeriod(value,context);return result(value);}
    if(method==='__construct'){if(typeof args[0]==='string'&&(context.source?.phpVersion??80400)>=80400)warn(context,'Calling DatePeriod::__construct(string $isostr, int $options = 0) is deprecated','PHP_DEPRECATED');dateStorage.set(object,periodData(args,context));syncPeriod(object,context);return result(null);}
    const data=dateStorage.get(object);
    if(method==='getrecurrences')return result(data.recurrences);
    if(method==='getiterator'){const iterator=createDateObject('InternalIterator',{type:'iterator',period:object,position:0,current:null},context);resetIterator(dateStorage.get(iterator),context);return result(iterator);}
    const key={getstartdate:'start',getenddate:'end',getdateinterval:'interval'}[method];return result(periodCopy(data[key],context));
  }
  if(name==='InternalIterator'){
    const data=dateStorage.get(object),period=dateStorage.get(data.period);
    if(method==='rewind'){resetIterator(data,context);return result(null);}
    if(method==='valid')return result(validIterator(data));
    if(method==='key')return result(data.position);
    if(method==='current')return result(createDateObject(objectData(period.start).definition.name,{...data.current},context));
    if(method==='next'){if(data.position>=1000)throw unsupported('DatePeriod iteration is limited to 1000 dates');const next=addInterval(data.current,dateStorage.get(period.interval),1,context);if(compareDates(next,data.current)<=0)throw unsupported('DatePeriod interval must keep advancing time');data.current=next;data.position++;period.current=createDateObject(objectData(period.start).definition.name,{...next},context);syncPeriod(data.period,context);return result(null);}
  }
  if(method==='diff'){const interval=createDateObject('DateInterval',diffInterval(dateStorage.get(object),dateStorage.get(args[0]),args[1],context),context);syncInterval(interval);return result(interval);}
  if(method==='add'||method==='sub'){const changed=addInterval(dateStorage.get(object),dateStorage.get(args[0]),method==='add'?1:-1,context);if(name==='DateTimeImmutable')return result(createDateObject(name,changed,context));dateStorage.set(object,changed);return result(object);}
  return null;
};
