import { describe, expect, it } from 'vitest';
import { NO_VERDICT_TEXT, VERDICT_BADGES } from '../src/defaults/index.js';
import { resolveVerdict } from '../src/logic/wp-review.js';

describe('resolveVerdict', () => {
  it('maps each known verdict through the table (positive controls)', () => {
    expect(resolveVerdict('approved')).toEqual({ label: 'Approved', tone: 'success' });
    expect(resolveVerdict('changes_requested')).toEqual({ label: 'Changes requested', tone: 'danger' });
    expect(Object.keys(VERDICT_BADGES).length).toBe(2);
  });

  it('shows a verdict the table has never seen raw, in a neutral badge, never undefined', () => {
    const badge = resolveVerdict('needs_discussion');
    expect(badge).toEqual({ label: 'needs_discussion', tone: 'neutral' });
  });

  it('treats prototype-chain keys as foreign values', () => {
    expect(resolveVerdict('constructor')).toEqual({ label: 'constructor', tone: 'neutral' });
    expect(resolveVerdict('__proto__')).toEqual({ label: '__proto__', tone: 'neutral' });
  });

  it('keeps an empty string raw (it is a value, not a missing verdict)', () => {
    expect(resolveVerdict('')).toEqual({ label: '', tone: 'neutral' });
  });

  it('gives the no-verdict text, neutral, for null', () => {
    expect(resolveVerdict(null)).toEqual({ label: NO_VERDICT_TEXT, tone: 'neutral' });
    expect(NO_VERDICT_TEXT).toBe('No verdict recorded');
  });
});
