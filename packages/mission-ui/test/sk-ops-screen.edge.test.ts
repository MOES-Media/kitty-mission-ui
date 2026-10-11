// T045: the edge cases of the Ops screen: every nullable field of a row as null (the contract's `exactOptionalPropertyTypes`
// shape: present and null, never omitted), a foreign profile of 128 characters, `pageInfo` null with `ready`, a `totalCount`
// smaller than the loaded rows, no items with skipped records, duplicate ids and a service order the screen never changes.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { OPS_COPY } from '../src/defaults/ops-copy.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_INVOCATION_FIXTURES, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsInvocationView } from '../src/contract/types.js';

afterEach(() => {
  document.body.replaceChildren();
});

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));

async function mount(props: Partial<OpsScreenProps>, width = 1280): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await screen.updateComplete;
  await frames();
  return screen;
}
const root = (screen: SkOpsScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const rowsOf = (screen: SkOpsScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('li[data-row-id]')];
const termsOf = (row: HTMLElement): string[] => [...row.querySelectorAll('dt')].map((t) => t.textContent?.trim() ?? '');
const noUndefined = (screen: SkOpsScreen): boolean => !(root(screen).textContent ?? '').includes('undefined') && !(root(screen).textContent ?? '').includes('null');

const OPEN = OPS_INVOCATION_FIXTURES.opsOpen;
const asProps = (items: OpsInvocationView[], over: Partial<OpsScreenProps> = {}): Partial<OpsScreenProps> => ({
  ...opsProps.ready(),
  items,
  pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 },
  totalCount: items.length,
  ...over,
});

describe('nullable fields are null, never omitted', () => {
  it('a row with every nullable field null draws no undefined and no null, with quiet words; its paired full row draws the facts', async () => {
    const bare: OpsInvocationView = { ...structuredClone(OPEN), actor: null, completedAt: null, evidence: null, missionId: null, wpId: null, closedBy: null, outcome: null };
    const full = OPS_INVOCATION_FIXTURES.opsClosedBySweep;
    const nulls = await mount(asProps([bare]));
    const row = rowsOf(nulls)[0] as HTMLElement;
    expect(noUndefined(nulls)).toBe(true);
    expect(termsOf(row)).toEqual([OPS_COPY.termProfile, OPS_COPY.termAction, OPS_COPY.termActor, OPS_COPY.termStarted, OPS_COPY.termCompleted, OPS_COPY.termEvidence, OPS_COPY.termMode]);
    expect(row.textContent).toContain(OPS_COPY.quietActor);
    document.body.replaceChildren();
    const present = await mount(asProps([OPEN, full]));
    const terms = rowsOf(present).flatMap(termsOf);
    for (const term of [OPS_COPY.termMission, OPS_COPY.termWorkPackage, OPS_COPY.termClosedBy]) expect(terms, term).toContain(term);
  });

  it('every nullable field alone as null leaves the other facts and draws no undefined (7 fields, counted)', async () => {
    const fields = ['actor', 'completedAt', 'evidence', 'missionId', 'wpId', 'closedBy', 'outcome'] as const;
    let ran = 0;
    for (const field of fields) {
      const item = { ...structuredClone(OPS_INVOCATION_FIXTURES.opsClosedBySweep), [field]: null } as OpsInvocationView;
      const screen = await mount(asProps([item]));
      expect(rowsOf(screen), field).toHaveLength(1);
      expect(noUndefined(screen), field).toBe(true);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(7);
  });
});

describe('a foreign profile of 128 characters', () => {
  const long = OPS_INVOCATION_FIXTURES.opsProfile128.profileId;

  it('is the profile fact of a filtered ready look, wrapped (A11Y-001) with its full text as title, and nothing overflows', async () => {
    expect(long).toHaveLength(128);
    const items = [structuredClone(OPS_INVOCATION_FIXTURES.opsProfile128)];
    const screen = await mount(asProps(items, { profile: long }), 390);
    const fact = root(screen).querySelector('[data-profile-fact]') as HTMLElement;
    expect(fact.getAttribute('title')).toContain(long);
    expect(fact.scrollWidth).toBeLessThanOrEqual(fact.clientWidth);
    expect(getComputedStyle(fact).textOverflow).toBe('clip');
    expect(fact.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(fact).fontSize) * 2.5);
    const cell = root(screen).querySelector('[data-ops-cell]') as HTMLElement;
    expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  });

  it('is named in the empty look and wraps there (Ops G-5), with no overflow', async () => {
    const screen = await mount({ ...opsProps.empty(), profile: long }, 390);
    const code = root(screen).querySelector('[data-empty-profile]') as HTMLElement;
    expect(code.textContent).toBe(long);
    expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth);
    expect(code.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(code).lineHeight));
  });
});

