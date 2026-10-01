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
import type { SidebarContext } from './shell-parts.js';
import { progressSheet } from '../../progress-sheet.js';
import { ShellOverlays } from './shell-overlays.js';

const EXPANDED_QUERY = '(min-width: 1100px)';
const COLLAPSED_QUERY = '(min-width: 720px)';

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
 * @slot brand - the product name beside the mark (falls back to "kitty desktop")
 * @slot top-bar-actions - host actions on the right of the top bar
 * @slot skip-link - per-screen skip link text (falls back to "Skip to content")
 * @slot sidebar-section - sk-shell-tree sections shown in the sidebar, drawer and flyout
 */
export class SkMissionShell extends LitElement {
  // Layout, plus shell chrome paint (operator-approved stylelint exception 2026-10-01: token values only). Gap G-01..G-03,
  // G-07, G-10, G-15: grid, top bar, rail, icon column and skip link are local until the library ships them.
  static override styles = [
    progressSheet,
    css`
    :host {
      display: block;
      min-width: 0;
      color: var(--sk-fg-body);
      background: var(--sk-surface-page);
      font-family: var(--sk-font-sans);
      /* One bottom band: the rail's bottom group and the sidebar footer share this block-size and top border. */
      --shell-band: calc(var(--sk-space-9) + var(--sk-space-2));
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
      block-size: calc(var(--sk-space-9) + var(--sk-space-1));
      padding-inline: var(--sk-space-4);
      min-width: 0;
      background: var(--sk-surface-hero);
      border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-brand] {
      display: inline-flex;
      align-items: center;
      gap: var(--sk-space-2);
      flex: none;
      min-width: 0;
      color: var(--sk-fg-default);
      font-family: var(--sk-font-display);
      font-size: var(--sk-text-lg);
      font-weight: var(--sk-weight-bold);
    }
    [data-brand] slot {
      display: inline-flex;
      align-items: center;
      gap: var(--sk-space-2);
    }
    [data-brand-mark] {
      inline-size: var(--sk-space-6);
      block-size: var(--sk-space-6);
      color: var(--sk-fg-muted);
    }
    [data-top-bar-context] {
      flex: 1 1 0;
      min-width: 0;
      overflow: hidden;
      color: var(--sk-fg-muted);
      font-size: var(--sk-text-sm);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    [data-top-bar-actions] {
      display: flex;
      align-items: center;
      gap: var(--sk-space-2);
      margin-inline: auto 0;
    }
    sk-button svg {
      display: block;
      inline-size: var(--sk-space-5);
      block-size: var(--sk-space-5);
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
    [data-rail] {
      min-width: 0;
      min-height: 0;
    }
    [data-rail]::part(rail) {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
      padding-block: var(--sk-space-3) 0;
      padding-inline: 0;
      overflow: visible;
      background: var(--sk-surface-hero);
      border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);
      border-block-end: 0;
    }
    /* The library rail flips to a row at max-width 720px INCLUSIVE; the shell is collapsed from exactly 720px, so the
       rail is held in its column layout here (the drawer strip keeps the library flip). */
    [data-rail]::part(primary),
    [data-rail]::part(bottom) {
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: stretch;
    }
    [data-rail]::part(bottom) {
      box-sizing: border-box;
      block-size: var(--shell-band);
      justify-content: center;
      gap: 0;
      margin-block: auto 0;
      margin-inline: 0;
      border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-rail]::part(divider) {
      display: none;
    }
    [data-rail-pinned] {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      gap: var(--sk-space-2);
      min-width: 0;
    }
    [data-icon-column] {
      display: flex;
      flex-direction: column;
      gap: var(--sk-space-2);
      box-sizing: border-box;
      padding-block: var(--sk-space-3) 0;
      min-width: 0;
      min-height: 0;
      overflow: visible;
      background: var(--sk-surface-card);
      border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-icon-column-pinned] {
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      block-size: var(--shell-band);
      margin-block: auto 0;
      border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    sk-context-sidebar {
      min-height: 0;
    }
    sk-context-sidebar::part(sidebar) {
      gap: 0;
      padding: 0;
      overflow-y: auto;
    }
    [data-head] {
      box-sizing: border-box;
      padding-block: var(--sk-space-5);
      padding-inline: var(--sk-space-4);
      border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-head] sk-section-header::part(header) {
      column-gap: 0;
    }
    [data-head] sk-section-header::part(eyebrow) {
      color: var(--sk-fg-subtle);
    }
    [data-head] [slot='title'] {
      display: block;
      min-width: 0;
      color: var(--sk-fg-default);
      font-size: var(--sk-text-base);
      font-weight: var(--sk-weight-bold);
      overflow-wrap: anywhere;
    }
    [data-head] [slot='description'] {
      color: var(--sk-fg-muted);
      font-family: var(--sk-font-mono);
      font-size: var(--sk-text-xs);
      overflow-wrap: anywhere;
    }
    [data-back] {
      margin-block: 0 var(--sk-space-3);
    }
    [data-back]::part(button) {
      padding-block: var(--sk-space-1);
      padding-inline: 0;
    }
    [data-back] svg {
      inline-size: var(--sk-space-4);
      block-size: var(--sk-space-4);
    }
    [data-mission-meta] {
      display: flex;
      flex-direction: column;
      gap: var(--sk-space-3);
      min-width: 0;
    }
    [data-mission-tags] {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sk-space-2);
    }
    [data-nav] {
      display: block;
      box-sizing: border-box;
      padding-block: var(--sk-space-3);
      padding-inline: var(--sk-space-3);
    }
    slot[name='sidebar-section']::slotted(*) {
      display: block;
      box-sizing: border-box;
      padding-block: var(--sk-space-4);
      padding-inline: var(--sk-space-3);
      border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-footer] {
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-sizing: border-box;
      block-size: var(--shell-band);
      padding-block: 0;
      padding-inline: var(--sk-space-3);
      border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
    }
    [data-footer-progress] {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        'label meta'
        'bar bar';
      align-items: center;
      gap: var(--sk-space-2) var(--sk-space-3);
    }
    [data-footer-progress] .sk-progress__label {
      grid-area: label;
      color: var(--sk-fg-muted);
    }
    [data-footer-progress] .sk-progress__bar {
      grid-area: bar;
    }
    [data-footer-progress] .sk-progress__meta {
      grid-area: meta;
    }
    [data-content] {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: auto;
      background: var(--sk-surface-page);
    }
    [data-status-body] {
      padding-inline: var(--sk-space-4);
      padding-block: var(--sk-space-3) 0;
    }
    main {
      display: block;
      flex-grow: 1;
      min-width: 0;
      padding: var(--sk-space-6);
    }
    [data-body][data-tier='mobile'] main {
      padding: var(--sk-space-4);
    }
    [data-focus-target] {
      min-width: 0;
    }
  `,
  ];

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

