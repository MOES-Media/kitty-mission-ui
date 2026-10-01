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
const SHELL_KEYWORD_PROPERTIES = ['text-overflow', 'white-space', 'overflow-wrap'];

const SHELL_FILES = [
  '**/src/elements/sk-mission-shell/**',
  '**/src/elements/sk-shell-nav-item/**',
  '**/src/elements/sk-shell-tree/**',
];

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
      },
    },
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
