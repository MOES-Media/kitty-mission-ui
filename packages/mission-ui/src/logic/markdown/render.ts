// The renderer: a resolved markdown tree to Lit templates. Pure drawing, no classification (links.ts already decided what
// every destination is). The contract is contracts/markdown-renderer.md, "What the renderer may write into the DOM":
//   - tags are literal in the templates below, chosen by an exhaustive `switch` with a `never` check, never built from text;
//   - document text reaches the DOM only as a Lit child text binding, and the only attribute value that carries any is `title`
//     (a truncated destination) on a link control, an inert link or an image placeholder;
//   - there is no `href`, `src`, `class`, `style`, `id` or `on*` attribute, no property or boolean binding, and no way to turn
//     a string into markup (`innerHTML`, `unsafeHTML`, `DOMParser` and the rest are lint-refused, rules R3 and R4);
//   - a link control is an `a` WITHOUT an `href`, so nothing here can navigate: activation calls the handlers and the screen
//     dispatches an event.
// A `corpus escape` here is a defect of this file; test/markdown-corpus.test.ts is the gate and the plants of
// gates/plants/unit-tests weaken exactly this file.
import { html, nothing, type TemplateResult } from 'lit';
import { IMAGE_WORD, INERT_LINK_TITLE_PREFIX, LINK_SUFFIX, TABLE_LABEL } from '../../defaults/index.js';
import type { LinkTarget, ResolvedBlock, ResolvedInline } from './links.js';
import type { TableAlign } from './model.js';

/**
 * What the screen hands the renderer. `openArtifact` and `openExternal` are called by a link control on a click or on Enter,
 * exactly once per activation; `overflowing` holds the one-based `position.index` of every table whose scroll box overflows
 * (A11Y-003, A11Y-004): only a member is a tab stop and a named region.
 */
export interface LinkHandlers {
  openArtifact(path: string, kind: string): void;
  openExternal(href: string): void;
  /** False while the screen has no Mission: an artifact link needs its id to emit, so it is drawn inert (external links stay live). */
  artifactLinks: boolean;
  overflowing: ReadonlySet<number>;
}

type Part = string | TemplateResult;

const DIGITS = /^[0-9]{1,9}$/;

function unreachable(value: never): never {
  throw new Error(`markdown node not drawn: ${JSON.stringify(value)}`);
}

/** The keyword of a table column, chosen by a switch so no document string reaches `data-align`. */
function alignWord(align: TableAlign): string {
  switch (align) {
    case 'left':
      return 'left';
    case 'center':
      return 'center';
    case 'right':
      return 'right';
    case 'none':
      return 'none';
    default:
      return unreachable(align);
  }
}

/** The one link control: an `a` with a role, a tab stop, a click and an Enter handler, and the hidden word of what it does. */
function control(label: Part[], title: string | typeof nothing, suffix: string, activate: () => void): TemplateResult {
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter') return;
    // A chord belongs to the browser or the system, and a held key must not activate again: the bare first Enter answers.
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    activate();
  };
  return html`<a role="link" tabindex="0" data-md="link" title=${title} @click=${activate} @keydown=${onKey}>${label}<span data-md="suffix"> ${suffix}</span></a>`;
}

function inertLink(label: Part[], title: string): TemplateResult {
  return html`<span data-md="inert-link" title=${INERT_LINK_TITLE_PREFIX + title}>${label}<span data-md="suffix"> ${LINK_SUFFIX.inert}</span></span>`;
}

function linkControl(target: LinkTarget, label: Part[], handlers: LinkHandlers): TemplateResult {
  switch (target.kind) {
    case 'artifact': {
      const { path, entryKind } = target;
      if (!handlers.artifactLinks) return inertLink(label, path);
      return control(label, nothing, LINK_SUFFIX.artifact, () => handlers.openArtifact(path, entryKind));
    }
    case 'external': {
      const { href } = target;
      return control(label, target.title, LINK_SUFFIX.external, () => handlers.openExternal(href));
    }
    case 'inert':
      return inertLink(label, target.title);
    default:
      return unreachable(target);
  }
}

/** An image is never loaded: the word, the alt text, and (an external destination outside a link only) a link control. */
function image(alt: string, target: LinkTarget, insideLink: boolean, handlers: LinkHandlers): TemplateResult {
  const label: Part[] = alt === '' ? [IMAGE_WORD] : [`${IMAGE_WORD}: `, alt];
  if (target.kind === 'external' && !insideLink) return linkControl(target, label, handlers);
  const title = target.kind === 'artifact' ? nothing : target.kind === 'inert' ? INERT_LINK_TITLE_PREFIX + target.title : target.title;
  return html`<span data-md="image" title=${title}>${label}</span>`;
}

