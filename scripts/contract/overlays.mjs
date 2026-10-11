// Named overlays: each builds one fixture document from a vendored example plus the state the examples lack.
//
// An overlay computes ONLY the mechanical lane tally (statusLaneCounts, wpTotal, blockedCount) from the work
// packages it sets. Everything else derived (progress, lifecycleStatus, acceptedAt, nextAction and the status of the
// implement and review phases) is DECLARED as a literal here, per contract-pin.md "Declared derived values". check.mjs
// recomputes all of it with its own implementation; the two share no helper, so one mistake cannot hide the other.
// weightedPercentage is the producer's lane-weighted readiness for the fixture's counts (spec-kitty
// src/specify_cli/status/progress.py at the pin), declared, not computed.

/**
 * The only handles a fixture may carry as an actor, a history actor or a reviewer. The first three are the host-only
 * `actor` of the Mission detail overlays; the others are the handles of the contract's own Work Package examples,
 * kept by the Work Package fixtures (a tool, two roles, two profiles and a bookkeeping handle).
 */
export const SYNTHETIC_ACTORS = [
  'agent-a', 'agent-b', 'agent-c', 'claude', 'finalize-tasks', 'implementer', 'reviewer', 'implementer-ivan', 'reviewer-renata',
  // two deliberately long handles (at most 128 characters, the contract's limit) for the long-text fixture
  'implementer-profile-with-a-deliberately-long-handle-to-test-wrapping-in-the-facts-panel-of-the-screen',
  'reviewer-profile-with-a-deliberately-long-handle-to-test-wrapping-in-the-review-summary-of-the-screen',
];
// Looked up by name, never by position: reordering SYNTHETIC_ACTORS must not change a fixture.
const actorNamed = (prefix) => {
  const found = SYNTHETIC_ACTORS.filter((a) => a.startsWith(prefix));
  if (found.length !== 1) throw new Error(`expected exactly one synthetic actor starting with ${prefix}`);
  return found[0];
};
const LONG_PROFILE = actorNamed('implementer-profile-with-a-deliberately-long');
const LONG_REVIEWER = actorNamed('reviewer-profile-with-a-deliberately-long');

const LANES = ['planned', 'claimed', 'in_progress', 'for_review', 'in_review', 'approved', 'done', 'blocked', 'canceled'];

/** Mechanical tally over the nine known lanes; a null or unknown lane is in no count and not in wpTotal. */
export function tallyLanes(workPackages) {
  const statusLaneCounts = Object.fromEntries(LANES.map((l) => [l, 0]));
  let wpTotal = 0;
  for (const wp of workPackages) {
    if (Object.hasOwn(statusLaneCounts, wp.statusLane)) {
      statusLaneCounts[wp.statusLane] += 1;
      wpTotal += 1;
    }
  }
  return { statusLaneCounts, wpTotal };
}

const countsOf = (over) => {
  const statusLaneCounts = { ...Object.fromEntries(LANES.map((l) => [l, 0])), ...over };
  return { statusLaneCounts, wpTotal: Object.values(statusLaneCounts).reduce((a, b) => a + b, 0) };
};

const id = (n) => `01JZF${String(n).padStart(3, '0')}${'0'.repeat(18)}`;
const ts = (day, h = 9) => `2026-09-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`;

const CONSOLIDATE = (slug) => `Run the mission consolidation when ready: \`spec-kitty consolidate --mission ${slug}\``;

const phase = (name, status, basis) => ({ name, status, basis });
const planned3 = [
  phase('specify', 'complete', 'artifact'),
  phase('plan', 'complete', 'artifact'),
  phase('tasks', 'complete', 'lifecycle_event'),
];
const phases = (implement, review) => [
  ...planned3,
  phase('implement', implement, 'derived_from_status_lanes'),
  phase('review', review, 'derived_from_status_lanes'),
];

/** A work package summary; readiness follows the dependencies' lanes (the contract's acceptable endings). */
function wpOf(wpId, lane, { title, phaseLabel = 'Delivery', deps = [], sub = [0, 0], actor } = {}) {
  return {
    wpId,
    title: title ?? `Work package ${wpId}`,
    phaseLabel,
    statusLane: lane,
    dependencies: deps,
    readiness: { satisfied: true, unsatisfied: [] },
    readyToStart: false,
    subtaskProgress: { done: sub[0], total: sub[1] },
    lastTransitionAt: lane === null ? null : ts(20 + Number(wpId.slice(2)), 10),
    ...(actor ? { actor } : {}),
  };
}

