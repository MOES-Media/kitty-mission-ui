// Negative tests of gate `contract` (gates.md "Negative node tests"). Each case mutates a TEMPORARY copy of the
// vendored contract and the contract sources, runs the real check function and asserts the exact token list, so a
// failure prints the actual tokens. A clean-input case runs first as the positive control.
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { test, before, after } from 'node:test';
import { LAYOUT, ROOT } from './common.mjs';
import { PRODUCER_LANE_WEIGHTS, actorProblems, runChecks, workPackageFailures } from './check.mjs';
import { generateFixturesSource, loadBulk, loadExamples } from './generate.mjs';
import { buildFixtures as realBuild } from './overlays.mjs';
import { FIXTURES } from './registry.mjs';
import { compareLaneWeights, extractLaneWeights } from './verify-remote.mjs';

// Literal tokens, deliberately NOT imported from check.mjs: a test that reads the expected token from the code under
// test cannot notice that the token was renamed (plant 3 of gate contract renames exactly one of them).
const TOKENS = {
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

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

// A throwaway copy of exactly what the checks read.
function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'contract-check-'));
  dirs.push(root);
  cpSync(join(ROOT, LAYOUT.vendor), join(root, LAYOUT.vendor), { recursive: true });
  cpSync(join(ROOT, 'packages/mission-ui/src'), join(root, 'packages/mission-ui/src'), { recursive: true });
  return root;
}

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
const write = (root, rel, text) => writeFileSync(join(root, rel), text);
const edit = (root, rel, from, to) => {
  const text = read(root, rel);
  assert.ok(text.includes(from), `anchor not found in ${rel}: ${from}`);
  write(root, rel, text.replace(from, to));
};
const tokens = (r) => r.problems.map((p) => p.token);
const rulesOf = (r) => [...new Set(r.problems.flatMap((p) => p.rules ?? []))].sort();

/** Rewrite the temp fixtures file consistently with mutated documents, so only C4 to C6 can see the mutation. */
async function mutateDocs(root, mutate) {
  const buildFixtures = (args) => {
    const docs = realBuild(args);
    mutate(docs);
    return docs;
  };
  const bulk = await loadBulk(root);
  write(root, LAYOUT.fixtures, await generateFixturesSource(root, { buildFixtures, bulk }));
  return { buildFixtures };
}

const check = (root, deps, options = {}) => runChecks({ root, deps, ...options });
/** Rewrite the temp copy's PIN.json (it is not in its own hash list, and no generated header quotes these keys). */
const editPin = (root, mutate) => {
  const pin = JSON.parse(read(root, LAYOUT.pin));
  mutate(pin);
  write(root, LAYOUT.pin, `${JSON.stringify(pin, null, 2)}\n`);
};
const asMainPin = (pin) => {
  pin.provenance = 'main';
  delete pin.branch;
  delete pin.reason;
};
const asBranchPin = (pin) => {
  pin.provenance = 'branch';
  pin.branch = 'example-branch';
  pin.reason = 'a branch pin built by the test; the repository itself pins main';
};
// the repository pins main, so the C8 branch-pin cases build their own branch pin
const branchRepo = () => {
  const root = tempRepo();
  editPin(root, asBranchPin);
  return root;
};
const without = (obj, key) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

let clean;
before(async () => {
  clean = await check(ROOT);
});

test('positive control: the repository itself passes every check, and the checks counted real inputs', () => {
  assert.deepEqual(clean.problems, []);
  // independent literals, deliberately not computed from PIN.files (a pin and a directory that shrink together would
  // keep a derived floor green); edited deliberately at each re-pin
  assert.equal(clean.summary.vendoredFiles, 200);
  assert.equal(clean.summary.fixtures, 89);
  assert.equal(clean.summary.anchorFiles, 5);
  assert.equal(clean.summary.bulkPages, 2);
  assert.ok(clean.summary.c7Files > 0);
});

