import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  // `typescript` is imported by the no-copy scan; pre-bundling it up front stops Vite reloading a running test.
  optimizeDeps: { include: ['typescript'] },
  test: {
    include: ['test/**/*.test.ts'],
    attachmentsDir: 'test-results/attachments',
    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
