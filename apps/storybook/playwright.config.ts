import { defineConfig } from '@playwright/test';

const PORT = 6007;

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '*.visual.spec.ts',
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    contextOptions: { reducedMotion: 'reduce' },
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0,
      threshold: 0.1,
    },
  },
  webServer: {
    command: `node tests/visual/static-server.mjs storybook-static ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.json`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
