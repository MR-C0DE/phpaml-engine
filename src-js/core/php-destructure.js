import {resolveData,resolveType,resolvedNode,valueReference,promoteReference,bindReferenceTarget,assignTarget} from './value.js';
import {clonePhp} from './php-arrays.js';
import {bindOffsetPattern} from './php-object-collections.js';
export const destructure = (action,state,context) => {
  const references=action.bindings.some(binding=>binding.reference);
  const ref=references?valueReference(action.value,state,context):null;
  const value=ref?ref.get().value:resolveData(action.value,state,context),kind=resolveType(action.value,state,context,value);
  const root=resolvedNode({value,kind},ref);
  const cache=new Map();
  for(const binding of action.bindings) {
    if(binding.reference) {
      let node=root;
      for(const key of binding.path)node={$expression:{operation:'offset',left:node,right:key}};
      bindReferenceTarget(binding.target,promoteReference(node,state,context),state,context);
    } else bindOffsetPattern([binding],{value:clonePhp(value),kind},key=>{const value=resolveData(key,state,context);return {value,kind:resolveType(key,state,context,value)};},(target,item)=>assignTarget(target,item.value,item.kind,state,context),context,cache);
  }
};

export const destructureReference=(bindings,reference,state,context)=>destructure({bindings,value:resolvedNode(reference.get(),reference)},state,context);
