// Fixtures of the Ops screen: the contract fixtures by name, the story-argument helpers and the deterministic page
// builders. Synthetic data only: no real names, paths, usernames or e-mail addresses. Later work packages import from
// here and add nothing (a gap is a change request to the orchestrator). The helpers return the DATA properties of the
// screen; `labels` and `errorMessage` are set by the story that needs them.
import type { OpsScreenStatus } from './sk-ops-screen.js';
import {
  opsOpen,
  opsClosedByAgent,
  opsClosedBySweep,
  opsEvidenceNull,
  opsEvidenceRepoPath,
  opsEvidenceUrl,
  opsEvidenceUrlRedacted,
  opsEvidenceText,
  opsEvidenceTextRedacted,
  opsFailed,
  opsAbandoned,
  opsModeAdvisory,
  opsModeQuery,
  opsRedactedMarkers,
  opsActorNull,
  opsNoMissionNoWp,
  opsMissionOnly,
  opsEvidence512,
  opsEvidenceMarkup,
  opsEvidenceJavascriptUrl,
  opsEvidenceUnbroken512,
  opsEvidenceBidi,
  opsUnknownOutcome,
  opsUnknownCloser,
  opsUnknownMode,
  opsUnknownEvidenceKind,
  opsProfile128,
  opsActionLong,
  opsOffsetStart,
  opsPageFirst,
  opsPageLast,
  opsPageEmpty,
  opsPageMixed,
  opsPageEmptySkipped,
  opsRefusalUnreadable,
  opsCursorRefusal,
  project as contractProject,
} from '../../contract/fixtures.generated.js';
import { makeOpsPage } from '../../contract/bulk.js';
import type { OpsInvocationView, OpsRefusal, PageCursorRefusal, PageInfo, Project } from '../../contract/types.js';

/** The Ops invocation fixtures by export name (29): 9 contract examples, 16 overlays and the 4 with a foreign word. */
export const OPS_INVOCATION_FIXTURES = {
  opsOpen, opsClosedByAgent, opsClosedBySweep, opsEvidenceNull, opsEvidenceRepoPath, opsEvidenceUrl, opsEvidenceUrlRedacted, opsEvidenceText, opsEvidenceTextRedacted, opsFailed, opsAbandoned, opsModeAdvisory, opsModeQuery, opsRedactedMarkers, opsActorNull, opsNoMissionNoWp, opsMissionOnly, opsEvidence512, opsEvidenceMarkup, opsEvidenceJavascriptUrl, opsEvidenceUnbroken512, opsEvidenceBidi, opsUnknownOutcome, opsUnknownCloser, opsUnknownMode, opsUnknownEvidenceKind, opsProfile128, opsActionLong, opsOffsetStart,
} satisfies Record<string, OpsInvocationView>;
export type OpsInvocationFixtureName = keyof typeof OPS_INVOCATION_FIXTURES;

/** The page fixtures by export name (5). */
export const OPS_PAGE_FIXTURES = { opsPageFirst, opsPageLast, opsPageEmpty, opsPageMixed, opsPageEmptySkipped };
export type OpsPageFixtureName = keyof typeof OPS_PAGE_FIXTURES;

/** The refusal fixtures by export name (2): their `code` feeds `refusalCode` or the load-more error. */
export const OPS_REFUSAL_FIXTURES = { opsRefusalUnreadable, opsCursorRefusal } satisfies Record<string, OpsRefusal | PageCursorRefusal>;
export type OpsRefusalFixtureName = keyof typeof OPS_REFUSAL_FIXTURES;

/** The profile filter the filtered stories show (no row of the first page is of this profile). */
export const OPS_PROFILE = 'architect-alphonso';


/** The data properties a story or a test sets on the screen. */
export interface OpsScreenProps {
  status: OpsScreenStatus;
  project: Project | null;
  items: OpsInvocationView[];
  pageInfo: PageInfo | null;
  totalCount: number;
  skippedCount: number;
  profile: string | null;
  loadingMore: boolean;
  loadMoreError: { code: string | null } | null;
  refusalCode: string | null;
}