function settle(workPackages) {
  const lane = new Map(workPackages.map((w) => [w.wpId, w.statusLane]));
  for (const wp of workPackages) {
    const unsatisfied = wp.dependencies.filter((d) => !['approved', 'done', 'canceled'].includes(lane.get(d)));
    wp.readiness = { satisfied: unsatisfied.length === 0, unsatisfied };
    wp.readyToStart = wp.statusLane === 'planned' && unsatisfied.length === 0;
  }
  return workPackages;
}

/**
 * A MissionDetail on top of `base` (an example), with the work packages, identity and DECLARED derived values given.
 * declared: { progress: [weighted, donePct, doneCount], lifecycleStatus, acceptedAt, nextAction, implement, review }
 */
function detailOf(base, { n, name, wps, declared, phaseList }) {
  const workPackages = settle(wps);
  const { statusLaneCounts, wpTotal } = tallyLanes(workPackages);
  const slug = `example-mission-${id(n).slice(0, 8)}`;
  const [weightedPercentage, donePercentage, doneCount] = declared.progress;
  return {
    ...structuredClone(base),
    missionId: id(n),
    mid8: id(n).slice(0, 8),
    slug,
    friendlyName: name,
    statusLaneCounts,
    wpTotal,
    blockedCount: statusLaneCounts.blocked,
    progress: { weightedPercentage, donePercentage, doneCount, semantics: 'weighted_readiness' },
    lifecycleStatus: declared.lifecycleStatus,
    acceptedAt: declared.acceptedAt ?? null,
    nextAction: declared.nextAction ?? null,
    phases: phaseList ?? phases(declared.implement, declared.review),
    workPackages,
  };
}

function implementWps() {
  return [
    wpOf('WP01', 'planned', { title: 'Define the data model', sub: [1, 4] }),
    wpOf('WP02', 'planned', { title: 'Build the list view', deps: ['WP01'], sub: [0, 0] }),
    wpOf('WP03', 'claimed', { title: 'Build the detail view', sub: [2, 5] }),
    wpOf('WP04', 'in_progress', { title: 'Add the filter group', deps: ['WP03'], sub: [3, 3] }),
    wpOf('WP05', 'in_progress', { title: 'Write the documentation', deps: ['WP03'], sub: [1, 4] }),
    wpOf('WP06', 'canceled', { title: 'Prepare the release notes', sub: [0, 2] }),
    // One work package in review: the Review column shows a card (DR-12) and the contract derives the review phase as
    // in progress. Weighted readiness (1 x claimed 0.05 + 2 x in_progress 0.3 + 1 x for_review 0.6) / 7 = 17.8571.
    wpOf('WP07', 'for_review', { title: 'Audit the accessibility labels', sub: [3, 3] }),
  ];
}

const IMPLEMENT = { progress: [17.8571, 0, 0], lifecycleStatus: 'active', implement: 'in_progress', review: 'in_progress' };

function detailImplement(ex) {
  return detailOf(ex['MissionDetail.populated'], { n: 1, name: 'Example Mission Implement', wps: implementWps(), declared: IMPLEMENT });
}

const LONG_WORD = 'Supercalifragilisticexpialidociousandthenyetanotherunbrokenwordthatnevergetsaspacetobreakon';

function detailLongNames(ex) {
  const d = detailOf(ex['MissionDetail.populated'], {
    n: 10,
    name: `Example Mission ${LONG_WORD} with a very long friendly name that keeps going`,
    wps: implementWps(),
    declared: IMPLEMENT,
  });
  d.workPackages.forEach((wp, i) => {
    wp.title = `Work package ${i + 1}: ${'a very long title that has to wrap across several lines '.repeat(3)}${LONG_WORD}`;
    wp.phaseLabel = `${LONG_WORD}label`;
  });
  return d;
}

// Item cases of the overview pages (contract-pin.md "Overview item cases"). `base` is an example or null.
function item(ex, { n, name, counts, declared, base, stale, type = 'software-dev', topology = 'lanes' }) {
  const { statusLaneCounts, wpTotal } = countsOf(counts);
  const [weightedPercentage, donePercentage, doneCount] = declared.progress;
  const slug = `example-mission-${id(n).slice(0, 8)}`;
  const doc = {
    ...structuredClone(base ?? ex['MissionOverview.populated']),
    missionId: id(n),
    mid8: id(n).slice(0, 8),
    slug,
    friendlyName: name,
    missionType: type,
    topology,
    createdAt: ts(30 - n, 8),
    statusLaneCounts,
    wpTotal,
    blockedCount: statusLaneCounts.blocked,
    progress: { weightedPercentage, donePercentage, doneCount, semantics: 'weighted_readiness' },
    lifecycleStatus: declared.lifecycleStatus,
    acceptedAt: declared.acceptedAt ?? null,
    discardedAt: declared.discardedAt ?? null,
    nextAction: declared.nextAction ?? null,
  };
  return stale ? { ...doc, stale: true } : doc;
}

