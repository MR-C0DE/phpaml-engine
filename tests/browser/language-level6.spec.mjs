import {assetFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const n = {$local: 'v6e'};
const source = {file: 'service.php', line: 12, strictTypes: true};
const rule = {types: ['int'], nullable: false};
const call = (id, value) => ex('call', ex('functionRef', id), {arguments: [{value}], source: {file: 'Page.php', line: 20, strictTypes: true}});
const ret = (value) => ({type: 'return', value, hasValue: true, phpSource: source});
const functions = {
  factorial: {name: 'factorial', declared: true, source, parameters: [{id: 'v6e', name: 'n', rule, reference: false, variadic: false}], returnType: rule, body: {type: 'condition', left: n, operator: 'lte', value: 1, then: ret(1), otherwise: ret(ex('multiply', n, call('factorial', ex('subtract', n, 1))))}},
  bad: {name: 'bad', declared: true, source, parameters: [], returnType: rule, body: ret('invalid')},
  infinite: {name: 'infinite', declared: true, source, parameters: [], returnType: rule, body: ret(call('infinite', 1))},
};
const scope = (...actions) => ({type: 'local-scope', functions, action: {type: 'sequence', actions}});
const set = (value) => ({type: 'set', target: 'result', value});
const mount = async (page, action) => {
  await page.setContent(`<main data-aml-client><template data-aml-state="${attribute({result: 0})}"></template>
    <button data-aml-client-click="${attribute(action)}">Exécuter</button><button data-aml-client-click="${attribute(set(1))}">Reprendre</button><output data-aml-bind="result"></output></main>`);
  await page.evaluate(() => {window.failures = []; document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({code: error.code, file: error.source.file}));});
  await installRuntime(page, runtime);
};

test('recursive service functions update the interface and echo only to console', async ({page}) => {
  const logs = []; page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await mount(page, scope(set(call('factorial', 5)), {type: 'console', level: 'echo', values: [{$state: 'result'}, '\n']}));
  await page.getByRole('button', {name: 'Exécuter'}).click();
  await expect(page.locator('output')).toHaveText('120');
  expect(logs).toEqual(['120\n']);
  await page.getByRole('button', {name: 'Exécuter'}).click();
  await expect.poll(() => logs.length).toBe(2);
  expect(await page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual({result: 120});
});

test('function errors restore state, identify the service and allow the next event', async ({page}) => {
  await mount(page, scope(set(99), set(call('bad', 1))));
  await page.getByRole('button', {name: 'Exécuter'}).click();
  await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{code: 'PHP_TYPE_ERROR', file: 'service.php'}]);
  await expect(page.locator('output')).toHaveText('0');
  await page.getByRole('button', {name: 'Reprendre'}).click();
  await expect(page.locator('output')).toHaveText('1');
});

test('unbounded recursive functions stop before exhausting the browser stack', async ({page}) => {
  await mount(page, scope(set(99), set(call('infinite', 0))));
  await page.getByRole('button', {name: 'Exécuter'}).click();
  await expect.poll(() => page.evaluate(() => window.failures[0]?.code)).toBe('PHP_CALL_LIMIT');
  await expect(page.locator('output')).toHaveText('0');
  await page.getByRole('button', {name: 'Reprendre'}).click();
  await expect(page.locator('output')).toHaveText('1');
});
