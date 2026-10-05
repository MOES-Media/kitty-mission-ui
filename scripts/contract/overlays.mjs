// Named overlays: each builds one fixture document from a vendored example plus the state the examples lack.
//
// An overlay computes ONLY the mechanical lane tally (statusLaneCounts, wpTotal, blockedCount) from the work
// packages it sets. Everything else derived (progress, lifecycleStatus, acceptedAt, nextAction and the status of the
// implement and review phases) is DECLARED as a literal here, per contract-pin.md "Declared derived values". check.mjs
// recomputes all of it with its own implementation; the two share no helper, so one mistake cannot hide the other.
// weightedPercentage is the producer's lane-weighted readiness for the fixture's counts (spec-kitty
// src/specify_cli/status/progress.py at the pin), declared, not computed.

/** The only values an overlay may write into a work package `actor` (host-only field). Obviously synthetic handles. */
export const SYNTHETIC_ACTORS = ['agent-a', 'agent-b', 'agent-c'];

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
      wpOf('WP04', 'in_progress', { title: 'Work owned by an agent', sub: [1, 2], actor: SYNTHETIC_ACTORS[0] }),
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
  return out;
}
