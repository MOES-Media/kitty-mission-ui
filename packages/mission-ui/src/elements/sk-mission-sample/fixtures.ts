import type { MissionSummary } from '../../view-state.js';

/** Synthetic data only: no real names, paths or usernames. */
export const exampleMission: MissionSummary = {
  slug: 'example-mission-01ABCDEF',
  name: 'Example mission',
  workPackagesDone: 3,
  workPackagesTotal: 8,
};

export const exampleErrorMessage = 'Example mission data could not be loaded.';