function itemCases(ex) {
  const populated = structuredClone(ex['MissionOverview.populated']);
  const sparse = structuredClone(ex['MissionOverview.sparse']);
  const discarded = structuredClone(ex['MissionOverview.discarded']);
  return {
    active: { ...populated, createdAt: ts(30, 8), friendlyName: 'Active Mission', slug: 'active-mission-01JZAB3C' },
    blocked: item(ex, { n: 2, name: 'Blocked Mission', counts: { in_progress: 1, blocked: 1 }, declared: { progress: [15, 0, 0], lifecycleStatus: 'active' } }),
    staleActive: item(ex, { n: 3, name: 'Stale Active Mission', counts: { in_progress: 2 }, declared: { progress: [30, 0, 0], lifecycleStatus: 'active' }, stale: true }),
    sparse: { ...sparse, createdAt: ts(27, 8) },
    done: item(ex, {
      n: 5,
      name: 'Done Mission',
      counts: { done: 3 },
      declared: { progress: [100, 100, 3], lifecycleStatus: 'done', acceptedAt: ts(29, 12) },
      type: 'research',
      topology: 'single_branch',
    }),
    planned: item(ex, { n: 6, name: 'Planned Mission', counts: { planned: 2 }, declared: { progress: [0, 0, 0], lifecycleStatus: 'planned' } }),
    draft: item(ex, { n: 7, name: 'Draft Mission', counts: {}, declared: { progress: [0, 0, 0], lifecycleStatus: 'draft' }, type: null, topology: 'unknown' }),
    discarded: { ...discarded, createdAt: ts(18, 7) },
    stalePlanned: item(ex, { n: 9, name: 'Stale Planned Mission', counts: { planned: 1 }, declared: { progress: [0, 0, 0], lifecycleStatus: 'planned' }, stale: true }),
  };
}

const pageInfo = (items, hasNextPage) => ({ hasNextPage, nextPageCursor: hasNextPage ? 'cGFnZS0y' : null, pageSize: items.length });

// Strictly descending createdAt, as the service orders pages.
const descending = (items) =>
  items.map((m, i) => ({ ...m, createdAt: `2026-09-${String(28 - i).padStart(2, '0')}T08:00:00Z` }));

function detailBadges(ex) {
  return detailOf(ex['MissionDetail.populated'], {
    n: 11,
    name: 'Example Mission Badges',
    wps: [
      wpOf('WP01', 'blocked', { title: 'Wait for the review' }),
      wpOf('WP02', 'in_review', { title: 'Reviewing the filter group', sub: [3, 3] }),
      wpOf('WP03', 'canceled', { title: 'Dropped idea' }),
      wpOf('WP04', 'in_progress', { title: 'Work owned by an agent', sub: [1, 2], actor: actorNamed('agent-a') }),
      wpOf('WP05', null, { title: 'Not started', phaseLabel: null }),
    ],
    declared: { progress: [25, 0, 0], lifecycleStatus: 'active', implement: 'in_progress', review: 'in_progress' },
  });
}

function detailSubtasks(ex) {
  const lanes = ['planned', 'claimed', 'in_progress', 'for_review', 'in_review', 'approved', 'done', 'blocked', 'canceled'];
  const sub = [[2, 5], [3, 3], [0, 0], [1, 4], [4, 4], [0, 2], [5, 5], [0, 1], [0, 0]];
  return detailOf(ex['MissionDetail.populated'], {
    n: 12,
    name: 'Example Mission Subtasks',
    wps: lanes.map((lane, i) => wpOf(`WP0${i + 1}`, lane, { title: `Work package in ${lane.replace('_', ' ')}`, sub: sub[i] })),
    declared: { progress: [38.3333, 11.1111, 1], lifecycleStatus: 'active', implement: 'in_progress', review: 'in_progress' },
  });
}

const UNKNOWN_PHASES_3 = ['discover', 'shape', 'build'];
const UNKNOWN_PHASES_7 = ['discover', 'shape', 'design', 'build', 'verify', 'ship', 'reflect'];

function phasesOpen(ex, n, names) {
  const d = detailImplement(ex);
  d.missionId = id(n);
  d.mid8 = id(n).slice(0, 8);
  d.slug = `example-mission-${id(n).slice(0, 8)}`;
  d.friendlyName = `Example Mission with ${names.length} phases`;
  d.phases = names.map((name, i) => phase(name, i === 0 ? 'complete' : i === 1 ? 'in_progress' : 'pending', 'artifact'));
  return d;
}


