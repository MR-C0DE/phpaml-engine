import { defineConfig } from '@playwright/test';
import {resolve} from 'node:path';
import {baseURL, taskBaseURL, viewFile, viewRoot, engineRoot, runtimeMode} from './tests/browser/test-environment.mjs';

const taskApplication = viewFile('examples/aml-tasks/public');
viewFile('tests/modular-runtime.php');
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const php = quote(process.env.PHP_BINARY || 'php');
const env = {PHP_CLI_SERVER_WORKERS: '2', PHPAML_BROWSER_RUNTIME: runtimeMode, PHPAML_VIEW_ROOT: viewRoot, PHPAML_ENGINE_ROOT: engineRoot};

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  metadata: {runtime: runtimeMode},
  outputDir: `test-results/${runtimeMode}`,
  reporter: [['list'], ['json', {outputFile: `test-results/${runtimeMode}/report.json`}]],
  testIgnore: ['distribution.spec.mjs'],
  // These suites compile PHP fixtures and launch full browser processes.
  workers: process.env.CI ? 2 : 1,
  use: {baseURL, trace: 'retain-on-failure'},
  webServer: [{
    command: `${php} -S ${new URL(baseURL).host} -t tests tests/modular-router.php`,
    // Firefox/Safari can leave speculative connections open; one PHP worker
    // would block unrelated requests while waiting for their request headers.
    env,
    url: `${baseURL}/__aml_test_empty`,
    reuseExistingServer: false,
  }, {
    command: `${php} -S ${new URL(taskBaseURL).host} -t ${quote(taskApplication)} ${quote(resolve('tests/task-app-router.php'))}`,
    env,
    url: `${taskBaseURL}/tasks`,
    reuseExistingServer: false,
  }],
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {launchOptions: {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH}} : {}) } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ]
});
