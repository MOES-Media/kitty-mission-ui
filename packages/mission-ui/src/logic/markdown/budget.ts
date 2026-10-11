// The markdown budget: pre-parse guards on the source text and post-parse counts over the FLATTENED token stream. The
// library's top-level array holds block tokens and one `inline` token per paragraph, heading or table cell; every emphasis,
// link, code and text token sits in that token's `children` (and an image's alt tokens in the image's own `children`), so a
// document nested 40,000 deep is three tokens at the top. Every count below walks the children too. All limits are data in
// `defaults/markdown.ts`; nothing is read from a token but its type, level, nesting and content length.
import type { MarkdownBudget } from '../../defaults/index.js';

/** What the budget and the model read of a token: a structural subset of the library's token, so no library type leaks. */
export interface MarkdownToken {
  readonly type: string;
  readonly tag: string;
  readonly content: string;
  readonly level: number;
  readonly nesting: number;
  readonly attrs: ReadonlyArray<readonly [string, unknown]> | null;
  readonly children: readonly MarkdownToken[] | null;
}

/** The counts of one parsed document. */
export interface TokenStats {
  tokens: number;
  nodes: number;
  depth: number;
  tableCells: number;
  maxTextRun: number;
}

/** A source that is refused before it is parsed, or fine. */
export type SourceVerdict = 'ok' | 'too-complex';
/** A token stream that is refused before the model is built, or fine. */
export type TokenVerdict = 'ok' | 'budget';

const LINE_BREAK = /\r\n|\r|\n/g;

/** Source length and the longest line, both before any parse; a hostile single line never reaches the parser. */
export function checkSource(source: string, budget: MarkdownBudget): SourceVerdict {
  if (source.length > budget.maxSourceChars) return 'too-complex';
  let start = 0;
  LINE_BREAK.lastIndex = 0;
  for (let match = LINE_BREAK.exec(source); match !== null; match = LINE_BREAK.exec(source)) {
    if (match.index - start > budget.maxLineChars) return 'too-complex';
    start = match.index + match[0].length;
  }
  return source.length - start > budget.maxLineChars ? 'too-complex' : 'ok';
}

const OPEN_CELL_TYPES: readonly string[] = ['th_open', 'td_open'];
const RUN_TYPES: readonly string[] = ['text', 'code_inline'];

/**
 * Counts over the flattened stream, iteratively (no recursion, so the depth of the document cannot overflow the stack).
 * Depth is the largest absolute nesting seen: a token's `level` counted from the root, plus, for a token in `children`,
 * the absolute depth of the token that owns them; the running open and close count of each array is a second reading, and
 * the larger of the two is taken.
 */
export function measureTokens(tokens: readonly MarkdownToken[]): TokenStats {
  const stats: TokenStats = { tokens: 0, nodes: 0, depth: 0, tableCells: 0, maxTextRun: 0 };
  const pending: Array<{ list: readonly MarkdownToken[]; base: number }> = [{ list: tokens, base: 0 }];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    let open = 0;
    for (const token of next.list) {
      stats.tokens += 1;
      if (token.nesting !== -1) stats.nodes += 1;
      if (token.nesting === 1) open += 1;
      const here = next.base + Math.max(token.level, open);
      if (here > stats.depth) stats.depth = here;
      if (token.nesting === -1) open -= 1;
      if (OPEN_CELL_TYPES.includes(token.type)) stats.tableCells += 1;
      if (RUN_TYPES.includes(token.type) && token.content.length > stats.maxTextRun) stats.maxTextRun = token.content.length;
      if (token.children !== null && token.children.length > 0) pending.push({ list: token.children, base: next.base + token.level });
    }
  }
  return stats;
}

/** Whether the counts are within the budget; a limit is inclusive (a document at exactly the limit is accepted). */
export function checkTokens(stats: TokenStats, budget: MarkdownBudget): TokenVerdict {
  if (stats.tokens > budget.maxTokens) return 'budget';
  if (stats.nodes > budget.maxNodes) return 'budget';
  if (stats.depth > budget.maxDepth) return 'budget';
  if (stats.tableCells > budget.maxTableCells) return 'budget';
  if (stats.maxTextRun > budget.maxTextRun) return 'budget';
  return 'ok';
}

/** The first `max` UTF-16 units of `text`, never ending in half of a surrogate pair. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  return last >= 0xd800 && last <= 0xdbff ? cut.slice(0, -1) : cut;
}
