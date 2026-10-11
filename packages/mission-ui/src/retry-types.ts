// The neutral home of the `sk-retry-load` payload: the event is shared by the Work Package screen and the Artifact Viewer, and
// `HTMLElementEventMap['sk-retry-load']` can be declared once. The members are discriminated by `target`. A later screen adds its
// member here with its own `target` word instead of declaring the event again (D-04, amendment A-3; the `shell-types.ts` precedent).

/** The retry of the whole Work Package read. */
export interface WorkPackageRetryDetail {
  missionId: string;
  wpId: string;
  target: 'work-package';
}

/** The retry of the detail regions only. */
export interface DetailRetryDetail {
  missionId: string;
  wpId: string;
  target: 'detail';
}

/** The retry of one Projects list entry; `key` is the host's entry identity. */
export interface ProjectRetryDetail {
  target: 'project';
  key: string;
}

/** The retry of the whole Projects list. */
export interface ProjectsRetryDetail {
  target: 'projects';
}

/** The retry of the folder listing of the open-project dialog. */
export interface FoldersRetryDetail {
  target: 'folders';
}

/** The two Work Package members: the only ones `retryDetail` builds. */
export type WorkPackageRetryMember = WorkPackageRetryDetail | DetailRetryDetail;

/** The payload of the Work Package and Projects screens: a union discriminated by `target`. */
export type RetryLoadDetail = WorkPackageRetryMember | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail;

/** The Artifact Viewer's payload: the open content (with its path) or the whole listing. */
export type SkArtifactRetryDetail = { missionId: string; target: 'content'; path: string } | { missionId: string; target: 'listing' };

/** The Drift screen's payload: a whole-project scan has no Work Package, so `missionId` is null when unscoped. */
export interface DriftRetryDetail {
  missionId: string | null;
  target: 'drift-report';
}

/**
 * The retry of one Ops page (the Ops screen's payload, joined to the event union only, as the Drift member is). It carries no Mission or Work Package id: the screen has neither. No cursor
 * retries the first page (and a refused cursor starts again from the newest); a cursor retries the page after it.
 */
export interface OpsPageRetryDetail {
  target: 'ops-page';
  cursor?: string;
}

/** The payload of every `sk-retry-load`, whichever screen dispatches it. */
export type RetryLoadEventDetail = RetryLoadDetail | SkArtifactRetryDetail | DriftRetryDetail | OpsPageRetryDetail;

declare global {
  interface HTMLElementEventMap {
    'sk-retry-load': CustomEvent<RetryLoadEventDetail>;
  }
}
