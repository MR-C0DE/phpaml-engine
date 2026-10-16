import {assetFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';

const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

test('compiled local frames, scalar diagnostics and text bindings cooperate in the browser', async ({page}) => {
  const action = {type: 'local-scope', action: {type: 'sequence', actions: [
    {type: 'local-set', name: 'v61', value: {$state: 'count'}},
    {type: 'local-set', name: 'v62', value: {$float: 1}},
    {type: 'increment', target: 'count', value: 1},
    {type: 'set', target: 'snapshot', value: {$local: 'v61'}},
    {type: 'set', target: 'kind', value: {$expression: {operation: 'gettype', left: {$local: 'v62'}, right: null}}},
    {type: 'set', target: 'label', value: {$expression: {operation: 'concat', left: 'Bool: ', right: {$expression: {operation: 'toBool', left: '0', right: null}}}}},
    {type: 'console', level: 'dump', values: [{$local: 'v62'}, null]},
  ]}};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({count: 1, snapshot: 0, kind: '', label: ''})}"></template>
    <button data-aml-client-click="${attribute(action)}">Run</button>
    <output id="count" data-aml-bind="count"></output>
    <output id="snapshot" data-aml-bind="snapshot"></output>
    <output id="kind" data-aml-bind="kind"></output>
    <output id="label" data-aml-bind="label"></output>
  </main>`);
  await installRuntime(page, runtime);
  const diagnostic = page.waitForEvent('console', {predicate: (message) => message.type() === 'log'});
  await page.getByRole('button', {name: 'Run'}).click();
  await expect(page.locator('#count')).toHaveText('2');
  await expect(page.locator('#snapshot')).toHaveText('1');
  await expect(page.locator('#kind')).toHaveText('double');
  await expect(page.locator('#label')).toHaveText('Bool:');
  expect((await diagnostic).text()).toBe('float(1)\nNULL\n');
  await page.getByRole('button', {name: 'Run'}).click();
  await expect(page.locator('#snapshot')).toHaveText('2');
  const state = await page.evaluate(() => window.AMLEngine.inspect(document.querySelector('[data-aml-client]')));
  expect(Object.keys(state).sort()).toEqual(['count', 'kind', 'label', 'snapshot']);
});

test('typed failures report PHP locations, restore state and allow subsequent events', async ({page}) => {
  const source = {file: 'views/Example.php', line: 27, function: 'save', strictTypes: true};
  const bad = {type: 'sequence', actions: [
    {type: 'set', target: 'message', value: 'changed'},
    {type: 'set', target: 'age', value: 'invalid', phpSource: source},
  ]};
  const config = {types: {age: 'int', message: 'string'}, valueTypes: {age: 'integer', message: 'string'},
    typeRules: {age: {types: ['int'], nullable: false, property: 'Example::$age'}}};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({age: 7, message: 'original'})}" data-aml-state-config="${attribute(config)}"></template>
    <button data-aml-client-click="${attribute(bad)}">Bad</button>
    <button data-aml-client-click="${attribute({type: 'set', target: 'age', value: 8})}">Good</button>
    <output id="age" data-aml-bind="age"></output><output id="message" data-aml-bind="message"></output>
  </main>`);
  await page.evaluate(() => {
    window.diagnostics = [];
    document.querySelector('main').addEventListener('aml:error', (event) => {
      const {error} = event.detail;
      window.diagnostics.push({code: error.code, source: error.source, message: error.message});
    });
  });
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Bad', exact: true}).click();
  await expect(page.locator('#age')).toHaveText('7');
  await expect(page.locator('#message')).toHaveText('original');
  await expect.poll(() => page.evaluate(() => window.diagnostics.length)).toBe(1);
  const [failure] = await page.evaluate(() => window.diagnostics);
  expect(failure.code).toBe('PHP_TYPE_ERROR');
  expect(failure.source).toEqual(source);
  expect(failure.message).toContain('Example::$age');
  expect(failure.message).toContain('views/Example.php:27');
  await page.getByRole('button', {name: 'Good', exact: true}).click();
  await expect(page.locator('#age')).toHaveText('8');
});

test('weak scalar conversions expose PHP warnings without cancelling the action', async ({page}) => {
  const action = {type: 'set', target: 'age', value: {$float: 12.75}, phpSource: {file: 'Example.php', line: 10, strictTypes: false}};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({age: 7})}" data-aml-state-config="${attribute({typeRules: {age: {types: ['int'], nullable: false, property: 'Example::$age'}}})}"></template>
    <button data-aml-client-click="${attribute(action)}">Convert</button><output data-aml-bind="age"></output>
  </main>`);
  await page.evaluate(() => {
    window.warnings = [];
    document.querySelector('main').addEventListener('aml:warning', (event) => window.warnings.push(event.detail));
  });
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Convert'}).click();
  await expect(page.locator('output')).toHaveText('12');
  const warnings = await page.evaluate(() => window.warnings);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].code).toBe('PHP_DEPRECATED');
  expect(warnings[0].source.line).toBe(10);
});
