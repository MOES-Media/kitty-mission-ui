// Gap G-01 / exception E-01 (this file only): the library has no toggle group, so the group is the library's
// `segmented-choice` stylesheet over native `<button aria-pressed>` (sunset: a library element or `sk-button` ARIA
// passthrough, design-library #501). The per-file ESLint override allows nothing but those two class names.
import { LitElement, css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { segmentedChoiceSheet } from '../../library-sheets.js';
import type { FilterOption } from '../../logic/index.js';

/** Payload of `sk-filter-change`: the id of the option that became pressed. */
export interface SkFilterChangeDetail {
  filter: string;
}

/**
 * A generic single-choice toggle group: knows no vocabulary, receives options and a value. Pattern element (no screen
 * contract). Not self-registering: `src/index.ts` defines the tag once.
 *
 * @element sk-filter-toggle-group
 * @tagname sk-filter-toggle-group
 *
 * @fires {CustomEvent<SkFilterChangeDetail>} sk-filter-change - a button that is not the pressed one was activated
 */
export class SkFilterToggleGroup extends LitElement {
  static override styles = [
    segmentedChoiceSheet,
    css`
      :host {
        display: block;
        min-width: 0;
      }
      /* One joined segmented control (operator Storybook review, items 1 and 1b; exception E-14, this file only, sunset
         spec-kitty-design#511, a joined segmented-choice variant). The segments touch, and each visual row is its own rounded
         group: the first segment of a row (data-row-start, set by the row measurement below) has the round start corners,
         the last (data-row-end) the round end corners, and a segment alone on a row both. A neighbour's edge is the shared
         border: every segment but a row's first drops its inline-start border. */
      .sk-segmented-choice {
        column-gap: 0;
      }
      .sk-segmented-choice .sk-segmented-choice__item {
        border-radius: 0;
      }
      .sk-segmented-choice .sk-segmented-choice__item:not([data-row-start]) {
        border-inline-start-width: 0;
      }
      .sk-segmented-choice .sk-segmented-choice__item[data-row-start] {
        border-radius: var(--sk-radius-sm) 0 0 var(--sk-radius-sm);
      }
      .sk-segmented-choice .sk-segmented-choice__item[data-row-end] {
        border-radius: 0 var(--sk-radius-sm) var(--sk-radius-sm) 0;
      }
      .sk-segmented-choice .sk-segmented-choice__item[data-row-start][data-row-end] {
        border-radius: var(--sk-radius-sm);
      }
    `,
  ];

  /** The options in render order. */
  @property({ attribute: false })
  options: FilterOption[] = [];

  /** The id of the pressed option; reflected. An id that matches no option leaves none pressed. */
  @property({ reflect: true })
  value = '';

  /** The accessible name of the group. */
  @property()
  label = '';

  // The segments wrap, and CSS cannot see where: after every render and whenever the group is resized, the first and the
  // last segment of each visual row are marked (internal attributes, not API). No I/O; the observer dies with the element.
  private rowObserver: ResizeObserver | null = null;

  private markRows(): void {
    const items = [...(this.renderRoot.querySelectorAll<HTMLElement>('.sk-segmented-choice__item') ?? [])];
    items.forEach((item, index) => {
      const top = item.offsetTop;
      const start = index === 0 || (items[index - 1] as HTMLElement).offsetTop !== top;
      const end = index === items.length - 1 || (items[index + 1] as HTMLElement).offsetTop !== top;
      item.toggleAttribute('data-row-start', start);
      item.toggleAttribute('data-row-end', end);
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.rowObserver = new ResizeObserver(() => this.markRows());
    this.rowObserver.observe(this);
  }

  override disconnectedCallback(): void {
    this.rowObserver?.disconnect();
    this.rowObserver = null;
    super.disconnectedCallback();
  }

  protected override updated(): void {
    this.markRows();
  }

  private onPress(id: string): void {
    if (id === this.value) return;
    this.value = id;
    const detail: SkFilterChangeDetail = { filter: id };
    this.dispatchEvent(new CustomEvent<SkFilterChangeDetail>('sk-filter-change', { detail, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`<div class="sk-segmented-choice" role="group" aria-label=${this.label}>
      ${this.options.map(
        (option) =>
          html`<button
            type="button"
            class="sk-segmented-choice__item"
            aria-pressed=${option.id === this.value ? 'true' : 'false'}
            @click=${() => this.onPress(option.id)}
          >
            ${option.label}
          </button>`,
      )}
    </div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-filter-change': CustomEvent<SkFilterChangeDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-filter-toggle-group': SkFilterToggleGroup;
  }
}
