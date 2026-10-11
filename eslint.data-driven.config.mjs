// data-driven gate (NFR-009, C-007): no source outside the allow-list hard-codes a phase name, a status lane or one of
// the four other contract status words, so the later dynamic pipeline needs no screen change. The vocabulary lives only
// in src/defaults/; elements reach it through typed lookups. Rule messages begin `data-driven: S<id>` so the self-test
// (gates/data-driven.selftest.ts) can tell which selector fired. `noInlineConfig` makes an inline eslint-disable
// comment a no-op: without it a single `// eslint-disable-next-line no-restricted-syntax` silences the gate.
// Known limitations (the behavioural tests of the unit-tests gate are the backstop):
//  - A value assembled at run time ('in_' + 'progress', ['in', 'progress'].join('_')) is not seen.
//  - A lane counts object aliased before a named read (const c = m.statusLaneCounts; c.done), or destructured under a
//    name other than the eight lanes, is not followed; nor is `.done` read through such an alias.
//  - The lifecycle value `active`, and any lifecycle value outside WORDS and STATUS_WORDS, is not gated.
//  - A lone object key `plan`, `review` or `done` is an ordinary identifier and is not flagged.
//  - phases.at(-1) and phases.slice(i) with a negative or non-literal argument are legitimate and not flagged.
//  - A padded literal (' blocked', 'blocked ') is not the whole word and is not flagged: the selectors are anchored.
//  - Class-name fragments such as `is-blocked` that are neither whole words nor underscored are not flagged.
//  - The verdict, change-state, staleness and project health words (read from the vendored schemas) are gated the same way, with one
//    difference: the bare words that are common identifiers (changed, unknown, fresh, stale, healthy) are matched only in a
//    comparison (=== !== == !=) and a case label, so a property, key, variable or type member of that name stays clean;
//    a bare word held in a plain string (const x = 'fresh') is therefore not seen. An expression-free template literal
//    (s === `fresh`, case `fresh`:) is the same comparison and is matched (S14.3, S14.4). The underscored and whole-word
//    members (changes_requested, not_applicable, unchanged, the two reason codes) are matched as literals, as the lanes are.
//  - The artifact kinds and the seven artifact refusal codes (read from ArtifactKind.yaml and the ENUM of
//    ArtifactRefusalCode.yaml) are gated like this: the underscored ones (review_cycle, work_package_prompt, data_model,
//    analysis_report and every code) are matched as literals, templates, inside longer strings and as object keys (S15);
//    the bare ordinary words (spec, quickstart, research, contract, checklist, other) only in a comparison, a case label,
//    an includes argument or array receiver, a Map or Set has/get argument, and as an object-literal key (S16). plan and
//    tasks are phase words and were already gated everywhere. The one refusal code the gate does NOT read is the detail
//    refusal code of the Work Package screen, source_unreadable; the reviewer self-check list and the foreign-value tests cover it.
//  - Holes that stay open for the artifact words: kind.startsWith('spec'), a bare word held in a plain const and compared
//    through the variable, a value assembled at run time, a shorthand property ({ other }), a bare word as a destructured
//    name and a bare word as the argument of any other call. A comparison with a string literal that happens to be a bare
//    word is reported wherever it is (a URL parameter named other is a rename, never a silence). The foreign-vocabulary
//    composition test of the Artifact Viewer (a thirteenth kind, a refusal code outside the seven) is the backstop.
//    Closed at wrap-up (WP03 review): a computed key ({ ['spec']: 1 }, S16.9, S16.11), indexOf and lastIndexOf as well as
//    includes (S16.5, S16.6) and a computed read (o['contract'], S16.10, S16.11).
//  - The Drift vocabulary (mission-ui#10) is gated the same way: the members of the enums DriftKind, DriftAuthority, DriftSide,
//    DriftRemedy and DriftRefusalCode are read from the vendored schemas, and the four sourceCode values are held in the
//    constant SOURCE_CODE_WORDS (DriftFinding.sourceCode is a pattern, not an enum; a self-test fails when the constant and the
//    schema description disagree). Every one of them is underscored and is matched as a literal, an expression-free template,
//    inside a longer string or template, and as an object key (S17.1 to S17.5). NOT gated: `error`, `warning` and `git`.
//    `error` is a view-state word and a severity word, `warning` a severity word and `git` an everyday word: the same
//    collision class as the verdict `approved`. They are covered by the foreign-value tests and the reviewer self-check list.
//    The severity enum itself is not read, for the same reason.
//  - The Ops vocabularies (mission-ui#11) follow the same split: the underscored and rare members (task_execution, mission_step,
//    doctor_sweep, repo_path, ops_unreadable, invalid_page_cursor, abandoned) are matched as literals (S18.1 to S18.5); the common identifiers
//    (open, closed, agent, query, text, url, failed, advisory) only in a comparison or case label (S19.1 to S19.4), so an object key, a
//    property, a type member or a variable of that name stays clean, and a bare word held in a plain string is not seen.
//    `done` is an Ops outcome and already gated as a lane. The profile and action of an Op are open text and have no word.
//    The bare words are also caught as the argument (a string or an expression-free template) of includes, indexOf, lastIndexOf,
//    startsWith, endsWith, get and has, in an array searched with includes, indexOf or lastIndexOf, in a Set or Map built from
//    them, as a quoted or computed object key and as a computed read (S19.5 to S19.11); a bare word
//    as a plain identifier key stays clean. Also: a template computed read, an array of them searched with some, every, find,
//    findIndex, findLast, findLastIndex or filter, and the left side of the `in` operator.
//  - Vocabulary in a .d.ts or JSON file, and code outside packages/*/src (tests), is not scanned.
//  - An element that imports the vocabulary from defaults/ and then compares with a different literal it never
//    imports is covered only by the behavioural test with a foreign vocabulary.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import tseslint from 'typescript-eslint';
import { builtinRules } from 'eslint/use-at-your-own-risk';

