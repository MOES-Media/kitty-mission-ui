// T009: buildOpsRow (plan D-03). Tone tables are data; absent facts are removed or quiet; unknown words show raw.
import { describe, expect, it } from 'vitest';
import {
  opsActorNull,
  opsClosedByAgent,
  opsClosedBySweep,
  opsEvidenceNull,
  opsEvidenceTextRedacted,
  opsEvidenceUrlRedacted,
  opsFailed,
  opsMissionOnly,
  opsNoMissionNoWp,
  opsOffsetStart,
  opsOpen,
  opsUnknownCloser,
  opsUnknownEvidenceKind,
  opsUnknownMode,
  opsUnknownOutcome,
} from '../src/contract/fixtures.generated.js';
import { OPS_VOCABULARY, type OpsVocabulary } from '../src/defaults/ops-copy.js';
import { buildOpsRow, type OpsFact } from '../src/logic/ops-row.js';
import type { OpsInvocationView } from '../src/contract/types.js';

const terms = (facts: OpsFact[]): string[] => facts.map((f) => f.term);
const fact = (facts: OpsFact[], term: string): OpsFact => {
  const found = facts.filter((f) => f.term === term);
  expect(found.length, `fact ${term}`).toBe(1);
  return found[0] as OpsFact;
};
const edit = (base: OpsInvocationView, over: Partial<OpsInvocationView>): OpsInvocationView => ({ ...structuredClone(base), ...over });

describe('buildOpsRow: the badge', () => {
  it('a non-null outcome gives the outcome word and tone', () => {
    expect(buildOpsRow(opsClosedByAgent, undefined, null).badge).toEqual({ word: 'done', tone: 'success' });
    expect(buildOpsRow(opsFailed, undefined, null).badge).toEqual({ word: 'failed', tone: 'danger' });
    expect(buildOpsRow(opsClosedBySweep, undefined, null).badge).toEqual({ word: 'abandoned', tone: 'attention' });
  });

  it('a null outcome gives the status word and tone', () => {
    expect(buildOpsRow(opsOpen, undefined, null).badge).toEqual({ word: 'open', tone: 'neutral' });
    expect(buildOpsRow(edit(opsOpen, { status: 'closed' }), undefined, null).badge).toEqual({ word: 'closed', tone: 'neutral' });
  });

  it('the outcome wins over the status when both are set (open with an outcome, defensive)', () => {
    expect(buildOpsRow(edit(opsOpen, { outcome: 'done' }), undefined, null).badge).toEqual({ word: 'done', tone: 'success' });
  });

  it('a closed Op with a null outcome shows the status word (defensive)', () => {
    expect(buildOpsRow(edit(opsClosedByAgent, { outcome: null }), undefined, null).badge).toEqual({ word: 'closed', tone: 'neutral' });
  });

  it('an unknown outcome shows its raw word with the neutral tone', () => {
    expect(buildOpsRow(opsUnknownOutcome, undefined, null).badge).toEqual({ word: 'paused', tone: 'neutral' });
  });

  it('an unknown status shows its raw word with the neutral tone', () => {
    expect(buildOpsRow(edit(opsOpen, { status: 'sleeping' as never }), undefined, null).badge).toEqual({ word: 'sleeping', tone: 'neutral' });
  });

  it('names that exist on every object are not words of the tables', () => {
    expect(buildOpsRow(edit(opsOpen, { status: 'constructor' as never }), undefined, null).badge).toEqual({ word: 'constructor', tone: 'neutral' });
    expect(buildOpsRow(edit(opsClosedByAgent, { outcome: '__proto__' }), undefined, null).badge).toEqual({ word: '__proto__', tone: 'neutral' });
  });

  it('the tone table is data: a vocabulary with another tone changes the badge, with no code change', () => {
    const vocab: OpsVocabulary = { ...OPS_VOCABULARY, outcomes: { ...OPS_VOCABULARY.outcomes, done: { word: 'finished', tone: 'info' } } };
    expect(buildOpsRow(opsClosedByAgent, vocab, null).badge).toEqual({ word: 'finished', tone: 'info' });
    // positive control: the default vocabulary is untouched
    expect(buildOpsRow(opsClosedByAgent, OPS_VOCABULARY, null).badge).toEqual({ word: 'done', tone: 'success' });
  });

  it('the outcome and status hooks reword the word and keep the tone', () => {
    const labels = { outcome: (w: string) => `O:${w}`, status: (w: string) => `S:${w}` };
    expect(buildOpsRow(opsClosedByAgent, undefined, labels).badge).toEqual({ word: 'O:done', tone: 'success' });
    expect(buildOpsRow(opsOpen, undefined, labels).badge).toEqual({ word: 'S:open', tone: 'neutral' });
    // a hook returning undefined falls back to the table word
    expect(buildOpsRow(opsOpen, undefined, { status: () => undefined }).badge).toEqual({ word: 'open', tone: 'neutral' });
  });

  it('the hook is called with the contract word, also for an unknown one', () => {
    const seen: string[] = [];
    buildOpsRow(opsUnknownOutcome, undefined, { outcome: (w) => (seen.push(w), undefined) });
    expect(seen).toEqual(['paused']);
  });
});

