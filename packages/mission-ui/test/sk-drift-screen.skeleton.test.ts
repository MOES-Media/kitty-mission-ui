// The skeleton of the Drift screen (IC-03b): one test per event, the layout cases, the status switch, the focus rule, the live
// region, the copy-result rule and the shared parts. The dispatch methods are `protected` members of the screen and the tests
// reach them through a type cast; NO test-only template hook exists and nothing is added to the shipped surface. Every part body
// except `panel-parts.ts` is a stub in this work package, so the screen draws no controls: the handlers are called here the way
// the later parts will call them.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { renderPanel } from '../src/elements/sk-drift-screen/panel-parts.js';
import * as headerParts from '../src/elements/sk-drift-screen/header-parts.js';
import * as listParts from '../src/elements/sk-drift-screen/list-parts.js';
import * as stateParts from '../src/elements/sk-drift-screen/state-parts.js';
import * as detailParts from '../src/elements/sk-drift-screen/detail-parts.js';
import * as tableParts from '../src/elements/sk-drift-screen/table-parts.js';
import * as resolutionParts from '../src/elements/sk-drift-screen/resolution-parts.js';
import * as panelParts from '../src/elements/sk-drift-screen/panel-parts.js';
import {
  DRIFT_REFUSAL_FIXTURES,
  DRIFT_REPORT_FIXTURES,
  bulkProps,
  driftFrame,
  driftNow,
  longSlugMissionId,
  pairReport,
  refusalProps,
  report1000,
  reportProps,
  scopedMissionId,
  stateProps,
  unlistedMissionId,
} from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { COPY_RESULT_TEXT, DRIFT_LOADING_LABEL, DRIFT_NOT_FOUND_HEADING, READY_ANNOUNCEMENT, RESCANNED_TEXT, ERROR_ANNOUNCEMENT, DRIFT_REFUSAL_GENERIC, REFUSAL_WORDS } from '../src/defaults/index.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';
import type { DriftFindingKey } from '../src/contract/types.js';

interface Handlers {
  selectFinding(key: DriftFindingKey): void;
  rescanDrift(): void;
  copyCommand(): void;
  openMission(): void;
  openMissions(): void;
  retryLoad(): void;
}
const handlersOf = (el: SkDriftScreen): Handlers => el as unknown as Handlers;

