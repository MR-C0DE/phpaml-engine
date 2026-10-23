import {execFileSync} from 'node:child_process';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/styles.php'), '--json'], {encoding: 'utf8'}));

test('Style APIs preserve CSS scope, composition, interaction, templates and navigation', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/styles-fixture', route => route.fulfill({contentType: 'text/html',
    headers: {'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'unsafe-inline'"},
    body: `<!doctype html><html><meta charset="utf-8"><main data-aml-client>${sample.html}<a href="/styles-empty">Leave styles</a></main>${engineTag}</html>`}));
  await page.route('**/styles-empty', route => route.fulfill({contentType: 'text/html',
    body: `<!doctype html><html><main data-aml-client><span class="title" id="empty-title">Empty</span><a href="/styles-fixture">Return to styles</a></main>${engineTag}</html>`}));
  await page.goto('/styles-fixture');
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const sheets = await page.locator('style[data-aml-style]').count();
  await expect(page.locator('#direct')).toHaveCSS('padding-top', '16px');
  await expect(page.locator('#direct')).toHaveCSS('font-size', '24px');
  await expect(page.locator('#inline')).toHaveCSS('font-weight', '700');
  await expect(page.locator('#named')).toHaveCSS('font-size', '28px');
  await expect(page.locator('#named')).toHaveCSS('line-height', '42px');
  await expect(page.locator('#named')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(page.locator('#first')).toHaveCSS('color', 'rgb(0, 0, 255)');
  await expect(page.locator('#second')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(page.locator('#original')).toHaveCSS('background-color', 'rgb(112, 71, 235)');
  await expect(page.locator('#variant')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('#home-title')).toHaveCSS('color', 'rgb(10, 20, 30)');
  await expect(page.locator('#other-title')).toHaveCSS('color', 'rgb(100, 110, 120)');
  await expect(page.locator('#plain')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('#home-container')).toHaveCSS('align-items', 'flex-start');
  await expect(page.locator('#module-button')).toHaveCSS('border-radius', '10px');
  await expect(page.locator('#module-button')).toHaveCSS('animation-name', /aml-m-.*-kf-reveal/);
  await page.locator('#save').hover();
  await expect(page.locator('#save')).toHaveCSS('background-color', 'rgb(86, 50, 189)');
  await expect(page.locator('#continue')).toHaveCSS('background-color', 'rgb(112, 71, 235)');
  await page.locator('#save').click();
  await expect(page.locator('#count')).toHaveText('1');
  await page.locator('#module-button').focus();
  await expect(page.locator('#module-button')).toHaveCSS('outline-color', 'rgb(0, 100, 200)');
  await page.locator('#toggle').click();
  await expect(page.locator('#conditional')).toHaveCSS('color', 'rgb(0, 128, 0)');
  await page.setViewportSize({width: 375, height: 812});
  await expect(page.locator('#home-container')).toHaveCSS('padding-top', '12px');
  await page.setViewportSize({width: 1280, height: 900});
  await expect(page.locator('#home-container')).toHaveCSS('padding-top', '24px');
  await page.evaluate(() => { window.stylesDocument = true; });
  for (let i = 0; i < 2; i++) {
    await page.getByRole('link', {name: 'Leave styles'}).click();
    await expect(page.locator('#empty-title')).toBeVisible();
    await expect(page.locator('style[data-aml-style]')).toHaveCount(0);
    await expect(page.locator('#empty-title')).toHaveCSS('color', 'rgb(0, 0, 0)');
    await page.getByRole('link', {name: 'Return to styles'}).click();
    await expect(page.locator('#home-title')).toHaveCSS('color', 'rgb(10, 20, 30)');
    await expect(page.locator('style[data-aml-style]')).toHaveCount(sheets);
    await expect(page.locator('#count')).toHaveText('0');
    expect(await page.evaluate(() => window.stylesDocument)).toBe(true);
  }
  expect(errors).toEqual([]);
});
