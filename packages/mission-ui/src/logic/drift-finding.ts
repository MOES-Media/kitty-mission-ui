// Pure view-model of one Drift finding (FR-028): no DOM, no I/O, no sorting. Every word is `hook ?? default ?? raw` and every
// table read is an own-key read, so a value the screen has never seen survives as given (C-007).
import {
  AUTHORITY_WORDS,
  DERIVED_SIDE_WORDS,
  KIND_COPY,
  LANE_NOTES,
  NOT_PRESENT_WORD,
  REMEDY_COMMANDS,
  SEVERITY_WORDS,
  UNKNOWN_MISSION_COMMAND_NOTE,
} from '../defaults/index.js';
import type { DriftFindingKey, DriftFindingView, DriftMissionName } from '../contract/types.js';
import { resolveLaneLabel } from './labels.js';
import { lookup } from './lookup.js';
import type { BadgeTone, LabelHooks } from './types.js';

/** What the view-model reads besides the finding: the host's Mission names and the label hooks. */
interface FindingContext {
  missions: Readonly<Record<string, DriftMissionName>> | null;
  hooks: LabelHooks | null;
}

/** One lane row, both sides already in words. */
export interface LaneRowView {
  wpId: string;
  persisted: string;
  derived: string;
}

/** A severity as drawn: its word and its tone. */
interface SeverityView {
  word: string;
  tone: BadgeTone;
}

export interface FindingView {
  key: DriftFindingKey;
  title: string;
  kicker: { severity: SeverityView; kind: string };
  sourceCodeTag: string | null;
  explanation: string | null;
  authorityWord: string;
  derivedSideWord: string;
  file: string;
  mission: MissionNaming;
  laneRows: LaneRowView[];
  laneNote: string | null;
  command: { text: string; remedy: string } | null;
  commandNote: string | null;
}

/** The identity of a finding: a Mission has at most one finding of a kind for a file. */
export function findingKey(finding: Pick<DriftFindingView, 'missionId' | 'kind' | 'artifactPath'>): DriftFindingKey {
  return { missionId: finding.missionId, kind: finding.kind, artifactPath: finding.artifactPath };
}

/** Exact string equality on all three parts. */
export function sameKey(a: DriftFindingKey, b: DriftFindingKey): boolean {
  return a.missionId === b.missionId && a.kind === b.kind && a.artifactPath === b.artifactPath;
}

/**
 * The repeat key of each row, in the report's own order. A duplicate (a contract violation) gets the 1-based occurrence
 * number appended, so no row is dropped.
 */
export function rowKeys(findings: readonly DriftFindingView[]): string[] {
  const seen = new Map<string, number>();
  return findings.map((finding) => {
    const base = `${finding.missionId}|${finding.kind}|${finding.artifactPath}`;
    const occurrence = (seen.get(base) ?? 0) + 1;
    seen.set(base, occurrence);
    return occurrence === 1 ? base : `${base}|${occurrence}`;
  });
}

/** hook, then the default word and tone, then the raw value in the neutral tone. */
export function resolveSeverity(severity: string, hooks: LabelHooks | null): SeverityView {
  const hooked = hooks?.severity?.(severity);
  if (hooked !== undefined) return { word: hooked.label, tone: hooked.tone };
  const known = lookup(SEVERITY_WORDS, severity);
  return known === undefined ? { word: severity, tone: 'neutral' } : { word: known.word, tone: known.tone };
}

/** The kicker word of a kind. */
function resolveKindWord(kind: string, hooks: LabelHooks | null): string {
  return hooks?.kind?.(kind) ?? lookup(KIND_COPY, kind)?.kicker ?? kind;
}

function resolveAuthorityWord(authority: string, hooks: LabelHooks | null): string {
  return hooks?.authority?.(authority) ?? lookup(AUTHORITY_WORDS, authority) ?? authority;
}

function resolveDerivedSideWord(side: string, hooks: LabelHooks | null): string {
  return hooks?.derivedSide?.(side) ?? lookup(DERIVED_SIDE_WORDS, side) ?? side;
}

/**
 * The sentence for a pair of kind and source code (spec Edge Cases, FR-011): a kind with a `bySourceCode` table needs the code
 * to be an own key of it; a kind without one has its sentence only for a null code. Any other pair has none.
 */
function explanationOf(kind: string, sourceCode: string | null): string | null {
  const entry = lookup(KIND_COPY, kind);
  if (entry === undefined) return null;
  if (entry.bySourceCode === undefined) return sourceCode === null ? (entry.explanation ?? null) : null;
  return sourceCode === null ? null : (lookup(entry.bySourceCode, sourceCode) ?? null);
}

function laneWord(lane: string | null, hooks: LabelHooks | null): string {
  return lane === null ? NOT_PRESENT_WORD : resolveLaneLabel(lane, hooks);
}

/** The title of a finding in the list and in the detail: its summary, else the kind word. */
export function findingTitle(finding: Pick<DriftFindingView, 'summary' | 'kind'>, hooks: LabelHooks | null): string {
  return finding.summary === '' ? resolveKindWord(finding.kind, hooks) : finding.summary;
}

/** The names a Mission has for the screen: the slug (null when the host gave none) and the friendly name. */
export interface MissionNaming {
  missionId: string;
  slug: string | null;
  friendlyName: string | null;
}

/** The host's names for one Mission, by an own-key read (C-007): a slug that is missing or empty is null. */
export function missionNaming(missionId: string, missions: FindingContext['missions']): MissionNaming {
  const named = missions === null ? undefined : lookup(missions, missionId);
  const slug = typeof named?.slug === 'string' && named.slug !== '' ? named.slug : null;
  return { missionId, slug, friendlyName: named?.friendlyName ?? null };
}

/** How a row and the header name a Mission: the slug, else the Mission id (DD-8). The one place this rule is written. */
export function missionLabel(naming: Pick<MissionNaming, 'missionId' | 'slug'>): string {
  return naming.slug ?? naming.missionId;
}

export function buildFindingView(finding: DriftFindingView, ctx: FindingContext): FindingView {
  const hooks = ctx.hooks;
  const mission = missionNaming(finding.missionId, ctx.missions);
  const slug = mission.slug;
  const kindWord = resolveKindWord(finding.kind, hooks);

  const laneRows = finding.laneComparison
    .filter((row) => row.persistedStatusLane !== row.derivedStatusLane)
    .map((row) => ({ wpId: row.wpId, persisted: laneWord(row.persistedStatusLane, hooks), derived: laneWord(row.derivedStatusLane, hooks) }));

  const template = finding.remedy === null ? undefined : lookup(REMEDY_COMMANDS, finding.remedy);
  const command = template !== undefined && slug !== null && finding.remedy !== null ? { text: template(slug), remedy: finding.remedy } : null;
  const commandNote = template !== undefined && slug === null ? UNKNOWN_MISSION_COMMAND_NOTE : null;

  return {
    key: findingKey(finding),
    title: findingTitle(finding, hooks),
    kicker: { severity: resolveSeverity(finding.severity, hooks), kind: kindWord },
    sourceCodeTag: finding.sourceCode,
    explanation: explanationOf(finding.kind, finding.sourceCode),
    authorityWord: resolveAuthorityWord(finding.authority, hooks),
    derivedSideWord: resolveDerivedSideWord(finding.derivedSide, hooks),
    file: finding.artifactPath,
    mission,
    laneRows,
    laneNote: finding.sourceCode === null ? null : (lookup(LANE_NOTES, finding.sourceCode) ?? null),
    command,
    commandNote,
  };
}
