// The detail of one Drift finding: kicker, title, explanation, authority panel, Facts, lane table and suggested resolution.
// The detail calls `renderPanel` (`panel-parts.ts`), `renderLaneTable` and `renderResolution` itself, and returns the detail's
// sibling blocks (the screen's `data-region="detail"` wrapper is the grid that spaces them). The Mission link in Facts calls
// `onOpenMission`. Read-only (C-003). Exceptions: E-37 (G-2 mono and muted, G-3 eyebrow, G-4 pill, G-6 title, G-8 Facts, G-10 the authority pill wraps), E-39
// (Facts values break mid-word), and the E-17 precedent class `sk-facts*` (F-2).
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { FindingView } from '../../logic/index.js';
import { DRIFT_AUTHORITY_TITLE, DRIFT_FACT_DERIVED_SIDE, DRIFT_FACT_FILE, DRIFT_FACT_MISSION, DRIFT_FACTS_TITLE } from '../../defaults/index.js';
import { renderPanel } from './panel-parts.js';
import { renderResolution } from './resolution-parts.js';
import type { ResolutionProps } from './resolution-parts.js';
import { renderLaneTable } from './table-parts.js';
import type { TableProps } from './table-parts.js';

export interface DetailProps {
  /** The Mission link was activated (only offered when the Mission's slug is known). */
  onOpenMission(): void;
  table: TableProps;
  resolution: ResolutionProps;
}

function renderKicker(view: FindingView): TemplateResult {
  return html`<div data-block="kicker" data-kicker>
    <sk-pill-tag status=${view.kicker.severity.tone}>${view.kicker.severity.word}</sk-pill-tag>
    <span data-kind>${view.kicker.kind}</span>
  </div>`;
}

function renderMission(view: FindingView, p: DetailProps): TemplateResult {
  return view.mission.slug === null
    ? html`<span data-mission-id>${view.mission.missionId}</span>`
    : html`<sk-button data-mission-link variant="ghost" size="sm" @click=${p.onOpenMission}>${view.mission.slug}</sk-button>`;
}

function fact(label: string, value: TemplateResult | string): TemplateResult {
  return html`<dt class="sk-facts__term">${label}</dt>
    <dd class="sk-facts__value">${value}</dd>`;
}

function renderFacts(view: FindingView, p: DetailProps): TemplateResult {
  return html`<dl class="sk-facts sk-facts--two-col">
    ${fact(DRIFT_FACT_MISSION, renderMission(view, p))}
    ${view.file === '' ? nothing : fact(DRIFT_FACT_FILE, view.file)}
    ${view.derivedSideWord === '' ? nothing : fact(DRIFT_FACT_DERIVED_SIDE, view.derivedSideWord)}
  </dl>`;
}

/** The lane block: the table for differing rows, else the finding's sentence (corrupt JSON), else nothing. */
function renderLanes(view: FindingView, p: DetailProps): TemplateResult | typeof nothing {
  if (view.laneRows.length > 0) return html`<div data-block="lanes">${renderLaneTable(view.laneRows, p.table)}</div>`;
  return view.laneNote === null ? nothing : html`<p data-block="lanes" data-lane-note>${view.laneNote}</p>`;
}

export function renderDetail(view: FindingView, p: DetailProps): TemplateResult {
  return html`${renderKicker(view)}
    <div data-block="title">
      <h2 data-title>${view.title}</h2>
      ${view.sourceCodeTag === null ? nothing : html`<span data-source-code>${view.sourceCodeTag}</span>`}
    </div>
    ${view.explanation === null ? nothing : html`<p data-block="explanation" data-explanation>${view.explanation}</p>`}
    ${renderPanel(DRIFT_AUTHORITY_TITLE, html`<sk-pill-tag status="neutral" data-authority>${view.authorityWord}</sk-pill-tag>`, { id: 'authority' })}
    ${renderPanel(DRIFT_FACTS_TITLE, renderFacts(view, p), { id: 'facts' })} ${renderLanes(view, p)}
    ${renderResolution(view, p.resolution)}`;
}

export const detailStyles = css`
  [data-kicker] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-3);
    min-width: 0;
  }
  /* E-37 G-3: the kind word is an eyebrow. */
  [data-kind] {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sk-fg-subtle);
  }
  /* E-37 G-10: the long authority word ("The Mission's status event log") wraps in its pill instead of widening the screen at 390 px with
     200% text (WCAG 1.4.10). The library pill is nowrap; this one rule, on this one pill, names the two wrap keywords. */
  sk-pill-tag[data-authority]::part(tag) {
    white-space: normal;
    overflow-wrap: anywhere;
  }
  [data-block='title'] {
    display: grid;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  /* E-37 G-6: the detail title (scoped to the detail: the list rows carry a data-title of their own). */
  [data-region='detail'] [data-title] {
    margin: 0;
    font-family: var(--sk-font-display);
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-bold);
    line-height: 1.3;
    color: var(--sk-fg-default);
  }
  /* E-37 G-2: the quiet source-code tag and the explanation. */
  [data-source-code] {
    font-family: var(--sk-font-mono);
    color: var(--sk-fg-muted);
  }
  [data-explanation] {
    margin: 0;
    color: var(--sk-fg-muted);
  }
  /* E-37 (scoped, WP06 ruling): the Mission link is the prototype's plain mono text, so the button's own padding and weight go. */
  sk-button[data-mission-link]::part(button) {
    font-family: var(--sk-font-mono);
    font-weight: var(--sk-weight-normal);
    color: var(--sk-fg-default);
    padding: 0;
    text-align: start;
  }
  [data-lane-note] {
    margin: 0;
  }
  /* The prototype's two tracks (label .8fr, value 1.2fr), a value floor of 0. */
  .sk-facts--two-col {
    grid-template-columns: minmax(min-content, 0.8fr) minmax(0, 1.2fr);
  }
  /* E-37 G-8: the term is regular, the value is mono at the screen size; E-39: a long value breaks mid-word. */
  .sk-facts__term {
    font-weight: var(--sk-weight-normal);
  }
  .sk-facts__value {
    min-width: 0;
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
    overflow-wrap: anywhere;
  }
`;
