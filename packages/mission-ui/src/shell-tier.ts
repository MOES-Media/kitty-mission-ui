import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ShellTier } from './shell-types.js';

/** The CSS custom state the controller sets on its host while the enclosing shell reads `mobile`: `:host(:state(shell-mobile))`. */
export const SHELL_MOBILE_STATE = 'shell-mobile';

const TIERS: readonly ShellTier[] = ['expanded', 'collapsed', 'mobile'];

/** The nearest enclosing `sk-mission-shell`, looking through shadow roots: a wrapper element may hold the host in its own. */
function enclosingShell(start: Element): Element | null {
  let node: Element | null = start;
  while (node !== null) {
    const shell: Element | null = node.closest('sk-mission-shell');
    if (shell !== null) return shell;
    const root = node.getRootNode();
    const host: Node | null = root instanceof ShadowRoot ? root.host : null;
    node = host instanceof Element ? host : null;
  }
  return null;
}

/**
 * Follows the responsive tier of the enclosing `sk-mission-shell` for a slotted screen. The shell reflects its `tier`
 * attribute and documents it as public (`expanded`, `collapsed` or `mobile`); this controller finds the shell across shadow
 * roots, observes that attribute, stops on disconnection and follows only the new shell after a re-parent.
 *
 * The host reads `tier` (`null` outside a shell) and may style itself with `:host(:state(shell-mobile))`: the controller sets
 * that CSS custom state through `ElementInternals` while the tier is `mobile`, and no attribute appears on the host. It
 * asks the host to update on every change of the tier. A host takes at most one controller, because the controller attaches
 * the host's `ElementInternals` (a second `attachInternals()` on the same element throws). A browser without custom states
 * throws at construction: there is no silent fallback.
 */
export class ShellTierController implements ReactiveController {
  private shell: Element | null = null;
  private observer: MutationObserver | null = null;
  private current: ShellTier | null = null;
  private readonly states: CustomStateSet;

  constructor(private readonly host: ReactiveControllerHost & HTMLElement) {
    const states = host.attachInternals().states as CustomStateSet | undefined;
    if (states === undefined) throw new Error('ShellTierController needs ElementInternals custom states (:state()), which this browser lacks');
    this.states = states;
    host.addController(this);
  }

  /** The enclosing shell's tier; `null` while the host is outside a shell or detached. */
  get tier(): ShellTier | null {
    return this.current;
  }

  hostConnected(): void {
    this.shell = enclosingShell(this.host);
    this.follow();
    if (this.shell === null) return;
    this.observer = new MutationObserver(() => this.follow());
    this.observer.observe(this.shell, { attributes: true, attributeFilter: ['tier'] });
  }

  hostDisconnected(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.shell = null;
    this.follow();
  }

  private follow(): void {
    const value = this.shell?.getAttribute('tier');
    const next = TIERS.find((tier) => tier === value) ?? null;
    if (next === this.current) return;
    this.current = next;
    if (next === 'mobile') this.states.add(SHELL_MOBILE_STATE);
    else this.states.delete(SHELL_MOBILE_STATE);
    this.host.requestUpdate();
  }
}
