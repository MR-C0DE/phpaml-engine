import {test, expect} from './runtime-test.mjs';
import {engineTag} from './test-environment.mjs';

const serve = page => page.route('**/security-draft', route => route.fulfill({
  contentType: 'text/html',
  headers: {'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'"},
  body: `<!doctype html><meta charset="utf-8"><main data-aml-client>
    <template data-aml-state='{}'></template>
    <form id="draft" data-aml-form-preserve="security-draft">
      <input name="name" aria-label="Name">
      <input type="password" name="password" value="synthetic-password">
      <input type="hidden" name="csrf" value="fresh-synthetic-token">
      <input name="otp" autocomplete="one-time-code" value="synthetic-otp">
      <input name="card" autocomplete="section-payment cc-number" value="synthetic-card">
      <input name="privateNote" autocomplete="off" value="synthetic-private">
      <input name="mixed" value="ordinary"><input type="password" name="mixed" value="synthetic-secret">
    </form>
    <input form="draft" type="password" name="external" value="synthetic-external">
    <form data-aml-form-preserve="off-draft" autocomplete="off"><input name="private" aria-label="Private"></form>
  </main>${engineTag}`,
}));
const ready = page => expect(page.locator('main')).toHaveAttribute('data-aml-engine-mounted', 'true');

test('security: form drafts exclude credentials, hidden fields and privacy opt-outs', async ({page}) => {
  await serve(page); await page.goto('/security-draft'); await ready(page);
  await page.getByRole('textbox', {name: 'Name', exact: true}).fill('André');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('phpaml.form.security-draft')))).toEqual({name: 'André'});
  await page.getByRole('textbox', {name: 'Private', exact: true}).fill('synthetic');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('phpaml.form.off-draft')))).toEqual({});
});

test('security: legacy drafts cannot restore secrets or replace current hidden values', async ({page}) => {
  await page.addInitScript(() => sessionStorage.setItem('phpaml.form.security-draft', JSON.stringify({
    name: 'André', password: 'old-synthetic-password', csrf: 'old-synthetic-token',
    otp: 'old-code', card: 'old-card', privateNote: 'old-private', external: 'old-external', mixed: 'old-mixed',
  })));
  await serve(page); await page.goto('/security-draft'); await ready(page);
  await expect(page.getByRole('textbox', {name: 'Name', exact: true})).toHaveValue('André');
  await expect(page.locator('[name="password"]')).toHaveValue('synthetic-password');
  await expect(page.locator('[name="csrf"]')).toHaveValue('fresh-synthetic-token');
  await expect(page.locator('[name="external"]')).toHaveValue('synthetic-external');
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('phpaml.form.security-draft')))).toEqual({name: 'André'});
});
