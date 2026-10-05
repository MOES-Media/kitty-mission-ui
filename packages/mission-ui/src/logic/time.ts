import { JUST_NOW_TEXT, NO_ACTIVITY_TEXT, YESTERDAY_TEXT, agoText } from '../defaults/index.js';
import type { LabelHooks } from './types.js';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Relative time from two instants: under a minute (or in the future) just now, then minutes, hours, yesterday, days,
 * weeks, months (30 days), years. Unparsable input is returned unchanged.
 */
export function relativeTime(iso: string, now: string): string {
  const then = Date.parse(iso);
  const at = Date.parse(now);
  if (Number.isNaN(then) || Number.isNaN(at)) return iso;
  const delta = at - then;
  if (delta < MINUTE) return JUST_NOW_TEXT;
  if (delta < HOUR) return agoText(Math.floor(delta / MINUTE), 'minute');
  if (delta < DAY) return agoText(Math.floor(delta / HOUR), 'hour');
  if (delta < 2 * DAY) return YESTERDAY_TEXT;
  if (delta < 14 * DAY) return agoText(Math.floor(delta / DAY), 'day');
  if (delta < 56 * DAY) return agoText(Math.floor(delta / (7 * DAY)), 'week');
  if (delta < YEAR) return agoText(Math.floor(delta / MONTH), 'month');
  return agoText(Math.floor(delta / YEAR), 'year');
}

/** null: "no activity"; else the time hook; else relative to `now`; else the ISO string as given. */
export function resolveActivity(iso: string | null, now: string | null, hooks: LabelHooks | null): string {
  if (iso === null) return NO_ACTIVITY_TEXT;
  return hooks?.time?.(iso, now) ?? (now === null ? iso : relativeTime(iso, now));
}
