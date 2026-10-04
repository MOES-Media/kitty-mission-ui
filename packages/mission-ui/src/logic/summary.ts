import { SUMMARY_SEPARATOR } from '../defaults/index.js';
import { resolveLaneLabel } from './labels.js';
import type { LabelHooks, LaneGroup } from './types.js';

/**
 * The row's lane summary (FR-006): groups in REVERSE column order, each group's lanes in declared order, every
 * non-zero count as `<count> <label>`. A non-zero count whose lane no group holds is appended with its label resolved
 * like any other (hook, default, then the raw lane; never dropped). No counts are added together. Nothing to show gives an empty string.
 */
export function laneSummary(counts: Readonly<Record<string, number>>, groups: readonly LaneGroup[], hooks: LabelHooks | null): string {
  const segments: string[] = [];
  // The board gives a lane to the FIRST group that holds it; the summary walks the columns in reverse but keeps that owner.
  const owner = new Map<string, LaneGroup>();
  for (const group of groups) for (const lane of group.lanes) if (!owner.has(lane)) owner.set(lane, group);
  const seen = new Set<string>();
  const push = (lane: string, label: string): void => {
    const count = Object.hasOwn(counts, lane) ? counts[lane] : undefined;
    if (count !== undefined && count !== 0) segments.push(`${count} ${label}`);
  };

  for (const group of [...groups].reverse()) {
    for (const lane of group.lanes) {
      if (owner.get(lane) !== group || seen.has(lane)) continue;
      seen.add(lane);
      push(lane, resolveLaneLabel(lane, hooks));
    }
  }
  const held = new Set(groups.flatMap((group) => group.lanes));
  for (const lane of Object.keys(counts)) {
    if (!held.has(lane)) push(lane, resolveLaneLabel(lane, hooks));
  }
  return segments.join(SUMMARY_SEPARATOR);
}
