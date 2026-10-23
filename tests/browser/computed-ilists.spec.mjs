import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/computed-ilists.php'), '--json'], {encoding: 'utf8'}));

test('calculated IList and StateRef closures stay live, scoped and typed', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.listErrors = [];
    for (const name of ['aml:error', 'aml:render-error']) document.addEventListener(name, event => window.listErrors.push(event.detail.error.message), true);
  });
  await page.route('**/calculated-list', route => route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.goto('/calculated-list');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await expect(page.locator('#legacy-collection li[data-aml-list-key="1.5"]')).toHaveText('Legacy');
  await page.getByRole('button', {name: 'Legacy update', exact: true}).click();
  await expect(page.locator('#legacy-collection li[data-aml-list-key="1.5"]')).toHaveText('Compatible');
  const rows = id => page.locator(`#${id} > [data-aml-list-key]`);
  const click = name => page.getByRole('button', {name, exact: true}).click();
  for (const id of ['class-inline', 'class-variable', 'class-loop']) await expect(rows(id)).toHaveText(['Alpha']);
  await expect(rows('class-helper')).toHaveText(['Hi ALPHA']);
  await page.locator('[name="class-query"]').fill('');
  for (const id of ['class-inline', 'class-variable', 'class-loop']) await expect(rows(id)).toHaveText(['Alpha', 'Beta']);
  await expect(rows('class-helper')).toHaveText(['Hi ALPHA', 'Hi BETA']);
  await page.evaluate(() => {window.savedRow = document.querySelector('#class-items > [data-aml-list-key="a"]');});
  await click('Reverse'); await expect(rows('class-items')).toHaveText(['Beta', 'Alpha']);
  expect(await page.evaluate(() => window.savedRow === document.querySelector('#class-items > [data-aml-list-key="a"]'))).toBe(true);
  await click('Update'); await expect(rows('class-helper')).toHaveText(['Hi ALTER', 'Hi BETA']);
  await expect(rows('class-template')).toHaveText(['Alter', 'Beta']);
  await page.evaluate(() => {
    window.listMutations = 0;
    new MutationObserver(records => window.listMutations += records.length).observe(document.querySelector('#class-helper'), {subtree: true, childList: true, characterData: true, attributes: true});
  });
  await click('Unrelated');
  await expect(page.locator('#tick')).toHaveText('1');
  await expect.poll(() => page.evaluate(() => window.listMutations)).toBe(0);

  for (const id of ['one', 'two']) {
    await expect(rows('filtered-' + id)).toHaveText(['Alpha', 'Beta']);
    await expect(rows('mapped-' + id)).toHaveText(['ALPHA', 'BETA']);
    await expect(page.locator('#report-' + id)).toHaveText('Count: 2');
  }
  await click('Append one');
  await expect(rows('filtered-one')).toHaveText(['Alpha', 'Beta', 'New 4']);
  await expect(rows('slice-one')).toHaveText(['New 4']);
  await expect(page.locator('#report-one')).toHaveText('Count: 3');
  await click('Append one');
  await expect(rows('mapped-one')).toHaveText(['ALPHA', 'BETA', 'NEW 4', 'NEW 4']);
  await click('Nested one'); await expect(page.locator('#status-one')).toHaveText(':4');
  await click('Invalid one');
  await expect(page.locator('#status-one')).toHaveText(':4');
  await expect(rows('source-one')).toHaveCount(4);
  expect((await page.evaluate(() => window.listErrors)).length).toBe(1);
  await page.evaluate(() => window.listErrors = []);
  await click('Child one'); await expect(rows('mapped-one')).toHaveText(['CHILD', 'BETA', 'NEW 4', 'NEW 4']);
  await page.locator('[name="query-one"]').fill('new');
  await expect(rows('filtered-one')).toHaveText(['New 4', 'New 4']);
  await expect(rows('mapped-one')).toHaveText(['newCHILD', 'newBETA', 'newNEW 4', 'newNEW 4']);
  await expect(page.locator('#nested-text-one')).toHaveText('newCHILD');
  await page.locator('[name="query-one"]').fill('missing');
  await expect(rows('filtered-one')).toHaveCount(0);
  await expect(page.locator('#filtered-one > [data-aml-list-empty]')).toBeVisible();
  await click('Clear one'); await expect(page.locator('#report-one')).toHaveText('Count: 0');
  await page.locator('[name="query-one"]').fill('');
  await click('Restore one');
  await expect(rows('filtered-one')).toHaveText(['<Restored>']);
  await expect(page.locator('#filtered-one restored')).toHaveCount(0);
  await expect(page.locator('#filtered-one > [data-aml-list-empty]')).toBeHidden();
  await expect(rows('filtered-two')).toHaveText(['Alpha', 'Beta']);
  await expect(page.locator('#status-two')).toHaveText(':0');
  await expect(page.locator('#report-two')).toHaveText('Count: 2');
  expect(await page.evaluate(() => window.listErrors)).toEqual([]);
  for (const [name, mode, message] of [['Bad return', 1, 'must return an array'], ['Duplicate keys', 2, 'Duplicate'], ['Bad label', 3, 'scalar']]) {
    await click(name);
    await expect(rows('after-fault')).toHaveText([String(mode)]);
    await expect(rows('faulty-list')).toHaveText(['Valid']);
    const reported = await page.evaluate(() => window.listErrors);
    expect(reported).toHaveLength(1);
    expect(reported[0]).toContain(message);
    expect(reported[0]).toContain('ComputedILists.php:');
    await page.evaluate(() => window.listErrors = []);
  }
  await click('Recover'); await expect(rows('after-fault')).toHaveText(['0']);
  await expect(rows('faulty-list')).toHaveText(['Valid']);
  expect(await page.evaluate(() => window.listErrors)).toEqual([]);
  expect(errors).toEqual([]);
});