test('positive control: a temporary copy passes too', async () => {
  assert.deepEqual(tokens(await check(tempRepo())), []);
});

// ---- C1 ----
test('C1: one flipped byte in a vendored file fails the pin hash check', async () => {
  const root = tempRepo();
  const rel = `${LAYOUT.vendor}/mission-status/CHANGELOG.md`;
  const text = read(root, rel);
  const at = text.indexOf('e', text.length >> 1);
  write(root, rel, text.slice(0, at) + 'E' + text.slice(at + 1));
  assert.deepEqual(tokens(await check(root)), [TOKENS.hashMismatch]);
});

test('C1: an extra vendored file gives file set', async () => {
  const root = tempRepo();
  write(root, `${LAYOUT.vendor}/extra.txt`, 'not in the pin\n');
  assert.deepEqual(tokens(await check(root)), [TOKENS.fileSet]);
});

test('C1: a deleted vendored file gives file set', async () => {
  const root = tempRepo();
  rmSync(join(root, LAYOUT.vendor, 'mission-status/examples/StreamRefusal.negative.yaml'));
  assert.deepEqual(tokens(await check(root)), [TOKENS.fileSet]);
});

test('C1: a 39-hex sha gives pin metadata (and the two headers that quote it go stale)', async () => {
  const root = tempRepo();
  const pin = JSON.parse(read(root, LAYOUT.pin));
  pin.sha = pin.sha.slice(0, 39);
  write(root, LAYOUT.pin, JSON.stringify(pin, null, 2));
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinMetadata, TOKENS.typesStale, TOKENS.fixturesStale]);
});

test('C1: a wrong infoVersion gives pin metadata (and the types header goes stale)', async () => {
  const root = tempRepo();
  const pin = JSON.parse(read(root, LAYOUT.pin));
  pin.infoVersion = '1.0.1';
  write(root, LAYOUT.pin, JSON.stringify(pin, null, 2));
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinMetadata, TOKENS.typesStale]);
});

test('C1: a wrong changelogTopVersion gives pin metadata', async () => {
  const root = tempRepo();
  const pin = JSON.parse(read(root, LAYOUT.pin));
  pin.changelogTopVersion = '2.0.0';
  write(root, LAYOUT.pin, JSON.stringify(pin, null, 2));
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinMetadata]);
});

// ---- C8 ----
test('C8: a branch pin without a reason gives the C8 token', async () => {
  const root = branchRepo();
  editPin(root, (p) => {
    delete p.reason;
  });
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinProvenance]);
});

test('C8: a branch pin without a branch label, a missing provenance and an unknown provenance each give the C8 token', async () => {
  for (const mutate of [(p) => { delete p.branch; }, (p) => { delete p.provenance; }, (p) => { p.provenance = 'tag'; }, (p) => { p.reason = ''; }]) {
    const root = branchRepo();
    editPin(root, mutate);
    assert.deepEqual(tokens(await check(root)), [TOKENS.pinProvenance]);
  }
});

test('C8: a main pin that carries a branch or a reason gives the C8 token', async () => {
  const root = tempRepo();
  assert.equal(JSON.parse(read(root, LAYOUT.pin)).provenance, 'main', 'the repository itself pins main');
  editPin(root, (p) => {
    p.branch = 'example-branch';
  });
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinProvenance]);
  editPin(root, (p) => {
    delete p.branch;
    p.reason = 'a reason on a main pin';
  });
  assert.deepEqual(tokens(await check(root)), [TOKENS.pinProvenance]);
});

test('C8: --require-main refuses a branch pin, and passes a main pin (positive control)', async () => {
  const branch = branchRepo();
  assert.deepEqual(tokens(await check(branch)), [], 'a branch pin is accepted without the flag (development)');
  const refused = await check(branch, undefined, { requireMain: true });
  assert.deepEqual(tokens(refused), [TOKENS.pinProvenance]);
  assert.match(refused.problems[0].message, /main/);
  const main = tempRepo();
  editPin(main, asMainPin);
  assert.deepEqual(tokens(await check(main, undefined, { requireMain: true })), []);
  assert.deepEqual(tokens(await check(main)), []);
});

