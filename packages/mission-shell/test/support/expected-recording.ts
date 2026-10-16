// The literal of contracts/refresh-policy.md "Expected recording": the reads after the initial load, per destination and
// per step. It is written out and imports nothing from the policy, so the test is not circular (R5-09).
import type { Destination } from '../../src/core/routes';

export const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';
export const O = '01JZAB3C4D5E6F7G8H9JKMNPQS';
export const P = 'tasks/WP01-example.md';

const PROJECT = 'getProject {}';
const MISSIONS = 'listMissions {}';
const OPS = 'listOpsInvocations {}';
const DRIFT_ALL = 'getDriftReport {}';
const DRIFT_M = `getDriftReport {"query":{"missionId":"${M}"}}`;
const mission = (id: string): string => `getMission {"path":{"missionId":"${id}"}}`;
const wp = (id: string): string => `getWorkPackage {"path":{"missionId":"${M}","wpId":"${id}"}}`;
const wpDetail = (id: string): string => `getWorkPackageDetail {"path":{"missionId":"${M}","wpId":"${id}"}}`;
const ARTIFACTS = `listArtifacts {"path":{"missionId":"${M}"}}`;
const ARTIFACT = `getArtifactContent {"path":{"missionId":"${M}"},"query":{"path":"${P}"}}`;

/** Reads per step: C1 mission-lifecycle, C2 and C3 status-transition WP01, C4 log-truncated, C5 status-transition WP01,
 *  then the resync of a reconnect. */
export interface Row {
  readonly name: string;
  readonly destination: Destination;
  readonly steps: readonly [
    c1: readonly string[],
    c2: readonly string[],
    c3: readonly string[],
    c4: readonly string[],
    c5: readonly string[],
    resync: readonly string[],
  ];
}

const same = (reads: readonly string[]): Row['steps'] => [reads, reads, reads, reads, reads, reads];

export const EXPECTED: readonly Row[] = [
  {
    name: 'missions',
    destination: { screen: 'missions' },
    steps: [[MISSIONS], [MISSIONS], [MISSIONS], [MISSIONS], [MISSIONS], [PROJECT, MISSIONS]],
  },
  {
    name: 'drift all',
    destination: { screen: 'drift' },
    steps: [[], [], [], [], [], [PROJECT, DRIFT_ALL, MISSIONS]],
  },
  {
    name: 'drift M',
    destination: { screen: 'drift', missionId: M },
    steps: [[], [], [], [DRIFT_M], [], [PROJECT, DRIFT_M, MISSIONS]],
  },
  {
    name: 'ops',
    destination: { screen: 'ops' },
    steps: [[], [], [], [], [], [PROJECT, OPS]],
  },
  {
    name: 'pipeline M',
    destination: { screen: 'pipeline', missionId: M },
    steps: same([mission(M)]),
  },
  {
    name: 'pipeline O',
    destination: { screen: 'pipeline', missionId: O },
    steps: [[], [], [], [], [], [mission(O)]],
  },
  {
    name: 'work packages M none',
    destination: { screen: 'work-packages', missionId: M },
    steps: same([mission(M)]),
  },
  {
    name: 'work package M WP01',
    destination: { screen: 'work-packages', missionId: M, wpId: 'WP01' },
    steps: [
      [mission(M)],
      [mission(M), wp('WP01'), wpDetail('WP01')],
      [mission(M), wp('WP01'), wpDetail('WP01')],
      [mission(M), wp('WP01'), wpDetail('WP01')],
      [mission(M), wp('WP01'), wpDetail('WP01')],
      [mission(M), wp('WP01'), wpDetail('WP01')],
    ],
  },
  {
    name: 'work package M WP02',
    destination: { screen: 'work-packages', missionId: M, wpId: 'WP02' },
    steps: [
      [mission(M)],
      [mission(M)],
      [mission(M)],
      [mission(M), wp('WP02'), wpDetail('WP02')],
      [mission(M)],
      [mission(M), wp('WP02'), wpDetail('WP02')],
    ],
  },
  {
    name: 'artifacts M none',
    destination: { screen: 'artifacts', missionId: M },
    steps: [[mission(M)], [mission(M)], [mission(M)], [mission(M), ARTIFACTS], [mission(M)], [mission(M), ARTIFACTS]],
  },
  {
    name: 'artifact M P',
    destination: { screen: 'artifacts', missionId: M, path: P },
    steps: [
      [mission(M)],
      [mission(M)],
      [mission(M)],
      [mission(M), ARTIFACTS, ARTIFACT],
      [mission(M)],
      [mission(M), ARTIFACTS, ARTIFACT],
    ],
  },
  {
    name: 'projects',
    destination: { screen: 'projects' },
    steps: same([]),
  },
];

/** The reads of the initial load per destination (the oracle of the gating tests). */
export const INITIAL: Readonly<Record<string, readonly string[]>> = {
  missions: [PROJECT, MISSIONS],
  'pipeline M': [mission(M)],
};
