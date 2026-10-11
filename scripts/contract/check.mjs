// pnpm contract:check [--require-main]: gate `contract` checks C1 to C8 (contracts/gates.md). Plain Node. Collects every problem,
// prints them all prefixed `contract:`, then `contract gate: ok` or `contract gate: N problem(s)`; exit 1 on a problem.
//
// check.mjs shares no helper with overlays.mjs (C5 recomputes every derived value itself) and imports only common
// file helpers, the registry, the hygiene rules and the generators it must byte-compare against.
import { readdirSync, statSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText } from '../hygiene/rules.mjs';
import {
  LAYOUT, ROOT, changelogTopVersionOf, infoVersionOf, listFiles, readPin, readText, vendoredDigest, vendoredHashes,
} from './common.mjs';
import { generateFixturesSource, generateTypesSource, importTs, loadBulk } from './generate.mjs';
import { FIXTURES, RELAXATIONS, errorAllowed, relaxationSchemas } from './registry.mjs';
import { OPS_ACTORS, SYNTHETIC_ACTORS } from './overlays.mjs';
import { compile, loadSchema, relaxedSchema, stripHost, validateWith } from './validate.mjs';

// One property per line: the plant for the node tests renames the incoherent token (gates.md, plant 3).
export const TOKENS = {
  hashMismatch: 'hash mismatch',
  fileSet: 'file set',
  pinMetadata: 'pin metadata',
  typesStale: 'types stale',
  fixturesStale: 'fixtures stale',
  violates: 'violates contract',
  relaxation: 'relaxation',
  unregistered: 'unregistered fixture',
  incoherent: 'incoherent',
  hygiene: 'hygiene',
  provisional: 'provisional',
  guard: 'guard',
  pinProvenance: 'pin provenance',
};

/**
 * The producer's lane weights: the one value copied from the producer instead of read from the vendored contract.
 * Source: spec-kitty src/specify_cli/status/progress.py, symbol DEFAULT_LANE_WEIGHTS (used by
 * compute_weighted_progress), at commit 9f41e48fe0e8b00cd040690598e90c37d82ea4a2. `contract:verify-remote`
 * re-verifies it against the pinned commit. A change here goes together with the declared values in overlays.mjs.
 */
export const PRODUCER_LANE_WEIGHTS = {
  planned: 0, claimed: 0.05, in_progress: 0.3, for_review: 0.6, in_review: 0.7, approved: 0.8, done: 1, blocked: 0, canceled: 0,
};

const LANES = Object.keys(PRODUCER_LANE_WEIGHTS);
const TOLERANCE = 0.00005;
const STREAM_IDENTIFIERS = ['StreamCursor', 'streamCursor', 'StatusTransitionEvent', 'MissionLifecycleEvent', 'LogTruncatedEvent', 'eventCount', 'lastEventId'];

const problem = (token, message, extra = {}) => ({ token, message, ...extra });

/** Files the Work Package detail screen cannot do without; their presence is checked against the directory, not the pin. */
export const ANCHOR_FILES = [
  'mission-status/openapi.yaml',
  'mission-status/schemas/WorkPackageDetail.yaml',
  'mission-status/schemas/ReviewCycle.yaml',
  'mission-status/schemas/Workspace.yaml',
  'mission-status/examples/WorkPackageDetail.populated.yaml',
];