  private readonly overlays = new ShellOverlays(this, {
    emitDrawer: (open, reason) => this.emitToggleDrawer(open, reason),
    emitFlyout: (open, reason) => this.emitToggleFlyout(open, reason),
    focusContent: () => this.focusContent(),
    onSectionSlotChange: () => this.onSectionSlotChange(),
  });

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

  // Closes the drawer or flyout (and dispatches their events) when the tier leaves theirs.
  private onTierChanged(previous: ShellTier, next: ShellTier): void {
    this.overlays.onTierChanged(previous, next);
  }

  // The hamburger asks for the drawer.
  private requestDrawer(reason: DrawerReason): void {
    this.overlays.requestDrawer(reason);
  }

  /**
   * True while a sidebar tree is shown AND one of its leaves is selected: only then does that leaf (not a nav item)
   * carry `aria-current="page"`. The tree is shown in the expanded sidebar, the open drawer and the open flyout.
   */
  private isSidebarTreeShown(): boolean {
    const shown = this.tier === 'expanded' || (this.tier === 'mobile' && this.drawerOpen) || (this.tier === 'collapsed' && this.flyoutOpen);
    if (!shown) return false;
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

  private renderDrawerRegion(context: SidebarContext): TemplateResult | typeof nothing {
    return this.overlays.renderDrawer({ ...context, railItems: this.railItems });
  }

  private renderFlyoutRegion(context: SidebarContext): TemplateResult | typeof nothing {
    return this.overlays.renderFlyout(context);
  }

  /** What the mobile top bar shows beside the brand: the mission title or the project name. */
  private contextLabel(layout: ShellLayout): string {
    return (layout === 'mission' ? this.mission?.title : this.project?.name) ?? '';
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
      ${renderTopBar({ tier, context: this.contextLabel(layout), onHamburger: () => this.requestDrawer('hamburger') })}
      <div data-body data-layout=${layout} data-tier=${tier}>
        ${showRail ? renderRail({ items: this.railItems, marking }) : nothing}
        ${tier === 'expanded' ? renderSidebar(sidebarContext) : nothing}
        ${tier === 'collapsed' ? renderIconColumn(sidebarContext) : nothing}
        ${this.renderFlyoutRegion(sidebarContext)}
        <div data-content>
          ${renderStatus({ status: this.status, errorMessage: this.errorMessage, onRetry: () => this.emitRetry() })}
          ${renderContent()}
        </div>
      </div>
      ${this.renderDrawerRegion(sidebarContext)}
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
