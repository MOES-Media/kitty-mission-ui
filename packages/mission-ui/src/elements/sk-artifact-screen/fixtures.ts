// Fixtures of the Artifact Viewer: one prop builder per contract fixture name (`contracts/contract-pin.md`), the host props, the
// bulk builders and the pairing table (story row to props) as data. Synthetic data only: no real names, paths, usernames or e-mail
// addresses. Later work packages import from here and add nothing (a gap is a change request).
import {
  listingPopulated,
  listingTruncated,
  contentMarkdown,
  contentRedacted,
  contentJson,
  contentEmpty,
  refusalInvalidPath,
  refusalNotFound,
  refusalTooLarge,
  refusalNotText,
  refusalSecret,
  refusalUnreadable,
  refusalListingUnreadable,
  listingWithOpenFiles,
  listingEmpty,
  listingUnreadableRows,
  listingUnknownKind,
  contentUnknownKind,
  refusalUnknownCode,
  listingLongNames,
  listingDeep,
  contentFeatures,
  contentHostile,
  contentYaml,
  contentJsonl,
  contentCsv,
  contentPlain,
  contentBom,
  contentPrompt,
  contentReviewCycle,
} from '../../contract/fixtures.generated.js';
import { makeArtifactListing, makeLargeMarkdown, makeLongLine, makeOverBudgetMarkdown } from '../../contract/bulk.js';
import type { ArtifactContentView, ArtifactListingView } from '../../contract/types.js';
import type { ArtifactContentStatus, ArtifactScreenMission, ArtifactScreenWorkPackage, ArtifactStatus, ArtifactTab } from '../../logic/artifact-types.js';
import { shellFrame, type ShellFrameTree } from '../../story-support/shell-frame.js';

/** The registered listing fixtures by export name (8). */
export const LISTING_FIXTURES = {
  listingPopulated, listingTruncated, listingWithOpenFiles, listingEmpty, listingUnreadableRows, listingUnknownKind, listingLongNames, listingDeep,
} satisfies Record<string, ArtifactListingView>;
export type ListingFixtureName = keyof typeof LISTING_FIXTURES;

/** The registered content fixtures by export name (14). */
export const CONTENT_FIXTURES = {
  contentMarkdown, contentRedacted, contentJson, contentEmpty, contentUnknownKind, contentFeatures, contentHostile, contentYaml, contentJsonl, contentCsv, contentPlain, contentBom, contentPrompt, contentReviewCycle,
} satisfies Record<string, ArtifactContentView>;
export type ContentFixtureName = keyof typeof CONTENT_FIXTURES;

/** The registered refusal fixtures by export name (8): their `code` feeds `refusalCode`. */
export const REFUSAL_FIXTURES = {
  refusalInvalidPath, refusalNotFound, refusalTooLarge, refusalNotText, refusalSecret, refusalUnreadable, refusalListingUnreadable, refusalUnknownCode,
} satisfies Record<string, { code: string; status: number }>;
export type RefusalFixtureName = keyof typeof REFUSAL_FIXTURES;

/** The bulk documents (never registered, never stored): generated on demand by the builders below. */
export type BulkListingName = 'bulkListing' | 'bulkListingTruncated';
export type BulkContentName = 'bulkLargeMarkdown' | 'bulkLongLine' | 'bulkOverBudget';

/** The Mission the stories show (host data, synthetic): a structural subset of `MissionDetail`. */
export const missionFacts: ArtifactScreenMission = {
  missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT',
  slug: 'sample-mission-01',
  friendlyName: 'Sample mission',
  missionType: 'software-dev',
  topology: 'lanes',
  targetBranch: 'main',
  lifecycleStatus: 'implement',
};

/** The Mission with no optional fact: only the identity (AV-25 absent). */
export const missionBare: ArtifactScreenMission = { missionId: missionFacts.missionId, slug: missionFacts.slug };

/** The host Work Package list (AV-26, AV-27, AV-28); `WP01` matches the paths of the prompt and the review cycle. */
export const workPackageList: ArtifactScreenWorkPackage[] = [
  { wpId: 'WP01', title: 'First slice' },
  { wpId: 'WP02', title: 'Second slice' },
];

/** The props a story or a test sets on the screen. */
export interface ArtifactScreenProps {
  status: ArtifactStatus;
  contentStatus: ArtifactContentStatus;
  listing: ArtifactListingView | null;
  content: ArtifactContentView | null;
  refusalCode: string | null;
  selectedPath: string;
  mission: ArtifactScreenMission | null;
  workPackages: ArtifactScreenWorkPackage[];
  view: ArtifactTab;
  errorMessage: string;
}

