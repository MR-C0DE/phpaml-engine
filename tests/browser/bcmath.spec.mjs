import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture = viewFile('tests/bcmath.php');
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const php = process.env.PHP_BINARY || 'php';
const modern = Number(execFileSync(php, ['-r', 'echo PHP_VERSION_ID;'], {encoding: 'utf8'})) >= 80400;
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

test('decimal totals hydrate and update from State without floats or a server request', async ({page}) => {
  test.skip(!modern, 'The rounding example requires PHP 8.4.');
  const html = execFileSync(php, [fixture, '--example'], {encoding: 'utf8'});
  const logs = [], requests = [], errors = [];
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  page.on('request', (request) => requests.push(request.url())); page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(`<main data-aml-client>${html}</main>`);
  await expect(page.getByText('Total : 68.99 $', {exact: true})).toBeVisible();
  await installRuntime(page, runtime);
  requests.length = 0; // Module downloads belong to startup; interactions remain local.
  await expect(page.getByText('Total : 68.99 $', {exact: true})).toBeVisible();
  await page.getByLabel('Prix unitaire').fill('0.10');
  await page.getByRole('button', {name: 'Calculer'}).click();
  await expect(page.getByText('Sous-total : 0.30 $', {exact: true})).toBeVisible();
  await expect(page.getByText('Taxes (15 %) : 0.05 $', {exact: true})).toBeVisible();
  await expect(page.getByText('Total : 0.35 $', {exact: true})).toBeVisible();
  expect(logs).toEqual(['Total calculé : 0.35\n']);
  await expect(page.locator('main')).not.toContainText('Total calculé');
  await page.getByLabel('Prix unitaire').fill('invalid');
  await page.getByRole('button', {name: 'Calculer'}).click();
  await expect(page.getByText('Entre un prix positif avec un point décimal et une quantité de 1 à 10 000.', {exact: true})).toBeVisible();
  await expect(page.getByText('Total : 0.35 $', {exact: true})).toBeVisible();
  expect(logs).toHaveLength(1); expect(errors).toEqual([]); expect(requests).toEqual([]);
});
for (const method of ['composition', 'scales', 'caught', 'uncaught', 'enumValues']) {
  test(`compiled decimal calls: ${method}`, async ({page}) => {
    test.skip(method === 'enumValues' && !modern, 'RoundingMode requires PHP 8.4.');
    const [sample] = JSON.parse(execFileSync(php, [fixture, '--case', method, '--json'], {encoding: 'utf8'}));
    await page.setContent(`<main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button></main>`);
    await page.evaluate(() => {window.failures = []; document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, file: error.source.file}));});
    await installRuntime(page, runtime);
    await page.getByRole('button', {name: 'Run'}).click();
    await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.error ? sample.initial : sample.expected);
    if (sample.error) await expect.poll(() => page.evaluate(() => window.failures)).toEqual([{name: sample.error.name, file: expect.stringContaining('BCMathLibrary.php')}]);
    else expect(await page.evaluate(() => window.failures)).toEqual([]);
    if (method === 'scales') {await page.getByRole('button', {name: 'Run'}).click(); await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.expected);}
  });
}
