import {viewFile, engineTag} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';

const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [viewFile('tests/icons.php'), '--json'], {encoding: 'utf8'}));
const mount = async page => {
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.iconErrors = [];
    document.addEventListener('aml:render-error', event => window.iconErrors.push(event.detail.error.message), true);
  });
  await page.route('**/assets/phpaml/lucide/1.61.0/*.json', route => {
    const name = new URL(route.request().url()).pathname.split('/').pop().replace(/\.json$/, ''); requests.push(name);
    return route.fulfill({status: sample.catalog[name] ? 200 : 404, contentType: 'application/json', body: JSON.stringify(sample.catalog[name] ?? {})});
  });
  await page.route('**/icon-test', route => route.fulfill({contentType: 'text/html', body: `<meta charset="utf-8"><main data-aml-client>${sample.html}</main>${engineTag}`}));
  await page.goto('/icon-test');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  return {errors, requests};
};

test('icons render inline and react to class/local State, styles, labels and list rows', async ({page}) => {
  const {errors, requests} = await mount(page);
  const icon = page.locator('#natural');
  await expect(icon).toHaveAttribute('data-aml-icon-name', 'heart');
  await expect(icon).toHaveCSS('width', '24px');
  await expect(icon).toHaveCSS('color', 'rgb(112, 71, 235)');
  await expect(page.getByRole('img', {name: 'Favorite'})).toBeVisible();
  await expect(page.locator('#static')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#css-module')).toHaveCSS('color', 'rgb(204, 51, 0)');
  expect(requests).toEqual([]); // No network dependency for initial SVG.
  expect(await icon.evaluate(node => node.firstElementChild.namespaceURI)).toBe('http://www.w3.org/2000/svg');
  await page.evaluate(() => {window.iconNode = document.querySelector('#natural');});
  await page.getByRole('button', {name: 'Change', exact: true}).click();
  for (const id of ['natural', 'template', 'computed']) await expect(page.locator('#' + id)).toHaveAttribute('data-aml-icon-name', 'settings');
  await expect(icon).toHaveCSS('width', '32px');
  await expect(icon).toHaveCSS('color', 'rgb(0, 128, 0)');
  await expect(icon).toHaveCSS('stroke-width', '3px');
  await expect(icon).toHaveAttribute('aria-label', 'Settings');
  expect(await page.evaluate(() => window.iconNode === document.querySelector('#natural'))).toBe(true);
  await expect(page.locator('#icons-list > li')).toHaveCount(2);
  await expect(page.locator('#icons-list > li').first().locator('svg')).toHaveAttribute('data-aml-icon-name', 'settings');
  await expect(page.locator('#icons-list > li').last().locator('svg')).toHaveAttribute('data-aml-icon-name', 'user');
  await expect(page.locator('#icons-empty > li svg')).toHaveAttribute('data-aml-icon-name', 'search');
  await page.getByRole('button', {name: 'Change function-one', exact: true}).click();
  await expect(page.locator('#function-one')).toHaveAttribute('data-aml-icon-name', 'settings');
  await expect(page.locator('#function-one-closure')).toHaveAttribute('data-aml-icon-name', 'settings');
  await expect(page.locator('#function-one')).toHaveCSS('width', '28px');
  await expect(page.locator('#function-two')).toHaveAttribute('data-aml-icon-name', 'heart');
  await page.getByRole('button', {name: 'Decorative', exact: true}).click();
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).not.toHaveAttribute('aria-label');
  await page.getByRole('button', {name: 'Heart', exact: true}).click();
  await expect(icon).toHaveAttribute('data-aml-icon-name', 'heart');
  expect(requests.filter(name => name === 'heart')).toHaveLength(0);
  expect(requests.filter(name => name === 'settings')).toHaveLength(1);
  await page.evaluate(() => {
    window.iconMutations = 0;
    new MutationObserver(records => window.iconMutations += records.length).observe(document.querySelector('#natural'), {subtree: true, childList: true, attributes: true});
  });
  await page.getByRole('button', {name: 'Tick', exact: true}).click();
  await expect(page.locator('#tick')).toHaveText('1');
  expect(await page.evaluate(() => window.iconMutations)).toBe(0);
  expect(await page.evaluate(() => window.iconErrors)).toEqual([]);
  expect(errors).toEqual([]);
});

test('invalid and unavailable icons preserve the last SVG, report errors and recover', async ({page}) => {
  const {errors, requests} = await mount(page);
  const before = await page.locator('#natural').innerHTML();
  for (const label of ['Missing', 'Invalid']) {
    await page.evaluate(() => window.iconErrors = []);
    await page.getByRole('button', {name: label, exact: true}).click();
    await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
    expect(await page.locator('#natural').innerHTML()).toBe(before);
    await page.getByRole('button', {name: 'Tick', exact: true}).click();
    expect(await page.evaluate(() => window.iconErrors.length)).toBe(3);
  }
  expect(requests).toEqual(['does-not-exist']);
  await page.getByRole('button', {name: 'Heart', exact: true}).click();
  await page.route('**/search.json', route => route.fulfill({contentType: 'application/json', body: JSON.stringify([['script', {onload: 'alert(1)'}]])}));
  await page.evaluate(() => window.iconErrors = []);
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
  expect(await page.locator('#natural').innerHTML()).toBe(before);
  await expect(page.locator('svg script')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.getByRole('button', {name: 'Tick', exact: true}).click();
  expect(await page.evaluate(() => window.iconErrors.length)).toBe(3);
  await page.getByRole('button', {name: 'User', exact: true}).click();
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'user');
  expect(errors).toEqual([]);
});