const base: ArtifactScreenProps = {
  status: 'ready',
  contentStatus: 'ready',
  listing: null,
  content: null,
  refusalCode: null,
  selectedPath: '',
  mission: missionFacts,
  workPackages: workPackageList,
  view: 'rendered',
  errorMessage: '',
};

const LARGE_BYTES = 262144;
const LONG_LINE_PATH = 'notes/long-line.txt';

/** The content fixture moved to `path` (the same document under another path). */
export function contentAt(content: ArtifactContentView, path: string): ArtifactContentView {
  return { ...content, path };
}

/** A listing prop builder for a registered fixture or a bulk listing; a bulk listing holds the forced `include` paths. */
export function listingProps(name: ListingFixtureName | BulkListingName, include: readonly string[] = []): ArtifactListingView {
  if (name === 'bulkListing') return makeArtifactListing(1000, { truncated: false, include });
  if (name === 'bulkListingTruncated') return makeArtifactListing(1000, { truncated: true, include });
  return LISTING_FIXTURES[name];
}

/** A content prop builder; a bulk document is opened at `path`. */
export function contentProps(name: ContentFixtureName | BulkContentName, path = 'spec.md'): ArtifactContentView {
  if (name === 'bulkLargeMarkdown') return makeLargeMarkdown(LARGE_BYTES, path);
  if (name === 'bulkLongLine') return makeLongLine(LARGE_BYTES, path);
  if (name === 'bulkOverBudget') return makeOverBudgetMarkdown(path);
  return CONTENT_FIXTURES[name];
}

/** The `code` of a registered refusal. */
export function refusalProps(name: RefusalFixtureName): string {
  return REFUSAL_FIXTURES[name].code;
}

interface Row {
  listing: ListingFixtureName | BulkListingName | null;
  content: ContentFixtureName | BulkContentName | null;
  /** The path the content is opened at when it is not the fixture's own (long names, deep nesting, bulk documents). */
  at?: string;
  refusal?: RefusalFixtureName;
  selectedPath: string;
  status?: ArtifactStatus;
  contentStatus?: ArtifactContentStatus;
  mission?: 'facts' | 'bare' | 'none';
  workPackages?: 'list' | 'none';
  view?: ArtifactTab;
  errorMessage?: string;
}

const longNamePath = listingLongNames.entries[0]?.path ?? '';
const longPathPath = listingLongNames.entries[1]?.path ?? '';
const deepPath = listingDeep.entries[0]?.path ?? '';

/**
 * The pairing table: story row to props (`contracts/contract-pin.md`, "Pairing"). Where both a listing and a content are given,
 * `content.path` equals `selectedPath` and the listing holds that path (rows AV-09 to AV-14 and AV-21 name a path only).
 */
