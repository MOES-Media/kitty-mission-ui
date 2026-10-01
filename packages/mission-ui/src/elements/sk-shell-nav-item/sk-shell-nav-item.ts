// Gap G-12 (sunset: library `sk-tooltip`): the library has no label bubble that meets WCAG 1.4.13, so compact mode
// builds one locally from `sk-pill-tag`. Gap G-13: library rows mark the current item with `--sk-border-strong` and
// `--sk-surface-pill`, not the yellow edge of the approved PNG; the library look is used. Gap G-08: icons are local.
// Gap G-16: library route mode only exposes `aria-current="page"` on its link; there is no `aria-current="true"`.
// Operator ruling: only the leaf (`current="page"`) is `selected`; an ancestor (`current="true"`) gets no library
// current state for now and loses its highlight. Sunset: restore the parent highlight when the library ships support.
import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '@spec-kitty/elements';
import { renderIcon } from '../../shell-icons.js';
import type { CurrentMark, ShellIcon, ShellNavigateDetail } from '../../shell-types.js';

/**
 * One shell navigation entry: a route row with an icon marker and a label. Pattern element (no screen contract).
 *
 * Not self-registering: `src/index.ts` defines the tag once.
 *
 * @element sk-shell-nav-item
 * @tagname sk-shell-nav-item
 *
 * @fires {CustomEvent<ShellNavigateDetail>} sk-navigate - an unmodified primary click or Enter on the item
 */
export class SkShellNavItem extends LitElement {
  // `.focus()` on the host lands on the row's anchor.
  static override shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  // The bubble is a grid item in a second column of the host and floats beyond it: nothing may clip it. The host keeps
  // `overflow: visible`, and the COLLAPSED COLUMN THAT HOLDS COMPACT ITEMS (WP04) must set `overflow: visible` too.
  static override styles = css`
    :host {
      display: grid;
      position: relative;
      grid-template-columns: 100%;
      overflow: visible;
      min-width: 0;
    }
    sk-action-row {
      grid-column: 1;
      grid-row: 1;
    }
    [slot='marker'] {
      display: block;
    }
    [slot='marker'] svg {
      display: block;
      inline-size: var(--sk-space-5);
      block-size: var(--sk-space-5);
    }
    [data-compact] [slot='title'] {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
    }
    sk-action-row[data-compact]::part(trigger) {
      padding-inline: var(--sk-space-3);
    }
    sk-action-row[data-compact]::part(marker) {
      align-self: center;
    }
    sk-pill-tag {
      grid-column: 2;
      grid-row: 1;
      align-self: center;
      z-index: 10;
    }
    /* Flipped placement (the default would be clipped): below the item, floating over what follows. */
    sk-pill-tag[data-placement] {
      position: absolute;
      grid-column: 1;
      grid-row: 2;
      align-self: start;
    }
    sk-pill-tag[data-placement='below-end'] {
      justify-self: end;
    }
    sk-pill-tag[data-placement='below-start'] {
      justify-self: start;
    }
  `;

  private hovered = false;
  private focused = false;
  private dismissed = false;
  private bubbleShown = false;
  // Private placement of the bubble: beside the item, or below it when beside would be clipped (re-measured per show).
  private placement: 'after' | 'below-end' | 'below-start' = 'after';

  constructor() {
    super();
    this.addEventListener('pointerenter', this.onPointerEnter);
    this.addEventListener('pointerleave', this.onPointerLeave);
    this.addEventListener('focusin', this.onFocusIn);
    this.addEventListener('focusout', this.onFocusOut);
  }

  /** Id echoed in `sk-navigate`. */
  @property({ attribute: 'item-id' })
  itemId = '';

  /** Visible text and accessible name. */
  @property({ attribute: false })
  label = '';

  @property()
  href = '';

  @property()
  icon: ShellIcon = 'file';

  /** `'page'` marks the item selected and sets `aria-current="page"` on its link. `'true'` (an ancestor) carries no library current state yet (G-16). */
  @property()
  current: CurrentMark = '';

  /** Icon-only: the label stays the accessible name. */
  @property({ type: Boolean })
  compact = false;

