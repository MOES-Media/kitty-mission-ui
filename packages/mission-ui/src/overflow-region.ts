import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface OverflowRegionOptions {
  /** The scroller to measure; null while it is not rendered. Read after every update of the host. */
  target: () => Element | null;
  /** Other elements whose size changes the scroller's overflow (observed with it; their `updateComplete` is awaited). */
  also?: () => Element[];
  /** Also measure the scroll position (`before` and `after`: content off-screen on that side). */
  edges?: boolean;
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
    this.observer?.disconnect();
    this.observer = null;
    this.observed = null;
  }

  hostUpdated(): void {
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
}
