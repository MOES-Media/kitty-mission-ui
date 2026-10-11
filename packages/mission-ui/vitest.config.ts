import { configDefaults, defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Two projects over the same browser and settings. `unit` is every test file except the timing-ceiling tests; `perf` is only the
// `*.perf.test.ts` files, run one file at a time (`fileParallelism: false`). `pnpm test` runs the two one after the other, never
// together, so a wall-clock ceiling ("within 200 ms", an NFR budget) is never measured while other test files share the browser.
// The ceilings themselves are unchanged. scripts/perf-split.test.mjs keeps the split exact in both directions.
export default defineConfig({
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
          exclude: [...configDefaults.exclude, '**/*.perf.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'perf',
          include: ['test/**/*.perf.test.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
