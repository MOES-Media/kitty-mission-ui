// The injected changes of the refresh-policy test: a deep copy of the shared sequence with item 1's `delayMs` set to 250,
// so every change arrives outside the initial reads' 100 ms window (R2-02). The fixture file stays unchanged.
import changesJson from '../../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import type { ChangesEnvelope } from '../../src/client/fixture';

/** The mission of the sequence. */
export const MISSION_ID = changesJson.missionId;

export function sequenceCopy(): ChangesEnvelope {
  const copy = structuredClone(changesJson) as ChangesEnvelope;
  const first = copy.items[0];
  if (!first) throw new Error('changes copy: the sequence has no first item');
  first.delayMs = 250;
  return copy;
}

/** Five `status-transition` items for the mission with the given delays, for the coalescing tests. */
export function burst(delays: readonly number[]): ChangesEnvelope {
  const template = changesJson.items.find((item) => item.event === 'status-transition');
  if (!template) throw new Error('changes copy: the sequence has no status-transition item');
  return {
    missionId: changesJson.missionId,
    items: delays.map((delayMs) => ({ ...(structuredClone(template) as ChangesEnvelope['items'][number]), delayMs })),
  };
}
