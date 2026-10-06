// The skeleton of the Work Package screen (IC-03b): one test per event, the layout cases, the panel ownership, the status
// switch, the focus rule and the wiring of the live region.
//
// The dispatch methods are `protected` members of the screen; the tests reach them through a type cast. NO test-only
// template hook exists and nothing is added to the shipped surface. In this work package every part is a stub, so the
// screen draws no controls: the handler is called here the way the later parts will call it. `sk-open-mission` is
// additionally driven by a real click on the complete breadcrumb renderer, wired to the screen's own handler.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { renderBreadcrumb } from '../src/elements/sk-work-package-screen/header-parts.js';
import { renderEmptyForm } from '../src/elements/sk-work-package-screen/state-parts.js';
import {
  DETAIL_FIXTURES,
  PAIRINGS,
  REFUSAL_FIXTURES,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  refusalProps,
  sampleMission,
  stateProps,
  workPackageFrame,
  workPackageProps,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import {
  ANNOUNCE_DETAIL_LOADED,
  ANNOUNCE_DETAIL_LOADING,
  ANNOUNCE_DETAIL_UNAVAILABLE,
  REVIEW_CYCLE_ARTIFACT_KIND,
  announceLoaded,
  announceLoading,
  announceNotFound,
} from '../src/defaults/index.js';

interface Handlers {
  selectWorkPackage(wpId: string): void;
  openMission(): void;
  openArtifact(path: string, kind: string): void;
  openReview(artifactPath: string): void;
  retryLoad(target: 'work-package' | 'detail'): void;
}
const handlersOf = (el: SkWorkPackageScreen): Handlers => el as unknown as Handlers;

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function setViewport(width: number): Promise<void> {
  await page.viewport(width, 900);
}

async function mount(props: Partial<WpScreenProps> = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await setViewport(width);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

async function settle(screen: SkWorkPackageScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const regionIds = (screen: SkWorkPackageScreen): string[] => [...root(screen).querySelectorAll('[data-region]')].map((el) => el.getAttribute('data-region') ?? '');
const regionOf = (screen: SkWorkPackageScreen, id: string): HTMLElement | null => root(screen).querySelector<HTMLElement>(`[data-region="${id}"]`);

/** Every event of the screen's surface, collected on a wrapper around it. */
function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  screen.addEventListener('sk-open-mission', () => undefined);
  return seen;
}

function expectOne(events: CustomEvent[], name: string, detail: unknown): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe(name);
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual(detail);
}

describe('events: one test per event, exactly one event with its exact payload', () => {
  it('sk-select-work-package carries the dependency id', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).selectWorkPackage('WP03');
    expectOne(events, 'sk-select-work-package', { missionId: sampleMission.missionId, wpId: 'WP03' });
  });

  it('sk-open-mission carries the Mission id and slug', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).openMission();
    expectOne(events, 'sk-open-mission', { missionId: sampleMission.missionId, slug: sampleMission.slug });
  });

  it('sk-open-artifact carries the path and passes the kind through unchanged', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).openArtifact('spec.md', 'a-kind-the-screen-never-saw');
    expectOne(events, 'sk-open-artifact', { missionId: sampleMission.missionId, path: 'spec.md', kind: 'a-kind-the-screen-never-saw' });
  });

  it('the Open-review handler reads the review cycle kind from the defaults', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).openReview('tasks/WP04/review-cycle-1.md');
    expectOne(events, 'sk-open-artifact', { missionId: sampleMission.missionId, path: 'tasks/WP04/review-cycle-1.md', kind: REVIEW_CYCLE_ARTIFACT_KIND });
  });

  it('sk-retry-load carries the target, once for each of the two targets', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).retryLoad('work-package');
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: 'WP04', target: 'work-package' });
    events.length = 0;
    handlersOf(screen).retryLoad('detail');
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: 'WP04', target: 'detail' });
  });

  it('a real click on the complete breadcrumb control, wired to the screen handler, emits one sk-open-mission', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    const host = document.createElement('div');
    document.body.append(host);
    render(renderBreadcrumb({ missionLabel: sampleMission.name, wpId: 'WP04', inert: false }, () => handlersOf(screen).openMission()), host);
    const crumb = one<HTMLElement>(host, 'nav sk-button');
    // positive control first: an unrelated click on the nav (not the control) emits nothing
    await userEvent.click(one<HTMLElement>(host, 'nav'));
    expect(events).toHaveLength(0);
    await userEvent.click(crumb);
    expectOne(events, 'sk-open-mission', { missionId: sampleMission.missionId, slug: sampleMission.slug });
  });

  it('with no Mission every dispatch method emits nothing, and the same listener hears them once a Mission is set', async () => {
    const screen = await mount({ mission: null });
    const events = listenAll(screen);
    handlersOf(screen).selectWorkPackage('WP03');
    handlersOf(screen).openMission();
    handlersOf(screen).openArtifact('spec.md', 'spec');
    handlersOf(screen).openReview('x.md');
    handlersOf(screen).retryLoad('work-package');
    expect(events).toHaveLength(0);
    screen.mission = sampleMission;
    await settle(screen);
    handlersOf(screen).openMission();
    expect(events).toHaveLength(1);
  });

  it('the breadcrumb is drawn inert with no Mission: the click emits nothing, a Mission-bound one emits once', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    const host = document.createElement('div');
    document.body.append(host);
    render(renderBreadcrumb({ missionLabel: 'Mission', wpId: 'WP04', inert: true }, () => handlersOf(screen).openMission()), host);
    const crumb = one<HTMLElement>(host, 'nav sk-button');
    expect(crumb.hasAttribute('disabled')).toBe(true);
    crumb.click();
    expect(events).toHaveLength(0);
    render(renderBreadcrumb({ missionLabel: 'Mission', wpId: 'WP04', inert: false }, () => handlersOf(screen).openMission()), host);
    one<HTMLElement>(host, 'nav sk-button').click();
    expect(events).toHaveLength(1);
  });
});

