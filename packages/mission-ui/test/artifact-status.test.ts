import { describe, expect, it } from 'vitest';
import { VIEW_STATES } from '../src/view-state.js';
import {
  ARTIFACT_CONTENT_STATUSES,
  ARTIFACT_STATUSES,
  ARTIFACT_TABS,
  normaliseArtifactStatus,
  normaliseArtifactView,
  normaliseContentStatus,
} from '../src/logic/artifact-status.js';

describe('the screen normalisers: one closed list per property, an unknown value never throws', () => {
  it('lists the view states plus the two screen states, in order, and leaves view-state.ts alone', () => {
    expect(ARTIFACT_STATUSES).toEqual([...VIEW_STATES, 'not-found', 'nothing-selected']);
    expect(VIEW_STATES.length).toBe(4);
    expect(ARTIFACT_CONTENT_STATUSES).toEqual(['loading', 'ready', 'refused', 'error']);
    expect(ARTIFACT_TABS).toEqual(['rendered', 'raw']);
  });

  it('keeps every member of each list', () => {
    let ran = 0;
    for (const s of ARTIFACT_STATUSES) {
      expect(normaliseArtifactStatus(s), s).toBe(s);
      ran += 1;
    }
    for (const s of ARTIFACT_CONTENT_STATUSES) {
      expect(normaliseContentStatus(s), s).toBe(s);
      ran += 1;
    }
    for (const s of ARTIFACT_TABS) {
      expect(normaliseArtifactView(s), s).toBe(s);
      ran += 1;
    }
    expect(ran).toBe(6 + 4 + 2);
  });

  it('collapses an unknown status to empty, an unknown content status to ready and an unknown view to rendered', () => {
    for (const bad of ['', 'bogus', 'READY', null, undefined, 7, {}, [], 'constructor']) {
      expect(normaliseArtifactStatus(bad), String(bad)).toBe('empty');
      expect(normaliseContentStatus(bad), String(bad)).toBe('ready');
      expect(normaliseArtifactView(bad), String(bad)).toBe('rendered');
    }
  });
});

// Deliberate revert (D-34 rule 4): make normaliseContentStatus fall back to 'loading'; "collapses an unknown status to
// empty, an unknown content status to ready and an unknown view to rendered" fails.
