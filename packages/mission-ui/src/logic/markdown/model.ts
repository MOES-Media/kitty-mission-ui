// The markdown model: the library's token stream to a closed node union, or a fallback. Pure: no `lit`, no DOM, nothing
// about the listing. A throw, a budget overrun or a token type this table does not name always ends as `{ kind: 'fallback' }`
// and never as an exception out of `buildMarkdownModel` (C-014: document text is data). The build is iterative, and the
// budget (checked over the flattened stream first) bounds the nesting it has to hold.
import type { ArtifactContentView } from '../../contract/types.js';
import { MARKDOWN_BUDGET, type MarkdownBudget } from '../../defaults/index.js';
import { resolveArtifactVocabulary, type ArtifactVocabulary } from '../artifact-types.js';
import { checkSource, checkTokens, measureTokens, truncate, type MarkdownToken } from './budget.js';
import { parseTokens } from './parse.js';

/** The alignment of a table column. */
export type TableAlign = 'left' | 'center' | 'right' | 'none';

/** Where a table sits in the document: one-based `index` of `total` tables, counted in document order. */
export interface TablePosition {
  index: number;
  total: number;
}

/**
 * The inline nodes. `R` is what a resolved link or image also carries: nothing in the model, `{ target }` after
 * `resolveLinks`.
 */
export type Inline<R = unknown> =
  | { kind: 'text'; text: string }
  | { kind: 'softbreak' }
  | { kind: 'hardbreak' }
  | { kind: 'code'; text: string }
  | { kind: 'emphasis'; children: Array<Inline<R>> }
  | { kind: 'strong'; children: Array<Inline<R>> }
  | { kind: 'strike'; children: Array<Inline<R>> }
  | ({ kind: 'link'; destination: string; children: Array<Inline<R>> } & R)
  | ({ kind: 'image'; alt: string; destination: string } & R);

/** The block nodes. Fence and indented code alike are `code`; the info string is dropped. */
export type Block<R = unknown> =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; inline: Array<Inline<R>> }
  | { kind: 'paragraph'; inline: Array<Inline<R>> }
  | { kind: 'list'; ordered: boolean; start: number; items: Array<Array<Block<R>>> }
  | { kind: 'quote'; blocks: Array<Block<R>> }
  | { kind: 'rule' }
  | { kind: 'code'; text: string }
  | { kind: 'table'; align: TableAlign[]; head: Array<Array<Inline<R>>>; rows: Array<Array<Array<Inline<R>>>>; position: TablePosition };

/** Why the screen shows the source and not a rendered document: refused before the parse, over budget, or unreadable. */
export type MarkdownFallbackReason = 'too-complex' | 'budget' | 'error';

/** The model result; it satisfies the structural seam `{ kind: 'ok' | 'fallback' }` the view resolver reads. */
export type MarkdownResult = { kind: 'ok'; blocks: Block[] } | { kind: 'fallback'; reason: MarkdownFallbackReason };

/** A token the table below does not name (or a stream out of balance). Thrown inside the build, never out of it. */
export class MarkdownUnsupported extends Error {}

const ALIGN_BY_STYLE: Readonly<Record<string, TableAlign>> = {
  'text-align:left': 'left',
  'text-align:center': 'center',
  'text-align:right': 'right',
};
const HEADING_TAG = /^h([1-6])$/;
const MAX_ORDERED_START = 999999999;

/** An attribute by NAME, never by index. */
function attr(token: MarkdownToken, name: string): unknown {
  for (const pair of token.attrs ?? []) if (pair[0] === name) return pair[1];
  return undefined;
}

function orderedStart(token: MarkdownToken): number {
  const start = attr(token, 'start');
  if (start === undefined) return 1;
  return typeof start === 'number' && Number.isSafeInteger(start) && start >= 0 && start <= MAX_ORDERED_START ? start : 1;
}

/** The plain text of an image's alt tokens: text and code as is, breaks as one space, marks flattened, a nested image's alt in place. */
function altText(tokens: readonly MarkdownToken[], max: number): string {
  let out = '';
  const stack: Array<{ list: readonly MarkdownToken[]; at: number }> = [{ list: tokens, at: 0 }];
  while (out.length < max) {
    const frame = stack[stack.length - 1];
    if (frame === undefined) break;
    const token = frame.list[frame.at];
    frame.at += 1;
    if (token === undefined) {
      stack.pop();
      continue;
    }
    if (token.type === 'text' || token.type === 'code_inline') out += token.content;
    else if (token.type === 'softbreak' || token.type === 'hardbreak') out += ' ';
    else if (token.type === 'image' && token.children !== null) stack.push({ list: token.children, at: 0 });
  }
  return truncate(out, max);
}

