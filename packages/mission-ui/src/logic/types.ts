// View types of the Missions and Pipeline screens (data-model.md). Hand-written; widening only.
// No member is named like a phase or a status lane: the `data-driven` gate scans this file.
import type { MissionOverviewView, WorkPackageView } from '../contract/types.js';

/** A board column: its label and the status lanes it holds. */
export interface LaneGroup {
  id: string;
  label: string;
  lanes: string[];
  /** Whether the cards in this column show their subtask bar (DR-1). Absent means false. */
  showsProgress?: boolean;
}

/** The tone of an `sk-pill-tag`. */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'attention' | 'danger' | 'recovery';

/** A pill: its text and tone. */
export interface StateBadge {
  label: string;
  tone: BadgeTone;
}

/** Optional label hooks; every resolution is `hook ?? default ?? raw`. */
export interface LabelHooks {
  phase?(name: string): string | undefined;
  lane?(lane: string): string | undefined;
  /** Called only for a lane that has a value: a work package with no lane is always "not started" and never asks. */
  state?(lane: string): StateBadge | undefined;
  time?(iso: string, now: string | null): string | undefined;
}

/** A status filter of the Missions screen; lives in `defaults/lifecycle.ts` only. */
export interface FilterDefinition {
  id: string;
  label: string;
  matches(mission: MissionOverviewView): boolean;
}

/** What `sk-filter-toggle-group` receives. */
export interface FilterOption {
  id: string;
  label: string;
}

/** A work package placed on the board, with the badge its card shows. */
export interface PlacedCard {
  wp: WorkPackageView;
  badge: StateBadge;
}

/** One board column. */
export interface PlacedColumn {
  group: LaneGroup;
  cards: PlacedCard[];
}

/** One Mission row, all text already resolved. The blocked badge is `blockedBadge`, not a lane word. */
export interface RowView {
  missionId: string;
  slug: string;
  name: string;
  type: string | null;
  topology: string;
  blockedBadge: StateBadge | null;
  stale: boolean;
  lifecycle: StateBadge;
  summary: string;
  activity: string;
}
