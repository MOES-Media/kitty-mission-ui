// Synthetic data for the Projects screen stories and tests: entries composed from the contract's Project examples and the
// host builders below. Names, locations and branches are synthetic (the prototype's samples are not copied); a location is
// `~/work/<synthetic-name>`, and no value is a real path, user name or e-mail address. Every builder returns fresh objects.
import { project as exampleProject, projectAllNull, projectLong, projectSchemaDrift, projectUnknownHealth } from '../../contract/fixtures.generated.js';
import type { ProjectView } from '../../contract/types.js';
import type { ProjectEntry } from '../../project-types.js';

/** The host clock of the stories: after every activity instant below. */
export const NOW = '2026-10-03T09:30:00Z';

const base = (): ProjectView => ({ ...exampleProject });

/** `Project.schema-drift` of the contract examples (through the generator), with a synthetic name. */
export const driftProject = (): ProjectView => ({ ...projectSchemaDrift, name: 'meadow-sync' });

/** `Project.all-null` of the contract examples (through the generator), with a synthetic name. */
export const allNullProject = (): ProjectView => ({ ...projectAllNull, name: 'quartz-notes' });

const entryOf = (key: string, project: ProjectView, extra: Partial<ProjectEntry> = {}): ProjectEntry => ({
  key,
  location: `~/work/${project.name}`,
  project,
  ...extra,
});

/** PR-01: three recent projects with every fact: healthy, schema drift and a local-only project. */
export const threeEntries = (): ProjectEntry[] => [
  entryOf('harbor-ledger', { ...base(), name: 'harbor-ledger', missionCount: 439, specKittyVersion: '3.2.6rc4', lastActivityAt: '2026-10-03T07:30:00Z' }),
  entryOf('meadow-sync', { ...driftProject(), missionCount: 57, specKittyVersion: '3.2.5', currentBranch: 'main', lastActivityAt: '2026-10-02T08:00:00Z' }),
  entryOf('quartz-notes', { ...base(), name: 'quartz-notes', missionCount: 12, specKittyVersion: '3.2.6rc4', currentBranch: 'trunk', lastActivityAt: '2026-09-27T09:00:00Z' }, { localOnly: true }),
];

/** PR-02: the healthy example alone. */
export const healthyEntries = (): ProjectEntry[] => [entryOf('harbor-ledger', { ...base(), name: 'harbor-ledger', lastActivityAt: '2026-10-03T07:30:00Z' })];

/** PR-03: the schema-drift example alone. */
export const driftEntries = (): ProjectEntry[] => [entryOf('meadow-sync', driftProject())];

/** PR-04: a health value outside the table. */
export const unknownHealthEntries = (): ProjectEntry[] => [entryOf('quartz-notes', { ...projectUnknownHealth, name: 'quartz-notes', lastActivityAt: '2026-10-03T07:30:00Z' })];

/** PR-05: the all-null project. */
export const allNullEntries = (): ProjectEntry[] => [entryOf('quartz-notes', allNullProject())];

/** PR-06: only the version is null. */
export const nullVersionEntries = (): ProjectEntry[] => [entryOf('harbor-ledger', { ...base(), name: 'harbor-ledger', specKittyVersion: null, lastActivityAt: '2026-10-03T07:30:00Z' })];

/** PR-07: only the branch is null. */
export const nullBranchEntries = (): ProjectEntry[] => [entryOf('harbor-ledger', { ...base(), name: 'harbor-ledger', currentBranch: null, lastActivityAt: '2026-10-03T07:30:00Z' })];

/** PR-08: activity against `NOW`: minutes, hours, yesterday, days, an offset instant. */
export const activityEntries = (): ProjectEntry[] =>
  [
    ['minutes', '2026-10-03T09:10:00Z'],
    ['hours', '2026-10-03T07:30:00Z'],
    ['yesterday', '2026-10-02T08:00:00Z'],
    ['days', '2026-09-27T09:00:00Z'],
    ['offset', '2026-10-03T10:00:00+02:00'],
  ].map(([key, at]) => entryOf(`activity-${key}`, { ...base(), name: `activity-${key}`, lastActivityAt: at ?? null }));

