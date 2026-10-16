import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture = viewFile('tests/native-functions.php');
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const php = process.env.PHP_BINARY || 'php';
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

test('native Math/String/Array expressions hydrate and update from State without a server call', async ({page}) => {
  const html = execFileSync(php, [fixture, '--example'], {encoding: 'utf8'});
  const logs = [], requests = [], errors = [];
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  page.on('request', (request) => requests.push(request.url())); page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(`<main data-aml-client>${html}</main>`);
  await expect(page.getByText('Moyenne : 6.33', {exact: true})).toBeVisible();
  await installRuntime(page, runtime);
  requests.length = 0; // Module downloads belong to startup; interactions remain local.
  await expect(page.getByText('Moyenne : 6.33', {exact: true})).toBeVisible();
  await page.getByLabel('Nombres séparés par des virgules').fill('12, 5, 3, 5');
  await page.getByRole('button', {name: 'Analyser'}).click();
  await expect(page.getByText('Valeurs : 3, 5, 12', {exact: true})).toBeVisible();
  await expect(page.getByText('Moyenne : 6.67', {exact: true})).toBeVisible();
  await expect(page.getByText('Norme : 13,34', {exact: true})).toBeVisible();
  expect(logs).toEqual(['Calcul terminé : 3 valeurs\n']);
  await expect(page.locator('main')).not.toContainText('Calcul terminé');
  await page.getByLabel('Nombres séparés par des virgules').fill('3, nope');
  await page.getByRole('button', {name: 'Analyser'}).click();
  await expect(page.getByText('Entre de 1 à 100 nombres séparés par des virgules.', {exact: true})).toBeVisible();
  await expect(page.getByText('Moyenne : 6.67', {exact: true})).toBeVisible();
  expect(logs).toHaveLength(1); expect(errors).toEqual([]); expect(requests).toEqual([]);
});

for (const method of ['first_class', 'callback_byref', 'firstclass_reference', 'format_more', 'entity_modes', 'metaphone', 'parse_query', 'token_sequence', 'invalid_callback']) {
  test(`compiled native function: ${method}`, async ({page}) => {
    const [sample] = JSON.parse(execFileSync(php, [fixture, '--case', method, '--json'], {encoding: 'utf8'}));
    await page.setContent(`<main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button></main>`);
    await page.evaluate(() => {window.failures = []; document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, file: error.source.file}));});
    await installRuntime(page, runtime);
    await page.getByRole('button', {name: 'Run'}).click();
    await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.error ? sample.initial : sample.expected);
    if (sample.error) await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{name: sample.error.name, file: expect.stringContaining('NativeLibrary.php')}]);
    else expect(await page.evaluate(() => window.failures)).toEqual([]);
  });
}