describe('page and count shapes', () => {
  it('ready with pageInfo null: the rows draw, there is no Load more, nothing throws', async () => {
    const withNext = await mount({ ...opsProps.longPage(6) });
    expect(root(withNext).querySelectorAll('[data-load-more]')).toHaveLength(1);
    document.body.replaceChildren();
    const screen = await mount({ ...opsProps.longPage(6), pageInfo: null });
    expect(rowsOf(screen)).toHaveLength(6);
    expect(root(screen).querySelectorAll('[data-load-more]')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[data-retry]')).toHaveLength(0);
  });

  it('a totalCount smaller than the loaded rows is shown as given', async () => {
    const screen = await mount({ ...opsProps.longPage(6), totalCount: 3 });
    expect(rowsOf(screen)).toHaveLength(6);
    expect(root(screen).querySelector('[data-count]')?.textContent?.trim()).toBe('6 of 3');
    document.body.replaceChildren();
    const normal = await mount({ ...opsProps.longPage(6), totalCount: 249 });
    expect(root(normal).querySelector('[data-count]')?.textContent?.trim()).toBe('6 of 249');
  });

  it('no items with skipped records: the empty look names the count and the skipped note is not drawn twice', async () => {
    const screen = await mount({ ...opsProps.empty(), status: 'ready', skippedCount: 3 });
    expect(rowsOf(screen)).toHaveLength(0);
    expect(root(screen).textContent).toContain('3 records in this project could not be read');
    expect(root(screen).querySelectorAll('[data-focus-target]')).toHaveLength(1);
    document.body.replaceChildren();
    const none = await mount({ ...opsProps.empty(), status: 'ready', skippedCount: 0 });
    expect(root(none).textContent).not.toContain('could not be read');
  });
});

describe('order and identity', () => {
  it('duplicate ids are drawn as given: two rows, no dedupe', async () => {
    const a = structuredClone(OPEN);
    const b = { ...structuredClone(OPEN), action: 'second-copy' };
    const screen = await mount(asProps([a, b]));
    const rows = rowsOf(screen);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.getAttribute('data-row-id'))).toEqual([OPEN.invocationId, OPEN.invocationId]);
    expect(rows[1]?.textContent).toContain('second-copy');
    expect(rows[0]?.textContent).not.toContain('second-copy');
  });

  it('the screen never re-sorts: an order no sort would produce is the DOM order, and a property change keeps it', async () => {
    const make = (id: string, startedAt: string): OpsInvocationView => ({ ...structuredClone(OPEN), invocationId: id, startedAt });
    const items = [make('01K6TZ0000000000000000MID1', '2026-10-05T10:00:00Z'), make('01K6TZ0000000000000000OLD1', '2026-10-01T10:00:00Z'), make('01K6TZ0000000000000000NEW1', '2026-10-09T10:00:00Z'), make('01K6TZ0000000000000000MID2', '2026-10-05T10:00:00Z')];
    const screen = await mount(asProps(items));
    const ids = (): Array<string | null> => rowsOf(screen).map((r) => r.getAttribute('data-row-id'));
    expect(ids()).toEqual(items.map((i) => i.invocationId));
    screen.totalCount = 99;
    await screen.updateComplete;
    expect(ids()).toEqual(items.map((i) => i.invocationId));
    // Positive control: the host reordering its items reorders the rows.
    screen.items = [...items].reverse();
    await screen.updateComplete;
    expect(ids()).toEqual([...items].reverse().map((i) => i.invocationId));
  });
});
