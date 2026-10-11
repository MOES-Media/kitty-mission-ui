// Drift screen copy and vocabulary (provisional until CP-1): every word and sentence the screen draws, the only place a
// drift kind, severity, authority, derived side, remedy or source code may be written (C-007). A key the screen has never
// seen shows the raw value in the neutral tone (resolved in logic/, never here). Copy asserts nothing the contract does not.
import type { BadgeTone } from '../logic/types.js';

export const DRIFT_TITLE = 'Drift';
export const DRIFT_SUBTITLE = 'Derived state checked against the event log and git';
export const RESCAN_LABEL = 'Rescan';
export const RESCANNING_LABEL = 'Rescanning';
/** The one polite line when a rescan starts: the busy state sits on the Rescan control, so the start is said in the live region. */
export const RESCANNING_ANNOUNCEMENT = RESCANNING_LABEL;
/** "last scan <relative time>"; the time is already resolved by the caller. */
export const LAST_SCAN_TEXT = (relative: string): string => `last scan ${relative}`;
/** The count is `findings.length`, printed as given (C-004). */
export const FINDINGS_COUNT_TEXT = (count: number): string => (count === 1 ? '1 finding' : `${count} findings`);

/** The word and the tone of a severity. An unknown severity is its raw value in the neutral tone (see logic/drift-finding.ts). */
export const SEVERITY_WORDS: Readonly<Record<string, { word: string; plural: string; tone: BadgeTone }>> = {
  error: { word: 'error', plural: 'errors', tone: 'danger' },
  warning: { word: 'warning', plural: 'warnings', tone: 'attention' },
};

/**
 * "2 errors, 3 warnings": the parts are given in first-seen order, the word already resolved. The plural of a word is the table's
 * (`plural`); a word with none (an unknown severity, or a word of a label hook) is printed as given with its count ("critical: 2").
 */
export const SEVERITY_ROLLUP_TEXT = (parts: ReadonlyArray<{ count: number; word: string; plural: string | null }>): string =>
  parts.map((part) => (part.plural === null ? `${part.word}: ${part.count}` : `${part.count} ${part.count === 1 ? part.word : part.plural}`)).join(', ');
/** The roll-up of a truncated report covers the shown findings only (FR-018). */
export const ROLLUP_SHOWN_TEXT = (rollup: string): string => `Among the shown findings: ${rollup}`;

/** The kicker of a kind and its explanation: one sentence for a kind that has no source code, else one per audit code (`bySourceCode`). */
interface KindCopy {
  kicker: string;
  explanation?: string;
  bySourceCode?: Readonly<Record<string, string>>;
}

export const KIND_COPY: Readonly<Record<string, KindCopy>> = {
  snapshot_disagrees_with_event_log: {
    kicker: 'Snapshot disagrees',
    bySourceCode: {
      SNAPSHOT_DRIFT: "status.json differs from what the event log gives when it is replayed at the snapshot's own generation.",
      SNAPSHOT_DRIFT_PROVENANCE: 'Only provenance fields differ; the lanes agree.',
      SNAPSHOT_DRIFT_TERMINAL: 'The files differ and every work package is done.',
      CORRUPT_JSON: 'status.json could not be read as a JSON object.',
    },
  },
  // Never says which of the two files is missing (spec Gap 16). The explanation is keyed by the pair: bySourceCode, else a null code.
  snapshot_or_event_log_missing: {
    kicker: 'Status file missing',
    explanation: 'One of status.json and status.events.jsonl is missing. The event log is the record that decides.',
  },
  // Never names a branch (C-008).
  lane_branch_missing: {
    kicker: 'Lane branch missing',
    explanation: 'A lane or Mission branch the lane manifest relies on has no local branch. No branch is created or changed from this view.',
  },
};

export const AUTHORITY_WORDS: Readonly<Record<string, string>> = {
  event_log: "The Mission's status event log",
  git: 'Local git branches',
};

export const DERIVED_SIDE_WORDS: Readonly<Record<string, string>> = {
  status_json: 'status.json (the status snapshot)',
  lanes_json: 'lanes.json (the lane manifest)',
};

/** The command of a remedy, from the Mission slug. A remedy that is not a key has no command. */
export const REMEDY_COMMANDS: Readonly<Record<string, (slug: string) => string>> = {
  materialize_status: (slug) => `spec-kitty agent status materialize --mission ${slug}`,
};

