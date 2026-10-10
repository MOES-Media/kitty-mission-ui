// The shell's two overlays: the mobile drawer (a native modal <dialog>) and the collapsed-tier flyout. Both are
// semi-controlled: a request dispatches a cancelable event first and applies only when nobody prevented it.
// Gap G-11 (sunset: library `sk-drawer` / `sk-flyout`): the native <dialog> UA border and Canvas background are reset
// under the shell paint exception; the library sidebar inside it fills the dialog.
// Gap G-04: overlay chrome is local until the library ships it.
import { css, html, nothing } from 'lit';
import type { CSSResult, ReactiveController, ReactiveControllerHost, TemplateResult } from 'lit';
import '@spec-kitty/elements';
import '../sk-shell-nav-item/sk-shell-nav-item.js';
import { renderIcon } from '../../shell-icons.js';
import type { DrawerReason, FlyoutReason, ShellNavItem, ShellTier } from '../../shell-types.js';
import { markFor, renderFooter, renderHead, renderSectionNav } from './shell-parts.js';
import type { Marking, SidebarContext } from './shell-parts.js';

/** What the overlays read from, and write to, the shell. Public members only. */
export interface OverlayHost extends ReactiveControllerHost, HTMLElement {
  layout: string;
  tier: ShellTier;
  drawerOpen: boolean;
  flyoutOpen: boolean;
  current: string;
  readonly renderRoot: HTMLElement | DocumentFragment;
}

/** What only the shell can do: dispatch its declared events and move focus to its content target. */
export interface OverlayHooks {
  emitDrawer: (open: boolean, reason: DrawerReason) => boolean;
  emitFlyout: (open: boolean, reason: FlyoutReason) => boolean;
  focusContent: () => void;
  onSectionSlotChange: () => void;
}

export interface DrawerContext extends SidebarContext {
  railItems: ShellNavItem[];
}

type DrawerFocus = 'hamburger' | 'content' | 'none';
type FlyoutFocus = 'icon' | 'content' | 'none';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

// Layout, plus overlay chrome paint (operator-approved stylelint exception 2026-10-01: token values only). The shell
// adopts this sheet next to its own: the overlays own their placement.
export const overlayStyles: CSSResult = css`
  dialog[data-drawer] {
    inset: 0;
    margin: 0;
    padding: 0;
    border: 0;
    box-sizing: border-box;
    width: var(--sk-layout-context-sidebar-width);
    height: 100%;
    max-height: 100%;
    overflow: hidden;
    color: var(--sk-fg-body);
    background: var(--sk-surface-card);
  }
  [data-drawer-body] {
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
  }
  [data-drawer-body] sk-context-sidebar {
    height: 100%;
  }
  [data-drawer-body] sk-context-sidebar::part(sidebar) {
    height: 100%;
    max-height: 100%;
  }
  [data-drawer-top] {
    display: flex;
    justify-content: flex-end;
    box-sizing: border-box;
    padding: var(--sk-space-2);
  }
  [data-drawer-strip] {
    min-width: 0;
    height: auto;
  }
  [data-drawer-strip] [slot] {
    inline-size: var(--sk-space-8);
  }
  [data-drawer-strip]::part(rail) {
    background: var(--sk-surface-hero);
    overflow: visible;
  }
  [data-body][data-tier='collapsed'] [data-content] {
    grid-row: 1;
  }
  [data-body][data-tier='collapsed'][data-layout='project'] [data-content] {
    grid-column: 2;
  }
  [data-body][data-tier='collapsed'][data-layout='mission'] [data-content] {
    grid-column: 3;
  }
  [data-flyout] {
    grid-row: 1;
    justify-self: start;
    width: var(--sk-layout-context-sidebar-width);
    min-height: 0;
    z-index: 20;
  }
  [data-body][data-layout='project'] [data-flyout] {
    grid-column: 2;
  }
  [data-body][data-layout='mission'] [data-flyout] {
    grid-column: 3;
  }
  [data-flyout] sk-context-sidebar {
    height: 100%;
  }
`;

function navItem(item: ShellNavItem, marking: Marking, scope: 'sidebar' | 'rail', compact = false): TemplateResult {
  return html`<sk-shell-nav-item
    item-id=${item.id}
    href=${item.href}
    icon=${item.icon}
    .label=${item.label}
    .current=${markFor(scope, item.id, marking)}
    ?compact=${compact}
  ></sk-shell-nav-item>`;
}

