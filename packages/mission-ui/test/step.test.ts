import { describe, expect, it } from 'vitest';
import { detailAllComplete, detailAllPending, detailBothInProgress, detailImplement, detailPhases3 } from '../src/contract/fixtures.generated.js';
import type { MissionDetailView } from '../src/contract/types.js';
import { CURRENT_STEP_PREFIX, NO_STEP_TEXT } from '../src/defaults/index.js';
import { currentStep } from '../src/logic/step.js';

const view = (m: unknown): MissionDetailView => m as MissionDetailView;

describe('currentStep', () => {
  it('shows the next action verbatim when there is one, ahead of any phase', () => {
    const m = view({ ...detailImplement, nextAction: 'Run the thing, then the other thing.' });
    expect(currentStep(m, null)).toBe('Run the thing, then the other thing.');
  });

  it('an empty next action is still a next action: it is shown as is, not replaced by a phase (F-03)', () => {
    const m = view({ ...detailImplement, nextAction: '' });
    expect(currentStep(m, null)).toBe('');
  });

  it('names the first current phase when there is no next action', () => {
    const m = view({ ...detailImplement, nextAction: null });
    const first = m.phases.find((p) => p.status === 'in_progress');
    expect(first).toBeDefined();
    expect(currentStep(m, { phase: (name) => `[${name}]` })).toBe(`${CURRENT_STEP_PREFIX}[${first?.name}]`);
  });

  it('takes the FIRST current phase in array order when two are current', () => {
    const m = view({ ...detailBothInProgress, nextAction: null });
    const current = m.phases.filter((p) => p.status === 'in_progress');
    expect(current.length).toBe(2);
    const text = currentStep(m, { phase: (name) => `[${name}]` });
    expect(text).toBe(`${CURRENT_STEP_PREFIX}[${current[0]?.name}]`);
  });

  it('uses the phase label hook, and the raw name for a phase nobody knows', () => {
    const m = view({ ...detailPhases3, nextAction: null, phases: [{ name: 'discover', status: 'complete', basis: 'artifact' }, { name: 'shape', status: 'in_progress', basis: 'artifact' }] });
    expect(currentStep(m, null)).toBe(`${CURRENT_STEP_PREFIX}shape`);
    expect(currentStep(m, { phase: (n) => n.toUpperCase() })).toBe(`${CURRENT_STEP_PREFIX}SHAPE`);
  });

  it('says no step is in progress when every phase is pending, and when every phase is complete', () => {
    expect(currentStep(view({ ...detailAllPending, nextAction: null }), null)).toBe(NO_STEP_TEXT);
    expect(currentStep(view({ ...detailAllComplete, nextAction: null }), null)).toBe(NO_STEP_TEXT);
  });

  it('says no step is in progress when there are no phases at all', () => {
    expect(currentStep(view({ ...detailAllPending, nextAction: null, phases: [] }), null)).toBe(NO_STEP_TEXT);
  });

  it('the three texts are distinct', () => {
    expect(new Set([NO_STEP_TEXT, CURRENT_STEP_PREFIX.trim(), 'x']).size).toBe(3);
  });
});
