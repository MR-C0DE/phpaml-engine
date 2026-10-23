import {execFileSync} from 'node:child_process';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {verifyStyleFinalization} from './style-finalization-checks.mjs';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/style-finalization.php'), '--json'], {encoding: 'utf8'}));
test('CSS declaration priority, clearing, composition and error recovery agree before and after mount', async ({page}) => {
  await page.route('**/style-finalization', route => route.fulfill({contentType: 'text/html', body: `<!doctype html><main data-aml-client>${sample.html}</main>`}));
  await page.goto('/style-finalization');
  await expect(page.locator('#final-priority')).toHaveCSS('color', 'rgb(255, 0, 0)');
  await expect(page.locator('#final-priority')).toHaveCSS('width', '140px');
  await expect(page.locator('#final-initial-binding')).toHaveCSS('color', await page.locator('#final-initial-reference').evaluate(node => getComputedStyle(node).color));
  await page.evaluate(tag => document.body.insertAdjacentHTML('beforeend', tag.replace('<script', '<template').replace('</script>', '</template>')), engineTag);
  await page.evaluate(() => {
    const tag = document.querySelector('template[data-aml-engine]'); const script = document.createElement('script');
    for (const attr of tag.attributes) script.setAttribute(attr.name, attr.value);
    tag.replaceWith(script);
  });
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await verifyStyleFinalization(page, expect);
});
