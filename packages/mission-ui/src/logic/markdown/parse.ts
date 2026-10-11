// The one importer of `markdown-it`. The instance is built once from the option table of contracts/markdown-renderer.md and
// never leaves this file: the only export is `parseTokens`, so no other file can configure, extend or call the library.
// `md.render` and `md.renderInline` are never touched; only `md.parse` is called, so the output is a token stream and no
// markup string exists. Layer 1 of the link rule is the library's default `validateLink`, deliberately left as it is
// (amendment A-8a: to revert, add one line here, `md.validateLink = () => true`).
import MarkdownIt from 'markdown-it';

// The `html` key is quoted: the lint rule that guards the lit template tag matches the bare name everywhere.
const md = new MarkdownIt({ 'html': false, linkify: false, typographer: false, breaks: false });
// Defence in depth: the option and the rule set must agree.
md.disable(['html_block', 'html_inline', 'replacements', 'smartquotes']);

/**
 * Parses markdown source into the library's token stream. Block tokens are in the returned array; every inline token holds
 * its inline tokens in `children`, so a caller that counts must count those too.
 *
 * `parseTokens.calls` is the number of calls so far: the counted seam the parse-count test reads (a cache that works leaves
 * it unchanged). It is a property of the function, so the module still has exactly one export.
 */
export function parseTokens(source: string) {
  parseTokens.calls += 1;
  return md.parse(source, {});
}
parseTokens.calls = 0;
/** The number of label scans the library's `parseLinkLabel` has run: the counted seam of the bracket-cost guard test. */
parseTokens.labelScans = 0;
/** Whether a label scan that cannot succeed is skipped. On by default; the equivalence test turns it off to compare. */
parseTokens.labelEarlyOut = true;

const libraryParseLinkLabel = md.helpers.parseLinkLabel;
// A label can only end at a `]` inside [start + 1, posMax), so with none there the library's scan returns -1 after reading every
// character to the end of the run, once per `[`. The last `]` of a run is found once and kept for the state (and so the run) it was found in, so a
// bracket with nothing to close it is answered in constant time and the answer is the one the scan would have given.
let seenState: object | null = null;
let seenMax = -1;
let lastClose = -1;
md.helpers.parseLinkLabel = (state, start, disableNested) => {
  if (parseTokens.labelEarlyOut) {
    if (state !== seenState || state.posMax !== seenMax) {
      seenState = state;
      seenMax = state.posMax;
      lastClose = state.src.lastIndexOf(']', state.posMax - 1);
    }
    if (lastClose <= start) return -1;
  }
  parseTokens.labelScans += 1;
  return libraryParseLinkLabel(state, start, disableNested);
};
