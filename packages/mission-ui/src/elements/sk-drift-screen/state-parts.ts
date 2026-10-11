// The states of the Drift screen: loading, clean, error, not-found, choose-a-finding and the truncation note. The screen draws the
// wrappers (`data-region="state"`, `"truncation"` and `"detail"`) and dispatches `sk-retry-load` and `sk-open-missions`; a part
// never dispatches an event. Neither notice carries a live role (`announce="off"`): the screen's one live region says it once.
// The library's `sk-empty-state` and `sk-progress` families carry the classes (CP-1 ruling F-2, the E-17 precedent).
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  CHOOSE_HEADING,
  CLEAN_BODY,
  CLEAN_HEADING,
  DRIFT_LOADING_LABEL,
  DRIFT_NOT_FOUND_BODY,
  DRIFT_NOT_FOUND_HEADING,
  RETRY_LABEL,
  RETURN_TO_MISSIONS_LABEL,
  STALE_SELECTION_NOTE,
} from '../../defaults/index.js';
import type { DriftReportView } from '../../contract/types.js';
import { lastScanLine, truncationNote } from '../../logic/index.js';
import type { LabelHooks } from '../../logic/index.js';

/** What the state bodies read. */
export interface StateProps {
  /** The report that is shown, for the last scan and the truncation count; null when none is. */
  report: DriftReportView | null;
  now: string | null;
  hooks: LabelHooks | null;
  /** The refusal in words (the host's `errorMessage`, else the hook, else the table, else the generic words). */
  refusalText: string;
  /** True when a selection key is set but is not in this scan (DR-30). */
  stale: boolean;
  /** Retry was activated (error state). */
  onRetry(): void;
  /** "Return to Missions" was activated (not-found state). */
  onReturnToMissions(): void;
}

export const stateStyles = css`
  /* A whole-screen state sits in the screen's padded state region; the families bring the rest. */
  [data-state-body] {
    display: block;
    min-width: 0;
  }
  [data-state-body] > .sk-empty-state {
    min-width: 0;
  }
  [data-state-body] > .sk-empty-state > sk-button {
    margin-block: var(--sk-space-4) 0;
  }
  [data-state-body] > sk-notice {
    display: block;
    min-width: 0;
  }
  [data-state-body] > sk-notice + sk-button {
    margin-block: var(--sk-space-3) 0;
  }
  sk-notice {
    display: block;
    min-width: 0;
  }
`;

/** Loading the first scan: a labelled indeterminate progress bar. */
export function renderLoading(p: StateProps): TemplateResult {
  void p;
  return html`<div data-state-body="loading" aria-busy="true">
    <div class="sk-empty-state">
      <div class="sk-progress sk-progress--indeterminate sk-progress--compact">
        <label class="sk-progress__label" for="drift-loading">${DRIFT_LOADING_LABEL}</label>
        <progress class="sk-progress__bar" id="drift-loading"></progress>
      </div>
    </div>
  </div>`;
}

/** A scan with no findings: what it says, and when it ran. It never says everything is consistent. */
export function renderClean(p: StateProps): TemplateResult {
  const lastScan = p.report === null ? '' : lastScanLine(p.report.scannedAt, p.now, p.hooks);
  return html`<div data-state-body="clean">
    <div class="sk-empty-state">
      <h2 class="sk-empty-state__heading">${CLEAN_HEADING}</h2>
      <p class="sk-empty-state__body">${CLEAN_BODY}</p>
      ${lastScan === '' ? nothing : html`<p class="sk-empty-state__body" data-last-scan title=${p.report?.scannedAt ?? ''}>${lastScan}</p>`}
    </div>
  </div>`;
}

/** The refusal in words and Retry, which sits beside the notice (a button in the notice's slot would leave the Tab order). */
export function renderError(p: StateProps): TemplateResult {
  return html`<div data-state-body="error">
    <sk-notice tone="danger" announce="off">${p.refusalText}</sk-notice>
    <sk-button variant="secondary" data-retry @click=${p.onRetry}>${RETRY_LABEL}</sk-button>
  </div>`;
}

/** No Mission has this identity: a way back to the Missions list. */
export function renderNotFound(p: StateProps): TemplateResult {
  return html`<div data-state-body="not-found">
    <div class="sk-empty-state">
      <h2 class="sk-empty-state__heading">${DRIFT_NOT_FOUND_HEADING}</h2>
      <p class="sk-empty-state__body">${DRIFT_NOT_FOUND_BODY}</p>
      <sk-button data-return @click=${p.onReturnToMissions}>${RETURN_TO_MISSIONS_LABEL}</sk-button>
    </div>
  </div>`;
}

/** Nothing is selected, or the selected key is not in this scan (the second adds one sentence). No event. */
export function renderChoose(p: StateProps): TemplateResult {
  return html`<div data-state-body="choose">
    <div class="sk-empty-state">
      <h2 class="sk-empty-state__heading">${CHOOSE_HEADING}</h2>
      ${p.stale ? html`<p class="sk-empty-state__body">${STALE_SELECTION_NOTE}</p>` : nothing}
    </div>
  </div>`;
}

/** "Showing the first N findings.", with N the number of findings in the report; only for a truncated report. */
export function renderTruncationNote(p: StateProps): TemplateResult {
  const text = p.report === null ? null : truncationNote(p.report);
  return text === null ? html`${nothing}` : html`<sk-notice tone="info" announce="off" data-truncation>${text}</sk-notice>`;
}
