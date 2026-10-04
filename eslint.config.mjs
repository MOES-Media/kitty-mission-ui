// Known limitations: see eslint-rules/index.mjs. Every script file type under packages/*/src is covered by an
// explicit glob; tsc is the backstop for types. Markup built from run-time strings is not detectable statically.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import skLocal, { elementSyntaxRestrictions } from './eslint-rules/index.mjs';

export default tseslint.config(
  {
    // Plants are non-source overlays; nothing lintable lives there. No other broad ignores.
    ignores: [
      'gates/plants/**',
      '**/storybook-static/**',
      '**/test-results/**',
      '.worktrees/**',
      // Exception E-05: openapi-typescript emits `unknown & unknown`, which the type rules reject; gate contract C2
      // regenerates and byte-compares this one file, so it is ignored by exact path and nothing else.
      'packages/mission-ui/src/contract/types.generated.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,mts,cts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['**/*.{mjs,cjs}'],
    languageOptions: {
      // Node scripts and node:test files: the runtime globals they legitimately use.
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        structuredClone: 'readonly',
      },
    },
  },
  {
    // Script files that can hold templates get the same structural rules (untyped).
    files: ['packages/*/src/**/*.{js,mjs,cjs,jsx}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { sk: skLocal },
    rules: {
      'no-restricted-syntax': ['error', ...elementSyntaxRestrictions],
      'sk/dispatch-custom-event': 'error',
    },
  },
  {
    files: ['packages/*/src/**/*.{ts,mts,cts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked, lit.configs['flat/recommended']],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { sk: skLocal },
    rules: {
      'no-restricted-syntax': ['error', ...elementSyntaxRestrictions],
      'sk/dispatch-custom-event': 'error',
    },
  },
  {
    // Operator ruling (2026-10-02): the shell adopts the library's own `.sk-progress` stylesheet, whose markup contract is
    // class-based, so class= is allowed in this one file for the sk-progress classes only. Every other restriction stays.
    files: ['packages/*/src/elements/sk-mission-shell/shell-parts.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...elementSyntaxRestrictions.filter((entry) => !entry.message.startsWith('class= is forbidden')),
        {
          // class= stays forbidden unless every class is a library progress class (sk-progress, sk-progress--*, sk-progress__*).
          selector:
            String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/\sclass\s*=\s*(?!"sk-progress[a-z_-]*(\s+sk-progress[a-z_-]*)*")/i]`,
          message: 'class= is only allowed for the library sk-progress classes in this file.',
        },
      ],
    },
  },
  {
    // Lit binds @event handlers to the host, so `@click=${this.onX}` is not an unbound method.
    // Not fixed in the element: the unit-tests plant overlays that file by base sha256.
    files: ['packages/*/src/elements/**/*.{ts,mts,cts,tsx}'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },
);
