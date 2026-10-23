import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/functional-views.php'), '--json'], {encoding: 'utf8'}));

test('functional pages and components retain isolated State, effects, props and class interop across navigation', async ({page}) => {
  const pageErrors = []; page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/functional-*', route => {
    const other = new URL(route.request().url()).pathname === '/functional-other';
    return route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><title>${other ? 'Other' : 'Home'}</title>${sample[other ? 'other' : 'home']}${engineTag}`});
  });
  await page.addInitScript(() => {
    window.functionalErrors = [];
    for (const name of ['aml:error', 'aml:render-error', 'aml:navigation-error']) document.addEventListener(name, e => window.functionalErrors.push(e.detail.error.message), true);
  });
  await page.goto('/functional-home');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const click = name => page.getByRole('button', {name, exact: true}).click();
  for (const name of ['left', 'right', 'loop-0', 'loop-1']) await expect(page.locator(`#${name}-mounts`)).toHaveText('1');
  await click('left+'); await click('left+'); await click('right-');
  await expect(page.locator('#left-count')).toHaveText('2'); await expect(page.locator('#right-count')).toHaveText('9');
  await click('loop-0+'); await expect(page.locator('#loop-0-count')).toHaveText('1'); await expect(page.locator('#loop-1-count')).toHaveText('0');
  await page.locator('[name="message"]').fill('Edited');
  for (const id of ['parent-message', 'preview']) await expect(page.locator('#' + id)).toHaveText('Edited');
  await click('Preview'); await expect(page.locator('#parent-message')).toHaveText('Preview');
  await click('Resize'); await expect(page.locator('#parent-message')).toHaveCSS('font-size', '24px');
  await expect(page.locator('#parent-message')).toHaveCSS('color', 'rgb(112, 71, 235)');
  await click('Legacy+'); await expect(page.locator('#legacy-count')).toHaveText('6');
  expect(await page.evaluate(() => window.functionalErrors)).toEqual([]);
  await click('left-invalid'); await expect(page.locator('#left-count')).toHaveText('2');
  await expect.poll(() => page.evaluate(() => window.functionalErrors.length)).toBe(1);
  expect((await page.evaluate(() => window.functionalErrors))[0]).toContain('State(');
  await page.evaluate(() => { window.navigationSentinel = true; window.functionalErrors = []; });
  await page.getByRole('link', {name: 'Other page'}).click();
  await expect(page).toHaveURL(/functional-other$/);
  expect(await page.evaluate(() => window.navigationSentinel)).toBe(true);
  await expect(page.locator('#class-page-mounts')).toHaveText('1');
  await click('class-page+'); await expect(page.locator('#class-page-count')).toHaveText('1');
  await click('Change title');
  for (const id of ['title', 'forwarded-title', 'class-title']) await expect(page.locator('#' + id)).toHaveText('Updated');
  await page.locator('[name="title"]').fill('From form');
  for (const id of ['title', 'forwarded-title', 'class-title']) await expect(page.locator('#' + id)).toHaveText('From form');
  await page.getByRole('link', {name: 'Back home'}).click();
  await expect(page).toHaveURL(/functional-home$/);
  await expect(page.locator('#left-count')).toHaveText('0');
  await expect(page.locator('#parent-message')).toHaveText('André');
  for (const name of ['left', 'right', 'loop-0', 'loop-1']) await expect(page.locator(`#${name}-mounts`)).toHaveText('1');
  expect(await page.evaluate(() => window.navigationSentinel)).toBe(true);
  expect(await page.evaluate(() => window.functionalErrors)).toEqual([]);
  expect(pageErrors).toEqual([]);
});
