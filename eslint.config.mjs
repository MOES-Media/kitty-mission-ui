// Known limitations: see eslint-rules/index.mjs. Every script file type under packages/*/src is covered by an
// explicit glob; tsc is the backstop for types. Markup built from run-time strings is not detectable statically.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import skLocal, { elementSyntaxRestrictions } from './eslint-rules/index.mjs';


// Per-file `class=` exceptions E-01 to E-03 (missions-and-pipeline-screens). The library ships these families as
// styles-only sheets whose markup contract is class-based (gaps G-01 to G-06), so a file that adopts one may write the
// classes of that family and nothing else: every class= value must be static and made only of the listed prefixes.
const classOnly = (prefixes) => {
  const alternatives = prefixes.join('|');
  return {
    selector: String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/\sclass\s*=\s*(?!"(${alternatives})[a-z0-9_-]*(\s+(${alternatives})[a-z0-9_-]*)*")/i]`,
    message: `class= is only allowed for the library classes ${prefixes.join(', ')} in this file.`,
  };
};
const withoutClassBan = elementSyntaxRestrictions.filter((entry) => !entry.message.startsWith('class= is forbidden'));

// R-ops-1 (mission-ui#11, contracts/gates.md): in the Ops part files nothing derived from an item may reach a link, an address
// or markup. Refused: unsafeHTML and unsafeSVG (as an identifier and as an import), innerHTML (read, assignment, computed name),
// and an attribute binding named href, src, srcset, action, formaction or xlink:href (also `.href=`, `?href=`, a quoted binding
// and one that completes a longer value). A static `href="/x"` has no binding and is not matched. A later per-file override of
// these files (for example a class= exception) replaces the whole `no-restricted-syntax` list, so it must spread
// `opsPartsRestrictions` again.
export const OPS_PARTS_GLOB = 'packages/*/src/elements/sk-ops-screen/*-parts.ts';
const OPS_BOUND_ATTRIBUTES = 'href|src|srcset|action|formaction|xlink:href';
const opsHtmlTemplate = String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement`;
export const opsPartsRestrictions = [
  { selector: String.raw`Identifier[name=/^(unsafeHTML|unsafeSVG)$/]`, message: 'ops-parts: R-ops-1.a unsafeHTML and unsafeSVG are forbidden in the Ops parts: a value of an item is text, never markup.' },
  { selector: String.raw`ImportDeclaration[source.value=/unsafe-(html|svg)/]`, message: 'ops-parts: R-ops-1.b the unsafe-html and unsafe-svg directives are forbidden in the Ops parts.' },
  { selector: "MemberExpression[computed=false][property.name='innerHTML']", message: 'ops-parts: R-ops-1.c innerHTML (read or assignment) is forbidden in the Ops parts.' },
  { selector: "MemberExpression[computed=true][property.value='innerHTML']", message: 'ops-parts: R-ops-1.d innerHTML by computed name is forbidden in the Ops parts.' },
  {
    selector: opsHtmlTemplate + String.raw`[value.raw=/(^|[\s.?])(${OPS_BOUND_ATTRIBUTES})\s*=\s*(["'][^"']*)?$/i]`,
    message: 'ops-parts: R-ops-1.e an attribute binding named href, src, srcset, action, formaction or xlink:href is forbidden in the Ops parts: no value of an item becomes a link or an address.',
  },
];

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
    // R-ops-1: the Ops part files. Placed before the per-file class exceptions; any later override of these files spreads the list again.
    files: [OPS_PARTS_GLOB],
    rules: { 'no-restricted-syntax': ['error', ...elementSyntaxRestrictions, ...opsPartsRestrictions] },
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
    // Exception E-01 (gap G-01, sunset: a library toggle group or `sk-button` ARIA passthrough, design-library #501):
    // the filter group is the one file with a raw `<button>`, and only `<button type="button"
    // class="sk-segmented-choice__item" ...>`; its classes are the segmented-choice family.
    files: ['packages/*/src/elements/sk-filter-toggle-group/sk-filter-toggle-group.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...withoutClassBan.map((entry) =>
          entry.message.startsWith('Raw <button>')
            ? {
                selector: String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/<(input|select|textarea)\b|<button\b(?!\s+type="button"\s+class="sk-segmented-choice__item")/i]`,
                message: 'Only <button type="button" class="sk-segmented-choice__item"> is allowed raw in this file; other raw controls are forbidden.',
              }
            : entry,
        ),
        classOnly(['sk-segmented-choice']),
      ],
    },
  },
  {
    // Exception E-02 (gaps G-02, G-03, sunset: library `sk-workflow-board`/`sk-workflow-lane`/`sk-progress`).
    files: ['packages/*/src/elements/sk-work-package-board/{sk-work-package-board,card-parts}.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-workflow-board', 'sk-workflow-lane', 'sk-progress'])] },
  },
  {
    // Exception E-03 (gaps G-03, G-05, G-06, sunset: library `sk-breadcrumbs`/`sk-empty-state`/`sk-progress`).
    files: ['packages/*/src/elements/sk-missions-screen/{sk-missions-screen,mission-row-parts}.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-empty-state', 'sk-progress'])] },
  },
  {
    // Library gap (E-03 precedent, same sunset: library `sk-empty-state`/`sk-progress` elements): the Ops loading and empty looks
    // draw the `sk-empty-state` and `sk-progress` classes in this one file. The R-ops-1 list is spread again (it is replaced here).
    files: ['packages/*/src/elements/sk-ops-screen/ops-state-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, ...opsPartsRestrictions, classOnly(['sk-empty-state', 'sk-progress'])] },
  },
  {
    files: ['packages/*/src/elements/sk-pipeline-screen/{sk-pipeline-screen,pipeline-parts}.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-breadcrumbs', 'sk-empty-state', 'sk-progress'])] },
  },
  {
    // Exception E-17 (Work Package screen; gaps G-09, G-10 and the adopted families; sunset: a library element for each family,
    // as E-01 to E-03): one override per file the table of contracts/gates.md lists, written now so that no region work package
    // needs a lint-config edit. A file not listed here (files-parts, review-parts, chain-parts, panel-parts and the screen file)
    // carries no class. There is NO sk-breadcrumbs row for state-parts.ts.
    files: ['packages/*/src/elements/sk-work-package-screen/history-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-event-timeline'])] },
  },
  {
    files: ['packages/*/src/elements/sk-work-package-screen/facts-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-facts'])] },
  },
  {
    files: ['packages/*/src/elements/sk-work-package-screen/work-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-facts', 'sk-progress'])] },
  },
  {
    files: ['packages/*/src/elements/sk-work-package-screen/header-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-breadcrumbs'])] },
  },
  {
    files: ['packages/*/src/elements/sk-work-package-screen/state-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-empty-state', 'sk-progress'])] },
  },
  {
    // Elements never import story-only helpers (research D-02): story-support is for stories and fixtures.
    files: ['packages/*/src/elements/**/*.ts'],
    ignores: ['**/*.stories.ts', '**/fixtures.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/story-support/**'], message: 'Elements must not import story-support: it is for stories and fixtures only.' }] },
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
