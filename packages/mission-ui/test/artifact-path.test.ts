import { describe, expect, it } from 'vitest';
import { makeArtifactListing } from '../src/contract/bulk.js';
import { PATH_SEPARATOR } from '../src/defaults/index.js';
import { dirOf, resolveRelative, splitPath } from '../src/logic/artifact-path.js';
import pathSource from '../src/logic/artifact-path.ts?raw';

describe('splitPath and dirOf', () => {
  it('splits over the one separator and treats the empty path as no segments', () => {
    expect(PATH_SEPARATOR).toBe('/');
    expect(splitPath('a/b/c.md')).toEqual(['a', 'b', 'c.md']);
    expect(splitPath('c.md')).toEqual(['c.md']);
    expect(splitPath('')).toEqual([]);
    expect(splitPath('a//b')).toEqual(['a', '', 'b']);
  });

  it('returns the directory of a path, empty at the root', () => {
    expect(dirOf('a/b/c.md')).toBe('a/b');
    expect(dirOf('a/c.md')).toBe('a');
    expect(dirOf('c.md')).toBe('');
    expect(dirOf('')).toBe('');
  });
});

describe('resolveRelative', () => {
  const rows: Array<[string, string, string, string | null]> = [
    ['a sibling', 'a/b', 'c.md', 'a/b/c.md'],
    ['from the root', '', 'c.md', 'c.md'],
    ['a dot segment is dropped', 'a', './c.md', 'a/c.md'],
    ['a parent segment pops', 'a/b', '../c.md', 'a/c.md'],
    ['two parents reach the root', 'a/b', '../../c.md', 'c.md'],
    ['a parent above the root', 'a', '../../c.md', null],
    ['a parent at the root', '', '../c.md', null],
    ['an empty segment', 'a', 'x//c.md', null],
    ['a trailing slash', 'a', 'dir/', null],
    ['a dot-only result at the root is empty', '', '.', null],
    ['a dot-only result names the directory itself (no entry has that path)', 'a', '.', 'a'],
    ['an empty relative path', 'a', '', null],
    ['a dot and a parent that cancel to the root', 'a', '../.', null],
    ['an odd name', 'a', 'with space.md', 'a/with space.md'],
    ['a percent sign kept as text', 'a', '100%.md', 'a/100%.md'],
  ];

  for (const [name, from, relative, want] of rows) {
    it(`${name}: ${JSON.stringify(from)} + ${JSON.stringify(relative)}`, () => {
      expect(resolveRelative(from, relative)).toBe(want);
    });
  }

  it('has the declared number of rows', () => {
    expect(rows.length).toBe(15);
  });

  it('cross-checks the 1000-entry bulk listing: a name resolved from its own directory is its own path', () => {
    const listing = makeArtifactListing(1000, { truncated: true });
    expect(listing.entries.length).toBe(1000);
    let ran = 0;
    for (const entry of listing.entries) {
      const name = splitPath(entry.path).at(-1) as string;
      expect(resolveRelative(dirOf(entry.path), name), entry.path).toBe(entry.path);
      ran += 1;
    }
    expect(ran).toBe(1000);
  });

  it('has a positive control: a wrong directory does not return the path', () => {
    expect(resolveRelative('other', 'note.md')).not.toBe('area/note.md');
  });
});

describe('the file', () => {
  it('writes the separator nowhere (it is read from defaults/)', () => {
    expect(pathSource.includes("'/'")).toBe(false);
    expect(pathSource.includes('"/"')).toBe(false);
  });
});

// Deliberate revert (D-34 rule 4): in resolveRelative make '..' above the root clamp instead of returning null;
// "a parent above the root" fails.
