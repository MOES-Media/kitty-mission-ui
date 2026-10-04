import { SUMMARY_SEPARATOR } from '../defaults/index.js';
import { resolveLaneLabel } from './labels.js';
import type { LabelHooks, LaneGroup } from './types.js';

/**
 * The row's lane summary (FR-006): groups in REVERSE column order, each group's lanes in declared order, every
 * non-zero count as `<count> <label>`. A non-zero count whose lane no group holds is appended with the raw lane as its
 * label (never dropped). No counts are added together. Nothing to show gives an empty string.
 */
export function laneSummary(counts: Readonly<Record<string, number>>, groups: readonly LaneGroup[], hooks: LabelHooks | null): string {
  const segments: string[] = [];
  const seen = new Set<string>();
  const push = (lane: string, label: string): void => {
    const count = Object.hasOwn(counts, lane) ? counts[lane] : undefined;
    if (count !== undefined && count !== 0) segments.push(`${count} ${label}`);
  };

  for (const group of [...groups].reverse()) {
    for (const lane of group.lanes) {
      if (seen.has(lane)) continue;
      seen.add(lane);
      push(lane, resolveLaneLabel(lane, hooks));
    }
  }
  const held = new Set(groups.flatMap((group) => group.lanes));
  for (const lane of Object.keys(counts)) {
    if (!held.has(lane)) push(lane, lane);
  }
  return segments.join(SUMMARY_SEPARATOR);
}
