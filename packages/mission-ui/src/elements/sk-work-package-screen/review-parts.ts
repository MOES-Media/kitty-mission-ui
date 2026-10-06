// The Review panel's two inner regions and the cancellation notice: bodies only. Stubs until the review work package.
// This file carries no class and no exception. No part dispatches an event: "Open review" is an argument.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  ABSENT_MARKER,
  CANCELLED_NOTICE_HEADING,
  CYCLE_NUMBER_LABEL,
  LABEL_LATEST_RESULT,
  LABEL_OVERRIDDEN_AT,
  LABEL_OVERRIDDEN_BY,
  LABEL_REASON,
  LABEL_REFERENCE,
  LABEL_REVIEWED,
  LABEL_REVIEWER,
  NO_CYCLES_TEXT,
  NO_REVIEW_TEXT,
  OPEN_REVIEW_LABEL,
  OPEN_REVIEW_TEXT,
  OVERRIDE_HEADING,
  OVERRIDE_PARTIAL_NOTE,
} from '../../defaults/index.js';
import type { StateBadge } from '../../logic/index.js';
import { renderFileIcon } from './shared-parts.js';
import { renderEmptyForm } from './state-parts.js';

export interface ReviewResultView {
  readonly reviewer: string | null;
  readonly verdict: StateBadge;
  readonly reference: string;
}

export interface ReviewOverrideView {
  readonly complete: boolean;
  /** The override time as the screen's time rule prints it; null when the contract gives none. */
  readonly atText: string | null;
  readonly actor: string | null;
  readonly reason: string | null;
}

/** The summary: the latest result and the override, both shown and never reconciled. */
export interface ReviewSummaryView {
  readonly latestResult: ReviewResultView | null;
  readonly override: ReviewOverrideView | null;
}

export interface ReviewCycleItemView {
  readonly cycleNumber: number;
  readonly reviewedAtText: string | null;
  readonly reviewer: string | null;
  readonly verdict: StateBadge;
  readonly feedbackReference: string | null;
  /** The artifact the "Open review" control opens; null draws no control. */
  readonly artifactPath: string | null;
  /** True while there is no Mission: the control is drawn inert. */
  readonly inert: boolean;
}

/** The cycles in the order the contract gives them; `noneFound` says the list is empty and may claim so. */
export interface ReviewCyclesView {
  readonly cycles: readonly ReviewCycleItemView[];
  readonly noneFound: boolean;
}

export interface CancellationView {
  /** The word of who wrote the reason, as the source words table gives it (raw when unknown). */
  readonly sourceText: string;
  readonly reason: string | null;
  /** The canceled lane's word and tone, resolved through the lane tables (hook, default, raw) by the screen. */
  readonly stateBadge: StateBadge;
}

/** Layout only: the row lists are grids of a label track and a value track; the cycles are a plain stack. */
export const reviewStyles = css`
  [data-rows] {
    display: grid;
    grid-template-columns: minmax(min-content, .8fr) minmax(0, 1.2fr);
    gap: var(--sk-space-2) var(--sk-space-3);
    margin: 0;
  }
  /* The latest-result values break an unbroken reference or handle (E-21). */
  [data-rows] > dd {
    min-width: 0;
    overflow-wrap: break-word;
  }
  [data-rows] > dt,
  [data-rows] > dd {
    min-width: 0;
    margin: 0;
  }
  [data-region='review-summary'] sk-notice {
    display: block;
  }
  [data-region='review-summary'] [data-rows] + sk-notice {
    margin-block: var(--sk-space-4) 0;
  }
  [data-region='review-summary'] sk-notice > [slot='heading'] {
    margin: 0;
  }
  [data-region='review-summary'] sk-notice p,
  [data-region='cancellation'] sk-notice p {
    margin-block: var(--sk-space-2) 0;
  }
  [data-region='review-summary'] + [data-region='review-cycles'] {
    margin-block: var(--sk-space-4) 0;
  }
  [data-cycles] {
    display: grid;
    gap: var(--sk-space-4);
    margin: 0;
    padding: 0;
  }
  /* A plain block draws no list marker (list-style is not a layout property). */
  [data-cycles] > li {
    display: block;
    min-width: 0;
  }
  /* The nested card keeps the panel's border and radius; its padding is the prototype's compact one. */
  [data-cycles] sk-card::part(card) {
    padding: var(--sk-space-3);
  }
  [data-cycle-body] {
    display: grid;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  [data-cycle-meta] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-1) var(--sk-space-3);
  }
  [data-cycle-head] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-2) var(--sk-space-3);
  }
  [data-region='cancellation'] sk-notice {
    display: block;
  }
  [data-region='cancellation'] sk-notice > [slot='heading'] {
    margin: 0;
  }
`;

