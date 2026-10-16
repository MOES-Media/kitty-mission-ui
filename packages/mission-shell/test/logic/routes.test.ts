import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_PATH_MAX_LENGTH,
  ARTIFACT_PATH_MIN_LENGTH,
  ARTIFACT_PATH_PATTERN,
  LAYOUT,
  MISSION_ID_PATTERN,
  WP_ID_PATTERN,
  formatRoute,
  normaliseRoute,
  parseRoute,
  routeHref,
  type Destination,
} from '../../src/core/routes';
import {
  displayedKeys,
  displayedSet,
  keyString,
  ofMission,
  type ResourceKey,
} from '../../src/core/displayed';

const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';
const O = '01JZAB3C4D5E6F7G8H9JKMNPQS';
const MISSIONS: Destination = { screen: 'missions' };

interface Row {
  readonly destination: Destination;
  readonly route: string;
}

const ROWS: readonly Row[] = [
  { destination: { screen: 'missions' }, route: '/missions' },
  { destination: { screen: 'drift' }, route: '/drift' },
  { destination: { screen: 'drift', missionId: M }, route: `/drift/${M}` },
  { destination: { screen: 'ops' }, route: '/ops' },
  { destination: { screen: 'pipeline', missionId: M }, route: `/missions/${M}` },
  { destination: { screen: 'work-packages', missionId: M }, route: `/missions/${M}/work-packages` },
  { destination: { screen: 'work-packages', missionId: M, wpId: 'WP02' }, route: `/missions/${M}/work-packages/WP02` },
  { destination: { screen: 'work-packages', missionId: M, wpId: 'WP100' }, route: `/missions/${M}/work-packages/WP100` },
  { destination: { screen: 'artifacts', missionId: M }, route: `/missions/${M}/artifacts` },
  { destination: { screen: 'artifacts', missionId: M, path: 'spec.md' }, route: `/missions/${M}/artifacts/spec.md` },
  {
    destination: { screen: 'artifacts', missionId: M, path: 'tasks/WP01-example.md' },
    route: `/missions/${M}/artifacts/tasks%2FWP01-example.md`,
  },
  {
    destination: { screen: 'artifacts', missionId: M, path: 'notes/with space.md' },
    route: `/missions/${M}/artifacts/notes%2Fwith%20space.md`,
  },
  { destination: { screen: 'projects' }, route: '/projects' },
];

const ALL_SCREENS = ['artifacts', 'drift', 'missions', 'ops', 'pipeline', 'projects', 'work-packages'];

describe('route round trip', () => {
  it('parses every formatted destination back to a deep-equal destination', () => {
    let ran = 0;
    for (const { destination } of ROWS) {
      expect(parseRoute(formatRoute(destination), 'desktop')).toEqual(destination);
      ran += 1;
    }
    expect(ran).toBe(ROWS.length);
    expect(ROWS.length).toBe(13);
  });

  it('covers every screen', () => {
    expect(new Set(ROWS.map((r) => r.destination.screen))).toEqual(new Set(ALL_SCREENS));
    expect(Object.keys(LAYOUT).sort()).toEqual(ALL_SCREENS);
  });

  it('formats to the literal routes of the grammar', () => {
    let ran = 0;
    for (const { destination, route } of ROWS) {
      expect(formatRoute(destination)).toBe(route);
      ran += 1;
    }
    expect(ran).toBe(ROWS.length);
  });

  it('assigns the layout of each screen', () => {
    expect(LAYOUT).toEqual({
      missions: 'project',
      drift: 'project',
      ops: 'project',
      pipeline: 'mission',
      'work-packages': 'mission',
      artifacts: 'mission',
      projects: 'picker',
    });
  });

  it('keeps absent identifiers absent', () => {
    expect(parseRoute('/drift', 'desktop')).not.toHaveProperty('missionId');
    expect(parseRoute(`/missions/${M}/work-packages`, 'desktop')).not.toHaveProperty('wpId');
    expect(parseRoute(`/missions/${M}/artifacts`, 'desktop')).not.toHaveProperty('path');
  });
});

describe('non-canonical encoding', () => {
  const lower = `/missions/${M}/artifacts/notes%2fwith%20space.md`;
  const canonical = `/missions/${M}/artifacts/notes%2Fwith%20space.md`;

  it('parses to the same destination and reports the canonical route', () => {
    expect(parseRoute(lower, 'desktop')).toEqual(parseRoute(canonical, 'desktop'));
    expect(normaliseRoute(lower, 'desktop')).toEqual({
      destination: { screen: 'artifacts', missionId: M, path: 'notes/with space.md' },
      route: canonical,
      canonical: false,
    });
  });

  it('reports a canonical route as canonical', () => {
    expect(normaliseRoute(canonical, 'desktop').canonical).toBe(true);
    expect(normaliseRoute(canonical, 'desktop').route).toBe(canonical);
  });
});

