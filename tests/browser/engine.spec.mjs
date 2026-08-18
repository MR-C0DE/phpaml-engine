import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/browser-fixture.php');
});

test('updates local state without a page reload', async ({ page }) => {
  const navigation = page.waitForEvent('framenavigated', { timeout: 500 }).catch(() => null);
  await page.locator('#increment-b').click();
  await expect(page.locator('#root-b output[data-aml-bind="counter"]')).toHaveText('1');
  expect(await navigation).toBeNull();
});

test('commits rich transactions atomically', async ({ page }) => {
  await page.locator('#run-transaction').click();
  await expect(page.locator('[data-aml-bind="profile.name"]')).toHaveText('Updated');
  await expect(page.locator('[data-aml-bind="profile.address.country"]')).toHaveText('Canada');
  await expect(page.locator('#transaction-count')).toHaveText('1');
});

test('sends and renews the CSRF token for mutations', async ({ page }) => {
  await page.locator('#csrf-request').click();
  await expect(page.locator('#csrf-status')).toHaveText('fixture-browser-token');
  await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute('content', 'renewed-browser-token');
});
