import {execFileSync} from 'node:child_process';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

test('removing a CSS import removes its visual effect while retaining the CSS file', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let imported = true;
  await page.route('**/stylesheet-imports', route => {
    const html = execFileSync(process.env.PHP_BINARY || 'php', [
      viewFile('tests/stylesheet-imports.php'), '--html', ...(imported ? [] : ['--without-import']),
    ], {encoding: 'utf8'});
    return route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><main data-aml-client>${html}</main>${engineTag}`});
  });
  await page.goto('/stylesheet-imports');
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await expect(page.locator('#css-probe')).toHaveCSS('color', 'rgb(1, 2, 3)');
  imported = false;
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await expect(page.locator('#css-probe')).toHaveCSS('color', 'rgb(0, 0, 0)');
  imported = true;
  await page.reload();
  await expect(page.locator('#css-probe')).toHaveCSS('color', 'rgb(1, 2, 3)');
  expect(errors).toEqual([]);
});
