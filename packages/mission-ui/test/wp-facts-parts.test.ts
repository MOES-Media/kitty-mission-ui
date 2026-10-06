// Facts, Assignment and Frontmatter (WP05, IC-04): bodies drawn through the screen's own panels. Every DOM-absence test is
// paired with a sibling fixture where the element is present.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import {
  DETAIL_FIXTURES,
  WORK_PACKAGE_FIXTURES,
  pairDetail,
  pairingProps,
  workPackageFrame,
  workPackageProps,
} from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WorkPackageRecordView } from '../src/contract/types.js';
import {
  AUTHORED_TITLE,
  FRESH_TEXT,
  LABEL_ACTOR,
  LABEL_AGENT,
  LABEL_ASSIGNEE,
  LABEL_COMMITTED_STATE,
  LABEL_DEPENDENCIES,
  LABEL_EXECUTION_MODE,
  LABEL_FORCED_TRANSITIONS,
  LABEL_IMPLEMENTER_OF_RECORD,
  LABEL_LAST_TRANSITION,
  LABEL_MODEL,
  LABEL_PHASE,
  LABEL_PRIORITY,
  LABEL_PROFILE,
  LABEL_PROVIDER,
  LABEL_REQUIREMENT_REFS,
  LABEL_ROLE,
  LABEL_STALENESS,
  LABEL_TARGET_BRANCH,
  LABEL_TASK_TYPE,
  LABEL_TRACKER_REFS,
  LABEL_VERSION,
  LABEL_WORK_PACKAGE,
  NOT_STARTED_BADGE,
  STALENESS_NOT_APPLICABLE_TEXT,
  STALENESS_REASON_WORDS,
} from '../src/defaults/index.js';
import { resolveActivity, resolveStateBadge } from '../src/logic/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const region = (screen: SkWorkPackageScreen, id: string): HTMLElement | null => root(screen).querySelector<HTMLElement>(`[data-region="${id}"]`);
const must = (screen: SkWorkPackageScreen, id: string): HTMLElement => {
  const found = region(screen, id);
  if (found === null) throw new Error(`no region ${id}`);
  return found;
};
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** The rows of the first dl of a region, label to value element. */
function rows(scope: Element): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>();
  for (const dl of scope.querySelectorAll('dl')) {
    for (const dt of dl.querySelectorAll('dt')) {
      const dd = dt.nextElementSibling as HTMLElement | null;
      if (dd !== null && dd.tagName === 'DD') map.set(text(dt), dd);
    }
  }
  return map;
}
const factRows = (screen: SkWorkPackageScreen): Map<string, HTMLElement> => rows(must(screen, 'facts'));
const withWp = (patch: Partial<WorkPackageRecordView>): Partial<WpScreenProps> => ({
  workPackage: { ...WORK_PACKAGE_FIXTURES.wpPopulated, ...patch },
});
const NOW = '2026-09-24T09:12:00Z';

