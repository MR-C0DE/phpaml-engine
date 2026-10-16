import {test as base, expect} from '@playwright/test';
import {runtimeMode, engineVersion} from './test-environment.mjs';

export {expect};
export const test = base.extend({
  page: async ({page}, use) => {
    // setContent fixtures need a same-origin document for external modules.
    if (runtimeMode === 'modules') await page.goto('/__aml_test_empty');
    await use(page);
  },
  runtimeContract: [async ({page}, use, testInfo) => {
    const moduleEntries = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === `/_aml/modules-${engineVersion}.min/engine.js`) moduleEntries.push(request.url());
    });
    await use();
    if (testInfo.status !== testInfo.expectedStatus || page.isClosed()) return;
    const running = await page.evaluate(() => typeof window.AMLEngine?.mount === 'function');
    if (running) expect(moduleEntries.length > 0, `The test must exercise the selected ${runtimeMode} runtime`).toBe(runtimeMode === 'modules');
  }, {auto: true}],
});
