// Subtasks, Workspace and the artifact links (IC-06, T043, T045): the bodies of the `subtasks` and `workspace` panels and of
// the `artifact-links` wrapper. Drawn alone (the views are built by hand) and through the screen (which owns the panels, the
// wrapper and the decision whether each is drawn). Every absence test is paired with its present sibling.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { renderArtifactLinks, renderSubtasks, renderWorkspace } from '../src/elements/sk-work-package-screen/work-parts.js';
import type { ArtifactLinksView, WorkspaceView } from '../src/elements/sk-work-package-screen/work-parts.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { PairingId, WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import {
  ABSENT_MARKER,
  LABEL_CODE_LANE,
  LABEL_LANE_BRANCH,
  LABEL_PLANNING_BRANCH,
  LABEL_WORKTREE_PRESENT,
  NOT_STARTED_BADGE,
  NO_SUBTASKS_TEXT,
  NO_WORD,
  OPEN_PROMPT_LABEL,
  OPEN_SPEC_LABEL,
  STATE_BADGES,
  SUBTASK_PROGRESS_TEXT,
  WORKSPACE_TITLE,
  YES_WORD,
} from '../src/defaults/index.js';
import type { LabelHooks, ResolvedSubtask } from '../src/logic/index.js';

type Props = Partial<WpScreenProps> & { labels?: LabelHooks | null };
import * as storyModule from '../src/elements/sk-work-package-screen/sk-work-package-screen.chains-work.stories.js';

afterEach(() => {
  document.body.replaceChildren();
});

const text = (scope: Element): string => (scope.textContent ?? '').replace(/\s+/g, ' ').trim();
function draw(template: ReturnType<typeof renderSubtasks>): HTMLElement {
  const box = document.createElement('div');
  document.body.append(box);
  render(template, box);
  return box;
}
const subtask = (id: string, title: string | null, lane: string | null): ResolvedSubtask => ({ id, title, lane });
const rowsOf = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('ul > li')];

async function mountProps(props: Props): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const mount = (id: PairingId, props: Props = {}): Promise<SkWorkPackageScreen> => mountProps({ ...pairingProps(id), ...props });
const regionOf = (screen: SkWorkPackageScreen, id: string): HTMLElement | null => screen.shadowRoot?.querySelector<HTMLElement>(`[data-region="${id}"]`) ?? null;
function region(screen: SkWorkPackageScreen, id: string): HTMLElement {
  const found = regionOf(screen, id);
  if (found === null) throw new Error(`no region ${id}`);
  return found;
}

