// T029: the rows of the Ops screen, per story row: the DOM facts (words, tones, fact order, absent facts with a paired present
// fixture), the swept fact, unknown values raw, the `datetime`, the row as no tab stop and no event source (EV-6, with a
// positive control from a sibling), a counted loop over the six rows of a six-row page, and the story catalogue.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { OPS_COPY } from '../src/defaults/ops-copy.js';
import { buildOpsRow } from '../src/logic/ops-row.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_INVOCATION_FIXTURES, opsProps, opsRowProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsInvocationFixtureName, OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import * as rowStories from '../src/elements/sk-ops-screen/sk-ops-screen.rows.stories.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<OpsScreenProps>, width = 1280): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

const root = (screen: SkOpsScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const rowsOf = (screen: SkOpsScreen): HTMLLIElement[] => [...root(screen).querySelectorAll<HTMLLIElement>('li[data-row-id]')];
const factsOf = (row: HTMLElement): Map<string, HTMLElement> =>
  new Map([...row.querySelectorAll('dl > div')].map((pair) => [pair.querySelector('dt')?.textContent?.trim() ?? '', pair.querySelector('dd') as HTMLElement]));
const text = (el: Element | undefined): string => el?.textContent?.trim() ?? '';

const TERMS_BASE = [OPS_COPY.termProfile, OPS_COPY.termAction, OPS_COPY.termActor, OPS_COPY.termStarted, OPS_COPY.termCompleted, OPS_COPY.termEvidence];
const WITH_LINKS = [...TERMS_BASE, OPS_COPY.termMission, OPS_COPY.termWorkPackage, OPS_COPY.termMode];
const WITHOUT_LINKS = [...TERMS_BASE, OPS_COPY.termMode];

interface RowCase {
  story: string;
  fixture: OpsInvocationFixtureName;
  word: string;
  tone: string;
  terms: string[];
}
// One case per story row that shows a single Op; OP-12, OP-13 and OP-26 show several and have their own tests below.
const CASES: RowCase[] = [
  { story: 'OP-02', fixture: 'opsClosedByAgent', word: 'done', tone: 'success', terms: WITH_LINKS },
  { story: 'OP-03', fixture: 'opsFailed', word: 'failed', tone: 'danger', terms: WITH_LINKS },
  { story: 'OP-04', fixture: 'opsAbandoned', word: 'abandoned', tone: 'attention', terms: [...WITHOUT_LINKS, OPS_COPY.termClosedBy] },
  { story: 'OP-05', fixture: 'opsOpen', word: 'open', tone: 'neutral', terms: WITH_LINKS },
  { story: 'OP-06', fixture: 'opsClosedBySweep', word: 'abandoned', tone: 'attention', terms: [...WITHOUT_LINKS, OPS_COPY.termClosedBy] },
  { story: 'OP-07', fixture: 'opsEvidenceNull', word: 'done', tone: 'success', terms: WITHOUT_LINKS },
  { story: 'OP-08', fixture: 'opsEvidenceRepoPath', word: 'done', tone: 'success', terms: WITH_LINKS },
  { story: 'OP-09', fixture: 'opsEvidence512', word: 'done', tone: 'success', terms: WITH_LINKS },
  { story: 'OP-10', fixture: 'opsEvidenceUrl', word: 'failed', tone: 'danger', terms: WITH_LINKS },
  { story: 'OP-11', fixture: 'opsRedactedMarkers', word: 'done', tone: 'success', terms: WITH_LINKS },
  { story: 'OP-14', fixture: 'opsOffsetStart', word: 'open', tone: 'neutral', terms: WITH_LINKS },
  { story: 'OP-33', fixture: 'opsActorNull', word: 'open', tone: 'neutral', terms: WITH_LINKS },
];

describe('one Op per row: the badge, the fact order and the words', () => {
  it.each(CASES)('$story ($fixture)', async ({ fixture, word, tone, terms }) => {
    const screen = await mount(opsRowProps(fixture));
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLLIElement;
    const item = OPS_INVOCATION_FIXTURES[fixture];
    expect(row.getAttribute('data-row-id')).toBe(item.invocationId);
    expect(text(row.querySelector('[data-ops-id]') ?? undefined)).toBe(item.invocationId);
    const badge = row.querySelector('[data-ops-badge]') as HTMLElement;
    expect([text(badge), badge.getAttribute('status')]).toEqual([word, tone]);
    expect([...factsOf(row).keys()]).toEqual(terms);
  });

  it('ran twelve cases over twelve distinct fixtures', () => {
    expect(CASES).toHaveLength(12);
    expect(new Set(CASES.map((c) => c.fixture)).size).toBe(12);
  });
});

describe('what each fact says', () => {
  it('OP-05: an open Op says not recorded yet and shows no outcome beyond the status word', async () => {
    const row = rowsOf(await mount(opsRowProps('opsOpen')))[0] as HTMLLIElement;
    const facts = factsOf(row);
    expect(text(facts.get(OPS_COPY.termCompleted))).toBe(OPS_COPY.quietCompletedOpen);
    expect(text(facts.get(OPS_COPY.termEvidence))).toBe(OPS_COPY.quietEvidenceOpen);
    expect(row.querySelectorAll('time')).toHaveLength(1);
  });

  it('OP-06: a swept Op reads Closed by sweep and its Completed is a time; the agent-closed paired row has no such fact', async () => {
    const swept = rowsOf(await mount(opsRowProps('opsClosedBySweep')))[0] as HTMLLIElement;
    expect(text(factsOf(swept).get(OPS_COPY.termClosedBy))).toBe('sweep');
    expect(swept.querySelectorAll('time')).toHaveLength(2);
    document.body.replaceChildren();
    const agent = rowsOf(await mount(opsRowProps('opsClosedByAgent')))[0] as HTMLLIElement;
    expect(factsOf(agent).has(OPS_COPY.termClosedBy)).toBe(false);
  });

  it('OP-07: a null evidence says Not recorded (never blank, never none) and draws no value', async () => {
    const row = rowsOf(await mount(opsRowProps('opsEvidenceNull')))[0] as HTMLLIElement;
    expect(text(factsOf(row).get(OPS_COPY.termEvidence))).toBe(OPS_COPY.quietEvidenceClosed);
    expect(row.querySelector('[data-ops-evidence]')).toBeNull();
    document.body.replaceChildren();
    const paired = rowsOf(await mount(opsRowProps('opsEvidenceRepoPath')))[0] as HTMLLIElement;
    expect(paired.querySelector('[data-ops-evidence]')).not.toBeNull();
  });

  it('OP-08 to OP-10: the value is plain text whatever its class, with the class word beside it', async () => {
    const cases: [OpsInvocationFixtureName, string][] = [
      ['opsEvidenceRepoPath', 'path'],
      ['opsEvidence512', 'text'],
      ['opsEvidenceUrl', 'address'],
    ];
    let ran = 0;
    for (const [fixture, classWord] of cases) {
      document.body.replaceChildren();
      const row = rowsOf(await mount(opsRowProps(fixture)))[0] as HTMLLIElement;
      const value = OPS_INVOCATION_FIXTURES[fixture].evidence?.value;
      expect(text(row.querySelector('[data-ops-evidence]') ?? undefined), fixture).toBe(value);
      expect(text(row.querySelector('[data-ops-evidence-class]') ?? undefined), fixture).toBe(classWord);
      expect(row.querySelector('a'), fixture).toBeNull();
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('OP-09: the 512-character value is shown in full, not cut, and the row stays inside the screen width', async () => {
    const screen = await mount(opsRowProps('opsEvidence512'));
    const row = rowsOf(screen)[0] as HTMLLIElement;
    const value = OPS_INVOCATION_FIXTURES.opsEvidence512.evidence?.value ?? '';
    expect(value).toHaveLength(512);
    expect(text(row.querySelector('[data-ops-evidence]') ?? undefined)).toBe(value);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(screen.getBoundingClientRect().right);
  });

  it('OP-11: the markers show as given with the changed word, absent from the unredacted paired row', async () => {
    const row = rowsOf(await mount(opsRowProps('opsRedactedMarkers')))[0] as HTMLLIElement;
    const value = text(row.querySelector('[data-ops-evidence]') ?? undefined);
    expect(value).toContain('[path]');
    expect(text(row.querySelector('[data-ops-changed]') ?? undefined)).toBe(OPS_COPY.redactedWord);
    document.body.replaceChildren();
    const plain = rowsOf(await mount(opsRowProps('opsEvidenceText')))[0] as HTMLLIElement;
    expect(plain.querySelector('[data-ops-changed]')).toBeNull();
  });

  it('OP-12: Mission and Work Package show in mono when set and are absent when null (both, one, none)', async () => {
    const items = ['opsOpen', 'opsMissionOnly', 'opsNoMissionNoWp'].map((name) => structuredClone(OPS_INVOCATION_FIXTURES[name as OpsInvocationFixtureName]));
    const screen = await mount({ ...opsRowProps('opsOpen'), items, totalCount: 3 });
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(3);
    const seen = rows.map((row) => {
      const facts = factsOf(row);
      return [facts.has(OPS_COPY.termMission), facts.has(OPS_COPY.termWorkPackage)];
    });
    expect(seen).toEqual([
      [true, true],
      [true, false],
      [false, false],
    ]);
    const first = factsOf(rows[0] as HTMLLIElement);
    expect(first.get(OPS_COPY.termMission)?.hasAttribute('data-ops-mono')).toBe(true);
    expect(text(first.get(OPS_COPY.termMission))).toBe(items[0]?.missionId);
    expect(text(first.get(OPS_COPY.termWorkPackage))).toBe(items[0]?.wpId);
  });

  it('OP-13: each of the four modes shows as its word from the vocabulary', async () => {
    const names: OpsInvocationFixtureName[] = ['opsClosedByAgent', 'opsEvidenceRepoPath', 'opsModeAdvisory', 'opsModeQuery'];
    const screen = await mount({ ...opsRowProps('opsOpen'), items: names.map((name) => structuredClone(OPS_INVOCATION_FIXTURES[name])), totalCount: 4 });
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(4);
    const modes = rows.map((row, index) => [text(factsOf(row).get(OPS_COPY.termMode)), buildOpsRow(OPS_INVOCATION_FIXTURES[names[index] as OpsInvocationFixtureName]).facts.find((f) => f.term === OPS_COPY.termMode)?.value]);
    for (const [shown, expected] of modes) expect(shown).toBe(expected);
    expect(new Set(modes.map(([shown]) => shown)).size).toBe(4);
    expect(modes.map(([shown]) => shown)).not.toContain('mission_step');
  });

  it('OP-14: the text is the UTC instant and datetime is the served string, to the character', async () => {
    const row = rowsOf(await mount(opsRowProps('opsOffsetStart')))[0] as HTMLLIElement;
    const item = OPS_INVOCATION_FIXTURES.opsOffsetStart;
    const time = row.querySelector('time') as HTMLTimeElement;
    expect(item.startedAt).toMatch(/\+02:00$/);
    expect(time.getAttribute('datetime')).toBe(item.startedAt);
    expect(text(time)).toMatch(/UTC$/);
    expect(text(time)).not.toContain('+02:00');
  });

  it('OP-26: a foreign outcome, closer, mode and evidence kind show their raw word with the neutral tone', async () => {
    const names: OpsInvocationFixtureName[] = ['opsUnknownOutcome', 'opsUnknownCloser', 'opsUnknownMode', 'opsUnknownEvidenceKind'];
    const screen = await mount({ ...opsRowProps('opsOpen'), items: names.map((name) => structuredClone(OPS_INVOCATION_FIXTURES[name])), totalCount: 4 });
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(4);
    const badge = rows[0]?.querySelector('[data-ops-badge]') as HTMLElement;
    expect([text(badge), badge.getAttribute('status')]).toEqual(['paused', 'neutral']);
    expect(text(factsOf(rows[1] as HTMLLIElement).get(OPS_COPY.termClosedBy))).toBe('operator');
    expect(text(factsOf(rows[2] as HTMLLIElement).get(OPS_COPY.termMode))).toBe('pairing');
    expect(text(rows[3]?.querySelector('[data-ops-evidence-class]') ?? undefined)).toBe('screenshot');
    for (const row of rows) expect(row.textContent).not.toContain('undefined');
  });

  it('OP-27: long fact values wrap (A11Y-001, no ellipsis) with the full text in the title, and the id and evidence wrap anywhere', async () => {
    const names: OpsInvocationFixtureName[] = ['opsProfile128', 'opsActionLong', 'opsEvidenceUnbroken512'];
    const screen = await mount({ ...opsRowProps('opsOpen'), items: names.map((name) => structuredClone(OPS_INVOCATION_FIXTURES[name])), totalCount: 3 });
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(3);
    const profile = factsOf(rows[0] as HTMLLIElement).get(OPS_COPY.termProfile) as HTMLElement;
    expect(profile.getAttribute('title')).toBe(OPS_INVOCATION_FIXTURES.opsProfile128.profileId);
    // a fact value wraps instead of ellipsizing, so nothing of it is hidden; the unbroken 128-character profile breaks inside its cell
    expect([getComputedStyle(profile).textOverflow, getComputedStyle(profile).whiteSpace, getComputedStyle(profile).overflowWrap]).toEqual(['clip', 'normal', 'break-word']);
    expect(profile.scrollWidth).toBeLessThanOrEqual(profile.clientWidth);
    expect(profile.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(profile).lineHeight) * 1.5);
    const action = factsOf(rows[1] as HTMLLIElement).get(OPS_COPY.termAction) as HTMLElement;
    expect(action.getAttribute('title')).toBe(OPS_INVOCATION_FIXTURES.opsActionLong.action);
    const evidence = rows[2]?.querySelector('[data-ops-evidence]') as HTMLElement;
    expect(getComputedStyle(evidence).overflowWrap).toBe('anywhere');
    expect(evidence.hasAttribute('title')).toBe(false);
    const id = rows[2]?.querySelector('[data-ops-id]') as HTMLElement;
    expect(getComputedStyle(id).overflowWrap).toBe('anywhere');
    for (const row of rows) expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
  });

  it('OP-33: a null actor says Not shown, and the paired row with an actor does not', async () => {
    const quiet = rowsOf(await mount(opsRowProps('opsActorNull')))[0] as HTMLLIElement;
    expect(text(factsOf(quiet).get(OPS_COPY.termActor))).toBe(OPS_COPY.quietActor);
    document.body.replaceChildren();
    const named = rowsOf(await mount(opsRowProps('opsOpen')))[0] as HTMLLIElement;
    expect(text(factsOf(named).get(OPS_COPY.termActor))).toBe('claude');
  });
});

describe('Ops G-1: the facts are separated by a one-pixel divider, and the last fact has none', () => {
  it('each fact but the last has a 1px solid default-border divider below it; the last has none; the pitch is line + 24 + 1 (OP-02)', async () => {
    const screen = await mount(opsRowProps('opsClosedByAgent'), 1280);
    const row = rowsOf(screen)[0] as HTMLLIElement;
    const pairs = [...row.querySelectorAll<HTMLElement>('dl > div')];
    expect(pairs).toHaveLength(buildOpsRow(OPS_INVOCATION_FIXTURES.opsClosedByAgent).facts.length);
    const probe = document.createElement('span');
    probe.style.borderColor = 'var(--sk-border-default)';
    probe.style.borderStyle = 'solid';
    root(screen).append(probe);
    const colour = getComputedStyle(probe).borderBlockEndColor;
    probe.remove();
    expect(colour).not.toBe('');
    let divided = 0;
    pairs.forEach((pair, index) => {
      const style = getComputedStyle(pair);
      if (index < pairs.length - 1) {
        expect([style.borderBlockEndWidth, style.borderBlockEndStyle, style.borderBlockEndColor], `fact ${index}`).toEqual(['1px', 'solid', colour]);
        divided += 1;
      } else {
        expect(style.borderBlockEndWidth, 'last fact').toBe('0px');
      }
    });
    expect(divided).toBe(pairs.length - 1);
    // The pitch is derived, not assumed to be a single line: the line height is the pinned 1.5 of the value's font size, the value's
    // height is whole lines of it, and the pair adds the pinned 12px above and below and the 1px divider.
    const value = pairs[0]?.querySelector('dd') as HTMLElement;
    const valueStyle = getComputedStyle(value);
    const line = parseFloat(valueStyle.lineHeight);
    expect(line).toBeCloseTo(parseFloat(valueStyle.fontSize) * 1.5, 2);
    const pairStyle = getComputedStyle(pairs[0] as HTMLElement);
    expect([pairStyle.paddingBlockStart, pairStyle.paddingBlockEnd, pairStyle.borderBlockEndWidth]).toEqual(['12px', '12px', '1px']);
    const lines = Math.round(value.getBoundingClientRect().height / line);
    expect(lines).toBeGreaterThanOrEqual(1);
    expect(value.getBoundingClientRect().height).toBeCloseTo(lines * line, 1);
    expect(pairs[0]?.getBoundingClientRect().height).toBeCloseTo(lines * line + 12 + 12 + 1, 1);
  });
});

describe('Ops G-2: the badge tag takes padding 4px 8px and line height 1.2 (OP-02)', () => {
  it('the tag part computes padding 4px 8px, a line height of 1.2 times its font size, and a height of line + 8 + 2 (the 1px borders)', async () => {
    const screen = await mount(opsRowProps('opsClosedByAgent'), 1280);
    const badge = (rowsOf(screen)[0] as HTMLLIElement).querySelector('[data-ops-badge]') as HTMLElement;
    const tag = badge.shadowRoot?.querySelector('[part~="tag"]') as HTMLElement;
    expect(tag).not.toBeNull();
    const style = getComputedStyle(tag);
    expect([style.paddingTop, style.paddingBottom, style.paddingLeft, style.paddingRight]).toEqual(['4px', '4px', '8px', '8px']);
    const size = parseFloat(style.fontSize);
    expect(parseFloat(style.lineHeight)).toBeCloseTo(size * 1.2, 2);
    expect(tag.getBoundingClientRect().height).toBeCloseTo(size * 1.2 + 4 + 4 + 1 + 1, 1);
  });
});

describe('the badge keeps its own width when the head stacks (CP-1 S-O3)', () => {
  it('the badge is as wide at 390 as at 1280, and the stacked head is a column (positive control), for a short and a long word', async () => {
    let ran = 0;
    for (const fixture of ['opsClosedByAgent', 'opsUnknownOutcome'] as const) {
      const wide = await mount(opsRowProps(fixture), 1280);
      const wideHead = (rowsOf(wide)[0] as HTMLLIElement).querySelector('[data-ops-head]') as HTMLElement;
      expect(getComputedStyle(wideHead).flexDirection, fixture).toBe('row');
      const atWide = ((rowsOf(wide)[0] as HTMLLIElement).querySelector('[data-ops-badge]') as HTMLElement).getBoundingClientRect().width;
      document.body.replaceChildren();
      const narrow = await mount(opsRowProps(fixture), 390);
      const row = rowsOf(narrow)[0] as HTMLLIElement;
      expect(getComputedStyle(row.querySelector('[data-ops-head]') as HTMLElement).flexDirection, fixture).toBe('column');
      const atNarrow = (row.querySelector('[data-ops-badge]') as HTMLElement).getBoundingClientRect().width;
      expect(atWide, fixture).toBeGreaterThan(0);
      expect(atNarrow, fixture).toBe(atWide);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('the six rows of a six-row page', () => {
  it('draws one li per item in the order served, each with its badge, seven or more facts and the pinned attributes', async () => {
    const props = opsProps.longPage(6);
    const screen = await mount(props);
    const rows = rowsOf(screen);
    expect(props.items).toHaveLength(6);
    expect(rows).toHaveLength(6);
    let ran = 0;
    rows.forEach((row, index) => {
      const item = props.items[index];
      expect(row.getAttribute('data-row-id')).toBe(item?.invocationId);
      expect(row.querySelectorAll('[data-ops-id]')).toHaveLength(1);
      expect(row.querySelectorAll('[data-ops-badge]')).toHaveLength(1);
      expect(factsOf(row).size).toBe(buildOpsRow(item as NonNullable<typeof item>).facts.length);
      ran += 1;
    });
    expect(ran).toBe(6);
  });

  it('never re-sorts: a reversed copy of the page draws the reversed order', async () => {
    const props = opsProps.longPage(6);
    const reversed = [...props.items].reverse();
    const screen = await mount({ ...props, items: reversed });
    expect(rowsOf(screen).map((row) => row.getAttribute('data-row-id'))).toEqual(reversed.map((item) => item.invocationId));
    expect(reversed.map((item) => item.invocationId)).not.toEqual(props.items.map((item) => item.invocationId));
  });
});

describe('a row is not interactive (EV-6, FR-006)', () => {
  const EVENTS = ['sk-load-more', 'sk-retry-load'] as const;

  it('clicking a row, the id, the evidence value and a time emits nothing, while the sibling Load more emits once', async () => {
    const screen = await mount(opsProps.longPage(6));
    const seen: string[] = [];
    for (const name of EVENTS) screen.parentElement?.addEventListener(name, () => seen.push(name));
    const rows = rowsOf(screen);
    const row = rows.find((candidate) => candidate.querySelector('[data-ops-evidence]') !== null) as HTMLLIElement;
    const targets: Element[] = [row, row.querySelector('[data-ops-id]') as Element, row.querySelector('[data-ops-evidence]') as Element, row.querySelector('time') as Element];
    expect(targets.every((target) => target !== null && target !== undefined)).toBe(true);
    for (const target of targets) await userEvent.click(target);
    expect(seen).toEqual([]);
    const more = root(screen).querySelector('[data-load-more]') as HTMLElement;
    await userEvent.click(more);
    expect(seen).toEqual(['sk-load-more']);
  });

  it('Tab walks the controls and never lands in a row; the sibling control is reached (positive control)', async () => {
    const screen = await mount(opsProps.longPage(6));
    (document.activeElement as HTMLElement | null)?.blur();
    const landed: boolean[] = [];
    let reachedControl = false;
    for (let step = 0; step < 4; step += 1) {
      await userEvent.tab();
      const active = root(screen).activeElement;
      landed.push(active !== null && rowsOf(screen).some((row) => row.contains(active)));
      if (active?.hasAttribute('data-load-more') === true) reachedControl = true;
    }
    expect(landed).toEqual([false, false, false, false]);
    expect(reachedControl).toBe(true);
  });

  it('has no tabindex, role or listener hook on any row or descendant of a six-row page', async () => {
    const screen = await mount(opsProps.longPage(6));
    let nodes = 0;
    for (const row of rowsOf(screen)) {
      for (const node of [row, ...row.querySelectorAll('*')]) {
        expect(node.hasAttribute('tabindex'), node.tagName).toBe(false);
        expect(node.hasAttribute('role'), node.tagName).toBe(false);
        nodes += 1;
      }
    }
    // Counted: the six rows of the six-row page are 283 nodes in all (a row is its li and its descendants; the page is fixed data).
    expect(nodes).toBe(283);
  });
});

describe('the story catalogue of the rows', () => {
  const stories = Object.entries(rowStories).filter(([key]) => key !== 'default');
  const NUMBERS = ['02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '26', '27', '33'];

  it('holds exactly sixteen stories under Screens/Ops/Rows, one per row', () => {
    expect((rowStories.default as { title: string }).title).toBe('Screens/Ops/Rows');
    expect(stories).toHaveLength(16);
    expect(stories.map(([key]) => key.replace(/^Op(\d\d).*$/, '$1'))).toEqual(NUMBERS);
  });

  it('tags each story with its row tag and exactly one tier tag', () => {
    let ran = 0;
    for (const [key, story] of stories) {
      const tags = (story as { tags?: string[] }).tags ?? [];
      const number = key.replace(/^Op(\d\d).*$/, '$1');
      expect(tags.filter((tag) => /^op-\d\d[a-z]?$/.test(tag)), key).toEqual([`op-${number}`]);
      expect(tags.filter((tag) => /^vw-\d+$/.test(tag)), key).toEqual(['vw-1280']);
      ran += 1;
    }
    expect(ran).toBe(16);
  });
});
