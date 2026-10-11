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
// property; the token form is added unless the property is `pinned`), `pxProperties` / `emProperties` (units allowed).
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
  {
    // E-40 (CP-1 confirmed 2026-10-11, widened; sunset: a spec-kitty-design record-row element and a leading token; this file only):
    // the Ops row is a plain `li` with the project grid, so its frame (`border` as a token width plus `solid`, `border-radius`,
    // `background`) and its typography (`font-size`, `font-family`, `font-weight`, `font-variant-numeric`, `color`) are written here.
    // Token values only, except the pinned literals of TWO properties: `line-height` (`1.5`, and `1.2` of Ops G-2; no line-height token
    // exists) and `font-variant-numeric: tabular-nums` (no numeric token exists; no token is accepted for that property). The
    // `tabular-nums` literal comes from the WP04 fix-round ruling of 2026-10-11 (aligned digits in the instants and the badge), not
    // from CP-1, and is recorded here as part of E-40. The grants of the 2026-10-11 reviews are named Ops G-1 to Ops G-7 (the "Ops"
    // keeps them apart from #10's G-n) and are all inside this block or their own:
    //   Ops G-1  `border-block-end` (a token width, `solid`, a token colour) on the fact rows, the last row reset to 0;
    //   Ops G-2  `line-height: 1.2` on the badge part;
    //   Ops G-3  the page pills' badge clause (the next block);
    //   Ops G-4  the state card, Ops G-5 the profile wrap, Ops G-6 the empty-look typography and Ops G-7 `max-width: 100%` on the badge
    //            (their own blocks below).
    // Second clause, the status badge keeps `sk-pill-tag` and takes the outline border and the mono font through the same two
    // properties; Stylelint cannot scope by selector, so the file is the scope and the selectors are pinned in
    // packages/mission-ui/test/ops-part-selectors.test.ts (the badge `data-ops-badge`; E-43's `data-ops-id` and `data-ops-evidence`).
    // Fact values and terms wrap instead of ellipsizing (operator ruling on A11Y-001, 2026-10-11): E-42's ellipsis no longer applies to them.
    // E-41 (a px term minimum) was DELETED at CP-1 and its number stays unused: the calc form passes the unmodified config.
    id: 'E-40',
    files: ['sk-ops-screen/ops-row-parts.ts'],
    properties: ['border', 'border-radius', 'background', 'font-size', 'font-family', 'font-weight', 'font-variant-numeric', 'color', 'line-height', 'border-block-end'],
    strict: ['font-family', 'font-weight', 'border-block-end'],
    unstrict: ['line-height', 'font-variant-numeric'],
    keywords: { border: ['solid'], 'border-block-end': ['solid'] },
    values: { 'line-height': ['1.5', '1.2'], 'font-variant-numeric': ['tabular-nums'] },
    pinned: ['line-height', 'font-variant-numeric'],
  },
  {
    // E-40 badge clause, page file (Ops G-3, 2026-10-11; same sunset as E-40; this file only): the "Read only" and count pills take the
    // prototype's outlined mono badge, through the five properties of the badge look and nothing else of E-40: no radius, background,
    // size or colour here. Token values only, except TWO pinned literals: `line-height: 1.2` (Ops G-2) and `font-variant-numeric: tabular-nums`.
    // Stylelint cannot scope by selector, so the file is the scope and the selector is pinned in
    // packages/mission-ui/test/ops-part-selectors.test.ts (`sk-pill-tag[data-ops-page-badge]::part(tag)`, its own attribute so that the row badge rules never reach the page pills; the other `::part` rules in
    // the file are layout-only and need no grant: `sk-section-header[data-ops-section-head]::part(action)` (grid-row, justify-self) and
    // `sk-section-header[data-ops-section-head]::part(header)` (grid-template-columns, grid-template-areas): the 588 px stack).
    id: 'E-40',
    files: ['sk-ops-screen/ops-page-parts.ts'],
    properties: ['border', 'font-family', 'font-weight', 'font-variant-numeric', 'line-height'],
    strict: ['font-family', 'font-weight'],
    unstrict: ['line-height', 'font-variant-numeric'],
    keywords: { border: ['solid'] },
    values: { 'line-height': ['1.2'], 'font-variant-numeric': ['tabular-nums'] },
    pinned: ['line-height', 'font-variant-numeric'],
  },
  {
    // E-42 (CP-1 confirmed, narrowed; sunset: E-21's): the words-only wrapping keywords (`text-overflow`, `white-space`, and
    // `overflow-wrap` as in E-21) for the Ops row and page part files. `overflow` needs no grant.
    id: 'E-42',
    files: ['sk-ops-screen/ops-row-parts.ts', 'sk-ops-screen/ops-page-parts.ts'],
    properties: ['text-overflow', 'white-space', 'overflow-wrap'],
    values: { 'text-overflow': ['ellipsis'], 'white-space': ['nowrap'], 'overflow-wrap': ['break-word'] },
  },
  {
    // E-43 (CP-1 confirmed; sunset: spec-kitty-design long-token text treatment): `overflow-wrap: anywhere` for the id and the
    // evidence value, in the row part file only.
    id: 'E-43',
    files: ['sk-ops-screen/ops-row-parts.ts'],
    properties: ['overflow-wrap'],
    values: { 'overflow-wrap': ['anywhere'] },
  },
  {
    // Ops G-7 (pre-merge fix round 2, F-1; sunset: E-21's, or a spec-kitty-design pill that ellipsizes in its host; this file only): the
    // keyword value `max-width: 100%` ONLY, for the row's status badge: the badge keeps its natural width (it does not shrink, A11Y-001)
    // but is never wider than the row, so a host word longer than the row ellipsizes at the row edge instead of overflowing. Stylelint
    // cannot scope by selector, so the file is the scope; the selector is pinned in
    // packages/mission-ui/test/ops-part-selectors.test.ts (`sk-pill-tag[data-ops-badge]`, the only rule that sets `max-width`).
    id: 'Ops G-7',
    files: ['sk-ops-screen/ops-row-parts.ts'],
    properties: ['max-width'],
    values: { 'max-width': ['100%'] },
    keywords: { 'max-width': ['100%'] },
  },
  {
    // Ops G-4 (WP07 review 2026-10-11, narrowed; sunset: a spec-kitty-design state-card element; this file only): the empty and loading
    // looks of the Ops state panel take the prototype's card: a token border width and colour with the keyword `dashed` (empty) or
    // `solid` (loading), a token radius and a token surface. Token values and those two keywords only. Stylelint cannot scope by
    // selector, so the file is the scope; the selectors are pinned in packages/mission-ui/test/ops-part-selectors.test.ts
    // (`[data-ops-state] > .sk-empty-state` and its busy form; the error look gets no card).
    id: 'Ops G-4',
    files: ['sk-ops-screen/ops-state-parts.ts'],
    properties: ['border', 'border-radius', 'background'],
    keywords: { border: ['dashed', 'solid'] },
  },
  {
    // Ops G-5 (WP07 review 2026-10-11; E-42 extended to the state part file, the keyword `overflow-wrap: anywhere` ONLY, no other E-42
    // keyword; sunset: E-21's): a long profile in the empty look wraps instead of being clipped. The selector is pinned in
    // packages/mission-ui/test/ops-part-selectors.test.ts (`code[data-empty-profile]`).
    id: 'E-42',
    files: ['sk-ops-screen/ops-state-parts.ts'],
    properties: ['overflow-wrap'],
    values: { 'overflow-wrap': ['anywhere'] },
  },
  {
    // Ops G-6 (WP07 review 2026-10-11; sunset: a spec-kitty-design empty-state variant; this file only): the empty look's typography
    // matches the prototype: a heading weight TOKEN (empty look) and `line-height: 1.5` on the empty and loading cards, inherited by their contents
    // (the prototype's .empty-state and .state-loading set none, so they inherit 1.5), and `line-height: 1.3` on the empty heading only (the prototype's h2); the two pinned literals (as in E-40).
    // The gap of 0 needs no grant. The selectors are pinned in packages/mission-ui/test/ops-part-selectors.test.ts.
    id: 'Ops G-6',
    files: ['sk-ops-screen/ops-state-parts.ts'],
    properties: ['font-weight', 'line-height'],
    strict: ['font-weight'],
    unstrict: ['line-height'],
    values: { 'line-height': ['1.5', '1.3'] },
    pinned: ['line-height'],
  },
];

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
    const pxProperties = pick('pxProperties');
    const emProperties = pick('emProperties');
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
          pxProperties.includes(property) || pinned.includes(property) ? allowed : [TOKEN_VALUE, ...allowed],
        ]),
      );
    }
    if (pxProperties.length > 0 || emProperties.length > 0) {
      // `px` / `em` are allowed, and only on the named properties (their values are pinned above).
      // Stylelint applies the FIRST matching property key only, so the keys partition the properties:
      // properties with no unit exception forbid both, the others forbid the units they do not own.
      const named = unique([...pxProperties, ...emProperties]);
      const exact = (names) => `/^(?:${names.join('|')})$/`;
      rules['unit-allowed-list'] = ['%', 'fr', ...(pxProperties.length > 0 ? ['px'] : []), ...(emProperties.length > 0 ? ['em'] : [])];
      rules['declaration-property-unit-disallowed-list'] = { [`/^(?!(?:${named.join('|')})$)/`]: ['px', 'em'] };
      const pxOnly = pxProperties.filter((property) => !emProperties.includes(property));
      const emOnly = emProperties.filter((property) => !pxProperties.includes(property));
      if (pxOnly.length > 0) rules['declaration-property-unit-disallowed-list'][exact(pxOnly)] = ['em'];
      if (emOnly.length > 0) rules['declaration-property-unit-disallowed-list'][exact(emOnly)] = ['px'];
    }
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
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'oklch', 'color-mix'],
    'property-allowed-list': LAYOUT_PROPERTIES,
    'unit-allowed-list': ['%', 'fr'],
  },
};