describe('Subtasks (T043 step 1)', () => {
  const items = [subtask('T017', 'Red-first tests', 'done'), subtask('T018', 'The schemas', 'in_progress'), subtask('T019', 'The path file', 'planned')];

  it('draws a native progress bar with the figures as given and its accessible name, then a row per subtask (id, title, lane word)', () => {
    const box = draw(renderSubtasks({ done: 1, total: 3, items }));
    const bars = box.querySelectorAll('progress');
    expect(bars).toHaveLength(1);
    const bar = bars[0] as HTMLProgressElement;
    expect(bar.value).toBe(1);
    expect(bar.max).toBe(3);
    expect(bar.getAttribute('aria-label') ?? box.querySelector(`label[for="${bar.id}"]`)?.textContent).toContain(SUBTASK_PROGRESS_TEXT(1, 3));
    const rows = rowsOf(box);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.getAttribute('data-id'))).toEqual(['T017', 'T018', 'T019']);
    expect(rows.map((row) => text(row))).toEqual([
      `T017 Red-first tests ${STATE_BADGES['done']?.label}`,
      `T018 The schemas ${STATE_BADGES['in_progress']?.label}`,
      `T019 The path file ${STATE_BADGES['planned']?.label}`,
    ]);
  });

  it('shows the figures as given even when they disagree with the list (R-08): a done above the total, and a list of another length', () => {
    const box = draw(renderSubtasks({ done: 7, total: 4, items }));
    const bar = box.querySelector('progress') as HTMLProgressElement;
    expect(bar.getAttribute('value')).toBe('7');
    expect(bar.getAttribute('max')).toBe('4');
    expect(rowsOf(box)).toHaveLength(3);
  });

  it('hides the bar at total 0 but still shows a non-empty list, paired with the present bar at a non-zero total', () => {
    const hidden = draw(renderSubtasks({ done: 0, total: 0, items }));
    expect(hidden.querySelectorAll('progress')).toHaveLength(0);
    expect(rowsOf(hidden)).toHaveLength(3);
    const shown = draw(renderSubtasks({ done: 0, total: 3, items }));
    expect(shown.querySelectorAll('progress')).toHaveLength(1);
  });

  it('draws the empty form and no bar for no subtasks, paired with a populated list that draws neither the form nor a missing bar', () => {
    const none = draw(renderSubtasks({ done: 0, total: 0, items: [] }));
    expect(none.querySelectorAll('progress')).toHaveLength(0);
    expect(none.querySelectorAll('ul')).toHaveLength(0);
    expect(text(none)).toContain(NO_SUBTASKS_TEXT);
    const some = draw(renderSubtasks({ done: 1, total: 3, items }));
    expect(some.querySelectorAll('progress')).toHaveLength(1);
    expect(text(some)).not.toContain(NO_SUBTASKS_TEXT);
  });

  it('a null title shows the id alone and a null lane the not-started word; an unknown lane shows raw (WP-12)', () => {
    const box = draw(renderSubtasks({ done: 0, total: 3, items: [subtask('T017', null, null), subtask('T018', 'Titled', 'quarantined'), subtask('T019', 'Titled', 'planned')] }));
    const rows = rowsOf(box);
    expect(rows).toHaveLength(3);
    expect(text(rows[0] as HTMLElement)).toBe(`T017 ${NOT_STARTED_BADGE.label}`);
    expect(text(rows[1] as HTMLElement)).toBe('T018 Titled quarantined');
    expect(box.textContent).not.toContain('undefined');
    expect(box.textContent).not.toContain('null');
  });

  it('the host state hook reaches the subtask lane words, hook first, then the default, then the raw lane (FR-022, D-03)', () => {
    const calls: string[] = [];
    const labels = {
      state: (lane: string) => {
        calls.push(lane);
        return lane === 'planned' ? { label: 'Waiting', tone: 'info' as const } : undefined;
      },
    };
    const box = draw(renderSubtasks({ done: 0, total: 3, items: [subtask('T017', 'A', 'planned'), subtask('T018', 'B', 'done'), subtask('T019', 'C', 'quarantined')], labels }));
    const rows = rowsOf(box);
    expect(rows).toHaveLength(3);
    expect(text(rows[0] as HTMLElement)).toBe('T017 A Waiting');
    expect(rows[0]?.querySelector('sk-pill-tag')?.getAttribute('status')).toBe('info');
    expect(text(rows[1] as HTMLElement)).toBe(`T018 B ${STATE_BADGES.done?.label}`);
    expect(text(rows[2] as HTMLElement)).toBe('T019 C quarantined');
    expect(calls).toEqual(['planned', 'done', 'quarantined']);
    // Positive control: without hooks the first row shows the default word.
    const plain = draw(renderSubtasks({ done: 0, total: 1, items: [subtask('T017', 'A', 'planned')] }));
    expect(text(rowsOf(plain)[0] as HTMLElement)).toBe(`T017 A ${STATE_BADGES.planned?.label}`);
  });

  it('through the screen: the same state hook the header uses reaches the subtask lane words', async () => {
    const hooked = await mount('WP-11', { labels: { state: (lane) => ({ label: `H-${lane}`, tone: 'info' }) } });
    const first = DETAIL_FIXTURES.detailPopulated.subtasks[0];
    const row = region(hooked, 'subtasks').querySelector<HTMLElement>(`li[data-id="${first?.id}"]`);
    expect(first?.statusLane).toBeTruthy();
    expect(text(row?.querySelector('sk-pill-tag') as HTMLElement)).toBe(`H-${first?.statusLane}`);
  });

  it('Open spec and Open prompt use the visible secondary variant with a leading file icon, keep their names, and stay inert without a Mission (a revert to ghost fails)', async () => {
    const screen = await mount('WP-34');
    const links = [...region(screen, 'artifact-links').querySelectorAll<HTMLElement>('sk-button')];
    expect(links.map((b) => text(b))).toEqual([OPEN_SPEC_LABEL, OPEN_PROMPT_LABEL]);
    for (const link of links) {
      expect(link.getAttribute('variant')).toBe('secondary');
      expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect(link.hasAttribute('disabled')).toBe(false);
    }
    const inert = await mount('WP-34', { mission: null });
    const disabled = [...region(inert, 'artifact-links').querySelectorAll<HTMLElement>('sk-button')];
    expect(disabled).toHaveLength(2);
    expect(disabled.every((b) => b.hasAttribute('disabled') && b.getAttribute('variant') === 'secondary')).toBe(true);
  });

  it('keys the rows by subtask id: a row that stays keeps its node when the first row goes', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(renderSubtasks({ done: 1, total: 3, items }), box);
    const before = rowsOf(box);
    expect(before).toHaveLength(3);
    render(renderSubtasks({ done: 2, total: 3, items: items.slice(1) }), box);
    const after = rowsOf(box);
    expect(after).toHaveLength(2);
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[2]);
  });

  it('through the screen: WP-11 bar and titled rows, WP-10 the empty form and no bar, WP-12 the null forms (the detail list wins over the 1.0 map)', async () => {
    const filled = region(await mount('WP-11'), 'subtasks');
    const detail = DETAIL_FIXTURES.detailPopulated.subtasks;
    const bare = Object.keys(WORK_PACKAGE_FIXTURES.wpPopulated.subtasks);
    expect(bare).toEqual(detail.map((s) => s.id));
    expect(filled.querySelectorAll('progress')).toHaveLength(1);
    expect(rowsOf(filled).map((row) => text(row))).toEqual(detail.map((s) => `${s.id} ${s.title} ${STATE_BADGES[s.statusLane ?? '']?.label}`));
    document.body.replaceChildren();

    const empty = region(await mount('WP-10'), 'subtasks');
    expect(empty.querySelectorAll('progress')).toHaveLength(0);
    expect(text(empty)).toContain(NO_SUBTASKS_TEXT);
    document.body.replaceChildren();

    const nulls = region(await mount('WP-12'), 'subtasks');
    expect(text(rowsOf(nulls)[0] as HTMLElement)).toBe(`T017 ${NOT_STARTED_BADGE.label}`);
  });

  it('through the screen: markers in a subtask title are shown verbatim and never parsed (WP-50), paired with a plain title', async () => {
    const title = DETAIL_FIXTURES.detailRedaction.subtasks[0]?.title ?? '';
    expect(title).toContain('[path]');
    expect(title).toContain('[email]');
    const box = region(await mount('WP-50'), 'subtasks');
    const first = rowsOf(box)[0] as HTMLElement;
    expect(text(first)).toBe(`${DETAIL_FIXTURES.detailRedaction.subtasks[0]?.id} ${title} ${STATE_BADGES[DETAIL_FIXTURES.detailRedaction.subtasks[0]?.statusLane ?? '']?.label}`);
    expect(first.querySelectorAll('a, [href]')).toHaveLength(0);
    expect(first.innerHTML).not.toContain('mailto:');
    document.body.replaceChildren();

    const plain = region(await mount('WP-11'), 'subtasks');
    const plainTitle = DETAIL_FIXTURES.detailPopulated.subtasks[0]?.title ?? '';
    expect(plainTitle).not.toContain('[');
    expect(text(rowsOf(plain)[0] as HTMLElement)).toContain(plainTitle);
  });
});