describe('unknown routes', () => {
  const unknown = [
    '',
    '/',
    '/nope',
    '/missions/',
    `/missions/${M}/extra`,
    `/missions/${M.toLowerCase()}`,
    `/missions/${M.slice(0, 25)}`,
    `/missions/${M}/work-packages/WP1`,
    `/missions/${M}/work-packages/wp01`,
    `/missions/${M}/artifacts/spec.md/extra`,
    `/missions/${M}/artifacts/`,
    `/drift/${M}/`,
    '/drift/nope',
    'missions',
    '//missions',
  ];

  it('parses each to Missions and reports /missions as the canonical form', () => {
    let ran = 0;
    for (const route of unknown) {
      expect(parseRoute(route, 'desktop'), route).toEqual(MISSIONS);
      const report = normaliseRoute(route, 'desktop');
      expect(report.canonical, route).toBe(false);
      expect(report.route, route).toBe('/missions');
      ran += 1;
    }
    expect(ran).toBe(unknown.length);
  });

  it('keeps the positive controls known', () => {
    expect(parseRoute(`/missions/${M}`, 'desktop')).toEqual({ screen: 'pipeline', missionId: M });
    expect(parseRoute(`/missions/${M}/work-packages/WP01`, 'desktop')).toEqual({
      screen: 'work-packages',
      missionId: M,
      wpId: 'WP01',
    });
    expect(normaliseRoute('/missions', 'desktop').canonical).toBe(true);
  });
});

