import definitions from './reflection-definitions.json' with {type:'json'};
import {makeObject,objectData,objectIs} from './php-object-values.js';
import {objectMemberLookup,evaluateObject,objectPropertyReference} from './php-objects.js';
import {staticPropertyReference} from './php-static-properties.js';
import {bindMethod,invokeFunction} from './php-functions.js';
import {resolvedNode} from './value.js';
import {arrayEntries,arrayKind,makeArray} from './php-arrays.js';
import {phpType} from './php-values.js';
const storage=new WeakMap();
const fail=message=>{throw Object.assign(new Error(message),{name:'ReflectionException'});};
const create=(name,data)=>{const object=makeObject(definitions[name.toLowerCase()].class);storage.set(object,data);return object;};
const className=value=>storage.get(value)?.className||objectData(value)?.definition.name||value;
const lineage=(name,context)=>{const output=[];while(name){const data=context.classes[name.toLowerCase()];if(!data)fail('Class '+name+' does not exist');output.push(data);name=data.parent;}return output;};
const table=(data,type,context)=>Object.assign({},...lineage(data.className,context).reverse().map(row=>row[type]));
export const nativeReflectionMethod=(definition,context)=>{
 const operation=definition.nativeReflection.method,name=definition.nativeReflection.class,values=definition.parameters.map(p=>context.locals[p.id]),object=context.thisObject,state=context.objectState||{},result=value=>({value,kind:phpType(value)});
 if(operation==='__construct'){let target=className(values[0]),member=values[1];if(name==='ReflectionMethod'&&!member&&typeof target==='string'&&target.includes('::'))[target,member]=target.split('::');if(typeof target!=='string')fail('Expected a compiled class');const type=name==='ReflectionMethod'?'methods':name==='ReflectionProperty'?'properties':null;const klass=lineage(target,context)[0];const found=type?objectMemberLookup(klass.name,type==='methods'?member.toLowerCase():member,type,context,false)||type==='properties'&&objectMemberLookup(klass.name,member,'staticProperties',context,false):null;if(type&&!found)fail('Unknown reflected member '+member);storage.set(object,{className:klass.name,member:found,type});return result(null);}
 const data=storage.get(object);if(!data)fail('Uninitialized reflection');const klass=lineage(data.className,context)[0],member=data.member;
 if(operation==='getname')return result(member?.name||klass.name);
 if(operation==='getshortname')return result(klass.name.split('\\').at(-1));
 if(operation==='getnamespacename')return result(klass.name.split('\\').slice(0,-1).join('\\'));
 if(operation==='innamespace')return result(klass.name.includes('\\'));
 if(operation==='isinternal')return result(!!(klass.nativeDate||klass.nativeIntl||klass.nativeSpl||klass.nativeReflection));
 if(operation==='isuserdefined')return result(!(klass.nativeDate||klass.nativeIntl||klass.nativeSpl||klass.nativeReflection));
 if(operation==='getdeclaringclass')return result(create('ReflectionClass',{className:member.owner}));
 if(['ispublic','isprivate','isprotected'].includes(operation))return result(member.visibility===operation.slice(2));
 if(operation==='isstatic')return result(!!member.static||Object.values(table(data,'staticProperties',context)).includes(member));
 if(['isabstract','isfinal','isinterface','istrait','isenum','isreadonly'].includes(operation))return result(!!(member||klass)[operation.slice(2)]);
 if(operation==='isinstantiable')return result(!klass.abstract&&!klass.interface&&!klass.enum&&(!klass.methods.__construct||klass.methods.__construct.visibility==='public'));
 if(operation==='iscloneable')return result(!klass.enum&&!klass.interface&&!klass.abstract);
 if(operation==='setaccessible')return result(null);
 if(operation==='isconstructor'||operation==='isdestructor')return result(member.name.toLowerCase()===(operation==='isconstructor'?'__construct':'__destruct'));
 if(operation==='isdefault')return result(true);
 if(operation==='getnumberofparameters'||operation==='getnumberofrequiredparameters'){const params=context.functions[member.id].parameters;return result(params.filter(p=>operation==='getnumberofparameters'||!Object.hasOwn(p,'default')&&!p.variadic).length);}
 if(operation==='invokeargs'){const args=arrayEntries(values[1]).map(([key,value])=>({value,kind:arrayKind(values[1],key),...(typeof key==='string'?{name:key}:{})}));return invokeFunction(bindMethod(member.id,member.static?null:values[0],member.owner,data.className),args,state,context);}
 if(['getvalue','setvalue','isinitialized'].includes(operation)){
  const scoped={...context,objectScope:member.owner},isStatic=Object.values(table(data,'staticProperties',context)).includes(member),ref=isStatic?staticPropertyReference({left:member.owner,right:{name:member.name}},state,scoped):objectPropertyReference({left:resolvedNode({value:values[0],kind:'object'}),right:{name:member.name}},state,scoped);
  if(operation==='setvalue'){const next=isStatic&&context.functionArguments.length===1?values[0]:values[1];ref.set(next,phpType(next));return result(null);}if(operation==='isinitialized')return result(ref.initialized());return ref.get();
 }
 if(operation==='getparentclass')return result(klass.parent?create('ReflectionClass',{className:klass.parent}):false);
 if(operation==='getinterfacenames')return result(klass.ancestors.filter(name=>context.classes[name.toLowerCase()]?.interface));
 if(operation==='issubclassof'||operation==='implementsinterface')return result(klass.ancestors.some(name=>name.toLowerCase()===className(values[0]).toLowerCase()));
 if(operation==='isinstance')return result(objectIs(values[0],klass.name));
 if(operation==='newinstanceargs'||operation==='newinstancewithoutconstructor'){const arguments_=operation==='newinstanceargs'?arrayEntries(values[0]).map(([key,value])=>({value:resolvedNode({value,kind:arrayKind(values[0],key)}),...(typeof key==='string'?{name:key}:{})})):[];return evaluateObject({operation:'objectNew',left:klass.name,right:{arguments:arguments_,skipConstructor:operation==='newinstancewithoutconstructor'}},state,context);}
 if(['hasmethod','getmethod','hasproperty','getproperty','hasconstant','getconstant'].includes(operation)){
  const type=operation.endsWith('method')?'methods':operation.endsWith('property')?'properties':'constants',key=type==='methods'?values[0].toLowerCase():values[0],found=objectMemberLookup(klass.name,key,type,context,false)||type==='properties'&&objectMemberLookup(klass.name,key,'staticProperties',context,false);
  if(operation.startsWith('has'))return result(!!found);if(!found){if(type==='constants')return result(false);fail('Unknown reflected member '+key);}if(type==='constants')return evaluateObject({operation:'objectConstant',left:klass.name,right:key},state,{...context,objectScope:found.owner});return result(create(type==='methods'?'ReflectionMethod':'ReflectionProperty',{className:klass.name,member:found,type}));
 }
 if(operation==='getconstants'){const entries=[];for(const [key,constant] of Object.entries(table(data,'constants',context))){const item=evaluateObject({operation:'objectConstant',left:klass.name,right:key},state,{...context,objectScope:constant.owner});entries.push([key,item.value,item.kind]);}return result(makeArray(entries));}
 if(operation==='getmethods'||operation==='getproperties'){const type=operation==='getmethods'?'methods':'properties',members=Object.values({...table(data,type,context),...(type==='properties'?table(data,'staticProperties',context):{})});const mask=values[0];return result(members.filter(member=>mask===null||mask&({public:1,protected:2,private:4}[member.visibility]|(member.static?16:0)|(member.final?32:0)|(member.abstract?64:0))).map(member=>create(type==='methods'?'ReflectionMethod':'ReflectionProperty',{className:klass.name,member,type})));}
 fail('Unsupported reflection method '+operation);
};
