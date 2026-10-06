import { describe, expect, it } from 'vitest';
import * as defaults from '../src/defaults/index.js';
import * as review from '../src/defaults/review.js';
import * as files from '../src/defaults/files.js';
import * as refusals from '../src/defaults/refusals.js';
import * as staleness from '../src/defaults/staleness.js';
import * as copy from '../src/defaults/wp-copy.js';
import reviewSource from '../src/defaults/review.ts?raw';
import filesSource from '../src/defaults/files.ts?raw';
import refusalsSource from '../src/defaults/refusals.ts?raw';
import stalenessSource from '../src/defaults/staleness.ts?raw';
import copySource from '../src/defaults/wp-copy.ts?raw';
import actorSource from '../src/logic/wp-actor.ts?raw';
import filesLogicSource from '../src/logic/wp-files.ts?raw';
import historySource from '../src/logic/wp-history.ts?raw';
import listsSource from '../src/logic/wp-lists.ts?raw';
import retrySource from '../src/logic/wp-retry.ts?raw';
import reviewLogicSource from '../src/logic/wp-review.ts?raw';
import stalenessLogicSource from '../src/logic/wp-staleness.ts?raw';

const modules: Array<[string, Record<string, unknown>, readonly string[]]> = [
  ['review', review, ['VERDICT_BADGES', 'NO_VERDICT_TEXT', 'NO_REVIEW_TEXT', 'NO_CYCLES_TEXT', 'OVERRIDE_HEADING', 'OVERRIDE_PARTIAL_NOTE', 'OPEN_REVIEW_LABEL', 'REVIEW_CYCLE_ARTIFACT_KIND']],
  ['files', files, ['CHANGE_STATE_BADGES', 'UNKNOWN_CHANGE_STATE', 'GLOB_MARKER', 'CHANGE_STATE_UNAVAILABLE_NOTE', 'NO_FILES_TEXT']],
  ['refusals', refusals, ['DETAIL_REFUSAL_WORDS', 'DETAIL_REFUSAL_GENERIC', 'DETAIL_REFUSAL_HEADING', 'DETAIL_RETRY_LABEL', 'DETAIL_LOADING_LABEL']],
  ['staleness', staleness, ['STALENESS_STATUS_ROLE', 'STALENESS_REASON_WORDS', 'STALENESS_MINUTES_TEXT', 'FRESH_TEXT', 'STALENESS_NOT_APPLICABLE_TEXT']],
];

describe('the new default modules export exactly what contracts/defaults.md names', () => {
  it('has every named export in its file, re-exported from the index, as the same value', () => {
    let ran = 0;
    for (const [name, mod, names] of modules) {
      expect(Object.keys(mod).sort(), name).toEqual([...names].sort());
      for (const n of names) {
        expect((defaults as Record<string, unknown>)[n], `${name}.${n}`).toBe(mod[n]);
        ran += 1;
      }
    }
    expect(ran).toBe(8 + 5 + 5 + 5);
  });

  it('declares no export of #4 a second time (the stale badge, count text, subtask text, lane tables, lookup keep one home)', () => {
    const reused = ['STALE_BADGE', 'LANE_COUNT_TEXT', 'SUBTASK_PROGRESS_TEXT', 'LANE_LABELS', 'STATE_BADGES', 'NOT_STARTED_BADGE'];
    let ran = 0;
    for (const [name, mod] of [...modules.map(([n, m]) => [n, m] as const), ['wp-copy', copy] as const]) {
      for (const r of reused) {
        expect(Object.keys(mod), `${name} redeclares ${r}`).not.toContain(r);
        ran += 1;
      }
    }
    expect(ran).toBe(30);
    expect(defaults.STALE_BADGE).toEqual({ label: 'stale', tone: 'info' });
  });
});

describe('review defaults', () => {
  it('has the prototype words and tones, one table', () => {
    expect(review.VERDICT_BADGES).toEqual({
      approved: { label: 'Approved', tone: 'success' },
      changes_requested: { label: 'Changes requested', tone: 'danger' },
    });
  });
  it('has the copy of the contract', () => {
    expect(review.NO_VERDICT_TEXT).toBe('No verdict recorded');
    expect(review.NO_REVIEW_TEXT).toBe('No review outcome recorded');
    expect(review.NO_CYCLES_TEXT).toBe('No review cycle found on the primary planning surface');
    expect(review.OVERRIDE_PARTIAL_NOTE).toBe('This override is incomplete. The merge gate stays blocked.');
  });
  it('prints the cycle number as given in the accessible name, so two cycles have two names', () => {
    expect(review.OPEN_REVIEW_LABEL(1)).toBe('Open review, cycle 1');
    expect(review.OPEN_REVIEW_LABEL(12)).toBe('Open review, cycle 12');
    expect(review.OPEN_REVIEW_LABEL(1)).not.toBe(review.OPEN_REVIEW_LABEL(2));
    expect(review.OPEN_REVIEW_LABEL(0)).toBe('Open review, cycle 0');
  });
  it('types the review-cycle artifact kind as the contract value', () => {
    expect(review.REVIEW_CYCLE_ARTIFACT_KIND).toBe('review_cycle');
  });
});

