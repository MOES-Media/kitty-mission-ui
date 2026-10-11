// T007: the Ops copy module (contracts/defaults.md). Every key of the table, the vocabulary tables against the vendored schemas,
// the count and announcement texts at 0, 1, 2 and 249, host-neutral wording, and no export name shared with the other defaults.
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import opsOutcomeYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsOutcome.yaml?raw';
import opsClosedByYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsClosedBy.yaml?raw';
import opsModeYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsModeOfWork.yaml?raw';
import opsEvidenceKindYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsEvidenceKind.yaml?raw';
import opsStatusYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsInvocationStatus.yaml?raw';
import opsRefusalCodeYaml from '../../../contracts/spec-kitty/mission-status/schemas/OpsRefusalCode.yaml?raw';
import pageCursorRefusalYaml from '../../../contracts/spec-kitty/mission-status/schemas/PageCursorRefusal.yaml?raw';
import * as otherDefaults from '../src/defaults/index.js';
import * as ops from '../src/defaults/ops-copy.js';
import * as files from '../src/defaults/files.js';
import * as lanes from '../src/defaults/lanes.js';
import * as lifecycle from '../src/defaults/lifecycle.js';
import * as missionsCopy from '../src/defaults/missions-copy.js';
import * as phases from '../src/defaults/phases.js';
import * as pipelineCopy from '../src/defaults/pipeline-copy.js';
import * as refusals from '../src/defaults/refusals.js';
import * as review from '../src/defaults/review.js';
import * as staleness from '../src/defaults/staleness.js';
import * as wpCopy from '../src/defaults/wp-copy.js';
import * as health from '../src/defaults/health.js';
import * as projectsCopy from '../src/defaults/projects-copy.js';
import * as artifactKinds from '../src/defaults/artifact-kinds.js';
import * as artifactMedia from '../src/defaults/artifact-media.js';
import * as artifactRefusals from '../src/defaults/artifact-refusals.js';
import * as artifactCopy from '../src/defaults/artifact-copy.js';
import * as markdown from '../src/defaults/markdown.js';
import * as driftCopy from '../src/defaults/drift-copy.js';
import indexSource from '../src/defaults/index.ts?raw';

const enumOf = (yaml: string): string[] => (parse(yaml) as { enum: string[] }).enum;
const BADGE_TONES = ['neutral', 'info', 'success', 'attention', 'danger', 'recovery'];

