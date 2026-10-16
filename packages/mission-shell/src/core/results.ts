// Applying a port result to a slot (plan IC-03, data-model "Applying a result", FR-005 with its amendment). Pure: no
// Svelte, no timers, no I/O. The per-screen differences are rows of one table, so the controller holds no conditionals
// about them.
import type {
  ArtifactContentStatus,
  ArtifactStatus,
  DetailStatus,
  DriftScreenStatus,
  OpsScreenStatus,
  ViewState,
  WpScreenStatus,
} from '@moes-media/mission-ui';
import type { ResourceKey } from './displayed';
import type { FailedResult, ReadResult } from './scheduler';

type Kind = ResourceKey['kind'];

/**
 * The status word each key's screen can show, typed against the screens' own vocabularies: a word a screen does not
 * declare is a compile error. `mission` also feeds the Pipeline screen, whose vocabulary is `ViewState` only: the view
 * folds `not-found` into `error` with the "Mission not found" message there (research R-18). The content viewer has no
 * `not-found`, so every refusal of a document is `refused`.
 */
export interface ViewWords {
  project: ViewState;
  missions: ViewState;
  'mission-names': ViewState;
  mission: ViewState | 'not-found';
  wp: WpScreenStatus;
  'wp-detail': DetailStatus;
  artifacts: ArtifactStatus;
  artifact: ArtifactContentStatus;
  drift: DriftScreenStatus;
  ops: OpsScreenStatus;
}

/** How one key kind turns a result into a word. `empty` and `notFound` are `null` where the vocabulary has none. */
export interface ResultRule<W extends string = string> {
  /** The word for a refusal that is not a 404 (and for a 404 where the vocabulary has no `not-found`). */
  readonly refusal: W;
  /** The word for a 404 refusal, or `null` when the vocabulary has none. */
  readonly notFound: W | null;
  /** The word for an empty success and the rule that decides it, or `null` when the screen has no `empty`. */
  readonly empty: { readonly word: W; readonly when: (value: unknown) => boolean } | null;
}

/** The first page of a page chain (the slot value of `missions` and `ops` is the array of the pages read). */
function firstPage(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function hasNoItems(value: unknown): boolean {
  const page = firstPage(value);
  if (typeof page !== 'object' || page === null || !('items' in page)) return false;
  return Array.isArray(page.items) && page.items.length === 0;
}

function hasNoFindings(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || !('findings' in value)) return false;
  return Array.isArray(value.findings) && value.findings.length === 0;
}

const rule = <W extends string>(refusal: W, notFound: W | null, empty: ResultRule<W>['empty'] = null): ResultRule<W> => ({
  refusal,
  notFound,
  empty,
});

/** One row per key kind. */
export const RESULT_RULES = {
  project: rule('error', null),
  missions: rule('error', null, { word: 'empty', when: hasNoItems }),
  'mission-names': rule('error', null),
  mission: rule('error', 'not-found'),
  wp: rule('error', 'not-found'),
  'wp-detail': rule('error', 'not-found'),
  artifacts: rule('error', 'not-found'),
  artifact: rule('refused', null),
  drift: rule('error', 'not-found', { word: 'empty', when: hasNoFindings }),
  ops: rule('error', null, { word: 'empty', when: hasNoItems }),
} as const satisfies { [K in Kind]: ResultRule<ViewWords[K]> };

/** What a slot holds that a result changes. */
export interface AppliedSlot {
  value: unknown;
  view: string;
  refusal: unknown;
}

function statusOf(refusal: unknown): number | null {
  if (typeof refusal !== 'object' || refusal === null || !('status' in refusal)) return null;
  return typeof refusal.status === 'number' ? refusal.status : null;
}

/**
 * The slot after a result (data-model "Applying a result"):
 * - a success replaces the value unchanged and sets `ready`, or `empty` by the screen's rule;
 * - a refusal always applies, with or without a value: `error` (or `not-found` for a 404 where the screen has it, or
 *   `refused` for a document), and the refusal is kept;
 * - `unavailable` is a non-answer: on a slot with a value, value and view are kept (decision 01M50K4DBT2VCW6DD4JQAGEMB4);
 *   on a slot without one, `error`.
 */
export function applyResult(slot: AppliedSlot, result: ReadResult, kindRule: ResultRule): AppliedSlot {
  if (result.ok) {
    const empty = kindRule.empty !== null && kindRule.empty.when(result.value);
    return { value: result.value, view: empty && kindRule.empty ? kindRule.empty.word : 'ready', refusal: null };
  }
  if ('refusal' in result) {
    const word = statusOf(result.refusal) === 404 && kindRule.notFound !== null ? kindRule.notFound : kindRule.refusal;
    return { value: slot.value, view: word, refusal: result.refusal };
  }
  if (slot.value !== undefined) return { value: slot.value, view: slot.view, refusal: slot.refusal };
  return { value: slot.value, view: 'error', refusal: null };
}

/** What the controller does when a load-more read fails; `results.ts` issues nothing itself. */
export type AppendFailure =
  | { readonly action: 'restart' }
  | { readonly action: 'load-more-error'; readonly error: { readonly code: string | null } }
  | { readonly action: 'keep' };

function codeOf(failure: FailedResult): string | null {
  if (!('refusal' in failure)) return null;
  const { refusal } = failure;
  if (typeof refusal !== 'object' || refusal === null || !('body' in refusal)) return null;
  const { body } = refusal;
  if (typeof body !== 'object' || body === null || !('code' in body)) return null;
  return typeof body.code === 'string' ? body.code : null;
}

/**
 * A refused page cursor (400, `PageCursorRefusal`) drops the loaded pages and asks for page 1 again, on both lists. Any
 * other failure keeps the items; Ops reports it as `loadMoreError`, Missions has no such property.
 */
export function appendFailure(kind: 'missions' | 'ops', failure: FailedResult): AppendFailure {
  if ('refusal' in failure && statusOf(failure.refusal) === 400) return { action: 'restart' };
  if (kind === 'ops') return { action: 'load-more-error', error: { code: codeOf(failure) } };
  return { action: 'keep' };
}
