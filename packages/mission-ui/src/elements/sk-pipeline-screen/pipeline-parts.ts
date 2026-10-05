// Private fragments of `sk-pipeline-screen`: the header, the inspector and the state panels. Exceptions E-03 (the
// library's styles-only `breadcrumbs`, `empty-state` and `progress` families are written as classes), E-08 (the 260 px
// inspector width) and E-12 (the flat inspector panel, the phase band rule, the metric rows, the eyebrow, the notice size, the folder
// icon; sunset spec-kitty-design#509) and E-16 (the scrolling phase band's focus ring and edge fade; sunset #514) apply to this file. The screen does no arithmetic on contract values (C-004):
// the only number it shows is the Mission progress, displayed through `formatWholePercent` (display rounding, DR-11).
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  BLOCKERS_LABEL,
  BREADCRUMB_LABEL,
  INSPECTOR_LABEL,
  MISSIONS_CRUMB,
  PIPELINE_EMPTY_BODY,
  PIPELINE_EMPTY_HEADING,
  PIPELINE_ERROR_BODY,
  PIPELINE_ERROR_HEADING,
  PIPELINE_LOADING_LABEL,
  PIPELINE_TITLE,
  PROGRESS_LABEL,
  STATIC_NOTE,
  TARGET_BRANCH_LABEL,
  VIEW_ARTIFACTS_TEXT,
} from '../../defaults/index.js';
import { currentStep, formatWholePercent } from '../../logic/index.js';
import type { LabelHooks } from '../../logic/index.js';
import { renderIcon } from '../../shell-icons.js';
import type { MissionDetailView } from '../../contract/types.js';

const PROGRESS_ID = 'mission-progress';