// ---- Work Package detail screen (mission-ui#5) --------------------------------------------------------------------
// Every overlay that changes `statusLane` rewrites, in the same overlay, the history (a prefix of the base history plus
// appended entries), lastTransitionAt, lastEventId, forceCount, subtasks, subtaskProgress, review and readyToStart
// (contract-pin.md "Lane-rewrite rule"). check.mjs recomputes the derived ones with its own implementation (C5).

const WP_EVENT = (n) => `01JZAB3C4D5E6F7G8H9JKMNQ${String(n).padStart(2, '0')}`;
const WP_REVIEW_REF = (cycle) => `review-cycle://example-mission-01JZAB3C/WP04/review-cycle-${cycle}.md`;
const IMPLEMENTER = { tool: 'claude', role: 'implementer', profile: 'implementer-ivan' };
const REVIEWER = { tool: 'claude', role: 'reviewer', profile: 'reviewer-renata' };
const FINALIZER = { tool: 'finalize-tasks', role: null, profile: null };

const transition = (n, at, from, to, actor, extra = {}) => ({
  eventId: WP_EVENT(n),
  at,
  kind: 'transition',
  fromStatusLane: from,
  toStatusLane: to,
  actor: { ...actor },
  force: false,
  reason: null,
  reviewVerdict: null,
  ...extra,
});

/** The state of each of the three subtasks that detailPopulated lists, by the lane the work package is in. */
function subtaskStates(ids, lane) {
  if (lane === 'in_progress') return Object.fromEntries(ids.map((id, i) => [id, ['done', 'in_progress', 'planned'][i] ?? 'planned']));
  if (['planned', 'claimed'].includes(lane)) return Object.fromEntries(ids.map((id) => [id, 'planned']));
  return Object.fromEntries(ids.map((id) => [id, 'done']));
}

/** The review of a history: the last entry that carries a verdict, with the reference of its cycle; null without one. */
function reviewOf(history) {
  const judged = history.filter((e) => e.reviewVerdict !== null);
  const last = judged[judged.length - 1];
  return {
    latestResult: last ? { reviewer: last.actor.profile, verdict: last.reviewVerdict, reference: WP_REVIEW_REF(judged.length) } : null,
    override: null,
  };
}

/**
 * A WorkPackage on top of `base`: `history` replaces the base history and everything that follows the lane is rewritten.
 * `ids` are the subtask ids and `dependencies` the dependencies; `subtasks` overrides the derived subtask states.
 */
function wpFrom(base, { history, ids, dependencies, ownedFiles, unsatisfied = [], subtasks, review }) {
  const wp = structuredClone(base);
  const last = history[history.length - 1] ?? null;
  const lane = last ? last.toStatusLane : null;
  wp.history = history.map((e) => structuredClone(e));
  wp.statusLane = lane;
  wp.lastTransitionAt = last ? last.at : null;
  wp.lastEventId = last ? last.eventId : null;
  wp.forceCount = history.filter((e) => e.force).length;
  if (last) wp.actor = { ...last.actor };
  wp.subtasks = subtasks ?? subtaskStates(ids, lane);
  const states = Object.values(wp.subtasks);
  wp.subtaskProgress = { done: states.filter((v) => v === 'done').length, total: states.length };
  wp.authored.subtasks = [...ids];
  wp.dependencies = [...dependencies];
  wp.readiness = { satisfied: unsatisfied.length === 0, unsatisfied: [...unsatisfied] };
  wp.readyToStart = lane === 'planned' && unsatisfied.length === 0;
  wp.ownedFiles = [...ownedFiles];
  wp.review = review ?? reviewOf(history);
  return wp;
}

/** A work package that never left planned: no assignment, nobody of record, one event by the planning tool. */
function plannedWp(ex, opts) {
  const wp = wpFrom(ex['WorkPackage.populated'], opts);
  wp.assignment = structuredClone(ex['WorkPackage.no-events'].assignment);
  wp.implementerOfRecord = null;
  return wp;
}

const LONG_SENTENCE = `${'A deliberately long sentence that has to wrap over several lines of the narrow panel. '.repeat(3)}${LONG_WORD}`;

