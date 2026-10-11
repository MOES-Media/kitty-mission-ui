// Large synthetic pages for the 500-Mission test (NFR-006) and the long-list story. Pure functions, no value imports
// (only `import type`, erased), so plain Node loads this file too and gate `contract` validates its output.
import type { HistoryEntry, MissionOverview, MissionOverviewPage, OpsInvocation, OpsInvocationPage, OwnedFile, Subtask } from './types.js';

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

// ---- Work Package detail screen (long histories and lists) --------------------------------------------------------
const WP_BASE_TIME = Date.UTC(2026, 8, 1, 8, 0, 0);
const wpEventId = (n: number): string => `01JZAB3C4D5E6F7G8H9J${String(n).padStart(6, '0')}`;
const SYNTHETIC_ACTOR = { tool: 'claude', role: 'implementer', profile: 'implementer-ivan' };
const SYNTHETIC_REVIEWER = { tool: 'claude', role: 'reviewer', profile: 'reviewer-renata' };

/**
 * `count` status transitions of one work package: first appearance, claim, start, then review rounds that alternate
 * "to review" and "changes requested" (the reviewer's entries carry the verdict). Non-decreasing in `at`, ascending in
 * `eventId`; the last entry's `toStatusLane` is the lane the work package is in.
 */
export function makeWorkPackageHistory(count: number): HistoryEntry[] {
  const steps: Array<[HistoryEntry['fromStatusLane'], HistoryEntry['toStatusLane']]> = [
    [null, 'planned'],
    ['planned', 'claimed'],
    ['claimed', 'in_progress'],
  ];
  const entries: HistoryEntry[] = [];
  for (let i = 0; i < count; i += 1) {
    const round = i - steps.length;
    const step = round < 0 ? steps[i] : round % 2 === 0 ? (['in_progress', 'for_review'] as const) : (['for_review', 'in_progress'] as const);
    const changes = round >= 0 && round % 2 === 1;
    entries.push({
      eventId: wpEventId(i + 1),
      at: new Date(WP_BASE_TIME + i * 3_600_000).toISOString().replace('.000Z', 'Z'),
      kind: 'transition',
      fromStatusLane: step?.[0] ?? null,
      toStatusLane: step?.[1] ?? 'planned',
      actor: changes ? { ...SYNTHETIC_REVIEWER } : { ...SYNTHETIC_ACTOR },
      force: false,
      reason: changes ? `Changes requested after review round ${(round + 1) / 2}.` : null,
      reviewVerdict: changes ? 'changes_requested' : null,
    });
  }
  return entries;
}

const SUBTASK_LANES: Array<NonNullable<Subtask['statusLane']>> = ['done', 'in_progress', 'planned', 'for_review', 'claimed', 'blocked', 'canceled'];

/** `count` subtasks T001, T002, ... with a title and a lane that cycles through seven of the nine lanes. */
export function makeSubtasks(count: number): Subtask[] {
  const out: Subtask[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: `T${String(i + 1).padStart(3, '0')}`,
      title: `Subtask ${i + 1}: ${'a longer title that has to wrap over a few lines '.repeat(i % 3 === 0 ? 3 : 1)}`.trimEnd(),
      statusLane: SUBTASK_LANES[i % SUBTASK_LANES.length] ?? 'planned',
    });
  }
  return out;
}

const CHANGE_STATES: OwnedFile['changeState'][] = ['changed', 'unchanged', 'unknown'];

/** `count` owned files and patterns, deep paths and globs alternating, the change state cycling through its three values. */
export function makeOwnedFiles(count: number): OwnedFile[] {
  const out: OwnedFile[] = [];
  for (let i = 0; i < count; i += 1) {
    const glob = i % 4 === 3;
    const dir = `packages/example/src/module-${String(Math.floor(i / 5) + 1).padStart(2, '0')}/section-${(i % 5) + 1}`;
    out.push({
      pattern: glob ? `${dir}/**/*.ts` : `${dir}/file-${String(i + 1).padStart(3, '0')}.ts`,
      isGlob: glob,
      changeState: CHANGE_STATES[i % CHANGE_STATES.length] ?? 'unknown',
    });
  }
  return out;
}