// ---- C2, C3 ----
test('C2: one changed character in types.generated.ts gives types stale', async () => {
  const root = tempRepo();
  edit(root, LAYOUT.types, 'export interface paths', 'export interfacf paths');
  assert.deepEqual(tokens(await check(root)), [TOKENS.typesStale]);
});

test('C3: a changed character in fixtures.generated.ts gives fixtures stale', async () => {
  const root = tempRepo();
  edit(root, LAYOUT.fixtures, 'Example Mission Beta', 'Example Mission Betb');
  assert.deepEqual(tokens(await check(root)), [TOKENS.fixturesStale]);
});

test('C3: a changed overlay gives fixtures stale', async () => {
  const root = tempRepo();
  const changed = (args) => {
    const docs = realBuild(args);
    docs.project.name = 'another-project';
    return docs;
  };
  assert.deepEqual(tokens(await check(root, { buildFixtures: changed })), [TOKENS.fixturesStale]);
});

// ---- C4 ----
test('C4: an extra property is a closed-shape violation', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailBothInProgress.plantExtraProperty = true;
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.violates]);
});

test('C4: an actor outside SYNTHETIC_ACTORS is a closed-shape violation', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailBadges.workPackages[3].actor = 'someone-else';
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.violates]);
});

test('C4: a host field on a valid-kind fixture is a closed-shape violation (it is not stripped silently)', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.pageFirst.items[0].stale = true;
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.violates]);
});

test('C4: a relaxed registry entry that passes the strict schema gives relaxation', async () => {
  const root = tempRepo();
  const registry = { ...FIXTURES, detailImplement: { ...FIXTURES.detailImplement, kind: 'relaxed', relaxation: 'phases-open' } };
  assert.deepEqual(tokens(await check(root, { registry })), [TOKENS.relaxation]);
});

test('C4: a relaxed fixture with a second defect outside the allowed paths gives relaxation', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailPhases3.secondDefect = 1;
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.relaxation]);
});

test('C4: a phases-open fixture with a known phase name and a wrong basis gives relaxation', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailPhases3.phases[0] = { name: 'implement', status: 'pending', basis: 'artifact' };
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.relaxation]);
});

test('C4: an export missing from the registry gives unregistered fixture (the regenerated file differs too)', async () => {
  const root = tempRepo();
  const registry = without(FIXTURES, 'project');
  const r = await check(root, { registry });
  assert.deepEqual(tokens(r), [TOKENS.fixturesStale, TOKENS.unregistered]);
  assert.match(r.problems[1].message, /project/);
});

test('C4: a registry key without an export gives unregistered fixture', async () => {
  const root = tempRepo();
  const registry = { ...FIXTURES, extraEntry: { ...FIXTURES.project } };
  const r = await check(root, { registry });
  assert.deepEqual(tokens(r), [TOKENS.fixturesStale, TOKENS.unregistered]);
  assert.match(r.problems[1].message, /extraEntry/);
});

// ---- C5 ----
const incoherent = async (mutate, rules) => {
  const root = tempRepo();
  const deps = await mutateDocs(root, mutate);
  const r = await check(root, deps);
  assert.deepEqual(tokens(r), [TOKENS.incoherent]);
  assert.deepEqual(rulesOf(r), rules);
};

test('C5 rule a: lane counts must equal the tally of the work packages', () =>
  incoherent((d) => {
    d.detailBlockers.workPackages[0].statusLane = 'claimed';
  }, ['a']));

test('C5 rule b: wpTotal must equal the sum of the nine counts', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.pageFirst.items[0].wpTotal = 99;
  });
  const r = await check(root, deps);
  assert.deepEqual(tokens(r), [TOKENS.incoherent]);
  assert.ok(rulesOf(r).includes('b'), rulesOf(r).join());
});

