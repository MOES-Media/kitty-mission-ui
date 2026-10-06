import type { WorkPackageDetailView, WorkPackageRecordView } from '../contract/types.js';
import type { ResolvedFile } from './wp-files.js';

export interface ResolvedSubtask {
  id: string;
  title: string | null;
  lane: string | null;
}

export interface ResolvedDependency {
  wpId: string;
  title: string | null;
  lane: string | null;
}

export interface ResolvedLists {
  source: 'detail' | 'bare';
  /** The usable detail (its wpId matches), else null; the detail-only regions draw from it. */
  detail: WorkPackageDetailView | null;
  subtasks: ResolvedSubtask[];
  dependencies: ResolvedDependency[];
  ownedFiles: ResolvedFile[];
}

/**
 * The one place that reads the Work Package's subtasks, dependencies and owned files. With a usable detail, its titled
 * lists; otherwise the bare 1.0 forms. A detail for another Work Package counts as omitted. Nothing is sorted, filtered
 * or counted.
 */
export function resolveLists(wp: WorkPackageRecordView, detail: WorkPackageDetailView | null): ResolvedLists {
  if (detail !== null && detail.wpId === wp.wpId) {
    return {
      source: 'detail',
      detail,
      subtasks: detail.subtasks.map((s) => ({ id: s.id, title: s.title, lane: s.statusLane })),
      dependencies: detail.dependencies.map((d) => ({ wpId: d.wpId, title: d.title, lane: d.statusLane })),
      ownedFiles: detail.ownedFiles.map((f) => ({ pattern: f.pattern, isGlob: f.isGlob, changeState: f.changeState })),
    };
  }
  return {
    source: 'bare',
    detail: null,
    subtasks: Object.entries(wp.subtasks).map(([id, lane]) => ({ id, title: null, lane })),
    dependencies: wp.dependencies.map((id) => ({ wpId: id, title: null, lane: null })),
    ownedFiles: wp.ownedFiles.map((pattern) => ({ pattern, isGlob: false, changeState: null })),
  };
}
