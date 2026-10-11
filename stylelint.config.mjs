// Known limitations: CSS built from run-time strings (not a css\`\` template or a .css file) is not visible here;
// ESLint bans unsafeCSS and styleMap so that route is closed at the source.
// Elements over CSS (C-005): project CSS is layout only, every value a token.
const TOKEN_ONLY = [
  '/^var\\(--sk-[a-z0-9-]+\\)$/',
  '0',
  'auto',
  'inherit',
  'currentColor',
  'transparent',
];

const STRICT_PROPERTIES = [
  'color',
  'background',
  'font',
  'font-size',
  'line-height',
  'padding',
  'padding-inline',
  'padding-block',
  'margin',
  'margin-inline',
  'margin-block',
  'gap',
  'row-gap',
  'column-gap',
  'border-radius',
  'border',
  'width',
  'min-width',
  'max-width',
  'inline-size',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-inline',
  'inset-block',
];

const LAYOUT_PROPERTIES = [
  'display',
  'position',
  'inset',
  'inset-inline',
  'inset-block',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'box-sizing',
  'overflow',
  'overflow-x',
  'overflow-y',
  'contain',
  'container-type',
  'container-name',
  'aspect-ratio',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'inline-size',
  'block-size',
  'padding',
  'padding-inline',
  'padding-block',
  'margin',
  'margin-inline',
  'margin-block',
  'gap',
  'row-gap',
  'column-gap',
  'flex',
  'flex-direction',
  'flex-wrap',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'grid',
  'grid-template',
  'grid-template-columns',
  'grid-template-rows',
  'grid-template-areas',
  'grid-area',
  'grid-column',
  'grid-row',
  'grid-auto-flow',
  'grid-auto-columns',
  'grid-auto-rows',
  'align-items',
  'align-content',
  'align-self',
  'justify-items',
  'justify-content',
  'justify-self',
  'place-items',
  'place-content',
  'place-self',
  'order',
];

// Operator-approved exception (2026-10-01): shell chrome paint, token values only; sunset when @spec-kitty/elements
// ships top bar / flat nav row / rail-without-720-flip equivalents (design-library issues).
// Design-library issues: spec-kitty/spec-kitty-design#492 (rail flip), #493 (flush row density), #494 (top bar),
// #495 (aria-current=true), #496 (button icons), #497 (context sidebar, section header, eyebrow).
// Scope: ONLY the shell element files. Every other element keeps the layout-only rule above.
const SHELL_PAINT_PROPERTIES = [
  'background',
  'background-color',
  'border',
  'color',
  'font-size',
  'line-height',
  'border-block',
  'border-block-start',
  'border-block-end',
  'border-block-width',
  'border-block-style',
  'border-block-color',
  'border-inline',
  'border-inline-start',
  'border-inline-end',
  'border-inline-width',
  'border-inline-style',
  'border-inline-color',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'font-family',
  'font-weight',
  'letter-spacing',
  'text-transform',
  'min-block-size',
];

// Keyword-only typography behaviour needed to truncate or wrap chrome text (no colour, length or font value).
// `--shell-band` is the one shell-private custom property: the shared block-size of the bottom band (token calc).
const SHELL_KEYWORD_PROPERTIES = ['text-overflow', 'white-space', 'overflow-wrap', '--shell-band', '--sk-mission-shell-content-padding'];

const SHELL_FILES = [
  '**/src/elements/sk-mission-shell/**',
  '**/src/elements/sk-shell-nav-item/**',
  '**/src/elements/sk-shell-tree/**',
];