function workPackageFixtures(ex, bulk) {
  const base = ex['WorkPackage.populated'];
  const detail = ex['WorkPackageDetail.populated'];
  const ids = detail.subtasks.map((x) => x.id);
  const owned = detail.ownedFiles.map((x) => x.pattern);
  const deps = detail.dependencies.map((x) => x.wpId);
  const common = { ids, dependencies: deps, ownedFiles: owned };
  const at = (day, h = 9) => `2026-09-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:00:00Z`;
  const first5 = base.history;
  const populatedOver = (n) => wpFrom(base, { ...common, history: first5.slice(0, n) });

  const approvedHistory = [...first5, transition(6, at(26), 'for_review', 'approved', REVIEWER, { reason: 'Approved after review.', reviewVerdict: 'approved' })];
  const doneHistory = [...approvedHistory, transition(7, at(27, 10), 'approved', 'done', IMPLEMENTER)];
  const wpPopulated = populatedOver(2);
  const wpApproved = wpFrom(base, { ...common, history: approvedHistory });

  const canceled = structuredClone(ex['WorkPackage.canceled']);
  const canceledSynthetic = structuredClone(canceled);
  canceledSynthetic.cancellation = { reasonSource: 'synthetic', reason: 'Canceled without a stated reason.' };
  canceledSynthetic.history[0].reason = 'Canceled without a stated reason.';
  const canceledNull = structuredClone(canceled);
  canceledNull.cancellation = { reasonSource: 'operator', reason: null };
  canceledNull.history[0].reason = null;

  const richHistory = [
    transition(1, at(20, 8), null, 'planned', FINALIZER),
    transition(2, at(23, 9), 'planned', 'claimed', IMPLEMENTER),
    transition(3, at(23, 10), 'claimed', 'in_progress', IMPLEMENTER),
    transition(4, at(24, 10), 'in_progress', 'for_review', IMPLEMENTER, { force: true, reason: 'Sent to review by the operator before the last subtask.' }),
    transition(5, at(24, 16), 'for_review', 'in_progress', REVIEWER, { reason: 'Changes requested after review.', reviewVerdict: 'changes_requested' }),
    transition(6, at(25, 8), 'in_progress', 'for_review', IMPLEMENTER),
  ];

  const staleness = (value) => ({ ...structuredClone(wpPopulated), staleness: value });
  const omitted = structuredClone(wpPopulated);
  delete omitted.staleness;

  const nulls = structuredClone(wpPopulated);
  Object.assign(nulls, { executionMode: null, priority: null, mergeTargetBranch: null, phaseLabel: null, trackerRefs: [], implementerOfRecord: null });

  const long = structuredClone(wpApproved);
  long.title = `Build the detail view: ${LONG_WORD} ${LONG_SENTENCE}`;
  long.mergeTargetBranch = `release/${LONG_WORD.toLowerCase()}-${LONG_WORD.toLowerCase()}`;
  long.actor.profile = LONG_PROFILE;
  long.history[5].reason = LONG_SENTENCE;
  long.review.latestResult.reviewer = LONG_REVIEWER;
  long.review.latestResult.reference = `review-cycle://example-mission-01JZAB3C/WP04/${LONG_WORD.toLowerCase()}${LONG_WORD.toLowerCase()}/review-cycle-2.md ${LONG_SENTENCE}`;

  const bulkHistory = bulk.makeWorkPackageHistory(60);

  const unknownHistory = [...first5.slice(0, 2), transition(3, at(24), 'in_progress', 'on_hold', IMPLEMENTER)];
  const unknownLane = wpFrom(base, { ...common, history: unknownHistory, subtasks: { [ids[0]]: 'done', [ids[1]]: 'on_hold', [ids[2]]: 'planned' } });

  const ready = plannedWp(ex, { ...common, history: [transition(1, at(22, 8), null, 'planned', FINALIZER)] });
  const blocked = plannedWp(ex, {
    ids,
    ownedFiles: owned,
    dependencies: ['WP01', 'WP02'],
    unsatisfied: ['WP01', 'WP02'],
    history: [transition(1, at(22, 8), null, 'planned', FINALIZER)],
  });

  return {
    wpPopulated,
    wpWithPrompt: structuredClone(ex['WorkPackage.with-prompt']),
    wpProvisional: structuredClone(ex['WorkPackage.provisional']),
    wpNoEvents: structuredClone(ex['WorkPackage.no-events']),
    wpActorStructured: structuredClone(ex['WorkPackage.actor-structured']),
    wpActorHandle: structuredClone(ex['WorkPackage.actor-handle']),
    wpActorRedacted: structuredClone(ex['WorkPackage.actor-redacted']),
    wpCanceled: canceled,
    wpCanceledSynthetic: canceledSynthetic,
    wpCanceledNullReason: canceledNull,
    wpOverride: structuredClone(ex['WorkPackage.override']),
    wpOverridePartial: structuredClone(ex['WorkPackage.override-partial']),
    wpReviewNone: populatedOver(3),
    wpApproved,
    wpChangesRequested: populatedOver(4),
    wpDone: wpFrom(base, { ...common, history: doneHistory }),
    wpHistoryRich: wpFrom(base, { ...common, history: richHistory }),
    wpStale: staleness({ status: 'stale', reason: 'live_claim_process', minutesSinceCommit: 2880 }),
    wpFresh: staleness({ status: 'fresh', reason: null, minutesSinceCommit: 12 }),
    wpNotApplicable: staleness({ status: 'not_applicable', reason: 'planning_artifact_repo_root_shared_workspace', minutesSinceCommit: null }),
    wpStalenessOmitted: omitted,
    wpFactsNull: nulls,
    wpBlocked: blocked,
    wpReady: ready,
    wpLong: long,
    wpBulkHistory: wpFrom(base, { ...common, history: bulkHistory }),
    wpUnknownLane: unknownLane,
  };
}

