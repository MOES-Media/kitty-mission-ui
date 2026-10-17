// The coverage check (research R-09, FR-004, SC-001): every (tag, event) pair the manifest declares, outside sk-mission-sample,
// is in INTENT_TABLE, and no pair is in the table that the manifest does not declare. The check types are assigned `true`, so
// a missing pair fails svelte-check with the literal `'<tag> <event>'` in the error. Type imports only: no run-time import.
import type { MissionUiIntents } from '../generated/elements';
import type { HostedTag, INTENT_TABLE } from './table';

type Declared = { [T in HostedTag]: `${T} ${keyof MissionUiIntents[T] & string}` }[HostedTag];
type Mapped = { [T in keyof typeof INTENT_TABLE]: `${T} ${keyof (typeof INTENT_TABLE)[T] & string}` }[keyof typeof INTENT_TABLE];

/** `true` while every declared pair is mapped; otherwise the unmapped pairs, named. */
export const unmapped: [Exclude<Declared, Mapped>] extends [never] ? true : Exclude<Declared, Mapped> = true;
/** `true` while the table maps no undeclared pair; otherwise the extra pairs, named. */
export const unknownIntent: [Exclude<Mapped, Declared>] extends [never] ? true : Exclude<Mapped, Declared> = true;