  /**
   * `delegatesFocus` alone does not reach the anchor (the library row is not itself a focus delegate), so focus goes
   * through the shadow chain to the row's anchor: the fallback recorded in the hand-off.
   * @internal
   */
  override focus(options?: FocusOptions): void {
    const anchor = this.renderRoot.querySelector('sk-action-row')?.shadowRoot?.querySelector('a');
    if (anchor) {
      anchor.focus(options);
    } else {
      super.focus(options);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.hovered = false;
    this.focused = false;
    this.dismissed = false;
    this.syncBubble();
  }

  protected override willUpdate(): void {
    this.syncBubble();
  }

  protected override updated(): void {
    if (!this.bubbleShown) return;
    const bubble = this.renderRoot.querySelector('sk-pill-tag');
    if (!bubble) return;
    // A fresh library tag has no width until it has rendered: measure then.
    void Promise.resolve((bubble as { updateComplete?: unknown }).updateComplete).then(() => this.placeBubble(bubble));
  }

  private placeBubble(bubble: Element): void {
    if (!this.bubbleShown || !bubble.isConnected) return;
    const clip = this.clipBounds();
    const box = bubble.getBoundingClientRect();
    const crossesEnd = box.right > clip.right;
    const crossesStart = box.left < clip.left;
    let next = this.placement;
    if (this.placement === 'after' && (crossesEnd || crossesStart)) next = 'below-end';
    else if (this.placement === 'below-end' && crossesStart) next = 'below-start';
    if (next !== this.placement) {
      this.placement = next;
      this.requestUpdate();
    }
  }

  // The visible inline extent: the viewport narrowed by every clipping ancestor, across shadow boundaries and slots.
  private clipBounds(): { left: number; right: number } {
    let left = 0;
    let right = document.documentElement.clientWidth;
    let node: Node | null = this.assignedSlot ?? this.parentNode;
    while (node) {
      if (node instanceof Element) {
        const style = getComputedStyle(node);
        if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
          const box = node.getBoundingClientRect();
          left = Math.max(left, box.left);
          right = Math.min(right, box.right);
        }
      }
      const slot: Node | null = node instanceof Element ? node.assignedSlot : null;
      node = slot ?? node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
    }
    return { left, right };
  }

  private readonly onPointerEnter = (): void => {
    this.hovered = true;
    this.dismissed = false;
    this.syncBubble();
  };

  private readonly onPointerLeave = (): void => {
    this.hovered = false;
    this.syncBubble();
  };

  private readonly onFocusIn = (): void => {
    this.focused = true;
    this.dismissed = false;
    this.syncBubble();
  };

  private readonly onFocusOut = (): void => {
    this.focused = false;
    this.syncBubble();
  };

  // Escape dismisses the bubble until the next hover or focus (WCAG 1.4.13). The document listener exists only while
  // the bubble is shown, and is removed on hide and on disconnect.
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    this.dismissed = true;
    this.syncBubble();
  };

  private syncBubble(): void {
    const shown = this.isConnected && this.compact && !this.dismissed && (this.hovered || this.focused);
    if (shown === this.bubbleShown) return;
    this.bubbleShown = shown;
    this.placement = 'after';
    if (shown) {
      document.addEventListener('keydown', this.onDocumentKeydown);
    } else {
      document.removeEventListener('keydown', this.onDocumentKeydown);
    }
    this.requestUpdate();
  }

  private onRowClick(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.emitNavigate();
  }

  // Library events stop here: only the declared `sk-*` events of this element leave it.
  private onRowActivate(event: Event): void {
    event.stopPropagation();
  }

  private emitNavigate(): void {
    const detail: ShellNavigateDetail = { id: this.itemId, href: this.href };
    this.dispatchEvent(new CustomEvent<ShellNavigateDetail>('sk-navigate', { detail, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    const marked = this.current === 'page';
    return html`<sk-action-row
        href=${this.href}
        ?selected=${marked}
        ?data-compact=${this.compact}
        @click=${this.onRowClick}
        @sk-action-row-activate=${this.onRowActivate}
      >
        <span slot="marker">${renderIcon(this.icon)}</span>
        <span slot="title">${this.label}</span>
      </sk-action-row>
      ${this.bubbleShown ? html`<sk-pill-tag aria-hidden="true" data-placement=${ifDefined(this.placement === 'after' ? undefined : this.placement)}>${this.label}</sk-pill-tag>` : nothing}`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-navigate': CustomEvent<ShellNavigateDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-shell-nav-item': SkShellNavItem;
  }
}