function detailFixtures(ex, bulk) {
  const populated = ex['WorkPackageDetail.populated'];
  const from = (change) => {
    const d = structuredClone(populated);
    change(d);
    return d;
  };
  const long = from((d) => {
    d.subtasks = bulk.makeSubtasks(40);
    d.ownedFiles = bulk.makeOwnedFiles(100);
    d.dependencies[0].title = `${d.dependencies[0].title} ${LONG_WORD} ${LONG_SENTENCE}`;
    d.workspace.laneBranch = `kitty/mission-${LONG_WORD.toLowerCase()}-01JZCB3C-lane-a`;
  });
  return {
    detailPopulated: structuredClone(populated),
    detailNoCycles: structuredClone(ex['WorkPackageDetail.no-cycles']),
    detailNullWorkspace: structuredClone(ex['WorkPackageDetail.null-workspace']),
    detailWorkspaceNoWorktree: from((d) => {
      d.workspace.worktreePresent = false;
    }),
    detailPlanningLane: structuredClone(ex['WorkPackageDetail.planning-lane']),
    detailUnknownChangeState: structuredClone(ex['WorkPackageDetail.unknown-change-state']),
    // main (b61d1fa33) gave `.unparseable-cycle` a pointer and a path; the all-null cycle (WP-30, WP-35b) is now `.cycle-without-path`
    detailUnparseableCycle: structuredClone(ex['WorkPackageDetail.cycle-without-path']),
    detailRefusalNotFound: structuredClone(ex['WorkPackageDetailRefusal.not-found']),
    detailRefusalUnreadable: structuredClone(ex['WorkPackageDetailRefusal.source-unreadable']),
    detailSubtasksNone: from((d) => {
      d.subtasks = [];
    }),
    detailSubtaskNulls: from((d) => {
      d.subtasks[0] = { id: d.subtasks[0].id, title: null, statusLane: null };
    }),
    detailDepsNone: from((d) => {
      d.dependencies = [];
    }),
    detailDepsBlocked: from((d) => {
      d.dependencies = [
        { wpId: 'WP01', title: 'Define the data model', statusLane: 'planned' },
        { wpId: 'WP02', title: 'Build the list view', statusLane: 'in_progress' },
      ];
    }),
    detailDepNullLane: from((d) => {
      d.dependencies = [{ wpId: 'WP03', title: 'WP03', statusLane: null }];
    }),
    detailOwnedNone: from((d) => {
      d.ownedFiles = [];
    }),
    detailLinksPromptNull: from((d) => {
      d.artifactReferences.prompt = null;
    }),
    detailLinksNone: from((d) => {
      d.artifactReferences = { prompt: null, spec: null };
    }),
    detailRedaction: from((d) => {
      d.subtasks[0].title = 'Fix the loader for [path] and notify [email]';
      d.dependencies[0].title = 'Contract slice A for [path]';
    }),
    detailLong: long,
    detailUnknownLanes: from((d) => {
      d.subtasks[1].statusLane = 'on_hold';
      d.dependencies[0].statusLane = 'on_hold';
    }),
    detailOmittedProvisional: from((d) => {
      delete d.reviewCycles;
      delete d.workspace;
    }),
  };
}

/** A project whose branch (255), version (64) and name are at their limits; every character matches the contract patterns. */
function projectLong(base) {
  const branch = `topic/${'long-branch-segment-'.repeat(20)}`.slice(0, 255);
  return {
    ...structuredClone(base),
    name: `example-project-${LONG_WORD.toLowerCase()}-with-an-unbroken-name-that-keeps-going`,
    missionCount: 128,
    specKittyVersion: `4.0.0-rc.${'1'.repeat(64)}`.slice(0, 64),
    currentBranch: branch,
  };
}

// ---- Drift screen (mission-ui#10) ---------------------------------------------------------------------------------
// Every Drift overlay starts from the vendored populated report (or its first findings) and changes the one thing that
// makes it the fixture it is. Findings stay sorted by (missionId, kind, artifactPath) and keys stay unique; check.mjs
// recomputes both (C5). Mission ids are synthetic ULIDs.
const DRIFT_MISSION = { long: '01JZCB3G7H8J9KMNPQRSTVWXYZ', unlisted: '01JZCB3H8J9KMNPQRSTVWXYZ01', foreign: '01JZCB3J9KMNPQRSTVWXYZ0123' };

