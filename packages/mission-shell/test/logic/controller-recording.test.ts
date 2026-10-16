// A1: the literal expected recording (contracts/refresh-policy.md), replayed row by row through the SHIPPED controller,
// not through the scheduler-level harness. It closes the gap that the scheduler-level recording alone leaves: that
// createShellController wires the policy.
import { describe, expect, it } from 'vitest';
import { createFixtureClient, setConnectionState } from '../../src/client/fixture';
import { createShellController } from '../../src/controller/shell-controller';
import { formatRoute } from '../../src/core/routes';
import { sequenceCopy } from '../support/changes';
import { EXPECTED } from '../support/expected-recording';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';

describe('the recording through createShellController (SC-002, NFR-003)', () => {
  for (const row of EXPECTED) {
    it(`replays row: ${row.name}`, async () => {
      const fake = createFakeScheduler();
      const inner = createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } });
      const client = recordingClient(inner);
      const controller = createShellController({ client, mode: 'desktop', route: formatRoute(row.destination), scheduler: fake });
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

      expect(actual.length).toBe(row.steps.length);
      row.steps.forEach((reads, step) => {
        expect(actual[step], `refresh-policy mismatch on ${row.name}`).toEqual([...reads].sort());
      });
      controller.destroy();
    });
  }

  it('replays every row of the literal (twelve) and records reads for the rows that have them', () => {
    expect(EXPECTED.length).toBe(12);
    expect(EXPECTED.filter((row) => row.steps.flat().length > 0).length).toBe(11);
  });

  it('positive control: the shipped controller records the expected total of reads on Missions', async () => {
    const row = EXPECTED.find((candidate) => candidate.name === 'missions');
    if (!row) throw new Error('row missing');
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } });
    const client = recordingClient(inner);
    const controller = createShellController({ client, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    client.take();
    await fake.advance(1250);
    setConnectionState(inner, 'reconnecting');
    setConnectionState(inner, 'connected');
    await flushMicrotasks();
    // listMissions 5 changes + 1 resync, getProject 1 resync.
    expect(client.take().length).toBe(row.steps.flat().length);
    controller.destroy();
  });
});
