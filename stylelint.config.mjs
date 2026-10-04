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
// issue (E-04 library stepper G-04, issue pending; E-08 #505; E-09 #506; E-10 #507; E-11 #508; E-12 #509; E-14 #511; E-15 #512;
// E-16 #514). E-13 (#510, panel spacing) has one entry per screen file below. An override REPLACES a rule's options for a file, so
// the exceptions are declared once here and merged per file below; no file gets more than its own exceptions.
// Entry options: `properties` (allowed beyond layout), `strict` (made strict for the file), `unstrict` (taken OUT of the strict
// list, so the pinned `values` entry is its only guard), `keywords` (extra non-token words, a map property -> words: a word is refused on every other property the file checks), `values` (the allowed values of a
// property; the token form is added unless the property is `pinned`), `pxProperties` / `emProperties` (units allowed).
const TOKEN_VALUE = '/^var\\(--sk-[a-z0-9-]+\\)$/';
// One or two margin terms, each a token, 0, auto or the negative-token calc (E-15).
const MARGIN_TERM = '(?:0|auto|var\\(--sk-[a-z0-9-]+\\)|calc\\(-1 \\* var\\(--sk-space-[0-9]+\\)\\))';
const MARGIN_TERMS = `/^${MARGIN_TERM}(?: ${MARGIN_TERM})?$/`;
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
    // E-15 (operator Storybook review, item 5b, 2026-10-04; sunset spec-kitty-design#512, a flush-edge slot in the shell content
    // cell): the inspector and the phase band give the shell's content padding back to themselves with a negative margin of the
    // SAME token. The only non-token value is `calc(-1 * var(--sk-space-N))`, and only on `margin-block` and `margin-inline`
    // (one or two terms each): those two are taken out of the strict list and pinned by value, so the calc is refused on
    // every other property, the `margin` shorthand included. Scope: pipeline-parts.ts only.
    id: 'E-15',
    files: ['sk-pipeline-screen/pipeline-parts.ts'],
    properties: ['margin-block', 'margin-inline'],
    unstrict: ['margin-block', 'margin-inline'],
    pinned: ['margin-block', 'margin-inline'],
    values: { 'margin-block': [MARGIN_TERMS], 'margin-inline': [MARGIN_TERMS] },
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
