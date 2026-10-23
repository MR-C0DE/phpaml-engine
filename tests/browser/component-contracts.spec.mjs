import {execFileSync} from 'node:child_process';
import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

const html = execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/component-contracts.php'), '--html'], {encoding: 'utf8'});
test.beforeEach(async ({page}) => {
  await page.route('**/component-contracts', route => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'; style-src 'unsafe-inline'"}, body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${html}</main>${engineTag}`}));
  await page.goto('/component-contracts');
  await expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');
});

test('loading labels preserve reactive children, remain text and restore after a request', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/component-audit', async route => { await gate; await route.fulfill({json: 'done'}); });
  const button = page.locator('#request');
  await button.click();
  await expect(button).toHaveAccessibleName('<Loading>');
  await expect(button).toBeDisabled();
  await page.locator('#change-name').click();
  await expect(button).toBeDisabled();
  await expect(button.locator('loading')).toHaveCount(0);
  release();
  await expect(page.locator('#reply')).toHaveText('done');
  await expect(button).toHaveAccessibleName('Save Marie');
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute('aria-busy');
  await expect(button.locator('strong')).toHaveCount(1);
});

test('request completion preserves a disabledWhen rule changed in flight', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/component-audit', async route => { await gate; await route.fulfill({json: 'done'}); });
  await page.locator('#request').click();
  await expect(page.locator('#request')).toHaveAttribute('aria-busy', 'true');
  await page.locator('#blocked').check();
  release();
  await expect(page.locator('#reply')).toHaveText('done');
  await expect(page.locator('#request')).toBeDisabled();
  await page.locator('#blocked').uncheck();
  await expect(page.locator('#request')).toBeEnabled();
});

test('failed requests restore labels and allow retry', async ({page}) => {
  await page.route('**/api/component-audit', route => route.fulfill({status: 422, json: {message: 'Rejected'}}));
  await page.locator('#request').click();
  await expect(page.locator('#request-error')).toHaveText('Rejected');
  await expect(page.locator('#request')).toHaveAccessibleName('Save Andre');
  await expect(page.locator('#request')).toBeEnabled();
  await expect(page.locator('#request')).not.toHaveAttribute('aria-busy');
});

test('overlapping work keeps feedback until the last request finishes', async ({page}) => {
  const releases = [];
  await page.route('**/api/component-audit', async route => {
    await new Promise(resolve => releases.push(resolve));
    await route.fulfill({json: 'done'});
  });
  await page.locator('#request').click();
  // Explicit dispatch models overlapping callers; physical clicks stay disabled.
  await page.locator('#request').dispatchEvent('click');
  await expect.poll(() => releases.length).toBe(2);
  releases[0]();
  await expect(page.locator('#reply')).toHaveText('done');
  await expect(page.locator('#request')).toHaveAccessibleName('<Loading>');
  await expect(page.locator('#request')).toBeDisabled();
  releases[1]();
  await expect(page.locator('#request')).toHaveAccessibleName('Save Andre');
  await expect(page.locator('#request')).toBeEnabled();
});

test('form submission applies loading feedback to its submitter', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/component-audit', async route => { await gate; await route.fulfill({json: 'submitted'}); });
  await page.locator('#submit-request').click();
  await expect(page.locator('#submit-request')).toHaveAccessibleName('Submitting');
  await expect(page.locator('#submit-request')).toBeDisabled();
  release();
  await expect(page.locator('#reply')).toHaveText('submitted');
  await expect(page.locator('#submit-request')).toHaveAccessibleName('Submit request');
  await expect(page.locator('#submit-request')).toBeEnabled();
});

test('select values and radio bindings keep option identity in both directions', async ({page}) => {
  await expect(page.locator('#static-select')).toHaveValue('b');
  await expect(page.locator('#radio-a')).toHaveValue('a');
  await expect(page.locator('#radio-b')).toBeChecked();
  await page.locator('#radio-a').check();
  await expect(page.locator('#choice-select')).toHaveValue('a');
  await expect(page.locator('#choice-text')).toHaveText('a');
  await page.locator('#choice-select').selectOption('b');
  await expect(page.locator('#radio-b')).toBeChecked();
  await page.locator('#choose-alpha').click();
  await expect(page.locator('#radio-a')).toBeChecked();
  await expect(page.locator('#radio-b')).toHaveValue('b');
});

