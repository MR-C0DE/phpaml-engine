import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const fixture = viewFile('tests/anonymous.php');
const samples = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.9.min.js'), 'utf8'));
const parser = readFileSync(assetFile('engine-eval-0.1.0-beta.9.min.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
for (const sample of samples) test(`anonymous classes and intersections: ${sample.method}`, async ({page}) => {
  const failures = [], logs = [];
  page.on('pageerror', (error) => failures.push(error.message));
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await page.route('**/objects-test', (route) => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button><output data-aml-bind="counter"></output></main><script defer data-aml-engine src="/_aml/engine-0.1.0-beta.9.min.js"></script>`}));
  await page.route('**/engine-0.1.0-beta.9.min.js', (route) => route.fulfill({body: runtime, contentType: 'text/javascript'}));
  await page.route('**/engine-eval-0.1.0-beta.9.min.js', (route) => route.fulfill({body: parser, contentType: 'text/javascript'}));
  await page.addInitScript(() => {window.failures = []; window.cspViolations = []; document.addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, message: error.message}), true); document.addEventListener('securitypolicyviolation', (event) => window.cspViolations.push(event.blockedURI));});
  await page.goto('/objects-test');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.getByRole('button', {name: 'Run'}).click();
  if (sample.error || sample.invalidState) await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.error || sample.invalidState ? sample.initial : sample.expected);
  if (sample.error) expect(await page.evaluate(() => window.failures[0].name)).toBe(sample.error.name);
  if (!sample.invalidState) expect(logs.join('')).toBe(sample.output);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
  expect(failures).toEqual([]);
});




test('anonymous class statics stay isolated per component and reset on remount', async ({page}) => {
  const view = viewFile('./');
  const markup = execFileSync(process.env.PHP_BINARY || 'php', ['-r', `require '${view}tests/bootstrap.php'; require '${view}examples/classes-anonymes/page.php'; echo (new \\AML\\View\\Renderer())->render(new class extends \\AML\\View\\Page { public function body(): \\AML\\View\\View { return \\AML\\View\\VStack(new \\Exemples\\ClassesAnonymes\\Pages\\ProfilAnonyme(), new \\Exemples\\ClassesAnonymes\\Pages\\ProfilAnonyme()); } });`], {encoding: 'utf8'});
  const errors = [];
  await page.addInitScript(() => {window.amlFailures = []; document.addEventListener('aml:error', ({detail}) => window.amlFailures.push(detail.error?.message), true);});
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/anonymous-example', (route) => route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${markup}</main><script data-aml-engine>${runtime}</script>`}));
  await page.goto('/anonymous-example');
  await expect(page.locator('[data-aml-client]').first()).toHaveAttribute('data-aml-engine-mounted', 'true');
  const buttons = page.getByRole('button', {name: 'Créer un profil', exact: true}), messages = page.locator('[id="resultat-anonyme"]');
  await buttons.nth(0).click();
  expect(await page.evaluate(() => window.amlFailures)).toEqual([]);
  await expect(messages.nth(0)).toHaveText('André — 15 points · création 1');
  await buttons.nth(0).click();
  await expect(messages.nth(0)).toHaveText('André — 15 points · création 2');
  await buttons.nth(1).click();
  await expect(messages.nth(1)).toHaveText('André — 15 points · création 1');
  await page.evaluate(() => {const root = document.querySelector('main'); window.AMLEngine.unmount(root); window.AMLEngine.mount(document);});
  await buttons.nth(0).click();
  expect(await page.evaluate(() => window.amlFailures)).toEqual([]);
  await expect(messages.nth(0)).toHaveText('André — 15 points · création 1');
  expect(errors).toEqual([]);
});