type InlineFrame = { kind: 'emphasis' | 'strong' | 'strike' | 'link'; destination: string; children: Inline[] };

function convertInline(tokens: readonly MarkdownToken[], budget: MarkdownBudget): Inline[] {
  const root: Inline[] = [];
  const stack: InlineFrame[] = [];
  const target = (): Inline[] => stack[stack.length - 1]?.children ?? root;
  const close = (kind: InlineFrame['kind']): void => {
    const frame = stack.pop();
    if (frame === undefined || frame.kind !== kind) throw new MarkdownUnsupported('unbalanced inline');
    if (kind === 'link') target().push({ kind: 'link', destination: frame.destination, children: frame.children });
    else target().push({ kind, children: frame.children });
  };
  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        target().push({ kind: 'text', text: token.content });
        break;
      case 'softbreak':
        target().push({ kind: 'softbreak' });
        break;
      case 'hardbreak':
        target().push({ kind: 'hardbreak' });
        break;
      case 'code_inline':
        target().push({ kind: 'code', text: token.content });
        break;
      case 'em_open':
        stack.push({ kind: 'emphasis', destination: '', children: [] });
        break;
      case 'strong_open':
        stack.push({ kind: 'strong', destination: '', children: [] });
        break;
      case 's_open':
        stack.push({ kind: 'strike', destination: '', children: [] });
        break;
      case 'link_open': {
        const href = attr(token, 'href');
        stack.push({ kind: 'link', destination: typeof href === 'string' ? href : '', children: [] });
        break;
      }
      case 'em_close':
        close('emphasis');
        break;
      case 'strong_close':
        close('strong');
        break;
      case 's_close':
        close('strike');
        break;
      case 'link_close':
        close('link');
        break;
      case 'image': {
        const src = attr(token, 'src');
        target().push({ kind: 'image', alt: altText(token.children ?? [], budget.maxAltChars), destination: typeof src === 'string' ? src : '' });
        break;
      }
      default:
        throw new MarkdownUnsupported(`inline token ${token.type}`);
    }
  }
  if (stack.length > 0) throw new MarkdownUnsupported('unbalanced inline');
  return root;
}

type Frame =
  | { type: 'blocks'; blocks: Block[] }
  | { type: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; inline: Inline[] }
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'table'; align: TableAlign[]; head: Inline[][]; rows: Inline[][][]; inHead: boolean; row: Inline[][]; cell: Inline[] | null };

