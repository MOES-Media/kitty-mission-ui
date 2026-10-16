import { configDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Two projects. `unit` is the browser-mode set-up of packages/mission-ui (Playwright provider, headless Chromium) for
// mounted tests. `logic` is a Node project for core and controller logic: it states `browser.enabled: false` itself,
// and test/logic/sentinel.test.ts fails if it ever runs in a browser. Both setup files fail the run on any uncaught
// error (NFR-007).
export default defineConfig({
  plugins: [svelte()],
  test: {
    attachmentsDir: 'test-results/attachments',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'test/logic/**'],
          setupFiles: ['test/setup/browser.ts'],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: false,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'logic',
          include: ['test/logic/**/*.test.ts'],
          environment: 'node',
          setupFiles: ['test/setup/node.ts'],
          browser: { enabled: false },
        },
      },
    ],
  },
});
