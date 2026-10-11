import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint, Linter } from 'eslint';
import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

// The first lint call loads the TypeScript parser and the real-sources case lints the whole tree: a cold runner needs more than 5 s (the whole file runs in about 2 s warm; 30 s is ample and bounds a hang sooner).
vi.setConfig({ testTimeout: 30_000 });

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FIXTURE_DIR = fileURLToPath(new URL('./fixtures/data-driven/', import.meta.url));
const CONFIG_PATH = fileURLToPath(new URL('../eslint.data-driven.config.mjs', import.meta.url));
const CONFIG_URL = new URL('../eslint.data-driven.config.mjs', import.meta.url).href;
const ELEMENT_FILE = 'packages/sample/src/elements/x/x.ts';

interface SelectorEntry {
  selector: string;
  message: string;
}
interface ConfigModule {
  default: Linter.Config[];
  SELECTOR_ENTRIES: SelectorEntry[];
  WORDS: string[];
  STATUS_WORDS: string[];
  UNDERSCORED: string[];
  VERDICT_WORDS: string[];
  CHANGE_STATE_WORDS: string[];
  STALENESS_STATUS_WORDS: string[];
  STALENESS_REASON_WORDS: string[];
  NEW_WORDS: string[];
  NEW_UNDERSCORED: string[];
  NEW_BARE_WORDS: string[];
  DRIFT_KIND_WORDS: string[];
  DRIFT_AUTHORITY_WORDS: string[];
  DRIFT_SIDE_WORDS: string[];
  DRIFT_REMEDY_WORDS: string[];
  DRIFT_REFUSAL_WORDS: string[];
  SOURCE_CODE_WORDS: string[];
  DRIFT_WORDS: string[];
  S8B_METHODS: string[];
  ALLOW_LIST: string[];
}

async function loadConfig(): Promise<ConfigModule> {
  return (await import(CONFIG_URL)) as ConfigModule;
}

async function lint(code: string, filename: string = ELEMENT_FILE): Promise<Linter.LintMessage[]> {
  const loaded = await loadConfig();
  return new Linter({ configType: 'flat' }).verify(code, loaded.default, { filename });
}

/** The selector ids of the data-driven errors in a lint result (rule id and severity checked, message parsed). */
function selectorIds(messages: Linter.LintMessage[]): string[] {
  return messages
    .filter((m) => m.ruleId === 'no-restricted-syntax' && m.severity === 2)
    .map((m) => /^data-driven: (S[\w.]+) /.exec(m.message)?.[1] ?? `UNPARSED(${m.message})`);
}

const positives = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.ts.txt')).sort();
const declared = (text: string): string[] => (/^\/\/ expect: (.+)$/m.exec(text)?.[1] ?? '').split(' ').filter(Boolean);