describe('buildOpsRow: the facts, in order', () => {
  it('an open Op with a Mission and Work Package: six base facts, then Mission, Work Package, Mode', () => {
    const row = buildOpsRow(opsOpen, undefined, null);
    expect(row.id).toBe(opsOpen.invocationId);
    expect(terms(row.facts)).toEqual(['Profile', 'Action', 'Actor', 'Started', 'Completed', 'Evidence', 'Mission', 'Work Package', 'Mode']);
    expect(row.facts.length).toBe(9);
  });

  it('a closed Op closed by a sweep also has Closed by, last', () => {
    const row = buildOpsRow(opsClosedBySweep, undefined, null);
    expect(terms(row.facts)).toEqual(['Profile', 'Action', 'Actor', 'Started', 'Completed', 'Evidence', 'Mode', 'Closed by']);
    expect(fact(row.facts, 'Closed by')).toEqual({ term: 'Closed by', value: 'sweep', mono: false, kind: 'text', datetime: null });
  });

  it('a closure by the agent draws no Closed by fact (positive control: the sweep draws it)', () => {
    const agent = buildOpsRow(opsClosedByAgent, undefined, null);
    expect(terms(agent.facts)).not.toContain('Closed by');
    expect(terms(buildOpsRow(opsClosedBySweep, undefined, null).facts)).toContain('Closed by');
  });

  it('the closer hook rewords the Closed by value, falls back to the table word, and never draws a closer that is not drawn', () => {
    const labels = { closer: (w: string) => (w === 'doctor_sweep' ? 'Swept' : undefined) };
    expect(fact(buildOpsRow(opsClosedBySweep, undefined, labels).facts, 'Closed by').value).toBe('Swept');
    // a hook that answers undefined falls back to the table word
    expect(fact(buildOpsRow(opsClosedBySweep, undefined, { closer: () => undefined }).facts, 'Closed by').value).toBe('sweep');
    // the hook is asked with the contract word, also for a word the table does not know
    expect(fact(buildOpsRow(opsUnknownCloser, undefined, { closer: (w) => `C:${w}` }).facts, 'Closed by').value).toBe(`C:${opsUnknownCloser.closedBy}`);
    // the agent is not drawn, even when the hook has a word for it
    expect(terms(buildOpsRow(opsClosedByAgent, undefined, { closer: () => 'Agent!' }).facts)).not.toContain('Closed by');
  });

  it('an unknown closer is drawn raw (a foreign value renders its text)', () => {
    const row = buildOpsRow(opsUnknownCloser, undefined, null);
    expect(fact(row.facts, 'Closed by').value).toBe(opsUnknownCloser.closedBy);
  });

  it('Mission and Work Package are removed when null, paired with rows that have them', () => {
    expect(terms(buildOpsRow(opsNoMissionNoWp, undefined, null).facts)).toEqual(['Profile', 'Action', 'Actor', 'Started', 'Completed', 'Evidence', 'Mode']);
    const missionOnly = buildOpsRow(opsMissionOnly, undefined, null);
    expect(terms(missionOnly.facts)).toContain('Mission');
    expect(terms(missionOnly.facts)).not.toContain('Work Package');
    expect(fact(buildOpsRow(opsOpen, undefined, null).facts, 'Work Package').value).toBe('WP03');
  });

  it('the values of the base facts are the served strings, in mono, with no re-formatting', () => {
    const row = buildOpsRow(opsClosedByAgent, undefined, null);
    expect(fact(row.facts, 'Profile')).toEqual({ term: 'Profile', value: 'reviewer-renata', mono: true, kind: 'text', datetime: null });
    expect(fact(row.facts, 'Action')).toEqual({ term: 'Action', value: 'review', mono: true, kind: 'text', datetime: null });
    expect(fact(row.facts, 'Actor')).toEqual({ term: 'Actor', value: 'codex', mono: true, kind: 'text', datetime: null });
    expect(fact(row.facts, 'Mission')).toEqual({ term: 'Mission', value: opsClosedByAgent.missionId, mono: true, kind: 'text', datetime: null });
    expect(fact(row.facts, 'Mode')).toEqual({ term: 'Mode', value: 'mission step', mono: false, kind: 'text', datetime: null });
  });

  it('Started and Completed are time facts: the UTC text, the served string in datetime', () => {
    const row = buildOpsRow(opsClosedByAgent, undefined, null);
    expect(fact(row.facts, 'Started')).toEqual({ term: 'Started', value: '5 Oct 2026, 11:02:30 UTC', mono: true, kind: 'time', datetime: opsClosedByAgent.startedAt });
    expect(fact(row.facts, 'Completed')).toEqual({ term: 'Completed', value: '5 Oct 2026, 11:41:10 UTC', mono: true, kind: 'time', datetime: opsClosedByAgent.completedAt });
  });

  it('a source offset is converted to UTC in the text and kept in datetime', () => {
    const row = buildOpsRow(opsOffsetStart, undefined, null);
    const started = fact(row.facts, 'Started');
    expect(started.datetime).toBe(opsOffsetStart.startedAt);
    expect(started.value).toMatch(/ UTC$/);
    expect(started.kind).toBe('time');
  });

  it('an unparsable instant is shown as given with no datetime', () => {
    const row = buildOpsRow(edit(opsClosedByAgent, { startedAt: 'yesterday-ish', completedAt: '2026-02-30T10:00:00Z' }), undefined, null);
    expect(fact(row.facts, 'Started')).toEqual({ term: 'Started', value: 'yesterday-ish', mono: true, kind: 'time', datetime: null });
    expect(fact(row.facts, 'Completed')).toEqual({ term: 'Completed', value: '2026-02-30T10:00:00Z', mono: true, kind: 'time', datetime: null });
  });

  it('the time hook rewords the text and not the datetime', () => {
    const row = buildOpsRow(opsClosedByAgent, undefined, { time: (iso) => `T(${iso})` });
    expect(fact(row.facts, 'Started')).toEqual({
      term: 'Started',
      value: `T(${opsClosedByAgent.startedAt})`,
      mono: true,
      kind: 'time',
      datetime: opsClosedByAgent.startedAt,
    });
  });
});

