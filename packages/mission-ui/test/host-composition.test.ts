// A host renders both screens by passing only contract-shaped data, the host-passed branch, `now` and the
// optional `stale` and actor values, with no change to the screens and no I/O performed by them. The "host" below is
// a plain function: it takes raw contract documents (as a host would read them from the contract), adds the host-only
// values and sets properties. It never reaches into a screen's internals except to read the rendered result.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { detailImplement, detailPopulated, pageMixed, project, wpPopulated } from '../src/contract/fixtures.generated.js';
import type { MissionDetail, MissionOverviewPage, WorkPackage, WorkPackageDetail } from '../src/contract/types.js';
import type { MissionDetailView, MissionOverviewView } from '../src/contract/types.js';
import type { SkMissionsScreen } from '../src/elements/sk-missions-screen/sk-missions-screen.js';
import type { SkPipelineScreen } from '../src/elements/sk-pipeline-screen/sk-pipeline-screen.js';
import { STALE_BADGE } from '../src/defaults/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { pairDetail, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WorkPackageRecordView, WorkPackageDetailView } from '../src/contract/types.js';

// What a host is handed by the contract, typed as the contract documents (never as the screens' view types).
const overviewPage: MissionOverviewPage = pageMixed as unknown as MissionOverviewPage;
const detail: MissionDetail = detailImplement as unknown as MissionDetail;

/** The contract document as the host holds it, with every `stale` the example data carries removed: the host decides staleness. */
const stripStale = (items: MissionOverviewPage['items']): MissionOverviewView[] =>
  items.map((item) => {
    const copy: MissionOverviewView = { ...(item as MissionOverviewView) };
    delete copy.stale;
    return copy;
  });

const HOST_NOW = '2026-09-30T14:00:00Z';
const HOST_BRANCH = 'release/host-branch';
const HOST_ACTOR = 'host-actor';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/** Every I/O door the charter forbids to a screen; each spy records its calls, and none may be called. */
function spyOnIo(): Array<{ name: string; spy: ReturnType<typeof vi.fn> }> {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no I/O in a screen'));
  const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open');
  const getItem = vi.spyOn(Storage.prototype, 'getItem');
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const beacon = vi.spyOn(navigator, 'sendBeacon');
  const socket = vi.spyOn(globalThis, 'WebSocket').mockImplementation(() => {
    throw new Error('no I/O in a screen');
  });
  return [
    { name: 'fetch', spy: fetchSpy },
    { name: 'XMLHttpRequest.open', spy: xhr },
    { name: 'Storage.getItem', spy: getItem },
    { name: 'Storage.setItem', spy: setItem },
    { name: 'navigator.sendBeacon', spy: beacon },
    { name: 'WebSocket', spy: socket },
  ];
}