function renderInline(nodes: readonly ResolvedInline[], insideLink: boolean, handlers: LinkHandlers): Part[] {
  return nodes.map((node): Part => {
    switch (node.kind) {
      case 'text':
        return node.text;
      case 'softbreak':
        return '\n';
      case 'hardbreak':
        return html`<br>`;
      case 'code':
        return html`<code>${node.text}</code>`;
      case 'emphasis':
        return html`<em>${renderInline(node.children, insideLink, handlers)}</em>`;
      case 'strong':
        return html`<strong>${renderInline(node.children, insideLink, handlers)}</strong>`;
      case 'strike':
        return html`<s>${renderInline(node.children, insideLink, handlers)}</s>`;
      case 'link':
        // A link inside a link (an autolink in link text) is drawn as its text: one control per activation, the outer one.
        return insideLink ? html`${renderInline(node.children, true, handlers)}` : linkControl(node.target, renderInline(node.children, true, handlers), handlers);
      case 'image':
        return image(node.alt, node.target, insideLink, handlers);
      default:
        return unreachable(node);
    }
  });
}

function heading(level: 1 | 2 | 3 | 4 | 5 | 6, content: Part[]): TemplateResult {
  switch (level) {
    case 1:
      return html`<h1>${content}</h1>`;
    case 2:
      return html`<h2>${content}</h2>`;
    case 3:
      return html`<h3>${content}</h3>`;
    case 4:
      return html`<h4>${content}</h4>`;
    case 5:
      return html`<h5>${content}</h5>`;
    case 6:
      return html`<h6>${content}</h6>`;
    default:
      return unreachable(level);
  }
}

function cells(row: ReadonlyArray<readonly ResolvedInline[]>, align: readonly TableAlign[], header: boolean, handlers: LinkHandlers): TemplateResult[] {
  return row.map((cell, at) => {
    const word = alignWord(align[at] ?? 'none');
    const content = renderInline(cell, false, handlers);
    return header ? html`<th scope="col" data-align=${word}>${content}</th>` : html`<td data-align=${word}>${content}</td>`;
  });
}

type TableBlock = Extract<ResolvedBlock, { kind: 'table' }>;

function table(block: TableBlock, handlers: LinkHandlers): TemplateResult {
  const body = block.rows.map((row) => html`<tr>${cells(row, block.align, false, handlers)}</tr>`);
  const grid = html`<table data-md="table"><thead><tr>${cells(block.head, block.align, true, handlers)}</tr></thead><tbody>${body}</tbody></table>`;
  const { index, total } = block.position;
  return handlers.overflowing.has(index)
    ? html`<div data-md="table-scroll" role="region" tabindex="0" aria-label=${TABLE_LABEL(index, total)}>${grid}</div>`
    : html`<div data-md="table-scroll">${grid}</div>`;
}

function start(value: number): string | typeof nothing {
  const digits = String(value);
  return value !== 1 && DIGITS.test(digits) ? digits : nothing;
}

function renderBlocks(blocks: readonly ResolvedBlock[], handlers: LinkHandlers): TemplateResult[] {
  return blocks.map((block): TemplateResult => {
    switch (block.kind) {
      case 'heading':
        return heading(block.level, renderInline(block.inline, false, handlers));
      case 'paragraph':
        return html`<p>${renderInline(block.inline, false, handlers)}</p>`;
      case 'list': {
        const items = block.items.map((item) => html`<li>${renderBlocks(item, handlers)}</li>`);
        return block.ordered ? html`<ol start=${start(block.start)}>${items}</ol>` : html`<ul>${items}</ul>`;
      }
      case 'quote':
        return html`<blockquote>${renderBlocks(block.blocks, handlers)}</blockquote>`;
      case 'rule':
        return html`<hr>`;
      case 'code':
        return html`<pre><code>${block.text}</code></pre>`;
      case 'table':
        return table(block, handlers);
      default:
        return unreachable(block);
    }
  });
}

/**
 * The rendered document. Depth is bounded by the budget of the model (`maxDepth`), so the recursion here is bounded too and
 * cannot throw outside the fallback the model already decided.
 */
export function renderMarkdown(blocks: ResolvedBlock[], handlers: LinkHandlers): TemplateResult {
  return html`${renderBlocks(blocks, handlers)}`;
}
