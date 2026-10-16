// Where the user can be in the shell: the Destination union, the route grammar and its defensive decoding
// (plan IC-01, research R-02, R-03, data-model "Destination"). Plain TypeScript: no Svelte, no DOM, no I/O (R-01).

/** The two hosts of the shell (contracts/shell-api.md). */
export type ShellMode = 'desktop' | 'dashboard';

/**
 * A place the shell can show. Optional identifiers are absent, never `undefined`, so deep equality holds on the round
 * trip.
 */
export type Destination =
  | { readonly screen: 'missions' }
  | { readonly screen: 'ops' }
  | { readonly screen: 'projects' }
  | { readonly screen: 'drift'; readonly missionId?: string }
  | { readonly screen: 'pipeline'; readonly missionId: string }
  | { readonly screen: 'work-packages'; readonly missionId: string; readonly wpId?: string }
  | { readonly screen: 'artifacts'; readonly missionId: string; readonly path?: string };

export type Screen = Destination['screen'];
export type Layout = 'project' | 'mission' | 'picker';

/** The layout each screen is shown in. */
export const LAYOUT: Readonly<Record<Screen, Layout>> = {
  missions: 'project',
  drift: 'project',
  ops: 'project',
  pipeline: 'mission',
  'work-packages': 'mission',
  artifacts: 'mission',
  projects: 'picker',
};

// Copied character for character from contracts/spec-kitty/mission-status/schemas/{MissionId,WpId,ArtifactPath}.yaml;
// test/logic/routes.test.ts compares them with those files.
export const MISSION_ID_PATTERN = '^[0-9A-HJKMNP-TV-Z]{26}$';
export const WP_ID_PATTERN = '^WP[0-9]{2,}$';
export const WP_ID_MAX_LENGTH = 64;
export const ARTIFACT_PATH_PATTERN =
  '^(?![\\s\\S]*[\\n\\r\\x0B\\x0C\\x1C-\\x1E\\x85\\u2028\\u2029])(?!~/)(?![A-Za-z]:)(?!\\.\\.?(?:/|$))[^/\\\\\\x00]+(?:/(?!\\.\\.?(?:/|$))[^/\\\\\\x00]+)*$';
export const ARTIFACT_PATH_MIN_LENGTH = 1;
export const ARTIFACT_PATH_MAX_LENGTH = 512;

const MISSION_ID = new RegExp(MISSION_ID_PATTERN, 'u');
const WP_ID = new RegExp(WP_ID_PATTERN, 'u');
const ARTIFACT_PATH = new RegExp(ARTIFACT_PATH_PATTERN, 'u');

const MISSIONS: Destination = { screen: 'missions' };

function isMissionId(value: string): boolean {
  return MISSION_ID.test(value);
}

function isWpId(value: string): boolean {
  return value.length <= WP_ID_MAX_LENGTH && WP_ID.test(value);
}

function isArtifactPath(value: string): boolean {
  const length = [...value].length;
  return length >= ARTIFACT_PATH_MIN_LENGTH && length <= ARTIFACT_PATH_MAX_LENGTH && ARTIFACT_PATH.test(value);
}

/** The decoded segment, or `null` when it is not valid percent-encoding. Only the decode call is guarded. */
function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** The canonical route of a destination (research R-02). */
export function formatRoute(destination: Destination): string {
  switch (destination.screen) {
    case 'missions':
    case 'ops':
    case 'projects':
      return `/${destination.screen}`;
    case 'drift':
      return destination.missionId === undefined ? '/drift' : `/drift/${destination.missionId}`;
    case 'pipeline':
      return `/missions/${destination.missionId}`;
    case 'work-packages':
      return `/missions/${destination.missionId}/work-packages${destination.wpId === undefined ? '' : `/${destination.wpId}`}`;
    case 'artifacts':
      return `/missions/${destination.missionId}/artifacts${destination.path === undefined ? '' : `/${encodeURIComponent(destination.path)}`}`;
  }
}

/** The `href` of a navigation item or tree row; the element calls `preventDefault()` and emits `sk-navigate`. */
export function routeHref(destination: Destination): string {
  return `#${formatRoute(destination)}`;
}

function parseKnown(segments: readonly string[], mode: ShellMode): Destination | null {
  const [head, second, third, fourth, ...rest] = segments;
  if (rest.length > 0) return null;
  if (head === 'missions' && second === undefined) return MISSIONS;
  if (head === 'ops' && second === undefined) return { screen: 'ops' };
  if (head === 'projects' && second === undefined) return mode === 'desktop' ? { screen: 'projects' } : MISSIONS;
  if (head === 'drift') {
    if (third !== undefined) return null;
    if (second === undefined) return { screen: 'drift' };
    return isMissionId(second) ? { screen: 'drift', missionId: second } : null;
  }
  if (head !== 'missions' || second === undefined || !isMissionId(second)) return null;
  const missionId = second;
  if (third === undefined) return { screen: 'pipeline', missionId };
  if (third === 'work-packages') {
    if (fourth === undefined) return { screen: 'work-packages', missionId };
    return isWpId(fourth) ? { screen: 'work-packages', missionId, wpId: fourth } : null;
  }
  if (third === 'artifacts') {
    if (fourth === undefined) return { screen: 'artifacts', missionId };
    return isArtifactPath(fourth) ? { screen: 'artifacts', missionId, path: fourth } : null;
  }
  return null;
}

/**
 * The destination of a route string, which is untrusted input from a host or a deep link. Never throws. A route that
 * matches no grammar row exactly (an empty or extra segment, a trailing slash), fails to decode, carries an id that
 * misses its contract pattern or an artifact path that misses `ArtifactPath` is unknown, and unknown parses to
 * Missions. `/projects` is Missions on the dashboard (FR-015).
 *
 * A well-formed Mission id that does not exist is not a routing concern: it parses normally and its reads produce the
 * refusal or `not-found` view (controller, IC-03).
 *
 * Null-client rules, which this pure module does not apply (the controller does, IC-03 and IC-04; data-model
 * "Destination", research R-10): with `client = null` the only desktop destination is `projects`, and on the
 * dashboard the project layout shows the shell `error` "No project is open." with no reads and no throw. The default
 * route is `/missions`, or `/projects` with a null client on the desktop.
 */
export function parseRoute(route: string, mode: ShellMode): Destination {
  return normaliseRoute(route, mode).destination;
}

/**
 * The destination plus the canonical route and whether the input already was that route. The controller fires
 * `routeChanged(route)` exactly when `canonical` is false for a host-set route; this module fires nothing. An unknown
 * route is non-canonical (its canonical form is `/missions`).
 */
export function normaliseRoute(
  route: string,
  mode: ShellMode,
): { destination: Destination; route: string; canonical: boolean } {
  const destination = parseDecoded(route, mode) ?? MISSIONS;
  const canonicalRoute = formatRoute(destination);
  return { destination, route: canonicalRoute, canonical: canonicalRoute === route };
}

function parseDecoded(route: string, mode: ShellMode): Destination | null {
  if (!route.startsWith('/')) return null;
  const raw = route.slice(1).split('/');
  const segments: string[] = [];
  for (const segment of raw) {
    const decoded = decode(segment);
    if (decoded === null || decoded === '') return null;
    segments.push(decoded);
  }
  return parseKnown(segments, mode);
}