const driftFinding = (base, change) => ({ ...structuredClone(base), ...change });


function driftReportFrom(base, change) {
  const report = structuredClone(base);
  change(report.findings);
  return report;
}

/** A report of its own: the populated report's scan time and the given findings. */
const driftReportOf = (base, findings, truncated = false) => ({ scannedAt: base.scannedAt, findings, truncated });

function driftFixtures(ex) {
  const populated = ex['DriftReport.populated'];
  const [branchMissing, drift, , terminal, eventLogMissing] = populated.findings;
  const lane = (n, persisted, derived) => ({ wpId: `WP${String(n).padStart(2, '0')}`, persistedStatusLane: persisted, derivedStatusLane: derived });
  const manyRows = Array.from({ length: 40 }, (_, i) => {
    const pair = [['in_progress', 'for_review'], ['planned', null], [null, 'claimed'], ['approved', 'done'], ['blocked', 'in_progress']][i % 5];
    return lane(i + 1, pair[0], pair[1]);
  });
  const own = branchMissing.missionId;
  return {
    reportPopulated: structuredClone(populated),
    reportClean: structuredClone(ex['DriftReport.clean']),
    reportCorruptJson: structuredClone(ex['DriftReport.corrupt-json']),
    reportTruncated: structuredClone(ex['DriftReport.truncated']),
    refusalMissionNotFound: structuredClone(ex['DriftRefusal.mission-not-found']),
    refusalScanUnreadable: structuredClone(ex['DriftRefusal.scan-unreadable']),
    // One foreign word each, in the populated list (relaxation drift-vocabulary-open).
    reportUnknownKind: driftReportFrom(populated, (f) => { f[0] = driftFinding(f[0], { kind: 'derived_view_stale' }); }),
    reportUnknownSeverity: driftReportFrom(populated, (f) => { f[2] = driftFinding(f[2], { severity: 'info' }); }),
    reportUnknownAuthority: driftReportFrom(populated, (f) => { f[3] = driftFinding(f[3], { authority: 'operator' }); }),
    reportUnknownRemedy: driftReportFrom(populated, (f) => { f[1] = driftFinding(f[1], { remedy: 'rebuild_lanes' }); }),
    // sourceCode is a pattern, not an enum: an unknown code is valid as it stands.
    reportUnknownSourceCode: driftReportFrom(populated, (f) => { f[2] = driftFinding(f[2], { sourceCode: 'SNAPSHOT_DRIFT_FUTURE' }); }),
    reportOneSidedLane: driftReportOf(populated, [
      driftFinding(drift, { laneComparison: [lane(1, null, 'planned'), lane(2, 'done', null)] }),
    ]),
    reportManyLanes: driftReportOf(populated, [driftFinding(drift, { laneComparison: manyRows })]),
    reportLongSlugMission: driftReportOf(populated, [driftFinding(drift, { missionId: DRIFT_MISSION.long })]),
    reportMissionUnlisted: driftReportOf(populated, [driftFinding(drift, { missionId: DRIFT_MISSION.unlisted })]),
    reportScoped: driftReportOf(populated, [branchMissing, drift, eventLogMissing].map((x) => driftFinding(x, { missionId: own }))),
    reportScopedForeign: driftReportOf(populated, [
      ...[branchMissing, drift, eventLogMissing].map((x) => driftFinding(x, { missionId: own })),
      driftFinding(terminal, { missionId: DRIFT_MISSION.foreign }),
    ]),
  };
}

/**
 * Every fixture document, in registry order. `examples` is the parsed vendored examples (loadExamples); `bulk` is the
 * bulk module. Pure: the same inputs give the same documents.
 */
