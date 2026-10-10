import { describe, expect, it } from 'vitest';
import * as defaults from '../src/defaults/index.js';
import * as health from '../src/defaults/health.js';
import * as copy from '../src/defaults/projects-copy.js';
import { missionCountText } from '../src/defaults/missions-copy.js';
import { lookup } from '../src/logic/index.js';

const HEALTH_NAMES = ['HEALTH_BADGES', 'UNKNOWN_HEALTH_TONE'];
const COPY_NAMES = [
  'PROJECTS_EYEBROW', 'PROJECTS_TITLE', 'PROJECTS_INTRO', 'OPEN_PROJECT_LABEL', 'RECENT_PROJECTS_EYEBROW', 'projectCountText',
  'VERSION_PREFIX', 'schemaVersionText', 'LOCAL_ONLY_TEXT', 'ACTIVE_PREFIX', 'ENTRY_LOADING_TEXT', 'ENTRY_ERROR_TEXT', 'ENTRY_UNAVAILABLE_TEXT',
  'ENTRY_RETRY_LABEL', 'UNNAMED_PROJECT_TEXT', 'LIST_LOADING_TEXT', 'LIST_EMPTY_TITLE', 'LIST_EMPTY_BODY', 'LIST_ERROR_BODY',
  'READ_ONLY_NOTICE', 'SKIP_LINK_TEXT', 'DIALOG_EYEBROW', 'DIALOG_TITLE', 'FOLDER_FIELD_LABEL', 'FOLDER_LIST_LABEL',
  'PARENT_FOLDER_TEXT', 'VALID_PROJECT_TEXT', 'DIALOG_HINT', 'CANCEL_LABEL', 'CONFIRM_LABEL', 'CLOSE_LABEL',
  'OPEN_DISABLED_REASON', 'FOLDERS_LOADING_TEXT', 'FOLDERS_EMPTY_TEXT', 'FOLDERS_ERROR_BODY',
];

describe('Projects defaults: the modules export exactly what contracts/defaults.md names', () => {
  it('has every named export, re-exported from the index as the same value', () => {
    expect(Object.keys(health).sort()).toEqual([...HEALTH_NAMES].sort());
    expect(Object.keys(copy).sort()).toEqual([...COPY_NAMES].sort());
    let ran = 0;
    for (const [mod, names] of [[health, HEALTH_NAMES], [copy, COPY_NAMES]] as const) {
      for (const n of names) {
        expect((defaults as Record<string, unknown>)[n], n).toBe((mod as Record<string, unknown>)[n]);
        ran += 1;
      }
    }
    expect(ran).toBe(2 + 35);
  });

  it('does not declare missionCountText a second time', () => {
    expect(Object.keys(copy)).not.toContain('missionCountText');
    expect(defaults.missionCountText).toBe(missionCountText);
  });
});

describe('health defaults', () => {
  it('has the two contract values with their ruled words and tones, one table', () => {
    expect(health.HEALTH_BADGES).toEqual({
      healthy: { label: 'healthy', tone: 'success' },
      schema_drift: { label: 'schema drift', tone: 'attention' },
    });
    expect(health.UNKNOWN_HEALTH_TONE).toBe('neutral');
  });

  it('reads an own key only, so a foreign value is absent (and renders as its own word at the caller)', () => {
    expect(lookup(health.HEALTH_BADGES, 'schema_drift')?.label).toBe('schema drift');
    expect(lookup(health.HEALTH_BADGES, 'degraded')).toBeUndefined();
    expect(lookup(health.HEALTH_BADGES, 'constructor')).toBeUndefined();
    expect(lookup(health.HEALTH_BADGES, '__proto__')).toBeUndefined();
  });
});

describe('Projects copy', () => {
  it('has the words of the contract', () => {
    expect(copy.PROJECTS_EYEBROW).toBe('Local workspace');
    expect(copy.PROJECTS_TITLE).toBe('Open a spec-kitty project');
    expect(copy.PROJECTS_INTRO).toBe('Choose a recent project or open a folder from this machine. Navigation appears after a project is selected.');
    expect(copy.OPEN_PROJECT_LABEL).toBe('Open project');
    expect(copy.RECENT_PROJECTS_EYEBROW).toBe('Recent projects');
    expect(copy.VERSION_PREFIX).toBe('v');
    expect(copy.LOCAL_ONLY_TEXT).toBe('local only');
    expect(copy.ACTIVE_PREFIX).toBe('active');
    expect(copy.ENTRY_LOADING_TEXT).toBe('Reading this project');
    expect(copy.ENTRY_ERROR_TEXT).toBe('Could not read this project');
    expect(copy.ENTRY_UNAVAILABLE_TEXT).toBe('This project is not available');
    expect(copy.ENTRY_RETRY_LABEL).toBe('Try again');
    expect(copy.UNNAMED_PROJECT_TEXT).toBe('Project');
    expect(copy.READ_ONLY_NOTICE).toBe('This release is a read-only view. Kitty Desktop never changes the selected project.');
    expect(copy.SKIP_LINK_TEXT).toBe('Skip to Projects');
  });

  it('has the dialog copy of the contract', () => {
    expect(copy.DIALOG_EYEBROW).toBe('Local filesystem');
    expect(copy.DIALOG_TITLE).toBe('Open Project');
    expect(copy.FOLDER_FIELD_LABEL).toBe('Project folder');
    expect(copy.FOLDER_LIST_LABEL).toBe('Folders');
    expect(copy.PARENT_FOLDER_TEXT).toBe('Parent folder');
    expect(copy.VALID_PROJECT_TEXT).toBe('valid project');
    expect(copy.DIALOG_HINT).toBe('A valid project contains .kittify/ and kitty-specs/. It will be opened read-only.');
    expect(copy.CONFIRM_LABEL).toBe('Open');
    expect(copy.CLOSE_LABEL).toBe('Close dialog');
  });

  it('counts projects with the singular only at one', () => {
    expect(copy.projectCountText(1)).toBe('1 project');
    expect(copy.projectCountText(0)).toBe('0 projects');
    expect(copy.projectCountText(2)).toBe('2 projects');
    expect(copy.projectCountText(50)).toBe('50 projects');
  });

  it('words the schema version for assistive technology', () => {
    expect(copy.schemaVersionText(3)).toBe('schema version 3');
    expect(copy.schemaVersionText(0)).toBe('schema version 0');
  });

  it('has every other string non-empty, and never the word "feature"', () => {
    let ran = 0;
    for (const n of COPY_NAMES) {
      const v = (copy as Record<string, unknown>)[n];
      if (typeof v === 'string') {
        expect(v.length, n).toBeGreaterThan(0);
        expect(v.toLowerCase(), n).not.toContain('feature');
        ran += 1;
      }
    }
    expect(ran).toBe(COPY_NAMES.length - 2);
  });
});
