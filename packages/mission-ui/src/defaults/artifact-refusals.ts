// Refusal vocabulary of the Artifact Viewer (provisional until CP-1). The refusal table is the only home of the seven
// refusal codes. `not_found` is also a key of #5's detail refusal table: a separate table, and no code is read from it.
import type { ArtifactRefusalCode } from '../contract/types.js';

/** What a sentence may mention: the size of the artifact when the host gave one, and the limit as text. */
export interface ArtifactRefusalContext {
  sizeText: string | null;
  limitText: string;
}

/** One refusal row: the cause word above the title, the sentence, and whether Retry is offered. */
export interface ArtifactRefusalRow {
  eyebrow: string;
  sentence(context: ArtifactRefusalContext): string;
  retryable: boolean;
}

/**
 * Retry is offered only for `artifact_unreadable` in the content block. The listing failure is shown as `status: error`
 * with its own Retry, so its row here is not retryable (the content block's one Retry emits the content target).
 */
export const ARTIFACT_REFUSALS: Readonly<Record<ArtifactRefusalCode, ArtifactRefusalRow>> = {
  invalid_artifact_path: { eyebrow: 'Invalid path', sentence: () => 'The path is not a valid artifact path.', retryable: false },
  not_found: { eyebrow: 'Not found', sentence: () => 'This artifact does not exist in this Mission.', retryable: false },
  artifact_too_large: {
    eyebrow: 'Too large',
    sentence: (ctx) =>
      ctx.sizeText
        ? `This artifact is ${ctx.sizeText}, over the ${ctx.limitText} limit, so it is not shown.`
        : `This artifact is over the ${ctx.limitText} limit, so it is not shown.`,
    retryable: false,
  },
  artifact_not_text: { eyebrow: 'Not text', sentence: () => 'This artifact is not text, so it is not shown.', retryable: false },
  artifact_secret: {
    eyebrow: 'Credential found',
    sentence: () => 'This artifact holds what looks like a credential, so nothing of it is shown.',
    retryable: false,
  },
  artifact_unreadable: { eyebrow: 'Unreadable', sentence: () => 'This artifact could not be read.', retryable: true },
  artifact_listing_unreadable: { eyebrow: 'Unreadable', sentence: () => 'The list of artifacts could not be read.', retryable: false },
};

/** The sentence for a code the table does not know, and for a refusal with no code. */
export const REFUSAL_GENERIC = 'This artifact could not be shown.';
/** The cause word of a refusal with no code (a code the table does not know shows the raw code instead). */
export const REFUSAL_GENERIC_EYEBROW = 'Unavailable';
/** The title of the refusal block. */
export const REFUSAL_TITLE = 'Artifact unavailable';
/** The host-neutral text of a failed content read and of a failed listing read, used when the host passes no message. */
export const CONTENT_ERROR_DEFAULT = 'The artifact could not be loaded.';
export const LISTING_ERROR_DEFAULT = 'The list of artifacts could not be loaded. No artifacts are shown.';
/** The heading of the listing error panel: a different sentence from the body, as the Missions error panel's heading is. */
export const LISTING_ERROR_HEADING = 'Artifacts unavailable';
/** The contract's size limit in bytes, as data; the limit text is derived from it by the size formatter. */
export const CONTENT_SIZE_LIMIT_BYTES = 262144;
