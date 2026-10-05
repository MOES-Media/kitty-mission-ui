import { DEFAULT_PHASE_LABELS, LANE_LABELS, NOT_STARTED_BADGE, STATE_BADGES } from '../defaults/index.js';
import { lookup } from './lookup.js';
import type { LabelHooks, StateBadge } from './types.js';

/** hook, then the default word, then the raw name. */
export function resolvePhaseLabel(name: string, hooks: LabelHooks | null): string {
  return hooks?.phase?.(name) ?? lookup(DEFAULT_PHASE_LABELS, name) ?? name;
}

/** hook, then the lane summary word, then the raw lane. */
export function resolveLaneLabel(lane: string, hooks: LabelHooks | null): string {
  return hooks?.lane?.(lane) ?? lookup(LANE_LABELS, lane) ?? lane;
}

/** A null lane is "not started"; else hook, then the card badge, then the raw lane in a neutral badge. */
export function resolveStateBadge(lane: string | null, hooks: LabelHooks | null): StateBadge {
  if (lane === null) return NOT_STARTED_BADGE;
  return hooks?.state?.(lane) ?? lookup(STATE_BADGES, lane) ?? { label: lane, tone: 'neutral' };
}