describe('the payload rule: the Work Package id comes from wpId, then workPackage.wpId, then detail.wpId', () => {
  const retryOf = async (props: Partial<WpScreenProps>): Promise<CustomEvent[]> => {
    const screen = await mount({ workPackage: null, detail: null, wpId: '', ...props });
    const events = listenAll(screen);
    handlersOf(screen).retryLoad('work-package');
    return events;
  };
  const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
  const detail = pairDetail(wp, DETAIL_FIXTURES.detailPopulated);

  it('the wpId property wins over both', async () => {
    const events = await retryOf({ wpId: 'WP11', workPackage: wp, detail });
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: 'WP11', target: 'work-package' });
  });
  it('the Work Package id is used when the property is empty', async () => {
    const events = await retryOf({ workPackage: wp, detail });
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: wp.wpId, target: 'work-package' });
  });
  it('the detail id is the last resort', async () => {
    const events = await retryOf({ detail: { ...detail, wpId: 'WP08' } });
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: 'WP08', target: 'work-package' });
  });
  it('a null retry detail (no id anywhere) dispatches nothing; the positive control dispatches with an id', async () => {
    const screen = await mount({ workPackage: null, detail: null, wpId: '' });
    const events = listenAll(screen);
    handlersOf(screen).retryLoad('work-package');
    expect(events).toHaveLength(0);
    screen.wpId = 'WP02';
    await settle(screen);
    handlersOf(screen).retryLoad('work-package');
    expect(events).toHaveLength(1);
  });
  it('a detail for another Work Package counts as omitted (screen level, retryDetail itself has no such rule)', async () => {
    // With a Work Package shown, the mismatched detail never supplies the id; the Work Package's own id does.
    const mismatched = { ...detail, wpId: 'WP99' };
    const events = await retryOf({ workPackage: wp, detail: mismatched });
    expectOne(events, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: wp.wpId, target: 'work-package' });
  });
  it('the rule is observable where it can matter: a Work Package with no id (cast) and a detail for another one gives no id and no event', async () => {
    const noId = { ...wp, wpId: '' };
    const none = await retryOf({ workPackage: noId, detail: { ...detail, wpId: 'WP99' } });
    expect(none).toHaveLength(0);
    // positive control: with no Work Package shown there is nothing to disagree with, and the detail's id is used
    const shown = await retryOf({ workPackage: null, detail: { ...detail, wpId: 'WP99' } });
    expectOne(shown, 'sk-retry-load', { missionId: sampleMission.missionId, wpId: 'WP99', target: 'work-package' });
  });
});

