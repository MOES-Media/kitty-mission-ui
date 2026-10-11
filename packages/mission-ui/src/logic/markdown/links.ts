// The one place a link or image destination is classified (N-Q12 in two layers; layer 1 is the parser's own
// `validateLink`, see parse.ts). `classifyLink` is the exact table of contracts/markdown-renderer.md, with the narrowings of
// amendment A-8b: a `mailto:` with a query or fragment, an authority with userinfo and a destination over the limit are
// inert, and an external or inert link carries its truncated destination in `title`. Pure; no `lit`.
import { EXTERNAL_LINK_SCHEMES, MARKDOWN_BUDGET, OPAQUE_LINK_SCHEME, PATH_SEPARATOR, type MarkdownBudget } from '../../defaults/index.js';
import { dirOf, resolveRelative } from '../artifact-path.js';
import { truncate } from './budget.js';
import type { Block, Inline } from './model.js';

/** What a destination is: another artifact of the listing, an address for the host, or not followable. */
export type LinkTarget =
  | { kind: 'artifact'; path: string; entryKind: string }
  | { kind: 'external'; href: string; title: string }
  | { kind: 'inert'; title: string };

/** The carried result of `resolveLinks`: every link and image node also has its target. */
export interface ResolvedTarget {
  target: LinkTarget;
}
export type ResolvedInline = Inline<ResolvedTarget>;
export type ResolvedBlock = Block<ResolvedTarget>;

/** The listing and the open artifact, as `resolveLinks` needs them. */
export interface LinkContext {
  openPath: string;
  kindOf: ReadonlyMap<string, string>;
  budget?: MarkdownBudget;
}

const SCHEME = /^([A-Za-z][A-Za-z0-9+.-]*):/;
const WHITESPACE = /\s/;
const BACKSLASH = 0x5c;
const SPACE = 0x20;
const DEL = 0x7f;
const LAST_C1 = 0x9f;

/** Row 1: any character at or below U+0020 (NUL, the C0 controls and the space), DEL, whitespace of any kind, or a backslash. */
function forbiddenRaw(text: string): boolean {
  if (WHITESPACE.test(text)) return true;
  for (let at = 0; at < text.length; at += 1) {
    const code = text.charCodeAt(at);
    if (code <= SPACE || code === DEL || code === BACKSLASH) return true;
  }
  return false;
}

