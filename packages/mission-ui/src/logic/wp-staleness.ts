import { STALENESS_STATUS_ROLE } from '../defaults/index.js';
import type { Staleness } from '../contract/types.js';
import { lookup } from './lookup.js';

export type StalenessRole = 'badge' | 'row' | 'none';

/** What the Facts part needs: the role, and the raw status, reason and minutes it prints through the defaults. */
export interface StalenessView {
  role: StalenessRole;
  status: string | null;
  reason: string | null;
  minutes: number | null;
}

/** Absent gives role none; a status that is not a table key is a quiet row showing the raw status text. */
export function stalenessView(s: Staleness | null | undefined): StalenessView {
  if (s === null || s === undefined) return { role: 'none', status: null, reason: null, minutes: null };
  return {
    role: lookup(STALENESS_STATUS_ROLE, s.status) ?? 'row',
    status: s.status,
    reason: s.reason ?? null,
    minutes: s.minutesSinceCommit ?? null,
  };
}