async function settle(el: HTMLElement, tags: string[]): Promise<void> {
  const ready = el as HTMLElement & { updateComplete: Promise<boolean> };
  await ready.updateComplete;
  for (const tag of tags) {
    for (const node of el.shadowRoot?.querySelectorAll(tag) ?? []) await (node as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
  }
}

describe('a host composes both screens from contract-shaped data only', () => {
  it('renders the Missions screen and the Pipeline screen with the host values and performs no I/O', async () => {
    await page.viewport(1280, 900);
    const io = spyOnIo();

    // The host adds `stale` to exactly one overview (the contract has no such field) and `branch` and `now` as screen values.
    const staleId = overviewPage.items[0]!.missionId;
    const items: MissionOverviewView[] = stripStale(overviewPage.items).map((item) => (item.missionId === staleId ? { ...item, stale: true } : item));

    const missions = document.createElement('sk-missions-screen') as SkMissionsScreen;
    Object.assign(missions, { status: 'ready', project, branch: HOST_BRANCH, missions: items, pageInfo: overviewPage.pageInfo, now: HOST_NOW });
    document.body.append(missions);
    await settle(missions, ['sk-action-row', 'sk-pill-tag', 'sk-page-header']);

    // The host adds one `actor` (the contract has no such field).
    const firstWp = detail.workPackages[0]!;
    const workPackages = detail.workPackages.map((wp) => (wp.wpId === firstWp.wpId ? { ...wp, actor: HOST_ACTOR } : wp));
    const mission = { ...detail, workPackages } as unknown as MissionDetailView;

    const pipeline = document.createElement('sk-pipeline-screen') as SkPipelineScreen;
    Object.assign(pipeline, { status: 'ready', mission });
    document.body.append(pipeline);
    await settle(pipeline, ['sk-work-package-board', 'sk-phase-bar', 'sk-metric', 'sk-button']);
    const board = pipeline.shadowRoot?.querySelector('sk-work-package-board') as HTMLElement & { updateComplete: Promise<boolean> };
    await board.updateComplete;

    // Missions screen: one row per contract item, the stale badge on exactly one, the host branch in the header.
    const rows = missions.shadowRoot?.querySelectorAll('sk-action-row') ?? [];
    expect(rows.length).toBe(overviewPage.items.length);
    const staleTags = [...(missions.shadowRoot?.querySelectorAll('sk-pill-tag') ?? [])].filter((tag) => tag.textContent?.trim() === STALE_BADGE.label);
    expect(staleTags.length).toBe(1);
    expect(missions.shadowRoot?.textContent).toContain(HOST_BRANCH);

    // Pipeline screen: one card per contract work package, the host actor on exactly one.
    const cards = board.shadowRoot?.querySelectorAll('sk-action-row') ?? [];
    expect(cards.length).toBe(detail.workPackages.length);
    const actors = [...(board.shadowRoot?.querySelectorAll('[data-actor]') ?? [])];
    expect(actors.length).toBe(1);
    expect(actors[0]!.textContent?.trim()).toBe(HOST_ACTOR);

    // No I/O: every door was watched, and none was used (the control above proves the screens rendered with the spies armed).
    expect(io.length).toBe(6);
    for (const { name, spy } of io) {
      expect(spy.mock.calls.length, `${name} was called`).toBe(0);
    }
  });

  it('positive control: the I/O spies do record a call made on the same doors', async () => {
    const io = spyOnIo();
    await expect(fetch('/probe')).rejects.toThrow();
    localStorage.getItem('probe');
    expect(io.find((entry) => entry.name === 'fetch')!.spy.mock.calls.length).toBe(1);
    expect(io.find((entry) => entry.name === 'Storage.getItem')!.spy.mock.calls.length).toBe(1);
  });

  it('a screen set to a stale host value changes only that row: dropping `stale` removes the badge', async () => {
    await page.viewport(1280, 900);
    const missions = document.createElement('sk-missions-screen') as SkMissionsScreen;
    const without = stripStale(overviewPage.items);
    const withStale: MissionOverviewView[] = without.map((item, index) => (index === 0 ? { ...item, stale: true } : item));
    Object.assign(missions, { status: 'ready', project, branch: HOST_BRANCH, missions: withStale, pageInfo: overviewPage.pageInfo, now: HOST_NOW });
    document.body.append(missions);
    await settle(missions, ['sk-action-row', 'sk-pill-tag']);
    const count = (): number => [...(missions.shadowRoot?.querySelectorAll('sk-pill-tag') ?? [])].filter((tag) => tag.textContent?.trim() === STALE_BADGE.label).length;
    expect(count()).toBe(1);
    missions.missions = without;
    await settle(missions, ['sk-action-row', 'sk-pill-tag']);
    expect(count()).toBe(0);
  });
});

// ---- The Work Package screen (SC-008) ----
const WP_EVENTS = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;
const HOST_WP_NOW = '2026-09-24T10:00:00Z';

/**
 * The host: contract documents in, properties out. The Work Package and its detail are handed over as the contract has
 * them (the detail rewritten to the Work Package's id, as a host fetching both by one id would have it); the host adds the
 * Mission, `status`, `detailStatus`, `now` and `labels`, and nothing else.
 */
function hostScreen(wp: WorkPackage, detailDoc: WorkPackage | WorkPackageDetail, extra: Record<string, unknown> = {}): { screen: SkWorkPackageScreen; box: HTMLElement } {
  const screen = document.createElement('sk-work-package-screen');
  const record = wp as unknown as WorkPackageRecordView;
  const detail = pairDetail(record, detailDoc as unknown as WorkPackageDetailView, { cycles: 'none' });
  Object.assign(screen, {
    status: 'ready',
    detailStatus: 'ready',
    wpId: wp.wpId,
    workPackage: record,
    detail,
    mission: sampleMission,
    now: HOST_WP_NOW,
    labels: { lane: (value: string) => (value === 'in_progress' ? 'Doing' : undefined) },
    ...extra,
  });
  const box = document.createElement('div');
  document.body.append(box);
  // The shell with `flush`, as the host page composes it.
  render(workPackageFrame(html`${screen}`), box);
  return { screen, box };
}

async function readyScreen(screen: SkWorkPackageScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

function routeEvents(box: HTMLElement): { seen: CustomEvent[]; routed: Record<string, unknown[]> } {
  const seen: CustomEvent[] = [];
  const routed: Record<string, unknown[]> = { 'sk-select-work-package': [], 'sk-open-mission': [], 'sk-open-artifact': [], 'sk-retry-load': [] };
  for (const name of WP_EVENTS) {
    box.addEventListener(name, (event) => {
      seen.push(event as CustomEvent);
      routed[name]!.push((event as CustomEvent).detail);
    });
  }
  return { seen, routed };
}

/** Every event of the screen bubbles and is composed (a host above the shell hears it) and cannot be cancelled. */
function expectFlags(event: CustomEvent): void {
  expect(event.bubbles, event.type).toBe(true);
  expect(event.composed, event.type).toBe(true);
  expect(event.cancelable, event.type).toBe(false);
}

describe('a host composes the Work Package screen from contract-shaped data only (SC-008)', () => {
  it('routes the four events with exact payloads, exactly one per activation, and performs no I/O', async () => {
    await page.viewport(1280, 900);
    const io = spyOnIo();
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const wp = { ...wpPopulated } as unknown as WorkPackage;
    const { screen, box } = hostScreen(wp, detailPopulated as unknown as WorkPackageDetail);
    const { seen, routed } = routeEvents(box);
    await readyScreen(screen);
    const root = screen.shadowRoot as ShadowRoot;
    const click = (selector: string, index = 0): void => {
      const target = root.querySelectorAll<HTMLElement>(selector)[index];
      if (target === undefined) throw new Error(`no ${selector}`);
      target.click();
    };

    // the host's lane label reached the screen (the screen drew from the hook, not from a literal)
    expect(root.textContent).toContain('Doing');

    // positive control for the listener's reach and for "no activation, no event": nothing has been activated yet
    expect(seen).toHaveLength(0);

    click('[data-region="header"] nav li > sk-button');
    expect(seen.map((e) => e.type)).toEqual(['sk-open-mission']);
    expect(routed['sk-open-mission']).toEqual([{ missionId: sampleMission.missionId, slug: sampleMission.slug }]);
    expectFlags(seen[0]!);

    seen.length = 0;
    const dependencies = (detailPopulated as unknown as WorkPackageDetail).dependencies;
    expect(dependencies.length).toBeGreaterThan(0);
    click('[data-region="dependency-chain"] sk-button');
    expect(seen).toHaveLength(1);
    expect(seen[0]!.type).toBe('sk-select-work-package');
    expect(seen[0]!.detail).toEqual({ missionId: sampleMission.missionId, wpId: dependencies[0]!.wpId });
    expectFlags(seen[0]!);

    seen.length = 0;
    click('[data-region="artifact-links"] sk-button');
    expect(seen).toHaveLength(1);
    expect(seen[0]!.type).toBe('sk-open-artifact');
    const spec = (detailPopulated as unknown as WorkPackageDetail).artifactReferences.spec!;
    expect(seen[0]!.detail).toEqual({ missionId: sampleMission.missionId, path: spec.path, kind: spec.kind });
    expectFlags(seen[0]!);

    // the whole-screen retry, on a second screen in the error state
    seen.length = 0;
    const second = hostScreen(wp, detailPopulated as unknown as WorkPackageDetail, { status: 'error', workPackage: null, detail: null });
    const retryRoute = routeEvents(second.box);
    await readyScreen(second.screen);
    second.screen.shadowRoot?.querySelector<HTMLElement>('sk-button')?.click();
    expect(retryRoute.seen).toHaveLength(1);
    expect(retryRoute.seen[0]!.type).toBe('sk-retry-load');
    expect(retryRoute.seen[0]!.detail).toEqual({ missionId: sampleMission.missionId, wpId: wp.wpId, target: 'work-package' });
    expectFlags(retryRoute.seen[0]!);
    // nothing else was routed anywhere
    expect(seen).toHaveLength(0);

    // no I/O: every door was watched and none was used
    expect(io.length).toBe(6);
    for (const { name, spy } of io) expect(spy.mock.calls.length, `${name} was called`).toBe(0);
    expect(timer.mock.calls.length, 'setTimeout was called').toBe(0);
  });

  it('positive control: the spies, the timer spy included, record a deliberate call on the same doors', async () => {
    const io = spyOnIo();
    const timer = vi.spyOn(globalThis, 'setTimeout');
    await expect(fetch('/probe')).rejects.toThrow();
    new XMLHttpRequest().open('GET', '/probe');
    localStorage.setItem('probe', '1');
    expect(() => new WebSocket('ws://probe.invalid')).toThrow();
    setTimeout(() => undefined, 0);
    for (const { name, spy } of io) {
      if (name === 'Storage.getItem' || name === 'navigator.sendBeacon') continue;
      expect(spy.mock.calls.length, name).toBe(1);
    }
    expect(timer.mock.calls.length).toBe(1);
  });

  it('no activation, no event: a screen with no Mission shows an inert crumb that routes nothing, while the same listener hears the control on a screen with a Mission', async () => {
    await page.viewport(1280, 900);
    const wp = { ...wpPopulated } as unknown as WorkPackage;
    const inert = hostScreen(wp, detailPopulated as unknown as WorkPackageDetail, { mission: null });
    const heard = routeEvents(inert.box);
    await readyScreen(inert.screen);
    inert.screen.shadowRoot?.querySelector<HTMLElement>('[data-region="header"] nav li > sk-button')?.click();
    expect(heard.seen).toHaveLength(0);
    const live = hostScreen(wp, detailPopulated as unknown as WorkPackageDetail);
    const liveHeard = routeEvents(live.box);
    await readyScreen(live.screen);
    live.screen.shadowRoot?.querySelector<HTMLElement>('[data-region="header"] nav li > sk-button')?.click();
    expect(liveHeard.seen).toHaveLength(1);
  });
});