describe('Facts: a dl of the library facts classes, one row per present value', () => {
  it('wpPopulated draws the always-present rows and every present optional one, in the stated order', async () => {
    const screen = await mount();
    const dl = must(screen, 'facts').querySelector('dl') as HTMLElement;
    expect(dl.classList.contains('sk-facts')).toBe(true);
    expect([...dl.querySelectorAll('dt')].every((dt) => dt.classList.contains('sk-facts__term'))).toBe(true);
    expect([...dl.querySelectorAll('dd')].every((dd) => dd.classList.contains('sk-facts__value'))).toBe(true);
    const labels = [...factRows(screen).keys()];
    expect(labels).toEqual([
      LABEL_WORK_PACKAGE,
      LABEL_COMMITTED_STATE,
      LABEL_ACTOR,
      LABEL_TARGET_BRANCH,
      LABEL_PHASE,
      LABEL_TRACKER_REFS,
      LABEL_LAST_TRANSITION,
      LABEL_FORCED_TRANSITIONS,
      LABEL_IMPLEMENTER_OF_RECORD,
    ]);
    const map = factRows(screen);
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    expect(text(map.get(LABEL_WORK_PACKAGE) ?? null)).toBe(wp.wpId);
    expect(text(map.get(LABEL_TARGET_BRANCH) ?? null)).toBe('main');
    expect(text(map.get(LABEL_PHASE) ?? null)).toBe('Screens');
    expect(text(map.get(LABEL_TRACKER_REFS) ?? null)).toBe('#5558');
    expect(text(map.get(LABEL_IMPLEMENTER_OF_RECORD) ?? null)).toBe('claude');
    expect(text(map.get(LABEL_ACTOR) ?? null)).toBe('claude:implementer:implementer-ivan');
    expect(text(map.get(LABEL_FORCED_TRANSITIONS) ?? null)).toContain(String(wp.forceCount));
  });

  it('a long unbroken value wraps inside the card instead of overflowing it (E-21), against a short value that needs no wrap', async () => {
    const word = 'release/' + 'supercalifragilistic'.repeat(6);
    const screen = await mount(withWp({ mergeTargetBranch: word }));
    const card = must(screen, 'facts');
    const value = factRows(screen).get(LABEL_TARGET_BRANCH) as HTMLElement;
    expect(getComputedStyle(value).overflowWrap).toBe('break-word');
    expect(value.getBoundingClientRect().right).toBeLessThanOrEqual(card.getBoundingClientRect().right);
    expect(value.scrollWidth).toBeLessThanOrEqual(value.clientWidth);
    expect(text(value)).toBe(word);
    const short = await mount();
    expect(text(factRows(short).get(LABEL_TARGET_BRANCH) ?? null)).toBe('main');
  });

  it('a task type is drawn only when present', async () => {
    const present = await mount(withWp({ taskType: 'refactor' }));
    expect(text(factRows(present).get(LABEL_TASK_TYPE) ?? null)).toBe('refactor');
    const absent = await mount();
    expect(factRows(absent).has(LABEL_TASK_TYPE)).toBe(false);
    expect(text(must(absent, 'facts'))).not.toContain(LABEL_TASK_TYPE);
  });

  it('WP-38: null and empty values draw no row and no label, against WP-01 where each is present', async () => {
    const full = await mount();
    const nulled = await mount(workPackageProps('wpFactsNull'));
    const absentLabels = [LABEL_TARGET_BRANCH, LABEL_PHASE, LABEL_TRACKER_REFS, LABEL_IMPLEMENTER_OF_RECORD];
    let seen = 0;
    for (const label of absentLabels) {
      expect(factRows(full).has(label), `${label} present`).toBe(true);
      expect(factRows(nulled).has(label), `${label} absent`).toBe(false);
      expect(text(must(nulled, 'facts')), label).not.toContain(label);
      seen += 1;
    }
    expect(seen).toBe(4);
    expect([...factRows(nulled).keys()]).toEqual([LABEL_WORK_PACKAGE, LABEL_COMMITTED_STATE, LABEL_ACTOR, LABEL_LAST_TRANSITION, LABEL_FORCED_TRANSITIONS]);
  });

  it('an empty tracker-refs array draws no row; a null last transition draws no row (wpNoEvents), against the populated sibling', async () => {
    const empty = await mount(withWp({ trackerRefs: [] }));
    expect(factRows(empty).has(LABEL_TRACKER_REFS)).toBe(false);
    const none = await mount(workPackageProps('wpNoEvents'));
    expect(factRows(none).has(LABEL_LAST_TRANSITION)).toBe(false);
    const populated = await mount();
    expect(factRows(populated).has(LABEL_LAST_TRANSITION)).toBe(true);
    expect(factRows(populated).has(LABEL_TRACKER_REFS)).toBe(true);
  });

  it('the last transition is relative against `now` and the ISO text as given without it', async () => {
    const screen = await mount();
    const iso = WORK_PACKAGE_FIXTURES.wpPopulated.lastTransitionAt as string;
    expect(text(factRows(screen).get(LABEL_LAST_TRANSITION) ?? null)).toBe(resolveActivity(iso, null, null));
    screen.now = NOW;
    await screen.updateComplete;
    expect(text(factRows(screen).get(LABEL_LAST_TRANSITION) ?? null)).toBe(resolveActivity(iso, NOW, null));
    expect(resolveActivity(iso, NOW, null)).not.toBe(resolveActivity(iso, null, null));
  });

  it('forced transitions are shown with their number, including zero', async () => {
    const forced = await mount(withWp({ forceCount: 3 }));
    expect(WORK_PACKAGE_FIXTURES.wpPopulated.forceCount).toBe(0);
    expect(text(factRows(forced).get(LABEL_FORCED_TRANSITIONS) ?? null)).toContain('3');
    const none = await mount(withWp({ forceCount: 0 }));
    expect(text(factRows(none).get(LABEL_FORCED_TRANSITIONS) ?? null)).toContain('0');
  });
});