/** True when `node` is `container` or sits inside it in the flat tree (slots and shadow hosts included). */
function inFlatTree(node: Node | null, container: Element | null): boolean {
  if (container === null) return false;
  let walk: Node | null = node;
  while (walk !== null) {
    if (walk === container) return true;
    const slot: Node | null = walk instanceof Element ? walk.assignedSlot : null;
    if (slot !== null) {
      walk = slot;
    } else if (walk.parentNode !== null) {
      walk = walk.parentNode;
    } else {
      walk = walk instanceof ShadowRoot ? walk.host : null;
    }
  }
  return false;
}

function deepFirstFocusable(node: Node): HTMLElement | null {
  const children: Node[] = [];
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    children.push(...(assigned.length > 0 ? assigned : Array.from(node.childNodes)));
  } else if (node instanceof Element && node.shadowRoot) {
    children.push(...Array.from(node.shadowRoot.childNodes));
  } else {
    children.push(...Array.from(node.childNodes));
  }
  for (const child of children) {
    if (child instanceof HTMLElement && child.matches(FOCUSABLE)) return child;
    const found = deepFirstFocusable(child);
    if (found) return found;
  }
  return null;
}

function flatElements(node: Node): Element[] {
  const found: Element[] = [];
  const children: Node[] = node instanceof Element && node.shadowRoot ? [...node.shadowRoot.childNodes, ...node.childNodes] : Array.from(node.childNodes);
  for (const child of children) {
    if (child instanceof Element) found.push(child);
    found.push(...flatElements(child));
  }
  return found;
}

/** Runs `then` once the library elements inside `container` have rendered (a fresh element has no shadow content yet). */
async function whenRendered(container: Element, then: () => void): Promise<void> {
  for (let pass = 0; pass < 3; pass += 1) {
    await Promise.all(flatElements(container).map((element) => Promise.resolve((element as { updateComplete?: unknown }).updateComplete)));
  }
  then();
}

function activeIsLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body;
}

/**
 * The drawer and flyout controller. It reads and writes `drawerOpen` and `flyoutOpen` on the shell, renders both
 * overlays, and owns every listener they need (document listeners exist only while the flyout is open).
 */
export class ShellOverlays implements ReactiveController {
  private readonly host: OverlayHost;
  private readonly hooks: OverlayHooks;
  private drawerFocus: DrawerFocus = 'hamburger';
  private flyoutFocus: FlyoutFocus = 'icon';
  private flyoutShown = false;
  private listening = false;

  constructor(host: OverlayHost, hooks: OverlayHooks) {
    this.host = host;
    this.hooks = hooks;
    host.addController(this);
    host.addEventListener('sk-navigate', this.onNavigate);
  }

  hostConnected(): void {
    const root = this.host.renderRoot;
    const sheet = overlayStyles.styleSheet;
    if (root instanceof ShadowRoot && sheet && !root.adoptedStyleSheets.includes(sheet)) {
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
    root.addEventListener('click', this.onCaptureClick as EventListener, true);
    root.addEventListener('focusout', this.onFocusOut as EventListener);
  }

  hostDisconnected(): void {
    this.setListening(false);
  }

  hostUpdate(): void {
    // Forced false outside their tier, before the render, so a host-set value there is simply ignored.
    const picker = this.host.layout === 'picker';
    if (picker || this.host.tier !== 'mobile') this.host.drawerOpen = false;
    if (picker || this.host.tier !== 'collapsed') this.host.flyoutOpen = false;
  }

  hostUpdated(): void {
    this.syncDrawer();
    this.syncFlyout();
  }

  // ---- tier ----------------------------------------------------------------------------------------------------

  /** Leaving a tier closes its overlay: the event is informational (the state is forced), never a veto. */
  onTierChanged(previous: ShellTier, next: ShellTier): void {
    if (previous === 'mobile' && next !== 'mobile' && this.host.drawerOpen) {
      this.hooks.emitDrawer(false, 'resize');
      this.drawerFocus = 'none';
      this.host.drawerOpen = false;
    }
    if (previous === 'collapsed' && next !== 'collapsed' && this.host.flyoutOpen) {
      this.hooks.emitFlyout(false, 'tier');
      this.flyoutFocus = 'none';
      this.host.flyoutOpen = false;
    }
  }

  // ---- drawer --------------------------------------------------------------------------------------------------

  /** The hamburger: opens the drawer (while it is open the page behind is inert, so only ever open). */
  requestDrawer(reason: DrawerReason): void {
    this.setDrawer(!this.host.drawerOpen, reason, 'hamburger');
  }

  private setDrawer(open: boolean, reason: DrawerReason, focus: DrawerFocus): void {
    if (this.host.tier !== 'mobile' || open === this.host.drawerOpen) return;
    if (!this.hooks.emitDrawer(open, reason)) return;
    this.drawerFocus = focus;
    this.host.drawerOpen = open;
  }

  private dialog(): HTMLDialogElement | null {
    return this.host.renderRoot.querySelector<HTMLDialogElement>('dialog[data-drawer]');
  }

  private hamburger(): HTMLElement | null {
    return this.host.renderRoot.querySelector<HTMLElement>('header sk-button');
  }

  private syncDrawer(): void {
    const dialog = this.dialog();
    if (dialog === null) return;
    const want = this.host.tier === 'mobile' && this.host.drawerOpen;
    if (want && !dialog.open) {
      dialog.showModal();
      this.drawerFocus = 'hamburger';
      void whenRendered(dialog, () => {
        if (dialog.open) dialog.querySelector<HTMLElement>('[data-drawer-close]')?.focus();
      });
    } else if (!want && dialog.open) {
      dialog.close();
      const focus = this.drawerFocus;
      this.drawerFocus = 'hamburger';
      if (focus === 'hamburger') this.hamburger()?.focus();
      else if (focus === 'content') this.hooks.focusContent();
    }
  }

  private readonly onDialogCancel = (event: Event): void => {
    event.preventDefault();
    if (this.bubbleShown()) return;
    this.setDrawer(false, 'escape', 'hamburger');
  };

  private readonly onDialogKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    // Handled here so the browser's own close request (which skips `cancel` on repeat) never decides.
    event.preventDefault();
    // A shown label bubble (WP02) owns this Escape: its own document listener closes it, the drawer stays.
    if (this.bubbleShown()) return;
    this.setDrawer(false, 'escape', 'hamburger');
  };

