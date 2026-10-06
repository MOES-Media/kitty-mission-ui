// The whole-screen states and the regional detail notice. `renderEmptyForm` is complete (the one shared empty-form helper
// of every regional empty form and of the whole-screen empty state); the other bodies are stubs until the states work
// package. Exception E-17: `sk-empty-state*` and `sk-progress*` classes in this file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  DETAIL_LOADING_LABEL,
  DETAIL_REFUSAL_HEADING,
  DETAIL_RETRY_LABEL,
  HEADER_SEPARATOR,
  LANE_COUNT_TEXT,
  NOTHING_SELECTED_EYEBROW,
  NOTHING_SELECTED_HEADING,
  NOT_FOUND_BODY,
  NOT_FOUND_HEADING,
  RETURN_TO_PIPELINE_LABEL,
  WP_EMPTY_BODY,
  WP_EMPTY_HEADING,
  WP_ERROR_BODY,
  WP_ERROR_HEADING,
  WP_LOADING_LABEL,
} from '../../defaults/index.js';
import { renderBreadcrumb } from './header-parts.js';
import type { BreadcrumbView } from './header-parts.js';

/** The whole-screen states the screen file hands to `renderStatusContent` (`ready` with a Work Package is the screen's own). */
export type WholeScreenState = 'loading' | 'error' | 'empty' | 'not-found' | 'nothing-selected';

export interface StatusContentView {
  readonly state: WholeScreenState;
  /** The id as the screen resolved it (the `wpId` property, then the Work Package's, then the detail's); '' when none. */
  readonly wpId: string;
  readonly breadcrumb: BreadcrumbView;
  /** The host's error text; '' draws the default body. */
  readonly errorMessage: string;
  /** The Mission the nothing-selected state names; null when the host gave none. */
  readonly mission: { readonly name: string; readonly slug: string; readonly workPackageCount: number } | null;
  /** True while there is no Mission: "Return to Pipeline" is drawn inert. */
  readonly inert: boolean;
  /** True when no retry request can be built (no Mission or no id): Retry is drawn inert. */
  readonly retryInert: boolean;
}

export interface StatusHandlers {
  /** The crumb and "Return to Pipeline": one event for both. */
  readonly onOpenMission: () => void;
  /** Retry of the whole Work Package read. */
  readonly onRetry: () => void;
}

export interface DetailNoticeView {
  readonly kind: 'loading' | 'error' | 'not-found';
  /** The refusal in words (`resolveRefusal`); '' while loading. */
  readonly refusalText: string;
  /** True when no retry request can be built: Retry is drawn inert. */
  readonly retryInert: boolean;
}

export const stateStyles = css`
  /* A whole-screen state panel: the full content width inside the shell padding, like the Pipeline screen's. */
  [data-state-panel] {
    display: block;
    margin-block: var(--sk-space-6);
    margin-inline: var(--sk-mission-shell-content-padding);
    min-width: 0;
  }
  [data-state-panel] > sk-notice,
  [data-state-panel] > .sk-empty-state {
    min-width: 0;
  }
  [data-state-panel] > .sk-empty-state > sk-button {
    margin-block: var(--sk-space-4) 0;
  }
  /* The data-less header bands: the screen's own band rule pads the loading and not-found ones; the page header fills it. */
  [data-region='header'] > sk-page-header {
    flex: 1 1 auto;
    min-width: 0;
  }
  [data-state-header] {
    padding: var(--sk-mission-shell-content-padding) var(--sk-mission-shell-content-padding) 0;
  }
  sk-notice {
    display: block;
    min-width: 0;
  }
  sk-notice + sk-button {
    margin-block: var(--sk-space-3) 0;
  }
  [data-detail-loading] {
    min-width: 0;
  }
`;

/**
 * The Retry control. It sits BESIDE its notice, never inside its `actions` slot: the library's notice host carries
 * `tabindex="-1"`, which takes everything slotted into it out of the Tab order (measured: a button in the slot is unreachable).
 */
function renderRetry(inert: boolean, onRetry: () => void): TemplateResult {
  return html`<sk-button ?disabled=${inert} @click=${inert ? nothing : onRetry}>${DETAIL_RETRY_LABEL}</sk-button>`;
}