describe('Facts: the Committed state row is the header badge word, always drawn', () => {
  const badgeText = (screen: SkWorkPackageScreen): string => text(root(screen).querySelector('[data-region="header"] sk-pill-tag[data-badge="status"]'));
  it('a known lane, a null lane and an unknown lane each match the header badge text', async () => {
    const cases: [string | null, string][] = [
      ['in_progress', resolveStateBadge('in_progress', null).label],
      [null, NOT_STARTED_BADGE.label],
      ['on_hold', 'on_hold'],
    ];
    let seen = 0;
    for (const [lane, expected] of cases) {
      const screen = await mount(withWp({ statusLane: lane }));
      const row = factRows(screen).get(LABEL_COMMITTED_STATE) ?? null;
      expect(text(row), String(lane)).toBe(expected);
      expect(text(row)).toBe(badgeText(screen));
      expect(row?.querySelector('sk-pill-tag')?.getAttribute('status')).toBe(resolveStateBadge(lane, null).tone);
      seen += 1;
    }
    expect(seen).toBe(3);
  });
});

describe('Facts: the staleness row, the hidden text and the three paired forms', () => {
  it('fresh draws the quiet row (WP-21a)', async () => {
    const screen = await mount(workPackageProps('wpFresh'));
    expect(text(factRows(screen).get(LABEL_STALENESS) ?? null)).toBe(FRESH_TEXT);
  });

  it('an unknown status draws its raw text, never nothing and never undefined; stale draws no Facts row', async () => {
    const foreign = await mount(withWp({ staleness: { status: 'a_status_nobody_saw', reason: null, minutesSinceCommit: null } as never }));
    expect(text(factRows(foreign).get(LABEL_STALENESS) ?? null)).toBe('a_status_nobody_saw');
    expect(must(foreign, 'facts').textContent).not.toContain('undefined');
    const stale = await mount(workPackageProps('wpStale'));
    expect(factRows(stale).has(LABEL_STALENESS)).toBe(false);
  });

  it('not_applicable draws no visible staleness element and carries the hidden text, found by a DOM text query (WP-21b)', async () => {
    const screen = await mount(workPackageProps('wpNotApplicable'));
    const expected = STALENESS_NOT_APPLICABLE_TEXT('planning_artifact_repo_root_shared_workspace');
    expect(expected).toBe(`Staleness: not applicable, ${STALENESS_REASON_WORDS['planning_artifact_repo_root_shared_workspace'] as string}`);
    const facts = must(screen, 'facts');
    const hidden = [...facts.querySelectorAll('*')].filter((el) => el.children.length === 0 && text(el) === expected);
    expect(hidden).toHaveLength(1);
    const style = getComputedStyle(hidden[0] as HTMLElement);
    expect(style.position).toBe('absolute');
    expect(style.overflow).toBe('hidden');
    expect((hidden[0] as HTMLElement).getBoundingClientRect().width).toBe(0);
    expect(factRows(screen).has(LABEL_STALENESS)).toBe(false);
    expect(facts.querySelector('dl')?.textContent).not.toContain(expected);
  });

  it('a null reason drops the clause and a foreign reason shows raw', async () => {
    const bare = await mount(withWp({ staleness: { status: 'not_applicable', reason: null, minutesSinceCommit: null } }));
    expect(text(must(bare, 'facts'))).toContain(STALENESS_NOT_APPLICABLE_TEXT(null));
    expect(text(must(bare, 'facts'))).not.toContain(`${STALENESS_NOT_APPLICABLE_TEXT(null)},`);
    const foreign = await mount(withWp({ staleness: { status: 'not_applicable', reason: 'a_reason_nobody_saw', minutesSinceCommit: null } as never }));
    expect(text(must(foreign, 'facts'))).toContain('Staleness: not applicable, a_reason_nobody_saw');
  });

  it('omitted has neither the element nor the text; null equals omitted; not_applicable has the text only (omitted versus null versus not_applicable)', async () => {
    const omitted = await mount(workPackageProps('wpStalenessOmitted'));
    const nulled = await mount(withWp({ staleness: null }));
    const notApplicable = await mount(workPackageProps('wpNotApplicable'));
    expect(text(must(omitted, 'facts'))).not.toContain('Staleness');
    expect(factRows(omitted).has(LABEL_STALENESS)).toBe(false);
    expect([...factRows(nulled).keys()]).toEqual([...factRows(omitted).keys()]);
    expect(text(must(nulled, 'facts'))).not.toContain('Staleness');
    expect(text(must(notApplicable, 'facts'))).toContain('Staleness: not applicable');
    // the visible rows of not_applicable equal those of omitted
    expect([...factRows(notApplicable).keys()]).toEqual([...factRows(omitted).keys()]);
  });
});

