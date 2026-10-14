import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// The browser-mode set-up of packages/mission-ui (Playwright provider, Chromium), one project, plus the Svelte plugin.
export default defineConfig({
  plugins: [svelte()],
  test: {
    attachmentsDir: 'test-results/attachments',
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
        },
      },
    ],
  },
});
