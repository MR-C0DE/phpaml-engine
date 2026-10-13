import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/browser-fixture.php');
});

test('updates local state without a page reload', async ({ page }) => {
  const navigation = page.waitForEvent('framenavigated', { timeout: 500 }).catch(() => null);
  await page.locator('#increment-b').click();
  await expect(page.locator('#root-b output[data-aml-bind="counter"]')).toHaveText('1');
  await expect(page.locator('#counter-progress')).toHaveJSProperty('value', 1);
  expect(await navigation).toBeNull();
});

test('evaluates safe arithmetic state expressions', async ({ page }) => {
  const counter = page.locator('#root-b output[data-aml-bind="counter"]');

  await page.locator('#expression-add').click();
  await expect(counter).toHaveText('1');
  await expect(page.locator('#counter-progress')).toHaveJSProperty('value', 1);

  await page.locator('#expression-subtract').click();
  await expect(counter).toHaveText('0');
  await expect(page.locator('#counter-progress')).toHaveJSProperty('value', 0);
});

test('executes reactive foreach actions with conditions, continue and break', async ({ page }) => {
  await page.locator('#foreach-total').click();
  await expect(page.locator('#foreach-result')).toHaveText('3');
});

test('executes nested reactive foreach actions with isolated loop control', async ({ page }) => {
  await page.locator('#nested-foreach-total').click();
  await expect(page.locator('#nested-foreach-result')).toHaveText('100');
});

test('filters maps and reduces reactive collections', async ({ page }) => {
  await page.locator('#transform-collections').click();
  await expect(page.locator('#collection-names')).toContainText('André');
  await expect(page.locator('#collection-names')).not.toContainText('Marie');
  await expect(page.locator('#collection-total')).toHaveText('14');
});

test('sorts state collections with sort and usort expressions', async ({ page }) => {
  await page.locator('#sort-collections').click();
  await expect(page.locator('#sorted-numbers')).toHaveText('1210');
  await expect(page.locator('#sorted-users')).toHaveText('AndréMarie');
});

test('updates and removes precise nested collection values', async ({ page }) => {
  await page.locator('#mutate-nested-collection').click();
  await expect(page.locator('#editable-users')).toHaveText('AndréAlex');
  await expect(page.locator('#editable-users span')).toHaveCount(2);
  await expect(page.locator('#editable-score')).toHaveText('3');
});

test('reverses slices and merges collections in the rendered interface', async ({ page }) => {
  await page.locator('#project-collections').click();
  await expect(page.locator('#reversed-items')).toHaveText('4321');
  await expect(page.locator('#sliced-items')).toHaveText('23');
  await expect(page.locator('#merged-items')).toHaveText('123456');
});

test('reads nested collection state in assignments calculations and conditions', async ({ page }) => {
  await page.locator('#read-nested-state').click();
  await expect(page.locator('#read-name')).toHaveText('André');
  await expect(page.locator('#read-total')).toHaveText('5');
  await expect(page.locator('#read-status')).toHaveText('active');
});

test('writes resolved values to the browser console', async ({ page }) => {
  const message = page.waitForEvent('console');
  await page.locator('#console-log').click();
  expect((await message).text()).toBe('Count 0');
});

test('handles keyboard mouse and drag events with browser event data', async ({ page }) => {
  await page.locator('#keyboard-event').press('A');
  await expect(page.locator('#last-key')).toHaveText('A');

  await page.locator('#mouse-event').hover();
  await expect(page.locator('#hovered')).toHaveText('true');
  await page.locator('#keyboard-event').hover();
  await expect(page.locator('#hovered')).toHaveText('false');

  await page.locator('#drag-source').dragTo(page.locator('#drop-target'));
  await expect(page.locator('#drag-status')).toHaveText('dropped');
});

test('runs the minified versioned runtime', async ({ page }) => {
  await page.goto('/browser-fixture.php?minified=1');
  await page.locator('#increment-b').click();
  await expect(page.locator('#root-b output[data-aml-bind="counter"]')).toHaveText('1');
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

test('tracks native forms and controls allowlisted element refs', async ({ page }) => {
  const root = page.locator('#root-hooks');
  await expect(root.locator('[data-aml-bind="form.invalid"]')).toHaveText('true');
  await page.locator('#focus-tracked').click();
  await expect(page.locator('#tracked-name')).toBeFocused();
  await page.locator('#tracked-name').fill('André');
  await expect(root.locator('[data-aml-bind="form.dirty"]')).toHaveText('true');
  await page.locator('#tracked-name').blur();
  await expect(root.locator('[data-aml-bind="form.touched"]')).toHaveText('true');
  await page.getByRole('button', {name: 'Submit tracked form'}).click();
  await expect(root.locator('[data-aml-bind="form.submitted"]')).toHaveText('true');
  await expect(root.locator('[data-aml-bind="name"]')).toHaveText('saved');
  await page.locator('#reset-tracked').click();
  await expect(root.locator('[data-aml-bind="form.dirty"]')).toHaveText('false');
  await expect(root.locator('[data-aml-bind="form.submitted"]')).toHaveText('false');
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
