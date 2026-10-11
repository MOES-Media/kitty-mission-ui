import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import kindYaml from '../../../contracts/spec-kitty/mission-status/schemas/ArtifactKind.yaml?raw';
import codeYaml from '../../../contracts/spec-kitty/mission-status/schemas/ArtifactRefusalCode.yaml?raw';
import { ARTIFACT_KIND_WORDS, ARTIFACT_REFUSALS, MEDIA_TYPE_WORDS } from '../src/defaults/index.js';

// Every source file of the package as text. Source scans use a `?raw` glob, as defaults.test.ts does with the contract.
// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const SOURCES = (import.meta as unknown as { glob: Glob }).glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

const KINDS = (parse(kindYaml) as { enum: string[] }).enum;
const CODES = (parse(codeYaml) as { enum: string[] }).enum;

/** The homes of the media-type words: the data file, the generated contract, and the allow-listed fixtures and stories. */
const isMediaHome = (file: string): boolean =>
  file.endsWith('/defaults/artifact-media.ts') ||
  file.includes('/src/contract/') ||
  file.endsWith('.stories.ts') ||
  file.endsWith('/fixtures.ts') ||
  file.endsWith('.fixtures.ts') ||
  file.includes('/src/story-support/');

/** The homes of the kind and refusal-code words: everything the data-driven gate allow-lists. */
const isWordHome = (file: string): boolean => file.includes('/src/defaults/') || isMediaHome(file);

const quoted = (word: string): RegExp => new RegExp(`(['"\`])${word.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\1`);

/** The files of `SOURCES` that hold `word` as a quoted literal and are not among the homes. */
function strays(word: string, home: (file: string) => boolean): string[] {
  const pattern = quoted(word);
  return Object.entries(SOURCES)
    .filter(([file, text]) => !home(file) && pattern.test(text))
    .map(([file]) => file);
}

describe('the vocabulary homes: each word is written in its home and nowhere else', () => {
  it('scanned the whole source tree (positive control for every scan below)', () => {
    const files = Object.keys(SOURCES);
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((f) => f.endsWith('/defaults/artifact-media.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('/logic/artifact-tree.ts'))).toBe(true);
    // the scan sees a stray literal when there is one
    expect(quoted('text/csv').test("const t = 'text/csv';")).toBe(true);
    expect(quoted('text/csv').test('const t = text/csv;')).toBe(false);
  });

  it('writes each media-type word only in its data file, the contract files and the allow-listed fixtures and stories', () => {
    const words = Object.keys(MEDIA_TYPE_WORDS);
    expect(words.length).toBe(6);
    let ran = 0;
    for (const word of words) {
      expect(strays(word, isMediaHome), word).toEqual([]);
      // and the data file really holds it, so a missing home cannot pass vacuously
      expect(quoted(word).test(SOURCES['../src/defaults/artifact-media.ts'] as string), word).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('writes each of the twelve kind words as a quoted literal only in the allow-listed homes, and the kind table holds each', () => {
    expect(KINDS.length).toBe(12);
    expect(Object.keys(ARTIFACT_KIND_WORDS).sort()).toEqual([...KINDS].sort());
    let ran = 0;
    for (const kind of KINDS) {
      expect(strays(kind, isWordHome), kind).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(12);
  });

  it('writes each of the seven refusal codes as a quoted literal only in the allow-listed homes, and the refusal table holds each', () => {
    expect(CODES.length).toBe(7);
    expect(Object.keys(ARTIFACT_REFUSALS).sort()).toEqual([...CODES].sort());
    let ran = 0;
    for (const code of CODES) {
      expect(strays(code, isWordHome), code).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('writes each kind label, each refusal eyebrow and each media word as text in the defaults files only', () => {
    const words = [
      ...Object.values(ARTIFACT_KIND_WORDS).map((k) => k.label),
      ...Object.values(ARTIFACT_REFUSALS).map((r) => r.eyebrow),
      ...Object.values(MEDIA_TYPE_WORDS),
    ];
    // two refusal rows share the eyebrow 'Unreadable', so there is one word fewer than rows
    expect(new Set(words).size).toBe(words.length - 1);
    let ran = 0;
    for (const word of new Set(words)) {
      const stray = strays(word, isWordHome);
      expect(stray, word).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(new Set(words).size);
  });
});

// Deliberate revert (D-34 rule 4): write the literal 'text/csv' in a logic file (for example a const in
// logic/artifact-size.ts); "writes each media-type word only in its data file" fails and names that file.