describe('T007: the copy table of contracts/defaults.md', () => {
  it('holds every default string, word for word', () => {
    expect(ops.OPS_COPY).toEqual({
      headerEyebrow: 'Project',
      headerTitle: 'Ops',
      headerBadge: 'Read only',
      headerSeparator: ' · ',
      headerSupportingTail: 'invocation records',
      sourceNotice: "Read from this project's Ops directory and sorted by start time, newest first. Viewing Ops never invokes an agent.",
      sectionEyebrow: 'Invocation records',
      sectionHeading: 'Newest records',
      countOf: '{loaded} of {total}',
      countAll: '{total} records',
      countAllOne: '{total} record',
      profileFact: 'Profile: {profile}',
      termProfile: 'Profile',
      termAction: 'Action',
      termActor: 'Actor',
      termStarted: 'Started',
      termCompleted: 'Completed',
      termEvidence: 'Evidence',
      termMission: 'Mission',
      termWorkPackage: 'Work Package',
      termMode: 'Mode',
      termClosedBy: 'Closed by',
      quietEvidenceClosed: 'Not recorded',
      quietEvidenceOpen: 'Not recorded yet',
      quietActor: 'Not shown',
      quietCompletedOpen: 'Not recorded yet',
      quietCompletedClosed: 'Not recorded',
      redactedWord: 'changed',
      redactedDescription: 'Host paths and e-mail addresses are replaced, or the text was cut.',
      skippedOne: '{n} record in this project could not be read and is not shown.',
      skippedMany: '{n} records in this project could not be read and are not shown.',
      loadMore: 'Load more',
      loadMoreError: 'The next records could not be loaded.',
      retryLabel: 'Try again',
      refusedCursor: 'This position in the list is no longer valid.',
      refreshAction: 'Refresh from the newest',
      emptyHeading: 'No invocation records',
      emptyBody: 'No invocation records are available for this project.',
      emptyProfile: 'No records for this profile.',
      loadingLabel: 'Reading invocation records',
      loadingBody: "Reading the project's Ops records. No agent is invoked.",
      errorHeading: 'Invocation records unavailable',
      errorBody: 'The Ops records could not be read. No invocation rows are shown.',
      announceLoading: 'Loading invocation records',
      announceLoaded: '{loaded} of {total} records loaded',
      announceLoadedOne: '{loaded} of {total} record loaded',
      announceMore: '{n} more records loaded',
      announceMoreOne: '{n} more record loaded',
      announceLoadingMore: 'Loading more records',
    });
    expect(Object.keys(ops.OPS_COPY).length).toBe(49);
    // the dead key is gone (the skipped sentence is appended by the screen, CP-1)
    expect(Object.keys(ops.OPS_COPY)).not.toContain('emptySkipped');
    expect(Object.keys(ops.OPS_COPY)).toContain('skippedMany');
  });

  it('exports the two constants and the retry label is the copy key', () => {
    expect(ops.CURSOR_REFUSAL_CODE).toBe('invalid_page_cursor');
    expect(ops.ERROR_RETRY_LABEL).toBe('Try again');
    expect(ops.OPS_COPY.retryLabel).toBe(ops.ERROR_RETRY_LABEL);
  });

  it('takes the cursor-refusal code from the vendored schema, not from a retyped word', () => {
    const schema = parse(pageCursorRefusalYaml) as { allOf: Array<{ properties?: { code?: { const?: string } } }> };
    const consts = schema.allOf.map((a) => a.properties?.code?.const).filter((c) => c !== undefined);
    expect(consts).toEqual([ops.CURSOR_REFUSAL_CODE]);
  });

  it('has twelve month names, Jan to Dec', () => {
    expect(ops.OPS_MONTHS).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  });

  it('is host-neutral and uses the project terms (OQ-6, C-009)', () => {
    let seen = 0;
    for (const [key, value] of Object.entries(ops.OPS_COPY)) {
      expect(value, key).not.toMatch(/\.(jsonl?|ya?ml|md|toml)\b|kitty|[\\/]|feature/i);
      seen += 1;
    }
    expect(seen).toBe(49);
    // positive control: the matcher does refuse what it is for
    expect('kitty-ops/x.jsonl').toMatch(/\.(jsonl?|ya?ml|md|toml)\b|kitty|[\\/]|feature/i);
    expect(ops.OPS_COPY.termMission).toBe('Mission');
  });
});

