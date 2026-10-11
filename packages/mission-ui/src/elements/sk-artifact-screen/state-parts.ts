// The whole-screen and in-pane states, and the one shared empty form. `renderStatus` draws loading (a busy indicator), a listing
// error with Retry, a Mission not found with "Return to Pipeline" and nothing selected; the title is an `h1` (the in-pane content
// loading look takes the pane's visually hidden `h1`). Exception E-27: `sk-empty-state*` and `sk-progress*` classes in
// this file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

export type StatusState = 'loading' | 'error' | 'empty' | 'not-found' | 'nothing-selected' | 'content-loading';

export interface StatusView {
  readonly state: StatusState;
  /** The words of the state: the title (an `h1`) and the one sentence. */
  readonly title: string;
  readonly text: string;
  /** The label of the control (Retry, Return to Pipeline); '' draws none. */
  readonly actionLabel: string;
  /** True when the control cannot act (no Mission): it is drawn inert. */
  readonly inert: boolean;
}

export interface StatusHandlers {
  /** Retry of the listing read (`status: error`). */
  readonly onRetry: () => void;
  /** "Return to Pipeline" (`status: not-found`). */
  readonly onReturn: () => void;
}

export const stateStyles = css`
  [data-state-panel] {
    display: block;
    min-width: 0;
    margin-block: var(--sk-space-6);
    margin-inline: var(--sk-mission-shell-content-padding);
  }
  /* The same card as the refusal block (E-45): dashed rule, card fill and radius; the padding and the border sit inside the box. */
  [data-state-panel] > .sk-empty-state {
    box-sizing: border-box;
    min-width: 0;
    border: var(--sk-border-width-1) dashed var(--sk-border-control);
    border-radius: var(--sk-radius-lg);
    background: var(--sk-surface-card);
  }
  [data-state-panel] > .sk-empty-state > sk-button {
    margin-block: var(--sk-space-4) 0;
  }
  [data-state-panel] .sk-progress {
    align-self: center;
    min-width: 0;
  }
`;

const BUSY_TITLE_ID = 'state-title';
const BUSY_BAR_ID = 'state-busy';

export function renderStatus(view: StatusView, handlers: StatusHandlers): TemplateResult {
  const busy = view.state === 'loading' || view.state === 'content-loading';
  const act = view.state === 'error' ? handlers.onRetry : handlers.onReturn;
  return html`<div data-state-panel aria-busy=${busy ? 'true' : 'false'}>
    <div class="sk-empty-state">
      ${view.state === 'content-loading' ? html`<p class="sk-empty-state__heading" id=${BUSY_TITLE_ID}>${view.title}</p>` : html`<h1 class="sk-empty-state__heading" id=${BUSY_TITLE_ID}>${view.title}</h1>`}
      ${busy
        ? html`<div class="sk-progress sk-progress--indeterminate sk-progress--compact">
            <progress class="sk-progress__bar" id=${BUSY_BAR_ID} aria-labelledby=${BUSY_TITLE_ID}></progress>
          </div>`
        : nothing}
      ${view.text === '' ? nothing : html`<p class="sk-empty-state__body">${view.text}</p>`}
      ${view.actionLabel === '' ? nothing : html`<sk-button variant="secondary" ?disabled=${view.inert} @click=${view.inert ? nothing : act}>${view.actionLabel}</sk-button>`}
    </div>
  </div>`;
}

/**
 * The one empty form: the library's empty-state treatment. A regional empty form passes the text only; with `heading` omitted no
 * heading element is drawn.
 */
export function renderEmptyForm(text: string, heading?: string): TemplateResult {
  return html`<div class="sk-empty-state">
    ${heading === undefined ? nothing : html`<h2 class="sk-empty-state__heading">${heading}</h2>`}
    <p class="sk-empty-state__body">${text}</p>
  </div>`;
}