// ---- C1 ---------------------------------------------------------------------------------------------------------
function checkPin(root, { requireMain = false } = {}) {
  const out = [];
  let pin;
  try {
    pin = readPin(root);
  } catch (err) {
    return { problems: [problem(TOKENS.pinMetadata, `PIN.json unreadable: ${err.message}`)], files: 0, anchors: 0 };
  }
  const actual = vendoredHashes(root);
  const pinned = pin.files ?? {};
  for (const [rel, hash] of Object.entries(pinned)) {
    if (Object.hasOwn(actual, rel) && actual[rel] !== hash) out.push(problem(TOKENS.hashMismatch, `${rel} differs from the pinned hash`));
  }
  const extra = Object.keys(actual).filter((k) => !Object.hasOwn(pinned, k));
  const missing = Object.keys(pinned).filter((k) => !Object.hasOwn(actual, k));
  if (extra.length) out.push(problem(TOKENS.fileSet, `vendored files not in PIN.json: ${extra.join(', ')}`));
  if (missing.length) out.push(problem(TOKENS.fileSet, `PIN.json files missing on disk: ${missing.join(', ')}`));
  if (Object.keys(actual).length === 0) out.push(problem(TOKENS.fileSet, 'no vendored files found'));
  if (!/^[0-9a-f]{40}$/.test(String(pin.sha))) out.push(problem(TOKENS.pinMetadata, 'sha is not 40 lowercase hex characters'));
  const info = Object.hasOwn(actual, 'mission-status/openapi.yaml') ? infoVersionOf(readText(root, LAYOUT.openapi)) : null;
  if (info === null || pin.infoVersion !== info) out.push(problem(TOKENS.pinMetadata, `infoVersion ${pin.infoVersion} differs from the vendored openapi.yaml (${info})`));
  out.push(...provenanceProblems(pin, { requireMain }));
  const top = Object.hasOwn(actual, 'mission-status/CHANGELOG.md') ? changelogTopVersionOf(readText(root, LAYOUT.changelog)) : null;
  if (top === null || pin.changelogTopVersion !== top) out.push(problem(TOKENS.pinMetadata, `changelogTopVersion ${pin.changelogTopVersion} differs from the vendored changelog (${top})`));
  const missingAnchors = ANCHOR_FILES.filter((a) => !Object.hasOwn(actual, a));
  for (const a of missingAnchors) out.push(problem(TOKENS.guard, `the vendored contract lacks the anchor file ${a}`));
  return { problems: out, files: Object.keys(actual).length, anchors: ANCHOR_FILES.length - missingAnchors.length };
}

// ---- C8 ---------------------------------------------------------------------------------------------------------
/**
 * Pure: the C8 problems of one pin record. `provenance` is `main` or `branch`; `branch` implies a non-empty `branch`
 * label and `reason`; `main` implies neither; with `requireMain` (the PR-readiness form) the pin must be `main`.
 */
export function provenanceProblems(pin, { requireMain = false } = {}) {
  const out = [];
  const filled = (v) => typeof v === 'string' && v.trim() !== '';
  if (pin.provenance === 'branch') {
    if (!filled(pin.branch)) out.push(problem(TOKENS.pinProvenance, 'a branch pin needs a non-empty branch label'));
    if (!filled(pin.reason)) out.push(problem(TOKENS.pinProvenance, 'a branch pin needs a non-empty reason'));
    if (requireMain) out.push(problem(TOKENS.pinProvenance, 'the pin is a branch pin; --require-main needs a pin of a commit on main (re-pin: pnpm contract:update --sha <main sha>)'));
  } else if (pin.provenance === 'main') {
    if (Object.hasOwn(pin, 'branch') || Object.hasOwn(pin, 'reason')) out.push(problem(TOKENS.pinProvenance, 'a main pin carries neither branch nor reason'));
  } else {
    out.push(problem(TOKENS.pinProvenance, `provenance must be main or branch, got ${JSON.stringify(pin.provenance ?? null)}`));
  }
  return out;
}

// ---- C2, C3 -----------------------------------------------------------------------------------------------------
const typesCache = new Map();
async function freshTypes(root) {
  const pin = readPin(root);
  const key = `${vendoredDigest(root)}:${pin.sha}:${pin.infoVersion}`;
  if (!typesCache.has(key)) typesCache.set(key, generateTypesSource(root));
  return typesCache.get(key);
}

async function checkTypes(root) {
  try {
    return (await freshTypes(root)) === readText(root, LAYOUT.types) ? [] : [problem(TOKENS.typesStale, 'types.generated.ts differs from a fresh openapi-typescript run; run pnpm contract:generate')];
  } catch (err) {
    return [problem(TOKENS.typesStale, `types could not be regenerated: ${err.message}`)];
  }
}

async function checkFixturesFresh(root, deps) {
  try {
    const fresh = await generateFixturesSource(root, { buildFixtures: deps.buildFixtures, bulk: deps.bulk, registry: deps.registry });
    return fresh === readText(root, LAYOUT.fixtures) ? [] : [problem(TOKENS.fixturesStale, 'fixtures.generated.ts differs from a fresh generation; run pnpm contract:generate')];
  } catch (err) {
    return [problem(TOKENS.fixturesStale, `fixtures could not be regenerated: ${err.message}`)];
  }
}

// ---- C4 ---------------------------------------------------------------------------------------------------------
const validatorCache = new Map();
async function validators(root, schemaName, relaxation) {
  const key = `${vendoredDigest(root)}:${schemaName}:${relaxation ?? ''}`;
  if (!validatorCache.has(key)) {
    const pristine = await loadSchema(root, schemaName);
    validatorCache.set(key, compile(relaxation ? relaxedSchema(pristine, RELAXATIONS[relaxation]) : pristine));
  }
  return validatorCache.get(key);
}

