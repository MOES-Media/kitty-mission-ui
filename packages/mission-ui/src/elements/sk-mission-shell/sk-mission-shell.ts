import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import type {
  DrawerReason,
  FlyoutReason,
  ShellLayout,
  ShellMission,
  ShellNavItem,
  ShellNavigateDetail,
  ShellProject,
  ShellRetryDetail,
  ShellTier,
  ToggleDrawerDetail,
  ToggleFlyoutDetail,
  TreeToggleDetail,
} from '../../shell-types.js';
import type { ViewState } from '../../view-state.js';
import {
  renderContent,
  renderIconColumn,
  renderRail,
  renderSidebar,
  renderSkipLink,
  renderStatus,
  renderTopBar,
  resolveMarking,
} from './shell-parts.js';

const EXPANDED_QUERY = '(min-width: 1100px)';
const COLLAPSED_QUERY = '(min-width: 620px)';

/**
 * Application shell screen: top bar, optional rail, sidebar (project or mission) and the content column. The host owns
 * routing, data and persistence; the shell owns layout, the responsive tier and its own status. Render it full-bleed:
 * the tier follows the window width.
 *
 * Not self-registering: `src/index.ts` defines the tag once.
 *
 * @screen
 * @element sk-mission-shell
 * @tagname sk-mission-shell
 *
 * @fires {CustomEvent<ShellNavigateDetail>} sk-navigate - a navigation item or tree leaf was activated
 * @fires {CustomEvent<TreeToggleDetail>} sk-tree-toggle - a tree folder was toggled
 * @fires {CustomEvent<ToggleDrawerDetail>} sk-toggle-drawer - the mobile drawer asks to open or close (cancelable)
 * @fires {CustomEvent<ToggleFlyoutDetail>} sk-toggle-flyout - the collapsed-tier flyout asks to open or close (cancelable)
 * @fires {CustomEvent<ShellRetryDetail>} sk-shell-retry - the error-state retry button was activated
 *
 * @slot - the page content, inside the main landmark
 * @slot brand - the product mark in the top bar (falls back to "kitty desktop")
 * @slot top-bar-actions - host actions on the right of the top bar
 * @slot skip-link - per-screen skip link text (falls back to "Skip to content")
 * @slot sidebar-section - sk-shell-tree sections shown in the sidebar, drawer and flyout
 */