// The vocabulary is read from the vendored contract schemas (pinned and hash-checked by `contract:check`), so a contract
// bump that adds a lane or a phase widens the gate with no edit here.
const SCHEMAS = new URL('./contracts/spec-kitty/mission-status/schemas/', import.meta.url);
const schema = (name) => parse(readFileSync(new URL(name, SCHEMAS), 'utf8'));

export const PHASES = schema('MissionPhase.yaml').properties.name.enum;
export const LANES = schema('StatusLane.yaml').enum;
export const WORDS = [...PHASES, ...LANES];
// The verdict, change-state and staleness enums of the 1.1 schemas (ruling ARCH-006 (A)).
export const VERDICT_WORDS = schema('ReviewVerdict.yaml').enum;
export const CHANGE_STATE_WORDS = schema('ChangeState.yaml').enum;
export const STALENESS_STATUS_WORDS = schema('Staleness.yaml').properties.status.enum;
// The reason enum lists null as its last member; only the codes are words.
export const STALENESS_REASON_WORDS = schema('Staleness.yaml').properties.reason.enum.filter((w) => typeof w === 'string');
// The project health enum (mission-ui#9, NFR-009): `schema_drift` is an underscored literal, `healthy` a comparison-only bare word.
export const HEALTH_WORDS = schema('ProjectHealth.yaml').enum;
const NEW_ALL = [...new Set([...VERDICT_WORDS, ...CHANGE_STATE_WORDS, ...STALENESS_STATUS_WORDS, ...STALENESS_REASON_WORDS, ...HEALTH_WORDS])].filter((w) => !WORDS.includes(w));
// The Ops enums (mission-ui#11, plan D-12) and the page-cursor refusal constant.
export const OPS_OUTCOME_WORDS = schema('OpsOutcome.yaml').enum;
export const OPS_CLOSED_BY_WORDS = schema('OpsClosedBy.yaml').enum;
export const OPS_MODE_WORDS = schema('OpsModeOfWork.yaml').enum;
export const OPS_EVIDENCE_KIND_WORDS = schema('OpsEvidenceKind.yaml').enum;
export const OPS_STATUS_WORDS = schema('OpsInvocationStatus.yaml').enum;
export const OPS_REFUSAL_WORDS = schema('OpsRefusalCode.yaml').enum;
export const OPS_CURSOR_REFUSAL_CODE = schema('PageCursorRefusal.yaml').allOf.find((part) => part.properties?.code?.const !== undefined).properties.code.const;
const OPS_ALL = [
  ...new Set([...OPS_OUTCOME_WORDS, ...OPS_CLOSED_BY_WORDS, ...OPS_MODE_WORDS, ...OPS_EVIDENCE_KIND_WORDS, ...OPS_STATUS_WORDS, ...OPS_REFUSAL_WORDS, OPS_CURSOR_REFUSAL_CODE]),
];
// Common identifiers: matched only in a comparison or a case label.
export const OPS_BARE_WORDS = ['open', 'closed', 'agent', 'query', 'text', 'url', 'failed', 'advisory'].filter((w) => OPS_ALL.includes(w));
// Matched anywhere as a literal; a lane word (`done`) is already gated by S1 and is left out here.
export const OPS_WORDS = OPS_ALL.filter((w) => !OPS_BARE_WORDS.includes(w) && !WORDS.includes(w));
export const OPS_UNDERSCORED = OPS_WORDS.filter((w) => w.includes('_'));
// Matched anywhere as a literal: underscored members and whole words that are not everyday identifiers.
export const NEW_BARE_WORDS = ['changed', 'unknown', 'fresh', 'stale', 'healthy'].filter((w) => NEW_ALL.includes(w));
export const NEW_WORDS = NEW_ALL.filter((w) => !NEW_BARE_WORDS.includes(w));
export const NEW_UNDERSCORED = NEW_WORDS.filter((w) => w.includes('_'));
// The Artifact Viewer's vocabulary: the ArtifactKind enum and the enum of ArtifactRefusalCode.yaml (never the example
// files). Words an earlier selector already gates (plan and tasks are phase words) are not repeated.
export const ARTIFACT_KINDS = schema('ArtifactKind.yaml').enum;
export const ARTIFACT_CODES = schema('ArtifactRefusalCode.yaml').enum;
const ARTIFACT_ALL = [...new Set([...ARTIFACT_KINDS, ...ARTIFACT_CODES])].filter((w) => !WORDS.includes(w) && !NEW_ALL.includes(w));
// Underscored words are matched anywhere as a literal; the rest are ordinary words, matched only in the shapes of S16.
export const ARTIFACT_UNDERSCORED = ARTIFACT_ALL.filter((w) => w.includes('_'));
export const ARTIFACT_BARE_WORDS = ARTIFACT_ALL.filter((w) => !w.includes('_'));
// The Drift vocabulary (mission-ui#10). Five enums come from the schemas; the four audit codes behind a snapshot disagreement
// exist only in the description of DriftFinding.sourceCode, so they are written out here and the self-test checks the agreement.
export const DRIFT_KIND_WORDS = schema('DriftKind.yaml').enum;
export const DRIFT_AUTHORITY_WORDS = schema('DriftAuthority.yaml').enum;
export const DRIFT_SIDE_WORDS = schema('DriftSide.yaml').enum;
export const DRIFT_REMEDY_WORDS = schema('DriftRemedy.yaml').enum;
export const DRIFT_REFUSAL_WORDS = schema('DriftRefusalCode.yaml').enum;
export const SOURCE_CODE_WORDS = ['SNAPSHOT_DRIFT', 'SNAPSHOT_DRIFT_PROVENANCE', 'SNAPSHOT_DRIFT_TERMINAL', 'CORRUPT_JSON'];
// Only the underscored members are gated: a bare member (`git`) is an everyday word and stays out.
export const DRIFT_WORDS = [
  ...new Set([...DRIFT_KIND_WORDS, ...DRIFT_AUTHORITY_WORDS, ...DRIFT_SIDE_WORDS, ...DRIFT_REMEDY_WORDS, ...DRIFT_REFUSAL_WORDS, ...SOURCE_CODE_WORDS]),
].filter((w) => w.includes('_'));
const LANE_ONLY = LANES.filter((w) => w !== 'done');
// Words used in identifier positions; `plan`, `review` and `done` are ordinary identifiers and are left out.
export const IDENT_WORDS = [...LANE_ONLY, 'specify', 'implement', 'tasks'];
export const STATUS_WORDS = ['pending', 'complete', 'draft', 'discarded'];
export const UNDERSCORED = ['in_progress', 'for_review', 'in_review'];
export const S8B_METHODS = ['at', 'slice', 'splice', 'with', 'toSpliced'];

