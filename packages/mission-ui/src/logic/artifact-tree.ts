// The Artifact Viewer's tree: a pure helper whose result the shell draws (the screen itself draws no tree). The listing
// order is kept; no file or folder name is known here, the kind words and icons are read from the vocabulary.
import { ARTIFACT_HREF_PREFIX, PATH_SEPARATOR, TREE_FOLDER_ID_PREFIX, TREE_ID_PREFIX, UNAVAILABLE_TEXT, UNKNOWN_KIND_ICON } from '../defaults/index.js';
import type { ArtifactEntryView } from '../contract/types.js';
import type { TreeNode } from '../shell-types.js';
import { splitPath } from './artifact-path.js';
import { resolveArtifactVocabulary, type ArtifactLabelHooks, type ArtifactVocabulary } from './artifact-types.js';
import { lookup } from './lookup.js';

/** The nodes the shell draws and the id of the selected leaf, or the empty string. */
export interface ArtifactTreeResult {
  nodes: TreeNode[];
  current: string;
}

export interface ArtifactTreeOptions {
  /** The open path; its folders are open and its leaf is current. */
  selectedPath: string;
  /** The folder ids the host has seen opened: the initial open state only, never written. */
  expandedIds?: ReadonlySet<string> | null;
  /** The `href` of a leaf; the default is the data prefix plus the encoded path (never followed by this screen). */
  hrefOf?: (path: string) => string;
  /** Reserved: the tree draws no kind word, so no hook is read yet. */
  hooks?: ArtifactLabelHooks | null;
  vocabulary?: ArtifactVocabulary | null;
}

const leafIdOf = (path: string): string => `${TREE_ID_PREFIX}${path}`;
const folderIdOf = (path: string): string => `${TREE_FOLDER_ID_PREFIX}${path}`;

/**
 * Folders come from the path segments, a folder sits where its first file sits, its `meta` is the count of files at any
 * depth, a leaf that is not readable is `unavailable` with the word as its `meta` (the shell draws only `meta`), and
 * `current` is empty when the SELECTED leaf is unavailable. Memoise on `entries` and `selectedPath` in the host.
 */
export function buildArtifactTree(entries: readonly ArtifactEntryView[], options: ArtifactTreeOptions): ArtifactTreeResult {
  const { kinds } = resolveArtifactVocabulary(options.vocabulary);
  const hrefOf = options.hrefOf ?? ((path: string): string => `${ARTIFACT_HREF_PREFIX}${encodeURIComponent(path)}`);
  const selectedFolders = new Set(ancestorPaths(options.selectedPath));
  const roots: TreeNode[] = [];
  const folders = new Map<string, { node: TreeNode; files: number }>();
  let current = '';

  for (const entry of entries) {
    const segments = splitPath(entry.path);
    const name = segments.at(-1);
    if (name === undefined) continue;
    let siblings = roots;
    let folderPath = '';
    for (const segment of segments.slice(0, -1)) {
      folderPath = folderPath === '' ? segment : `${folderPath}${PATH_SEPARATOR}${segment}`;
      let folder = folders.get(folderPath);
      if (folder === undefined) {
        const id = folderIdOf(folderPath);
        const node: TreeNode = { id, label: segment, kind: 'folder', expanded: selectedFolders.has(folderPath) || (options.expandedIds?.has(id) ?? false), children: [] };
        folder = { node, files: 0 };
        folders.set(folderPath, folder);
        siblings.push(node);
      }
      folder.files += 1;
      siblings = folder.node.children as TreeNode[];
    }
    const unavailable = !entry.readable;
    const leaf: TreeNode = { id: leafIdOf(entry.path), label: name, href: hrefOf(entry.path), kind: 'leaf', icon: lookup(kinds, entry.kind)?.icon ?? UNKNOWN_KIND_ICON };
    if (unavailable) {
      leaf.unavailable = true;
      leaf.meta = UNAVAILABLE_TEXT;
    } else if (entry.path === options.selectedPath) {
      current = leaf.id;
    }
    siblings.push(leaf);
  }
  for (const { node, files } of folders.values()) node.meta = String(files);
  return { nodes: roots, current };
}

/** The folder paths above a path, outermost first (the path itself is not one). */
function ancestorPaths(path: string): string[] {
  const segments = splitPath(path).slice(0, -1);
  return segments.map((_, i) => segments.slice(0, i + 1).join(PATH_SEPARATOR));
}

/** The path of a leaf id built by `buildArtifactTree`; null for a folder id or any other id. */
export function pathOfArtifactNode(id: string): string | null {
  return id.startsWith(TREE_ID_PREFIX) ? id.slice(TREE_ID_PREFIX.length) : null;
}