/** PR-09: Mission counts 0, 1 and a large one. */
export const countEntries = (): ProjectEntry[] =>
  [0, 1, 4096].map((count) => entryOf(`count-${count}`, { ...base(), name: `count-${count}`, missionCount: count, lastActivityAt: '2026-10-03T07:30:00Z' }));

/** PR-10: the location line with and without the local-only flag. */
export const locationEntries = (): ProjectEntry[] => [
  entryOf('with-flag', { ...base(), name: 'with-flag', lastActivityAt: '2026-10-03T07:30:00Z' }, { localOnly: true }),
  entryOf('without-flag', { ...base(), name: 'without-flag', lastActivityAt: '2026-10-03T07:30:00Z' }),
];

/** PR-11: an openable row beside a not-openable one. */
export const notOpenableEntries = (): ProjectEntry[] => [
  entryOf('openable', { ...base(), name: 'openable', lastActivityAt: '2026-10-03T07:30:00Z' }),
  entryOf('plain', { ...base(), name: 'plain', lastActivityAt: '2026-10-03T07:30:00Z' }, { openable: false }),
];

const stateEntry = (key: string, state: NonNullable<ProjectEntry['state']>, name?: string): ProjectEntry => ({
  key,
  location: `~/work/${key}`,
  ...(name === undefined ? {} : { name }),
  state,
});

/** PR-12: one row loading while the others are ready. */
export const rowLoadingEntries = (): ProjectEntry[] => [...threeEntries().slice(0, 1), stateEntry('tidal-index', 'loading', 'tidal-index'), ...threeEntries().slice(2)];

/** PR-13: one row whose read failed. */
export const rowErrorEntries = (): ProjectEntry[] => [...threeEntries().slice(0, 1), stateEntry('tidal-index', 'error', 'tidal-index'), ...threeEntries().slice(2)];

/** PR-14: one unavailable row. */
export const rowUnavailableEntries = (): ProjectEntry[] => [...threeEntries().slice(0, 1), stateEntry('tidal-index', 'unavailable', 'tidal-index'), ...threeEntries().slice(2)];

/** PR-24: unbroken name, branch, location and version, and a large count. */
export const longEntries = (): ProjectEntry[] => [
  entryOf('long', { ...projectLong, lastActivityAt: '2026-10-03T07:30:00Z' }, { location: '~/work/long-unbroken-location-segment-long-unbroken-location-segment-long-unbroken-location-segment-long-unbroken-location-segment-end' }),
  ...threeEntries().slice(0, 1),
];

/** PR-30: redaction-like text in a name and a branch: shown verbatim. */
export const redactionEntries = (): ProjectEntry[] => [
  entryOf('redacted', { ...base(), name: '[path]', currentBranch: '[email]', lastActivityAt: '2026-10-03T07:30:00Z' }, { location: '[path]' }),
];

/** PR-25: fifty entries. */
export const fiftyEntries = (): ProjectEntry[] =>
  Array.from({ length: 50 }, (_, index) => {
    const name = `project-${String(index + 1).padStart(2, '0')}`;
    return entryOf(name, { ...base(), name, missionCount: index, lastActivityAt: '2026-10-03T07:30:00Z' });
  });

/** Every entry builder by name, so a test can assert how many exist (equality) and that each returns fresh objects. */
export const entryBuilders = {
  three: threeEntries,
  healthy: healthyEntries,
  drift: driftEntries,
  unknownHealth: unknownHealthEntries,
  allNull: allNullEntries,
  nullVersion: nullVersionEntries,
  nullBranch: nullBranchEntries,
  activity: activityEntries,
  counts: countEntries,
  location: locationEntries,
  notOpenable: notOpenableEntries,
  rowLoading: rowLoadingEntries,
  rowError: rowErrorEntries,
  rowUnavailable: rowUnavailableEntries,
  long: longEntries,
  redaction: redactionEntries,
  fifty: fiftyEntries,
} as const satisfies Record<string, () => ProjectEntry[]>;
