import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './templates',
  fullyParallel: true,
  workers: 4,
  timeout: 90_000,
  expect: { timeout: 5000, toHaveScreenshot: { maxDiffPixelRatio: 0.005, animations: 'disabled' } },
  snapshotPathTemplate: '{testDir}/snapshots/{arg}{ext}',
  reporter: [['list'], ['json', { outputFile: `${import.meta.dirname}/test-results/templates${process.env.TEMPLATE_SHARD ? `-${process.env.TEMPLATE_SHARD}` : ''}.json` }],
    ['html', { outputFolder: `${import.meta.dirname}/playwright-report-templates`, open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8790', browserName: 'chromium',
    viewport: { width: 1280, height: 900 }, locale: 'es-PE', timezoneId: 'UTC',
    reducedMotion: 'reduce', colorScheme: 'light', trace: 'retain-on-failure' },
  webServer: {
    command: 'python3 -m http.server 8790 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8790/.ova-rendered/engage_01.html', reuseExistingServer: false,
  },
});
