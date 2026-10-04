// Exception E-03 (this file and mission-row-parts.ts only): the library's `empty-state` and `progress` families are
// styles-only, so the screen adopts their sheets and writes their classes (gaps G-03, G-06).
// Exception E-13 (this file only, N-7): `padding-block`, `gap`, `font-weight`, `border`, `border-radius`, `font-family` on the loading and empty panel wrappers,
// token values only (sunset: spec-kitty-design#510, panel spacing and weight tokens).
import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { keyed } from 'lit/directives/keyed.js';
import '@spec-kitty/elements';
import {
  DEFAULT_FILTER_ID,
  DEFAULT_LANE_GROUPS,
  EMPTY_BODY,
  EMPTY_HEADING,
  ERROR_BODY,
  ERROR_HEADING,
  FILTERS,
  FILTER_GROUP_LABEL,
  HEADER_EYEBROW,
  HEADER_SEPARATOR,
  HEADER_TITLE,
  LOADING_BODY,
  LOADING_LABEL,
  LOAD_MORE_TEXT,
  NO_MATCH_BODY,
  NO_MATCH_HEADING,
  SEARCH_LABEL,
  SEARCH_PLACEHOLDER,
  missionCountText,
  resultCountText,
} from '../../defaults/index.js';
import { emptyStateSheet } from '../../library-sheets.js';
import { progressSheet } from '../../progress-sheet.js';
import { buildRowView, matchesMission } from '../../logic/index.js';
import type { LabelHooks, LaneGroup } from '../../logic/index.js';
import type { MissionOverviewView, PageInfo, Project } from '../../contract/types.js';
import { normaliseViewState } from '../../view-state.js';
import { visuallyHidden } from '../../visually-hidden.js';
import type { ViewState } from '../../view-state.js';
import type { SkFilterChangeDetail } from '../sk-filter-toggle-group/sk-filter-toggle-group.js';
import { renderMissionRow } from './mission-row-parts.js';

/** Payload of `sk-open-mission`. */
export interface SkOpenMissionDetail {
  missionId: string;
  slug: string;
}
/** Payload of `sk-search`. */
export interface SkSearchDetail {
  query: string;
}
/** Payload of `sk-load-more`. */
export interface SkLoadMoreDetail {
  cursor: string;
}

/**
 * The Missions screen: header, toolbar, list. No I/O, nothing stored; the host owns loading, paging, routing and the
 * clock. Renders inside the `sk-mission-shell` content slot. Not self-registering: `src/index.ts` defines the tag once.
 *
 * @screen
 * @element sk-missions-screen
 * @tagname sk-missions-screen
 *
 * @fires {CustomEvent<SkOpenMissionDetail>} sk-open-mission - a row was activated; the screen never navigates
 * @fires {CustomEvent<SkFilterChangeDetail>} sk-filter-change - a different filter was pressed (dispatched by the filter group, crosses the screen)
 * @fires {CustomEvent<SkSearchDetail>} sk-search - the trimmed query changed through user input
 * @fires {CustomEvent<SkLoadMoreDetail>} sk-load-more - Load more was activated while a next page exists and `loadingMore` is false; once per cursor until `loadingMore`, `missions` or `pageInfo` changes
 */
