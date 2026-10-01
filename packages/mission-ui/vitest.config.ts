import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
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