export const NOT_PRESENT_WORD = 'not present';
export const LANE_TABLE_HEADERS = ['Work Package', 'status.json', 'Event log'] as const;
export const CORRUPT_JSON_NOTE = 'The snapshot is not a valid JSON object, so there are no lanes to compare.';
/** The sentence that replaces the lane table, by source code. */
export const LANE_NOTES: Readonly<Record<string, string>> = { CORRUPT_JSON: CORRUPT_JSON_NOTE };
export const UNKNOWN_MISSION_COMMAND_NOTE = 'This Mission was not found in the Missions list, so no command is shown.';

/** The labels of the finding detail: the panel eyebrows, the Facts rows, the region eyebrow and the table names (C-009: "status lane"). */
export const DRIFT_AUTHORITY_TITLE = 'Authoritative side';
export const DRIFT_FACTS_TITLE = 'Facts';
export const DRIFT_FACT_MISSION = 'Mission';
export const DRIFT_FACT_FILE = 'File';
export const DRIFT_FACT_DERIVED_SIDE = 'Derived side';
export const DRIFT_RESOLUTION_TITLE = 'Suggested resolution';
export const LANE_TABLE_LABEL = 'Status lane comparison';
/** The name of the table's scroller while it overflows: distinct from the table's own name. */
export const LANE_TABLE_SCROLLER_LABEL = 'Status lane comparison, scrollable';

export const COPY_LABEL = 'Copy';
/** The accessible name of Copy (A11Y-005): it says what is copied, and starts with the visible word (WCAG 2.5.3). */
export const COPY_ACCESSIBLE_LABEL = 'Copy command';
export const COPY_RESULT_TEXT: Readonly<Record<string, string>> = {
  copied: 'Copied',
  manual: 'Copy it with your keyboard: the command is selected.',
};
/** Shown instead of the `manual` words when the command could not be selected (the read-back differs): it never says it is selected. */
export const COPY_MANUAL_FALLBACK = 'Select the command and copy it with your keyboard.';

export const CLEAN_HEADING = 'No drift found';
// Never says everything is consistent (spec Gap 12): a legacy manifest is not evaluated.
export const CLEAN_BODY = 'The last scan found no disagreement between the status files and the event log, and no missing lane branch it could check.';
/** The truncation note; `count` is `findings.length`, never a literal of the contract's cap. */
export const TRUNCATION_TEXT = (count: number): string => `Showing the first ${count} findings.`;
export const CHOOSE_HEADING = 'Choose a finding';
export const STALE_SELECTION_NOTE = 'The selected finding is not in this scan.';

export const REFUSAL_WORDS: Readonly<Record<string, string>> = {
  drift_scan_unreadable: 'The scan could not read a Mission, so no report is shown.',
};
export const DRIFT_REFUSAL_GENERIC = 'The drift scan could not be loaded.';
export const DRIFT_RETRY_LABEL = 'Try again';
/** The accessible name of the finding listbox. */
export const FINDINGS_LIST_LABEL = 'Drift findings';

// Prefixed: NOT_FOUND_HEADING, NOT_FOUND_BODY and LOADING_LABEL already belong to the Work Package and Missions copy.
export const DRIFT_NOT_FOUND_HEADING = 'Mission not found';
export const DRIFT_NOT_FOUND_BODY = 'No Mission has this identity.';
export const RETURN_TO_MISSIONS_LABEL = 'Return to Missions';
export const DRIFT_LOADING_LABEL = 'Loading drift scan';

// Live-region announcements: one polite line each, the count printed as given.
// A report without a usable scan time is still announced (FR-026), without the last-scan clause.
export const READY_ANNOUNCEMENT = (count: number, lastScan: string | null): string =>
  lastScan === null ? `Drift scan loaded: ${FINDINGS_COUNT_TEXT(count)}` : `Drift scan loaded: ${FINDINGS_COUNT_TEXT(count)}, ${LAST_SCAN_TEXT(lastScan)}`;
/** Joins two announcement sentences said in one update; a sentence that already ends in . ! or ? needs no extra period. */
export const ANNOUNCEMENT_SEPARATOR = '. ';
export const RESCAN_UNCHANGED_ANNOUNCEMENT = 'Rescan complete: no changes';
export const RESCANNED_TEXT = (count: number, lastScan: string): string => `Rescanned: ${FINDINGS_COUNT_TEXT(count)}, ${LAST_SCAN_TEXT(lastScan)}`;
export const ERROR_ANNOUNCEMENT = (detail: string): string => `Drift scan unavailable. ${detail}`;
