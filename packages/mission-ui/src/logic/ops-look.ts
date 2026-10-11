/** The four looks of the Ops screen. */
export type OpsLook = 'loading' | 'error' | 'empty' | 'ready';
/** Why the look was chosen; announcements are keyed on the pair, so a `loading` look by `mismatch` announces nothing. */
export type OpsLookReason = 'status' | 'empty-ready' | 'mismatch' | 'ready';
export interface OpsLookResult {
  look: OpsLook;
  reason: OpsLookReason;
}

/** What the look depends on: the status as given (any string), the accumulated items and the profile filter. */
export interface OpsLookProps {
  status: string;
  items: ReadonlyArray<{ profileId: string }>;
  profile: string | null;
}

/**
 * The one decision of the screen (plan D-02), evaluated in the order of contracts/sk-ops-screen.md: `loading`, `error` and
 * `empty` win as given, and any other status (unknown included) is `empty`; `ready` with no items is `empty`; `ready` with a
 * non-null `profile` and some item whose `profileId` is not exactly that string is `loading` (a page of another request is
 * not the current one); otherwise `ready`. The comparison is exact string equality, no case folding, no trimming. A null
 * `profile` makes no check. Nothing here reads the order of `items`.
 */
export function resolveOpsLook(props: OpsLookProps): OpsLookResult {
  if (props.status === 'loading') return { look: 'loading', reason: 'status' };
  if (props.status === 'error') return { look: 'error', reason: 'status' };
  if (props.status !== 'ready') return { look: 'empty', reason: 'status' };
  if (props.items.length === 0) return { look: 'empty', reason: 'empty-ready' };
  const profile = props.profile;
  if (profile !== null && props.items.some((item) => item.profileId !== profile)) return { look: 'loading', reason: 'mismatch' };
  return { look: 'ready', reason: 'ready' };
}
