import type { OpsPageRetryDetail } from '../retry-types.js';

/**
 * The `sk-retry-load` payload of the Ops screen: the first page for no cursor (an error look, or a refused cursor that starts
 * again from the newest), else the page after `cursor`. `retryDetail()` needs a Mission and a Work Package id, which an Op
 * page has neither of, so the Ops member has its own builder, as the Drift member has.
 */
export function opsRetryDetail(cursor?: string | null): OpsPageRetryDetail {
  return cursor === undefined || cursor === null ? { target: 'ops-page' } : { target: 'ops-page', cursor };
}
