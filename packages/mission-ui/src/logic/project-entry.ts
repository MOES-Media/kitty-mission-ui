import { LOCAL_ONLY_TEXT, SUMMARY_SEPARATOR, UNNAMED_PROJECT_TEXT } from '../defaults/index.js';
import type { ProjectView } from '../contract/types.js';
import type { ProjectEntry, ProjectEntryState } from '../project-types.js';

/** An entry that is not a row: the sentence it shows is the screen's, chosen by `kind`. */
export interface EntryStub {
  kind: ProjectEntryState;
  key: string;
  /** The host's display name; null when it gave none (the screen never derives one from the location). */
  name: string | null;
  /** What the heading shows: the name, else the location alone, else the generic word. */
  title: string;
  /** The location and, when flagged, the local-only segment; no branch (there is no project). */
  locationLine: string;
}

/** An entry whose read succeeded; the row's text is built by `buildRow`. */
export interface EntryRow {
  kind: 'row';
  key: string;
  project: ProjectView;
}

export type ResolvedEntry = EntryStub | EntryRow;

const STATES: readonly ProjectEntryState[] = ['loading', 'error', 'unavailable'];

/** The location line of an entry: the segments that exist, in order. */
export function locationSegments(entry: ProjectEntry, branch: string | null): string {
  return [entry.location === '' ? null : entry.location, branch, entry.localOnly === true ? LOCAL_ONLY_TEXT : null]
    .filter((segment): segment is string => segment !== null)
    .join(SUMMARY_SEPARATOR);
}

function stub(entry: ProjectEntry, kind: ProjectEntryState): EntryStub {
  const name = typeof entry.name === 'string' && entry.name !== '' ? entry.name : null;
  return { kind, key: entry.key, name, title: name ?? (entry.location === '' ? UNNAMED_PROJECT_TEXT : entry.location), locationLine: locationSegments(entry, null) };
}

/**
 * Which view an entry gets (research D-04). An entry `state` wins over a present `project`; an entry with neither, a state
 * outside the closed set, or a project whose name is empty is an `error` (mismatched or late data counts as not loaded).
 */
export function resolveEntry(entry: ProjectEntry): ResolvedEntry {
  if (entry.state !== undefined) return stub(entry, STATES.find((s) => s === entry.state) ?? 'error');
  const project = entry.project;
  if (project === undefined || project === null || project.name === '') return stub(entry, 'error');
  return { kind: 'row', key: entry.key, project };
}
