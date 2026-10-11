import { OPS_MONTHS } from '../defaults/ops-copy.js';

// A strict RFC 3339 date-time: the date, `T`, the time with optional fractional seconds, `Z` or a numeric offset with a colon.
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;

const MINUTES_PER_DAY = 1440;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const LAST_YEAR = 9999;

const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const daysIn = (year: number, month: number): number => (month === 2 && isLeap(year) ? 29 : (DAYS_IN_MONTH[month - 1] as number));
const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/**
 * An RFC 3339 instant as `D Mon YYYY, HH:MM:SS UTC` (the prototype's form, seconds always shown), or null when it cannot be
 * read: a pattern mismatch, a field out of range (a leap-second `60` is not valid here), a day the calendar does not have
 * (29 February only in leap years), an offset of 24 hours or more, or an instant outside the years 0000 to 9999 once converted.
 * Plain integer arithmetic on the parsed numbers: no `Date`, no `Intl`, no clock. Fractional seconds are not printed (the
 * caller keeps the served string for `datetime`). The month names are the table given, the English defaults otherwise.
 */
export function formatUtcInstant(iso: string, months: readonly string[] = OPS_MONTHS): string | null {
  if (typeof iso !== 'string') return null;
  const match = INSTANT.exec(iso);
  if (match === null) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number) as [number, number, number, number, number, number];
  if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;

  let offsetMinutes = 0;
  if (match[7] !== undefined) {
    const offsetHour = Number(match[8]);
    const offsetMinute = Number(match[9]);
    if (offsetHour > 23 || offsetMinute > 59) return null;
    offsetMinutes = (match[7] === '-' ? -1 : 1) * (offsetHour * 60 + offsetMinute);
  }

  // Local time minus the offset is UTC. The offset is under a day, so the date moves by at most one day either way.
  let minutes = hour * 60 + minute - offsetMinutes;
  let shift = 0;
  if (minutes < 0) {
    minutes += MINUTES_PER_DAY;
    shift = -1;
  } else if (minutes >= MINUTES_PER_DAY) {
    minutes -= MINUTES_PER_DAY;
    shift = 1;
  }

  let utcYear = year;
  let utcMonth = month;
  let utcDay = day + shift;
  if (utcDay < 1) {
    utcMonth -= 1;
    if (utcMonth < 1) {
      utcMonth = 12;
      utcYear -= 1;
    }
    utcDay = daysIn(utcYear, utcMonth);
  } else if (utcDay > daysIn(utcYear, utcMonth)) {
    utcDay = 1;
    utcMonth += 1;
    if (utcMonth > 12) {
      utcMonth = 1;
      utcYear += 1;
    }
  }
  if (utcYear < 0 || utcYear > LAST_YEAR) return null;

  const name = months[utcMonth - 1];
  if (name === undefined) return null;
  const clock = `${pad((minutes - (minutes % 60)) / 60, 2)}:${pad(minutes % 60, 2)}:${pad(second, 2)}`;
  return `${utcDay} ${name} ${pad(utcYear, 4)}, ${clock} UTC`;
}
