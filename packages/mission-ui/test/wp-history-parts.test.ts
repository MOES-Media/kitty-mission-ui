// Lane history (WP06, IC-05): the semantic ordered list on the adopted event-timeline sheet, in array order. Order tests use
// cast inputs so that a later sort fails them. Every DOM-absence test is paired with a sibling where the element is present.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame, workPackageProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { HistoryEntryView, WorkPackageRecordView } from '../src/contract/types.js';
import { CURRENT_MARKER, FORCED_WORD, HISTORY_TITLE, NO_HISTORY_TEXT, VERDICT_BADGES } from '../src/defaults/index.js';
import { resolveActivity, resolveVerdict } from '../src/logic/index.js';
import type { LabelHooks } from '../src/logic/index.js';

const NOW = '2026-09-24T10:00:00Z';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> & { labels?: LabelHooks } = {}, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), now: NOW, ...props });
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
const historyRegion = (screen: SkWorkPackageScreen): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('[data-region="history"]');
  if (found === null) throw new Error('no history region');
  return found;
};
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const items = (screen: SkWorkPackageScreen): HTMLElement[] => [...historyRegion(screen).querySelectorAll<HTMLElement>('ol > li')];

/** A history entry built from a cast: every field of the contract, nothing derived. */
function entry(id: string, at: string, from: string | null, to: string, extra: Partial<HistoryEntryView> = {}): HistoryEntryView {
  return {
    eventId: id,
    at,
    kind: 'transition',
    fromStatusLane: from,
    toStatusLane: to,
    actor: { tool: 'claude', role: null, profile: null },
    force: false,
    reason: null,
    reviewVerdict: null,
    ...extra,
  } as HistoryEntryView;
}
const withHistory = (history: HistoryEntryView[]): WorkPackageRecordView => ({ ...WORK_PACKAGE_FIXTURES.wpPopulated, history });
const propsOf = (wp: WorkPackageRecordView): Partial<WpScreenProps> & { labels?: LabelHooks } => ({ ...workPackageProps('wpPopulated'), workPackage: wp });

