import {resolveData,resolveType,resolvedNode,resolveQuiet} from './value.js';

/** Only receiver edges propagate a short circuit; arguments start their own chains. */
export const resolveNullsafe = (node,state,context,quiet=false,issetOnly=false) => {
  const expression=node?.$expression,operation=expression?.operation;
  if(operation==='nullsafeChain')return resolveNullsafe(expression.left,state,context,quiet,issetOnly);
  if(!['objectProperty','objectCall','objectMethodRef','offset','objectClassName','objectStaticProperty','objectClass','objectConstant'].includes(operation)){
    const value=quiet?resolveQuiet(node,state,context,issetOnly):resolveData(node,state,context);
    return {value,kind:resolveType(node,state,context,value)};
  }
  const isStatic=['objectCall','objectMethodRef'].includes(operation)&&expression.right?.class!=null;
  const item=resolveNullsafe(isStatic?expression.right.class:expression.left,state,context,quiet);
  if(item.skipped||item.value===null&&expression.right?.nullable)return {value:null,kind:'NULL',skipped:true};
  const next={$expression:isStatic?{...expression,right:{...expression.right,class:resolvedNode(item)}}:{...expression,left:resolvedNode(item)}};
  const value=quiet?resolveQuiet(next,state,context,issetOnly):resolveData(next,state,context);
  return {value,kind:resolveType(next,state,context,value)};
};
