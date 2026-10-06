import { describe, expect, it } from 'vitest';
import type { HistoryEntryView } from '../src/contract/types.js';
import { wpHistoryRich } from '../src/contract/fixtures.generated.js';
import type { LabelHooks } from '../src/logic/types.js';
import { historyView } from '../src/logic/wp-history.js';

const NOW = '2026-10-03T12:00:00Z';
const entry = (n: number, from: string | null, to: string, extra: Partial<HistoryEntryView> = {}): HistoryEntryView => ({
  eventId: `E${n}`,
  at: `2026-10-03T0${n}:00:00Z`,
  kind: 'transition',
  fromStatusLane: from,
  toStatusLane: to,
  actor: { tool: 'spec-kitty', role: 'implementer', profile: null },
  force: false,
  reason: null,
  reviewVerdict: null,
  ...extra,
});

describe('historyView', () => {
  it('keeps array order, never sorts, and marks the LAST array entry current by position (non-chronological input built by cast)', () => {
    const history = [entry(5, 'planned', 'claimed'), entry(1, 'claimed', 'in_progress'), entry(3, 'in_progress', 'for_review')];
    const items = historyView(history, null, NOW);
    expect(items.map((i) => i.eventId)).toEqual(['E5', 'E1', 'E3']);
    expect(items.map((i) => i.current)).toEqual([false, false, true]);
  });

  it('marks the only entry of a single-entry history current, and an empty history has no current', () => {
    expect(historyView([entry(1, null, 'planned')], null, NOW).map((i) => i.current)).toEqual([true]);
    expect(historyView([], null, NOW)).toEqual([]);
  });

  it('marks current by position, not by value: equal entries and a last entry that looks like an earlier one', () => {
    const same = entry(1, 'planned', 'claimed');
    expect(historyView([same, { ...same }, { ...same }], null, NOW).map((i) => i.current)).toEqual([false, false, true]);
  });

  it('reads forced from force and carries the reason as given, filtering nothing', () => {
    const items = historyView([entry(1, null, 'planned', { force: true, reason: 'operator override' }), entry(2, 'planned', 'claimed')], null, NOW);
    expect(items.length).toBe(2);
    expect(items.map((i) => i.forced)).toEqual([true, false]);
    expect(items.map((i) => i.reason)).toEqual(['operator override', null]);
  });

  it('labels lanes through the table, the hook first, and shows an unknown lane raw', () => {
    const [plain] = historyView([entry(1, 'claimed', 'in_progress')], null, NOW);
    expect(plain?.fromLabel).toBe('claimed');
    expect(plain?.toLabel).toBe('in progress');
    const hooks: LabelHooks = { lane: (l) => (l === 'in_progress' ? 'HOOKED' : undefined) };
    const [hooked] = historyView([entry(1, 'claimed', 'in_progress')], hooks, NOW);
    expect(hooked?.toLabel).toBe('HOOKED');
    expect(hooked?.fromLabel).toBe('claimed');
    const [foreign] = historyView([entry(1, 'brand_new_lane', 'other_lane')], null, NOW);
    expect(foreign?.fromLabel).toBe('brand_new_lane');
    expect(foreign?.toLabel).toBe('other_lane');
  });

  it('has no from label for a first transition (null from lane)', () => {
    expect(historyView([entry(1, null, 'planned')], null, NOW)[0]?.fromLabel).toBeNull();
  });

  it('writes relative time when now is set, the ISO text when now is null, and the time hook first (FR-022)', () => {
    const e = entry(1, null, 'planned', { at: '2026-10-03T09:00:00Z' });
    expect(historyView([e], null, NOW)[0]?.timeText).toBe('3 hours ago');
    expect(historyView([e], null, null)[0]?.timeText).toBe('2026-10-03T09:00:00Z');
    const hooks: LabelHooks = { time: () => 'HOOK TIME' };
    expect(historyView([e], hooks, NOW)[0]?.timeText).toBe('HOOK TIME');
    expect(historyView([e], hooks, null)[0]?.timeText).toBe('HOOK TIME');
  });

  it('gives the raw input for an unparsable timestamp, never undefined or NaN', () => {
    const e = entry(1, null, 'planned', { at: 'not-a-date' as unknown as string });
    const text = historyView([e], null, NOW)[0]?.timeText;
    expect(text).toBe('not-a-date');
    expect(text).not.toContain('NaN');
  });

  it('joins the actor handles and resolves a verdict, with null when there is none', () => {
    const items = historyView(
      [entry(1, 'for_review', 'approved', { reviewVerdict: 'approved' }), entry(2, 'claimed', 'in_progress', { actor: { tool: null, role: null, profile: null } })],
      null,
      NOW,
    );
    expect(items[0]?.actor).toBe('spec-kitty:implementer');
    expect(items[0]?.verdict).toEqual({ label: 'Approved', tone: 'success' });
    expect(items[1]?.actor).toBeNull();
    expect(items[1]?.verdict).toBeNull();
  });

  it('shows a foreign verdict raw', () => {
    const items = historyView([entry(1, 'for_review', 'planned', { reviewVerdict: 'escalated' as unknown as null })], null, NOW);
    expect(items[0]?.verdict).toEqual({ label: 'escalated', tone: 'neutral' });
  });

  it('turns the rich fixture into one item per entry with exactly one current', () => {
    const items = historyView(wpHistoryRich.history, null, NOW);
    expect(items.length).toBe(wpHistoryRich.history.length);
    expect(items.filter((i) => i.current).length).toBe(1);
    expect(items[items.length - 1]?.current).toBe(true);
  });
});