export const PAIRINGS = {
  'AV-01': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-02': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', view: 'raw' },
  'AV-03': { listing: 'listingPopulated', content: 'contentFeatures', selectedPath: 'plan.md' },
  'AV-04': { listing: 'listingPopulated', content: 'contentHostile', selectedPath: 'research.md' },
  'AV-05': { listing: 'listingPopulated', content: 'bulkOverBudget', at: 'spec.md', selectedPath: 'spec.md' },
  'AV-06': { listing: 'listingWithOpenFiles', content: 'contentJson', selectedPath: 'contracts/schema.json' },
  'AV-07': { listing: 'listingWithOpenFiles', content: 'contentEmpty', selectedPath: 'notes/empty.txt' },
  'AV-08': { listing: 'listingWithOpenFiles', content: 'contentRedacted', selectedPath: 'notes/handoff.md' },
  'AV-09': { listing: 'listingPopulated', content: null, refusal: 'refusalNotFound', selectedPath: 'spec.md', contentStatus: 'refused' },
  'AV-10': { listing: 'listingPopulated', content: null, refusal: 'refusalTooLarge', selectedPath: 'notes/big-export.json', contentStatus: 'refused' },
  'AV-11': { listing: 'listingPopulated', content: null, refusal: 'refusalNotText', selectedPath: 'notes/big-export.json', contentStatus: 'refused' },
  'AV-12': { listing: 'listingPopulated', content: null, refusal: 'refusalSecret', selectedPath: 'notes/with space.md', contentStatus: 'refused' },
  'AV-13': { listing: 'listingPopulated', content: null, refusal: 'refusalUnreadable', selectedPath: 'spec.md', contentStatus: 'refused' },
  'AV-14': { listing: null, content: null, selectedPath: '', status: 'error' },
  'AV-15': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-16': { listing: 'listingUnreadableRows', content: null, selectedPath: '', status: 'nothing-selected' },
  'AV-17': { listing: 'listingTruncated', content: 'contentMarkdown', at: 'notes/a-000.md', selectedPath: 'notes/a-000.md' },
  'AV-18': { listing: 'listingEmpty', content: null, selectedPath: '', status: 'empty' },
  'AV-19': { listing: 'listingPopulated', content: 'contentYaml', selectedPath: 'contracts/api.yaml' },
  'AV-20': { listing: null, content: null, selectedPath: '', status: 'loading' },
  'AV-21': { listing: 'listingPopulated', content: null, selectedPath: 'spec.md', contentStatus: 'loading' },
  'AV-22': { listing: 'listingPopulated', content: null, selectedPath: '', status: 'nothing-selected' },
  'AV-23': { listing: null, content: null, selectedPath: '', status: 'not-found' },
  'AV-24': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-25a': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', mission: 'facts' },
  'AV-25b': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', mission: 'bare' },
  'AV-26a': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', workPackages: 'list' },
  'AV-26b': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', workPackages: 'none' },
  'AV-27': { listing: 'listingPopulated', content: 'contentPrompt', selectedPath: 'tasks/WP01-example.md' },
  'AV-28': { listing: 'listingPopulated', content: 'contentReviewCycle', selectedPath: 'tasks/WP01-example/review-cycle-1.md' },
  'AV-29': { listing: 'listingUnknownKind', content: 'contentUnknownKind', selectedPath: 'diagrams/overview.md' },
  'AV-30a': { listing: 'listingLongNames', content: 'contentMarkdown', at: longPathPath, selectedPath: longPathPath },
  'AV-30b': { listing: 'listingLongNames', content: 'contentMarkdown', at: longNamePath, selectedPath: longNamePath },
  'AV-30c': { listing: 'listingDeep', content: 'contentMarkdown', at: deepPath, selectedPath: deepPath },
  'AV-30d': { listing: 'bulkListing', content: 'contentMarkdown', at: 'spec.md', selectedPath: 'spec.md' },
  'AV-30e': { listing: 'bulkListing', content: 'bulkLongLine', at: LONG_LINE_PATH, selectedPath: LONG_LINE_PATH },
  'AV-30f': { listing: 'bulkListing', content: 'bulkLargeMarkdown', at: 'spec.md', selectedPath: 'spec.md' },
  'AV-31': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-32a': { listing: 'listingPopulated', content: 'contentFeatures', selectedPath: 'plan.md' },
  'AV-32b': { listing: 'listingPopulated', content: 'contentFeatures', selectedPath: 'plan.md' },
  'AV-32c': { listing: 'listingPopulated', content: 'contentFeatures', selectedPath: 'plan.md' },
  'AV-32d': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md', view: 'raw' },
  'AV-33': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-34': { listing: 'listingPopulated', content: 'contentMarkdown', selectedPath: 'spec.md' },
  'AV-35': { listing: 'listingPopulated', content: 'contentFeatures', selectedPath: 'plan.md' },
} as const satisfies Record<string, Row>;
export type PairingId = keyof typeof PAIRINGS;

/** The props of a paired story: the pairing table is the only source of a pair, so no builder invents one. */
export function pairingProps(id: PairingId): ArtifactScreenProps {
  const row: Row = PAIRINGS[id];
  const path = row.selectedPath;
  const include = path === '' ? [] : [path];
  const listing = row.listing === null ? null : listingProps(row.listing, include);
  const fixture = row.content === null ? null : contentProps(row.content, row.at ?? path);
  const content = fixture === null ? null : row.at === undefined ? fixture : contentAt(fixture, row.at);
  return {
    ...base,
    status: row.status ?? 'ready',
    contentStatus: row.contentStatus ?? 'ready',
    listing,
    content,
    refusalCode: row.refusal === undefined ? null : refusalProps(row.refusal),
    selectedPath: path,
    mission: row.mission === 'none' ? null : row.mission === 'bare' ? missionBare : missionFacts,
    workPackages: row.workPackages === 'none' ? [] : workPackageList,
    view: row.view ?? 'rendered',
    errorMessage: row.errorMessage ?? '',
  };
}

/** The frame every story sits in: the mission shell with the Artifacts item marked, `flush`, and the registered skip link text. */
export function artifactFrame(content: Parameters<typeof shellFrame>[0], tree?: ShellFrameTree): ReturnType<typeof shellFrame> {
  return shellFrame(content, { layout: 'mission', current: 'nav-artifacts', flush: true, skipLink: 'Skip to artifact', ...(tree === undefined ? {} : { tree }) });
}
