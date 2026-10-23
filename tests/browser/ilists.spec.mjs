import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/ilists.php'), '--json'], {encoding: 'utf8'}));

test('IList preserves native semantics, State identity, row content, empty state and sorting', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.listErrors = [];
    for (const name of ['aml:error', 'aml:render-error']) document.addEventListener(name, event => window.listErrors.push(event.detail.error.message), true);
  });
  await page.route('**/ilist-demo', route => route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.goto('/ilist-demo');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const click = name => page.getByRole('button', {name, exact: true}).click();
  const rows = id => page.locator(`#${id} > [data-aml-list-key]`);

  await expect(page.locator('ul#static-default > li')).toHaveText(['One', 'Two', 'Three']);
  await expect(page.locator('li > li')).toHaveCount(0);
  await expect(page.locator('ol#numbered')).toHaveAttribute('start', '5');
  await expect(page.locator('#numbered')).toHaveAttribute('reversed', '');
  await expect(page.locator('#numbered')).toHaveCSS('list-style-type', 'upper-roman');
  await expect(page.locator('#numbered')).toHaveCSS('list-style-position', 'inside');
  await expect(page.locator('#custom-records')).toHaveAttribute('role', 'list');
  await expect(page.locator('#custom-records')).toHaveCSS('list-style-type', 'none');
  for (const id of ['scalar-plain', 'scalar-custom']) await expect(rows(id)).toHaveText(['<safe>', '{literal}', '1', '', '0', '']);
  await expect(page.locator('ul[data-aml-list]:not([id]) > li')).toHaveText(['<safe>', '{literal}', '1', '', '0', '']);
  await expect(page.locator('#static-empty > li')).toBeVisible();
  await expect(page.locator('#records > [data-aml-list-empty]')).toBeHidden();

  await click('Append name');
  for (const id of ['natural-list', 'natural-items', 'names']) await expect(rows(id)).toHaveText(['André', 'Marie', 'Alice']);
  await click('Color'); await expect(page.locator('#natural-list')).toHaveCSS('color', 'rgb(0, 128, 0)');
  await expect(page.locator('#names')).toHaveAttribute('start', '3');
  await expect(page.locator('#names')).toHaveAttribute('reversed', '');

  await page.evaluate(() => { window.firstListNode = document.querySelector('#records > [data-aml-list-key="a"]'); });
  await click('Append record');
  await expect(rows('records')).toHaveText(['André', 'Marie', 'User 3']);
  await expect(rows('custom-records')).toHaveText(['Name:André', 'Name:Marie', 'Name:User 3']);
  await click('Update record');
  await expect(rows('records')).toHaveText(['<Updated>', 'Marie', 'User 3']);
  await expect(rows('custom-records')).toHaveText(['Name:<Updated>', 'Name:Marie', 'Name:User 3']);
  await expect(page.locator('#records script, #custom-records script')).toHaveCount(0);
  await click('Reverse records');
  await expect(rows('records')).toHaveText(['User 3', 'Marie', '<Updated>']);
  expect(await page.evaluate(() => window.firstListNode === document.querySelector('#records > [data-aml-list-key="a"]'))).toBe(true);
  await rows('records').first().focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(rows('records')).toHaveText(['Marie', 'User 3', '<Updated>']);
  await expect(rows('custom-records')).toHaveText(['Name:Marie', 'Name:User 3', 'Name:<Updated>']);
  await click('Remove record'); await expect(rows('records')).toHaveText(['User 3', '<Updated>']);
  await click('Clear records');
  for (const id of ['records', 'custom-records']) {
    await expect(rows(id)).toHaveCount(0);
    await expect(page.locator(`#${id} > [data-aml-list-empty]`)).toBeVisible();
  }
  await click('Restore records');
  await expect(rows('records')).toHaveText(['Restored']);
  await expect(rows('custom-records')).toHaveText(['Name:Restored']);
  await expect(page.locator('#custom-records > [data-aml-list-empty]')).toBeHidden();
  await click('Child append'); await expect(rows('child-list')).toHaveText(['Child', 'Local']);
  await click('Append function-a');
  await expect(rows('function-a')).toHaveText(['Function', 'Own state']);
  await expect(rows('function-b')).toHaveText(['Function']);
  await expect(rows('names')).toHaveCount(3);
  expect(await page.evaluate(() => window.listErrors)).toEqual([]);
  expect(errors).toEqual([]);
});
