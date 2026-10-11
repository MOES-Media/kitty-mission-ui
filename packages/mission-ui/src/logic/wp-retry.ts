import { DETAIL_REFUSAL_GENERIC, DETAIL_REFUSAL_WORDS } from '../defaults/index.js';
import { lookup } from './lookup.js';
import type { OpsPageRetryDetail, WorkPackageRetryMember } from '../retry-types.js';

// The payload types live in the neutral `src/retry-types.ts`; these re-exports keep the earlier names.
export type {
  DetailRetryDetail,
  FoldersRetryDetail,
  OpsPageRetryDetail,
  ProjectRetryDetail,
  ProjectsRetryDetail,
  RetryLoadDetail,
  WorkPackageRetryDetail,
  WorkPackageRetryMember,
} from '../retry-types.js';

/** What the builder reads from the host's properties. */
export interface RetryProps {
  mission: { missionId: string } | null;
  wpId?: string | null;
  workPackage?: { wpId: string } | null;
  detail?: { wpId: string } | null;
}

/**
 * The one payload builder. The id comes from the host property `wpId`, then `workPackage.wpId`, then `detail.wpId`.
 * Null when there is no Mission or no id anywhere: the control is inert and no event is built.
 */
export function retryDetail(target: WorkPackageRetryMember['target'], props: RetryProps): WorkPackageRetryMember | null {
  if (props.mission === null) return null;
  const wpId = [props.wpId, props.workPackage?.wpId, props.detail?.wpId].find((id): id is string => typeof id === 'string' && id !== '');
  if (wpId === undefined) return null;
  const missionId = props.mission.missionId;
  return target === 'work-package' ? { missionId, wpId, target } : { missionId, wpId, target };
}

/** The Ops retry payload: the first page for no cursor, else the page after `cursor`. */
export function opsRetryDetail(cursor?: string | null): OpsPageRetryDetail {
  return cursor === undefined || cursor === null ? { target: 'ops-page' } : { target: 'ops-page', cursor };
}

/** The refusal in words: the table, then the raw code; null (no code given) is the generic wording. */
export function resolveRefusal(code: string | null): string {
  if (code === null) return DETAIL_REFUSAL_GENERIC;
  return lookup(DETAIL_REFUSAL_WORDS, code) ?? code;
}