test('negative reactive icon dimensions retain their last valid values and recover through zero', async ({page}) => {
  const {errors} = await mount(page);
  const icon = page.locator('#natural');
  await page.getByRole('button', {name: 'Negative dimensions', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
  await expect(icon).toHaveCSS('width', '24px');
  await expect(icon).toHaveCSS('height', '24px');
  await expect(icon).toHaveCSS('stroke-width', '2px');
  await page.getByRole('button', {name: 'Tick', exact: true}).click();
  expect(await page.evaluate(() => window.iconErrors.length)).toBe(3);
  await page.getByRole('button', {name: 'Zero dimensions', exact: true}).click();
  await expect(icon).toHaveCSS('width', '0px');
  await expect(icon).toHaveCSS('stroke-width', '0px');
  await page.getByRole('button', {name: 'Change', exact: true}).click();
  await expect(icon).toHaveCSS('width', '32px');
  await expect(icon).toHaveCSS('stroke-width', '3px');
  expect(errors).toEqual([]);
});

test('an online event recovers the same icon after network failure with a shared request', async ({page}) => {
  const {errors} = await mount(page);
  const before = await page.locator('#natural').innerHTML();
  let available = false, attempts = 0;
  await page.route('**/search.json', route => {
    attempts++;
    return available ? route.fulfill({contentType: 'application/json', body: JSON.stringify(sample.catalog.search)}) : route.abort('internetdisconnected');
  });
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
  expect(await page.locator('#natural').innerHTML()).toBe(before);
  available = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  for (const id of ['natural', 'template', 'computed']) await expect(page.locator('#' + id)).toHaveAttribute('data-aml-icon-name', 'search');
  expect(attempts).toBe(2);
  await page.getByRole('button', {name: 'Tick', exact: true}).click();
  expect(await page.evaluate(() => window.iconErrors.length)).toBe(3);
  expect(errors).toEqual([]);
});

test('temporary server failures use bounded retries and can recover without another State change', async ({page}) => {
  const {errors} = await mount(page);
  await page.clock.install();
  let available = false, attempts = 0;
  await page.route('**/search.json', route => {
    attempts++;
    return route.fulfill({status: available ? 200 : 503, contentType: 'application/json', body: JSON.stringify(available ? sample.catalog.search : {})});
  });
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
  for (const [delay, count] of [[500, 2], [1500, 3], [4000, 4]]) {
    await page.clock.fastForward(delay);
    await expect.poll(() => attempts).toBe(count);
    // Flush the response handlers before advancing the next backoff timer.
    await page.waitForLoadState('networkidle');
  }
  await page.clock.fastForward(120000);
  await page.getByRole('button', {name: 'Tick', exact: true}).click();
  expect(attempts).toBe(4);
  expect(await page.evaluate(() => window.iconErrors.length)).toBe(3);
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'heart');
  available = true;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'search');
  expect(attempts).toBe(5);
  expect(errors).toEqual([]);
});

test('a short outage recovers on a timed retry and pending retries stop on unmount', async ({page}) => {
  const {errors} = await mount(page);
  let attempts = 0;
  await page.route('**/search.json', route => {
    attempts++;
    return attempts === 1 ? route.abort('failed') : route.fulfill({contentType: 'application/json', body: JSON.stringify(sample.catalog.search)});
  });
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'search');
  expect(attempts).toBe(2);
  // Reuse a bound icon with a new uncached name to leave a request pending.
  await page.route('**/does-not-exist.json', route => { attempts++; return route.abort('failed'); });
  await page.evaluate(() => window.iconErrors = []);
  await page.getByRole('button', {name: 'Missing', exact: true}).click();
  await expect.poll(() => page.evaluate(() => window.iconErrors.length)).toBe(3);
  const before = attempts;
  await page.evaluate(() => {
    window.AMLEngine.unmount(document.querySelector('[data-aml-client]'));
    window.dispatchEvent(new Event('online'));
  });
  await page.waitForTimeout(800);
  expect(attempts).toBe(before);
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'search');
  expect(errors).toEqual([]);
});

test('a delayed icon response cannot replace a newer State or a removed component', async ({page}) => {
  const {errors} = await mount(page);
  let release;
  const delayed = new Promise(resolve => release = resolve);
  await page.route('**/search.json', async route => { await delayed; await route.fulfill({contentType: 'application/json', body: JSON.stringify(sample.catalog.search)}); });
  await page.getByRole('button', {name: 'Search', exact: true}).click();
  await page.getByRole('button', {name: 'User', exact: true}).click();
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'user');
  await page.evaluate(() => {window.removedIcon = document.querySelector('#computed'); window.removedIcon.remove();});
  release();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/search.json')))).toBe(true);
  await expect(page.locator('#natural')).toHaveAttribute('data-aml-icon-name', 'user');
  expect(await page.evaluate(() => window.removedIcon.dataset.amlIconName)).toBe('user');
  expect(await page.evaluate(() => window.iconErrors)).toEqual([]);
  expect(errors).toEqual([]);
});
