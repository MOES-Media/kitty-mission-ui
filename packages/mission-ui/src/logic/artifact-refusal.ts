// The refusal block's words: a table lookup, an unknown code raw and final. No vocabulary argument: the refusal table is
// not a member of the vocabulary (a foreign code goes through `labels.refusal`, which replaces the eyebrow only).
import { ARTIFACT_REFUSALS, CONTENT_SIZE_LIMIT_BYTES, REFUSAL_GENERIC, REFUSAL_GENERIC_EYEBROW } from '../defaults/index.js';
import { formatArtifactSize } from './artifact-size.js';
import type { ArtifactLabelHooks } from './artifact-types.js';
import { lookup } from './lookup.js';

export interface ArtifactRefusalText {
  eyebrow: string;
  sentence: string;
  retryable: boolean;
}

/**
 * A known code is its table row; an unknown code is the raw code over the generic sentence and not retryable; a null code
 * is the generic sentence. `labels.refusal(code)` replaces the eyebrow for any code, never the sentence or the retry flag.
 */
export function resolveArtifactRefusal(code: string | null, context: { sizeText: string | null }, hooks: ArtifactLabelHooks | null): ArtifactRefusalText {
  if (code === null) return { eyebrow: REFUSAL_GENERIC_EYEBROW, sentence: REFUSAL_GENERIC, retryable: false };
  const row = lookup(ARTIFACT_REFUSALS, code);
  const eyebrow = hooks?.refusal?.(code) ?? row?.eyebrow ?? code;
  if (row === undefined) return { eyebrow, sentence: REFUSAL_GENERIC, retryable: false };
  const limitText = formatArtifactSize(CONTENT_SIZE_LIMIT_BYTES, hooks);
  return { eyebrow, sentence: row.sentence({ sizeText: context.sizeText, limitText }), retryable: row.retryable };
}
