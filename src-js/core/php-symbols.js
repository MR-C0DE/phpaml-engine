import {resolveData, valueReference, resolvedNode, promoteReference} from './value.js';
import {phpString, phpInt, phpFloat, phpBool, phpType} from './php-values.js';
import {isPhpObject, objectData} from './php-object-values.js';
import {isPhpArray, arrayEntries, arrayKind, clonePhp, makeArray} from './php-arrays.js';
import {compoundCast} from './php-casts.js';
import {bindLocalReference} from './php-references.js';
import {warn} from './diagnostics.js';
import {failure, work} from './php-builtin-support.js';

const encoder = new TextEncoder(), decoder = new TextDecoder();
export const dynamicLocalId = (value, context) => {
  const name = phpString(value, undefined, context);
  if (['this','GLOBALS','_SERVER','_GET','_POST','_FILES','_COOKIE','_SESSION','_REQUEST','_ENV'].includes(name)) throw new Error('Cannot access reserved frontend variable $' + name);
  return 'v' + [...encoder.encode(name)].map((n) => n.toString(16).padStart(2,'0')).join('');
};
const localName = (id) => decoder.decode(Uint8Array.from(id.slice(1).match(/../g) || [], (pair) => parseInt(pair,16)));
const valid = (name) => /^[A-Za-z_\x80-\uffff][A-Za-z0-9_\x80-\uffff]*$/.test(name);
export const runSymbols = (name, items, state, context) => {
  if (!['get_debug_type','settype','get_defined_vars','compact','extract'].includes(name)) return null;
  const [a,b,c] = items.map((item) => item.value);
  if (name === 'get_debug_type') {
    const value = isPhpObject(a) ? objectData(a).definition.name.replace(/class@anonymous:.*/, 'class@anonymous') : a instanceof Error ? a.name : typeof a === 'function' ? 'Closure' : {integer:'int',double:'float',boolean:'bool',NULL:'null'}[items[0].kind] || items[0].kind;
    return {value,kind:'string'};
  }
  if (context.readOnly) throw new Error(name + '() requires an event scope');
  const read = (id) => context.localReferences?.[id]?.get() || {value:context.locals[id], kind:context.localTypes[id] || phpType(context.locals[id])};
  const exists = (id) => Object.hasOwn(context.locals,id) || Object.hasOwn(context.localReferences || {},id);
  if (name === 'settype') {
    const type = b.toLowerCase(); let item;
    if (['int','integer'].includes(type)) item={value:phpInt(a,context),kind:'integer'};
    else if (['float','double'].includes(type)) item={value:phpFloat(a,context),kind:'double'};
    else if (['bool','boolean'].includes(type)) item={value:phpBool(a),kind:'boolean'};
    else if (type==='string') item={value:phpString(a,items[0].kind,context),kind:'string'};
    else if (type==='null') item={value:null,kind:'NULL'};
    else if (['array','object'].includes(type)) item=compoundCast(type==='array'?'toArray':'toObject',a,items[0].kind,context);
    else throw failure('ValueError','settype(): Argument #2 ($type) must be a valid type');
    items[0].ref.set(item.value,item.kind); return {value:true,kind:'boolean'};
  }
  if (name === 'get_defined_vars') {
    return {value:makeArray([...new Set([...(context.source?.localOrder || []),...Object.keys(context.locals),...Object.keys(context.localReferences || {})])].filter((id)=>exists(id)&&/^v(?:[0-9a-f]{2})*$/.test(id)).map((id)=>{const item=read(id);return [localName(id),clonePhp(item.value),item.kind];})),kind:'array'};
  }
  if (name === 'compact') {
    const entries = new Map();
    const visit=(value,depth=0)=>{
      work(context);if(depth>64)throw new RangeError('compact() nesting exceeds 64 levels');
      if(isPhpArray(value)){for(const [,part] of arrayEntries(value))visit(part,depth+1);return;}
      if(typeof value!=='string'){warn(context,'compact(): Argument must be string or array of strings');return;}
      const id=dynamicLocalId(value,context);if(!exists(id)){warn(context,'compact(): Undefined variable $'+value);return;}
      const item=read(id);entries.set(value,[value,clonePhp(item.value),item.kind]);
    };
    items.forEach((item)=>visit(item.value));return {value:makeArray([...entries.values()]),kind:'array'};
  }
  const mode=b & ~256, references=!!(b & 256), prefix=c;
  if(b<0||b&~263||mode>6)throw failure('ValueError','extract(): Argument #2 ($flags) must be a valid extract type');
  if([2,3,4,5].includes(mode)&&!valid(prefix))throw failure('ValueError','extract(): Argument #3 ($prefix) must be a valid identifier');
  let count=0;
  for(const [key,part] of arrayEntries(a)) {
    work(context);let target=String(key),id='v'+[...encoder.encode(target)].map(n=>n.toString(16).padStart(2,'0')).join(''),present=exists(id),good=valid(target);
    if(mode===1&&present||mode===5&&!present||mode===6&&!present)continue;
    if(mode===3||mode===2&&present||mode===4&&!good||mode===5)target=prefix+'_'+target;
    if(!valid(target))continue;id=dynamicLocalId(target,context);
    if(references) {
      const parent=resolvedNode({value:a,kind:'array'},items[0].ref),node={$expression:{operation:'offset',left:parent,right:key}};
      bindLocalReference(context,id,promoteReference(node,state,context));
    } else valueReference({$local:id},state,context).set(clonePhp(part),arrayKind(a,key));
    count++;
  }
  return {value:count,kind:'integer'};
};