const WORK_PACKAGE_SCHEMAS = ['WorkPackage', 'WorkPackageDetail'];
/** Ops documents: the actor handle of an Op, alone or in a page, is checked for every kind (mission-ui#11). */
const OPS_SCHEMAS = ['OpsInvocation', 'OpsInvocationPage'];

const summarise = (errors) => errors.slice(0, 3).map((e) => `${e.path || '/'} ${e.message}`).join('; ');

/** The handles of an actor value: the three handles of a structured actor, or the plain string. Null handles are skipped. */
const handlesOf = (actor) => {
  if (actor && typeof actor === 'object') return [actor.tool, actor.role, actor.profile].filter((h) => typeof h === 'string');
  return typeof actor === 'string' ? [actor] : [];
};

/**
 * Every actor value of a document that is not in SYNTHETIC_ACTORS. Mission detail: the host `actor` of each work
 * package. Work Package: `actor`, `history[].actor` and `review.latestResult.reviewer`. Work Package detail:
 * `reviewCycles[].reviewer`. `allowed` is SYNTHETIC_ACTORS, plus OPS_ACTORS for an Ops document.
 */
export function actorProblems(doc, allowed = SYNTHETIC_ACTORS) {
  const found = [];
  for (const wp of doc.workPackages ?? []) if ('actor' in wp) found.push(...handlesOf(wp.actor));
  if ('actor' in doc) found.push(...handlesOf(doc.actor));
  for (const entry of doc.history ?? []) found.push(...handlesOf(entry?.actor));
  for (const op of doc.items ?? []) if (op && typeof op === 'object' && 'actor' in op) found.push(...handlesOf(op.actor));
  const reviewer = doc.review?.latestResult?.reviewer;
  if (typeof reviewer === 'string') found.push(reviewer);
  for (const cycle of doc.reviewCycles ?? []) if (typeof cycle?.reviewer === 'string') found.push(cycle.reviewer);
  return [...new Set(found.filter((h) => !allowed.includes(h)))];
}

function staleProblems(doc) {
  const holders = [doc, ...(doc.items ?? [])];
  return holders.some((h) => h && 'stale' in h && typeof h.stale !== 'boolean');
}

async function checkFixtureDoc(root, name, def, doc) {
  const out = [];
  const where = `fixture ${name}`;
  if (WORK_PACKAGE_SCHEMAS.includes(def.schema) || OPS_SCHEMAS.includes(def.schema)) {
    const bad = actorProblems(doc, OPS_SCHEMAS.includes(def.schema) ? [...SYNTHETIC_ACTORS, ...OPS_ACTORS] : SYNTHETIC_ACTORS);
    if (bad.length) out.push(problem(TOKENS.violates, `${where} has an actor outside SYNTHETIC_ACTORS: ${bad.join(', ')}`));
  }
  if (def.kind === 'valid') {
    const r = validateWith(await validators(root, def.schema), doc);
    if (!r.valid) out.push(problem(TOKENS.violates, `${where} violates the closed contract: ${summarise(r.errors)}`));
    return out;
  }
  const bad = WORK_PACKAGE_SCHEMAS.includes(def.schema) || OPS_SCHEMAS.includes(def.schema) ? [] : actorProblems(doc);
  if (bad.length) out.push(problem(TOKENS.violates, `${where} has an actor outside SYNTHETIC_ACTORS: ${bad.join(', ')}`));
  if (staleProblems(doc)) out.push(problem(TOKENS.violates, `${where} has a non-boolean stale`));
  const stripped = stripHost(doc);
  if (def.kind === 'host') {
    const r = validateWith(await validators(root, def.schema), stripped);
    if (!r.valid) out.push(problem(TOKENS.violates, `${where} violates the closed contract after stripping host fields: ${summarise(r.errors)}`));
    return out;
  }
  // relaxed: passes the relaxed schema, FAILS the strict one, and every strict error lies inside the allowed paths
  const rel = RELAXATIONS[def.relaxation];
  if (!rel) return [problem(TOKENS.relaxation, `${where} names the unknown relaxation ${def.relaxation}`)];
  if (!relaxationSchemas(rel).includes(def.schema)) return [problem(TOKENS.relaxation, `${where} validates against ${def.schema} but the ${def.relaxation} relaxation patches the schema ${relaxationSchemas(rel).join(' and ')}`)];
  const relaxed = validateWith(await validators(root, def.schema, def.relaxation), stripped);
  const strict = validateWith(await validators(root, def.schema), stripped);
  if (!relaxed.valid) out.push(problem(TOKENS.relaxation, `${where} fails even the ${def.relaxation} schema: ${summarise(relaxed.errors)}`));
  else if (strict.valid) out.push(problem(TOKENS.relaxation, `${where} passes the strict schema: the ${def.relaxation} entry is stale`));
  else {
    const outside = strict.errors.filter((e) => !errorAllowed(rel, e));
    if (outside.length) out.push(problem(TOKENS.relaxation, `${where} deviates outside ${def.relaxation}: ${summarise(outside)}`));
  }
  return out;
}

