import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** Which scroll extents count as overflow: the default stays horizontal, so the board and the Pipeline screen are unchanged. */
export type OverflowAxis = 'horizontal' | 'vertical' | 'both';

/** The result for one measured target, in the order `targets` returned them. */
export interface OverflowResult {
  element: Element;
  overflowing: boolean;
}

export interface OverflowRegionOptions {
  /** The scroller to measure; null while it is not rendered. Read after every update of the host. */
  target: () => Element | null;
  /** Other elements whose size changes the scroller's overflow (observed with it; their `updateComplete` is awaited). */
  also?: () => Element[];
  /** Also measure the scroll position (`before` and `after`: content off-screen on that side). */
  edges?: boolean;
  /**
   * Several scrollers measured by this one controller (the Artifact Viewer's pane, article, source block and table boxes). Read after
   * every update of the host. When given, each element is measured on `axis`, observed for size changes and for DOM changes inside it
   * (so content that grows inside a box of unchanged size is seen), and the result is `results` and `overflowingTargets`.
   */
  targets?: () => readonly Element[];
  /** The extents that count as overflow for `targets`; the default is `horizontal`. */
  axis?: OverflowAxis;
}

type Updatable = Element & { updateComplete?: Promise<unknown> };

/**
 * The one overflow measurement of the package: a scroller is a labelled, focusable region only while its content really
 * overflows horizontally. Measured on every host update, on every size change of the scroller or of the elements in `also`,
 * and, because labels take their final width only when the fonts are ready and a size observer alone is not relied on, once
 * more after the first layout (the observed elements rendered, the fonts ready and a frame drawn). The host reads
 * `overflowing`, `before` and `after` in `render`; a change asks it to update. The observer lives from connection to
 * disconnection (Lit schedules no update when an element is moved), so a re-parented host keeps measuring.
 */
export class OverflowRegion implements ReactiveController {
  overflowing = false;
  before = false;
  after = false;
  /** One result per element of `options.targets`, as of the last measurement; empty without `targets`. */
  results: readonly OverflowResult[] = [];
  /** The elements of `results` that overflow. */
  overflowingTargets: ReadonlySet<Element> = new Set();

  private multiObserver: ResizeObserver | null = null;
  private mutations: MutationObserver | null = null;
  private multiObserved: readonly Element[] = [];
  private framePending = false;
  private observer: ResizeObserver | null = null;
  private observed: Element | null = null;

  constructor(
    private readonly host: ReactiveControllerHost & { hasUpdated: boolean },
    private readonly options: OverflowRegionOptions,
  ) {
    host.addController(this);
  }

  hostConnected(): void {
    this.observed = null;
    if (this.host.hasUpdated) this.host.requestUpdate();
  }

  hostDisconnected(): void {
    this.multiObserver?.disconnect();
    this.mutations?.disconnect();
    this.multiObserver = null;
    this.mutations = null;
    this.multiObserved = [];
    this.observer?.disconnect();
    this.observer = null;
    this.observed = null;
  }

  hostUpdated(): void {
    if (this.options.targets !== undefined) {
      this.updateTargets(this.options.targets());
      return;
    }
    const target = this.options.target();
    if (target !== this.observed) {
      this.observer?.disconnect();
      this.observed = target;
      if (target !== null) {
        this.observer ??= new ResizeObserver(() => this.measure());
        const companions = this.options.also?.() ?? [];
        for (const element of [target, ...companions]) this.observer.observe(element);
        this.measureAfterLayout(companions);
      }
    }
    this.measure();
  }

  private measureAfterLayout(companions: Element[]): void {
    const rendered = companions.map((element) => (element as Updatable).updateComplete);
    void Promise.all([...rendered, document.fonts?.ready]).then(() => requestAnimationFrame(() => this.measure()));
  }

  /** Reads the scroller now; an arrow function so a template can use it as a scroll listener. */
  measure = (): void => {
    if (this.options.targets !== undefined) {
      this.measureTargets();
      return;
    }
    const target = this.observed;
    const scrolls = target !== null && target.scrollWidth > target.clientWidth;
    let before = false;
    let after = false;
    if (this.options.edges === true && target !== null && scrolls) {
      const travelled = Math.abs(target.scrollLeft);
      before = travelled > 1;
      after = travelled + target.clientWidth < target.scrollWidth - 1;
    }
    if (scrolls === this.overflowing && before === this.before && after === this.after) return;
    this.overflowing = scrolls;
    this.before = before;
    this.after = after;
    this.host.requestUpdate();
  };

  // ---- Several targets (IC-06b). The single-target path above is untouched.

  private updateTargets(list: readonly Element[]): void {
    const same = list.length === this.multiObserved.length && list.every((element, at) => element === this.multiObserved[at]);
    if (!same) {
      this.multiObserver?.disconnect();
      this.mutations?.disconnect();
      this.multiObserved = [...list];
      this.multiObserver ??= new ResizeObserver(() => this.measureTargets());
      this.mutations ??= new MutationObserver(() => this.scheduleMeasure());
      for (const element of list) {
        this.multiObserver.observe(element);
        this.mutations.observe(element, { childList: true, subtree: true, characterData: true, attributes: true });
      }
      void document.fonts?.ready.then(() => requestAnimationFrame(() => this.measureTargets()));
    }
    this.measureTargets();
  }

  /** One measurement per frame however many mutations arrive. */
  private scheduleMeasure(): void {
    if (this.framePending) return;
    this.framePending = true;
    requestAnimationFrame(() => {
      this.framePending = false;
      this.measureTargets();
    });
  }

  private scrolls(element: Element): boolean {
    const axis = this.options.axis ?? 'horizontal';
    const across = element.scrollWidth > element.clientWidth;
    const down = element.scrollHeight > element.clientHeight;
    return axis === 'horizontal' ? across : axis === 'vertical' ? down : across || down;
  }

  private measureTargets(): void {
    const next = this.multiObserved.map((element): OverflowResult => ({ element, overflowing: this.scrolls(element) }));
    const changed = next.length !== this.results.length || next.some((result, at) => result.overflowing !== this.results[at]?.overflowing);
    this.results = next;
    this.overflowingTargets = new Set(next.filter((result) => result.overflowing).map((result) => result.element));
    if (changed) this.host.requestUpdate();
  }
}