describe('buildOpsRow: quiet words', () => {
  it('a null actor is the quiet word "Not shown" (paired with a row that has an actor)', () => {
    expect(fact(buildOpsRow(opsActorNull, undefined, null).facts, 'Actor')).toEqual({ term: 'Actor', value: 'Not shown', mono: false, kind: 'quiet', datetime: null });
    expect(fact(buildOpsRow(opsOpen, undefined, null).facts, 'Actor').kind).toBe('text');
  });

  it('an open Op: Completed and Evidence are "Not recorded yet"', () => {
    const row = buildOpsRow(opsOpen, undefined, null);
    expect(fact(row.facts, 'Completed')).toEqual({ term: 'Completed', value: 'Not recorded yet', mono: false, kind: 'quiet', datetime: null });
    expect(fact(row.facts, 'Evidence')).toEqual({ term: 'Evidence', value: 'Not recorded yet', mono: false, kind: 'quiet', datetime: null });
    expect(row.evidence).toBeNull();
  });

  it('a closed Op with null evidence: Evidence is "Not recorded"', () => {
    const row = buildOpsRow(opsEvidenceNull, undefined, null);
    expect(fact(row.facts, 'Evidence')).toEqual({ term: 'Evidence', value: 'Not recorded', mono: false, kind: 'quiet', datetime: null });
    expect(row.evidence).toBeNull();
  });

  it('a closed Op with the evidence field omitted (invalid payload) shows "Not recorded" and does not throw', () => {
    const { evidence: omitted, ...rest } = opsClosedByAgent;
    expect(omitted).not.toBeNull();
    const row = buildOpsRow(rest as unknown as typeof opsClosedByAgent, undefined, null);
    expect(fact(row.facts, 'Evidence')).toEqual({ term: 'Evidence', value: 'Not recorded', mono: false, kind: 'quiet', datetime: null });
    expect(row.evidence).toBeNull();
    // positive control: with the field present the same Op draws its evidence
    expect(buildOpsRow(opsClosedByAgent, undefined, null).evidence).not.toBeNull();
  });

  // CONTRACT-001: an omitted optional field is the same as a null one, whichever field it is.
  const omit = (item: OpsInvocationView, key: keyof OpsInvocationView): OpsInvocationView => {
    const copy = structuredClone(item) as Record<string, unknown>;
    delete copy[key];
    return copy as unknown as OpsInvocationView;
  };

  it('an omitted actor is the quiet word "Not shown", never blank (positive control: the field present draws it)', () => {
    const row = buildOpsRow(omit(opsClosedByAgent, 'actor'), undefined, null);
    expect(fact(row.facts, 'Actor')).toEqual({ term: 'Actor', value: 'Not shown', mono: false, kind: 'quiet', datetime: null });
    expect(fact(buildOpsRow(opsClosedByAgent, undefined, null).facts, 'Actor').kind).toBe('text');
  });

  it('an omitted completedAt is the quiet word of the status, never blank (positive control: the field present draws a time)', () => {
    expect(fact(buildOpsRow(omit(opsClosedByAgent, 'completedAt'), undefined, null).facts, 'Completed')).toEqual({
      term: 'Completed',
      value: 'Not recorded',
      mono: false,
      kind: 'quiet',
      datetime: null,
    });
    expect(fact(buildOpsRow(omit(opsOpen, 'completedAt'), undefined, null).facts, 'Completed').value).toBe('Not recorded yet');
    expect(fact(buildOpsRow(opsClosedByAgent, undefined, null).facts, 'Completed').kind).toBe('time');
  });

  it('an omitted missionId or wpId draws no Mission or Work Package fact (positive control: present ones are drawn)', () => {
    const withBoth = buildOpsRow(edit(opsClosedByAgent, { missionId: 'm-1', wpId: 'WP01' }), undefined, null);
    expect(terms(withBoth.facts)).toContain('Mission');
    expect(terms(withBoth.facts)).toContain('Work Package');
    const row = buildOpsRow(omit(omit(edit(opsClosedByAgent, { missionId: 'm-1', wpId: 'WP01' }), 'missionId'), 'wpId'), undefined, null);
    expect(terms(row.facts)).not.toContain('Mission');
    expect(terms(row.facts)).not.toContain('Work Package');
    expect(terms(buildOpsRow(omit(edit(opsClosedByAgent, { missionId: 'm-1', wpId: 'WP01' }), 'missionId'), undefined, null).facts)).toEqual(
      terms(withBoth.facts).filter((t) => t !== 'Mission'),
    );
    expect(terms(buildOpsRow(omit(edit(opsClosedByAgent, { missionId: 'm-1', wpId: 'WP01' }), 'wpId'), undefined, null).facts)).toEqual(
      terms(withBoth.facts).filter((t) => t !== 'Work Package'),
    );
  });

  it('an omitted closedBy draws no Closed by fact (positive control: a sweep closure draws it)', () => {
    expect(terms(buildOpsRow(omit(opsClosedBySweep, 'closedBy'), undefined, null).facts)).not.toContain('Closed by');
    expect(terms(buildOpsRow(opsClosedBySweep, undefined, null).facts)).toContain('Closed by');
  });

  it('an omitted outcome shows the status word and sends it to the status hook, not the outcome hook', () => {
    const calls: string[] = [];
    const labels = {
      outcome: (w: string) => (calls.push(`outcome:${w}`), `O:${w}`),
      status: (w: string) => (calls.push(`status:${w}`), `S:${w}`),
    };
    expect(buildOpsRow(omit(opsClosedByAgent, 'outcome'), undefined, labels).badge).toEqual({ word: 'S:closed', tone: 'neutral' });
    expect(calls).toEqual(['status:closed']);
    // positive control: with the outcome present the outcome hook is the one asked
    calls.length = 0;
    expect(buildOpsRow(opsClosedByAgent, undefined, labels).badge.word).toBe('O:done');
    expect(calls).toEqual(['outcome:done']);
    expect(buildOpsRow(omit(opsClosedByAgent, 'outcome'), undefined, null).badge).toEqual({ word: 'closed', tone: 'neutral' });
  });

  it('a closed Op with a null completedAt (defensive) shows "Not recorded", not the open wording', () => {
    const row = buildOpsRow(edit(opsClosedByAgent, { completedAt: null }), undefined, null);
    expect(fact(row.facts, 'Completed')).toEqual({ term: 'Completed', value: 'Not recorded', mono: false, kind: 'quiet', datetime: null });
  });

  it('an unknown status with a null completedAt falls back to the closed wording', () => {
    const row = buildOpsRow(edit(opsOpen, { status: 'sleeping' as never }), undefined, null);
    expect(fact(row.facts, 'Completed').value).toBe('Not recorded');
  });

  it('the copy hook rewords a term and a quiet word', () => {
    const labels = { copy: (k: string) => (k === 'termActor' ? 'Who' : k === 'quietActor' ? 'Unknown' : undefined) };
    const row = buildOpsRow(opsActorNull, undefined, labels);
    expect(terms(row.facts)).toContain('Who');
    expect(terms(row.facts)).not.toContain('Actor');
    expect(fact(row.facts, 'Who').value).toBe('Unknown');
  });
});

