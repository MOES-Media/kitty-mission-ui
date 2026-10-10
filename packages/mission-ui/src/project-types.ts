// Host wrapper types of the Projects screen and the open-project dialog (data-model.md). Plain TypeScript, no I/O.
// The contract type `Project` is the generated one and is never redeclared; no health word appears here (data-driven gate).
import type { ProjectView } from './contract/types.js';
import type { LabelHooks, StateBadge } from './logic/types.js';

/** What an entry without a `Project` shows. */
export type ProjectEntryState = 'loading' | 'error' | 'unavailable';

/** One recent project as the host hands it over. `key` is the host's stable identity and the only one an event carries. */
export interface ProjectEntry {
  key: string;
  /** Opaque display text; never parsed. */
  location: string;
  /** Display name for an entry without a `project` (proposal P-3, binding after CP-1). */
  name?: string;
  localOnly?: boolean;
  /** False renders a plain row. Default true. */
  openable?: boolean;
  /** Present only when the read succeeded; the contract `Project`, widened so a foreign health value survives. */
  project?: ProjectView;
  /** Wins over `project` when set. */
  state?: ProjectEntryState;
}

export type FolderKind = 'parent' | 'folder';

/** One folder of the open-project dialog's listing. */
export interface FolderEntry {
  name: string;
  /** The host's opaque id of the folder; the payload of browse and confirm. */
  location: string;
  kind: FolderKind;
  /** The host's valid-project test. */
  valid: boolean;
}

/** Optional label hooks (proposal P-2, binding after CP-1): the shared `time` hook and a health badge hook. */
export interface ProjectLabelHooks extends Pick<LabelHooks, 'time'> {
  /** Consulted before the default table; undefined falls through. */
  health?(value: string): StateBadge | undefined;
}
