// The view's own words: navigation labels, tree headings and the Refresh labels. Shell copy, not data (the contract values
// come from the snapshot). The banner copy and the chrome messages are the controller's (core/connection.ts).
export const UI_COPY = {
  nav: {
    missions: 'Missions',
    drift: 'Drift',
    ops: 'Ops',
    projects: 'Projects',
    allProjects: 'All projects',
    pipeline: 'Pipeline',
    workPackages: 'Work Packages',
    artifacts: 'Artifacts',
  },
  trees: {
    workPackages: 'Work Packages',
    artifacts: 'Artifacts',
  },
  refresh: {
    label: 'Refresh',
    artifacts: 'Refresh artifacts',
    ops: 'Refresh Ops',
  },
} as const;
