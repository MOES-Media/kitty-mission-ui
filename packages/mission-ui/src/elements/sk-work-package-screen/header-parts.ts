// The header band's parts: the one breadcrumb renderer (complete), used by the ready header, the loading header and the
// not-found header, and the band body (a stub until the header work package). Exception E-17: this is the one file that
// carries the `sk-breadcrumbs*` classes. No part dispatches an event: the handler is an argument.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { BREADCRUMB_LABEL, STALE_BADGE, STALENESS_MINUTES_TEXT, STALENESS_REASON_WORDS } from '../../defaults/index.js';
import { lookup } from '../../logic/index.js';
import type { StateBadge, StalenessView } from '../../logic/index.js';

/** The crumb trail: the Mission, then the Work Package id. */
export interface BreadcrumbView {
  /** The Mission crumb's text: the Mission name, or the host-neutral word when there is no Mission. */
  readonly missionLabel: string;
  /** The current crumb: the Work Package id as the screen resolved it. */
  readonly wpId: string;
  /** True while there is no Mission: the Mission crumb is drawn inert and activates nothing. */
  readonly inert: boolean;
}

/** What the band body draws: the crumb, the title, the status and actor badges and the staleness badge. */
export interface HeaderView {
  readonly breadcrumb: BreadcrumbView;
  readonly title: string;
  readonly stateBadge: StateBadge;
  /** The non-null handles of the actor joined by a colon; null when there are none. */
  readonly actorText: string | null;
  readonly staleness: StalenessView;
}

export const headerStyles = css`
  /* The ghost button's own inline padding would indent the crumb text from the title; the trail starts at the title's edge. */
  .sk-breadcrumbs__item > sk-button::part(button) {
    padding-inline: var(--sk-space-1);
  }
  /* The band: the header region (the screen's) supplies the padding and the wrap threshold; the band takes the room left. */
  sk-page-header {
    flex: 1 1 auto;
    min-width: 0;
  }
  /* A long title wraps between words; one over-long word is ellipsized (E-21; the full text is the h1's own name and its tooltip). */
  sk-page-header h1[slot='title'] {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* The badges sit side by side and wrap; the band's own gap spaces them. */
  sk-page-header [slot='supporting'] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-2);
  }
  .sk-breadcrumbs__list {
    flex-wrap: wrap;
    overflow-x: visible;
  }
  .sk-breadcrumbs__item {
    flex: 0 1 auto;
    min-width: 0;
  }
  .sk-breadcrumbs__item > sk-button {
    min-width: 0;
  }
`;

/**
 * The breadcrumb: a `nav` holding an `ol`. The Mission crumb is a ghost `sk-button` (Enter and Space come from the
 * element) inside a list item carrying the library's breadcrumb classes; the Work Package crumb is `aria-current`. The one
 * `/` separator is the library sheet's own (drawn before every later item), so the renderer draws none.
 */
export function renderBreadcrumb(view: BreadcrumbView, onOpenMission: () => void): TemplateResult {
  return html`<nav class="sk-breadcrumbs" aria-label=${BREADCRUMB_LABEL}>
    <ol class="sk-breadcrumbs__list">
      <li class="sk-breadcrumbs__item">
        <sk-button variant="ghost" ?disabled=${view.inert} @click=${view.inert ? nothing : onOpenMission}>${view.missionLabel}</sk-button>
      </li>
      <li class="sk-breadcrumbs__item"><span class="sk-breadcrumbs__link" aria-current="page">${view.wpId}</span></li>
    </ol>
  </nav>`;
}

/** The staleness badge's words: the stale word, the minutes as given, the reason word (raw when unknown). Absent parts drop their clause. */
function stalenessBadgeText(view: StalenessView): string {
  const reason = view.reason === null ? null : (lookup(STALENESS_REASON_WORDS, view.reason) ?? view.reason);
  const minutes = view.minutes === null ? null : STALENESS_MINUTES_TEXT(view.minutes);
  return [STALE_BADGE.label, minutes, reason].filter((part): part is string => part !== null).join(', ');
}

/**
 * The band body: one `sk-page-header` with the crumb as the eyebrow, the `h1` as the title and the badges as the supporting
 * content (the status badge, the actor badge when there is one, the staleness badge only for the badge role). The screen
 * draws the `data-region="header"` wrapper around it.
 */
export function renderHeader(view: HeaderView, onOpenMission: () => void): TemplateResult {
  return html`<sk-page-header>
    <div slot="eyebrow">${renderBreadcrumb(view.breadcrumb, onOpenMission)}</div>
    <h1 slot="title" title=${view.title}>${view.title}</h1>
    <div slot="supporting">
      <sk-pill-tag data-badge="status" status=${view.stateBadge.tone} title=${view.stateBadge.label}>${view.stateBadge.label}</sk-pill-tag>
      ${view.actorText === null ? nothing : html`<sk-pill-tag data-badge="actor" title=${view.actorText}>${view.actorText}</sk-pill-tag>`}
      ${view.staleness.role === 'badge'
        ? html`<sk-pill-tag data-badge="staleness" status=${STALE_BADGE.tone} title=${stalenessBadgeText(view.staleness)}>${stalenessBadgeText(view.staleness)}</sk-pill-tag>`
        : nothing}
    </div>
  </sk-page-header>`;
}
