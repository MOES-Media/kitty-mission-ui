import { NO_VERDICT_TEXT, VERDICT_BADGES } from '../defaults/index.js';
import { lookup } from './lookup.js';
import type { StateBadge } from './types.js';

/** The badge of a review verdict: the table, then the raw value in a neutral badge; null is the no-verdict text. */
export function resolveVerdict(verdict: string | null): StateBadge {
  if (verdict === null) return { label: NO_VERDICT_TEXT, tone: 'neutral' };
  return lookup(VERDICT_BADGES, verdict) ?? { label: verdict, tone: 'neutral' };
}
