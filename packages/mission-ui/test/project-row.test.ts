import { describe, expect, it } from 'vitest';
import { project, projectLong, projectUnknownHealth } from '../src/contract/fixtures.generated.js';
import { ACTIVE_PREFIX, HEALTH_BADGES, LOCAL_ONLY_TEXT, NO_ACTIVITY_TEXT, SUMMARY_SEPARATOR, UNKNOWN_HEALTH_TONE, missionCountText } from '../src/defaults/index.js';
import { buildRow, resolveEntry } from '../src/logic/index.js';
import type { ProjectEntry } from '../src/project-types.js';

const NOW = '2026-10-03T09:30:00Z';
const entry = (over: Partial<ProjectEntry['project']> = {}, extra: Partial<ProjectEntry> = {}): ProjectEntry => ({
  key: 'k1',
  location: '~/work/alpha',
  project: { ...project, ...over },
  ...extra,
});
const row = (e: ProjectEntry, hooks = null as Parameters<typeof buildRow>[2]) => {
  const view = buildRow(e, NOW, hooks);
  if (view.kind !== 'row') throw new Error(`expected a row, got ${view.kind}`);
  return view;
};

describe('buildRow: identity, version and health', () => {
  it('assembles the row of the example project', () => {
    const view = row(entry());
    expect(view).toMatchObject({
      kind: 'row',
      key: 'k1',
      name: 'example-project',
      versionText: 'v4.0.0',
      health: HEALTH_BADGES['healthy'],
      missionCountText: missionCountText(3),
      openable: true,
    });
  });

  it('hides the version slot for null, and prefixes anything else without parsing ("vv1")', () => {
    expect(row(entry({ specKittyVersion: null })).versionText).toBeNull();
    expect(row(entry({ specKittyVersion: 'v1' })).versionText).toBe('vv1');
    expect(row(entry({ specKittyVersion: '4.0.0' })).versionText).toBe('v4.0.0');
  });

  it('takes the health word and tone from the table, the hook first, then the raw word in a neutral tone', () => {
    expect(row(entry({ health: 'schema_drift' })).health).toEqual(HEALTH_BADGES['schema_drift']);
    expect(row(entry({ health: 'unheard_of_health' })).health).toEqual({ label: 'unheard_of_health', tone: UNKNOWN_HEALTH_TONE });
    const hooks = { health: (v: string) => (v === 'unheard_of_health' ? { label: 'odd', tone: 'info' as const } : undefined) };
    expect(row(entry({ health: 'unheard_of_health' }), hooks).health).toEqual({ label: 'odd', tone: 'info' });
    // a hook that returns undefined falls through to the table
    expect(row(entry({ health: 'schema_drift' }), hooks).health).toEqual(HEALTH_BADGES['schema_drift']);
  });

  it('follows health only: schemaVersion present with an unexpected health does not make a verdict', () => {
    const view = row({ key: 'k1', location: 'l', project: projectUnknownHealth });
    expect(view.health).toEqual({ label: 'unheard_of_health', tone: 'neutral' });
    expect(view).not.toHaveProperty('schemaVersion');
    // the badge is the same whatever the schemaVersion is
    expect(row(entry({ health: 'unheard_of_health', schemaVersion: 99 })).health).toEqual(row(entry({ health: 'unheard_of_health', schemaVersion: null })).health);
  });

  it('does not touch the Mission count beyond its word', () => {
    expect(row(entry({ missionCount: 0 })).missionCountText).toBe('0 Missions');
    expect(row(entry({ missionCount: 1 })).missionCountText).toBe('1 Mission');
    expect(row(entry({ missionCount: 128 })).missionCountText).toBe('128 Missions');
  });
});

describe('buildRow: location line and activity', () => {
  it('lists location verbatim, then the branch, then local only, with the shared separator', () => {
    expect(row(entry()).locationLine).toBe(['~/work/alpha', 'main'].join(SUMMARY_SEPARATOR));
    expect(row(entry({}, { localOnly: true })).locationLine).toBe(['~/work/alpha', 'main', LOCAL_ONLY_TEXT].join(SUMMARY_SEPARATOR));
  });

  it('drops a null branch with its separator and never claims detached', () => {
    expect(row(entry({ currentBranch: null })).locationLine).toBe('~/work/alpha');
    expect(row(entry({ currentBranch: null }, { localOnly: true })).locationLine).toBe(['~/work/alpha', LOCAL_ONLY_TEXT].join(SUMMARY_SEPARATOR));
    expect(row(entry({ currentBranch: null })).locationLine.toLowerCase()).not.toContain('detached');
  });

  it('prints a long branch and location as given', () => {
    const view = row({ key: 'k', location: '~/x', project: projectLong });
    expect(view.locationLine).toBe(`~/x${SUMMARY_SEPARATOR}${projectLong.currentBranch}`);
  });

  it('reads the activity through resolveActivity: relative to now, the time hook first, the no-activity text alone', () => {
    expect(row(entry({ lastActivityAt: '2026-10-03T06:30:00Z' })).activityText).toBe(`${ACTIVE_PREFIX} 3 hours ago`);
    expect(row(entry({ lastActivityAt: '2026-10-03T06:30:00Z' }), { time: () => 'at teatime' }).activityText).toBe(`${ACTIVE_PREFIX} at teatime`);
    expect(row(entry({ lastActivityAt: null })).activityText).toBe(NO_ACTIVITY_TEXT);
  });

  it('uses the ISO string as given when there is no now', () => {
    const view = buildRow(entry({ lastActivityAt: '2026-10-03T06:30:00Z' }), null, null);
    expect(view.kind === 'row' && view.activityText).toBe(`${ACTIVE_PREFIX} 2026-10-03T06:30:00Z`);
  });
});

describe('buildRow: accessible name, description and openable', () => {
  it('names the row by name, health and Mission count', () => {
    expect(row(entry()).announcementText).toBe('example-project, healthy, 3 Missions');
    expect(row(entry({ health: 'unheard_of_health' })).announcementText).toBe('example-project, unheard_of_health, 3 Missions');
  });

  it('describes version, schema version, location, activity; schemaVersion appears there as text only', () => {
    const d = row(entry({ lastActivityAt: null })).description;
    expect(d).toContain('v4.0.0');
    expect(d).toContain('schema version 3');
    expect(d).toContain('~/work/alpha');
    expect(d).toContain(NO_ACTIVITY_TEXT);
    const without = row(entry({ schemaVersion: null, specKittyVersion: null, lastActivityAt: null })).description;
    expect(without).not.toContain('schema version');
    expect(without).not.toContain('undefined');
    expect(without).not.toContain('null');
  });

  it('is openable unless the host said false', () => {
    expect(row(entry()).openable).toBe(true);
    expect(row(entry({}, { openable: true })).openable).toBe(true);
    expect(row(entry({}, { openable: false })).openable).toBe(false);
  });
});

describe('buildRow: entries that are not rows', () => {
  it('returns the resolved stub for a state, an empty name and a missing project, with a row as the control', () => {
    let ran = 0;
    for (const e of [
      { key: 'a', location: 'l', state: 'loading' as const },
      { key: 'b', location: 'l', state: 'unavailable' as const },
      { key: 'c', location: 'l' },
      { key: 'd', location: 'l', project: { ...project, name: '' } },
    ]) {
      expect(buildRow(e, NOW, null)).toEqual(resolveEntry(e));
      expect(buildRow(e, NOW, null).kind).not.toBe('row');
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(buildRow(entry(), NOW, null).kind).toBe('row');
  });
});
