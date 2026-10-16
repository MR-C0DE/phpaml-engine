// Requires safaridriver -p 8121 and the AML Tasks example on port 8120.
// Safari's "Allow remote automation" must be enabled by the machine's owner.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {engineTag, runtimeMode} from './browser/test-environment.mjs';

const driver = process.env.WEBDRIVER_URL || 'http://127.0.0.1:8121';
const application = process.env.AML_TASKS_URL || 'http://127.0.0.1:8120';
const elementKey = 'element-6066-11e4-a52e-4f735466cecf';
const fixtures = new Map();
for (const family of ['reservation-program', 'compatibility-program']) {
  const file = fileURLToPath(new URL(`../../phpaml-view/tests/${family}.php`, import.meta.url));
  fixtures.set(family, JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [file, '--json'], {encoding:'utf8', maxBuffer:32*1024*1024})));
}
const publicAssets = new Set(JSON.parse(readFileSync(new URL('../assets/public-assets.json', import.meta.url), 'utf8')));
const favicon = readFileSync(new URL('./favicon.ico', import.meta.url));
const monitor = `window.testErrors=[];window.testCsp=[];window.testOutput=[];window.addEventListener('error',e=>testErrors.push(e.message));for(const name of ['aml:error','aml:render-error'])document.addEventListener(name,e=>testErrors.push(e.detail.error.message),true);document.addEventListener('securitypolicyviolation',e=>testCsp.push(e.blockedURI));const log=console.log;console.log=(...args)=>{testOutput.push(args.join(' '));log.apply(console,args)};`;
const server = createServer((request,response) => {
  if (request.url === '/favicon.ico') {response.writeHead(200, {'Content-Type':'image/x-icon'}); response.end(favicon); return;}
  const asset = request.url.startsWith('/_aml/') ? request.url.slice(6) : null;
  if (asset && publicAssets.has(asset)) {
    response.writeHead(200, {'Content-Type':asset.endsWith('.map') ? 'application/json' : 'text/javascript; charset=utf-8'});
    response.end(readFileSync(new URL('../assets/' + asset, import.meta.url))); return;
  }
  if (request.url === '/monitor.js') {
    response.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
    response.end(monitor); return;
  }
  const [family, variant] = request.url.slice(1).split('/');
  const sample = fixtures.get(family)?.find(sample => sample.variant === variant);
  if (!sample) {response.writeHead(404); response.end(); return;}
  response.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"});
  response.end(`<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><script src="/monitor.js"></script><main data-aml-client>${sample.html}</main>${engineTag}`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
async function request(method, path, body) {
  const response = await fetch(driver+path, {method, headers:{'Content-Type':'application/json'}, ...(body === undefined ? {} : {body:JSON.stringify(body)}), signal:AbortSignal.timeout(45_000)}).catch(error=>{throw new Error(`${method} ${path}: ${error.message}`,{cause:error});});
  const payload = await response.json(), value = payload.value;
  if (!response.ok || value?.error) throw new Error(`${method} ${path}: ${JSON.stringify(payload)}`);
  return value;
}
let session = process.env.SAFARI_SESSION_ID;
const command = (path, body = {}) => request('POST', `/session/${session}${path}`, body);
const execute = (fn, ...args) => command('/execute/sync', {script:`return (${fn})(...arguments)`, args});
const wait = async (fn, expected, ...args) => {
  let actual;
  const deadline = Date.now()+15000;
  while (Date.now()<deadline) {
    actual = await execute(fn, ...args);
    if (JSON.stringify(actual) === JSON.stringify(expected)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.error('Safari assertion context',await execute(()=>({url:location.href,ready:!!document.querySelector('[data-aml-engine-mounted="true"]'),inputs:[...document.querySelectorAll('input')].map(input=>({name:input.name,value:input.value,invalid:input.getAttribute('aria-invalid')})),state:window.AMLEngine?.inspect(document.querySelector('[data-aml-client]')),errors:window.testErrors,events:window.testEvents})));
  assert.deepEqual(actual, expected);
};
const element = selector => command('/element', {using:'css selector', value:selector});
const click = async selector => {
  const node = await element(selector);
  await command('/execute/async', {script:"const node=arguments[0],done=arguments[arguments.length-1];node.scrollIntoView({behavior:'instant',block:'center',inline:'center'});requestAnimationFrame(()=>requestAnimationFrame(()=>done()));",args:[node]});
  try { return await command(`/element/${node[elementKey]}/click`); }
  catch (error) {
    console.error('Safari click context', await execute(node => ({html:node.outerHTML,rect:node.getBoundingClientRect().toJSON(),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,viewport:[innerWidth,innerHeight]}),node));
    throw error;
  }
};
const clickText = async (selector, text) => {
  const found = await execute((selector,text) => [...document.querySelectorAll(selector)].find(node=>node.textContent.trim()===text), selector,text);
  assert.ok(found, `Missing ${selector}: ${text}`);
  await command(`/element/${found[elementKey]}/click`);
};
const fill = async (selector, text) => {
  const id = (await element(selector))[elementKey];
  await command(`/element/${id}/clear`);
  await command(`/element/${id}/value`, {text});
};
const text = selector => execute(selector=>document.querySelector(selector)?.textContent, selector);
const expectText = (selector, value) => wait(selector=>document.querySelector(selector)?.textContent, value, selector);
const visit = async url => {
  await command('/url', {url});
  await wait(()=>!!document.querySelector('[data-aml-engine-mounted="true"]'), true);
  assert.equal(await execute(()=>!!document.querySelector('script[data-aml-engine][type="module"]')),runtimeMode==='modules',`Expected the ${runtimeMode} runtime`);
};
let passed = 0;
try {
  if (!session) {
    const created = await request('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
    session = created.sessionId; console.log('Safari',created.capabilities.browserVersion);
  }
  await command('/timeouts', {implicit:0, script:15000, pageLoad:30000});
  await command('/window/rect', {width:1280,height:900});
  console.log('Safari session ready; checking task application.');
  await visit(`${application}/tasks?lang=en`);
  // Only the dedicated Safari automation session's local demo data is reset.
  await execute(()=>localStorage.clear()); await command('/refresh');
  await wait(()=>!!document.querySelector('[data-aml-engine-mounted="true"]'),true);
  await execute(()=>{window.testErrors=[];window.testEvents=[];for(const name of ['aml:error','aml:render-error'])document.addEventListener(name,event=>testErrors.push(event.detail.error.message),true);for(const name of ['input','change','submit','click','invalid'])document.addEventListener(name,event=>testEvents.push({type:name,value:event.target.value,target:event.target.tagName}),true);});
  await wait(()=>document.querySelectorAll('.task-card').length,3);
  await fill('[name=newTask]','');
  await click('button[type=submit]');
  await wait(()=>document.querySelector('[name=newTask]').getAttribute('aria-invalid'),'true');
  for (const count of [4,5]) {
    await fill('[name=newTask]','Vérifier André'); await click('button[type=submit]');
    await wait(()=>document.querySelectorAll('.task-card').length,count);
  }
  await execute(()=>window.sameDocument=true);
  await click('nav a[href="/"]');
  await wait(()=>[...document.querySelectorAll('.metric')].map(node=>node.textContent),['5','1','4']);
  assert.equal(await execute(()=>window.sameDocument),true);
  await command('/back'); await wait(()=>document.querySelectorAll('.task-card').length,5);
  await command('/refresh'); await wait(()=>document.querySelectorAll('.task-card').length,5);
  console.log('PASS Safari task validation, duplicate titles, shared State, history and persistence'); passed++;

  await visit(`${application}/settings?lang=en`);
  await clickText('[role=tab]','Language'); await clickText('a','Français');
  await wait(()=>document.documentElement.lang,'fr');
  await click('header [data-aml-theme-choice=dark]');
  await click('nav a[href="/tasks"]'); await expectText('h1','Tâches');
  await click('nav a[href="/settings"]'); await expectText('h1','Paramètres');
  await command('/refresh'); await expectText('h1','Paramètres');
  assert.equal(await execute(()=>document.documentElement.dataset.theme),'dark');
  console.log('PASS Safari locale and theme navigation'); passed++;

  for (const [family,samples] of fixtures) for (const sample of samples) {
    await visit(`${origin}/${family}/${sample.variant}`);
    const reservation = family === 'reservation-program';
    const button = reservation ? 'Préparer la réservation' : 'Préparer le catalogue';
    const suffix = reservation ? 'reservation' : 'catalogue';
    await clickText('button',button); await clickText('button',button);
    await expectText(`#resume-${suffix}`,sample.expected.message);
    await expectText(`#export-${suffix}`,sample.expected.export);
    if (reservation || sample.variant === 'valid') await expectText(`#erreur-${suffix}`,sample.expected.erreur);
    else assert.ok((await text(`#erreur-${suffix}`)).startsWith(sample.expected.erreur.split(' : ')[0]));
    assert.equal(await execute(()=>testOutput.join('')),sample.output);
    if (sample.variant === 'valid') {
      const selector = reservation ? 'input[name=email]' : '#source-catalogue';
      await fill(selector,reservation ? 'invalide' : '{'); await clickText('button',button);
      assert.ok((await text(`#erreur-${suffix}`)).length > 0);
      await expectText(`#resume-${suffix}`,sample.expected.message);
      await fill(selector,reservation ? sample.initial.email : sample.initial.source); await clickText('button',button);
      await expectText(`#erreur-${suffix}`,'');
    }
    assert.deepEqual(await execute(()=>testErrors),[]);
    assert.deepEqual(await execute(()=>testCsp),[]);
    console.log(`PASS Safari ${family}: ${sample.variant}`); passed++;
  }
  console.log(`${passed} Safari application scenarios passed (${runtimeMode} runtime).`);
} finally {
  if (session) await request('DELETE',`/session/${session}`).catch(error=>console.error(error.message));
  await new Promise(resolve=>server.close(resolve));
}
