// The lane table of the Drift screen: the library `data-table` family (CP-1 ruling F-2 option C) inside a scroller that is a
// labelled, focusable region only while it overflows. The overflow measurement is the screen's `OverflowRegion` (a controller
// needs the host); the scroller is `.sk-data-table__scroller` and the screen passes the result as `overflowing`. Exception E-17
// precedent (F-2): `sk-data-table*` classes in this file. E-37 (G-2, G-3): cells in mono and the body colour, headers as eyebrows with 0.06em.
import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { LANE_TABLE_HEADERS, LANE_TABLE_LABEL, LANE_TABLE_SCROLLER_LABEL } from '../../defaults/index.js';
import type { LaneRowView } from '../../logic/index.js';

export interface TableProps {
  /** True while the scroller's content is wider than the scroller: only then does it take the region role, a name and a tab stop. */
  overflowing: boolean;
}

export function renderLaneTable(rows: readonly LaneRowView[], p: TableProps): TemplateResult {
  return html`<div
    class="sk-data-table__scroller"
    role=${ifDefined(p.overflowing ? 'region' : undefined)}
    aria-label=${ifDefined(p.overflowing ? LANE_TABLE_SCROLLER_LABEL : undefined)}
    tabindex=${ifDefined(p.overflowing ? '0' : undefined)}
  >
    <table class="sk-data-table" data-lane-table aria-label=${LANE_TABLE_LABEL}>
      <thead>
        <tr>
          ${LANE_TABLE_HEADERS.map((header) => html`<th scope="col">${header}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => html`<tr><td>${row.wpId}</td><td>${row.persisted}</td><td>${row.derived}</td></tr>`)}
      </tbody>
    </table>
  </div>`;
}

export const tableStyles = css`
  /* E-37 G-2: the cells are mono at the small size (the prototype's table). */
  .sk-data-table th,
  .sk-data-table td {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    padding: var(--sk-space-3);
  }
  /* E-37 (table cells): the prototype's td is the body colour; the library paints its brighter default. */
  .sk-data-table td {
    color: var(--sk-fg-body);
  }
  /* E-37 G-3: the headers are eyebrows at 0.06em. */
  .sk-data-table thead th {
    color: var(--sk-fg-subtle);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`;
