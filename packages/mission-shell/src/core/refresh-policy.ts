// The refresh policy (plan IC-02, data-model "Refresh policy"): which displayed resources a stream change re-reads. Plain
// TypeScript: no Svelte, no timers, no I/O. The table is data, one row per line (plant P-1 anchors on a row).
import type { Change } from '../client/port';
import { ofMission, type ResourceKey } from './displayed';

/**
 * What a row selects among the displayed keys, for one change about Mission M (and work package W):
 * - `mission`: `mission:{M}`;
 * - `wp`: `wp:{M}/{W}` and `wp-detail:{M}/{W}` for the change's own W only;
 * - `missions`: the Missions screen's page chain, never `mission-names` (research R-04);
 * - `of-mission`: every key whose read parameters carry `missionId = M` (`drift:{M}` included, `drift:*` not);
 * - `all`: every displayed key.
 */
export type Selector = 'mission' | 'wp' | 'missions' | 'of-mission' | 'all';

export const REFRESH_POLICY = {
  'status-transition': ['mission', 'wp', 'missions'],
  'mission-lifecycle': ['missions', 'mission'],
  'log-truncated': ['of-mission', 'missions'],
  resync: ['all'],
  refused: [],
} as const satisfies Record<Change['kind'], readonly Selector[]>;

/** True for the changes that coalesce (the first three rows). `resync` is a bypass read; `refused` reads nothing. */
export function isStreamChange(kind: Change['kind']): boolean {
  return kind === 'status-transition' || kind === 'mission-lifecycle' || kind === 'log-truncated';
}

interface Subject {
  readonly missionId: string | undefined;
  readonly wpId: string | undefined;
}

function subjectOf(change: Change): Subject {
  switch (change.kind) {
    case 'status-transition':
      return { missionId: change.data.missionId, wpId: change.data.wpId };
    case 'mission-lifecycle':
    case 'log-truncated':
      return { missionId: change.data.missionId, wpId: undefined };
    case 'resync':
    case 'refused':
      return { missionId: undefined, wpId: undefined };
  }
}

function selects(selector: Selector, key: ResourceKey, subject: Subject): boolean {
  const { missionId, wpId } = subject;
  switch (selector) {
    case 'all':
      return true;
    case 'missions':
      return key.kind === 'missions';
    case 'mission':
      return key.kind === 'mission' && key.missionId === missionId;
    case 'wp':
      return (key.kind === 'wp' || key.kind === 'wp-detail') && key.missionId === missionId && key.wpId === wpId;
    case 'of-mission':
      return missionId !== undefined && ofMission(key, missionId);
  }
}

/** The displayed keys the change re-reads, in the displayed set's order, without duplicates. */
export function refreshKeys(change: Change, displayed: readonly ResourceKey[]): ResourceKey[] {
  const selectors: readonly Selector[] = REFRESH_POLICY[change.kind];
  const subject = subjectOf(change);
  const seen = new Set<string>();
  const keys: ResourceKey[] = [];
  for (const key of displayed) {
    if (!selectors.some((selector) => selects(selector, key, subject))) continue;
    const id = JSON.stringify(key);
    if (seen.has(id)) continue;
    seen.add(id);
    keys.push(key);
  }
  return keys;
}