  private readonly onDialogClick = (event: MouseEvent): void => {
    // The inner wrapper fills the dialog, so a click on the dialog itself is a click on the backdrop.
    if (event.target === event.currentTarget) this.setDrawer(false, 'backdrop', 'hamburger');
  };

  // A native close that no request caused (for example the dialog was closed by script) cannot leave the property stale.
  private readonly onDialogClose = (): void => {
    if (this.host.drawerOpen) this.host.drawerOpen = false;
  };

  /** The global items as the library rail: below 720px it lays itself out as one row, which is the drawer strip. */
  private renderStrip(ctx: DrawerContext): TemplateResult {
    const main = ctx.railItems.filter((item) => item.pinned !== true);
    const pinned = ctx.railItems.filter((item) => item.pinned === true);
    return html`<sk-personal-rail data-drawer-strip label="Global navigation">
      ${main.map((item) => html`<div slot="primary">${navItem(item, ctx.marking, 'rail', true)}</div>`)}
      ${pinned.length > 0 ? html`<div slot="account">${pinned.map((item) => navItem(item, ctx.marking, 'rail', true))}</div>` : nothing}
    </sk-personal-rail>`;
  }

  renderDrawer(ctx: DrawerContext): TemplateResult | typeof nothing {
    if (this.host.tier !== 'mobile') return nothing;
    const open = this.host.drawerOpen;
    const mission = ctx.layout === 'mission';
    return html`<dialog
      data-drawer
      aria-label="Navigation"
      @cancel=${this.onDialogCancel}
      @keydown=${this.onDialogKeydown}
      @click=${this.onDialogClick}
      @close=${this.onDialogClose}
    >
      ${open
        ? html`<div data-drawer-body>
            <sk-context-sidebar label=${mission ? 'Mission sidebar' : 'Project sidebar'}>
              <div slot="header">
                <div data-drawer-top>
                  <sk-button data-drawer-close size="icon" variant="ghost" label="Close navigation" @click=${() => this.setDrawer(false, 'close', 'hamburger')}
                    >${renderIcon('close')}</sk-button
                  >
                </div>
                ${mission && ctx.railItems.length > 0 ? this.renderStrip(ctx) : nothing}
                ${renderHead(ctx)}
              </div>
              ${renderSectionNav(ctx)}
              <slot name="sidebar-section" @slotchange=${this.hooks.onSectionSlotChange}></slot>
              ${renderFooter(ctx)}
            </sk-context-sidebar>
          </div>`
        : nothing}
    </dialog>`;
  }

  // ---- flyout --------------------------------------------------------------------------------------------------

  private hasSection(): boolean {
    return this.host.querySelector('[slot="sidebar-section"]') !== null;
  }

  private flyoutEl(): HTMLElement | null {
    return this.host.renderRoot.querySelector<HTMLElement>('[data-flyout]');
  }

  /** The icon of the current destination in the collapsed column: the flyout's trigger. */
  private currentIcon(): HTMLElement | null {
    if (this.host.current === '') return null;
    for (const item of this.host.renderRoot.querySelectorAll<HTMLElement>('[data-icon-column] sk-shell-nav-item')) {
      if (item.getAttribute('item-id') === this.host.current) return item;
    }
    return null;
  }