describe('Lane history: a semantic ordered list in array order', () => {
  it('draws one ol with one li per entry, named by the panel heading, with the adopted timeline classes', async () => {
    const screen = await mount(workPackageProps('wpHistoryRich'));
    const region = historyRegion(screen);
    const lists = region.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    const list = lists[0] as HTMLOListElement;
    expect(list.classList.contains('sk-event-timeline')).toBe(true);
    const labelledBy = region.querySelector('section')?.getAttribute('aria-labelledby') ?? '';
    expect(text(root(screen).getElementById(labelledBy))).toBe(HISTORY_TITLE);
    expect(list.hasAttribute('aria-label')).toBe(false);
    expect(list.getAttribute('aria-labelledby')).toBe(labelledBy);
    const rows = items(screen);
    expect(rows).toHaveLength(WORK_PACKAGE_FIXTURES.wpHistoryRich.history.length);
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(row.classList.contains('sk-event-timeline__item')).toBe(true);
      expect(row.querySelector('.sk-event-timeline__summary')).not.toBeNull();
    }
  });

  it('keeps array order: a non-chronological history is not sorted, and "Current" sits on the LAST array element, not the latest time', async () => {
    const history = [
      entry('e1', '2026-09-24T09:00:00Z', null, 'planned'),
      entry('e2', '2026-09-20T09:00:00Z', 'planned', 'claimed'),
      entry('e3', '2026-09-22T09:00:00Z', 'claimed', 'in_progress'),
    ];
    const screen = await mount(propsOf(withHistory(history)));
    const rows = items(screen);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => text(row.querySelector('.sk-event-timeline__summary')))).toEqual(['planned', 'planned → claimed', 'claimed → in progress']);
    const marked = rows.filter((row) => row.querySelector('.sk-event-timeline__marker') !== null);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(rows[2]);
    expect(text(marked[0]?.querySelector('.sk-event-timeline__marker') ?? null)).toBe(CURRENT_MARKER);
  });

  it('"Current" is positional: a terminal lane in the MIDDLE of the array is not marked, and the last (non-terminal) entry is', async () => {
    // A lane-keyed marker (done or canceled means current) would mark e2 and e4 and miss e5.
    const history = [
      entry('e1', '2026-09-20T09:00:00Z', null, 'planned'),
      entry('e2', '2026-09-21T09:00:00Z', 'planned', 'done'),
      entry('e3', '2026-09-22T09:00:00Z', 'done', 'in_progress'),
      entry('e4', '2026-09-23T09:00:00Z', 'in_progress', 'canceled'),
      entry('e5', '2026-09-24T09:00:00Z', 'canceled', 'claimed'),
    ];
    const screen = await mount(propsOf(withHistory(history)));
    const rows = items(screen);
    expect(rows).toHaveLength(5);
    const marked = rows.filter((row) => row.querySelector('.sk-event-timeline__marker') !== null);
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(rows[4]);
    expect(text(rows[1]?.querySelector('.sk-event-timeline__summary') ?? null)).toBe('planned → done');
    expect(rows[1]?.querySelector('.sk-event-timeline__marker')).toBeNull();
    expect(text(rows[3]?.querySelector('.sk-event-timeline__summary') ?? null)).toBe('in progress → canceled');
    expect(rows[3]?.querySelector('.sk-event-timeline__marker')).toBeNull();
    // Positive control: a history that ENDS in a terminal lane marks that last entry.
    document.body.replaceChildren();
    const ended = await mount(propsOf(withHistory([...history.slice(0, 4)])));
    const endedRows = items(ended);
    expect(endedRows).toHaveLength(4);
    expect(endedRows.filter((row) => row.querySelector('.sk-event-timeline__marker') !== null)).toEqual([endedRows[3]]);
  });

  it('a single entry is Current; an empty history draws the empty form and no marker (positive control: the single entry)', async () => {
    const single = await mount(propsOf(withHistory([entry('e1', '2026-09-24T09:00:00Z', null, 'planned')])));
    expect(items(single)).toHaveLength(1);
    expect(historyRegion(single).querySelectorAll('.sk-event-timeline__marker')).toHaveLength(1);
    expect(text(historyRegion(single))).toContain(CURRENT_MARKER);
    expect(text(historyRegion(single))).not.toContain(NO_HISTORY_TEXT);
    document.body.replaceChildren();
    const empty = await mount(propsOf(withHistory([])));
    const region = historyRegion(empty);
    expect(region.querySelectorAll('ol')).toHaveLength(0);
    expect(region.querySelectorAll('li')).toHaveLength(0);
    expect(region.querySelectorAll('.sk-event-timeline__marker')).toHaveLength(0);
    expect(text(region)).not.toContain(CURRENT_MARKER);
    expect(text(region)).toContain(NO_HISTORY_TEXT);
    expect(region.querySelectorAll('.sk-empty-state')).toHaveLength(1);
  });

  it('the first entry has no "from"; later entries read "from → to" with the lane words from the label hook', async () => {
    const screen = await mount(propsOf(withHistory([entry('e1', '2026-09-20T09:00:00Z', null, 'planned'), entry('e2', '2026-09-21T09:00:00Z', 'planned', 'claimed')])), 1280);
    const summaries = items(screen).map((row) => text(row.querySelector('.sk-event-timeline__summary')));
    expect(summaries).toHaveLength(2);
    expect(summaries[0]).not.toContain('→');
    expect(summaries[1]).toContain('→');
    document.body.replaceChildren();
    const hooked = await mount({ ...propsOf(withHistory([entry('e1', '2026-09-20T09:00:00Z', 'planned', 'claimed')])), labels: { lane: (value: string) => `lane:${value}` } });
    expect(text(items(hooked)[0]?.querySelector('.sk-event-timeline__summary') ?? null)).toBe('lane:planned → lane:claimed');
  });

  it('draws the relative time, the actor, "forced" in words and the reason; a plain entry draws neither forced nor reason', async () => {
    const forced = entry('e2', '2026-09-24T08:00:00Z', 'planned', 'claimed', { force: true, reason: 'Operator override of the order.' });
    const plain = entry('e1', '2026-09-24T09:00:00Z', null, 'planned');
    const screen = await mount(propsOf(withHistory([plain, forced])));
    const [plainRow, forcedRow] = items(screen) as [HTMLElement, HTMLElement];
    expect(text(forcedRow)).toContain(FORCED_WORD);
    expect(text(forcedRow)).toContain('Operator override of the order.');
    expect(text(forcedRow)).toContain(resolveActivity('2026-09-24T08:00:00Z', NOW, null));
    expect(text(forcedRow)).toContain('claude');
    expect(text(plainRow)).not.toContain(FORCED_WORD);
    expect(plainRow.querySelector('.sk-event-timeline__content')).toBeNull();
    expect(forcedRow.querySelector('.sk-event-timeline__content')).not.toBeNull();
    expect(text(plainRow)).toContain(resolveActivity('2026-09-24T09:00:00Z', NOW, null));
  });

  it('the review verdict is text through the verdict table; a foreign verdict shows its raw text, never undefined', async () => {
    const known = Object.keys(VERDICT_BADGES)[0] as string;
    const history = [
      entry('e1', '2026-09-24T09:00:00Z', 'in_review', 'planned', { reviewVerdict: known } as unknown as Partial<HistoryEntryView>),
      entry('e2', '2026-09-24T09:30:00Z', 'planned', 'claimed', { reviewVerdict: 'needs_coffee' } as unknown as Partial<HistoryEntryView>),
      entry('e3', '2026-09-24T09:40:00Z', 'claimed', 'in_progress'),
    ];
    const screen = await mount(propsOf(withHistory(history)));
    const rows = items(screen);
    expect(rows).toHaveLength(3);
    expect(text(rows[0] ?? null)).toContain(resolveVerdict(known).label);
    expect(text(rows[1] ?? null)).toContain('needs_coffee');
    expect(text(historyRegion(screen))).not.toContain('undefined');
    expect(rows[2]?.querySelector('sk-pill-tag')).toBeNull();
    expect(rows[0]?.querySelectorAll('sk-pill-tag')).toHaveLength(1);
  });

  it('foreign lane values render raw, in array order', async () => {
    const history = [entry('e1', '2026-09-24T09:00:00Z', null, 'zz_unknown'), entry('e2', '2026-09-24T09:30:00Z', 'zz_unknown', 'yy_other')];
    const screen = await mount(propsOf(withHistory(history)));
    const summaries = items(screen).map((row) => text(row.querySelector('.sk-event-timeline__summary')));
    expect(summaries).toEqual(['zz_unknown', 'zz_unknown → yy_other']);
    expect(text(historyRegion(screen))).not.toContain('undefined');
  });

  it('the "N files modified" text of the prototype is not drawn', async () => {
    const screen = await mount(workPackageProps('wpHistoryRich'));
    expect(text(historyRegion(screen))).not.toMatch(/files modified/);
  });
});

