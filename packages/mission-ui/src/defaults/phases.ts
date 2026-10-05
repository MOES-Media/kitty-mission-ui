// Pipeline phases: names, statuses and the tables that turn a status into glyph, tone, text and "is current".
// `PhaseState` is declared here (it holds the literals) and only imported elsewhere.

export type PhaseState = 'done' | 'current' | 'pending';

export const DEFAULT_PHASE_LABELS: Readonly<Record<string, string>> = {
  specify: 'Specify',
  plan: 'Plan',
  tasks: 'Tasks',
  implement: 'Implement',
  review: 'Review',
};

/** Contract phase status to state. */
export const PHASE_STATE: Readonly<Record<string, PhaseState>> = {
  pending: 'pending',
  in_progress: 'current',
  complete: 'done',
};

/** The state of a phase whose status is not in PHASE_STATE, so scanned code never writes the literal. */
export const DEFAULT_PHASE_STATE: PhaseState = 'pending';

/** Assistive text, keyed by state. */
export const PHASE_STATUS_TEXT: Readonly<Record<PhaseState, string>> = {
  done: 'complete',
  current: 'in progress',
  pending: 'pending',
};

export const PHASE_TONE: Readonly<Record<PhaseState, 'success' | 'info' | 'neutral'>> = {
  done: 'success',
  current: 'info',
  pending: 'neutral',
};

/** The `marker` slot text: a check mark, a bullet, nothing (the dot geometry is paint). */
export const PHASE_GLYPH: Readonly<Record<PhaseState, string>> = {
  done: '✓',
  current: '•',
  pending: '',
};

/** The answer behind `aria-current="step"` and the current-step line. */
export const PHASE_IS_CURRENT: Readonly<Record<PhaseState, boolean>> = {
  done: false,
  current: true,
  pending: false,
};

export const NO_STEP_TEXT = 'No step in progress';
export const CURRENT_STEP_PREFIX = 'Current step: ';
