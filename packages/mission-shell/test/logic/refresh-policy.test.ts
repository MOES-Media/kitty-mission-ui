import { describe, expect, it } from 'vitest';
import { createFixtureClient, setConnectionState } from '../../src/client/fixture';
import type { Change } from '../../src/client/port';
import { displayedKeys } from '../../src/core/displayed';
import { isStreamChange, refreshKeys, REFRESH_POLICY } from '../../src/core/refresh-policy';
import { sequenceCopy } from '../support/changes';
import { mountEngine } from '../support/engine-harness';
import { EXPECTED, M, O, P } from '../support/expected-recording';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';

const STEP_NAMES = ['C1 mission-lifecycle', 'C2 status-transition', 'C3 status-transition', 'C4 log-truncated', 'C5 status-transition', 'resync'];

const transition = (missionId: string, wpId: string): Change => ({
  kind: 'status-transition',
  cursor: null,
  data: { missionId, wpId } as never,
});
const lifecycle = (missionId: string): Change => ({ kind: 'mission-lifecycle', cursor: null, data: { missionId } as never });
const truncated = (missionId: string): Change => ({ kind: 'log-truncated', cursor: null, data: { missionId } as never });
const resync: Change = { kind: 'resync', cursor: null, reason: 'reconnected' };

const selectedBy = (change: Change, screen: Parameters<typeof displayedKeys>[0]): string[] =>
  refreshKeys(change, displayedKeys(screen)).map((key) => JSON.stringify(key));

describe('the recording (SC-002, NFR-003)', () => {
  for (const row of EXPECTED) {
    it(`recording: ${row.name}`, async () => {
      const fake = createFakeScheduler();
      const inner = createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } });
      const client = recordingClient(inner);
      const engine = mountEngine({ client, destination: row.destination, scheduler: fake });
      // The initial reads are flushed before the scheduler advances; they are not part of the recording.
      await flushMicrotasks();
      client.take();

      const actual: string[][] = [];
      for (let change = 0; change < 5; change += 1) {
        await fake.advance(250);
        actual.push(client.take().sort());
      }
      setConnectionState(inner, 'reconnecting');
      setConnectionState(inner, 'connected');
      await flushMicrotasks();
      actual.push(client.take().sort());

      row.steps.forEach((reads, step) => {
        expect(actual[step], `refresh-policy mismatch on ${row.name} (${STEP_NAMES[step] ?? 'step'})`).toEqual([...reads].sort());
      });
      engine.dispose();
    });
  }

  it('recording: positive control, every row with reads records them with their parameters', async () => {
    let total = 0;
    for (const row of EXPECTED) {
      const expected = row.steps.flat();
      if (expected.length === 0) continue;
      const fake = createFakeScheduler();
      const inner = createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } });
      const client = recordingClient(inner);
      const engine = mountEngine({ client, destination: row.destination, scheduler: fake });
      await flushMicrotasks();
      client.take();
      await fake.advance(1250);
      setConnectionState(inner, 'reconnecting');
      setConnectionState(inner, 'connected');
      await flushMicrotasks();
      const reads = client.take();
      expect(reads.length, `refresh-policy positive control on ${row.name}`).toBe(expected.length);
      total += reads.length;
      engine.dispose();
    }
    expect(total).toBeGreaterThan(0);
  });

  it('recording: a work package read carries its identifiers', async () => {
    const row = EXPECTED.find((candidate) => candidate.name === 'work package M WP02');
    if (!row) throw new Error('row missing');
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } });
    const client = recordingClient(inner);
    mountEngine({ client, destination: row.destination, scheduler: fake });
    await flushMicrotasks();
    expect(client.take().sort()).toEqual(
      [
        `getMission {"path":{"missionId":"${M}"}}`,
        `getWorkPackage {"path":{"missionId":"${M}","wpId":"WP02"}}`,
        `getWorkPackageDetail {"path":{"missionId":"${M}","wpId":"WP02"}}`,
      ].sort(),
    );
  });

  it('recording: the engine subscribes once and never passes a scope', async () => {
    const fake = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler: fake, fixtures: { changes: sequenceCopy() } }));
    const engine = mountEngine({ client, destination: { screen: 'missions' }, scheduler: fake });
    expect(client.counts.subscribe).toBe(1);
    expect(client.subscribeCalls).toEqual([undefined]);
    engine.dispose();
    expect(client.counts.unsubscribe).toBe(1);
  });
});

describe('refreshKeys', () => {
  it('selects only the Mission row for a WP01 transition on WP Packages M/WP02', () => {
    expect(selectedBy(transition(M, 'WP01'), { screen: 'work-packages', missionId: M, wpId: 'WP02' })).toEqual([
      JSON.stringify({ kind: 'mission', missionId: M }),
    ]);
  });

  it('selects nothing on Pipeline M for a change about another Mission, but missions on Missions', () => {
    expect(selectedBy(truncated(O), { screen: 'pipeline', missionId: M })).toEqual([]);
    expect(selectedBy(truncated(O), { screen: 'missions' })).toEqual([JSON.stringify({ kind: 'missions' })]);
  });

  it('selects nothing on Drift for a status transition, and nothing on Projects for a resync', () => {
    expect(selectedBy(transition(M, 'WP01'), { screen: 'drift', missionId: M })).toEqual([]);
    expect(selectedBy(resync, { screen: 'projects' })).toEqual([]);
  });

  it('never selects mission-names as the Missions list', () => {
    expect(selectedBy(lifecycle(M), { screen: 'drift' })).toEqual([]);
    expect(selectedBy(resync, { screen: 'drift' })).toHaveLength(3);
  });

  it('selects drift of the Mission but never the whole-project drift on a truncation', () => {
    expect(selectedBy(truncated(M), { screen: 'drift', missionId: M })).toEqual([JSON.stringify({ kind: 'drift', missionId: M })]);
    expect(selectedBy(truncated(M), { screen: 'drift' })).toEqual([]);
  });

  it('selects nothing for a refused subscription', () => {
    const refused: Change = { kind: 'refused', cursor: null, refusal: { status: 400, body: {} } as never };
    expect(selectedBy(refused, { screen: 'missions' })).toEqual([]);
  });

  it('returns each key once, in the displayed order', () => {
    const keys = displayedKeys({ screen: 'artifacts', missionId: M, path: P });
    expect(refreshKeys(truncated(M), [...keys, ...keys]).map((key) => key.kind)).toEqual(['mission', 'artifacts', 'artifact']);
  });

  it('coalesces the three stream rows only', () => {
    expect(Object.keys(REFRESH_POLICY).filter((kind) => isStreamChange(kind as Change['kind']))).toEqual([
      'status-transition',
      'mission-lifecycle',
      'log-truncated',
    ]);
  });
});
