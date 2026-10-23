// Requires a local safaridriver with Remote Automation enabled.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {assetFile, viewFile, engineVersion} from './browser/test-environment.mjs';

const automatic = process.argv.includes('--automatic');
const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/component-inputs.php'), '--json', ...(automatic ? ['--automatic'] : [])], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
const assets = new Set(JSON.parse(readFileSync(assetFile('public-assets.json'), 'utf8')));
const monitor = `window.inputErrors=[];window.inputCsp=[];for(const name of ['aml:error','aml:render-error'])document.addEventListener(name,e=>inputErrors.push(e.detail.error.message),true);addEventListener('error',e=>inputErrors.push(e.message));document.addEventListener('securitypolicyviolation',e=>inputCsp.push(e.blockedURI));`;
const server = createServer((req, res) => {
  if (req.url === '/favicon.ico') {res.writeHead(204); return res.end();}
  if (req.url === '/monitor.js') {res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(monitor);}
  const asset = req.url.startsWith('/_aml/') ? req.url.slice(6) : null;
  if (asset && assets.has(asset)) {res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(readFileSync(assetFile(asset)));}
  if (!['/full', '/modules'].includes(req.url)) {res.writeHead(404); return res.end();}
  const modules = req.url === '/modules';
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"});
  res.end(`<meta charset="utf-8"><script src="/monitor.js"></script><main data-aml-client>${sample.html}</main><script ${modules ? 'type="module"' : 'defer'} data-aml-engine src="/_aml/${modules ? `modules-${engineVersion}.min/engine.js` : `engine-${engineVersion}.min.js`}"></script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const driver = process.env.WEBDRIVER_URL || 'http://127.0.0.1:8121';
const request = async (method, path, body) => {
  const response = await fetch(driver + path, {method, headers: {'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(30000)});
  const {value} = await response.json();
  if (!response.ok || value?.error) throw new Error(JSON.stringify(value));
  return value;
};
let session;
try {
  const started = await request('POST', '/session', {capabilities: {alwaysMatch: {browserName: 'safari'}}});
  session = started.sessionId;
  const command = (path, body = {}) => request('POST', `/session/${session}${path}`, body);
  const execute = (fn, ...args) => command('/execute/sync', {script: `return (${fn})(...arguments)`, args});
  const wait = async (fn, expected, ...args) => {
    let actual;
    for (let attempt = 0; attempt < 100; attempt++) {
      actual = await execute(fn, ...args);
      if (JSON.stringify(actual) === JSON.stringify(expected)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.deepEqual(actual, expected);
  };
  const text = (id, expected) => wait(id => document.querySelector(`[data-test="${id}"]`)?.textContent, expected, id);
  const click = async label => {
    const node = await execute(label => {
      const node = [...document.querySelectorAll('button')].find(n => n.textContent === label);
      node.scrollIntoView({block: 'center', behavior: 'instant'}); return node;
    }, label);
    await command(`/element/${node['element-6066-11e4-a52e-4f735466cecf']}/click`);
  };
  for (const runtime of ['full', 'modules']) {
    await command('/url', {url: `http://127.0.0.1:${server.address().port}/${runtime}`});
    await wait(() => !!document.querySelector('[data-aml-engine-mounted="true"]'), true);
    await click('card-set'); await text('parent', 'Modifié'); await text('card-preview', 'Modifié'); await text('other', 'André');
    await click('card-append'); await text('parent', 'Modifié!');
    await click('card-method'); await text('parent', 'Méthode');
    await click('card-reference'); await text('parent', 'Référence');
    await click('card-preview-set'); await text('parent', 'Petit-enfant');
    await click('Parent'); await text('card-preview', 'Parent');
    await click('host-set'); await text('host-preview', 'Modifié'); await text('parent', 'Parent');
    await click('literal-set'); await text('literal-preview', 'Modifié'); await text('default-preview', '');
    await click('default-preview-set'); await text('default', 'Petit-enfant');
    await click('Data'); await text('price-type', 'double');
    await click('Array reference'); await text('items', 'new,builtin');
    assert.deepEqual(await execute(() => inputErrors), []);
    await click('typed-invalid'); await text('typed', 'Typé');
    await text('typed-clicks', '0');
    await click('Readonly'); await text('parent', 'Parent');
    await wait(() => inputErrors.length, 2);
    const errors = await execute(() => inputErrors);
    assert.match(errors[0], /Carte::\$a/); assert.match(errors[1], /readonly/);
    assert.deepEqual(await execute(() => inputCsp), []);
    console.log(`PASS Safari ${started.capabilities.browserVersion}: component inputs (${runtime}, ${automatic ? 'automatic' : 'manual'} factories)`);
  }
} finally {
  if (session) await request('DELETE', `/session/${session}`);
  await new Promise(resolve => server.close(resolve));
}