test('C5 rule c: blockedCount must equal the blocked count', () =>
  incoherent((d) => {
    d.detailBlockers.blockedCount = 0;
  }, ['c']));

test('C5 rule d: doneCount must equal the done count', () =>
  incoherent((d) => {
    d.detailAllComplete.progress.doneCount = 2;
  }, ['d']));

test('C5 rule e: a finite, in-range but wrong weightedPercentage is rejected (the old 41.6667)', () =>
  incoherent((d) => {
    d.detailImplement.progress.weightedPercentage = 41.6667;
  }, ['e']));

test('C5 rule e: a NaN weightedPercentage is rejected', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, () => {});
  const nan = realBuild({ examples: loadExamples(root), bulk: await loadBulk(root) });
  nan.detailImplement.progress.weightedPercentage = Number.NaN;
  const r = await check(root, { ...deps, fixtures: nan });
  // the contract's own range check (0..100) rejects NaN as well; C5 rule e is the one that names the derivation
  assert.deepEqual(tokens(r), [TOKENS.violates, TOKENS.incoherent]);
  assert.deepEqual(rulesOf(r), ['e']);
});

test('C5 rule f: lifecycleStatus must follow the rule order', () =>
  incoherent((d) => {
    d.detailBlockers.lifecycleStatus = 'planned';
  }, ['f']));

test('C5 rule g: acceptedAt non-null implies a null nextAction', () =>
  incoherent((d) => {
    d.detailAllComplete.acceptedAt = '2026-09-29T10:00:00Z';
    d.detailAllComplete.lifecycleStatus = 'done';
  }, ['g']));

test('C5 rule h: the implement phase status must follow the lane counts', () =>
  incoherent((d) => {
    d.detailBlockers.phases.find((p) => p.name === 'implement').status = 'complete';
  }, ['h']));

test('C5 unknown-lane tally: counting an unknown lane as planned is rejected', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailUnknownLane.statusLaneCounts.planned += 1;
    d.detailUnknownLane.wpTotal += 1;
  });
  const r = await check(root, deps);
  assert.deepEqual(tokens(r), [TOKENS.incoherent]);
  assert.ok(rulesOf(r).includes('a'), rulesOf(r).join());
});

test('C5 covers the bulk pages: a wrong bulk declared value is rejected', async () => {
  const root = tempRepo();
  edit(root, 'packages/mission-ui/src/contract/bulk.ts', 'weightedPercentage: 28.75', 'weightedPercentage: 29.75');
  const r = await check(root);
  assert.ok(tokens(r).includes(TOKENS.incoherent), tokens(r).join());
});

// ---- C5 over the WorkPackage fixtures, and the relaxation schema assertion ----
test('C5 WorkPackage fixtures: each rule fails a fixture built to violate exactly it, and passes when reverted', async () => {
  const cases = [
    ['ready-to-start', (d) => { d.wpPopulated.readyToStart = true; }],
    ['subtask-progress', (d) => { d.wpPopulated.subtaskProgress.done = 2; }],
    ['history-order', (d) => { d.wpApproved.history[3].at = '2026-01-01T00:00:00Z'; }],
    ['history-last', (d) => { d.wpDone.statusLane = 'approved'; }],
    ['readiness-subset', (d) => { d.wpBlocked.readiness.unsatisfied = ['WP01', 'WP77']; }],
  ];
  let n = 0;
  for (const [rule, mutate] of cases) {
    const root = tempRepo();
    const deps = await mutateDocs(root, mutate);
    const r = await check(root, deps);
    assert.ok(rulesOf(r).includes(rule), `${rule}: ${tokens(r).join()} ${rulesOf(r).join()}`);
    assert.ok(tokens(r).includes(TOKENS.incoherent));
    n += 1;
  }
  assert.equal(n, 5);
  assert.deepEqual(tokens(await check(tempRepo())), [], 'reverted: the unmutated fixtures are coherent');
});

