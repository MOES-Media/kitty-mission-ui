// Large synthetic pages for the 500-Mission test (NFR-006) and the long-list story. Pure functions, no value imports
// (only `import type`, erased), so plain Node loads this file too and gate `contract` validates its output.
import type { MissionOverview, MissionOverviewPage } from './types.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DIGEST = '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b';
const EMPTY_DIGEST = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const BASE_TIME = Date.UTC(2026, 8, 30, 12, 0, 0);

interface Pattern {
  counts: MissionOverview['statusLaneCounts'];
  wpTotal: number;
  blockedCount: number;
  doneCount: number;
  donePercentage: number;
  weightedPercentage: number;
  lifecycleStatus: MissionOverview['lifecycleStatus'];
  accepted: boolean;
}

const lanes = (over: Partial<MissionOverview['statusLaneCounts']>): MissionOverview['statusLaneCounts'] => ({
  planned: 0,
  claimed: 0,
  in_progress: 0,
  for_review: 0,
  in_review: 0,
  approved: 0,
  done: 0,
  blocked: 0,
  canceled: 0,
  ...over,
});

// Each pattern declares its derived values as literals (the weights are the producer's, see contract-pin.md).
const PATTERNS: Pattern[] = [
  { counts: lanes({ planned: 1, in_progress: 1, for_review: 1, done: 3 }), wpTotal: 6, blockedCount: 0, doneCount: 3, donePercentage: 50, weightedPercentage: 65, lifecycleStatus: 'active', accepted: false },
  { counts: lanes({ in_progress: 1, blocked: 1 }), wpTotal: 2, blockedCount: 1, doneCount: 0, donePercentage: 0, weightedPercentage: 15, lifecycleStatus: 'active', accepted: false },
  { counts: lanes({ planned: 2 }), wpTotal: 2, blockedCount: 0, doneCount: 0, donePercentage: 0, weightedPercentage: 0, lifecycleStatus: 'planned', accepted: false },
  { counts: lanes({ done: 3 }), wpTotal: 3, blockedCount: 0, doneCount: 3, donePercentage: 100, weightedPercentage: 100, lifecycleStatus: 'done', accepted: true },
  { counts: lanes({}), wpTotal: 0, blockedCount: 0, doneCount: 0, donePercentage: 0, weightedPercentage: 0, lifecycleStatus: 'draft', accepted: false },
  { counts: lanes({ claimed: 1, in_progress: 1, approved: 1, canceled: 1 }), wpTotal: 4, blockedCount: 0, doneCount: 0, donePercentage: 0, weightedPercentage: 28.75, lifecycleStatus: 'active', accepted: false },
];

const TYPES = ['software-dev', 'research', null, 'documentation'];
const TOPOLOGIES: MissionOverview['topology'][] = ['lanes', 'single_branch', 'coord', 'lanes_with_coord', 'unknown'];

function ulid(index: number): string {
  let rest = index;
  let tail = '';
  for (let i = 0; i < 20; i += 1) {
    tail = ALPHABET.charAt(rest % 32) + tail;
    rest = Math.floor(rest / 32);
  }
  return `01JZF0${tail}`;
}

/** One synthetic Mission overview; `index` 0 is the newest (createdAt descends with the index). */
export function makeMission(index: number): MissionOverview {
  const p = PATTERNS[index % PATTERNS.length] as Pattern;
  const missionId = ulid(index);
  const mid8 = missionId.slice(0, 8);
  const createdAt = new Date(BASE_TIME - index * 60_000).toISOString().replace('.000Z', 'Z');
  const active = p.wpTotal > 0;
  return {
    missionId,
    mid8,
    slug: `synthetic-mission-${index + 1}-${mid8}`,
    friendlyName: `Synthetic Mission ${index + 1}`,
    displayNumber: index % 3 === 0 ? null : index + 1,
    missionType: TYPES[index % TYPES.length] ?? null,
    targetBranch: 'main',
    topology: TOPOLOGIES[index % TOPOLOGIES.length] ?? 'unknown',
    createdAt,
    statusLaneCounts: { ...p.counts },
    wpTotal: p.wpTotal,
    blockedCount: p.blockedCount,
    progress: {
      weightedPercentage: p.weightedPercentage,
      donePercentage: p.donePercentage,
      doneCount: p.doneCount,
      semantics: 'weighted_readiness',
    },
    lifecycleStatus: p.lifecycleStatus,
    acceptedAt: p.accepted ? createdAt : null,
    mergedAt: null,
    discardedAt: null,
    lastEventId: active ? `${missionId.slice(0, 24)}Q1` : null,
    lastActivityAt: active ? createdAt : null,
    eventCount: active ? index + 10 : 0,
    streamCursor: active ? { offset: (index + 1) * 100, invariant: DIGEST } : { offset: 0, invariant: EMPTY_DIGEST },
    nextAction: null,
  };
}

/** A page of `count` synthetic Missions, newest first. */
export function makeMissionPage(count: number, hasNextPage: boolean): MissionOverviewPage {
  const items: MissionOverview[] = [];
  for (let i = 0; i < count; i += 1) items.push(makeMission(i));
  return {
    items,
    pageInfo: { hasNextPage, nextPageCursor: hasNextPage ? 'c3ludGhldGljLXBhZ2U' : null, pageSize: Math.max(count, 1) },
  };
}
