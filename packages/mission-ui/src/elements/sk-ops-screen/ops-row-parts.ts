// The Ops row: a plain `li` with the project grid (CP-1 S-O1 option d; no `sk-card`, no library facts element). A pure `html`
// function of the row view-model: it registers nothing, dispatches nothing and carries no listener, role or tabindex. Every
// word, tone and sentence arrives in the view (the part holds no copy); every item-derived text sits in a `bdi` and is only
// ever a text binding (R-ops-1): nothing derived from an item becomes a link, an image or any element that could load.
// Exceptions E-40 (row frame, row typography and the badge outline and mono face), E-42 (ellipsis keywords) and E-43
// (`overflow-wrap: anywhere` on the id and the evidence value) apply to this file by name (stylelint.config.mjs). The
// selectors of the badge and of the two wrapping tokens are the data attributes pinned in test/ops-part-selectors.test.ts.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { OpsEvidenceDisplay, OpsFact, OpsRowView } from '../../logic/ops-row.js';

/**
 * The look of the rows, adopted by the screen. The prototype's `invocation-row`: the row frame and typography (E-40), a head
 * (the id, then the badge), a two-column facts grid whose terms are at least 80 px (CP-1, no px literal), and, at the container
 * widths measured at CP-1 (696 px and 588 px on the wrapper inside the screen), one column of facts and a stacked head.
 */
export const opsRowStyles = css`
  /* Exception E-40: the row frame (border, radius, padding, background) and typography (size, line height, family, colour). */
  [data-ops-row] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    padding: var(--sk-space-4);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    border-radius: var(--sk-radius-md);
    background: var(--sk-surface-card);
    color: var(--sk-fg-body);
    font-family: var(--sk-font-sans);
    font-size: var(--sk-text-sm);
    line-height: 1.5;
  }
  [data-ops-head] {
    display: flex;
    /* R2-1: a badge that cannot sit beside the id (a very long host word) moves to its own line, so the id is never squeezed to nothing. */
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--sk-space-3);
    min-width: 0;
    margin-block: 0 var(--sk-space-3);
  }
  /* Exception E-43: the id is one unbroken token by nature and wraps anywhere inside the row. */
  [data-ops-id] {
    min-width: 0;
    overflow-wrap: anywhere;
    color: var(--sk-fg-default);
  }
  [data-ops-mono] {
    font-family: var(--sk-font-mono);
    font-variant-numeric: tabular-nums;
  }
  /* The badge keeps the library pill. Exception E-40, second clause: the outline and the mono face, for this badge only (the
     data attribute scopes it; no other pill is touched). Every pill ellipsizes (E-42) with the full word in its title. */
  sk-pill-tag[data-ops-badge] {
    min-width: 0;
    /* The status badge never shrinks (A11Y-001): its word stays whole at any text size. The head's id gives way instead. */
    flex-shrink: 0;
    /* Ops G-7: ...but never wider than the row: a word longer than the row ellipsizes at the row edge (the full word is the title). */
    max-width: 100%;
    /* The badge stays its own width when the head stacks (CP-1 S-O3): it never stretches to the row. */
    align-self: flex-start;
  }
  [data-ops-badge]::part(tag) {
    display: block;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-block: var(--sk-space-1);
    padding-inline: var(--sk-space-2);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    font-family: var(--sk-font-mono);
    font-weight: inherit;
    font-variant-numeric: tabular-nums;
    /* Ops G-2: the prototype tag's line height (14.4 px at the tag's size) and block padding. */
    line-height: 1.2;
  }
  [data-ops-badge][status='success']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-success);
  }
  [data-ops-badge][status='danger']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-danger);
  }
  [data-ops-badge][status='attention']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-attention);
  }
  [data-ops-badge][status='info']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-info);
  }
  [data-ops-badge][status='recovery']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-recovery);
  }
  [data-ops-facts] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: var(--sk-space-6);
    margin: 0;
  }
  [data-ops-facts] > div {
    display: grid;
    grid-template-columns: minmax(calc(var(--sk-space-10) + var(--sk-space-4)), 0.55fr) minmax(0, 1.45fr);
    gap: var(--sk-space-3);
    padding-block: var(--sk-space-3);
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  /* Ops G-1 (DO-24): the facts are separated by a divider; the last fact has none. */
  [data-ops-facts] > div:last-child {
    border-block-end: 0;
  }
  /* A term or a value wraps, never ellipsizes (operator ruling on A11Y-001, 2026-10-11): at a large text size a timestamp, an id or
     the term "Work Package" must stay readable. Exception E-42, the overflow-wrap keyword break-word, lets an unbroken token break. */
  [data-ops-facts] dt,
  [data-ops-facts] dd:not([data-ops-evidence-cell]) {
    min-width: 0;
    margin: 0;
    overflow-wrap: break-word;
  }
  [data-ops-facts] dt {
    color: var(--sk-fg-muted);
  }
  [data-ops-facts] dd {
    margin: 0;
    color: var(--sk-fg-default);
  }
  [data-ops-quiet] {
    color: var(--sk-fg-muted);
  }
  /* The evidence cell: the value (wrapping anywhere, E-43) and its quiet labels, which move below the value when it is long. */
  [data-ops-facts] dd[data-ops-evidence-cell] {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--sk-space-1) var(--sk-space-2);
    min-width: 0;
  }
  [data-ops-evidence] {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  /* The labels wrap too (A11Y-001): at 390 px and 200 percent the cell is narrower than the word. */
  [data-ops-evidence-class],
  [data-ops-changed] {
    min-width: 0;
    overflow-wrap: break-word;
    color: var(--sk-fg-muted);
    font-size: var(--sk-text-xs);
  }
  /* CP-1 S-O2: the facts become one column at 696 px and the head stacks at 588 px (the container is the wrapper in the screen).
     The thresholds are in rem (A11Y-001): 43.5rem and 36.75rem are 696 px and 588 px at the 16 px default, and they grow with the text. */
  @container (max-width: 43.5rem) {
    [data-ops-facts] {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @container (max-width: 36.75rem) {
    [data-ops-head] {
      flex-direction: column;
      align-items: stretch;
    }
  }
`;

