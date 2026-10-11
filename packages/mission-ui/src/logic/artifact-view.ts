// What the document pane shows: the total mapping of `data-model.md`, the bidirectional-control count and the hidden-
// heading predicate. Structural branching only; the markdown model is typed structurally and never imported here.
import type { ArtifactContentView, ArtifactListingView } from '../contract/types.js';
import { BIDI_CONTROL_CODE_POINTS, CONTENT_ERROR_DEFAULT } from '../defaults/index.js';
import {
  resolveArtifactVocabulary,
  type ArtifactContentStatus,
  type ArtifactStatus,
  type ArtifactTab,
  type ArtifactVocabulary,
  type MarkdownOutcome,
} from './artifact-types.js';

/** What the document pane shows. */
export interface ArtifactView {
  pane: 'listing-state' | 'nothing-selected' | 'loading' | 'refusal' | 'error' | 'empty-file' | 'document';
  /** Whether the pane draws two tabs. */
  tabs: 'two' | 'none';
  /** The body of the rendered tab; a raw-only file and an empty file say `raw`. */
  body: 'rendered' | 'fallback' | 'raw';
  /** Whether the media type is the markdown one. */
  markdown: boolean;
  redacted: boolean;
  /** The number of bidirectional control characters in the content. */
  bidiControls: number;
  errorText: string | null;
}

/** What the resolver reads. `view` is the screen's property bag member: accepted so the bag passes whole, never read. */
export interface ArtifactViewInput {
  status: ArtifactStatus;
  contentStatus: ArtifactContentStatus;
  selectedPath: string;
  listing: ArtifactListingView | null;
  content: ArtifactContentView | null;
  refusalCode: string | null;
  errorMessage: string;
  view?: ArtifactTab;
  /** The model result for the content, or null when the content is not markdown. */
  markdown: MarkdownOutcome | null;
}

/** The number of characters of `text` whose code point is in the list. The text is never altered. */
export function countBidiControls(text: string, codePoints: readonly number[] = BIDI_CONTROL_CODE_POINTS): number {
  let count = 0;
  for (const ch of text) {
    if (codePoints.includes(ch.codePointAt(0) ?? -1)) count += 1;
  }
  return count;
}

const NO_CONTENT: Omit<ArtifactView, 'pane'> = { tabs: 'none', body: 'raw', markdown: false, redacted: false, bidiControls: 0, errorText: null };
const paneOf = (pane: ArtifactView['pane'], over: Partial<ArtifactView> = {}): ArtifactView => ({ pane, ...NO_CONTENT, ...over });

/** The first matching row of the table wins. */
export function resolveArtifactView(input: ArtifactViewInput, vocabulary?: ArtifactVocabulary | null): ArtifactView {
  const { status, contentStatus, content } = input;
  if (status === 'loading' || status === 'error' || status === 'empty' || status === 'not-found') return paneOf('listing-state');
  if (status === 'ready' && input.listing === null) return paneOf('listing-state');
  if (status === 'nothing-selected' || input.selectedPath === '') return paneOf('nothing-selected');
  if (contentStatus === 'loading') return paneOf('loading');
  if (contentStatus === 'refused') return paneOf('refusal');
  if (contentStatus === 'error') return paneOf('error', { errorText: input.errorMessage === '' ? CONTENT_ERROR_DEFAULT : input.errorMessage });
  if (content === null) return paneOf('loading');

  const isMarkdown = content.mediaType === resolveArtifactVocabulary(vocabulary).mediaType;
  const shared = { markdown: isMarkdown, redacted: content.redacted, bidiControls: countBidiControls(content.content) };
  if (content.content === '' && content.sizeBytes === 0) return paneOf('empty-file', { ...shared, tabs: isMarkdown ? 'two' : 'none' });
  if (!isMarkdown) return paneOf('document', shared);
  return paneOf('document', { ...shared, tabs: 'two', body: input.markdown?.kind === 'ok' ? 'rendered' : 'fallback' });
}

/**
 * True when the pane has no `h1` of its own: a raw-only file, the Raw tab, the fallback, the empty file and the loading
 * look. A rendered markdown body keeps the headings it was authored with, and a refusal, an error and every state draw
 * their own title as the `h1`.
 */
export function needsHiddenHeading(view: ArtifactView, tab: ArtifactTab): boolean {
  switch (view.pane) {
    case 'document':
      return view.tabs === 'none' || view.body !== 'rendered' || tab === 'raw';
    case 'empty-file':
    case 'loading':
      return true;
    default:
      return false;
  }
}