test('C4 WorkPackage fixtures: an actor outside SYNTHETIC_ACTORS is a violation on every kind (history actor, reviewer, cycle reviewer)', async () => {
  const cases = [
    (d) => { d.wpPopulated.history[0].actor.tool = 'someone-real'; },
    (d) => { d.wpApproved.review.latestResult.reviewer = 'someone-real'; },
    (d) => { d.detailPopulated.reviewCycles[0].reviewer = 'someone-real'; },
    (d) => { d.wpUnknownLane.actor.profile = 'someone-real'; },
  ];
  let n = 0;
  for (const mutate of cases) {
    const root = tempRepo();
    const deps = await mutateDocs(root, mutate);
    const r = await check(root, deps);
    assert.ok(r.problems.some((p) => p.token === TOKENS.violates && p.message.includes('someone-real')), tokens(r).join());
    n += 1;
  }
  assert.equal(n, 4);
});

test('C4: a relaxed fixture whose schema differs from its relaxation schema gives relaxation', async () => {
  const root = tempRepo();
  const registry = { ...FIXTURES, wpUnknownLane: { ...FIXTURES.wpUnknownLane, schema: 'WorkPackageDetail' } };
  const r = await check(root, { registry });
  assert.ok(r.problems.some((p) => p.token === TOKENS.relaxation && /schema/.test(p.message)), tokens(r).join());
});

test('C4: the new relaxations let nothing else through: an unknown verdict next to an unknown lane still violates', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.wpUnknownLane.review = { latestResult: { reviewer: 'reviewer-renata', verdict: 'unheard-of', reference: 'x' }, override: null };
  });
  assert.ok(tokens(await check(root, deps)).includes(TOKENS.relaxation));
});

// ---- C5, WorkPackage rules (pure function over a document; the fixture-level cases follow the fixtures) ----
const WP_EXAMPLES = ['populated', 'with-prompt', 'provisional', 'no-events', 'actor-structured', 'actor-handle', 'actor-redacted', 'canceled', 'override', 'override-partial'];
const wpExample = (name) => structuredClone(loadExamples(ROOT)[`WorkPackage.${name}`]);

test('C5 WorkPackage rules: the ten contract examples satisfy every rule (a violating example is escalated, never relaxed)', () => {
  let n = 0;
  for (const name of WP_EXAMPLES) {
    assert.deepEqual(workPackageFailures(wpExample(name)), [], name);
    n += 1;
  }
  assert.equal(n, 10);
});

// Each case violates exactly one rule; the mutated document fails with that rule's name and the original passes.
const WP_RULE_CASES = [
  ['ready-to-start', 'populated', (d) => { d.readyToStart = true; }],
  ['ready-to-start', 'no-events', (d) => { d.readyToStart = true; d.readiness = { satisfied: true, unsatisfied: [] }; }],
  ['subtask-progress', 'populated', (d) => { d.subtaskProgress.done = 3; }],
  ['subtask-progress', 'populated', (d) => { d.subtaskProgress.total = 5; }],
  ['history-order', 'populated', (d) => { d.history[2].at = '2026-09-20T00:00:00Z'; }],
  ['history-order', 'populated', (d) => { d.history[1].at = d.history[0].at; d.history[1].eventId = d.history[0].eventId; }],
  ['history-last', 'populated', (d) => { d.statusLane = 'claimed'; }],
  ['history-last', 'no-events', (d) => { d.statusLane = 'planned'; }],
  ['history-last', 'populated', (d) => { d.history = []; }],
  ['readiness-subset', 'populated', (d) => { d.readiness = { satisfied: false, unsatisfied: ['WP99'] }; }],
];

test('C5 WorkPackage rules: each rule has a negative case that names it, and the unmutated document passes (positive control)', () => {
  let n = 0;
  for (const [rule, example, mutate] of WP_RULE_CASES) {
    const doc = wpExample(example);
    assert.deepEqual(workPackageFailures(doc), [], `${example} passes before the mutation`);
    mutate(doc);
    assert.ok(workPackageFailures(doc).includes(rule), `${rule} on ${example}: ${workPackageFailures(doc).join()}`);
    n += 1;
  }
  assert.equal(n, 10);
  assert.deepEqual([...new Set(WP_RULE_CASES.map((c) => c[0]))].sort(), ['history-last', 'history-order', 'readiness-subset', 'ready-to-start', 'subtask-progress']);
});

