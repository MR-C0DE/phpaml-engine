import {test, expect} from './runtime-test.mjs';
import {engineTag, runtimeMode} from './test-environment.mjs';

const attribute = value => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll("'", '&#39;');
const manifest = (state = {count: 0}, config = {}) => `<template data-aml-state='${attribute(state)}' data-aml-state-config='${attribute(config)}'></template>`;
const button = (action, label = 'Run') => `<button data-aml-client-click='${attribute(action)}'>${label}</button>`;
const counter = manifest() + button({type:'increment', target:'count', value:1}) + '<output data-aml-bind="count"></output>';
const api = {type:'api', method:'GET', url:'/module-api', result:'result', select:'value'};
const file = {type:'file', operation:'read', format:'text', source:'text', result:'result'};
const animated = manifest({visible:false}) + button({type:'set', target:'visible', value:true})
  + `<div data-aml-transition="slide" data-aml-transition-duration="75"><aside data-aml-toast='${attribute({state:'visible',duration:0})}'>Notice</aside></div>`;
const capabilities = {
  files: manifest({result:''}) + `<input type="file" data-aml-file-source="text">` + button(file),
  browser: manifest({result:''}) + button(api) + '<output data-aml-bind="result"></output>',
  animations: animated,
};
const serve = (page, body, path = '/browser-module') => page.route('**'+path, route => route.fulfill({
  contentType:'text/html', headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'"},
  body:`<!doctype html><meta charset="utf-8"><main data-aml-client>${body}</main>${engineTag}`,
}));
const ready = page => expect(page.locator('main[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
const requests = page => {
  const names = [];
  page.on('request', request => {const name = request.url().match(/\/(files|browser|animations|unicode|intl|bcmath|regex|date|spl|reflection)-[^/]+\.js$/)?.[1]; if(name) names.push(name);});
  return names;
};
const expectModules = (names, expected) => expect(names.slice().sort()).toEqual(runtimeMode === 'modules' ? expected.slice().sort() : []);

test('plain Core keeps synchronous clear APIs and loads Browser only for IndexedDB cleanup', async ({page}) => {
  const names = requests(page);
  await serve(page,counter); await page.goto('/browser-module'); await ready(page);
  await page.getByRole('button',{name:'Run'}).click(); await expect(page.locator('output')).toHaveText('1');
  expect(await page.evaluate(() => {
    localStorage.setItem('plain','value');sessionStorage.setItem('phpaml.form.plain','value');
    const local = AMLEngine.clearPersisted('plain'), draft = AMLEngine.clearFormDraft('plain');
    return [local === undefined, draft === undefined, localStorage.getItem('plain'), sessionStorage.getItem('phpaml.form.plain')];
  })).toEqual([true,true,null,null]);
  expectModules(names,[]);
  await page.evaluate(() => AMLEngine.clearPersisted('plain','indexeddb'));
  expectModules(names,['browser']);
});

for (const [name, body] of Object.entries(capabilities)) test(`${name} is selected independently before the first mount`, async ({page}) => {
  const names = requests(page);
  await serve(page,body);await page.goto('/browser-module');await ready(page);
  expectModules(names,[name]);
  if(name === 'browser') {
    await page.route('**/module-api',route=>route.fulfill({json:{value:'READY'}}));
    await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('output')).toHaveText('READY');
  }
});

test('transitions keep their frames and respect reduced motion', async ({page}) => {
  await page.addInitScript(() => {
    window.animations=[];
    const native=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){window.animations.push({frames,options});return native.call(this,frames,options);};
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await serve(page,animated);await page.goto('/browser-module');await ready(page);
  await page.getByRole('button',{name:'Run'}).click();
  await expect.poll(()=>page.evaluate(()=>animations)).toEqual([{frames:[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],options:{duration:75,easing:'ease-out'}}]);
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await ready(page);
  await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('aside')).toBeVisible();
  expect(await page.evaluate(()=>animations)).toEqual([]);
});

for (const storage of ['local','session','indexeddb']) test(`${storage} State restores and persists with the optional module`, async ({page}) => {
  const key='module.'+storage, names=requests(page);
  const body=manifest({count:0},{types:{count:'int'},persisted:{count:{storage,key,version:1}}})
    +button({type:'increment',target:'count',value:1})+'<output data-aml-bind="count"></output>';
  await serve(page,body);await page.goto('/browser-module');await ready(page);
  await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('output')).toHaveText('1');
  // IndexedDB writes are asynchronous; wait for their transaction before reload.
  await expect.poll(()=>page.evaluate(async ({storage,key})=>{
    if(storage!=='indexeddb')return JSON.parse((storage==='local'?localStorage:sessionStorage).getItem(key) || 'null')?.value;
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('phpaml-engine',1);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    try{return await new Promise((resolve,reject)=>{const request=db.transaction('state').objectStore('state').get(key);request.onsuccess=()=>resolve(JSON.parse(request.result || 'null')?.value);request.onerror=()=>reject(request.error);});}finally{db.close();}
  },{storage,key})).toBe(1);
  expectModules(names,['browser']);
  await page.reload();await ready(page);await expect(page.locator('output')).toHaveText('1');
  await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('output')).toHaveText('2');
});

