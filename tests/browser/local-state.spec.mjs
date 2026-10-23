import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/local-state.php'), '--json'], {encoding: 'utf8'}));

test('typed local State persists across events, binds forms and styles, and stays isolated', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/local-state', route => route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.addInitScript(() => {
    window.stateErrors = [];
    document.addEventListener('aml:error', ({detail: {error}}) => window.stateErrors.push(error.message), true);
  });
  await page.goto('/local-state');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const click = name => page.getByRole('button', {name, exact: true}).click();
  await click('Add'); await click('Add'); await click('Double'); await click('Subtract');
  await expect(page.locator('#count')).toHaveText('3');
  await click('Append'); await expect(page.locator('#message')).toHaveText('André!');
  await click('Child');
  for (const id of ['message', 'child-message']) await expect(page.locator('#' + id)).toHaveText('Shared');
  await page.locator('[name="child-message"]').fill('Edited');
  await expect(page.locator('#message')).toHaveText('Edited');
  await expect(page.locator('[name="message"]')).toHaveValue('Edited');
  await click('Toggle'); await expect(page.locator('#enabled')).toHaveText('yes');
  await page.getByRole('switch').uncheck(); await expect(page.locator('#enabled')).toHaveText('no');
  await click('Resize'); await expect(page.locator('#message')).toHaveCSS('font-size', '24px');
  await page.locator('[name="optional"]').fill('42'); await expect(page.locator('#optional')).toHaveText('42');
  await click('Clear'); await expect(page.locator('#optional')).toHaveText('');
  await click('Union'); await expect(page.locator('#union')).toHaveText('text');
  await click('Push'); await click('Property'); await expect(page.locator('#property')).toHaveText('4');
  await click('left+'); await click('left+'); await click('right+'); await click('left-');
  await expect(page.locator('#left')).toHaveText('1'); await expect(page.locator('#right')).toHaveText('1');
  expect(await page.evaluate(() => window.stateErrors)).toEqual([]);
  for (const name of ['Invalid count', 'Invalid union', 'Invalid array']) await click(name);
  await expect.poll(() => page.evaluate(() => window.stateErrors.length)).toBe(3);
  for (const error of await page.evaluate(() => window.stateErrors)) expect(error).toContain('State(');
  await expect(page.locator('#count')).toHaveText('3'); await expect(page.locator('#union')).toHaveText('text');
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.locator('#count')).toHaveText('0');
  await expect(page.locator('#left')).toHaveText('0');
  await expect(page.locator('#message')).toHaveText('André');
});