async function loadFixtureExports(root, deps) {
  if (deps.fixtures) return deps.fixtures;
  return importTs(join(root, LAYOUT.fixtures));
}

async function checkFixtures(root, deps, registry) {
  const out = [];
  let exported;
  try {
    exported = await loadFixtureExports(root, deps);
  } catch (err) {
    return { problems: [problem(TOKENS.violates, `fixtures.generated.ts cannot be loaded in plain Node: ${err.message}`)], docs: {}, count: 0 };
  }
  const names = Object.keys(exported);
  const keys = Object.keys(registry);
  const unregistered = names.filter((n) => !Object.hasOwn(registry, n));
  const unexported = keys.filter((k) => !names.includes(k));
  if (unregistered.length) out.push(problem(TOKENS.unregistered, `exports without a registry entry: ${unregistered.join(', ')} (${names.length} exports, ${keys.length} registry entries)`));
  if (unexported.length) out.push(problem(TOKENS.unregistered, `registry entries without an export: ${unexported.join(', ')} (${names.length} exports, ${keys.length} registry entries)`));
  let count = 0;
  const docs = {};
  for (const name of names) {
    if (!Object.hasOwn(registry, name)) continue;
    docs[name] = exported[name];
    try {
      out.push(...(await checkFixtureDoc(root, name, registry[name], exported[name])));
    } catch (err) {
      out.push(problem(TOKENS.violates, `fixture ${name} could not be validated: ${String(err.message).split('\n')[0].slice(0, 200)}`));
    }
    count += 1;
  }
  if (count !== names.length - unregistered.length || count === 0) out.push(problem(TOKENS.guard, `validated ${count} fixtures of ${names.length} exported`));
  return { problems: out, docs, count };
}

// ---- C5 ---------------------------------------------------------------------------------------------------------
const near = (a, b) => typeof a === 'number' && Math.abs(a - b) <= TOLERANCE;
const LEFT_PLANNED = ['claimed', 'in_progress', 'for_review', 'in_review', 'approved'];

/** Rules a to h for one record; `isDetail` records carry work packages and phases. Returns the failed rule letters. */
export function coherenceFailures(m, { isDetail, skipPhases = false }) {
  const failed = [];
  const c = m.statusLaneCounts ?? {};
  const count = (lane) => Number(c[lane] ?? 0);
  const sum = LANES.reduce((s, l) => s + count(l), 0);
  if (isDetail) {
    const tally = Object.fromEntries(LANES.map((l) => [l, 0]));
    for (const wp of m.workPackages ?? []) if (Object.hasOwn(tally, wp.statusLane)) tally[wp.statusLane] += 1;
    if (LANES.some((l) => tally[l] !== count(l))) failed.push('a');
  }
  if (m.wpTotal !== sum) failed.push('b');
  if (m.blockedCount !== count('blocked')) failed.push('c');
  const p = m.progress ?? {};
  const donePct = m.wpTotal > 0 ? (count('done') / m.wpTotal) * 100 : 0;
  if (p.doneCount !== count('done') || !near(p.donePercentage, donePct)) failed.push('d');
  const weighted = m.wpTotal > 0 ? (LANES.reduce((s, l) => s + count(l) * PRODUCER_LANE_WEIGHTS[l], 0) / m.wpTotal) * 100 : 0;
  if (!Number.isFinite(p.weightedPercentage) || !near(p.weightedPercentage, weighted)) failed.push('e');
  let life;
  if (m.discardedAt !== null && m.discardedAt !== undefined) life = 'discarded';
  else if (m.wpTotal === 0) life = 'draft';
  else if (LEFT_PLANNED.some((l) => count(l) > 0)) life = 'active';
  else if (count('planned') > 0 || count('blocked') > 0) life = 'planned';
  else life = m.acceptedAt ? 'done' : 'active';
  if (m.lifecycleStatus !== life) failed.push('f');
  if (m.acceptedAt && m.nextAction !== null) failed.push('g');
  if (isDetail && !skipPhases) {
    const status = (name) => (m.phases ?? []).find((x) => x.name === name)?.status;
    const total = m.wpTotal;
    const beyond = ['for_review', 'in_review', 'approved', 'done', 'canceled'].reduce((s, l) => s + count(l), 0);
    const implement = total > 0 && beyond === total ? 'complete' : count('planned') + count('blocked') === total ? 'pending' : 'in_progress';
    const finished = count('done') + count('canceled');
    const started = ['for_review', 'in_review', 'approved', 'done'].reduce((s, l) => s + count(l), 0);
    const review = total > 0 && finished === total ? 'complete' : started === 0 ? 'pending' : 'in_progress';
    if (status('implement') !== implement || status('review') !== review) failed.push('h');
  }
  return failed;
}

