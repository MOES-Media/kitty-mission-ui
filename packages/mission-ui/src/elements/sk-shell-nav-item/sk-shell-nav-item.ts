import { LitElement, html } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
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

  /** `'page'` or `'true'` marks the item selected and sets `aria-current`. */
  @property()
  current: CurrentMark = '';

  /** Icon-only: the label stays the accessible name. */
  @property({ type: Boolean })
  compact = false;

  private emitNavigate(): void {
    const detail: ShellNavigateDetail = { id: this.itemId, href: this.href };
    this.dispatchEvent(new CustomEvent<ShellNavigateDetail>('sk-navigate', { detail, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
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
