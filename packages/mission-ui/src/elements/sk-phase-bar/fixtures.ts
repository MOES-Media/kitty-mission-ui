import type { PhaseView } from '../../contract/types.js';

const phase = (name: string, status: string): PhaseView => ({ name, status, basis: 'artifact' }) as PhaseView;

/** The five default phases: three complete, one in progress, one pending (PL-01 shape). */
export const defaultPhases: PhaseView[] = [
  phase('specify', 'complete'),
  phase('plan', 'complete'),
  phase('tasks', 'complete'),
  phase('implement', 'in_progress'),
  phase('review', 'pending'),
];

export const allPendingPhases: PhaseView[] = defaultPhases.map((item) => phase(item.name, 'pending'));

/** Three phases whose names the screen has never seen (PL-07). */
export const threeUnknownPhases: PhaseView[] = [phase('discover', 'complete'), phase('build', 'in_progress'), phase('ship', 'pending')];

/** Seven phases with unknown names; `rollout` carries a status word the screen has never seen. */
export const sevenUnknownPhases: PhaseView[] = [
  phase('discover', 'complete'),
  phase('shape', 'complete'),
  phase('prototype', 'complete'),
  phase('build', 'in_progress'),
  phase('verify', 'pending'),
  phase('rollout', 'paused'),
  phase('retire', 'pending'),
];