test('C5 WorkPackage rules: equal times with ascending event ids are in order (positive control for the tie rule)', () => {
  const doc = wpExample('populated');
  doc.history[1].at = doc.history[0].at;
  assert.ok(doc.history[0].eventId < doc.history[1].eventId);
  assert.deepEqual(workPackageFailures(doc), []);
});

// ---- actorProblems over the WorkPackage shapes ----
test('actorProblems: handles of actor, history actors, the latest reviewer and detail cycle reviewers must be synthetic', () => {
  const doc = wpExample('populated');
  assert.deepEqual(actorProblems(doc), [], 'positive control: the example handles are in SYNTHETIC_ACTORS');
  const at = (mutate) => {
    const d = wpExample('populated');
    mutate(d);
    return actorProblems(d);
  };
  assert.deepEqual(at((d) => { d.actor.tool = 'someone-else'; }), ['someone-else']);
  assert.deepEqual(at((d) => { d.history[3].actor.profile = 'real-person'; }), ['real-person']);
  assert.deepEqual(at((d) => { d.review.latestResult.reviewer = 'reviewer-real'; }), ['reviewer-real']);
  assert.deepEqual(at((d) => { d.actor = 'plain-string-handle'; }), ['plain-string-handle']);
  assert.deepEqual(actorProblems({ wpId: 'WP01', reviewCycles: [{ reviewer: 'reviewer-renata' }, { reviewer: 'someone-real' }] }), ['someone-real']);
  assert.deepEqual(actorProblems({ wpId: 'WP01', reviewCycles: [{ reviewer: 'reviewer-renata' }] }), []);
  assert.deepEqual(actorProblems({ workPackages: [{ actor: 'agent-a' }, { actor: 'agent-z' }] }), ['agent-z'], 'the Mission detail shape is still covered');
});

test('producer lane weights: the nine weights extracted from a captured excerpt equal the constant', () => {
  const excerpt = `DEFAULT_LANE_WEIGHTS: dict[str, float] = {
    "genesis": 0.0,
    "uninitialized": 0.0,
    "planned": 0.0,
    "claimed": 0.05,
    "in_progress": 0.3,
    "for_review": 0.6,
    "in_review": 0.7,
    "approved": 0.8,
    "done": 1.0,
    "blocked": 0.0,
    "canceled": 0.0,
}
`;
  const got = extractLaneWeights(excerpt);
  assert.equal(Object.keys(got).length, 9);
  assert.deepEqual(got, PRODUCER_LANE_WEIGHTS);
  assert.deepEqual(compareLaneWeights(got), []);
});

test('producer lane weights: a changed weight, a missing lane and a missing dict are rejected', () => {
  const dict = (lines) => `DEFAULT_LANE_WEIGHTS: dict[str, float] = {\n${lines}\n}\n`;
  const lines = Object.entries(PRODUCER_LANE_WEIGHTS).map(([k, v]) => `    "${k}": ${v},`);
  const changed = dict(lines.map((l) => l.replace('"done": 1', '"done": 0.9')).join('\n'));
  assert.equal(compareLaneWeights(extractLaneWeights(changed)).length, 1);
  assert.throws(() => extractLaneWeights(dict(lines.filter((l) => !l.includes('approved')).join('\n'))), /approved/);
  assert.throws(() => extractLaneWeights('nothing here'), /DEFAULT_LANE_WEIGHTS/);
});

// ---- C6 ----
const hygieneCase = async (apply) => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailEarly.friendlyName = apply();
  });
  assert.deepEqual(tokens(await check(root, deps)), [TOKENS.hygiene]);
};

