import {makeObject,objectData} from './php-object-values.js';
import {dateData,dateParts,timezone,zoneOffset} from './php-date-values.js';
import {arrayEntries,arrayKind,makeArray,clonePhp} from './php-arrays.js';
import {phpString,phpType} from './php-values.js';
const storage=new WeakMap();
const localeTag=(name,context)=>(name||context.source?.intlLocale||'en_US').replaceAll('_','-').replace(/-POSIX$/,'');
const fail=message=>{throw Object.assign(new Error('Frontend Intl: '+message),{name:'ValueError'});};
const strengthOptions=data=>({sensitivity:data.attributes.get(3)===17?(data.strength===0?'case':'variant'):data.strength===0?'base':data.strength===1?'accent':'variant',numeric:data.attributes.get(7)===17,ignorePunctuation:data.attributes.get(1)===20,caseFirst:data.attributes.get(2)===24?'upper':data.attributes.get(2)===25?'lower':'false'});
const formatter=(data)=>new Intl.DateTimeFormat(data.locale,{...(data.dateType<0?{}:{dateStyle:['full','long','medium','short'][data.dateType]}),...(data.timeType<0?{}:{timeStyle:['full','long','medium','short'][data.timeType]}),timeZone:data.zone});
const patternFormat=(data,timestamp)=>{
  const date=new Date(timestamp*1000),zone=timezone(data.zone),p=dateParts(Math.floor(timestamp),zone),pad=(n,w=2)=>String(n).padStart(w,'0');
  const part=(options,key)=>new Intl.DateTimeFormat(data.locale,{...options,timeZone:data.zone}).formatToParts(date).find(p=>p.type===key)?.value||'';
  let output='',quoted=false;
  for(let i=0;i<data.pattern.length;){const char=data.pattern[i];if(char==="'"){if(data.pattern[i+1]==="'"){output+="'";i+=2;}else{quoted=!quoted;i++;}continue;}if(quoted||!/[A-Za-z]/.test(char)){output+=char;i++;continue;}let end=i+1;while(data.pattern[end]===char)end++;const width=end-i;
    const fields={y:()=>width===2?pad(p.year%100):pad(p.year,width),M:()=>width<3?pad(p.month,width):part({month:width===3?'short':width===4?'long':'narrow'},'month'),L:()=>width<3?pad(p.month,width):part({month:width===3?'short':width===4?'long':'narrow'},'month'),d:()=>pad(p.day,width),E:()=>part({weekday:width<4?'short':width===4?'long':'narrow'},'weekday'),H:()=>pad(p.hour,width),h:()=>pad(p.hour%12||12,width),m:()=>pad(p.minute,width),s:()=>pad(p.second,width),a:()=>part({hour:'numeric',hour12:true},'dayPeriod'),G:()=>part({era:width<4?'short':width===4?'long':'narrow'},'era'),z:()=>part({timeZoneName:width<4?'short':'long'},'timeZoneName'),S:()=>pad(Math.floor((timestamp%1)*1000),3).slice(0,width).padEnd(width,'0')};
    if(!fields[char])fail('unsupported date pattern letter '+char);output+=fields[char]();i=end;
  }return output;
};
export const extraIntl=(name,operation,values,context,definition)=>{
  if(!['Collator','IntlDateFormatter'].includes(name))return null;
  const result=value=>({value,kind:phpType(value)});
  let object=context.thisObject;
  if(operation==='__construct'||operation==='create'){
    const locale=localeTag(values[0],context);Intl.getCanonicalLocales(locale);
    const data=name==='Collator'?{locale,strength:2,attributes:new Map([[0,16],[1,21],[2,16],[3,16],[4,16],[5,2],[7,16]])}: {locale,dateType:values[1],timeType:values[2],zone:typeof values[3]==='string'?values[3]:dateData(values[3])?.zone?.name||context.source?.dateTimezone||'UTC',calendar:values[4]??1,pattern:values[5]||'',lenient:true};
    if(name==='IntlDateFormatter'){if(![-1,0,1,2,3].includes(data.dateType)||![-1,0,1,2,3].includes(data.timeType)||data.calendar!==1)fail('formatter requires supported styles and the Gregorian calendar');timezone(data.zone);}
    object ||= makeObject(definition);storage.set(object,data);return result(operation==='create'?object:null);
  }
  const data=storage.get(object);if(!data)throw new Error('Uninitialized '+name);
  if(operation==='getlocale')return result(name==='IntlDateFormatter'&&data.dateType===-1&&data.timeType===-1?'':data.locale.replaceAll('-','_'));
  if(operation==='geterrorcode')return result(0);if(operation==='geterrormessage')return result('U_ZERO_ERROR');
  if(name==='Collator'){
    if(operation==='setstrength'){if(![0,1,2].includes(values[0]))fail('invalid collation strength');data.strength=values[0];data.attributes.set(5,values[0]);return result(true);}
    if(operation==='getstrength')return result(data.strength);
    if(operation==='setattribute'){if(![0,1,2,3,4,5,7].includes(values[0]))fail('unsupported collation attribute');if(values[0]===5){if(![0,1,2].includes(values[1]))fail('unsupported collation strength');data.strength=values[1];}data.attributes.set(values[0],values[1]);return result(true);}
    if(operation==='getattribute')return result(data.attributes.get(values[0])??16);
    const collator=new Intl.Collator(data.locale,strengthOptions(data));
    if(operation==='compare')return result(Math.sign(collator.compare(values[0],values[1])));
    if(['sort','asort','sortwithsortkeys'].includes(operation)){
      const input=values[0],entries=arrayEntries(input);entries.sort((a,b)=>{if(values[1]===2)return Number(a[1])-Number(b[1]);return collator.compare(phpString(a[1],arrayKind(input,a[0]),context),phpString(b[1],arrayKind(input,b[0]),context));});
      const sorted=makeArray(entries.map(([key,value],index)=>[operation==='asort'?key:index,clonePhp(value),arrayKind(input,key)]));
      context.localReferences[context.intlParameters[0].id].set(sorted,'array');return result(true);
    }
  } else {
    if(operation==='format'){const value=dateData(values[0]),timestamp=value?value.timestamp+(value.microsecond||0)/1e6:values[0];if(typeof timestamp!=='number')fail('format expects a timestamp or DateTimeInterface');return result(data.pattern?patternFormat(data,timestamp):formatter(data).format(new Date(timestamp*1000)));}
    if(operation==='getpattern'){if(!data.pattern)fail('getPattern requires an explicit pattern');return result(data.pattern);}
    if(operation==='setpattern'){data.pattern=values[0];return result(true);}
    if(operation==='gettimezoneid')return result(data.zone);
    if(operation==='settimezone'){data.zone=typeof values[0]==='string'?values[0]:dateData(values[0])?.zone?.name;timezone(data.zone);return result(true);}
    if(operation==='getdatetype')return result(data.dateType);if(operation==='gettimetype')return result(data.timeType);if(operation==='getcalendar')return result(data.calendar);
    if(operation==='islenient')return result(data.lenient);if(operation==='setlenient'){data.lenient=values[0];return result(null);}
  }
  fail('unsupported '+name+'::'+operation);
};
export const cloneExtraIntl=value=>{const data=storage.get(value);if(!data)return null;const copy=makeObject(objectData(value).definition);storage.set(copy,{...data,...(data.attributes?{attributes:new Map(data.attributes)}:{})});return copy;};
