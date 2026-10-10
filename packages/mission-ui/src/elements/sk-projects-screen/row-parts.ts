// One Projects row. The part returns the BODY of the `li` the screen draws and never dispatches an event.
// The row is the library's `sk-action-row` filled through its slots (no row chrome is written here). Exceptions E-31 (CP-1) cover
// this file (sunsets: (a) spec-kitty-design#525, (c) and (d) #526): (a) the hover border and background of the row, (b) the pill and the version text do not wrap (nowrap and an ellipsis),
// (c) the health pill's 1px outline in the tone's foreground colour and the mono face, (d) the pill's 1.2 line (24.4px tall, as the prototype). Container threshold: one column at a 620px content cell.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { ENTRY_ERROR_TEXT, ENTRY_LOADING_TEXT, ENTRY_RETRY_LABEL, ENTRY_UNAVAILABLE_TEXT } from '../../defaults/index.js';
import { projectRetryDetail } from '../../logic/project-retry.js';
import type { EntryView, ProjectRowView } from '../../logic/project-row.js';
import type { EntryStub } from '../../logic/project-entry.js';

/** What a row needs from the screen: the open handler (openable rows) and the retry handler (error rows), both keyed by the entry key. */
export interface RowContext {
  onOpen(view: ProjectRowView): void;
  onRetry(key: string): void;
}

export const rowStyles = css`
  /* The prototype's row: name, version and health on one line, the location below, the side block on the right (two columns).
     The library row supplies the chrome, the type and the muted colours of each slot; only the placement is written here. */
  sk-action-row::part(trigger) {
    grid-template-areas:
      'title reference tags . metadata'
      'supporting supporting supporting supporting metadata';
    grid-template-columns: minmax(0, auto) minmax(0, auto) minmax(0, auto) minmax(0, 1fr) auto;
    align-items: baseline;
    column-gap: var(--sk-space-3);
    row-gap: 0;
    padding: var(--sk-space-4);
  }
  sk-action-row::part(tags) {
    margin-block: 0;
  }
  sk-action-row::part(metadata) {
    margin-inline: var(--sk-space-2) 0;
  }
  /* The library row reserves an end slot for its controls (16px of inline padding). A row with no control gives that space back, so
     the side block sits at the row's own padding as in the prototype; the failed row keeps it for Retry. */
  sk-action-row:not([data-row-kind='error'])::part(controls) {
    padding-inline: 0;
  }
  /* The version and the project name never wrap (E-31 b): an ellipsis, the full text in the element's title. The name is bold
     (E-34 c); the row text (version, location, side block) is 14px as in the prototype (E-34 c). */
  sk-action-row::part(reference),
  sk-action-row::part(title) {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  sk-action-row::part(title) {
    font-weight: var(--sk-weight-bold);
  }
  sk-action-row::part(reference),
  sk-action-row::part(supporting),
  sk-action-row::part(metadata) {
    font-size: var(--sk-text-sm);
  }
  [data-location] {
    font-family: var(--sk-font-mono);
  }
  [data-side],
  [data-state-line] {
    display: grid;
    justify-items: end;
    gap: var(--sk-space-1);
  }
  /* The health pill: one line with an ellipsis (E-31 b), the mono face and the tone's own 1px outline (E-31 c). */
  sk-pill-tag {
    min-width: 0;
  }
  sk-pill-tag::part(tag) {
    box-sizing: border-box;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: var(--sk-font-mono);
    font-weight: var(--sk-weight-normal);
    line-height: 1.2;
    padding: var(--sk-space-1) var(--sk-space-2);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  sk-pill-tag[status='success']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-success);
  }
  sk-pill-tag[status='info']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-info);
  }
  sk-pill-tag[status='attention']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-attention);
  }
  sk-pill-tag[status='danger']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-danger);
  }
  sk-pill-tag[status='recovery']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-recovery);
  }
  sk-pill-tag[status='neutral']::part(tag) {
    border: var(--sk-border-width-1) solid var(--sk-on-status-neutral);
  }
  /* Hover (E-31 a): the prototype's border and fill, on the row and over the library's own trigger fill. */
  sk-action-row[selectable]:hover::part(row) {
    border-color: var(--sk-border-control);
    background-color: var(--sk-surface-input);
  }
  sk-action-row[selectable]:hover::part(trigger) {
    background-color: transparent;
  }
  /* One column at a content cell of 620px or less (CP-1, DP-25): the title line keeps its flow, the side block drops under the
     location, aligned to the start. A part's query container is the library row itself, whose width is the cell minus the
     content padding of the narrow tier (16px each side): 588px is the row width at a 620px cell, so the flip is at 620 exactly. */
  @container (max-width: 588px) {
    sk-action-row::part(trigger) {
      grid-template-areas:
        'title reference tags .'
        'supporting supporting supporting supporting'
        'metadata metadata metadata metadata';
      grid-template-columns: minmax(0, auto) minmax(0, auto) minmax(0, auto) minmax(0, 1fr);
      row-gap: 0;
    }
    /* The prototype's single-column row: 20px between the location and the side block, no gap between the title and the location. */
    sk-action-row::part(metadata) {
      justify-self: start;
      margin-inline: 0;
      margin-block: var(--sk-space-5) 0;
    }
    [data-side],
    [data-state-line] {
      justify-items: start;
    }
  }
`;