const EVENT_NAMES = ['sk-select-finding', 'sk-rescan-drift', 'sk-copy-command', 'sk-open-mission', 'sk-open-missions', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function setViewport(width: number): Promise<void> {
  await page.viewport(width, 900);
}

async function mount(props: Partial<DriftScreenProps> = {}, width = 1280): Promise<SkDriftScreen> {
  await setViewport(width);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

async function settle(screen: SkDriftScreen): Promise<void> {
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
// Only the screen's own wrapper ids: a part may carry further `data-region` elements of its own (the detail's panels).
const OWN_REGIONS = ['header', 'list', 'head', 'truncation', 'listbox', 'detail', 'state'];
const regionIds = (screen: SkDriftScreen): string[] =>
  [...root(screen).querySelectorAll('[data-region]')].map((el) => el.getAttribute('data-region') ?? '').filter((id) => OWN_REGIONS.includes(id));
const stateOf = (screen: SkDriftScreen): string => one<HTMLElement>(root(screen), '[data-root]').getAttribute('data-state') ?? '';
const liveText = (screen: SkDriftScreen): string => (one<HTMLElement>(root(screen), '[data-live]').textContent ?? '').trim();
const liveSeq = (screen: SkDriftScreen): string | null => root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? null;

/** Every event of the screen's surface, collected on a wrapper around it. */
function listenAll(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
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

function findingAt(index: number): (typeof reportPopulated.findings)[number] {
  const found = reportPopulated.findings[index];
  if (found === undefined) throw new Error(`no finding ${index}`);
  return found;
}
const keyAt = (index: number): DriftFindingKey => {
  const f = findingAt(index);
  return { missionId: f.missionId, kind: f.kind, artifactPath: f.artifactPath };
};
const FIRST = findingAt(1);
const FIRST_KEY: DriftFindingKey = { missionId: FIRST.missionId, kind: FIRST.kind, artifactPath: FIRST.artifactPath };
const COMMAND = 'spec-kitty agent status materialize --mission sample-slug-01';

describe('events: one test per event, exactly one event with its exact payload', () => {
  it('sk-select-finding carries the key: Mission id, kind and file', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).selectFinding(FIRST_KEY);
    expectOne(events, 'sk-select-finding', { missionId: FIRST.missionId, kind: FIRST.kind, artifactPath: FIRST.artifactPath });
  });

  it('sk-select-finding copies the key: the payload is not the caller\'s object and carries no other member', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    const key = { ...FIRST_KEY, extra: 'x' } as DriftFindingKey;
    handlersOf(screen).selectFinding(key);
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).not.toBe(key);
    expect(Object.keys(events[0]?.detail as object).sort()).toEqual(['artifactPath', 'kind', 'missionId']);
  });

  it('an incoming selectedFinding change emits nothing; the dispatch method is the positive control', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    screen.selectedFinding = keyAt(2);
    await settle(screen);
    screen.selectedFinding = null;
    await settle(screen);
    expect(events).toHaveLength(0);
    handlersOf(screen).selectFinding(FIRST_KEY);
    expect(events).toHaveLength(1);
  });

  it('sk-rescan-drift carries null for the whole project and the Mission id for a scoped scan', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).rescanDrift();
    expectOne(events, 'sk-rescan-drift', { missionId: null });
    const scoped = await mount({ missionId: scopedMissionId });
    const scopedEvents = listenAll(scoped);
    handlersOf(scoped).rescanDrift();
    expectOne(scopedEvents, 'sk-rescan-drift', { missionId: scopedMissionId });
  });

  it('sk-rescan-drift emits nothing while rescanning, and one event again once the scan is over (positive control)', async () => {
    const screen = await mount({ rescanning: true });
    const events = listenAll(screen);
    handlersOf(screen).rescanDrift();
    handlersOf(screen).rescanDrift();
    expect(events).toHaveLength(0);
    screen.rescanning = false;
    await settle(screen);
    handlersOf(screen).rescanDrift();
    expectOne(events, 'sk-rescan-drift', { missionId: null });
  });

  it('sk-copy-command carries the exact command text, the Mission id and the remedy of the selected finding', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).copyCommand();
    expectOne(events, 'sk-copy-command', { text: COMMAND, missionId: FIRST.missionId, remedy: FIRST.remedy });
  });

  it('sk-copy-command emits nothing for a finding with no command (no remedy, an unknown remedy, an unlisted Mission, nothing selected), and does for the finding that has one', async () => {
    const cases: Partial<DriftScreenProps>[] = [
      { ...reportProps('reportPopulated', { select: 0 }) },
      { ...reportProps('reportUnknownRemedy', { select: 0 }) },
      { ...reportProps('reportPopulated', { select: 1, names: 'none' }) },
      { ...reportProps('reportMissionUnlisted', { select: 0 }) },
      { ...reportProps('reportPopulated', { select: 'none' }) },
    ];
    for (const props of cases) {
      const screen = await mount(props);
      const events = listenAll(screen);
      handlersOf(screen).copyCommand();
      expect(events).toHaveLength(0);
    }
    expect(cases).toHaveLength(5);
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).copyCommand();
    expect(events).toHaveLength(1);
  });

  it('sk-open-mission carries the Mission id and slug of the selected finding', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).openMission();
    expectOne(events, 'sk-open-mission', { missionId: FIRST.missionId, slug: 'sample-slug-01' });
  });

  it('sk-open-mission emits nothing without a known slug (unlisted Mission, no name map, nothing selected); the listed Mission is the positive control', async () => {
    let ran = 0;
    for (const props of [reportProps('reportMissionUnlisted', { select: 0 }), reportProps('reportPopulated', { select: 1, names: 'none' }), reportProps('reportPopulated', { select: 'none' })]) {
      const screen = await mount(props);
      const events = listenAll(screen);
      handlersOf(screen).openMission();
      expect(events).toHaveLength(0);
      ran += 1;
    }
    expect(ran).toBe(3);
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).openMission();
    expect(events).toHaveLength(1);
  });

  it('sk-open-missions carries an empty detail', async () => {
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    handlersOf(screen).openMissions();
    expectOne(events, 'sk-open-missions', {});
  });

  it('sk-retry-load carries the drift-report target and null for the whole project', async () => {
    const screen = await mount(stateProps.error());
    const events = listenAll(screen);
    handlersOf(screen).retryLoad();
    expectOne(events, 'sk-retry-load', { missionId: null, target: 'drift-report' });
  });

  it('sk-retry-load carries the scope of a scoped scan', async () => {
    const screen = await mount({ ...stateProps.error(), missionId: scopedMissionId });
    const events = listenAll(screen);
    handlersOf(screen).retryLoad();
    expectOne(events, 'sk-retry-load', { missionId: scopedMissionId, target: 'drift-report' });
  });

  it('no dispatch method emits more than one event, and no event is cancelable', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    const h = handlersOf(screen);
    h.selectFinding(FIRST_KEY);
    h.rescanDrift();
    h.copyCommand();
    h.openMission();
    h.openMissions();
    h.retryLoad();
    expect(events.map((e) => e.type)).toEqual([...EVENT_NAMES]);
    expect(events.every((e) => e.bubbles && e.composed && !e.cancelable)).toBe(true);
  });
});

