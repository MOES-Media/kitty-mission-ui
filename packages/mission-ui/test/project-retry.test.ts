import { describe, expect, it } from 'vitest';
import { foldersRetryDetail, projectRetryDetail, projectsRetryDetail } from '../src/logic/index.js';

describe('the Projects retry payload builders', () => {
  it('builds the project payload from the entry key, exactly', () => {
    expect(projectRetryDetail({ key: 'k1' })).toStrictEqual({ target: 'project', key: 'k1' });
    expect(projectRetryDetail({ key: 'k1' })).not.toHaveProperty('missionId');
  });

  it('builds the list and folder payloads with the target alone', () => {
    expect(projectsRetryDetail()).toEqual({ target: 'projects' });
    expect(foldersRetryDetail()).toEqual({ target: 'folders' });
  });

  it('is inert for an entry without a key (positive control above)', () => {
    expect(projectRetryDetail({ key: '' })).toBeNull();
    expect(projectRetryDetail({} as { key: string })).toBeNull();
    expect(projectRetryDetail({ key: undefined as unknown as string })).toBeNull();
    expect(projectRetryDetail({ key: 'k' })).not.toBeNull();
  });

  it('carries a repeated key as given', () => {
    expect(projectRetryDetail({ key: 'dup' })).toStrictEqual({ target: 'project', key: 'dup' });
  });
});
