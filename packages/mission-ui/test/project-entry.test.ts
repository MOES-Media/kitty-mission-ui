import { describe, expect, it } from 'vitest';
import { project, projectUnknownHealth } from '../src/contract/fixtures.generated.js';
import { LOCAL_ONLY_TEXT, UNNAMED_PROJECT_TEXT } from '../src/defaults/index.js';
import { buildRow, resolveEntry } from '../src/logic/index.js';
import type { ProjectEntry } from '../src/project-types.js';

const base: ProjectEntry = { key: 'k1', location: '~/work/alpha' };

describe('resolveEntry', () => {
  it('is a row when a project is present and no state is set', () => {
    const view = resolveEntry({ ...base, project });
    expect(view.kind).toBe('row');
    expect(view.key).toBe('k1');
  });

  it('is a row for a foreign health value: the kind does not depend on the vocabulary', () => {
    expect(resolveEntry({ ...base, project: projectUnknownHealth }).kind).toBe('row');
  });

  it('keeps each state as its own kind, with a row as the positive control', () => {
    let ran = 0;
    for (const state of ['loading', 'error', 'unavailable'] as const) {
      expect(resolveEntry({ ...base, state }).kind).toBe(state);
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(resolveEntry({ ...base, project }).kind).toBe('row');
  });

  it('lets an entry state win over a present project (precedence)', () => {
    let ran = 0;
    for (const state of ['loading', 'error', 'unavailable'] as const) {
      expect(resolveEntry({ ...base, project, state }).kind, state).toBe(state);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('treats an entry with neither project nor state as an error', () => {
    expect(resolveEntry(base).kind).toBe('error');
  });

  it('treats an empty project name as an error, and a non-empty one as a row', () => {
    expect(resolveEntry({ ...base, project: { ...project, name: '' } }).kind).toBe('error');
    expect(resolveEntry({ ...base, project: { ...project, name: 'x' } }).kind).toBe('row');
  });

  it('treats a project whose name is missing or null as an error, never as a row that reads "undefined"', () => {
    const nameless: Record<string, unknown> = { ...project };
    delete nameless.name;
    for (const broken of [nameless, { ...project, name: null }]) {
      const view = resolveEntry({ ...base, project: broken } as unknown as ProjectEntry);
      expect(view.kind).toBe('error');
      expect(JSON.stringify(view)).not.toContain('undefined');
      const built = buildRow({ ...base, project: broken } as unknown as ProjectEntry, null, null);
      expect(built.kind).toBe('error');
      expect('announcementText' in built).toBe(false);
    }
    expect(buildRow({ ...base, project: { ...project, name: 'x' } }, null, null).kind).toBe('row');
  });

  it('treats a state outside the closed set as an error, never as a row', () => {
    const foreign = { ...base, project, state: 'archived' } as unknown as ProjectEntry;
    expect(resolveEntry(foreign).kind).toBe('error');
  });

  it('gives each entry of a repeated key its own view carrying the key as given', () => {
    const views = [resolveEntry({ ...base, project }), resolveEntry({ ...base, state: 'loading' })];
    expect(views.map((v) => v.key)).toEqual(['k1', 'k1']);
    expect(views.map((v) => v.kind)).toEqual(['row', 'loading']);
  });

  describe('the name and location of an entry without a project', () => {
    it('shows the host name, then the location alone, then the generic word', () => {
      const named = resolveEntry({ ...base, name: 'Alpha', state: 'loading' });
      const located = resolveEntry({ ...base, state: 'loading' });
      const bare = resolveEntry({ key: 'k2', location: '', state: 'loading' });
      expect(named).toMatchObject({ name: 'Alpha', title: 'Alpha' });
      expect(located).toMatchObject({ name: null, title: '~/work/alpha' });
      expect(bare).toMatchObject({ name: null, title: UNNAMED_PROJECT_TEXT, locationLine: '' });
    });

    it('builds the location line from the segments that exist, never parsing the location', () => {
      expect(resolveEntry({ ...base, state: 'error' })).toMatchObject({ locationLine: '~/work/alpha' });
      expect(resolveEntry({ ...base, state: 'error', localOnly: true })).toMatchObject({ locationLine: `~/work/alpha · ${LOCAL_ONLY_TEXT}` });
      expect(resolveEntry({ key: 'k3', location: '', state: 'error', localOnly: true })).toMatchObject({ locationLine: LOCAL_ONLY_TEXT });
    });

    it('ignores the name of an errored project and falls back to the entry name', () => {
      const view = resolveEntry({ ...base, name: 'Alpha', project: { ...project, name: '' } });
      expect(view).toMatchObject({ kind: 'error', name: 'Alpha' });
    });
  });
});
