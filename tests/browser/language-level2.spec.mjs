import {assetFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';

const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const ex = (operation, left, right = null) => ({$expression: {operation, left, right}});
const state = (name) => ({$state: name});
const set = (target, value) => ({type: 'set', target, value});

test('operator expressions read current state and refresh the access message on each click', async ({page}) => {
  const allowed = ex('and', ex('greaterEqual', state('age'), 18), state('active'));
  const action = set('message', {$conditional: {left: allowed, operator: 'truthy', right: true, then: 'Accès autorisé', otherwise: 'Accès refusé'}});
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({age: 17, active: true, message: ''})}"></template>
    <button data-aml-client-click="${attribute(action)}">Vérifier</button>
    <button data-aml-client-click="${attribute({type: 'increment', target: 'age', value: 1})}">Anniversaire</button>
    <button data-aml-client-click="${attribute(set('active', false))}">Désactiver</button>
    <output data-aml-bind="message"></output>
  </main>`);
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Vérifier'}).click();
  await expect(page.locator('output')).toHaveText('Accès refusé');
  await page.getByRole('button', {name: 'Anniversaire'}).click();
  await page.getByRole('button', {name: 'Vérifier'}).click();
  await expect(page.locator('output')).toHaveText('Accès autorisé');
  await page.getByRole('button', {name: 'Désactiver'}).click();
  await page.getByRole('button', {name: 'Vérifier'}).click();
  await expect(page.locator('output')).toHaveText('Accès refusé');
});

test('lazy branches skip errors and mutations while post-increment preserves its type', async ({page}) => {
  const action = {type: 'sequence', actions: [
    set('skipped', ex('and', false, ex('postIncrement', state('count')))),
    set('safe', ex('or', true, ex('divide', 1, 0))),
    set('fallback', ex('coalesce', state('optional'), ex('power', 2, ex('power', 3, 2)))),
    set('snapshot', ex('postIncrement', state('count'))),
    set('kind', ex('gettype', ex('postIncrement', state('decimal')))),
    set('strict', ex('identical', state('decimal'), state('count'))),
    set('loose', ex('equal', state('decimal'), state('count'))),
  ]};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({count: 1, decimal: 1, optional: null, skipped: null, safe: null, fallback: 0, snapshot: 0, kind: '', strict: null, loose: null})}"
      data-aml-state-config="${attribute({valueTypes: {count: 'integer', decimal: 'double'}})}"></template>
    <button data-aml-client-click="${attribute(action)}">Calculer</button>
    <output data-aml-bind="kind"></output>
  </main>`);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Calculer'}).click();
  await expect(page.locator('output')).toHaveText('double');
  const inspect = () => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')));
  expect(await inspect()).toMatchObject({count: 2, decimal: 2, snapshot: 1, fallback: 512, skipped: false, safe: true, strict: false, loose: true});
  await page.getByRole('button', {name: 'Calculer'}).click();
  expect(await inspect()).toMatchObject({count: 3, decimal: 3, snapshot: 2, strict: false, loose: true});
  expect(errors).toEqual([]);
});

test('division failures restore expression mutations and retain the PHP source location', async ({page}) => {
  const source = {file: 'views/Operators.php', line: 42, strictTypes: true};
  const bad = {type: 'sequence', actions: [
    {type: 'evaluate', value: ex('assign', state('count'), 99)},
    {...set('result', ex('divide', 1, 0)), phpSource: source},
  ]};
  await page.setContent(`<main data-aml-client>
    <template data-aml-state="${attribute({count: 1, result: 0})}"></template>
    <button data-aml-client-click="${attribute(bad)}">Erreur</button>
    <button data-aml-client-click="${attribute(set('result', ex('preIncrement', state('count'))))}">Réessayer</button>
    <output id="count" data-aml-bind="count"></output><output id="result" data-aml-bind="result"></output>
  </main>`);
  await page.evaluate(() => {
    window.failures = [];
    document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, source: error.source}));
  });
  await installRuntime(page, runtime);
  await page.getByRole('button', {name: 'Erreur', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{name: 'DivisionByZeroError', source}]);
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('#result')).toHaveText('0');
  await page.getByRole('button', {name: 'Réessayer'}).click();
  await expect(page.locator('#count')).toHaveText('2');
  await expect(page.locator('#result')).toHaveText('2');
});