/** The allow-list and nothing else: vocabulary, generated contract files, fixtures, stories and story helpers. */
export const ALLOW_LIST = [
  '**/src/defaults/**',
  '**/src/contract/**',
  '**/*.stories.ts',
  '**/fixtures.ts',
  '**/*.fixtures.ts',
  '**/src/story-support/**',
];

const alt = (words) => words.join('|');
const W = alt(WORDS);
const I = alt(IDENT_WORDS);
const SW = alt(STATUS_WORDS);
const L = alt(LANES);
const U = alt(UNDERSCORED);
const M = alt(S8B_METHODS);
const NW = alt(NEW_WORDS);
const NU = alt(NEW_UNDERSCORED);
const NB = alt(NEW_BARE_WORDS);
const AU = alt(ARTIFACT_UNDERSCORED);
const AB = alt(ARTIFACT_BARE_WORDS);
const DW = alt(DRIFT_WORDS);
const OW = alt(OPS_WORDS);
const OU = alt(OPS_UNDERSCORED);
const OB = alt(OPS_BARE_WORDS);
const OPS_ARRAY_METHODS = alt(['includes', 'indexOf', 'lastIndexOf', 'some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex', 'filter']);
const OPS_STRING_METHODS = alt(['includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith']);
/** The expression-free template form of a bare word (F-5): `\`failed\``. */
const TPL = (parent) => `${parent} > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${OB})$/i]`;
const OPS_KEYED_METHODS = alt(['get', 'has']);

