// Ops screen copy and vocabulary (contracts/defaults.md): every word, tone and sentence of the screen lives in this one file, so an
// amendment is a one-file change. The tables are keyed by the contract word and read through `lookup`; an unknown key shows the
// raw word with the neutral tone. Host-neutral by rule: no path, file format or host name. The module is exported from
// `defaults/index.ts`; its export names are disjoint from the other defaults, which a unit test checks.
import type { StateBadge } from '../logic/types.js';

/** The code of a refused page cursor (the vendored `PageCursorRefusal` schema). */
export const CURSOR_REFUSAL_CODE = 'invalid_page_cursor';
/** The label of the retry control of the error look. */
export const ERROR_RETRY_LABEL = 'Try again';

/** Every default string by key. Strings with `{name}` placeholders are templates, filled by `fillTemplate`. */
export const OPS_COPY = {
  headerEyebrow: 'Project',
  headerTitle: 'Ops',
  headerBadge: 'Read only',
  headerSeparator: ' · ',
  headerSupportingTail: 'invocation records',
  sourceNotice: "Read from this project's Ops directory and sorted by start time, newest first. Viewing Ops never invokes an agent.",
  sectionEyebrow: 'Invocation records',
  sectionHeading: 'Newest records',
  countOf: '{loaded} of {total}',
  countAll: '{total} records',
  countAllOne: '{total} record',
  profileFact: 'Profile: {profile}',
  termProfile: 'Profile',
  termAction: 'Action',
  termActor: 'Actor',
  termStarted: 'Started',
  termCompleted: 'Completed',
  termEvidence: 'Evidence',
  termMission: 'Mission',
  termWorkPackage: 'Work Package',
  termMode: 'Mode',
  termClosedBy: 'Closed by',
  quietEvidenceClosed: 'Not recorded',
  quietEvidenceOpen: 'Not recorded yet',
  quietActor: 'Not shown',
  quietCompletedOpen: 'Not recorded yet',
  quietCompletedClosed: 'Not recorded',
  redactedWord: 'changed',
  redactedDescription: 'Host paths and e-mail addresses are replaced, or the text was cut.',
  skippedOne: '{n} record in this project could not be read and is not shown.',
  skippedMany: '{n} records in this project could not be read and are not shown.',
  loadMore: 'Load more',
  loadMoreError: 'The next records could not be loaded.',
  retryLabel: ERROR_RETRY_LABEL,
  refusedCursor: 'This position in the list is no longer valid.',
  refreshAction: 'Refresh from the newest',
  emptyHeading: 'No invocation records',
  emptyBody: 'No invocation records are available for this project.',
  emptyProfile: 'No records for this profile.',
  loadingLabel: 'Reading invocation records',
  loadingBody: "Reading the project's Ops records. No agent is invoked.",
  errorHeading: 'Invocation records unavailable',
  errorBody: 'The Ops records could not be read. No invocation rows are shown.',
  announceLoading: 'Loading invocation records',
  announceLoaded: '{loaded} of {total} records loaded',
  announceLoadedOne: '{loaded} of {total} record loaded',
  announceMore: '{n} more records loaded',
  announceMoreOne: '{n} more record loaded',
  announceLoadingMore: 'Loading more records',
} as const;

export type OpsCopyKey = keyof typeof OPS_COPY;
/** The default copy as a plain string record (the hook and the vocabulary read it by key). */
export type OpsCopyTable = Readonly<Record<OpsCopyKey, string>>;
/** Resolves a copy key to its text (the default table, or the table behind a `labels.copy` hook). */
export type OpsCopyResolver = (key: OpsCopyKey) => string;

export const defaultOpsCopy: OpsCopyResolver = (key) => OPS_COPY[key];

/** The twelve month names the UTC time text prints (no `Intl`, so a baseline never depends on the browser locale). */
export const OPS_MONTHS: readonly string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A word and its badge tone. */
export interface OpsWordTone {
  word: string;
  tone: StateBadge['tone'];
}

/** How a closed Op ended, by outcome word. */
export const OPS_OUTCOMES: Readonly<Record<string, OpsWordTone>> = {
  done: { word: 'done', tone: 'success' },
  failed: { word: 'failed', tone: 'danger' },
  abandoned: { word: 'abandoned', tone: 'attention' },
};

/** Whether an Op is open or closed, by status word. */
export const OPS_STATUSES: Readonly<Record<string, OpsWordTone>> = {
  open: { word: 'open', tone: 'neutral' },
  closed: { word: 'closed', tone: 'neutral' },
};

