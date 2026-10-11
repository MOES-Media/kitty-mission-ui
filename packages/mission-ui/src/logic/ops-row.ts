import type { OpsInvocationView } from '../contract/types.js';
import { OPS_VOCABULARY, type OpsCopyKey, type OpsVocabulary } from '../defaults/ops-copy.js';
import { lookup } from './lookup.js';
import { opsTimeText, type OpsLabelHooks } from './ops-text.js';
import type { StateBadge } from './types.js';

/** How a fact is drawn: a text, an instant (with its `datetime`), the evidence value, or a quiet word for a value that is absent. */
export type OpsFactKind = 'text' | 'time' | 'evidence' | 'quiet';

export interface OpsFact {
  term: string;
  value: string;
  /** Whether the value is set in the mono face (ids, handles, instants and evidence); false for words and quiet words. */
  mono: boolean;
  kind: OpsFactKind;
  /** The served instant of a `time` fact whose value could be read, else null. */
  datetime: string | null;
}

/** The evidence of a row: its class word, the value as served, and whether the service changed it (the contract `redacted` flag). */
export interface OpsEvidenceDisplay {
  classWord: string;
  value: string;
  changed: boolean;
  /** The quiet word drawn beside a changed value, and the sentence that explains it (its accessible description). */
  changedWord: string;
  changedDescription: string;
}

/** One Op, all text resolved. */
export interface OpsRowView {
  id: string;
  badge: { word: string; tone: StateBadge['tone'] };
  facts: OpsFact[];
  evidence: OpsEvidenceDisplay | null;
}

const NEUTRAL: StateBadge['tone'] = 'neutral';

const text = (term: string, value: string, mono: boolean): OpsFact => ({ term, value, mono, kind: 'text', datetime: null });
const quiet = (term: string, value: string): OpsFact => ({ term, value, mono: false, kind: 'quiet', datetime: null });

/**
 * The view of one Op (plan D-03). The badge is the outcome word and tone for a non-null outcome, else the status word and tone.
 * The facts come in a fixed order: Profile, Action, Actor, Started, Completed, Evidence, then Mission, Work Package, Mode and
 * Closed by when present. Absent Mission, Work Package and Closed by are left out; an absent Actor, Completed or Evidence is a
 * quiet word. Every word and tone comes from the vocabulary tables through `lookup`: a word the tables do not know shows as
 * given with the neutral tone, and nothing here branches on a vocabulary word.
 */
export function buildOpsRow(item: OpsInvocationView, vocabulary: OpsVocabulary = OPS_VOCABULARY, labels: OpsLabelHooks | null = null): OpsRowView {
  const copy = (key: OpsCopyKey): string => labels?.copy?.(key) ?? vocabulary.copy[key];
  // An optional field that is omitted (an invalid payload) is read as null, like a served null: `== null` covers both.
  const actor = item.actor ?? null;
  const completedAt = item.completedAt ?? null;
  const missionId = item.missionId ?? null;
  const wpId = item.wpId ?? null;
  const closedBy = item.closedBy ?? null;
  const quietKeys = lookup(vocabulary.quiet, item.status) ?? vocabulary.quietFallback;
  const time = (term: string, iso: string): OpsFact => {
    const { text: printed, datetime } = opsTimeText(iso, labels);
    return { term, value: printed, mono: true, kind: 'time', datetime };
  };

  const facts: OpsFact[] = [
    text(copy('termProfile'), item.profileId, true),
    text(copy('termAction'), item.action, true),
    actor === null ? quiet(copy('termActor'), copy('quietActor')) : text(copy('termActor'), actor, true),
    time(copy('termStarted'), item.startedAt),
    completedAt === null ? quiet(copy('termCompleted'), copy(quietKeys.completed)) : time(copy('termCompleted'), completedAt),
  ];

  let evidence: OpsEvidenceDisplay | null = null;
  if (item.evidence == null) {
    facts.push(quiet(copy('termEvidence'), copy(quietKeys.evidence)));
  } else {
    const kind = item.evidence.kind;
    evidence = {
      classWord: labels?.evidenceClass?.(kind) ?? lookup(vocabulary.evidenceClasses, kind) ?? kind,
      value: item.evidence.value,
      changed: item.evidence.redacted,
      changedWord: copy('redactedWord'),
      changedDescription: copy('redactedDescription'),
    };
    facts.push({ term: copy('termEvidence'), value: item.evidence.value, mono: true, kind: 'evidence', datetime: null });
  }

  if (missionId !== null) facts.push(text(copy('termMission'), missionId, true));
  if (wpId !== null) facts.push(text(copy('termWorkPackage'), wpId, true));
  facts.push(text(copy('termMode'), labels?.mode?.(item.modeOfWork) ?? lookup(vocabulary.modes, item.modeOfWork) ?? item.modeOfWork, false));
  if (closedBy !== null) {
    const closer = lookup(vocabulary.closers, closedBy);
    if (closer === undefined || closer.drawn) {
      facts.push(text(copy('termClosedBy'), labels?.closer?.(closedBy) ?? closer?.word ?? closedBy, false));
    }
  }

  return { id: item.invocationId, badge: badgeOf(item, vocabulary, labels), facts, evidence };
}

function badgeOf(item: OpsInvocationView, vocabulary: OpsVocabulary, labels: OpsLabelHooks | null): OpsRowView['badge'] {
  const outcome = item.outcome ?? null;
  const word = outcome ?? item.status;
  const entry = outcome === null ? lookup(vocabulary.statuses, item.status) : lookup(vocabulary.outcomes, outcome);
  const reworded = outcome === null ? labels?.status?.(word) : labels?.outcome?.(word);
  return { word: reworded ?? entry?.word ?? word, tone: entry?.tone ?? NEUTRAL };
}
