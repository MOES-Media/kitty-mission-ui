// T008: the text helpers of the Ops parts, with the `labels.time` and `labels.copy` hooks.
import { describe, expect, it } from 'vitest';
import { OPS_COPY } from '../src/defaults/ops-copy.js';
import { lookAnnouncement, opsCopyText, opsCountLabel, opsEmptyText, opsErrorText, opsSkippedLabel, opsTimeText } from '../src/logic/ops-text.js';

describe('opsTimeText', () => {
  it('prints the UTC form and keeps the served string in datetime', () => {
    expect(opsTimeText('2026-10-05T14:20:00+02:00', null)).toEqual({ text: '5 Oct 2026, 12:20:00 UTC', datetime: '2026-10-05T14:20:00+02:00' });
  });

  it('an unparsable value is printed as given with no datetime', () => {
    expect(opsTimeText('2026-13-05T14:20:00Z', null)).toEqual({ text: '2026-13-05T14:20:00Z', datetime: null });
    expect(opsTimeText('', null)).toEqual({ text: '', datetime: null });
  });

  it('the time hook rewords the text; the instant stays in datetime', () => {
    const labels = { time: (iso: string) => `at ${iso}` };
    expect(opsTimeText('2026-10-05T14:20:00Z', labels)).toEqual({ text: 'at 2026-10-05T14:20:00Z', datetime: '2026-10-05T14:20:00Z' });
  });

  it('a hook that returns undefined falls back to the default text', () => {
    expect(opsTimeText('2026-10-05T14:20:00Z', { time: () => undefined })).toEqual({ text: '5 Oct 2026, 14:20:00 UTC', datetime: '2026-10-05T14:20:00Z' });
  });

  it('a hook on an unparsable value still rewords the text and draws no datetime', () => {
    expect(opsTimeText('soon', { time: () => 'later' })).toEqual({ text: 'later', datetime: null });
  });
});

describe('opsCopyText and the copy hook', () => {
  it('the default, then the hook, then the default again for undefined', () => {
    expect(opsCopyText('loadMore', null)).toBe('Load more');
    expect(opsCopyText('loadMore', { copy: (key) => (key === 'loadMore' ? 'More' : undefined) })).toBe('More');
    expect(opsCopyText('headerTitle', { copy: (key) => (key === 'loadMore' ? 'More' : undefined) })).toBe('Ops');
  });
});

describe('count and skipped texts through the hook', () => {
  it('opsCountLabel uses the defaults and the hooked template', () => {
    expect(opsCountLabel(50, 249, null)).toBe('50 of 249');
    expect(opsCountLabel(2, 2, null)).toBe('2 records');
    expect(opsCountLabel(1, 1, null)).toBe('1 record');
    expect(opsCountLabel(50, 249, { copy: (k) => (k === 'countOf' ? '{loaded}/{total}' : undefined) })).toBe('50/249');
    expect(opsCountLabel(2, 2, { copy: (k) => (k === 'countOf' ? '{loaded}/{total}' : undefined) })).toBe('2 records');
  });

  it('opsSkippedLabel: singular and plural, and the hook', () => {
    expect(opsSkippedLabel(1, null)).toBe('1 record in this project could not be read and is not shown.');
    expect(opsSkippedLabel(4, null)).toBe('4 records in this project could not be read and are not shown.');
    expect(opsSkippedLabel(4, { copy: (k) => (k === 'skippedMany' ? '{n} hidden' : undefined) })).toBe('4 hidden');
  });
});

describe('opsEmptyText: the headline is profile over plain; the skipped note is its own sentence, whenever records were skipped', () => {
  const SKIPPED5 = '5 records in this project could not be read and are not shown.';
  it('the heading is always the empty heading; the headline follows profile then plain, and each is a full sentence', () => {
    expect(opsEmptyText('p-1', 0, null)).toEqual({ heading: 'No invocation records', body: 'No records for this profile.', skipped: null });
    expect(opsEmptyText(null, 0, null)).toEqual({ heading: 'No invocation records', body: 'No invocation records are available for this project.', skipped: null });
    // an empty profile is no filter, like null; a space is a profile (nothing is trimmed)
    expect(opsEmptyText('', 0, null).body).toBe(OPS_COPY.emptyBody);
    expect(opsEmptyText(' ', 0, null).body).toBe(OPS_COPY.emptyProfile);
    expect(OPS_COPY.emptyProfile.endsWith('.')).toBe(true);
    expect(OPS_COPY.emptyBody.endsWith('.')).toBe(true);
  });

  it('whenever skippedCount is above 0 the skipped note is returned apart from the headline, so the count is never hidden (CP-1)', () => {
    expect(opsEmptyText('p-1', 5, null)).toEqual({ heading: 'No invocation records', body: 'No records for this profile.', skipped: SKIPPED5 });
    expect(opsEmptyText(null, 5, null)).toEqual({ heading: 'No invocation records', body: 'No invocation records are available for this project.', skipped: SKIPPED5 });
    expect(opsEmptyText(null, 1, null).skipped).toBe('1 record in this project could not be read and is not shown.');
    // positive control: with no skipped record the same inputs carry no count
    expect(opsEmptyText(null, 0, null).skipped).toBeNull();
  });

  it('the copy hook rewords each part', () => {
    const copy = (key: string): string | undefined => (key === 'emptyHeading' ? 'Nothing' : key === 'emptyProfile' ? 'None here' : undefined);
    expect(opsEmptyText('p-1', 0, { copy })).toEqual({ heading: 'Nothing', body: 'None here', skipped: null });
  });
});