export function buildFixtures({ examples: ex, bulk }) {
  const c = itemCases(ex);
  const mixed = descending([c.active, c.blocked, c.staleActive, c.sparse, c.done, c.planned]);
  const full = descending([c.active, c.blocked, c.staleActive, c.sparse, c.done, c.planned, c.draft, c.discarded, c.stalePlanned]);
  const early = ex['MissionDetail.early'];
  const longName = item(ex, {
    n: 8,
    name: `Mission ${LONG_WORD} with a very long friendly name`,
    counts: { planned: 1, in_progress: 1 },
    declared: { progress: [15, 0, 0], lifecycleStatus: 'active' },
  });
  longName.slug = `${LONG_WORD.toLowerCase()}-with-a-very-long-slug-that-goes-on-01JZF008`;

  const out = {
    project: structuredClone(ex['Project.example']),
    projectEmpty: { ...structuredClone(ex['Project.example']), missionCount: 0 },
    projectUnknownHealth: { ...structuredClone(ex['Project.example']), health: 'unheard_of_health' },
    projectLong: projectLong(ex['Project.example']),
    pageMixed: { items: mixed, pageInfo: pageInfo(mixed, true) },
    pageFull: { items: full, pageInfo: pageInfo(full, true) },
    pageLast: { items: full.map((m) => structuredClone(m)), pageInfo: pageInfo(full, false) },
    pageFirst: structuredClone(ex['MissionOverviewPage.first']),
    pageExhausted: structuredClone(ex['MissionOverviewPage.exhausted']),
    pageLong: bulk.makeMissionPage(40, true),
    pageLongNames: { items: [longName], pageInfo: pageInfo([longName], false) },
    detailImplement: detailImplement(ex),
    detailBothInProgress: structuredClone(ex['MissionDetail.populated']),
    detailEarly: structuredClone(early),
    detailAllPending: {
      ...structuredClone(early),
      missionId: id(2),
      mid8: id(2).slice(0, 8),
      slug: `example-mission-${id(2).slice(0, 8)}`,
      friendlyName: 'Example Mission All Pending',
      phases: [
        phase('specify', 'pending', 'artifact'),
        phase('plan', 'pending', 'artifact'),
        phase('tasks', 'pending', 'artifact'),
        phase('implement', 'pending', 'derived_from_status_lanes'),
        phase('review', 'pending', 'derived_from_status_lanes'),
      ],
    },
    detailAllComplete: detailOf(ex['MissionDetail.populated'], {
      n: 3,
      name: 'Example Mission All Complete',
      wps: [
        wpOf('WP01', 'done', { title: 'Set up the project', sub: [3, 3] }),
        wpOf('WP02', 'done', { title: 'Build the screens', deps: ['WP01'], sub: [4, 4] }),
        wpOf('WP03', 'done', { title: 'Write the documentation', deps: ['WP02'], sub: [2, 2] }),
        wpOf('WP04', 'canceled', { title: 'Drop the extras', sub: [0, 1] }),
      ],
      declared: {
        progress: [75, 75, 3],
        lifecycleStatus: 'active',
        acceptedAt: null,
        nextAction: CONSOLIDATE(`example-mission-${id(3).slice(0, 8)}`),
        implement: 'complete',
        review: 'complete',
      },
      phaseList: phases('complete', 'complete'),
    }),
    detailBlockers: detailOf(ex['MissionDetail.populated'], {
      n: 4,
      name: 'Example Mission Blockers',
      wps: [
        wpOf('WP01', 'planned', { title: 'Plan the release' }),
        wpOf('WP02', 'in_progress', { title: 'Build the integration', sub: [1, 3] }),
        wpOf('WP03', 'blocked', { title: 'Wait for the upstream fix', deps: ['WP02'], sub: [0, 2] }),
      ],
      declared: { progress: [10, 0, 0], lifecycleStatus: 'active', implement: 'in_progress', review: 'pending' },
    }),
    detailBadges: detailBadges(ex),
    detailSubtasks: detailSubtasks(ex),
    detailLongNames: detailLongNames(ex),
    detailPhases3: phasesOpen(ex, 13, UNKNOWN_PHASES_3),
    detailPhases7: phasesOpen(ex, 14, UNKNOWN_PHASES_7),
    detailUnknownLane: detailOf(ex['MissionDetail.populated'], {
      n: 15,
      name: 'Example Mission Unknown Lane',
      wps: [
        wpOf('WP01', 'planned', { title: 'Plan the work' }),
        wpOf('WP02', 'in_progress', { title: 'Build the part', sub: [1, 2] }),
        wpOf('WP03', 'on_hold', { title: 'Held by a vocabulary the screen has not seen' }),
        wpOf('WP04', null, { title: 'Not started', phaseLabel: null }),
      ],
      declared: { progress: [15, 0, 0], lifecycleStatus: 'active', implement: 'in_progress', review: 'pending' },
    }),
    detailCustomGroups: detailImplement(ex),
  };
  out.detailCustomGroups.missionId = id(16);
  out.detailCustomGroups.mid8 = id(16).slice(0, 8);
  out.detailCustomGroups.slug = `example-mission-${id(16).slice(0, 8)}`;
  out.detailCustomGroups.friendlyName = 'Example Mission Custom Groups';
  return { ...out, ...workPackageFixtures(ex, bulk), ...detailFixtures(ex, bulk), ...driftFixtures(ex) };
}