function renderHealth(view: ProjectRowView): TemplateResult {
  return html`<sk-pill-tag status=${view.health.tone} title=${view.health.label}>${view.health.label}</sk-pill-tag>`;
}

function renderProject(view: ProjectRowView, ctx: RowContext): TemplateResult {
  const arrow = view.openable ? html` <span data-arrow aria-hidden="true">→</span>` : nothing;
  const content = html`
    <span slot="title" title=${view.name}>${view.name}</span>
    ${view.versionText === null ? nothing : html`<span slot="reference" title=${view.versionText}>${view.versionText}</span>`}
    <span slot="tags">${renderHealth(view)}</span>
    ${view.locationLine === '' ? nothing : html`<span slot="supporting" data-location>${view.locationLine}</span>`}
    <span slot="metadata" data-side>
      <span>${view.missionCountText}</span>
      <span data-activity>${view.activityText}${arrow}</span>
    </span>
  `;
  if (!view.openable) return html`<sk-action-row data-row-kind="row">${content}</sk-action-row>`;
  return html`<sk-action-row
    selectable
    row-id=${view.key}
    data-row-kind="row"
    @sk-action-row-activate=${(event: Event) => {
      event.stopPropagation();
      ctx.onOpen(view);
    }}
    >${content}</sk-action-row
  >`;
}

function renderStub(view: EntryStub, ctx: RowContext): TemplateResult {
  const sentence = view.kind === 'error' ? ENTRY_ERROR_TEXT : view.kind === 'unavailable' ? ENTRY_UNAVAILABLE_TEXT : ENTRY_LOADING_TEXT;
  // An entry shown by its location alone does not repeat it on a second line.
  const showLocation = view.name !== null && view.locationLine !== '';
  return html`<sk-action-row data-row-kind=${view.kind} aria-busy=${view.kind === 'loading' ? 'true' : nothing}>
    <span slot="title" title=${view.title}>${view.title}</span>
    ${showLocation ? html`<span slot="supporting" data-location>${view.locationLine}</span>` : nothing}
    <span slot="metadata" data-state-line>
      ${view.kind === 'loading'
        ? html`<span class="sk-progress sk-progress--indeterminate sk-progress--compact">
            <label class="sk-progress__label" for=${`progress-${view.key}`}>${sentence}</label>
            <progress class="sk-progress__bar" id=${`progress-${view.key}`}></progress>
          </span>`
        : html`<span>${sentence}</span>`}
    </span>
    ${view.kind === 'error' && projectRetryDetail(view) !== null
      ? html`<sk-button slot="controls" variant="secondary" label=${`${ENTRY_RETRY_LABEL}, ${view.title}`} @click=${() => ctx.onRetry(view.key)}>${ENTRY_RETRY_LABEL}</sk-button>`
      : nothing}
  </sk-action-row>`;
}

/** A row for a read project, or the loading, error or unavailable form of an entry. */
export function renderRow(view: EntryView, ctx: RowContext): TemplateResult | typeof nothing {
  return view.kind === 'row' ? renderProject(view, ctx) : renderStub(view, ctx);
}