/** Who closed an Op, by closer word. The agent is the usual closer, so its fact is named here and not drawn. */
export const OPS_CLOSERS: Readonly<Record<string, { word: string; drawn: boolean }>> = {
  doctor_sweep: { word: 'sweep', drawn: true },
  agent: { word: 'agent', drawn: false },
};

/** How the work was framed, by mode word. */
export const OPS_MODES: Readonly<Record<string, string>> = {
  task_execution: 'task execution',
  advisory: 'advisory',
  mission_step: 'mission step',
  query: 'query',
};

/** The class of the evidence, by evidence kind. */
export const OPS_EVIDENCE_CLASSES: Readonly<Record<string, string>> = {
  repo_path: 'path',
  url: 'address',
  text: 'text',
};

/** The copy keys of the quiet words of an absent Completed and Evidence, by status word. */
export interface OpsQuietKeys {
  completed: OpsCopyKey;
  evidence: OpsCopyKey;
}

/** The quiet words by status word: an Op that is still open has "not recorded yet", a closed one "not recorded". */
export const OPS_QUIET_WORDS: Readonly<Record<string, OpsQuietKeys>> = {
  open: { completed: 'quietCompletedOpen', evidence: 'quietEvidenceOpen' },
  closed: { completed: 'quietCompletedClosed', evidence: 'quietEvidenceClosed' },
};

/** The quiet words of a status the table does not know: the closed wording (nothing is claimed to be coming). */
export const OPS_QUIET_FALLBACK: OpsQuietKeys = { completed: 'quietCompletedClosed', evidence: 'quietEvidenceClosed' };

/** The copy key of the error body by refusal code; an unknown or null code shows the generic body (`errorBody`). */
export const OPS_ERROR_BY_CODE: Readonly<Record<string, OpsCopyKey>> = {
  ops_unreadable: 'errorBody',
};

/** What the pure logic reads: the tables and the copy. The default is `OPS_VOCABULARY`. */
export interface OpsVocabulary {
  outcomes: Readonly<Record<string, OpsWordTone>>;
  statuses: Readonly<Record<string, OpsWordTone>>;
  closers: Readonly<Record<string, { word: string; drawn: boolean }>>;
  modes: Readonly<Record<string, string>>;
  evidenceClasses: Readonly<Record<string, string>>;
  quiet: Readonly<Record<string, OpsQuietKeys>>;
  quietFallback: OpsQuietKeys;
  copy: OpsCopyTable;
}

export const OPS_VOCABULARY: OpsVocabulary = {
  outcomes: OPS_OUTCOMES,
  statuses: OPS_STATUSES,
  closers: OPS_CLOSERS,
  modes: OPS_MODES,
  evidenceClasses: OPS_EVIDENCE_CLASSES,
  quiet: OPS_QUIET_WORDS,
  quietFallback: OPS_QUIET_FALLBACK,
  copy: OPS_COPY,
};

/** Replaces each `{name}` that has a value; a placeholder without a value stays as written. */
export function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (Object.hasOwn(values, name) ? (values[name] as string) : whole));
}

/** "{loaded} of {total}", or "{total} records" ("{total} record" for one) when everything is loaded. */
export function opsCountText(loaded: number, total: number, copy: OpsCopyResolver = defaultOpsCopy): string {
  if (loaded !== total) return fillTemplate(copy('countOf'), { loaded: String(loaded), total: String(total) });
  return fillTemplate(copy(total === 1 ? 'countAllOne' : 'countAll'), { total: String(total) });
}

/** The skipped-record sentence; the singular has its own template. */
export function skippedText(n: number, copy: OpsCopyResolver = defaultOpsCopy): string {
  return fillTemplate(copy(n === 1 ? 'skippedOne' : 'skippedMany'), { n: String(n) });
}

/** The announcement of a ready look: after a load-more `added` rows ("{n} more records loaded"), else the loaded count. */
export function loadedAnnouncement(loaded: number, total: number, added: number | null, copy: OpsCopyResolver = defaultOpsCopy): string {
  if (added !== null) return fillTemplate(copy(added === 1 ? 'announceMoreOne' : 'announceMore'), { n: String(added) });
  return fillTemplate(copy(total === 1 ? 'announceLoadedOne' : 'announceLoaded'), { loaded: String(loaded), total: String(total) });
}

/** "Profile: {profile}". */
export function profileFactText(profile: string, copy: OpsCopyResolver = defaultOpsCopy): string {
  return fillTemplate(copy('profileFact'), { profile });
}