// ---- Ops screen (mission-ui#11): synthetic pages of Ops for the 200-row story and the 1,000-row accumulation ----
const OPS_BASE_TIME = Date.UTC(2026, 9, 9, 18, 0, 0);
const OPS_ID_CEILING = 1_048_575;
const OPS_MISSION = '01JZCB3C4D5E6F7G8H9JKMNPQT';

/** The ULID of Op `index`: it descends as `index` ascends, so id order agrees with the newest-first order. */
function opsUlid(index: number): string {
  let rest = OPS_ID_CEILING - index;
  let tail = '';
  for (let i = 0; i < 20; i += 1) {
    tail = ALPHABET.charAt(rest % 32) + tail;
    rest = Math.floor(rest / 32);
  }
  return `01K6TZ${tail}`;
}

const OPS_PROFILES = ['python-pedro', 'reviewer-renata', 'architect-alphonso'] as const;
const OPS_ACTIONS = ['implement', 'review', 'analyze'] as const;
const OPS_ACTORS = ['claude', 'codex', 'operator'] as const;

/** One synthetic Op; `index` 0 is the newest (startedAt descends with the index, one minute apart). */
export function makeOpsInvocation(index: number): OpsInvocation {
  const startedAt = new Date(OPS_BASE_TIME - index * 60_000).toISOString().replace('.000Z', 'Z');
  const completedAt = new Date(OPS_BASE_TIME - index * 60_000 + 1_800_000).toISOString().replace('.000Z', 'Z');
  const shape = index % 8;
  const base = {
    invocationId: opsUlid(index),
    profileId: OPS_PROFILES[index % OPS_PROFILES.length] ?? 'python-pedro',
    action: OPS_ACTIONS[index % OPS_ACTIONS.length] ?? 'implement',
    actor: OPS_ACTORS[index % OPS_ACTORS.length] ?? 'claude',
    startedAt,
    missionId: shape === 6 ? null : OPS_MISSION,
    wpId: shape === 6 ? null : `WP${String((index % 9) + 1).padStart(2, '0')}`,
  };
  const open = { ...base, modeOfWork: shape === 6 ? 'mission_step' : 'task_execution', status: 'open', outcome: null, closedBy: null, completedAt: null, evidence: null } as const;
  const closed = { ...base, modeOfWork: 'task_execution', status: 'closed', completedAt } as const;
  switch (shape) {
    case 0:
    case 6:
      return open;
    case 1:
      return { ...closed, outcome: 'done', closedBy: 'agent', evidence: { kind: 'repo_path', value: `docs/reports/report-${index + 1}.md`, redacted: false } };
    case 2:
      return { ...closed, outcome: 'failed', closedBy: 'agent', evidence: { kind: 'text', value: `The check failed on run ${index + 1}.`, redacted: false } };
    case 3:
      return { ...closed, outcome: 'abandoned', closedBy: 'doctor_sweep', evidence: null };
    case 4:
      return { ...closed, outcome: 'done', closedBy: 'agent', evidence: { kind: 'url', value: `https://example.org/reviews/${index + 1}`, redacted: false } };
    case 5:
      return { ...closed, outcome: 'done', closedBy: 'agent', evidence: { kind: 'text', value: 'Notes were shared with [email] and kept in [path].', redacted: true } };
    default:
      return { ...closed, modeOfWork: 'advisory', outcome: 'done', closedBy: 'agent', evidence: null };
  }
}

/** A page of `count` synthetic Ops starting at `start` (the page after a page of 200 starts at 200). Counts are given, never derived. */
export function makeOpsPage(count: number, hasNextPage: boolean, start = 0): OpsInvocationPage {
  const items: OpsInvocation[] = [];
  for (let i = 0; i < count; i += 1) items.push(makeOpsInvocation(start + i));
  return {
    items,
    pageInfo: { hasNextPage, nextPageCursor: hasNextPage ? 'c3ludGhldGljLW9wcw' : null, pageSize: Math.max(count, 1) },
    totalCount: start + count,
    skippedCount: 0,
  };
}
