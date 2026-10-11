import type { DriftRetryDetail } from '../retry-types.js';

/**
 * The `sk-retry-load` payload of the Drift screen. `retryDetail()` returns null without a Mission and needs a Work Package id,
 * so it cannot serve a whole-project scan; this builder takes the screen's `missionId` property, where the empty string
 * (the default) is the whole project and becomes null.
 */
export function driftRetryDetail(missionId: string | null): DriftRetryDetail {
  return { missionId: missionId === null || missionId === '' ? null : missionId, target: 'drift-report' };
}
