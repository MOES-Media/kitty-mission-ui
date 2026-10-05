import type { MissionDetailView } from '../contract/types.js';
import { CURRENT_STEP_PREFIX, NO_STEP_TEXT, PHASE_IS_CURRENT } from '../defaults/index.js';
import { resolvePhaseLabel } from './labels.js';
import { phaseState } from './lookup.js';
import type { LabelHooks } from './types.js';

/** The inspector's line (FR-019): the next action verbatim; else the first current phase in array order; else none. */
export function currentStep(mission: MissionDetailView, hooks: LabelHooks | null): string {
  if (mission.nextAction !== null) return mission.nextAction;
  const first = mission.phases.find((phase) => PHASE_IS_CURRENT[phaseState(phase.status)]);
  return first === undefined ? NO_STEP_TEXT : `${CURRENT_STEP_PREFIX}${resolvePhaseLabel(first.name, hooks)}`;
}
