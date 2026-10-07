import { DETAIL_REFUSAL_GENERIC, DETAIL_REFUSAL_WORDS } from '../defaults/index.js';
import { lookup } from './lookup.js';

/** The retry of the whole Work Package read. */
export interface WorkPackageRetryDetail {
  missionId: string;
  wpId: string;
  target: 'work-package';
}

/** The retry of the detail regions only. */
export interface DetailRetryDetail {
  missionId: string;
  wpId: string;
  target: 'detail';
}

/**
 * The payload of `sk-retry-load`: a union discriminated by `target`. `HTMLElementEventMap['sk-retry-load']` can be declared
 * once, so a later screen adds its own member here (with its own `target` word) instead of declaring the event again.
 * The screen's `SkRetryLoadDetail` is this type.
 */
export type RetryLoadDetail = WorkPackageRetryDetail | DetailRetryDetail;

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
export function retryDetail(target: (WorkPackageRetryDetail | DetailRetryDetail)['target'], props: RetryProps): RetryLoadDetail | null {
  if (props.mission === null) return null;
  const wpId = [props.wpId, props.workPackage?.wpId, props.detail?.wpId].find((id): id is string => typeof id === 'string' && id !== '');
  if (wpId === undefined) return null;
  const missionId = props.mission.missionId;
  return target === 'work-package' ? { missionId, wpId, target } : { missionId, wpId, target };
}

/** The refusal in words: the table, then the raw code; null (no code given) is the generic wording. */
export function resolveRefusal(code: string | null): string {
  if (code === null) return DETAIL_REFUSAL_GENERIC;
  return lookup(DETAIL_REFUSAL_WORDS, code) ?? code;
}
