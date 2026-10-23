import {execFileSync} from 'node:child_process';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/style-conditions.php'), '--json'], {encoding: 'utf8'}));
test.beforeEach(async ({page}) => {
  await page.route('**/style-conditions', route => route.fulfill({contentType: 'text/html', body: `<!doctype html><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.goto('/style-conditions');
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.evaluate(() => {
    window.styleErrors = [];
    window.addEventListener('error', e => window.styleErrors.push(e.message));
    document.addEventListener('aml:render-error', e => window.styleErrors.push(e.detail.error.message), true);
  });
});

test('supports, range media, named containers and CSS modules preserve scope and State', async ({page}) => {
  await expect(page.locator('#supports-yes')).toHaveCSS('color', 'rgb(112, 71, 235)');
  await expect(page.locator('#supports-no')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('#media-range')).toHaveCSS('color', 'rgb(112, 71, 235)');
  await expect(page.locator('#container-text')).toHaveCSS('font-size', '16px');
  await expect(page.locator('#module-conditions')).toHaveCSS('color', 'rgb(1, 2, 3)');
  await expect.poll(() => page.locator('#module-conditions').evaluate(node => getComputedStyle(node, '::after').content)).toBe('" Local"');
  await page.locator('#change-conditions').click();
  await expect(page.locator('#supports-yes')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(page.locator('#query-panel')).toHaveCSS('width', '600px');
  await expect(page.locator('#container-text')).toHaveCSS('font-size', '28px');
  await expect(page.locator('#container-text')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await page.setViewportSize({width: 375, height: 812});
  await expect(page.locator('#media-range')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('#module-conditions')).toHaveCSS('color', 'rgb(0, 0, 0)');
  // A size query depends on the ancestor, independently of the viewport.
  await expect(page.locator('#container-text')).toHaveCSS('font-size', '28px');
  await page.setViewportSize({width: 1280, height: 900});
  await expect(page.locator('#media-range')).toHaveCSS('color', 'rgb(220, 38, 38)');
  expect(await page.evaluate(() => window.styleErrors)).toEqual([]);
});

test('native form states, pseudo elements and isolated keyframes follow reactive values', async ({page}) => {
  const sheets = await page.locator('style[data-aml-style]').count();
  await page.evaluate(() => { window.originalAnimated = document.getElementById('animated'); });
  const pseudo = (id, selector, property) => page.locator('#' + id).evaluate((node, [selector, property]) => getComputedStyle(node, selector)[property], [selector, property]);
  const expectPlaceholder = async color => {
    const field = page.locator('#valid-state');
    await field.evaluate(node => node.blur());
    const actual = await field.screenshot({caret: 'hide'});
    // WebKit returns the input's style from getComputedStyle(::placeholder).
    // Compare pixels with an explicit reference rule, then prove black differs.
    const reference = await page.addStyleTag({content: `#valid-state::placeholder {color:${color} !important}`});
    try {
      expect(actual.equals(await field.screenshot({caret: 'hide'}))).toBe(true);
      await reference.evaluate(node => { node.textContent = '#valid-state::placeholder {color:black !important}'; });
      expect(actual.equals(await field.screenshot({caret: 'hide'}))).toBe(false);
    } finally { await reference.evaluate(node => node.remove()); }
  };
  await expect.poll(() => pseudo('pseudo-content', '::before', 'content')).toBe('"Before "');
  await expect.poll(() => pseudo('pseudo-content', '::after', 'content')).toBe('" After"');
  await expect.poll(() => pseudo('pseudo-content', '::before', 'color')).toBe('rgb(112, 71, 235)');
  await expect(page.locator('#first-item')).toHaveCSS('font-weight', '700');
  await expect(page.locator('#second-item')).toHaveCSS('color', 'rgb(112, 71, 235)');
  await expect(page.locator('#last-item')).toHaveCSS('text-decoration-line', 'underline');
  await expect(page.locator('#check-state')).toHaveCSS('outline-color', 'rgb(0, 0, 0)');
  await page.locator('#check-state').check();
  await expect(page.locator('#check-state')).toHaveCSS('outline-color', 'rgb(112, 71, 235)');
  await expect(page.locator('#valid-state')).toHaveCSS('outline-color', 'rgb(255, 0, 0)');
  await expectPlaceholder('rgb(112, 71, 235)');
  await page.locator('#valid-state').fill('Valid');
  await expect(page.locator('#valid-state')).toHaveCSS('outline-color', 'rgb(0, 128, 0)');
  await page.locator('#focus-input').focus();
  await expect(page.locator('#focus-group')).toHaveCSS('outline-color', 'rgb(0, 0, 255)');
  await expect(page.locator('#animated')).toHaveCSS('opacity', '0.6');
  await expect(page.locator('#other-animated')).toHaveCSS('opacity', '0.9');
  const names = await page.locator('#animated, #other-animated').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).animationName));
  expect(names[0]).toMatch(/^aml-s-[a-f0-9]+-kf-pulse$/);
  expect(names[1]).not.toBe(names[0]);
  await page.locator('#change-conditions').click();
  await expect.poll(() => pseudo('pseudo-content', '::before', 'color')).toBe('rgb(220, 38, 38)');
  await expect.poll(() => pseudo('pseudo-content', '::after', 'color')).toBe('rgb(220, 38, 38)');
  await expect.poll(() => pseudo('nested', '::before', 'color')).toBe('rgb(220, 38, 38)');
  await page.locator('#valid-state').fill('');
  await expectPlaceholder('rgb(220, 38, 38)');
  await expect(page.locator('#check-state')).toHaveCSS('outline-color', 'rgb(220, 38, 38)');
  await expect(page.locator('#second-item')).toHaveCSS('color', 'rgb(220, 38, 38)');
  await expect(page.locator('#animated')).toHaveCSS('opacity', '0.8');
  await expect(page.locator('#other-animated')).toHaveCSS('opacity', '0.9');
  await page.locator('#check-state').uncheck();
  await expect(page.locator('#check-state')).toHaveCSS('outline-color', 'rgb(0, 0, 0)');
  await expect(page.locator('style[data-aml-style]')).toHaveCount(sheets);
  expect(await page.evaluate(() => window.originalAnimated === document.getElementById('animated'))).toBe(true);
  expect(await page.evaluate(() => window.styleErrors)).toEqual([]);
});
