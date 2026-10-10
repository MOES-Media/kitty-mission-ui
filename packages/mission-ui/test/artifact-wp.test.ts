import { describe, expect, it } from 'vitest';
import { REVIEW_CYCLE_ARTIFACT_KIND, WORK_PACKAGE_PROMPT_ARTIFACT_KIND } from '../src/defaults/index.js';
import { matchWorkPackage } from '../src/logic/artifact-wp.js';
import type { ArtifactVocabulary } from '../src/logic/artifact-types.js';

const wps = (...ids: string[]) => ids.map((wpId) => ({ wpId }));
const PROMPT = WORK_PACKAGE_PROMPT_ARTIFACT_KIND;
const CYCLE = REVIEW_CYCLE_ARTIFACT_KIND;

describe('matchWorkPackage: N-Q11, a leading token of a segment under the container', () => {
  const rows: Array<[string, string, string, string[], string | null]> = [
    ['a prompt file named by id and a slug', 'tasks/WP01-example.md', PROMPT, ['WP01', 'WP02'], 'WP01'],
    ['a review cycle file in the id folder', 'tasks/WP02-example/review-cycle-1.md', CYCLE, ['WP01', 'WP02'], 'WP02'],
    ['a file named by the id alone', 'tasks/WP01.md', PROMPT, ['WP01'], 'WP01'],
    ['an id that is only a prefix of a longer token', 'tasks/WP011-x.md', PROMPT, ['WP01'], null],
    ['the longer id wins over its prefix', 'tasks/WP10-x.md', PROMPT, ['WP1', 'WP10'], 'WP10'],
    ['the longest id wins when both lead the segment', 'tasks/WP01-example.md', PROMPT, ['WP01', 'WP01-example'], 'WP01-example'],
    ['no id matches', 'tasks/WP03-x.md', PROMPT, ['WP01', 'WP02'], null],
    ['no Work Packages at all', 'tasks/WP01-x.md', PROMPT, [], null],
    ['an empty id is ignored', 'tasks/WP01-x.md', PROMPT, ['', 'WP01'], 'WP01'],
    ['outside the container', 'notes/WP01-x.md', PROMPT, ['WP01'], null],
    ['a root file that starts like the container', 'tasks.md', PROMPT, ['tasks'], null],
    ['the container alone', 'tasks', PROMPT, ['WP01'], null],
    ['a kind that does not link a Work Package', 'tasks/WP01-x.md', 'spec', ['WP01'], null],
    ['an unknown kind', 'tasks/WP01-x.md', 'diagram', ['WP01'], null],
    ['a segment deeper than the first after the container is not the id', 'tasks/other/WP01-x.md', PROMPT, ['WP01'], null],
  ];

  for (const [name, path, kind, ids, want] of rows) {
    it(`${name}`, () => {
      expect(matchWorkPackage(path, kind, wps(...ids))).toEqual(want === null ? null : { wpId: want });
    });
  }

  it('has the declared number of rows and both answers occur (positive control)', () => {
    expect(rows.length).toBe(15);
    expect(rows.filter((r) => r[4] !== null).length).toBe(6);
  });
});

describe('matchWorkPackage: with and without a vocabulary', () => {
  it('reads the link kinds, the container segment and the separator of an explicit vocabulary', () => {
    const vocabulary: ArtifactVocabulary = { linkKinds: ['gadget'], container: { segment: 'items', separator: '_' } };
    expect(matchWorkPackage('items/WP01_x.md', 'gadget', wps('WP01'), vocabulary)).toEqual({ wpId: 'WP01' });
    // the defaults' container, separator and kinds no longer apply
    expect(matchWorkPackage('tasks/WP01-x.md', PROMPT, wps('WP01'), vocabulary)).toBeNull();
    expect(matchWorkPackage('items/WP01-x.md', 'gadget', wps('WP01'), vocabulary)).toBeNull();
    expect(matchWorkPackage('items/WP01_x.md', PROMPT, wps('WP01'), vocabulary)).toBeNull();
  });

  it('takes the defaults for null and for an empty vocabulary, and completes per group', () => {
    const want = { wpId: 'WP01' };
    expect(matchWorkPackage('tasks/WP01-x.md', PROMPT, wps('WP01'), null)).toEqual(want);
    expect(matchWorkPackage('tasks/WP01-x.md', PROMPT, wps('WP01'), {})).toEqual(want);
    expect(matchWorkPackage('tasks/WP01_x.md', PROMPT, wps('WP01'), { container: { segment: 'tasks', separator: '_' } })).toEqual(want);
    expect(matchWorkPackage('tasks/WP01-x.md', PROMPT, wps('WP01'), { container: { segment: 'tasks', separator: '_' } })).toBeNull();
  });
});

// Deliberate revert (D-34 rule 4): drop the separator check (match on startsWith(id) alone); "an id that is only a
// prefix of a longer token" fails.
