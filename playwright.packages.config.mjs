import base from './playwright.config.mjs';
import {runtimeMode} from './tests/browser/test-environment.mjs';

if (!process.env.PHPAML_INSTALLED_AUTOLOAD) throw new Error('Run package tests through npm run test:packages.');
export default {
  ...base,
  testMatch: ['aml-tasks.spec.mjs', 'reservation-program.spec.mjs', 'compatibility-program.spec.mjs', 'modules.spec.mjs', 'browser-modules.spec.mjs', 'files.spec.mjs', 'distribution.spec.mjs'],
  testIgnore: [],
  outputDir: `test-results/packages-${runtimeMode}`,
  metadata: {...base.metadata, packages: 'composer-dist'},
  reporter: [['list'], ['json', {outputFile: `test-results/packages-${runtimeMode}/report.json`}]],
};