const entry = (id, selector, text) => ({ selector, message: `data-driven: ${id} ${text}` });

/** One entry per selector alternative, so a message names the alternative that fired. */
export const SELECTOR_ENTRIES = [
  entry('S1', `Literal[value=/^(${W})$/i]`, 'phase name or lane value as a literal; read it from src/defaults/'),
  entry('S1b.1', `Literal[value=/^(${SW})$/i]`, 'status word as a literal; read it from src/defaults/'),
  entry('S1b.2', `TemplateElement[value.cooked=/^(${SW})$/i]`, 'status word as an exact template; read it from src/defaults/'),
  entry('S2', `TemplateElement[value.cooked=/^(${W})$/i]`, 'phase name or lane value as an exact template'),
  entry('S3a', `TemplateElement[value.cooked=/(^|>|\\s)(${W})\\s*(<|$)/i]`, 'phase name or lane value as markup text'),
  entry('S3b', `TemplateElement[value.cooked=/=\\s*["']?(${W})["']?[\\s>\\/]/i]`, 'phase name or lane value as an attribute value in a template'),
  entry('S3c.1', `Literal[value=/${U}/i]`, 'underscored lane value inside a longer string'),
  entry('S3c.2', `TemplateElement[value.cooked=/${U}/i]`, 'underscored lane value inside a template'),
  entry('S4', `TemplateElement[value.cooked=/\\[[\\w-]+[~|^$*]?=\\s*["']?(${W})["']?\\s*\\]/i]`, 'CSS attribute selector keyed to a phase name or lane value'),
  entry('S5', `Property[computed=false] > Identifier.key[name=/^(${I})$/]`, 'object key named like a phase or lane'),
  entry('S5b.1', `TSPropertySignature[computed=false] > Identifier.key[name=/^(${I})$/]`, 'type member named like a phase or lane'),
  entry('S5b.2', `PropertyDefinition[computed=false] > Identifier.key[name=/^(${I})$/]`, 'class property named like a phase or lane'),
  entry('S5b.3', `TSMethodSignature[computed=false] > Identifier.key[name=/^(${I})$/]`, 'method signature named like a phase or lane'),
  entry('S6', `TSEnumMember > Identifier.id[name=/^(${W})$/i]`, 'enum member named like a phase or lane'),
  entry('S7', `MemberExpression[computed=false][property.name=/^(${I})$/]`, 'property read named like a phase or lane'),
  entry('S7b.1', `MemberExpression[property.name=/^(${L})$/][object.name='statusLaneCounts']`, 'lane read from statusLaneCounts'),
  entry('S7b.2', `MemberExpression[property.name=/^(${L})$/][object.name='laneCounts']`, 'lane read from laneCounts'),
  entry('S7b.3', `MemberExpression[property.name=/^(${L})$/][object.property.name='statusLaneCounts']`, 'lane read from a statusLaneCounts property'),
  entry('S7b.4', `MemberExpression[property.name=/^(${L})$/][object.property.name='laneCounts']`, 'lane read from a laneCounts property'),
  entry('S8a.1', "MemberExpression[computed=true][property.type='Literal'][object.name='phases']", 'phase by position on phases'),
  entry('S8a.2', "MemberExpression[computed=true][property.type='Literal'][object.property.name='phases']", 'phase by position on a phases property'),
  entry('S8b.1', `CallExpression[callee.property.name=/^(${M})$/][arguments.0.type='Literal'][callee.object.name='phases']`, 'phase by position or cap through a method on phases'),
  entry('S8b.2', `CallExpression[callee.property.name=/^(${M})$/][arguments.0.type='Literal'][callee.object.property.name='phases']`, 'phase by position or cap through a method on a phases property'),
  entry('S8c.1', "VariableDeclarator[id.type='ArrayPattern'][init.name='phases']", 'phases taken apart by array destructuring'),
  entry('S8c.2', "VariableDeclarator[id.type='ArrayPattern'][init.property.name='phases']", 'a phases property taken apart by array destructuring'),
  entry('S9.1', "BinaryExpression:has(MemberExpression[property.name='length'][object.name='phases']) > Literal[value>=2]", 'phase count compared with a literal'),
  entry('S9.2', "BinaryExpression:has(MemberExpression[property.name='length'][object.property.name='phases']) > Literal[value>=2]", 'phase count of a phases property compared with a literal'),
  entry('S10', `Literal[regex.pattern=/\\b(${W})\\b/i]`, 'regular expression naming a phase or lane'),
  entry('S11', `ObjectPattern > Property > Identifier.key[name=/^(${I})$/]`, 'destructuring a name that is a phase or lane'),
  entry('S12.1', 'TemplateElement[value.cooked=/repeat\\(\\s*\\d+\\s*,/i]', 'hard-coded track count in CSS text'),
  entry('S12.2', 'TemplateElement[value.cooked=/nth-(last-)?(child|of-type)\\(\\s*[0-9]/i]', 'hard-coded position in CSS text'),
  entry('S13.1', `Literal[value=/^(${NW})$/i]`, 'verdict, change-state or staleness word as a literal; read it from src/defaults/'),
  entry('S13.2', `TemplateElement[value.cooked=/^(${NW})$/i]`, 'verdict, change-state or staleness word as an exact template'),
  entry('S13.3', `Literal[value=/${NU}/i]`, 'underscored verdict or staleness word inside a longer string'),
  entry('S13.4', `TemplateElement[value.cooked=/${NU}/i]`, 'underscored verdict or staleness word inside a template'),
  entry('S13.5', `Property[computed=false] > Identifier.key[name=/^(${NU})$/]`, 'object key named like a verdict or staleness word'),
  entry('S14.1', `BinaryExpression[operator=/^[!=]==?$/] > Literal[value=/^(${NB})$/i]`, 'change-state or staleness word compared as a literal; read it from src/defaults/'),
  entry('S14.2', `SwitchCase > Literal.test[value=/^(${NB})$/i]`, 'change-state or staleness word as a case label; read it from src/defaults/'),
  entry('S14.3', `BinaryExpression[operator=/^[!=]==?$/] > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${NB})$/i]`, 'change-state or staleness word compared as an expression-free template; read it from src/defaults/'),
  entry('S14.4', `SwitchCase > TemplateLiteral.test[expressions.length=0] > TemplateElement[value.cooked=/^(${NB})$/i]`, 'change-state or staleness word as a template case label; read it from src/defaults/'),
  entry('S15.1', `Literal[value=/^(${AU})$/i]`, 'artifact kind or refusal code as a literal; read it from src/defaults/'),
  entry('S15.2', `TemplateElement[value.cooked=/^(${AU})$/i]`, 'artifact kind or refusal code as an exact template'),
  entry('S15.3', `Literal[value=/(${AU})/i]`, 'artifact kind or refusal code inside a longer string'),
  entry('S15.4', `TemplateElement[value.cooked=/(${AU})/i]`, 'artifact kind or refusal code inside a template'),
  entry('S15.5', `Property[computed=false] > Identifier.key[name=/^(${AU})$/]`, 'object key named like an artifact kind or refusal code'),
  entry('S16.1', `BinaryExpression[operator=/^[!=]==?$/] > Literal[value=/^(${AB})$/i]`, 'artifact kind compared as a literal; read it from src/defaults/'),
  entry('S16.2', `SwitchCase > Literal.test[value=/^(${AB})$/i]`, 'artifact kind as a case label; read it from src/defaults/'),
  entry('S16.3', `BinaryExpression[operator=/^[!=]==?$/] > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${AB})$/i]`, 'artifact kind compared as an expression-free template; read it from src/defaults/'),
  entry('S16.4', `SwitchCase > TemplateLiteral.test[expressions.length=0] > TemplateElement[value.cooked=/^(${AB})$/i]`, 'artifact kind as a template case label; read it from src/defaults/'),
  entry('S16.5', `CallExpression[callee.property.name=/^(includes|indexOf|lastIndexOf)$/][arguments.0.value=/^(${AB})$/i]`, 'artifact kind as an includes, indexOf or lastIndexOf argument; read it from src/defaults/'),
  entry('S16.6', `CallExpression[callee.property.name=/^(includes|indexOf|lastIndexOf)$/] > MemberExpression.callee > ArrayExpression.object > Literal[value=/^(${AB})$/i]`, 'artifact kind in an array that is the receiver of includes, indexOf or lastIndexOf; read it from src/defaults/'),
  entry('S16.7', `CallExpression[callee.property.name=/^(has|get)$/][arguments.0.value=/^(${AB})$/i]`, 'artifact kind as a Map or Set key; read it from src/defaults/'),
  entry('S16.8', `ObjectExpression > Property[computed=false][shorthand=false] > Identifier.key[name=/^(${AB})$/]`, 'object key named like an artifact kind; read it from src/defaults/'),
  entry('S16.9', `ObjectExpression > Property > Literal.key[value=/^(${AB})$/i]`, 'object key spelled like an artifact kind, computed or not; read it from src/defaults/'),
  entry('S16.10', `MemberExpression[computed=true] > Literal.property[value=/^(${AB})$/i]`, 'artifact kind read through a computed member; read it from src/defaults/'),
  entry('S16.11', `:matches(MemberExpression[computed=true], Property[computed=true]) > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${AB})$/i]`, 'artifact kind as an expression-free template in a computed member or key; read it from src/defaults/'),
  entry('S17.1', `Literal[value=/^(${DW})$/i]`, 'drift kind, authority, side, remedy, refusal or source-code word as a literal; read it from src/defaults/'),
  entry('S17.2', `TemplateElement[value.cooked=/^(${DW})$/i]`, 'drift word as an exact template; read it from src/defaults/'),
  entry('S17.3', `Literal[value=/(${DW})/i]`, 'drift word inside a longer string'),
  entry('S17.4', `TemplateElement[value.cooked=/(${DW})/i]`, 'drift word inside a template'),
  entry('S17.5', `Property[computed=false] > Identifier.key[name=/^(${DW})$/i]`, 'object key named like a drift word'),
  entry('S18.1', `Literal[value=/^(${OW})$/i]`, 'Ops vocabulary word as a literal; read it from src/defaults/'),
  entry('S18.2', `TemplateElement[value.cooked=/^(${OW})$/i]`, 'Ops vocabulary word as an exact template'),
  entry('S18.3', `Literal[value=/${OU}/i]`, 'underscored Ops vocabulary word inside a longer string'),
  entry('S18.4', `TemplateElement[value.cooked=/${OU}/i]`, 'underscored Ops vocabulary word inside a template'),
  entry('S18.5', `Property[computed=false] > Identifier.key[name=/^(${OU})$/]`, 'object key named like an Ops vocabulary word'),
  entry('S19.1', `BinaryExpression[operator=/^[!=]==?$/] > Literal[value=/^(${OB})$/i]`, 'Ops vocabulary word compared as a literal; read it from src/defaults/'),
  entry('S19.2', `SwitchCase > Literal.test[value=/^(${OB})$/i]`, 'Ops vocabulary word as a case label; read it from src/defaults/'),
  entry('S19.3', `BinaryExpression[operator=/^[!=]==?$/] > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${OB})$/i]`, 'Ops vocabulary word compared as an expression-free template; read it from src/defaults/'),
  entry('S19.4', `SwitchCase > TemplateLiteral.test[expressions.length=0] > TemplateElement[value.cooked=/^(${OB})$/i]`, 'Ops vocabulary word as a template case label; read it from src/defaults/'),
  // The shapes #7's bare-word gate closed after its review (BOUNDARY-006); S19.5-S19.7 and S19.9-S19.11 mirror #7's S16.5-S16.7 and S16.9-S16.11.
  // Its identifier-key shape (#7's S16.8) is NOT copied: it would flag legitimate keys such as `{ text: ... }`.
  entry('S19.5', `CallExpression[callee.property.name=/^(${OPS_STRING_METHODS})$/] > Literal[value=/^(${OB})$/i], ${TPL(`CallExpression[callee.property.name=/^(${OPS_STRING_METHODS})$/]`)}`, 'Ops vocabulary word searched for with includes, indexOf, lastIndexOf, startsWith or endsWith (as a string or an expression-free template); read it from src/defaults/'),
  entry('S19.6', `MemberExpression[property.name=/^(${OPS_ARRAY_METHODS})$/] > ArrayExpression.object > Literal[value=/^(${OB})$/i], ${TPL(`MemberExpression[property.name=/^(${OPS_ARRAY_METHODS})$/] > ArrayExpression.object`)}, NewExpression[callee.name=/^(Set|Map)$/] > ArrayExpression > Literal[value=/^(${OB})$/i], NewExpression[callee.name='Map'] > ArrayExpression > ArrayExpression > Literal:first-child[value=/^(${OB})$/i], ${TPL('NewExpression[callee.name=/^(Set|Map)$/] > ArrayExpression')}`, 'Ops vocabulary word in an array searched with includes, indexOf or lastIndexOf, or in a Set or Map built from it; read it from src/defaults/'),
  entry('S19.7', `CallExpression[callee.property.name=/^(${OPS_KEYED_METHODS})$/] > Literal[value=/^(${OB})$/i], ${TPL(`CallExpression[callee.property.name=/^(${OPS_KEYED_METHODS})$/]`)}, BinaryExpression[operator='in'] > Literal.left[value=/^(${OB})$/i], ${TPL("BinaryExpression[operator='in']")}`, 'Ops vocabulary word as the key of a Map or Set get or has, or the left side of the in operator (as a string or an expression-free template); read it from src/defaults/'),
  entry('S19.9', `Property[computed=false] > Literal.key[value=/^(${OB})$/i]`, 'Ops vocabulary word as a quoted object key; read it from src/defaults/'),
  entry('S19.10', `Property[computed=true] > Literal.key[value=/^(${OB})$/i]`, 'Ops vocabulary word as a computed object key; read it from src/defaults/'),
  entry('S19.11', `MemberExpression[computed=true] > Literal.property[value=/^(${OB})$/i], ${TPL('MemberExpression[computed=true]')}`, 'Ops vocabulary word as a computed property read; read it from src/defaults/'),
];

