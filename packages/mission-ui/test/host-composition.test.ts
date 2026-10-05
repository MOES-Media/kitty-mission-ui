// A host renders both screens by passing only contract-shaped data, the host-passed branch, `now` and the
// optional `stale` and actor values, with no change to the screens and no I/O performed by them. The "host" below is
// a plain function: it takes raw contract documents (as a host would read them from the contract), adds the host-only
// values and sets properties. It never reaches into a screen's internals except to read the rendered result.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { detailImplement, pageMixed, project } from '../src/contract/fixtures.generated.js';
import type { MissionDetail, MissionOverviewPage } from '../src/contract/types.js';
import type { MissionDetailView, MissionOverviewView } from '../src/contract/types.js';
import type { SkMissionsScreen } from '../src/elements/sk-missions-screen/sk-missions-screen.js';
import type { SkPipelineScreen } from '../src/elements/sk-pipeline-screen/sk-pipeline-screen.js';
import { STALE_BADGE } from '../src/defaults/index.js';

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
