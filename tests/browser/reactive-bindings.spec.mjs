import {assetFile, viewFile} from './test-environment.mjs';
import {browserRuntime} from './runtime-source.mjs';
import {expect, test} from './runtime-test.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const fixture = viewFile('tests/reactive-bindings.php');
const sample = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [fixture, '--json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}));
const runtime = browserRuntime(readFileSync(assetFile('engine-0.1.0-beta.9.min.js'), 'utf8'));

test('local calculations and helper arguments stay reactive under CSP and recover from render failures', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/bindings', route => route.fulfill({contentType: 'text/html', headers: {'Content-Security-Policy': "default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'"}, body: `<meta charset="utf-8"><link rel="icon" href="/favicon.ico"><main data-aml-client>${sample.html}</main><script defer data-aml-engine src="/engine.js"></script>`}));
  await page.route('**/engine.js', route => route.fulfill({contentType: 'text/javascript', body: runtime}));
  await page.addInitScript(() => {
    window.renderErrors = []; window.csp = [];
    document.addEventListener('aml:render-error', ({detail: {error}}) => window.renderErrors.push({name: error.name, source: error.source}), true);
    document.addEventListener('securitypolicyviolation', event => window.csp.push(event.blockedURI));
  });
  await page.goto('/bindings');
  await expect(page.locator('[data-aml-client]')).toHaveAttribute('data-aml-engine-mounted', 'true');
  const texts = () => page.locator('[data-test]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => [node.dataset.test, node.textContent])));
  expect(await texts()).toEqual(sample.before);
  await page.getByRole('button', {name:'Changer',exact:true}).click();
  expect(await texts()).toEqual(sample.after);
  await expect(page.locator('[data-test] b')).toHaveCount(0);
  expect(await page.locator('[data-aml-client]').evaluate(root => window.AMLEngine.inspect(root).numbers)).toEqual([8,2]);
  await page.getByRole('button', {name:'Erreur',exact:true}).click();
  expect(await texts()).toEqual({...sample.after, caught:'impossible'});
  const failures = await page.evaluate(() => window.renderErrors);
  expect(failures).toHaveLength(1);
  expect(failures[0].name).toBe('DivisionByZeroError');
  expect(failures[0].source.file).toContain('ReactiveBindings.php');
  await page.getByRole('button', {name:'Réparer',exact:true}).click();
  expect(await texts()).toEqual({...sample.after, division:'2', caught:'2'});
  expect(await page.evaluate(() => window.csp)).toEqual([]);
  expect(errors).toEqual([]);
});
