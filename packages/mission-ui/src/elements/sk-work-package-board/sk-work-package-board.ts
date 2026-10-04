// Gap G-02 / G-03, exception E-02 (this file and card-parts.ts only): the library's `workflow-board`, `workflow-lane`
// and `progress` families are styles-only, so the board adopts their sheets and writes their classes. The cards are
// `sk-action-row`; the board places and emits, it does no arithmetic and holds no lane word (C-004, C-007).
import { LitElement, css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { nothing } from 'lit';
import '@spec-kitty/elements';
import { BOARD_LABEL, DEFAULT_LANE_GROUPS, LANE_COUNT_TEXT } from '../../defaults/index.js';
import { progressSheet } from '../../progress-sheet.js';
import { workflowBoardSheet, workflowLaneSheet } from '../../library-sheets.js';
import { placeWorkPackages } from '../../logic/index.js';
import type { LabelHooks, LaneGroup } from '../../logic/index.js';
import type { WorkPackageView } from '../../contract/types.js';
import { cardStyles, renderCard } from './card-parts.js';

/** Payload of `sk-select-work-package`. */
export interface SkSelectWorkPackageDetail {
  missionId: string;
  wpId: string;
}

/**
 * Places work packages into the columns it is given and emits the selection intent. Pattern element (no screen
 * contract). Not self-registering: `src/index.ts` defines the tag once.
 *
 * @element sk-work-package-board
 * @tagname sk-work-package-board
 *
 * @fires {CustomEvent<SkSelectWorkPackageDetail>} sk-select-work-package - a card was activated; the library's own
 *   `sk-action-row-activate` is stopped here
 */
export class SkWorkPackageBoard extends LitElement {
  static override styles = [
    workflowBoardSheet,
    workflowLaneSheet,
    progressSheet,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      /* The prototype shows no board heading; it names the board and the scroll region for assistive technology. */
      h2 {
        position: absolute;
        inline-size: 0;
        block-size: 0;
        margin: 0;
        overflow: hidden;
      }
      /* Flat lanes with a small uppercase mono title and no nested card (N-4; exceptions E-09 and E-10, sunset
         spec-kitty-design#506 and #507): the library lane card paint is removed, the lane keeps a minimum width. */
      .sk-workflow-board__scroller {
        grid-auto-columns: minmax(auto, 1fr);
        gap: var(--sk-space-5);
      }
      /* 90 px (E-10, re-derived 2026-10-04): five lanes at the old 96 px minimum overflowed the 1024 collapsed cell by 8 px and
         clipped DONE; at 90 they share that cell equally (about 94 px each) and still scroll, focusably, below it. */
      .sk-workflow-lane {
        min-inline-size: 90px;
        padding: 0;
        gap: var(--sk-space-3);
        background: transparent;
        border: 0;
        border-radius: 0;
      }
      /* Read by assistive technology (the spoken count of the column), takes no room. */
      [data-lane-count-text] {
        position: absolute;
        inline-size: 0;
        block-size: 0;
        overflow: hidden;
      }
      .sk-workflow-lane__title {
        color: var(--sk-fg-subtle);
        font-family: var(--sk-font-mono);
        font-size: var(--sk-text-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        /* Wraps only between words; a single over-long word is clipped with an ellipsis (operator ruling Q2, E-11). */
        min-width: 0;
        overflow: hidden;
        overflow-wrap: normal;
        word-break: normal;
        hyphens: manual;
        text-overflow: ellipsis;
      }
      .sk-workflow-lane__list {
        display: flex;
        flex-direction: column;
        gap: var(--sk-space-3);
        margin: 0;
        padding: 0;
      }
      /* A block item has no list marker. */
      .sk-workflow-lane__list > li {
        display: block;
      }
    `,
    cardStyles,
  ];

  @state()
  private overflowing = false;

  private observer: ResizeObserver | null = null;

  /** The work packages in service order; the board never sorts. */
  @property({ attribute: false })
  workPackages: WorkPackageView[] = [];

  /** The columns. An empty array makes one synthetic column titled by `label`. */
  @property({ attribute: false })
  laneGroups: LaneGroup[] = [...DEFAULT_LANE_GROUPS];

  /** Echoed in the event payload. */
  @property({ attribute: 'mission-id' })
  missionId = '';

  /** Label hooks; only `state` is read. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** The board heading and the name of the scroll region. */
  @property()
  label: string = BOARD_LABEL;

  private onActivate(event: Event, wpId: string): void {
    event.stopPropagation();
    const detail: SkSelectWorkPackageDetail = { missionId: this.missionId, wpId };
    this.dispatchEvent(new CustomEvent<SkSelectWorkPackageDetail>('sk-select-work-package', { detail, bubbles: true, composed: true }));
  }

  // The observer lives from connection to disconnection (Lit does not run `firstUpdated` again when an element is moved), so a
  // board a host re-parents keeps measuring.
  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.observe();
  }

  override disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = null;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.observe();
  }

  private observe(): void {
    const scroller = this.renderRoot.querySelector('.sk-workflow-board__scroller');
    if (scroller === null) return;
    this.observer?.disconnect();
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(scroller);
    this.measure();
  }

  protected override updated(): void {
    this.measure();
  }

  /** The scroller is a labelled, focusable region only while it really overflows horizontally (library contract). */
  private measure(): void {
    const scroller = this.renderRoot.querySelector('.sk-workflow-board__scroller');
    if (scroller === null) return;
    const overflowing = scroller.scrollWidth > scroller.clientWidth;
    if (overflowing !== this.overflowing) this.overflowing = overflowing;
  }

  protected override render(): TemplateResult {
    const columns = placeWorkPackages(this.workPackages, this.laneGroups, this.labels, this.label);
    const options = { onActivate: (event: Event, wpId: string) => this.onActivate(event, wpId) };
    return html`<div class="sk-workflow-board">
      <h2 id="board-heading">${this.label}</h2>
      <div
        class="sk-workflow-board__scroller"
        role=${this.overflowing ? 'region' : nothing}
        aria-labelledby=${this.overflowing ? 'board-heading' : nothing}
        tabindex=${this.overflowing ? '0' : nothing}
      >
        ${columns.map(
          (column, index) => html`<section class="sk-workflow-lane" aria-labelledby=${`lane-title-${index}`}>
            <div class="sk-workflow-lane__header">
              <h3 class="sk-workflow-lane__title" id=${`lane-title-${index}`} title=${column.group.label}>${column.group.label}</h3>
              <span class="sk-workflow-lane__count" data-lane-count aria-hidden="true">${column.cards.length}</span>
              <span data-lane-count-text>${LANE_COUNT_TEXT(column.cards.length)}</span>
            </div>
            <ol class="sk-workflow-lane__list">
              ${column.cards.map(
                (card) => html`<li>${renderCard(card, { ...options, showsProgress: column.group.showsProgress === true })}</li>`,
              )}
            </ol>
          </section>`,
        )}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-select-work-package': CustomEvent<SkSelectWorkPackageDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-work-package-board': SkWorkPackageBoard;
  }
}