test('C6: a planted absolute path in a fixture value gives hygiene', () => hygieneCase(() => `see ${'/' + 'home' + '/'}someone/x.ts`));
test('C6: a token-shaped string in a fixture value gives hygiene', () => hygieneCase(() => `${'ghp'}_${'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'}`));
test('C6: an e-mail address in a fixture value gives hygiene', () => hygieneCase(() => `person${'@'}corp.test`));
test('C6: the current OS username (read at run time) in a fixture value gives hygiene', () => {
  const name = userInfo().username;
  assert.ok(name.length >= 4, 'the executing account needs a username of 4 or more characters for this case');
  return hygieneCase(() => `Mission of ${name}`);
});
test('C6: an allow-listed example e-mail address passes', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.detailEarly.friendlyName = `person${'@'}example.com`;
  });
  assert.deepEqual(tokens(await check(root, deps)), []);
});

// ---- C7 ----
test('C7: a stream identifier in an element file gives provisional', async () => {
  const root = tempRepo();
  write(root, 'packages/mission-ui/src/elements/plant-c7.ts', 'export const x = lastEventId;\n');
  assert.deepEqual(tokens(await check(root)), [TOKENS.provisional]);
});

test('C7: the contract directory itself may name stream identifiers', async () => {
  const root = tempRepo();
  write(root, 'packages/mission-ui/src/contract/extra.ts', 'export type T = StreamCursor;\n');
  assert.deepEqual(tokens(await check(root)), []);
});

// ---- guards ----
test('guard: a registry of 88 entries against 89 exports is reported with both counts', async () => {
  const root = tempRepo();
  const registry = without(FIXTURES, 'pageLong');
  assert.equal(Object.keys(registry).length, 88);
  const r = await check(root, { registry });
  assert.ok(tokens(r).includes(TOKENS.unregistered));
  assert.match(r.problems.find((p) => p.token === TOKENS.unregistered).message, /88.*89|89.*88/);
});

test('guard: a PIN.files of 199 keys against 200 files gives file set', async () => {
  const root = tempRepo();
  const pin = JSON.parse(read(root, LAYOUT.pin));
  delete pin.files[Object.keys(pin.files)[0]];
  assert.equal(Object.keys(pin.files).length, 199);
  write(root, LAYOUT.pin, JSON.stringify(pin, null, 2));
  assert.deepEqual(tokens(await check(root)), [TOKENS.fileSet]);
});

test('guard: the floors fail when the vendored set shrinks by one file together with its pin (a pin-derived guard would stay green)', async () => {
  const root = tempRepo();
  const gone = 'mission-status/examples/StreamRefusal.negative.yaml';
  rmSync(join(root, LAYOUT.vendor, gone));
  editPin(root, (p) => {
    delete p.files[gone];
  });
  const r = await check(root);
  assert.equal(r.problems.some((p) => p.token === TOKENS.fileSet), false, 'the pin and the directory agree, so C1 alone is silent');
  assert.equal(r.summary.vendoredFiles, 199);
  assert.notEqual(r.summary.vendoredFiles, 200, 'the literal floor of the positive control would fail on this');
});

test('guard: a vendored set missing a named anchor file gives guard and names the file', async () => {
  const anchors = ['mission-status/openapi.yaml', 'mission-status/schemas/WorkPackageDetail.yaml', 'mission-status/schemas/ReviewCycle.yaml', 'mission-status/schemas/Workspace.yaml', 'mission-status/examples/WorkPackageDetail.populated.yaml'];
  for (const anchor of anchors) {
    const root = tempRepo();
    rmSync(join(root, LAYOUT.vendor, anchor));
    editPin(root, (p) => {
      delete p.files[anchor];
    });
    const r = await check(root);
    const hit = r.problems.filter((p) => p.token === TOKENS.guard);
    assert.equal(hit.length, 1, `${anchor}: ${tokens(r).join()}`);
    assert.ok(hit[0].message.includes(anchor), hit[0].message);
  }
});

