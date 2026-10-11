// T008: formatUtcInstant (plan D-04). Integer arithmetic on the parsed fields, no Date, no Intl; any failure is null.
import { afterAll, describe, expect, it } from 'vitest';
import { formatUtcInstant } from '../src/logic/ops-time.js';

describe('formatUtcInstant: the printed form', () => {
  const cases: Array<[string, string, string]> = [
    ['Z', '2026-08-22T09:29:46Z', '22 Aug 2026, 09:29:46 UTC'],
    ['lowercase t and z', '2026-08-22t09:29:46z', '22 Aug 2026, 09:29:46 UTC'],
    ['a day under ten is not padded', '2026-10-05T14:20:00Z', '5 Oct 2026, 14:20:00 UTC'],
    ['+02:00 moves two hours back', '2026-10-05T14:20:00+02:00', '5 Oct 2026, 12:20:00 UTC'],
    ['-05:30 moves five and a half hours forward', '2026-10-05T14:20:00-05:30', '5 Oct 2026, 19:50:00 UTC'],
    ['+00:00 and -00:00 are UTC', '2026-10-05T14:20:00+00:00', '5 Oct 2026, 14:20:00 UTC'],
    ['fractional seconds are dropped from the text', '2026-08-22T09:29:46.908897+00:00', '22 Aug 2026, 09:29:46 UTC'],
    ['one fractional digit', '2026-08-22T09:29:46.9Z', '22 Aug 2026, 09:29:46 UTC'],
    ['year padded to four digits', '0099-01-02T03:04:05Z', '2 Jan 0099, 03:04:05 UTC'],
    ['the last second of the day', '2026-10-05T23:59:59Z', '5 Oct 2026, 23:59:59 UTC'],
  ];

  it('has the expected number of cases', () => {
    expect(cases.length).toBe(10);
  });

  for (const [name, iso, want] of cases) {
    it(`${name}: ${iso}`, () => {
      expect(formatUtcInstant(iso)).toBe(want);
    });
  }
});

describe('formatUtcInstant: rollover by the offset', () => {
  const cases: Array<[string, string, string]> = [
    ['midnight rollover back across a day', '2026-10-05T01:30:00+02:00', '4 Oct 2026, 23:30:00 UTC'],
    ['midnight rollover forward across a day', '2026-10-05T22:30:00-03:00', '6 Oct 2026, 01:30:00 UTC'],
    ['back across a month', '2026-10-01T00:30:00+01:00', '30 Sep 2026, 23:30:00 UTC'],
    ['forward across a month (31 days)', '2026-10-31T23:00:00-02:00', '1 Nov 2026, 01:00:00 UTC'],
    ['forward across a 30-day month', '2026-04-30T23:00:00-02:00', '1 May 2026, 01:00:00 UTC'],
    ['back across a year', '2026-01-01T00:30:00+01:00', '31 Dec 2025, 23:30:00 UTC'],
    ['forward across a year', '2025-12-31T23:30:00-01:00', '1 Jan 2026, 00:30:00 UTC'],
    ['forward into 29 February of a leap year', '2024-02-28T23:30:00-01:00', '29 Feb 2024, 00:30:00 UTC'],
    ['forward past 29 February of a leap year', '2024-02-29T23:30:00-01:00', '1 Mar 2024, 00:30:00 UTC'],
    ['forward past 28 February of a common year', '2025-02-28T23:30:00-01:00', '1 Mar 2025, 00:30:00 UTC'],
    ['back from 1 March of a leap year', '2024-03-01T00:30:00+01:00', '29 Feb 2024, 23:30:00 UTC'],
    ['back from 1 March of a common year', '2025-03-01T00:30:00+01:00', '28 Feb 2025, 23:30:00 UTC'],
    ['the widest offsets, +23:59', '2026-10-05T00:00:00+23:59', '4 Oct 2026, 00:01:00 UTC'],
    ['the widest offsets, -23:59', '2026-10-05T23:59:59-23:59', '6 Oct 2026, 23:58:59 UTC'],
    ['an offset with minutes keeps the seconds', '2026-10-05T10:00:07+05:45', '5 Oct 2026, 04:15:07 UTC'],
    ['century leap rule: 1900 is not a leap year', '1900-02-28T23:30:00-01:00', '1 Mar 1900, 00:30:00 UTC'],
    ['century leap rule: 2000 is a leap year', '2000-02-28T23:30:00-01:00', '29 Feb 2000, 00:30:00 UTC'],
    ['an offset landing exactly on 24:00 rolls over to 00:00 of the next day', '2026-02-28T23:30:00-00:30', '1 Mar 2026, 00:00:00 UTC'],
    ['an offset landing exactly on 24:00 carries into the next year', '2026-12-31T23:30:00-00:30', '1 Jan 2027, 00:00:00 UTC'],
    ['an offset landing exactly on 00:00 stays on the day', '2026-10-05T00:30:00+00:30', '5 Oct 2026, 00:00:00 UTC'],
  ];

  it('has the expected number of cases', () => {
    expect(cases.length).toBe(20);
  });

  for (const [name, iso, want] of cases) {
    it(`${name}: ${iso}`, () => {
      expect(formatUtcInstant(iso)).toBe(want);
    });
  }
});

