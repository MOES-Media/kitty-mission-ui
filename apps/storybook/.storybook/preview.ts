import { setCustomElementsManifest } from '@storybook/web-components-vite';
import type { Preview } from '@storybook/web-components-vite';
import manifest from '../../../packages/mission-ui/custom-elements.json';
// Token CSS (fonts resolve relative to the stylesheet; no external font URLs).
import '@spec-kitty/tokens';
// Registers every sk-* element as a side effect.
import '@spec-kitty/elements';

// The committed element manifest drives the autodocs API tables (properties, events, slots) and the controls.
setCustomElementsManifest(manifest);

// Pin the theme: tokens.css has a prefers-color-scheme fallback under
// :root:not([data-theme]), so an unpinned page can flip to light in headless Chromium.
document.documentElement.setAttribute('data-theme', 'dark');

const preview: Preview = {
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (story) => {
      document.documentElement.setAttribute('data-theme', 'dark');
      return story();
    },
  ],
};

export default preview;
