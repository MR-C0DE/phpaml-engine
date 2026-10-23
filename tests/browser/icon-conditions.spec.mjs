import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/icons.php'), '--conditions', '--json'], {encoding: 'utf8'}));
const variants = Object.fromEntries(['block', 'local'].map(name => [name, JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/icons.php'), '--conditions-' + name, '--json'], {encoding: 'utf8'}))]));
const mount = async (page, fixture = sample, scripts = true) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.conditionErrors = [];
    for (const name of ['aml:error', 'aml:render-error']) document.addEventListener(name, event => window.conditionErrors.push(event.detail.error.message), true);
  });
  await page.route('**/assets/phpaml/lucide/1.61.0/*.json', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop().replace(/\.json$/, '');
    return route.fulfill({status: sample.catalog[name] ? 200 : 404, contentType: 'application/json', body: JSON.stringify(sample.catalog[name] ?? {})});
  });
  await page.route('**/icon-conditions-test', route => route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><main data-aml-client>${fixture.html}</main>${scripts ? engineTag : ''}`}));
  await page.goto('/icon-conditions-test');
  if (scripts) await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  return errors;
};

test('nested if/elseif/else, ternary and match select reactive icon names', async ({page}) => {
  const errors = await mount(page);
  const ids = ['event-conditional-icon', 'ternary-conditional-icon', 'match-conditional-icon'];
  for (const name of ['heart', 'user', 'settings', 'search', 'heart']) {
    for (const id of ids) await expect(page.locator('#' + id)).toHaveAttribute('data-aml-icon-name', name);
    await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  }
  // An ordinary PHP body() branch remains a construction-time choice.
  await expect(page.locator('#initial-branch-icon')).toHaveAttribute('data-aml-icon-name', 'heart');
  expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
  expect(errors).toEqual([]);
});

test('showWhen preserves current icon values while hidden and when revealed', async ({page}) => {
  const errors = await mount(page);
  const icon = page.locator('#shown-conditional-icon');
  await expect(icon).toBeHidden();
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await expect(icon).toHaveAttribute('data-aml-icon-name', 'user');
  await expect(icon).toBeHidden();
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(icon).toBeVisible();
  await expect(icon).toHaveCSS('display', 'grid');
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(icon).toBeHidden();
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(icon).toBeVisible();
  await expect(icon).toHaveCSS('display', 'grid');
  await expect(icon).toHaveAttribute('data-aml-icon-name', 'settings');
  expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
  expect(errors).toEqual([]);
});

test('nested When reveals the current inner branch and current icon State', async ({page}) => {
  const errors = await mount(page);
  const region = page.locator('#nested-conditions');
  await expect(region.locator('svg')).toHaveAttribute('data-aml-icon-name', 'circle-check');
  await page.getByRole('button', {name: 'Toggle inner condition', exact: true}).click();
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(region.locator('svg')).toHaveAttribute('data-aml-icon-name', 'user');
  await page.getByRole('button', {name: 'Toggle inner condition', exact: true}).click();
  await expect(region.locator('svg')).toHaveAttribute('data-aml-icon-name', 'arrow-right');
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await page.getByRole('button', {name: 'Toggle inner condition', exact: true}).click();
  await expect(region.locator('svg')).toHaveAttribute('data-aml-icon-name', 'settings');
  await expect(region.locator('svg')).toHaveCSS('width', '32px');
  await expect(region.locator('svg')).toBeVisible();
  await page.evaluate(() => { window.retainedIcon = document.querySelector('#nested-dynamic-icon'); });
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await expect(region.locator('svg')).toHaveAttribute('data-aml-icon-name', 'search');
  expect(await page.evaluate(() => window.retainedIcon === document.querySelector('#nested-dynamic-icon'))).toBe(true);
  expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const [variant, id, button] of [['block', 'closure-conditional-icon', 'Step conditions'], ['local', 'local-conditional-icon', 'Local step']]) {
  test(`nested if closures react with ${variant === 'block' ? 'class State' : 'local StateRef'}`, async ({page}) => {
    const errors = await mount(page, variants[variant]);
    for (const [index, name] of ['heart', 'user', 'settings', 'search', 'heart'].entries()) {
      const icon = page.locator('#' + id);
      await expect(icon).toHaveAttribute('data-aml-icon-name', name);
      if (variant === 'block') {
        await expect(icon).toHaveCSS('width', index === 2 || index === 3 ? '32px' : '24px');
        await expect(icon).toHaveAttribute('aria-label', index === 2 || index === 3 ? 'Advanced' : 'Basic');
        await expect(page.locator('#static-closure-icon')).toHaveAttribute('data-aml-icon-name', 'heart');
      }
      await page.getByRole('button', {name: button, exact: true}).click();
    }
    expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('showWhen also hides the initial SVG before Engine starts', async ({page}) => {
  await mount(page, sample, false);
  await expect(page.locator('#shown-conditional-icon')).toBeHidden();
  await expect(page.locator('#event-conditional-icon')).toBeVisible();
});

test('When ignores a catalogue response for a removed branch and recovers on reopening', async ({page}) => {
  const errors = await mount(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/user.json', async route => { await gate; await route.fulfill({json: sample.catalog.user}); });
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  const pending = page.waitForRequest('**/user.json');
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await pending;
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  release();
  await expect(page.locator('#event-conditional-icon')).toHaveAttribute('data-aml-icon-name', 'user');
  await expect(page.locator('#single-conditions svg')).toHaveAttribute('data-aml-icon-name', 'heart');
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(page.locator('#single-conditions svg')).toHaveAttribute('data-aml-icon-name', 'settings');
  expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a single When reveals the current icon State immediately', async ({page}) => {
  const errors = await mount(page);
  await page.getByRole('button', {name: 'Step conditions', exact: true}).click();
  await page.getByRole('button', {name: 'Toggle visibility', exact: true}).click();
  await expect(page.locator('#single-conditions svg')).toHaveAttribute('data-aml-icon-name', 'user');
  expect(await page.evaluate(() => window.conditionErrors)).toEqual([]);
  expect(errors).toEqual([]);
});
