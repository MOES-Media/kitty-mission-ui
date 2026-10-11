// The refusal block: one layout for every refusal and for a failed content read (FR-015). The cause word, the title (an `h1`), the
// path, one sentence, and Retry exactly when the view says so. Exception E-27: `sk-empty-state*` classes in this file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

export interface RefusalView {
  /** The cause word above the title. */
  readonly eyebrow: string;
  readonly title: string;
  /** The path shown under the title; '' draws none. */
  readonly path: string;
  readonly sentence: string;
  /** Whether Retry is offered. */
  readonly retryable: boolean;
  /** True when no retry request can be built (no Mission): Retry is drawn inert. */
  readonly retryInert: boolean;
  readonly retryLabel: string;
}

export const refusalStyles = css`
  [data-refusal] {
    display: block;
    min-width: 0;
    padding: var(--sk-space-6);
  }
  [data-refusal] p {
    margin: 0;
  }
  /* The prototype's block is tight: the cause word, the title, the path and the sentence sit one line apart. */
  /* The prototype's card (E-45): dashed rule, card fill and radius around the block; the padding and the border sit inside the box. */
  [data-refusal] .sk-empty-state {
    box-sizing: border-box;
    gap: 0;
    line-height: 1.5;
    min-width: 0;
    padding: var(--sk-space-9);
    border: var(--sk-border-width-1) dashed var(--sk-border-control);
    border-radius: var(--sk-radius-lg);
    background: var(--sk-surface-card);
  }
  [data-refusal] .sk-empty-state > p:first-child {
    color: var(--sk-fg-subtle);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  [data-refusal] h1 {
    font-family: var(--sk-font-display);
    font-size: var(--sk-text-2xl);
    font-weight: var(--sk-weight-bold);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  [data-refusal] sk-button {
    margin-block: var(--sk-space-4) 0;
  }
  [data-refusal-path] {
    min-width: 0;
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
  }
`;

export function renderRefusal(view: RefusalView, onRetry: () => void): TemplateResult {
  return html`<div data-refusal>
    <div class="sk-empty-state">
      <p>${view.eyebrow}</p>
      <h1 class="sk-empty-state__heading">${view.title}</h1>
      ${view.path === '' ? nothing : html`<p data-refusal-path>${view.path}</p>`}
      <p class="sk-empty-state__body">${view.sentence}</p>
      ${view.retryable ? html`<sk-button variant="secondary" ?disabled=${view.retryInert} @click=${view.retryInert ? nothing : onRetry}>${view.retryLabel}</sk-button>` : nothing}
    </div>
  </div>`;
}
