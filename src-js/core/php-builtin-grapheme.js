import normalization from './normalizer-data.json' with {type:'json'};
import {makeArray} from './php-arrays.js';
import {phpType} from './php-values.js';
import {bounded, bytes, text, failure, arrayLimit, work} from './php-builtin-support.js';

const forms = {4:'NFD',8:'NFKD',16:'NFC',32:'NFKC',48:'NFKC'};
let segmenter;
const clusters = (value) => {if(typeof Intl.Segmenter!=='function')throw failure('ValueError','Frontend graphemes require Intl.Segmenter in this browser');segmenter??=new Intl.Segmenter('und',{granularity:'grapheme'});return Array.from(segmenter.segment(value),(part)=>part.segment);};
const rawDecomposition = (value, form) => {
  const chars = Array.from(value); if (chars.length!==1) return null;
  const point=chars[0].codePointAt(0);
  if (form===48 && Object.hasOwn(normalization.rawFolded,point)) return normalization.rawFolded[point];
  if ([8,32,48].includes(form) && Object.hasOwn(normalization.compatibility,point)) return normalization.compatibility[point];
  if (point>=0xac00 && point<=0xd7a3) {const syllable=point-0xac00,tail=syllable%28; return tail ? String.fromCodePoint(point-tail,0x11a7+tail) : String.fromCodePoint(0x1100+Math.floor(syllable/588),0x1161+Math.floor(syllable%588/28));}
  return normalization.canonical[point]??null;
};
const normalized = (value, form) => form===48 ? [...value].map((char)=>normalization.folded[char.codePointAt(0)]??char.normalize('NFKC')).join('').normalize('NFC') : value.normalize(forms[form]);
const key = (value, insensitive) => (insensitive ? value.normalize('NFKD').toLowerCase().replaceAll('ς','σ') : value.normalize('NFD')).replace(/\p{Default_Ignorable_Code_Point}/gu,'');
const find = (haystack, needle, offset, reverse, insensitive, context, exact=false) => {
  const parts=clusters(haystack),count=parts.length;
  if(offset < -count || offset > count)throw failure('ValueError','grapheme search: offset must be contained in the haystack');
  const start=offset<0?count+offset:offset, positions=[0];for(const part of parts)positions.push(positions.at(-1)+part.length);
  if(needle===''){
    const index=reverse&&offset>=0?count:start,position=positions[index];
    return {index:context.source?.graphemeEmptySearchCodeUnits?position:index,position};
  }
  const search=exact?needle:key(needle,insensitive),pieces=parts.map((part)=>exact?part:key(part,insensitive)),boundaries=[0];for(const part of pieces)boundaries.push(boundaries.at(-1)+part.length);
  const input=pieces.join('');let found=-1;
  if(search==='')return null;
  const low=reverse&&offset<0?0:start, high=reverse&&offset<0?start:count;
  const indices=reverse?Array.from({length:high-low+1},(_,n)=>high-n):Array.from({length:high-low+1},(_,n)=>low+n);
  const ends=new Set(boundaries);
  for(const index of indices){work(context,search.length+1);if(input.startsWith(search,boundaries[index])&&ends.has(boundaries[index]+search.length)){found=index;break;}}
  return found<0?null:{index:found,position:positions[found]};
};
export const runGrapheme = (name, items, context) => {
  if(!name.startsWith('grapheme_')&&!name.startsWith('normalizer_'))return null;
  const [a,b,c,d]=items.map((item)=>item.value);bounded(a);work(context,a.length);let value;
  if(name.startsWith('normalizer_')){
    if(!Object.hasOwn(forms,b))throw failure('ValueError',`${name}(): form must be a valid normalization form`);
    value=name==='normalizer_get_raw_decomposition'?rawDecomposition(a,b):name==='normalizer_is_normalized'?a===normalized(a,b):normalized(a,b);
  }else if(name==='grapheme_extract'){
    const input=bytes(a),offset=d<0?input.length+d:d;items[4]?.ref?.set(offset,'integer');
    if(b<0)throw failure('ValueError','grapheme_extract(): size must be greater than or equal to 0');
    if(![0,1,2].includes(c))throw failure('ValueError','grapheme_extract(): invalid extraction type');
    if(offset<0||offset>=input.length)value=false;
    else{
      let begin=offset;while(begin<input.length&&(input[begin]&0xc0)===0x80)begin++;
      const tail=text(input.subarray(begin)),parts=clusters(tail),output=[];let used=0,byteCount=0;
      for(const part of parts){const size=c===0?1:c===1?bytes(part).length:[...part].length;if(used+size>b)break;output.push(part);used+=size;byteCount+=bytes(part).length;}
      value=output.join('');items[4]?.ref?.set(offset+byteCount,'integer');
    }
  }else if(name==='grapheme_strlen')value=clusters(a).length;
  else if(name==='grapheme_substr'){const parts=clusters(a),start=b<0?Math.max(0,parts.length+b):Math.min(b,parts.length),end=c==null?parts.length:c<0?Math.max(start,parts.length+c):Math.min(parts.length,start+c);value=parts.slice(start,end).join('');}
  else if(name==='grapheme_str_split'){if(b<1)throw failure('ValueError','grapheme_str_split(): length must be greater than 0');const parts=clusters(a),entries=[];arrayLimit(Math.ceil(parts.length/b));for(let i=0;i<parts.length;i+=b)entries.push([entries.length,parts.slice(i,i+b).join('')]);value=makeArray(entries);}
  else{
    const slice=name==='grapheme_strstr'||name==='grapheme_stristr',insensitive=name.includes('stri')||name==='grapheme_strripos',reverse=name.includes('strr');
    const match=name==='grapheme_strstr'&&!context.source?.graphemeSubstringCollation&&!a.includes(b)?null:find(a,b,slice?0:c,reverse,insensitive,context);
    value=match===null?false:slice?(c?a.slice(0,match.position):a.slice(match.position)):match.index;
  }
  if(typeof value==='string')bounded(value);return {value,kind:phpType(value)};
};