describe('Workspace (T043 step 2; the omitted-versus-all-null pair)', () => {
  const full: WorkspaceView = { laneId: 'lane-a', laneBranch: 'kitty/mission-example-lane-a', planningBranch: 'main', worktreePresent: true };
  const rows = (box: ParentNode): { term: string; value: string }[] => {
    const terms = [...box.querySelectorAll('dt')];
    const values = [...box.querySelectorAll('dd')];
    expect(values).toHaveLength(terms.length);
    return terms.map((dt, index) => ({ term: text(dt), value: text(values[index] as Element) }));
  };

  it('draws exactly four rows (code lane, lane branch, planning branch, worktree present) and no path', () => {
    const box = draw(renderWorkspace(full));
    expect(box.querySelectorAll('dl')).toHaveLength(1);
    expect(rows(box)).toEqual([
      { term: LABEL_CODE_LANE, value: 'lane-a' },
      { term: LABEL_LANE_BRANCH, value: 'kitty/mission-example-lane-a' },
      { term: LABEL_PLANNING_BRANCH, value: 'main' },
      { term: LABEL_WORKTREE_PRESENT, value: YES_WORD },
    ]);
    expect(rows(box).some((row) => /path/i.test(row.term))).toBe(false);
  });

  it('a null member keeps its row and shows the one absent marker; the worktree flag stays a yes or no word', () => {
    const box = draw(renderWorkspace({ laneId: null, laneBranch: null, planningBranch: null, worktreePresent: false }));
    expect(rows(box)).toEqual([
      { term: LABEL_CODE_LANE, value: ABSENT_MARKER },
      { term: LABEL_LANE_BRANCH, value: ABSENT_MARKER },
      { term: LABEL_PLANNING_BRANCH, value: ABSENT_MARKER },
      { term: LABEL_WORKTREE_PRESENT, value: NO_WORD },
    ]);
    const partial = draw(renderWorkspace({ ...full, laneBranch: null }));
    expect(rows(partial).map((row) => row.value)).toEqual(['lane-a', ABSENT_MARKER, 'main', YES_WORD]);
  });

  it('WP-32: worktree present false reads the no word and nothing implies removal, paired with the true case', () => {
    const removalWords = /remov|delet|missing|gone|cleaned|pruned|destroyed|discarded/i;
    const absent = draw(renderWorkspace({ ...full, worktreePresent: false }));
    const present = draw(renderWorkspace(full));
    expect(rows(absent)[3]).toEqual({ term: LABEL_WORKTREE_PRESENT, value: NO_WORD });
    expect(rows(present)[3]).toEqual({ term: LABEL_WORKTREE_PRESENT, value: YES_WORD });
    expect(removalWords.test(text(absent))).toBe(false);
    expect(removalWords.test(text(present))).toBe(false);
    // The pattern really matches such words (the test is not vacuous).
    expect(removalWords.test('Worktree removed')).toBe(true);
    expect(removalWords.test('worktree is gone')).toBe(true);
  });

  it('through the screen: omitted draws no region, no heading and no label; all-null draws the panel with four rows (WP-33b); lane-planning keeps its null row (WP-33a)', async () => {
    const omitted = await mount('WP-31', { detail: pairDetail(WORK_PACKAGE_FIXTURES.wpPopulated, DETAIL_FIXTURES.detailOmittedProvisional as never) });
    expect(regionOf(omitted, 'workspace')).toBeNull();
    const omittedText = text(omitted.shadowRoot?.querySelector('[data-grid]') as Element);
    expect(omittedText).not.toContain(WORKSPACE_TITLE);
    for (const label of [LABEL_CODE_LANE, LABEL_LANE_BRANCH, LABEL_PLANNING_BRANCH, LABEL_WORKTREE_PRESENT]) expect(omittedText).not.toContain(label);
    document.body.replaceChildren();

    const allNull = region(await mount('WP-33b'), 'workspace');
    expect(text(allNull)).toContain(WORKSPACE_TITLE);
    expect(rows(allNull)).toEqual([
      { term: LABEL_CODE_LANE, value: ABSENT_MARKER },
      { term: LABEL_LANE_BRANCH, value: ABSENT_MARKER },
      { term: LABEL_PLANNING_BRANCH, value: ABSENT_MARKER },
      { term: LABEL_WORKTREE_PRESENT, value: NO_WORD },
    ]);
    document.body.replaceChildren();

    const planning = region(await mount('WP-33a'), 'workspace');
    expect(rows(planning).map((row) => row.value)).toEqual(['lane-planning', ABSENT_MARKER, 'main', NO_WORD]);
    document.body.replaceChildren();

    const populated = region(await mount('WP-31'), 'workspace');
    expect(rows(populated)).toHaveLength(4);
    expect(rows(populated)[3]?.value).toBe(YES_WORD);
  });

  it('through the screen: WP-32 shows the no word and no removal word anywhere in the panel', async () => {
    const panel = region(await mount('WP-32'), 'workspace');
    expect(rows(panel)[3]).toEqual({ term: LABEL_WORKTREE_PRESENT, value: NO_WORD });
    expect(/remov|delet|missing|gone/i.test(text(panel))).toBe(false);
  });
});

