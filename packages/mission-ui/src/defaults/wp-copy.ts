// Copy of the Work Package screen that is not vocabulary: titles, row labels, markers, state copy, accessible names and
// announcements. This is the CP-1 copy list, PROVISIONAL until the operator confirms it: every string lives in this one
// file so an amendment is a one-file change. The count text and the subtask bar label are the Mission screens' own
// (LANE_COUNT_TEXT, SUBTASK_PROGRESS_TEXT in defaults/lanes.ts) and are imported, not repeated.

import { TARGET_BRANCH_LABEL } from './pipeline-copy.js';
import { DETAIL_LOADING_LABEL, DETAIL_REFUSAL_HEADING } from './refusals.js';

// Panel titles (the prototype's h2 text where it has one).
export const FACTS_TITLE = 'Facts';
export const ASSIGNMENT_TITLE = 'Assignment';
export const AUTHORED_TITLE = 'Authored recommendation';
export const FRONTMATTER_TITLE = 'Frontmatter';
export const OWNED_FILES_TITLE = 'Owned files';
export const HISTORY_TITLE = 'Lane history';
export const REVIEW_TITLE = 'Review cycles';
export const EVIDENCE_TITLE = 'Evidence chain';
export const DEPENDENCIES_TITLE = 'Dependency chain';
export const SUBTASKS_TITLE = 'Subtasks';
export const WORKSPACE_TITLE = 'Workspace environment';

// Facts rows.
export const LABEL_WORK_PACKAGE = 'Work Package';
export const LABEL_COMMITTED_STATE = 'Committed state';
export const LABEL_ACTOR = 'Actor';
// An alias: the word has one home, in `pipeline-copy.ts`.
export const LABEL_TARGET_BRANCH = TARGET_BRANCH_LABEL;
export const LABEL_PHASE = 'Phase';
export const LABEL_TASK_TYPE = 'Task type';
export const LABEL_TRACKER_REFS = 'Tracker refs';
export const LABEL_LAST_TRANSITION = 'Last transition';
export const LABEL_FORCED_TRANSITIONS = 'Forced transitions';
export const LABEL_STALENESS = 'Staleness';

// Assignment rows.
export const LABEL_IMPLEMENTER_OF_RECORD = 'Implementer of record';
export const LABEL_AGENT = 'Agent';
export const LABEL_ASSIGNEE = 'Assignee';
export const LABEL_ROLE = 'Role';
export const LABEL_PROFILE = 'Profile';
export const LABEL_VERSION = 'Version';
export const LABEL_MODEL = 'Model';
export const LABEL_PROVIDER = 'Provider';

// Workspace rows.
export const LABEL_CODE_LANE = 'Code lane';
export const LABEL_LANE_BRANCH = 'Lane branch';
export const LABEL_PLANNING_BRANCH = 'Planning branch';
export const LABEL_WORKTREE_PRESENT = 'Worktree present';

// Frontmatter rows.
export const LABEL_DEPENDENCIES = 'Dependencies';
export const LABEL_REQUIREMENT_REFS = 'Requirement refs';
export const LABEL_PRIORITY = 'Priority';
export const LABEL_EXECUTION_MODE = 'Execution mode';

// Review summary, override and cycle rows.
export const LABEL_LATEST_RESULT = 'Latest result';
export const LABEL_REVIEWER = 'Reviewer';
export const LABEL_REFERENCE = 'Reference';
export const LABEL_OVERRIDDEN_BY = 'Overridden by';
export const LABEL_OVERRIDDEN_AT = 'Overridden at';
export const LABEL_REASON = 'Reason';
export const LABEL_REVIEWED = 'Reviewed';
/** "Cycle N", the number printed as given. */
export const CYCLE_NUMBER_LABEL = (cycleNumber: number): string => `Cycle ${cycleNumber}`;

// Evidence-chain stage labels.
export const STAGE_MISSION = 'Mission';

// Markers and absent forms.
export const ABSENT_MARKER = 'not recorded';
export const CURRENT_MARKER = 'Current';
export const FORCED_WORD = 'forced';
export const YES_WORD = 'yes';
export const NO_WORD = 'no';

// Readiness: unsatisfied gives BLOCKED_TEXT; satisfied and ready gives SATISFIED_TEXT then READY_TEXT; satisfied but
// not ready (started or finished) gives SATISFIED_TEXT alone.
export const READY_TEXT = 'Ready to start';
export const BLOCKED_TEXT = 'Waiting on dependencies';
export const SATISFIED_TEXT = 'Dependencies satisfied';
export const UNSATISFIED_TEXT = 'Dependencies not satisfied';

export const NO_DEPENDENCIES_TEXT = 'No dependencies';
export const NO_SUBTASKS_TEXT = 'No subtasks';
export const NO_HISTORY_TEXT = 'No lane transitions recorded';

export const OPEN_SPEC_LABEL = 'Open spec.md';
export const OPEN_PROMPT_LABEL = 'Open prompt';
/** The visible text of an "Open review" control; its accessible name carries the cycle (`OPEN_REVIEW_LABEL`). */
export const OPEN_REVIEW_TEXT = 'Open review';

export const CANCELLED_NOTICE_HEADING = 'This Work Package was canceled';
/** Who wrote the cancellation reason. */
export const REASON_SOURCE_WORDS: Readonly<Record<string, string>> = {
  operator: 'recorded by an operator',
  synthetic: 'filled in by the tool',
};

// Whole-screen states.
export const NOTHING_SELECTED_EYEBROW = 'Mission';
export const NOTHING_SELECTED_HEADING = 'Choose a Work Package';
export const NOT_FOUND_HEADING = 'Task detail unavailable';
export const NOT_FOUND_BODY = 'This Work Package could not be found in the Mission.';
export const RETURN_TO_PIPELINE_LABEL = 'Return to Pipeline';
export const WP_LOADING_LABEL = 'Loading Work Package';
export const WP_ERROR_HEADING = 'Work Package unavailable';
export const WP_ERROR_BODY = 'The Work Package could not be read. Nothing is shown.';
export const WP_EMPTY_HEADING = 'No Work Package to show';
export const WP_EMPTY_BODY = 'No Work Package record was provided.';

// Accessible names.
// The breadcrumb's name is the Mission screens' BREADCRUMB_LABEL (defaults/pipeline-copy.ts), imported where needed.
/** The name of a dependency-chain control: id, title (the id when there is none) and lane word. */
export const dependencyNodeLabel = (wpId: string, title: string | null, laneWord: string): string => `${wpId}, ${title ?? wpId}, ${laneWord}`;

// Live-region announcements: one polite line each, the id printed as given.
export const announceLoading = (wpId: string): string => `Loading Work Package ${wpId}`;
export const announceLoaded = (wpId: string): string => `Work Package ${wpId} loaded`;
export const announceNotFound = (wpId: string): string => `Work Package ${wpId} not found`;
// Aliases: the two words have one home each, in `refusals.ts` (the notice's own words).
export const ANNOUNCE_DETAIL_LOADING = DETAIL_LOADING_LABEL;
export const ANNOUNCE_DETAIL_LOADED = 'Work Package detail loaded';
export const ANNOUNCE_DETAIL_UNAVAILABLE = DETAIL_REFUSAL_HEADING;
// A Work Package that arrives together with a refused detail: one line, so the refusal is not lost behind "loaded".
export const announceLoadedDetailUnavailable = (wpId: string): string => `${announceLoaded(wpId)}. ${ANNOUNCE_DETAIL_UNAVAILABLE}`;
