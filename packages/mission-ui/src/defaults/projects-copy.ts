// Projects screen and open-project dialog copy that is not vocabulary (provisional until CP-1), the counterpart of missions-copy.ts.

export const PROJECTS_EYEBROW = 'Local workspace';
export const PROJECTS_TITLE = 'Open a spec-kitty project';
export const PROJECTS_INTRO = 'Choose a recent project or open a folder from this machine. Navigation appears after a project is selected.';
export const OPEN_PROJECT_LABEL = 'Open project';
export const RECENT_PROJECTS_EYEBROW = 'Recent projects';
/** "<n> project(s)" for the toolbar; the count is the number of entries the host gave, equality only. */
export const projectCountText = (count: number): string => (count === 1 ? '1 project' : `${count} projects`);

export const VERSION_PREFIX = 'v';
/** For assistive technology only (Q4): the schema version is never drawn and never a verdict. */
export const schemaVersionText = (version: number): string => `schema version ${version}`;
export const LOCAL_ONLY_TEXT = 'local only';
/** The row's activity text is this word, a space, then the activity; the no-activity text stands alone. */
export const ACTIVE_PREFIX = 'active';

export const ENTRY_LOADING_TEXT = 'Reading this project';
export const ENTRY_ERROR_TEXT = 'Could not read this project';
export const ENTRY_UNAVAILABLE_TEXT = 'This project is not available';
export const ENTRY_RETRY_LABEL = 'Try again';
export const UNNAMED_PROJECT_TEXT = 'Project';

export const LIST_LOADING_TEXT = 'Reading recent projects';
export const LIST_EMPTY_TITLE = 'No recent projects';
export const LIST_EMPTY_BODY = 'The host has not provided a recent project. Open a folder to start.';
export const LIST_ERROR_BODY = 'The recent projects could not be read. No projects are shown.';

export const READ_ONLY_NOTICE = 'This release is a read-only view. Kitty Desktop never changes the selected project.';
export const SKIP_LINK_TEXT = 'Skip to Projects';

export const DIALOG_EYEBROW = 'Local filesystem';
export const DIALOG_TITLE = 'Open Project';
export const FOLDER_FIELD_LABEL = 'Project folder';
export const FOLDER_LIST_LABEL = 'Folders';
export const PARENT_FOLDER_TEXT = 'Parent folder';
export const VALID_PROJECT_TEXT = 'valid project';
export const DIALOG_HINT = 'A valid project contains .kittify/ and kitty-specs/. It will be opened read-only.';
export const CANCEL_LABEL = 'Cancel';
export const CONFIRM_LABEL = 'Open';
export const CLOSE_LABEL = 'Close dialog';
export const OPEN_DISABLED_REASON = 'Select a folder that is a valid project';
export const FOLDERS_LOADING_TEXT = 'Reading folders';
export const FOLDERS_EMPTY_TEXT = 'This folder contains no folders';
export const FOLDERS_ERROR_BODY = 'The folders could not be read. None are shown.';
