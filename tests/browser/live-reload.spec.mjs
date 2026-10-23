import {engineTag} from './test-environment.mjs';
import {test, expect} from './runtime-test.mjs';

test('development polling stops pending work on pagehide and resumes once from history', async ({page}) => {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.reloadSignals = [];
    window.fetch = (url, options) => {
      if (String(url) !== '/_aml/live-reload') return nativeFetch(url, options);
      window.reloadSignals.push(options.signal);
      return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true}));
    };
  });
  await page.route('**/reload-fixture', route => route.fulfill({contentType: 'text/html', body:
    `<!doctype html><meta name="aml-live-reload" content="/_aml/live-reload"><main data-aml-client>Ready</main>${engineTag}`}));
  await page.goto('/reload-fixture');
  await expect.poll(() => page.evaluate(() => window.reloadSignals.length)).toBe(1);
  // A request lasting more than one polling interval must not overlap another.
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => window.reloadSignals.length)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
  expect(await page.evaluate(() => window.reloadSignals[0].aborted)).toBe(true);
  await page.waitForTimeout(1100);
  expect(await page.evaluate(() => window.reloadSignals.length)).toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
    window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
  });
  await expect.poll(() => page.evaluate(() => window.reloadSignals.length)).toBe(2);
  expect(await page.evaluate(() => window.reloadSignals[1].aborted)).toBe(false);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {configurable:true, value:'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.reloadSignals[1].aborted)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})));
  expect(await page.evaluate(() => window.reloadSignals.length)).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {configurable:true, value:'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.reloadSignals.length)).toBe(3);
});
