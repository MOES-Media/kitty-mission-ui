/** The closed set of view states every screen-contract element takes as `status`. */
export type ViewState = 'loading' | 'error' | 'empty' | 'ready';

export const VIEW_STATES: readonly ViewState[] = ['loading', 'error', 'empty', 'ready'];

/** Unknown values collapse to `empty`. */
export function normaliseViewState(value: unknown): ViewState {
  return VIEW_STATES.find((state) => state === value) ?? 'empty';
}

/** Placeholder shape; replaced by generated read-contract types in a later mission. */
export interface MissionSummary {
  slug: string;
  name: string;
  workPackagesDone: number;
  workPackagesTotal: number;
}
