import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const fixture = viewFile('tests/unicode.php');
const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const php = process.env.PHP_BINARY || 'php';
const contextualSigma = Number(execFileSync(php, ['-r', 'echo PHP_VERSION_ID;'], {encoding: 'utf8'})) >= 80300;
const attribute = (value) => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

test('Unicode reactive text keeps PHP output and updates locally with accents and emoji', async ({page}) => {
  const html = execFileSync(php, [fixture, '--example'], {encoding: 'utf8'});
  const logs = [], requests = [], errors = [];
  page.on('console', (message) => {if (message.type() === 'log') logs.push(message.text());});
  page.on('request', (request) => requests.push(request.url())); page.on('pageerror', (error) => errors.push(error.message));
  await page.setContent(`<main data-aml-client>${html}</main>`);
  await expect(page.getByText('Majuscules : ANDRÉ 🌍', {exact: true})).toBeVisible();
  await expect(page.getByText('Points de code : 7', {exact: true})).toBeVisible();
  await installRuntime(page, runtime);
  requests.length = 0; // Module downloads belong to startup; interactions remain local.
  await expect(page.getByText('Majuscules : ANDRÉ 🌍', {exact: true})).toBeVisible();
  await page.getByLabel('Texte Unicode').fill('été 👨‍👩‍👧‍👦');
  await expect(page.getByText('Majuscules : ÉTÉ 👨‍👩‍👧‍👦', {exact: true})).toBeVisible();
  await expect(page.getByText('Points de code : 11', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Mettre en majuscules'}).click();
  await expect(page.getByText('Original : ÉTÉ 👨‍👩‍👧‍👦', {exact: true})).toBeVisible();
  expect(logs).toEqual(['Normalisé : ÉTÉ 👨‍👩‍👧‍👦\n']);
  await expect(page.locator('main')).not.toContainText('Normalisé');
  await page.getByLabel('Texte Unicode').fill('ΟΣ Straße İ');
  await expect(page.getByText(`Minuscules : ο${contextualSigma ? 'ς' : 'σ'} straße i̇`, {exact: true})).toBeVisible();
  await expect(page.getByText(`Titre : Ο${contextualSigma ? 'ς' : 'σ'} Straße İ`, {exact: true})).toBeVisible();
  expect(errors).toEqual([]); expect(requests).toEqual([]);
});

for (const method of ['composition', 'caught']) {
  test(`compiled Unicode calls: ${method}`, async ({page}) => {
    const [sample] = JSON.parse(execFileSync(php, [fixture, '--case', method, '--json'], {encoding: 'utf8'}));
    await page.setContent(`<main data-aml-client><template data-aml-state="${attribute(sample.initial)}" data-aml-state-config="${attribute(sample.config)}"></template><button data-aml-client-click="${attribute(sample.action)}">Run</button></main>`);
    await installRuntime(page, runtime);
    await page.getByRole('button', {name: 'Run'}).click();
    await expect.poll(() => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')))).toEqual(sample.expected);
  });
}
