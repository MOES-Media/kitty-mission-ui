import { describe, expect, it } from 'vitest';
import { BULK_LISTING_SIZE, makeArtifactListing } from '../src/contract/bulk.js';
import { listingPopulated, listingUnknownKind, listingUnreadableRows, listingWithOpenFiles } from '../src/contract/fixtures.generated.js';
import type { ArtifactEntryView } from '../src/contract/types.js';
import { ARTIFACT_HREF_PREFIX, TREE_FOLDER_ID_PREFIX, TREE_ID_PREFIX, UNAVAILABLE_TEXT, UNKNOWN_KIND_ICON } from '../src/defaults/index.js';
import { dirOf, resolveRelative, splitPath } from '../src/logic/artifact-path.js';
import { buildArtifactTree, pathOfArtifactNode } from '../src/logic/artifact-tree.js';
import type { ArtifactVocabulary } from '../src/logic/artifact-types.js';
import type { TreeNode } from '../src/shell-types.js';
import { leafId, walk } from './support/artifact-tree-harness.js';
import treeSource from '../src/logic/artifact-tree.ts?raw';
import pathSource from '../src/logic/artifact-path.ts?raw';

const entry = (path: string, over: Partial<ArtifactEntryView> = {}): ArtifactEntryView => ({
  path,
  kind: 'other',
  sizeBytes: 10,
  modifiedAt: '2026-09-23T08:00:00Z',
  readable: true,
  ...over,
});

const folderId = (path: string): string => `${TREE_FOLDER_ID_PREFIX}${path}`;

const SAMPLE = [entry('a.md'), entry('docs/b.md'), entry('docs/deep/c.md'), entry('docs/deep/d.md'), entry('z/e.md')];

describe('buildArtifactTree: nesting, counts and order', () => {
  it('builds folders from path segments with files at any depth counted, keeping the listing order', () => {
    const { nodes } = buildArtifactTree(SAMPLE, { selectedPath: '' });
    expect(nodes.map((n) => [n.id, n.kind, n.label, n.meta])).toEqual([
      [leafId('a.md'), 'leaf', 'a.md', undefined],
      [folderId('docs'), 'folder', 'docs', '3'],
      [folderId('z'), 'folder', 'z', '1'],
    ]);
    const docs = nodes[1] as TreeNode;
    expect(docs.children?.map((n) => [n.id, n.kind, n.label, n.meta])).toEqual([
      [leafId('docs/b.md'), 'leaf', 'b.md', undefined],
      [folderId('docs/deep'), 'folder', 'deep', '2'],
    ]);
    expect(walk(nodes).filter((n) => n.kind === 'leaf').length).toBe(5);
  });

  it('keeps the byte order of the listing and does not sort: a reversed listing stays reversed', () => {
    const reversed = [...SAMPLE].reverse();
    const { nodes } = buildArtifactTree(reversed, { selectedPath: '' });
    expect(nodes.map((n) => n.id)).toEqual([folderId('z'), folderId('docs'), leafId('a.md')]);
    const docs = nodes[1] as TreeNode;
    expect(docs.children?.map((n) => n.id)).toEqual([folderId('docs/deep'), leafId('docs/b.md')]);
  });

  it('puts a folder where its first file sits even when its files are not contiguous', () => {
    const { nodes } = buildArtifactTree([entry('d/1.md'), entry('x.md'), entry('d/2.md')], { selectedPath: '' });
    expect(nodes.map((n) => n.id)).toEqual([folderId('d'), leafId('x.md')]);
    expect((nodes[0] as TreeNode).children?.map((n) => n.id)).toEqual([leafId('d/1.md'), leafId('d/2.md')]);
    expect((nodes[0] as TreeNode).meta).toBe('2');
  });

  it('gives a leaf and a folder of the same name different ids', () => {
    const { nodes } = buildArtifactTree([entry('a'), entry('a/b.md')], { selectedPath: '' });
    expect(nodes.map((n) => n.id)).toEqual([leafId('a'), folderId('a')]);
    expect(new Set(nodes.map((n) => n.id)).size).toBe(2);
  });

  it('returns no nodes for no entries', () => {
    expect(buildArtifactTree([], { selectedPath: '' })).toEqual({ nodes: [], current: '' });
  });
});

