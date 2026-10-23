import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

for (const automatic of [false, true]) {
const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/component-inputs.php'), '--json', ...(automatic ? ['--automatic'] : [])], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));

test(`component assignments update the originating State and forwarded displays (${automatic ? 'automatic' : 'manual'} factories)`, async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/component-inputs', route => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: `<meta charset="utf-8"><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.addInitScript(() => {
    window.inputErrors = []; window.inputCsp = [];
    for (const name of ['aml:error', 'aml:render-error']) document.addEventListener(name, ({detail: {error}}) => window.inputErrors.push(error.message), true);
    document.addEventListener('securitypolicyviolation', e => window.inputCsp.push(e.blockedURI));
  });
  await page.goto('/component-inputs');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const text = id => page.locator(`[data-test="${id}"]`);
  const click = name => page.getByRole('button', {name, exact: true}).click();
  await click('card-set');
  for (const id of ['parent', 'card', 'card-preview']) await expect(text(id)).toHaveText('Modifié');
  await expect(text('other')).toHaveText('André');
  await expect(text('card-clicks')).toHaveText('1'); await expect(text('sibling-clicks')).toHaveText('0');
  await click('card-append'); await expect(text('parent')).toHaveText('Modifié!');
  await click('card-method'); await expect(text('card-preview')).toHaveText('Méthode');
  await click('card-reference'); await expect(text('parent')).toHaveText('Référence');
  await click('card-preview-set'); await expect(text('card')).toHaveText('Petit-enfant');
  await click('Parent'); await expect(text('card-preview')).toHaveText('Parent');
  await page.locator('[name="card-input"]').fill('Formulaire'); await expect(text('card-preview')).toHaveText('Formulaire');
  await click('host-set'); await expect(text('host-preview')).toHaveText('Modifié'); await expect(text('parent')).toHaveText('Formulaire');
  await click('sibling-set'); await expect(text('other')).toHaveText('Modifié'); await expect(text('parent')).toHaveText('Formulaire');
  await click('literal-set'); await expect(text('literal-preview')).toHaveText('Modifié'); await expect(text('default-preview')).toHaveText('');
  await click('default-preview-set'); await expect(text('default')).toHaveText('Petit-enfant');
  await page.locator('[name="literal-input"]').fill('Local'); await expect(text('literal-preview')).toHaveText('Local');
  await click('Data'); await expect(text('price-type')).toHaveText('double');
  await click('Array reference'); await expect(text('items')).toHaveText('new,builtin');
  expect(await page.evaluate(() => window.inputErrors)).toEqual([]);
  await click('typed-invalid'); await expect(text('typed')).toHaveText('Typé');
  await expect(text('typed-clicks')).toHaveText('0');
  await expect.poll(() => page.evaluate(() => window.inputErrors.length)).toBe(1);
  expect((await page.evaluate(() => window.inputErrors))[0]).toContain('Carte::$a');
  await click('Readonly'); await expect(text('parent')).toHaveText('Formulaire');
  await expect.poll(() => page.evaluate(() => window.inputErrors.length)).toBe(2);
  expect((await page.evaluate(() => window.inputErrors))[1]).toContain('readonly');
  expect(await page.evaluate(() => window.inputCsp)).toEqual([]); expect(errors).toEqual([]);
});
}
