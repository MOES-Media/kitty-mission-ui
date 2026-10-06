import { CHANGE_STATE_BADGES, UNKNOWN_CHANGE_STATE } from '../defaults/index.js';
import { lookup } from './lookup.js';
import type { StateBadge } from './types.js';

/** One owned file as the screen reads it: the detail's form, or the bare degradation (state null). */
export interface ResolvedFile {
  pattern: string;
  isGlob: boolean;
  changeState: string | null;
}

export interface FileRowView {
  pattern: string;
  isGlob: boolean;
  badge: StateBadge | null;
}

export interface FilesView {
  allUnknown: boolean;
  rows: FileRowView[];
}

/** null gives null (no badge); the table, then the raw state in a neutral badge. */
export function resolveChangeState(state: string | null): StateBadge | null {
  if (state === null) return null;
  return lookup(CHANGE_STATE_BADGES, state) ?? { label: state, tone: 'neutral' };
}

/**
 * Rows in input order. When the list is non-empty and every state is the unknown key, `allUnknown` is true and the row
 * badges are suppressed (the part draws one note instead); a single unknown among others, or a foreign state, is shown.
 */
export function filesView(files: ResolvedFile[]): FilesView {
  const allUnknown = files.length > 0 && files.every((f) => f.changeState === UNKNOWN_CHANGE_STATE);
  const rows = files.map((f) => ({
    pattern: f.pattern,
    isGlob: f.isGlob,
    badge: allUnknown ? null : resolveChangeState(f.changeState),
  }));
  return { allUnknown, rows };
}