export class SkMissionsScreen extends LitElement {
  static override styles = [
    emptyStateSheet,
    progressSheet,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      [data-toolbar] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--sk-space-4);
        margin-block: 0 var(--sk-space-5);
      }
      sk-form-input {
        flex: 0 1 27%;
        min-width: var(--sk-layout-context-sidebar-width);
      }
      /* The search label is named for assistive technology and takes no layout space. */
      sk-form-input::part(label) {
        ${visuallyHidden}
      }
      /* The result-count live region: same mechanism, a status region that is not a control. */
      [data-live] {
        ${visuallyHidden}
      }
      ul {
        display: grid;
        gap: var(--sk-space-2);
        margin: 0;
        padding: 0;
        min-width: 0;
      }
      li {
        display: block;
        min-width: 0;
      }
      /* An author display value beats the UA [hidden] rule (research D-23): restate it. */
      li[hidden] {
        display: none;
      }
      [slot='tags'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sk-space-2);
      }
      /* Title and slug on one line, as in the prototype (layout only). The library reflows below 400px of row width, so the
         override applies above it and the library's own narrow layout is left alone. */
      @container not (max-width: 400px) {
        sk-action-row::part(trigger) {
          grid-template-areas:
            'marker title reference metadata'
            'marker tags tags metadata'
            'supporting supporting supporting supporting';
          grid-template-columns: auto fit-content(60%) minmax(0, 1fr) auto;
        }
        sk-action-row::part(title),
        sk-action-row::part(reference) {
          align-self: baseline;
        }
        sk-action-row::part(reference) {
          margin-inline: var(--sk-space-3) 0;
        }
      }
      /* State panels (loading, empty, error): the full content width, the same left and right edges as the rows and the
         toolbar (operator Storybook review, item 3, which supersedes the prototype's three-quarter width). Panel spacing,
         weight, card chrome and display face follow the prototype through exception E-13 (token values only). */
      [data-state-panel] {
        display: block;
      }
      /* The empty-state keeps the library's flex centring; only the notice, a custom element, needs a block box. */
      [data-state-panel] > sk-notice {
        display: block;
        min-width: 0;
      }
      [data-state-panel] > .sk-empty-state {
        min-width: 0;
      }
      /* The no-match panel sits above the list: a standard gap keeps Load more from touching it (review, item 2). */
      [data-no-match] {
        margin-block: 0 var(--sk-space-2);
      }
      /* Item 9: the Load more row sits the same distance below the list as the list sits below the toolbar (space-5): the
         list's own row gap (space-2) plus this margin (space-3) make it. After the no-match panel the panel's space-2 and
         this margin make the same distance. */
      li[aria-busy] {
        margin-block: var(--sk-space-3) 0;
      }
      .sk-empty-state {
        padding-inline: var(--sk-space-9);
        background: var(--sk-surface-card);
        border-radius: var(--sk-radius-lg);
      }
      [data-state-panel][aria-busy] .sk-empty-state {
        border: var(--sk-border-width-1) solid var(--sk-border-default);
      }
      .sk-empty-state[data-message] {
        gap: 0;
        border: var(--sk-border-width-1) dashed var(--sk-border-control);
      }
      .sk-empty-state__heading {
        font-family: var(--sk-font-display);
        font-weight: var(--sk-weight-bold);
      }
      /* The lifecycle badge above the activity text, end-aligned, as the prototype stacks them. */
      [slot='metadata'] {
        display: grid;
        justify-items: start;
        gap: var(--sk-space-1);
      }
      /* End-aligned only where the library keeps the metadata in its own column (above 400px of row width); stacked, the
         badge starts at the content edge with the title, the tags and the activity line (review, item 10). */
      @container not (max-width: 400px) {
        [slot='metadata'] {
          justify-items: end;
        }
      }
    `,
  ];

  /** The view state; unknown values collapse to `empty`. */
  @property({ reflect: true })
  status: ViewState = 'loading';

  /** The project (header name and Mission count). */
  @property({ attribute: false })
  project: Project | null = null;

  /** Host value shown in the header; empty omits it. */
  @property()
  branch = '';

  /** The loaded Missions in service order. */
  @property({ attribute: false })
  missions: MissionOverviewView[] = [];

  /** Pagination state of the last loaded page. */
  @property({ attribute: false })
  pageInfo: PageInfo | null = null;

  /** ISO instant for relative times; null shows the ISO timestamp as given. */
  @property()
  now: string | null = null;

  /** The pressed status filter id; semi-controlled. An unknown id behaves as All. */
  @property({ reflect: true })
  filter = 'all';

  /** The search text; semi-controlled. */
  @property({ reflect: true })
  query = '';

  /** The Load more row is busy and inert while true; host-owned. */
  @property({ type: Boolean, attribute: 'loading-more' })
  loadingMore = false;

  /** The columns whose lanes drive the lane summary. */
  @property({ attribute: false })
  laneGroups: LaneGroup[] = [...DEFAULT_LANE_GROUPS];

  /** Label and time hooks. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** Overrides the default error body. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  /** The text of the polite live region (FR-034); empty until the user changes the view. */
  @state()
  private announcement = '';

  private shownCount(): number {
    return this.missions.filter((mission) => matchesMission(mission, this.filter, this.query)).length;
  }

  /** Counts the announcements: each one re-creates the text node, so a repeated text is still a change a screen reader announces. */
  @state()
  private announcementSeq = 0;

  private announce(): void {
    this.announcement = resultCountText(this.shownCount());
    this.announcementSeq += 1;
  }

  /** The cursor of the Load more request already emitted and not yet answered (C-09). */
  private requestedCursor: string | null = null;

  protected override willUpdate(changed: PropertyValues<this>): void {
    // The host answered (`loadingMore` moved, a page arrived or `pageInfo` was replaced): Load more may ask again.
    if (changed.has('loadingMore') || changed.has('missions') || changed.has('pageInfo')) this.requestedCursor = null;
    // A load-more page arrived: the list grew. Never on first render and never when the host swaps the list for a
    // shorter or equal one.
    const before = changed.get('missions');
    if (this.hasUpdated && before !== undefined && before.length > 0 && this.missions.length > before.length) this.announce();
  }

  private onOpen(event: Event, mission: MissionOverviewView): void {
    event.stopPropagation();
    const detail: SkOpenMissionDetail = { missionId: mission.missionId, slug: mission.slug };
    this.dispatchEvent(new CustomEvent<SkOpenMissionDetail>('sk-open-mission', { detail, bubbles: true, composed: true }));
  }

  private onFilterChange(event: CustomEvent<SkFilterChangeDetail>): void {
    // The group's own event crosses the screen unchanged; the screen only follows it.
    this.filter = event.detail.filter;
    this.announce();
  }

  private onSearchInput(event: Event): void {
    const source = event.composedPath()[0] as HTMLInputElement;
    const previous = this.query.trim();
    this.query = source.value;
    const next = this.query.trim();
    if (next === previous) return;
    const detail: SkSearchDetail = { query: next };
    this.dispatchEvent(new CustomEvent<SkSearchDetail>('sk-search', { detail, bubbles: true, composed: true }));
    this.announce();
  }

  private onLoadMore(): void {
    const cursor = this.pageInfo?.nextPageCursor ?? null;
    if (this.loadingMore || cursor === null || cursor === this.requestedCursor) return;
    this.requestedCursor = cursor;
    const detail: SkLoadMoreDetail = { cursor };
    this.dispatchEvent(new CustomEvent<SkLoadMoreDetail>('sk-load-more', { detail, bubbles: true, composed: true }));
  }

  private renderHeader(): TemplateResult {
    const parts = [this.project?.name, this.branch === '' ? undefined : this.branch, this.project ? missionCountText(this.project.missionCount) : undefined];
    return html`
      <sk-page-header>
        <span slot="eyebrow">${HEADER_EYEBROW}</span>
        <h1 slot="title">${HEADER_TITLE}</h1>
        <span slot="supporting">${parts.filter((part) => part !== undefined && part !== '').join(HEADER_SEPARATOR)}</span>
      </sk-page-header>
    `;
  }

  private renderLoadMore(): TemplateResult | typeof nothing {
    const cursor = this.pageInfo?.nextPageCursor ?? null;
    if (this.pageInfo?.hasNextPage !== true || cursor === null) return nothing;
    return html`<li aria-busy=${this.loadingMore ? 'true' : 'false'}>
      <sk-button variant="secondary" ?busy=${this.loadingMore} @click=${this.onLoadMore}>${LOAD_MORE_TEXT}</sk-button>
    </li>`;
  }

  private renderReady(): TemplateResult {
    const filter = FILTERS.some((candidate) => candidate.id === this.filter) ? this.filter : DEFAULT_FILTER_ID;
    const matches = this.missions.map((mission) => matchesMission(mission, this.filter, this.query));
    const noneShown = !matches.includes(true);
    return html`
      <div data-toolbar>
        <sk-form-input type="search" label=${SEARCH_LABEL} placeholder=${SEARCH_PLACEHOLDER} .value=${this.query} @input=${this.onSearchInput}></sk-form-input>
        <sk-filter-toggle-group
          label=${FILTER_GROUP_LABEL}
          .options=${FILTERS.map(({ id, label }) => ({ id, label }))}
          .value=${filter}
          @sk-filter-change=${this.onFilterChange}
        ></sk-filter-toggle-group>
      </div>
      <div data-live role="status" aria-live="polite">${keyed(this.announcementSeq, html`<span>${this.announcement}</span>`)}</div>
      ${noneShown
        ? html`<div class="sk-empty-state" data-message data-no-match>
            <h2 class="sk-empty-state__heading">${NO_MATCH_HEADING}</h2>
            <p class="sk-empty-state__body">${NO_MATCH_BODY}</p>
          </div>`
        : nothing}
      <ul>
        ${repeat(
          this.missions,
          (mission) => mission.missionId,
          (mission, index) =>
            html`<li ?hidden=${!matches[index]}>
              ${renderMissionRow(buildRowView(mission, this.laneGroups, this.labels, this.now), (event: Event) => this.onOpen(event, mission))}
            </li>`,
        )}
        ${this.renderLoadMore()}
      </ul>
    `;
  }

  protected override render(): TemplateResult {
    const state = normaliseViewState(this.status);
    return html`
      ${this.renderHeader()}
      ${state === 'ready'
        ? this.renderReady()
        : state === 'loading'
          ? html`<div data-state-panel aria-busy="true">
              <div class="sk-empty-state">
                <div class="sk-progress sk-progress--indeterminate sk-progress--compact">
                  <label class="sk-progress__label" for="loading-progress">${LOADING_LABEL}</label>
                  <progress class="sk-progress__bar" id="loading-progress"></progress>
                </div>
                <p class="sk-empty-state__body">${LOADING_BODY}</p>
              </div>
            </div>`
          : state === 'error'
            ? html`<div data-state-panel>
                <sk-notice tone="danger" announce="assertive">
                  <span slot="heading">${ERROR_HEADING}</span>
                  ${this.errorMessage === '' ? ERROR_BODY : this.errorMessage}
                </sk-notice>
              </div>`
            : html`<div data-state-panel>
                <div class="sk-empty-state" data-message>
                  <h2 class="sk-empty-state__heading">${EMPTY_HEADING}</h2>
                  <p class="sk-empty-state__body">${EMPTY_BODY}</p>
                </div>
              </div>`}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-open-mission': CustomEvent<SkOpenMissionDetail>;
    'sk-search': CustomEvent<SkSearchDetail>;
    'sk-load-more': CustomEvent<SkLoadMoreDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-missions-screen': SkMissionsScreen;
  }
}
