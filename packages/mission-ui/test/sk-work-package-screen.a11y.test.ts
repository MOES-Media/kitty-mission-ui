// Accessibility and interaction contracts of the whole Work Package screen (IC-08, T053, T054, T056): the semantics table, the
// announcements table row by row, unique control names, the tab order and per-tier reachability, keyboard operation, EV-2, EV-8,
// the 200 percent large-text and 100 percent text assertions (NFR-004, US6 AC3) and the focus restoration of the detail-retry and
// dependency-node triggers. Every no-event assertion shares a listener with a real activation; every loop asserts its count.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import {
  DETAIL_FIXTURES,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  refusalProps,
  sampleMission,
  stateProps,
  workPackageFrame,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { PairingId, WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import {
  ANNOUNCE_DETAIL_LOADED,
  ANNOUNCE_DETAIL_LOADING,
  ANNOUNCE_DETAIL_UNAVAILABLE,
  BREADCRUMB_LABEL,
  CANCELLED_NOTICE_HEADING,
  DETAIL_RETRY_LABEL,
  FORCED_WORD,
  NOTHING_SELECTED_HEADING,
  OPEN_PROMPT_LABEL,
  OPEN_REVIEW_LABEL,
  OVERRIDE_HEADING,
  STALE_BADGE,
  STATE_BADGES,
  VERDICT_BADGES,
  announceLoaded,
  announceLoading,
  announceNotFound,
  dependencyNodeLabel,
  OPEN_SPEC_LABEL,
  RETURN_TO_PIPELINE_LABEL,
  REVIEW_CYCLE_ARTIFACT_KIND,
} from '../src/defaults/index.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;
const TIERS = [1280, 1100, 800, 620] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.documentElement.style.fontSize = '';
  document.body.replaceChildren();
});