describe('formatUtcInstant: calendar validity (29 February)', () => {
  it('accepts 29 February of leap years (4, not 100, or 400) and refuses it otherwise', () => {
    const cases: Array<[string, boolean]> = [
      ['2024-02-29T00:00:00Z', true],
      ['2000-02-29T00:00:00Z', true],
      ['2025-02-29T00:00:00Z', false],
      ['1900-02-29T00:00:00Z', false],
      ['2100-02-29T00:00:00Z', false],
    ];
    for (const [iso, valid] of cases) expect(formatUtcInstant(iso) !== null, iso).toBe(valid);
    expect(cases.length).toBe(5);
  });

  it('refuses day 0, day 32 and the 31st of a 30-day month; accepts the 31st of a 31-day month', () => {
    const cases: Array<[string, boolean]> = [
      ['2026-01-00T00:00:00Z', false],
      ['2026-01-32T00:00:00Z', false],
      ['2026-04-31T00:00:00Z', false],
      ['2026-06-31T00:00:00Z', false],
      ['2026-09-31T00:00:00Z', false],
      ['2026-11-31T00:00:00Z', false],
      ['2026-01-31T00:00:00Z', true],
      ['2026-12-31T00:00:00Z', true],
      ['2026-04-30T00:00:00Z', true],
    ];
    for (const [iso, valid] of cases) expect(formatUtcInstant(iso) !== null, iso).toBe(valid);
    expect(cases.length).toBe(9);
  });

  it('refuses month 0 and month 13', () => {
    expect(formatUtcInstant('2026-00-10T00:00:00Z')).toBeNull();
    expect(formatUtcInstant('2026-13-10T00:00:00Z')).toBeNull();
    expect(formatUtcInstant('2026-12-10T00:00:00Z')).not.toBeNull();
    expect(formatUtcInstant('2026-01-10T00:00:00Z')).not.toBeNull();
  });

  it('refuses month 0 even when a backward offset would carry it into the previous year', () => {
    expect(formatUtcInstant('2026-00-01T00:30:00+01:00')).toBeNull();
    expect(formatUtcInstant('2026-00-01T00:30:00Z')).toBeNull();
    // positive control: month 01 with the same offset is read and carries into December
    expect(formatUtcInstant('2026-01-01T00:30:00+01:00')).toBe('31 Dec 2025, 23:30:00 UTC');
  });
});

describe('formatUtcInstant: range checks and invalid strings return null', () => {
  const invalid: Array<[string, unknown]> = [
    ['leap second 60', '2026-06-30T23:59:60Z'],
    ['second 61', '2026-06-30T23:59:61Z'],
    ['hour 24', '2026-10-05T24:00:00Z'],
    ['minute 60', '2026-10-05T10:60:00Z'],
    ['offset +24:00', '2026-10-05T10:00:00+24:00'],
    ['offset -24:00', '2026-10-05T10:00:00-24:00'],
    ['offset minutes 60', '2026-10-05T10:00:00+01:60'],
    ['a trailing space', '2026-10-05T10:00:00Z '],
    ['a leading space', ' 2026-10-05T10:00:00Z'],
    ['a trailing newline', '2026-10-05T10:00:00Z\n'],
    ['an empty string', ''],
    ['a date only', '2026-10-05'],
    ['a space instead of T', '2026-10-05 10:00:00Z'],
    ['no offset', '2026-10-05T10:00:00'],
    ['an offset without a colon', '2026-10-05T10:00:00+0200'],
    ['a two-digit year', '26-10-05T10:00:00Z'],
    ['a five-digit year', '12026-10-05T10:00:00Z'],
    ['a fraction with no digits', '2026-10-05T10:00:00.Z'],
    ['words', 'not a time'],
    ['a number cast to a string', 1_760_000_000_000],
    ['null cast', null],
    ['undefined cast', undefined],
    ['an object cast', {}],
    ['before year 0000 after the offset', '0000-01-01T00:00:00+01:00'],
    ['after year 9999 after the offset', '9999-12-31T23:59:59-01:00'],
  ];

  it('has the expected number of cases', () => {
    expect(invalid.length).toBe(25);
  });

  let ran = 0;
  for (const [name, value] of invalid) {
    it(`${name} is null`, () => {
      expect(formatUtcInstant(value as string)).toBeNull();
      ran += 1;
    });
  }

  afterAll(() => {
    expect(ran).toBe(invalid.length);
  });

  it('the edges of the valid ranges are accepted (positive controls for the refusals above)', () => {
    expect(formatUtcInstant('2026-06-30T23:59:59Z')).toBe('30 Jun 2026, 23:59:59 UTC');
    expect(formatUtcInstant('2026-10-05T00:00:00Z')).toBe('5 Oct 2026, 00:00:00 UTC');
    expect(formatUtcInstant('2026-10-05T10:59:00Z')).toBe('5 Oct 2026, 10:59:00 UTC');
    expect(formatUtcInstant('2026-10-05T10:00:00+23:59')).toBe('4 Oct 2026, 10:01:00 UTC');
    expect(formatUtcInstant('2026-10-05T10:00:00+01:59')).toBe('5 Oct 2026, 08:01:00 UTC');
    expect(formatUtcInstant('0000-01-01T00:00:00Z')).toBe('1 Jan 0000, 00:00:00 UTC');
    expect(formatUtcInstant('9999-12-31T23:59:59Z')).toBe('31 Dec 9999, 23:59:59 UTC');
  });
});

describe('formatUtcInstant: month names come from the argument', () => {
  it('prints the month of the given table', () => {
    const upper = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    expect(formatUtcInstant('2026-03-04T05:06:07Z', upper)).toBe('4 MAR 2026, 05:06:07 UTC');
    expect(formatUtcInstant('2026-12-04T05:06:07Z', upper)).toBe('4 DEC 2026, 05:06:07 UTC');
    expect(formatUtcInstant('2026-01-04T05:06:07Z', upper)).toBe('4 JAN 2026, 05:06:07 UTC');
  });
});
