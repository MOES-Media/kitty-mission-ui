// The document body: the notices, the eyebrow and the rendered article, the source and the empty form. The truncation note, the
// redaction line and the bidirectional-control notice are the library `sk-notice` of tone `info`, the fallback notice of tone `attention` (DA-21). The document
// text reaches the DOM only through the renderer and one text binding in `renderSource`; this file draws none of it as markup. No part
// dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { DOCUMENT_LABEL } from '../../defaults/index.js';
import type { ResolvedBlock } from '../../logic/markdown/links.js';
import { renderMarkdown } from '../../logic/markdown/render.js';
import type { LinkHandlers } from '../../logic/markdown/render.js';
import type { ArtifactTab } from '../../logic/artifact-types.js';
import { renderSource } from './source-parts.js';
import { renderEmptyForm } from './state-parts.js';

export interface DocumentView {
  /** The kind word drawn above the document (DA-14): the kind's label, the raw kind when unknown. */
  readonly eyebrow: string;
  readonly name: string;
  /** The selected tab (`rendered` when the file has no tablist). */
  readonly tab: ArtifactTab;
  /** What the selected tab shows. */
  readonly mode: 'rendered' | 'fallback' | 'raw' | 'empty';
  /** The resolved blocks of the rendered view; null unless `mode` is `rendered`. */
  readonly blocks: readonly ResolvedBlock[] | null;
  readonly source: string;
  readonly sourceLabel: string;
  readonly emptyText: string;
  readonly bidiNotice: string | null;
  readonly truncationNote: string | null;
  readonly redactionLine: string | null;
  readonly fallbackNotice: string | null;
  /** Whether the rendered article / the source block is in the `overflowing` set (a tab stop only then). */
  readonly articleScrolls: boolean;
  readonly sourceScrolls: boolean;
  /** The ids of the panels the tabs control, when the file has two tabs. */
  readonly panel: { readonly id: string; readonly labelledBy: string } | null;
}

export const documentStyles = css`
  [data-document] {
    display: block;
    min-width: 0;
  }
  /* The notices above the document line up with the reading column. */
  [data-document] > sk-notice {
    display: block;
    margin: var(--sk-space-4) var(--sk-space-6) 0;
  }
  /* The same note over a pane that draws no document (nothing selected, a loading file, a refusal): the same line-up. */
  [data-region='truncation-note'] > sk-notice {
    display: block;
    margin: var(--sk-space-4) var(--sk-space-6) 0;
  }
  [data-document] [role='tabpanel'] > sk-notice {
    display: block;
    margin: var(--sk-space-6) var(--sk-space-6) 0;
  }
`;

const note = (text: string | null): TemplateResult | typeof nothing => (text === null ? nothing : html`<sk-notice tone="info" announce="off">${text}</sk-notice>`);
/** The truncation note over a pane that draws no document: the listing is shown (in the sidebar) and cut, so the pane says so too. */
export const renderTruncationNote = (text: string | null): TemplateResult | typeof nothing => (text === null ? nothing : html`<div data-region="truncation-note">${note(text)}</div>`);
/** The fallback notice keeps the prototype's attention tone (DA-21, confirmed at CP-1). */
const attention = (text: string | null): TemplateResult | typeof nothing => (text === null ? nothing : html`<sk-notice tone="attention" announce="off">${text}</sk-notice>`);

/** The rendered article: named and a tab stop only while it overflows, with the kind word as its first child. */
function renderArticle(view: DocumentView, handlers: LinkHandlers): TemplateResult {
  const scrolls = view.articleScrolls;
  return html`<article data-scroll="article" aria-label=${scrolls ? DOCUMENT_LABEL(view.name) : nothing} tabindex=${scrolls ? '0' : nothing}><p>${view.eyebrow}</p>${renderMarkdown([...(view.blocks ?? [])], handlers)}</article>`;
}

export function renderDocument(view: DocumentView, handlers: LinkHandlers): TemplateResult {
  const body =
    view.mode === 'empty'
      ? renderEmptyForm(view.emptyText)
      : view.mode === 'rendered'
        ? renderArticle(view, handlers)
        : html`${attention(view.fallbackNotice)}${renderSource(view.source, view.sourceLabel, view.bidiNotice, view.sourceScrolls)}`;
  return html`<div data-document>
    ${note(view.truncationNote)}${note(view.redactionLine)}
    ${view.panel === null ? body : html`<div role="tabpanel" id=${view.panel.id} aria-labelledby=${view.panel.labelledBy}>${body}</div>`}
  </div>`;
}
