import { describe, expect, it } from 'vitest';
import { NO_ACTIVITY_TEXT } from '../src/defaults/index.js';
import { relativeTime, resolveActivity } from '../src/logic/time.js';

const NOW = '2026-10-03T12:00:00Z';
const ago = (ms: number): string => new Date(Date.parse(NOW) - ms).toISOString();
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('relativeTime thresholds', () => {
  const cases: Array<[string, number, string]> = [
    ['no difference', 0, 'just now'],
    ['59 seconds', 59 * SEC, 'just now'],
    ['60 seconds', 60 * SEC, '1 minute ago'],
    ['2 minutes', 2 * MIN, '2 minutes ago'],
    ['59 minutes', 59 * MIN, '59 minutes ago'],
    ['60 minutes', 60 * MIN, '1 hour ago'],
    ['3 hours', 3 * HOUR, '3 hours ago'],
    ['23 hours', 23 * HOUR, '23 hours ago'],
    ['24 hours', 24 * HOUR, 'yesterday'],
    ['47 hours', 47 * HOUR, 'yesterday'],
    ['48 hours', 48 * HOUR, '2 days ago'],
    ['13 days', 13 * DAY, '13 days ago'],
    ['14 days', 14 * DAY, '2 weeks ago'],
    ['55 days', 55 * DAY, '7 weeks ago'],
    ['56 days', 56 * DAY, '1 month ago'],
    ['364 days', 364 * DAY, '12 months ago'],
    ['365 days', 365 * DAY, '1 year ago'],
    ['800 days', 800 * DAY, '2 years ago'],
  ];

  it('has the expected number of threshold cases', () => {
    expect(cases.length).toBe(18);
  });

  for (const [name, ms, want] of cases) {
    it(`${name} gives "${want}"`, () => {
      expect(relativeTime(ago(ms), NOW)).toBe(want);
    });
  }

  // F-01 (wrap-up fold): between two thresholds the count is FLOORED, never rounded to the nearer unit.
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;
  const floored: Array<[string, number, string]> = [
    ['1 minute 59 seconds', MIN + 59 * SEC, '1 minute ago'],
    ['2 minutes 30 seconds', 2 * MIN + 30 * SEC, '2 minutes ago'],
    ['1 hour 59 minutes', HOUR + 59 * MIN, '1 hour ago'],
    ['2 hours 30 minutes', 2 * HOUR + 30 * MIN, '2 hours ago'],
    ['2 days 23 hours', 2 * DAY + 23 * HOUR, '2 days ago'],
    ['2.5 days', 2 * DAY + 12 * HOUR, '2 days ago'],
    ['20 days (2.86 weeks)', 20 * DAY, '2 weeks ago'],
    ['89 days (2.97 months)', 89 * DAY, '2 months ago'],
    ['2 years less a day', 2 * YEAR - DAY, '1 year ago'],
    ['1.5 years', YEAR + YEAR / 2, '1 year ago'],
  ];
  for (const [name, ms, want] of floored) {
    it(`floors, not rounds: ${name} gives "${want}"`, () => {
      expect(relativeTime(ago(ms), NOW)).toBe(want);
    });
  }
  it('has the expected number of floor cases and a month is 30 days', () => {
    expect(floored.length).toBe(10);
    expect(relativeTime(ago(MONTH + DAY), NOW)).toBe('4 weeks ago');
    expect(relativeTime(ago(2 * MONTH), NOW)).toBe('2 months ago');
  });

  it('a time in the future is just now', () => {
    expect(relativeTime(new Date(Date.parse(NOW) + 5 * HOUR).toISOString(), NOW)).toBe('just now');
  });

  it('returns unparsable input unchanged (positive control: a parsable one is rewritten)', () => {
    expect(relativeTime('not a time', NOW)).toBe('not a time');
    expect(relativeTime('', NOW)).toBe('');
    expect(relativeTime(ago(2 * HOUR), 'not a time')).toBe(ago(2 * HOUR));
    expect(relativeTime(ago(2 * HOUR), NOW)).toBe('2 hours ago');
  });

  it('is a function of the two arguments alone: the same pair gives the same text, a later now gives a later text', () => {
    const then = ago(HOUR);
    expect(relativeTime(then, NOW)).toBe(relativeTime(then, NOW));
    expect(relativeTime(then, new Date(Date.parse(NOW) + 2 * HOUR).toISOString())).toBe('3 hours ago');
  });
});

describe('resolveActivity', () => {
  const then = ago(2 * HOUR);

  it('null is the no-activity text, even when a hook exists', () => {
    expect(resolveActivity(null, NOW, null)).toBe(NO_ACTIVITY_TEXT);
    expect(resolveActivity(null, NOW, { time: () => 'hook' })).toBe(NO_ACTIVITY_TEXT);
  });

  it('the hook wins over the default when it returns a string', () => {
    const seen: Array<[string, string | null]> = [];
    const text = resolveActivity(then, NOW, { time: (iso, now) => (seen.push([iso, now]), `at ${iso}`) });
    expect(text).toBe(`at ${then}`);
    expect(seen).toEqual([[then, NOW]]);
  });

  it('a hook that returns undefined falls through to the relative time', () => {
    expect(resolveActivity(then, NOW, { time: () => undefined })).toBe('2 hours ago');
    expect(resolveActivity(then, NOW, {})).toBe('2 hours ago');
    expect(resolveActivity(then, NOW, null)).toBe('2 hours ago');
  });

  it('without now the ISO string is shown as given', () => {
    expect(resolveActivity(then, null, null)).toBe(then);
    expect(resolveActivity(then, null, { time: () => undefined })).toBe(then);
  });
});
