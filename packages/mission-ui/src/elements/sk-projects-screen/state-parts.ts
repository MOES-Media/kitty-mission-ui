// The whole-list states and the read-only notice of the Projects screen. A part never dispatches an event.
// Exception E-33 (b) (CP-1 addendum; mirrors #4's panel, no library sunset of its own) covers this file: the state panel look mirrors #4's panels (card fill, dashed or solid border,
// large radius, display face, bold heading), token values only. No library class is written here (class= is forbidden in this mission).
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  LIST_EMPTY_BODY,
  LIST_EMPTY_TITLE,
  LIST_ERROR_BODY,
  LIST_LOADING_TEXT,
  READ_ONLY_NOTICE,
  ENTRY_RETRY_LABEL,
} from '../../defaults/index.js';

/** The whole-list states that replace the list. */
export type ListStateKind = 'loading' | 'error' | 'empty';

/** What a whole-list state needs from the screen: the host's error text (empty uses the default) and the list retry. */
export interface ListStateContext {
  errorMessage: string;
  onRetry(): void;
}

export const stateStyles = css`
  /* The panel look of #4 (E-33 b): card fill, solid (loading) or dashed (empty) border, large radius, token spacing. */
  [data-state-panel] {
    display: grid;
    justify-items: center;
    gap: var(--sk-space-3);
    min-width: 0;
    padding: var(--sk-space-9) var(--sk-space-6);
    background: var(--sk-surface-card);
    border-radius: var(--sk-radius-lg);
  }
  [data-state-panel][data-kind='loading'] {
    border: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  [data-state-panel][data-kind='empty'] {
    border: var(--sk-border-width-1) dashed var(--sk-border-control);
  }
  [data-state-panel] h2 {
    margin: 0;
    font-size: var(--sk-text-lg);
    font-family: var(--sk-font-display);
    font-weight: var(--sk-weight-bold);
  }
  sk-section-header,
  sk-notice {
    display: block;
    min-width: 0;
  }
  /* The panel's words are centred as a block (the library header's own columns start them at the edge). */
  [data-state-panel] sk-section-header::part(title),
  [data-state-panel] sk-section-header::part(description) {
    justify-self: center;
  }
  [data-error] sk-button {
    margin-block: var(--sk-space-3) 0;
  }
`;

/** The loading panel, the error notice with its retry, or the empty form. */
export function renderListState(kind: ListStateKind, ctx: ListStateContext): TemplateResult | typeof nothing {
  if (kind === 'loading') {
    return html`<div data-state-panel data-kind="loading" aria-busy="true">
      <div class="sk-progress sk-progress--indeterminate sk-progress--compact">
        <label class="sk-progress__label" for="projects-loading-progress">${LIST_LOADING_TEXT}</label>
        <progress class="sk-progress__bar" id="projects-loading-progress"></progress>
      </div>
    </div>`;
  }
  if (kind === 'error') {
    // The Retry control sits BESIDE the notice, never in its `actions` slot: the notice host is `tabindex="-1"` (precedent: the Work Package screen).
    return html`<div data-error>
      <sk-notice tone="danger" announce="off">${ctx.errorMessage === '' ? LIST_ERROR_BODY : ctx.errorMessage}</sk-notice>
      <sk-button variant="secondary" @click=${() => ctx.onRetry()}>${ENTRY_RETRY_LABEL}</sk-button>
    </div>`;
  }
  // The call to action is the header's "Open project" button (one button, shown once); the panel only states the form.
  return html`<div data-state-panel data-kind="empty">
    <sk-section-header>
      <h2 slot="title">${LIST_EMPTY_TITLE}</h2>
      <span slot="description">${LIST_EMPTY_BODY}</span>
    </sk-section-header>
  </div>`;
}

/** The read-only notice at the foot of the list. */
export function renderNotice(): TemplateResult | typeof nothing {
  return html`<sk-notice tone="info" announce="off" role="note">${READ_ONLY_NOTICE}</sk-notice>`;
}