// Operator-approved exceptions E-04 and E-08 to E-16 (CP-1, 2026-10-03, and the Storybook review, 2026-10-04; contracts/gates.md):
// scoped local overrides for the missions-and-pipeline-screens elements, token values only, each sunset on a spec-kitty-design
// issue (E-04 library stepper G-04, issue pending; E-08 #505; E-09 #506; E-10 #507; E-11 #508; E-12 #509; E-14 #511;
// E-16 #514). E-13 (#510, panel spacing) has one entry per screen file below. An override REPLACES a rule's options for a file, so
// the exceptions are declared once here and merged per file below; no file gets more than its own exceptions.
// Entry options: `properties` (allowed beyond layout), `strict` (made strict for the file), `unstrict` (taken OUT of the strict
// list, so the pinned `values` entry is its only guard), `keywords` (extra non-token words, a map property -> words: a word is refused on every other property the file checks), `values` (the allowed values of a
// property; the token form is added unless the property is `pinned`), `pxProperties` / `emProperties` / `chProperties` / `vwProperties` / `vhProperties` (units allowed; `chProperties` is the Artifact Viewer's `ch` grant, on those properties only), `allowFunctions` (colour functions opened for the file).
const TOKEN_VALUE = '/^var\\(--sk-[a-z0-9-]+\\)$/';
const EXCEPTIONS = [
  {
    // Sunset: the library stepper with a connector (G-04); no design-library issue is filed yet (issue pending).
    id: 'E-04',
    files: ['sk-phase-bar/sk-phase-bar.ts'],
    properties: ['background'],
  },
  {
    id: 'E-08',
    files: ['sk-pipeline-screen/sk-pipeline-screen.ts', 'sk-pipeline-screen/pipeline-parts.ts'],
    properties: ['flex-basis'],
    values: { 'flex-basis': ['260px'] },
    pxProperties: ['flex-basis'],
  },
  {
    id: 'E-09',
    files: ['sk-work-package-board/sk-work-package-board.ts', 'sk-work-package-board/card-parts.ts'],
    properties: ['background', 'border', 'border-radius', 'font-family', 'font-size', 'text-transform', 'letter-spacing', 'color'],
    strict: ['font-family', 'letter-spacing'],
    keywords: { border: ['solid'], 'text-transform': ['none'] },
    values: { 'text-transform': ['uppercase', 'none'] },
  },
  {
    // E-09 extension (operator ruling on the WP07 review; extended to the inspector eyebrow on the WP09 review, N-6): ONE
    // pinned literal, sunset on #506 (tracking token). Stylelint cannot scope by selector, so the scope is the files:
    // the board file and pipeline-parts.ts only.
    id: 'E-09',
    files: ['sk-work-package-board/sk-work-package-board.ts', 'sk-pipeline-screen/pipeline-parts.ts'],
    properties: ['letter-spacing'],
    strict: ['letter-spacing'],
    keywords: { 'letter-spacing': ['0.08em'] },
    values: { 'letter-spacing': ['0.08em'] },
    emProperties: ['letter-spacing'],
  },
  {
    id: 'E-10',
    files: ['sk-work-package-board/sk-work-package-board.ts'],
    properties: ['min-inline-size'],
    values: { 'min-inline-size': ['90px'] },
    pxProperties: ['min-inline-size'],
  },
  {
    id: 'E-11',
    files: ['sk-work-package-board/card-parts.ts'],
    properties: ['white-space', 'overflow-wrap', 'word-break', 'hyphens', 'text-overflow'],
    values: {
      'white-space': ['normal', 'nowrap'],
      'overflow-wrap': ['normal', 'break-word'],
      'word-break': ['normal'],
      hyphens: ['manual'],
      'text-overflow': ['ellipsis'],
    },
  },
  {
    // E-11 extension (operator ruling Q2 on the WP09 review): the lane title wraps only between words and ellipsizes a
    // single over-long word. The board file gets ONLY these four keyword properties, one value each.
    id: 'E-11',
    files: ['sk-work-package-board/sk-work-package-board.ts'],
    properties: ['overflow-wrap', 'word-break', 'hyphens', 'text-overflow'],
    values: { 'overflow-wrap': ['normal'], 'word-break': ['normal'], hyphens: ['manual'], 'text-overflow': ['ellipsis'] },
  },
  {
    id: 'E-12',
    files: ['sk-pipeline-screen/pipeline-parts.ts'],
    // Extended on the WP09 review (operator ruling Q1 and the phase band; sunset #509): the inspector is a flat
    // full-height panel and the phase band keeps the prototype's rule, token values only; `solid` is the only
    // non-token word; the left rule and the band rule are the only borders; the radius is a token or 0.
    properties: ['font-family', 'font-size', 'text-transform', 'letter-spacing', 'color', 'background', 'border-inline-start', 'border-block-end', 'border-block-start', 'border-inline-end', 'border-radius', 'white-space', 'overflow-wrap'],
    // Extended on the operator Storybook review (item 8b, 2026-10-04): at the stacked tiers the inspector is a contained panel,
    // so `border-block-start` and `border-inline-end` join the start and block-end rules, token values only, `solid` only.
    strict: ['font-family', 'letter-spacing', 'border-inline-start', 'border-block-end', 'border-block-start', 'border-inline-end'],
    keywords: Object.fromEntries(['border-inline-start', 'border-block-end', 'border-block-start', 'border-inline-end'].map((p) => [p, ['solid']])),
    values: { 'text-transform': ['uppercase', 'none'], 'white-space': ['normal'], 'overflow-wrap': ['break-word'] },
  },
  {
    // E-13, the Pipeline screen's half (N-7, DR-9; operator ruling on the WP08 review, 2026-10-03; sunset #510): the
    // loading and empty panels take the prototype's card chrome and display face. Token values only; `dashed` (empty
    // panel) and `solid` (loading panel) are the only non-token words. The Missions screen's half is the next entry; each
    // half is scoped to its own file.
    id: 'E-13',
    files: ['sk-pipeline-screen/sk-pipeline-screen.ts'],
    properties: ['background', 'border', 'border-radius', 'font-weight', 'font-family'],
    strict: ['font-weight', 'font-family'],
    keywords: { border: ['dashed', 'solid'] },
  },
  {
    // E-13, the Missions screen's half (N-7, DR-9; operator ruling on the WP08 review, 2026-10-03; sunset #510): the
    // loading, empty and no-match panels take the prototype's spacing, card chrome and display face. Token values only;
    // `dashed` (empty and no-match panels) and `solid` (loading panel) are the only non-token words. Scope: the Missions
    // screen file only; the Pipeline screen's half is the entry above.
    id: 'E-13',
    files: ['sk-missions-screen/sk-missions-screen.ts'],
    properties: ['background', 'border', 'border-radius', 'font-weight', 'font-family'],
    strict: ['font-weight', 'font-family'],
    keywords: { border: ['dashed', 'solid'] },
  },
  {
    // E-16 (operator Storybook review, phase band at 390, 2026-10-04; sunset spec-kitty-design#514, a focusable overflow
    // scroller with edge fades in the library): while the phase band scrolls it is a keyboard region with a focus ring and
    // an edge fade. Token values only: the ring is a token width, `solid`, a token colour and an inward offset (a calc of
    // the same token width); the fade is a `linear-gradient` from a token to `transparent` and ignores the pointer. Scope:
    // pipeline-parts.ts only.
    id: 'E-16',
    files: ['sk-pipeline-screen/pipeline-parts.ts'],
    properties: ['outline-width', 'outline-style', 'outline-color', 'outline-offset', 'background-image', 'pointer-events'],
    values: {
      // Empty lists: only the token form (TOKEN_VALUE is added by the merge), so a colour or width keyword is refused.
      'outline-width': [],
      'outline-color': [],
      'outline-style': ['solid'],
      'outline-offset': ['/^calc\\(-1 \\* var\\(--sk-border-width-[0-9]+\\)\\)$/'],
      'background-image': ['/^linear-gradient\\(to (?:left|right), var\\(--sk-[a-z0-9-]+\\), transparent\\)$/'],
      'pointer-events': ['none'],
    },
  },
  {
    // E-18 (CP-1 operator ruling, 2026-10-05; sunset spec-kitty-design#516, a compact density for `sk-card`; this file only):
    // the panels are the library's `sk-card` with an `sk-section-header` title, restyled in EXACTLY five respects, each pinned to
    // one token: (1) border width 1px, (2) radius, (3) padding, (4) title size and weight, (5) the gap between title and body
    // (a block margin, with the header's own row gap at 0). Nothing else: no colour, no letter-spacing, no flat-chrome property. Padding and margin-block are
    // layout properties already allowed everywhere; pinning them here makes the token the only value this file may write.
    id: 'E-18',
    files: ['sk-work-package-screen/panel-parts.ts'],
    properties: ['border-width', 'border-radius', 'padding', 'font-size', 'font-weight', 'margin-block', 'row-gap'],
    strict: ['border-width', 'font-weight'],
    values: {
      'border-width': ['var(--sk-border-width-1)'],
      'border-radius': ['var(--sk-radius-md)'],
      padding: ['var(--sk-space-5)'],
      'font-size': ['var(--sk-text-lg)'],
      'font-weight': ['var(--sk-weight-bold)'],
      'margin-block': ['0 var(--sk-space-4)'],
      'row-gap': ['0'],
    },
    pinned: ['border-width', 'border-radius', 'padding', 'font-size', 'font-weight', 'margin-block', 'row-gap'],
  },
  {
    // E-21 (operator ruling during WP05, 2026-10-05; kept as a deliberate local allowance): a single over-long word in the title
    // band is ellipsized, and a long unbroken Facts value wraps. One keyword property, one value, per file; nothing else.
    id: 'E-21',
    files: ['sk-work-package-screen/header-parts.ts'],
    properties: ['text-overflow'],
    values: { 'text-overflow': ['ellipsis'] },
  },
  {
    id: 'E-21',
    files: ['sk-work-package-screen/facts-parts.ts'],
    properties: ['overflow-wrap'],
    values: { 'overflow-wrap': ['break-word'] },
  },
  {
    // E-21, review-parts.ts (operator ruling during WP09): `break-word` for the latest-result values, which are text and not pills.
    id: 'E-21',
    files: ['sk-work-package-screen/review-parts.ts'],
    properties: ['overflow-wrap'],
    values: { 'overflow-wrap': ['break-word'] },
  },
  {
    // E-21, shared-parts.ts (operator ruling during WP09, superseding "pills wrap"): EVERY pill ellipsizes, by one rule on
    // `sk-pill-tag::part(tag)` in this one file, so a library fix replaces one block. Keywords and `100%` only.
    id: 'E-21',
    files: ['sk-work-package-screen/shared-parts.ts'],
    properties: ['max-width', 'overflow', 'text-overflow', 'white-space'],
    values: { 'max-width': ['100%'], overflow: ['hidden'], 'text-overflow': ['ellipsis'], 'white-space': ['nowrap'] },
    keywords: { 'max-width': ['100%'] },
  },
  {
    // E-21, third file (derived from the CP-1 ruling, which allowed "layout-only ::part(button) rules for long titles"): a dependency
    // node's `::part(button)` breaks one over-long word and aligns its text to the start. Two keyword declarations, one value each.
    id: 'E-21',
    files: ['sk-work-package-screen/chain-parts.ts'],
    properties: ['overflow-wrap', 'text-align'],
    values: { 'overflow-wrap': ['break-word'], 'text-align': ['start'] },
  },
  // E-22 (operator ruling on the pre-merge squad, 2026-10-06; NO entry here, because every declaration it covers is already a layout
  // property with a token or a keyword, so the rules pass the base config): the `::part` rules that reach into a library element's
  // shadow DOM beyond E-18 and E-21. `header-parts.ts`: the breadcrumb `sk-button::part(button)` inline padding (sunset
  // spec-kitty-design#518, a compact inline padding for `sk-button`). `review-parts.ts`: the nested `[data-cycles] sk-card::part(card)`
  // padding (sunset #516, the compact card density). `files-parts.ts`: `sk-action-row::part(trigger)` grid areas, columns and
  // row gap, `display: none` on the `title`, `metadata`, `supporting` and `controls` parts, and the `tags` block margin (sunsets #493
  // and #508, flush empty parts and a card layout; `layout="card"` and `presentation="flush"` were tried and neither reproduces the
  // row, it grows from 102 px to 120 and 122 px). The exact set of `::part` selectors per file is pinned by
  // `packages/mission-ui/test/wp-part-selectors.test.ts`: an unlisted `::part` rule fails there.
  {
    // E-19 (b) (operator ruling 2026-10-05; sunset: a library breakpoint or container token, G-13; this file only): the track
    // minimums of the prototype's `.detail-grid`, as `px` lengths inside `minmax()` of `grid-template-columns` and nowhere
    // else. The values are pinned: the two recipes with their minimums, and the explicit tracks without any length. E-19 (a)
    // (the container-query lengths) was deleted at CP-1: the probe passed, so no exception exists for `@container`.
    id: 'E-19 (b)',
    files: ['sk-work-package-screen/sk-work-package-screen.ts'],
    properties: ['grid-template-columns'],
    values: {
      'grid-template-columns': [
        'minmax(220px, .8fr) minmax(320px, 1.3fr) minmax(220px, .8fr)',
        'minmax(220px, .8fr) minmax(320px, 1.2fr)',
        'minmax(0, 1fr) minmax(0, 1fr)',
        'minmax(0, 1fr)',
      ],
    },
    pinned: ['grid-template-columns'],
    pxProperties: ['grid-template-columns'],
  },
  // Artifact Viewer (mission-ui#7, IC-06a). E-23 and E-25 to E-28 are the operator's CP-1 rulings of 2026-10-07 (spec.md Clarifications,
  // contracts/gates.md): the values below are the ruled values, a property needed beyond them is a change request. Sunsets: E-23 G-14 (spec-kitty-design#519) and
  // G-19 (spec-kitty-design#505 and #519), E-25 G-15 (spec-kitty-design#520), E-26 G-16 (spec-kitty-design#521), E-28 G-19 (spec-kitty-design#505). E-27 is ESLint-only (eslint.config.mjs) and has no entry here; E-29 has the ellipsis entry below besides its ESLint override.
  {
    // E-23: prose typography of the rendered document and its tables (token CSS kept; the `ch` grant for the paragraph measure).
    // `letter-spacing` and `text-wrap` are deliberately absent (dropped at CP-1). `strict` makes the token-only rule apply to four
    // properties that are not in STRICT_PROPERTIES; `unstrict` leaves the pinned `max-width` and `line-height` values as their only guard.
    id: 'E-23',
    files: ['sk-artifact-screen/prose-styles.ts'],
    properties: ['color', 'font-family', 'font-size', 'font-weight', 'font-style', 'background', 'border', 'border-radius',
      'border-inline-start', 'border-collapse', 'padding-inline-start', 'text-align', 'vertical-align', 'white-space',
      'overflow-wrap', 'list-style-type', 'text-decoration', 'cursor',
      'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'max-width', 'line-height',
      // WP09 extension (operator ruling 2026-10-08): the eyebrow's uppercase and 0.08em tracking (the CP-1 drop still applies to every
      // other letter-spacing) and the heading line-height 1.2. Stylelint cannot scope by selector, so the values are pinned.
      'text-transform', 'letter-spacing'],
    strict: ['font-family', 'font-weight', 'border-inline-start', 'padding-inline-start', 'letter-spacing'],
    // WP13 extension (operator Storybook review 2026-10-08): `width: max-content` on the table and `max-width: 30ch` on a cell, pinned.
    unstrict: ['max-width', 'line-height', 'width'],
    keywords: { border: ['solid'], 'border-inline-start': ['solid'], 'letter-spacing': ['0.08em'] },
    values: {
      'max-width': ['68ch', '30ch'], 'line-height': ['1.65', '1.2'], 'text-transform': ['uppercase'], 'letter-spacing': ['0.08em'],
      width: ['max-content'],
      'font-style': ['italic', 'normal'], 'border-collapse': ['collapse'], 'text-align': ['left', 'center', 'right'],
      'vertical-align': ['top'], 'white-space': ['pre', 'pre-wrap'], 'overflow-wrap': ['break-word'],
      'list-style-type': ['disc', 'decimal', 'none'], 'text-decoration': ['underline', 'none'], cursor: ['pointer'],
      'outline-width': [], 'outline-color': [], 'outline-style': ['solid'],
      'outline-offset': ['/^calc\\(-1 \\* var\\(--sk-border-width-[0-9]+\\)\\)$/'],
    },
    pinned: ['max-width', 'line-height', 'text-decoration', 'cursor', 'letter-spacing', 'width'],
    pxProperties: ['max-width'],
    chProperties: ['max-width'],
    emProperties: ['letter-spacing'],
  },
  {
    // E-25 (sunset G-15, spec-kitty-design#520): the raw and escaped-source block. `pre-wrap` wraps at spaces; there is NO measure (DA-39 is superseded: the prototype's
    // block takes its pane, and 900px is a refused plant). NO `overflow-wrap` grant and NO box paint (`border`, `border-radius`, `background`): the prototype's block has no box. The ring is E-16's pattern.
    id: 'E-25',
    files: ['sk-artifact-screen/source-parts.ts'],
    // WP09 extension (operator ruling 2026-10-08): `line-height: 1.5`, the prototype's value (inherited from its body), pinned.
    properties: ['white-space', 'font-family', 'font-size', 'color', 'outline-width', 'outline-style', 'outline-color', 'outline-offset', 'line-height'],
    strict: ['font-family'],
    unstrict: ['line-height'],
    values: {
      'white-space': ['pre-wrap'], 'line-height': ['1.5'],
      'outline-width': [], 'outline-color': [], 'outline-style': ['solid'],
      'outline-offset': ['/^calc\\(-1 \\* var\\(--sk-border-width-[0-9]+\\)\\)$/'],
    },
    pinned: ['white-space', 'line-height'],
  },
  {
    // E-26: the tablist as a native button PAINTED with tokens (S-A5, ruled at CP-1). Token `border-color`, `background` and `color`
    // (the selected look is keyed on `aria-selected` in the selectors, which Stylelint cannot scope), and in `@media (forced-colors:
    // active)` a `Highlight` border on the selected tab (`CanvasText` on the others). The two system colours are granted on
    // `border-color` only (a `values` grant: `background` and `color` stay token-only, so the words are refused there by the strict rule).
    id: 'E-26',
    files: ['sk-artifact-screen/tab-parts.ts'],
    // WP09 extension (operator ruling 2026-10-08): the prototype's pill tray: the pill radius token, the 1px width token, `solid` and
    // `font: inherit`, each pinned to one value (the selected tab keeps a visible edge, so the state is not colour only).
    properties: ['border-color', 'background', 'color', 'border-radius', 'border-width', 'border-style', 'font'],
    values: {
      'border-color': ['Highlight', 'CanvasText'],
      'border-radius': ['var(--sk-radius-pill)'], 'border-width': ['var(--sk-border-width-1)'], 'border-style': ['solid'], font: ['inherit'],
    },
    pinned: ['border-radius', 'border-width', 'border-style', 'font'],
  },
  {
    // E-28, the inspector track (DA-39's sibling; the prototype's `.reading-layout`): `270px` inside `grid-template-columns` and
    // nowhere else, the two recipes pinned. The container-query lengths are in rem and need no entry.
    id: 'E-28',
    files: ['sk-artifact-screen/sk-artifact-screen.ts'],
    properties: ['grid-template-columns'],
    values: { 'grid-template-columns': ['minmax(0, 1fr) 270px', 'minmax(0, 1fr)'] },
    pinned: ['grid-template-columns'],
    pxProperties: ['grid-template-columns'],
  },
  {
    // E-28, the toolbar band (DA-40, kept at CP-1): `min-height: 68px`, pinned.
    id: 'E-28',
    files: ['sk-artifact-screen/toolbar-parts.ts'],
    properties: ['min-height'],
    values: { 'min-height': ['68px'] },
    pinned: ['min-height'],
    pxProperties: ['min-height'],
  },
  {
    // E-21 for the toolbar file name (operator ruling at WP09, 2026-10-08; sunset: the library's ellipsis or a mono file-name element):
    // the mono face token, and the shared-parts ellipsis recipe (`overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`,
    // `max-width: 100%`), each pinned. The full name stays in `title`.
    id: 'E-21',
    files: ['sk-artifact-screen/toolbar-parts.ts'],
    properties: ['font-family', 'max-width', 'overflow', 'text-overflow', 'white-space'],
    strict: ['font-family'],
    values: { 'font-family': ['var(--sk-font-mono)'], 'max-width': ['100%'], overflow: ['hidden'], 'text-overflow': ['ellipsis'], 'white-space': ['nowrap'] },
    keywords: { 'max-width': ['100%'] },
    pinned: ['font-family'],
  },
  {
    // E-29, the Work Package pill (CP-1 ruling 3; the orchestrator note at WP07, "the E-29 pill carries the shared ellipsis"): the four
    // E-21 ellipsis declarations, for the raw `button.sk-pill-tag` of `inspector-parts.ts` only (#5's rule targets `sk-pill-tag::part(tag)`
    // and cannot match a button). Keywords and `100%` only, each pinned. Sunset: G-21 (spec-kitty-design#524, a library interactive pill).
    id: 'E-29',
    files: ['sk-artifact-screen/inspector-parts.ts'],
    // WP11 ruling (2026-10-08): the same entry also resets the browser button border and sets the pointer (`border: 0`, `cursor: pointer`),
    // so the pill is the prototype's 26 px and not 30 px with a 2 px border.
    properties: ['max-width', 'overflow', 'text-overflow', 'white-space', 'border', 'cursor'],
    values: { 'max-width': ['100%'], overflow: ['hidden'], 'text-overflow': ['ellipsis'], 'white-space': ['nowrap'], border: ['0'], cursor: ['pointer'] },
    keywords: { 'max-width': ['100%'] },
    pinned: ['max-width', 'overflow', 'text-overflow', 'white-space', 'border', 'cursor'],
  },
  {
    // E-44 (operator ruling at WP11, 2026-10-08; sunset: a library heading scale for panels): the inspector group headings take the
    // prototype's `h3` size, `font-size: var(--sk-text-base)` and `line-height: 1.35`, both pinned, in `inspector-parts.ts` only.
    id: 'E-44',
    files: ['sk-artifact-screen/inspector-parts.ts'],
    properties: ['font-size', 'line-height'],
    unstrict: ['line-height'],
    values: { 'font-size': ['var(--sk-text-base)'], 'line-height': ['1.35'] },
    pinned: ['font-size', 'line-height'],
  },
  {
    // E-30 (operator ruling at WP08, 2026-10-08; sunset: the library's panel or card paint gap, the family of E-12): the prototype's
    // inspector rule and hero fill and its toolbar band rule and card fill, token values only, in the three files that draw them. Each
    // declaration is pinned to its recipe: the one-token rule with `solid`, and the two surface tokens.
    id: 'E-30',
    files: ['sk-artifact-screen/sk-artifact-screen.ts', 'sk-artifact-screen/inspector-parts.ts', 'sk-artifact-screen/toolbar-parts.ts'],
    properties: ['border-inline-start', 'border-block-start', 'border-block-end', 'background'],
    values: Object.fromEntries([
      ...['border-inline-start', 'border-block-start', 'border-block-end'].map((p) => [p, ['var(--sk-border-width-1) solid var(--sk-border-default)']]),
      ['background', ['var(--sk-surface-hero)', 'var(--sk-surface-card)']],
    ]),
    pinned: ['border-inline-start', 'border-block-start', 'border-block-end', 'background'],
  },
  {
    // E-45 (operator ruling at WP10, 2026-10-08; sunset: the library's panel or card paint gap, the family of E-12 and E-30): the
    // prototype's unavailable block (`05-artifact.html?state=unavailable`), token values only, in the two files that draw it: the dashed
    // card (border, card fill, radius), the uppercase eyebrow and the path in the mono face token, and the display heading size token.
    // Each declaration is pinned to its recipe; every other value, side and paint property is refused, and the paint is refused in
    // every sibling file (cases in `scripts/stylelint-exceptions.test.mjs`).
    id: 'E-45',
    files: ['sk-artifact-screen/refusal-parts.ts', 'sk-artifact-screen/state-parts.ts'],
    // Extension (operator ruling at WP10, cycle 2, standing prototype-fidelity preference): the eyebrow's 12px size token, subtle colour
    // token, semibold weight and 0.08em tracking, and the heading's display face token. Stylelint cannot scope by selector, so each value
    // is pinned in both files.
    // Second extension (WP10 review, cycle 3): the heading's bold weight and -0.01em tracking, the path's 14px size token, and the unitless
    // line heights 1.5 (body text) and 1.2 (heading), which close the measured card-height drift (197px against 186.8px).
    properties: ['border', 'background', 'border-radius', 'text-transform', 'font-family', 'font-size', 'color', 'font-weight', 'letter-spacing', 'line-height'],
    strict: ['font-family', 'font-weight', 'letter-spacing'],
    unstrict: ['line-height'],
    values: {
      border: ['var(--sk-border-width-1) dashed var(--sk-border-control)'],
      background: ['var(--sk-surface-card)'],
      'border-radius': ['var(--sk-radius-lg)'],
      'text-transform': ['uppercase'],
      'font-family': ['var(--sk-font-mono)', 'var(--sk-font-display)'],
      'font-size': ['var(--sk-text-2xl)', 'var(--sk-text-xs)', 'var(--sk-text-sm)'],
      color: ['var(--sk-fg-subtle)'],
      'font-weight': ['var(--sk-weight-semibold)', 'var(--sk-weight-bold)'],
      'letter-spacing': ['0.08em', '-0.01em'],
      'line-height': ['1.5', '1.2'],
    },
    keywords: { border: ['dashed'], 'letter-spacing': ['0.08em', '-0.01em'] },
    pinned: ['border', 'background', 'border-radius', 'text-transform', 'font-family', 'font-size', 'color', 'font-weight', 'letter-spacing', 'line-height'],
    emProperties: ['letter-spacing'],
  },
  {
    // E-14 (operator Storybook review, item 1, 2026-10-04; sunset spec-kitty-design#511, a joined segmented-choice variant):
    // the filter group is ONE joined segmented control. Per-corner `border-radius` (a token or 0)
    // and the shared inner border (`border-inline-start-width: 0`) on the library's segmented buttons. Scope: the filter
    // group file only.
    id: 'E-14',
    files: ['sk-filter-toggle-group/sk-filter-toggle-group.ts'],
    properties: ['border-radius', 'border-inline-start-width'],
    values: { 'border-inline-start-width': ['0'] },
    pinned: ['border-inline-start-width'],
  },
  // ---- Projects screen (mission-ui#9). E-31 to E-34 as ruled at CP-1 (2026-10-08, tracer-design-decisions.md "CP-1 confirmed");
  // each grant is pinned to its file and its values and proven in scripts/stylelint-exceptions.test.mjs (pass in the file, refused in
  // every sibling part file and in the other element, different values refused). E-31(a) to E-31(c) and E-34 are scoped to a
  // whole file because Stylelint cannot scope by selector: the selectors are named here so a reader knows what the grant is for.
  {
    // E-31 (a) (sunset: spec-kitty-design#525, an action-row hover paint): `sk-action-row:hover::part(row)` takes the prototype's
    // hover border and background; token values only (the implementer measures which tokens render rgb(129,129,139) and rgb(28,31,37)).
    id: 'E-31 (a)',
    files: ['sk-projects-screen/row-parts.ts'],
    properties: ['border-color', 'background-color'],
    strict: ['border-color', 'background-color'],
  },
  {
    // E-31 (b): the pill (`sk-pill-tag::part(tag)`), the version text and the row title (U5) do not wrap: nowrap and an ellipsis, nothing else.
    id: 'E-31 (b)',
    files: ['sk-projects-screen/row-parts.ts'],
    properties: ['white-space', 'text-overflow'],
    values: { 'white-space': ['nowrap'], 'text-overflow': ['ellipsis'] },
    pinned: ['white-space', 'text-overflow'],
  },
  {
    // E-31 (c) (sunset: spec-kitty-design#526, pill density and outlined mono): the health pill's 1px outline in the tone's foreground colour (token width, `solid`, token colour) and the mono face.
    id: 'E-31 (c)',
    // Extended at WP07 (2026-10-08): the dialog's "valid project" pill takes the same outlined mono treatment.
    files: ['sk-projects-screen/row-parts.ts', 'sk-open-project-dialog/folder-list-parts.ts'],
    properties: ['border', 'font-family'],
    strict: ['font-family'],
    keywords: { border: ['solid'] },
    values: { border: ['/^var\\(--sk-border-width-[0-9]+\\) solid var\\(--sk-[a-z0-9-]+\\)$/'], 'font-family': ['var(--sk-font-mono)'] },
    pinned: ['border', 'font-family'],
  },
  {
    // E-32 (sunset: spec-kitty-design#503, a modal dialog with slots): the dialog chrome, the backdrop and the mono path field, in
    // the dialog element's styles only. Every value is pinned. The two literals of the ruling are the shadow and the backdrop paint
    // (`rgb()` is opened for this one file; the pinned `box-shadow` and `background` values are the only places it can appear).
    id: 'E-32',
    files: ['sk-open-project-dialog/sk-open-project-dialog.ts'],
    properties: ['max-height', 'border', 'border-radius', 'background', 'color', 'box-shadow', 'font-family', 'font-size', 'font-weight', 'text-transform', 'letter-spacing', 'border-block-end', 'border-block-start'],
    unstrict: ['width'],
    strict: ['font-family', 'font-weight', 'letter-spacing', 'border-block-end', 'border-block-start'],
    keywords: { border: ['solid'], background: ['rgb(3 6 10 / 0.72)'], 'letter-spacing': ['0.08em'], 'border-block-end': ['solid'], 'border-block-start': ['solid'] },
    values: {
      width: ['min(680px, calc(100vw - 32px))'],
      'max-height': ['min(720px, calc(100vh - 32px))'],
      border: ['var(--sk-border-width-1) solid var(--sk-border-control)'],
      'border-radius': ['var(--sk-radius-lg)'],
      background: ['var(--sk-surface-card)', 'rgb(3 6 10 / 0.72)'],
      // E-32 (c) (CP-1 addendum): the subtle eyebrow and the muted hint and reason, the tokens the prototype renders.
      color: ['var(--sk-fg-body)', 'var(--sk-fg-subtle)', 'var(--sk-fg-muted)'],
      // E-32 (d) (second WP05 review): the dialog type scale. Base 14px (the hint), the 18px display title, the 600 form-input label.
      'font-size': ['var(--sk-text-xs)', 'var(--sk-text-sm)', 'var(--sk-text-lg)'],
      'font-weight': ['var(--sk-weight-semibold)'],
      'text-transform': ['uppercase'],
      'letter-spacing': ['0.08em'],
      'border-block-end': ['var(--sk-border-width-1) solid var(--sk-border-default)'],
      'border-block-start': ['var(--sk-border-width-1) solid var(--sk-border-default)'],
      'box-shadow': ['0 24px 80px rgb(0 0 0 / 0.48)'],
      'font-family': ['var(--sk-font-mono)', 'var(--sk-font-display)'],
    },
    pinned: ['width', 'max-height', 'border', 'border-radius', 'background', 'color', 'box-shadow', 'font-family', 'font-size', 'font-weight', 'text-transform', 'letter-spacing', 'border-block-end', 'border-block-start'],
    pxProperties: ['width', 'max-height', 'box-shadow'],
    emProperties: ['letter-spacing'],
    vwProperties: ['width'],
    vhProperties: ['max-height'],
    allowFunctions: ['rgb'],
  },
  {
    // E-33 (sunset: spec-kitty-design#527, a listbox and option): the paint of the raw `button role="option"` on hover and
    // selected, and its forced-colours border. The reset words of any strict property (`transparent`, `inherit`) stay allowed.
    id: 'E-33',
    files: ['sk-open-project-dialog/folder-list-parts.ts'],
    properties: ['background', 'color', 'border'],
    keywords: { border: ['solid'] },
    values: {
      background: ['var(--sk-surface-pill)', 'transparent'],
      color: ['var(--sk-fg-default)', 'inherit'],
      border: ['var(--sk-border-width-1) solid currentColor'],
    },
    pinned: ['background', 'color', 'border'],
  },
  {
    // E-33 (c) (WP07 ruling, 2026-10-08; sunset: spec-kitty-design#527, a listbox and option): the raw option button's reset and the listbox frame,
    // folder-list-parts.ts only. Token values only; `0` is the border reset, `start` and `solid` are the only keywords. The two minimum
    // block sizes are token calcs (46px, 220px) and need no entry; a px or rem literal is refused.
    id: 'E-33 (c)',
    files: ['sk-open-project-dialog/folder-list-parts.ts'],
    properties: ['border', 'border-radius', 'font', 'text-align', 'color', 'background', 'outline', 'outline-offset'],
    keywords: { outline: ['solid'], 'text-align': ['start'] },
    values: {
      border: ['0'],
      'border-radius': ['var(--sk-radius-sm)', 'var(--sk-radius-md)'],
      font: ['inherit'],
      'text-align': ['start'],
      color: ['var(--sk-fg-muted)'],
      background: ['var(--sk-surface-page)'],
      outline: ['var(--sk-border-width-2) solid var(--sk-border-focus)'],
      'outline-offset': ['var(--sk-border-width-2)'],
    },
    pinned: ['border', 'border-radius', 'font', 'text-align', 'color', 'background', 'outline', 'outline-offset'],
  },
  {
    // E-31 (d) (sunset: spec-kitty-design#526; WP07 review ruling, 2026-10-08): the pill's line-height 1.2 as the prototype's badge sets it (the library's 1.5 makes the
    // pill 28px against 24.4px), in the two files that draw a pill: row-parts.ts and folder-list-parts.ts.
    id: 'E-31 (d)',
    files: ['sk-projects-screen/row-parts.ts', 'sk-open-project-dialog/folder-list-parts.ts'],
    properties: ['line-height'],
    keywords: { 'line-height': ['1.2'] },
    values: { 'line-height': ['1.2'] },
    pinned: ['line-height'],
  },
  {
    // E-32 (f) (WP07 review ruling, 2026-10-08): the dialog's footer buttons and field size, dialog file only. The 14px size, the semibold
    // weight and the 44px minimum (a token calc) are already granted or lint-clean; the one new value is the Cancel pill's quiet border.
    id: 'E-32 (f)',
    files: ['sk-open-project-dialog/sk-open-project-dialog.ts'],
    properties: ['border'],
    keywords: { border: ['solid'] },
    values: { border: ['var(--sk-border-width-1) solid var(--sk-border-default)'] },
    pinned: ['border'],
  },
  {
    // E-32 (e) (WP07 ruling, 2026-10-08): the dialog's base line-height 1.5 and the title's 1.3, as the prototype page sets them.
    id: 'E-32 (e)',
    files: ['sk-open-project-dialog/sk-open-project-dialog.ts'],
    properties: ['line-height'],
    keywords: { 'line-height': ['1.5', '1.3'] },
    values: { 'line-height': ['1.5', '1.3'] },
    pinned: ['line-height'],
  },
  {
    // E-34 (sunset: spec-kitty-design#529, a compact page-header scale; the number is reused for the page header typography; S1 showed no family exception is needed): the 24px title and
    // the 12px mono uppercase eyebrow of `sk-page-header` and of the "Recent projects" toolbar eyebrow, all in header-parts.ts.
    // The sizes are the tokens that render 24px and 12px; the tracking is the prototype's 0.08em (as the E-09 extension, no token
    // exists); the colour is the subtle foreground token (CP-1 addendum).
    id: 'E-34',
    files: ['sk-projects-screen/header-parts.ts'],
    properties: ['font-size', 'font-family', 'text-transform', 'letter-spacing', 'color'],
    strict: ['font-family', 'letter-spacing'],
    keywords: { 'letter-spacing': ['0.08em'] },
    values: {
      'font-size': ['var(--sk-text-2xl)', 'var(--sk-text-xs)'],
      'font-family': ['var(--sk-font-mono)'],
      'text-transform': ['uppercase'],
      'letter-spacing': ['0.08em'],
      // CP-1 addendum (2026-10-08): "muted" means the token the prototype renders for `.eyebrow`, the subtle foreground.
      color: ['var(--sk-fg-subtle)'],
    },
    pinned: ['font-size', 'font-family', 'text-transform', 'letter-spacing', 'color'],
    emProperties: ['letter-spacing'],
  },
  {
    // E-34 (b) (sunset: #529; CP-1 addendum, 2026-10-08): the screen header band's 1px bottom border, header-parts.ts only. The 76px minimum needs
    // no entry: `min-height: calc(var(--sk-space-10) + var(--sk-space-3))` (64px + 12px) is already lint-clean; a px or rem literal is refused.
    id: 'E-34 (b)',
    files: ['sk-projects-screen/header-parts.ts'],
    properties: ['border-block-end'],
    strict: ['border-block-end'],
    keywords: { 'border-block-end': ['solid'] },
    values: { 'border-block-end': ['var(--sk-border-width-1) solid var(--sk-border-default)'] },
    pinned: ['border-block-end'],
  },
  {
    // E-33 (b) (CP-1 addendum): the whole-list state panel look (DP-18), state-parts.ts only, mirroring the Missions screen's E-13 panel
    // values (the #7 E-45 precedent): card fill, dashed (message) or solid (loading) border, large radius, display face, bold. The
    // panel's padding is a token on a layout property, so it needs no entry. Sunset: spec-kitty-design#510.
    id: 'E-33 (b)',
    files: ['sk-projects-screen/state-parts.ts'],
    properties: ['background', 'border', 'border-radius', 'font-weight', 'font-family'],
    strict: ['font-weight', 'font-family'],
    keywords: { border: ['dashed', 'solid'] },
    values: {
      background: ['var(--sk-surface-card)'],
      border: ['var(--sk-border-width-1) dashed var(--sk-border-control)', 'var(--sk-border-width-1) solid var(--sk-border-default)'],
      'border-radius': ['var(--sk-radius-lg)'],
      'font-weight': ['var(--sk-weight-bold)'],
      'font-family': ['var(--sk-font-display)'],
    },
    pinned: ['background', 'border', 'border-radius', 'font-weight', 'font-family'],
  },
  {
    // E-34 (c) (sunset: #529; WP06 ruling, 2026-10-08, operator: grant the screen type; values measured against 01-projects.html at 1280): the screen
    // host's base type, 14px on a 1.5 line (the prototype body). Pinned to the screen file.
    id: 'E-34 (c)',
    files: ['sk-projects-screen/sk-projects-screen.ts'],
    properties: ['font-size', 'line-height'],
    keywords: { 'line-height': ['1.5'] },
    values: { 'font-size': ['var(--sk-text-sm)'], 'line-height': ['1.5'] },
    pinned: ['font-size', 'line-height'],
  },
  {
    // E-34 (c), header-parts.ts: the h1 takes the display face, the default colour, -0.01em tracking and a 1.2 line; the muted copy the
    // muted colour; the eyebrows are semibold; the toolbar count is 14px (the prototype's `.mono.muted`). Token values, no other literal.
    id: 'E-34 (c)',
    files: ['sk-projects-screen/header-parts.ts'],
    properties: ['font-size', 'font-family', 'color', 'letter-spacing', 'line-height', 'font-weight'],
    strict: ['font-weight'],
    keywords: { 'letter-spacing': ['-0.01em'], 'line-height': ['1.2'] },
    values: {
      'font-size': ['var(--sk-text-sm)'],
      'font-family': ['var(--sk-font-display)'],
      color: ['var(--sk-fg-default)', 'var(--sk-fg-muted)'],
      'letter-spacing': ['-0.01em'],
      'line-height': ['1.2'],
      'font-weight': ['var(--sk-weight-semibold)'],
    },
    pinned: ['font-size', 'font-family', 'color', 'letter-spacing', 'line-height', 'font-weight'],
    emProperties: ['letter-spacing'],
  },
  {
    // E-34 (d) (sunset: #529; WP06 review ruling, standing prototype-fidelity preference), header-parts.ts only: the "Open project" button's 44px minimum
    // block size as one token calc (40px + 4px). Its 14px size and semibold weight are the E-34 (c) values; its padding is token padding (layout).
    id: 'E-34 (d)',
    files: ['sk-projects-screen/header-parts.ts'],
    properties: ['min-block-size'],
    values: { 'min-block-size': ['calc(var(--sk-space-8) + var(--sk-space-1))'] },
    pinned: ['min-block-size'],
  },
  {
    // E-34 (c), row-parts.ts: the row text (version, location, side block) at 14px, the project name bold, the pill regular.
    id: 'E-34 (c)',
    files: ['sk-projects-screen/row-parts.ts'],
    properties: ['font-size', 'font-weight'],
    strict: ['font-weight'],
    values: { 'font-size': ['var(--sk-text-sm)'], 'font-weight': ['var(--sk-weight-bold)', 'var(--sk-weight-normal)'] },
    pinned: ['font-size', 'font-weight'],
  },
  {
    // E-33 (b) addendum (WP06 ruling): #4's panel heading size, 18px, in state-parts.ts only.
    id: 'E-33 (b)',
    files: ['sk-projects-screen/state-parts.ts'],
    properties: ['font-size'],
    values: { 'font-size': ['var(--sk-text-lg)'] },
    pinned: ['font-size'],
  },
  {
    // Narrow column (DP-22, CP-1): `max-inline-size` has no lint-clean form (not an allowed property, and no token or unit-free
    // spelling of 900px exists), so ONE pinned declaration is granted, in the screen file: `width: min(900px, 100%)`.
    id: 'DP-22',
    files: ['sk-projects-screen/sk-projects-screen.ts'],
    unstrict: ['width'],
    values: { width: ['min(900px, 100%)'] },
    pinned: ['width'],
    pxProperties: ['width'],
  },
];