describe('buildArtifactTree: the selection and the open state', () => {
  it('marks the selected leaf current and opens exactly its ancestors, collapsing every other folder', () => {
    const { nodes, current } = buildArtifactTree(SAMPLE, { selectedPath: 'docs/deep/c.md' });
    expect(current).toBe(leafId('docs/deep/c.md'));
    const byId = new Map(walk(nodes).map((n) => [n.id, n]));
    expect(byId.get(folderId('docs'))?.expanded).toBe(true);
    expect(byId.get(folderId('docs/deep'))?.expanded).toBe(true);
    expect(byId.get(folderId('z'))?.expanded).toBe(false);
    // positive control: with nothing selected nothing is open
    const none = buildArtifactTree(SAMPLE, { selectedPath: '' });
    expect(walk(none.nodes).filter((n) => n.kind === 'folder').every((n) => n.expanded === false)).toBe(true);
    expect(none.current).toBe('');
  });

  it('has an empty current for a selection that is not in the listing', () => {
    const { current, nodes } = buildArtifactTree(SAMPLE, { selectedPath: 'missing/x.md' });
    expect(current).toBe('');
    expect(walk(nodes).filter((n) => n.kind === 'folder').every((n) => n.expanded === false)).toBe(true);
  });

  it('opens a folder named in expandedIds, as the initial state only', () => {
    const open = new Set([folderId('z')]);
    const { nodes } = buildArtifactTree(SAMPLE, { selectedPath: 'a.md', expandedIds: open });
    const byId = new Map(walk(nodes).map((n) => [n.id, n]));
    expect(byId.get(folderId('z'))?.expanded).toBe(true);
    expect(byId.get(folderId('docs'))?.expanded).toBe(false);
    // the set is read, never written
    expect([...open]).toEqual([folderId('z')]);
    expect(buildArtifactTree(SAMPLE, { selectedPath: 'a.md', expandedIds: null }).nodes.some((n) => n.expanded === true)).toBe(false);
  });

  it('takes the leaf href from hrefOf, else the data default of the encoded path', () => {
    const custom = buildArtifactTree([entry('docs/with space.md')], { selectedPath: '', hrefOf: (p) => `#x/${p}` });
    expect((custom.nodes[0]?.children?.[0] as TreeNode).href).toBe('#x/docs/with space.md');
    const plain = buildArtifactTree([entry('docs/with space.md')], { selectedPath: '' });
    expect((plain.nodes[0]?.children?.[0] as TreeNode).href).toBe(`${ARTIFACT_HREF_PREFIX}${encodeURIComponent('docs/with space.md')}`);
    expect(plain.nodes[0]?.href).toBeUndefined();
  });
});

describe('buildArtifactTree: unreadable rows', () => {
  it('marks a leaf that is not readable unavailable and gives it the word as its meta', () => {
    const { nodes, current } = buildArtifactTree(listingUnreadableRows.entries, { selectedPath: '' });
    const leaves = walk(nodes).filter((n) => n.kind === 'leaf');
    expect(leaves.length).toBe(3);
    for (const leaf of leaves) {
      expect(leaf.unavailable, leaf.id).toBe(true);
      expect(leaf.meta, leaf.id).toBe(UNAVAILABLE_TEXT);
    }
    expect(current).toBe('');
  });

  it('leaves a readable leaf available with no meta (positive control)', () => {
    const { nodes } = buildArtifactTree([entry('ok.md'), entry('no.md', { readable: false })], { selectedPath: '' });
    expect(nodes.map((n) => [n.label, n.unavailable ?? false, n.meta])).toEqual([
      ['ok.md', false, undefined],
      ['no.md', true, UNAVAILABLE_TEXT],
    ]);
  });

  it('has an empty current when the SELECTED leaf is unavailable, but a current for a readable one beside it', () => {
    const entries = [entry('ok.md'), entry('no.md', { readable: false })];
    expect(buildArtifactTree(entries, { selectedPath: 'no.md' }).current).toBe('');
    expect(buildArtifactTree(entries, { selectedPath: 'ok.md' }).current).toBe(leafId('ok.md'));
  });

  it('still opens the ancestors of an unavailable selected leaf', () => {
    const { nodes } = buildArtifactTree([entry('d/no.md', { readable: false })], { selectedPath: 'd/no.md' });
    expect(nodes[0]?.expanded).toBe(true);
  });
});

