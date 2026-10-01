import { LitElement, html, nothing } from 'lit';
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

  override connectedCallback(): void {
    super.connectedCallback();
    this.tier = this.readTier();
  }

  protected override willUpdate(): void {
    this.tier = this.readTier();
  }

  /** The only place the window width is read. */
  private readTier(): ShellTier {
    if (matchMedia(EXPANDED_QUERY).matches) return 'expanded';
    if (matchMedia(COLLAPSED_QUERY).matches) return 'collapsed';
    return 'mobile';
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
    return html`<slot></slot>${this.renderDrawerRegion()}${this.renderFlyoutRegion()}`;
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