// The lane whose producer weight is 1 is the finished one: the subtask rule reads it from the weights, not a literal.
const FINISHED_LANE = LANES.find((l) => PRODUCER_LANE_WEIGHTS[l] === 1);

/**
 * C5 rules of one `WorkPackage` document, recomputed here and nowhere else (overlays.mjs shares no helper with this).
 * Returns the names of the failed rules:
 * ready-to-start      readyToStart equals (statusLane is planned and readiness.satisfied)
 * subtask-progress    subtaskProgress.done and .total equal the counts of the subtasks map
 * history-order       history is non-decreasing by `at`, then ascending by `eventId`
 * history-last        the last entry's toStatusLane equals statusLane; a null statusLane has an empty history
 * readiness-subset    readiness.unsatisfied is a subset of dependencies
 */
export function workPackageFailures(wp) {
  const failed = [];
  const history = wp.history ?? [];
  const readiness = wp.readiness ?? {};
  if (wp.readyToStart !== (wp.statusLane === 'planned' && readiness.satisfied === true)) failed.push('ready-to-start');
  const states = Object.values(wp.subtasks ?? {});
  if (wp.subtaskProgress?.total !== states.length || wp.subtaskProgress?.done !== states.filter((v) => v === FINISHED_LANE).length) failed.push('subtask-progress');
  const ordered = history.every((e, i) => {
    if (i === 0) return true;
    const a = Date.parse(history[i - 1].at);
    const b = Date.parse(e.at);
    return a < b || (a === b && history[i - 1].eventId < e.eventId);
  });
  if (!ordered) failed.push('history-order');
  const last = history[history.length - 1];
  const lastOk = wp.statusLane === null ? history.length === 0 : last !== undefined && last.toStatusLane === wp.statusLane;
  if (!lastOk) failed.push('history-last');
  if (!(readiness.unsatisfied ?? []).every((d) => (wp.dependencies ?? []).includes(d))) failed.push('readiness-subset');
  return failed;
}

const bytes = (text) => Buffer.from(String(text), 'utf8');
const byteCompare = (a, b) => Buffer.compare(bytes(a), bytes(b));

/**
 * C5 rules of one `DriftReport`, recomputed here and nowhere else (the overlays and bulk.ts share no helper with this).
 * Returns the names of the failed rules:
 * key-unique   no two findings share (missionId, kind, artifactPath)
 * key-order    the findings are strictly ascending by (missionId, kind, artifactPath) in the byte order of the UTF-8 encoding
 * lane-order   the lane rows of each finding are strictly ascending by wpId in byte order
 * lane-equal   no lane row has the same lane on both sides (a row exists only where the sides differ)
 */
export function driftFailures(report) {
  const failed = [];
  const findings = report.findings ?? [];
  const key = (f) => [f.missionId, f.kind, f.artifactPath];
  if (new Set(findings.map((f) => JSON.stringify(key(f)))).size !== findings.length) failed.push('key-unique');
  const ascending = findings.every((f, i) => {
    if (i === 0) return true;
    const a = key(findings[i - 1]);
    const b = key(f);
    for (let k = 0; k < 3; k += 1) {
      const c = byteCompare(a[k], b[k]);
      if (c !== 0) return c < 0;
    }
    return false;
  });
  if (!ascending) failed.push('key-order');
  const rowsOf = (f) => f.laneComparison ?? [];
  if (!findings.every((f) => rowsOf(f).every((r, i) => i === 0 || byteCompare(rowsOf(f)[i - 1].wpId, r.wpId) < 0))) failed.push('lane-order');
  if (findings.some((f) => rowsOf(f).some((r) => r.persistedStatusLane === r.derivedStatusLane))) failed.push('lane-equal');
  return failed;
}

