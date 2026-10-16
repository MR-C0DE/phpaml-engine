import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fixture = viewFile('tests/eval.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.9.min.js'), 'utf8'));
const parser = readFileSync(assetFile('engine-eval-0.1.0-beta.9.min.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const html = (sample) => `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="/favicon.ico"></head><body><main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button><output data-aml-bind="count"></output></main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.9.min.js"></script></body></html>`;
const mount = async (page, sample, parserHandler, nonce = null) => {
  await page.route('**/eval-test', (route) => route.fulfill({body: nonce ? html(sample).replace('<script defer', `<script nonce="${nonce}" defer`) : html(sample), contentType: 'text/html', headers: {'Content-Security-Policy': `default-src 'none'; img-src 'self'; script-src ${nonce ? "'nonce-" + nonce + "'" : "'self'"}; style-src 'unsafe-inline'`}}));
  await page.route('**/engine-0.1.0-beta.9.min.js', (route) => route.fulfill({body: runtime, contentType: 'text/javascript'}));
  await page.route('**/engine-eval-0.1.0-beta.9.min.js', parserHandler);
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => window.cspViolations.push(event.blockedURI));
    window.failures = [];
    document.addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, message: error.message}), true);
  });
  await page.goto('/eval-test');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
};
const state = (page) => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')));
for (const name of ['literal', 'literalError', 'literalFunctions', 'declarations', 'referenceFrame', 'skipped', 'locals', 'state', 'closures', 'functions', 'references', 'nested', 'parse', 'strict', 'throw', 'console', 'rollback', 'precedence', 'nested-arrows']) test(`eval under strict CSP: ${name}`, async ({page}) => {
  const sample = samples.find((sample) => sample.name === name), logs = []; let requests = 0;
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await mount(page, sample, (route) => {requests++; return route.fulfill({body: parser, contentType: 'text/javascript'});});
  expect(requests).toBe(0);
  await page.getByRole('button', {name: 'Run'}).click();
  await expect.poll(() => state(page)).toEqual(sample.error ? sample.initial : sample.expected);
  if (sample.error) await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  expect(logs.join('')).toBe(sample.output);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  expect(requests).toBe(['literal', 'literalError', 'literalFunctions', 'declarations', 'referenceFrame', 'skipped'].includes(name) ? 0 : 1);
  if (name === 'state') {
    await page.getByRole('button', {name: 'Run'}).click();
    await expect.poll(async () => (await state(page)).count).toBe(10);
    expect(requests).toBe(1);
  }
});
test('parser failure happens before mutations and can be retried', async ({page}) => {
  const sample = structuredClone(samples.find((sample) => sample.name === 'state')); let requests = 0;
  // Put a State write before eval to ensure preloading precedes the transaction.
  sample.action.action.actions.unshift({type: 'set', target: 'count', value: 20});
  await mount(page, sample, (route) => ++requests === 1 ? route.abort() : route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.getByRole('button', {name: 'Run'}).click();
  await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  expect(await state(page)).toEqual(sample.initial);
  await page.getByRole('button', {name: 'Run'}).click();
  await expect.poll(async () => (await state(page)).count).toBe(25);
  expect(requests).toBe(2);
});
test('dynamic eval results render as escaped text', async ({page}) => {
  const sample = structuredClone(samples.find((sample) => sample.name === 'state'));
  sample.initial.code = 'return "<img src=x onerror=alert(1)>";';
  await mount(page, sample, (route) => route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.evaluate(() => {const output = document.createElement('p'); output.dataset.amlBind = 'result.0'; document.querySelector('main').append(output);});
  await page.getByRole('button', {name: 'Run'}).click();
  await expect(page.locator('p')).toHaveText('<img src=x onerror=alert(1)>');
  expect(await page.locator('main img').count()).toBe(0);
});

test('the optional parser inherits the main script CSP nonce', async ({page}) => {
  const sample = samples.find((sample) => sample.name === 'state');
  await mount(page, sample, (route) => route.fulfill({body: parser, contentType: 'text/javascript'}), 'dGVzdC1ub25jZQ==');
  await page.getByRole('button', {name: 'Run'}).click();
  await expect.poll(() => state(page)).toEqual(sample.expected);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
});
test('the complete example edits dynamic code, displays errors and keeps fixed eval available', async ({page}) => {
  const markup = execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--example'], {encoding: 'utf8'});
  await page.route('**/eval-example', (route) => route.fulfill({body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${markup}</main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.9.min.js"></script>`, contentType: 'text/html'}));
  await page.route('**/engine-0.1.0-beta.9.min.js', (route) => route.fulfill({body: runtime, contentType: 'text/javascript'}));
  await page.route('**/engine-eval-0.1.0-beta.9.min.js', (route) => route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.goto('/eval-example');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.getByRole('button', {name: 'Exécuter', exact: true}).click();
  await expect(page.locator('#message')).toHaveText('Bonjour André : 1');
  await page.getByLabel('Code PHP').fill('return ( ;');
  await page.getByRole('button', {name: 'Exécuter', exact: true}).click();
  await expect(page.locator('#message')).toContainText('Parse Error');
  await page.getByRole('button', {name: 'Ajouter avec du code fixe'}).click();
  await expect(page.locator('#compteur')).toHaveText('Compteur : 11');
});
