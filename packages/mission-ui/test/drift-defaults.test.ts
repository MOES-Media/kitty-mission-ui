import { describe, expect, it } from 'vitest';
import * as defaults from '../src/defaults/index.js';
import * as copy from '../src/defaults/drift-copy.js';
import { resolveLaneLabel } from '../src/logic/index.js';

const NAMED = [
  'DRIFT_TITLE', 'DRIFT_SUBTITLE', 'RESCAN_LABEL', 'RESCANNING_LABEL', 'LAST_SCAN_TEXT', 'FINDINGS_COUNT_TEXT', 'SEVERITY_WORDS',
  'SEVERITY_ROLLUP_TEXT', 'KIND_COPY', 'AUTHORITY_WORDS', 'DERIVED_SIDE_WORDS', 'REMEDY_COMMANDS', 'NOT_PRESENT_WORD',
  'LANE_TABLE_HEADERS', 'CORRUPT_JSON_NOTE', 'LANE_NOTES', 'UNKNOWN_MISSION_COMMAND_NOTE', 'COPY_LABEL', 'COPY_RESULT_TEXT',
  'CLEAN_HEADING', 'CLEAN_BODY', 'TRUNCATION_TEXT', 'CHOOSE_HEADING', 'STALE_SELECTION_NOTE', 'REFUSAL_WORDS', 'REFUSAL_GENERIC',
  'RETRY_LABEL', 'DRIFT_NOT_FOUND_HEADING', 'DRIFT_NOT_FOUND_BODY', 'RETURN_TO_MISSIONS_LABEL', 'DRIFT_LOADING_LABEL', 'RESCANNED_TEXT', 'RESCAN_UNCHANGED_ANNOUNCEMENT', 'ANNOUNCEMENT_SEPARATOR',
  'READY_ANNOUNCEMENT', 'ERROR_ANNOUNCEMENT', 'FINDINGS_LIST_LABEL',
  'DRIFT_AUTHORITY_TITLE', 'DRIFT_FACTS_TITLE', 'DRIFT_FACT_MISSION', 'DRIFT_FACT_FILE', 'DRIFT_FACT_DERIVED_SIDE', 'DRIFT_RESOLUTION_TITLE',
  'LANE_TABLE_LABEL', 'LANE_TABLE_SCROLLER_LABEL', 'COPY_MANUAL_FALLBACK', 'RESCANNING_ANNOUNCEMENT', 'COPY_ACCESSIBLE_LABEL', 'ROLLUP_SHOWN_TEXT',
];

describe('drift-copy: the labels of the detail exist in defaults (drift-part-copy.test.ts enforces that the part files hold no copy)', () => {
  it('has the words the detail draws, and the S5 fallback never claims the command is selected', () => {
    expect([copy.DRIFT_AUTHORITY_TITLE, copy.DRIFT_FACTS_TITLE, copy.DRIFT_FACT_MISSION, copy.DRIFT_FACT_FILE, copy.DRIFT_FACT_DERIVED_SIDE, copy.DRIFT_RESOLUTION_TITLE]).toEqual([
      'Authoritative side', 'Facts', 'Mission', 'File', 'Derived side', 'Suggested resolution',
    ]);
    expect(copy.LANE_TABLE_LABEL).toBe('Status lane comparison');
    expect(copy.LANE_TABLE_SCROLLER_LABEL).not.toBe(copy.LANE_TABLE_LABEL);
    expect(copy.COPY_MANUAL_FALLBACK).toBe('Select the command and copy it with your keyboard.');
    expect(copy.COPY_MANUAL_FALLBACK).not.toMatch(/is selected/);
    expect(copy.COPY_RESULT_TEXT.manual).toMatch(/is selected/);
  });
});

describe('drift-copy: the module exports exactly the named constants, re-exported from the index as the same value', () => {
  it('has every name once', () => {
    expect(Object.keys(copy).sort()).toEqual([...NAMED].sort());
    let ran = 0;
    for (const n of NAMED) {
      expect((defaults as Record<string, unknown>)[n], n).toBe((copy as Record<string, unknown>)[n]);
      ran += 1;
    }
    expect(ran).toBe(49);
  });

  it('does not redeclare a name of the Work Package copy (the collisions are prefixed)', () => {
    expect(defaults.NOT_FOUND_HEADING).toBe('Task detail unavailable');
    expect(defaults.LOADING_LABEL).toBe('Reading local Mission index');
    expect(copy.DRIFT_NOT_FOUND_HEADING).toBe('Mission not found');
  });
});

