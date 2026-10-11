import { describe, expect, it } from 'vitest';
import { makeDriftFinding } from '../src/contract/bulk.js';
import type { DriftFindingView, DriftMissionName } from '../src/contract/types.js';
import { buildFindingView, findingKey, findingTitle, missionLabel, missionNaming, rowKeys, sameKey } from '../src/logic/drift-finding.js';
import type { LabelHooks } from '../src/logic/types.js';

const MISSION = '01JZCB3C4D5E6F7G8H9JKMNPQT';
const names: Readonly<Record<string, DriftMissionName>> = {
  [MISSION]: { missionId: MISSION, slug: 'alpha-mission', friendlyName: 'Alpha Mission' },
  OTHER: { missionId: 'OTHER', slug: '', friendlyName: 'No slug yet' },
};
const ctx = { missions: names, hooks: null };

const drift: DriftFindingView = {
  kind: 'snapshot_disagrees_with_event_log',
  severity: 'error',
  missionId: MISSION,
  artifactPath: 'status.json',
  summary: 'The status snapshot disagrees with the event log.',
  authority: 'event_log',
  derivedSide: 'status_json',
  laneComparison: [
    { wpId: 'WP01', persistedStatusLane: 'in_progress', derivedStatusLane: 'for_review' },
    { wpId: 'WP02', persistedStatusLane: 'planned', derivedStatusLane: null },
  ],
  remedy: 'materialize_status',
  sourceCode: 'SNAPSHOT_DRIFT',
};
const make = (over: Partial<DriftFindingView>): DriftFindingView => ({ ...drift, ...over });