describe('buildOpsRow: the evidence display', () => {
  it('the class word, the value and the changed flag', () => {
    const row = buildOpsRow(opsClosedByAgent, undefined, null);
    expect(row.evidence).toEqual({
      classWord: 'path',
      value: 'docs/reports/review-summary.md',
      changed: false,
      changedWord: 'changed',
      changedDescription: 'Host paths and e-mail addresses are replaced, or the text was cut.',
    });
    expect(fact(row.facts, 'Evidence')).toEqual({ term: 'Evidence', value: 'docs/reports/review-summary.md', mono: true, kind: 'evidence', datetime: null });
  });

  it('the changed flag is the contract redacted flag', () => {
    expect(buildOpsRow(opsEvidenceUrlRedacted, undefined, null).evidence).toMatchObject({ classWord: 'address', changed: true });
    expect(buildOpsRow(opsEvidenceTextRedacted, undefined, null).evidence).toMatchObject({ classWord: 'text', changed: true });
  });

  it('an unknown evidence class shows its raw word', () => {
    const row = buildOpsRow(opsUnknownEvidenceKind, undefined, null);
    expect(row.evidence?.classWord).toBe(opsUnknownEvidenceKind.evidence?.kind);
    expect(row.evidence?.value).toBe(opsUnknownEvidenceKind.evidence?.value);
  });

  it('the evidence class hook rewords the class word', () => {
    expect(buildOpsRow(opsClosedByAgent, undefined, { evidenceClass: (w) => `C:${w}` }).evidence?.classWord).toBe('C:repo_path');
  });

  it('the evidence value is carried verbatim: markup, spaces and bidi text are not touched', () => {
    const value = '<b>x</b> ‮abc  def';
    const row = buildOpsRow(edit(opsClosedByAgent, { evidence: { kind: 'text', value, redacted: false } }), undefined, null);
    expect(row.evidence?.value).toBe(value);
    expect(fact(row.facts, 'Evidence').value).toBe(value);
  });
});