  private setFlyout(open: boolean, reason: FlyoutReason, focus: FlyoutFocus): void {
    if (this.host.tier !== 'collapsed' || open === this.host.flyoutOpen) return;
    if (!this.hooks.emitFlyout(open, reason)) return;
    this.flyoutFocus = focus;
    this.host.flyoutOpen = open;
  }

  private syncFlyout(): void {
    const shown = this.host.tier === 'collapsed' && this.host.flyoutOpen;
    this.setListening(shown && this.host.isConnected);
    if (shown === this.flyoutShown) return;
    this.flyoutShown = shown;
    if (shown) {
      this.flyoutFocus = 'icon';
      const flyout = this.flyoutEl();
      if (flyout) {
        void whenRendered(flyout, () => {
          if (this.flyoutShown && flyout.isConnected) deepFirstFocusable(flyout)?.focus();
        });
      }
      return;
    }
    const focus = this.flyoutFocus;
    this.flyoutFocus = 'icon';
    if (focus === 'content') this.hooks.focusContent();
    else if (focus === 'icon' && activeIsLost()) this.currentIcon()?.focus();
  }

  // Activating the current section's icon opens the flyout instead of navigating: the click is cancelled before the
  // item sees it, so only `sk-toggle-flyout` is dispatched (never `sk-navigate`).
  private readonly onCaptureClick = (event: MouseEvent): void => {
    if (this.host.tier !== 'collapsed' || !this.hasSection()) return;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const icon = this.currentIcon();
    if (icon === null || !event.composedPath().includes(icon)) return;
    event.preventDefault();
    event.stopPropagation();
    this.setFlyout(!this.host.flyoutOpen, 'activate', 'icon');
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    if (!this.flyoutShown) return;
    const flyout = this.flyoutEl();
    const icon = this.currentIcon();
    const path = event.composedPath();
    if (!(flyout && path.includes(flyout)) && !(icon && path.includes(icon))) return;
    // No related target means the window lost focus or a non-focusable area was clicked (pointerdown covers that).
    const next = event.relatedTarget;
    if (!(next instanceof Node) || inFlatTree(next, flyout) || inFlatTree(next, icon)) return;
    this.setFlyout(false, 'outside', 'none');
  };

  // A navigation (an item chosen in the flyout, any other icon, a link in the drawer) closes the overlay first.
  // Deferred one microtask so `sk-navigate` has reached every listener before `sk-toggle-*` follows it.
  private readonly onNavigate = (): void => {
    queueMicrotask(() => {
      this.setDrawer(false, 'navigate', 'content');
      this.setFlyout(false, 'navigate', 'content');
    });
  };

  /** True while any compact nav item is showing its label bubble (WP02): that bubble owns the next Escape. */
  private bubbleShown(): boolean {
    for (const item of this.host.renderRoot.querySelectorAll('sk-shell-nav-item')) {
      if (item.shadowRoot?.querySelector('sk-pill-tag')) return true;
    }
    return false;
  }

  // Capture phase: runs before the bubble's own bubbling-phase document listener, so the bubble is still in the DOM
  // and one Escape closes only the bubble. The next Escape closes the flyout.
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || this.bubbleShown()) return;
    this.setFlyout(false, 'escape', 'icon');
  };

  private readonly onDocumentPointerDown = (event: PointerEvent): void => {
    const path = event.composedPath();
    const flyout = this.flyoutEl();
    const icon = this.currentIcon();
    if ((flyout && path.includes(flyout)) || (icon && path.includes(icon))) return;
    this.setFlyout(false, 'outside', 'none');
  };

  private setListening(on: boolean): void {
    if (on === this.listening) return;
    this.listening = on;
    if (on) {
      document.addEventListener('keydown', this.onDocumentKeydown, true);
      document.addEventListener('pointerdown', this.onDocumentPointerDown);
    } else {
      document.removeEventListener('keydown', this.onDocumentKeydown, true);
      document.removeEventListener('pointerdown', this.onDocumentPointerDown);
    }
  }

  renderFlyout(ctx: SidebarContext): TemplateResult | typeof nothing {
    if (this.host.tier !== 'collapsed' || !this.host.flyoutOpen) return nothing;
    return html`<div data-flyout>
      <sk-context-sidebar label=${ctx.layout === 'mission' ? 'Mission sidebar' : 'Project sidebar'}>
        <div slot="header">${renderHead(ctx)}</div>
        <slot name="sidebar-section" @slotchange=${this.hooks.onSectionSlotChange}></slot>
      </sk-context-sidebar>
    </div>`;
  }
}
