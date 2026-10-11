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
//  - The verdict, change-state and staleness words (read from the vendored 1.1 schemas) are gated the same way, with one
//    difference: the bare words that are common identifiers (changed, unknown, fresh, stale) are matched only in a
//    comparison (=== !== == !=) and a case label, so a property, key, variable or type member of that name stays clean;
//    a bare word held in a plain string (const x = 'fresh') is therefore not seen. An expression-free template literal
//    (s === `fresh`, case `fresh`:) is the same comparison and is matched (S14.3, S14.4). The underscored and whole-word
//    members (changes_requested, not_applicable, unchanged, the two reason codes) are matched as literals, as the lanes are.
//  - The Ops vocabularies (mission-ui#11) follow the same split: the underscored and rare members (task_execution, mission_step,
//    doctor_sweep, repo_path, ops_unreadable, invalid_page_cursor, abandoned) are matched as literals; the common identifiers
//    (open, closed, agent, query, text, url, failed, advisory) only in a comparison or case label, so an object key, a
//    property, a type member or a variable of that name stays clean, and a bare word held in a plain string is not seen.
//    `done` is an Ops outcome and already gated as a lane. The profile and action of an Op are open text and have no word.
//    The bare words are also caught as the argument (a string or an expression-free template) of includes, indexOf, lastIndexOf,
//    startsWith, endsWith, get and has, in an array searched with includes, indexOf or lastIndexOf, in a Set or Map built from
//    them, as a quoted or computed object key and as a computed read (S16.5 to S16.11); a bare word
//    as a plain identifier key stays clean. Also: a template computed read, an array of them searched with some, every, find,
//    findIndex, findLast, findLastIndex or filter, and the left side of the `in` operator.
//  - The gate does NOT read ArtifactKind (the review-cycle kind) or the detail refusal codes (not_found,
//    source_unreadable); the reviewer self-check list and the foreign-value tests cover them.
//  - Vocabulary in a .d.ts or JSON file, and code outside packages/*/src (tests), is not scanned.
//  - An element that imports the vocabulary from defaults/ and then compares with a different literal it never
//    imports is covered only by the behavioural test with a foreign vocabulary.
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import tseslint from 'typescript-eslint';

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
const NEW_ALL = [...new Set([...VERDICT_WORDS, ...CHANGE_STATE_WORDS, ...STALENESS_STATUS_WORDS, ...STALENESS_REASON_WORDS])].filter((w) => !WORDS.includes(w));
// Matched anywhere as a literal: underscored members and whole words that are not everyday identifiers.
export const NEW_BARE_WORDS = ['changed', 'unknown', 'fresh', 'stale'].filter((w) => NEW_ALL.includes(w));
export const NEW_WORDS = NEW_ALL.filter((w) => !NEW_BARE_WORDS.includes(w));
export const NEW_UNDERSCORED = NEW_WORDS.filter((w) => w.includes('_'));
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
  entry('S15.1', `Literal[value=/^(${OW})$/i]`, 'Ops vocabulary word as a literal; read it from src/defaults/'),
  entry('S15.2', `TemplateElement[value.cooked=/^(${OW})$/i]`, 'Ops vocabulary word as an exact template'),
  entry('S15.3', `Literal[value=/${OU}/i]`, 'underscored Ops vocabulary word inside a longer string'),
  entry('S15.4', `TemplateElement[value.cooked=/${OU}/i]`, 'underscored Ops vocabulary word inside a template'),
  entry('S15.5', `Property[computed=false] > Identifier.key[name=/^(${OU})$/]`, 'object key named like an Ops vocabulary word'),
  entry('S16.1', `BinaryExpression[operator=/^[!=]==?$/] > Literal[value=/^(${OB})$/i]`, 'Ops vocabulary word compared as a literal; read it from src/defaults/'),
  entry('S16.2', `SwitchCase > Literal.test[value=/^(${OB})$/i]`, 'Ops vocabulary word as a case label; read it from src/defaults/'),
  entry('S16.3', `BinaryExpression[operator=/^[!=]==?$/] > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked=/^(${OB})$/i]`, 'Ops vocabulary word compared as an expression-free template; read it from src/defaults/'),
  entry('S16.4', `SwitchCase > TemplateLiteral.test[expressions.length=0] > TemplateElement[value.cooked=/^(${OB})$/i]`, 'Ops vocabulary word as a template case label; read it from src/defaults/'),
  // The shapes #7's bare-word gate closed after its review (BOUNDARY-006); the numbers follow #7's S16.5-S16.7 and S16.9-S16.11.
  // Its identifier-key shape (#7's S16.8) is NOT copied: it would flag legitimate keys such as `{ text: ... }`.
  entry('S16.5', `CallExpression[callee.property.name=/^(${OPS_STRING_METHODS})$/] > Literal[value=/^(${OB})$/i], ${TPL(`CallExpression[callee.property.name=/^(${OPS_STRING_METHODS})$/]`)}`, 'Ops vocabulary word searched for with includes, indexOf, lastIndexOf, startsWith or endsWith (as a string or an expression-free template); read it from src/defaults/'),
  entry('S16.6', `MemberExpression[property.name=/^(${OPS_ARRAY_METHODS})$/] > ArrayExpression.object > Literal[value=/^(${OB})$/i], ${TPL(`MemberExpression[property.name=/^(${OPS_ARRAY_METHODS})$/] > ArrayExpression.object`)}, NewExpression[callee.name=/^(Set|Map)$/] > ArrayExpression > Literal[value=/^(${OB})$/i], NewExpression[callee.name='Map'] > ArrayExpression > ArrayExpression > Literal:first-child[value=/^(${OB})$/i], ${TPL('NewExpression[callee.name=/^(Set|Map)$/] > ArrayExpression')}`, 'Ops vocabulary word in an array searched with includes, indexOf or lastIndexOf, or in a Set or Map built from it; read it from src/defaults/'),
  entry('S16.7', `CallExpression[callee.property.name=/^(${OPS_KEYED_METHODS})$/] > Literal[value=/^(${OB})$/i], ${TPL(`CallExpression[callee.property.name=/^(${OPS_KEYED_METHODS})$/]`)}, BinaryExpression[operator='in'] > Literal.left[value=/^(${OB})$/i], ${TPL("BinaryExpression[operator='in']")}`, 'Ops vocabulary word as the key of a Map or Set get or has, or the left side of the in operator (as a string or an expression-free template); read it from src/defaults/'),
  entry('S16.9', `Property[computed=false] > Literal.key[value=/^(${OB})$/i]`, 'Ops vocabulary word as a quoted object key; read it from src/defaults/'),
  entry('S16.10', `Property[computed=true] > Literal.key[value=/^(${OB})$/i]`, 'Ops vocabulary word as a computed object key; read it from src/defaults/'),
  entry('S16.11', `MemberExpression[computed=true] > Literal.property[value=/^(${OB})$/i], ${TPL('MemberExpression[computed=true]')}`, 'Ops vocabulary word as a computed property read; read it from src/defaults/'),
];

export default [
  {
    files: ['**/*.ts'],
    ignores: ALLOW_LIST,
    languageOptions: { parser: tseslint.parser, sourceType: 'module' },
    linterOptions: { noInlineConfig: true },
    rules: { 'no-restricted-syntax': ['error', ...SELECTOR_ENTRIES] },
  },
];
