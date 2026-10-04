import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import * as stories from '../src/elements/sk-pipeline-screen/sk-pipeline-screen.stories.js';
import type { SkPipelineScreen, SkOpenMissionsDetail, SkViewArtifactsDetail } from '../src/elements/sk-pipeline-screen/sk-pipeline-screen.js';
import type { SkSelectWorkPackageDetail } from '../src/elements/sk-work-package-board/sk-work-package-board.js';
import type { SkMissionShell } from '../src/elements/sk-mission-shell/sk-mission-shell.js';
import {
  allComplete,
  allPending,
  badgesBoard,
  blockers,
  customGroupsMission,
  customLaneGroups,
  implementInProgress,
  longNames,
  nullAndUnknownLane,
  sevenPhases,
  shellMissionOf,
  subtaskProgress,
  threePhases,
  twoPhasesInProgress,
} from '../src/elements/sk-pipeline-screen/fixtures.js';
import { missionArgs } from '../src/elements/sk-mission-shell/fixtures.js';
import {
  BLOCKERS_LABEL,
  CURRENT_STEP_PREFIX,
  DEFAULT_LANE_GROUPS,
  INSPECTOR_LABEL,
  MISSIONS_CRUMB,
  NO_STEP_TEXT,
  PIPELINE_EMPTY_BODY,
  PIPELINE_EMPTY_HEADING,
  PIPELINE_ERROR_BODY,
  PIPELINE_ERROR_HEADING,
  PIPELINE_LOADING_LABEL,
  PIPELINE_TITLE,
  PROGRESS_LABEL,
  STATIC_NOTE,
  TARGET_BRANCH_LABEL,
  VIEW_ARTIFACTS_TEXT,
} from '../src/defaults/index.js';
import type { MissionDetailView } from '../src/contract/types.js';
import type { LabelHooks, LaneGroup } from '../src/logic/types.js';

type Args = Partial<Pick<SkPipelineScreen, 'status' | 'mission' | 'laneGroups' | 'labels' | 'errorMessage' | 'missionsHref'>>;

afterEach(async () => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
  document.documentElement.style.fontSize = '';
  vi.restoreAllMocks();
});

// The viewport is only changed when the width really differs: a viewport round trip per test floods the browser runner.
let viewportWidth = -1;
async function setViewport(width: number): Promise<void> {
  if (width === viewportWidth) return;
  viewportWidth = width;
  await page.viewport(width, 900);
}

async function settle(el: SkPipelineScreen): Promise<void> {
  await el.updateComplete;
  const board = root(el).querySelector('sk-work-package-board');
  const bar = root(el).querySelector('sk-phase-bar');
  await (board as (Element & { updateComplete?: Promise<unknown> }) | null)?.updateComplete;
  await (bar as (Element & { updateComplete?: Promise<unknown> }) | null)?.updateComplete;
}

async function mount(args: Args = {}, width = 1280): Promise<SkPipelineScreen> {
  await setViewport(width);
  const el = document.createElement('sk-pipeline-screen');
  Object.assign(el, { status: 'ready', mission: implementInProgress, missionsHref: '#crumb-target' }, args);
  const box = document.createElement('div');
  box.style.inlineSize = `${width}px`;
  box.append(el);
  document.body.append(box);
  await settle(el);
  return el;
}

// The screen inside the mission layout, as the host composes it. Returns the shell and the screen.
async function mountInShell(mission: MissionDetailView, width = 1280, extra: Args = {}): Promise<{ shell: SkMissionShell; screen: SkPipelineScreen }> {
  await setViewport(width);
  const shell = document.createElement('sk-mission-shell');
  Object.assign(shell, missionArgs, { mission: shellMissionOf(mission) });
  shell.style.blockSize = '100vh';
  const before = document.createElement('a');
  before.href = '#before';
  before.dataset.sentinel = 'before';
  before.textContent = 'before';
  const screen = document.createElement('sk-pipeline-screen');
  Object.assign(screen, { status: 'ready', mission, missionsHref: '#crumb-target' }, extra);
  const after = document.createElement('a');
  after.href = '#after';
  after.dataset.sentinel = 'after';
  after.textContent = 'after';
  shell.append(before, screen, after);
  document.body.append(shell);
  await shell.updateComplete;
  await settle(screen);
  return { shell, screen };
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
const boardOf = (el: SkPipelineScreen): HTMLElement => one<HTMLElement>(root(el), 'sk-work-package-board');
const boardRoot = (el: SkPipelineScreen): ShadowRoot => root(boardOf(el));
const lanesOf = (el: SkPipelineScreen): HTMLElement[] => [...boardRoot(el).querySelectorAll<HTMLElement>('section.sk-workflow-lane')];
const laneCounts = (el: SkPipelineScreen): string[] => lanesOf(el).map((lane) => lane.querySelector('[data-lane-count]')?.textContent?.trim() ?? '');
const cards = (el: SkPipelineScreen): HTMLElement[] => [...boardRoot(el).querySelectorAll<HTMLElement>('sk-action-row')];
const triggerOf = (card: HTMLElement): HTMLButtonElement => {
  const button = card.shadowRoot?.querySelector('button');
  if (!button) throw new Error('no trigger');
  return button;
};
const aside = (el: SkPipelineScreen): HTMLElement => one<HTMLElement>(root(el), 'aside');
const stepText = (el: SkPipelineScreen): string => one<HTMLElement>(aside(el), '[data-step]').textContent?.trim() ?? '';
const progressMeta = (el: SkPipelineScreen): string => one<HTMLElement>(aside(el), '.sk-progress__meta').textContent?.trim() ?? '';
const progressBar = (el: SkPipelineScreen): HTMLProgressElement => one<HTMLProgressElement>(aside(el), 'progress');
const metrics = (el: SkPipelineScreen): HTMLElement[] => [...aside(el).querySelectorAll<HTMLElement>('sk-metric')];
const crumb = (el: SkPipelineScreen): HTMLAnchorElement => one<HTMLAnchorElement>(root(el), 'a.sk-breadcrumbs__link');
const viewArtifacts = (el: SkPipelineScreen): HTMLElement => one<HTMLElement>(aside(el), 'sk-button');

function listen<T = unknown>(target: EventTarget, type: string): CustomEvent<T>[] {
  const seen: CustomEvent<T>[] = [];
  target.addEventListener(type, (event) => seen.push(event as CustomEvent<T>));
  return seen;
}

function expectEmitted<T>(events: CustomEvent<T>[], detail: T): void {
  expect(events.length).toBe(1);
  const event = events[0] as CustomEvent<T>;
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual(detail);
}

function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

describe('events', () => {
  it('View artifacts emits sk-view-artifacts once with the Mission id, and nothing else does', async () => {
    const el = await mount();
    const events = listen<SkViewArtifactsDetail>(el, 'sk-view-artifacts');
    const other = listen(el, 'sk-open-missions');
    const picked = listen(el, 'sk-select-work-package');
    const button = one<HTMLButtonElement>(viewArtifacts(el).shadowRoot as ShadowRoot, 'button');
    button.click();
    expectEmitted(events, { missionId: implementInProgress.missionId });
    expect(other.length).toBe(0);
    expect(picked.length).toBe(0);
  });

  it('every card of the badges board emits sk-select-work-package once with its own work package id', async () => {
    const el = await mount({ mission: badgesBoard });
    const all = cards(el);
    expect(all.length).toBe(5);
    const expected = badgesBoard.workPackages.map((w) => w.wpId).sort();
    let ran = 0;
    for (const card of all) {
      const events = listen<SkSelectWorkPackageDetail>(el, 'sk-select-work-package');
      const library = listen(el, 'sk-action-row-activate');
      const wpId = card.getAttribute('row-id') ?? '';
      triggerOf(card).click();
      expectEmitted(events, { missionId: badgesBoard.missionId, wpId });
      expect(library.length).toBe(0);
      events.length = 0;
      ran += 1;
    }
    expect(ran).toBe(5);
    expect(all.map((c) => c.getAttribute('row-id')).sort()).toEqual(expected);
  });

  it('control: a click on View artifacts selects no work package, and one on a card opens no artifacts', async () => {
    const el = await mount();
    const picked = listen(el, 'sk-select-work-package');
    const opened = listen(el, 'sk-view-artifacts');
    one<HTMLButtonElement>(viewArtifacts(el).shadowRoot as ShadowRoot, 'button').click();
    expect(opened.length).toBe(1);
    expect(picked.length).toBe(0);
    triggerOf(cards(el)[0] as HTMLElement).click();
    expect(picked.length).toBe(1);
    expect(opened.length).toBe(1);
  });

  it('an unmodified click on the Missions crumb emits sk-open-missions once with an empty detail and prevents the navigation', async () => {
    const el = await mount();
    const events = listen<SkOpenMissionsDetail>(el, 'sk-open-missions');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0 });
    crumb(el).dispatchEvent(click);
    expectEmitted(events, {});
    expect(click.defaultPrevented).toBe(true);
  });

  it('Enter on the focused crumb emits once', async () => {
    const el = await mount();
    const events = listen<SkOpenMissionsDetail>(el, 'sk-open-missions');
    crumb(el).focus();
    await userEvent.keyboard('{Enter}');
    expectEmitted(events, {});
  });

  it('a modified or non-primary click emits nothing and keeps the browser default (positive control: the plain click emits)', async () => {
    const el = await mount();
    const events = listen<SkOpenMissionsDetail>(el, 'sk-open-missions');
    const variants: MouseEventInit[] = [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }];
    // A synthetic modified click on an anchor really navigates (new tab or window), which would steal the runner's focus. A
    // document listener records whether the screen prevented the default, then prevents it itself so nothing opens.
    const preventedByScreen: boolean[] = [];
    const guard = (event: Event): void => {
      preventedByScreen.push(event.defaultPrevented);
      event.preventDefault();
    };
    document.addEventListener('click', guard);
    for (const init of variants) crumb(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, ...init }));
    document.removeEventListener('click', guard);
    expect(preventedByScreen).toEqual([false, false, false, false, false]);
    expect(events.length).toBe(0);
    crumb(el).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, button: 0 }));
    expect(events.length).toBe(1);
  });

  it('the crumb is a real anchor to missions-href, and #/missions by default', async () => {
    const el = await mount({ missionsHref: '#/elsewhere' });
    expect(crumb(el).getAttribute('href')).toBe('#/elsewhere');
    const plain = document.createElement('sk-pipeline-screen');
    plain.status = 'ready';
    plain.mission = implementInProgress;
    document.body.append(plain);
    await settle(plain);
    expect(crumb(plain).getAttribute('href')).toBe('#/missions');
  });
});

