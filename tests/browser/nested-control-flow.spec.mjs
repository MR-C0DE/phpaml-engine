import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

const sample = JSON.parse(process.env.PHPAML_NESTED_SAMPLES ? readFileSync(process.env.PHPAML_NESTED_SAMPLES, 'utf8') : execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/nested-control-flow.php'), '--json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
if (sample.diagnostics.length || !sample.cases.length) throw new Error('Nested control-flow fixtures did not compile: ' + JSON.stringify(sample.diagnostics));
const attribute = value => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

for (const entry of sample.cases) {
  test(entry.name, async ({page}) => {
    expect(entry.viewPass, JSON.stringify(entry.viewError)).toBe(true);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.nestedErrors = [];
      document.addEventListener('aml:error', ({detail: {error}}) => nestedErrors.push({code: error.code, source: error.source, message: error.message, limitKind: error.limitKind}), true);
    });
    await page.route('**/nested-control-test', route => route.fulfill({contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><main data-aml-client>
      <template data-aml-state="${attribute(entry.initial)}" data-aml-state-config="${attribute(entry.config)}"></template>
      <button data-aml-client-click="${attribute(entry.action)}">Run</button>
      <button data-aml-client-click="${attribute(entry.recovery)}">Recover</button>
      <output data-aml-bind="counter"></output>
      </main>${engineTag}`}));
    await page.goto('/nested-control-test');
    await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
    const state = () => page.evaluate(() => AMLEngine.inspect(document.querySelector('main')));
    await page.getByRole('button', {name: 'Run', exact: true}).click();
    if (entry.limit) {
      await expect.poll(() => page.evaluate(() => nestedErrors.length)).toBe(1);
      const error = await page.evaluate(() => nestedErrors[0]);
      expect(error.code).toBe('PHP_LOOP_LIMIT'); expect(error.source.line).toBeGreaterThan(0);
      expect(error.limitKind).toBe(entry.limitKind); expect(error.message).toContain(entry.limitMessage);
      expect(error.message).toContain(`[PHP ${error.source.file}:${error.source.line}]`);
    }
    await expect.poll(state).toEqual(entry.limit ? entry.initial : entry.expected);
    await expect(page.locator('output')).toHaveText(String(entry.limit ? 0 : entry.expected.counter));
    await page.getByRole('button', {name: 'Recover', exact: true}).click();
    await expect(page.locator('output')).toHaveText('42');
    expect(await page.evaluate(() => nestedErrors.length)).toBe(entry.limit ? 1 : 0);
    expect(errors).toEqual([]);
  });
}