function convertBlocks(tokens: readonly MarkdownToken[], budget: MarkdownBudget): Block[] {
  const root: Block[] = [];
  const stack: Frame[] = [{ type: 'blocks', blocks: root }];
  const tables: Array<Extract<Block, { kind: 'table' }>> = [];
  const top = (): Frame => {
    const frame = stack[stack.length - 1];
    if (frame === undefined) throw new MarkdownUnsupported('unbalanced block');
    return frame;
  };
  const container = (): Block[] => {
    const frame = top();
    if (frame.type !== 'blocks') throw new MarkdownUnsupported('a block outside a container');
    return frame.blocks;
  };
  const closing = <T extends Frame['type']>(type: T): Extract<Frame, { type: T }> => {
    const frame = stack.pop();
    if (frame === undefined || frame.type !== type) throw new MarkdownUnsupported(`unbalanced ${type}`);
    return frame as Extract<Frame, { type: T }>;
  };
  const table = (): Extract<Frame, { type: 'table' }> => {
    const frame = top();
    if (frame.type !== 'table') throw new MarkdownUnsupported('a table part outside a table');
    return frame;
  };
  for (const token of tokens) {
    switch (token.type) {
      case 'heading_open': {
        const level = HEADING_TAG.exec(token.tag)?.[1];
        if (level === undefined) throw new MarkdownUnsupported('heading tag');
        stack.push({ type: 'heading', level: Number(level) as 1 | 2 | 3 | 4 | 5 | 6, inline: [] });
        break;
      }
      case 'heading_close': {
        const frame = closing('heading');
        container().push({ kind: 'heading', level: frame.level, inline: frame.inline });
        break;
      }
      case 'paragraph_open':
        stack.push({ type: 'paragraph', inline: [] });
        break;
      case 'paragraph_close': {
        const frame = closing('paragraph');
        container().push({ kind: 'paragraph', inline: frame.inline });
        break;
      }
      case 'inline': {
        const frame = top();
        const inline = convertInline(token.children ?? [], budget);
        if (frame.type === 'heading' || frame.type === 'paragraph') frame.inline = inline;
        else if (frame.type === 'table' && frame.cell !== null) frame.cell = inline;
        else throw new MarkdownUnsupported('inline outside a leaf');
        break;
      }
      case 'blockquote_open':
        stack.push({ type: 'blocks', blocks: [] });
        break;
      case 'blockquote_close': {
        const frame = closing('blocks');
        container().push({ kind: 'quote', blocks: frame.blocks });
        break;
      }
      case 'ordered_list_open':
        stack.push({ type: 'list', ordered: true, start: orderedStart(token), items: [] });
        break;
      case 'bullet_list_open':
        stack.push({ type: 'list', ordered: false, start: 1, items: [] });
        break;
      case 'ordered_list_close':
      case 'bullet_list_close': {
        const frame = closing('list');
        container().push({ kind: 'list', ordered: frame.ordered, start: frame.start, items: frame.items });
        break;
      }
      case 'list_item_open':
        if (top().type !== 'list') throw new MarkdownUnsupported('an item outside a list');
        stack.push({ type: 'blocks', blocks: [] });
        break;
      case 'list_item_close': {
        const frame = closing('blocks');
        const list = top();
        if (list.type !== 'list') throw new MarkdownUnsupported('an item outside a list');
        list.items.push(frame.blocks);
        break;
      }
      case 'fence':
      case 'code_block':
        container().push({ kind: 'code', text: token.content });
        break;
      case 'hr':
        container().push({ kind: 'rule' });
        break;
      case 'table_open':
        stack.push({ type: 'table', align: [], head: [], rows: [], inHead: false, row: [], cell: null });
        break;
      case 'thead_open':
        table().inHead = true;
        break;
      case 'thead_close':
        table().inHead = false;
        break;
      case 'tbody_open':
      case 'tbody_close':
        table();
        break;
      case 'tr_open':
        table().row = [];
        break;
      case 'tr_close': {
        const frame = table();
        if (frame.inHead) frame.head = frame.row;
        else frame.rows.push(frame.row);
        frame.row = [];
        break;
      }
      case 'th_open':
      case 'td_open': {
        const frame = table();
        if (frame.inHead) {
          const style = attr(token, 'style');
          frame.align.push(typeof style === 'string' ? (ALIGN_BY_STYLE[style] ?? 'none') : 'none');
        }
        frame.cell = [];
        break;
      }
      case 'th_close':
      case 'td_close': {
        const frame = table();
        if (frame.cell === null) throw new MarkdownUnsupported('a cell close without an open');
        frame.row.push(frame.cell);
        frame.cell = null;
        break;
      }
      case 'table_close': {
        const frame = closing('table');
        const node: Extract<Block, { kind: 'table' }> = {
          kind: 'table',
          align: frame.align,
          head: frame.head,
          rows: frame.rows,
          position: { index: 0, total: 0 },
        };
        tables.push(node);
        container().push(node);
        break;
      }
      default:
        throw new MarkdownUnsupported(`token ${token.type}`);
    }
  }
  if (stack.length !== 1) throw new MarkdownUnsupported('unbalanced block');
  tables.forEach((node, at) => {
    node.position = { index: at + 1, total: tables.length };
  });
  return root;
}

/**
 * The model of a token stream: the budget over the flattened stream first, then the node table. Any exception, a
 * `RangeError` included, and any token the table does not name is `{ kind: 'fallback', reason: 'error' }`.
 */
export function buildModelFromTokens(tokens: readonly MarkdownToken[], budget: MarkdownBudget = MARKDOWN_BUDGET): MarkdownResult {
  try {
    if (checkTokens(measureTokens(tokens), budget) === 'budget') return { kind: 'fallback', reason: 'budget' };
    return { kind: 'ok', blocks: convertBlocks(tokens, budget) };
  } catch {
    return { kind: 'fallback', reason: 'error' };
  }
}

/** The markdown model of `source`. Never throws; the budget is the vocabulary's member, `MARKDOWN_BUDGET` by default. */
export function buildMarkdownModel(source: string, budget: MarkdownBudget = MARKDOWN_BUDGET): MarkdownResult {
  try {
    if (checkSource(source, budget) === 'too-complex') return { kind: 'fallback', reason: 'too-complex' };
    return buildModelFromTokens(parseTokens(source), budget);
  } catch {
    return { kind: 'fallback', reason: 'error' };
  }
}

/**
 * The one decision to parse: null unless the content's media type is the vocabulary's markdown type, so the screen compares
 * no media type and a non-markdown file never reaches the parser.
 */
export function markdownFor(content: ArtifactContentView | null, vocabulary?: ArtifactVocabulary | null): MarkdownResult | null {
  if (content === null) return null;
  const resolved = resolveArtifactVocabulary(vocabulary);
  return content.mediaType === resolved.mediaType ? buildMarkdownModel(content.content, resolved.budget) : null;
}
