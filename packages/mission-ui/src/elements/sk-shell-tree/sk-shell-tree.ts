import { LitElement, html } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type { ShellNavigateDetail, TreeNode, TreeToggleDetail } from '../../shell-types.js';

/**
 * A sidebar section of leaves and folders, slotted into the shell as `slot="sidebar-section"`. Pattern element
 * (no screen contract).
 *
 * Not self-registering: `src/index.ts` defines the tag once.
 *
 * @element sk-shell-tree
 * @tagname sk-shell-tree
 *
 * @fires {CustomEvent<ShellNavigateDetail>} sk-navigate - a leaf was activated
 * @fires {CustomEvent<TreeToggleDetail>} sk-tree-toggle - a folder was toggled; detail carries the requested state
 */
export class SkShellTree extends LitElement {
  /** Section title. */
  @property({ attribute: false })
  heading = '';

  /** Accessible name of the group. */
  @property()
  label = '';

  /** Replacing the array resets folder state. */
  @property({ attribute: false })
  items: TreeNode[] = [];

  /** Selected leaf id; empty marks none. */
  @property()
  current = '';

  private emitNavigate(id: string, href: string): void {
    const detail: ShellNavigateDetail = { id, href };
    this.dispatchEvent(new CustomEvent<ShellNavigateDetail>('sk-navigate', { detail, bubbles: true, composed: true }));
  }

  private emitToggle(id: string, expanded: boolean): void {
    const detail: TreeToggleDetail = { id, expanded };
    this.dispatchEvent(new CustomEvent<TreeToggleDetail>('sk-tree-toggle', { detail, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-tree-toggle': CustomEvent<TreeToggleDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-shell-tree': SkShellTree;
  }
}
