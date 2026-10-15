// The Svelte settings shared by the three ESLint configurations (eslint.config.mjs, eslint.no-io.config.mjs,
// eslint.data-driven.config.mjs), so a change of parser or glob is made once (SO-BND-009).
import { fileURLToPath } from 'node:url';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

/** Every Svelte component, wherever it is: the glob of the no-io and data-driven gates. */
export const SVELTE_GLOB = '**/*.svelte';

/** The Svelte components of the packages' sources: the glob of the main configuration. */
export const SVELTE_SOURCES = 'packages/*/src/**/*.svelte';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');

/**
 * `languageOptions` for `.svelte` files: svelte-eslint-parser, which hands `<script lang="ts">` to the TypeScript parser.
 * `typed: true` also types it through the project service (the typed TypeScript rules of the main configuration);
 * `typed: false` parses only (the no-io and data-driven gates, which use no type information).
 */
export function svelteLanguageOptions({ typed }) {
  return {
    parser: svelteParser,
    sourceType: 'module',
    parserOptions: typed
      ? { parser: tseslint.parser, projectService: true, tsconfigRootDir: ROOT, extraFileExtensions: ['.svelte'] }
      : { parser: tseslint.parser },
  };
}
