import {
  OPS_ERROR_BY_CODE,
  OPS_COPY,
  OPS_MONTHS,
  loadedAnnouncement,
  opsCountText,
  skippedText,
  type OpsCopyKey,
  type OpsCopyResolver,
} from '../defaults/ops-copy.js';
import { lookup } from './lookup.js';
import type { OpsLookResult } from './ops-look.js';
import { formatUtcInstant } from './ops-time.js';

/**
 * The word and time overrides of the Ops screen, in the shape of `LabelHooks`: every method may return undefined, which falls
 * back to `defaults/ops-copy.ts`. The word hooks receive the contract word (also one the screen has never seen).
 */
export interface OpsLabelHooks {
  outcome?(word: string): string | undefined;
  status?(word: string): string | undefined;
  closer?(word: string): string | undefined;
  mode?(word: string): string | undefined;
  evidenceClass?(word: string): string | undefined;
  /** Rewords the printed instant; the served string stays in `datetime`. */
  time?(iso: string): string | undefined;
  /** Rewords one copy key; a template key keeps its `{placeholders}`. */
  copy?(key: string): string | undefined;
}

/** The copy resolver behind a `labels` value: hook, then the default. */
export function copyResolver(labels: OpsLabelHooks | null): OpsCopyResolver {
  return (key) => labels?.copy?.(key) ?? OPS_COPY[key];
}

/** One copy string, by key. */
export function opsCopyText(key: OpsCopyKey, labels: OpsLabelHooks | null): string {
  return copyResolver(labels)(key);
}

/** A served instant as the text to print and the string for `datetime` (null when the instant cannot be read). */
export function opsTimeText(iso: string, labels: OpsLabelHooks | null): { text: string; datetime: string | null } {
  const formatted = formatUtcInstant(iso, OPS_MONTHS);
  return { text: labels?.time?.(iso) ?? formatted ?? iso, datetime: formatted === null ? null : iso };
}

/** "{loaded} of {total}", or "{total} records" when everything is loaded. */
export function opsCountLabel(loaded: number, total: number, labels: OpsLabelHooks | null): string {
  return opsCountText(loaded, total, copyResolver(labels));
}

/** The skipped-record sentence, singular handled. */
export function opsSkippedLabel(n: number, labels: OpsLabelHooks | null): string {
  return skippedText(n, copyResolver(labels));
}

/**
 * The empty look: the heading is always the empty heading; the body is the profile sentence if a profile is set, else the plain
 * sentence (each a full sentence); whenever records were skipped the skipped sentence is returned apart from it (in the "in this
 * project" wording, CP-1), so the screen can draw the profile between the two sentences.
 */
export function opsEmptyText(profile: string | null, skippedCount: number, labels: OpsLabelHooks | null): { heading: string; body: string; skipped: string | null } {
  const copy = copyResolver(labels);
  return {
    heading: copy('emptyHeading'),
    body: copy(profile !== null ? 'emptyProfile' : 'emptyBody'),
    skipped: skippedCount > 0 ? skippedText(skippedCount, copy) : null,
  };
}

/**
 * The error body: the host's message if it gave one, else the sentence of the refusal code, else the generic body. The table
 * (code to copy key) is a parameter so a test can prove the lookup; the default table maps `ops_unreadable` to the generic body
 * (CP-1: refusal copy stays generic for every code).
 */
export function opsErrorText(
  refusalCode: string | null,
  errorMessage: string,
  labels: OpsLabelHooks | null,
  table: Readonly<Record<string, OpsCopyKey>> = OPS_ERROR_BY_CODE,
): string {
  if (errorMessage !== '') return errorMessage;
  const key = refusalCode === null ? undefined : lookup(table, refusalCode);
  return copyResolver(labels)(key ?? 'errorBody');
}

/** What an announcement counts: rows loaded, the total, and the rows a load-more added (null when it was not a load-more). */
export interface OpsAnnouncementCounts {
  loaded: number;
  total: number;
  added: number | null;
}

/** The live-region text for what is shown, keyed on the (look, reason) pair; null announces nothing. */
export function lookAnnouncement(result: OpsLookResult, counts: OpsAnnouncementCounts, labels: OpsLabelHooks | null): string | null {
  const copy = copyResolver(labels);
  switch (result.look) {
    case 'loading':
      return result.reason === 'status' ? copy('announceLoading') : null;
    case 'ready':
      return loadedAnnouncement(counts.loaded, counts.total, counts.added, copy);
    case 'empty':
      return copy('emptyHeading');
    default:
      return null;
  }
}
