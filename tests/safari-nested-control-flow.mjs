// Actual Safari via WebDriver; WebKit in Playwright is tested separately.
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {assetFile, viewFile, engineVersion} from './browser/test-environment.mjs';

const sample = JSON.parse(process.env.PHPAML_NESTED_SAMPLES
  ? readFileSync(process.env.PHPAML_NESTED_SAMPLES, 'utf8')
  : execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/nested-control-flow.php'), '--json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000}));
assert.deepEqual(sample.diagnostics, []);
assert.ok(sample.cases.length > 0);
const assets = new Set(JSON.parse(readFileSync(assetFile('public-assets.json'), 'utf8')));
const attribute = value => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const monitor = `window.nestedErrors=[];window.browserErrors=[];document.addEventListener('aml:error',({detail:{error}})=>nestedErrors.push({code:error.code,message:error.message,source:error.source,limitKind:error.limitKind}),true);addEventListener('error',e=>browserErrors.push(e.message));document.addEventListener('securitypolicyviolation',e=>browserErrors.push('CSP: '+e.blockedURI));`;
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') {res.writeHead(204); return res.end();}
  if (path === '/monitor.js') {res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(monitor);}
  const asset = path.startsWith('/_aml/') ? path.slice(6) : null;
  if (asset && assets.has(asset)) {res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(readFileSync(assetFile(asset)));}
  const [, runtime, index] = path.split('/');
  const entry = sample.cases[index];
  if (!['full', 'modules'].includes(runtime) || !entry) {res.writeHead(404); return res.end();}
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'"});
  res.end(`<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><script src="/monitor.js"></script><main data-aml-client>
    <template data-aml-state="${attribute(entry.initial)}" data-aml-state-config="${attribute(entry.config)}"></template>
    <button data-aml-client-click="${attribute(entry.action)}">Run</button>
    <button data-aml-client-click="${attribute(entry.recovery)}">Recover</button>
    <output data-aml-bind="counter"></output></main>
    <script ${runtime === 'modules' ? 'type="module"' : 'defer'} data-aml-engine src="/_aml/${runtime === 'modules' ? `modules-${engineVersion}.min/engine.js` : `engine-${engineVersion}.min.js`}"></script>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const driver = process.env.WEBDRIVER_URL || 'http://127.0.0.1:8121';
const request = async (method, path, body) => {
  const response = await fetch(driver + path, {method, headers: {'Content-Type': 'application/json'}, ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(30000)});
  const {value} = await response.json();
  if (!response.ok || value?.error) throw new Error(JSON.stringify(value));
  return value;
};
let session, current;
const results = [];
try {
  const started = await request('POST', '/session', {capabilities: {alwaysMatch: {browserName: 'safari'}}});
  session = started.sessionId;
  const command = (path, body = {}) => request('POST', `/session/${session}${path}`, body);
  const execute = (fn, ...args) => command('/execute/sync', {script: `return (${fn})(...arguments)`, args});
  const wait = async (fn, expected, ...args) => {
    let actual;
    for (let attempt = 0; attempt < 100; attempt++) {
      actual = await execute(fn, ...args);
      if (isDeepStrictEqual(actual, expected)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.deepEqual(actual, expected);
  };
  const click = async label => {
    const node = await execute(label => [...document.querySelectorAll('button')].find(node => node.textContent === label), label);
    await command(`/element/${node['element-6066-11e4-a52e-4f735466cecf']}/click`);
  };
  for (const runtime of ['full', 'modules']) {
    for (const [index, entry] of sample.cases.entries()) {
      current = {browser: 'Safari', version: started.capabilities.browserVersion, runtime, name: entry.name};
      assert.ok(entry.viewPass, JSON.stringify(entry.viewError));
      await command('/url', {url: `http://127.0.0.1:${server.address().port}/${runtime}/${index}`});
      await wait(() => document.querySelector('main').getAttribute('data-aml-engine-mounted'), 'true');
      assert.equal(await execute(() => document.querySelector('[data-aml-engine]').type === 'module'), runtime === 'modules');
      await click('Run');
      if (entry.limit) {
        await wait(() => nestedErrors.length, 1);
        const error = await execute(() => nestedErrors[0]);
        assert.equal(error.code, 'PHP_LOOP_LIMIT');
        assert.equal(error.limitKind, entry.limitKind);
        assert.ok(error.message.includes(entry.limitMessage));
        assert.ok(error.source.line > 0 && error.message.includes(`[PHP ${error.source.file}:${error.source.line}]`));
      }
      await wait(() => AMLEngine.inspect(document.querySelector('main')), entry.limit ? entry.initial : entry.expected);
      await wait(() => document.querySelector('output').textContent, String(entry.limit ? 0 : entry.expected.counter));
      await click('Recover');
      await wait(() => document.querySelector('output').textContent, '42');
      assert.equal(await execute(() => nestedErrors.length), entry.limit ? 1 : 0);
      assert.deepEqual(await execute(() => browserErrors), []);
      results.push({...current, status: 'passed'});
      console.log(`PASS Safari ${current.version} ${runtime}: ${entry.name}`);
      current = null;
    }
  }
} catch (error) {
  results.push({...current, status: 'failed', error: error.message});
  throw error;
} finally {
  const report = process.env.PHPAML_SAFARI_REPORT || 'test-results/nested-control-final/safari.json';
  mkdirSync(dirname(report), {recursive: true});
  writeFileSync(report, JSON.stringify({results}, null, 2) + '\n');
  try {if (session) await request('DELETE', `/session/${session}`);}
  finally {await new Promise(resolve => server.close(resolve));}
}
