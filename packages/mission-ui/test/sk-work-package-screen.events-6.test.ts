// EV-6 (WP06): "Open review" on a cycle emits `sk-open-artifact` once with the Mission id, the cycle's artifact path and the
// review-cycle kind. Driven through the real screen: the control is the review part's, wired to the screen's own dispatch method.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { OPEN_REVIEW_LABEL, REVIEW_CYCLE_ARTIFACT_KIND } from '../src/defaults/index.js';
import type { ReviewCycle } from '../src/contract/types.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-28'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

/** The "Open review" control of the cycle with this number. */
function openReview(screen: SkWorkPackageScreen, cycleNumber: number): HTMLElement | null {
  const label = OPEN_REVIEW_LABEL(cycleNumber);
  return [...(screen.shadowRoot?.querySelectorAll<HTMLElement>('[data-region="review-cycles"] sk-button') ?? [])].find((button) => button.getAttribute('label') === label) ?? null;
}
function must(el: HTMLElement | null): HTMLElement {
  if (el === null) throw new Error('control not found');
  return el;
}

function listen(screen: SkWorkPackageScreen): { events: CustomEvent[]; all: string[] } {
  const events: CustomEvent[] = [];
  const all: string[] = [];
  const wrapper = screen.parentElement as HTMLElement;
  for (const name of EVENT_NAMES) {
    wrapper.addEventListener(name, (event) => {
      all.push(name);
      if (name === 'sk-open-artifact') events.push(event as CustomEvent);
    });
  }
  return { events, all };
}

function expectOne(events: CustomEvent[], path: string): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-open-artifact');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, path, kind: REVIEW_CYCLE_ARTIFACT_KIND });
}

const cycles: ReviewCycle[] = DETAIL_FIXTURES.detailPopulated.reviewCycles ?? [];
const pathOf = (index: number): string => {
  const path = cycles[index]?.artifactPath;
  if (typeof path !== 'string') throw new Error('fixture cycle has no path');
  return path;
};
/** Two cycles: the first with a path, the second without one (the null-path sibling). */
const mixed = (): Partial<WpScreenProps> => {
  const wp = WORK_PACKAGE_FIXTURES.wpApproved;
  return { ...pairingProps('WP-28'), detail: { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), reviewCycles: [{ ...(cycles[0] as ReviewCycle) }, { ...(cycles[1] as ReviewCycle), artifactPath: null }] } };
};

describe('EV-6: "Open review" emits sk-open-artifact', () => {
  it('a click emits exactly one event with the Mission id, the cycle path and the review-cycle kind, and nothing else', async () => {
    const screen = await mount();
    const { events, all } = listen(screen);
    // positive control for the listener's reach: a click on the cycle's text emits nothing
    await userEvent.click(must(screen.shadowRoot?.querySelector<HTMLElement>('[data-region="review-cycles"] ol > li') ?? null));
    expect(events).toHaveLength(0);
    await userEvent.click(must(openReview(screen, 1)));
    expectOne(events, pathOf(0));
    expect(all).toEqual(['sk-open-artifact']);
  });

  it('each cycle opens its own path', async () => {
    const screen = await mount();
    const { events } = listen(screen);
    await userEvent.click(must(openReview(screen, 2)));
    expectOne(events, pathOf(1));
  });

  it('the control is the library sk-button (not an anchor, not a raw button) and its kind is the exported constant', async () => {
    const screen = await mount();
    const control = must(openReview(screen, 1));
    expect(control.tagName).toBe('SK-BUTTON');
    expect(screen.shadowRoot?.querySelectorAll('[data-region="review-cycles"] a, [data-region="review-cycles"] button')).toHaveLength(0);
    expect(typeof REVIEW_CYCLE_ARTIFACT_KIND).toBe('string');
  });

  it('a cycle with a null artifact path has no control at all, beside a sibling that has one (same listener)', async () => {
    const screen = await mount(mixed());
    const { events } = listen(screen);
    expect(openReview(screen, 2)).toBeNull();
    expect(screen.shadowRoot?.querySelectorAll('[data-region="review-cycles"] sk-button')).toHaveLength(1);
    await userEvent.click(must(screen.shadowRoot?.querySelectorAll<HTMLElement>('[data-region="review-cycles"] ol > li')[1] ?? null));
    expect(events).toHaveLength(0);
    await userEvent.click(must(openReview(screen, 1)));
    expectOne(events, pathOf(0));
  });

  it('with no Mission the control is inert and emits nothing; the same listener hears it once a Mission is set', async () => {
    const screen = await mount({ mission: null });
    const { events } = listen(screen);
    const inert = must(openReview(screen, 1));
    expect(inert.hasAttribute('disabled')).toBe(true);
    inert.click();
    inert.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(events).toHaveLength(0);
    screen.mission = sampleMission;
    await screen.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(must(openReview(screen, 1)).hasAttribute('disabled')).toBe(false);
    await userEvent.click(must(openReview(screen, 1)));
    expectOne(events, pathOf(0));
  });

  it('Enter and Space on the focused control each emit once; another key emits nothing (positive control in the same test)', async () => {
    const screen = await mount();
    const { events } = listen(screen);
    must(openReview(screen, 1)).focus();
    await userEvent.keyboard('{Escape}');
    expect(events).toHaveLength(0);
    must(openReview(screen, 1)).focus();
    await userEvent.keyboard('{Enter}');
    expectOne(events, pathOf(0));
    events.length = 0;
    must(openReview(screen, 1)).focus();
    await userEvent.keyboard(' ');
    expectOne(events, pathOf(0));
  });

  it('hovering emits nothing', async () => {
    const screen = await mount();
    const { events } = listen(screen);
    await userEvent.hover(must(openReview(screen, 1)));
    expect(events).toHaveLength(0);
    await userEvent.click(must(openReview(screen, 1)));
    expect(events).toHaveLength(1);
  });
});