describe('decoding negatives', () => {
  const artifactRoute = (segment: string) => `/missions/${M}/artifacts/${segment}`;

  it('refuses malformed, dot-dot, rooted and NUL paths', () => {
    let ran = 0;
    for (const segment of ['%', '..%2F', '%2F', '%00', '%E0%A4%A', '..', '.', 'a%5Cb']) {
      expect(parseRoute(artifactRoute(segment), 'desktop'), segment).toEqual(MISSIONS);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('accepts the positive control of the same shape', () => {
    expect(parseRoute(artifactRoute('tasks%2FWP01-example.md'), 'desktop')).toEqual({
      screen: 'artifacts',
      missionId: M,
      path: 'tasks/WP01-example.md',
    });
  });

  it('refuses a malformed id segment without throwing', () => {
    expect(parseRoute('/missions/%', 'desktop')).toEqual(MISSIONS);
    expect(parseRoute(`/missions/${M}/work-packages/%`, 'desktop')).toEqual(MISSIONS);
    expect(parseRoute('/drift/%', 'desktop')).toEqual(MISSIONS);
  });

  it('accepts 512 code points and refuses 513', () => {
    const ok = 'a'.repeat(512);
    const long = 'a'.repeat(513);
    expect(parseRoute(artifactRoute(ok), 'desktop')).toEqual({ screen: 'artifacts', missionId: M, path: ok });
    expect(parseRoute(artifactRoute(long), 'desktop')).toEqual(MISSIONS);
  });

  it('counts code points, not UTF-16 units', () => {
    const astral = '\u{1F600}'.repeat(512);
    expect(astral.length).toBe(1024);
    expect(parseRoute(artifactRoute(encodeURIComponent(astral)), 'desktop')).toEqual({
      screen: 'artifacts',
      missionId: M,
      path: astral,
    });
    expect(parseRoute(artifactRoute(encodeURIComponent(`${astral}a`)), 'desktop')).toEqual(MISSIONS);
  });
});

describe('dashboard mode', () => {
  it('parses /projects to Missions on the dashboard and to Projects on the desktop', () => {
    expect(parseRoute('/projects', 'dashboard')).toEqual(MISSIONS);
    expect(parseRoute('/projects', 'desktop')).toEqual({ screen: 'projects' });
  });

  it('parses other routes alike in both modes', () => {
    expect(parseRoute(`/missions/${M}`, 'dashboard')).toEqual({ screen: 'pipeline', missionId: M });
  });
});

describe('routeHref', () => {
  it('prefixes the route with a hash', () => {
    expect(routeHref({ screen: 'ops' })).toBe('#/ops');
    expect(routeHref({ screen: 'artifacts', missionId: M, path: 'a/b.md' })).toBe(`#/missions/${M}/artifacts/a%2Fb.md`);
  });
});

describe('contract copies', () => {
  const schemas = (name: string): Record<string, unknown> =>
    parse(
      readFileSync(
        fileURLToPath(new URL(`../../../../contracts/spec-kitty/mission-status/schemas/${name}.yaml`, import.meta.url)),
        'utf8',
      ),
    ) as Record<string, unknown>;

  it('matches ArtifactPath.yaml', () => {
    const schema = schemas('ArtifactPath');
    expect(ARTIFACT_PATH_PATTERN).toBe(schema['pattern']);
    expect(ARTIFACT_PATH_MIN_LENGTH).toBe(schema['minLength']);
    expect(ARTIFACT_PATH_MAX_LENGTH).toBe(schema['maxLength']);
  });

  it('accepts the examples of ArtifactPath.yaml', () => {
    const examples = schemas('ArtifactPath')['examples'] as string[];
    expect(examples).toEqual(['tasks/WP01-example.md', 'spec.md', 'notes/with space.md']);
    for (const path of examples) {
      expect(parseRoute(`/missions/${M}/artifacts/${encodeURIComponent(path)}`, 'desktop'), path).toEqual({
        screen: 'artifacts',
        missionId: M,
        path,
      });
    }
  });

  it('matches MissionId.yaml and WpId.yaml', () => {
    expect(MISSION_ID_PATTERN).toBe(schemas('MissionId')['pattern']);
    expect(WP_ID_PATTERN).toBe(schemas('WpId')['pattern']);
  });
});

interface DisplayedRow {
  readonly destination: Destination;
  readonly policy: string[];
  readonly explicit: string[];
}

const DISPLAYED: readonly DisplayedRow[] = [
  { destination: { screen: 'missions' }, policy: ['project', 'missions'], explicit: [] },
  { destination: { screen: 'drift', missionId: M }, policy: ['project'], explicit: [`drift:${M}`, 'mission-names'] },
  { destination: { screen: 'drift' }, policy: ['project'], explicit: ['drift:*', 'mission-names'] },
  { destination: { screen: 'ops' }, policy: ['project'], explicit: ['ops'] },
  { destination: { screen: 'pipeline', missionId: M }, policy: [`mission:${M}`], explicit: [] },
  {
    destination: { screen: 'work-packages', missionId: M, wpId: 'WP02' },
    policy: [`mission:${M}`, `wp:${M}/WP02`, `wp-detail:${M}/WP02`],
    explicit: [],
  },
  { destination: { screen: 'work-packages', missionId: M }, policy: [`mission:${M}`], explicit: [] },
  {
    destination: { screen: 'artifacts', missionId: M, path: 'tasks/WP01-example.md' },
    policy: [`mission:${M}`],
    explicit: [`artifacts:${M}`, `artifact:${M}:tasks/WP01-example.md`],
  },
  { destination: { screen: 'artifacts', missionId: M }, policy: [`mission:${M}`], explicit: [`artifacts:${M}`] },
  { destination: { screen: 'projects' }, policy: [], explicit: [] },
];

describe('displayed sets', () => {
  it('matches the rows of the data model', () => {
    let ran = 0;
    for (const { destination, policy, explicit } of DISPLAYED) {
      const set = displayedSet(destination);
      expect({ policy: set.policy.map(keyString), explicit: set.explicit.map(keyString) }, JSON.stringify(destination)).toEqual({
        policy,
        explicit,
      });
      expect(displayedKeys(destination).map(keyString)).toEqual([...policy, ...explicit]);
      ran += 1;
    }
    // Nine data-model rows; Drift is listed with a scope and without one.
    expect(ran).toBe(10);
    expect(ran).toBe(DISPLAYED.length);
  });

  it('keeps missions and mission-names distinct', () => {
    const missionsKeys = displayedKeys({ screen: 'missions' }).map(keyString);
    const driftKeys = displayedKeys({ screen: 'drift' }).map(keyString);
    expect(missionsKeys).toContain('missions');
    expect(missionsKeys).not.toContain('mission-names');
    expect(driftKeys).toContain('mission-names');
    expect(driftKeys).not.toContain('missions');
  });
});

describe('ofMission', () => {
  const scoped: ResourceKey[] = [
    { kind: 'mission', missionId: M },
    { kind: 'wp', missionId: M, wpId: 'WP02' },
    { kind: 'wp-detail', missionId: M, wpId: 'WP02' },
    { kind: 'artifacts', missionId: M },
    { kind: 'artifact', missionId: M, path: 'spec.md' },
    { kind: 'drift', missionId: M },
  ];
  const unscoped: ResourceKey[] = [
    { kind: 'drift' },
    { kind: 'project' },
    { kind: 'missions' },
    { kind: 'mission-names' },
    { kind: 'ops' },
  ];

  it('is true for every key that carries the Mission', () => {
    for (const key of scoped) expect(ofMission(key, M), keyString(key)).toBe(true);
    expect(scoped.length).toBe(6);
  });

  it('is false for the keys of another Mission and for unscoped keys', () => {
    for (const key of scoped) expect(ofMission({ ...key, missionId: O } as ResourceKey, M), keyString(key)).toBe(false);
    for (const key of unscoped) expect(ofMission(key, M), keyString(key)).toBe(false);
    expect(unscoped.length).toBe(5);
  });

  it('uses the notation of the data model', () => {
    expect(scoped.map(keyString)).toEqual([
      `mission:${M}`,
      `wp:${M}/WP02`,
      `wp-detail:${M}/WP02`,
      `artifacts:${M}`,
      `artifact:${M}:spec.md`,
      `drift:${M}`,
    ]);
    expect(unscoped.map(keyString)).toEqual(['drift:*', 'project', 'missions', 'mission-names', 'ops']);
  });
});