describe('the part callbacks are wired to the dispatch methods: each emits exactly one event with its detail', () => {
  interface Builders {
    headerProps(state: string): { onRescan(): void };
    stateProps(state: string): { onRetry(): void; onReturnToMissions(): void };
    listProps(report: unknown, index: number): { onSelect(key: DriftFindingKey): void };
    detailProps(): { onOpenMission(): void; resolution: { onCopy(): void } };
  }
  it('onSelect, onRescan, onRetry, onReturnToMissions, onOpenMission and onCopy', async () => {
    const screen = await mount({ ...reportProps('reportPopulated', { select: 1 }), missionId: '' });
    const b = screen as unknown as Builders;
    const calls: [string, () => void, string, unknown][] = [
      ['onSelect', () => b.listProps(screen.report, 1).onSelect(FIRST_KEY), 'sk-select-finding', { ...FIRST_KEY }],
      ['onRescan', () => b.headerProps('ready').onRescan(), 'sk-rescan-drift', { missionId: null }],
      ['onRetry', () => b.stateProps('error').onRetry(), 'sk-retry-load', { missionId: null, target: 'drift-report' }],
      ['onReturnToMissions', () => b.stateProps('not-found').onReturnToMissions(), 'sk-open-missions', {}],
      ['onOpenMission', () => b.detailProps().onOpenMission(), 'sk-open-mission', { missionId: FIRST.missionId, slug: 'sample-slug-01' }],
      ['onCopy', () => b.detailProps().resolution.onCopy(), 'sk-copy-command', { text: COMMAND, missionId: FIRST.missionId, remedy: FIRST.remedy }],
    ];
    const seen = listenAll(screen);
    let ran = 0;
    for (const [name, call, type, detail] of calls) {
      seen.length = 0;
      call();
      expectOne(seen, type, detail);
      expect(name).not.toBe('');
      ran += 1;
    }
    expect(ran).toBe(6);
  });
});