/** A value or the absent marker: a blank member is never made up. */
const orAbsent = (value: string | null): string => (value === null || value === '' ? ABSENT_MARKER : value);

function renderLatestResult(result: ReviewResultView): TemplateResult {
  return html`<dl data-rows>
    <dt>${LABEL_LATEST_RESULT}</dt>
    <dd><sk-pill-tag status=${result.verdict.tone} title=${result.verdict.label}>${result.verdict.label}</sk-pill-tag></dd>
    <dt>${LABEL_REVIEWER}</dt>
    <dd>${orAbsent(result.reviewer)}</dd>
    <dt>${LABEL_REFERENCE}</dt>
    <dd>${result.reference}</dd>
  </dl>`;
}

function renderOverride(override: ReviewOverrideView): TemplateResult {
  return html`<sk-notice tone="attention">
    <h3 slot="heading">${OVERRIDE_HEADING}</h3>
    <dl data-rows>
      <dt>${LABEL_OVERRIDDEN_BY}</dt>
      <dd>${orAbsent(override.actor)}</dd>
      <dt>${LABEL_OVERRIDDEN_AT}</dt>
      <dd>${orAbsent(override.atText)}</dd>
      <dt>${LABEL_REASON}</dt>
      <dd>${orAbsent(override.reason)}</dd>
    </dl>
    ${override.complete ? nothing : html`<p>${OVERRIDE_PARTIAL_NOTE}</p>`}
  </sk-notice>`;
}

/** The summary body: both blocks when both exist, never reconciled; the empty form when there is neither. */
export const renderReviewSummary: (view: ReviewSummaryView) => TemplateResult | typeof nothing = (view) =>
  view.latestResult === null && view.override === null
    ? renderEmptyForm(NO_REVIEW_TEXT)
    : html`${view.latestResult === null ? nothing : renderLatestResult(view.latestResult)}${view.override === null ? nothing : renderOverride(view.override)}`;

function renderCycle(cycle: ReviewCycleItemView, onOpenReview: (artifactPath: string) => void): TemplateResult {
  const path = cycle.artifactPath;
  return html`<li><sk-card inset><div data-cycle-body>
    <div data-cycle-head>
      <strong>${CYCLE_NUMBER_LABEL(cycle.cycleNumber)}</strong>
      <sk-pill-tag status=${cycle.verdict.tone} title=${cycle.verdict.label}>${cycle.verdict.label}</sk-pill-tag>
      ${path === null
        ? nothing
        : html`<sk-button variant="secondary" size="sm" label=${OPEN_REVIEW_LABEL(cycle.cycleNumber)} ?disabled=${cycle.inert} @click=${cycle.inert ? nothing : () => onOpenReview(path)}
            >${renderFileIcon()}${OPEN_REVIEW_TEXT}</sk-button
          >`}
    </div>
    <div data-cycle-meta>
      <span>${LABEL_REVIEWER}: ${orAbsent(cycle.reviewer)}</span>
      <span>${LABEL_REVIEWED}: ${orAbsent(cycle.reviewedAtText)}</span>
    </div>
    ${cycle.feedbackReference === null || cycle.feedbackReference === '' ? nothing : html`<span>${LABEL_REFERENCE}: ${cycle.feedbackReference}</span>`}
  </div></sk-card></li>`;
}

/** The cycles body, in the order the contract gives: never sorted. An empty list that may claim "none found" says so. */
export const renderReviewCycles: (view: ReviewCyclesView, onOpenReview: (artifactPath: string) => void) => TemplateResult | typeof nothing = (view, onOpenReview) =>
  view.cycles.length === 0
    ? view.noneFound
      ? renderEmptyForm(NO_CYCLES_TEXT)
      : nothing
    : html`<ol data-cycles>${view.cycles.map((cycle) => renderCycle(cycle, onOpenReview))}</ol>`;

/** The cancellation notice body: the heading, the reason when there is one, and who wrote it. A null reason invents nothing. */
export const renderCancellation: (view: CancellationView) => TemplateResult | typeof nothing = (view) => html`<sk-notice tone=${view.stateBadge.tone}>
  <h2 slot="heading">${CANCELLED_NOTICE_HEADING}</h2>
  <p data-lane><sk-pill-tag status=${view.stateBadge.tone} title=${view.stateBadge.label}>${view.stateBadge.label}</sk-pill-tag></p>
  ${view.reason === null || view.reason === ''
    ? nothing
    : html`<p data-reason>${view.reason}</p>
        <p data-source>${view.sourceText}</p>`}
</sk-notice>`;
