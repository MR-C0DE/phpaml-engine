import {expect} from '@playwright/test';
import {engineSource, runtimeMode} from './test-environment.mjs';

// External CSP fixtures retain their own script nonce and error listeners.
export const browserRuntime = complete => runtimeMode === 'modules'
  ? `import(${JSON.stringify(engineSource + '?modular')}).catch(error=>{document.dispatchEvent(new CustomEvent('aml:error',{detail:{error}}));console.error(error);});`
  : complete;

export async function installRuntime(page, complete) {
  if (runtimeMode === 'modules') await page.addScriptTag({url: engineSource, type: 'module'});
  else await page.addScriptTag({content: complete});
  await expect.poll(() => page.evaluate(() => !!window.AMLEngine?.mount && [...document.querySelectorAll('[data-aml-client]')].every(root => root.dataset.amlEngineMounted === 'true'))).toBe(true);
}