describe('drift-copy: words, sentences and templates', () => {
  it('has the title, labels and short copy of the contract', () => {
    expect(copy.DRIFT_TITLE).toBe('Drift');
    expect(copy.DRIFT_SUBTITLE).toBe('Derived state checked against the event log and git');
    expect(copy.RESCAN_LABEL).toBe('Rescan');
    expect(copy.RESCANNING_LABEL).toBe('Rescanning');
    expect(copy.NOT_PRESENT_WORD).toBe('not present');
    expect(copy.LANE_TABLE_HEADERS).toEqual(['Work Package', 'status.json', 'Event log']);
    expect(copy.COPY_LABEL).toBe('Copy');
    expect(copy.CLEAN_HEADING).toBe('No drift found');
    expect(copy.CHOOSE_HEADING).toBe('Choose a finding');
    expect(copy.STALE_SELECTION_NOTE).toBe('The selected finding is not in this scan.');
    expect(copy.RETRY_LABEL).toBe('Try again');
    expect(copy.FINDINGS_LIST_LABEL).toBe('Drift findings');
    expect(copy.DRIFT_NOT_FOUND_BODY).toBe('No Mission has this identity.');
    expect(copy.RETURN_TO_MISSIONS_LABEL).toBe('Return to Missions');
    expect(copy.DRIFT_LOADING_LABEL).toBe('Loading drift scan');
    expect(copy.UNKNOWN_MISSION_COMMAND_NOTE).toBe('This Mission was not found in the Missions list, so no command is shown.');
    expect(copy.CORRUPT_JSON_NOTE).toBe('The snapshot is not a valid JSON object, so there are no lanes to compare.');
  });

  it('builds the count, scan and truncation text, singular and plural', () => {
    expect(copy.FINDINGS_COUNT_TEXT(1)).toBe('1 finding');
    expect(copy.FINDINGS_COUNT_TEXT(0)).toBe('0 findings');
    expect(copy.FINDINGS_COUNT_TEXT(1000)).toBe('1000 findings');
    expect(copy.LAST_SCAN_TEXT('5 minutes ago')).toBe('last scan 5 minutes ago');
    expect(copy.TRUNCATION_TEXT(7)).toBe('Showing the first 7 findings.');
  });

  it('rolls severities up in the order given, with the count equal to the number given', () => {
    expect(copy.SEVERITY_ROLLUP_TEXT([{ count: 2, word: 'error', plural: 'errors' }, { count: 3, word: 'warning', plural: 'warnings' }])).toBe('2 errors, 3 warnings');
    expect(copy.SEVERITY_ROLLUP_TEXT([{ count: 1, word: 'error', plural: 'errors' }])).toBe('1 error');
    expect(copy.SEVERITY_ROLLUP_TEXT([])).toBe('');
    // a word with no plural (unknown to the table, or from a label hook) is printed as given, with its count
    expect(copy.SEVERITY_ROLLUP_TEXT([{ count: 2, word: 'critical', plural: null }, { count: 1, word: 'info', plural: null }])).toBe('critical: 2, info: 1');
    expect(copy.ROLLUP_SHOWN_TEXT('2 errors')).toBe('Among the shown findings: 2 errors');
  });

  it('words the severities with a tone, error as danger and warning as attention', () => {
    expect(copy.SEVERITY_WORDS).toEqual({ error: { word: 'error', plural: 'errors', tone: 'danger' }, warning: { word: 'warning', plural: 'warnings', tone: 'attention' } });
  });

  it('words the authority, the derived side and the copy results', () => {
    expect(copy.AUTHORITY_WORDS).toEqual({ event_log: "The Mission's status event log", git: 'Local git branches' });
    expect(copy.DERIVED_SIDE_WORDS).toEqual({ status_json: 'status.json (the status snapshot)', lanes_json: 'lanes.json (the lane manifest)' });
    expect(copy.COPY_RESULT_TEXT).toEqual({ copied: 'Copied', manual: 'Copy it with your keyboard: the command is selected.' });
  });

  it('builds the one command from the remedy and the slug, as given', () => {
    expect(Object.keys(copy.REMEDY_COMMANDS)).toEqual(['materialize_status']);
    expect(copy.REMEDY_COMMANDS.materialize_status?.('alpha-mission')).toBe('spec-kitty agent status materialize --mission alpha-mission');
  });

  it('has the kicker and explanation of each kind and the overrides of the source codes, never naming a branch or a missing file', () => {
    expect(Object.keys(copy.KIND_COPY)).toEqual(['snapshot_disagrees_with_event_log', 'snapshot_or_event_log_missing', 'lane_branch_missing']);
    expect(copy.KIND_COPY.snapshot_disagrees_with_event_log?.kicker).toBe('Snapshot disagrees');
    expect(copy.KIND_COPY.snapshot_or_event_log_missing?.kicker).toBe('Status file missing');
    expect(copy.KIND_COPY.lane_branch_missing?.kicker).toBe('Lane branch missing');
    // CONTRACT-010 (b): this kind is only ever seen with a source code, so it has no sentence of its own (a null code gives none).
    expect(copy.KIND_COPY.snapshot_disagrees_with_event_log?.explanation).toBeUndefined();
    expect(copy.KIND_COPY.snapshot_disagrees_with_event_log?.bySourceCode).toEqual({
      SNAPSHOT_DRIFT: "status.json differs from what the event log gives when it is replayed at the snapshot's own generation.",
      SNAPSHOT_DRIFT_PROVENANCE: 'Only provenance fields differ; the lanes agree.',
      SNAPSHOT_DRIFT_TERMINAL: 'The files differ and every work package is done.',
      CORRUPT_JSON: 'status.json could not be read as a JSON object.',
    });
    expect(copy.KIND_COPY.snapshot_or_event_log_missing?.explanation).toBe('One of status.json and status.events.jsonl is missing. The event log is the record that decides.');
    expect(copy.KIND_COPY.lane_branch_missing?.explanation).toBe(
      'A lane or Mission branch the lane manifest relies on has no local branch. No branch is created or changed from this view.',
    );
    // Gaps 8 and 16: never "out of date", never a claim about which file is missing, never a repair claim
    let ran = 0;
    for (const entry of Object.values(copy.KIND_COPY)) {
      for (const text of [...(entry.explanation === undefined ? [] : [entry.explanation]), ...Object.values(entry.bySourceCode ?? {})]) {
        expect(text, text).not.toMatch(/out of date|out-of-date|consistent|repair/i);
        ran += 1;
      }
    }
    expect(ran).toBe(6);
  });

  it('keys the lane note by source code', () => {
    expect(copy.LANE_NOTES).toEqual({ CORRUPT_JSON: copy.CORRUPT_JSON_NOTE });
  });

  it('words the unreadable scan and a generic refusal', () => {
    expect(copy.REFUSAL_WORDS).toEqual({ drift_scan_unreadable: 'The scan could not read a Mission, so no report is shown.' });
    expect(copy.REFUSAL_GENERIC).toBe('The drift scan could not be loaded.');
  });

  it('never says everything is consistent on a clean scan, and never says "feature"', () => {
    expect(copy.CLEAN_BODY).toBe(
      'The last scan found no disagreement between the status files and the event log, and no missing lane branch it could check.',
    );
    let ran = 0;
    for (const [name, value] of Object.entries(copy)) {
      if (typeof value === 'string') {
        expect(value, name).not.toMatch(/feature/i);
        expect(value, name).not.toMatch(/consistent/i);
        ran += 1;
      }
    }
    expect(ran).toBe(32);
  });

  it('carries the announcement texts of the live region', () => {
    expect(copy.RESCANNED_TEXT(3, 'just now')).toBe('Rescanned: 3 findings, last scan just now');
    expect(copy.READY_ANNOUNCEMENT(1, 'just now')).toBe('Drift scan loaded: 1 finding, last scan just now');
    expect(copy.ERROR_ANNOUNCEMENT('The drift scan could not be loaded.')).toBe('Drift scan unavailable. The drift scan could not be loaded.');
  });

  it('carries no hard-coded count of findings', () => {
    expect(copy.TRUNCATION_TEXT(1000)).toBe('Showing the first 1000 findings.');
    expect(copy.TRUNCATION_TEXT(2)).toBe('Showing the first 2 findings.');
  });
});

describe('the lane words stay with the existing lane vocabulary', () => {
  it('resolves a lane through the existing table, not a copy of it', () => {
    expect(resolveLaneLabel('in_progress', null)).toBe('in progress');
    expect(Object.keys(copy)).not.toContain('LANE_LABELS');
  });
});