describe('files defaults', () => {
  it('has the Q6 table and the unknown key read from the table', () => {
    expect(files.CHANGE_STATE_BADGES).toEqual({
      changed: { label: 'changed', tone: 'info' },
      unchanged: { label: 'unchanged', tone: 'neutral' },
      unknown: { label: 'unknown', tone: 'neutral' },
    });
    expect(Object.keys(files.CHANGE_STATE_BADGES)).toContain(files.UNKNOWN_CHANGE_STATE);
    expect(files.UNKNOWN_CHANGE_STATE).toBe('unknown');
  });
  it('has the copy', () => {
    expect(files.GLOB_MARKER).toBe('set of files');
    expect(files.CHANGE_STATE_UNAVAILABLE_NOTE).toBe('Change state unavailable on this host');
    expect(files.NO_FILES_TEXT).toBe('No owned files declared');
  });
});

describe('refusal defaults', () => {
  it('words the two contract codes and has generic, heading, retry and loading copy', () => {
    expect(refusals.DETAIL_REFUSAL_WORDS).toEqual({
      not_found: 'The Work Package detail was not found.',
      source_unreadable: 'A source of the Work Package detail could not be read.',
    });
    expect(refusals.DETAIL_REFUSAL_GENERIC).toBe('The Work Package detail could not be loaded.');
    expect(refusals.DETAIL_REFUSAL_HEADING).toBe('Work Package detail unavailable');
    expect(refusals.DETAIL_RETRY_LABEL).toBe('Try again');
    expect(refusals.DETAIL_LOADING_LABEL).toBe('Loading Work Package detail');
  });
});

describe('staleness defaults', () => {
  it('maps the three statuses to their roles', () => {
    expect(staleness.STALENESS_STATUS_ROLE).toEqual({ stale: 'badge', fresh: 'row', not_applicable: 'none' });
  });
  it('words the two reasons', () => {
    expect(staleness.STALENESS_REASON_WORDS).toEqual({
      planning_artifact_repo_root_shared_workspace: 'shares the repository root, no worktree to measure',
      live_claim_process: 'the claiming process is alive',
    });
  });
  it('prints minutes as given and has the fresh text', () => {
    expect(staleness.STALENESS_MINUTES_TEXT(0)).toBe('0 min since last commit');
    expect(staleness.STALENESS_MINUTES_TEXT(125)).toBe('125 min since last commit');
    expect(staleness.FRESH_TEXT).toBe('recent work');
  });
  it('builds the not-applicable text: known reason in words, foreign reason raw, null reason drops the clause', () => {
    expect(staleness.STALENESS_NOT_APPLICABLE_TEXT('live_claim_process')).toBe('Staleness: not applicable, the claiming process is alive');
    expect(staleness.STALENESS_NOT_APPLICABLE_TEXT('some_new_reason')).toBe('Staleness: not applicable, some_new_reason');
    expect(staleness.STALENESS_NOT_APPLICABLE_TEXT(null)).toBe('Staleness: not applicable');
    expect(staleness.STALENESS_NOT_APPLICABLE_TEXT('constructor')).toBe('Staleness: not applicable, constructor');
  });
});