// The vocabulary of the gate, written out independently of the config so a mistyped word there is caught.
const EXPECTED_WORDS = ['specify', 'plan', 'tasks', 'implement', 'review', 'planned', 'claimed', 'in_progress', 'for_review', 'in_review', 'approved', 'done', 'blocked', 'canceled'];
const EXPECTED_STATUS_WORDS = ['pending', 'complete', 'draft', 'discarded'];
const EXPECTED_UNDERSCORED = ['in_progress', 'for_review', 'in_review'];
// The vocabulary the extension reads (ruling ARCH-006 (A)): the ReviewVerdict, ChangeState and Staleness enums of the
// vendored 1.1 schemas, written out here independently of the schemas.
const EXPECTED_VERDICT_WORDS = ['approved', 'changes_requested'];
const EXPECTED_CHANGE_STATE_WORDS = ['changed', 'unchanged', 'unknown'];
const EXPECTED_STALENESS_STATUS_WORDS = ['fresh', 'stale', 'not_applicable'];
const EXPECTED_STALENESS_REASON_WORDS = ['planning_artifact_repo_root_shared_workspace', 'live_claim_process'];
// Gate words (literals, anywhere outside the allow-list): underscored ones and whole-word ones that are not common identifiers.
const EXPECTED_NEW_WORDS = ['changes_requested', 'unchanged', 'not_applicable', 'planning_artifact_repo_root_shared_workspace', 'live_claim_process'];
const EXPECTED_NEW_UNDERSCORED = ['changes_requested', 'not_applicable', 'planning_artifact_repo_root_shared_workspace', 'live_claim_process'];
// Common identifiers: matched only in comparisons and case labels.
const EXPECTED_NEW_BARE_WORDS = ['changed', 'unknown', 'fresh', 'stale'];
// The Drift vocabulary (mission-ui#10): five enums read from the vendored schemas, written out here independently of them,
// and the four source codes, which have no enum schema and are held in a constant of the config.
const EXPECTED_DRIFT_KIND_WORDS = ['snapshot_disagrees_with_event_log', 'snapshot_or_event_log_missing', 'lane_branch_missing'];
const EXPECTED_DRIFT_AUTHORITY_WORDS = ['event_log', 'git'];
const EXPECTED_DRIFT_SIDE_WORDS = ['status_json', 'lanes_json'];
const EXPECTED_DRIFT_REMEDY_WORDS = ['materialize_status'];
const EXPECTED_DRIFT_REFUSAL_WORDS = ['mission_not_found', 'drift_scan_unreadable'];
const EXPECTED_SOURCE_CODE_WORDS = ['SNAPSHOT_DRIFT', 'SNAPSHOT_DRIFT_PROVENANCE', 'SNAPSHOT_DRIFT_TERMINAL', 'CORRUPT_JSON'];
// Gate words (literals, anywhere outside the allow-list): every enum member that is not an everyday word, so not `git`.
const EXPECTED_DRIFT_WORDS = [
  'snapshot_disagrees_with_event_log', 'snapshot_or_event_log_missing', 'lane_branch_missing', 'event_log', 'status_json', 'lanes_json',
  'materialize_status', 'mission_not_found', 'drift_scan_unreadable', 'SNAPSHOT_DRIFT', 'SNAPSHOT_DRIFT_PROVENANCE', 'SNAPSHOT_DRIFT_TERMINAL', 'CORRUPT_JSON',
];
const EXPECTED_METHODS = ['at', 'slice', 'splice', 'with', 'toSpliced'];
const EXPECTED_ENTRY_IDS = [
  'S1', 'S1b.1', 'S1b.2', 'S2', 'S3a', 'S3b', 'S3c.1', 'S3c.2', 'S4', 'S5', 'S5b.1', 'S5b.2', 'S5b.3', 'S6', 'S7',
  'S7b.1', 'S7b.2', 'S7b.3', 'S7b.4', 'S8a.1', 'S8a.2', 'S8b.1', 'S8b.2', 'S8c.1', 'S8c.2', 'S9.1', 'S9.2', 'S10', 'S11',
  'S12.1', 'S12.2', 'S13.1', 'S13.2', 'S13.3', 'S13.4', 'S13.5', 'S14.1', 'S14.2', 'S14.3', 'S14.4', 'S17.1', 'S17.2', 'S17.3', 'S17.4', 'S17.5',
];