describe('layout: two panes from a container width of 800, one column below it', () => {
  const layout = (screen: SkDriftScreen): HTMLElement => one<HTMLElement>(root(screen), '[data-layout]');
  const tracks = (screen: SkDriftScreen): string[] => getComputedStyle(layout(screen)).gridTemplateColumns.split(' ');

  it('two tracks at 1280 px, the list track 420 px wide, with the list border', async () => {
    const screen = await mount({}, 1280);
    expect(tracks(screen)).toHaveLength(2);
    expect(tracks(screen)[0]).toBe('420px');
    expect(one<HTMLElement>(root(screen), '[data-region="list"]').getBoundingClientRect().width).toBe(420);
    expect(getComputedStyle(one(root(screen), '[data-region="list"]')).borderInlineEndWidth).toBe('1px');
  });
  it('two tracks at 1100 px (DR-27)', async () => {
    const screen = await mount({}, 1100);
    expect(tracks(screen)).toHaveLength(2);
    expect(tracks(screen)[0]).toBe('420px');
  });
  it('one column at 800 px, the list border dropped (DR-28)', async () => {
    const screen = await mount({}, 800);
    expect(tracks(screen)).toHaveLength(1);
    expect(getComputedStyle(one(root(screen), '[data-region="list"]')).borderInlineEndWidth).toBe('0px');
  });
  it('one column at 620 px, the shell mobile state set (DR-29), and not set at 1280', async () => {
    const screen = await mount({}, 620);
    expect(tracks(screen)).toHaveLength(1);
    expect(screen.matches(':state(shell-mobile)')).toBe(true);
    expect((await mount({}, 1280)).matches(':state(shell-mobile)')).toBe(false);
  });
  it('the thresholds are 800 and 799 px of the container, not of the viewport', async () => {
    await mount({}, 1280);
    const standalone = document.createElement('sk-drift-screen');
    Object.assign(standalone, reportProps('reportPopulated', { select: 1 }));
    const box = document.createElement('div');
    document.body.append(box);
    box.append(standalone);
    let ran = 0;
    for (const [width, expected] of [[801, 2], [800, 2], [799, 1], [600, 1]] as const) {
      box.style.inlineSize = `${width}px`;
      await settle(standalone);
      expect(tracks(standalone), `${width}px`).toHaveLength(expected);
      ran += 1;
    }
    expect(ran).toBe(4);
  });
  it('every grid stack is pinned to its column: the detail pane and the layout have minmax(0, 1fr) and an unbreakable word does not widen the column', async () => {
    for (const width of [1280, 1100, 800, 620]) {
      const screen = await mount({}, width);
      const detail = one<HTMLElement>(root(screen), '[data-region="detail"]');
      const word = document.createElement('p');
      word.textContent = 'x'.repeat(600);
      word.style.whiteSpace = 'nowrap';
      detail.append(word);
      await settle(screen);
      // positive control: the word really is wider than the pane
      expect(word.scrollWidth).toBeGreaterThan(detail.getBoundingClientRect().width);
      expect(detail.getBoundingClientRect().width).toBeLessThanOrEqual(screen.getBoundingClientRect().width + 1);
      expect(getComputedStyle(detail).gridTemplateColumns.split(' ')).toHaveLength(1);
    }
  });
  it('no inner scroller: both panes stretch to their content (CP-1 ruling F-5, drift DD-23)', async () => {
    const screen = await mount({}, 1280);
    let ran = 0;
    for (const id of ['list', 'detail']) {
      const style = getComputedStyle(one(root(screen), `[data-region="${id}"]`));
      expect(style.overflowY, id).toBe('visible');
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('the status switch draws every container and region id', () => {
  it('ready draws the header, the list with its head and listbox, and the detail', async () => {
    expect(regionIds(await mount())).toEqual(['header', 'list', 'head', 'listbox', 'detail']);
  });
  it('a truncated report adds the truncation region inside the list; an untruncated one does not (positive control above)', async () => {
    const ids = regionIds(await mount(reportProps('reportTruncated', { select: 0 })));
    expect(ids).toEqual(['header', 'list', 'head', 'truncation', 'listbox', 'detail']);
  });
  it('loading, clean, error and not-found draw the header and one state region and no list', async () => {
    const cases: [DriftScreenProps, string][] = [
      [stateProps.loading(), 'loading'],
      [stateProps.empty(), 'empty'],
      [stateProps.clean(), 'empty'],
      [stateProps.error(), 'error'],
      [stateProps.notFound(), 'not-found'],
    ];
    for (const [props, state] of cases) {
      const screen = await mount(props);
      expect(regionIds(screen), state).toEqual(['header', 'state']);
      expect(stateOf(screen)).toBe(state);
    }
    expect(cases).toHaveLength(5);
    expect(stateOf(await mount())).toBe('ready');
  });
  it('an unknown status collapses to empty, except not-found; the status is reflected', async () => {
    const screen = await mount({ status: 'bogus' as never });
    expect(stateOf(screen)).toBe('empty');
    screen.status = 'not-found';
    await settle(screen);
    expect(stateOf(screen)).toBe('not-found');
    expect(screen.getAttribute('status')).toBe('not-found');
    screen.status = 'ready';
    await settle(screen);
    expect(stateOf(screen)).toBe('ready');
  });
  it('ready with a null report, or findings that are not an array, is loading and never clean (FR-008)', async () => {
    expect(stateOf(await mount({ status: 'ready', report: null }))).toBe('loading');
    const broken = { scannedAt: driftNow, findings: 'nope', truncated: false } as never;
    expect(stateOf(await mount({ status: 'ready', report: broken }))).toBe('loading');
    expect(stateOf(await mount())).toBe('ready');
  });
  it('ready with no findings is the clean state, with the report kept for its last scan', async () => {
    const screen = await mount(reportProps('reportClean', { select: 'none' }));
    expect(stateOf(screen)).toBe('empty');
    expect(regionIds(screen)).toEqual(['header', 'state']);
  });
  it('a scoped scan with a foreign finding is not loaded: the loading look (FR-009); the same report unscoped is ready (positive control)', async () => {
    expect(stateOf(await mount(reportProps('reportScopedForeign', { select: 0 })))).toBe('loading');
    expect(stateOf(await mount({ ...reportProps('reportScopedForeign', { select: 0 }), missionId: '' }))).toBe('ready');
    expect(stateOf(await mount(reportProps('reportScoped', { select: 0 })))).toBe('ready');
  });
  it('the detail region says what it holds: the finding, the choose-a-finding look, or a selection that is not in this scan', async () => {
    const detailOf = (screen: SkDriftScreen): string => one<HTMLElement>(root(screen), '[data-region="detail"]').getAttribute('data-detail') ?? '';
    expect(detailOf(await mount())).toBe('finding');
    expect(detailOf(await mount({ selectedFinding: null }))).toBe('choose');
    expect(detailOf(await mount({ selectedFinding: { missionId: 'x', kind: 'y', artifactPath: 'z' } }))).toBe('stale');
  });
  it('aria-busy follows loading only (the rescan busy state sits on the Rescan control), and the report stays drawn while rescanning (DR-21)', async () => {
    const busy = (screen: SkDriftScreen): string | null => one(root(screen), '[data-root]').getAttribute('aria-busy');
    expect(busy(await mount())).toBe('false');
    expect(busy(await mount(stateProps.loading()))).toBe('true');
    const screen = await mount({ rescanning: true });
    expect(busy(screen), 'A11Y-004: a rescan does not busy the root').toBe('false');
    expect(regionIds(screen)).toEqual(['header', 'list', 'head', 'listbox', 'detail']);
    screen.rescanning = false;
    await settle(screen);
    expect(busy(screen)).toBe('false');
  });
  it('a rescan does not remount the regions: the very same nodes stand before and after', async () => {
    const screen = await mount();
    const before = ['list', 'detail', 'listbox'].map((id) => one(root(screen), `[data-region="${id}"]`));
    screen.rescanning = true;
    await settle(screen);
    screen.report = { ...(screen.report as NonNullable<typeof screen.report>), scannedAt: '2026-10-06T09:05:00Z' };
    screen.rescanning = false;
    await settle(screen);
    const after = ['list', 'detail', 'listbox'].map((id) => one(root(screen), `[data-region="${id}"]`));
    expect(after).toEqual(before);
    after.forEach((node, i) => expect(node).toBe(before[i]));
  });
});

describe('the focus rule: focus lost to an update moves to the list, else the h1, else the root', () => {
  const inject = (parent: Element, tag: string): HTMLElement => {
    const el = document.createElement(tag);
    el.textContent = tag;
    parent.append(el);
    return el;
  };
  // A stand-in for the roving option: the stub list draws none, and the rule looks for the option that holds the tab stop.
  const injectOption = (screen: SkDriftScreen): HTMLElement => {
    // Take the real part's own options out first (the elements only, never Lit's markers): the stand-in must be the only tab stop.
    root(screen).querySelectorAll('[data-region="listbox"] [role="option"]').forEach((el) => el.remove());
    const option = inject(one(root(screen), '[data-region="listbox"]'), 'button');
    option.setAttribute('role', 'option');
    option.setAttribute('tabindex', '0');
    return option;
  };

  it('moves to the roving option when the focused element is detached and the list still stands (the detail wrapper is replaced by a new selection state)', async () => {
    const screen = await mount();
    const option = injectOption(screen);
    const doomed = inject(one(root(screen), '[data-region="detail"]'), 'button');
    doomed.focus();
    expect(root(screen).activeElement).toBe(doomed);
    screen.selectedFinding = null;
    await settle(screen);
    expect(doomed.isConnected).toBe(false);
    expect(root(screen).activeElement).toBe(option);
  });

  it('leaves focus alone when the focused element survives the same update (positive control for the case above)', async () => {
    const screen = await mount();
    const option = injectOption(screen);
    option.focus();
    screen.selectedFinding = null;
    await settle(screen);
    expect(option.isConnected).toBe(true);
    expect(root(screen).activeElement).toBe(option);
  });

  it('moves to the h1 when the list is gone and an h1 is drawn, and to the root when no h1 is drawn', async () => {
    const withH1 = await mount();
    root(withH1).querySelectorAll('h1').forEach((el) => el.remove());
    const h1 = inject(one(root(withH1), '[data-region="header"]'), 'h1');
    const doomed = inject(one(root(withH1), '[data-region="detail"]'), 'button');
    doomed.focus();
    withH1.status = 'loading';
    await settle(withH1);
    expect(doomed.isConnected).toBe(false);
    expect(root(withH1).activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');

    const bare = await mount();
    root(bare).querySelectorAll('h1').forEach((el) => el.remove());
    const doomedToo = inject(one(root(bare), '[data-region="detail"]'), 'button');
    doomedToo.focus();
    bare.status = 'loading';
    await settle(bare);
    expect(doomedToo.isConnected).toBe(false);
    expect(root(bare).activeElement).toBe(one(root(bare), '[data-root]'));
    expect(one<HTMLElement>(root(bare), '[data-root]').getAttribute('tabindex')).toBe('-1');
  });

  it('does nothing when nothing inside had focus, in the same update that detaches the list (positive control: the cases above)', async () => {
    const screen = await mount();
    screen.status = 'loading';
    await settle(screen);
    expect(root(screen).activeElement).toBeNull();
  });
});

describe('the live region: silent on first render, one line per change of what is announced', () => {
  it('is one polite status region and says nothing on first render, in any state', async () => {
    let ran = 0;
    for (const props of [reportProps('reportPopulated'), stateProps.loading(), stateProps.error(), stateProps.notFound(), stateProps.clean(), { ...reportProps('reportPopulated'), copyResult: 'copied' as const }]) {
      const screen = await mount(props);
      expect(root(screen).querySelectorAll('[role="status"]')).toHaveLength(1);
      expect(one(root(screen), '[data-live]').getAttribute('aria-live')).toBe('polite');
      expect(liveText(screen)).toBe('');
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('announces loading, then the loaded report with its count and last scan, then nothing when an equal report is set again', async () => {
    const screen = await mount({ ...reportProps('reportPopulated'), status: 'loading' });
    screen.status = 'ready';
    await settle(screen);
    expect(liveText(screen).startsWith('Drift scan loaded: 5 findings, last scan ')).toBe(true);
    expect(liveText(screen)).toBe(READY_ANNOUNCEMENT(5, liveText(screen).replace('Drift scan loaded: 5 findings, last scan ', '')));
    const seq = liveSeq(screen);
    expect(seq).not.toBeNull();
    screen.report = { ...(screen.report as NonNullable<typeof screen.report>) };
    await settle(screen);
    expect(liveSeq(screen)).toBe(seq);
    screen.status = 'loading';
    await settle(screen);
    expect(liveText(screen)).toBe(DRIFT_LOADING_LABEL);
    expect(liveSeq(screen)).not.toBe(seq);
  });

  it('announces a rescan once: a later scan time while ready, and nothing for an earlier or an equal one', async () => {
    const screen = await mount();
    const report = screen.report as NonNullable<typeof screen.report>;
    screen.report = { ...report, scannedAt: '2026-10-06T09:05:00Z' };
    await settle(screen);
    expect(liveText(screen).startsWith('Rescanned: 5 findings')).toBe(true);
    const seq = liveSeq(screen);
    screen.report = { ...report, scannedAt: '2026-10-06T09:05:00Z' };
    await settle(screen);
    expect(liveSeq(screen)).toBe(seq);
    screen.report = { ...report, scannedAt: '2026-10-06T09:01:00Z' };
    await settle(screen);
    expect(liveSeq(screen)).toBe(seq);
    expect(RESCANNED_TEXT(5, 'x').startsWith('Rescanned: 5 findings')).toBe(true);
  });

  it('announces a changed refusal text even though the state stays error, and nothing for an equal one', async () => {
    const screen = await mount({ ...stateProps.error(), refusalCode: 'drift_scan_unreadable' });
    screen.status = 'loading';
    await settle(screen);
    screen.status = 'error';
    await settle(screen);
    expect(liveText(screen)).toBe(ERROR_ANNOUNCEMENT(REFUSAL_WORDS['drift_scan_unreadable'] as string));
    const seq = liveSeq(screen);
    screen.refusalCode = 'drift_scan_unreadable';
    await settle(screen);
    expect(liveSeq(screen)).toBe(seq);
    screen.refusalCode = 'a_code_the_screen_has_never_seen';
    await settle(screen);
    expect(liveText(screen)).toBe(ERROR_ANNOUNCEMENT(DRIFT_REFUSAL_GENERIC));
    expect(liveSeq(screen)).not.toBe(seq);
    screen.errorMessage = 'The host says it with its own words.';
    await settle(screen);
    expect(liveText(screen)).toBe(ERROR_ANNOUNCEMENT('The host says it with its own words.'));
  });

  it('announces not-found once', async () => {
    const screen = await mount();
    screen.status = 'not-found';
    await settle(screen);
    expect(liveText(screen)).toBe(DRIFT_NOT_FOUND_HEADING);
  });
});

describe('the copy-result rule (FR-021): only a change observed after the press, only for the finding that was pressed', () => {
  it('a result already present at press time is stale and ignored; a changed result is announced once', async () => {
    const screen = await mount({ copyResult: 'copied' });
    handlersOf(screen).copyCommand();
    await settle(screen);
    expect(liveText(screen)).toBe('');
    screen.copyResult = null;
    await settle(screen);
    expect(liveText(screen)).toBe('');
    screen.copyResult = 'manual';
    await settle(screen);
    expect(liveText(screen)).toBe(COPY_RESULT_TEXT['manual']);
    const seq = liveSeq(screen);
    await settle(screen);
    expect(liveSeq(screen)).toBe(seq);
  });

  it('a host that resets and answers in one go (the same value again) still answers: the property was touched after the press', async () => {
    const screen = await mount({ copyResult: 'copied' });
    handlersOf(screen).copyCommand();
    screen.copyResult = null;
    screen.copyResult = 'copied';
    await settle(screen);
    expect(liveText(screen)).toBe(COPY_RESULT_TEXT['copied']);
  });

  it('no press, no answer: a result set without a press announces nothing (positive control: the same result after a press does)', async () => {
    const screen = await mount();
    screen.copyResult = 'copied';
    await settle(screen);
    expect(liveText(screen)).toBe('');
    screen.copyResult = null;
    await settle(screen);
    handlersOf(screen).copyCommand();
    screen.copyResult = 'copied';
    await settle(screen);
    expect(liveText(screen)).toBe(COPY_RESULT_TEXT['copied']);
  });

  it('is dropped when the selection changes after the press, and when the report changes', async () => {
    const screen = await mount();
    handlersOf(screen).copyCommand();
    screen.selectedFinding = keyAt(2);
    await settle(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    expect(liveText(screen)).toBe('');

    const second = await mount();
    handlersOf(second).copyCommand();
    second.report = { ...(second.report as NonNullable<typeof second.report>), scannedAt: '2026-10-06T09:09:00Z' };
    await settle(second);
    second.copyResult = 'manual';
    await settle(second);
    expect(liveText(second)).toContain('Rescanned');
    expect(liveText(second)).not.toBe(COPY_RESULT_TEXT['manual']);
  });
});

describe('the shared parts: panel-parts is complete, every other part keeps its final signature', () => {
  const names = (mod: object): string[] => Object.keys(mod).sort();

  it('lists exactly the exports of the contract, per file', () => {
    expect(names(headerParts)).toEqual(['headerStyles', 'renderHeader']);
    expect(names(listParts)).toEqual(['listStyles', 'renderHead', 'renderListbox']);
    expect(names(stateParts)).toEqual(['renderChoose', 'renderClean', 'renderError', 'renderLoading', 'renderNotFound', 'renderTruncationNote', 'stateStyles']);
    expect(names(detailParts)).toEqual(['detailStyles', 'renderDetail']);
    expect(names(tableParts)).toEqual(['renderLaneTable', 'tableStyles']);
    expect(names(resolutionParts)).toEqual(['renderResolution', 'resolutionStyles']);
    expect(names(panelParts)).toEqual(['panelStyles', 'renderPanel']);
  });

  it('renderPanel draws a section named by its eyebrow label inside an sk-card, with a data-region only when asked', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(html`${renderPanel('Authoritative side', html`<p>body</p>`, { id: 'authority' })}${renderPanel('Facts', html`<p>other</p>`)}`, box);
    const cards = [...box.querySelectorAll('sk-card')];
    expect(cards).toHaveLength(2);
    expect(cards[0]?.getAttribute('data-region')).toBe('authority');
    expect(cards[1]?.hasAttribute('data-region')).toBe(false);
    const sections = [...box.querySelectorAll('section')];
    expect(sections).toHaveLength(2);
    const labels = sections.map((s) => {
      const id = s.getAttribute('aria-labelledby') ?? '';
      const label = box.querySelector(`[id="${id}"]`);
      return [id, label?.getAttribute('slot'), label?.textContent];
    });
    expect(labels).toEqual([
      ['panel-title-authority', 'eyebrow', 'Authoritative side'],
      ['panel-title-facts', 'eyebrow', 'Facts'],
    ]);
    expect(box.querySelector('h2')).toBeNull();
    expect(box.querySelectorAll('sk-section-header')).toHaveLength(2);
  });
});

describe('fixtures: a builder for every fixture name, pairReport and the frame', () => {
  it('has the 15 report and 2 refusal fixtures, and a builder for each', () => {
    expect(Object.keys(DRIFT_REPORT_FIXTURES)).toHaveLength(15);
    expect(Object.keys(DRIFT_REFUSAL_FIXTURES)).toHaveLength(2);
    let built = 0;
    for (const name of Object.keys(DRIFT_REPORT_FIXTURES) as (keyof typeof DRIFT_REPORT_FIXTURES)[]) {
      const props = reportProps(name);
      expect(props.report, name).toBe(DRIFT_REPORT_FIXTURES[name]);
      built += 1;
    }
    expect(built).toBe(15);
    expect(refusalProps('refusalMissionNotFound').status).toBe('not-found');
    expect(refusalProps('refusalScanUnreadable').status).toBe('error');
    expect(refusalProps('refusalScanUnreadable').refusalCode).toBe('drift_scan_unreadable');
  });

  it('pairReport selects the first finding by default, any index, or none, and never mutates its input', () => {
    const report = DRIFT_REPORT_FIXTURES.reportPopulated;
    const before = JSON.stringify(report);
    expect(pairReport(report).selectedFinding?.kind).toBe(report.findings[0]?.kind);
    expect(pairReport(report, { select: 2 }).selectedFinding?.artifactPath).toBe(report.findings[2]?.artifactPath);
    expect(pairReport(report, { select: 'none' }).selectedFinding).toBeNull();
    expect(pairReport(DRIFT_REPORT_FIXTURES.reportClean).selectedFinding).toBeNull();
    expect(JSON.stringify(report)).toBe(before);
  });

  it('the name map lists every Mission of the report except the unlisted one, or nothing', () => {
    const listed = pairReport(DRIFT_REPORT_FIXTURES.reportPopulated).missions;
    expect(Object.keys(listed ?? {}).sort()).toEqual([...new Set(DRIFT_REPORT_FIXTURES.reportPopulated.findings.map((f) => f.missionId))].sort());
    expect(Object.keys(pairReport(DRIFT_REPORT_FIXTURES.reportMissionUnlisted).missions ?? {})).toEqual([]);
    expect(pairReport(DRIFT_REPORT_FIXTURES.reportMissionUnlisted).report?.findings[0]?.missionId).toBe(unlistedMissionId);
    expect(pairReport(DRIFT_REPORT_FIXTURES.reportPopulated, { names: 'none' }).missions).toBeNull();
    expect(pairReport(DRIFT_REPORT_FIXTURES.reportLongSlugMission).missions?.[longSlugMissionId]?.slug.length).toBeGreaterThan(60);
    expect(pairReport(DRIFT_REPORT_FIXTURES.reportLongSlugMission, { slug: 'x'.repeat(90) }).missions?.[longSlugMissionId]?.slug).toBe('x'.repeat(90));
  });

  it('the scoped fixtures carry their scope; the 1000-finding report is truncated and sorted as the contract says', () => {
    expect(reportProps('reportScoped').missionId).toBe(scopedMissionId);
    expect(reportProps('reportScopedForeign').missionId).toBe(scopedMissionId);
    expect(reportProps('reportPopulated').missionId).toBe('');
    const bulk = report1000();
    expect(bulk.findings).toHaveLength(1000);
    expect(bulk.truncated).toBe(true);
    expect(bulkProps().report?.findings).toHaveLength(1000);
    expect(Object.keys(bulkProps().missions ?? {})).toHaveLength(334);
  });
});