describe('Artifact links (T043 step 3)', () => {
  const spec = { path: 'spec.md', kind: 'spec' };
  const prompt = { path: 'tasks/WP04-example.md', kind: 'work_package_prompt' };
  const links = (over: Partial<ArtifactLinksView> = {}): ArtifactLinksView => ({ spec, prompt, inert: false, ...over });
  const controls = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('sk-button')];

  it('draws each action only when its reference is non-null, secondary, with the reference passed to the handler', () => {
    const calls: [string, string][] = [];
    const both = draw(renderArtifactLinks(links(), (path, kind) => calls.push([path, kind])));
    expect(controls(both).map((c) => text(c))).toEqual([OPEN_SPEC_LABEL, OPEN_PROMPT_LABEL]);
    expect(controls(both).every((c) => c.getAttribute('variant') === 'secondary')).toBe(true);
    expect(both.querySelectorAll('button, a')).toHaveLength(0);
    controls(both).forEach((c) => c.click());
    expect(calls).toEqual([
      [spec.path, spec.kind],
      [prompt.path, prompt.kind],
    ]);

    const specOnly = draw(renderArtifactLinks(links({ prompt: null }), () => undefined));
    expect(controls(specOnly).map((c) => text(c))).toEqual([OPEN_SPEC_LABEL]);
    const promptOnly = draw(renderArtifactLinks(links({ spec: null }), () => undefined));
    expect(controls(promptOnly).map((c) => text(c))).toEqual([OPEN_PROMPT_LABEL]);
    const neither = draw(renderArtifactLinks(links({ spec: null, prompt: null }), () => undefined));
    expect(controls(neither)).toHaveLength(0);
  });

  it('passes a kind the screen never saw through unchanged', () => {
    const calls: [string, string][] = [];
    const box = draw(renderArtifactLinks(links({ spec: { path: 'x/y.md', kind: 'a-kind-the-screen-never-saw' } }), (path, kind) => calls.push([path, kind])));
    controls(box)[0]?.click();
    expect(calls).toEqual([['x/y.md', 'a-kind-the-screen-never-saw']]);
  });

  it('draws the actions inert while there is no Mission, paired with the live sibling', () => {
    const inert = draw(renderArtifactLinks(links({ inert: true }), () => undefined));
    const live = draw(renderArtifactLinks(links(), () => undefined));
    expect(controls(inert).map((c) => c.hasAttribute('disabled'))).toEqual([true, true]);
    expect(controls(live).map((c) => c.hasAttribute('disabled'))).toEqual([false, false]);
  });

  it('through the screen: WP-34 both, WP-35a spec only, WP-35b prompt only, WP-35c neither draws no wrapper', async () => {
    const both = region(await mount('WP-34'), 'artifact-links');
    expect(controls(both).map((c) => c.getAttribute('label') ?? text(c))).toHaveLength(2);
    expect(controls(both).map((c) => text(c))).toEqual([OPEN_SPEC_LABEL, OPEN_PROMPT_LABEL]);
    document.body.replaceChildren();

    const noPrompt = region(await mount('WP-35a'), 'artifact-links');
    expect(controls(noPrompt).map((c) => text(c))).toEqual([OPEN_SPEC_LABEL]);
    document.body.replaceChildren();

    const noSpec = region(await mount('WP-35b'), 'artifact-links');
    expect(controls(noSpec).map((c) => text(c))).toEqual([OPEN_PROMPT_LABEL]);
    document.body.replaceChildren();

    const none = await mount('WP-35c');
    expect(regionOf(none, 'artifact-links')).toBeNull();
    expect(text(none.shadowRoot?.querySelector('[data-grid]') as Element)).not.toContain(OPEN_SPEC_LABEL);
    expect(text(none.shadowRoot?.querySelector('[data-grid]') as Element)).not.toContain(OPEN_PROMPT_LABEL);
    document.body.replaceChildren();

    const noDetail = await mountProps({ ...pairingProps('WP-34'), detail: null });
    expect(regionOf(noDetail, 'artifact-links')).toBeNull();
    expect(regionOf(noDetail, 'workspace')).toBeNull();
  });

  it('N-3: the screen never draws the prompt body (wpWithPrompt), paired with the same query finding the Open prompt control', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpWithPrompt;
    const body = 'Show one Mission with its phases and work packages.';
    expect(wp.promptMarkdown).toContain(body);
    const screen = await mountProps({ ...pairingProps('WP-34'), workPackage: wp, wpId: wp.wpId, detail: pairDetail(wp, DETAIL_FIXTURES.detailPopulated, { cycles: 'none' }) });
    const everything = text(screen.shadowRoot?.querySelector('[data-root]') as Element);
    // The query reads the whole screen (positive control: a subtask title and the control are found).
    expect(everything).toContain(DETAIL_FIXTURES.detailPopulated.subtasks[0]?.title ?? '?');
    expect(everything).toContain(OPEN_PROMPT_LABEL);
    expect(everything).not.toContain(body);
    expect(everything).not.toContain('Work Package Prompt');
    expect(everything).not.toContain(wp.promptMarkdown ?? '?');
    document.body.replaceChildren();

    const populated = await mount('WP-34');
    expect(text(populated.shadowRoot?.querySelector('[data-root]') as Element)).toContain(OPEN_PROMPT_LABEL);
  });
});