describe('wp-copy', () => {
  const stringExports = Object.entries(copy).filter(([, v]) => typeof v === 'string') as Array<[string, string]>;

  it('has every named constant of the contract as a non-empty string', () => {
    const named = [
      'FACTS_TITLE', 'ASSIGNMENT_TITLE', 'AUTHORED_TITLE', 'FRONTMATTER_TITLE', 'OWNED_FILES_TITLE', 'HISTORY_TITLE', 'REVIEW_TITLE',
      'EVIDENCE_TITLE', 'DEPENDENCIES_TITLE', 'SUBTASKS_TITLE', 'WORKSPACE_TITLE', 'ABSENT_MARKER', 'CURRENT_MARKER', 'FORCED_WORD', 'YES_WORD', 'NO_WORD',
      'READY_TEXT', 'BLOCKED_TEXT', 'SATISFIED_TEXT', 'UNSATISFIED_TEXT', 'NO_DEPENDENCIES_TEXT', 'NO_SUBTASKS_TEXT', 'NO_HISTORY_TEXT', 'OPEN_SPEC_LABEL',
      'OPEN_PROMPT_LABEL', 'OPEN_REVIEW_TEXT', 'CANCELLED_NOTICE_HEADING', 'NOTHING_SELECTED_EYEBROW', 'NOTHING_SELECTED_HEADING', 'NOT_FOUND_HEADING', 'NOT_FOUND_BODY',
      'RETURN_TO_PIPELINE_LABEL', 'WP_LOADING_LABEL', 'WP_ERROR_HEADING', 'WP_ERROR_BODY', 'WP_EMPTY_HEADING', 'WP_EMPTY_BODY',
      'ANNOUNCE_DETAIL_LOADING', 'ANNOUNCE_DETAIL_LOADED', 'ANNOUNCE_DETAIL_UNAVAILABLE',
    ];
    let ran = 0;
    for (const n of named) {
      const v = (copy as Record<string, unknown>)[n];
      expect(typeof v, n).toBe('string');
      expect((v as string).length, n).toBeGreaterThan(0);
      ran += 1;
    }
    expect(ran).toBe(40);
  });

  it('has the prototype panel titles and the ruled copy', () => {
    expect(copy.FACTS_TITLE).toBe('Facts');
    expect(copy.ASSIGNMENT_TITLE).toBe('Assignment');
    expect(copy.AUTHORED_TITLE).toBe('Authored recommendation');
    expect(copy.FRONTMATTER_TITLE).toBe('Frontmatter');
    expect(copy.OWNED_FILES_TITLE).toBe('Owned files');
    expect(copy.HISTORY_TITLE).toBe('Lane history');
    expect(copy.REVIEW_TITLE).toBe('Review cycles');
    expect(copy.EVIDENCE_TITLE).toBe('Evidence chain');
    expect(copy.DEPENDENCIES_TITLE).toBe('Dependency chain');
    expect(copy.SUBTASKS_TITLE).toBe('Subtasks');
    expect(copy.WORKSPACE_TITLE).toBe('Workspace environment');
    expect(copy.ABSENT_MARKER).toBe('not recorded');
    expect(copy.CURRENT_MARKER).toBe('Current');
    expect(copy.FORCED_WORD).toBe('forced');
    expect(copy.READY_TEXT).toBe('Ready to start');
    expect(copy.BLOCKED_TEXT).toBe('Waiting on dependencies');
    expect(copy.OPEN_SPEC_LABEL).toBe('Open spec.md');
    expect(copy.OPEN_PROMPT_LABEL).toBe('Open prompt');
    expect(copy.OPEN_REVIEW_TEXT).toBe('Open review');
    expect(copy.NOTHING_SELECTED_EYEBROW).toBe('Mission');
    expect(copy.NOTHING_SELECTED_HEADING).toBe('Choose a Work Package');
    expect(copy.NOT_FOUND_HEADING).toBe('Task detail unavailable');
    expect(copy.RETURN_TO_PIPELINE_LABEL).toBe('Return to Pipeline');
    expect(defaults.BREADCRUMB_LABEL).toBe('Breadcrumb');
    expect(Object.keys(copy)).not.toContain('BREADCRUMB_LABEL');
    expect(copy.REASON_SOURCE_WORDS).toEqual({ operator: 'recorded by an operator', synthetic: 'filled in by the tool' });
  });

  it('has the row labels of every panel, including the D2 list', () => {
    const labels: Record<string, string> = {
      LABEL_WORK_PACKAGE: 'Work Package', LABEL_COMMITTED_STATE: 'Committed state', LABEL_ACTOR: 'Actor', LABEL_TARGET_BRANCH: 'Target branch',
      LABEL_PHASE: 'Phase', LABEL_TASK_TYPE: 'Task type', LABEL_TRACKER_REFS: 'Tracker refs', LABEL_LAST_TRANSITION: 'Last transition',
      LABEL_FORCED_TRANSITIONS: 'Forced transitions', LABEL_IMPLEMENTER_OF_RECORD: 'Implementer of record', LABEL_AGENT: 'Agent',
      LABEL_ASSIGNEE: 'Assignee', LABEL_ROLE: 'Role', LABEL_PROFILE: 'Profile', LABEL_VERSION: 'Version', LABEL_MODEL: 'Model', LABEL_PROVIDER: 'Provider',
      LABEL_CODE_LANE: 'Code lane', LABEL_LANE_BRANCH: 'Lane branch', LABEL_PLANNING_BRANCH: 'Planning branch', LABEL_WORKTREE_PRESENT: 'Worktree present',
      LABEL_DEPENDENCIES: 'Dependencies', LABEL_REQUIREMENT_REFS: 'Requirement refs', LABEL_PRIORITY: 'Priority', LABEL_EXECUTION_MODE: 'Execution mode',
      LABEL_STALENESS: 'Staleness', LABEL_LATEST_RESULT: 'Latest result', LABEL_REVIEWER: 'Reviewer', LABEL_REFERENCE: 'Reference',
      LABEL_OVERRIDDEN_BY: 'Overridden by', LABEL_OVERRIDDEN_AT: 'Overridden at', LABEL_REASON: 'Reason', LABEL_REVIEWED: 'Reviewed',
      STAGE_MISSION: 'Mission',
    };
    let ran = 0;
    for (const [k, v] of Object.entries(labels)) {
      expect((copy as Record<string, unknown>)[k], k).toBe(v);
      ran += 1;
    }
    expect(ran).toBe(34);
  });

  it('prints the cycle number as given', () => {
    expect(copy.CYCLE_NUMBER_LABEL(3)).toBe('Cycle 3');
    expect(copy.CYCLE_NUMBER_LABEL(10)).toBe('Cycle 10');
  });

  it('builds a dependency node name with id, title and lane word; the title falls back to the id', () => {
    expect(copy.dependencyNodeLabel('WP03', 'Contract slice A', 'approved')).toBe('WP03, Contract slice A, approved');
    expect(copy.dependencyNodeLabel('WP03', null, 'on_hold')).toBe('WP03, WP03, on_hold');
    expect(copy.dependencyNodeLabel('WP03', 'T', 'x')).not.toBe(copy.dependencyNodeLabel('WP04', 'T', 'x'));
  });

  it('builds announcements with the id as given', () => {
    expect(copy.announceLoading('WP04')).toBe('Loading Work Package WP04');
    expect(copy.announceLoaded('WP04')).toBe('Work Package WP04 loaded');
    expect(copy.announceNotFound('WP04')).toBe('Work Package WP04 not found');
    expect(copy.announceLoading('wp-ünknown 9')).toBe('Loading Work Package wp-ünknown 9');
    expect(copy.ANNOUNCE_DETAIL_LOADING).toBe('Loading Work Package detail');
    expect(copy.ANNOUNCE_DETAIL_LOADED).toBe('Work Package detail loaded');
    expect(copy.ANNOUNCE_DETAIL_UNAVAILABLE).toBe('Work Package detail unavailable');
  });

  it('never writes the word feature (C-009) and never holds a value that is a stringified undefined', () => {
    let ran = 0;
    for (const [n, v] of stringExports) {
      expect(v.toLowerCase(), n).not.toContain('feature');
      expect(v, n).not.toContain('undefined');
      ran += 1;
    }
    expect(ran).toBe(stringExports.length);
    expect(ran).toBeGreaterThan(70);
  });
});

