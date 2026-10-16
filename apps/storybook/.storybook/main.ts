import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import type { StorybookConfig } from '@storybook/web-components-vite';

const config: StorybookConfig = {
  framework: '@storybook/web-components-vite',
  stories: ['../../../packages/mission-ui/src/**/*.stories.ts', '../../../packages/mission-shell/src/**/*.stories.ts'],
  addons: ['@storybook/addon-docs'],
  // No telemetry: nothing leaves the machine, and nothing machine-specific is recorded.
  core: { disableTelemetry: true },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    // One copy of lit: two copies break custom-element registration.
    viteConfig.resolve.dedupe = [...(viteConfig.resolve.dedupe ?? []), 'lit'];
    // The shell's .svelte files compile through the plugin; configFile false keeps a stray svelte.config.js out.
    viteConfig.plugins = [...(viteConfig.plugins ?? []), svelte({ configFile: false, preprocess: vitePreprocess() })];
    return viteConfig;
  },
};

export default config;