export class SkMissionShell extends LitElement {
  // Layout only (C-005): grid placement, tokens, `%` and `fr`. Gap G-01..G-03, G-07, G-10, G-15: grid, top bar, rail,
  // icon column and skip link are local until the library ships them.
  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    [data-frame] {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      block-size: 100%;
      min-width: 0;
    }
    [data-skip-link] {
      position: absolute;
      width: 0;
      height: 0;
      overflow: hidden;
      z-index: 30;
    }
    [data-skip-link]:focus-within {
      width: auto;
      height: auto;
      overflow: visible;
    }
    [data-top-bar] {
      display: flex;
      align-items: center;
      gap: var(--sk-space-3);
      box-sizing: border-box;
      block-size: var(--sk-layout-page-header-compact-height);
      padding-inline: var(--sk-space-3);
      min-width: 0;
    }
    [data-brand] {
      min-width: 0;
    }
    [data-top-bar-actions] {
      display: flex;
      align-items: center;
      gap: var(--sk-space-2);
      margin-inline: auto 0;
    }
    [data-body] {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
      min-width: 0;
    }
    [data-body][data-tier='expanded'][data-layout='project'] {
      grid-template-columns: var(--sk-layout-context-sidebar-width) minmax(0, 1fr);
    }
    [data-body][data-tier='expanded'][data-layout='mission'] {
      grid-template-columns: var(--sk-layout-personal-rail-width) var(--sk-layout-context-sidebar-width) minmax(0, 1fr);
    }
    [data-body][data-tier='collapsed'][data-layout='project'] {
      grid-template-columns: var(--sk-layout-personal-rail-width) minmax(0, 1fr);
    }
    [data-body][data-tier='collapsed'][data-layout='mission'] {
      grid-template-columns: var(--sk-layout-personal-rail-width) var(--sk-layout-personal-rail-width) minmax(0, 1fr);
    }
    [data-rail],
    [data-icon-column] {
      display: flex;
      flex-direction: column;
      gap: var(--sk-space-1);
      box-sizing: border-box;
      padding-block: var(--sk-space-2);
      min-width: 0;
      min-height: 0;
      overflow: visible;
    }
    [data-rail-pinned],
    [data-icon-column-pinned] {
      display: flex;
      flex-direction: column;
      gap: var(--sk-space-1);
      margin-block: auto 0;
    }
    sk-context-sidebar {
      min-height: 0;
    }
    sk-context-sidebar::part(sidebar) {
      padding: var(--sk-space-3);
      overflow-y: auto;
    }
    [data-content] {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: auto;
    }
    [data-status-body] {
      padding-inline: var(--sk-space-4);
      padding-block: var(--sk-space-3) 0;
    }
    main {
      display: block;
      flex-grow: 1;
      min-width: 0;
    }
    [data-focus-target] {
      min-width: 0;
    }
  `;

  /** Which regions render; unknown values fall back to `project`. */
  @property({ reflect: true })
  layout: ShellLayout = 'project';

  /** Sidebar item id. */
  @property()
  current = '';

  /** Rail item id (mission layout). */
  @property({ attribute: 'rail-current' })
  railCurrent = '';

  /** Rail items (mission layout only). */
  @property({ attribute: false })
  railItems: ShellNavItem[] = [];

  /** Sidebar navigation. */
  @property({ attribute: false })
  navItems: ShellNavItem[] = [];

  /** Project sidebar footer. */
  @property({ attribute: false })
  footerItem: ShellNavItem | null = null;

  @property({ attribute: false })
  project: ShellProject | null = null;

  @property({ attribute: false })
  mission: ShellMission | null = null;

  /** The shell's own data state. */
  @property({ reflect: true })
  status: ViewState = 'loading';

  @property({ attribute: 'error-message' })
  errorMessage = '';

  /** Mobile only; forced false elsewhere. Semi-controlled. */
  @property({ type: Boolean, attribute: 'drawer-open' })
  drawerOpen = false;

  /** Collapsed tier only; forced false elsewhere. Semi-controlled. */
  @property({ type: Boolean, attribute: 'flyout-open' })
  flyoutOpen = false;

  /** Read-only: derived from the window width, re-asserted on every update. */
  @property({ reflect: true, attribute: 'tier' })
  tier: ShellTier = 'expanded';

  private lists: MediaQueryList[] | null = null;

  private treeShown = false;

  constructor() {
    super();
    // Library events stop at the shell: only the declared `sk-*` events cross its boundary.
    this.addEventListener('sk-action-row-activate', (event) => event.stopPropagation());
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.tier = this.readTier();
    for (const list of this.mediaLists()) list.addEventListener('change', this.onMediaChange);
    this.syncTreeObserver();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    for (const list of this.mediaLists()) list.removeEventListener('change', this.onMediaChange);
    this.treeObserver?.disconnect();
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    this.tier = this.readTier();
    this.treeShown = this.isSidebarTreeShown();
  }

  /** The two window-width queries, created once. */
  private mediaLists(): MediaQueryList[] {
    if (this.lists === null) this.lists = [matchMedia(EXPANDED_QUERY), matchMedia(COLLAPSED_QUERY)];
    return this.lists;
  }

  /** The only place the window width is read. */
  private readTier(): ShellTier {
    const [expanded, collapsed] = this.mediaLists();
    if (expanded?.matches) return 'expanded';
    if (collapsed?.matches) return 'collapsed';
    return 'mobile';
  }

  // Tier events (WP05) are dispatched from here, before the render, so they never depend on it.
  private readonly onMediaChange = (): void => {
    const previous = this.tier;
    const next = this.readTier();
    this.tier = next;
    if (previous !== next) this.onTierChanged(previous, next);
    this.requestUpdate();
  };

  // Seam for WP05: close the drawer or flyout (and dispatch their events) when the tier leaves theirs.
  private onTierChanged(previous: ShellTier, next: ShellTier): void {
    // WP05 fills this in.
    void previous;
    void next;
  }

  // Seam for WP05: the hamburger asks for the drawer.
  private requestDrawer(reason: DrawerReason): void {
    // WP05 fills this in.
    void reason;
  }

  /**
   * True while a sidebar tree is shown AND one of its leaves is selected: only then does that leaf (not a nav item)
   * carry `aria-current="page"`. WP05 extends "shown" to the open drawer and flyout.
   */
  private isSidebarTreeShown(): boolean {
    if (this.tier !== 'expanded') return false;
    for (const tree of this.querySelectorAll('sk-shell-tree[slot="sidebar-section"]')) {
      const current = (tree as { current?: unknown }).current;
      if (typeof current === 'string' && current !== '') return true;
    }
    return false;
  }

  // The tree reflects its `current` attribute; this observer re-renders the shell when a slotted tree's selection moves.
  private treeObserver: MutationObserver | null = null;

  private syncTreeObserver(): void {
    this.treeObserver?.disconnect();
    if (!this.isConnected) return;
    this.treeObserver ??= new MutationObserver(() => this.requestUpdate());
    for (const tree of this.querySelectorAll('sk-shell-tree[slot="sidebar-section"]')) {
      this.treeObserver.observe(tree, { attributes: true, attributeFilter: ['current'] });
    }
  }

  private readonly onSectionSlotChange = (): void => {
    this.syncTreeObserver();
    this.requestUpdate();
  };

  private onSkipLink(event: MouseEvent): void {
    // A fragment link cannot reach an id inside a shadow root (G-10): focus the content target directly.
    event.preventDefault();
    this.focusContent();
  }

  /** Moves focus to the shell-owned content target (skip link, and post-navigation in WP05). */
  private focusContent(): void {
    this.renderRoot.querySelector<HTMLElement>('[data-focus-target]')?.focus();
  }

  private onBack(event: MouseEvent, item: ShellNavItem): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    this.emitNavigate(item.id, item.href);
  }

  private emitNavigate(id: string, href: string): void {
    const detail: ShellNavigateDetail = { id, href };
    this.dispatchEvent(new CustomEvent<ShellNavigateDetail>('sk-navigate', { detail, bubbles: true, composed: true }));
  }

  private emitTreeToggle(id: string, expanded: boolean): void {
    const detail: TreeToggleDetail = { id, expanded };
    this.dispatchEvent(new CustomEvent<TreeToggleDetail>('sk-tree-toggle', { detail, bubbles: true, composed: true }));
  }

  private emitToggleDrawer(open: boolean, reason: DrawerReason): boolean {
    const detail: ToggleDrawerDetail = { open, reason };
    return this.dispatchEvent(
      new CustomEvent<ToggleDrawerDetail>('sk-toggle-drawer', { detail, bubbles: true, composed: true, cancelable: true }),
    );
  }

  private emitToggleFlyout(open: boolean, reason: FlyoutReason): boolean {
    const detail: ToggleFlyoutDetail = { open, reason };
    return this.dispatchEvent(
      new CustomEvent<ToggleFlyoutDetail>('sk-toggle-flyout', { detail, bubbles: true, composed: true, cancelable: true }),
    );
  }

  private emitRetry(): void {
    const detail: ShellRetryDetail = {};
    this.dispatchEvent(new CustomEvent<ShellRetryDetail>('sk-shell-retry', { detail, bubbles: true, composed: true }));
  }

  private renderDrawerRegion(): typeof nothing {
    return nothing;
  }

  private renderFlyoutRegion(): typeof nothing {
    return nothing;
  }

  protected override render(): TemplateResult {
    const layout: ShellLayout = this.layout === 'mission' ? 'mission' : 'project';
    const tier = this.tier;
    const sidebarItems = [...this.navItems, ...(this.footerItem ? [this.footerItem] : [])];
    const marking = resolveMarking(
      this.current,
      this.railCurrent,
      sidebarItems.map((item) => item.id),
      this.railItems.map((item) => item.id),
      this.treeShown,
    );
    const sidebarContext = {
      layout,
      items: this.navItems,
      footerItem: this.footerItem,
      project: this.project,
      mission: this.mission,
      marking,
      onBack: (event: MouseEvent, item: ShellNavItem): void => this.onBack(event, item),
      onSectionSlotChange: this.onSectionSlotChange,
    };
    const showRail = layout === 'mission' && tier !== 'mobile';
    return html`<div data-frame>
      ${renderSkipLink({ onSkipLink: (event) => this.onSkipLink(event) })}
      ${renderTopBar({ tier, onHamburger: () => this.requestDrawer('hamburger') })}
      <div data-body data-layout=${layout} data-tier=${tier}>
        ${showRail ? renderRail({ items: this.railItems, marking }) : nothing}
        ${tier === 'expanded' ? renderSidebar(sidebarContext) : nothing}
        ${tier === 'collapsed' ? renderIconColumn(sidebarContext) : nothing}
        <div data-content>
          ${renderStatus({ status: this.status, errorMessage: this.errorMessage, onRetry: () => this.emitRetry() })}
          ${renderContent()}
        </div>
      </div>
      ${this.renderDrawerRegion()}${this.renderFlyoutRegion()}
    </div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-navigate': CustomEvent<ShellNavigateDetail>;
    'sk-tree-toggle': CustomEvent<TreeToggleDetail>;
    'sk-toggle-drawer': CustomEvent<ToggleDrawerDetail>;
    'sk-toggle-flyout': CustomEvent<ToggleFlyoutDetail>;
    'sk-shell-retry': CustomEvent<ShellRetryDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-mission-shell': SkMissionShell;
  }
}
