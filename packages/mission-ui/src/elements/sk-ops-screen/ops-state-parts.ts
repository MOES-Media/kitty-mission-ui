// The Ops loading, empty and error looks (IC-06). Each replaces ONLY the list region: the screen draws the header and the source
// notice around it in every look (OP-36). Each look has one heading that takes focus (`tabindex="-1"`, `data-focus-target`)
// when the focused control is removed (D-09). Pure `html` functions of view-models; the retry handler arrives as an argument and
// nothing here dispatches an event. The part holds no copy (the screen resolves every text from `defaults/`) and names no path
// or file format (OQ-6). Library gap: the `sk-progress` and `sk-empty-state` families have no element, only classes, so this
// file takes their class names as the other screens do (E-03 precedent; the lint allowance is pinned to this file by name).
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

/** The loading look: its label and its sentence. */
export interface OpsLoadingView {
  readonly label: string;
  readonly body: string;
}

/**
 * The empty look, composed by `opsEmptyText`: the heading, the body sentence and, apart from it, the skipped sentence (or null).
 * `profile` is named in mono right after the body sentence when set, so the skipped sentence follows it.
 */
export interface OpsEmptyView {
  readonly heading: string;
  readonly body: string;
  readonly profile?: string | null;
  readonly skipped?: string | null;
}

/** The error look: the heading, the body (host message, refusal sentence or generic), the code as given and the retry label. */
export interface OpsErrorView {
  readonly heading: string;
  readonly body: string;
  readonly refusalCode: string | null;
  readonly retryLabel: string;
}

/** Layout of the state panel inside the page cell (layout only, `--sk-*` tokens). */
export const opsStateStyles = css`
  /* The prototype's state panel is 760 px wide and centred (.state-panel): one grid track built from space tokens
     (6 x 8rem - 0.5rem = 47.5rem). The card (Ops G-4, narrowed): the empty look draws the dashed control border, the loading look the
     solid default border; the error look draws none (the notice is the panel). The pinned selectors are in ops-part-selectors.test.ts. */
  [data-ops-state] {
    display: grid;
    grid-template-columns: minmax(0, calc(var(--sk-space-12) * 6 - var(--sk-space-2)));
    justify-content: center;
    min-width: 0;
  }
  [data-ops-state] > .sk-empty-state {
    padding: var(--sk-space-9);
    border: var(--sk-border-width-1) dashed var(--sk-border-control);
    border-radius: var(--sk-radius-lg);
    background: var(--sk-surface-card);
  }
  [data-ops-state][aria-busy='true'] > .sk-empty-state {
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    line-height: 1.5;
  }
  /* Ops G-6: the prototype's .empty-state and .state-loading set no line height, so everything inside them inherits 1.5. The line height
     (the one pinned literal, as in E-40) sits on the two cards and is inherited. The empty look also gets a bold heading at its own 1.3 (the prototype's h2) and no gap
     between the heading and the body; a profile keeps the space-3 spacing the gap gave it. The loading look keeps the library's gap.
     The pinned selectors are in ops-part-selectors.test.ts. */
  [data-ops-state]:not([aria-busy='true']) > .sk-empty-state {
    gap: 0;
    line-height: 1.5;
  }
  [data-ops-state]:not([aria-busy='true']) .sk-empty-state__heading {
    font-weight: var(--sk-weight-bold);
    line-height: 1.3;
  }
  [data-ops-state] code[data-empty-profile],
  [data-ops-state] p[data-empty-skipped] {
    margin-block: var(--sk-space-3) 0;
  }
  [data-ops-state] > sk-notice {
    display: block;
    min-width: 0;
  }
  [data-ops-state] > sk-button {
    margin-block: var(--sk-space-3) 0;
  }
  /* A long profile wraps (Ops G-5: the overflow-wrap keyword, E-42 extended to this file, for this selector only). The full text is
     also the title. */
  [data-ops-state] code[data-empty-profile] {
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

const LOADING_ID = 'ops-loading-label';

export function renderOpsLoading(view: OpsLoadingView): TemplateResult {
  return html`<div data-ops-state aria-busy="true">
    <div class="sk-empty-state">
      <div class="sk-progress sk-progress--indeterminate sk-progress--compact" role="heading" aria-level="2" tabindex="-1" data-focus-target>
        <label class="sk-progress__label" for=${LOADING_ID}>${view.label}</label>
        <progress class="sk-progress__bar" id=${LOADING_ID}></progress>
      </div>
      <p class="sk-empty-state__body">${view.body}</p>
    </div>
  </div>`;
}

export function renderOpsEmpty(view: OpsEmptyView): TemplateResult {
  const profile = view.profile === undefined || view.profile === null ? null : view.profile;
  const skipped = view.skipped === undefined || view.skipped === null ? null : view.skipped;
  // Without a profile the two sentences share one paragraph; with one, the profile code sits between them.
  return html`<div data-ops-state>
    <div class="sk-empty-state">
      <h2 class="sk-empty-state__heading" tabindex="-1" data-focus-target>${view.heading}</h2>
      ${profile === null
        ? html`<p class="sk-empty-state__body">${skipped === null ? view.body : `${view.body} ${skipped}`}</p>`
        : html`<p class="sk-empty-state__body">${view.body}</p>
            <code data-empty-profile title=${profile}>${profile}</code>
            ${skipped === null ? nothing : html`<p class="sk-empty-state__body" data-empty-skipped>${skipped}</p>`}`}
    </div>
  </div>`;
}

export function renderOpsError(view: OpsErrorView, onRetry: () => void): TemplateResult {
  // The retry sits BESIDE the notice: the library's notice host carries `tabindex="-1"`, which takes a slotted control out of
  // the Tab order (the Work Package screen measured it).
  return html`<div data-ops-state>
    <sk-notice tone="danger" announce="assertive" data-error-code=${view.refusalCode ?? ''}>
      <h2 slot="heading" tabindex="-1" data-focus-target>${view.heading}</h2>
      ${view.body}
    </sk-notice>
    <sk-button variant="secondary" data-retry @click=${onRetry}>${view.retryLabel}</sk-button>
  </div>`;
}