describe('opsErrorText: message, then the code, then the generic body', () => {
  it('ops_unreadable and the generic fallback give the same words, by different routes', () => {
    expect(opsErrorText('ops_unreadable', '', null)).toBe(OPS_COPY.errorBody);
    expect(opsErrorText(null, '', null)).toBe(OPS_COPY.errorBody);
    expect(opsErrorText('never_seen', '', null)).toBe(OPS_COPY.errorBody);
  });

  it('a non-empty errorMessage wins over the code', () => {
    expect(opsErrorText('ops_unreadable', 'Host says no.', null)).toBe('Host says no.');
    expect(opsErrorText(null, 'Host says no.', null)).toBe('Host says no.');
  });

  it('the hooked error body replaces the default for the code and the fallback', () => {
    const labels = { copy: (k: string) => (k === 'errorBody' ? 'Nope.' : undefined) };
    expect(opsErrorText('ops_unreadable', '', labels)).toBe('Nope.');
    expect(opsErrorText(null, '', labels)).toBe('Nope.');
  });

  it('the lookup is observable through an injected table: a code with its own key shows that key, any other code the generic body', () => {
    const table = { ops_unreadable: 'errorHeading', ops_other: 'emptyBody' } as const;
    expect(opsErrorText('ops_unreadable', '', null, table)).toBe(OPS_COPY.errorHeading);
    expect(opsErrorText('ops_other', '', null, table)).toBe(OPS_COPY.emptyBody);
    // positive controls: an unknown code, a null code and the default table all give the generic body
    expect(opsErrorText('never_seen', '', null, table)).toBe(OPS_COPY.errorBody);
    expect(opsErrorText(null, '', null, table)).toBe(OPS_COPY.errorBody);
    expect(opsErrorText('ops_unreadable', '', null)).toBe(OPS_COPY.errorBody);
    // the hook rewords the key the table chose
    expect(opsErrorText('ops_unreadable', '', { copy: (k) => (k === 'errorHeading' ? 'Reworded' : undefined) }, table)).toBe('Reworded');
    // a message from the host still wins over the table
    expect(opsErrorText('ops_unreadable', 'Host says no.', null, table)).toBe('Host says no.');
  });

  it('inherited names are unknown codes', () => {
    expect(opsErrorText('constructor', '', null)).toBe(OPS_COPY.errorBody);
    expect(opsErrorText('__proto__', '', null)).toBe(OPS_COPY.errorBody);
  });
});

describe('lookAnnouncement: keyed on the (look, reason) pair', () => {
  const counts = { loaded: 50, total: 249, added: null };
  it('loading by status announces; loading by mismatch announces nothing', () => {
    expect(lookAnnouncement({ look: 'loading', reason: 'status' }, counts, null)).toBe('Loading invocation records');
    expect(lookAnnouncement({ look: 'loading', reason: 'mismatch' }, counts, null)).toBeNull();
  });

  it('ready announces the loaded count, or the rows added', () => {
    expect(lookAnnouncement({ look: 'ready', reason: 'ready' }, counts, null)).toBe('50 of 249 records loaded');
    expect(lookAnnouncement({ look: 'ready', reason: 'ready' }, { loaded: 100, total: 249, added: 50 }, null)).toBe('50 more records loaded');
    expect(lookAnnouncement({ look: 'ready', reason: 'ready' }, { loaded: 100, total: 249, added: 1 }, null)).toBe('1 more record loaded');
    expect(lookAnnouncement({ look: 'ready', reason: 'ready' }, { loaded: 1, total: 1, added: null }, null)).toBe('1 of 1 record loaded');
    expect(lookAnnouncement({ look: 'ready', reason: 'ready' }, { loaded: 100, total: 249, added: 50 }, { copy: (k) => (k === 'announceMore' ? 'plus {n}' : undefined) })).toBe('plus 50');
  });

  it('empty announces the empty heading for both reasons; error announces nothing', () => {
    expect(lookAnnouncement({ look: 'empty', reason: 'status' }, counts, null)).toBe('No invocation records');
    expect(lookAnnouncement({ look: 'empty', reason: 'empty-ready' }, counts, null)).toBe('No invocation records');
    expect(lookAnnouncement({ look: 'error', reason: 'status' }, counts, null)).toBeNull();
  });

  it('the copy hook rewords the loading and empty texts', () => {
    const labels = { copy: (k: string) => (k === 'announceLoading' ? 'Please wait' : k === 'emptyHeading' ? 'Empty' : undefined) };
    expect(lookAnnouncement({ look: 'loading', reason: 'status' }, counts, labels)).toBe('Please wait');
    expect(lookAnnouncement({ look: 'empty', reason: 'status' }, counts, labels)).toBe('Empty');
  });
});