describe('T007: the vocabulary tables are keyed by the contract word', () => {
  it('outcome: done success, failed danger, abandoned attention', () => {
    expect(ops.OPS_OUTCOMES).toEqual({
      done: { word: 'done', tone: 'success' },
      failed: { word: 'failed', tone: 'danger' },
      abandoned: { word: 'abandoned', tone: 'attention' },
    });
  });

  it('status: open and closed, both neutral', () => {
    expect(ops.OPS_STATUSES).toEqual({ open: { word: 'open', tone: 'neutral' }, closed: { word: 'closed', tone: 'neutral' } });
  });

  it('closer: sweep is drawn as "sweep", agent is named but not drawn', () => {
    expect(ops.OPS_CLOSERS).toEqual({ doctor_sweep: { word: 'sweep', drawn: true }, agent: { word: 'agent', drawn: false } });
  });

  it('mode and evidence class words', () => {
    expect(ops.OPS_MODES).toEqual({ task_execution: 'task execution', advisory: 'advisory', mission_step: 'mission step', query: 'query' });
    expect(ops.OPS_EVIDENCE_CLASSES).toEqual({ repo_path: 'path', url: 'address', text: 'text' });
  });

  it('error body by code: ops_unreadable names the error-body copy key, so a copy hook reaches it', () => {
    expect(ops.OPS_ERROR_BY_CODE).toEqual({ ops_unreadable: 'errorBody' });
  });

  it('covers every member of the vendored enums and nothing else (a contract bump fails here)', () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ['outcome', ops.OPS_OUTCOMES, opsOutcomeYaml],
      ['status', ops.OPS_STATUSES, opsStatusYaml],
      ['closer', ops.OPS_CLOSERS, opsClosedByYaml],
      ['mode', ops.OPS_MODES, opsModeYaml],
      ['evidence class', ops.OPS_EVIDENCE_CLASSES, opsEvidenceKindYaml],
      ['refusal code', ops.OPS_ERROR_BY_CODE, opsRefusalCodeYaml],
    ];
    let ran = 0;
    for (const [name, table, yaml] of cases) {
      expect(Object.keys(table).sort(), name).toEqual(enumOf(yaml).sort());
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('quiet words: an open Op is "not recorded yet", a closed or unknown one "not recorded"', () => {
    expect(ops.OPS_QUIET_WORDS).toEqual({
      open: { completed: 'quietCompletedOpen', evidence: 'quietEvidenceOpen' },
      closed: { completed: 'quietCompletedClosed', evidence: 'quietEvidenceClosed' },
    });
    expect(ops.OPS_QUIET_FALLBACK).toEqual({ completed: 'quietCompletedClosed', evidence: 'quietEvidenceClosed' });
    expect(Object.keys(ops.OPS_QUIET_WORDS).sort()).toEqual(enumOf(opsStatusYaml).sort());
    for (const keys of [...Object.values(ops.OPS_QUIET_WORDS), ops.OPS_QUIET_FALLBACK]) {
      expect(Object.keys(ops.OPS_COPY)).toContain(keys.completed);
      expect(Object.keys(ops.OPS_COPY)).toContain(keys.evidence);
    }
  });

  it('uses only the existing badge tones', () => {
    const tones = [...Object.values(ops.OPS_OUTCOMES), ...Object.values(ops.OPS_STATUSES)].map((e) => e.tone);
    expect(tones.length).toBe(5);
    for (const tone of tones) expect(BADGE_TONES).toContain(tone);
  });

  it('has the vocabulary object the logic reads, built from those tables', () => {
    expect(ops.OPS_VOCABULARY).toEqual({
      outcomes: ops.OPS_OUTCOMES,
      statuses: ops.OPS_STATUSES,
      closers: ops.OPS_CLOSERS,
      modes: ops.OPS_MODES,
      evidenceClasses: ops.OPS_EVIDENCE_CLASSES,
      quiet: ops.OPS_QUIET_WORDS,
      quietFallback: ops.OPS_QUIET_FALLBACK,
      copy: ops.OPS_COPY,
    });
  });
});

describe('T007: the count and announcement texts', () => {
  it('opsCountText: "{loaded} of {total}", and "{total} records" when equal, singular for one', () => {
    const cases: Array<[number, number, string]> = [
      [0, 0, '0 records'],
      [1, 1, '1 record'],
      [2, 2, '2 records'],
      [249, 249, '249 records'],
      [50, 249, '50 of 249'],
      [1, 2, '1 of 2'],
      [0, 3, '0 of 3'],
    ];
    expect(cases.length).toBe(7);
    for (const [loaded, total, want] of cases) expect(ops.opsCountText(loaded, total), `${loaded}/${total}`).toBe(want);
  });

  it('skippedText: singular for one, plural otherwise', () => {
    const cases: Array<[number, string]> = [
      [0, '0 records in this project could not be read and are not shown.'],
      [1, '1 record in this project could not be read and is not shown.'],
      [2, '2 records in this project could not be read and are not shown.'],
      [249, '249 records in this project could not be read and are not shown.'],
    ];
    expect(cases.length).toBe(4);
    for (const [n, want] of cases) expect(ops.skippedText(n), `${n}`).toBe(want);
  });

  it('emptySkippedText is gone, and skippedText still names the count (positive control)', () => {
    expect(Object.keys(ops)).not.toContain('emptySkippedText');
    expect(Object.keys(ops)).toContain('skippedText');
  });

  it('loadedAnnouncement: after the first page, then after a load-more', () => {
    const first: Array<[number, number, string]> = [
      [50, 249, '50 of 249 records loaded'],
      [2, 2, '2 of 2 records loaded'],
      [0, 0, '0 of 0 records loaded'],
      [1, 1, '1 of 1 record loaded'],
    ];
    for (const [loaded, total, want] of first) expect(ops.loadedAnnouncement(loaded, total, null), `${loaded}/${total}`).toBe(want);
    const more: Array<[number, string]> = [
      [50, '50 more records loaded'],
      [2, '2 more records loaded'],
      [1, '1 more record loaded'],
      [249, '249 more records loaded'],
    ];
    for (const [n, want] of more) expect(ops.loadedAnnouncement(100, 300, n), `${n}`).toBe(want);
    expect(first.length + more.length).toBe(8);
  });

  it('profileFactText fills the profile', () => {
    expect(ops.profileFactText('p-1')).toBe('Profile: p-1');
  });

  it('a copy resolver replaces the template of a parametrised text', () => {
    const copy = (key: string): string => (key === 'skippedMany' ? '{n} unreadable' : ops.OPS_COPY[key as keyof typeof ops.OPS_COPY]);
    expect(ops.skippedText(5, copy)).toBe('5 unreadable');
    expect(ops.skippedText(1, copy)).toBe('1 record in this project could not be read and is not shown.');
  });

  it('fillTemplate replaces every occurrence and leaves an unknown placeholder as written', () => {
    expect(ops.fillTemplate('{a}-{a}-{b}', { a: '1' })).toBe('1-1-{b}');
    expect(ops.fillTemplate('{a}', { a: '$&' })).toBe('$&');
  });
});

describe('T007: no export name is shared with the other defaults (the one-line export of WP04 stays unambiguous)', () => {
  // The other defaults are read module by module: once `defaults/index.ts` re-exports this module, the index itself holds these names.
  // The ten of #5, the two of the Projects screen (#9), the five of the Artifact Viewer (#7) and the one of the Drift screen (#10).
  const others: Record<string, unknown>[] = [
    files, lanes, lifecycle, missionsCopy, phases, pipelineCopy, refusals, review, staleness, wpCopy,
    health, projectsCopy, artifactKinds, artifactMedia, artifactRefusals, artifactCopy, markdown, driftCopy,
  ];

  it('lists every other defaults module of defaults/index.ts, so a new module cannot go unseen', () => {
    const names = [
      'files', 'lanes', 'lifecycle', 'missions-copy', 'phases', 'pipeline-copy', 'refusals', 'review', 'staleness', 'wp-copy',
      'health', 'projects-copy', 'artifact-kinds', 'artifact-media', 'artifact-refusals', 'artifact-copy', 'markdown', 'drift-copy',
    ];
    const reExported = [...indexSource.matchAll(/export \* from '\.\/([a-z-]+)\.js';/g)].map((match) => match[1]);
    expect(others.length).toBe(names.length);
    expect(reExported.filter((name) => name !== 'ops-copy').sort()).toEqual([...names].sort());
    expect(reExported).toContain('ops-copy');
  });

  it('has disjoint export names', () => {
    const mine = Object.keys(ops);
    const theirs = new Set(others.flatMap((mod) => Object.keys(mod)));
    expect(others.length).toBe(18);
    expect(mine.length).toBeGreaterThan(15);
    expect(mine.filter((k) => theirs.has(k))).toEqual([]);
    // positive control: a name of the first module is seen by the same lookup that finds no shared name
    expect(theirs.has('DEFAULT_LANE_GROUPS')).toBe(true);
  });

  it('is re-exported by defaults/index.ts, name for name and by identity', () => {
    const index = otherDefaults as Record<string, unknown>;
    let ran = 0;
    for (const [name, value] of Object.entries(ops)) {
      expect(index[name], name).toBe(value);
      ran += 1;
    }
    expect(ran).toBe(Object.keys(ops).length);
  });
});
