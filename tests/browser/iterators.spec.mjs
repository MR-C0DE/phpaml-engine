import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fixture = viewFile('tests/iterators.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.9.min.js'), 'utf8'));
const parser = readFileSync(assetFile('engine-eval-0.1.0-beta.9.min.js'), 'utf8');
const normalize = (text) => text.replace(/(object\([^\n]*?\))#\d+/g, '$1').replace(/object\(class@anonymous.*?\)(?:#\d+)?/gs, 'object(anonymous)');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const sample of samples) test(`iterators: ${sample.method}`, async ({page}) => {
  const failures = [], logs = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await page.route('**/objects-test', (route) => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button><output data-aml-bind="counter"></output></main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.9.min.js"></script>`}));
  await page.route('**/engine-0.1.0-beta.9.min.js', (route) => route.fulfill({body: runtime, contentType: 'text/javascript'}));
  await page.route('**/engine-eval-0.1.0-beta.9.min.js', (route) => route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.addInitScript(() => {window.failures = []; window.warnings = []; document.addEventListener('aml:warning', (event) => window.warnings.push(event.detail), true); window.cspViolations = []; document.addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, message: error.message}), true); document.addEventListener('securitypolicyviolation', (event) => window.cspViolations.push(event.blockedURI));});
  await page.goto('/objects-test');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.getByRole('button', {name: 'Run'}).click();
  if (sample.error || sample.invalidState) await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.error || sample.invalidState ? sample.initial : sample.expected);
  if (sample.error) expect(await page.evaluate(() => window.failures[0].name)).toBe(sample.error.name);
  if (!sample.invalidState) expect(normalize(logs.join(''))).toBe(sample.output);
  expect(await page.evaluate(() => window.warnings.length)).toBe(sample.warnings.length);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  expect(failures).toEqual([]);
});





test('iterator example traverses again on each click and keeps echo in the console', async ({page}) => {
  const view = viewFile('./');
  const markup = execFileSync(process.env.PHP_BINARY || 'php', ['-r', `require '${view}tests/bootstrap.php'; require '${view}examples/iterateurs/page.php'; echo (new \\AML\\View\\Renderer())->render(new \\Exemples\\Iterateurs\\Pages\\IterateursPage);`], {encoding: 'utf8'});
  const logs = [], errors = [];
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/iterator-example', (route) => route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${markup}</main><script data-aml-engine>${runtime}</script>`}));
  await page.goto('/iterator-example');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.getByRole('button', {name: 'Parcourir la collection'}).click();
  await expect(page.locator('#resultat-iterateurs')).toHaveText('Parcours 1 · 2 articles : pomme=Pomme, orange=Orange');
  await page.getByRole('button', {name: 'Parcourir la collection'}).click();
  await expect(page.locator('#resultat-iterateurs')).toHaveText('Parcours 2 · 2 articles : pomme=Pomme, orange=Orange');
  expect(logs).toEqual(['Parcours terminé\n', 'Parcours terminé\n']);
  await expect(page.locator('body')).not.toContainText('Parcours terminé');
  expect(errors).toEqual([]);
});
