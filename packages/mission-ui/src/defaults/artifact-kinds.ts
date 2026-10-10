// Artifact kind vocabulary of the Artifact Viewer (provisional until CP-1). The kind table is the only place the twelve
// kind words are written; the `data-driven` gate reads them from the vendored schema and reports them anywhere else.
import type { ArtifactKind } from '../contract/types.js';
import type { ShellIcon } from '../shell-types.js';
import { REVIEW_CYCLE_ARTIFACT_KIND } from './review.js';

export { REVIEW_CYCLE_ARTIFACT_KIND };

/** The word and the glyph of one artifact kind. */
export interface ArtifactKindWord {
  label: string;
  icon: ShellIcon;
}

/**
 * Keyed by the generated `ArtifactKind` union, so a thirteenth contract value fails type-check here and nowhere else.
 * The prototype draws a no-fold glyph for the plan and the task list; whether that is intended is a CP-1 question, and
 * this table makes either answer a data change.
 */
export const ARTIFACT_KIND_WORDS: Readonly<Record<ArtifactKind, ArtifactKindWord>> = {
  spec: { label: 'Specification', icon: 'file' },
  plan: { label: 'Plan', icon: 'file' },
  tasks: { label: 'Tasks', icon: 'file' },
  data_model: { label: 'Data model', icon: 'table' },
  quickstart: { label: 'Quickstart', icon: 'file' },
  analysis_report: { label: 'Analysis report', icon: 'file' },
  research: { label: 'Research', icon: 'magnifier' },
  contract: { label: 'Contract', icon: 'file' },
  checklist: { label: 'Checklist', icon: 'file' },
  work_package_prompt: { label: 'Work Package prompt', icon: 'file' },
  review_cycle: { label: 'Review cycle', icon: 'file' },
  other: { label: 'File', icon: 'file' },
};

/** The neutral glyph of a kind that is not a key of the table. */
export const UNKNOWN_KIND_ICON: ShellIcon = 'file';

/** The kind of a Work Package prompt file; the one home of the literal. */
export const WORK_PACKAGE_PROMPT_ARTIFACT_KIND: ArtifactKind = 'work_package_prompt';

/** The kinds that get "Open Work Package" and a derived linked Work Package. */
export const WORK_PACKAGE_LINK_KINDS: readonly string[] = [WORK_PACKAGE_PROMPT_ARTIFACT_KIND, REVIEW_CYCLE_ARTIFACT_KIND];

/** The path segment under which Work Package files live. */
export const WP_CONTAINER_SEGMENT = 'tasks';

/** The separator after an id in the name of a Work Package file or folder. */
export const TOKEN_SEPARATOR = '-';

/** The one separator of listing paths. */
export const PATH_SEPARATOR = '/';

/** The prefix of a leaf node id, the folder prefix (a second one, so a folder id never equals a leaf id) and the default leaf `href`. */
export const TREE_ID_PREFIX = 'artifact:';
export const TREE_FOLDER_ID_PREFIX = 'artifact-folder:';
export const ARTIFACT_HREF_PREFIX = '#artifact/';