describe('the identity of a finding', () => {
  it('is the Mission, the kind and the file, compared exactly', () => {
    expect(findingKey(drift)).toEqual({ missionId: MISSION, kind: 'snapshot_disagrees_with_event_log', artifactPath: 'status.json' });
    expect(sameKey(findingKey(drift), { ...findingKey(drift) })).toBe(true);
    let ran = 0;
    for (const field of ['missionId', 'kind', 'artifactPath'] as const) {
      expect(sameKey(findingKey(drift), { ...findingKey(drift), [field]: `${findingKey(drift)[field]} ` }), field).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('keeps the report order and gives a duplicate key an index suffix so no row is dropped', () => {
    const a = make({ artifactPath: 'b.json' });
    const b = make({ artifactPath: 'a.json' });
    const unsorted = [a, b, a];
    const keys = rowKeys(unsorted);
    expect(keys.length).toBe(3);
    expect(keys[0]).toBe(`${MISSION}|snapshot_disagrees_with_event_log|b.json`);
    expect(keys[1]).toBe(`${MISSION}|snapshot_disagrees_with_event_log|a.json`);
    expect(keys[2]).toBe(`${keys[0]}|2`);
    expect(new Set(keys).size).toBe(3);
    // positive control: with unique keys, no suffix is added
    expect(rowKeys([a, b])).toEqual([keys[0], keys[1]]);
  });
});

describe('missionNaming and missionLabel: the one rule for how a Mission is named (DD-8, C-007)', () => {
  it('names a Mission by its slug, else by its id; an empty slug, no entry and no map all give the id', () => {
    expect(missionNaming(MISSION, names)).toEqual({ missionId: MISSION, slug: 'alpha-mission', friendlyName: 'Alpha Mission' });
    expect(missionLabel(missionNaming(MISSION, names))).toBe('alpha-mission');
    expect(missionNaming('OTHER', names)).toEqual({ missionId: 'OTHER', slug: null, friendlyName: 'No slug yet' });
    expect(missionLabel(missionNaming('OTHER', names))).toBe('OTHER');
    expect(missionLabel(missionNaming('UNLISTED', names))).toBe('UNLISTED');
    expect(missionLabel(missionNaming(MISSION, null))).toBe(MISSION);
  });

  it('reads the map by own key only: a Mission id named like an Object member is just an unlisted id', () => {
    for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(missionNaming(id, {}), id).toEqual({ missionId: id, slug: null, friendlyName: null });
      expect(missionLabel(missionNaming(id, {})), id).toBe(id);
    }
  });

  it('titles a finding by its summary, else by its kind word (the row and the detail agree)', () => {
    expect(findingTitle(drift, null)).toBe(drift.summary);
    expect(findingTitle(make({ summary: '' }), null)).toBe('Snapshot disagrees');
    expect(buildFindingView(make({ summary: '' }), ctx).title).toBe(findingTitle(make({ summary: '' }), null));
  });
});

describe('buildFindingView: the words of one finding', () => {
  it('builds every field for the status disagreement, in the report order of its lane rows', () => {
    expect(buildFindingView(drift, ctx)).toEqual({
      key: { missionId: MISSION, kind: 'snapshot_disagrees_with_event_log', artifactPath: 'status.json' },
      title: 'The status snapshot disagrees with the event log.',
      kicker: { severity: { word: 'error', tone: 'danger' }, kind: 'Snapshot disagrees' },
      sourceCodeTag: 'SNAPSHOT_DRIFT',
      explanation: "status.json differs from what the event log gives when it is replayed at the snapshot's own generation.",
      authorityWord: "The Mission's status event log",
      derivedSideWord: 'status.json (the status snapshot)',
      file: 'status.json',
      mission: { missionId: MISSION, slug: 'alpha-mission', friendlyName: 'Alpha Mission' },
      laneRows: [
        { wpId: 'WP01', persisted: 'in progress', derived: 'for review' },
        { wpId: 'WP02', persisted: 'planned', derived: 'not present' },
      ],
      laneNote: null,
      command: { text: 'spec-kitty agent status materialize --mission alpha-mission', remedy: 'materialize_status' },
      commandNote: null,
    });
  });

  it('keys the explanation by the pair of kind and source code: the six valid pairs have one, any other pair has none', () => {
    const SNAPSHOT = 'snapshot_disagrees_with_event_log';
    const sentence = "status.json differs from what the event log gives when it is replayed at the snapshot's own generation.";
    const valid: Array<[string, string | null, string]> = [
      [SNAPSHOT, 'SNAPSHOT_DRIFT', sentence],
      [SNAPSHOT, 'SNAPSHOT_DRIFT_PROVENANCE', 'Only provenance fields differ; the lanes agree.'],
      [SNAPSHOT, 'SNAPSHOT_DRIFT_TERMINAL', 'The files differ and every work package is done.'],
      [SNAPSHOT, 'CORRUPT_JSON', 'status.json could not be read as a JSON object.'],
      ['snapshot_or_event_log_missing', null, 'One of status.json and status.events.jsonl is missing. The event log is the record that decides.'],
      ['lane_branch_missing', null, 'A lane or Mission branch the lane manifest relies on has no local branch. No branch is created or changed from this view.'],
    ];
    let ran = 0;
    for (const [kind, sourceCode, text] of valid) {
      expect(buildFindingView(make({ kind, sourceCode }), ctx).explanation, `${kind} ${String(sourceCode)}`).toBe(text);
      ran += 1;
    }
    expect(ran).toBe(6);
    const none: Array<[string, string | null]> = [
      [SNAPSHOT, 'SOMETHING_NEW'],
      [SNAPSHOT, null],
      [SNAPSHOT, 'constructor'],
      ['lane_branch_missing', 'CORRUPT_JSON'],
      ['snapshot_or_event_log_missing', 'SNAPSHOT_DRIFT'],
      ['brand_new_kind', null],
      ['brand_new_kind', 'SNAPSHOT_DRIFT'],
    ];
    let absent = 0;
    for (const [kind, sourceCode] of none) {
      expect(buildFindingView(make({ kind, sourceCode }), ctx).explanation, `${kind} ${String(sourceCode)}`).toBeNull();
      absent += 1;
    }
    expect(absent).toBe(7);
    const unknownKind = buildFindingView(make({ kind: 'brand_new_kind' }), ctx);
    expect(unknownKind.kicker.kind).toBe('brand_new_kind');
    expect(unknownKind.title).toBe(drift.summary);
  });

  it('has no source-code tag when the code is null', () => {
    expect(buildFindingView(make({ sourceCode: null }), ctx).sourceCodeTag).toBeNull();
    expect(buildFindingView(drift, ctx).sourceCodeTag).toBe('SNAPSHOT_DRIFT');
  });

  it('keeps the summary as the title, and falls back to the kicker only for an empty summary', () => {
    expect(buildFindingView(make({ summary: 'A foreign sentence.' }), ctx).title).toBe('A foreign sentence.');
    expect(buildFindingView(make({ summary: '' }), ctx).title).toBe('Snapshot disagrees');
  });

  it('draws the git-decided finding without any branch name', () => {
    const view = buildFindingView(makeDriftFinding(0), ctx);
    expect(view.kicker.kind).toBe('Lane branch missing');
    expect(view.authorityWord).toBe('Local git branches');
    expect(view.derivedSideWord).toBe('lanes.json (the lane manifest)');
    expect(view.file).toBe('lanes.json');
    expect(view.laneRows).toEqual([]);
    expect(view.command).toBeNull();
    expect(view.commandNote).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/kitty\/|refs\/heads|main\b/);
  });
});

describe('buildFindingView: the command (DR-11, DR-13)', () => {
  it('has a command only for a known remedy and a known slug', () => {
    expect(buildFindingView(drift, ctx).command?.text).toBe('spec-kitty agent status materialize --mission alpha-mission');
  });

  it('has no command and no note for a null remedy (positive control: the same finding with a remedy has one)', () => {
    const none = buildFindingView(make({ remedy: null }), ctx);
    expect(none.command).toBeNull();
    expect(none.commandNote).toBeNull();
    expect(buildFindingView(make({ remedy: 'materialize_status' }), ctx).command).not.toBeNull();
  });

  it('has no command and no note for a remedy the screen does not know', () => {
    const unknown = buildFindingView(make({ remedy: 'rebuild_everything' }), ctx);
    expect(unknown.command).toBeNull();
    expect(unknown.commandNote).toBeNull();
  });

  it('has one sentence and no command for a known remedy on a Mission the host does not list, or lists without a slug', () => {
    let ran = 0;
    for (const missionId of ['UNLISTED', 'OTHER']) {
      const view = buildFindingView(make({ missionId }), ctx);
      expect(view.command, missionId).toBeNull();
      expect(view.commandNote, missionId).toBe('This Mission was not found in the Missions list, so no command is shown.');
      ran += 1;
    }
    expect(ran).toBe(2);
    expect(buildFindingView(make({ missionId: 'UNLISTED' }), { missions: null, hooks: null }).commandNote).not.toBeNull();
  });

  it('shows the missionId for a Mission the host does not name', () => {
    expect(buildFindingView(make({ missionId: 'UNLISTED' }), ctx).mission).toEqual({ missionId: 'UNLISTED', slug: null, friendlyName: null });
    expect(buildFindingView(make({ missionId: 'OTHER' }), ctx).mission).toEqual({ missionId: 'OTHER', slug: null, friendlyName: 'No slug yet' });
  });

  it('does not take an inherited key for a Mission or a remedy', () => {
    expect(buildFindingView(make({ missionId: 'constructor' }), ctx).mission.slug).toBeNull();
    expect(buildFindingView(make({ remedy: 'constructor' }), ctx).command).toBeNull();
    expect(buildFindingView(make({ remedy: '__proto__' }), ctx).commandNote).toBeNull();
  });
});

describe('buildFindingView: the lane rows (FR-013)', () => {
  it('keeps differing rows only, in the given order, and reads a null side as the not-present word', () => {
    const view = buildFindingView(
      make({
        laneComparison: [
          { wpId: 'WP03', persistedStatusLane: 'done', derivedStatusLane: 'done' },
          { wpId: 'WP02', persistedStatusLane: null, derivedStatusLane: 'approved' },
          { wpId: 'WP01', persistedStatusLane: 'planned', derivedStatusLane: 'claimed' },
          { wpId: 'WP04', persistedStatusLane: null, derivedStatusLane: null },
        ],
      }),
      ctx,
    );
    expect(view.laneRows).toEqual([
      { wpId: 'WP02', persisted: 'not present', derived: 'approved' },
      { wpId: 'WP01', persisted: 'planned', derived: 'claimed' },
    ]);
  });

  it('shows a lane the screen has never seen as given, and goes through the lane hook', () => {
    const rows = [{ wpId: 'WP01', persistedStatusLane: 'genesis', derivedStatusLane: 'planned' }];
    expect(buildFindingView(make({ laneComparison: rows }), ctx).laneRows).toEqual([{ wpId: 'WP01', persisted: 'genesis', derived: 'planned' }]);
    const hooks: LabelHooks = { lane: (lane) => (lane === 'planned' ? 'queued' : undefined) };
    expect(buildFindingView(make({ laneComparison: rows }), { missions: names, hooks }).laneRows).toEqual([{ wpId: 'WP01', persisted: 'genesis', derived: 'queued' }]);
  });

  it('replaces the table with one sentence for a snapshot that is not valid JSON', () => {
    const corrupt = buildFindingView(make({ sourceCode: 'CORRUPT_JSON', laneComparison: [] }), ctx);
    expect(corrupt.laneRows).toEqual([]);
    expect(corrupt.laneNote).toBe('The snapshot is not a valid JSON object, so there are no lanes to compare.');
    // positive control: another code has no note
    expect(buildFindingView(make({ laneComparison: [] }), ctx).laneNote).toBeNull();
  });
});

describe('buildFindingView: foreign values fall back to the raw word (the error, warning and git collision)', () => {
  it('shows an unknown severity raw in the neutral tone, even when it is a word of another vocabulary', () => {
    let ran = 0;
    for (const severity of ['info', 'git', 'event_log', 'constructor']) {
      expect(buildFindingView(make({ severity }), ctx).kicker.severity, severity).toEqual({ word: severity, tone: 'neutral' });
      ran += 1;
    }
    expect(ran).toBe(4);
    // positive control: the two known severities keep their tones
    expect(buildFindingView(make({ severity: 'warning' }), ctx).kicker.severity).toEqual({ word: 'warning', tone: 'attention' });
  });

  it('does not lend the words of one vocabulary to another', () => {
    const view = buildFindingView(make({ authority: 'error', derivedSide: 'warning', kind: 'git' }), ctx);
    expect(view.authorityWord).toBe('error');
    expect(view.derivedSideWord).toBe('warning');
    expect(view.kicker.kind).toBe('git');
    const swapped = buildFindingView(make({ authority: 'status_json', derivedSide: 'event_log' }), ctx);
    expect(swapped.authorityWord).toBe('status_json');
    expect(swapped.derivedSideWord).toBe('event_log');
  });
});

describe('buildFindingView: the label hooks', () => {
  const hooks: LabelHooks = {
    kind: (kind) => (kind === 'lane_branch_missing' ? 'Branch gone' : undefined),
    severity: (severity) => (severity === 'error' ? { label: 'broken', tone: 'recovery' } : undefined),
    authority: (authority) => (authority === 'git' ? 'Git says so' : undefined),
    derivedSide: (side) => (side === 'lanes_json' ? 'The manifest' : undefined),
  };

  it('takes a hook over the default, and falls through to the default when the hook has no word', () => {
    const own = buildFindingView(makeDriftFinding(0), { missions: names, hooks });
    expect(own.kicker.kind).toBe('Branch gone');
    expect(own.authorityWord).toBe('Git says so');
    expect(own.derivedSideWord).toBe('The manifest');
    expect(buildFindingView(drift, { missions: names, hooks }).kicker.severity).toEqual({ word: 'broken', tone: 'recovery' });
    // falls through: the same hooks have no word for these
    const through = buildFindingView(drift, { missions: names, hooks });
    expect(through.kicker.kind).toBe('Snapshot disagrees');
    expect(through.authorityWord).toBe("The Mission's status event log");
    expect(through.derivedSideWord).toBe('status.json (the status snapshot)');
    expect(buildFindingView(make({ severity: 'warning' }), { missions: names, hooks }).kicker.severity).toEqual({ word: 'warning', tone: 'attention' });
  });
});
