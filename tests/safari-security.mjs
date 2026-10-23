import assert from 'node:assert/strict';
import {startSecurityLab} from './security-lab/server.mjs';

const lab = await startSecurityLab({diagnostic: true});
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
    for (let i = 0; i < 100; i++) {
      actual = await execute(fn, ...args);
      if (JSON.stringify(actual) === JSON.stringify(expected)) return;
      await new Promise(done => setTimeout(done, 100));
    }
    assert.deepEqual(actual, expected);
  };
  const element = async selector => {
    const node = await command('/element', {using: 'css selector', value: selector});
    return node['element-6066-11e4-a52e-4f735466cecf'];
  };
  const click = async label => {
    const node = await execute(label => [...document.querySelectorAll('button,a')].find(node => node.textContent === label), label);
    await command(`/element/${node['element-6066-11e4-a52e-4f735466cecf']}/click`);
  };
  for (const runtime of ['full', 'modules']) {
    lab.received.length = 0;
    await command('/url', {url: `${lab.origin}/?runtime=${runtime}`});
    await wait(() => !!document.querySelector('[data-aml-engine-mounted="true"]'), true);
    const input = await element('#message');
    await command(`/element/${input}/clear`);
    const value = '<img src="/missing" onerror="window.labExecuted=true">';
    await command(`/element/${input}/value`, {text: value});
    await click('Enregistrer');
    await wait(() => document.querySelector('#result').textContent, value);
    assert.equal(await execute(() => window.labExecuted === true || !!document.querySelector('#result img')), false);
    await click('Tester le relais');
    await wait(() => document.querySelector('#error').textContent !== '', true);
    assert.equal(lab.received.some(entry => entry.path === '/capture'), false);
    await click('Navigation de test');
    await wait(() => !!document.querySelector('[data-aml-navigation-overlay="error"]'), true);
    assert.equal(lab.received.some(entry => entry.path === '/foreign-page'), false);
    assert.equal(await execute(() => !!document.querySelector('#foreign-content')), false);
    for (const [surface, value] of [
      ['link', 'javascript:window.labExecuted=true'], ['frame', 'javascript:parent.labExecuted=true'],
      ['document', '<script>parent.labExecuted=true</script>'],
      ['tag', 'img src=/missing onerror=window.labExecuted=true'], ['script', lab.foreign + '/code.js'],
    ]) {
      const url = `${lab.origin}/probe?runtime=${runtime}&surface=${surface}&value=${encodeURIComponent(value)}`;
      assert.equal((await fetch(url)).status, 422);
      await command('/url', {url});
      assert.equal(await execute(() => window.labExecuted === true), false);
    }
    await execute(() => sessionStorage.setItem('phpaml.form.lab-sensitive', JSON.stringify({draftName: 'André', secret: 'old-synthetic', token: 'old-synthetic', code: 'old-synthetic'})));
    await command('/url', {url: `${lab.origin}/production?runtime=${runtime}`});
    await wait(() => !!document.querySelector('[data-aml-engine-mounted="true"]'), true);
    assert.deepEqual(await execute(() => [document.querySelector('#draft-name').value, document.querySelector('#draft-secret').value, document.querySelector('#draft-token').value]), ['André', 'synthetic-secret', 'fresh-synthetic-token']);
    assert.deepEqual(await execute(() => JSON.parse(sessionStorage.getItem('phpaml.form.lab-sensitive'))), {draftName: 'André'});
    const draft = await element('#draft-name');
    await command(`/element/${draft}/clear`);
    await command(`/element/${draft}/value`, {text: 'Bonjour'});
    assert.deepEqual(await execute(() => JSON.parse(sessionStorage.getItem('phpaml.form.lab-sensitive'))), {draftName: 'Bonjour'});
    await click('Relais local');
    await wait(() => document.querySelector('#result').textContent, 'Données fictives');
    console.log(`PASS Safari ${started.capabilities.browserVersion}: security laboratory (${runtime})`);
  }
} finally {
  try { if (session) await request('DELETE', `/session/${session}`); }
  finally { await lab.close(); }
}