function checkCoherence(docs, registry, bulkPages, bulkHooks = {}) {
  const out = [];
  let records = 0;
  const run = (label, rec, isDetail, skipPhases) => {
    records += 1;
    const rules = coherenceFailures(rec, { isDetail, skipPhases });
    if (rules.length) out.push(problem(TOKENS.incoherent, `${label} is incoherent (rule ${rules.join(', ')})`, { rules }));
  };
  for (const [name, doc] of Object.entries(docs)) {
    const def = registry[name];
    if (def.schema === 'MissionDetail') run(`fixture ${name}`, doc, true, def.relaxation === 'phases-open');
    else if (def.schema === 'MissionOverviewPage') (doc.items ?? []).forEach((item, i) => run(`fixture ${name} item ${i}`, item, false, false));
    else if (def.schema === 'WorkPackage') {
      records += 1;
      const rules = workPackageFailures(doc);
      if (rules.length) out.push(problem(TOKENS.incoherent, `fixture ${name} is incoherent (rule ${rules.join(', ')})`, { rules }));
    } else if (def.schema === 'DriftReport') {
      records += 1;
      const rules = driftFailures(doc);
      if (rules.length) out.push(problem(TOKENS.incoherent, `fixture ${name} is incoherent (rule ${rules.join(', ')})`, { rules }));
    }
  }
  // a generated document whose bulkDocuments row names a C5 hook (the Drift report: driftFailures)
  for (const [label, { doc, coherence }] of Object.entries(bulkHooks)) {
    records += 1;
    const rules = coherence(doc);
    if (rules.length) out.push(problem(TOKENS.incoherent, `${label} is incoherent (rule ${rules.join(', ')})`, { rules }));
  }
  for (const [label, page] of Object.entries(bulkPages)) page.items.forEach((item, i) => run(`${label} item ${i}`, item, false, false));
  return { problems: out, records };
}

/** The contract's maxItems of a Drift report, restated here: the bulk generator is checked against this literal, not against its own constant. */
const DRIFT_MAX_FINDINGS = 1000;

// The documents of the Artifact Viewer's generators: the listing is the contract's own limit (a literal of this gate, not read
// from bulk.ts, so a generator shrunk to a stand-in cannot pass), the sizes are the contract's cap.
const BULK_LISTING_ENTRIES = 1000;
const BULK_CONTENT_BYTES = 262144;
// The stored fixtures hold 30 short documents; a generated document written into them would show as size first.
const FIXTURES_FILE_CEILING = 1048576;
const PROBE_LENGTH = 200;

/**
 * The generated documents, by label, each with the schema it must satisfy and the call that builds it. The content paths are
 * listed in the generated listing. A row with `coherence` is also checked by that C5 hook (the Drift report: key and lane
 * order, unique keys, unequal lane words).
 */
function bulkDocuments(bulk) {
  const open = ['notes/large.md', 'notes/long-line.md', 'notes/over-budget.md'];
  return {
    'bulk listing of 1000': { schema: 'ArtifactListing', build: () => bulk.makeArtifactListing(BULK_LISTING_ENTRIES, { truncated: false, include: open }) },
    'bulk truncated listing of 1000': { schema: 'ArtifactListing', build: () => bulk.makeArtifactListing(BULK_LISTING_ENTRIES, { truncated: true, include: open }) },
    'bulk large markdown': { schema: 'ArtifactContent', build: () => bulk.makeLargeMarkdown(BULK_CONTENT_BYTES, open[0]) },
    'bulk long line': { schema: 'ArtifactContent', build: () => bulk.makeLongLine(BULK_CONTENT_BYTES, open[1]) },
    'bulk over-budget markdown': { schema: 'ArtifactContent', build: () => bulk.makeOverBudgetMarkdown(open[2]) },
    'bulk Drift report': { schema: 'DriftReport', build: () => bulk.makeDriftReport(DRIFT_MAX_FINDINGS), coherence: driftFailures },
  };
}

/** A slice from the middle of a generated document's text: it must not appear in a stored file. */
function probeOf(doc) {
  if (typeof doc.content === 'string') {
    const line = doc.content.split('\n').find((l) => l.length >= PROBE_LENGTH);
    return JSON.stringify(line ? line.slice(0, PROBE_LENGTH) : doc.content.slice(0, PROBE_LENGTH)).slice(1, -1);
  }
  // A value, not the finding's JSON: the generated source writes its keys unquoted, so a quoted-key slice never matches it.
  if (Array.isArray(doc.findings)) return JSON.stringify(doc.findings[Math.floor(doc.findings.length / 2)].missionId).slice(1, -1);
  return JSON.stringify(doc.entries[Math.floor(doc.entries.length / 2)].path).slice(1, -1);
}

