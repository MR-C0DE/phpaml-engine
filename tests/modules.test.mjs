import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ENGINE_VERSION} from '../src-js/core/version.js';
import {phpModuleNames, requiredModules} from '../src-js/modules/requirements.js';
import {configureModules, registerModule, prepareModules, moduleExport} from '../src-js/modules/runtime.js';

const expr = (operation, left, right = {}) => ({$expression: {operation, left, right}});
test('plain counter and compiled closures require no optional library', () => {
  assert.deepEqual(requiredModules(expr('postIncrement', {$state:'count'})), []);
  assert.deepEqual(requiredModules(expr('builtin','array_map',{arguments:[{value:expr('closure','f1')},{value:{$state:'items'}}]})), []);
});
test('callbacks, nested services and native class descriptors contribute dependencies', () => {
  assert.deepEqual(requiredModules(expr('builtin','array_map',{arguments:[{value:'mb_strtoupper'},{value:['été']}]})), ['unicode']);
  assert.deepEqual(requiredModules({functions:{f1:{nativeReflection:{class:'ReflectionClass'}}}}), ['reflection']);
  assert.deepEqual(requiredModules(expr('builtin','numfmt_format')), ['unicode','intl','date']);
});
test('unknown calls and dynamic eval retain every optional PHP family', () => {
  assert.deepEqual(requiredModules(expr('call',{$state:'functionName'})), phpModuleNames);
  assert.deepEqual(requiredModules(expr('eval',{$state:'code'})), phpModuleNames);
  assert.deepEqual(requiredModules(expr('eval','return 1;',{program:{body:expr('builtin','bcadd')}})), ['bcmath']);
  assert.deepEqual(requiredModules(expr('builtin','array_map',{arguments:[{spread:true,value:expr('array',[{value:'mb_strtoupper'}])}]})), phpModuleNames);
  assert.deepEqual(requiredModules(expr('builtin','preg_replace_callback_array',{arguments:[{value:expr('array',[{value:{$state:'callback'}}])}]})), phpModuleNames);
  assert.deepEqual(requiredModules(expr('builtin','filter_var_array',{arguments:[{value:{$state:'items'}},{value:expr('array',[])}]})), phpModuleNames);
});
test('browser operations load only their existing capability, including nested actions', () => {
  assert.deepEqual(requiredModules({type:'sequence', actions:[{type:'file'}, {type:'api'}]}), ['files','browser']);
  assert.deepEqual(requiredModules({type:'file', value:expr('builtin','mb_strtoupper')}), ['unicode','files']);
  assert.deepEqual(requiredModules({type:'increment', target:'counter'}), []);
});
test('module loading deduplicates concurrent requests, checks versions and can retry a failed loader', async () => {
  let calls=0, fail=true;
  configureModules({bcmath:async()=>{calls++;if(fail)throw new Error('offline');registerModule('bcmath',ENGINE_VERSION,{sample:()=>42});}});
  const first=prepareModules(['bcmath']), second=prepareModules(['bcmath']);
  await assert.rejects(first,error=>error.code==='AML_MODULE_LOAD');
  await assert.rejects(second,error=>error.code==='AML_MODULE_LOAD');
  assert.equal(calls,1); fail=false;
  await prepareModules(['bcmath']);assert.equal(calls,2);
  assert.equal(moduleExport('bcmath','sample')(),42);assert.equal(prepareModules(['bcmath']),null);
  assert.throws(()=>registerModule('regex','incompatible',{}),/Incompatible/);
  assert.throws(()=>registerModule('bcmath',ENGINE_VERSION,{}),/already registered/);
  configureModules(null);
});
test('Core graph excludes optional implementations and publishes only built assets', () => {
  const root=resolve(import.meta.dirname,'..');
  const build=JSON.parse(readFileSync(resolve(root,'assets/module-build.json'))).minified;
  const inputs=build.initial.flatMap(file=>Object.keys(build.outputs[file].inputs));
  for(const name of ['normalizer-data','unicode-data','intl-definitions','date-definitions','spl-definitions','reflection-definitions','php-builtin-bcmath','php-regex-vm','files-runtime','file-codecs','browser-api','browser-forms','browser-storage','storage.js','http.js','animations-runtime'])assert.equal(inputs.some(input=>!input.startsWith('phpaml-proxy:')&&input.includes(name)),false,name);
  const size=build.initial.reduce((total,file)=>total+build.outputs[file].bytes,0);
  assert.ok(size<readFileSync(resolve(root,`assets/engine-${ENGINE_VERSION}.min.js`)).length*0.5);
});
