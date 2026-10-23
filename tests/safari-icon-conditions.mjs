// Run against actual Safari, with a local safaridriver and Remote Automation enabled.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {assetFile, viewFile, engineVersion} from './browser/test-environment.mjs';

const fixtures = Object.fromEntries(['conditions', 'conditions-block', 'conditions-local'].map(name => [name,
  JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/icons.php'), '--' + name, '--json'], {encoding: 'utf8'})),
]));
const assets = new Set(JSON.parse(readFileSync(assetFile('public-assets.json'), 'utf8')));
const monitor = `window.conditionErrors=[];window.conditionCsp=[];for(const name of ['aml:error','aml:render-error'])document.addEventListener(name,e=>conditionErrors.push(e.detail.error.message),true);addEventListener('error',e=>conditionErrors.push(e.message));document.addEventListener('securitypolicyviolation',e=>conditionCsp.push(e.blockedURI));`;
let holdUser = false;
const pendingUser = [];
const releaseUser = () => { holdUser = false; pendingUser.splice(0).forEach(resolve => resolve()); };
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (path === '/monitor.js') { res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(monitor); }
  const asset = path.startsWith('/_aml/') ? path.slice(6) : null;
  if (asset && assets.has(asset)) { res.writeHead(200, {'Content-Type': 'text/javascript'}); return res.end(readFileSync(assetFile(asset))); }
  if (path.startsWith('/assets/phpaml/lucide/1.61.0/')) {
    const name = path.split('/').pop().replace(/\.json$/, '');
    if (name === 'user' && holdUser) await new Promise(resolve => pendingUser.push(resolve));
    const nodes = fixtures.conditions.catalog[name];
    res.writeHead(nodes ? 200 : 404, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
    return res.end(JSON.stringify(nodes ?? {}));
  }
  const [, runtime, variant, mode] = path.split('/');
  if (!['full', 'modules'].includes(runtime) || !fixtures[variant]) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'"});
  res.end(`<meta charset="utf-8"><link rel="icon" href="/favicon.ico"><script src="/monitor.js"></script><main data-aml-client>${fixtures[variant].html}</main>${mode === 'ssr' ? '' : `<script ${runtime === 'modules' ? 'type="module"' : 'defer'} data-aml-engine src="/_aml/${runtime === 'modules' ? `modules-${engineVersion}.min/engine.js` : `engine-${engineVersion}.min.js`}"></script>`}`);
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
      if (JSON.stringify(actual) === JSON.stringify(expected)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.deepEqual(actual, expected, `Safari assertion: ${fn} ${JSON.stringify(args)}`);
  };
  const icon = (selector, name) => wait(selector => document.querySelector(selector)?.getAttribute('data-aml-icon-name'), name, selector);
  const css = (selector, property, value) => wait((selector, property) => getComputedStyle(document.querySelector(selector))[property], value, selector, property);
  const click = async label => {
    const node = await execute(label => {
      const node = [...document.querySelectorAll('button')].find(n => n.textContent === label);
      node.scrollIntoView({block: 'center', behavior: 'instant'}); return node;
    }, label);
    await command(`/element/${node['element-6066-11e4-a52e-4f735466cecf']}/click`);
  };
  for (const runtime of ['full', 'modules']) {
    const open = async (variant = 'conditions', ssr = false) => {
      await command('/url', {url: `http://127.0.0.1:${server.address().port}/${runtime}/${variant}${ssr ? '/ssr' : ''}`});
      if (!ssr) {
        await wait(() => !!document.querySelector('[data-aml-engine-mounted="true"]'), true);
        assert.equal(await execute(() => document.querySelector('[data-aml-engine]').type === 'module'), runtime === 'modules');
      }
    };
    const pass = async name => {
      assert.deepEqual(await execute(() => conditionErrors), []);
      assert.deepEqual(await execute(() => conditionCsp), []);
      results.push({browser: 'Safari', version: started.capabilities.browserVersion, runtime, name, status: 'passed'});
      console.log(`PASS Safari ${started.capabilities.browserVersion} ${runtime}: ${name}`);
    };
    await open();
    for (const name of ['heart', 'user', 'settings', 'search', 'heart']) {
      for (const id of ['event-conditional-icon', 'ternary-conditional-icon', 'match-conditional-icon']) await icon('#' + id, name);
      await click('Step conditions');
    }
    await icon('#initial-branch-icon', 'heart');
    await pass('nested event conditions, ternary and match');

    for (const [variant, id, button] of [['conditions-block', 'closure-conditional-icon', 'Step conditions'], ['conditions-local', 'local-conditional-icon', 'Local step']]) {
      await open(variant);
      for (const [index, name] of ['heart', 'user', 'settings', 'search', 'heart'].entries()) {
        await icon('#' + id, name);
        if (variant === 'conditions-block') {
          await css('#' + id, 'width', index === 2 || index === 3 ? '32px' : '24px');
          await wait(() => document.querySelector('#closure-conditional-icon').getAttribute('aria-label'), index === 2 || index === 3 ? 'Advanced' : 'Basic');
          await icon('#static-closure-icon', 'heart');
        }
        await click(button);
      }
      await pass(variant);
    }

    await open();
    await css('#shown-conditional-icon', 'display', 'none');
    await click('Step conditions');
    await icon('#shown-conditional-icon', 'user');
    await click('Toggle visibility');
    await css('#shown-conditional-icon', 'display', 'grid');
    await click('Toggle visibility');
    await css('#shown-conditional-icon', 'display', 'none');
    await click('Step conditions');
    await click('Toggle visibility');
    await icon('#shown-conditional-icon', 'settings');
    await css('#shown-conditional-icon', 'display', 'grid');
    await pass('showWhen restores Style and the current icon');

    await open();
    await click('Step conditions');
    await click('Toggle visibility');
    await icon('#single-conditions svg', 'user');
    await pass('When binds newly revealed contents');

    await open();
    await icon('#nested-conditions svg', 'circle-check');
    await click('Toggle inner condition'); await click('Step conditions'); await click('Toggle visibility');
    await icon('#nested-conditions svg', 'user');
    await click('Toggle inner condition'); await icon('#nested-conditions svg', 'arrow-right');
    await click('Step conditions'); await click('Toggle inner condition');
    await icon('#nested-conditions svg', 'settings'); await css('#nested-conditions svg', 'width', '32px');
    await execute(() => {window.retainedIcon = document.querySelector('#nested-dynamic-icon');});
    await click('Step conditions'); await icon('#nested-conditions svg', 'search');
    assert.equal(await execute(() => window.retainedIcon === document.querySelector('#nested-dynamic-icon')), true);
    await pass('nested When and DOM identity');

    await open('conditions', true);
    await css('#shown-conditional-icon', 'display', 'none');
    await pass('showWhen hides SVG before Engine starts');

    await open(); holdUser = true;
    await click('Toggle visibility'); await click('Step conditions');
    for (let attempt = 0; pendingUser.length === 0 && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok(pendingUser.length > 0, 'Expected a delayed catalogue request');
    await click('Toggle visibility'); releaseUser();
    await icon('#event-conditional-icon', 'user'); await icon('#single-conditions svg', 'heart');
    await click('Step conditions'); await click('Toggle visibility');
    await icon('#single-conditions svg', 'settings');
    await pass('late catalogue response after branch removal');
  }
} finally {
  releaseUser();
  if (session) await request('DELETE', `/session/${session}`);
  await new Promise(resolve => server.close(resolve));
  mkdirSync('test-results/icon-conditions-fixed', {recursive: true});
  writeFileSync('test-results/icon-conditions-fixed/safari.json', JSON.stringify({results}, null, 2) + '\n');
}