describe('data-driven gate self-test: configuration', () => {
  it('declares the vocabulary of the contract and the 45 selector entries, each with a distinct id', async () => {
    const cfg = await loadConfig();
    expect(cfg.WORDS).toEqual(EXPECTED_WORDS);
    expect(cfg.VERDICT_WORDS).toEqual(EXPECTED_VERDICT_WORDS);
    expect(cfg.CHANGE_STATE_WORDS).toEqual(EXPECTED_CHANGE_STATE_WORDS);
    expect(cfg.STALENESS_STATUS_WORDS).toEqual(EXPECTED_STALENESS_STATUS_WORDS);
    expect(cfg.STALENESS_REASON_WORDS).toEqual(EXPECTED_STALENESS_REASON_WORDS);
    expect(cfg.NEW_WORDS).toEqual(EXPECTED_NEW_WORDS);
    expect(cfg.NEW_UNDERSCORED).toEqual(EXPECTED_NEW_UNDERSCORED);
    expect(cfg.NEW_BARE_WORDS).toEqual(EXPECTED_NEW_BARE_WORDS);
    expect(cfg.DRIFT_KIND_WORDS).toEqual(EXPECTED_DRIFT_KIND_WORDS);
    expect(cfg.DRIFT_AUTHORITY_WORDS).toEqual(EXPECTED_DRIFT_AUTHORITY_WORDS);
    expect(cfg.DRIFT_SIDE_WORDS).toEqual(EXPECTED_DRIFT_SIDE_WORDS);
    expect(cfg.DRIFT_REMEDY_WORDS).toEqual(EXPECTED_DRIFT_REMEDY_WORDS);
    expect(cfg.DRIFT_REFUSAL_WORDS).toEqual(EXPECTED_DRIFT_REFUSAL_WORDS);
    expect(cfg.SOURCE_CODE_WORDS).toEqual(EXPECTED_SOURCE_CODE_WORDS);
    expect(cfg.DRIFT_WORDS).toEqual(EXPECTED_DRIFT_WORDS);
    expect(cfg.STATUS_WORDS).toEqual(EXPECTED_STATUS_WORDS);
    expect(cfg.UNDERSCORED).toEqual(EXPECTED_UNDERSCORED);
    expect(cfg.S8B_METHODS).toEqual(EXPECTED_METHODS);
    const ids = cfg.SELECTOR_ENTRIES.map((e) => /^data-driven: (S[\w.]+) /.exec(e.message)?.[1]);
    expect(ids).toEqual(EXPECTED_ENTRY_IDS);
    expect(cfg.SELECTOR_ENTRIES.length).toBe(45);
    expect(new Set(ids).size).toBe(45);
  });

  it('turns inline configuration off', async () => {
    const cfg = await loadConfig();
    const scoped = cfg.default.filter((c) => c.linterOptions?.noInlineConfig === true);
    expect(scoped.length).toBe(1);
  });
});

describe('data-driven gate self-test: positive fixtures', () => {
  it('has the 53 positive fixtures and no other file', () => {
    expect(positives.length).toBe(53);
    expect(readdirSync(FIXTURE_DIR).length).toBe(53);
  });

  for (const name of positives) {
    it(`reports exactly the declared selectors for ${name}`, async () => {
      const text = readFileSync(`${FIXTURE_DIR}${name}`, 'utf8');
      const want = declared(text);
      expect(want.length).toBeGreaterThan(0);
      expect(selectorIds(await lint(text)).sort()).toEqual([...want].sort());
    });
  }

  it('covers every selector entry with at least one fixture, and no fixture names an unknown selector', async () => {
    const cfg = await loadConfig();
    const entryIds = cfg.SELECTOR_ENTRIES.map((e) => /^data-driven: (S[\w.]+) /.exec(e.message)?.[1] ?? '').sort();
    const covered = new Set(positives.flatMap((f) => declared(readFileSync(`${FIXTURE_DIR}${f}`, 'utf8'))));
    expect([...covered].sort()).toEqual(entryIds);
    expect(positives.length).toBeGreaterThanOrEqual(cfg.SELECTOR_ENTRIES.length);
  });
});

