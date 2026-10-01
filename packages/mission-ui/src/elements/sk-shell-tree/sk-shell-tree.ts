// Row titles are one line with an ellipsis (the prototype's .truncate); the full label stays the link's accessible name.
// Gap G-05 (sunset: library `sk-tree`): the library has no tree with `aria-expanded`, so each folder is a native
// `<details>`/`<summary>` (browsers expose the disclosure and its expanded state). The default marker is hidden with
// `::-webkit-details-marker` (Safari; `display: block` on the summary removes the marker in other engines) and the default summary focus ring is kept.
// Rows are flush and painted with tokens under the shell paint exception (see sk-shell-nav-item); the heading is the
// section header's mono uppercase eyebrow.
// Gap G-16: library route mode only exposes `aria-current="page"` on its link. Operator ruling: only the selected LEAF
// is `selected`; folders (its ancestors) carry no library current state.
import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '@spec-kitty/elements';
import { renderIcon } from '../../shell-icons.js';
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

  // Reflected so the shell can observe the selection.
  /** Selected leaf id; empty marks none. */
  @property({ reflect: true })
  current = '';

  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    [role='group'] {
      display: block;
      min-width: 0;
    }
    details {
      display: block;
    }
    summary {
      display: block;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    [data-children] {
      display: block;
      padding-inline: var(--sk-space-4) 0;
    }
    [data-prefix] {
      font-family: var(--sk-font-mono);
    }
    sk-section-header {
      margin-block: 0 var(--sk-space-3);
      padding-inline: var(--sk-space-3);
    }
    sk-section-header::part(header) {
      column-gap: 0;
      row-gap: 0;
    }
    sk-section-header::part(eyebrow) {
      color: var(--sk-fg-subtle);
    }
    sk-action-row::part(trigger) {
      grid-template-areas: 'marker title metadata';
      grid-template-columns: auto minmax(0, 1fr) auto;
      min-block-size: calc(var(--sk-space-9) - var(--sk-space-1));
      padding-block: var(--sk-space-2);
      padding-inline: var(--sk-space-3);
    }
    sk-action-row::part(row) {
      border-radius: var(--sk-radius-sm);
    }
    sk-action-row::part(marker) {
      align-self: center;
      color: inherit;
    }
    sk-action-row::part(title) {
      color: var(--sk-fg-muted);
      font-family: var(--sk-font-sans);
      font-weight: var(--sk-weight-normal);
    }
    sk-action-row:hover::part(title),
    sk-action-row[selected]::part(title) {
      color: var(--sk-fg-default);
    }
    sk-action-row::part(title) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    sk-action-row::part(tags),
    sk-action-row::part(supporting),
    sk-action-row::part(controls) {
      display: none;
    }
    sk-action-row::part(reference) {
      display: none;
    }
    sk-action-row::part(trigger) {
      grid-template-columns: auto minmax(0, 1fr) fit-content(50%);
      min-block-size: calc(var(--sk-space-8) - var(--sk-space-2));
      padding-block: var(--sk-space-1);
    }
    /* Secondary to the section navigation: denser, smaller, quieter rows. */
    sk-action-row::part(title) {
      font-size: var(--sk-text-sm);
    }
    sk-action-row::part(marker) {
      margin-inline: 0 var(--sk-space-2);
    }
    sk-action-row::part(metadata) {
      margin-block: 0;
      margin-inline: var(--sk-space-2) 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    [slot='marker'] {
      display: block;
    }
    [slot='marker'] svg {
      display: block;
      inline-size: var(--sk-space-4);
      block-size: var(--sk-space-4);
    }
  `;

  // The open state each folder was last rendered with or toggled to, by id. A `toggle` that matches it is not a user
  // change (first render, `items` reset, a host writing the state back) and emits nothing.
  private readonly openState = new Map<string, boolean>();

  private resetOpenState(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.kind !== 'folder') continue;
      this.openState.set(node.id, node.expanded === true);
      this.resetOpenState(node.children ?? []);
    }
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('items')) {
      this.openState.clear();
      this.resetOpenState(this.items);
    }
  }

  private onRowClick(event: MouseEvent, node: TreeNode): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.emitNavigate(node.id, node.href ?? '');
  }

  // Library events stop here: only the declared `sk-*` events of this element leave it.
  private onRowActivate(event: Event): void {
    event.stopPropagation();
  }

  private onToggle(event: Event, node: TreeNode): void {
    const open = (event.currentTarget as HTMLDetailsElement).open;
    if (this.openState.get(node.id) === open) return;
    this.openState.set(node.id, open);
    this.emitToggle(node.id, open);
  }

  private renderLabel(node: TreeNode): TemplateResult {
    return html`${node.prefix ? html`<span data-prefix>${node.prefix}</span> ` : nothing}${node.label}`;
  }

  private renderLeaf(node: TreeNode): TemplateResult {
    const route = node.unavailable !== true && node.href !== undefined && node.href !== '';
    return html`<sk-action-row
      presentation="flush"
      href=${ifDefined(route ? node.href : undefined)}
      ?selected=${route && node.id === this.current}
      @click=${route ? (event: MouseEvent) => this.onRowClick(event, node) : nothing}
    >
      ${node.icon ? html`<span slot="marker">${renderIcon(node.icon)}</span>` : nothing}
      <span slot="title">${this.renderLabel(node)}</span>
      ${node.meta ? html`<span slot="metadata">${node.meta}</span>` : nothing}
    </sk-action-row>`;
  }

  private renderFolder(node: TreeNode): TemplateResult {
    const children = node.children ?? [];
    const count = node.meta ?? String(children.length);
    return html`<details ?open=${node.expanded === true} @toggle=${(event: Event) => this.onToggle(event, node)}>
      <summary>
        <sk-action-row presentation="flush">
          <span slot="marker">${renderIcon(node.icon ?? 'folder')}</span>
          <span slot="title">${this.renderLabel(node)}</span>
          <span slot="metadata">${count}</span>
        </sk-action-row>
      </summary>
      <div data-children>${children.map((child) => this.renderNode(child))}</div>
    </details>`;
  }

  private renderNode(node: TreeNode): TemplateResult {
    return node.kind === 'folder' ? this.renderFolder(node) : this.renderLeaf(node);
  }

  private emitNavigate(id: string, href: string): void {
    const detail: ShellNavigateDetail = { id, href };
    this.dispatchEvent(new CustomEvent<ShellNavigateDetail>('sk-navigate', { detail, bubbles: true, composed: true }));
  }

  private emitToggle(id: string, expanded: boolean): void {
    const detail: TreeToggleDetail = { id, expanded };
    this.dispatchEvent(new CustomEvent<TreeToggleDetail>('sk-tree-toggle', { detail, bubbles: true, composed: true }));
  }

  protected override render(): TemplateResult {
    return html`<div role="group" aria-label=${ifDefined(this.label || undefined)} @sk-action-row-activate=${this.onRowActivate}>
      ${this.heading ? html`<sk-section-header><span slot="eyebrow">${this.heading}</span></sk-section-header>` : nothing}
      ${keyed(this.items, html`${this.items.map((node) => this.renderNode(node))}`)}
    </div>`;
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
