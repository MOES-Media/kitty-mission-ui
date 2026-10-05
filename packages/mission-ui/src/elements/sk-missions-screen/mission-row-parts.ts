// Private fragment of the Missions screen: not registered, not in the manifest. No library class is written here; the row
// is the library's `sk-action-row` filled through its slots (the E-03 class exception covers this file but is not used).
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { STALE_BADGE } from '../../defaults/index.js';
import type { RowView } from '../../logic/index.js';

/**
 * One Mission row: `title` the name, `reference` the slug, `tags` the type, topology, blocked and stale badges,
 * `supporting` the lane summary, `metadata` the lifecycle badge, the activity text and a decorative arrow (every row is
 * a link, DR-6). Activation is the library's `sk-action-row-activate`, handed to the screen to translate.
 */
export function renderMissionRow(row: RowView, onActivate: (event: Event) => void): TemplateResult {
  return html`<sk-action-row selectable row-id=${row.missionId} @sk-action-row-activate=${onActivate}>
    <span slot="title">${row.name}</span>
    <span slot="reference">${row.slug}</span>
    <span slot="tags" data-badges>
      ${row.type === null ? nothing : html`<sk-pill-tag>${row.type}</sk-pill-tag>`}
      <sk-pill-tag>${row.topology}</sk-pill-tag>
      ${row.blockedBadge === null ? nothing : html`<sk-pill-tag status=${row.blockedBadge.tone}>${row.blockedBadge.label}</sk-pill-tag>`}
      ${row.stale ? html`<sk-pill-tag status=${STALE_BADGE.tone}>${STALE_BADGE.label}</sk-pill-tag>` : nothing}
    </span>
    <span slot="supporting">${row.summary}</span>
    <span slot="metadata" data-side>
      <sk-pill-tag status=${row.lifecycle.tone}>${row.lifecycle.label}</sk-pill-tag>
      <span data-time>${row.activity} <span data-arrow aria-hidden="true">→</span></span>
    </span>
  </sk-action-row>`;
}
