// Types of the Artifact Viewer's logic and the one optional structural input (`vocabulary`). Types, plus the function that
// completes a partly filled vocabulary. No kind, lane, phase or refusal-code literal: every word is in src/defaults/.
import {
  ARTIFACT_KIND_WORDS,
  MARKDOWN_BUDGET,
  MARKDOWN_MEDIA_TYPE,
  TOKEN_SEPARATOR,
  WORK_PACKAGE_LINK_KINDS,
  WP_CONTAINER_SEGMENT,
  type ArtifactKindWord,
  type MarkdownBudget,
} from '../defaults/index.js';
import type { ViewState } from '../view-state.js';
import type { LabelHooks } from './types.js';

/** The listing and screen state: the four view states plus the two states this screen adds. */
export type ArtifactStatus = ViewState | 'not-found' | 'nothing-selected';

/** The state of the open document only. */
export type ArtifactContentStatus = 'loading' | 'ready' | 'refused' | 'error';

/** The two panels of a markdown file. */
export type ArtifactTab = 'rendered' | 'raw';

/**
 * The shared `LabelHooks` is not edited: a screen that does not read these hooks never sees them. Every resolution is
 * `hook ?? default ?? raw`. `time` serves "Modified"; `refusal(code)` replaces the eyebrow of the refusal block only.
 */
export interface ArtifactLabelHooks extends LabelHooks {
  kind?(kind: string): string | undefined;
  refusal?(code: string): string | undefined;
  mediaType?(type: string): string | undefined;
  size?(bytes: number): string | undefined;
}

/**
 * The host's Mission, a structural subset of `MissionDetail` (a `MissionDetail` is accepted as is). `slug` feeds the
 * return event; every other field is a Mission fact shown only when present.
 */
export interface ArtifactScreenMission {
  missionId: string;
  slug: string;
  friendlyName?: string | null;
  missionType?: string | null;
  topology?: string | null;
  targetBranch?: string | null;
  lifecycleStatus?: string | null;
}

/** A host Work Package id, a structural subset of `MissionDetail.workPackages[]`. */
export interface ArtifactScreenWorkPackage {
  wpId: string;
  title?: string | null;
}

/**
 * What the view resolver reads of a markdown model result, typed structurally so nothing here imports the markdown
 * model: the model's own `MarkdownResult` satisfies it.
 */
export interface MarkdownOutcome {
  kind: 'ok' | 'fallback';
}

/** The segment under which Work Package files live and the separator that follows an id in a segment name. */
export interface ArtifactContainer {
  segment: string;
  separator: string;
}

/**
 * The one optional structural input, in five groups. A group that is present is used as given, whole and not merged key
 * by key; a group that is absent (or null) takes the `defaults/` value, so `{}` equals `null`. The copy is NOT a member:
 * a string override goes through the `labels` hooks.
 */
export interface ArtifactVocabulary {
  /** The kind table: the label and the icon of each kind. */
  kinds?: Readonly<Record<string, ArtifactKindWord>> | null;
  /** The kinds that get "Open Work Package" and a derived linked Work Package. */
  linkKinds?: readonly string[] | null;
  /** The container segment with the token separator. */
  container?: ArtifactContainer | null;
  /** The media type the screen renders as markdown. */
  mediaType?: string | null;
  /** The numeric limits of the markdown model. */
  budget?: MarkdownBudget | null;
}

/** A vocabulary with all five groups present. */
export interface ResolvedArtifactVocabulary {
  kinds: Readonly<Record<string, ArtifactKindWord>>;
  linkKinds: readonly string[];
  container: ArtifactContainer;
  mediaType: string;
  budget: MarkdownBudget;
}

/** The default vocabulary, built from `defaults/` (nothing duplicated). */
export const DEFAULT_ARTIFACT_VOCABULARY: ResolvedArtifactVocabulary = {
  kinds: ARTIFACT_KIND_WORDS,
  linkKinds: WORK_PACKAGE_LINK_KINDS,
  container: { segment: WP_CONTAINER_SEGMENT, separator: TOKEN_SEPARATOR },
  mediaType: MARKDOWN_MEDIA_TYPE,
  budget: MARKDOWN_BUDGET,
};

/** Completes a partly filled vocabulary PER GROUP against `defaults/`: a present group whole, an absent group the default. */
export function resolveArtifactVocabulary(vocabulary: ArtifactVocabulary | null | undefined): ResolvedArtifactVocabulary {
  const d = DEFAULT_ARTIFACT_VOCABULARY;
  return {
    kinds: vocabulary?.kinds ?? d.kinds,
    linkKinds: vocabulary?.linkKinds ?? d.linkKinds,
    container: vocabulary?.container ?? d.container,
    mediaType: vocabulary?.mediaType ?? d.mediaType,
    budget: vocabulary?.budget ?? d.budget,
  };
}