async function checkBulk(root) {
  const bulk = await loadBulk(root);
  const pages = { 'bulk page of 40': bulk.makeMissionPage(40, true), 'bulk page of 500': bulk.makeMissionPage(500, true) };
  const out = [];
  const v = await validators(root, 'MissionOverviewPage');
  for (const [label, page] of Object.entries(pages)) {
    const r = validateWith(v, page);
    if (!r.valid) out.push(problem(TOKENS.violates, `${label} violates the closed contract: ${summarise(r.errors)}`));
  }
  // the Ops pages (mission-ui#11) are validated here too, but are not Mission records: they join no coherence check
  const opsV = await validators(root, 'OpsInvocationPage');
  const opsPages = { 'ops bulk page of 200': bulk.makeOpsPage(200, true), 'ops bulk page of 1000': bulk.makeOpsPage(1000, false) };
  for (const [label, page] of Object.entries(opsPages)) {
    const r = validateWith(opsV, page);
    if (!r.valid) out.push(problem(TOKENS.violates, `${label} violates the closed contract: ${summarise(r.errors)}`));
  }
  const documents = {};
  const hooks = {};
  for (const [label, { schema, build, coherence }] of Object.entries(bulkDocuments(bulk))) {
    let doc;
    try {
      doc = build();
    } catch (err) {
      out.push(problem(TOKENS.guard, `${label} could not be built: ${err.message}`));
      continue;
    }
    documents[label] = doc;
    if (coherence) hooks[label] = { doc, coherence };
    const r = validateWith(await validators(root, schema), doc);
    if (!r.valid) out.push(problem(TOKENS.violates, `${label} violates the closed contract: ${summarise(r.errors)}`));
    if (schema === 'ArtifactListing' && doc.entries.length !== BULK_LISTING_ENTRIES) out.push(problem(TOKENS.guard, `${label} holds ${doc.entries.length} entries, not ${BULK_LISTING_ENTRIES}`));
    if (schema === 'DriftReport' && doc.findings.length !== DRIFT_MAX_FINDINGS) out.push(problem(TOKENS.violates, `${label} holds ${doc.findings.length} findings; the bulk report holds exactly ${DRIFT_MAX_FINDINGS}`));
    if (schema === 'ArtifactContent' && doc.sizeBytes > BULK_CONTENT_BYTES) out.push(problem(TOKENS.guard, `${label} is ${doc.sizeBytes} bytes, over the cap of ${BULK_CONTENT_BYTES}`));
  }
  // never stored: no stored file holds a slice of a generated document, and the stored fixtures stay under their ceiling
  let stored = '';
  try {
    stored = readText(root, LAYOUT.fixtures);
  } catch {
    // an unreadable fixtures file is reported by C3 and the fixture check, not here
  }
  const bytes = Buffer.byteLength(stored);
  if (bytes > FIXTURES_FILE_CEILING) out.push(problem(TOKENS.guard, `${LAYOUT.fixtures} is ${bytes} bytes, over the ceiling of ${FIXTURES_FILE_CEILING}`));
  for (const [label, doc] of Object.entries(documents)) {
    if (stored.includes(probeOf(doc))) out.push(problem(TOKENS.guard, `a generated document is stored in ${LAYOUT.fixtures}: ${label}`));
  }
  return { problems: out, pages, documents, hooks };
}

// ---- C6 ---------------------------------------------------------------------------------------------------------
function authoredFiles(root) {
  const base = join(root, 'packages');
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== 'node_modules') walk(full);
      } else out.push(relative(root, full).split('\\').join('/'));
    }
  };
  for (const pkg of readdirSync(base)) {
    const src = join(base, pkg, 'src');
    try {
      walk(src);
    } catch {
      // a package without src
    }
  }
  return out.sort();
}

const isAuthored = (f) => /\/src\/.*(?:^|\/)(?:fixtures\.ts|[^/]+\.fixtures\.ts|[^/]+\.stories\.ts)$/.test(f);

function stringValues(value, into = []) {
  if (typeof value === 'string') into.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringValues(v, into));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => stringValues(v, into));
  return into;
}

function currentUsername() {
  try {
    const name = userInfo().username;
    return name.length >= 4 ? name : null;
  } catch {
    return null;
  }
}

