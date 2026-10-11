import { describe, expect, it } from 'vitest';
import { ARTIFACT_REFUSALS, REFUSAL_GENERIC, REFUSAL_GENERIC_EYEBROW } from '../src/defaults/index.js';
import { resolveArtifactRefusal } from '../src/logic/artifact-refusal.js';

const NO_SIZE = { sizeText: null };

describe('resolveArtifactRefusal: the seven rows', () => {
  const codes = Object.keys(ARTIFACT_REFUSALS);

  it('has seven rows', () => {
    expect(codes.length).toBe(7);
  });

  for (const code of Object.keys(ARTIFACT_REFUSALS)) {
    it(`resolves ${code} to its table row`, () => {
      const row = ARTIFACT_REFUSALS[code as keyof typeof ARTIFACT_REFUSALS];
      const got = resolveArtifactRefusal(code, NO_SIZE, null);
      expect(got.eyebrow).toBe(row.eyebrow);
      expect(got.retryable).toBe(row.retryable);
      expect(got.sentence).toBe(row.sentence({ sizeText: null, limitText: '256 KiB' }));
    });
  }

  it('offers Retry for the unreadable content read and for no other code', () => {
    expect(codes.filter((c) => resolveArtifactRefusal(c, NO_SIZE, null).retryable)).toEqual(['artifact_unreadable']);
  });

  it('derives the limit text from the byte limit through the size formatter, and names the size when the host gave one', () => {
    const size = codes.find((c) => resolveArtifactRefusal(c, { sizeText: '300 KiB' }, null).sentence.includes('300 KiB')) as string;
    expect(size).toBeDefined();
    expect(resolveArtifactRefusal(size, { sizeText: '300 KiB' }, null).sentence).toBe('This artifact is 300 KiB, over the 256 KiB limit, so it is not shown.');
    expect(resolveArtifactRefusal(size, NO_SIZE, null).sentence).toBe('This artifact is over the 256 KiB limit, so it is not shown.');
    // the size hook reaches the limit text too
    expect(resolveArtifactRefusal(size, NO_SIZE, { size: () => 'a quarter megabyte' }).sentence).toBe('This artifact is over the a quarter megabyte limit, so it is not shown.');
  });
});

describe('resolveArtifactRefusal: codes the table does not know', () => {
  it('shows an unknown code raw, with the generic sentence, not retryable', () => {
    expect(resolveArtifactRefusal('artifact_quarantined', NO_SIZE, null)).toEqual({ eyebrow: 'artifact_quarantined', sentence: REFUSAL_GENERIC, retryable: false });
  });

  it('treats names every object has as unknown codes (positive control: a real code resolves)', () => {
    for (const name of ['constructor', '__proto__', 'toString']) {
      expect(resolveArtifactRefusal(name, NO_SIZE, null).eyebrow, name).toBe(name);
    }
    expect(resolveArtifactRefusal('artifact_secret', NO_SIZE, null).eyebrow).toBe('Credential found');
  });

  it('gives a null code the generic sentence and a generic eyebrow, not retryable', () => {
    expect(resolveArtifactRefusal(null, NO_SIZE, null)).toEqual({ eyebrow: REFUSAL_GENERIC_EYEBROW, sentence: REFUSAL_GENERIC, retryable: false });
  });
});

describe('resolveArtifactRefusal: the refusal hook replaces the eyebrow only', () => {
  const hooks = { refusal: (code: string) => (code === 'artifact_secret' || code === 'artifact_quarantined' ? `word for ${code}` : undefined) };

  it('replaces the eyebrow of a known code and of an unknown one, and leaves the sentence and the retry flag', () => {
    const known = resolveArtifactRefusal('artifact_secret', NO_SIZE, hooks);
    expect(known).toEqual({ ...resolveArtifactRefusal('artifact_secret', NO_SIZE, null), eyebrow: 'word for artifact_secret' });
    const unknown = resolveArtifactRefusal('artifact_quarantined', NO_SIZE, hooks);
    expect(unknown).toEqual({ eyebrow: 'word for artifact_quarantined', sentence: REFUSAL_GENERIC, retryable: false });
  });

  it('falls back when the hook says nothing, and is not asked for a null code', () => {
    expect(resolveArtifactRefusal('artifact_unreadable', NO_SIZE, hooks)).toEqual(resolveArtifactRefusal('artifact_unreadable', NO_SIZE, null));
    let asked = 0;
    resolveArtifactRefusal(null, NO_SIZE, { refusal: () => (asked += 1, 'x') });
    expect(asked).toBe(0);
    resolveArtifactRefusal('artifact_secret', NO_SIZE, { refusal: () => (asked += 1, 'x') });
    expect(asked).toBe(1);
  });
});

// Deliberate revert (D-34 rule 4): make the unknown-code branch of resolveArtifactRefusal retryable; "shows an unknown
// code raw, with the generic sentence, not retryable" fails.
