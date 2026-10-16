import {assetFile, viewFile} from './test-environment.mjs';
import {installRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const runtime = readFileSync(assetFile('engine.js'), 'utf8');
const fixture = viewFile('tests/language-level10.php');
const php = (flag, mode = '1') => execFileSync(process.env.PHP_BINARY || 'php', ['-d', 'zend.assertions=' + mode, fixture, flag], {encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
const mount = async (page, html, debug = true) => {
  await page.setContent(`${debug ? '<meta name="aml-debug" content="true">' : ''}<main data-aml-client>${html}</main>`);
  await page.evaluate(() => {
    window.failures = [];
    document.querySelector('main').addEventListener('aml:error', ({detail: {error}}) => window.failures.push({name: error.name, message: error.phpMessage, source: error.source, trace: error.phpTrace}));
  });
  await installRuntime(page, runtime);
};
const state = (page) => page.evaluate(() => window.AMLEngine.inspect(document.querySelector('main')));

test('custom service exceptions render a business message, run finally and log only in the console', async ({page}) => {
  const logs = []; page.on('console', (entry) => logs.push({type: entry.type(), text: entry.text()}));
  await mount(page, php('--html'));
  await page.getByRole('button', {name: 'Valider', exact: true}).click();
  await expect(page.locator('#message')).toHaveText('Entrez un âge entier entre 0 et 130.');
  await expect(page.locator('#tentatives')).toHaveText('Tentatives : 1');
  expect(logs.some((entry) => entry.type === 'warning' && entry.text.includes('Validation'))).toBe(true);
  await page.getByLabel('Âge', {exact: true}).fill('30');
  await page.getByRole('button', {name: 'Valider', exact: true}).click();
  await expect(page.locator('#message')).toHaveText('Âge accepté : 30 ans.');
  await expect(page.locator('#tentatives')).toHaveText('Tentatives : 2');
  expect(logs.some((entry) => entry.type === 'log' && entry.text === 'Âge accepté : 30 ans.\n')).toBe(true);
  await expect(page.getByText('Validation', {exact: true})).toHaveCount(0);
  await expect(page.locator('#aml-development-error-overlay')).toHaveCount(0);
  expect(await page.evaluate(() => window.failures)).toEqual([]);
});

for (const debug of [true, false]) {
  test(`uncaught service errors retain PHP frames and rollback State, debug=${debug}`, async ({page}) => {
    const logs = [];
    page.on('console', (entry) => {
      // Firefox's protocol preview is just "Error"; inspect the logged object.
      if (entry.type() === 'error') logs.push(Promise.all(entry.args().map(argument =>
        argument.evaluate(value => value?.message ?? String(value))
      )).then(parts => parts.join(' ')));
    });
    await mount(page, php('--html'), debug);
    await page.getByRole('button', {name: 'Déclencher le diagnostic', exact: true}).click();
    await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
    const [failure] = await page.evaluate(() => window.failures);
    expect(failure.name).toBe('RuntimeException');
    expect(failure.source.file).toMatch(/(^|\/)service.php$/);
    expect(failure.source.line).toBeGreaterThan(0);
    expect(failure.trace.map((frame) => frame.function)).toEqual(['App\\Examples\\Erreurs\\panneInterne', 'App\\Examples\\Erreurs\\lancerDiagnostic']);
    expect((await state(page)).tentatives).toBe(0);
    await expect.poll(async () => (await Promise.all(logs)).some(text => text.includes('Service indisponible'))).toBe(true);
    const overlay = page.locator('#aml-development-error-overlay');
    if (debug) {
      await expect(overlay).toBeVisible();
      await expect(overlay.locator('pre')).toContainText('panneInterne()');
      await expect(overlay.locator('pre')).toContainText('Service indisponible <détail>');
      await expect(overlay.locator('détail')).toHaveCount(0);
      await page.getByRole('button', {name: 'Close overlay'}).click();
    } else await expect(overlay).toHaveCount(0);
    await page.getByLabel('Âge', {exact: true}).fill('20');
    await page.getByRole('button', {name: 'Valider', exact: true}).click();
    await expect(page.locator('#message')).toHaveText('Âge accepté : 20 ans.');
  });
}

for (const mode of ['1', '-1']) {
  test(`assertions use the PHP compilation configuration, zend.assertions=${mode}`, async ({page}) => {
    await mount(page, php('--html', mode), mode !== '1');
    await page.getByRole('button', {name: 'Tester une assertion'}).click();
    await expect(page.locator('#verification')).toHaveText(mode === '1' ? 'Exemple d’assertion de développement.' : 'Assertions désactivées lors de la compilation.');
    await expect(page.locator('#aml-development-error-overlay')).toHaveCount(0);
  });
}

test('caught traces expose PHP service frames and Throwable objects cannot enter State', async ({page}) => {
  const samples = JSON.parse(php('--extra-json'));
  await mount(page, samples.trace);
  await page.getByRole('button', {name: 'Run'}).click();
  const result = (await state(page)).result;
  expect(result[0]).toMatch(/LanguageExceptionsService.php$/);
  expect(result[1]).toBeGreaterThan(0);
  expect(result[2].map((frame) => frame.function)).toEqual(['AML\\View\\Tests\\Exceptions\\failDeep', 'AML\\View\\Tests\\Exceptions\\middle']);
  expect(result[3]).toContain('failDeep()');
  expect(result[4]).toBe('Service indisponible');
  // A new document resets the runtime's mount and overlay guards.
  await page.goto('/__aml_test_empty');
  await mount(page, samples.invalidState, false);
  await page.getByRole('button', {name: 'Run'}).click();
  await expect.poll(() => page.evaluate(() => window.failures.length)).toBe(1);
  expect((await state(page)).result).toEqual([]);
});
