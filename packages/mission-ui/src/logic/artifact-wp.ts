// Which Work Package a prompt or review file belongs to (N-Q11): matched against the ids the host passed, never by a
// pattern of the screen. The container segment, the separator and the kinds that link are the vocabulary's.
import { resolveArtifactVocabulary, type ArtifactScreenWorkPackage, type ArtifactVocabulary } from './artifact-types.js';
import { splitPath } from './artifact-path.js';

const EXTENSION_DOT = '.';

/** The segment without its extension: the part before the last dot (a segment that starts with a dot is kept whole). */
function stem(segment: string): string {
  const dot = segment.lastIndexOf(EXTENSION_DOT);
  return dot > 0 ? segment.slice(0, dot) : segment;
}

/**
 * The Work Package whose id leads the first segment under the container segment: the segment, without extension, equals
 * the id or starts with the id and the separator. The longest id wins; no match, a kind that does not link, or a path
 * outside the container is null.
 */
export function matchWorkPackage(
  path: string,
  kind: string,
  workPackages: readonly ArtifactScreenWorkPackage[],
  vocabulary?: ArtifactVocabulary | null,
): { wpId: string } | null {
  const { linkKinds, container } = resolveArtifactVocabulary(vocabulary);
  if (!linkKinds.includes(kind)) return null;
  const [root, first] = splitPath(path);
  if (root !== container.segment || first === undefined) return null;
  const name = stem(first);
  let best: string | null = null;
  for (const { wpId } of workPackages) {
    if (wpId === '') continue;
    const leads = name === wpId || name.startsWith(`${wpId}${container.separator}`);
    if (leads && (best === null || wpId.length > best.length)) best = wpId;
  }
  return best === null ? null : { wpId: best };
}
