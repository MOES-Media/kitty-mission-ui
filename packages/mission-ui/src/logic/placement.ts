import type { WorkPackageView } from '../contract/types.js';
import { resolveStateBadge } from './labels.js';
import type { LabelHooks, LaneGroup, PlacedColumn } from './types.js';

const SYNTHETIC_GROUP_ID = 'board';

/**
 * Every work package goes into exactly one column, input order kept. A lane goes into the FIRST group that holds it;
 * a null lane goes into the first group (not started); a lane no group holds goes into the first group, its badge
 * resolved like any other (hook, default, then the raw value in a neutral badge). No groups: one synthetic column titled `boardLabel` that holds every lane.
 */
export function placeWorkPackages(
  wps: readonly WorkPackageView[],
  groups: readonly LaneGroup[],
  hooks: LabelHooks | null,
  boardLabel: string,
): PlacedColumn[] {
  const synthetic = groups.length === 0;
  const effective: readonly LaneGroup[] = synthetic ? [{ id: SYNTHETIC_GROUP_ID, label: boardLabel, lanes: [] }] : groups;
  const columns: PlacedColumn[] = effective.map((group) => ({ group, cards: [] }));
  const first = columns[0];
  if (first === undefined) return columns;

  for (const wp of wps) {
    const lane = wp.statusLane;
    if (lane === null || synthetic) {
      first.cards.push({ wp, badge: resolveStateBadge(lane, hooks) });
      continue;
    }
    const holder = columns.find((column) => column.group.lanes.includes(lane));
    // An unplaced lane goes into the first group; its badge is hook, then default, then the raw value (neutral).
    (holder ?? first).cards.push({ wp, badge: resolveStateBadge(lane, hooks) });
  }
  return columns;
}
