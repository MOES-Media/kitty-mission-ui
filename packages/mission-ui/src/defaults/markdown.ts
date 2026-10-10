// Markdown model data of the Artifact Viewer: the budget, the link schemes, the words of the rendered links and the
// bidirectional control characters the quiet notice counts. Values are data; the budget is re-measured by the
// renderer's spike.

/** The numeric limits of the markdown model; the vocabulary's budget group has exactly this shape. */
export interface MarkdownBudget {
  maxSourceChars: number;
  maxLineChars: number;
  maxTokens: number;
  maxDepth: number;
  maxNodes: number;
  maxTableCells: number;
  maxTextRun: number;
  titleMax: number;
  maxDestinationChars: number;
  maxAltChars: number;
}

export const MARKDOWN_BUDGET: MarkdownBudget = {
  maxSourceChars: 270000,
  maxLineChars: 20000,
  maxTokens: 150000,
  maxDepth: 24,
  maxNodes: 110000,
  maxTableCells: 32000,
  maxTextRun: 20000,
  titleMax: 512,
  maxDestinationChars: 2048,
  maxAltChars: 512,
};

/** The one scheme whose destination is an address and not a host (`mailto:`): judged by its own rule, never by an authority. */
export const OPAQUE_LINK_SCHEME = 'mailto';

/** The schemes of an absolute link the screen hands to the host. */
export const EXTERNAL_LINK_SCHEMES: readonly string[] = ['http', 'https', OPAQUE_LINK_SCHEME];

/** The visually hidden word after a link: what activating it does. */
export const LINK_SUFFIX = {
  artifact: 'opens another artifact',
  external: 'opens in your browser',
  inert: 'not a followable link',
} as const;

/** Written before the destination in the `title` of a link that is not followable. */
export const INERT_LINK_TITLE_PREFIX = 'Not followed: ';
/** The word of an image placeholder; no image is ever requested. */
export const IMAGE_WORD = 'Image';
/** Whether a code block shows the language of its fence. The info string is dropped, so this is false; kept as data. */
export const CODE_LANGUAGE_SHOWN = false;

/** The code points the bidirectional-control notice counts: U+202A to U+202E, U+2066 to U+2069, U+200E and U+200F. */
export const BIDI_CONTROL_CODE_POINTS: readonly number[] = [
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x200e, 0x200f,
];
