import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  workers: 1,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:8098' },
  webServer: {
    command: `${process.env.PHP_BINARY || 'php'} -S 127.0.0.1:8098 -t tests`,
    url: 'http://127.0.0.1:8098/browser-fixture.php',
    reuseExistingServer: false,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
