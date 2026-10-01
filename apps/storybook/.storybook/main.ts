import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../../../packages/mission-ui/src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  // No telemetry: nothing leaves the machine, and nothing machine-specific is recorded.
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    // One copy of lit: two copies break custom-element registration.
    viteConfig.resolve.dedupe = [...(viteConfig.resolve.dedupe ?? []), 'lit'];
    return viteConfig;
  },
};

export default config;
