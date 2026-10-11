// The page header of the Drift screen: title, subtitle (naming the Mission when scoped), last scan and Rescan. The screen draws
// the `data-region="header"` wrapper in every state and passes the click handler; a part never dispatches an event. The band,
// the type and the button are the CP-1 grants E-37 G-2, G-5 and G-7 (with F-3's pinned 44 px height), E-39 for the slug.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { DRIFT_SUBTITLE, DRIFT_TITLE, RESCANNING_LABEL, RESCAN_LABEL } from '../../defaults/index.js';
import type { DriftReportView } from '../../contract/types.js';
import { lastScanLine, missionLabel } from '../../logic/index.js';
import type { LabelHooks, MissionNaming } from '../../logic/index.js';
import type { DriftScreenStatus } from '../../logic/index.js';

/** What the header reads. `report` is the report that is shown (null while none is). */
export interface HeaderProps {
  state: DriftScreenStatus;
  report: DriftReportView | null;
  /** The scope: the Mission a scoped scan is about, with the names the host gave it; null for the whole project. */
  scope: MissionNaming | null;
  rescanning: boolean;
  now: string | null;
  hooks: LabelHooks | null;
  /** Rescan was activated. The screen emits nothing while `rescanning`. */
  onRescan(): void;
}

export function renderHeader(p: HeaderProps): TemplateResult {
  const scope = p.scope;
  const lastScan = p.report === null ? '' : lastScanLine(p.report.scannedAt, p.now, p.hooks);
  return html`<sk-page-header>
    <h1 slot="title">${DRIFT_TITLE}</h1>
    <p slot="supporting" data-subtitle>
      ${DRIFT_SUBTITLE}${scope === null ? nothing : html` <span data-scope title=${scope.friendlyName ?? scope.missionId}>${missionLabel(scope)}</span>`}
    </p>
    <div slot="actions" data-meta>
      ${lastScan === '' ? nothing : html`<span data-last-scan title=${p.report?.scannedAt ?? ''}>${lastScan}</span>`}
      <sk-button variant="secondary" data-rescan ?busy=${p.rescanning} aria-busy=${p.rescanning ? 'true' : 'false'} @click=${p.onRescan}
        >${p.rescanning ? RESCANNING_LABEL : RESCAN_LABEL}</sk-button
      >
    </div>
  </sk-page-header>`;
}

export const headerStyles = css`
  sk-page-header {
    min-width: 0;
  }
  /* E-37 G-5: the header band. */
  sk-page-header::part(header) {
    align-items: center;
    gap: var(--sk-space-5);
    padding: var(--sk-space-4) var(--sk-space-6);
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  /* The library empty sync slot leaves a column gap before the actions: closed, so the row starts at the title's edge. */
  sk-page-header::part(meta) {
    column-gap: 0;
  }
  sk-page-header::part(text) {
    row-gap: 0;
  }
  sk-page-header h1[slot='title'] {
    margin-block: 0;
    font-family: var(--sk-font-display);
    font-size: var(--sk-text-2xl);
    letter-spacing: -0.01em;
    line-height: 1.2;
    color: var(--sk-fg-default);
  }
  /* E-37 G-2: the subtitle is muted. */
  [data-subtitle] {
    margin-block: var(--sk-space-1) 0;
    color: var(--sk-fg-muted);
  }
  /* E-39: the Mission slug of a scoped scan breaks mid-word instead of widening the band. */
  [data-scope] {
    font-family: var(--sk-font-mono);
    overflow-wrap: anywhere;
  }
  [data-meta] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-3);
    min-width: 0;
  }
  /* E-37 G-2: the last scan is mono and muted. */
  [data-meta] [data-last-scan] {
    font-family: var(--sk-font-mono);
    color: var(--sk-fg-muted);
  }
  /* E-37 G-7 and F-3: the button type, its pinned 44 px height, and the prototype's body-coloured text. */
  sk-button[data-rescan]::part(button) {
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-semibold);
    padding: var(--sk-space-2) var(--sk-space-4);
    min-block-size: 44px;
    color: var(--sk-fg-body);
  }
  /* E-37 G-9: while busy, the start padding clears the library's spinner (absolute, at the start edge) so it does not cover the label. */
  sk-button[data-rescan][busy]::part(button) {
    padding-inline-start: var(--sk-space-7);
  }
`;
