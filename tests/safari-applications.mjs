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
fixtures.set('styles', [{variant: 'default', ...JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [
  fileURLToPath(new URL('../../phpaml-view/tests/styles.php', import.meta.url)), '--json',
], {encoding: 'utf8'}))}]);
fixtures.set('reactive-styles', [{variant: 'default', ...JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [
  fileURLToPath(new URL('../../phpaml-view/tests/reactive-styles.php', import.meta.url)), '--json',
], {encoding: 'utf8'}))}]);
fixtures.set('style-conditions', [{variant: 'default', ...JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [
  fileURLToPath(new URL('../../phpaml-view/tests/style-conditions.php', import.meta.url)), '--json',
], {encoding: 'utf8'}))}]);
const stylesheetFixtures = new Map(['imported', 'removed'].map(variant => [variant, {
  html: execFileSync(process.env.PHP_BINARY || 'php', [
    fileURLToPath(new URL('../../phpaml-view/tests/stylesheet-imports.php', import.meta.url)),
    '--html', ...(variant === 'removed' ? ['--without-import'] : []),
  ], {encoding: 'utf8'}),
}]));
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
  const sample = family === 'stylesheet-imports' ? stylesheetFixtures.get(variant)
    : fixtures.get(family)?.find(sample => sample.variant === variant);
  if (!sample) {response.writeHead(404); response.end(); return;}
  response.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; img-src 'self'; frame-src 'self'; script-src 'self'; style-src 'unsafe-inline'"});
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
  console.error('Safari assertion context',await execute(()=>({url:location.href,viewport:[innerWidth,innerHeight],outer:[outerWidth,outerHeight],ready:!!document.querySelector('[data-aml-engine-mounted="true"]'),inputs:[...document.querySelectorAll('input')].map(input=>({name:input.name,value:input.value,invalid:input.getAttribute('aria-invalid')})),state:window.AMLEngine?.inspect(document.querySelector('[data-aml-client]')),errors:window.testErrors,events:window.testEvents})));
  assert.deepEqual(actual, expected);
};
const element = selector => command('/element', {using:'css selector', value:selector});
const click = async selector => {
  const node = await element(selector);
  // Safari may suspend animation frames in an automation window that is not
  // foreground. Instant scrolling plus a layout read needs no frame callback;
  // the following WebDriver click still performs the native hit test.
  await execute(node => {
    const visible = node.matches('option') ? node.closest('select') : node;
    visible.scrollIntoView({behavior:'instant', block:'center', inline:'center'});
    return visible.getBoundingClientRect().toJSON();
  }, node);
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
// Native Safari can inherit fullscreen mode and ignore window/rect. A child
// browsing context gives responsive checks a real, deterministic CSS viewport
// without changing the user's Safari windows or the current application's State.
const inViewport = async (width, height, check) => {
  const frame = await execute((width, height) => {
    const frame = document.createElement('iframe');
    frame.style.cssText = `position:fixed;inset:0 auto auto 0;width:${width}px;height:${height}px;border:0;z-index:2147483647;background:white`;
    frame.src = location.href; document.body.append(frame); return frame;
  }, width, height);
  try {
    await command('/frame', {id:frame});
    await wait(() => !!document.querySelector('[data-aml-engine-mounted="true"]'), true);
    assert.equal(await execute(() => innerWidth), width);
    await check();
  } finally {
    await command('/frame', {id:null});
    await execute(node => node.remove(), frame);
  }
};
let passed = 0;
try {
  if (!session) {
    const created = await request('POST','/session',{capabilities:{alwaysMatch:{browserName:'safari'}}});
    session = created.sessionId; console.log('Safari',created.capabilities.browserVersion);
  }
  await command('/timeouts', {implicit:0, script:15000, pageLoad:30000});
  await command('/window/rect', {width:1280,height:900});
  for (const [variant, color] of [['imported', 'rgb(1, 2, 3)'], ['removed', 'rgb(0, 0, 0)'], ['imported', 'rgb(1, 2, 3)']]) {
    await visit(`${origin}/stylesheet-imports/${variant}`);
    await wait(() => getComputedStyle(document.querySelector('#css-probe')).color, color);
    assert.deepEqual(await execute(() => testErrors), []);
  }
  console.log('PASS Safari CSS import removal and restoration'); passed++;
  await visit(`${origin}/styles/default`);
  const styleOf = (selector, property) => execute((selector, property) => getComputedStyle(document.querySelector(selector))[property], selector, property);
  assert.equal(await styleOf('#direct', 'fontSize'), '24px');
  assert.equal(await styleOf('#named', 'lineHeight'), '42px');
  assert.equal(await styleOf('#first', 'color'), 'rgb(0, 0, 255)');
  assert.equal(await styleOf('#second', 'color'), 'rgb(255, 0, 0)');
  assert.equal(await styleOf('#home-title', 'color'), 'rgb(10, 20, 30)');
  assert.equal(await styleOf('#other-title', 'color'), 'rgb(100, 110, 120)');
  assert.equal(await styleOf('#plain', 'color'), 'rgb(0, 0, 0)');
  assert.equal(await styleOf('#home-container', 'alignItems'), 'flex-start');
  await click('#save');
  await expectText('#count', '1');
  await execute(() => document.querySelector('#save').scrollIntoView({block: 'center', behavior: 'instant'}));
  await command('/actions', {actions: [{type: 'pointer', id: 'styles-mouse', parameters: {pointerType: 'mouse'}, actions: [
    {type: 'pointerMove', duration: 0, origin: await element('#save'), x: 0, y: 0},
  ]}]});
  await wait(() => getComputedStyle(document.querySelector('#save')).backgroundColor, 'rgb(86, 50, 189)');
  assert.equal(await styleOf('#continue', 'backgroundColor'), 'rgb(112, 71, 235)');
  await click('#toggle');
  assert.equal(await styleOf('#conditional', 'color'), 'rgb(0, 128, 0)');
  await inViewport(500, 812, async () => {
    await wait(() => getComputedStyle(document.querySelector('#home-container')).paddingTop, '12px');
  });
  assert.deepEqual(await execute(() => testErrors), []);
  assert.deepEqual(await execute(() => testCsp), []);
  console.log('PASS Safari immutable styles, CSS modules, hover, media and conditional templates'); passed++;
  await visit(`${origin}/reactive-styles/default`);
  const reactiveSheets = await execute(() => document.querySelectorAll('style[data-aml-style]').length);
  await execute(() => { window.originalStyleNode = document.querySelector('#reactive-direct'); });
  await click('#change-style');
  await wait(() => getComputedStyle(document.querySelector('#reactive-direct')).fontSize, '32px');
  for (const id of ['reactive-direct', 'reactive-inline', 'reactive-named', 'reactive-mixed', 'reactive-map', 'reactive-helper', 'reactive-explicit', 'reactive-module', 'reactive-child', 'reactive-ref-map']) assert.equal(await styleOf('#' + id, 'color'), 'rgb(220, 38, 38)', id);
  for (const [id, size] of Object.entries({'reactive-direct':32, 'reactive-inline':33, 'reactive-named':32, 'reactive-mixed':32, 'reactive-alias':35, 'reactive-helper':34, 'reactive-closure':36, 'reactive-module':32, 'reactive-child':32, 'reactive-closure-map':37, 'reactive-arguments':32})) assert.equal(await styleOf('#' + id, 'fontSize'), `${size}px`, id);
  for (const id of ['reactive-template', 'reactive-php', 'reactive-legacy']) assert.equal(await styleOf('#' + id, 'width'), '32px');
  assert.equal(await styleOf('#reactive-snapshot', 'fontSize'), '31px');
  assert.equal(await styleOf('#reactive-static-closure', 'fontSize'), '25px');
  assert.equal(await styleOf('#reactive-concat', 'width'), '64px');
  assert.equal(await styleOf('#reactive-template', 'borderTopColor'), 'rgb(220, 38, 38)');
  assert.equal(await styleOf('#reactive-map', 'paddingTop'), '21px');
  for (const id of ['reactive-other', 'reactive-static']) assert.equal(await styleOf('#' + id, 'color'), 'rgb(112, 71, 235)');
  await execute(() => document.querySelector('#shared-a').scrollIntoView({block: 'center', behavior: 'instant'}));
  await command('/actions', {actions: [{type: 'pointer', id: 'reactive-style-mouse', parameters: {pointerType: 'mouse'}, actions: [
    {type: 'pointerMove', duration: 0, origin: await element('#shared-a'), x: 0, y: 0},
  ]}]});
  await wait(() => getComputedStyle(document.querySelector('#shared-a')).backgroundColor, 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#shared-b', 'backgroundColor'), 'rgb(220, 38, 38)');
  await inViewport(500, 812, async () => {
    await click('#change-style');
    await wait(() => getComputedStyle(document.querySelector('#shared-b')).paddingTop, '10px');
  });
  await click('#reveal-style');
  await wait(() => getComputedStyle(document.querySelector('#reactive-conditional')).fontSize, '32px');
  assert.equal(await styleOf('#reactive-conditional', 'color'), 'rgb(220, 38, 38)');
  await click('.counter-grow');
  await wait(() => [...document.querySelectorAll('.counter-text')].map(node => getComputedStyle(node).fontSize), ['22px', '20px']);
  assert.equal(await execute(() => window.originalStyleNode === document.querySelector('#reactive-direct')), true);
  assert.deepEqual(await execute(() => testErrors), []);
  await click('#invalid-style');
  await wait(() => testErrors.length > 0, true);
  assert.equal(await styleOf('#reactive-direct', 'color'), 'rgb(220, 38, 38)');
  await click('#recover-style');
  await wait(() => getComputedStyle(document.querySelector('#reactive-direct')).color, 'rgb(0, 128, 0)');
  assert.equal(await styleOf('#reactive-conditional', 'color'), 'rgb(0, 128, 0)');
  assert.equal(await execute(() => document.querySelectorAll('style[data-aml-style]').length), reactiveSheets);
  assert.deepEqual(await execute(() => testCsp), []);
  console.log('PASS Safari reactive Style forms, instance isolation, templates, media and error recovery'); passed++;
  await visit(`${origin}/style-conditions/default`);
  const conditionSheets = await execute(() => document.querySelectorAll('style[data-aml-style]').length);
  const pseudoStyle = (selector, pseudo, property) => execute((selector, pseudo, property) => getComputedStyle(document.querySelector(selector), pseudo)[property], selector, pseudo, property);
  const expectPlaceholder = async color => {
    const field = await element('#valid-state');
    await execute(node => node.blur(), field);
    const screenshot = () => request('GET', `/session/${session}/element/${field[elementKey]}/screenshot`);
    const actual = await screenshot();
    const reference = await execute(color => {
      const style = document.createElement('style');
      style.textContent = `#valid-state::placeholder {color:${color} !important}`;
      document.head.append(style); return style;
    }, color);
    try {
      assert.ok((await screenshot()) === actual, 'Placeholder must match the explicit color reference.');
      await execute(node => { node.textContent = '#valid-state::placeholder {color:black !important}'; }, reference);
      assert.ok((await screenshot()) !== actual, 'Placeholder pixels must change for a contrasting reference.');
    } finally { await execute(node => node.remove(), reference); }
  };
  await execute(() => { window.originalAnimated = document.querySelector('#animated'); });
  assert.equal(await styleOf('#supports-yes', 'color'), 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#supports-no', 'color'), 'rgb(0, 0, 0)');
  assert.equal(await styleOf('#media-range', 'color'), 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#container-text', 'fontSize'), '16px');
  assert.equal(await styleOf('#module-conditions', 'color'), 'rgb(1, 2, 3)');
  assert.equal(await pseudoStyle('#module-conditions', '::after', 'content'), '" Local"');
  assert.equal(await pseudoStyle('#pseudo-content', '::before', 'content'), '"Before "');
  assert.equal(await pseudoStyle('#pseudo-content', '::after', 'content'), '" After"');
  assert.equal(await pseudoStyle('#pseudo-content', '::before', 'color'), 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#first-item', 'fontWeight'), '700');
  assert.equal(await styleOf('#second-item', 'color'), 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#last-item', 'textDecorationLine'), 'underline');
  assert.equal(await styleOf('#check-state', 'outlineColor'), 'rgb(0, 0, 0)');
  await click('#check-state');
  assert.equal(await styleOf('#check-state', 'outlineColor'), 'rgb(112, 71, 235)');
  assert.equal(await styleOf('#valid-state', 'outlineColor'), 'rgb(255, 0, 0)');
  await expectPlaceholder('rgb(112, 71, 235)');
  await fill('#valid-state', 'Valid');
  assert.equal(await styleOf('#valid-state', 'outlineColor'), 'rgb(0, 128, 0)');
  await click('#focus-input');
  assert.equal(await styleOf('#focus-group', 'outlineColor'), 'rgb(0, 0, 255)');
  await wait(() => getComputedStyle(document.querySelector('#animated')).opacity, '0.6');
  assert.equal(await styleOf('#other-animated', 'opacity'), '0.9');
  const animationNames = await execute(() => ['#animated', '#other-animated'].map(selector => getComputedStyle(document.querySelector(selector)).animationName));
  assert.match(animationNames[0], /^aml-s-[a-f0-9]+-kf-pulse$/);
  assert.notEqual(animationNames[0], animationNames[1]);
  await click('#change-conditions');
  await wait(() => getComputedStyle(document.querySelector('#container-text')).fontSize, '28px');
  for (const selector of ['#supports-yes', '#container-text', '#media-range', '#second-item']) assert.equal(await styleOf(selector, 'color'), 'rgb(220, 38, 38)');
  for (const [selector, pseudo] of [['#pseudo-content', '::before'], ['#pseudo-content', '::after'], ['#nested', '::before']]) assert.equal(await pseudoStyle(selector, pseudo, 'color'), 'rgb(220, 38, 38)');
  await fill('#valid-state', '');
  await expectPlaceholder('rgb(220, 38, 38)');
  assert.equal(await styleOf('#check-state', 'outlineColor'), 'rgb(220, 38, 38)');
  await wait(() => getComputedStyle(document.querySelector('#animated')).opacity, '0.8');
  assert.equal(await styleOf('#other-animated', 'opacity'), '0.9');
  await click('#check-state');
  assert.equal(await styleOf('#check-state', 'outlineColor'), 'rgb(0, 0, 0)');
  await inViewport(500, 812, async () => {
    await click('#change-conditions');
    await wait(() => getComputedStyle(document.querySelector('#media-range')).color, 'rgb(0, 0, 0)');
    assert.equal(await styleOf('#module-conditions', 'color'), 'rgb(0, 0, 0)');
    assert.equal(await styleOf('#container-text', 'fontSize'), '28px');
    assert.deepEqual(await execute(() => testErrors), []);
  });
  await wait(() => getComputedStyle(document.querySelector('#media-range')).color, 'rgb(220, 38, 38)');
  assert.equal(await execute(() => document.querySelectorAll('style[data-aml-style]').length), conditionSheets);
  assert.equal(await execute(() => window.originalAnimated === document.querySelector('#animated')), true);
  assert.deepEqual(await execute(() => testErrors), []);
  assert.deepEqual(await execute(() => testCsp), []);
  console.log('PASS Safari supports, containers, range media, pseudo elements, form states and reactive keyframes'); passed++;
  await visit(`${application}/controls`);
  await wait(() => getComputedStyle(document.querySelector('#style-example')).paddingTop, '24px');
  await click('#style-change');
  await wait(() => getComputedStyle(document.querySelector('#style-greeting')).fontSize, '32px');
  assert.equal(await styleOf('#style-title', 'color'), 'rgb(8, 127, 91)');
  await click('#country option[value="FR"]');
  await expectText('#summary-country', 'Pays : FR');
  await click('#notifications');
  await expectText('#summary-notifications', 'Rappel désactivé');
  await click('[data-aml-calendar-day="2028-02-29"]');
  await expectText('#summary-date', 'Date : 2028-02-29');
  await command('/actions', {actions: [{type: 'key', id: 'calendar-keyboard', actions: [
    {type: 'keyDown', value: '\uE014'}, {type: 'keyUp', value: '\uE014'},
    {type: 'keyDown', value: '\uE007'}, {type: 'keyUp', value: '\uE007'},
  ]}]});
  await expectText('#summary-date', 'Date : 2028-03-01');
  await click('button[type=submit]');
  await expectText('#confirmation', 'Rendez-vous confirmé pour le 2028-03-01.');
  await click('[data-aml-calendar-move="1"]');
  assert.equal(await execute(() => document.activeElement?.dataset.amlCalendarMove), '1');
  await inViewport(375, 812, async () => {
    assert.equal(await execute(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
  await click('a[href="/settings"].button');
  await wait(() => !!document.querySelector('a[href="/controls"]'), true);
  await click('a[href="/controls"]');
  await wait(() => document.querySelector('#appointment')?.value, '2028-02-28');
  console.log('PASS Safari Picker, Toggle, Calendar, keyboard, forms, mobile and remount'); passed++;
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
  await wait(()=>document.documentElement.dataset.theme,'dark');
  await click('nav a[href="/tasks"]'); await expectText('h1','Tâches');
  await click('nav a[href="/settings"]'); await expectText('h1','Paramètres');
  await command('/refresh'); await expectText('h1','Paramètres');
  await wait(()=>!!document.querySelector('[data-aml-engine-mounted="true"]'),true);
  assert.equal(await execute(()=>document.documentElement.dataset.theme),'dark');
  console.log('PASS Safari locale and theme navigation'); passed++;

  for (const [family,samples] of fixtures) for (const sample of samples) {
    if (['styles', 'reactive-styles', 'style-conditions'].includes(family)) continue;
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
