import {viewFile, engineTag, runtimeMode} from './test-environment.mjs';
import {test,expect} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';
import {requiredModules} from '../../src-js/modules/requirements.js';

const fixture=viewFile('tests/modular-runtime.php');
const samples=JSON.parse(execFileSync(process.env.PHP_BINARY||'php',[fixture,'--json'],{encoding:'utf8',maxBuffer:32*1024*1024}));
const loadedModule=url=>url.match(/\/modules-[^/]+\/(unicode|intl|bcmath|regex|date|spl|reflection|files|browser|animations)-[^/]+\.js$/)?.[1];
async function routeSample(page,sample,path='/module-case'){
  await page.route('**'+path,route=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'none'; img-src 'self'; connect-src 'self'; script-src 'self'; style-src 'unsafe-inline'"},body:`<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${sample.html}</main>${engineTag}`}));
}
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{window.moduleErrors=[];window.moduleCsp=[];document.addEventListener('aml:error',event=>moduleErrors.push({message:event.detail.error.message,code:event.detail.error.code}),true);document.addEventListener('securitypolicyviolation',event=>moduleCsp.push(event.blockedURI));});
});
for(const sample of samples)test(`PHP family parity and dependencies: ${sample.method}`,async({page})=>{
  const requests=[],errors=[];page.on('request',request=>{const name=loadedModule(request.url());if(name)requests.push(name);});page.on('pageerror',error=>errors.push(error.message));
  await routeSample(page,sample);await page.goto('/module-case');
  const root=page.locator('[data-aml-client]');await expect(root).toHaveAttribute('data-aml-engine-mounted','true');
  if(sample.method==='unicode')await expect(page.locator('#module-length')).toHaveText('5');
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await expect.poll(()=>root.evaluate(root=>AMLEngine.inspect(root))).toEqual(sample.expected);
  if(sample.method==='unicode')await expect(page.locator('#module-length')).toHaveText('1');
  const expected=runtimeMode==='full'?[]:sample.method==='unicode'||sample.method==='callback'?['unicode']:requiredModules(sample.action);
  expect([...new Set(requests)].sort()).toEqual([...expected].sort());expect(requests.length).toBe(new Set(requests).size);
  expect(await page.evaluate(()=>moduleErrors)).toEqual([]);expect(await page.evaluate(()=>moduleCsp)).toEqual([]);expect(errors).toEqual([]);
});
test('navigation loads missing modules once and preserves shared Core object identity',async({page})=>{
  const requests=[];page.on('request',request=>{const module=loadedModule(request.url());if(module)requests.push(module);});
  await routeSample(page,samples.find(sample=>sample.method==='counter'),'/module-counter');
  await routeSample(page,samples.find(sample=>sample.method==='spl'),'/module-spl');
  await page.goto('/module-counter');await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
  await page.evaluate(()=>window.originalEngine=AMLEngine);
  for(let index=0;index<2;index++){
    await page.evaluate(()=>AMLEngine.navigate('/module-spl'));
    await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.locator('#module-result')).toHaveText('7');
    await page.evaluate(()=>AMLEngine.navigate('/module-counter'));
  }
  expect(await page.evaluate(()=>originalEngine===AMLEngine)).toBe(true);expect(requests.sort()).toEqual(runtimeMode==='modules'?['animations','spl']:[]);
});
test('module entry and optional eval parser preserve nonce-only CSP',async({page})=>{
  const sample=samples.find(sample=>sample.method==='dynamicEval'),nonce='dGVzdC1ub25jZQ==';
  await page.route('**/module-nonce',route=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':`default-src 'none'; img-src 'self'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'`},body:`<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${sample.html}</main>${engineTag.replace('<script ',`<script nonce="${nonce}" `)}`}));
  await page.goto('/module-nonce');const root=page.locator('[data-aml-client]');
  await expect(root).toHaveAttribute('data-aml-engine-mounted','true');
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await expect.poll(()=>root.evaluate(root=>AMLEngine.inspect(root))).toEqual(sample.expected);
  expect(await page.evaluate(()=>moduleErrors)).toEqual([]);expect(await page.evaluate(()=>moduleCsp)).toEqual([]);
});
if(runtimeMode==='modules')test('failed module download leaves the current page and State intact',async({page})=>{
  await routeSample(page,samples.find(sample=>sample.method==='counter'),'/module-counter');
  await routeSample(page,samples.find(sample=>sample.method==='bcmath'),'/module-bcmath');
  await page.route('**/bcmath-*.js',route=>route.abort());
  await page.goto('/module-counter');await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
  await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.locator('#module-count')).toHaveText('1');
  const error=await page.evaluate(()=>AMLEngine.navigate('/module-bcmath').then(()=>null,error=>({code:error.code,module:error.module})));
  expect(error).toEqual({code:'AML_MODULE_LOAD',module:'bcmath'});await expect(page.locator('#module-count')).toHaveText('1');expect(new URL(page.url()).pathname).toBe('/module-counter');
  await page.getByRole('button',{name:'Run',exact:true}).click();await expect(page.locator('#module-count')).toHaveText('2');
});

if(runtimeMode==='modules')test('unmount cancels a component waiting for its module',async({page})=>{
  await routeSample(page,samples.find(sample=>sample.method==='counter'),'/module-counter');
  await page.goto('/module-counter');await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
  let release, requested=false;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/bcmath-*.js',async route=>{requested=true;await gate;await route.continue();});
  await page.evaluate(html=>{
    const container=document.createElement('section');container.id='waiting-module';container.innerHTML='<main data-aml-client>'+html+'</main>';document.body.append(container);
    window.pendingMount=AMLEngine.mount(container);AMLEngine.unmount(container.querySelector('main'));
  },samples.find(sample=>sample.method==='bcmath').html);
  await expect.poll(()=>requested).toBe(true);release();await page.evaluate(()=>pendingMount);
  await expect(page.locator('#waiting-module main')).not.toHaveAttribute('data-aml-engine-mounted','true');
  await page.evaluate(()=>AMLEngine.mount(document.querySelector('#waiting-module')));
  await expect(page.locator('#waiting-module main')).toHaveAttribute('data-aml-engine-mounted','true');
  await page.locator('#waiting-module button').click();await expect(page.locator('#waiting-module #module-result')).toHaveText('25.00');
});
