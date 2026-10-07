// Lane history: the body only, a semantic ordered list on the adopted library event-timeline sheet. Exception E-17:
// `sk-event-timeline*` classes in this file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { CURRENT_MARKER, FORCED_WORD, NO_HISTORY_TEXT } from '../../defaults/index.js';
import type { HistoryItem } from '../../logic/index.js';
import { renderEmptyForm } from './state-parts.js';

/** The lane transitions in array order, all text resolved by `historyView` (logic/wp-history.ts). */
export interface HistoryView {
  readonly items: readonly HistoryItem[];
}

/** No CSS is written here: the adopted sheet draws the rail, the dots and the type (E-17). */
export const historyStyles = css``;

/** "from → to"; the first entry has no from. */
function summaryText(item: HistoryItem): string {
  return item.fromLabel === null ? item.toLabel : `${item.fromLabel} → ${item.toLabel}`;
}

function renderItem(item: HistoryItem): TemplateResult {
  return html`<li class="sk-event-timeline__item">
    <p class="sk-event-timeline__summary">${summaryText(item)}</p>
    <p class="sk-event-timeline__metadata">
      <span>${item.timeText}</span>
      ${item.actor === null ? nothing : html`<span>${item.actor}</span>`}
      ${item.forced ? html`<span>${FORCED_WORD}</span>` : nothing}
      ${item.verdict === null ? nothing : html`<sk-pill-tag status=${item.verdict.tone} title=${item.verdict.label}>${item.verdict.label}</sk-pill-tag>`}
    </p>
    ${item.reason === null || item.reason === '' ? nothing : html`<p class="sk-event-timeline__content">${item.reason}</p>`}
    ${item.current ? html`<span class="sk-event-timeline__marker">${CURRENT_MARKER}</span>` : nothing}
  </li>`;
}

/** The list takes the name of the panel's heading (`panel-title-history`); it has no name of its own. */
export const renderHistory: (view: HistoryView) => TemplateResult | typeof nothing = (view) =>
  view.items.length === 0
    ? renderEmptyForm(NO_HISTORY_TEXT)
    : html`<ol class="sk-event-timeline sk-event-timeline--compact" aria-labelledby="panel-title-history">${repeat(view.items, (item) => item.eventId, renderItem)}</ol>`;
