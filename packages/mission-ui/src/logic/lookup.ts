import { DEFAULT_PHASE_STATE, PHASE_STATE, type PhaseState } from '../defaults/index.js';

/** An own-key read: `constructor` and `__proto__` are just unknown keys. */
export function lookup<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/** The state of a phase by its contract status; an unknown status is the default state (pending). */
export function phaseState(status: string): PhaseState {
  return lookup(PHASE_STATE, status) ?? DEFAULT_PHASE_STATE;
}