describe('view states', () => {
  const header = (el: SkPipelineScreen): { h1: string; crumb: string } => ({
    h1: root(el).querySelector('h1')?.textContent?.trim() ?? '',
    crumb: root(el).querySelector('a.sk-breadcrumbs__link')?.textContent?.trim() ?? '',
  });
  const bodies = (el: SkPipelineScreen): number =>
    ['sk-phase-bar', 'sk-work-package-board', 'aside'].reduce((n, selector) => n + root(el).querySelectorAll(selector).length, 0);

  it('ready renders the phase bar, the board and the inspector (positive control for the other states)', async () => {
    const el = await mount();
    expect(bodies(el)).toBe(3);
    expect(header(el)).toEqual({ h1: PIPELINE_TITLE, crumb: MISSIONS_CRUMB });
  });

  it('loading is a busy region with a labelled indeterminate progress, the header kept, and no phase bar, board or inspector', async () => {
    const el = await mount({ status: 'loading', mission: null });
    expect(bodies(el)).toBe(0);
    expect(header(el)).toEqual({ h1: PIPELINE_TITLE, crumb: MISSIONS_CRUMB });
    const busy = one<HTMLElement>(root(el), '[aria-busy="true"]');
    const bar = one<HTMLProgressElement>(busy, 'progress');
    expect(bar.hasAttribute('value')).toBe(false);
    expect(bar.labels?.[0]?.textContent?.trim()).toBe(PIPELINE_LOADING_LABEL);
  });

  it('error is an alert notice with the default body, the header kept, and nothing else', async () => {
    const el = await mount({ status: 'error', mission: null });
    expect(bodies(el)).toBe(0);
    expect(header(el).h1).toBe(PIPELINE_TITLE);
    const notice = one<HTMLElement>(root(el), 'sk-notice');
    expect(notice.getAttribute('tone')).toBe('danger');
    expect(notice.getAttribute('announce')).toBe('assertive');
    expect(notice.textContent).toContain(PIPELINE_ERROR_HEADING);
    expect(notice.textContent).toContain(PIPELINE_ERROR_BODY);
  });

  it('error shows the host message instead of the default body', async () => {
    const el = await mount({ status: 'error', mission: null, errorMessage: 'The host says no.' });
    const text = one<HTMLElement>(root(el), 'sk-notice').textContent ?? '';
    expect(text).toContain('The host says no.');
    expect(text).not.toContain(PIPELINE_ERROR_BODY);
  });

  it('empty is the empty-state panel with the confirmed copy, the header kept, and nothing else', async () => {
    const el = await mount({ status: 'empty', mission: null });
    expect(bodies(el)).toBe(0);
    expect(header(el).h1).toBe(PIPELINE_TITLE);
    const panel = one<HTMLElement>(root(el), '.sk-empty-state');
    expect(panel.querySelector('h2')?.textContent?.trim()).toBe(PIPELINE_EMPTY_HEADING);
    expect(panel.querySelector('p')?.textContent?.trim()).toBe(PIPELINE_EMPTY_BODY);
    expect(root(el).querySelector('sk-notice')).toBeNull();
  });

  it('empty uses the panel treatment of the prototype: dashed border, card chrome (E-13)', async () => {
    const el = await mount({ status: 'empty', mission: null });
    const style = getComputedStyle(one<HTMLElement>(root(el), '.sk-empty-state'));
    expect(style.borderTopStyle).toBe('dashed');
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('loading uses the panel treatment of the prototype: a solid token border and card chrome (E-13); the empty heading is in the display face', async () => {
    const el = await mount({ status: 'loading', mission: null });
    const panel = one<HTMLElement>(root(el), '.sk-empty-state');
    const style = getComputedStyle(panel);
    expect(style.borderTopStyle).toBe('solid');
    expect(style.borderTopWidth).toBe('1px');
    expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(0);
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    const display = document.createElement('div');
    display.style.fontFamily = 'var(--sk-font-display)';
    document.body.append(display);
    const face = getComputedStyle(display).fontFamily;
    display.remove();
    expect(face).not.toBe('');
    const empty = await mount({ status: 'empty', mission: null });
    expect(getComputedStyle(one<HTMLElement>(root(empty), '.sk-empty-state h2')).fontFamily).toBe(face);
  });

  it('ready with no Mission behaves as empty, and so does an unknown status', async () => {
    const none = await mount({ status: 'ready', mission: null });
    expect(bodies(none)).toBe(0);
    expect(root(none).querySelector('.sk-empty-state')).not.toBeNull();
    const unknown = await mount({ status: 'bogus' as unknown as 'ready', mission: null });
    expect(bodies(unknown)).toBe(0);
    expect(root(unknown).querySelector('.sk-empty-state')).not.toBeNull();
  });

  it('the header names the Mission and the target branch when a Mission is present, in any state', async () => {
    const el = await mount({ status: 'loading', mission: implementInProgress });
    const current = one<HTMLElement>(root(el), '[aria-current="page"]');
    expect(current.textContent?.trim()).toBe(implementInProgress.friendlyName);
    expect(one<HTMLElement>(root(el), 'sk-pill-tag').textContent?.trim()).toBe(implementInProgress.targetBranch);
    const none = await mount({ status: 'empty', mission: null });
    expect(root(none).querySelector('[aria-current="page"]')).toBeNull();
    expect(root(none).querySelector('sk-pill-tag')).toBeNull();
  });

  it('status is reflected as an attribute', async () => {
    const el = await mount({ status: 'error', mission: null });
    expect(el.getAttribute('status')).toBe('error');
  });
});

describe('ready content', () => {
  it('five phases, five columns with the counts of the Mission, a card in Review', async () => {
    const el = await mount();
    const bar = one<HTMLElement>(root(el), 'sk-phase-bar');
    expect(root(bar).querySelectorAll('li').length).toBe(5);
    expect(lanesOf(el).map((lane) => lane.querySelector('h3')?.textContent?.trim())).toEqual(DEFAULT_LANE_GROUPS.map((g) => g.label));
    expect(laneCounts(el)).toEqual(['2', '3', '1', '0', '1']);
    expect(cards(el).length).toBe(7);
    const review = lanesOf(el)[2] as HTMLElement;
    expect(review.querySelectorAll('sk-action-row').length).toBe(1);
  });

  it('the review phase is in progress because a work package is in review', async () => {
    const review = implementInProgress.phases.find((p) => p.name === 'review');
    expect(review?.status).toBe('in_progress');
    const el = await mount();
    const bar = one<HTMLElement>(root(el), 'sk-phase-bar');
    const current = [...root(bar).querySelectorAll('li[aria-current="step"]')];
    expect(current.length).toBe(1);
    expect(current[0]?.querySelector('[data-phase-label]')?.textContent?.trim()).toBe('Implement');
  });

  it('shows the work packages in service order, passing the board the Mission id', async () => {
    const el = await mount();
    expect(boardOf(el).getAttribute('mission-id')).toBe(implementInProgress.missionId);
    expect(cards(el).map((c) => c.getAttribute('row-id'))).toEqual(['WP01', 'WP02', 'WP03', 'WP04', 'WP05', 'WP07', 'WP06']);
  });

  it('current step: the next action verbatim when there is one', async () => {
    const el = await mount({ mission: allComplete });
    expect(allComplete.nextAction).not.toBeNull();
    expect(stepText(el)).toBe(allComplete.nextAction);
  });

  it('current step: "Current step: <first current phase>" when there is no next action', async () => {
    const el = await mount();
    expect(implementInProgress.nextAction).toBeNull();
    expect(stepText(el)).toBe(`${CURRENT_STEP_PREFIX}Implement`);
  });

  it('current step: the FIRST current phase when two phases are current', async () => {
    const el = await mount({ mission: twoPhasesInProgress });
    expect(twoPhasesInProgress.phases.filter((p) => p.status === 'in_progress').length).toBe(2);
    expect(stepText(el)).toBe(`${CURRENT_STEP_PREFIX}Implement`);
  });

  it('exactly one phase is the current step for assistive technology and it is the one the inspector names (C-04)', async () => {
    const el = await mount({ mission: twoPhasesInProgress });
    const bar = one<HTMLElement>(root(el), 'sk-phase-bar');
    const marked = [...root(bar).querySelectorAll('li[aria-current="step"]')];
    expect(marked).toHaveLength(1);
    const word = marked[0]?.querySelector('[data-phase-label]')?.textContent?.trim();
    expect(stepText(el)).toBe(`${CURRENT_STEP_PREFIX}${word}`);
  });

  it('current step: "No step in progress" when no phase is current and there is no next action', async () => {
    const el = await mount({ mission: allPending });
    expect(stepText(el)).toBe(NO_STEP_TEXT);
  });

  it('shows the Mission progress rounded to a whole percent while the bar keeps the given figure', async () => {
    const el = await mount();
    expect(implementInProgress.progress.weightedPercentage).toBe(17.8571);
    expect(progressMeta(el)).toBe('18%');
    expect(progressBar(el).value).toBe(17.8571);
    expect(progressBar(el).max).toBe(100);
    expect(progressBar(el).labels?.[0]?.textContent?.trim()).toBe(PROGRESS_LABEL);
    const cases: Array<[number, string]> = [
      [65, '65%'],
      [10.8333, '11%'],
      [68.4, '68%'],
      [0, '0%'],
      [100, '100%'],
    ];
    let ran = 0;
    for (const [given, shown] of cases) {
      const one8 = await mount({ mission: { ...implementInProgress, progress: { ...implementInProgress.progress, weightedPercentage: given } } });
      expect(progressMeta(one8)).toBe(shown);
      expect(progressBar(one8).value).toBe(given);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('shows the blockers count only, and the target branch, as two metrics', async () => {
    const el = await mount({ mission: blockers });
    const [blockersMetric, branchMetric] = metrics(el);
    expect(metrics(el).length).toBe(2);
    expect(blockersMetric?.getAttribute('label')).toBe(BLOCKERS_LABEL);
    expect(blockersMetric?.getAttribute('display-value')).toBe('1');
    expect(branchMetric?.getAttribute('label')).toBe(TARGET_BRANCH_LABEL);
    expect(branchMetric?.getAttribute('display-value')).toBe(blockers.targetBranch);
    expect(aside(el).textContent).not.toContain('Wait for the upstream fix');
    const zero = await mount();
    expect(metrics(zero)[0]?.getAttribute('display-value')).toBe('0');
  });

  it('shows a different target branch in the header pill and in the inspector', async () => {
    const el = await mount({ mission: { ...implementInProgress, targetBranch: 'release/9.9' } });
    expect(one<HTMLElement>(root(el), 'sk-pill-tag').textContent?.trim()).toBe('release/9.9');
    expect(metrics(el)[1]?.getAttribute('display-value')).toBe('release/9.9');
  });

  it('zero work packages: five empty columns, blockers 0, progress as given, phases as given', async () => {
    const el = await mount({ mission: allPending });
    expect(allPending.wpTotal).toBe(0);
    expect(lanesOf(el).length).toBe(5);
    expect(laneCounts(el)).toEqual(['0', '0', '0', '0', '0']);
    expect(cards(el).length).toBe(0);
    expect(metrics(el)[0]?.getAttribute('display-value')).toBe('0');
    expect(progressMeta(el)).toBe('0%');
    expect(root(one<HTMLElement>(root(el), 'sk-phase-bar')).querySelectorAll('li').length).toBe(5);
  });

  it('work packages are placed in their columns and counted', async () => {
    const counts: Array<[MissionDetailView, string[]]> = [
      [blockers, ['2', '1', '0', '0', '0']],
      [badgesBoard, ['2', '1', '1', '0', '1']],
      [subtaskProgress, ['2', '2', '2', '1', '2']],
    ];
    let ran = 0;
    for (const [mission, expected] of counts) {
      const el = await mount({ mission });
      expect(laneCounts(el)).toEqual(expected);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('a work package in each of the nine lanes fills all five columns', async () => {
    const el = await mount({ mission: subtaskProgress });
    expect(cards(el).length).toBe(9);
    for (const lane of lanesOf(el)) expect(lane.querySelectorAll('sk-action-row').length).toBeGreaterThan(0);
  });

  it('an unknown lane and a null lane land in the first column', async () => {
    const el = await mount({ mission: nullAndUnknownLane });
    expect(laneCounts(el)).toEqual(['3', '1', '0', '0', '0']);
  });
});

describe('data-driven behaviour', () => {
  it('3 phases and 7 phases render as many phases as they are given, with their raw names', async () => {
    const counts: Array<[MissionDetailView, number]> = [
      [threePhases, 3],
      [sevenPhases, 7],
    ];
    let ran = 0;
    for (const [mission, n] of counts) {
      const el = await mount({ mission });
      const items = [...root(one<HTMLElement>(root(el), 'sk-phase-bar')).querySelectorAll('li')];
      expect(items.length).toBe(n);
      expect(items.map((li) => li.querySelector('[data-phase-label]')?.textContent?.trim())).toEqual(mission.phases.map((p) => p.name));
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('custom lane groups replace the default columns and leave no default lane word', async () => {
    const el = await mount({ mission: customGroupsMission, laneGroups: customLaneGroups });
    expect(lanesOf(el).map((lane) => lane.querySelector('h3')?.textContent?.trim())).toEqual(['Intake', 'Build', 'Shipped']);
    expect(laneCounts(el)).toEqual(['2', '3', '2']);
    const text = boardRoot(el).textContent ?? '';
    for (const word of ['Planned', 'In progress', 'Approved', 'Done']) expect(text).not.toContain(word);
  });

  it('a fully foreign vocabulary: its own phases, lanes, groups and label hooks, no default word anywhere', async () => {
    const foreign: MissionDetailView = {
      ...implementInProgress,
      nextAction: null,
      phases: [
        { name: 'sketch', status: 'complete', basis: 'artifact' },
        { name: 'forge', status: 'in_progress', basis: 'artifact' },
        { name: 'launch', status: 'pending', basis: 'artifact' },
      ] as MissionDetailView['phases'],
      workPackages: [
        { ...implementInProgress.workPackages[0], wpId: 'X1', title: 'Cut the stone', statusLane: 'queued' },
        { ...implementInProgress.workPackages[0], wpId: 'X2', title: 'Polish the stone', statusLane: 'polishing' },
        { ...implementInProgress.workPackages[0], wpId: 'X3', title: 'Ship the stone', statusLane: 'shipped' },
      ] as MissionDetailView['workPackages'],
    };
    const groups: LaneGroup[] = [
      { id: 'q', label: 'Waiting', lanes: ['queued'] },
      { id: 'w', label: 'Working', lanes: ['polishing'] },
      { id: 's', label: 'Sent', lanes: ['shipped'] },
    ];
    const labels: LabelHooks = {
      phase: (name) => `P:${name}`,
      state: (lane) => (lane === null ? undefined : { label: `S:${lane}`, tone: 'info' }),
    };
    const el = await mount({ mission: foreign, laneGroups: groups, labels });
    expect(lanesOf(el).map((lane) => lane.querySelector('h3')?.textContent?.trim())).toEqual(['Waiting', 'Working', 'Sent']);
    expect(laneCounts(el)).toEqual(['1', '1', '1']);
    expect(stepText(el)).toBe(`${CURRENT_STEP_PREFIX}P:forge`);
    const phaseText = root(one<HTMLElement>(root(el), 'sk-phase-bar')).textContent ?? '';
    for (const word of ['Specify', 'Plan', 'Tasks', 'Implement', 'Review']) expect(phaseText).not.toContain(word);
    const pills = [...boardRoot(el).querySelectorAll('sk-pill-tag')].map((pill) => pill.textContent?.trim());
    expect(pills).toEqual(['S:queued', 'S:polishing', 'S:shipped']);
    const boardText = boardRoot(el).textContent ?? '';
    for (const word of ['Planned', 'In progress', 'Approved', 'Done', 'coding', 'canceled']) expect(boardText).not.toContain(word);
  });
});

describe('inspector structure and layout (E-08, E-12)', () => {
  it('is a complementary landmark named "Current step", a flat panel (no card), with the eyebrow, the folder icon and the note', async () => {
    const el = await mount();
    const side = aside(el);
    expect(side.getAttribute('aria-label')).toBe(INSPECTOR_LABEL);
    expect(side.querySelector('sk-card')).toBeNull();
    const eyebrow = one<HTMLElement>(side, '[data-eyebrow]');
    expect(eyebrow.textContent?.trim()).toBe(INSPECTOR_LABEL);
    expect(getComputedStyle(eyebrow).textTransform).toBe('uppercase');
    // Small uppercase MONO (N-6): the face is the mono token's, read off a probe, not the eyebrow's own value.
    const probe = document.createElement('div');
    probe.style.fontFamily = 'var(--sk-font-mono)';
    document.body.append(probe);
    const mono = getComputedStyle(probe).fontFamily;
    probe.remove();
    expect(mono).not.toBe('');
    expect(getComputedStyle(eyebrow).fontFamily).toBe(mono);
    expect(viewArtifacts(el).textContent?.trim()).toBe(VIEW_ARTIFACTS_TEXT);
    expect(viewArtifacts(el).querySelector('svg')).not.toBeNull();
    expect(viewArtifacts(el).getAttribute('variant')).toBe('secondary');
    expect(one<HTMLElement>(side, 'sk-notice').textContent?.trim()).toBe(STATIC_NOTE);
  });

  /** The computed value a token resolves to for a property, read off a probe element. */
  function resolved(property: 'backgroundColor' | 'borderTopColor', token: string): string {
    const probe = document.createElement('div');
    probe.style.cssText = property === 'backgroundColor' ? `background:var(${token})` : `border:1px solid var(${token})`;
    document.body.append(probe);
    const value = getComputedStyle(probe)[property];
    probe.remove();
    return value;
  }

  it('the inspector is the prototype flat full-height panel: hero background, a 1 px left border only, radius 0', async () => {
    const { screen } = await mountInShell(implementInProgress, 1280);
    const style = getComputedStyle(aside(screen));
    expect(style.backgroundColor).toBe(resolved('backgroundColor', '--sk-surface-hero'));
    expect(style.borderLeftWidth).toBe('1px');
    expect(style.borderLeftStyle).toBe('solid');
    expect(style.borderLeftColor).toBe(resolved('borderTopColor', '--sk-border-default'));
    for (const side of ['Top', 'Right', 'Bottom'] as const) expect(style[`border${side}Width`], side).toBe('0px');
    expect(style.borderTopLeftRadius).toBe('0px');
    expect(style.borderBottomRightRadius).toBe('0px');
    expect(style.boxShadow).toBe('none');
    // Full height: the panel spans the whole row beside the board.
    const row = one<HTMLElement>(root(screen), '[data-layout]').getBoundingClientRect();
    const box = aside(screen).getBoundingClientRect();
    expect(Math.abs(box.top - row.top)).toBeLessThanOrEqual(1);
    // Item 5b: it also runs on through the content padding (24 px) to the bottom edge of the column.
    expect(box.bottom - row.bottom).toBeGreaterThanOrEqual(-1);
    expect(box.bottom - row.bottom).toBeLessThanOrEqual(25);
  });

  it('the phase band has the hero background and a bottom rule (token paint)', async () => {
    const { screen } = await mountInShell(implementInProgress, 1280);
    const style = getComputedStyle(one<HTMLElement>(root(screen), '[data-phases]'));
    expect(style.backgroundColor).toBe(resolved('backgroundColor', '--sk-surface-hero'));
    expect(style.borderBottomWidth).toBe('1px');
    expect(style.borderBottomStyle).toBe('solid');
    expect(style.borderBottomColor).toBe(resolved('borderTopColor', '--sk-border-default'));
    for (const side of ['Top', 'Left', 'Right'] as const) expect(style[`border${side}Width`], side).toBe('0px');
  });

  it('the eyebrow has the prototype tracking, 0.08em (0.96 px at 12 px)', async () => {
    const el = await mount();
    const style = getComputedStyle(one<HTMLElement>(aside(el), '[data-eyebrow]'));
    expect(style.fontSize).toBe('12px');
    expect(style.letterSpacing).toBe('0.96px');
  });

  it('View artifacts is a content-width outlined button, not full width and not borderless', async () => {
    const { screen } = await mountInShell(implementInProgress, 1280);
    const button = viewArtifacts(screen);
    const inner = one<HTMLElement>(root(button), 'button');
    const width = button.getBoundingClientRect().width;
    expect(width).toBeGreaterThan(40);
    expect(width).toBeLessThan(aside(screen).getBoundingClientRect().width * 0.8);
    expect(parseFloat(getComputedStyle(inner).borderTopWidth)).toBeGreaterThanOrEqual(1);
    expect(getComputedStyle(inner).borderTopStyle).toBe('solid');
    expect(getComputedStyle(inner).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('the notice body uses the token text size, 14 px', async () => {
    const el = await mount();
    const body = one<HTMLElement>(root(one<HTMLElement>(aside(el), 'sk-notice')), '[part=body]');
    expect(getComputedStyle(body).fontSize).toBe('14px');
  });

  it('is 260 px wide at 1280 and sits right of the board (E-08)', async () => {
    const { screen } = await mountInShell(implementInProgress, 1280);
    const a = aside(screen).getBoundingClientRect();
    const b = boardOf(screen).getBoundingClientRect();
    expect(Math.abs(a.width - 260)).toBeLessThanOrEqual(1);
    expect(a.left).toBeGreaterThanOrEqual(b.right - 1);
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(1);
  });

  it('metric rows put the label on the left and the value on the right', async () => {
    const el = await mount();
    const side = aside(el).getBoundingClientRect();
    let ran = 0;
    for (const metric of metrics(el)) {
      const label = one<HTMLElement>(root(metric), '[part=label]').getBoundingClientRect();
      const value = one<HTMLElement>(root(metric), '[part=value]').getBoundingClientRect();
      expect(label.left).toBeLessThan(value.left);
      expect(Math.abs(label.top + label.height / 2 - (value.top + value.height / 2))).toBeLessThanOrEqual(8);
      expect(value.right).toBeGreaterThan(side.left + side.width / 2);
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('below the wrapping point the inspector sits under the board and never overlaps it', async () => {
    const widths = [1024, 800, 680, 390, 320];
    let ran = 0;
    for (const width of widths) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(implementInProgress, width);
      const a = aside(screen).getBoundingClientRect();
      const b = boardOf(screen).getBoundingClientRect();
      const apart = a.top >= b.bottom - 1 || a.left >= b.right - 1 || a.right <= b.left + 1;
      expect(apart, `${width}`).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(5);
    document.body.replaceChildren();
    const { screen } = await mountInShell(implementInProgress, 390);
    expect(aside(screen).getBoundingClientRect().top).toBeGreaterThanOrEqual(boardOf(screen).getBoundingClientRect().bottom - 1);
  });
});

describe('five lanes fit the full screen at 1280 (E-10)', () => {
  it('no horizontal scroll, no scroll region, every lane at least 96 px, board padding 24 px', async () => {
    const { screen } = await mountInShell(implementInProgress, 1280);
    const scroller = one<HTMLElement>(boardRoot(screen), '.sk-workflow-board__scroller');
    expect(scroller.scrollWidth).toBeLessThanOrEqual(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBeNull();
    expect(scroller.getAttribute('tabindex')).toBeNull();
    const lanes = lanesOf(screen);
    expect(lanes.length).toBe(5);
    for (const lane of lanes) expect(lane.getBoundingClientRect().width).toBeGreaterThanOrEqual(96);
    expect(getComputedStyle(boardOf(screen)).paddingLeft).toBe('24px');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });
});

describe('wrap-up: every lane reachable at the 1024 collapsed tier (operator ruling, 2026-10-04)', () => {
  it('five lanes beside the inspector at 1024: no overflow, the last lane and its count end inside the board', async () => {
    const { shell, screen } = await mountInShell(implementInProgress, 1024);
    expect(shell.tier).toBe('collapsed');
    const scroller = one<HTMLElement>(boardRoot(screen), '.sk-workflow-board__scroller');
    expect(scroller.scrollWidth, 'scrollWidth').toBeLessThanOrEqual(scroller.clientWidth);
    const lanes = lanesOf(screen);
    expect(lanes.length).toBe(5);
    const edge = scroller.getBoundingClientRect().right;
    const last = lanes[4] as HTMLElement;
    expect(last.getBoundingClientRect().right, 'last lane').toBeLessThanOrEqual(edge);
    expect(one<HTMLElement>(last, '[data-lane-count]').getBoundingClientRect().right, 'last count').toBeLessThanOrEqual(edge);
    for (const lane of lanes) expect(lane.getBoundingClientRect().width).toBeGreaterThanOrEqual(90);
    expect(aside(screen).getBoundingClientRect().left, 'inspector stays beside').toBeGreaterThanOrEqual(boardOf(screen).getBoundingClientRect().right - 1);
  });
});

describe('wrap-up: the scrolling phase band is a keyboard region with an edge fade (operator ruling, 2026-10-04)', () => {
  const bandOf = (el: SkPipelineScreen): HTMLElement => one<HTMLElement>(root(el), '[data-phases]');
  const fades = (el: SkPipelineScreen): string[] =>
    [...root(el).querySelectorAll<HTMLElement>('[data-phase-fade]')].map((fade) => fade.getAttribute('data-phase-fade') ?? '');
  const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  it('overflowing: a labelled region and a Tab stop; not overflowing: neither', async () => {
    for (const width of [390, 320]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(sevenPhases, width);
      await frame();
      await screen.updateComplete;
      const band = bandOf(screen);
      expect(band.scrollWidth, `${width} overflows`).toBeGreaterThan(band.clientWidth);
      expect(band.getAttribute('tabindex'), `${width} tabindex`).toBe('0');
      expect(band.getAttribute('role'), `${width} role`).toBe('region');
      expect((band.getAttribute('aria-label') ?? '').length, `${width} name`).toBeGreaterThan(0);
    }
    document.body.replaceChildren();
    const { screen } = await mountInShell(threePhases, 1280);
    const band = bandOf(screen);
    expect(band.scrollWidth).toBeLessThanOrEqual(band.clientWidth);
    expect(band.getAttribute('tabindex')).toBeNull();
    expect(band.getAttribute('role')).toBeNull();
    expect(fades(screen)).toEqual([]);
  });

  it('Tab reaches the band and shows a focus ring drawn from the focus token', async () => {
    const { screen } = await mountInShell(sevenPhases, 390);
    one<HTMLElement>(document, '[data-sentinel="before"]').focus();
    for (let i = 0; i < 6 && deepActive() !== bandOf(screen); i += 1) await userEvent.tab();
    expect(deepActive()).toBe(bandOf(screen));
    const ring = getComputedStyle(bandOf(screen));
    const probe = document.createElement('div');
    probe.style.borderColor = 'var(--sk-border-focus)';
    probe.style.borderStyle = 'solid';
    document.body.append(probe);
    const focusColour = getComputedStyle(probe).borderTopColor;
    probe.remove();
    expect(ring.outlineStyle).toBe('solid');
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(ring.outlineColor).toBe(focusColour);
  });

  it('the arrow keys scroll the focused band, both ways', async () => {
    const { screen } = await mountInShell(sevenPhases, 390);
    const band = bandOf(screen);
    // Keyboard scrolling is animated: wait until the position has stopped moving.
    const settled = async (): Promise<number> => {
      let last = -1;
      for (let i = 0; i < 60 && band.scrollLeft !== last; i += 1) {
        last = band.scrollLeft;
        await frame();
        await frame();
      }
      return band.scrollLeft;
    };
    band.focus();
    expect(band.scrollLeft).toBe(0);
    await userEvent.keyboard('{ArrowRight}');
    const one1 = await settled();
    expect(one1, 'first right').toBeGreaterThan(0);
    await userEvent.keyboard('{ArrowRight}');
    const two = await settled();
    expect(two, 'second right').toBeGreaterThan(one1);
    await userEvent.keyboard('{ArrowLeft}');
    const back = await settled();
    expect(back, 'left').toBeLessThan(two);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(await settled(), 'left to the start').toBe(0);
  });

  it('the edge fade shows on the side that has phases off-screen: start of scroll, middle, end', async () => {
    const { screen } = await mountInShell(sevenPhases, 390);
    const band = bandOf(screen);
    await frame();
    expect(band.scrollLeft).toBe(0);
    expect(fades(screen), 'at the start').toEqual(['end']);
    band.scrollLeft = 20;
    await frame();
    await screen.updateComplete;
    expect(fades(screen).sort(), 'in the middle').toEqual(['end', 'start']);
    band.scrollLeft = band.scrollWidth;
    await frame();
    await screen.updateComplete;
    expect(fades(screen), 'at the end').toEqual(['start']);
    band.scrollLeft = 0;
    await frame();
    await screen.updateComplete;
    expect(fades(screen), 'back at the start').toEqual(['end']);
  });

  it('the fade follows a resize: gone when the phases fit, back when they no longer do', async () => {
    const el = await mount({ mission: sevenPhases }, 390);
    const box = el.parentElement as HTMLElement;
    await frame();
    expect(fades(el)).toEqual(['end']);
    box.style.inlineSize = '2400px';
    await frame();
    await el.updateComplete;
    expect(bandOf(el).scrollWidth).toBeLessThanOrEqual(bandOf(el).clientWidth);
    expect(fades(el), 'wide').toEqual([]);
    expect(bandOf(el).getAttribute('tabindex'), 'wide tabindex').toBeNull();
    box.style.inlineSize = '390px';
    await frame();
    await el.updateComplete;
    expect(fades(el), 'narrow again').toEqual(['end']);
    expect(bandOf(el).getAttribute('tabindex')).toBe('0');
  });

  it('the fade is a token gradient that never takes a pointer or a screen reader', async () => {
    const { screen } = await mountInShell(sevenPhases, 390);
    await frame();
    const fade = one<HTMLElement>(root(screen), '[data-phase-fade]');
    const style = getComputedStyle(fade);
    expect(style.backgroundImage).toContain('linear-gradient');
    expect(style.pointerEvents).toBe('none');
    expect(fade.getAttribute('aria-hidden')).toBe('true');
    expect(bandOf(screen).contains(fade)).toBe(false);
  });
});

describe('footer and inspector agree', () => {
  const footerMeta = (shell: SkMissionShell): string => shell.shadowRoot?.querySelector('[data-footer] .sk-progress__meta')?.textContent?.trim() ?? '';

  it('for every Pipeline fixture with work packages the shell footer and the inspector show the same figure', async () => {
    const missions = [implementInProgress, allComplete, blockers, threePhases, sevenPhases, badgesBoard, subtaskProgress, twoPhasesInProgress, nullAndUnknownLane, customGroupsMission, longNames];
    let ran = 0;
    for (const mission of missions) {
      document.body.replaceChildren();
      expect(mission.wpTotal).toBeGreaterThan(0);
      const { shell, screen } = await mountInShell(mission);
      expect(footerMeta(shell)).not.toBe('');
      expect(footerMeta(shell)).toBe(progressMeta(screen));
      expect(footerMeta(shell)).toBe(`${Math.round(mission.progress.weightedPercentage)}%`);
      ran += 1;
    }
    expect(ran).toBe(11);
  });

  it('with no work packages there is no footer and the inspector shows the declared 0', async () => {
    const { shell, screen } = await mountInShell(allPending);
    expect(allPending.wpTotal).toBe(0);
    expect(shell.shadowRoot?.querySelector('[data-footer]')).toBeNull();
    expect(progressMeta(screen)).toBe('0%');
  });
});

describe('keyboard', () => {
  async function walk(screen: SkPipelineScreen): Promise<string[]> {
    const before = one<HTMLElement>(document, '[data-sentinel="before"]');
    before.focus();
    const labels: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      await userEvent.tab();
      const active = deepActive();
      if (active === null) break;
      const host = (active.getRootNode() as ShadowRoot).host as HTMLElement | undefined;
      let label = 'other';
      if (active.matches('a[data-sentinel="after"]')) {
        labels.push('after');
        break;
      }
      if (active.matches('a.sk-breadcrumbs__link')) label = 'crumb';
      else if (active.matches('[data-phases]')) label = 'phases';
      else if (active.classList.contains('sk-workflow-board__scroller')) label = 'scroll';
      else if (host?.localName === 'sk-action-row') label = host.getAttribute('row-id') ?? 'card';
      else if (host?.localName === 'sk-button' && screen.shadowRoot?.contains(host)) label = 'artifacts';
      labels.push(label);
    }
    return labels;
  }

  it('Tab order per tier: the crumb, the cards in column then card order (and the scroll region when it overflows), View artifacts', async () => {
    let ran = 0;
    for (const width of [1280, 900, 390]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(implementInProgress, width);
      const scroller = one<HTMLElement>(boardRoot(screen), '.sk-workflow-board__scroller');
      const overflowing = scroller.scrollWidth > scroller.clientWidth;
      expect(scroller.getAttribute('tabindex') === '0').toBe(overflowing);
      const order = lanesOf(screen).flatMap((lane) => [...lane.querySelectorAll('sk-action-row')].map((row) => row.getAttribute('row-id') ?? ''));
      expect(order.length).toBe(7);
      const stops = await walk(screen);
      const afterShell = stops.slice(stops.lastIndexOf('crumb'));
      // The phase band is a scroll region only while its phases are wider than the cell (it is then a stop, as the board's is).
      const band = one<HTMLElement>(root(screen), '[data-phases]');
      const bandOverflowing = band.scrollWidth > band.clientWidth;
      expect(afterShell).toEqual(['crumb', ...(bandOverflowing ? ['phases'] : []), ...(overflowing ? ['scroll'] : []), ...order, 'artifacts', 'after']);
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});

describe('long breadcrumb', () => {
  it('a long Mission name wraps inside the header instead of being clipped or scrolled', async () => {
    for (const width of [1280, 720]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(longNames, width);
      const nav = one<HTMLElement>(root(screen), 'nav.sk-breadcrumbs');
      const list = one<HTMLElement>(nav, '.sk-breadcrumbs__list');
      // The declarations themselves: overflow-wrap alone would also wrap the text, so each is pinned on its own.
      expect(getComputedStyle(list).flexWrap, `${width} flex-wrap`).toBe('wrap');
      expect(getComputedStyle(one<HTMLElement>(nav, '[aria-current="page"]')).overflowWrap, `${width} overflow-wrap`).toBe('break-word');
      const current = one<HTMLElement>(nav, '[aria-current="page"]');
      const navBox = nav.getBoundingClientRect();
      expect(list.scrollWidth, `${width} list scrolls`).toBeLessThanOrEqual(list.clientWidth);
      const range = document.createRange();
      range.selectNodeContents(current);
      for (const rect of range.getClientRects()) {
        expect(rect.right, `${width} text rect inside the breadcrumb`).toBeLessThanOrEqual(navBox.right + 1);
      }
      expect(range.getClientRects().length, `${width} wrapped onto more than one line`).toBeGreaterThanOrEqual(2);
      expect(current.textContent?.trim()).toBe(longNames.friendlyName);
    }
  });
});

describe('long content', () => {
  it('no horizontal overflow at 200% root font size, 1100 and 720 px', async () => {
    let ran = 0;
    for (const width of [1100, 720]) {
      document.body.replaceChildren();
      document.documentElement.style.fontSize = '200%';
      const { shell, screen } = await mountInShell(longNames, width);
      await shell.updateComplete;
      const content = one<HTMLElement>(shell.shadowRoot as ShadowRoot, '[data-content]');
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      expect(screen.getBoundingClientRect().width).toBeGreaterThan(0);
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('operator Storybook review: Pipeline layout (items 4 to 8)', () => {
  it('item 4: the notice text starts at the top of the info icon', async () => {
    const el = await mount();
    const notice = one<HTMLElement>(aside(el), 'sk-notice');
    const marker = one<HTMLElement>(root(notice), '[part=marker]').getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(notice);
    const first = [...range.getClientRects()][0] as DOMRect;
    expect(first).toBeDefined();
    expect(Math.abs(first.top - marker.top)).toBeLessThanOrEqual(1.5);
  });

  it('item 4: a notice that has a heading keeps its heading block', async () => {
    const el = await mount({ status: 'error', mission: null });
    const notice = one<HTMLElement>(root(el), 'sk-notice');
    const heading = one<HTMLElement>(root(notice), '[part=heading]');
    expect(getComputedStyle(heading).display).not.toBe('none');
    expect(heading.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('item 5: the inspector runs the full height of the content area, even beside a short board', async () => {
    const { shell, screen } = await mountInShell(allPending, 1280);
    // The focus sentinels of the shared helper take room in the content column; the host composes the screen alone.
    for (const sentinel of shell.querySelectorAll('[data-sentinel]')) sentinel.remove();
    await settle(screen);
    const main = one<HTMLElement>(root(shell), 'main');
    // Item 5 as amended by item 5b: the bottom edge of the column itself (the content padding is given back to the panel).
    const bottom = main.getBoundingClientRect().bottom;
    const box = aside(screen).getBoundingClientRect();
    expect(box.height).toBeGreaterThan(boardOf(screen).getBoundingClientRect().height + 100);
    expect(Math.abs(box.bottom - bottom)).toBeLessThanOrEqual(1);
  });

  for (const [name, args] of [
    ['empty', { status: 'empty', mission: null }],
    ['loading', { status: 'loading', mission: null }],
    ['error', { status: 'error', mission: null }],
  ] as const) {
    it(`item 6: the ${name} panel spans the full content width`, async () => {
      const el = await mount({ ...args });
      const panel = one<HTMLElement>(root(el), name === 'error' ? 'sk-notice' : '.sk-empty-state').getBoundingClientRect();
      const host = el.getBoundingClientRect();
      expect(Math.abs(panel.left - host.left), 'left edge').toBeLessThanOrEqual(1);
      expect(Math.abs(panel.right - host.right), 'right edge').toBeLessThanOrEqual(1);
    });
  }

  it('item 6 follow-up: the loading label and bar are centred in the panel and the panel keeps the card fill', async () => {
    const el = await mount({ status: 'loading', mission: null });
    const panel = one<HTMLElement>(root(el), '.sk-empty-state');
    const box = panel.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    // The label and the bar sit on one row; that row, label and bar together, is centred in the panel.
    const label = one<HTMLElement>(panel, '.sk-progress__label').getBoundingClientRect();
    const bar = one<HTMLElement>(panel, '.sk-progress__bar').getBoundingClientRect();
    const row = (Math.min(label.left, bar.left) + Math.max(label.right, bar.right)) / 2;
    expect(Math.abs(row - centre), 'label and bar row').toBeLessThanOrEqual(1);
    // The card fill is the surface-card token (rgb(24, 26, 31) in the dark theme the baselines use).
    const probe = document.createElement('div');
    probe.style.background = 'var(--sk-surface-card)';
    (panel.parentElement as HTMLElement).append(probe);
    const fill = getComputedStyle(probe).backgroundColor;
    probe.remove();
    expect(fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(panel).backgroundColor).toBe(fill);
  });

  it('item 7: the phase bar spans the whole phase band row, whatever the number of phases', async () => {
    for (const mission of [threePhases, implementInProgress, sevenPhases]) {
      document.body.replaceChildren();
      const el = await mount({ mission }, 1280);
      const band = one<HTMLElement>(root(el), '[data-phases]');
      const bandBox = band.getBoundingClientRect();
      const bandStyle = getComputedStyle(band);
      const bar = one<HTMLElement>(root(el), 'sk-phase-bar');
      const items = bar.shadowRoot?.querySelectorAll('ol > li') ?? [];
      const last = (items[items.length - 1] as HTMLElement).querySelector('sk-status-indicator') as HTMLElement;
      const rowRight = bandBox.right - parseFloat(bandStyle.paddingRight);
      expect(Math.abs(last.getBoundingClientRect().right - rowRight), `${mission.phases.length} phases`).toBeLessThanOrEqual(1.5);
    }
  });

  it('item 8: when the inspector sits below the board (tablet and smaller) it spans the full width', async () => {
    for (const width of [800, 680, 390, 320]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(implementInProgress, width);
      const a = aside(screen).getBoundingClientRect();
      const b = boardOf(screen).getBoundingClientRect();
      const row = one<HTMLElement>(root(screen), '[data-layout]').getBoundingClientRect();
      expect(a.top, `${width} stacked`).toBeGreaterThanOrEqual(b.bottom - 1);
      expect(Math.abs(a.width - row.width), `${width} width`).toBeLessThanOrEqual(1);
    }
  });
});

describe('operator Storybook review: inspector flush edges and stacked panel (items 5b and 8b)', () => {
  for (const width of [1280, 1024]) {
    it(`item 5b at ${width}: the inspector is flush with the bottom and right edges of the content column`, async () => {
      const { shell, screen } = await mountInShell(allPending, width);
      for (const sentinel of shell.querySelectorAll('[data-sentinel]')) sentinel.remove();
      await settle(screen);
      const content = one<HTMLElement>(root(shell), '[data-content]').getBoundingClientRect();
      const box = aside(screen).getBoundingClientRect();
      expect(Math.abs(box.bottom - content.bottom), 'bottom').toBeLessThanOrEqual(1);
      expect(Math.abs(box.right - content.right), 'right').toBeLessThanOrEqual(1);
    });
  }

  it('phase band at the wide tier: flush to both edges of the content column, level with the inspector, labels kept off the edge', async () => {
    for (const width of [1280, 1024]) {
      document.body.replaceChildren();
      const { shell, screen } = await mountInShell(allPending, width);
      for (const sentinel of shell.querySelectorAll('[data-sentinel]')) sentinel.remove();
      await settle(screen);
      const content = one<HTMLElement>(root(shell), '[data-content]').getBoundingClientRect();
      const band = one<HTMLElement>(root(screen), '[data-phases]');
      const box = band.getBoundingClientRect();
      expect(Math.abs(box.left - content.left), `${width} left`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.right - content.right), `${width} right`).toBeLessThanOrEqual(1);
      expect(Math.abs(box.right - aside(screen).getBoundingClientRect().right), `${width} level with inspector`).toBeLessThanOrEqual(1);
      expect(parseFloat(getComputedStyle(band).paddingLeft), `${width} padding`).toBeGreaterThan(0);
    }
  });

  it('phase band stacked (760 and below): unchanged, inside the content padding', async () => {
    for (const width of [760, 390]) {
      document.body.replaceChildren();
      const { shell, screen } = await mountInShell(allPending, width);
      for (const sentinel of shell.querySelectorAll('[data-sentinel]')) sentinel.remove();
      await settle(screen);
      const content = one<HTMLElement>(root(shell), '[data-content]').getBoundingClientRect();
      const box = one<HTMLElement>(root(screen), '[data-phases]').getBoundingClientRect();
      expect(box.left - content.left, `${width} left`).toBeGreaterThan(1);
      expect(content.right - box.right, `${width} right`).toBeGreaterThan(1);
    }
  });

  it('item 8b: stacked (800 and below) the inspector is a contained panel: top and bottom borders and a radius', async () => {
    for (const width of [800, 680, 390, 320]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(implementInProgress, width);
      const style = getComputedStyle(aside(screen));
      expect(parseFloat(style.borderTopWidth), `${width} top`).toBeGreaterThan(0);
      expect(parseFloat(style.borderBottomWidth), `${width} bottom`).toBeGreaterThan(0);
      expect(parseFloat(style.borderTopLeftRadius), `${width} radius`).toBeGreaterThan(0);
      expect(style.borderTopStyle).toBe('solid');
    }
  });

  it('item 8b: beside the board (1280, 1024) the panel stays flat: no top or bottom border, radius 0', async () => {
    for (const width of [1280, 1024]) {
      document.body.replaceChildren();
      const { screen } = await mountInShell(implementInProgress, width);
      const style = getComputedStyle(aside(screen));
      expect(style.borderTopWidth, `${width} top`).toBe('0px');
      expect(style.borderBottomWidth, `${width} bottom`).toBe('0px');
      expect(style.borderTopLeftRadius).toBe('0px');
    }
  });
});

describe('card header at the narrow lane width (operator ruling, squad fix round, 2026-10-04)', () => {
  // The state pill stacks under the work package id on EVERY card and sits inside the card's content box, never clipped.
  for (const width of [1024, 800, 390, 320]) {
    it(`${width}: every pill is on its own line under the id, aligned with it, and ends inside the card padding`, async () => {
      const { screen } = await mountInShell(implementInProgress, width);
      const cards = [...boardRoot(screen).querySelectorAll<HTMLElement>('sk-action-row')];
      expect(cards.length).toBeGreaterThanOrEqual(5);
      for (const c of cards) {
        const name = c.getAttribute('row-id') ?? '';
        const id = one<HTMLElement>(c, '[data-wp-id]').getBoundingClientRect();
        const tag = one<HTMLElement>(one<HTMLElement>(c, 'sk-pill-tag').shadowRoot as ShadowRoot, '[part~="tag"]');
        const pill = tag.getBoundingClientRect();
        const trigger = one<HTMLElement>(c.shadowRoot as ShadowRoot, 'button');
        const box = trigger.getBoundingClientRect();
        const edge = box.right - parseFloat(getComputedStyle(trigger).paddingRight);
        expect(pill.top, `${width} ${name} stacked`).toBeGreaterThanOrEqual(id.bottom - 0.5);
        expect(Math.abs(pill.left - id.left), `${width} ${name} aligned`).toBeLessThan(1);
        expect(pill.right, `${width} ${name} pill ends inside the card padding (pill ${pill.right}, edge ${edge})`).toBeLessThanOrEqual(edge + 0.5);
        const text = (one<HTMLElement>(c, 'sk-pill-tag').textContent ?? '').trim();
        // A state word wider than the column may end in an ellipsis, never overflow; the full word is the title tooltip.
        expect(one<HTMLElement>(c, 'sk-pill-tag').getAttribute('title'), `${width} ${name} title`).toBe(text);
        // The common state words fit whole even in the narrowest lane (90 px); only a long word may end in an ellipsis.
        if (['queued', 'claimed', 'coding', 'review', 'done'].includes(text)) expect(tag.scrollWidth, `${width} ${name} "${text}" shown whole`).toBeLessThanOrEqual(tag.clientWidth + 1);
        if (tag.scrollWidth > tag.clientWidth + 1) expect(getComputedStyle(tag).textOverflow, `${width} ${name} ellipsis`).toBe('ellipsis');
      }
    });
  }
});

describe('phase band: measurement and direction (squad fix round, F4, F5, PR-CORRECTNESS-001)', () => {
  const bandOf = (el: SkPipelineScreen): HTMLElement => one<HTMLElement>(root(el), '[data-phases]');
  const frames = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

  it('F4: the first measurement does not depend on a ResizeObserver callback (a screen that mounts overflowing is a region)', async () => {
    const Real = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
    try {
      const { screen } = await mountInShell(sevenPhases, 320);
      await document.fonts.ready;
      await frames();
      await screen.updateComplete;
      const band = bandOf(screen);
      expect(band.scrollWidth, 'overflows').toBeGreaterThan(band.clientWidth);
      expect(band.getAttribute('role')).toBe('region');
      expect(band.getAttribute('tabindex')).toBe('0');
    } finally {
      globalThis.ResizeObserver = Real;
    }
  });

  it('PR-CORRECTNESS-001: after the screen is removed and appended again it still re-measures on a size change', async () => {
    const el = await mount({ mission: sevenPhases }, 1280);
    await frames();
    expect(bandOf(el).getAttribute('role')).toBeNull();
    const box = el.parentElement as HTMLElement;
    el.remove();
    box.append(el);
    await settle(el);
    box.style.inlineSize = '300px';
    await frames();
    await el.updateComplete;
    expect(bandOf(el).getAttribute('role'), 'region after shrinking').toBe('region');
    box.style.inlineSize = '1280px';
    await frames();
    await el.updateComplete;
    expect(bandOf(el).getAttribute('role'), 'no region after growing').toBeNull();
  });

  it('F5: the edge fades sit on the logical start and end, mirrored in a right-to-left page', async () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      document.body.replaceChildren();
      document.documentElement.dir = dir;
      try {
        const { screen } = await mountInShell(sevenPhases, 390);
        await frames();
        const band = bandOf(screen);
        // Scroll to the middle so a fade shows on both sides.
        const max = band.scrollWidth - band.clientWidth;
        band.scrollLeft = dir === 'rtl' ? -max / 2 : max / 2;
        await frames();
        await screen.updateComplete;
        const start = one<HTMLElement>(root(screen), '[data-phase-fade="start"]').getBoundingClientRect();
        const end = one<HTMLElement>(root(screen), '[data-phase-fade="end"]').getBoundingClientRect();
        const frame = one<HTMLElement>(root(screen), '[data-phases-frame]').getBoundingClientRect();
        if (dir === 'ltr') {
          expect(start.left, 'ltr start').toBeCloseTo(frame.left, 0);
          expect(end.right, 'ltr end').toBeCloseTo(frame.right, 0);
        } else {
          expect(start.right, 'rtl start').toBeCloseTo(frame.right, 0);
          expect(end.left, 'rtl end').toBeCloseTo(frame.left, 0);
        }
        // The gradient runs from the edge inwards: opaque at the edge, transparent towards the content.
        const toward = (selector: string): string => /to (left|right)/.exec(getComputedStyle(one<HTMLElement>(root(screen), selector)).backgroundImage)?.[1] ?? '';
        expect(toward('[data-phase-fade="start"]'), `${dir} start gradient`).toBe(dir === 'rtl' ? 'left' : 'right');
        expect(toward('[data-phase-fade="end"]'), `${dir} end gradient`).toBe(dir === 'rtl' ? 'right' : 'left');
      } finally {
        document.documentElement.dir = '';
      }
    }
  });
});

describe('state stories carry a shell that agrees with them (PR-VISUAL-006)', () => {
  for (const [name, story] of [
    ['empty', stories.Empty1280],
    ['loading', stories.Loading1280],
    ['error', stories.Error1280],
  ] as const) {
    it(`${name}: the shell frames no Mission (no Mission header, no progress footer)`, async () => {
      await setViewport(1280);
      const args = { ...stories.default.args, ...story.args };
      const host = document.createElement('div');
      document.body.append(host);
      const meta = stories.default as unknown as { render: (a: unknown, c: unknown) => unknown };
      render(meta.render(args, {}) as ReturnType<typeof html>, host);
      const shell = host.querySelector('sk-mission-shell') as SkMissionShell;
      await shell.updateComplete;
      expect(shell.mission, `${name} shell mission`).toBeNull();
      const text = shell.shadowRoot?.textContent ?? '';
      expect(text).not.toContain('Sample mission');
      expect(text).not.toMatch(/\d+%/);
    });
  }
});