test('persisted contexts restore before their first render', async ({page}) => {
  const names=requests(page);
  await page.addInitScript(()=>localStorage.setItem('module.theme','"dark"'));
  await serve(page,manifest({theme:'light'})+`<section data-aml-context-provider='${attribute({name:'theme',state:'theme',persist:true,storageKey:'module.theme'})}'><output data-aml-context-bind="theme"></output></section>`);
  await page.goto('/browser-module');await ready(page);
  await expect(page.locator('output')).toHaveText('dark');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  expectModules(names,['browser']);
});

test('draft restoration and remote validation preserve form behavior', async ({page}) => {
  const names=requests(page);
  const validation={request:{method:'GET',url:'/module-validate',data:{name:{$state:'name'}}},message:'Unavailable',debounce:0};
  const body=manifest({name:''})+`<form data-aml-form-preserve="module-draft"><input aria-label="Name" name="name" data-aml-model="name" data-aml-validate-api='${attribute(validation)}'></form>`;
  await page.route('**/module-validate?*',route=>route.fulfill({json:{valid:new URL(route.request().url()).searchParams.get('name')==='André',message:'Unavailable'}}));
  await serve(page,body);await page.goto('/browser-module');await ready(page);
  const input=page.getByRole('textbox',{name:'Name'});
  await input.fill('Taken');await expect(input).toHaveAttribute('aria-invalid','true');
  await input.fill('André');await expect(input).toHaveAttribute('aria-invalid','false');
  expectModules(names,['browser']);
  await page.reload();await ready(page);await expect(input).toHaveValue('André');
  await expect(input).toHaveAttribute('aria-invalid','false');
});

test('hidden template capabilities are prepared before dynamic content appears', async ({page}) => {
  const names=requests(page);
  await serve(page,counter+`<template><template>${capabilities.files}${capabilities.animations}<form data-aml-form-preserve="later"></form></template></template>`);
  await page.goto('/browser-module');await ready(page);
  expectModules(names,['files','browser','animations']);
});

if(runtimeMode==='modules') {
  for(const [name,body] of Object.entries(capabilities)) test(`${name} loading failure preserves the current page during navigation`,async({page})=>{
    await serve(page,counter);await serve(page,body,'/next-module');
    await page.goto('/browser-module');await ready(page);
    await page.route(`**/${name}-*.js`,route=>route.abort());
    await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('output')).toHaveText('1');
    const error=await page.evaluate(()=>AMLEngine.navigate('/next-module').then(()=>null,error=>({code:error.code,module:error.module})));
    expect(error).toEqual({code:'AML_MODULE_LOAD',module:name});
    expect(new URL(page.url()).pathname).toBe('/browser-module');
    await page.getByRole('button',{name:'Run'}).click();await expect(page.locator('output')).toHaveText('2');
  });

  for(const name of ['files','browser']) test(`unmount cancels an event waiting for ${name}`,async({page})=>{
    await serve(page,counter);await page.goto('/browser-module');await ready(page);
    let release,requested=false;const gate=new Promise(resolve=>{release=resolve;});
    await page.route(`**/${name}-*.js`,async route=>{requested=true;await gate;await route.continue();});
    await page.evaluate(action=>{
      window.completed=0;window.actionErrors=[];
      const root=document.querySelector('main');
      for(const event of ['aml:api-success','aml:file-success'])root.addEventListener(event,()=>completed++);
      root.addEventListener('aml:error',({detail})=>actionErrors.push(detail.error.message));
      const trigger=root.querySelector('button');trigger.dataset.amlClientClick=JSON.stringify(action);trigger.click();
      AMLEngine.unmount(root);
    },name==='files'?file:api);
    await expect.poll(()=>requested).toBe(true);release();
    // Remount awaits the same module promise, so all cancelled continuations settle first.
    await page.evaluate(()=>AMLEngine.mount(document));await ready(page);
    expect(await page.evaluate(()=>({completed,errors:actionErrors}))).toEqual({completed:0,errors:[]});
    await expect(page.locator('output')).toHaveText('0');
  });
}
