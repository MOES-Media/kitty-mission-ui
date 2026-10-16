// NFR-001 on a mounted property: a status-transition for the displayed Mission reaches the Pipeline element's property
// within 150 ms of fake time when the re-read answers at 120 ms. The old value is asserted first (positive control).
import { afterEach, describe, expect, it } from 'vitest';
import { tick } from 'svelte';
import type { Ok } from '../../src/client/port';
import { createFakeScheduler } from '../support/fake-scheduler';
import { createDeferredClient } from '../support/deferred-client';
import examples from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import changes from '../../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import { M, destroyAll, mountAt, screenElement, settle } from './helpers';

afterEach(destroyAll);

type Detail = Ok<'getMission'>;

describe('a change reaches the mounted screen within the budget (NFR-001)', () => {
  it('latency: the Pipeline property holds the new value by 150 ms, and the old one before the re-read answers', async () => {
    const scheduler = createFakeScheduler();
    const client = createDeferredClient('connected');
    const served = structuredClone(examples['MissionDetail.populated'].value) as Detail;
    const harness = await mountAt(`/missions/${M}`, { scheduler, client });

    // The first read of the Mission is answered.
    const first = client.calls.find((call) => call.op === 'getMission');
    expect(first, 'the Pipeline reads the Mission on mount').toBeDefined();
    client.resolveAt(first?.index ?? -1, { ok: true, value: served });
    await settle(harness);
    const element = screenElement<HTMLElement & { mission: Detail | null }>(harness.shell, 'sk-pipeline-screen');
    expect(element.mission?.friendlyName).toBe(served.friendlyName);

    // The change arrives; its re-read is deferred.
    const transition = changes.items.find((item) => item.event === 'status-transition');
    expect(transition).toBeDefined();
    const reads = client.calls.filter((call) => call.op === 'getMission').length;
    client.emit({ kind: 'status-transition', cursor: null, data: transition?.data } as never);
    await harness.scheduler.advance(0);
    // The stream coalesces for a short window before it issues the read.
    await settle(harness, 100);
    const pending = client.calls.filter((call) => call.op === 'getMission' && !call.settled);
    expect(client.calls.filter((call) => call.op === 'getMission').length, 'the change caused one re-read').toBe(reads + 1);
    expect(pending.length).toBe(1);

    // Before the answer the property still holds the old value.
    const updated = { ...served, friendlyName: 'Renamed after the change' } as Detail;
    expect(element.mission?.friendlyName, 'old value before the re-read answers').toBe(served.friendlyName);

    const issuedAt = scheduler.now();
    await settle(harness, Math.max(0, 120 - issuedAt));
    expect(scheduler.now()).toBeGreaterThanOrEqual(120);
    client.resolveAt(pending[0]?.index ?? -1, { ok: true, value: updated });
    await settle(harness);
    await tick();
    expect(scheduler.now(), 'answered at or after 120 ms and inside the budget').toBeLessThanOrEqual(150);
    expect(element.mission?.friendlyName).toBe('Renamed after the change');
  });
});
