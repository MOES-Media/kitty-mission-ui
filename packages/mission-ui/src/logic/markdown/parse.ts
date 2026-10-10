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