/** Row 8, after one percent-decode: a C0 control, DEL, a C1 control (U+0080 to U+009F) or a backslash; the space is allowed. */
function forbiddenDecoded(text: string): boolean {
  for (let at = 0; at < text.length; at += 1) {
    const code = text.charCodeAt(at);
    if (code < SPACE || (code >= DEL && code <= LAST_C1) || code === BACKSLASH) return true;
  }
  return false;
}
const HOST_SCHEMES = EXTERNAL_LINK_SCHEMES.filter((scheme) => scheme !== OPAQUE_LINK_SCHEME);
const MAILTO_BODY = /^[^?#\s]+$/;
const AUTHORITY = /^[^:]+:\/\/([^/?#]*)/;
const FRAGMENT_MARK = '#';
const QUERY_MARK = '?';
const USERINFO_MARK = '@';
const ADDRESS_LIST_MARK = ',';

/**
 * Whether the part after `mailto:` is exactly one address. It is decoded ONCE, as a mail client decodes it, and the DECODED text
 * is judged: `%2C` is a comma (a second recipient) and `%0D%0A` a line break (a header), so both are refused. A part that does not
 * decode is not followable.
 */
function singleAddress(address: string): boolean {
  if (!MAILTO_BODY.test(address)) return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(address);
  } catch {
    return false;
  }
  if (decoded.includes(ADDRESS_LIST_MARK) || forbiddenDecoded(decoded)) return false;
  const at = decoded.split(USERINFO_MARK).length - 1;
  return at === 1 && !decoded.startsWith(USERINFO_MARK) && !decoded.endsWith(USERINFO_MARK);
}

function inert(destination: string, budget: MarkdownBudget): LinkTarget {
  return { kind: 'inert', title: truncate(destination, budget.titleMax) };
}

function external(destination: string, budget: MarkdownBudget): LinkTarget {
  return { kind: 'external', href: destination, title: truncate(destination, budget.titleMax) };
}

function relative(destination: string, openPath: string, kindOf: ReadonlyMap<string, string>, budget: MarkdownBudget): LinkTarget {
  const cut = [destination.indexOf(QUERY_MARK), destination.indexOf(FRAGMENT_MARK)].filter((at) => at >= 0);
  const bare = cut.length === 0 ? destination : destination.slice(0, Math.min(...cut));
  let decoded: string;
  try {
    decoded = decodeURIComponent(bare);
  } catch {
    return inert(destination, budget);
  }
  if (forbiddenDecoded(decoded)) return inert(destination, budget);
  const path = resolveRelative(dirOf(openPath), decoded);
  if (path === null) return inert(destination, budget);
  const entryKind = kindOf.get(path);
  return entryKind === undefined ? inert(destination, budget) : { kind: 'artifact', path, entryKind };
}

/**
 * Classifies one destination (the link token's `href` as the parser normalised it) against the open artifact's directory
 * and the listing (`kindOf`, listing path to entry kind, matched byte for byte).
 */
export function classifyLink(destination: string, openPath: string, kindOf: ReadonlyMap<string, string>, budget: MarkdownBudget = MARKDOWN_BUDGET): LinkTarget {
  if (destination === '' || destination.length > budget.maxDestinationChars || forbiddenRaw(destination)) return inert(destination, budget);
  if (destination.startsWith(FRAGMENT_MARK)) return inert(destination, budget);
  if (destination.startsWith(PATH_SEPARATOR)) return inert(destination, budget); // `//host` and root-relative alike
  const scheme = SCHEME.exec(destination)?.[1]?.toLowerCase();
  if (scheme === undefined) return relative(destination, openPath, kindOf, budget);
  if (HOST_SCHEMES.includes(scheme)) {
    const authority = AUTHORITY.exec(destination)?.[1];
    if (authority === undefined || authority === '' || authority.includes(USERINFO_MARK)) return inert(destination, budget);
    return external(destination, budget);
  }
  if (scheme === OPAQUE_LINK_SCHEME && EXTERNAL_LINK_SCHEMES.includes(scheme)) {
    return singleAddress(destination.slice(scheme.length + 1)) ? external(destination, budget) : inert(destination, budget);
  }
  return inert(destination, budget);
}

function resolveInline(nodes: Array<Inline>, context: LinkContext, budget: MarkdownBudget): ResolvedInline[] {
  return nodes.map((node): ResolvedInline => {
    switch (node.kind) {
      case 'emphasis':
      case 'strong':
      case 'strike':
        return { kind: node.kind, children: resolveInline(node.children, context, budget) };
      case 'link':
        return { ...node, children: resolveInline(node.children, context, budget), target: classifyLink(node.destination, context.openPath, context.kindOf, budget) };
      case 'image':
        return { ...node, target: classifyLink(node.destination, context.openPath, context.kindOf, budget) };
      default:
        return node;
    }
  });
}

function resolveBlock(block: Block, context: LinkContext, budget: MarkdownBudget): ResolvedBlock {
  switch (block.kind) {
    case 'heading':
    case 'paragraph':
      return { ...block, inline: resolveInline(block.inline, context, budget) };
    case 'list':
      return { ...block, items: block.items.map((item) => item.map((child) => resolveBlock(child, context, budget))) };
    case 'quote':
      return { kind: 'quote', blocks: block.blocks.map((child) => resolveBlock(child, context, budget)) };
    case 'table':
      return {
        ...block,
        head: block.head.map((cell) => resolveInline(cell, context, budget)),
        rows: block.rows.map((row) => row.map((cell) => resolveInline(cell, context, budget))),
      };
    default:
      return block;
  }
}

/** The resolved tree: the same blocks with a `target` on every link and image. The input is not changed. */
export function resolveLinks(blocks: Block[], context: LinkContext): ResolvedBlock[] {
  const budget = context.budget ?? MARKDOWN_BUDGET;
  return blocks.map((block) => resolveBlock(block, context, budget));
}