function checkHygieneScope(root, docs, bulkPages) {
  const out = [];
  const files = [
    ...listFiles(join(root, LAYOUT.vendor)).map((f) => `${LAYOUT.vendor}/${f}`),
    LAYOUT.types, LAYOUT.fixtures, LAYOUT.bulk,
    ...authoredFiles(root).filter(isAuthored),
  ];
  const seen = new Set();
  for (const file of files) {
    let text;
    try {
      text = readText(root, file);
    } catch {
      continue;
    }
    for (const f of scanText(file, text)) {
      const key = `${f.file}:${f.rule}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(problem(TOKENS.hygiene, `${f.file}:${f.line}: ${f.rule}: ${f.message}`));
    }
  }
  const name = currentUsername();
  if (name) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const hit = (label, texts) => {
      if (texts.some((t) => re.test(t))) out.push(problem(TOKENS.hygiene, `${label} contains the username of the account running the gate`));
    };
    hit('generated fixture values', stringValues(docs));
    hit('bulk generator output', stringValues(bulkPages));
    for (const file of authoredFiles(root).filter(isAuthored)) hit(file, [readText(root, file)]);
  }
  return { problems: out, scanned: files.length };
}

// ---- C7 ---------------------------------------------------------------------------------------------------------
function checkProvisional(root) {
  const files = authoredFiles(root).filter((f) => f.endsWith('.ts') && !/^packages\/[^/]+\/src\/contract\//.test(f));
  const out = [];
  if (files.length === 0 || !files.includes('packages/mission-ui/src/index.ts')) {
    out.push(problem(TOKENS.guard, `the C7 scan covers ${files.length} files and must include packages/mission-ui/src/index.ts`));
  }
  const re = new RegExp(`\\b(${STREAM_IDENTIFIERS.join('|')})\\b`);
  for (const f of files) {
    const m = re.exec(readText(root, f));
    if (m) out.push(problem(TOKENS.provisional, `${f} uses the provisional event-stream identifier ${m[1]}`));
  }
  return { problems: out, files: files.length };
}

// ---- driver -----------------------------------------------------------------------------------------------------
/**
 * Run C1 to C8 over `root`. `requireMain` is the PR-readiness form of C8 (the `--require-main` flag). `deps` lets the tests inject changed inputs: `buildFixtures` (a changed overlay),
 * `registry`, `bulk`, and `fixtures` (an already loaded fixtures module).
 */
export async function runChecks({ root = ROOT, deps = {}, requireMain = false } = {}) {
  const registry = deps.registry ?? FIXTURES;
  const problems = [];
  const c1 = checkPin(root, { requireMain });
  problems.push(...c1.problems);
  problems.push(...(await checkTypes(root)));
  problems.push(...(await checkFixturesFresh(root, { ...deps, registry })));
  const fx = await checkFixtures(root, deps, registry);
  problems.push(...fx.problems);
  const bulk = await checkBulk(root);
  problems.push(...bulk.problems);
  const c5 = checkCoherence(fx.docs, registry, bulk.pages, bulk.hooks);
  problems.push(...c5.problems);
  const c6 = checkHygieneScope(root, fx.docs, { ...bulk.pages, ...bulk.documents });
  problems.push(...c6.problems);
  const c7 = checkProvisional(root);
  problems.push(...c7.problems);
  return {
    problems,
    summary: { vendoredFiles: c1.files, anchorFiles: c1.anchors, fixtures: fx.count, bulkPages: Object.keys(bulk.pages).length, bulkDocuments: Object.keys(bulk.documents).length, coherenceRecords: c5.records, hygieneFiles: c6.scanned, c7Files: c7.files },
  };
}

async function main() {
  const { problems, summary } = await runChecks({ root: ROOT, requireMain: process.argv.includes('--require-main') });
  for (const p of problems) process.stdout.write(`contract: ${p.token}: ${p.message}\n`);
  if (problems.length === 0) {
    const s = summary;
    process.stdout.write(`contract gate: ok (${s.vendoredFiles} vendored files, ${s.anchorFiles} anchor files, ${s.fixtures} fixtures, ${s.bulkPages} bulk pages, ${s.bulkDocuments} bulk documents, ${s.coherenceRecords} records checked for coherence, ${s.hygieneFiles} files in the hygiene scope, ${s.c7Files} files in the provisional scan)\n`);
    return 0;
  }
  process.stdout.write(`contract gate: ${problems.length} problem(s)\n`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main().catch((err) => {
    process.stdout.write(`contract: fail closed: ${err.message}\n`);
    return 2;
  });
}
