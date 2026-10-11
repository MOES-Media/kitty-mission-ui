import { describe, expect, it } from 'vitest';
import { ARTIFACT_KIND_WORDS, MARKDOWN_BUDGET, MARKDOWN_MEDIA_TYPE, TOKEN_SEPARATOR, WORK_PACKAGE_LINK_KINDS, WP_CONTAINER_SEGMENT } from '../src/defaults/index.js';
import { resolveArtifactVocabulary, type ArtifactLabelHooks, type ArtifactVocabulary } from '../src/logic/artifact-types.js';
import type { LabelHooks } from '../src/logic/types.js';

const DEFAULTS = {
  kinds: ARTIFACT_KIND_WORDS,
  linkKinds: WORK_PACKAGE_LINK_KINDS,
  container: { segment: WP_CONTAINER_SEGMENT, separator: TOKEN_SEPARATOR },
  mediaType: MARKDOWN_MEDIA_TYPE,
  budget: MARKDOWN_BUDGET,
};

describe('resolveArtifactVocabulary: the five groups, completed per group against defaults/', () => {
  it('takes the defaults for null, undefined and an empty object (the three are equal)', () => {
    expect(resolveArtifactVocabulary(null)).toEqual(DEFAULTS);
    expect(resolveArtifactVocabulary(undefined)).toEqual(DEFAULTS);
    expect(resolveArtifactVocabulary({})).toEqual(DEFAULTS);
    expect(resolveArtifactVocabulary({})).toEqual(resolveArtifactVocabulary(null));
  });

  it('shares the default values by identity, so nothing is duplicated', () => {
    const v = resolveArtifactVocabulary(null);
    expect(v.kinds).toBe(ARTIFACT_KIND_WORDS);
    expect(v.linkKinds).toBe(WORK_PACKAGE_LINK_KINDS);
    expect(v.budget).toBe(MARKDOWN_BUDGET);
  });

  it('uses a present group as given, whole, and completes the other four from the defaults (one group at a time)', () => {
    const own = { gadget: { label: 'Gadget', icon: 'file' as const } };
    const cases: Array<[string, ArtifactVocabulary, Record<string, unknown>]> = [
      ['kinds', { kinds: own }, { kinds: own }],
      ['linkKinds', { linkKinds: ['gadget'] }, { linkKinds: ['gadget'] }],
      ['container', { container: { segment: 'items', separator: '_' } }, { container: { segment: 'items', separator: '_' } }],
      ['mediaType', { mediaType: 'text/x-doc' }, { mediaType: 'text/x-doc' }],
      ['budget', { budget: { ...MARKDOWN_BUDGET, maxDepth: 3 } }, { budget: { ...MARKDOWN_BUDGET, maxDepth: 3 } }],
    ];
    let ran = 0;
    for (const [name, given, expected] of cases) {
      expect(resolveArtifactVocabulary(given), name).toEqual({ ...DEFAULTS, ...expected });
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('does not merge a present group key by key: a one-key kind table has one key, not thirteen', () => {
    const v = resolveArtifactVocabulary({ kinds: { gadget: { label: 'Gadget', icon: 'file' } } });
    expect(Object.keys(v.kinds)).toEqual(['gadget']);
    expect(Object.keys(resolveArtifactVocabulary(null).kinds).length).toBe(12);
    // the container group is whole too: a given segment without a separator is not completed key by key
    const c = resolveArtifactVocabulary({ container: { segment: 'items', separator: '' } });
    expect(c.container).toEqual({ segment: 'items', separator: '' });
  });

  it('treats a group given as null as absent and an empty list as present', () => {
    expect(resolveArtifactVocabulary({ linkKinds: null }).linkKinds).toBe(WORK_PACKAGE_LINK_KINDS);
    expect(resolveArtifactVocabulary({ linkKinds: [] }).linkKinds).toEqual([]);
  });

  it('has no copy member: a string override goes through labels (type-level case)', () => {
    // @ts-expect-error `copy` is not a member of ArtifactVocabulary (PLAN-FRESH4-007 (b))
    const withCopy: ArtifactVocabulary = { copy: { tabs: 'x' } };
    expect(Object.keys(resolveArtifactVocabulary(withCopy)).sort()).toEqual(['budget', 'container', 'kinds', 'linkKinds', 'mediaType']);
  });
});

describe('ArtifactLabelHooks', () => {
  it('extends the shared LabelHooks without editing it: a plain LabelHooks is assignable, the four new hooks are optional', () => {
    const shared: LabelHooks = { time: () => 'x' };
    const hooks: ArtifactLabelHooks = shared;
    const full: ArtifactLabelHooks = { kind: (k) => k, refusal: (c) => c, mediaType: (t) => t, size: (b) => String(b), time: () => 'x' };
    expect(Object.keys(hooks)).toEqual(['time']);
    expect(Object.keys(full).sort()).toEqual(['kind', 'mediaType', 'refusal', 'size', 'time']);
  });
});

// Deliberate revert (D-34 rule 4): make resolveArtifactVocabulary merge the kind table key by key (spread the defaults
// under the given table); "does not merge a present group key by key" fails.
