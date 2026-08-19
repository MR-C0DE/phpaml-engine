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

test('updates keyed collections without reloading the page', async ({ page }) => {
  const navigation = page.waitForEvent('framenavigated', { timeout: 500 }).catch(() => null);
  await page.getByRole('button', { name: 'Add dynamic first' }).click();
  await page.getByRole('button', { name: 'Add dynamic second' }).click();
  await expect(page.locator('#root-h li')).toHaveCount(2);
  await expect(page.locator('#root-h li').first()).toContainText('First');
  await page.locator('#remove-dynamic-first').click();
  await expect(page.locator('#root-h li')).toHaveCount(1);
  await expect(page.locator('#root-h li').first()).toContainText('Second');
  expect(await navigation).toBeNull();
});

test('exposes loading, success and error states for effects', async ({ page }) => {
  await page.locator('#api-first').click();
  await expect(page.locator('#root-l [data-aml-bind="apiLoading"]')).toHaveText('true');
  await page.locator('#api-second').click();
  await expect(page.locator('#root-l [data-aml-bind="apiResult"]')).toHaveText('second');
  await expect(page.locator('#root-l [data-aml-bind="apiLoading"]')).toHaveText('false');
  await page.locator('#api-failure').click();
  await expect(page.locator('#effect-api-errors')).toHaveText('1');
  await expect(page.locator('#root-l [data-aml-bind="apiError"]')).not.toHaveText('');
});

test('drives rich components from declarative state', async ({ page }) => {
  await page.locator('#open-rich-modal').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close rich modal' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  await page.getByRole('tab', { name: 'Settings' }).click();
  await expect(page.getByText('Settings panel')).toBeVisible();
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText('Accordion content')).toBeVisible();
});

test('changes themes and navigates without replacing the document', async ({ page }) => {
  await page.goto('/navigation-fixture.php?page=home');
  const documentId = await page.locator('html').getAttribute('data-document-id');
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('link', { name: 'Account' }).click();
  await expect(page.getByRole('heading', { name: 'Page account' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-document-id', documentId ?? '');
});

test('renders navigation loading, not-found and error boundaries', async ({ page }) => {
  await page.goto('/navigation-fixture.php?page=home');
  await page.getByRole('link', { name: 'Slow' }).click();
  await expect(page.getByText('Loading route')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page slow' })).toBeVisible();

  await page.getByRole('link', { name: 'Missing' }).click();
  await expect(page.getByText('Route missing')).toBeVisible();

  await page.goto('/navigation-fixture.php?page=home');
  await page.getByRole('link', { name: 'Failure' }).click();
  await expect(page.getByText('Route failed')).toBeVisible();
});
