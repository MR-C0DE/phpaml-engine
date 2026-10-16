// Resolve lexical PHP namespaces before lowering expressions. Dynamic strings
// deliberately keep their spelling: PHP never applies imports to them.
export const resolveNamespaces = (ast,environment) => {
  const functions=new Set(Object.values(environment.functions||{}).map(fn=>fn.name.toLowerCase()));
  const collect=(node,namespace='')=>{if(!node||typeof node!=='object')return;if(node.kind==='namespace')namespace=node.name||'';if(node.kind==='function')functions.add(((namespace?namespace+'\\':'')+node.name.name).toLowerCase());for(const [key,value] of Object.entries(node))if(key!=='loc')if(Array.isArray(value))value.forEach(part=>collect(part,namespace));else if(value&&typeof value==='object')collect(value,namespace);};collect(ast);
  const resolve=(name,type,namespace,aliases)=>{if(name.startsWith('\\'))return name.slice(1);if(name.toLowerCase().startsWith('namespace\\'))return (namespace?namespace+'\\':'')+name.slice(10);const parts=name.split('\\'),alias=aliases[type][parts[0].toLowerCase()];if(alias)return [alias,...parts.slice(1)].join('\\');const qualified=(namespace?namespace+'\\':'')+name;return type==='function'&&!name.includes('\\')&&!functions.has(qualified.toLowerCase())?name:qualified;};
  const walk=(node,namespace,aliases,parent=null,key=null)=>{if(!node||typeof node!=='object')return node;if(node.kind==='namespace')return {kind:'block',namespaceBlock:true,loc:node.loc,children:scope(node.children,node.name||'')};
    if(['class','interface','trait','enum','function'].includes(node.kind)&&node.name){node.name.name=(namespace?namespace+'\\':'')+node.name.name;}
    if(node.kind==='name'&&!(parent?.kind==='enum'&&key==='valueType'))node.name=resolve(node.name,parent?.kind==='call'&&key==='what'?'function':'class',namespace,aliases);
    for(const [field,value]of Object.entries(node))if(field!=='loc')if(Array.isArray(value))node[field]=value.map(part=>walk(part,namespace,aliases,node,field));else if(value&&typeof value==='object')walk(value,namespace,aliases,node,field);
    return node;};
  const scope=(nodes,namespace)=>{const aliases={class:{},function:{},const:{}};for(const node of nodes)if(node.kind==='usegroup')for(const item of node.items){const type=item.type||node.type||'class',name=(node.name?node.name+'\\':'')+item.name,alias=item.alias?.name||name.split('\\').at(-1);aliases[type][alias.toLowerCase()]=name.replace(/^\\/,'');}return nodes.filter(node=>node.kind!=='usegroup').flatMap(node=>{const result=walk(node,namespace,aliases);return result.namespaceBlock?result.children:[result];});};
  ast.children=scope(ast.children,'');return ast;
};
