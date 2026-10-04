// Exception E-03 (this file and pipeline-parts.ts only): the library's `breadcrumbs`, `empty-state` and `progress`
// families are styles-only, so the screen adopts their sheets and writes their classes (gaps G-03, G-05, G-06).
import { LitElement, css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import '@spec-kitty/elements';
import { DEFAULT_LANE_GROUPS, PHASES_SCROLL_LABEL } from '../../defaults/index.js';
import { breadcrumbsSheet, emptyStateSheet } from '../../library-sheets.js';
import { progressSheet } from '../../progress-sheet.js';
import type { LabelHooks, LaneGroup } from '../../logic/index.js';
import type { MissionDetailView } from '../../contract/types.js';
import { normaliseViewState } from '../../view-state.js';
import type { ViewState } from '../../view-state.js';
import type { SkSelectWorkPackageDetail } from '../sk-work-package-board/sk-work-package-board.js';
import { pipelineStyles, renderEmpty, renderError, renderHeader, renderInspector, renderLoading } from './pipeline-parts.js';

/** Payload of `sk-view-artifacts`. */
export interface SkViewArtifactsDetail {
  missionId: string;
}
/** Payload of `sk-open-missions`: always an empty object. */
export type SkOpenMissionsDetail = Record<string, never>;

/**
 * The Pipeline screen: header, phase bar, work package board and inspector for one Mission. No I/O, nothing stored.
 * Renders inside the `sk-mission-shell` content slot. Not self-registering: `src/index.ts` defines the tag once.
 *
 * @screen
 * @element sk-pipeline-screen
 * @tagname sk-pipeline-screen
 *
 * @fires {CustomEvent<SkSelectWorkPackageDetail>} sk-select-work-package - a card was activated (dispatched by the board, crosses the screen)
 * @fires {CustomEvent<SkViewArtifactsDetail>} sk-view-artifacts - View artifacts was activated
 * @fires {CustomEvent<SkOpenMissionsDetail>} sk-open-missions - the Missions crumb was activated by an unmodified primary click or Enter
 */
export class SkPipelineScreen extends LitElement {
  static override styles = [
    breadcrumbsSheet,
    emptyStateSheet,
    progressSheet,
    css`
      /* A column that grows to the content area the shell gives it, so the inspector can run the full height of it
         (operator Storybook review, item 5). */
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
        container-type: inline-size;
      }
      sk-page-header {
        flex: none;
      }
    `,
    pipelineStyles,
    css`
      /* State panels (loading, empty, error): the full content width, as the Missions screen's (operator Storybook review,
         item 6). Panel weight, card chrome and display face follow the prototype through exception E-13 (this file; token
         values only; sunset spec-kitty-design#510). */
      [data-state-panel] {
        display: block;
        margin-block: var(--sk-space-6);
      }
      /* The empty-state keeps the library's flex centring; only the notice, a custom element, needs a block box. */
      [data-state-panel] > sk-notice {
        display: block;
        min-width: 0;
      }
      [data-state-panel] > .sk-empty-state {
        min-width: 0;
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
    `,
  ];

  /** The view state; unknown values collapse to `empty`. */
  @property({ reflect: true })
  status: ViewState = 'loading';

  /** The Mission shown; null renders as `empty`. */
  @property({ attribute: false })
  mission: MissionDetailView | null = null;

  /** The board columns. */
  @property({ attribute: false })
  laneGroups: LaneGroup[] = [...DEFAULT_LANE_GROUPS];

  /** Phase, lane and state label hooks. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** The anchor target of the Missions crumb. */
  @property({ attribute: 'missions-href' })
  missionsHref = '#/missions';

  /** Overrides the default error body. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  // The phase band scrolls when its phases are wider than the cell (a narrow screen or a large root font). While it does it
  // is a labelled, focusable region (the arrow keys then scroll it natively) and shows an edge fade on each side that has
  // phases off-screen. Measured on scroll and on every size change of the band or the bar inside it.
  @state()
  private bandScrolls = false;

  @state()
  private bandBefore = false;

  @state()
  private bandAfter = false;

  private bandObserver: ResizeObserver | null = null;

  private observedBand: Element | null = null;

  // Lit schedules no update when an element is moved: forget the observed band and ask for one, so `updated` observes it again.
  override connectedCallback(): void {
    super.connectedCallback();
    this.observedBand = null;
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.bandObserver?.disconnect();
    this.bandObserver = null;
    this.observedBand = null;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    const band = this.renderRoot.querySelector('[data-phases]');
    if (band !== this.observedBand) {
      this.bandObserver?.disconnect();
      this.observedBand = band;
      if (band !== null) {
        this.bandObserver ??= new ResizeObserver(() => this.measureBand());
        this.bandObserver.observe(band);
        const bar = band.querySelector('sk-phase-bar');
        if (bar !== null) this.bandObserver.observe(bar);
        this.measureAfterLayout(bar);
      }
    }
    this.measureBand();
  }

  /**
   * The first measurement of a band: the bar renders its phases in its own update and the labels take their final width when the
   * fonts are ready, so the measurement made inside `updated` can see a band that does not yet overflow. Measure again once the
   * bar has rendered, the fonts are ready and a frame has laid everything out; a size observer alone is not relied on.
   */
  private measureAfterLayout(bar: Element | null): void {
    const rendered = (bar as { updateComplete?: Promise<unknown> } | null)?.updateComplete ?? Promise.resolve();
    void Promise.all([rendered, document.fonts?.ready]).then(() => requestAnimationFrame(() => this.measureBand()));
  }

  private measureBand = (): void => {
    const band = this.observedBand;
    const scrolls = band !== null && band.scrollWidth > band.clientWidth;
    const travelled = band === null ? 0 : Math.abs(band.scrollLeft);
    const before = scrolls && travelled > 1;
    const after = scrolls && band !== null && travelled + band.clientWidth < band.scrollWidth - 1;
    if (scrolls !== this.bandScrolls) this.bandScrolls = scrolls;
    if (before !== this.bandBefore) this.bandBefore = before;
    if (after !== this.bandAfter) this.bandAfter = after;
  };

  private onCrumb(event: MouseEvent): void {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.dispatchEvent(new CustomEvent<SkOpenMissionsDetail>('sk-open-missions', { detail: {}, bubbles: true, composed: true }));
  }

  private onViewArtifacts(): void {
    if (this.mission === null) return;
    const detail: SkViewArtifactsDetail = { missionId: this.mission.missionId };
    this.dispatchEvent(new CustomEvent<SkViewArtifactsDetail>('sk-view-artifacts', { detail, bubbles: true, composed: true }));
  }

  private renderReady(mission: MissionDetailView): TemplateResult {
    return html`
      <div data-phases-frame>
        <div
          data-phases
          role=${this.bandScrolls ? 'region' : nothing}
          aria-label=${this.bandScrolls ? PHASES_SCROLL_LABEL : nothing}
          tabindex=${this.bandScrolls ? '0' : nothing}
          @scroll=${this.measureBand}
        >
          <sk-phase-bar .phases=${mission.phases} .labels=${this.labels}></sk-phase-bar>
        </div>
        ${this.bandBefore ? html`<span data-phase-fade="start" aria-hidden="true"></span>` : nothing}
        ${this.bandAfter ? html`<span data-phase-fade="end" aria-hidden="true"></span>` : nothing}
      </div>
      <div data-layout>
        <sk-work-package-board
          mission-id=${mission.missionId}
          .workPackages=${mission.workPackages}
          .laneGroups=${this.laneGroups}
          .labels=${this.labels}
        ></sk-work-package-board>
        ${renderInspector({ mission, labels: this.labels, onViewArtifacts: () => this.onViewArtifacts() })}
      </div>
    `;
  }

  protected override render(): TemplateResult {
    const mission = this.mission;
    const state = normaliseViewState(this.status);
    return html`
      ${renderHeader({ missionsHref: this.missionsHref, mission, onCrumb: (event) => this.onCrumb(event) })}
      ${state === 'ready' && mission !== null
        ? this.renderReady(mission)
        : state === 'loading'
          ? renderLoading()
          : state === 'error'
            ? renderError(this.errorMessage)
            : renderEmpty()}
    `;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-select-work-package': CustomEvent<SkSelectWorkPackageDetail>;
    'sk-view-artifacts': CustomEvent<SkViewArtifactsDetail>;
    'sk-open-missions': CustomEvent<SkOpenMissionsDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-pipeline-screen': SkPipelineScreen;
  }
}