describe('data-driven gate self-test: every word of every vocabulary constant', () => {
  it('reports each of the 14 words as a literal (S1), in any case', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.WORDS) {
      for (const v of [w, w.toUpperCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)), v).toContain('S1');
        ran += 1;
      }
    }
    expect(ran).toBe(28);
  });

  it('reports each of the four status words as a literal (S1b.1)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.STATUS_WORDS) {
      expect(selectorIds(await lint(`export const x = '${w}';\n`)), w).toEqual(['S1b.1']);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('reports each of the three underscored values inside a longer string (S3c.1)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.UNDERSCORED) {
      expect(selectorIds(await lint(`export const x = 'lane-${w}';\n`)), w).toEqual(['S3c.1']);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('reports an attribute value that ends a self-closing tag (S3b)', async () => {
    const ids = selectorIds(await lint('export const h = html`<sk-x status="blocked"/>`;\n'));
    expect(ids).toEqual(['S3b']);
  });

  it('reports each positional method on phases with a literal argument (S8b.1)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const m of cfg.S8B_METHODS) {
      expect(selectorIds(await lint(`export const f = (phases: string[]) => phases.${m}(1);\n`)), m).toEqual(['S8b.1']);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('reports each lane through a statusLaneCounts read (S7b.1), done included', async () => {
    const cfg = await loadConfig();
    const lanes = cfg.WORDS.slice(5);
    let ran = 0;
    for (const lane of lanes) {
      const ids = selectorIds(await lint(`export const f = (statusLaneCounts: Record<string, number>) => statusLaneCounts.${lane};\n`));
      expect(ids, lane).toContain('S7b.1');
      ran += 1;
    }
    expect(ran).toBe(9);
  });
});

describe('data-driven gate self-test: every word of the verdict, change-state and staleness vocabularies', () => {
  it('reports each gate word as a literal (S13.1), in any case, and underscored ones inside a longer string (S13.3)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.NEW_WORDS) {
      for (const v of [w, w.toUpperCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)), v).toContain('S13.1');
        ran += 1;
      }
    }
    expect(ran).toBe(10);
    let inside = 0;
    for (const w of cfg.NEW_UNDERSCORED) {
      expect(selectorIds(await lint(`export const x = 'tone-${w}';\n`)), w).toEqual(['S13.3']);
      inside += 1;
    }
    expect(inside).toBe(4);
  });

  it('reports each bare word only in a comparison (S14.1, S14.3) or a case label (S14.2, S14.4), as a string or a template', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.NEW_BARE_WORDS) {
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === '${w}';\n`)), w).toEqual(['S14.1']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => '${w}' !== s;\n`)), w).toEqual(['S14.1']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case '${w}':\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S14.2']);
      // the same words as an expression-free template literal are the same comparison (S14.3) and case label (S14.4)
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === \`${w}\`;\n`)), w).toEqual(['S14.3']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => \`${w}\` !== s;\n`)), w).toEqual(['S14.3']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case \`${w}\`:\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S14.4']);
      // a template with an expression is not a bare word and is not flagged (positive control: the three above are)
      expect(selectorIds(await lint(`export const f = (s: string, t: string): boolean => s === \`${w}\${t}\`;\n`)), w).toEqual([]);
      // the same word as a plain literal is an ordinary string and is not flagged (positive control: the three above are)
      expect(selectorIds(await lint(`export const x = '${w}';\n`)), w).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('reads the vocabulary from the vendored schemas: every enum member is a gate word or a bare word', async () => {
    const cfg = await loadConfig();
    const all = [...cfg.VERDICT_WORDS, ...cfg.CHANGE_STATE_WORDS, ...cfg.STALENESS_STATUS_WORDS, ...cfg.STALENESS_REASON_WORDS];
    expect(all.length).toBe(10);
    const covered = new Set([...cfg.WORDS, ...cfg.NEW_WORDS, ...cfg.NEW_BARE_WORDS]);
    expect(all.filter((w) => !covered.has(w))).toEqual([]);
  });

  // The gate does not read ArtifactKind or the detail refusal codes; the reviewer self-check list and the foreign-value tests do.
  it('does not read the artifact kind or the detail refusal codes', async () => {
    expect(selectorIds(await lint("export const x = 'review_cycle';\n"))).toEqual([]);
    expect(selectorIds(await lint("export const x = 'source_unreadable';\n"))).toEqual([]);
  });
});

