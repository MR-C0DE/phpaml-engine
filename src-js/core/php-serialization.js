import {arrayEntries, arrayKind, arrayElementReference, isPhpArray, makeArray} from './php-arrays.js';
import {isPhpObject, objectData, makeObject} from './php-object-values.js';
import {makeStdClass, watchObjectFields} from './php-stdclass.js';
import {objectMemberLookup, evaluateObject} from './php-objects.js';
import {callMagic} from './php-magic.js';
import {enumCase} from './php-enums.js';
import {assignType} from './php-types.js';
import {floatString, phpType} from './php-values.js';
import {bounded, bytes, byteString, fromByteString, failure, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

// PHP's wire format, restricted to the compiled frontend catalogue. No class
// loading or JavaScript evaluation is performed while restoring an object.
export const runSerialization = (name, items, state, context) => {
  if (!['serialize','unserialize'].includes(name)) return null;
  if (context.readOnly) throw new Error('Serialization requires an event scope');
  let nodes=0;
  const budget=(depth)=>{work(context);if(depth>64||++nodes>10000)throw new RangeError('Frontend serialization exceeds its nesting or value limit');};
  const string=(value)=>`s:${bytes(value).length}:"${value}";`;
  const member=(value,method)=>objectMemberLookup(objectData(value).definition.name,method,'methods',context,false);
  const invoke=(value,method,args=[])=>callMagic(value,objectData(value).definition.name,member(value,method),args,state,context);
  if(name==='serialize') {
    if((context.source?.serializePrecision??-1)!==-1)throw new RangeError('Frontend serialization requires serialize_precision=-1');
    const objects=new Map();let sequence=0;
    const encode=(value,kind,depth=0)=>{
      budget(depth);const id=++sequence;
      if(value===null)return 'N;';
      if(kind==='boolean')return `b:${value?1:0};`;
      if(kind==='integer')return `i:${value};`;
      if(kind==='double')return 'd:'+(Number.isNaN(value)?'NAN':value===Infinity?'INF':value===-Infinity?'-INF':floatString(value))+';';
      if(typeof value==='string')return string(value);
      if(isPhpArray(value)) {
        const entries=arrayEntries(value);
        for(const [key]of entries)if(arrayElementReference(value,key))throw new Error('Serialization of array reference cells is not supported');
        return `a:${entries.length}:{`+entries.map(([key,part])=>(typeof key==='number'?`i:${key};`:string(key))+encode(part,arrayKind(value,key),depth+1)).join('')+'}';
      }
      if(!isPhpObject(value))throw failure('Exception','Serialization of this value is not allowed');
      if(objects.has(value))return `r:${objects.get(value)};`;
      objects.set(value,id);const data=objectData(value),definition=data.definition;
      if(definition.enum){const label=definition.name+':'+data.fields.get('name').value;return `E:${bytes(label).length}:"${label}";`;}
      if(definition.nativeDate||definition.nativeIntl||definition.nativeSpl||definition.nativeReflection||definition.name.includes('@anonymous'))throw failure('Exception','Serialization of this internal or anonymous class is not supported');
      let fields=[];
      if(member(value,'__serialize')) {
        const result=invoke(value,'__serialize').value;if(!isPhpArray(result))throw new TypeError('__serialize() must return an array');
        fields=arrayEntries(result).map(([key,part])=>[key,{value:part,kind:arrayKind(result,key)}]);
      } else {
        const sleep=member(value,'__sleep')?invoke(value,'__sleep').value:null;
        if(sleep!==null&&!isPhpArray(sleep))throw new TypeError('__sleep() must return an array');
        const wanted=sleep===null?null:arrayEntries(sleep).map(([,part])=>part);
        for(const [key,item]of data.fields){
          const raw=key.includes('::$')?key.split('::$').at(-1):key;
          if(wanted&&!wanted.includes(raw))continue;
          const owner=key.includes('::$')?key.split('::$')[0]:definition.name;
          const property=objectMemberLookup(owner,raw,'properties',context,false);
          const wire=property?.visibility==='private'?'\0'+property.owner+'\0'+raw:property?.visibility==='protected'?'\0*\0'+raw:raw;
          fields.push([wire,item]);
        }
      }
      return `O:${bytes(definition.name).length}:"${definition.name}":${fields.length}:{`+fields.map(([key,item])=>(typeof key==='number'?`i:${key};`:string(key))+encode(item.value,item.kind,depth+1)).join('')+'}';
    };
    return {value:bounded(encode(items[0].value,items[0].kind)),kind:'string'};
  }
  const raw=byteString(items[0].value),options=items[1].value,allowed=options.allowed_classes??true,maxDepth=options.max_depth??4096;
  if(typeof allowed!=='boolean'&&!isPhpArray(allowed))throw new TypeError('unserialize(): allowed_classes must be an array or boolean');
  if(!Number.isInteger(maxDepth)||maxDepth<0)throw failure('ValueError','unserialize(): max_depth must be a non-negative integer');
  let position=0,sequence=0;const objects=new Map(),pending=[];
  const malformed=()=>{throw {serializationParse:true};};
  const expect=(s)=>{if(raw.slice(position,position+s.length)!==s)malformed();position+=s.length;};
  const number=(separator)=>{const end=raw.indexOf(separator,position);if(end<0)malformed();const token=raw.slice(position,end);position=end+separator.length;return token;};
  const natural=(separator)=>{const n=number(separator);if(!/^\d+$/.test(n)||Number(n)>1048576)malformed();return Number(n);};
  const quoted=()=>{const length=natural(':"'),part=raw.slice(position,position+length);if(part.length!==length)malformed();position+=length;expect('"');return fromByteString(part);};
  const parse=(depth=0,key=false)=>{
    budget(depth);if(maxDepth&&depth>maxDepth)malformed();const tag=raw[position++],id=key?0:++sequence;
    if(tag==='N'){expect(';');return {value:null,kind:'NULL'};}expect(':');
    if(tag==='s'){const value=quoted();expect(';');return {value,kind:'string'};}
    if(tag==='i'||tag==='d'||tag==='b'){
      const token=number(';');if(tag==='b'){if(!['0','1'].includes(token))malformed();return {value:token==='1',kind:'boolean'};}
      const value=token==='INF'?Infinity:token==='-INF'?-Infinity:token==='NAN'?NaN:Number(token);
      if(tag==='i'&&!/^[+-]?\d+$/.test(token)||tag==='d'&&!/^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|NAN|-?INF)$/.test(token))malformed();
      if(tag==='i'&&!Number.isSafeInteger(value))throw new RangeError('Serialized integer exceeds frontend safe precision');return {value,kind:tag==='i'?'integer':'double'};
    }
    if(tag==='R')throw new Error('Unserialization of array reference cells is not supported');
    if(tag==='r'){const ref=natural(';');if(!objects.has(ref))malformed();return objects.get(ref);}
    if(tag==='E'){const label=quoted();expect(';');const split=label.lastIndexOf(':');const item=enumCase(label.slice(0,split),label.slice(split+1),context);objects.set(id,item);return item;}
    if(tag!=='a'&&tag!=='O')malformed();
    let className=null,definition=null,item=null;
    if(tag==='O'){
      className=quoted();expect(':');definition=context.classes?.[className.toLowerCase()];
      if(className==='stdClass')definition={name:'stdClass'};
      if(!definition||definition.enum||definition.abstract||definition.interface||definition.nativeDate||definition.nativeIntl||definition.nativeSpl||definition.nativeReflection)throw new Error('Unserialization requires a concrete compiled frontend class: '+className);
      if(allowed===false||isPhpArray(allowed)&&!arrayEntries(allowed).some(([,part])=>typeof part==='string'&&part.toLowerCase()===className.toLowerCase()))throw new Error('Serialized class is not allowed: '+className);
      item={value:className==='stdClass'?makeStdClass():evaluateObject({operation:'objectNew',left:className,right:{skipConstructor:true}},state,context).value,kind:'object'};objects.set(id,item);
    }
    const count=natural(':{');if(count>10000)throw new RangeError('Serialized collection exceeds 10000 values');const entries=[];
    for(let i=0;i<count;i++){const k=parse(depth+1,true);if(!['integer','string'].includes(k.kind))malformed();entries.push([k.value,parse(depth+1)]);}expect('}');
    if(tag==='a')return {value:makeArray(entries.map(([k,v])=>[k,v.value,v.kind])),kind:'array'};
    const value=item.value,data=objectData(value);
    if(member(value,'__unserialize'))pending.push(()=>invoke(value,'__unserialize',[{value:makeArray(entries.map(([k,v])=>[k,v.value,v.kind])),kind:'array'}]));
    else {
      if(className==='stdClass'){const replacement=makeStdClass(entries);objectData(value).fieldsArray=objectData(replacement).fieldsArray;objectData(value).fields=objectData(replacement).fields;}
      else for(const [wire,part]of entries){
        const parts=String(wire).split('\0'),name=parts.at(-1),owner=parts.length===3&&parts[1]!=='*'?parts[1]:className;
        const property=objectMemberLookup(owner,name,'properties',context,false);if(!property||property.virtual)throw new Error('Unknown serialized frontend property: '+name);
        const key=property.visibility==='private'?property.owner+'::$'+name:name;data.fields.set(key,assignType(property.rule,part.value,part.kind,true,context));
      }
      if(member(value,'__wakeup'))pending.push(()=>invoke(value,'__wakeup'));
    }
    return item;
  };
  try {const result=parse();if(position<raw.length)warn(context,'unserialize(): Extra data starting at offset '+position);for(const callback of pending)callback();return result;}
  catch(error){if(!error.serializationParse)throw error;warn(context,`unserialize(): Error at offset ${position} of ${raw.length} bytes`);return {value:false,kind:'boolean'};}
};
