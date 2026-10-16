import {failure, work} from './php-builtin-support.js';
import {warn} from './diagnostics.js';

// MT19937 state and rejection sampling are kept per interpreter memory.
const seed = (value, mode) => {
  const words=new Uint32Array(624);words[0]=Number(BigInt.asUintN(32,BigInt(value)));
  for(let i=1;i<624;i++)words[i]=(Math.imul(1812433253,words[i-1]^(words[i-1]>>>30))+i)>>>0;
  return {words,index:624,mode};
};
const next = (rng) => {
  const a=rng.words;
  if(rng.index===624){for(let i=0;i<624;i++){const u=a[i],v=a[(i+1)%624],joined=(u&0x80000000)|(v&0x7fffffff);a[i]=(a[(i+397)%624]^(joined>>>1)^(((rng.mode===1?u:v)&1)?0x9908b0df:0))>>>0;}rng.index=0;}
  let x=a[rng.index++];x^=x>>>11;x^=(x<<7)&0x9d2c5680;x^=(x<<15)&0xefc60000;return (x^(x>>>18))>>>0;
};
const freshSeed = () => {const word=new Uint32Array(1);globalThis.crypto.getRandomValues(word);return word[0];};
export const runRandom = (name,items,context) => {
  if(!['rand','mt_rand','srand','mt_srand','getrandmax','mt_getrandmax'].includes(name))return null;
  if(name.endsWith('getrandmax'))return {value:2147483647,kind:'integer'};
  if(context.readOnly)throw new Error('Random state requires a frontend event');
  const memory=context.builtinMemory ||= {};
  if(name.endsWith('srand')){const mode=items[1].value===1?1:0;if(mode===1&&(context.source?.phpVersion??80400)>=80300)warn(context,'The MT_RAND_PHP variant of Mt19937 is deprecated','PHP_DEPRECATED');memory.mt=seed(items[0].value??freshSeed(),mode);return {value:null,kind:'NULL'};}
  const rng=memory.mt ||= seed(freshSeed(),0);work(context);
  if(!items.some((i)=>i.provided))return {value:next(rng)>>>1,kind:'integer'};
  if(!items[0].provided||!items[1].provided)throw failure('ArgumentCountError',name+'() expects exactly 2 arguments, 1 given');
  let min=items[0].value,max=items[1].value;
  if(max<min){if(name==='mt_rand')throw failure('ValueError','mt_rand(): Argument #2 ($max) must be greater than or equal to argument #1 ($min)');[min,max]=[max,min];}
  if(rng.mode===1)return {value:min+Math.floor((max-min+1)*((next(rng)>>>1)/2147483648)),kind:'integer'};
  const width=BigInt(max)-BigInt(min)+1n,bits=width>4294967296n?64n:32n,space=1n<<bits,ceiling=space-space%width;
  for(let i=0;i<100;i++){let n=BigInt(next(rng));if(bits===64n)n|=BigInt(next(rng))<<32n;if(n<ceiling)return {value:Number(BigInt(min)+n%width),kind:'integer'};work(context);}
  throw failure('Random\\BrokenRandomEngineError','Unable to generate an unbiased random integer');
};