// The source without comments: a comment may name a word, code may not.
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the vocabulary has one home', () => {
  const verdictWord = /['"`]approved['"`]/g;
  it('writes the verdict key approved once, in review.ts, and nowhere else in the new files', () => {
    expect((code(reviewSource).match(verdictWord) ?? []).length + (code(reviewSource).match(/^\s+approved:/gm) ?? []).length).toBe(1);
    let ran = 0;
    for (const [name, src] of [['files', filesSource], ['refusals', refusalsSource], ['staleness', stalenessSource], ['wp-copy', copySource]] as const) {
      expect(code(src).match(verdictWord) ?? [], name).toEqual([]);
      expect(code(src).match(/^\s+approved:/gm) ?? [], name).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('keeps every vocabulary word out of the logic files (the gate backs this; this test names the words)', () => {
    const words = ['approved', 'changes_requested', 'changed', 'unchanged', 'unknown', 'fresh', 'stale', 'not_applicable', 'review_cycle', 'planned', 'in_progress', 'done', 'blocked'];
    let ran = 0;
    for (const [name, src] of [['wp-actor', actorSource], ['wp-files', filesLogicSource], ['wp-history', historySource], ['wp-lists', listsSource], ['wp-retry', retrySource], ['wp-review', reviewLogicSource], ['wp-staleness', stalenessLogicSource]] as const) {
      for (const w of words) {
        expect(new RegExp(`['"\`]${w}['"\`]`).test(code(src)), `${name} writes '${w}'`).toBe(false);
        ran += 1;
      }
    }
    expect(ran).toBe(91);
  });

  it('writes the all-unknown key only through UNKNOWN_CHANGE_STATE', () => {
    expect(/unknown/i.test(code(filesLogicSource).replace(/UNKNOWN_CHANGE_STATE|allUnknown/g, ''))).toBe(false);
    expect(code(filesLogicSource)).toContain('UNKNOWN_CHANGE_STATE');
  });
});
