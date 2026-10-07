import { describe, expect, it } from 'vitest';
import { DETAIL_REFUSAL_GENERIC, DETAIL_REFUSAL_WORDS } from '../src/defaults/index.js';
import { resolveRefusal, retryDetail } from '../src/logic/wp-retry.js';

const mission = { missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT' };

describe('retryDetail', () => {
  it('takes the wpId from the host property first (branch 1), ahead of the Work Package and the detail', () => {
    expect(retryDetail('work-package', { mission, wpId: 'WP01', workPackage: { wpId: 'WP02' }, detail: { wpId: 'WP03' } })).toEqual({
      missionId: mission.missionId,
      wpId: 'WP01',
      target: 'work-package',
    });
  });

  it('falls back to the Work Package wpId (branch 2) when the property is null or absent', () => {
    expect(retryDetail('detail', { mission, wpId: null, workPackage: { wpId: 'WP02' }, detail: { wpId: 'WP03' } })).toEqual({
      missionId: mission.missionId,
      wpId: 'WP02',
      target: 'detail',
    });
    expect(retryDetail('detail', { mission, workPackage: { wpId: 'WP02' }, detail: null })?.wpId).toBe('WP02');
  });

  it('falls back to the detail wpId (branch 3) when the property and the Work Package give none', () => {
    expect(retryDetail('detail', { mission, wpId: null, workPackage: null, detail: { wpId: 'WP03' } })).toEqual({
      missionId: mission.missionId,
      wpId: 'WP03',
      target: 'detail',
    });
  });

  it('treats an empty property as absent', () => {
    expect(retryDetail('detail', { mission, wpId: '', workPackage: { wpId: 'WP02' }, detail: null })?.wpId).toBe('WP02');
  });

  it('gives null when no id exists anywhere, and when there is no mission (the control is inert)', () => {
    expect(retryDetail('work-package', { mission, wpId: null, workPackage: null, detail: null })).toBeNull();
    expect(retryDetail('work-package', { mission: null, wpId: 'WP01', workPackage: null, detail: null })).toBeNull();
  });
});

describe('resolveRefusal', () => {
  it('words each known code (positive controls)', () => {
    expect(resolveRefusal('not_found')).toBe('The Work Package detail was not found.');
    expect(resolveRefusal('source_unreadable')).toBe('A source of the Work Package detail could not be read.');
    expect(Object.keys(DETAIL_REFUSAL_WORDS).length).toBe(2);
  });

  it('shows a code it has never seen raw, never undefined', () => {
    expect(resolveRefusal('rate_limited')).toBe('rate_limited');
    expect(resolveRefusal('constructor')).toBe('constructor');
  });

  it('gives the generic wording for a null code', () => {
    expect(resolveRefusal(null)).toBe(DETAIL_REFUSAL_GENERIC);
    expect(DETAIL_REFUSAL_GENERIC).toBe('The Work Package detail could not be loaded.');
  });
});
