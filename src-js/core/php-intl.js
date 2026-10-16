import {extraIntl,cloneExtraIntl} from './php-intl-extra.js';
import definitions from './intl-definitions.json' with {type:'json'};
import currencies from './intl-currencies.json' with {type:'json'};
import {makeObject,objectData} from './php-object-values.js';
import {phpType} from './php-values.js';
import {runGrapheme} from './php-builtin-grapheme.js';
import {failure,bounded,work} from './php-builtin-support.js';

const storage=new WeakMap(),styles={1:'decimal',2:'currency',3:'percent',12:'currency'},rounding={0:'ceil',1:'floor',2:'trunc',3:'expand',4:'halfEven',5:'halfTrunc',6:'halfExpand'};
export const intlDefinition=(name)=>typeof name==='string'?definitions[name.toLowerCase()]?.class||null:null;
const unsupported=(message)=>failure('ValueError','Frontend Intl: '+message);
const createData=(locale,style,pattern,context)=>{
  if(!Object.hasOwn(styles,style)||pattern!==null)throw unsupported('NumberFormatter supports DECIMAL, CURRENCY, CURRENCY_ACCOUNTING and PERCENT without a custom pattern');
  locale=locale||context.source?.intlLocale||'en_US_POSIX';
  if(locale.length>128||locale.includes('@')||locale==='root'||locale.endsWith('_POSIX'))throw unsupported('use an explicit language or language-region locale, for example fr_CA');
  let tag;try{tag=Intl.getCanonicalLocales(locale.replaceAll('_','-'))[0];}catch{throw unsupported('invalid locale');}
  if(!Intl.NumberFormat.supportedLocalesOf([tag]).length)throw unsupported('locale is not available in this browser');
  let currency='XXX';
  if(styles[style]==='currency'){const key=tag.toLowerCase();currency=currencies[key]||currencies[key.split('-')[0]]||'XXX';}
  const options={style:styles[style],...(styles[style]==='currency'?{currency,currencySign:style===12?'accounting':'standard'}:{})};
  const defaults=new Intl.NumberFormat(tag,options).resolvedOptions();
  if(!new Intl.NumberFormat(tag,{roundingMode:'halfEven'}).resolvedOptions().roundingMode)throw unsupported('this browser does not support the required Intl rounding modes');
  return {locale:tag,style,currency,textAttributes:new Map(),attributes:new Map([[9,style===3?100:1],[1,1],[4,1],[6,defaults.maximumFractionDigits],[7,defaults.minimumFractionDigits],[11,4],[16,0]]),fractionSet:false};
};
const format=(data,number,type,currency,context)=>{
  if(![0,1,2,3].includes(type))throw unsupported('NumberFormatter::format supports TYPE_DEFAULT, TYPE_INT32, TYPE_INT64 and TYPE_DOUBLE');
  if(type===1)number=Number(BigInt.asIntN(32,BigInt(Math.trunc(number))));else if(type===2)number=Math.trunc(number);
  const attrs=data.attributes,options={style:styles[data.style],useGrouping:attrs.get(1)!==0,minimumIntegerDigits:attrs.get(4),roundingMode:rounding[attrs.get(11)]};
  if(options.style==='currency'){
    currency=currency??data.currency;if(!/^[a-z]{3}$/i.test(currency))throw unsupported('currency must be a three-letter ISO currency code');
    options.currency=currency;options.currencySign=data.style===12?'accounting':'standard';
  }
  if(attrs.get(16)){options.minimumSignificantDigits=attrs.get(17)??1;options.maximumSignificantDigits=attrs.get(18)??6;}
  else if(currency==null||currency===data.currency||data.fractionSet||options.style!=='currency'){options.minimumFractionDigits=attrs.get(7);options.maximumFractionDigits=attrs.get(6);}
  number*=attrs.get(9)/(options.style==='percent'?100:1);
  work(context);const formatter=new Intl.NumberFormat(data.locale,options),parts=formatter.formatToParts(number);
  const first=parts.findIndex(p=>['integer','nan','infinity'].includes(p.type));let last=parts.length-1;while(last>=0&&!['integer','fraction','nan','infinity'].includes(parts[last].type))last--;
  const prefix=data.textAttributes.get(number<0?2:0),suffix=data.textAttributes.get(number<0?3:1);
  return bounded((prefix??parts.slice(0,first).map(p=>p.value).join(''))+parts.slice(first,last+1).map(p=>p.value).join('')+(suffix??parts.slice(last+1).map(p=>p.value).join('')));
};
const method=(object,operation,values,context)=>{
  if(context.readOnly)throw new Error('Use NumberFormatter in an event, then display the resulting State');
  if(operation==='__construct'){storage.set(object,createData(...values,context));return null;}
  const data=storage.get(object);if(!data)throw new Error('Uninitialized NumberFormatter');
  if(operation==='format')return format(data,values[0],values[1],null,context);
  if(operation==='formatcurrency')return format(data,values[0],3,values[1],context);
  if(operation==='getattribute'||operation==='setattribute'){
    const [attribute,value]=values;if(![1,4,6,7,8,9,11,16,17,18].includes(attribute))throw unsupported('unsupported NumberFormatter attribute');
    if(operation==='getattribute')return attribute===8?data.attributes.get(7):data.attributes.get(attribute)??false;
    if(!Number.isFinite(value))throw unsupported('attribute must be finite');const n=Math.trunc(value),attrs=data.attributes;
    if(attribute===11&&!Object.hasOwn(rounding,n))throw unsupported('unsupported rounding mode');
    if([4,17,18].includes(attribute)&&(n<1||n>21)||[6,7,8].includes(attribute)&&(n<0||n>100))throw unsupported('digit settings exceed the browser formatting range');
    if([6,7,8].includes(attribute)){data.fractionSet=true;if(attribute!==6)attrs.set(7,n);if(attribute!==7)attrs.set(6,n);if(attrs.get(7)>attrs.get(6))attrs.set(attribute===6?7:6,n);}
    else attrs.set(attribute,[1,16].includes(attribute)?Number(!!n):n);
    if(attribute===17||attribute===18){attrs.set(16,1);if((attrs.get(17)??1)>(attrs.get(18)??6))attrs.set(attribute===17?18:17,n);}
    return true;
  }
  if(operation==='gettextattribute'||operation==='settextattribute'){
    if([0,1,2,3].includes(values[0])){
      if(operation==='settextattribute'){data.textAttributes.set(values[0],values[1]);return true;}
      if(data.textAttributes.has(values[0]))return data.textAttributes.get(values[0]);
      const parts=new Intl.NumberFormat(data.locale,{style:styles[data.style],...(styles[data.style]==='currency'?{currency:data.currency}:{}),currencySign:data.style===12?'accounting':'standard'}).formatToParts(values[0]>=2?-1:1);
      const first=parts.findIndex(p=>p.type==='integer');let last=parts.length-1;while(last>=0&&!['integer','fraction'].includes(parts[last].type))last--;
      return (values[0]%2===0?parts.slice(0,first):parts.slice(last+1)).map(p=>p.value).join('');
    }
    if(values[0]!==5)throw unsupported('unsupported NumberFormatter text attribute');
    if(operation==='gettextattribute')return data.currency;
    if(!/^[a-z]{3}$/i.test(values[1]))throw unsupported('currency must be a three-letter ISO currency code');data.currency=values[1].toUpperCase();
    if(styles[data.style]==='currency'&&!data.fractionSet){const options=new Intl.NumberFormat(data.locale,{style:'currency',currency:data.currency}).resolvedOptions();data.attributes.set(6,options.maximumFractionDigits);data.attributes.set(7,options.minimumFractionDigits);}
    return true;
  }
  throw unsupported('unsupported method '+operation);
};
const create=(values,context)=>{const data=createData(...values,context),object=makeObject(intlDefinition('NumberFormatter'));storage.set(object,data);return object;};
export const nativeIntlMethod=(definition,context)=>{
  const values=definition.parameters.map((p)=>context.locals[p.id]),{class:name,method:operation}=definition.nativeIntl;
  if(['Collator','IntlDateFormatter'].includes(name))return extraIntl(name,operation,values,{...context,intlParameters:definition.parameters},intlDefinition(name));
  if(name==='Normalizer'){const builtin={normalize:'normalizer_normalize',isnormalized:'normalizer_is_normalized',getrawdecomposition:'normalizer_get_raw_decomposition'}[operation];return runGrapheme(builtin,values.map((value)=>({value,kind:phpType(value)})),context);}
  const value=operation==='create'?create(values,context):method(context.thisObject,operation,values,context);return {value,kind:phpType(value)};
};
const operations={numfmt_format:'format',numfmt_format_currency:'formatcurrency',numfmt_get_attribute:'getattribute',numfmt_set_attribute:'setattribute',numfmt_get_text_attribute:'gettextattribute',numfmt_set_text_attribute:'settextattribute'};
export const runIntl=(name,items,context)=>{
  if(!name.startsWith('numfmt_'))return null;
  const values=items.map((item)=>item.value);if(context.readOnly)throw new Error('Use NumberFormatter in an event, then display the resulting State');
  const value=name==='numfmt_create'?create(values,context):method(values[0],operations[name],values.slice(1),context);return {value,kind:phpType(value)};
};
export const cloneIntl=(value)=>{const extra=cloneExtraIntl(value);if(extra)return extra;const data=storage.get(value);if(!data)return null;const copy=makeObject(objectData(value).definition);storage.set(copy,{...data,attributes:new Map(data.attributes),textAttributes:new Map(data.textAttributes)});return copy;};
