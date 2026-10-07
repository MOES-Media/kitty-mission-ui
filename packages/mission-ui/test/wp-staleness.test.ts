import { describe, expect, it } from 'vitest';
import { STALENESS_STATUS_ROLE } from '../src/defaults/index.js';
import type { Staleness } from '../src/contract/types.js';
import { stalenessView } from '../src/logic/wp-staleness.js';

const s = (status: string, reason: string | null, minutesSinceCommit: number | null): Staleness =>
  ({ status, reason, minutesSinceCommit }) as unknown as Staleness;

describe('stalenessView', () => {
  it('gives the badge role for stale, with its minutes and reason handed over', () => {
    const view = stalenessView(s('stale', null, 240));
    expect(view).toEqual({ role: 'badge', status: 'stale', reason: null, minutes: 240 });
  });

  it('gives the row role for fresh, and keeps the minutes as given', () => {
    expect(stalenessView(s('fresh', null, 3))).toEqual({ role: 'row', status: 'fresh', reason: null, minutes: 3 });
    expect(stalenessView(s('fresh', 'live_claim_process', null))).toEqual({
      role: 'row',
      status: 'fresh',
      reason: 'live_claim_process',
      minutes: null,
    });
  });

  it('gives the none role for not applicable, exposing status and reason for the hidden text', () => {
    expect(stalenessView(s('not_applicable', 'planning_artifact_repo_root_shared_workspace', null))).toEqual({
      role: 'none',
      status: 'not_applicable',
      reason: 'planning_artifact_repo_root_shared_workspace',
      minutes: null,
    });
  });

  it('gives the none role with no status for an absent staleness (null and undefined)', () => {
    expect(stalenessView(null)).toEqual({ role: 'none', status: null, reason: null, minutes: null });
    expect(stalenessView(undefined)).toEqual({ role: 'none', status: null, reason: null, minutes: null });
  });

  it('gives a quiet row with the raw status for a status the table has never seen', () => {
    const view = stalenessView(s('dormant', 'live_claim_process', 7));
    expect(view.role).toBe('row');
    expect(view.status).toBe('dormant');
    expect(JSON.stringify(view)).not.toContain('undefined');
  });

  it('gives a row for prototype-chain statuses, never none', () => {
    expect(stalenessView(s('constructor', null, null)).role).toBe('row');
    expect(stalenessView(s('__proto__', null, null)).role).toBe('row');
  });

  it('hands a foreign reason over raw and keeps it', () => {
    expect(stalenessView(s('fresh', 'some_new_reason', null)).reason).toBe('some_new_reason');
  });

  it('runs every table status and agrees with the table role', () => {
    let ran = 0;
    for (const [status, role] of Object.entries(STALENESS_STATUS_ROLE)) {
      expect(stalenessView(s(status, null, null)).role, status).toBe(role);
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});
