import type { WorkPackageView } from '../../contract/types.js';
import type { LabelHooks, LaneGroup } from '../../logic/types.js';

/** Synthetic data only: no real names, paths, usernames or e-mail addresses. */
interface WpInit {
  wpId: string;
  title: string;
  statusLane: string | null;
  dependencies?: string[];
  actor?: string;
  done?: number;
  total?: number;
}

export function wp(init: WpInit): WorkPackageView {
  const view: WorkPackageView = {
    wpId: init.wpId,
    title: init.title,
    phaseLabel: null,
    statusLane: init.statusLane,
    dependencies: init.dependencies ?? [],
    readiness: { satisfied: true, unsatisfied: [] },
    readyToStart: false,
    subtaskProgress: { done: init.done ?? 0, total: init.total ?? 0 },
    lastTransitionAt: null,
  };
  if (init.actor !== undefined) view.actor = init.actor;
  return view;
}

/** One work package in or near every default column; the Review column holds a card (DR-12). */
export const fiveColumnsWps: WorkPackageView[] = [
  wp({ wpId: 'WP04', title: 'Fix navigation state restoration on reload', statusLane: 'planned', dependencies: ['WP03'], actor: 'agent-alpha' }),
  wp({ wpId: 'WP03', title: 'Implement dark mode toggle in preferences', statusLane: 'in_progress', actor: 'agent-beta', done: 2, total: 5 }),
  wp({ wpId: 'WP02', title: 'Audit accessibility labels on main navigation', statusLane: 'for_review', actor: 'human' }),
  wp({ wpId: 'WP05', title: 'Add keyboard shortcuts overview', statusLane: 'approved', dependencies: ['WP02'] }),
  wp({ wpId: 'WP01', title: 'Set up the preferences store', statusLane: 'done', actor: 'agent-alpha' }),
];

/** Blocked, in review, canceled and not started: the four distinct badges (FR-016). */
export const badgesWps: WorkPackageView[] = [
  wp({ wpId: 'WP01', title: 'Not started yet', statusLane: null }),
  wp({ wpId: 'WP02', title: 'Waiting on an upstream change', statusLane: 'blocked', dependencies: ['WP05'], actor: 'agent-alpha' }),
  wp({ wpId: 'WP03', title: 'Being reviewed right now', statusLane: 'in_review', actor: 'human' }),
  wp({ wpId: 'WP04', title: 'Dropped from the plan', statusLane: 'canceled' }),
];

/** A lane no group holds and a null lane both land in the first column (D-07). */
export const unknownAndNullWps: WorkPackageView[] = [
  wp({ wpId: 'WP01', title: 'Ordinary planned work', statusLane: 'planned' }),
  wp({ wpId: 'WP02', title: 'A lane the board has never seen', statusLane: 'parked', actor: 'agent-alpha' }),
  wp({ wpId: 'WP03', title: 'No status events yet', statusLane: null }),
  wp({ wpId: 'WP04', title: 'In progress as usual', statusLane: 'in_progress', done: 1, total: 4 }),
];

/** Three custom columns holding two custom lanes and two default lanes (no `showsProgress`). */
export const customGroups: LaneGroup[] = [
  { id: 'intake', label: 'Intake', lanes: ['triage', 'planned'] },
  { id: 'build', label: 'Build', lanes: ['working', 'in_progress'] },
  { id: 'shipped', label: 'Shipped', lanes: ['released'] },
];

export const customGroupsWps: WorkPackageView[] = [
  wp({ wpId: 'WP01', title: 'Triage the incoming request', statusLane: 'triage' }),
  wp({ wpId: 'WP02', title: 'Plan the rollout', statusLane: 'planned', dependencies: ['WP01'] }),
  wp({ wpId: 'WP03', title: 'Write the importer', statusLane: 'working', actor: 'agent-alpha', done: 2, total: 5 }),
  wp({ wpId: 'WP04', title: 'Release the importer', statusLane: 'released' }),
];

/** A foreign vocabulary: its own columns, lanes and badge words. */
export const foreignLabels: LabelHooks = {
  state: (lane) => (lane === null ? undefined : { label: `st:${lane}`, tone: 'info' }),
};

/** 2 of 5 and 3 of 3 and total 0 in the In progress column; progress in other columns is not drawn (DR-1). */
export const subtaskProgressWps: WorkPackageView[] = [
  wp({ wpId: 'WP01', title: 'Planned with subtasks', statusLane: 'planned', done: 0, total: 4 }),
  wp({ wpId: 'WP02', title: 'Partly done', statusLane: 'in_progress', actor: 'agent-alpha', done: 2, total: 5 }),
  wp({ wpId: 'WP03', title: 'Every subtask done', statusLane: 'claimed', actor: 'agent-beta', done: 3, total: 3 }),
  wp({ wpId: 'WP04', title: 'No subtasks at all', statusLane: 'in_progress', done: 0, total: 0 }),
  wp({ wpId: 'WP05', title: 'In review with subtasks', statusLane: 'for_review', done: 4, total: 4 }),
  wp({ wpId: 'WP06', title: 'Done with subtasks', statusLane: 'done', done: 6, total: 6 }),
];

export const longNamesWps: WorkPackageView[] = [
  wp({
    wpId: 'WP-LONG-IDENTIFIER-0042',
    title: 'Reconcile the extraordinarily long-winded work package title that keeps going well past any sensible column width',
    statusLane: 'planned',
    dependencies: ['WP-LONG-IDENTIFIER-0040', 'WP-LONG-IDENTIFIER-0041'],
    actor: 'agent-with-a-remarkably-long-actor-name',
  }),
  wp({
    wpId: 'WP07',
    title: 'Supercalifragilisticexpialidocious_unbreakable_token_in_a_title',
    statusLane: 'in_progress',
    actor: 'agent-alpha',
    done: 1,
    total: 9,
  }),
];