describe('Assignment: seven rows against the authored recommendation, never merged', () => {
  const assignment = (screen: SkWorkPackageScreen): HTMLElement => must(screen, 'assignment');
  const groups = (screen: SkWorkPackageScreen): HTMLElement[] => [...assignment(screen).querySelectorAll<HTMLElement>('[data-group]')];

  it('wpPopulated draws the assigned rows that are non-null and the authored group under an h3', async () => {
    const screen = await mount();
    const a = WORK_PACKAGE_FIXTURES.wpPopulated.assignment;
    const [assigned, authored] = groups(screen) as [HTMLElement, HTMLElement];
    const map = rows(assigned);
    expect([...map.keys()]).toEqual([LABEL_AGENT, LABEL_ROLE, LABEL_PROFILE, LABEL_VERSION, LABEL_MODEL, LABEL_PROVIDER]);
    expect(map.has(LABEL_ASSIGNEE)).toBe(false);
    expect(text(map.get(LABEL_AGENT) ?? null)).toBe(a.agent);
    expect(text(map.get(LABEL_VERSION) ?? null)).toBe(a.agentProfileVersion);
    expect(text(map.get(LABEL_PROVIDER) ?? null)).toBe(a.provider);
    const h3s = [...assignment(screen).querySelectorAll('h3')];
    expect(h3s.map(text)).toEqual([AUTHORED_TITLE]);
    expect(authored.contains(h3s[0] as Element)).toBe(true);
    expect(groups(screen)).toHaveLength(2);
  });

  it('the assigned value and the authored value are separate rows in separate groups, even when they differ', async () => {
    const screen = await mount(
      withWp({
        assignment: { ...WORK_PACKAGE_FIXTURES.wpPopulated.assignment, role: 'reviewer', model: 'opus' },
        authored: { ...WORK_PACKAGE_FIXTURES.wpPopulated.authored, role: 'implementer', model: 'sonnet' },
      }),
    );
    const [assigned, authored] = groups(screen) as [HTMLElement, HTMLElement];
    expect(text(rows(assigned).get(LABEL_ROLE) ?? null)).toBe('reviewer');
    expect(text(rows(assigned).get(LABEL_MODEL) ?? null)).toBe('opus');
    expect(text(rows(authored).get(LABEL_ROLE) ?? null)).toBe('implementer');
    expect(text(rows(authored).get(LABEL_MODEL) ?? null)).toBe('sonnet');
    expect(assigned.textContent).not.toContain('sonnet');
    expect(authored.textContent).not.toContain('opus');
  });

  it('an all-null group is not drawn, its heading included, against the populated sibling', async () => {
    const authoredOnly = await mount(
      withWp({ assignment: { agent: null, assignee: null, role: null, agentProfile: null, agentProfileVersion: null, model: null, provider: null } }),
    );
    expect(groups(authoredOnly)).toHaveLength(1);
    expect(assignment(authoredOnly).querySelector('h3')).not.toBeNull();
    const assignedOnly = await mount(
      withWp({ authored: { role: null, agentProfile: null, model: null, subtasks: [] } }),
    );
    expect(groups(assignedOnly)).toHaveLength(1);
    expect(assignment(assignedOnly).querySelector('h3')).toBeNull();
    expect(text(assignment(assignedOnly))).not.toContain(AUTHORED_TITLE);
    const both = await mount();
    expect(groups(both)).toHaveLength(2);
  });

  it('WP-18 and WP-19: a handle-only or redacted actor leaves the Assignment without rows or placeholders', async () => {
    const handle = await mount(workPackageProps('wpActorHandle'));
    expect(region(handle, 'assignment')).toBeNull();
    expect(text(factRows(handle).get(LABEL_ACTOR) ?? null)).toBe('finalize-tasks');
    const redacted = await mount(workPackageProps('wpActorRedacted'));
    expect(region(redacted, 'assignment')).toBeNull();
    expect(factRows(redacted).has(LABEL_ACTOR)).toBe(false);
    const structured = await mount(workPackageProps('wpPopulated'));
    expect(region(structured, 'assignment')).not.toBeNull();
  });

  it('the assignee row is drawn when it is present', async () => {
    const screen = await mount(withWp({ assignment: { ...WORK_PACKAGE_FIXTURES.wpPopulated.assignment, assignee: 'a-person' } }));
    const [assigned] = groups(screen) as [HTMLElement];
    expect(text(rows(assigned).get(LABEL_ASSIGNEE) ?? null)).toBe('a-person');
  });
});

