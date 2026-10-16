import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect,test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const runtime= browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.9.min.js'),'utf8'));
const parser=readFileSync(assetFile('engine-eval-0.1.0-beta.9.min.js'),'utf8');
for(const family of ['common-functions','language-completion','web-functions','unicode-display','dynamic-classes','frontend-program']){
  const fixture=viewFile(`tests/${family}.php`);
  const samples=JSON.parse(execFileSync(process.env.PHP_BINARY||'php',[fixture,'--json'],{encoding:'utf8',maxBuffer:128*1024*1024})).filter((s)=>s.browser);
  for(const sample of samples)test(`${family}: ${sample.name}`,async({page})=>{
    const failures=[],logs=[];page.on('pageerror',(e)=>failures.push(e.message));page.on('console',(e)=>{if(e.type()==='log')logs.push(e.text());});
    await page.route('**/frontend-additions',(route)=>route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"},body:`<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${sample.html}</main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.9.min.js"></script>`}));
    await page.route('**/engine-0.1.0-beta.9.min.js',(route)=>route.fulfill({body:runtime,contentType:'text/javascript'}));
    await page.route('**/engine-eval-0.1.0-beta.9.min.js',(route)=>route.fulfill({body:parser,contentType:'text/javascript'}));
    await page.addInitScript(()=>{window.failures=[];window.warnings=[];window.csp=[];document.addEventListener('aml:error',({detail:{error}})=>window.failures.push({name:error.name,message:error.message,code:error.code}),true);document.addEventListener('aml:warning',(e)=>window.warnings.push(e.detail),true);document.addEventListener('securitypolicyviolation',(e)=>window.csp.push(e.blockedURI));});
    await page.goto('/frontend-additions');await expect.poll(()=>page.evaluate(()=>!!window.AMLEngine?.mount)).toBe(true);
    const root=page.locator('[data-aml-client]').first();
    const expected=structuredClone(sample.error?sample.initial:sample.expected);
    if(family==='unicode-display'&&sample.method==='intlFormats'){
      // ICU/CLDR versions use either ¥ or ￥ in Japanese. Only this currency
      // symbol follows browser Intl; amounts, grouping and rounding stay PHP-derived.
      const yen=await page.evaluate(()=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY'}).formatToParts(1).find(part=>part.type==='currency').value);
      expected.result=expected.result.map(row=>row.map(value=>typeof value==='string'?value.replaceAll('\uFFE5',yen):value));
    }
    await expect(root).toHaveAttribute('data-aml-engine-mounted','true');
    if(family==='unicode-display'){await expect(root).toContainText('é 👨‍👩‍👧‍👦');await expect(root).toContainText('é 👨‍👩‍👧‍👦');}
    await page.getByRole('button',{name:sample.button,exact:true}).click();
    if(sample.error)await expect.poll(()=>page.evaluate(()=>window.failures.length)).toBe(1);
    await expect.poll(()=>root.evaluate((el)=>window.AMLEngine.inspect(el))).toEqual(expected);
    if(sample.error)expect(await page.evaluate(()=>window.failures[0].name)).toBe(sample.error.engineName||sample.error.name);else expect(await page.evaluate(()=>window.failures)).toEqual([]);
    if(family==='unicode-display'&&sample.method==='composition'){await expect(root).toContainText('🇨🇦 👍🏽');await expect(root).toContainText('🇨🇦 👍🏽 é');}
    expect(logs.join('')).toBe(sample.output);expect(await page.evaluate(()=>window.warnings.length)).toBe(sample.warnings.length);expect(await page.evaluate(()=>window.csp)).toEqual([]);expect(failures).toEqual([]);
  });
}