describe('buildArtifactTree: kinds, icons and the vocabulary', () => {
  it('takes the icon from the kind table and the neutral glyph for an unknown kind', () => {
    const { nodes } = buildArtifactTree(listingUnknownKind.entries, { selectedPath: '' });
    const leaf = walk(nodes).find((n) => n.kind === 'leaf') as TreeNode;
    expect(leaf.icon).toBe(UNKNOWN_KIND_ICON);
    const typed = buildArtifactTree(listingPopulated.entries, { selectedPath: '' });
    const icons = new Map(walk(typed.nodes).filter((n) => n.kind === 'leaf').map((n) => [n.label, n.icon]));
    expect(icons.get('research.md')).toBe('magnifier');
    expect(icons.get('data-model.md')).toBe('table');
    expect(icons.get('spec.md')).toBe('file');
  });

  it('reads the kind table of an explicit vocabulary, and the defaults with none', () => {
    const vocabulary: ArtifactVocabulary = { kinds: { gadget: { label: 'Gadget', icon: 'folder' } } };
    const own = buildArtifactTree([entry('g.md', { kind: 'gadget' }), entry('s.md', { kind: 'spec' })], { selectedPath: '', vocabulary });
    expect(own.nodes.map((n) => [n.label, n.icon])).toEqual([
      ['g.md', 'folder'],
      ['s.md', UNKNOWN_KIND_ICON],
    ]);
    const none = buildArtifactTree([entry('r.md', { kind: 'research' })], { selectedPath: '', vocabulary: null });
    expect(none.nodes[0]?.icon).toBe('magnifier');
    const empty = buildArtifactTree([entry('r.md', { kind: 'research' })], { selectedPath: '', vocabulary: {} });
    expect(empty).toEqual(none);
  });

  it('builds the open-files fixture with the Work Package folder and a review folder beneath it', () => {
    const { nodes } = buildArtifactTree(listingWithOpenFiles.entries, { selectedPath: 'tasks/WP01-example/review-cycle-1.md' });
    const tasks = nodes.find((n) => n.id === folderId('tasks')) as TreeNode;
    expect(tasks.expanded).toBe(true);
    expect(tasks.meta).toBe('2');
    expect(tasks.children?.map((n) => n.id)).toEqual([leafId('tasks/WP01-example.md'), folderId('tasks/WP01-example')]);
  });
});

describe('buildArtifactTree: the 1000-entry listing', () => {
  it('cross-checks every entry: its own relative name from its directory resolves to its path, and the tree builds the leaf with that id', () => {
    const listing = makeArtifactListing(BULK_LISTING_SIZE, { truncated: false });
    const { nodes } = buildArtifactTree(listing.entries, { selectedPath: '' });
    const ids = new Set(walk(nodes).filter((n) => n.kind === 'leaf').map((n) => n.id));
    expect(ids.size).toBe(1000);
    let ran = 0;
    for (const e of listing.entries) {
      const name = splitPath(e.path).at(-1) as string;
      const resolved = resolveRelative(dirOf(e.path), name);
      expect(resolved, e.path).toBe(e.path);
      expect(ids.has(leafId(resolved as string)), e.path).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(1000);
  });
});

describe('pathOfArtifactNode', () => {
  const ODD = ['spec.md', 'notes/with space.md', 'café/über.md', '100%/a%20b.md', `${TREE_ID_PREFIX}x.md`, `${TREE_FOLDER_ID_PREFIX}y/z.md`, 'a//b', ''];

  it('is the inverse of the leaf id over odd paths', () => {
    let ran = 0;
    for (const path of ODD) {
      const { nodes } = buildArtifactTree([entry(path)], { selectedPath: '' });
      const leaf = walk(nodes).find((n) => n.kind === 'leaf');
      if (path === '') {
        expect(leaf, 'the empty path has no leaf').toBeUndefined();
      } else {
        expect(pathOfArtifactNode((leaf as TreeNode).id), path).toBe(path);
      }
      expect(pathOfArtifactNode(leafId(path)), path).toBe(path);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('returns null for a folder id and for a foreign navigation id (positive control: a leaf id resolves)', () => {
    expect(pathOfArtifactNode(folderId('docs'))).toBeNull();
    expect(pathOfArtifactNode('mission:pipeline')).toBeNull();
    expect(pathOfArtifactNode('')).toBeNull();
    expect(pathOfArtifactNode(leafId('docs/b.md'))).toBe('docs/b.md');
  });
});

describe('the files', () => {
  it('contain no spec.md or tasks/ literal: the kind and container words are data', () => {
    for (const [name, source] of [['artifact-tree.ts', treeSource], ['artifact-path.ts', pathSource]] as const) {
      expect(source.length, name).toBeGreaterThan(200);
      expect(/spec\.md/.test(source), name).toBe(false);
      expect(/tasks\//.test(source), name).toBe(false);
    }
    // positive control: the scan sees a literal when there is one
    expect(/tasks\//.test("const x = 'tasks/WP01';")).toBe(true);
  });
});

// Deliberate revert (D-34 rule 4): make the SELECTED unavailable leaf keep its id in `current`;
// "has an empty current when the SELECTED leaf is unavailable" fails.
