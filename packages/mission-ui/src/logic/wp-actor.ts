import type { Actor } from '../contract/types.js';

/** The non-null handles of tool, role and profile, in that order, joined by a colon; null when there are none. */
export function joinHandles(actor: Actor | null): string | null {
  if (actor === null) return null;
  const handles = [actor.tool, actor.role, actor.profile].filter((h): h is string => typeof h === 'string');
  return handles.length === 0 ? null : handles.join(':');
}