async function settle(screen: SkWorkPackageScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mountPairing(id: PairingId, width = 1280, extra: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  return mount({ ...pairingProps(id), ...extra }, width);
}
async function mount(props: Partial<WpScreenProps> = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const text = (el: Element | ShadowRoot | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const q = (screen: SkWorkPackageScreen, selector: string): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>(selector)];
const one = (screen: SkWorkPackageScreen, selector: string): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>(selector);
  if (found === null) throw new Error(`no element ${selector}`);
  return found;
};
const region = (screen: SkWorkPackageScreen, id: string): HTMLElement => one(screen, `[data-region="${id}"]`);
/** The accessible name of a library button: its `label` attribute, else its text. */
const nameOf = (control: Element): string => control.getAttribute('label') ?? text(control);
const buttons = (screen: SkWorkPackageScreen): HTMLElement[] => q(screen, 'sk-button');
const live = (screen: SkWorkPackageScreen): HTMLElement => one(screen, '[data-live]');
const seqOf = (screen: SkWorkPackageScreen): number | null => {
  const seq = root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq');
  return seq === null || seq === undefined ? null : Number(seq);
};

function listen(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  const wrapper = screen.parentElement as HTMLElement;
  for (const name of EVENT_NAMES) wrapper.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
const focusRoot = (screen: SkWorkPackageScreen): void => one(screen, '[data-root]').focus();

describe('semantics (FR-031, NFR-011, SC-009): one test per row of the Semantics table', () => {
  it('h1: the ready, loading, not-found and nothing-selected states have exactly one; error and empty have none', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const cases: Array<[string, Partial<WpScreenProps>, string | null]> = [
      ['ready (the title)', {}, wp.title],
      ['loading (the id)', { ...stateProps.loading(), wpId: 'WP07' }, 'WP07'],
      ['loading with no id', { ...stateProps.loading(), wpId: '' }, NOTHING_SELECTED_HEADING],
      ['not-found (the id)', { ...stateProps.notFound(), wpId: 'WP09' }, 'WP09'],
      ['nothing-selected', stateProps.nothingSelected(), NOTHING_SELECTED_HEADING],
      ['error', { ...stateProps.error(), wpId: 'WP04' }, null],
      ['empty', stateProps.empty(), null],
    ];
    let ran = 0;
    for (const [name, props, expected] of cases) {
      const screen = await mount(props);
      const heads = q(screen, 'h1');
      expect(heads, name).toHaveLength(expected === null ? 0 : 1);
      if (expected !== null) expect(text(heads[0] ?? null), name).toBe(expected);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('panel titles are h2, each panel is a section named by its own heading, and the override sub-group is h3; the cancellation notice is a peer of the panels, an h2', async () => {
    const screen = await mountPairing('WP-49');
    const sections = q(screen, 'section');
    expect(sections.length).toBeGreaterThanOrEqual(9);
    for (const section of sections) {
      const id = section.getAttribute('aria-labelledby') ?? '';
      const heading = root(screen).getElementById(id);
      expect(heading?.localName, id).toBe('h2');
      expect(section.contains(heading), id).toBe(true);
    }
    expect(q(screen, 'h2').length).toBe(sections.length);
    expect(q(screen, 'h1')).toHaveLength(1);
    // The override heads with an h3, the cancellation notice with an h2 (paired with a screen that has neither).
    const plain = q(screen, 'h3').map((h) => text(h));
    expect(plain).not.toContain(OVERRIDE_HEADING);
    expect(plain).not.toContain(CANCELLED_NOTICE_HEADING);
    document.body.replaceChildren();
    const override = await mount({ ...pairingProps('WP-01'), workPackage: WORK_PACKAGE_FIXTURES.wpOverride, wpId: WORK_PACKAGE_FIXTURES.wpOverride.wpId, detail: null });
    expect(q(override, 'h3').map((h) => text(h))).toContain(OVERRIDE_HEADING);
    document.body.replaceChildren();
    const canceled = await mount({ ...pairingProps('WP-01'), workPackage: WORK_PACKAGE_FIXTURES.wpCanceled, wpId: WORK_PACKAGE_FIXTURES.wpCanceled.wpId, detail: null });
    expect(q(canceled, 'h2').map((h) => text(h))).toContain(CANCELLED_NOTICE_HEADING);
    expect(q(canceled, 'h3').map((h) => text(h))).not.toContain(CANCELLED_NOTICE_HEADING);
  });

  it('lists: ol for history and cycles, ul for subtasks, owned files and dependencies, dl for Facts and Workspace; the evidence chain is an ol with no control', async () => {
    const screen = await mountPairing('WP-49');
    const expected: Array<[string, string]> = [
      ['history', 'ol'],
      ['review-cycles', 'ol'],
      ['subtasks', 'ul'],
      ['owned-files', 'ul'],
      ['dependency-chain', 'ul'],
      ['facts', 'dl'],
      ['workspace', 'dl'],
      ['evidence-chain', 'ol'],
    ];
    let ran = 0;
    for (const [id, tag] of expected) {
      expect(region(screen, id).querySelectorAll(tag).length, `${id} ${tag}`).toBeGreaterThanOrEqual(1);
      ran += 1;
    }
    expect(ran).toBe(8);
    expect(region(screen, 'evidence-chain').querySelectorAll('button, a, sk-button, [tabindex], input')).toHaveLength(0);
    expect(region(screen, 'dependency-chain').querySelectorAll('sk-button').length).toBeGreaterThan(0);
  });

  it('the breadcrumb is a nav with an aria-label holding an ol; the Work Package crumb is aria-current; exactly one separator in every state that draws it (loading, not-found, ready)', async () => {
    let ran = 0;
    const cases: Array<[string, Partial<WpScreenProps>]> = [
      ['ready', {}],
      ['loading', { ...stateProps.loading(), wpId: 'WP07' }],
      ['not-found', { ...stateProps.notFound(), wpId: 'WP09' }],
    ];
    for (const [name, props] of cases) {
      const screen = await mount(props);
      const nav = one(screen, 'nav');
      expect(nav.getAttribute('aria-label'), name).toBe(BREADCRUMB_LABEL);
      expect(nav.querySelectorAll('ol'), name).toHaveLength(1);
      const items = [...nav.querySelectorAll<HTMLElement>('li')];
      expect(items, name).toHaveLength(2);
      expect(nav.querySelectorAll('[aria-current="page"]'), name).toHaveLength(1);
      // One visible separator: the library sheet draws it before the second item only; the renderer draws none of its own.
      expect(getComputedStyle(items[0] as HTMLElement, '::before').content, name).toBe('none');
      expect(getComputedStyle(items[1] as HTMLElement, '::before').content, name).toContain('/');
      expect(text(nav), name).not.toContain('/');
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('the dependency chain is a list of nodes named by dependencyNodeLabel', async () => {
    const screen = await mountPairing('WP-49');
    const detail = DETAIL_FIXTURES.detailPopulated;
    const nodes = q(screen, '[data-region="dependency-chain"] ul sk-button');
    expect(nodes).toHaveLength(detail.dependencies.length);
    expect(detail.dependencies.length).toBeGreaterThan(0);
    for (const [index, dependency] of detail.dependencies.entries()) {
      const lane = STATE_BADGES[dependency.statusLane ?? '']?.label ?? dependency.statusLane ?? '';
      expect(nameOf(nodes[index] as HTMLElement)).toBe(dependencyNodeLabel(dependency.wpId, dependency.title ?? dependency.wpId, lane));
    }
  });

  it('status is DOM text, never colour alone: lane, verdict, override, force, staleness, readiness', async () => {
    const approved = await mountPairing('WP-49');
    const approvedVerdict = WORK_PACKAGE_FIXTURES.wpApproved.review.latestResult?.verdict ?? '';
    expect(text(region(approved, 'facts'))).toContain(STATE_BADGES[WORK_PACKAGE_FIXTURES.wpApproved.statusLane ?? '']?.label ?? '?');
    expect(text(region(approved, 'review-summary'))).toContain(VERDICT_BADGES[approvedVerdict]?.label ?? '?');
    document.body.replaceChildren();
    const cases: Array<[string, keyof typeof WORK_PACKAGE_FIXTURES, string]> = [
      ['override', 'wpOverride', OVERRIDE_HEADING],
      ['staleness', 'wpStale', STALE_BADGE.label],
      ['force', 'wpHistoryRich', FORCED_WORD],
    ];
    let ran = 0;
    for (const [name, key, word] of cases) {
      const wp = WORK_PACKAGE_FIXTURES[key];
      const screen = await mount({ ...pairingProps('WP-01'), workPackage: wp, wpId: wp.wpId, detail: null });
      expect(text(root(screen)), name).toContain(word);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});

describe('announcements (FR-031): one test per row of the Announcements table, negative rows included', () => {
  it('exactly one live region: polite, role status, visually hidden, in every state', async () => {
    let ran = 0;
    for (const props of [{}, stateProps.loading(), stateProps.error(), stateProps.empty(), stateProps.notFound(), stateProps.nothingSelected()] as Partial<WpScreenProps>[]) {
      const screen = await mount(props);
      const regions = q(screen, '[role="status"], [aria-live]');
      expect(regions).toHaveLength(1);
      expect(regions[0]).toBe(live(screen));
      expect(live(screen).getAttribute('aria-live')).toBe('polite');
      expect(live(screen).getAttribute('role')).toBe('status');
      const box = live(screen).getBoundingClientRect();
      expect(box.width * box.height).toBeLessThanOrEqual(1);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('first render is silent in every state (positive control: a later transition speaks)', async () => {
    let ran = 0;
    for (const props of [{}, stateProps.loading(), stateProps.error(), stateProps.empty(), stateProps.notFound(), stateProps.nothingSelected()] as Partial<WpScreenProps>[]) {
      const screen = await mount(props);
      expect(text(live(screen))).toBe('');
      expect(seqOf(screen)).toBeNull();
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(6);
    const screen = await mount();
    screen.status = 'loading';
    await settle(screen);
    expect(text(live(screen))).not.toBe('');
  });

  it('a property refresh with the same wpId is silent (positive control: a wpId change speaks)', async () => {
    const screen = await mount({ wpId: 'WP04' });
    screen.workPackage = { ...WORK_PACKAGE_FIXTURES.wpPopulated, title: 'A refreshed title' };
    await settle(screen);
    screen.now = '2026-09-24T10:00:00Z';
    await settle(screen);
    expect(seqOf(screen)).toBeNull();
    screen.wpId = 'WP05';
    await settle(screen);
    expect(seqOf(screen)).toBe(1);
  });

  it('status to loading announces announceLoading(wpId); to ready announces announceLoaded(wpId) once, each naming the Work Package', async () => {
    const screen = await mount({ wpId: 'WP04' });
    screen.status = 'loading';
    await settle(screen);
    expect(text(live(screen))).toBe(announceLoading('WP04'));
    expect(text(live(screen))).toContain('WP04');
    expect(seqOf(screen)).toBe(1);
    screen.status = 'ready';
    await settle(screen);
    expect(text(live(screen))).toBe(announceLoaded('WP04'));
    expect(text(live(screen))).toContain('WP04');
    expect(seqOf(screen)).toBe(2);
    // Same status again, then a refresh: nothing more.
    screen.status = 'ready';
    screen.errorMessage = 'ignored while ready';
    await settle(screen);
    expect(seqOf(screen)).toBe(2);
  });

  it('a wpId change while ready announces announceLoaded(new id) once', async () => {
    const screen = await mount({ wpId: 'WP04' });
    const next = WORK_PACKAGE_FIXTURES.wpActorHandle;
    screen.workPackage = next;
    screen.wpId = next.wpId;
    await settle(screen);
    expect(text(live(screen))).toBe(announceLoaded(next.wpId));
    expect(seqOf(screen)).toBe(1);
  });

  it('status to error says nothing from the region: the assertive alert notice is the only announcer, and is not duplicated', async () => {
    const screen = await mount({ wpId: 'WP04' });
    screen.status = 'loading';
    await settle(screen);
    const before = { seq: seqOf(screen), words: text(live(screen)) };
    screen.status = 'error';
    await settle(screen);
    expect({ seq: seqOf(screen), words: text(live(screen)) }).toEqual(before);
    const notices = q(screen, 'sk-notice');
    expect(notices).toHaveLength(1);
    expect(notices[0]?.getAttribute('announce')).toBe('assertive');
    expect(q(screen, '[role="alert"], [role="status"], [aria-live]').filter((el) => el.localName !== 'sk-notice')).toHaveLength(1);
  });

  it('status to not-found announces announceNotFound(wpId)', async () => {
    const screen = await mount({ wpId: 'WP09' });
    screen.status = 'not-found';
    await settle(screen);
    expect(text(live(screen))).toBe(announceNotFound('WP09'));
    expect(seqOf(screen)).toBe(1);
  });

  it('status to empty or nothing-selected is silent (positive control: not-found speaks)', async () => {
    let ran = 0;
    for (const status of ['empty', 'nothing-selected'] as const) {
      const screen = await mount({ wpId: 'WP04' });
      screen.status = status;
      await settle(screen);
      expect(seqOf(screen), status).toBeNull();
      expect(text(live(screen)), status).toBe('');
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('detailStatus loading then ready announces ANNOUNCE_DETAIL_LOADING then ANNOUNCE_DETAIL_LOADED, one line each', async () => {
    const screen = await mount();
    screen.detailStatus = 'loading';
    await settle(screen);
    expect(text(live(screen))).toBe(ANNOUNCE_DETAIL_LOADING);
    expect(seqOf(screen)).toBe(1);
    screen.detailStatus = 'ready';
    await settle(screen);
    expect(text(live(screen))).toBe(ANNOUNCE_DETAIL_LOADED);
    expect(seqOf(screen)).toBe(2);
  });

  it('detailStatus error or not-found announces ANNOUNCE_DETAIL_UNAVAILABLE once while the regional notice carries no live role', async () => {
    let ran = 0;
    for (const detailStatus of ['error', 'not-found'] as const) {
      const screen = await mount();
      screen.detailStatus = detailStatus;
      await settle(screen);
      expect(text(live(screen)), detailStatus).toBe(ANNOUNCE_DETAIL_UNAVAILABLE);
      expect(seqOf(screen), detailStatus).toBe(1);
      const notice = region(screen, 'detail-notice').querySelector('sk-notice');
      expect(notice, detailStatus).not.toBeNull();
      expect(notice?.getAttribute('announce'), detailStatus).toBe('off');
      expect(notice?.hasAttribute('role'), detailStatus).toBe(false);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('control names and tab order (NFR-003)', () => {
  /** Every control of the screen: the library buttons that are not disabled. */
  const controls = (screen: SkWorkPackageScreen): HTMLElement[] => buttons(screen).filter((b) => !b.hasAttribute('disabled'));
  const ringed = (control: HTMLElement): boolean => control.shadowRoot?.querySelector('button')?.matches(':focus-visible') === true;

  it('no two controls share an accessible name, in the WP-28 and WP-49 compositions', async () => {
    let ran = 0;
    for (const id of ['WP-28', 'WP-49'] as const) {
      const screen = await mountPairing(id);
      const names = controls(screen).map(nameOf);
      expect(names.length, id).toBeGreaterThanOrEqual(5);
      expect(new Set(names).size, id).toBe(names.length);
      expect(names.some((n) => n.startsWith('Open review')), id).toBe(true);
      expect(names.every((n) => n !== ''), id).toBe(true);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
    // Positive control: two cycles with the same number would share a name (the number is what tells them apart).
    expect(OPEN_REVIEW_LABEL(1)).not.toBe(OPEN_REVIEW_LABEL(2));
  });

  /** The stops Tab visits inside the screen, in order, from the root; the focus must leave the screen after the last one. */
  async function tabThrough(screen: SkWorkPackageScreen): Promise<HTMLElement[]> {
    focusRoot(screen);
    const stops: HTMLElement[] = [];
    for (let i = 0; i < 60; i += 1) {
      await userEvent.tab();
      const active = root(screen).activeElement as HTMLElement | null;
      if (document.activeElement !== screen || active === null || active === one(screen, '[data-root]')) break;
      stops.push(active);
      expect(ringed(active), `${nameOf(active)} has a focus ring`).toBe(true);
      const outline = getComputedStyle(active.shadowRoot?.querySelector('button') as HTMLElement);
      expect(outline.outlineStyle).not.toBe('none');
      expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
    }
    return stops;
  }

  const expectedOrder = (screen: SkWorkPackageScreen): string[] => {
    const cycles = DETAIL_FIXTURES.detailPopulated.reviewCycles ?? [];
    return [
      sampleMission.friendlyName,
      ...cycles.filter((c) => c.artifactPath !== null).map((c) => OPEN_REVIEW_LABEL(c.cycleNumber)),
      ...q(screen, '[data-region="dependency-chain"] ul sk-button').map(nameOf),
      OPEN_SPEC_LABEL,
      OPEN_PROMPT_LABEL,
    ];
  };

  it('WP-49: Tab visits the Mission crumb, the Open review controls, the dependency nodes, Open spec and Open prompt in that order; stops equal controls; Frontmatter pills are no stops', async () => {
    const screen = await mountPairing('WP-49');
    const stops = await tabThrough(screen);
    const names = stops.map(nameOf);
    expect(names).toEqual(expectedOrder(screen));
    expect(names.length).toBe(controls(screen).length);
    expect(names.length).toBeGreaterThanOrEqual(6);
    expect(stops.some((s) => s.closest('[data-region="frontmatter"]') !== null)).toBe(false);
    expect(q(screen, '[data-region="frontmatter"] sk-pill-tag').length).toBeGreaterThan(0);
    // The tab-stop count the story tag records: the shell's own stops before the screen are not counted here.
    expect(names.length).toBe(1 + (DETAIL_FIXTURES.detailPopulated.reviewCycles ?? []).filter((c) => c.artifactPath !== null).length + DETAIL_FIXTURES.detailPopulated.dependencies.length + 2);
  });

  it('there is no trap: Shift+Tab walks back through the same stops, and Tab past the last one leaves the screen', async () => {
    const screen = await mountPairing('WP-49');
    const stops = await tabThrough(screen);
    expect(stops.length).toBeGreaterThan(2);
    // After the loop the focus left the screen (the loop stops when it did).
    expect(document.activeElement === screen && root(screen).activeElement !== null).toBe(false);
    // Walk back: from outside after the last stop, Shift+Tab lands on the last stop of the screen.
    await userEvent.tab({ shift: true });
    expect(root(screen).activeElement).toBe(stops[stops.length - 1]);
    await userEvent.tab({ shift: true });
    expect(root(screen).activeElement).toBe(stops[stops.length - 2]);
  });

  it('per tier (1280, 1100, 800, 620): the same stops in the same order, every stop reachable, visible, not zero-sized and not clipped', async () => {
    let tiers = 0;
    let order: string[] | null = null;
    for (const width of TIERS) {
      const screen = await mountPairing('WP-49', width);
      const stops = await tabThrough(screen);
      const names = stops.map(nameOf);
      order ??= names;
      expect(names, `${width}`).toEqual(order);
      expect(names.length, `${width} equals the controls shown`).toBe(controls(screen).length);
      for (const stop of stops) {
        stop.scrollIntoView({ block: 'center', inline: 'center' });
        const box = stop.getBoundingClientRect();
        expect(box.width, `${width} ${nameOf(stop)} width`).toBeGreaterThan(0);
        expect(box.height, `${width} ${nameOf(stop)} height`).toBeGreaterThan(0);
        expect(box.left, `${width} ${nameOf(stop)} left`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${width} ${nameOf(stop)} right`).toBeLessThanOrEqual(window.innerWidth + 1);
      }
      document.body.replaceChildren();
      tiers += 1;
    }
    expect(tiers).toBe(4);
    // Positive control: a control hidden at the narrow tier drops out of the Tab order, so the equality assertion would fail.
    const narrow = await mountPairing('WP-49', 620);
    const hidden = q(narrow, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement;
    hidden.style.display = 'none';
    const stops = await tabThrough(narrow);
    expect(stops.length).not.toBe(controls(narrow).length);
    expect(stops.length).toBe(controls(narrow).length - 1);
  });
});

describe('keyboard operation (NFR-003): Enter and Space operate every control kind and emit exactly its event once', () => {
  async function operate(screen: SkWorkPackageScreen, control: HTMLElement, keys: string): Promise<CustomEvent[]> {
    const seen = listen(screen);
    const inner = control.shadowRoot?.querySelector('button') as HTMLElement;
    inner.focus();
    expect(root(screen).activeElement).toBe(control);
    await userEvent.keyboard(keys);
    return seen;
  }
  function expectOne(events: CustomEvent[], type: string, detail: unknown): void {
    expect(events).toHaveLength(1);
    const [event] = events as [CustomEvent];
    expect(event.type).toBe(type);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(event.detail).toEqual(detail);
  }
  const populated = DETAIL_FIXTURES.detailPopulated;
  const named = (screen: SkWorkPackageScreen, name: string): HTMLElement => {
    const found = buttons(screen).find((b) => nameOf(b) === name);
    if (found === undefined) throw new Error(`no control ${name}`);
    return found;
  };

  it('the crumb, a dependency node, Open spec, Open prompt and an Open review control, each by Enter and by Space', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpApproved;
    const cycle = (populated.reviewCycles ?? []).find((c) => c.artifactPath !== null);
    const dependency = populated.dependencies[0];
    const references = populated.artifactReferences;
    if (cycle === undefined || dependency === undefined || references === undefined || references.spec === null || references.prompt === null) throw new Error('fixture gap');
    const cases: Array<[string, () => string, string, unknown]> = [
      ['crumb', () => sampleMission.friendlyName, 'sk-open-mission', { missionId: sampleMission.missionId, slug: sampleMission.slug }],
      [
        'node',
        () => nameOf(q(screenRef.current as SkWorkPackageScreen, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement),
        'sk-select-work-package',
        { missionId: sampleMission.missionId, wpId: dependency.wpId },
      ],
      ['spec', () => OPEN_SPEC_LABEL, 'sk-open-artifact', { missionId: sampleMission.missionId, path: references.spec?.path, kind: references.spec?.kind }],
      ['prompt', () => OPEN_PROMPT_LABEL, 'sk-open-artifact', { missionId: sampleMission.missionId, path: references.prompt?.path, kind: references.prompt?.kind }],
      ['review', () => OPEN_REVIEW_LABEL(cycle.cycleNumber), 'sk-open-artifact', { missionId: sampleMission.missionId, path: cycle.artifactPath, kind: REVIEW_CYCLE_ARTIFACT_KIND }],
    ];
    const screenRef: { current: SkWorkPackageScreen | null } = { current: null };
    let ran = 0;
    for (const [kind, nameFor, type, detail] of cases) {
      for (const keys of ['{Enter}', ' ']) {
        const screen = await mount({ ...pairingProps('WP-28'), workPackage: wp, detail: pairDetail(wp, populated) });
        screenRef.current = screen;
        expectOne(await operate(screen, named(screen, nameFor()), keys), type, detail);
        document.body.replaceChildren();
        ran += 1;
        expect(kind).not.toBe('');
      }
    }
    expect(ran).toBe(10);
  });

  it('Retry (whole screen and refused detail) and Return to Pipeline, each by Enter and by Space', async () => {
    let ran = 0;
    for (const keys of ['{Enter}', ' ']) {
      const error = await mount({ ...stateProps.error(), wpId: 'WP04' });
      expectOne(await operate(error, buttons(error)[0] as HTMLElement, keys), 'sk-retry-load', {
        target: 'work-package',
        missionId: sampleMission.missionId,
        wpId: 'WP04',
      });
      document.body.replaceChildren();
      const refused = await mount(refusalProps('detailRefusalNotFound'));
      expectOne(await operate(refused, named(refused, DETAIL_RETRY_LABEL), keys), 'sk-retry-load', {
        target: 'detail',
        missionId: sampleMission.missionId,
        wpId: WORK_PACKAGE_FIXTURES.wpPopulated.wpId,
      });
      document.body.replaceChildren();
      const notFound = await mount({ ...stateProps.notFound(), wpId: 'WP09' });
      expectOne(await operate(notFound, named(notFound, RETURN_TO_PIPELINE_LABEL), keys), 'sk-open-mission', { missionId: sampleMission.missionId, slug: sampleMission.slug });
      document.body.replaceChildren();
      ran += 3;
    }
    expect(ran).toBe(6);
  });

  it('per tier: Enter on the first dependency node emits its one event at 1280, 1100, 800 and 620', async () => {
    let tiers = 0;
    for (const width of TIERS) {
      const screen = await mountPairing('WP-49', width);
      const node = q(screen, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement;
      node.scrollIntoView({ block: 'center' });
      expectOne(await operate(screen, node, '{Enter}'), 'sk-select-work-package', { missionId: sampleMission.missionId, wpId: (populated.dependencies[0] as { wpId: string }).wpId });
      document.body.replaceChildren();
      tiers += 1;
    }
    expect(tiers).toBe(4);
  });
});

describe('EV-2 and EV-8: the screen only emits what it owns', () => {
  it('(a) an sk-select-work-package dispatched AT the screen element reaches the wrapper once as the same instance, with no other sk-* event', async () => {
    const screen = await mountPairing('WP-49');
    const seen = listen(screen);
    const injected = new CustomEvent('sk-select-work-package', { detail: { missionId: 'M', wpId: 'WP99' }, bubbles: true, composed: true });
    screen.dispatchEvent(injected);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(injected);
  });

  it('(b) the same event dispatched from INSIDE the shadow tree reaches the wrapper once as the same instance, with no other sk-* event', async () => {
    const screen = await mountPairing('WP-49');
    const seen = listen(screen);
    const injected = new CustomEvent('sk-select-work-package', { detail: { missionId: 'M', wpId: 'WP99' }, bubbles: true, composed: true });
    region(screen, 'facts').dispatchEvent(injected);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(injected);
  });

  it('positive control: a dependency-chain activation yields exactly one event with the exact payload, originating inside the screen', async () => {
    const screen = await mountPairing('WP-49');
    const seen = listen(screen);
    const node = q(screen, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement;
    node.click();
    const dependency = DETAIL_FIXTURES.detailPopulated.dependencies[0] as { wpId: string };
    expect(seen).toHaveLength(1);
    expect(seen[0]?.type).toBe('sk-select-work-package');
    expect(seen[0]?.detail).toEqual({ missionId: sampleMission.missionId, wpId: dependency.wpId });
  });

  it('EV-8: focusing, scrolling and tabbing through the screen emit nothing; a real activation does (same listener)', async () => {
    const screen = await mountPairing('WP-49');
    const seen = listen(screen);
    const first = buttons(screen)[0] as HTMLElement;
    first.shadowRoot?.querySelector('button')?.focus();
    window.scrollTo(0, 400);
    screen.scrollIntoView();
    focusRoot(screen);
    for (let i = 0; i < 8; i += 1) await userEvent.tab();
    expect(seen).toHaveLength(0);
    (q(screen, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement).click();
    expect(seen).toHaveLength(1);
  });
});

describe('NFR-004 and the 100 percent text assertions (US6 AC3, WP-44, WP-46 to WP-48)', () => {
  /** The scrollable overflow the screen causes: the host, and the document it sits in. */
  const overflow = (screen: SkWorkPackageScreen): { host: number; doc: number } => ({
    host: screen.scrollWidth - screen.clientWidth,
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  });
  const longProps = (): Partial<WpScreenProps> => ({
    ...pairingProps('WP-44'),
    workPackage: { ...WORK_PACKAGE_FIXTURES.wpLong, history: WORK_PACKAGE_FIXTURES.wpBulkHistory.history },
  });
  /** The elements whose box runs past the screen's right edge (outside the hidden live region). */
  const pastTheEdge = (screen: SkWorkPackageScreen): string[] => {
    const right = screen.getBoundingClientRect().right;
    return [...root(screen).querySelectorAll('*')]
      .filter((el) => el.closest('[data-live]') === null && el.localName !== 'h1' && el.getBoundingClientRect().right > right + 1)
      .map((el) => `${el.localName}[${el.closest('[data-region]')?.getAttribute('data-region') ?? ''}]`);
  };

  it('the measurement works: a deliberately overflowing element exceeds (positive control)', async () => {
    const screen = await mountPairing('WP-01', 800);
    expect(overflow(screen).host).toBeLessThanOrEqual(0);
    const wide = document.createElement('div');
    wide.style.width = '4000px';
    wide.style.height = '4px';
    one(screen, '[data-root]').append(wide);
    expect(overflow(screen).host).toBeGreaterThan(0);
  });

  it('200 percent root font size at 1100 and 720 px: no horizontal overflow of the content area (WP-01 pairing)', async () => {
    let ran = 0;
    document.documentElement.style.fontSize = '200%';
    for (const width of [1100, 720]) {
      const screen = await mountPairing('WP-01', width);
      document.documentElement.style.fontSize = '200%';
      await settle(screen);
      expect(Number.parseFloat(getComputedStyle(document.documentElement).fontSize), `${width}`).toBe(32);
      expect(pastTheEdge(screen), `${width}`).toEqual([]);
      expect(overflow(screen).host, `${width} host`).toBeLessThanOrEqual(0);
      expect(overflow(screen).doc, `${width} document`).toBeLessThanOrEqual(0);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('100 percent, wpLong with the 60-entry history and detailLong, at 1280, 1100, 800 and 620: nothing runs past the screen edge', async () => {
    let ran = 0;
    for (const width of TIERS) {
      const screen = await mount(longProps(), width);
      expect(q(screen, '[data-region="owned-files"] li').length, `${width} files drawn`).toBe(100);
      expect(overflow(screen).doc, `${width} document`).toBeLessThanOrEqual(0);
      expect(pastTheEdge(screen), `${width}`).toEqual([]);
      expect(overflow(screen).host, `${width} host`).toBeLessThanOrEqual(0);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('100 percent: no word wraps mid-word unless it is wider than its line box, and then only in a place the rulings name (E-21)', async () => {
    // A "word" is a run with no break opportunity (a hyphen, slash, underscore, colon or dot is one). A word on two lines was
    // broken from the inside: that is allowed for an over-long word in a Facts value, a Workspace row and a dependency node
    // (E-21 and the CP-1 ruling) and nowhere else; the title's over-long word is ellipsized instead.
    const allowed = ['[data-region="facts"]', '[data-region="assignment"]', '[data-region="frontmatter"]', '[data-region="workspace"]', '[data-region="dependency-chain"]', '[data-region="review-summary"]'];
    let screens = 0;
    let words = 0;
    let wrappedTokens = 0;
    for (const width of TIERS) {
      const screen = await mount(longProps(), width);
      const walker = document.createTreeWalker(root(screen), NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent === null || parent.closest('[data-live]') !== null) continue;
        for (const token of (node.textContent ?? '').matchAll(/\S+/g)) {
          let wrapped = false;
          for (const piece of token[0].matchAll(/[^\-_/:.]+/g)) {
            const start = (token.index ?? 0) + (piece.index ?? 0);
            const range = document.createRange();
            range.setStart(node, start);
            range.setEnd(node, start + piece[0].length);
            const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
            words += 1;
            wrapped = wrapped || lines > 1;
          }
          if (!wrapped) continue;
          const where = allowed.find((selector) => parent.closest(selector) !== null);
          expect(where, `${width}: "${token[0].slice(0, 30)}" wraps mid-word in <${parent.localName}> of ${parent.closest('[data-region]')?.getAttribute('data-region')}`).toBeDefined();
          // Such a token is longer than a normal word; a short one never qualifies.
          expect(token[0].length, `${width}: "${token[0]}" is short`).toBeGreaterThan(8);
          wrappedTokens += 1;
        }
      }
      // The title's over-long word is ellipsized with the full text as its tooltip, never wrapped.
      const title = one(screen, 'h1');
      expect(getComputedStyle(title).textOverflow).toBe('ellipsis');
      expect(title.getAttribute('title')).toBe(WORK_PACKAGE_FIXTURES.wpLong.title);
      document.body.replaceChildren();
      screens += 1;
    }
    expect(screens).toBe(4);
    expect(words).toBeGreaterThan(4 * 1000);
    // Positive control: the over-long words really do wrap in those places (an empty set would prove nothing).
    expect(wrappedTokens).toBeGreaterThan(0);
  });

  it('every pill ellipsizes instead of wrapping or leaving the screen, and still carries its full text as title and accessible name (operator ruling during WP09)', async () => {
    let pills = 0;
    let truncated = 0;
    for (const width of TIERS) {
      const screen = await mount(longProps(), width);
      for (const pill of q(screen, 'sk-pill-tag')) {
        const full = text(pill);
        expect(pill.getAttribute('title'), `${width} "${full.slice(0, 30)}"`).toBe(full);
        expect(full.length).toBeGreaterThan(0);
        const inner = pill.shadowRoot?.querySelector('.sk-pill-tag') as HTMLElement;
        const style = getComputedStyle(inner);
        expect(style.textOverflow, `${width} ${full.slice(0, 20)}`).toBe('ellipsis');
        expect(style.whiteSpace).toBe('nowrap');
        expect(style.overflow).toBe('hidden');
        expect(pill.getBoundingClientRect().right).toBeLessThanOrEqual(screen.getBoundingClientRect().right + 1);
        if (inner.scrollWidth > inner.clientWidth) truncated += 1;
        pills += 1;
      }
      document.body.replaceChildren();
    }
    expect(pills).toBeGreaterThan(4 * 15);
    // Positive control: the long texts really are cut (the check is not vacuous).
    expect(truncated).toBeGreaterThan(0);
  });

  it('the word check can fail: a control element with a word that wraps mid-word is caught (positive control)', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'width:60px;overflow-wrap:anywhere';
    box.textContent = 'Supercalifragilistic';
    document.body.append(box);
    const text0 = box.firstChild as Text;
    const range = document.createRange();
    range.setStart(text0, 0);
    range.setEnd(text0, text0.length);
    expect(new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size).toBeGreaterThan(1);
  });
});

describe('focus restoration (T056): one test per trigger', () => {
  it('a dependency node loses focus when the host swaps the Work Package: focus lands on the h1 (tabindex -1); a swap that keeps the node leaves focus on it', async () => {
    const screen = await mountPairing('WP-49');
    const node = q(screen, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement;
    node.shadowRoot?.querySelector('button')?.focus();
    expect(root(screen).activeElement).toBe(node);
    // The swap: the next Work Package has no dependencies, so the focused node is detached.
    const next = WORK_PACKAGE_FIXTURES.wpActorHandle;
    screen.workPackage = next;
    screen.detail = pairDetail(next, DETAIL_FIXTURES.detailDepsNone);
    screen.wpId = next.wpId;
    await settle(screen);
    await settle(screen);
    expect(node.isConnected).toBe(false);
    const h1 = one(screen, 'h1');
    expect(root(screen).activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
    // Negative control: a swap that KEEPS the dependency (the same one) leaves focus where it was.
    const kept = await mountPairing('WP-49');
    const keptNode = q(kept, '[data-region="dependency-chain"] ul sk-button')[0] as HTMLElement;
    keptNode.shadowRoot?.querySelector('button')?.focus();
    expect(root(kept).activeElement).toBe(keptNode);
    kept.workPackage = { ...WORK_PACKAGE_FIXTURES.wpApproved, title: 'Same dependencies, a new title' };
    await settle(kept);
    await settle(kept);
    expect(keptNode.isConnected).toBe(true);
    expect(root(kept).activeElement).toBe(keptNode);
  });

  it('the Retry of a refused detail: when it is detached by the retry, focus lands on the real h1 of the header; with no detach focus stays', async () => {
    const screen = await mount(refusalProps('detailRefusalUnreadable'));
    const retry = buttons(screen).find((b) => nameOf(b) === DETAIL_RETRY_LABEL) as HTMLElement;
    retry.shadowRoot?.querySelector('button')?.focus();
    expect(root(screen).activeElement).toBe(retry);
    screen.detailStatus = 'loading';
    await settle(screen);
    await settle(screen);
    expect(retry.isConnected).toBe(false);
    const h1 = one(screen, 'h1');
    expect(text(h1)).toBe(WORK_PACKAGE_FIXTURES.wpPopulated.title);
    expect(root(screen).activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
    // Negative control: a refusal that changes its code but keeps the control leaves focus on it.
    const stays = await mount(refusalProps('detailRefusalUnreadable'));
    const keep = buttons(stays).find((b) => nameOf(b) === DETAIL_RETRY_LABEL) as HTMLElement;
    keep.shadowRoot?.querySelector('button')?.focus();
    stays.detailRefusalCode = 'something_else';
    await settle(stays);
    await settle(stays);
    expect(keep.isConnected).toBe(true);
    expect(root(stays).activeElement).toBe(keep);
  });
});