describe('Actor row of Facts: the same joined string as the header', () => {
  it('structured, handle-only and redacted', async () => {
    const expected: [Partial<WpScreenProps>, string | null][] = [
      [workPackageProps('wpActorStructured'), 'claude:implementer:implementer-ivan'],
      [workPackageProps('wpActorHandle'), 'finalize-tasks'],
      [workPackageProps('wpActorRedacted'), null],
    ];
    let seen = 0;
    for (const [props, value] of expected) {
      const screen = await mount(props);
      const row = factRows(screen).get(LABEL_ACTOR) ?? null;
      if (value === null) expect(row).toBeNull();
      else expect(text(row)).toBe(value);
      seen += 1;
    }
    expect(seen).toBe(3);
  });
});

describe('Frontmatter: plain pills, rows only when present, never a control', () => {
  const frontmatter = (screen: SkWorkPackageScreen): HTMLElement => must(screen, 'frontmatter');

  it('titled dependency pills from the detail (id and title), against the bare form (id only)', async () => {
    const screen = await mount();
    const resolved = DETAIL_FIXTURES.detailPopulated.dependencies;
    const pills = [...(rows(frontmatter(screen)).get(LABEL_DEPENDENCIES) ?? document.body).querySelectorAll('sk-pill-tag')];
    expect(pills).toHaveLength(resolved.length);
    expect(resolved.length).toBeGreaterThan(0);
    pills.forEach((pill, index) => {
      const dep = resolved[index] as { wpId: string; title: string | null };
      expect(text(pill)).toContain(dep.wpId);
      if (dep.title !== null) expect(text(pill)).toContain(dep.title);
    });
    const bare = await mount({ ...workPackageProps('wpPopulated') });
    const barePills = [...(rows(frontmatter(bare)).get(LABEL_DEPENDENCIES) ?? document.body).querySelectorAll('sk-pill-tag')];
    expect(barePills.map(text)).toEqual(WORK_PACKAGE_FIXTURES.wpPopulated.dependencies);
  });

  it('a dependency whose title equals its id shows the id once (WP-29), beside a titled one that shows both (control)', async () => {
    const same = await mount(pairingProps('WP-29'));
    const dep = DETAIL_FIXTURES.detailNoCycles.dependencies[0] as { wpId: string; title: string | null };
    expect(dep.title).toBe(dep.wpId);
    const samePills = [...(rows(frontmatter(same)).get(LABEL_DEPENDENCIES) ?? document.body).querySelectorAll('sk-pill-tag')];
    expect(samePills.map(text)).toEqual([dep.wpId]);
    document.body.replaceChildren();
    const titled = await mount();
    const first = DETAIL_FIXTURES.detailPopulated.dependencies[0] as { wpId: string; title: string };
    expect(first.title).not.toBe(first.wpId);
    const titledPills = [...(rows(frontmatter(titled)).get(LABEL_DEPENDENCIES) ?? document.body).querySelectorAll('sk-pill-tag')];
    expect(text(titledPills[0] as Element)).toBe(`${first.wpId} ${first.title}`);
  });

  it('the pills are not controls: no button, no anchor, no tab stop in the whole panel', async () => {
    const screen = await mount();
    const panel = frontmatter(screen);
    expect(panel.querySelectorAll('sk-pill-tag').length).toBeGreaterThan(0);
    expect(panel.querySelectorAll('a, button, sk-button, [tabindex], input')).toHaveLength(0);
    // positive control: the Dependency chain (WP07's) is where the controls live; the query finds a control where one exists
    const crumb = root(screen).querySelector('[data-region="header"] sk-button');
    expect(crumb).not.toBeNull();
  });

  it('the pill lists draw no list marker (the items are blocks) and the actor can wrap after a colon', async () => {
    const screen = await mount();
    const items = [...frontmatter(screen).querySelectorAll<HTMLElement>('[data-pills] > li')];
    expect(items.length).toBe(3);
    expect(items.every((li) => getComputedStyle(li).display === 'block')).toBe(true);
    expect(must(screen, 'facts').querySelectorAll('wbr')).toHaveLength(2);
    const handle = await mount(workPackageProps('wpActorHandle'));
    expect(must(handle, 'facts').querySelectorAll('wbr')).toHaveLength(0);
  });

  it('requirement references are pills; priority and execution mode are rows only when present', async () => {
    const present = await mount(withWp({ priority: 'high' }));
    const map = rows(frontmatter(present));
    expect([...(map.get(LABEL_REQUIREMENT_REFS) as HTMLElement).querySelectorAll('sk-pill-tag')].map(text)).toEqual(['FR-005', 'FR-006']);
    expect(text(map.get(LABEL_PRIORITY) ?? null)).toBe('high');
    expect(text(map.get(LABEL_EXECUTION_MODE) ?? null)).toBe('code_change');
    const absent = await mount();
    expect(rows(frontmatter(absent)).has(LABEL_PRIORITY)).toBe(false);
    expect(text(frontmatter(absent))).not.toContain(LABEL_PRIORITY);
  });

  it('a Work Package with nothing present still draws the panel heading and the quiet empty form', async () => {
    const none = await mount({
      workPackage: { ...WORK_PACKAGE_FIXTURES.wpPopulated, dependencies: [], requirementRefs: [], priority: null, executionMode: null },
      detail: pairDetail(WORK_PACKAGE_FIXTURES.wpPopulated, DETAIL_FIXTURES.detailDepsNone),
    });
    const panel = frontmatter(none);
    expect(panel.querySelector('h2')).not.toBeNull();
    expect(panel.querySelector('dl')).toBeNull();
    expect(panel.querySelector('.sk-empty-state')).not.toBeNull();
    const populated = await mount();
    expect(frontmatter(populated).querySelector('.sk-empty-state')).toBeNull();
  });

  it('a dependency name appears in no control of the whole screen yet (the chain node is WP07\'s)', async () => {
    const screen = await mount();
    const controls = [...root(screen).querySelectorAll('sk-button, a, button')].filter((el) => frontmatter(screen).contains(el));
    expect(controls).toHaveLength(0);
  });
});
