// English copy of the Artifact Viewer (provisional until CP-1). Every string of the screen is written here; a string a
// host wants to change goes through the `labels` hooks, not through the vocabulary.

// Tabs.
export const TAB_RENDERED = 'Rendered';
export const TAB_RAW = 'Raw';
export const TAB_FALLBACK = 'Fallback';
export const TABLIST_LABEL = 'View';

// Notices.
export const FALLBACK_NOTICE = 'The rendered view could not be built, so the escaped source is shown.';
export const READ_ONLY_NOTE = 'Read-only. Nothing here can be edited.';
export const REDACTION_LINE = 'Host paths and e-mail addresses are replaced.';
/** The contract's listing cap; defined here and nowhere else (`logic/` and the fixtures import it). */
export const LISTING_MAX_ENTRIES = 1000;
export const TRUNCATED_NOTE = `Showing the first ${LISTING_MAX_ENTRIES} artifacts`;

// States.
export const EMPTY_FILE_TEXT = 'This file is empty.';
export const NOTHING_SELECTED_TEXT = 'Choose an artifact';
export const EMPTY_LISTING_TEXT = 'No artifacts';
export const NOT_FOUND_TITLE = 'Mission not found';
export const NOT_FOUND_TEXT = 'This Mission could not be found.';
export const RETURN_LABEL = 'Return to Pipeline';
export const RETRY_LABEL = 'Retry';
export const LISTING_LOADING_TEXT = 'Loading artifacts';

// Inspector. (The label is ARTIFACT_INSPECTOR_LABEL: INSPECTOR_LABEL is the Pipeline screen's word in the same index.)
export const ARTIFACT_INSPECTOR_LABEL = 'Artifact metadata';
export const FILE_GROUP = 'File';
export const MISSION_GROUP = 'Mission';
export const FACT_KIND = 'Kind';
export const FACT_MEDIA_TYPE = 'Media type';
export const FACT_SIZE = 'Size';
export const FACT_MODIFIED = 'Modified on this host';
export const FACT_PATH = 'Path';
export const FACT_REDACTED = 'Redacted';
export const YES_TEXT = 'Yes';
export const NO_TEXT = 'No';
export const MISSION_FACT_MISSION = 'Mission';
export const MISSION_FACT_TYPE = 'Type';
export const MISSION_FACT_TOPOLOGY = 'Topology';
export const MISSION_FACT_TARGET = 'Target';
export const MISSION_FACT_STATUS = 'Status';
export const LINKED_WP_TITLE = 'Linked Work Packages';
/** The accessible name of an "Open Work Package" control carries the id. */
export const OPEN_WP_LABEL = (wpId: string): string => `Open Work Package ${wpId}`;
/** The tree `meta` of a leaf the host could not read. */
export const UNAVAILABLE_TEXT = 'unavailable';

// Names.
/** The static positional name of a table scroll box that is a tab stop: integers only, no document text. */
export const TABLE_LABEL = (index: number, total: number): string => `Table ${index} of ${total}`;
/** The quiet notice of a raw or fallback source block that holds bidirectional control characters. */
export const BIDI_NOTICE = (count: number): string => `Contains ${count} bidirectional control ${count === 1 ? 'character' : 'characters'}`;
/** The accessible name of the pane, distinct from the toolbar's file name. */
export const DOCUMENT_LABEL = (name: string): string => `Document: ${name}`;
/** The name of a block that holds a raw-only file. */
export const SOURCE_LABEL = 'File source';
export const FILE_NAME_LABEL = (name: string): string => `File: ${name}`;

// Announcements: they name what is shown.
export const announceListingLoaded = (count: number): string => `${count} ${count === 1 ? 'artifact' : 'artifacts'} loaded`;
export const announceContentLoading = (name: string): string => `Loading ${name}`;
export const announceContentLoaded = (name: string): string => `${name} loaded`;
export const announceUnavailable = (name: string, cause: string): string => `${name} unavailable: ${cause}`;
export const ANNOUNCE_LISTING_LOADING = 'Loading artifacts';
export const ANNOUNCE_LISTING_ERROR = 'The list of artifacts could not be loaded';

/** Size units, smallest first: the one home of the unit words and of the step between them. */
export const SIZE_UNITS: ReadonlyArray<{ unit: string; bytes: number }> = [
  { unit: 'KiB', bytes: 1024 },
  { unit: 'MiB', bytes: 1048576 },
];
/** The word of a size below the first unit. */
export const SIZE_BYTE_UNIT = 'B';