describe('the two lane vocabularies (CONTRACT-003, DW-10 note in the tracer)', () => {
  const words = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  it('a host with only labels.state leaves the history words unchanged, while the header badge follows the hook; labels.lane renames the history', async () => {
    const plain = await mount({});
    const baseHistory = words(historyRegion(plain));
    const baseBadge = words(root(plain).querySelector('[data-region="header"] sk-pill-tag'));
    expect(baseHistory).not.toBe('');
    document.body.replaceChildren();

    const stated = await mount({ labels: { state: () => ({ label: 'Hooked state word', tone: 'neutral' }) } });
    expect(words(historyRegion(stated)), 'history rows ignore labels.state').toBe(baseHistory);
    expect(words(root(stated).querySelector('[data-region="header"] sk-pill-tag')), 'positive control: the card badge follows it').toBe('Hooked state word');
    expect(baseBadge).not.toBe('Hooked state word');
    document.body.replaceChildren();

    const laned = await mount({ labels: { lane: (lane: string) => `Lane word ${lane}` } });
    const renamed = words(historyRegion(laned));
    expect(renamed).not.toBe(baseHistory);
    expect(renamed).toContain('Lane word ');
    expect(words(root(laned).querySelector('[data-region="header"] sk-pill-tag')), 'labels.lane does not touch the card badge').toBe(baseBadge);
  });
});
