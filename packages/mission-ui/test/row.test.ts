import { describe, expect, it } from 'vitest';
import { makeMission } from '../src/contract/bulk.js';
import type { MissionOverviewView } from '../src/contract/types.js';
import { BLOCKED_ROW_BADGE, DEFAULT_LANE_GROUPS, LIFECYCLE_BADGES, NO_ACTIVITY_TEXT } from '../src/defaults/index.js';
import { buildRowView } from '../src/logic/row.js';

const NOW = '2026-10-03T12:00:00Z';
const base = (over: Partial<MissionOverviewView>): MissionOverviewView => ({ ...makeMission(1), ...over });
const zero = { planned: 0, claimed: 0, in_progress: 0, for_review: 0, in_review: 0, approved: 0, done: 0, blocked: 0, canceled: 0 };

describe('buildRowView', () => {
  it('assembles identity, text and badges of one row', () => {
    const m = base({
      missionId: 'M1',
      slug: 'a-slug',
      friendlyName: 'A Name',
      missionType: 'research',
      topology: 'coord',
      lifecycleStatus: 'active',
      statusLaneCounts: { ...zero, done: 2, in_review: 1 },
      blockedCount: 0,
      lastActivityAt: new Date(Date.parse(NOW) - 3 * 3600_000).toISOString(),
    });
    expect(buildRowView(m, DEFAULT_LANE_GROUPS, null, NOW)).toEqual({
      missionId: 'M1',
      slug: 'a-slug',
      name: 'A Name',
      type: 'research',
      topology: 'coord',
      blockedBadge: null,
      stale: false,
      lifecycle: LIFECYCLE_BADGES['active'],
      summary: '2 done · 1 in review',
      activity: '3 hours ago',
    });
  });

  it('blockedBadge is present exactly when blockedCount is above 0, with the count as given', () => {
    expect(buildRowView(base({ blockedCount: 0 }), DEFAULT_LANE_GROUPS, null, NOW).blockedBadge).toBeNull();
    const row = buildRowView(base({ blockedCount: 3 }), DEFAULT_LANE_GROUPS, null, NOW);
    expect(row.blockedBadge).toEqual(BLOCKED_ROW_BADGE(3));
    expect(row.blockedBadge?.label).toBe('3 blocked');
  });

  it('stale follows the host flag; absent means not stale (positive control: true is read)', () => {
    expect(buildRowView(base({}), DEFAULT_LANE_GROUPS, null, NOW).stale).toBe(false);
    expect(buildRowView(base({ stale: false }), DEFAULT_LANE_GROUPS, null, NOW).stale).toBe(false);
    expect(buildRowView(base({ stale: true }), DEFAULT_LANE_GROUPS, null, NOW).stale).toBe(true);
  });

  it('gives a lifecycle badge for each of the five lifecycle values, and keeps a stale active Mission active', () => {
    const values = ['active', 'planned', 'done', 'draft', 'discarded'] as const;
    for (const v of values) expect(buildRowView(base({ lifecycleStatus: v }), DEFAULT_LANE_GROUPS, null, NOW).lifecycle, v).toBe(LIFECYCLE_BADGES[v]);
    expect(new Set(values.map((v) => LIFECYCLE_BADGES[v]?.label)).size).toBe(5);
    const both = buildRowView(base({ lifecycleStatus: 'active', stale: true }), DEFAULT_LANE_GROUPS, null, NOW);
    expect(both.lifecycle).toBe(LIFECYCLE_BADGES['active']);
    expect(both.stale).toBe(true);
  });

  it('an unknown lifecycle value is shown raw in a neutral badge', () => {
    const row = buildRowView(base({ lifecycleStatus: 'paused' as MissionOverviewView['lifecycleStatus'] }), DEFAULT_LANE_GROUPS, null, NOW);
    expect(row.lifecycle).toEqual({ label: 'paused', tone: 'neutral' });
  });

  it('activity: no activity, relative with now, ISO without now, hook wins', () => {
    const iso = new Date(Date.parse(NOW) - 2 * 86400_000 * 1).toISOString();
    expect(buildRowView(base({ lastActivityAt: null }), DEFAULT_LANE_GROUPS, null, NOW).activity).toBe(NO_ACTIVITY_TEXT);
    expect(buildRowView(base({ lastActivityAt: iso }), DEFAULT_LANE_GROUPS, null, NOW).activity).toBe('2 days ago');
    expect(buildRowView(base({ lastActivityAt: iso }), DEFAULT_LANE_GROUPS, null, null).activity).toBe(iso);
    expect(buildRowView(base({ lastActivityAt: iso }), DEFAULT_LANE_GROUPS, { time: () => 'hooked' }, NOW).activity).toBe('hooked');
  });

  it('type may be null, and the topology word is passed through as given', () => {
    const row = buildRowView(base({ missionType: null, topology: 'unknown' }), DEFAULT_LANE_GROUPS, null, NOW);
    expect(row.type).toBeNull();
    expect(row.topology).toBe('unknown');
  });

  it('an all-zero mission has an empty summary', () => {
    expect(buildRowView(base({ statusLaneCounts: { ...zero } }), DEFAULT_LANE_GROUPS, null, NOW).summary).toBe('');
  });
});
