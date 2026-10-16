import {taskBaseURL, viewFile, runtimeMode} from './test-environment.mjs';
import {expect, test} from './runtime-test.mjs';

viewFile('examples/aml-tasks/public/index.php');
const base = taskBaseURL;
const pageErrors = new WeakMap();

test.beforeEach(async ({page}) => {
  const errors = []; pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.applicationErrors = [];
    for (const name of ['aml:error', 'aml:render-error', 'aml:navigation-error', 'error']) {
      document.addEventListener(name, event => window.applicationErrors.push(event.detail?.error?.message || event.message || name), true);
    }
  });
});
test.afterEach(async ({page}) => {
  expect(pageErrors.get(page)).toEqual([]);
  expect(await page.evaluate(() => window.applicationErrors)).toEqual([]);
});

test('task application: validation, duplicate titles, shared dashboard, history and persistence', async ({page}) => {
  await page.goto(`${base}/tasks`);
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
  const input = page.locator('[name="newTask"]');
  const add = page.getByRole('button', {name:'Add task', exact:true});
  const cards = page.locator('.task-card');
  await expect(cards).toHaveCount(3);
  await add.click(); await expect(input).toHaveAttribute('aria-invalid','true'); await expect(cards).toHaveCount(3);
  await input.fill('x'); await input.press('Enter'); await expect(input).toHaveAttribute('aria-invalid','true'); await expect(cards).toHaveCount(3);
  await input.fill('   '); await add.click(); await expect(cards).toHaveCount(3);
  for (const count of [4,5]) {
    await input.fill('Vérifier André'); await add.click();
    await expect(cards).toHaveCount(count); await expect(input).toHaveValue('');
  }
  await expect(cards.filter({hasText:'Vérifier André'})).toHaveCount(2);
  await page.evaluate(() => window.sameDocument = true);
  await page.getByRole('navigation').getByRole('link',{name:'Dashboard',exact:true}).click();
  await expect(page.locator('.metric')).toHaveText(['5','1','4']);
  expect(await page.evaluate(() => window.sameDocument)).toBe(true);
  await page.goBack(); await expect(cards).toHaveCount(5);
  await page.reload(); await expect(cards).toHaveCount(5);
  await input.fill('Dernière tâche'); await input.press('Enter'); await expect(cards).toHaveCount(6);
  await expect(page.locator('.task-total')).toContainText('6');
});

test('task application: language and theme survive repeated navigation without reloading Engine', async ({page}) => {
  const scripts=[];
  page.on('request', request => { if (request.resourceType()==='script') scripts.push(request.url()); });
  const response = await page.goto(`${base}/settings?lang=en`);
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted','true');
  const initialScripts = scripts.length;
  expect((await response.body()).length).toBeLessThan(100_000);
  await page.evaluate(() => window.sameDocument = true);
  await page.getByRole('tab',{name:'Language',exact:true}).click();
  await page.getByRole('link',{name:'Français',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','fr');
  await expect(page.getByRole('heading',{name:'Paramètres',exact:true})).toBeVisible();
  await page.locator('header [data-aml-theme-choice="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  for (let i=0;i<3;i++) {
    await page.getByRole('navigation').getByRole('link',{name:'Tâches',exact:true}).click();
    await expect(page.locator('.task-card')).toHaveCount(3);
    await page.getByRole('navigation').getByRole('link',{name:'Paramètres',exact:true}).click();
    await expect(page.getByRole('tab',{name:'Apparence',exact:true})).toBeVisible();
  }
  expect(await page.evaluate(() => window.sameDocument)).toBe(true);
  const additions = scripts.slice(initialScripts);
  expect(additions).toHaveLength(runtimeMode === 'modules' ? 1 : 0);
  if (runtimeMode === 'modules') expect(additions[0]).toMatch(/\/animations-[^/]+\.js$/);
  expect(new Set(scripts).size).toBe(scripts.length);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','fr');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});

test('task application: not-found page returns to a working application and runtime can be revalidated', async ({page,request}) => {
  const response = await page.goto(`${base}/missing`);
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Return home',exact:true}).click();
  await expect(page.locator('.metric')).toHaveText(['3','1','2']);
  const script = await page.locator('script[data-aml-engine]').getAttribute('src');
  const asset = await request.get(`${base}${script}`);
  expect(asset.status()).toBe(200);
  const cached = await request.get(`${base}${script}`,{headers:{'If-None-Match':asset.headers().etag}});
  expect(cached.status()).toBe(304);
  expect((await cached.body()).length).toBe(0);
  const preview = await request.get(`${base}/settings?lang=en`, {headers:{'X-AML-Navigation-State':'loading'}});
  expect(preview.headers()['set-cookie']).toBeUndefined();
  const destination = await request.get(`${base}/settings?lang=fr`);
  expect(destination.headers()['set-cookie']).toContain('aml_tasks_locale=fr');
});
