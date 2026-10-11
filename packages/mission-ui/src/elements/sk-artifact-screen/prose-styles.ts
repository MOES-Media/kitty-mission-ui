// The one stylesheet of the rendered document (exception E-23: prose typography of the rendered document and its tables). Every value is
// a token except the pinned literals E-23 names: `max-width: 68ch` (the paragraph and list measure, the
// `ch` grant) and `line-height: 1.65`. No `letter-spacing` and no `text-wrap` (dropped at CP-1). The look follows the prototype's `.prose`
// and `.requirements`; the lists, quotes, code, rules and links have no prototype counterpart and are built from the same tokens.
import { css } from 'lit';
import { visuallyHidden } from '../../visually-hidden.js';

export const proseStyles = css`
  /* The article fills the content area (operator review 2026-10-08): no reading column. Prose keeps the 68ch measure; tables, code and source use the full width. It scrolls sideways itself when something unbroken is wider than it. */
  [data-scroll='article'] {
    box-sizing: border-box;
    overflow-x: auto;
    padding: var(--sk-space-7) var(--sk-space-6) var(--sk-space-10);
    color: var(--sk-fg-body);
    font-size: var(--sk-text-base);
    line-height: 1.65;
  }
  /* The document eyebrow (DA-14): the kind word above the title, always the article's first child. */
  [data-scroll='article'] > p:first-child {
    margin: 0;
    color: var(--sk-fg-subtle);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  /* Block rhythm: a block after a block that is not a heading sits one step below it; headings carry their own spacing. */
  [data-scroll='article'] > :not(h1, h2, h3, h4, h5, h6) + * {
    margin-block: var(--sk-space-4) 0;
  }
  [data-scroll='article'] h1,
  [data-scroll='article'] h2,
  [data-scroll='article'] h3,
  [data-scroll='article'] h4,
  [data-scroll='article'] h5,
  [data-scroll='article'] h6 {
    margin: 0;
    color: var(--sk-fg-default);
    font-family: var(--sk-font-display);
    font-size: var(--sk-text-base);
    line-height: 1.2;
  }
  [data-scroll='article'] h1 {
    font-size: var(--sk-text-3xl);
  }
  [data-scroll='article'] h2 {
    margin: var(--sk-space-7) 0 var(--sk-space-3);
    font-size: var(--sk-text-lg);
  }
  [data-scroll='article'] h3 {
    margin: var(--sk-space-5) 0 var(--sk-space-2);
  }
  [data-scroll='article'] h4,
  [data-scroll='article'] h5,
  [data-scroll='article'] h6 {
    margin: var(--sk-space-4) 0 var(--sk-space-2);
    font-size: var(--sk-text-sm);
  }
  [data-scroll='article'] > p:first-child + h1 {
    margin: 0;
  }
  [data-scroll='article'] p {
    margin: 0;
    max-width: 68ch;
  }
  [data-scroll='article'] > :not(h1, h2, h3, h4, h5, h6) + p {
    margin-block: var(--sk-space-4) 0;
  }
  [data-scroll='article'] strong {
    color: var(--sk-fg-default);
  }
  [data-scroll='article'] em {
    font-style: italic;
  }
  /* Lists. */
  [data-scroll='article'] ul,
  [data-scroll='article'] ol {
    margin: 0;
    max-width: 68ch;
    padding-inline-start: var(--sk-space-6);
  }
  [data-scroll='article'] ul {
    list-style-type: disc;
  }
  [data-scroll='article'] ol {
    list-style-type: decimal;
  }
  [data-scroll='article'] li > ul,
  [data-scroll='article'] li > ol {
    margin-block: var(--sk-space-1) 0;
  }
  /* Quotes: a rule on the start side, set apart by colour and by the rule, not by colour alone. */
  [data-scroll='article'] blockquote {
    margin: 0;
    border-inline-start: var(--sk-border-width-4) solid var(--sk-border-default);
    padding-inline-start: var(--sk-space-4);
    color: var(--sk-fg-muted);
  }
  /* Code: the mono face; a block wraps (words only, an unbroken string breaks) so it never needs a scroll box of its own. */
  [data-scroll='article'] code {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
  }
  [data-scroll='article'] pre {
    margin: 0;
    padding: var(--sk-space-4);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    border-radius: var(--sk-radius-md);
    background: var(--sk-surface-muted);
    white-space: pre-wrap;
    overflow-wrap: break-word;
  }
  [data-scroll='article'] hr {
    margin: var(--sk-space-6) 0;
    border: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  /* Links: a followable link is underlined and clickable; an inert one is plain text, so they differ by more than colour. */
  [data-scroll='article'] a[data-md='link'] {
    color: var(--sk-fg-default);
    text-decoration: underline;
    cursor: pointer;
  }
  [data-scroll='article'] span[data-md='inert-link'] {
    text-decoration: none;
  }
  /* The hidden word of what a link does (its accessible name), in the tree and out of the layout. */
  [data-scroll='article'] [data-md='suffix'] {
    ${visuallyHidden}
  }
  /* Tables: every table in its own box (prototype .requirements); the box scrolls, the table keeps its look. The table sizes to its content and a cell wraps only past 30ch, so a long cell grows its own row and nothing else; the box scrolls when the table is wider than the pane. */
  [data-md='table-scroll'] {
    display: grid;
    overflow-x: auto;
  }
  [data-scroll='article'] > :not(h1, h2, h3, h4, h5, h6) + [data-md='table-scroll'],
  [data-scroll='article'] > h1 + [data-md='table-scroll'] {
    margin-block: var(--sk-space-4) 0;
  }
  [data-md='table'] {
    width: max-content;
    border-collapse: collapse;
    font-size: var(--sk-text-sm);
  }
  [data-md='table'] th,
  [data-md='table'] td {
    max-width: 30ch;
    padding: var(--sk-space-3);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    text-align: left;
    vertical-align: top;
  }
  [data-md='table'] th {
    color: var(--sk-fg-muted);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-medium);
  }
  [data-md='table'] [data-align='center'] {
    text-align: center;
  }
  [data-md='table'] [data-align='right'] {
    text-align: right;
  }
  /* Focus rings (NFR-014: an outline survives forced colors): the followable link, the article, the pane and the table box. */
  a[data-md='link']:focus-visible,
  [data-scroll='article']:focus-visible,
  [data-region='document-pane']:focus-visible,
  [data-md='table-scroll']:focus-visible {
    outline-width: var(--sk-border-width-2);
    outline-style: solid;
    outline-color: var(--sk-border-focus);
    outline-offset: calc(-1 * var(--sk-border-width-2));
  }
`;
