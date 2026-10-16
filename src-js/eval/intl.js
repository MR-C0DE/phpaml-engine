import definitions from '../core/intl-definitions.json' with {type:'json'};
export const registerIntl=(compiler,name)=>{
  if(!Object.hasOwn(definitions,name.toLowerCase()))return false;
  for(const[key,definition]of Object.entries(definitions)){compiler.classes[key]=definition.class;compiler.environment.classes[key]=definition.class;for(const[id,fn]of Object.entries(definition.functions))compiler.functions[id]={...fn,source:compiler.source};}
  return true;
};
