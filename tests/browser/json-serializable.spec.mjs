import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fixture = viewFile('tests/json-serializable.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.10.min.js'), 'utf8'));
const parser = readFileSync(assetFile('engine-eval-0.1.0-beta.10.min.js'), 'utf8');
const normalize = (text) => text.replace(/(object\([^\n]*?\))#\d+/g, '$1').replace(/object\(class@anonymous.*?\)(?:#\d+)?/gs, 'object(anonymous)');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const sample of samples) test(`JsonSerializable: ${sample.method}`, async ({page}) => {
  const failures = [], logs = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await page.route('**/objects-test', (route) => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template>${sample.multiClick ? sample.multiClick.map((step) => `<button data-aml-client-click="${attribute(step.action)}">${step.label}</button>`).join('') : `<button data-aml-client-click="${attribute(sample.action)}">Run</button>`}<output data-aml-bind="counter"></output></main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.10.min.js"></script>`}));
  await page.route('**/engine-0.1.0-beta.10.min.js', (route) => route.fulfill({body: runtime, contentType: 'text/javascript'}));
  await page.route('**/engine-eval-0.1.0-beta.10.min.js', (route) => route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.addInitScript(() => {window.failures = []; window.warnings = []; document.addEventListener('aml:warning', (event) => window.warnings.push(event.detail), true); window.cspViolations = []; document.addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, message: error.message}), true); document.addEventListener('securitypolicyviolation', (event) => window.cspViolations.push(event.blockedURI));});
  await page.goto('/objects-test');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  if (sample.multiClick) {
    let failureCount = 0;
    for (const step of sample.multiClick) {
      await page.getByRole('button', {name: step.label, exact: true}).click();
      if (step.error) {await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(++failureCount); expect(await page.evaluate(() => window.failures.at(-1).name)).toBe(step.error);}
      await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(step.expected);
    }
    expect(await page.evaluate(() => window.cspViolations)).toEqual([]); expect(failures).toEqual([]); return;
  }
  await page.getByRole('button', {name: 'Run'}).click();
  if (sample.error || sample.invalidState) await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.error || sample.invalidState ? sample.initial : sample.expected);
  if (sample.error) expect(await page.evaluate(() => window.failures[0].name)).toBe(sample.error.name);
  if (!sample.invalidState) expect(normalize(logs.join(''))).toBe(sample.output);
  expect(await page.evaluate(() => window.warnings.length)).toBe(sample.warnings.length);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  expect(failures).toEqual([]);
});