describe('data-driven gate self-test: every word of the Drift vocabulary', () => {
  it('reports each gate word as a literal, in any case, as itself (S17.1) and inside a longer string (S17.3)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.DRIFT_WORDS) {
      for (const v of [w, w.toUpperCase(), w.toLowerCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)).sort(), v).toEqual(['S17.1', 'S17.3']);
        expect(selectorIds(await lint(`export const x = 'tone-${v}';\n`)), v).toEqual(['S17.3']);
        ran += 1;
      }
    }
    expect(ran).toBe(39);
  });

  it('reports each gate word as an expression-free template (S17.2) and inside a template (S17.4)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.DRIFT_WORDS) {
      expect(selectorIds(await lint(`export const x = \`${w}\`;\n`)).sort(), w).toEqual(['S17.2', 'S17.4']);
      expect(selectorIds(await lint(`export const x = \`x-${w}-\${y}\`;\n`)), w).toEqual(['S17.4']);
      ran += 1;
    }
    expect(ran).toBe(13);
  });

  it('reports each gate word as an object key (S17.5)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.DRIFT_WORDS) {
      expect(selectorIds(await lint(`export const m = { ${w}: 1 };\n`)), w).toEqual(['S17.5']);
      ran += 1;
    }
    expect(ran).toBe(13);
  });

  it('covers every member of the five enums, bar the bare word git, and the four source codes', async () => {
    const cfg = await loadConfig();
    const members = [...cfg.DRIFT_KIND_WORDS, ...cfg.DRIFT_AUTHORITY_WORDS, ...cfg.DRIFT_SIDE_WORDS, ...cfg.DRIFT_REMEDY_WORDS, ...cfg.DRIFT_REFUSAL_WORDS];
    expect(members.length).toBe(10);
    const covered = new Set(cfg.DRIFT_WORDS);
    expect(members.filter((w) => !covered.has(w))).toEqual(['git']);
    expect(cfg.SOURCE_CODE_WORDS.filter((w) => !covered.has(w))).toEqual([]);
    expect(cfg.DRIFT_WORDS.length).toBe(13);
  });

  it('does not gate error, warning or git (they collide with the view-state, severity and everyday words), and a positive control is reported', async () => {
    let ran = 0;
    for (const w of ['error', 'warning', 'git']) {
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === '${w}';\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const m = { ${w}: 1 };\n`)), w).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(selectorIds(await lint("export const f = (s: string): boolean => s === 'event_log';\n")).sort()).toEqual(['S17.1', 'S17.3']);
  });

  it('is not triggered by camelCase, dotted or spaced forms of the same words (positive control: the underscored word is)', async () => {
    let ran = 0;
    for (const code of [
      'export const eventLog = 1;',
      "export const f = (s: string): boolean => s === 'event log';",
      "export const f = (s: string): boolean => s === 'status.json';",
      "export const f = (s: string): boolean => s === 'lanes-json';",
      "export const f = (o: { kind: string }): string => o.kind + 'lane branch missing';",
      "export const f = (s: string): boolean => s === 'SNAPSHOTDRIFT';",
      "export const f = (s: string): boolean => s === 'CORRUPT';",
    ]) {
      expect(selectorIds(await lint(`${code}\n`)), code).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(7);
    expect(selectorIds(await lint("export const f = (s: string): boolean => s === 'lanes_json';\n")).length).toBe(2);
  });
});

// The four source codes have no enum schema: DriftFinding.sourceCode is a pattern, and its description is the only place the
// codes are written. The constant of the config must agree with that description, both ways.
describe('data-driven gate self-test: the source codes agree with the DriftFinding.sourceCode description', () => {
  const finding = parse(readFileSync(new URL('../contracts/spec-kitty/mission-status/schemas/DriftFinding.yaml', import.meta.url), 'utf8')) as {
    properties: { sourceCode: { description: string } };
  };
  const describedCodes = (text: string): string[] => [...new Set(text.match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)*\b/g) ?? [])].sort();

  it('names exactly the codes of the constant: none missing from the description, none missing from the constant', async () => {
    const cfg = await loadConfig();
    const described = describedCodes(finding.properties.sourceCode.description);
    expect(described.length).toBe(4);
    expect([...cfg.SOURCE_CODE_WORDS].sort()).toEqual(described);
  });

  it('detects a disagreement in either direction (positive control for the check itself)', async () => {
    const cfg = await loadConfig();
    const description = finding.properties.sourceCode.description;
    const extraInDescription = describedCodes(`${description} A fifth, NEW_AUDIT_CODE.`);
    expect([...cfg.SOURCE_CODE_WORDS].sort()).not.toEqual(extraInDescription);
    const dropped = describedCodes(description.replace('CORRUPT_JSON', 'a corrupt file'));
    expect([...cfg.SOURCE_CODE_WORDS].sort()).not.toEqual(dropped);
    expect(dropped.length).toBe(3);
  });
});

describe('data-driven gate self-test: negative fixtures', () => {
  const NEGATIVE: Record<string, string> = {
    'progress.done read': 'export const f = (progress: { done: number; total: number }) => progress.done + progress.total;',
    'progress destructured': 'export const f = (progress: { done: number; total: number }) => {\n  const { done, total } = progress;\n  return done / total;\n};',
    'progress constructed': 'export const f = (done: number, total: number) => ({ done, total });',
    'glyph through lookup': 'export const g = (p: { status: string }) => lookup(PHASE_GLYPH, phaseState(p.status));',
    'is-current table': 'export const g = (state: string) => PHASE_IS_CURRENT[state];',
    'phaseState body': 'export const phaseState = (status: string) => lookup(PHASE_STATE, status) ?? DEFAULT_PHASE_STATE;',
    'blockedBadge key': 'export const r = { blockedBadge: null };',
    'blockedBadge type member': 'export interface R {\n  blockedBadge: string | null;\n}',
    'pill tag with an expression': 'export const h = html`<sk-pill-tag status="info">${label}</sk-pill-tag>`;',
    'expression track count': 'export const c = css`.g { grid-template-columns: repeat(${n}, 1fr); }`;',
    'phases map': 'export const f = (phases: string[]) => phases.map((p) => p.length);',
    'phases length against zero': 'export const f = (phases: string[]) => phases.length > 0;',
    'phases at negative': 'export const f = (phases: string[]) => phases.at(-1);',
    'counts by variable': 'export const f = (counts: Record<string, number>, lane: string) => counts[lane];',
    'property named changed': 'export const f = (o: { changed: boolean }) => o.changed;',
    'object key unknown': 'export const m = { unknown: 1 };',
    'variable named stale': 'export const f = (): boolean => {\n  const stale = true;\n  return stale;\n};',
    'type member fresh': 'export interface R {\n  fresh: boolean;\n}',
    'drift kind read from a property': 'export const f = (o: { kind: string }) => o.kind;',
    'drift camelCase name': 'export const eventLog = { statusJson: 1, lanesJson: 2 };',
    'drift word in a sentence with a space': "export const s = 'the event log decides';",
    'file name with a dot': "export const p = 'status.json';",
    'comparison with a variable': 'export const f = (s: string, t: string): boolean => s === t;',
  };

  it('has the declared number of negative cases', () => {
    expect(Object.keys(NEGATIVE).length).toBe(23);
  });

  for (const [name, code] of Object.entries(NEGATIVE)) {
    it(`stays silent on ${name}`, async () => {
      const messages = await lint(`${code}\n`);
      // Messages without a rule id (a configuration notice) do not count in this case only.
      expect(messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message)).toEqual([]);
    });
  }

  it('has a positive control: the same shapes with a violating twin are reported', async () => {
    expect(selectorIds(await lint("export const r = { blocked: null };\n"))).toEqual(['S5']);
    expect(selectorIds(await lint('export const h = html`<sk-pill-tag status="info">${label}</sk-pill-tag> blocked`;\n'))).toEqual(['S3a']);
    expect(selectorIds(await lint('export const c = css`.g { grid-template-columns: repeat(5, 1fr); }`;\n'))).toEqual(['S12.1']);
    expect(selectorIds(await lint('export const f = (phases: string[]) => phases.length > 3;\n'))).toEqual(['S9.1']);
    expect(selectorIds(await lint("export const f = (o: { changed: boolean }, s: string) => o.changed && s === 'changed';\n"))).toEqual(['S14.1']);
    expect(selectorIds(await lint("export const f = (o: { kind: string }) => o.kind === 'lane_branch_missing';\n")).sort()).toEqual(['S17.1', 'S17.3']);
  });
});

describe('data-driven gate self-test: the allow-list', () => {
  const VIOLATING = "export const f = (l: string): boolean => l === 'blocked';\n";
  const ALLOWED = [
    'packages/sample/src/defaults/lanes.ts',
    'packages/sample/src/contract/fixtures.generated.ts',
    'packages/sample/src/elements/x/x.stories.ts',
    'packages/sample/src/elements/x/fixtures.ts',
    'packages/sample/src/elements/x/x.fixtures.ts',
    'packages/sample/src/story-support/frame.ts',
  ];

  it('declares exactly the six allow-listed patterns', async () => {
    const cfg = await loadConfig();
    expect(cfg.ALLOW_LIST).toEqual(['**/src/defaults/**', '**/src/contract/**', '**/*.stories.ts', '**/fixtures.ts', '**/*.fixtures.ts', '**/src/story-support/**']);
    expect(ALLOWED.length).toBe(6);
  });

  for (const file of ALLOWED) {
    it(`ignores ${file} (matched by the ignore, not by a missing config) and still reports an element`, async () => {
      const ignored = await lint(VIOLATING, file);
      expect(ignored.length).toBe(1);
      expect(ignored[0]?.severity).toBe(1);
      expect(ignored[0]?.ruleId).toBeNull();
      expect(ignored[0]?.message.startsWith('No matching configuration found')).toBe(true);
      // positive control: the identical code in an element file is reported, so the ignore did not swallow everything
      expect(selectorIds(await lint(VIOLATING, ELEMENT_FILE))).toEqual(['S1']);
    });
  }

  it('exempts the new words in defaults and contract paths and reports them in an element', async () => {
    const code = "export const f = (s: string): boolean => s === 'changes_requested' || s === 'unknown';\n";
    let ran = 0;
    for (const file of ['packages/sample/src/defaults/review.ts', 'packages/sample/src/contract/types.ts']) {
      const ignored = await lint(code, file);
      expect(ignored.map((m) => m.ruleId)).toEqual([null]);
      ran += 1;
    }
    expect(ran).toBe(2);
    expect(selectorIds(await lint(code, ELEMENT_FILE)).sort()).toEqual(['S13.1', 'S13.3', 'S14.1']);
  });

  it('does not widen: look-alike paths are scanned', async () => {
    for (const file of [
      'packages/sample/src/elements/x/defaults.ts',
      'packages/sample/src/elements/x/fixtures-helper.ts',
      'packages/sample/src/elements/x/x.stories.tsx.ts',
      'packages/sample/src/logic/lookup.ts',
      'packages/sample/src/view-state.ts',
    ]) {
      expect(selectorIds(await lint(VIOLATING, file)), file).toEqual(['S1']);
    }
  });
});

describe('data-driven gate self-test: inline configuration', () => {
  it('still reports a literal under a line directive and under a block directive', async () => {
    const line = "// eslint-disable-next-line no-restricted-syntax\nexport const a = 'blocked';\n";
    const block = "/* eslint-disable */\nexport const b = 'blocked';\n";
    for (const code of [line, block]) {
      const messages = await lint(code);
      const errors = messages.filter((m) => m.ruleId === 'no-restricted-syntax');
      expect(errors.length).toBe(1);
      expect(errors[0]?.severity).toBe(2);
      expect(errors[0]?.message.startsWith('data-driven: S1 ')).toBe(true);
    }
  });
});

describe('data-driven gate self-test: the real sources', () => {
  it('reports 0 problems on every scanned file of packages/*/src, and scanned a non-empty list', async () => {
    const eslint = new ESLint({ cwd: ROOT, overrideConfigFile: CONFIG_PATH });
    const results = await eslint.lintFiles(readdirSync(`${ROOT}packages`).map((p) => `packages/${p}/src`));
    const problems = results.flatMap((r) => r.messages.map((m) => `${r.filePath}: ${m.message}`));
    expect(problems).toEqual([]);

    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
    const sources = readdirSync(`${ROOT}packages`).flatMap((p) => walk(`${ROOT}packages/${p}/src`));
    const scanned = sources.filter(
      (f) =>
        f.endsWith('.ts') &&
        !f.includes('/src/defaults/') &&
        !f.includes('/src/contract/') &&
        !f.includes('/src/story-support/') &&
        !f.endsWith('.stories.ts') &&
        !f.endsWith('/fixtures.ts') &&
        !f.endsWith('.fixtures.ts'),
    );
    expect(scanned.length).toBeGreaterThan(0);
    expect(results.length).toBe(scanned.length);
  });
});
