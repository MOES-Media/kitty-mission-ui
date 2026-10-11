// The inspector's facts: file facts from the entry and the content, Mission facts only when the host passed them.
// The Modified fact is `resolveActivity`; this file adds no time logic and no arithmetic on contract values.
import type { ArtifactContentView, ArtifactEntryView } from '../contract/types.js';
import {
  FACT_KIND,
  FACT_MEDIA_TYPE,
  FACT_MODIFIED,
  FACT_PATH,
  FACT_REDACTED,
  FACT_SIZE,
  MEDIA_TYPE_WORDS,
  MISSION_FACT_MISSION,
  MISSION_FACT_STATUS,
  MISSION_FACT_TARGET,
  MISSION_FACT_TOPOLOGY,
  MISSION_FACT_TYPE,
  NO_TEXT,
  YES_TEXT,
} from '../defaults/index.js';
import { formatArtifactSize } from './artifact-size.js';
import { resolveArtifactVocabulary, type ArtifactLabelHooks, type ArtifactScreenMission, type ArtifactVocabulary } from './artifact-types.js';
import { lookup } from './lookup.js';
import { resolveActivity } from './time.js';

/** One inspector row. `mono` asks for the monospace face (paths and branch names). */
export interface ArtifactFact {
  label: string;
  value: string;
  mono?: boolean;
}

export interface ArtifactFacts {
  file: ArtifactFact[];
  mission: ArtifactFact[];
  redactedNote: boolean;
}

export interface ArtifactFactsInput {
  /** The listing entry of the open path, or null. */
  entry: ArtifactEntryView | null;
  /** The content that agrees with the selection, or null. */
  content: ArtifactContentView | null;
  mission: ArtifactScreenMission | null;
  selectedPath: string;
  now: string | null;
  hooks?: ArtifactLabelHooks | null;
  vocabulary?: ArtifactVocabulary | null;
}

/** The kind word: hook, then the kind table, then the raw kind. */
export function resolveKindLabel(kind: string, hooks: ArtifactLabelHooks | null | undefined, vocabulary?: ArtifactVocabulary | null): string {
  return hooks?.kind?.(kind) ?? lookup(resolveArtifactVocabulary(vocabulary).kinds, kind)?.label ?? kind;
}

/** The media type word: hook, then the media words, then the raw type. */
export function resolveMediaTypeLabel(type: string, hooks: ArtifactLabelHooks | null | undefined): string {
  return hooks?.mediaType?.(type) ?? lookup(MEDIA_TYPE_WORDS, type) ?? type;
}

const present = (value: string | null | undefined): value is string => value !== null && value !== undefined && value !== '';

/**
 * File facts are those the data supports, in a fixed order: kind, media type (content only), size (the entry's, else the
 * content's), modified (entry only), path, redaction (content only). Mission facts appear only when present.
 */
export function resolveArtifactFacts(input: ArtifactFactsInput): ArtifactFacts {
  const { entry, content, mission } = input;
  const hooks = input.hooks ?? null;
  const file: ArtifactFact[] = [];
  const kind = content?.kind ?? entry?.kind;
  if (kind !== undefined) file.push({ label: FACT_KIND, value: resolveKindLabel(kind, hooks, input.vocabulary) });
  if (content) file.push({ label: FACT_MEDIA_TYPE, value: resolveMediaTypeLabel(content.mediaType, hooks) });
  const size = entry?.sizeBytes ?? content?.sizeBytes;
  if (size !== undefined) file.push({ label: FACT_SIZE, value: formatArtifactSize(size, hooks) });
  if (entry) file.push({ label: FACT_MODIFIED, value: resolveActivity(entry.modifiedAt, input.now, hooks) });
  const path = content?.path ?? entry?.path ?? input.selectedPath;
  if (path !== '') file.push({ label: FACT_PATH, value: path, mono: true });
  if (content) file.push({ label: FACT_REDACTED, value: content.redacted ? YES_TEXT : NO_TEXT });

  const facts: ArtifactFact[] = [];
  if (mission) {
    facts.push({ label: MISSION_FACT_MISSION, value: present(mission.friendlyName) ? mission.friendlyName : mission.slug });
    if (present(mission.missionType)) facts.push({ label: MISSION_FACT_TYPE, value: mission.missionType });
    if (present(mission.topology)) facts.push({ label: MISSION_FACT_TOPOLOGY, value: mission.topology });
    if (present(mission.targetBranch)) facts.push({ label: MISSION_FACT_TARGET, value: mission.targetBranch, mono: true });
    if (present(mission.lifecycleStatus)) facts.push({ label: MISSION_FACT_STATUS, value: mission.lifecycleStatus });
  }
  return { file, mission: facts, redactedNote: content?.redacted === true };
}