// The Ops bare-word shapes (S19) run in a block of their own (BOUNDARY-001, operator ruling (b)). The Artifact Viewer's markdown
// renderer (#7) compares markdown-it token types, and `text` is one of them (`token.type === 'text'`, `case 'text':`); it is
// also an Ops evidence class, so S19.1 and S19.2 would refuse #7's code. The word stays in OPS_BARE_WORDS and #7's code is not
// changed: the Ops block ignores logic/markdown/ instead, and every other selector still scans it. Two blocks that both set
// `no-restricted-syntax` would REPLACE each other's list for a file both match, so the Ops block runs the same core rule under
// its own name (`data-driven-ops/no-restricted-syntax`); its messages begin `data-driven: S19.` like the others.
// The same class, found at the port: the open-project dialog (#9) reads Lit's changed-properties map by its own property name,
// `changed.has('open')` and `changed.get('open')`, which S19.7 (a bare word as a Map get or has key) refuses. That file is
// ignored by the Ops block on the same terms; #9's code is not changed and every other selector still scans it.
export const OPS_BARE_IGNORES = ['packages/mission-ui/src/logic/markdown/**', 'packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.ts'];
const isOpsBare = (entry) => entry.message.startsWith('data-driven: S19.');
export const OPS_BARE_ENTRIES = SELECTOR_ENTRIES.filter(isOpsBare);
export const BASE_ENTRIES = SELECTOR_ENTRIES.filter((entry) => !isOpsBare(entry));
export const OPS_BARE_RULE = 'data-driven-ops/no-restricted-syntax';
const opsPlugin = { rules: { 'no-restricted-syntax': builtinRules.get('no-restricted-syntax') } };

export default [
  {
    files: ['**/*.ts'],
    ignores: ALLOW_LIST,
    languageOptions: { parser: tseslint.parser, sourceType: 'module' },
    linterOptions: { noInlineConfig: true },
    rules: { 'no-restricted-syntax': ['error', ...BASE_ENTRIES] },
  },
  {
    files: ['**/*.ts'],
    ignores: [...ALLOW_LIST, ...OPS_BARE_IGNORES],
    languageOptions: { parser: tseslint.parser, sourceType: 'module' },
    linterOptions: { noInlineConfig: true },
    plugins: { 'data-driven-ops': opsPlugin },
    rules: { [OPS_BARE_RULE]: ['error', ...OPS_BARE_ENTRIES] },
  },
];
