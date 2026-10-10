// Known limitations: see eslint-rules/index.mjs. Every script file type under packages/*/src is covered by an
// explicit glob; tsc is the backstop for types. Markup built from run-time strings is not detectable statically.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import lit from 'eslint-plugin-lit';
import skLocal, { elementSyntaxRestrictions } from './eslint-rules/index.mjs';
import { MARKDOWN_IT_HOME, markdownImportRestrictions } from './eslint-rules/markdown-renderer.mjs';


// Per-file `class=` exceptions E-01 to E-03 (missions-and-pipeline-screens). The library ships these families as
// styles-only sheets whose markup contract is class-based (gaps G-01 to G-06), so a file that adopts one may write the
// classes of that family and nothing else: every class= value must be static and made only of the listed prefixes.
const classOnly = (prefixes) => {
  const alternatives = prefixes.join('|');
  return {
    selector: String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/\sclass\s*=\s*(?!"(${alternatives})(?:(?:--|__)[a-z0-9-]+)?(\s+(${alternatives})(?:(?:--|__)[a-z0-9-]+)?)*")/i]`,
    message: `class= is only allowed for the library classes ${prefixes.join(', ')} in this file.`,
  };
};
const withoutClassBan = elementSyntaxRestrictions.filter((entry) => !entry.message.startsWith('class= is forbidden'));

// A raw `<button` allowed in one file, and only with the exact attribute shape that follows it (E-01, E-26, E-29). `shape` is a
// regex source for what must follow `<button`; any other raw button, `<input>`, `<select>` or `<textarea>` stays refused. `base` is
// `withoutClassBan` when the file also gets a `classOnly` row, and the full restrictions (class= forbidden) when it gets none.
const rawButtonOnly = (shape, message, base = withoutClassBan) =>
  base.map((entry) =>
    entry.message.startsWith('Raw <button>')
      ? {
          selector: String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/<(input|select|textarea)\b|<button\b(?!${shape})/i]`,
          message,
        }
      : entry,
  );

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
    // The markdown renderer's rules (R1 to R5, contracts/gates.md). `noInlineConfig` is what makes them unsilenceable: without
    // it one `eslint-disable-next-line` above a banned construct turns every rule here off (the main config had none).
    // R1 and R4 are rules of their own and are set once here, so no per-file override of `no-restricted-syntax` or
    // `no-restricted-imports` can replace them; R2 and R3 ride in `elementSyntaxRestrictions`.
    files: ['packages/*/src/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
    linterOptions: { noInlineConfig: true },
    plugins: { sk: skLocal },
    rules: { 'sk/markdown-it-import-home': ['error', { home: MARKDOWN_IT_HOME }] },
  },
  {
    // R4, clause (a): under logic/markdown/ no property or boolean binding at all, and only the allowlisted attribute names.
    // R5: no import() and no new URL() there. A `no-restricted-syntax` block REPLACES the array of an earlier one, so the
    // shared restrictions are re-declared with R5 appended.
    files: ['packages/*/src/logic/markdown/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
    plugins: { sk: skLocal },
    rules: {
      'sk/markdown-template-attributes': ['error', { strictBindings: true }],
      'no-restricted-syntax': ['error', ...elementSyntaxRestrictions, ...markdownImportRestrictions],
    },
  },
  {
    // R4, clause (b) for the Artifact Viewer's element files: the reviewed named lists, DERIVED by IC-06b from the stubs and the part
    // signatures (every structural attribute and every named property or boolean binding the parts use, each `{ name, reason }`). Only
    // the contract's attribute list and the two listeners are allowed beyond them; a name a later work package needs is a change request,
    // not an edit. Story files and `fixtures.ts` bind properties by design, as every screen story does, and are out of scope (as under
    // logic/markdown). `class` is allowed by this rule only as a name: its values stay limited by each file's E-27 `classOnly` row.
    files: ['packages/*/src/elements/sk-artifact-screen/**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'],
    ignores: ['**/*.stories.ts', '**/fixtures.ts'],
    plugins: { sk: skLocal },
    rules: {
      'sk/markdown-template-attributes': [
        'error',
        {
          strictBindings: false,
          allowBindings: [
            { name: '?disabled', reason: 'An inert control (no Mission) is drawn disabled: a boolean state of a library button or a native pill.' },
            { name: '?data-single', reason: 'The layout marker of a single-pane state (no inspector, one column): a fixed boolean, never text.' },
          ],
          allowAttributes: [
            { name: 'data-region', reason: 'The region hooks the screen file draws (inspector, document-pane, toolbar, live-region): fixed words.' },
            { name: 'data-root', reason: 'The focusable root of the screen when no pane is drawn: a fixed marker.' },
            { name: 'data-layout', reason: 'The grid of the reading layout: a fixed marker.' },
            { name: 'data-hidden-heading', reason: 'The visually hidden h1 the pane draws where it has none (A11Y-005): a fixed marker.' },
            { name: 'data-scroll', reason: 'Marks the scroll elements the overflow measurement observes (article, source): a fixed word.' },
            { name: 'data-document', reason: 'The document body wrapper of the document part: a fixed marker.' },
            { name: 'data-toolbar-name', reason: 'The icon and file name group of the toolbar part: a fixed marker.' },
            { name: 'data-inspector-group', reason: 'A titled group of the inspector (facts, Mission facts, linked Work Packages): a fixed marker.' },
            { name: 'data-inspector-pills', reason: 'The list of Work Package pills of the inspector: a fixed marker.' },
            { name: 'data-refusal', reason: 'The refusal block wrapper of the refusal part: a fixed marker.' },
            { name: 'data-refusal-path', reason: 'The path line of the refusal block, wrapped anywhere: a fixed marker.' },
            { name: 'data-state-panel', reason: 'The whole-screen state panel of the state part: a fixed marker.' },
            { name: 'id', reason: 'Static, shadow-root-local ids that tie a tab to its panel (aria-controls, aria-labelledby): fixed strings, never document text.' },
            { name: 'aria-labelledby', reason: 'Names the tab panel by its tab: an idref to a static id.' },
            { name: 'aria-controls', reason: 'Ties a tab to the panel it controls, omitted when that panel is not rendered: an idref to a static id.' },
            { name: 'aria-selected', reason: 'The selected tab of the tablist, keyed by the E-26 paint: the words true and false only.' },
            { name: 'aria-live', reason: 'The one polite live region of the screen: the word polite.' },
            { name: 'aria-busy', reason: 'The busy look of a loading state: the words true and false only.' },
            { name: 'type', reason: 'type=button on the two raw buttons the exceptions E-26 and E-29 allow: a fixed word.' },
            { name: 'class', reason: 'The library family classes (sk-facts, sk-empty-state, sk-pill-tag) of the E-27 rows: the values stay limited per file by classOnly.' },
            { name: 'tone', reason: 'The tone of the library sk-notice (info): a fixed word that names a library state, never document text.' },
            { name: 'announce', reason: 'The live behaviour of the library sk-notice (off): the screen has its own live region, so a fixed word.' },
            { name: 'variant', reason: 'The visual variant of the library sk-button (secondary): a fixed word.' },
          ],
          allowTags: [
            { name: 'article', reason: 'The scroll box of the rendered document: structure only.' },
            { name: 'button', reason: 'The two raw buttons of the exceptions E-26 and E-29 (tab, pill): each limited to its exact attribute shape.' },
            { name: 'code', reason: 'Inline code in the screen chrome (a path or a name): text only.' },
            { name: 'dd', reason: 'A value of a facts list in the inspector: text only.' },
            { name: 'div', reason: 'Layout and region wrappers of the screen parts: structure only.' },
            { name: 'dl', reason: 'The facts list of the inspector: structure only.' },
            { name: 'dt', reason: 'A label of a facts list in the inspector: text only.' },
            { name: 'h1', reason: 'The screen heading and the visually hidden heading of the pane: text only.' },
            { name: 'h2', reason: 'A heading of a state or refusal block: text only.' },
            { name: 'h3', reason: 'The titled groups of the inspector: text only.' },
            { name: 'li', reason: 'Items of the screen lists (pills, steps): structure only.' },
            { name: 'p', reason: 'Text lines of the states, the refusal and the toolbar: text only.' },
            { name: 'pre', reason: 'The raw and fallback source block: text only, scrolls sideways.' },
            { name: 'progress', reason: 'The loading and size meter of the inspector: a native element with no source.' },
            { name: 'sk-button', reason: 'The library button of the toolbar and the retry actions.' },
            { name: 'sk-notice', reason: 'The library notice of the truncation, fallback, redaction and bidirectional-control lines.' },
            { name: 'span', reason: 'Inline wrappers of the screen chrome: text only.' },
            { name: 'strong', reason: 'Emphasis in the screen chrome: text only.' },
            { name: 'ul', reason: 'Lists of the screen parts: structure only.' },
            { name: 'wbr', reason: 'A break opportunity in long paths of the toolbar and the refusal: no content.' },
          ],
          allowListeners: [],
        },
      ],
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
    // WP06 ruling (2026-10-08, operator): the Projects screen adopts #4's `.sk-progress` stylesheet, so class= is allowed for the
    // sk-progress classes only, in the row and state part files (every other file of the mission keeps the ban).
    files: ['packages/*/src/elements/sk-projects-screen/row-parts.ts', 'packages/*/src/elements/sk-projects-screen/state-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-progress'])] },
  },
  {
    // Exception E-33 (Projects screen, CP-1 2026-10-08; sunset: spec-kitty-design#527, a listbox and option): the folder
    // listbox of the open-project dialog is the one place with a raw `<button type="button" role="option">`, and only that form.
    // No class= prefix was ruled for this mission (E-34 is the header typography), so class= stays forbidden in every file.
    files: ['packages/*/src/elements/sk-open-project-dialog/folder-list-parts.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...elementSyntaxRestrictions.map((entry) =>
          entry.message.startsWith('Raw <button>')
            ? {
                selector: String.raw`TaggedTemplateExpression:matches([tag.name=/^(html|svg)$/], [tag.property.name=/^(html|svg)$/]) > TemplateLiteral > TemplateElement[value.raw=/<(input|select|textarea)\b|<button\b(?!\s+type="button"\s+role="option")/i]`,
                message: 'Only <button type="button" role="option"> is allowed raw in this file; other raw controls are forbidden.',
              }
            : entry,
        ),
      ],
    },
  },
  {
    // Artifact Viewer (mission-ui#7, IC-06a). E-27 (sunset G-20, spec-kitty-design#523: a library element for the facts, empty-state and progress families,
    // as E-01 to E-03 and E-17): one `classOnly` override per file, exactly the table of contracts/gates.md, written now so that no
    // region work package needs a lint-config edit. `tab-parts.ts` has NO row (E-26 is a paint entry and the tab carries no class), and
    // neither do `sk-artifact-screen.ts`, `toolbar-parts.ts`, `document-parts.ts`, `source-parts.ts` and `prose-styles.ts`.
    // E-29 (sunset G-21, spec-kitty-design#524: a library interactive pill): the one raw button in `inspector-parts.ts`, `<button type="button"
    // class="sk-pill-tag">`, whose class is the E-27 row of that file; the leak plants are in scripts/stylelint-exceptions.test.mjs.
    files: ['packages/*/src/elements/sk-artifact-screen/inspector-parts.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...rawButtonOnly(String.raw`\s+type="button"\s+class="sk-pill-tag"`, 'Only <button type="button" class="sk-pill-tag"> is allowed raw in this file (E-29); other raw controls are forbidden.'),
        classOnly(['sk-facts', 'sk-pill-tag']),
      ],
    },
  },
  {
    files: ['packages/*/src/elements/sk-artifact-screen/state-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-empty-state', 'sk-progress'])] },
  },
  {
    files: ['packages/*/src/elements/sk-artifact-screen/refusal-parts.ts'],
    rules: { 'no-restricted-syntax': ['error', ...withoutClassBan, classOnly(['sk-empty-state'])] },
  },
  {
    // Exception E-26 (sunset G-16, spec-kitty-design#521: no tabs element with tablist semantics; shares E-01's sunset, design-library #501): the tablist is
    // a native `<button type="button" role="tab">` painted with tokens (a Stylelint PAINT entry). The raw button is allowed only
    // with exactly that pair of attributes, in this file; class= stays forbidden, so the library's segmented-choice class is not usable.
    files: ['packages/*/src/elements/sk-artifact-screen/tab-parts.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...rawButtonOnly(String.raw`\s+type="button"\s+role="tab"["\s>]`, 'Only <button type="button" role="tab"> is allowed raw in this file (E-26); other raw controls are forbidden.', elementSyntaxRestrictions),
      ],
    },
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