const base = (): OpsScreenProps => ({
  status: 'ready',
  project: { ...contractProject },
  items: [],
  pageInfo: null,
  totalCount: 0,
  skippedCount: 0,
  profile: null,
  loadingMore: false,
  loadMoreError: null,
  refusalCode: null,
});

type PageLike = { items: OpsInvocationView[]; pageInfo: PageInfo; totalCount: number; skippedCount: number };

/** A page as ready props; copies, so a story that edits its arguments never edits a fixture. */
const fromPage = (page: PageLike, over: Partial<OpsScreenProps> = {}): OpsScreenProps => ({
  ...base(),
  status: page.items.length === 0 ? 'empty' : 'ready',
  items: page.items.map((item) => structuredClone(item)),
  pageInfo: { ...page.pageInfo },
  totalCount: page.totalCount,
  skippedCount: page.skippedCount,
  ...over,
});

/** A page fixture as props: an empty page is the `empty` look, a page with rows the `ready` look. */
export function opsPageOf(name: OpsPageFixtureName): OpsScreenProps {
  return fromPage(OPS_PAGE_FIXTURES[name]);
}

/** One invocation fixture as a ready page of one row (the row stories). */
export function opsRowProps(name: OpsInvocationFixtureName): OpsScreenProps {
  const item = OPS_INVOCATION_FIXTURES[name];
  return fromPage({
    items: [item],
    pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 },
    totalCount: 1,
    skippedCount: 0,
  });
}

/** The `OpsInvocationPage` of `count` synthetic rows, as props (`hasNextPage` as given). */
const syntheticPage = (count: number, hasNextPage: boolean): OpsScreenProps => fromPage(makeOpsPage(count, hasNextPage));

/** The states the stories show, one helper each. Every call builds a fresh object. */
export const opsProps = {
  loading: (): OpsScreenProps => ({ ...base(), status: 'loading' }),
  ready: (): OpsScreenProps => opsPageOf('opsPageFirst'),
  loadingMore: (): OpsScreenProps => fromPage(OPS_PAGE_FIXTURES.opsPageFirst, { loadingMore: true }),
  lastPage: (): OpsScreenProps => opsPageOf('opsPageLast'),
  loadMoreError: (code: string | null): OpsScreenProps => fromPage(OPS_PAGE_FIXTURES.opsPageFirst, { loadMoreError: { code } }),
  refusedCursor: (): OpsScreenProps =>
    fromPage(OPS_PAGE_FIXTURES.opsPageFirst, { loadMoreError: { code: OPS_REFUSAL_FIXTURES.opsCursorRefusal.code } }),
  empty: (): OpsScreenProps => opsPageOf('opsPageEmpty'),
  emptySkipped: (): OpsScreenProps => opsPageOf('opsPageEmptySkipped'),
  emptyProfile: (profile: string = OPS_PROFILE): OpsScreenProps => fromPage(OPS_PAGE_FIXTURES.opsPageEmpty, { profile }),
  /** Empty under a profile filter with unreadable records: the profile sits between the two sentences (OP-21a). */
  emptyProfileSkipped: (profile: string = OPS_PROFILE): OpsScreenProps =>
    fromPage(OPS_PAGE_FIXTURES.opsPageEmptySkipped, { profile }),
  error: (name: OpsRefusalFixtureName): OpsScreenProps => ({ ...base(), status: 'error', refusalCode: OPS_REFUSAL_FIXTURES[name].code }),
  mismatchedProfile: (): OpsScreenProps => fromPage(OPS_PAGE_FIXTURES.opsPageFirst, { profile: OPS_PROFILE }),
  /** A page of `count` rows (200 by default) with a next page. */
  longPage: (count = 200): OpsScreenProps => syntheticPage(count, true),
};

/** The accumulation of `pages` pages of 200 rows (five by default: 1,000 rows), the last page without a next page (NFR-006). */
export function opsAccumulated(pages = 5): OpsScreenProps {
  const items: OpsInvocationView[] = [];
  let last = makeOpsPage(200, false, 0);
  for (let i = 0; i < pages; i += 1) {
    last = makeOpsPage(200, i < pages - 1, i * 200);
    items.push(...last.items);
  }
  return {
    ...base(),
    status: 'ready',
    items,
    pageInfo: { ...last.pageInfo },
    totalCount: items.length,
    skippedCount: 0,
  };
}
