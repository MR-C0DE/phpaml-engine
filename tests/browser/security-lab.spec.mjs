import {test, expect} from './runtime-test.mjs';
import {runtimeMode} from './test-environment.mjs';
import {startSecurityLab} from '../security-lab/server.mjs';

let lab, origin, foreign, received;
const check = (condition, label) => expect(condition, label).toBe(true);
test.beforeAll(async () => {
  lab = await startSecurityLab({diagnostic: true});
  ({origin, foreign, received} = lab);
});
test.afterAll(async () => { await lab?.close(); });

test('security lab: untrusted presentation inputs stay inert', async ({page}) => {
  const payload = '<img src="/missing" onerror="window.labExecuted=true">';
  for (const surface of ['text', 'attribute']) {
    await page.goto(`${origin}/probe?runtime=${runtimeMode}&surface=${surface}&value=${encodeURIComponent(payload)}`);
    await expect(page.locator('#mirror')).toHaveText('Données fictives');
    check(await page.evaluate(() => window.labExecuted !== true), `presentation-${surface}`);
  }
  await page.locator('#message').fill(payload);
  await expect(page.locator('#mirror')).toHaveText(payload);
  await page.getByRole('button', {name: 'Enregistrer', exact: true}).click();
  await expect(page.locator('#result')).toHaveText(payload);
  check(await page.evaluate(() => window.labExecuted !== true && !document.querySelector('#mirror img,#result img')), 'reactive-and-api-text');
  for (const [surface, value, activate] of [
    ['link', 'javascript:window.labExecuted=true', true],
    ['frame', 'javascript:parent.labExecuted=true', false],
    ['document', '<script>parent.labExecuted=true</script>', false],
    ['tag', 'img src=/missing onerror=window.labExecuted=true', false],
    ['script', foreign + '/code.js', false],
  ]) {
    const response = await page.goto(`${origin}/probe?runtime=${runtimeMode}&surface=${surface}&value=${encodeURIComponent(value)}`);
    if (activate && response.status() === 200) await page.locator('#preview').click();
    if (response.status() === 200) await page.waitForTimeout(150);
    const executed = await page.evaluate(() => window.labExecuted === true);
    check(response.status() === 422 && !executed, `presentation-${surface}-boundary`);
  }
});

test('security lab: same-origin actions cannot leak through redirects', async ({page}) => {
  received.length = 0;
  await page.goto(`${origin}/?runtime=${runtimeMode}`);
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  await page.getByRole('button', {name: 'Relais local', exact: true}).click();
  await expect(page.locator('#result')).toHaveText('Données fictives');
  await page.getByRole('button', {name: 'Tester le relais', exact: true}).click();
  await expect.poll(async () => (await page.locator('#error').textContent()) !== '' || received.some(entry => entry.path === '/capture')).toBe(true);
  check(!received.some(entry => entry.path === '/capture'), 'api-origin-boundary');
  await page.getByRole('link', {name: 'Navigation de test', exact: true}).click();
  await expect.poll(async () => received.some(entry => entry.path === '/foreign-page') || await page.locator('[data-aml-navigation-overlay="error"]').count() > 0).toBe(true);
  check(!received.some(entry => entry.path === '/foreign-page'), 'navigation-origin-boundary');
  check(await page.locator('#foreign-content').count() === 0, 'navigation-document-boundary');
});

test('security lab: invalid HTTP inputs and private asset paths are refused', async ({request}) => {
  for (const path of ['/_aml/../composer.json', '/_aml/%2e%2e/composer.json', '/_aml/%252e%252e/composer.json', '/_aml/../../src/EngineRuntime.php', '/.env', '/src/EngineRuntime.php']) {
    check((await request.get(origin + path)).status() === 404, 'private-file-boundary');
  }
  check((await request.post(origin + '/api/save', {data: {message: 'synthetic'}})).status() === 419, 'missing-csrf');
  check((await request.post(origin + '/api/save', {headers: {'X-CSRF-Token': 'wrong'}, data: {message: 'synthetic'}})).status() === 419, 'invalid-csrf');
  check((await request.post(origin + '/api/save', {headers: {'X-CSRF-Token': 'lab-synthetic-csrf'}, data: {message: []}})).status() === 422, 'invalid-input-type');
  check((await request.post(origin + '/api/save', {headers: {'X-CSRF-Token': 'lab-synthetic-csrf'}, data: {message: 'a'.repeat(9000)}})).status() === 413, 'oversized-input');
});

test('security lab: production policy keeps the legitimate application usable', async ({page}) => {
  const response = await page.goto(`${origin}/production?runtime=${runtimeMode}`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  await page.locator('#message').fill('Bonjour André');
  await page.getByRole('button', {name: 'Enregistrer', exact: true}).click();
  await expect(page.locator('#result')).toHaveText('Bonjour André');
});
