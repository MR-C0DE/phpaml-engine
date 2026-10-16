import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const source = {file: 'SaisiePage.php', line: 42, strictTypes: true, phpVersion: 80400};
const call = (name, ...args) => ({$expression: {operation: 'builtin', left: name, right: {arguments: args.map((value) => ({value})), source}}});
const set = (target, value) => ({type: 'set', target, value, phpSource: source});
const seq = (...actions) => ({type: 'sequence', actions});
const mount = async (page, action) => {
  await page.setContent(`<main data-aml-client><template data-aml-state="${attribute({input: '', result: '', counter: 0})}"></template>
    <input aria-label="Nom" data-aml-model="input"><button data-aml-client-click="${attribute(action)}">Valider</button>
    <button data-aml-client-click="${attribute(set('result', 'Prêt'))}">Reprendre</button><output data-aml-bind="result"></output></main>`);
  await page.evaluate(() => {window.failures = []; document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({code: error.code, file: error.source.file}));});
  await installRuntime(page, runtime);
};

test('browser input is read through state and echo stays in the console', async ({page}) => {
  const logs = []; page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await mount(page, seq(set('result', call('trim', {$state: 'input'})), {type: 'console', level: 'echo', values: ['Bonjour ', {$state: 'result'}, '\n']}));
  await page.getByLabel('Nom').fill('  André  ');
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect(page.locator('output')).toHaveText('André');
  expect(logs).toEqual(['Bonjour André\n']);
  await expect(page.locator('main')).not.toContainText('Bonjour');
});

test('invalid builtin parameters roll back the event and leave the page usable', async ({page}) => {
  await mount(page, seq(set('counter', 9), set('result', call('explode', '', 'abc'))));
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{code: 'PHP_RUNTIME_ERROR', file: 'SaisiePage.php'}]);
  expect((await page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).counter).toBe(0);
  await page.getByRole('button', {name: 'Reprendre'}).click();
  await expect(page.locator('output')).toHaveText('Prêt');
});

test('secure random generation and PHP amount formatting execute inside the browser', async ({page}) => {
  await mount(page, seq(set('counter', call('random_int', 1, 6)), set('result', call('number_format', 1234.5, 2, ',', ' '))));
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect(page.locator('output')).toHaveText('1 234,50');
  const state = await page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')));
  expect(state.counter).toBeGreaterThanOrEqual(1); expect(state.counter).toBeLessThanOrEqual(6);
  expect(await page.evaluate(() => window.failures)).toEqual([]);
});

test('compiled View example validates input, changes menu actions and computes cents exactly', async ({page}) => {
  const fixture = viewFile('tests/language-level78.php');
  const html = execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--example'], {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
  const logs = []; page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await page.setContent(`<main data-aml-client>${html}</main>`);
  await installRuntime(page, runtime);
  await page.getByLabel('Prix', {exact: true}).fill('0,10');
  await page.getByLabel('Quantité', {exact: true}).fill('3');
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect(page.getByText('André : 0,30 €', {exact: true})).toBeVisible();
  expect(logs).toEqual(['André : 0,30 €\n']);
  await page.getByLabel('Prix', {exact: true}).fill('12.500');
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect(page.getByText('Entre un prix positif avec au plus deux décimales et une quantité entière.', {exact: true})).toBeVisible();
  expect(logs).toHaveLength(1);
  await page.getByLabel('Action', {exact: true}).selectOption('bonjour');
  await page.getByLabel('Nom', {exact: true}).fill('  Marie  ');
  await page.getByRole('button', {name: 'Valider'}).click();
  await expect(page.getByText('Bonjour Marie', {exact: true})).toBeVisible();
  expect(logs.at(-1)).toBe('Bonjour Marie\n');
});