export const pipelineStyles = css`
  /* Header: the crumb row and the title row, with the target branch beside the title. */
  sk-page-header [slot='supporting'] {
    display: inline-flex;
  }
  /* Phases, then the board and the inspector in a wrapping row: no media query, the shell narrows the cell (PL-08). */
  /* At a large root font the phases can be wider than the cell: they scroll inside their own band, never the page. */
  /* Exception E-12 (operator ruling on the WP09 review): the band keeps the prototype's hero background and bottom rule. */
  /* The frame carries the band's place in the column (and, at the wide tier, its flush margins); the fades sit on it. */
  [data-phases-frame] {
    position: relative;
    display: flex;
    flex: none;
    min-width: 0;
  }
  [data-phases] {
    flex: 1 1 auto;
    min-width: 0;
    padding-block: var(--sk-space-4);
    padding-inline: var(--sk-space-6);
    overflow-x: auto;
    display: flex;
    background: var(--sk-surface-hero);
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  /* Exception E-16 (this file; sunset spec-kitty-design#514, a focusable overflow scroller with edge fades): while it scrolls the band is a
     keyboard region and shows the library's focus ring, drawn inside it. */
  [data-phases]:focus-visible {
    outline-width: var(--sk-border-width-2);
    outline-style: solid;
    outline-color: var(--sk-border-focus);
    outline-offset: calc(-1 * var(--sk-border-width-2));
  }
  /* Exception E-16: an edge fade on the side that has phases off-screen: a token gradient from the band's own background,
     above the scroller, never catching the pointer. Present only while there is something to scroll to on that side. */
  [data-phase-fade] {
    position: absolute;
    inset-block: 0 var(--sk-border-width-1);
    inline-size: var(--sk-space-7);
    pointer-events: none;
  }
  /* Logical sides, mirrored in a right-to-left page: the start fade sits at the inline start and fades towards the content. */
  [data-phase-fade='start'] {
    inset-inline: 0 auto;
    background-image: linear-gradient(to right, var(--sk-surface-hero), transparent);
  }
  [data-phase-fade='end'] {
    inset-inline: auto 0;
    background-image: linear-gradient(to left, var(--sk-surface-hero), transparent);
  }
  [data-phase-fade='start']:dir(rtl) {
    background-image: linear-gradient(to left, var(--sk-surface-hero), transparent);
  }
  [data-phase-fade='end']:dir(rtl) {
    background-image: linear-gradient(to right, var(--sk-surface-hero), transparent);
  }
  /* The bar never shrinks below its labels, so they cannot run into each other; the band scrolls instead. */
  [data-phases] > sk-phase-bar {
    flex: 1 0 auto;
  }
  /* The row takes the rest of the content area (item 5): its single line is as tall as the area, so the inspector, which
     stretches, runs the full height like the rail and the sidebar. */
  [data-layout] {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--sk-space-5);
  }
  /* The board keeps the prototype's 24 px padding (the five lanes then fit at 1280 px, E-10). It takes almost all the free
     space beside the inspector (grow 1000 to 1); on its own line the inspector grows across the full width (item 8). */
  sk-work-package-board {
    flex: 1000 1 60%;
    min-width: 0;
    padding: var(--sk-space-6);
  }
  /* Exception E-08: the inspector is 260 px wide, as in the prototype; it shrinks in a cell narrower than that. */
  /* Exception E-12 (operator ruling Q1): the prototype's flat full-height panel, no card: hero background, a 1 px left
     border only, no radius, 20 px padding. */
  aside {
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 260px;
    min-width: 0;
    align-self: stretch;
    box-sizing: border-box;
    padding: var(--sk-space-5);
    background: var(--sk-surface-hero);
    border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);
    border-radius: 0;
  }
  /* 880 px = the board (60% basis, padding, inset) + gap + the 260 px inspector: the width at which they fit side by side in the full-width column of a flush shell. */
  /* The screen runs inside a flush shell (sk-mission-shell with the flush attribute): it pads its own inset parts with the shell's public
     content-padding property. Side by side (wide) the inspector and the phase band run flush to the edges of the content
     column, like the rail and the sidebar; only the board keeps the inset. */
  @container not (max-width: 880px) {
    sk-work-package-board {
      margin-inline: var(--sk-mission-shell-content-padding) 0;
    }
  }
  /* Items 8 and 8b: at tablet and smaller the board and the inspector stack, everything is inset by the content padding, and
     the inspector spans the full width and reads as a contained panel: top, bottom and end borders (the start border is
     the base rule) and a radius, token values (exception E-12 extension). */
  @container (max-width: 880px) {
    [data-phases-frame] {
      margin-inline: var(--sk-mission-shell-content-padding);
    }
    [data-layout] {
      flex-direction: column;
      flex-wrap: nowrap;
    }
    sk-work-package-board {
      flex: none;
      margin-inline: var(--sk-mission-shell-content-padding);
    }
    aside {
      flex: none;
      margin-inline: var(--sk-mission-shell-content-padding);
      margin-block: 0 var(--sk-mission-shell-content-padding);
      border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
      border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
      border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);
      border-radius: var(--sk-radius-lg);
    }
  }
  [data-inspector] {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-4);
  }
  /* Exception E-12: "Current step" is a small uppercase mono eyebrow. */
  [data-eyebrow] {
    margin: 0;
    color: var(--sk-fg-subtle);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  [data-step] {
    margin: 0;
  }
  /* Exception E-12: metric rows with the label on the left and the value on the right. */
  sk-metric::part(metric) {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--sk-space-3);
    padding: 0;
  }
  sk-metric::part(value) {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
  }
  sk-metric::part(label) {
    color: var(--sk-fg-muted);
    font-family: var(--sk-font-sans);
    font-size: var(--sk-text-sm);
    text-transform: none;
  }
  /* The label and the percentage sit on one row above the bar, as in the prototype. */
  [data-progress] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: var(--sk-space-3);
  }
  [data-progress] .sk-progress__bar {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  [data-progress] .sk-progress__label {
    grid-row: 1;
    grid-column: 1;
  }
  [data-progress] .sk-progress__meta {
    grid-row: 1;
    grid-column: 2;
  }
  [data-button-row] {
    display: inline-flex;
    align-items: center;
    gap: var(--sk-space-1);
  }
  /* View artifacts is content-width, not stretched to the panel. */
  [data-inspector] > sk-button {
    align-self: flex-start;
  }
  sk-button svg {
    inline-size: var(--sk-space-4);
    block-size: var(--sk-space-4);
  }
  sk-notice::part(body) {
    font-size: var(--sk-text-sm);
  }
  /* A notice without a heading renders an empty heading block with a bottom margin that pushes the text below the icon
     (item 4): drop that block unless a heading is slotted. */
  sk-notice:not(:has([slot='heading']))::part(heading) {
    display: none;
  }
  /* A long Mission name wraps inside the header; the library's single scrolling line would clip it (F7; E-12 keywords). */
  .sk-breadcrumbs__list {
    flex-wrap: wrap;
    overflow-x: visible;
    white-space: normal;
  }
  .sk-breadcrumbs__item {
    flex: 0 1 auto;
    overflow-wrap: break-word;
  }
  .sk-breadcrumbs__item > .sk-breadcrumbs__link {
    min-width: 0;
  }
`;

