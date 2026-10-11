// The screen's own normalisers: one closed list per property, an unknown value falls to the documented default and never
// throws. `normaliseViewState` of #4 is not used and `view-state.ts` is not edited.
import { VIEW_STATES } from '../view-state.js';
import type { ArtifactContentStatus, ArtifactStatus, ArtifactTab } from './artifact-types.js';

/** `VIEW_STATES` with the two states of this screen added. */
export const ARTIFACT_STATUSES: readonly ArtifactStatus[] = [...VIEW_STATES, 'not-found', 'nothing-selected'];
export const ARTIFACT_CONTENT_STATUSES: readonly ArtifactContentStatus[] = ['loading', 'ready', 'refused', 'error'];
export const ARTIFACT_TABS: readonly ArtifactTab[] = ['rendered', 'raw'];

/** An unknown status collapses to `empty` (as the shell does), so a host bug is visible instead of an endless loading look. */
export function normaliseArtifactStatus(value: unknown): ArtifactStatus {
  return ARTIFACT_STATUSES.find((status) => status === value) ?? 'empty';
}

/** An unknown content status collapses to `ready`. */
export function normaliseContentStatus(value: unknown): ArtifactContentStatus {
  return ARTIFACT_CONTENT_STATUSES.find((status) => status === value) ?? 'ready';
}

/** An unknown `view` collapses to `rendered`. */
export function normaliseArtifactView(value: unknown): ArtifactTab {
  return ARTIFACT_TABS.find((tab) => tab === value) ?? 'rendered';
}
