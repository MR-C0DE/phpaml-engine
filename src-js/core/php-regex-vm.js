// Bounded backtracking for PCRE constructs that cannot safely run as a single
// JavaScript RegExp. Only individual character atoms use the host matcher.
export const regexVM = (source,flags,context) => {
  let i=0,groups=0;const names=new Map(),unicode=flags.includes('u');
  const error=message=>{throw new SyntaxError(message);};
  const choice=()=>{const branches=[sequence()];while(source[i]==='|'){i++;branches.push(sequence());}return branches.length===1?branches[0]:{type:'or',branches};};
  const sequence=()=>{const nodes=[];while(i<source.length&&source[i]!==')'&&source[i]!=='|')nodes.push(repetition());return {type:'sequence',nodes};};
  const repetition=()=>{let node=atom();const match=source.slice(i).match(/^(\*|\+|\?|\{(\d+)(?:,(\d*))?\})/);if(!match)return node;i+=match[0].length;
    const min=match[1]==='*'||match[1]==='?'?0:match[1]==='+'?1:Number(match[2]),max=match[1]==='?'?1:match[1]==='*'||match[1]==='+'?Infinity:match[3]===undefined?min:match[3]===''?Infinity:Number(match[3]);
    if(max<min)error('numbers out of order in quantifier');if(min>1000||Number.isFinite(max)&&max>1000)error('quantifier exceeds frontend limit');
    const lazy=source[i]==='?',possessive=source[i]==='+';if(lazy||possessive)i++;return {type:'repeat',node,min,max,lazy,possessive};};
  const atom=()=>{const start=i,c=source[i++];
    if(c==='('){let type='capture',number=++groups,name=null,negative=false,behind=false;
      if(source[i]==='?'){groups--;i++;const marker=source[i++];
        if(marker===':')type='group';else if(marker==='>')type='atomic';else if(marker==='='||marker==='!'){type='look';negative=marker==='!';}
        else if(marker==='<'){if(source[i]==='='||source[i]==='!'){type='look';behind=true;negative=source[i++]==='!';}else{const end=source.indexOf('>',i);if(end<0)error('unterminated group name');name=source.slice(i,end);i=end+1;type='capture';number=++groups;names.set(name,number);}}
        else error('unsupported group prefix');
      }
      const node=choice();if(source[i++]!==')')error('missing closing parenthesis');return {type,node,number,name,negative,behind};
    }
    if(c==='^')return {type:'start'};if(c==='$')return {type:'end'};
    if(c==='\\'){
      const next=source[i++];if(next===undefined)error('trailing backslash');
      if(/[1-9]/.test(next)){let number=next;while(/\d/.test(source[i]||''))number+=source[i++];return {type:'backref',number:Number(number)};}
      if(next==='k'&&source[i]==='<'){const end=source.indexOf('>',++i);if(end<0)error('unterminated backreference');const name=source.slice(i,end);i=end+1;return {type:'backref',name};}
      if(next==='b'||next==='B')return {type:'boundary',negative:next==='B'};
      if(next==='p'||next==='P'||next==='u'&&source[i]==='{'){if(source[i]==='{'){const end=source.indexOf('}',i);if(end<0)error('unterminated escape');i=end+1;}}
      else if(next==='x')i+=2;else if(next==='u')i+=4;
    }else if(c==='['){let escaped=false;while(i<source.length){const ch=source[i++];if(ch===']'&&!escaped)break;if(ch==='\\'&&!escaped)escaped=true;else escaped=false;}if(source[i-1]!==']')error('missing closing bracket');}
    else if('*+?{}'.includes(c||''))error('quantifier without atom');
    const raw=source.slice(start,i);let regex;try{regex=new RegExp(raw,'y'+flags.replace(/[gdy]/g,''));}catch(e){error(e.message);}return {type:'atom',regex};
  };
  const tree=choice();if(i!==source.length)error('unexpected closing parenthesis');
  let steps=0;const tick=()=>{if(++steps>200000)throw Object.assign(new Error('Backtrack limit exhausted'),{pcreError:2});};
  function* match(node,state,input,depth=0){tick();if(depth>256)throw Object.assign(new Error('Recursion limit exhausted'),{pcreError:3});
    switch(node.type){
      case 'atom':{node.regex.lastIndex=state.pos;const found=node.regex.exec(input);if(found)yield {...state,pos:node.regex.lastIndex};return;}
      case 'start':if(state.pos===0)yield state;return;
      case 'end':if(state.pos===input.length)yield state;return;
      case 'boundary':{const word=c=>c!==undefined&&/[A-Za-z0-9_]/.test(c);if((word(input[state.pos-1])!==word(input[state.pos]))!==node.negative)yield state;return;}
      case 'backref':{const capture=state.caps[node.number??names.get(node.name)];if(!capture)return;const text=input.slice(...capture),part=input.slice(state.pos,state.pos+text.length);if(flags.includes('i')?part.toLowerCase()===text.toLowerCase():part===text)yield {...state,pos:state.pos+text.length};return;}
      case 'or':for(const branch of node.branches)yield* match(branch,state,input,depth+1);return;
      case 'sequence':yield* chain(node.nodes,0,state,input,depth+1);return;
      case 'group':yield* match(node.node,state,input,depth+1);return;
      case 'atomic':{for(const found of match(node.node,state,input,depth+1)){yield found;break;}return;}
      case 'capture':for(const found of match(node.node,state,input,depth+1)){const caps=[...found.caps];caps[node.number]=[state.pos,found.pos];yield {...found,caps};}return;
      case 'look':{let found=null;if(node.behind){for(let start=state.pos;start>=0&&!found;start--)for(const result of match(node.node,{...state,pos:start},input,depth+1))if(result.pos===state.pos){found=result;break;}}
        else for(const result of match(node.node,state,input,depth+1)){found=result;break;}
        if(node.negative?!found:!!found)yield found&&!node.negative?{...found,pos:state.pos}:state;return;}
      case 'repeat':{let count=0;for(const found of repeat(node,state,input,0,depth+1)){yield found;if(node.possessive&&++count)break;}return;}
    }
  }
  function* chain(nodes,index,state,input,depth){if(index===nodes.length){yield state;return;}for(const found of match(nodes[index],state,input,depth))yield* chain(nodes,index+1,found,input,depth+1);}
  function* repeat(node,state,input,count,depth){tick();if(count>1000)throw Object.assign(new Error('Backtrack limit exhausted'),{pcreError:2});
    if(node.lazy&&count>=node.min)yield state;
    if(count<node.max)for(const found of match(node.node,state,input,depth)){if(found.pos===state.pos){if(count+1>=node.min)yield found;else yield* repeat(node,found,input,count+1,depth+1);}else yield* repeat(node,found,input,count+1,depth+1);}
    if(!node.lazy&&count>=node.min)yield state;
  }
  const engine={lastIndex:0,execAt(input,start,nonempty=false){steps=0;for(let offset=start;offset<=input.length;){for(const found of match(tree,{pos:offset,caps:[]},input)){if(nonempty&&found.pos===offset)continue;const indices=[[offset,found.pos],...Array.from({length:groups},(_,n)=>found.caps[n+1])];const result=indices.map(span=>span?input.slice(...span):undefined);result.indices=indices;result.index=offset;engine.lastIndex=found.pos;return result;}if(nonempty)break;offset+=unicode&&input.codePointAt(offset)>0xffff?2:1;}engine.lastIndex=0;return null;},exec(input){return engine.execAt(input,engine.lastIndex);},test(input){return engine.exec(input)!==null;}};
  return engine;
};
