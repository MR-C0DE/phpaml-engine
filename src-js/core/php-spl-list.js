import {objectData} from './php-object-values.js';
import {clonePhp} from './php-arrays.js';
import {phpType} from './php-values.js';
import {work} from './php-builtin-support.js';
const storage=new WeakMap();
export const isSplList=value=>['SplDoublyLinkedList','SplQueue','SplStack'].includes(objectData(value)?.definition.name);
const failure=(name,message)=>{throw Object.assign(new Error(message),{name});};
export const cloneSplList=(original,copy)=>{const data=storage.get(original);if(data)storage.set(copy,{...data,items:data.items.map(item=>({...item,value:clonePhp(item.value)}))});};
export const splListMethod=(value,method,args,context)=>{
 if(!isSplList(value))return null;
 const name=objectData(value).definition.name;let data=storage.get(value);if(!data){data={items:[],mode:name==='SplStack'?2:0,position:0};storage.set(value,data);}
 const result=(value,kind=phpType(value))=>({value,kind}),size=()=>data.items.length,reverse=()=>!!(data.mode&2),step=()=>reverse()?-1:1;
 const index=(offset,insertion=false)=>{if(typeof offset!=='number'||!Number.isInteger(offset)||offset<0||offset>=size()+(insertion?1:0))failure('OutOfRangeException','Offset out of range');return reverse()?size()-(insertion?0:1)-offset:offset;};
 const copy=item=>({...item,value:clonePhp(item.value)}),put=item=>{if(size()>=10000)throw new RangeError('Frontend SPL list exceeds 10000 items');work(context);return copy(item);};
 if(['push','enqueue','unshift'].includes(method)){data.items[method==='unshift'?'unshift':'push'](put(args[0]));return result(null);}
 if(['pop','shift','dequeue','top','bottom'].includes(method)){if(!size())failure('RuntimeException','Cannot read from an empty datastructure');const item=method==='pop'?data.items.pop():['shift','dequeue'].includes(method)?data.items.shift():data.items[method==='top'?size()-1:0];return copy(item);}
 if(method==='add'){data.items.splice(index(args[0].value,true),0,put(args[1]));return result(null);}
 if(method==='count')return result(size(),'integer');if(method==='isempty')return result(!size(),'boolean');
 if(method==='offsetexists'){const offset=args[0].value;return result(Number.isInteger(offset)&&offset>=0&&offset<size(),'boolean');}
 if(method==='offsetget')return copy(data.items[index(args[0].value)]);
 if(method==='offsetset'){if(args[0].value===null)data.items.push(put(args[1]));else data.items[index(args[0].value)]=copy(args[1]);return result(null);}
 if(method==='offsetunset'){data.items.splice(index(args[0].value),1);return result(null);}
 if(method==='getiteratormode')return result(data.mode,'integer');
 if(method==='setiteratormode'){const mode=args[0].value&3;if(name==='SplStack'&&!(mode&2)||name==='SplQueue'&&(mode&2))failure('RuntimeException','Iterator mode cannot change stack/queue direction');data.mode=mode;return result(mode,'integer');}
 if(method==='rewind'){data.position=reverse()?size()-1:0;return result(null);}
 if(method==='valid')return result(data.position>=0&&data.position<size(),'boolean');
 if(method==='key')return result(data.position,'integer');
 if(method==='current')return data.items[data.position]?copy(data.items[data.position]):result(null);
 if(method==='next'||method==='prev'){const direction=method==='next'?step():-step();if(data.mode&1&&data.position>=0&&data.position<size()){data.items.splice(data.position,1);if(direction<0)data.position--;}else data.position+=direction;return result(null);}
 failure('Error','Unsupported SPL list method '+method);
};
