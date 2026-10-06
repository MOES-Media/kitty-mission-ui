// Owned files: the body only. A pattern as authored, a marker for a glob and the change-state word as a pill, each row a
// plain (not selectable) library `sk-action-row`. The `::part` rules of this file are exception E-22
// (contracts/gates.md), pinned selector and declaration by `test/wp-part-selectors.test.ts`; the row geometry they give is
// asserted in `test/wp-files-parts.test.ts`, and the part names are checked against the library's manifest. The part reads
// the `filesView` of the resolved list only and dispatches nothing.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { CHANGE_STATE_UNAVAILABLE_NOTE, GLOB_MARKER, NO_FILES_TEXT } from '../../defaults/index.js';
import type { FilesView } from '../../logic/index.js';
import { renderEmptyForm } from './state-parts.js';

/** The rows and the all-unknown flag come from `filesView` (logic/wp-files.ts). */
export type OwnedFilesView = FilesView;

export const filesStyles = css`
  /* Layout only (no exception): a grid of rows; each item is a plain block, so the list shows no marker. */
  [data-files] {
    display: grid;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
  }
  [data-files] > li {
    display: block;
    min-width: 0;
  }
  /* A row is the library's plain action row with the state over the pattern and the glob marker under it, so the pattern
     has the whole row to wrap in; the title, metadata and supporting areas are not used, so they take no room. */
  [data-files] sk-action-row::part(trigger) {
    grid-template-areas:
      'marker'
      'reference'
      'tags';
    grid-template-columns: minmax(0, 1fr);
    row-gap: 0;
  }
  [data-files] sk-pill-tag[slot='marker'] {
    display: inline-block;
    margin-block: 0 var(--sk-space-2);
  }
  [data-files] sk-action-row::part(title),
  [data-files] sk-action-row::part(metadata),
  [data-files] sk-action-row::part(supporting),
  [data-files] sk-action-row::part(controls) {
    display: none;
  }
  [data-files] sk-action-row::part(tags) {
    margin-block: var(--sk-space-2) 0;
  }
  [data-note] {
    margin-block: var(--sk-space-3) 0;
  }
`;

/** A path with a break opportunity after each slash: it wraps between segments and keeps its text unchanged (also used for the workspace branches). */
export const breakable = (pattern: string): (string | TemplateResult)[] =>
  pattern.split('/').flatMap((part, index) => (index === 0 ? [part] : ['/', html`<wbr />`, part]));

export const renderOwnedFiles: (view: OwnedFilesView) => TemplateResult | typeof nothing = (view) => {
  if (view.rows.length === 0) return renderEmptyForm(NO_FILES_TEXT);
  return html`<ul data-files>
      ${repeat(
        view.rows,
        (row) => row.pattern,
        (row) => html`<li>
          <sk-action-row>
            ${row.badge === null ? nothing : html`<sk-pill-tag slot="marker" status=${row.badge.tone} title=${row.badge.label}>${row.badge.label}</sk-pill-tag>`}
            <span slot="reference" data-pattern title=${row.pattern}>${breakable(row.pattern)}</span>
            ${row.isGlob ? html`<sk-pill-tag slot="tags" data-glob title=${GLOB_MARKER}>${GLOB_MARKER}</sk-pill-tag>` : nothing}
          </sk-action-row>
        </li>`,
      )}
    </ul>
    ${view.allUnknown ? html`<p data-note>${CHANGE_STATE_UNAVAILABLE_NOTE}</p>` : nothing}`;
};