describe('The nineteen stories of Screens/Work Package/Chains, subtasks, workspace and links (T044)', () => {
  const ROWS = ['WP-10', 'WP-11', 'WP-12', 'WP-13', 'WP-14', 'WP-15', 'WP-16', 'WP-25', 'WP-26', 'WP-27', 'WP-31', 'WP-32', 'WP-33a', 'WP-33b', 'WP-34', 'WP-35a', 'WP-35b', 'WP-35c', 'WP-50'] as const;
  const { default: meta, ...stories } = storyModule as unknown as { default: { title: string }; [name: string]: { tags: string[]; args: WpScreenProps } | { title: string } };
  const entries = Object.entries(stories) as [string, { tags: string[]; args: WpScreenProps }][];

  it('has exactly the nineteen rows, each named Wp<NN><letter>, tagged once with its row tag and the 1280 tier, and fed by the pairing table', () => {
    expect(meta.title).toBe('Screens/Work Package/Chains, subtasks, workspace and links');
    expect(entries).toHaveLength(19);
    expect(entries.map(([name]) => name)).toEqual(ROWS.map((row) => `Wp${row.slice(3)}`));
    let checked = 0;
    for (const [index, [name, story]] of entries.entries()) {
      const row = ROWS[index] as PairingId;
      const rowTags = story.tags.filter((tag) => tag.startsWith('wp-'));
      expect(rowTags).toEqual([`wp-${row.slice(3)}`]);
      expect(`Wp${rowTags[0]?.slice(3)}`).toBe(name);
      expect(story.tags.filter((tag) => tag.startsWith('vw-'))).toEqual(['vw-1280']);
      expect(story.args).toEqual(pairingProps(row));
      checked += 1;
    }
    expect(checked).toBe(19);
  });
});

describe('Subtasks: keyed rows (TESTS-002)', () => {
  const sub = (id: string): ResolvedSubtask => ({ id, title: `Title ${id}`, lane: 'planned' });
  const rowsIn = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('ul[data-subtasks] > li')];

  it('keeps the node of every row that stays when a row is inserted in front', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(renderSubtasks({ done: 0, total: 2, items: [sub('T2'), sub('T3')] }), box);
    const before = rowsIn(box);
    render(renderSubtasks({ done: 0, total: 3, items: [sub('T1'), sub('T2'), sub('T3')] }), box);
    const after = rowsIn(box);
    expect(after).toHaveLength(3);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(before.includes(after[0] as HTMLElement)).toBe(false);
    expect(after.map((row) => row.getAttribute('data-id'))).toEqual(['T1', 'T2', 'T3']);
  });

  it('draws a duplicated subtask id once per entry, in input order (pinning the current output)', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(renderSubtasks({ done: 0, total: 3, items: [sub('T1'), sub('T1'), sub('T2')] }), box);
    expect(rowsIn(box).map((row) => row.getAttribute('data-id'))).toEqual(['T1', 'T1', 'T2']);
  });
});