export interface HeaderContext {
  missionsHref: string;
  mission: MissionDetailView | null;
  onCrumb: (event: MouseEvent) => void;
}

/** The header: breadcrumb, `h1` and the target branch pill. It renders in every state. */
export function renderHeader(ctx: HeaderContext): TemplateResult {
  const mission = ctx.mission;
  return html`<sk-page-header>
    <nav slot="eyebrow" class="sk-breadcrumbs" aria-label=${BREADCRUMB_LABEL}>
      <ol class="sk-breadcrumbs__list">
        <li class="sk-breadcrumbs__item">
          <a class="sk-breadcrumbs__link" href=${ctx.missionsHref} @click=${ctx.onCrumb}>${MISSIONS_CRUMB}</a>
        </li>
        ${mission === null
          ? nothing
          : html`<li class="sk-breadcrumbs__item"><span class="sk-breadcrumbs__link" aria-current="page">${mission.friendlyName}</span></li>`}
      </ol>
    </nav>
    <h1 slot="title">${PIPELINE_TITLE}</h1>
    ${mission === null ? nothing : html`<sk-pill-tag slot="supporting">${mission.targetBranch}</sk-pill-tag>`}
  </sk-page-header>`;
}

export interface InspectorContext {
  mission: MissionDetailView;
  labels: LabelHooks | null;
  onViewArtifacts: () => void;
}

/** The inspector: current step, Mission progress, blockers, target branch, View artifacts and the static note. */
export function renderInspector(ctx: InspectorContext): TemplateResult {
  const mission = ctx.mission;
  const weighted = mission.progress.weightedPercentage;
  return html`<aside aria-label=${INSPECTOR_LABEL}>
    <div data-inspector>
        <p data-eyebrow>${INSPECTOR_LABEL}</p>
        <p data-step>${currentStep(mission, ctx.labels)}</p>
        <div class="sk-progress sk-progress--narrow" data-progress>
          <label class="sk-progress__label" for=${PROGRESS_ID}>${PROGRESS_LABEL}</label>
          <progress class="sk-progress__bar" id=${PROGRESS_ID} value=${weighted} max="100"></progress>
          <span class="sk-progress__meta">${formatWholePercent(weighted)}%</span>
        </div>
        <sk-metric label=${BLOCKERS_LABEL} display-value=${String(mission.blockedCount)}></sk-metric>
        <sk-metric label=${TARGET_BRANCH_LABEL} display-value=${mission.targetBranch}></sk-metric>
        <sk-button variant="secondary" @click=${ctx.onViewArtifacts}><span data-button-row>${renderIcon('folder')}${VIEW_ARTIFACTS_TEXT}</span></sk-button>
        <sk-notice tone="info">${STATIC_NOTE}</sk-notice>
    </div>
  </aside>`;
}

/** The loading panel: a busy region with a labelled indeterminate progress, in the panel treatment of the empty state. */
export function renderLoading(): TemplateResult {
  return html`<div data-state-panel aria-busy="true">
    <div class="sk-empty-state">
      <div class="sk-progress sk-progress--indeterminate sk-progress--compact">
        <label class="sk-progress__label" for="pipeline-loading">${PIPELINE_LOADING_LABEL}</label>
        <progress class="sk-progress__bar" id="pipeline-loading"></progress>
      </div>
    </div>
  </div>`;
}

/** The error panel: an alert notice; `message` overrides the default body. */
export function renderError(message: string): TemplateResult {
  return html`<div data-state-panel>
    <sk-notice tone="danger" announce="assertive">
      <span slot="heading">${PIPELINE_ERROR_HEADING}</span>${message === '' ? PIPELINE_ERROR_BODY : message}
    </sk-notice>
  </div>`;
}

/** The empty panel: the library's empty-state treatment, the same as the Missions empty state (DR-9). */
export function renderEmpty(): TemplateResult {
  return html`<div data-state-panel>
    <div class="sk-empty-state" data-message>
      <h2 class="sk-empty-state__heading">${PIPELINE_EMPTY_HEADING}</h2>
      <p class="sk-empty-state__body">${PIPELINE_EMPTY_BODY}</p>
    </div>
  </div>`;
}