describe('buildOpsRow: modes', () => {
  it('maps every mode word, unknown shown raw', () => {
    const cases: Array<[string, string]> = [
      ['task_execution', 'task execution'],
      ['advisory', 'advisory'],
      ['mission_step', 'mission step'],
      ['query', 'query'],
    ];
    for (const [word, want] of cases) {
      expect(fact(buildOpsRow(edit(opsOpen, { modeOfWork: word }), undefined, null).facts, 'Mode').value, word).toBe(want);
    }
    expect(cases.length).toBe(4);
    expect(fact(buildOpsRow(opsUnknownMode, undefined, null).facts, 'Mode').value).toBe(opsUnknownMode.modeOfWork);
  });

  it('the mode hook rewords the word', () => {
    expect(fact(buildOpsRow(opsOpen, undefined, { mode: (w) => `M:${w}` }).facts, 'Mode').value).toBe('M:task_execution');
  });
});

describe('buildOpsRow: a pure function of one item', () => {
  it('does not change the item and returns a new row each time', () => {
    const item = structuredClone(opsClosedByAgent);
    const a = buildOpsRow(item, undefined, null);
    const b = buildOpsRow(item, undefined, null);
    expect(item).toEqual(opsClosedByAgent);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('keeps the order of the facts of every fixture: the same ten terms in the same relative order', () => {
    const order = ['Profile', 'Action', 'Actor', 'Started', 'Completed', 'Evidence', 'Mission', 'Work Package', 'Mode', 'Closed by'];
    const items = [opsOpen, opsClosedByAgent, opsClosedBySweep, opsActorNull, opsNoMissionNoWp, opsMissionOnly, opsEvidenceNull, opsFailed];
    let ran = 0;
    for (const item of items) {
      const got = terms(buildOpsRow(item, undefined, null).facts);
      expect(got, item.invocationId).toEqual(order.filter((t) => got.includes(t)));
      ran += 1;
    }
    expect(ran).toBe(8);
  });
});
