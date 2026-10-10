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

/** The Work Package screen's payload: a union discriminated by `target`. */
export type RetryLoadDetail = WorkPackageRetryDetail | DetailRetryDetail;

/** The Artifact Viewer's payload: the open content (with its path) or the whole listing. */
export type SkArtifactRetryDetail = { missionId: string; target: 'content'; path: string } | { missionId: string; target: 'listing' };

/** The payload of every `sk-retry-load`, whichever screen dispatches it. */
export type RetryLoadEventDetail = RetryLoadDetail | SkArtifactRetryDetail;

declare global {
  interface HTMLElementEventMap {
    'sk-retry-load': CustomEvent<RetryLoadEventDetail>;
  }
}
