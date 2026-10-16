import {assetFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';

const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const set = (target, value) => ({type: 'set', target, value});
const state = (name) => ({$state: name});
const nop = {type: 'evaluate', value: null};
const loop = (condition, action) => ({type: 'loop', kind: 'while', init: nop, update: nop, conditions: [condition], action, limit: 1000});

test('runtime loops update bindings and echo remains only in the browser console', async ({page}) => {
  const action = loop(ex('less', state('count'), state('limit')), {type: 'sequence', actions: [
    {type: 'increment', target: 'count', value: 1},
    {type: 'console', level: 'echo', values: [state('count'), '\n']},
  ]});
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({count: 0, limit: 3})}"></template>
    <button data-aml-client-click="${attribute(action)}">Compter</button>
    <button data-aml-client-click="${attribute(set('limit', 5))}">Étendre</button>
    <output data-aml-bind="count"></output>
  </main>`);
  const logs = [];
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Compter'}).click();
  await expect(page.locator('output')).toHaveText('3');
  await page.getByRole('button', {name: 'Étendre'}).click();
  await page.getByRole('button', {name: 'Compter'}).click();
  await expect(page.locator('output')).toHaveText('5');
  expect(logs.join('')).toBe('1\n2\n3\n4\n5\n');
  await expect(page.locator('output')).toHaveCount(1);
});

test('match and foreach work with typed associative arrays without exposing locals', async ({page}) => {
  const action = {type: 'local-scope', action: {type: 'sequence', actions: [
    set('kind', ex('match', ex('offset', state('items'), 2), [
      {default: false, conditions: [1], value: 'int'}, {default: false, conditions: [{$float: 1}], value: 'float'},
    ])),
    set('label', ''),
    {type: 'foreach-local', source: state('items'), key: {$local: 'v6b'}, bindings: [{path: [], target: {$local: 'v76'}}], limit: 1000,
      action: set('label', ex('concat', state('label'), ex('concat', {$local: 'v6b'}, ';')))},
  ]}};
  const metadata = {next: 3, entries: [{key: 2, type: 'double'}, {key: 0, type: 'integer'}, {key: 'name', type: 'string'}]};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({items: {2: 1, 0: 2, name: 'André'}, kind: '', label: ''})}" data-aml-state-config="${attribute({arrayMetadata: {items: metadata}})}"></template>
    <button data-aml-client-click="${attribute(action)}">Parcourir</button>
    <output id="kind" data-aml-bind="kind"></output><output id="label" data-aml-bind="label"></output>
  </main>`);
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Parcourir'}).click();
  await expect(page.locator('#kind')).toHaveText('float');
  await expect(page.locator('#label')).toHaveText('2;0;name;');
  const inspected = await page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')));
  expect(Object.keys(inspected).sort()).toEqual(['items', 'kind', 'label']);
});

test('a runaway loop restores state and leaves the next click usable', async ({page}) => {
  const bad = {...loop(true, {type: 'increment', target: 'count', value: 1}), phpSource: {file: 'Loop.php', line: 12}};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({count: 0})}"></template>
    <button data-aml-client-click="${attribute(bad)}">Boucler</button>
    <button data-aml-client-click="${attribute(set('count', 1))}">Reprendre</button><output data-aml-bind="count"></output>
  </main>`);
  await page.evaluate(() => {
    window.failures = [];
    document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({code: error.code, line: error.source.line}));
  });
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Boucler'}).click();
  await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{code: 'PHP_LOOP_LIMIT', line: 12}]);
  await expect(page.locator('output')).toHaveText('0');
  await page.getByRole('button', {name: 'Reprendre'}).click();
  await expect(page.locator('output')).toHaveText('1');
});