/** One Op as a list item: the badge, the id, the facts and the evidence of `view`. */
export function renderOpsRow(view: OpsRowView): TemplateResult {
  return html`<li data-row-id=${view.id} data-ops-row>
    <div data-ops-head>
      <strong data-ops-mono data-ops-id><bdi>${view.id}</bdi></strong>
      <sk-pill-tag data-ops-badge status=${view.badge.tone} title=${view.badge.word}><bdi>${view.badge.word}</bdi></sk-pill-tag>
    </div>
    <dl data-ops-facts>
      ${view.facts.map((fact) => renderFact(fact, view.evidence))}
    </dl>
  </li>`;
}

/** One term and its value; the value is drawn by the kind the view gives it. */
function renderFact(fact: OpsFact, evidence: OpsEvidenceDisplay | null): TemplateResult {
  return html`<div><dt title=${fact.term}>${fact.term}</dt>${renderValue(fact, evidence)}</div>`;
}

function renderValue(fact: OpsFact, evidence: OpsEvidenceDisplay | null): TemplateResult {
  const mono = fact.mono;
  switch (fact.kind) {
    case 'quiet':
      return html`<dd data-ops-quiet title=${fact.value}>${fact.value}</dd>`;
    case 'time':
      return html`<dd title=${fact.value}
        ><time data-ops-mono datetime=${fact.datetime ?? nothing}><bdi>${fact.value}</bdi></time></dd
      >`;
    case 'evidence':
      return evidence === null
        ? html`<dd ?data-ops-mono=${mono} title=${fact.value}><bdi>${fact.value}</bdi></dd>`
        : renderEvidence(evidence);
    default:
      return html`<dd ?data-ops-mono=${mono} title=${fact.value}><bdi>${fact.value}</bdi></dd>`;
  }
}

/** The evidence value as inert text, its class word as a quiet label and, when the service changed it, the quiet changed word. */
function renderEvidence(evidence: OpsEvidenceDisplay): TemplateResult {
  return html`<dd data-ops-evidence-cell>
    <span data-ops-mono data-ops-evidence data-evidence-value><bdi>${evidence.value}</bdi></span>
    <span data-ops-evidence-class title=${evidence.classWord}><bdi>${evidence.classWord}</bdi></span>
    ${evidence.changed
      ? html`<span data-ops-changed aria-description=${evidence.changedDescription} title=${evidence.changedDescription}>${evidence.changedWord}</span>`
      : nothing}
  </dd>`;
}
