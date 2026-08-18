import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  use: { baseURL: 'http://127.0.0.1:8097' },
  webServer: {
    command: `${process.env.PHP_BINARY || 'php'} -S 127.0.0.1:8097 -t tests`,
    url: 'http://127.0.0.1:8097/browser-fixture.php',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } }
  ]
});