/** A labelled indeterminate progress bar: the busy indicator of the whole screen and of the detail notice. */
function renderBusy(id: string, label: string): TemplateResult {
  return html`<div class="sk-progress sk-progress--indeterminate sk-progress--compact">
    <label class="sk-progress__label" for=${id}>${label}</label>
    <progress class="sk-progress__bar" id=${id}></progress>
  </div>`;
}

/** The data-less header band of `loading` and `not-found`: the crumb and an `h1` with the id (no title, no badge). */
function renderDataLessHeader(view: StatusContentView, onOpenMission: () => void): TemplateResult {
  const heading = view.wpId === '' ? NOTHING_SELECTED_HEADING : view.wpId;
  return html`<div data-region="header">
    <sk-page-header>
      <div slot="eyebrow">${renderBreadcrumb(view.breadcrumb, onOpenMission)}</div>
      <h1 slot="title" title=${heading}>${heading}</h1>
    </sk-page-header>
  </div>`;
}

function renderNothingSelected(view: StatusContentView): TemplateResult {
  const mission = view.mission;
  return html`<div data-state-header>
    <sk-page-header>
      <span slot="eyebrow">${NOTHING_SELECTED_EYEBROW}</span>
      <h1 slot="title" title=${NOTHING_SELECTED_HEADING}>${NOTHING_SELECTED_HEADING}</h1>
      ${mission === null
        ? nothing
        : html`<span slot="supporting">${mission.slug}${HEADER_SEPARATOR}${LANE_COUNT_TEXT(mission.workPackageCount)}</span>`}
    </sk-page-header>
  </div>`;
}

/** What each whole-screen state draws inside the screen's frame. The screen decides which state; this draws it. */
export function renderStatusContent(view: StatusContentView, handlers: StatusHandlers): TemplateResult | typeof nothing {
  switch (view.state) {
    case 'loading':
      return html`${renderDataLessHeader(view, handlers.onOpenMission)}
        <div data-state-panel aria-busy="true"><div class="sk-empty-state">${renderBusy('wp-loading', WP_LOADING_LABEL)}</div></div>`;
    case 'error':
      return html`<div data-state-panel>
        <sk-notice tone="danger" announce="assertive">
          <span slot="heading">${WP_ERROR_HEADING}</span>${view.errorMessage === '' ? WP_ERROR_BODY : view.errorMessage}
        </sk-notice>
        ${renderRetry(view.retryInert, handlers.onRetry)}
      </div>`;
    case 'not-found':
      return html`${renderDataLessHeader(view, handlers.onOpenMission)}
        <div data-state-panel>
          <div class="sk-empty-state">
            <h2 class="sk-empty-state__heading">${NOT_FOUND_HEADING}</h2>
            <p class="sk-empty-state__body">${NOT_FOUND_BODY}</p>
            <sk-button ?disabled=${view.inert} @click=${view.inert ? nothing : handlers.onOpenMission}>${RETURN_TO_PIPELINE_LABEL}</sk-button>
          </div>
        </div>`;
    case 'nothing-selected':
      return renderNothingSelected(view);
    default:
      return html`<div data-state-panel>${renderEmptyForm(WP_EMPTY_BODY, WP_EMPTY_HEADING)}</div>`;
  }
}

/**
 * The body of the `detail-notice` wrapper: a busy indicator while the detail loads, else one notice naming the refusal in
 * words with a Retry control. Neither carries a live role: the announcement belongs to the screen's one live region.
 */
export function renderDetailNotice(view: DetailNoticeView, onRetry: () => void): TemplateResult | typeof nothing {
  if (view.kind === 'loading') {
    return html`<div data-detail-loading aria-busy="true">${renderBusy('wp-detail-loading', DETAIL_LOADING_LABEL)}</div>`;
  }
  return html`<sk-notice tone="attention" announce="off">
      <span slot="heading">${DETAIL_REFUSAL_HEADING}</span>${view.refusalText}
    </sk-notice>
    ${renderRetry(view.retryInert, onRetry)}`;
}

/**
 * The one empty form: the library's empty-state treatment. A regional empty form passes the text only; the whole-screen
 * empty state passes a heading too. With `heading` omitted no heading element is drawn.
 */
export function renderEmptyForm(text: string, heading?: string): TemplateResult {
  return html`<div class="sk-empty-state">
    ${heading === undefined ? nothing : html`<h2 class="sk-empty-state__heading">${heading}</h2>`}
    <p class="sk-empty-state__body">${text}</p>
  </div>`;
}
