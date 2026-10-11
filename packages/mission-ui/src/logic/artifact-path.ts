// The one place listing paths are split and resolved, over one separator. Shared by the tree, the link classifier and the
// Work Package matcher, so no other file splits a path.
import { PATH_SEPARATOR } from '../defaults/index.js';

/** The segments of a path; the empty path has none. An empty segment (a doubled separator) is kept, so a caller can refuse it. */
export function splitPath(path: string): string[] {
  return path === '' ? [] : path.split(PATH_SEPARATOR);
}

/** The directory of a path, empty at the root. */
export function dirOf(path: string): string {
  return splitPath(path).slice(0, -1).join(PATH_SEPARATOR);
}

/**
 * A relative destination resolved against the directory `from` (empty for the root). A dot segment is dropped and a parent
 * segment pops. Returns null for an empty segment, a result above the root, a trailing separator, and an empty result.
 */
export function resolveRelative(from: string, relative: string): string | null {
  if (relative === '') return null;
  const segments = splitPath(from);
  for (const segment of relative.split(PATH_SEPARATOR)) {
    if (segment === '') return null;
    if (segment === '.') continue;
    if (segment === '..') {
      if (segments.length === 0) return null;
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.length === 0 ? null : segments.join(PATH_SEPARATOR);
}
