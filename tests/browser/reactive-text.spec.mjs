import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const fixture = viewFile('tests/reactive-text.php');

test('all native display components preserve PHP text across hydration and state changes', async ({page}) => {
  const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024}));
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(`<main data-aml-client>${sample.html}</main>`);
  const text = () => page.locator('[data-test]').evaluateAll((nodes) => Object.fromEntries(nodes.filter((node) => node.tagName !== 'NOSCRIPT').map((node) => [node.dataset.test, node.textContent])));
  const wanted = (values) => Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'noscript'));
  expect(await text()).toEqual(wanted(sample.before));
  await installRuntime(page, runtime);
  expect(await text()).toEqual(wanted(sample.before));
  await page.getByRole('button', {name: 'Changer', exact: true}).click();
  expect(await text()).toEqual(wanted(sample.after));
  await page.getByRole('button', {name: 'Accolades', exact: true}).click();
  expect(await text()).toEqual(wanted(sample.braces));
  await expect(page.locator('[data-test] b')).toHaveCount(0);
  await expect(page.locator('em')).toHaveCount(4);
  await expect(page.locator('[data-test="mixed"] strong')).toHaveCount(1);
  await expect(page.locator('[data-test="options"] option')).toHaveCount(2);
  await expect(page.locator('option span')).toHaveCount(0);
  const popover = page.locator('[data-test="popover"] [role="dialog"]');
  await page.locator('[data-test="popover"] > button').click();
  await expect(popover).toHaveAccessibleName('Détail {count} <em>texte</em>');
  expect(errors).toEqual([]);
});

test('a display evaluation error has PHP origin and a subsequent update can recover', async ({page}) => {
  const encode = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const source = {file: 'TextPage.php', line: 12, strictTypes: true};
  const value = {$expression: {operation: 'display', left: {$expression: {operation: 'divide', left: 10, right: {$state: 'divisor'}}}, right: {functions: {}, source}}};
  const action = (n) => encode({type: 'set', target: 'divisor', value: n, phpSource: source});
  await page.setContent(`<main data-aml-client><template data-aml-state='{"divisor":2}'></template><output data-aml-bind-value="${encode(value)}">5</output><button data-aml-client-click="${action(0)}">Erreur</button><button data-aml-client-click="${action(5)}">Reprendre</button></main>`);
  await page.evaluate(() => {window.failures = []; document.querySelector('main').addEventListener('aml:render-error', ({detail: {error}}) => window.failures.push({file: error.source?.file, message: error.message}));});
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Erreur'}).click();
  await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  expect(await page.evaluate(() => window.failures[0].file)).toBe('TextPage.php');
  await page.getByRole('button', {name: 'Reprendre'}).click();
  await expect(page.locator('output')).toHaveText('2');
});