test('multiple selects read and render all selected values', async ({page}) => {
  await expect(page.locator('#multi')).toHaveValues(['b']);
  await page.locator('#choose-both').click();
  await expect(page.locator('#multi')).toHaveValues(['a', 'b']);
  await page.locator('#multi').selectOption(['a']);
  await expect.poll(() => page.locator('main').evaluate(root => AMLEngine.inspect(root).choices)).toEqual(['a']);
});

test('nested visibility and disabledWhen cannot re-enable each other', async ({page}) => {
  const input = page.locator('#nested');
  await page.locator('#visible').uncheck();
  await page.locator('#blocked').check();
  await page.locator('#blocked').uncheck();
  await expect(input).toBeDisabled();
  await page.locator('#inner-visible').uncheck();
  await page.locator('#visible').check();
  await expect(input).toBeDisabled();
  await page.locator('#inner-visible').check();
  await expect(input).toBeEnabled();
  await page.locator('#blocked').check();
  await page.locator('#visible').uncheck();
  await page.locator('#visible').check();
  await expect(input).toBeDisabled();
});

test('validation preserves help, distinguishes repeated names and ignores disabled fieldsets', async ({page}) => {
  const excluded = [];
  await page.route('**/api/excluded-validation', route => { excluded.push(route.request().url()); return route.fulfill({json: {valid: false}}); });
  await page.locator('#validate').click();
  await expect(page.locator('#required-a')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#required-b')).toHaveAttribute('aria-invalid', 'true');
  const first = (await page.locator('#required-a').getAttribute('aria-describedby')).split(' ');
  const second = (await page.locator('#required-b').getAttribute('aria-describedby')).split(' ');
  expect(first).toContain('field-help');
  expect(first.filter(id => id !== 'field-help')).not.toEqual(second);
  await expect(page.locator('[data-aml-validation-for]')).toHaveCount(2);
  await page.locator('#required-a').fill('A');
  await page.locator('#required-b').fill('B');
  await page.locator('#validate').click();
  await expect(page.locator('#submitted')).toHaveText('1');
  await expect(page.locator('#required-a')).toHaveAttribute('aria-describedby', 'field-help');
  await expect(page.locator('[data-aml-validation-for]')).toHaveCount(0);
  expect(excluded).toEqual([]);
});

test('native range, step, pattern and required radio rules are enforced by Form', async ({page}) => {
  await page.locator('#constraints-submit').click();
  await expect(page.locator('#bounded')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#pattern')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#required-radio-a')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#submitted')).toHaveText('0');
  await page.locator('#bounded').fill('3');
  await page.locator('#pattern').fill('AB');
  await page.locator('#required-radio-b').check();
  await page.locator('#constraints-submit').click();
  await expect(page.locator('#bounded')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#pattern')).toHaveAttribute('aria-invalid', 'false');
  await expect(page.locator('#required-radio-a')).toHaveAttribute('aria-invalid', 'false');
  await page.locator('#bounded').fill('4');
  await page.locator('#constraints-submit').click();
  await expect(page.locator('#submitted')).toHaveText('1');
});

test('file loading shares button feedback and restores the latest disabled rule', async ({page}) => {
  await page.evaluate(() => {
    const NativeReader = window.FileReader;
    window.FileReader = class extends NativeReader {
      readAsArrayBuffer(file) { window.finishRead = () => super.readAsArrayBuffer(file); }
    };
  });
  await page.locator('#local-file').setInputFiles({name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('Local text')});
  await page.locator('#read-file').click();
  await expect(page.locator('#read-file')).toHaveAccessibleName('Reading');
  await page.locator('#blocked').check();
  await page.evaluate(() => window.finishRead());
  await expect(page.locator('#file-text')).toHaveText('Local text');
  await expect(page.locator('#read-file')).toHaveAccessibleName('Read');
  await expect(page.locator('#read-file')).toBeDisabled();
});

test('ordinary text, links, inputs and containers retain their existing behavior', async ({page}) => {
  await page.locator('#name-input').fill('<Andre & Marie>');
  await expect(page.locator('#name-text')).toHaveText('<Andre & Marie>');
  await expect(page.locator('#name-area')).toHaveValue('<Andre & Marie>');
  await expect(page.locator('#name-link')).toHaveText('<Andre & Marie>');
  await expect(page.locator('#button-value')).toHaveJSProperty('value', '<Andre & Marie>');
  await expect(page.locator('#button-value')).toHaveText('Keep this label');
  await expect(page.locator('#name-link')).toHaveAttribute('data-aml-native-navigation', 'true');
  await expect(page.locator('#layout')).toHaveCSS('gap', '8px');
  await expect(page.locator('#layout')).toHaveCSS('padding', '4px');
});