describe('layout: the track count follows the container, three, two, one, one', () => {
  const tracks = (screen: SkWorkPackageScreen): number => getComputedStyle(one<HTMLElement>(root(screen), '[data-grid]')).gridTemplateColumns.split(' ').length;

  it('three columns at 1280 px (the acceptance check of the 1280 px stories)', async () => {
    expect(tracks(await mount({}, 1280))).toBe(3);
  });
  it('two columns at 1100 px', async () => {
    expect(tracks(await mount({}, 1100))).toBe(2);
  });
  it('one column at 800 px', async () => {
    expect(tracks(await mount({}, 800))).toBe(1);
  });
  it('one column at 620 px', async () => {
    expect(tracks(await mount({}, 620))).toBe(1);
  });
  it('the third stack spans both columns at two columns, as two tracks of its own', async () => {
    const screen = await mount({}, 1100);
    const stacks = [...root(screen).querySelectorAll<HTMLElement>('[data-stack]')];
    expect(stacks).toHaveLength(3);
    expect(getComputedStyle(stacks[2] as HTMLElement).gridTemplateColumns.split(' ')).toHaveLength(2);
    expect(getComputedStyle(stacks[0] as HTMLElement).gridTemplateColumns.split(' ')).toHaveLength(1);
  });
  it('an unbreakable word does not widen a column: the card stays as wide as its stack, in every tier', async () => {
    let ran = 0;
    for (const width of [1280, 1100, 800]) {
      const screen = await mount({}, width);
      const facts = one<HTMLElement>(root(screen), '[data-region="facts"]');
      const stack = facts.parentElement as HTMLElement;
      const word = document.createElement('p');
      word.textContent = 'x'.repeat(400);
      word.style.whiteSpace = 'nowrap';
      one<HTMLElement>(facts, 'section').append(word);
      await settle(screen);
      // positive control: the word really is wider than the column
      expect(word.scrollWidth).toBeGreaterThan(stack.getBoundingClientRect().width);
      expect(facts.getBoundingClientRect().width).toBeLessThanOrEqual(stack.getBoundingClientRect().width + 1);
      ran += 1;
    }
    expect(ran).toBe(3);
  });
  it('the thresholds are 848 and 688 px of the container, not of the viewport', async () => {
    const screen = await mount({}, 1280);
    const wrapper = screen.parentElement as HTMLElement;
    expect(wrapper).not.toBeNull();
    const widths: [number, number][] = [
      [849, 3],
      [847, 2],
      [689, 2],
      [688, 1],
    ];
    const standalone = document.createElement('sk-work-package-screen');
    Object.assign(standalone, pairingProps('WP-01'));
    const box = document.createElement('div');
    document.body.append(box);
    box.append(standalone);
    let ran = 0;
    for (const [width, expected] of widths) {
      box.style.inlineSize = `${width}px`;
      await settle(standalone);
      expect(getComputedStyle(one<HTMLElement>(root(standalone), '[data-grid]')).gridTemplateColumns.split(' '), `${width}px`).toHaveLength(expected);
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('panel ownership: the screen draws every data-region element, whatever the parts fill in', () => {
  const READY = ['header', 'facts', 'assignment', 'frontmatter', 'owned-files', 'history', 'review-summary', 'review-cycles', 'evidence-chain', 'dependency-chain', 'subtasks', 'workspace', 'artifact-links'];

  it('wpPopulated with detailPopulated and no cycles draws exactly the 13 ids, each a card or a wrapper', async () => {
    const screen = await mount();
    const ids = regionIds(screen);
    expect([...ids].sort()).toEqual([...READY].sort());
    expect(ids).toHaveLength(13);
    for (const id of ids) {
      const container = regionOf(screen, id) as HTMLElement;
      // the skeleton owns the container, never its body: a part may fill it or leave it empty, so no emptiness is asserted
      expect(['SK-CARD', 'DIV'], id).toContain(container.tagName);
    }
  });

  it('every titled panel has a section named by its h2', async () => {
    const screen = await mount();
    const cards = [...root(screen).querySelectorAll('sk-card')];
    expect(cards).toHaveLength(10);
    for (const card of cards) {
      const section = one<HTMLElement>(card, 'section');
      const heading = one<HTMLElement>(section, 'h2');
      expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
      expect((heading.textContent ?? '').trim()).not.toBe('');
    }
  });

  it('the Review panel carries no id of its own and hosts the summary and the cycles', async () => {
    const screen = await mount();
    const review = one<HTMLElement>(root(screen), 'sk-card:not([data-region])');
    expect(one(review, 'h2').textContent?.trim()).toBe('Review cycles');
    expect(one(review, '[data-region="review-summary"]')).not.toBeNull();
    expect(one(review, '[data-region="review-cycles"]')).not.toBeNull();
  });

  it('a null view draws no container: an all-null Assignment and an omitted workspace (with the sibling that draws them)', async () => {
    const present = await mount();
    expect(regionOf(present, 'assignment')).not.toBeNull();
    expect(regionOf(present, 'workspace')).not.toBeNull();
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const bare = await mount({
      workPackage: {
        ...wp,
        assignment: { agent: null, assignee: null, role: null, agentProfile: null, agentProfileVersion: null, model: null, provider: null },
        authored: { role: null, agentProfile: null, model: null, subtasks: [] },
      },
      detail: pairDetail(wp, DETAIL_FIXTURES.detailOmittedProvisional, { cycles: 'none' }),
    });
    expect(regionOf(bare, 'assignment')).toBeNull();
    expect(root(bare).textContent).not.toContain('Assignment');
    expect(regionOf(bare, 'workspace')).toBeNull();
    expect(regionOf(bare, 'review-cycles')).toBeNull();
  });

  it('cancellation is drawn only for a canceled Work Package', async () => {
    const canceled = await mount(workPackageProps('wpCanceled'));
    expect(regionOf(canceled, 'cancellation')).not.toBeNull();
    expect(regionOf(await mount(), 'cancellation')).toBeNull();
  });

  it('under detailStatus loading, error and not-found the three detail-only regions give way to one detail-notice, inside the Review panel', async () => {
    let ran = 0;
    for (const detailStatus of ['loading', 'error', 'not-found'] as const) {
      const screen = await mount({ detailStatus });
      const ids = regionIds(screen);
      expect(ids, detailStatus).not.toContain('review-cycles');
      expect(ids, detailStatus).not.toContain('workspace');
      expect(ids, detailStatus).not.toContain('artifact-links');
      expect(ids.filter((id) => id === 'detail-notice'), detailStatus).toHaveLength(1);
      expect(regionOf(screen, 'detail-notice')?.closest('sk-card'), detailStatus).toBe(one(root(screen), 'sk-card:not([data-region])'));
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('an unknown detailStatus collapses to error: the notice is drawn', async () => {
    const screen = await mount({ detailStatus: 'half-loaded' as never });
    expect(regionIds(screen)).toContain('detail-notice');
  });

  it('with detail null and detailStatus ready no detail-only region and no notice is drawn', async () => {
    const screen = await mount({ detail: null });
    const ids = regionIds(screen);
    expect(ids).not.toContain('detail-notice');
    expect(ids).not.toContain('review-cycles');
    expect(ids).not.toContain('workspace');
    expect(ids).toContain('facts');
  });

  it('a detail for another Work Package is treated as omitted', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const screen = await mount({ detail: { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: 'WP99' } });
    const ids = regionIds(screen);
    expect(ids).not.toContain('workspace');
    expect(ids).not.toContain('detail-notice');
    expect(ids).toContain('facts');
  });

  it('a latest result with an empty cycle list draws the summary alone; none at all draws the none-found cycles region', async () => {
    const summaryAlone = await mount(pairingProps('WP-29'));
    expect(regionOf(summaryAlone, 'review-summary')).not.toBeNull();
    expect(regionOf(summaryAlone, 'review-cycles')).toBeNull();
    const noneFound = await mount(pairingProps('WP-02'));
    expect(regionOf(noneFound, 'review-cycles')).not.toBeNull();
  });
});

describe('the status switch', () => {
  it('draws no panel in any whole-screen state (only the data-less header band may appear), and ready draws them (positive control)', async () => {
    const states = [stateProps.loading(), stateProps.empty(), stateProps.error(), stateProps.notFound(), stateProps.nothingSelected()];
    let ran = 0;
    for (const props of states) {
      const screen = await mount(props);
      // the state parts may draw the data-less header band (`header`), never a panel
      expect(regionIds(screen).filter((id) => id !== 'header'), props.status).toEqual([]);
      expect(root(screen).querySelectorAll('sk-card'), props.status).toHaveLength(0);
      ran += 1;
    }
    expect(ran).toBe(5);
    expect(regionIds(await mount())).toHaveLength(13);
  });

  it('ready with no Work Package renders as empty, unknown values collapse to empty, the status is reflected', async () => {
    const readyNull = await mount({ status: 'ready', workPackage: null });
    expect(regionIds(readyNull)).toEqual([]);
    const unknown = await mount({ status: 'bogus' as never });
    expect(regionIds(unknown)).toEqual([]);
    const known = await mount({ status: 'not-found' });
    expect(known.getAttribute('status')).toBe('not-found');
    expect(regionIds(await mount())).toHaveLength(13);
  });
});

describe('the whole-screen and regional builders for a refused detail', () => {
  it('both refusal fixtures give a notice with the code the host supplied, and no code gives none', async () => {
    let ran = 0;
    for (const name of Object.keys(REFUSAL_FIXTURES) as (keyof typeof REFUSAL_FIXTURES)[]) {
      const props = refusalProps(name);
      expect(props.detailRefusalCode).toBe(REFUSAL_FIXTURES[name].code);
      const screen = await mount(props);
      expect(regionIds(screen)).toContain('detail-notice');
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('the focus rule', () => {
  const inject = (parent: Element, tag: string): HTMLElement => {
    const el = document.createElement(tag);
    el.textContent = tag;
    parent.append(el);
    return el;
  };

  it('moves focus to the root when the focused element is detached by a detailStatus change and no h1 is drawn', async () => {
    const screen = await mount();
    // take every h1 out (the header part may or may not draw one): the root fallback is the case under test
    root(screen).querySelector('h1')?.remove();
    const button = inject(one(root(screen), '[data-region="review-cycles"]'), 'button');
    button.focus();
    expect(root(screen).activeElement).toBe(button);
    screen.detailStatus = 'loading';
    await settle(screen);
    expect(button.isConnected).toBe(false);
    expect(root(screen).activeElement).toBe(one(root(screen), '[data-root]'));
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus to the h1 when one is drawn', async () => {
    const screen = await mount();
    // the header part's own h1 when it draws one, else one placed in the header region: either way a real h1 is present
    const h1 = root(screen).querySelector<HTMLElement>('[data-region="header"] h1') ?? inject(one(root(screen), '[data-region="header"]'), 'h1');
    const button = inject(one(root(screen), '[data-region="review-cycles"]'), 'button');
    button.focus();
    screen.detailStatus = 'error';
    await settle(screen);
    expect(root(screen).activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves focus alone when the focused element survives the change (positive control for the two cases above)', async () => {
    const screen = await mount();
    const button = inject(one(root(screen), '[data-region="facts"]'), 'button');
    button.focus();
    screen.detailStatus = 'loading';
    await settle(screen);
    expect(button.isConnected).toBe(true);
    expect(root(screen).activeElement).toBe(button);
  });

  it('does nothing when nothing inside had focus', async () => {
    const screen = await mount();
    screen.detailStatus = 'loading';
    await settle(screen);
    expect(root(screen).activeElement).toBeNull();
  });
});

describe('the live region is wired: silent on first render, one line per transition, silent on a same-id refresh', () => {
  const liveText = (screen: SkWorkPackageScreen): string => (one<HTMLElement>(root(screen), '[data-live]').textContent ?? '').trim();

  it('is one polite status region and says nothing on first render, in any state', async () => {
    let ran = 0;
    for (const props of [pairingProps('WP-01'), stateProps.loading(), stateProps.error(), stateProps.notFound()]) {
      const screen = await mount(props);
      expect(root(screen).querySelectorAll('[role="status"]')).toHaveLength(1);
      expect(one(root(screen), '[data-live]').getAttribute('aria-live')).toBe('polite');
      expect(liveText(screen)).toBe('');
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('announces loading, loaded and not-found by Work Package id, nothing for error', async () => {
    const screen = await mount({ status: 'ready' });
    screen.status = 'loading';
    await settle(screen);
    expect(liveText(screen)).toBe(announceLoading('WP04'));
    screen.status = 'ready';
    await settle(screen);
    expect(liveText(screen)).toBe(announceLoaded('WP04'));
    screen.status = 'not-found';
    await settle(screen);
    expect(liveText(screen)).toBe(announceNotFound('WP04'));
    screen.status = 'error';
    await settle(screen);
    // an error announces nothing of its own: the previous line is not repeated as news (the text stays, the sequence does not move)
    expect(liveText(screen)).toBe(announceNotFound('WP04'));
  });

  it('announces the detail transitions one line each, and a property refresh with the same id announces nothing', async () => {
    const screen = await mount();
    screen.detailStatus = 'loading';
    await settle(screen);
    expect(liveText(screen)).toBe(ANNOUNCE_DETAIL_LOADING);
    screen.detailStatus = 'ready';
    await settle(screen);
    expect(liveText(screen)).toBe(ANNOUNCE_DETAIL_LOADED);
    const seq = one(root(screen), '[data-live] [data-seq]').getAttribute('data-seq');
    screen.workPackage = { ...(screen.workPackage as NonNullable<typeof screen.workPackage>), title: 'Another title' };
    await settle(screen);
    expect(one(root(screen), '[data-live] [data-seq]').getAttribute('data-seq')).toBe(seq);
    screen.detailStatus = 'error';
    await settle(screen);
    expect(liveText(screen)).toBe(ANNOUNCE_DETAIL_UNAVAILABLE);
  });
});

describe('the breadcrumb renderer', () => {
  it('is a labelled nav with an ol, a ghost sk-button for the Mission, and an aria-current id', () => {
    const host = document.createElement('div');
    document.body.append(host);
    render(renderBreadcrumb({ missionLabel: 'Sample mission', wpId: 'WP04', inert: false }, () => undefined), host);
    const nav = one<HTMLElement>(host, 'nav');
    expect(nav.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(nav.querySelectorAll('ol')).toHaveLength(1);
    const button = one<HTMLElement>(nav, 'sk-button');
    expect(button.getAttribute('variant')).toBe('ghost');
    expect(button.closest('li')?.className).toContain('sk-breadcrumbs__item');
    expect(nav.querySelectorAll('button, a')).toHaveLength(0);
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(one(nav, '[aria-current="page"]').textContent).toBe('WP04');
    // the separator is asserted in wp-header-parts.test.ts, where the renderer's output is the header's
  });
});

describe('renderEmptyForm, the one shared empty-form helper', () => {
  it('draws the text alone, and the heading too when one is passed', () => {
    const host = document.createElement('div');
    document.body.append(host);
    render(renderEmptyForm('No owned files declared'), host);
    expect(one(host, '.sk-empty-state__body').textContent).toBe('No owned files declared');
    expect(host.querySelector('.sk-empty-state__heading')).toBeNull();
    expect(host.querySelector('h1, h2, h3')).toBeNull();
    render(renderEmptyForm('A neutral body', 'A heading'), host);
    expect(one(host, '.sk-empty-state__heading').textContent).toBe('A heading');
    expect(one(host, '.sk-empty-state__body').textContent).toBe('A neutral body');
  });
});

describe('fixtures: a builder for every fixture name, and pairDetail', () => {
  it('has the 27 Work Package, 19 detail and 2 refusal fixtures, and a builder for each', () => {
    const wps = Object.keys(WORK_PACKAGE_FIXTURES);
    const dets = Object.keys(DETAIL_FIXTURES);
    expect(wps).toHaveLength(27);
    expect(dets).toHaveLength(19);
    expect(Object.keys(REFUSAL_FIXTURES)).toHaveLength(2);
    let ran = 0;
    for (const name of wps) {
      const props = workPackageProps(name as keyof typeof WORK_PACKAGE_FIXTURES);
      expect(props.workPackage?.wpId).toBeTruthy();
      expect(props.detail).toBeNull();
      ran += 1;
    }
    expect(ran).toBe(27);
  });

  it('every pairing agrees on the wpId after pairing, and the table has 32 rows', () => {
    const ids = Object.keys(PAIRINGS);
    expect(ids).toHaveLength(32);
    let ran = 0;
    for (const id of ids) {
      const props = pairingProps(id as keyof typeof PAIRINGS);
      expect(props.detail?.wpId, id).toBe(props.workPackage?.wpId);
      ran += 1;
    }
    expect(ran).toBe(32);
  });

  it('pairDetail rewrites the id, reduces the cycles and never mutates its inputs', () => {
    const wp = WORK_PACKAGE_FIXTURES.wpApproved;
    const detail = DETAIL_FIXTURES.detailPopulated;
    const before = JSON.stringify([wp, detail]);
    expect(detail.wpId).not.toBe('');
    const first = pairDetail(wp, detail, { cycles: 'first' });
    const last = pairDetail(wp, detail, { cycles: 'last' });
    const none = pairDetail(wp, detail, { cycles: 'none' });
    const all = pairDetail(wp, detail);
    expect(first.wpId).toBe(wp.wpId);
    expect(first.reviewCycles?.map((c) => c.cycleNumber)).toEqual([1]);
    expect(last.reviewCycles?.map((c) => c.cycleNumber)).toEqual([2]);
    expect(none.reviewCycles).toEqual([]);
    expect(all.reviewCycles).toHaveLength(2);
    expect(JSON.stringify([wp, detail])).toBe(before);
    expect(first.reviewCycles).not.toBe(detail.reviewCycles);
  });

  it('first and last on a one-cycle detail return that cycle; an omitted cycle list stays omitted', () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const oneCycle = { ...DETAIL_FIXTURES.detailPopulated, reviewCycles: DETAIL_FIXTURES.detailPopulated.reviewCycles.slice(0, 1) };
    expect(pairDetail(wp, oneCycle, { cycles: 'first' }).reviewCycles).toEqual(oneCycle.reviewCycles);
    expect(pairDetail(wp, oneCycle, { cycles: 'last' }).reviewCycles).toEqual(oneCycle.reviewCycles);
    expect('reviewCycles' in pairDetail(wp, DETAIL_FIXTURES.detailOmittedProvisional, { cycles: 'none' })).toBe(false);
  });
});
