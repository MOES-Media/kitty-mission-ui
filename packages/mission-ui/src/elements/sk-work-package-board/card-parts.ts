// Private card fragment of `sk-work-package-board` (spike S3, G-08). A card is `sk-action-row selectable layout="card"`:
// the id and the state pill in the marker slot, the title, the subtask bar (reference slot), the dependencies (tags
// slot) and the actor with a decorative arrow (metadata slot). Exceptions E-02 (library progress classes), E-09 and
// E-11 (card text wrapping, the gap under the title, the trailing arrow; sunset spec-kitty-design#508) apply to this
// file only. No lane word and no arithmetic here: every value is handed to the elements as given.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { SUBTASK_PROGRESS_TEXT } from '../../defaults/index.js';
import type { PlacedCard } from '../../logic/index.js';

/** What the card needs from its column. */
export interface CardOptions {
  /** `LaneGroup.showsProgress` of the card's column (DR-1). */
  showsProgress: boolean;
  /** The row-activate handler; the board turns it into `sk-select-work-package`. */
  onActivate: (event: Event, wpId: string) => void;
}

const DEPENDS_ON = 'depends on';
const ARROW = '→';

export const cardStyles = css`
  /* The card is the container the actor and dependency row measures. */
  li {
    container-type: inline-size;
  }
  /* Layout-only grid override of the library card (G-08): id and pill, title, bar, then the actor and the dependency
     rows, as in the prototype; the gap under the title is the grid gap (E-11). */
  sk-action-row::part(trigger) {
    grid-template-areas:
      'marker'
      'title'
      'reference'
      'metadata'
      'tags';
    grid-template-columns: minmax(0, 1fr);
    row-gap: 0;
    column-gap: var(--sk-space-3);
    align-items: start;
    padding: var(--sk-space-3);
  }
  /* The card has no controls: the library still pads the empty wrapper. */
  sk-action-row::part(controls) {
    display: none;
  }
  /* Titles wrap only between words, never inside one (operator ruling Q2, F5; E-11). A single word wider than the
     card is clipped with an ellipsis; the full text stays in the accessible name and the title tooltip. */
  sk-action-row::part(title) {
    font-size: var(--sk-text-sm);
    min-width: 0;
    overflow: hidden;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: manual;
    text-overflow: ellipsis;
  }
  sk-action-row::part(tags) {
    margin-block: 0;
  }
  sk-action-row::part(metadata) {
    justify-self: start;
    margin-block: 0;
    white-space: normal;
  }
  /* The gaps are margins of the slotted content, so an empty library wrapper adds no row gap. */
  [data-marker],
  [slot='title'],
  [slot='reference'] {
    margin-block: 0 var(--sk-space-3);
  }
  [slot='title'] {
    display: block;
    overflow: hidden;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: manual;
    text-overflow: ellipsis;
  }
  [data-deps] {
    display: block;
    margin-block: var(--sk-space-3) 0;
  }
  /* Narrow lane (the default): the state pill ALWAYS stacks on its own line under the id, on every card, whatever its width
     (operator ruling, 2026-10-04). A single full-width column; the pill never grows beyond it. */
  [data-marker] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--sk-space-3);
  }
  /* The pill host spans the column and its tag shrinks inside it: a state word wider than the column ends in an ellipsis
     instead of overflowing the card padding; the full word stays in the text, the accessible name and the title (E-11). */
  [data-marker] sk-pill-tag {
    display: flex;
    min-width: 0;
    overflow: hidden;
  }
  [data-marker] sk-pill-tag::part(tag) {
    display: block;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    padding-inline: var(--sk-space-2);
  }
  /* Wide enough for both: the actor on the left, the dependencies on the right, side by side as in the prototype. */
  @container (min-width: 200px) {
    sk-action-row::part(trigger) {
      grid-template-areas:
        'marker marker'
        'title title'
        'reference reference'
        'metadata tags';
      grid-template-columns: minmax(0, auto) minmax(0, 1fr);
    }
    sk-action-row::part(trigger) {
      padding: var(--sk-space-4);
    }
    sk-action-row::part(tags) {
      justify-self: end;
    }
    [data-marker] sk-pill-tag::part(tag) {
      padding-inline: var(--sk-space-3);
    }
    [data-deps] {
      margin-block: 0;
    }
    /* Wide lane: the id and the pill share one row, as in the prototype. */
    [data-marker] {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
    }
    [data-marker] sk-pill-tag {
      display: inline-flex;
    }
  }
  [data-wp-id] {
    color: var(--sk-fg-muted);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
    min-width: 0;
    overflow-wrap: break-word;
  }
  /* Short phrases wrap whole: no mid-word break in "depends on WP03" (E-11). */
  [data-deps],
  [data-actor] {
    color: var(--sk-fg-muted);
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
    white-space: normal;
    overflow-wrap: break-word;
  }
  /* Read by assistive technology, takes no room. */
  [data-progress-text] {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    overflow: hidden;
  }
  [data-arrow] {
    white-space: nowrap;
  }
`;

/** One work package card. */
export function renderCard(card: PlacedCard, options: CardOptions): TemplateResult {
  const { wp, badge } = card;
  const progress = wp.subtaskProgress;
  const progressText = SUBTASK_PROGRESS_TEXT(progress.done, progress.total);
  // A button's children are presentational and Chromium names a button from a nested progressbar by its value only,
  // so the same words also sit in a visually hidden span: the card's accessible name carries them.
  const bar =
    options.showsProgress && progress.total > 0
      ? html`<div slot="reference" class="sk-progress sk-progress--narrow">
          <progress class="sk-progress__bar" value=${progress.done} max=${progress.total} aria-label=${progressText}>${progress.done}/${progress.total}</progress>
          <span data-progress-text>${progressText}</span>
        </div>`
      : nothing;
  const dependencies =
    wp.dependencies.length > 0 ? html`<span slot="tags" data-deps>${`${DEPENDS_ON} ${wp.dependencies.join(', ')}`}</span>` : nothing;
  const actor = wp.actor === undefined ? nothing : html`<span data-actor>${wp.actor}</span> `;
  return html`<sk-action-row selectable layout="card" row-id=${wp.wpId} @sk-action-row-activate=${(e: Event) => options.onActivate(e, wp.wpId)}>
    <span slot="marker" data-marker><span data-wp-id>${wp.wpId}</span><sk-pill-tag status=${badge.tone} title=${badge.label}>${badge.label}</sk-pill-tag></span>
    <span slot="title" title=${wp.title}>${wp.title}</span>
    ${bar}${dependencies}
    <span slot="metadata">${actor}<span data-arrow aria-hidden="true">${ARROW}</span></span>
  </sk-action-row>`;
}