const LENGTH_UNITS = ['px', 'em', 'ch', 'vw', 'vh'];
const FORBIDDEN_FUNCTIONS = ['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'color-mix'];

function unique(list) {
  return [...new Set(list)];
}

function exceptionOverrides() {
  const byFile = new Map();
  for (const exception of EXCEPTIONS) {
    for (const file of exception.files) {
      byFile.set(file, [...(byFile.get(file) ?? []), exception]);
    }
  }
  return [...byFile].map(([file, list]) => {
    const pick = (key) => unique(list.flatMap((exception) => exception[key] ?? []));
    const values = {};
    for (const exception of list) {
      for (const [property, allowed] of Object.entries(exception.values ?? {})) {
        values[property] = unique([...(values[property] ?? []), ...allowed]);
      }
    }
    const pinned = pick('pinned');
    // Keyword grants per property: the `keywords` maps plus the words a `values` entry pins (e.g. `text-transform: none`).
    const grants = {};
    for (const exception of list) {
      for (const [property, words] of Object.entries(exception.keywords ?? {})) {
        grants[property] = unique([...(grants[property] ?? []), ...words]);
      }
      for (const [property, allowed] of Object.entries(exception.values ?? {})) {
        grants[property] = unique([...(grants[property] ?? []), ...allowed]);
      }
    }
    const keywords = unique(list.flatMap((exception) => Object.values(exception.keywords ?? {}).flat()));
    // Units opened per property: `pxProperties`, `emProperties`, `chProperties`, `vwProperties` and `vhProperties` (their values are pinned above).
    const owners = Object.fromEntries(LENGTH_UNITS.map((unit) => [unit, pick(`${unit}Properties`)]));
    const named = unique(LENGTH_UNITS.flatMap((unit) => owners[unit]));
    const ids = unique(list.map((exception) => exception.id)).join(', ');
    const rules = {
      'scale-unlimited/declaration-strict-value': [
        unique([...STRICT_PROPERTIES, ...pick('strict')]).filter((property) => !pick('unstrict').includes(property)),
        {
          ignoreValues: unique([...TOKEN_ONLY, ...keywords]),
          ignoreFunctions: false,
          message: `Exception ${ids}: use var(--sk-*), 0, auto, inherit, currentColor or transparent (\${value} is a literal).`,
        },
      ],
      'property-allowed-list': unique([...LAYOUT_PROPERTIES, ...pick('properties')]),
    };
    if (keywords.length > 0) {
      // The strict rule's ignoreValues is file-wide, so each keyword is refused again on every property the file checks
      // (strict or granted by an exception) unless a row grants it there. Layout properties (display, flex) stay as they are.
      const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const checked = unique([...STRICT_PROPERTIES, ...pick('strict'), ...pick('properties')]).filter((property) => !pick('unstrict').includes(property));
      const disallowed = {};
      for (const property of checked) {
        const refused = keywords.filter((word) => !(grants[property] ?? []).includes(word));
        if (refused.length > 0) disallowed[property] = refused.map((word) => `/(?:^|\\s)${escape(word)}(?:\\s|$)/`);
      }
      rules['declaration-property-value-disallowed-list'] = disallowed;
    }
    if (Object.keys(values).length > 0) {
      rules['declaration-property-value-allowed-list'] = Object.fromEntries(
        Object.entries(values).map(([property, allowed]) => [
          property,
          owners.px.includes(property) || pinned.includes(property) ? allowed : [TOKEN_VALUE, ...allowed],
        ]),
      );
    }
    if (named.length > 0) {
      // Each unit is allowed, and only on the properties that own it.
      // Stylelint applies the FIRST matching property key only, so the keys partition the properties:
      // properties with no unit exception forbid every opened unit, the others forbid the units they do not own.
      const exact = (names) => `/^(?:${names.join('|')})$/`;
      rules['unit-allowed-list'] = ['%', 'fr', ...LENGTH_UNITS.filter((unit) => owners[unit].length > 0)];
      const table = { [`/^(?!(?:${named.join('|')})$)/`]: LENGTH_UNITS };
      const groups = new Map();
      for (const property of named) {
        const owned = LENGTH_UNITS.filter((unit) => owners[unit].includes(property));
        groups.set(owned.join(','), [...(groups.get(owned.join(',')) ?? []), property]);
      }
      for (const [owned, properties] of groups) table[exact(properties)] = LENGTH_UNITS.filter((unit) => !owned.split(',').includes(unit));
      rules['declaration-property-unit-disallowed-list'] = table;
    }
    // A file may be granted a colour function (E-32: `rgb()` for the shadow and the backdrop); the pinned values are then its only guard.
    const allowFunctions = pick('allowFunctions');
    if (allowFunctions.length > 0) rules['function-disallowed-list'] = FORBIDDEN_FUNCTIONS.filter((name) => !allowFunctions.includes(name));
    return { files: [`**/src/elements/${file}`], rules };
  });
}

export default {
  plugins: ['stylelint-declaration-strict-value'],
  overrides: [
    { files: ['**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}'], customSyntax: 'postcss-lit' },
    {
      // Operator-approved exception (2026-10-01): shell chrome paint, token values only; sunset when
      // @spec-kitty/elements ships top bar / flat nav row / rail-without-720-flip equivalents (design-library issues:
      // spec-kitty/spec-kitty-design#492 to #497, listed above).
      files: SHELL_FILES,
      rules: {
        'scale-unlimited/declaration-strict-value': [
          [...STRICT_PROPERTIES, ...SHELL_PAINT_PROPERTIES.filter((property) => property !== 'text-transform' && property !== 'min-block-size')],
          {
            // `solid` and `none` are the only non-token words: border style and border/background removal.
            ignoreValues: [...TOKEN_ONLY, 'none', 'solid'],
            ignoreFunctions: false,
            message: 'Shell paint: use var(--sk-*), 0, none, solid, transparent, currentColor or inherit (${value} is a literal).',
          },
        ],
        'property-allowed-list': [...LAYOUT_PROPERTIES, ...SHELL_PAINT_PROPERTIES, ...SHELL_KEYWORD_PROPERTIES],
        // The shell-private band property takes a calc of two library tokens, nothing else.
        'declaration-property-value-allowed-list': {
          '--shell-band': ['/^calc\\(var\\(--sk-[a-z0-9-]+\\) [+-] var\\(--sk-[a-z0-9-]+\\)\\)$/'],
          // The public content-padding property of the shell: one library space token, nothing else.
          '--sk-mission-shell-content-padding': ['/^var\\(--sk-space-[0-9]+\\)$/'],
        },
      },
    },
    ...exceptionOverrides(),
  ],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      STRICT_PROPERTIES,
      {
        ignoreValues: TOKEN_ONLY,
        ignoreFunctions: false,
        message: 'Use var(--sk-*), 0, auto, inherit, currentColor or transparent (${value} is a literal).',
      },
    ],
    'color-no-hex': true,
    'function-disallowed-list': FORBIDDEN_FUNCTIONS,
    'property-allowed-list': LAYOUT_PROPERTIES,
    'unit-allowed-list': ['%', 'fr'],
  },
};