test('guard: a C7 scan that does not include index.ts gives guard', async () => {
  const root = tempRepo();
  rmSync(join(root, 'packages/mission-ui/src/index.ts'));
  assert.deepEqual(tokens(await check(root)), [TOKENS.guard]);
});

test('guard: a C7 scan over no files gives guard', async () => {
  const root = tempRepo();
  const src = join(root, 'packages/mission-ui/src');
  for (const name of readdirSync(src)) if (name !== 'contract') rmSync(join(src, name), { recursive: true });
  assert.deepEqual(tokens(await check(root)), [TOKENS.guard]);
});

// ---- the Drift fixtures (mission-ui#10) ----
test('C4 Drift: the bulk report of 1000 findings is counted, validated and clean', async () => {
  assert.equal(clean.summary.bulkReports, 1);
  assert.deepEqual(clean.problems, []);
});

test('C4 Drift: a bulk generator that returns 1001 findings breaks maxItems, and the equality is checked in the gate itself', async () => {
  const root = tempRepo();
  edit(root, 'packages/mission-ui/src/contract/bulk.ts', 'for (let i = 0; i < count; i += 1) findings.push(', 'for (let i = 0; i <= count; i += 1) findings.push(');
  const r = await check(root);
  assert.ok(r.problems.some((p) => p.token === TOKENS.violates && /bulk Drift report/.test(p.message)), tokens(r).join());
});

test('C4 Drift: a foreign vocabulary word registered as a valid fixture (the relaxation withdrawn) is rejected by the closed schema', async () => {
  const root = tempRepo();
  const registry = { ...FIXTURES, reportUnknownKind: { schema: 'DriftReport', kind: 'valid', satisfies: 'DriftReport' } };
  const r = await check(root, { registry });
  assert.ok(r.problems.some((p) => p.token === TOKENS.violates && /reportUnknownKind/.test(p.message)), tokens(r).join());
});

test('C4 Drift: a vocabulary fixture registered as relaxed whose words are all in the contract set gives relaxation (a stale entry)', async () => {
  const root = tempRepo();
  const registry = { ...FIXTURES, reportPopulated: { schema: 'DriftReport', kind: 'relaxed', satisfies: 'DriftReportView', relaxation: 'drift-vocabulary-open' } };
  const r = await check(root, { registry });
  assert.ok(r.problems.some((p) => p.token === TOKENS.relaxation && /reportPopulated/.test(p.message)), tokens(r).join());
});

test('C4 Drift: a relaxed Drift fixture with a second defect (a bad path next to a foreign kind) gives relaxation', async () => {
  const root = tempRepo();
  const deps = await mutateDocs(root, (d) => {
    d.reportUnknownKind.findings[0].artifactPath = '/absolute';
  });
  assert.ok(tokens(await check(root, deps)).includes(TOKENS.relaxation));
});

test('C5 Drift: each rule fails a report built to violate exactly it', async () => {
  const cases = [
    ['key-unique', (d) => { d.reportPopulated.findings[1] = structuredClone(d.reportPopulated.findings[0]); }],
    ['key-order', (d) => { d.reportPopulated.findings.reverse(); }],
    ['lane-order', (d) => { d.reportPopulated.findings[1].laneComparison.reverse(); }],
    ['lane-equal', (d) => { d.reportPopulated.findings[1].laneComparison[0].derivedStatusLane = d.reportPopulated.findings[1].laneComparison[0].persistedStatusLane; }],
  ];
  let n = 0;
  for (const [rule, change] of cases) {
    const root = tempRepo();
    const deps = await mutateDocs(root, change);
    const r = await check(root, deps);
    assert.deepEqual(tokens(r), [TOKENS.incoherent], `${rule}: ${tokens(r).join()}`);
    assert.ok(rulesOf(r).includes(rule), `${rule}: ${rulesOf(r).join()}`);
    n += 1;
  }
  assert.equal(n, 4);
});
