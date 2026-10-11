import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ESLint, Linter } from 'eslint';
import tseslint from 'typescript-eslint';
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
  HEALTH_WORDS: string[];
  NEW_WORDS: string[];
  NEW_UNDERSCORED: string[];
  NEW_BARE_WORDS: string[];
  ARTIFACT_KINDS: string[];
  ARTIFACT_CODES: string[];
  ARTIFACT_UNDERSCORED: string[];
  ARTIFACT_BARE_WORDS: string[];
  DRIFT_KIND_WORDS: string[];
  DRIFT_AUTHORITY_WORDS: string[];
  DRIFT_SIDE_WORDS: string[];
  DRIFT_REMEDY_WORDS: string[];
  DRIFT_REFUSAL_WORDS: string[];
  SOURCE_CODE_WORDS: string[];
  DRIFT_WORDS: string[];
  OPS_OUTCOME_WORDS: string[];
  OPS_CLOSED_BY_WORDS: string[];
  OPS_MODE_WORDS: string[];
  OPS_EVIDENCE_KIND_WORDS: string[];
  OPS_STATUS_WORDS: string[];
  OPS_REFUSAL_WORDS: string[];
  OPS_CURSOR_REFUSAL_CODE: string;
  OPS_BARE_WORDS: string[];
  OPS_WORDS: string[];
  OPS_UNDERSCORED: string[];
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
const EXPECTED_HEALTH_WORDS = ['healthy', 'schema_drift'];
const EXPECTED_NEW_WORDS = ['changes_requested', 'unchanged', 'not_applicable', 'planning_artifact_repo_root_shared_workspace', 'live_claim_process', 'schema_drift'];
const EXPECTED_NEW_UNDERSCORED = ['changes_requested', 'not_applicable', 'planning_artifact_repo_root_shared_workspace', 'live_claim_process', 'schema_drift'];
// Common identifiers: matched only in comparisons and case labels.
const EXPECTED_NEW_BARE_WORDS = ['changed', 'unknown', 'fresh', 'stale', 'healthy'];
// The vocabulary the Artifact Viewer extension reads: the ArtifactKind enum and the ArtifactRefusalCode enum of the vendored
// schemas, written out here independently of them, in the schemas' order. The count guards: exactly 12 kinds and 7 codes.
const EXPECTED_ARTIFACT_KINDS = ['review_cycle', 'work_package_prompt', 'spec', 'plan', 'tasks', 'data_model', 'quickstart', 'analysis_report', 'research', 'contract', 'checklist', 'other'];
const EXPECTED_ARTIFACT_CODES = ['invalid_artifact_path', 'not_found', 'artifact_too_large', 'artifact_not_text', 'artifact_secret', 'artifact_unreadable', 'artifact_listing_unreadable'];
// Gate words (literals, anywhere outside the allow-list): every underscored kind and code.
const EXPECTED_ARTIFACT_UNDERSCORED = ['review_cycle', 'work_package_prompt', 'data_model', 'analysis_report', ...EXPECTED_ARTIFACT_CODES];
// Ordinary words: matched only in comparisons, case labels, includes, Map and Set calls and as object keys. `plan` and
// `tasks` are phase words and already gated everywhere, so they are not repeated here.
const EXPECTED_ARTIFACT_BARE_WORDS = ['spec', 'quickstart', 'research', 'contract', 'checklist', 'other'];
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
// The vocabulary of the Ops screen (mission-ui#11, plan D-12): the enums of the vendored Ops schemas and the page-cursor refusal
// constant, written out here independently of the schemas. `done` is already gated as a lane.
const EXPECTED_OPS_OUTCOME_WORDS = ['done', 'failed', 'abandoned'];
const EXPECTED_OPS_CLOSED_BY_WORDS = ['agent', 'doctor_sweep'];
const EXPECTED_OPS_MODE_WORDS = ['task_execution', 'advisory', 'mission_step', 'query'];
const EXPECTED_OPS_EVIDENCE_KIND_WORDS = ['repo_path', 'url', 'text'];
const EXPECTED_OPS_STATUS_WORDS = ['open', 'closed'];
const EXPECTED_OPS_REFUSAL_WORDS = ['ops_unreadable'];
const EXPECTED_OPS_CURSOR_REFUSAL_CODE = 'invalid_page_cursor';
// Gate words (literals, anywhere outside the allow-list), then the common identifiers matched only in a comparison or case label.
const EXPECTED_OPS_WORDS = ['abandoned', 'doctor_sweep', 'task_execution', 'mission_step', 'repo_path', 'ops_unreadable', 'invalid_page_cursor'];
const EXPECTED_OPS_UNDERSCORED = ['doctor_sweep', 'task_execution', 'mission_step', 'repo_path', 'ops_unreadable', 'invalid_page_cursor'];
const EXPECTED_OPS_BARE_WORDS = ['open', 'closed', 'agent', 'query', 'text', 'url', 'failed', 'advisory'];
const EXPECTED_METHODS = ['at', 'slice', 'splice', 'with', 'toSpliced'];
const EXPECTED_ENTRY_IDS = [
  'S1', 'S1b.1', 'S1b.2', 'S2', 'S3a', 'S3b', 'S3c.1', 'S3c.2', 'S4', 'S5', 'S5b.1', 'S5b.2', 'S5b.3', 'S6', 'S7',
  'S7b.1', 'S7b.2', 'S7b.3', 'S7b.4', 'S8a.1', 'S8a.2', 'S8b.1', 'S8b.2', 'S8c.1', 'S8c.2', 'S9.1', 'S9.2', 'S10', 'S11',
  'S12.1', 'S12.2', 'S13.1', 'S13.2', 'S13.3', 'S13.4', 'S13.5', 'S14.1', 'S14.2', 'S14.3', 'S14.4',
  'S15.1', 'S15.2', 'S15.3', 'S15.4', 'S15.5', 'S16.1', 'S16.2', 'S16.3', 'S16.4', 'S16.5', 'S16.6', 'S16.7', 'S16.8', 'S16.9', 'S16.10', 'S16.11',
  'S17.1', 'S17.2', 'S17.3', 'S17.4', 'S17.5',
  'S18.1', 'S18.2', 'S18.3', 'S18.4', 'S18.5', 'S19.1', 'S19.2', 'S19.3', 'S19.4',
  'S19.5', 'S19.6', 'S19.7', 'S19.9', 'S19.10', 'S19.11',
];
// The fixtures on #5's tip, and the new ones of the Artifact Viewer extension.
const FIXTURES_BEFORE = 46;
const FIXTURES_ADDED = 21;
const FIXTURES_DRIFT = 7;
const FIXTURES_OPS = 15;

describe('data-driven gate self-test: configuration', () => {
  it('declares the vocabulary of the contract and every selector entry, each with a distinct id', async () => {
    const cfg = await loadConfig();
    expect(cfg.WORDS).toEqual(EXPECTED_WORDS);
    expect(cfg.VERDICT_WORDS).toEqual(EXPECTED_VERDICT_WORDS);
    expect(cfg.CHANGE_STATE_WORDS).toEqual(EXPECTED_CHANGE_STATE_WORDS);
    expect(cfg.STALENESS_STATUS_WORDS).toEqual(EXPECTED_STALENESS_STATUS_WORDS);
    expect(cfg.STALENESS_REASON_WORDS).toEqual(EXPECTED_STALENESS_REASON_WORDS);
    expect(cfg.HEALTH_WORDS).toEqual(EXPECTED_HEALTH_WORDS);
    expect(cfg.NEW_WORDS).toEqual(EXPECTED_NEW_WORDS);
    expect(cfg.NEW_UNDERSCORED).toEqual(EXPECTED_NEW_UNDERSCORED);
    expect(cfg.NEW_BARE_WORDS).toEqual(EXPECTED_NEW_BARE_WORDS);
    expect(cfg.ARTIFACT_KINDS).toEqual(EXPECTED_ARTIFACT_KINDS);
    expect(cfg.ARTIFACT_CODES).toEqual(EXPECTED_ARTIFACT_CODES);
    expect(cfg.ARTIFACT_UNDERSCORED).toEqual(EXPECTED_ARTIFACT_UNDERSCORED);
    expect(cfg.ARTIFACT_BARE_WORDS).toEqual(EXPECTED_ARTIFACT_BARE_WORDS);
    expect(cfg.DRIFT_KIND_WORDS).toEqual(EXPECTED_DRIFT_KIND_WORDS);
    expect(cfg.DRIFT_AUTHORITY_WORDS).toEqual(EXPECTED_DRIFT_AUTHORITY_WORDS);
    expect(cfg.DRIFT_SIDE_WORDS).toEqual(EXPECTED_DRIFT_SIDE_WORDS);
    expect(cfg.DRIFT_REMEDY_WORDS).toEqual(EXPECTED_DRIFT_REMEDY_WORDS);
    expect(cfg.DRIFT_REFUSAL_WORDS).toEqual(EXPECTED_DRIFT_REFUSAL_WORDS);
    expect(cfg.SOURCE_CODE_WORDS).toEqual(EXPECTED_SOURCE_CODE_WORDS);
    expect(cfg.DRIFT_WORDS).toEqual(EXPECTED_DRIFT_WORDS);
    expect(cfg.OPS_OUTCOME_WORDS).toEqual(EXPECTED_OPS_OUTCOME_WORDS);
    expect(cfg.OPS_CLOSED_BY_WORDS).toEqual(EXPECTED_OPS_CLOSED_BY_WORDS);
    expect(cfg.OPS_MODE_WORDS).toEqual(EXPECTED_OPS_MODE_WORDS);
    expect(cfg.OPS_EVIDENCE_KIND_WORDS).toEqual(EXPECTED_OPS_EVIDENCE_KIND_WORDS);
    expect(cfg.OPS_STATUS_WORDS).toEqual(EXPECTED_OPS_STATUS_WORDS);
    expect(cfg.OPS_REFUSAL_WORDS).toEqual(EXPECTED_OPS_REFUSAL_WORDS);
    expect(cfg.OPS_CURSOR_REFUSAL_CODE).toBe(EXPECTED_OPS_CURSOR_REFUSAL_CODE);
    expect(cfg.OPS_WORDS).toEqual(EXPECTED_OPS_WORDS);
    expect(cfg.OPS_UNDERSCORED).toEqual(EXPECTED_OPS_UNDERSCORED);
    expect(cfg.OPS_BARE_WORDS).toEqual(EXPECTED_OPS_BARE_WORDS);
    expect(cfg.STATUS_WORDS).toEqual(EXPECTED_STATUS_WORDS);
    expect(cfg.UNDERSCORED).toEqual(EXPECTED_UNDERSCORED);
    expect(cfg.S8B_METHODS).toEqual(EXPECTED_METHODS);
    const ids = cfg.SELECTOR_ENTRIES.map((e) => /^data-driven: (S[\w.]+) /.exec(e.message)?.[1]);
    expect(ids).toEqual(EXPECTED_ENTRY_IDS);
    expect(cfg.SELECTOR_ENTRIES.length).toBe(EXPECTED_ENTRY_IDS.length);
    expect(new Set(ids).size).toBe(EXPECTED_ENTRY_IDS.length);
    expect(EXPECTED_ENTRY_IDS.length).toBe(40 + 16 + 5 + 15);
  });

  it('turns inline configuration off', async () => {
    const cfg = await loadConfig();
    const scoped = cfg.default.filter((c) => c.linterOptions?.noInlineConfig === true);
    expect(scoped.length).toBe(1);
  });
});

describe('data-driven gate self-test: positive fixtures', () => {
  it('has the 46 positive fixtures of #5, the 21 of the Artifact Viewer, the 7 of the Drift screen and the 15 of the Ops screen, and no other file', () => {
    expect(positives.length).toBe(FIXTURES_BEFORE + FIXTURES_ADDED + FIXTURES_DRIFT + FIXTURES_OPS);
    expect(readdirSync(FIXTURE_DIR).length).toBe(FIXTURES_BEFORE + FIXTURES_ADDED + FIXTURES_DRIFT + FIXTURES_OPS);
    expect(positives.filter((f) => /^s1[56]-/.test(f)).length).toBe(FIXTURES_ADDED);
    expect(positives.filter((f) => /^s17-/.test(f)).length).toBe(FIXTURES_DRIFT);
    expect(positives.filter((f) => /^s1[89]-/.test(f)).length).toBe(FIXTURES_OPS);
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
    expect(ran).toBe(12);
    let inside = 0;
    for (const w of cfg.NEW_UNDERSCORED) {
      expect(selectorIds(await lint(`export const x = 'tone-${w}';\n`)), w).toEqual(['S13.3']);
      inside += 1;
    }
    expect(inside).toBe(5);
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
    expect(ran).toBe(5);
  });

  it('reads the vocabulary from the vendored schemas: every enum member is a gate word or a bare word', async () => {
    const cfg = await loadConfig();
    const all = [...cfg.VERDICT_WORDS, ...cfg.CHANGE_STATE_WORDS, ...cfg.STALENESS_STATUS_WORDS, ...cfg.STALENESS_REASON_WORDS, ...cfg.HEALTH_WORDS];
    expect(all.length).toBe(12);
    const covered = new Set([...cfg.WORDS, ...cfg.NEW_WORDS, ...cfg.NEW_BARE_WORDS]);
    expect(all.filter((w) => !covered.has(w))).toEqual([]);
  });

  // The detail refusal codes of #5 are not read by this gate: only the artifact kinds and the seven artifact codes are.
  it('does not read the detail refusal codes of the Work Package screen (positive control: the artifact words are read)', async () => {
    expect(selectorIds(await lint("export const x = 'source_unreadable';\n"))).toEqual([]);
    expect(selectorIds(await lint("export const x = 'review_cycle';\n")).sort()).toEqual(['S15.1', 'S15.3']);
  });
});

describe('data-driven gate self-test: every word of the artifact kind and refusal code vocabularies', () => {
  it('guards exactly 12 kinds and 7 codes, read from the vendored enums', async () => {
    const cfg = await loadConfig();
    expect(cfg.ARTIFACT_KINDS.length).toBe(12);
    expect(cfg.ARTIFACT_CODES.length).toBe(7);
    expect(EXPECTED_ARTIFACT_KINDS.length).toBe(12);
    expect(EXPECTED_ARTIFACT_CODES.length).toBe(7);
  });

  it('reads every kind and code as a gate word, a bare word or a word an earlier selector already gates', async () => {
    const cfg = await loadConfig();
    const all = [...cfg.ARTIFACT_KINDS, ...cfg.ARTIFACT_CODES];
    expect(all.length).toBe(19);
    const earlier = new Set(cfg.WORDS);
    const covered = new Set([...cfg.ARTIFACT_UNDERSCORED, ...cfg.ARTIFACT_BARE_WORDS, ...earlier]);
    expect(all.filter((w) => !covered.has(w))).toEqual([]);
    expect(all.filter((w) => earlier.has(w))).toEqual(['plan', 'tasks']);
    expect(cfg.ARTIFACT_UNDERSCORED.length + cfg.ARTIFACT_BARE_WORDS.length).toBe(all.length - 2);
  });

  it('reports each underscored word as a literal (S15.1, S15.3), in any case, as a template, inside a string, inside a template and as a key', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.ARTIFACT_UNDERSCORED) {
      for (const v of [w, w.toUpperCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)).sort(), v).toEqual(['S15.1', 'S15.3']);
      }
      expect(selectorIds(await lint(`export const x = \`${w}\`;\n`)).sort(), w).toEqual(['S15.2', 'S15.4']);
      expect(selectorIds(await lint(`export const x = 'kind-${w}';\n`)), w).toEqual(['S15.3']);
      expect(selectorIds(await lint(`export const x = \`kind-${w}-\${y}\`;\n`)), w).toEqual(['S15.4']);
      expect(selectorIds(await lint(`export const m = { ${w}: 1 };\n`)), w).toEqual(['S15.5']);
      ran += 1;
    }
    expect(ran).toBe(11);
  });

  it('reports each bare word in a comparison, a case label, an includes call, a Map or Set call and as an object key, and nowhere else', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.ARTIFACT_BARE_WORDS) {
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === '${w}';\n`)), w).toEqual(['S16.1']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => '${w.toUpperCase()}' !== s;\n`)), w).toEqual(['S16.1']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case '${w}':\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S16.2']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === \`${w}\`;\n`)), w).toEqual(['S16.3']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case \`${w}\`:\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S16.4']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s.includes('${w}');\n`)), w).toEqual(['S16.5']);
      expect(selectorIds(await lint(`export const f = (k: string): boolean => ['${w}'].includes(k);\n`)), w).toEqual(['S16.6']);
      expect(selectorIds(await lint(`export const f = (m: Map<string, number>): number | undefined => m.get('${w}');\n`)), w).toEqual(['S16.7']);
      expect(selectorIds(await lint(`export const f = (m: Set<string>): boolean => m.has('${w}');\n`)), w).toEqual(['S16.7']);
      expect(selectorIds(await lint(`export const m = { ${w}: 1 };\n`)), w).toEqual(['S16.8']);
      expect(selectorIds(await lint(`export const m = { '${w}': 1 };\n`)), w).toEqual(['S16.9']);
      // the bypasses of the WP03 review: a computed key, indexOf and lastIndexOf, and a computed read
      expect(selectorIds(await lint(`export const m = { ['${w}']: 1 };\n`)), w).toEqual(['S16.9']);
      expect(selectorIds(await lint(`export const f = (k: string): number => ['${w}'].indexOf(k);\n`)), w).toEqual(['S16.6']);
      expect(selectorIds(await lint(`export const f = (k: string): number => ['${w}'].lastIndexOf(k);\n`)), w).toEqual(['S16.6']);
      expect(selectorIds(await lint(`export const f = (a: string[]): number => a.indexOf('${w}');\n`)), w).toEqual(['S16.5']);
      expect(selectorIds(await lint(`export const f = (o: Record<string, number>): number | undefined => o['${w}'];\n`)), w).toEqual(['S16.10']);
      expect(selectorIds(await lint(`export const f = (o: Record<string, number>): number | undefined => o[\`${w}\`];\n`)), w).toEqual(['S16.11']);
      expect(selectorIds(await lint(`export const m = { [\`${w}\`]: 1 };\n`)), w).toEqual(['S16.11']);
      // the same word as a plain string, as a member read, an unrelated call argument and in a template with an expression is not flagged
      expect(selectorIds(await lint(`export const x = '${w}';\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const f = (item: { ${w}: string }): string => item.${w};\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const f = (s: string, t: string): boolean => s === \`${w}\${t}\`;\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const f = (s: string): string => s.concat('${w}');\n`)), w).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('does not report a word in the allow-list, and reports it in an element', async () => {
    const code = "export const f = (k: string): boolean => k === 'other' || k === 'review_cycle';\n";
    let ran = 0;
    for (const file of ['packages/sample/src/defaults/artifact-kinds.ts', 'packages/sample/src/contract/types.ts', 'packages/sample/src/elements/x/x.stories.ts']) {
      expect((await lint(code, file)).map((m) => m.ruleId), file).toEqual([null]);
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(selectorIds(await lint(code, ELEMENT_FILE)).sort()).toEqual(['S15.1', 'S15.3', 'S16.1']);
  });
});

describe('data-driven gate self-test: the project health words (NFR-009)', () => {
  const FROM_ELEMENT = ['packages/sample/src/elements/x/x.ts', 'packages/sample/src/logic/project-row.ts'];
  const IN_DEFAULTS = ['packages/sample/src/defaults/health.ts', 'packages/sample/src/contract/types.ts'];

  it("refuses a component literal 'healthy' only in a comparison or case label, and 'schema_drift' anywhere as a literal", async () => {
    expect(selectorIds(await lint("export const f = (h: string): boolean => h === 'healthy';\n"))).toEqual(['S14.1']);
    expect(selectorIds(await lint("export const f = (h: string): boolean => h !== 'healthy';\n"))).toEqual(['S14.1']);
    expect(selectorIds(await lint("export function f(h: string): number {\n  switch (h) {\n    case 'healthy':\n      return 1;\n    default:\n      return 0;\n  }\n}\n"))).toEqual(['S14.2']);
    expect(selectorIds(await lint("export const f = (h: string): boolean => h === 'schema_drift';\n"))).toEqual(['S13.1', 'S13.3']);
    expect(selectorIds(await lint("export const x = 'schema_drift';\n"))).toEqual(['S13.1', 'S13.3']);
    expect(selectorIds(await lint("export const x = 'tone-schema_drift';\n"))).toEqual(['S13.3']);
    expect(selectorIds(await lint("export const t = { schema_drift: 1 };\n"))).toEqual(['S13.5']);
  });

  it("leaves 'healthy' as an ordinary word outside a comparison (positive control: the comparison above is refused)", async () => {
    expect(selectorIds(await lint("export const x = 'healthy';\n"))).toEqual([]);
    expect(selectorIds(await lint('export const f = (o: { healthy: boolean }) => o.healthy;\n'))).toEqual([]);
    expect(selectorIds(await lint("export const f = (h: string): boolean => h === 'healthy';\n"))).toEqual(['S14.1']);
  });

  it('exempts both words in defaults and contract paths, and reports them in the element files', async () => {
    const code = "export const f = (h: string): boolean => h === 'healthy' || h === 'schema_drift';\n";
    let ran = 0;
    for (const file of IN_DEFAULTS) {
      expect((await lint(code, file)).map((m) => m.ruleId), file).toEqual([null]);
      ran += 1;
    }
    for (const file of FROM_ELEMENT) {
      expect(selectorIds(await lint(code, file)).sort(), file).toEqual(['S13.1', 'S13.3', 'S14.1']);
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('data-driven gate self-test: every word of the Drift vocabulary', () => {
  // A Drift word that holds an Artifact Viewer gate word (#7) is also reported by S15.3 / S15.4 (inside a longer string or
  // template). Exactly one does: mission_not_found holds the artifact refusal code not_found.
  const holdsArtifactWord = (cfg: ConfigModule, w: string): boolean => cfg.ARTIFACT_UNDERSCORED.some((a) => w.toLowerCase().includes(a.toLowerCase()));

  it('knows which Drift words also hold an Artifact Viewer gate word', async () => {
    const cfg = await loadConfig();
    expect(cfg.DRIFT_WORDS.filter((w) => holdsArtifactWord(cfg, w))).toEqual(['mission_not_found']);
  });

  it('reports each gate word as a literal, in any case, as itself (S17.1) and inside a longer string (S17.3)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.DRIFT_WORDS) {
      const also = holdsArtifactWord(cfg, w) ? ['S15.3'] : [];
      for (const v of [w, w.toUpperCase(), w.toLowerCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)).sort(), v).toEqual([...also, 'S17.1', 'S17.3']);
        expect(selectorIds(await lint(`export const x = 'tone-${v}';\n`)).sort(), v).toEqual([...also, 'S17.3']);
        ran += 1;
      }
    }
    expect(ran).toBe(39);
  });

  it('reports each gate word as an expression-free template (S17.2) and inside a template (S17.4)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.DRIFT_WORDS) {
      const also = holdsArtifactWord(cfg, w) ? ['S15.4'] : [];
      expect(selectorIds(await lint(`export const x = \`${w}\`;\n`)).sort(), w).toEqual([...also, 'S17.2', 'S17.4']);
      expect(selectorIds(await lint(`export const x = \`x-${w}-\${y}\`;\n`)).sort(), w).toEqual([...also, 'S17.4']);
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

describe('data-driven gate self-test: every word of the Ops vocabularies', () => {
  it('reads the vocabulary from the vendored schemas: every enum member and the cursor code is a lane, a gate word or a bare word', async () => {
    const cfg = await loadConfig();
    const all = [
      ...cfg.OPS_OUTCOME_WORDS,
      ...cfg.OPS_CLOSED_BY_WORDS,
      ...cfg.OPS_MODE_WORDS,
      ...cfg.OPS_EVIDENCE_KIND_WORDS,
      ...cfg.OPS_STATUS_WORDS,
      ...cfg.OPS_REFUSAL_WORDS,
      cfg.OPS_CURSOR_REFUSAL_CODE,
    ];
    expect(all.length).toBe(16);
    const covered = new Set([...cfg.WORDS, ...cfg.OPS_WORDS, ...cfg.OPS_BARE_WORDS]);
    expect(all.filter((w) => !covered.has(w))).toEqual([]);
    // the three lists partition the vocabulary: a word is a lane, a gate word or a bare word, never two
    expect(new Set(all).size).toBe(16);
    expect(cfg.OPS_WORDS.filter((w) => cfg.WORDS.includes(w) || cfg.OPS_BARE_WORDS.includes(w))).toEqual([]);
    expect(cfg.OPS_BARE_WORDS.filter((w) => cfg.WORDS.includes(w))).toEqual([]);
  });

  it('reports each gate word as a literal (S18.1), in any case, and the underscored ones inside a longer string (S18.3)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.OPS_WORDS) {
      for (const v of [w, w.toUpperCase()]) {
        expect(selectorIds(await lint(`export const x = '${v}';\n`)), v).toContain('S18.1');
        ran += 1;
      }
    }
    expect(ran).toBe(14);
    let inside = 0;
    for (const w of cfg.OPS_UNDERSCORED) {
      expect(selectorIds(await lint(`export const x = 'tone-${w}';\n`)), w).toEqual(['S18.3']);
      expect(selectorIds(await lint(`export const x = \`tone-${w}\`;\n`)), w).toEqual(['S18.4']);
      expect(selectorIds(await lint(`export const x = { ${w}: 1 };\n`)), w).toEqual(['S18.5']);
      inside += 1;
    }
    expect(inside).toBe(6);
  });

  it('reports each bare word only in a comparison (S19.1, S19.3) or a case label (S19.2, S19.4), as a string or a template', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.OPS_BARE_WORDS) {
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === '${w}';\n`)), w).toEqual(['S19.1']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => '${w}' !== s;\n`)), w).toEqual(['S19.1']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s == '${w.toUpperCase()}';\n`)), w).toEqual(['S19.1']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case '${w}':\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S19.2']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => s === \`${w}\`;\n`)), w).toEqual(['S19.3']);
      expect(selectorIds(await lint(`export function f(s: string): number {\n  switch (s) {\n    case \`${w}\`:\n      return 1;\n    default:\n      return 0;\n  }\n}\n`)), w).toEqual(['S19.4']);
      // not a bare word: a template with an expression, a plain string, an object key, a member read (positive control: the six above are)
      expect(selectorIds(await lint(`export const f = (s: string, t: string): boolean => s === \`${w}\${t}\`;\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const x = '${w}';\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const o = { ${w}: 1 };\n`)), w).toEqual([]);
      expect(selectorIds(await lint(`export const f = (o: { ${w}: string }): string => o.${w};\n`)), w).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('reports each bare word in the shapes of #7 (BOUNDARY-006): a search or key argument, an array receiver, a quoted or computed key, a computed read', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.OPS_BARE_WORDS) {
      for (const method of ['includes', 'indexOf', 'lastIndexOf']) {
        expect(selectorIds(await lint(`export const f = (s: string): boolean => s.${method}('${w}') !== false;\n`)), `${method} ${w}`).toEqual(['S19.5']);
        expect(selectorIds(await lint(`export const f = (s: string): unknown => ['${w}', 'neutral'].${method}(s);\n`)), `array ${method} ${w}`).toEqual(['S19.6']);
      }
      for (const method of ['get', 'has']) expect(selectorIds(await lint(`export const f = (m: Map<string, number>): unknown => m.${method}('${w.toUpperCase()}');\n`)), `${method} ${w}`).toEqual(['S19.7']);
      expect(selectorIds(await lint(`export const o = { '${w}': 1 };\n`)), w).toEqual(['S19.9']);
      expect(selectorIds(await lint(`export const o = { ['${w}']: 1 };\n`)), w).toEqual(['S19.10']);
      expect(selectorIds(await lint(`export const f = (o: Record<string, number>): number | undefined => o['${w}'];\n`)), w).toEqual(['S19.11']);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('reports each bare word as an expression-free template argument, as startsWith or endsWith, and in a Set or Map built from it (F-5)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.OPS_BARE_WORDS) {
      for (const method of ['includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith']) {
        expect(selectorIds(await lint(`export const f = (s: string): unknown => s.${method}(\`${w}\`);\n`)), `template ${method} ${w}`).toEqual(['S19.5']);
      }
      for (const method of ['startsWith', 'endsWith']) {
        expect(selectorIds(await lint(`export const f = (s: string): boolean => s.${method}('${w}');\n`)), `${method} ${w}`).toEqual(['S19.5']);
      }
      for (const method of ['get', 'has']) expect(selectorIds(await lint(`export const f = (m: Map<string, number>): unknown => m.${method}(\`${w}\`);\n`)), `template ${method} ${w}`).toEqual(['S19.7']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => new Set(['${w}', 'neutral']).has(s);\n`)), `set ${w}`).toEqual(['S19.6']);
      expect(selectorIds(await lint(`export const f = (s: string): boolean => new Set([\`${w}\`]).has(s);\n`)), `set template ${w}`).toEqual(['S19.6']);
      expect(selectorIds(await lint(`export const f = (s: string): unknown => new Map([['${w}', 1]]).get(s);\n`)), `map ${w}`).toEqual(['S19.6']);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('reports each bare word as a template computed read, in an array searched with some, find or filter, and before the in operator (F-5, round 3)', async () => {
    const cfg = await loadConfig();
    let ran = 0;
    for (const w of cfg.OPS_BARE_WORDS) {
      expect(selectorIds(await lint(`export const f = (o: Record<string, number>): number | undefined => o[\`${w}\`];\n`)), `computed template ${w}`).toEqual(['S19.11']);
      for (const method of ['some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex', 'filter']) {
        expect(selectorIds(await lint(`export const f = (s: string): unknown => ['${w}', 'neutral'].${method}((x) => x === s);\n`)).filter((id) => id !== 'S19.1'), `array ${method} ${w}`).toEqual(['S19.6']);
        expect(selectorIds(await lint(`export const f = (s: string): unknown => [\`${w}\`].${method}((x) => x.length > s.length);\n`)), `template array ${method} ${w}`).toEqual(['S19.6']);
      }
      expect(selectorIds(await lint(`export const f = (o: object): boolean => '${w}' in o;\n`)), `in ${w}`).toEqual(['S19.7']);
      expect(selectorIds(await lint(`export const f = (o: object): boolean => \`${w}\` in o;\n`)), `in template ${w}`).toEqual(['S19.7']);
      ran += 1;
    }
    expect(ran).toBe(8);
  });

  it('keeps the round-3 shapes silent for other words, for an expression and for a variable left side (positive controls: the shapes above fire)', async () => {
    const silent = [
      'export const f = (o: Record<string, number>): number | undefined => o[`neutral`];\n',
      'export const f = (o: Record<string, number>, w: string): number | undefined => o[`${w}`];\n',
      "export const f = (s: string): unknown => ['alpha', 'beta'].some((x) => x === s);\n",
      "export const f = (s: string): unknown => ['alpha'].find((x) => x === s);\n",
      "export const f = (o: object): boolean => 'neutral' in o;\n",
      'export const f = (o: object, k: string): boolean => k in o;\n',
    ];
    for (const code of silent) expect(selectorIds(await lint(code)), code).toEqual([]);
    expect(silent.length).toBe(6);
    expect(selectorIds(await lint("export const f = (o: object): boolean => 'text' in o;\n"))).toEqual(['S19.7']);
  });

  it('keeps those shapes silent for other words and for a template with an expression (positive controls: the shapes above fire)', async () => {
    const silent = [
      'export const f = (s: string): boolean => s.includes(`neutral`);\n',
      'export const f = (s: string, w: string): boolean => s.includes(`${w}`);\n',
      "export const f = (s: string): boolean => s.startsWith('neutral');\n",
      "export const f = (s: string): boolean => s.endsWith(`neutral`);\n",
      "export const f = (s: string): boolean => new Set(['alpha', 'beta']).has(s);\n",
      "export const f = (s: string): unknown => new Map([['alpha', 1]]).get(s);\n",
      "export const f = (k: string): unknown => new Set([k]).has(k);\n",
    ];
    for (const code of silent) expect(selectorIds(await lint(code)), code).toEqual([]);
    expect(silent.length).toBe(7);
    expect(selectorIds(await lint('export const f = (s: string): boolean => s.includes(`text`);\n'))).toEqual(['S19.5']);
  });

  it('keeps the same shapes silent when no bare word is in them, and the identifier key (not copied from #7) silent (positive controls: the shapes above fire)', async () => {
    const silent = [
      "export const f = (s: string): boolean => s.includes('neutral');\n",
      "export const f = (s: string): number => ['alpha', 'beta'].indexOf(s);\n",
      "export const f = (m: Map<string, number>): number | undefined => m.get('neutral');\n",
      'export const f = (m: Map<string, number>, k: string): number | undefined => m.get(k);\n',
      "export const o = { 'neutral': 1, ['another']: 2 };\n",
      "export const f = (o: Record<string, number>): number | undefined => o['neutral'];\n",
      // an identifier key named like a bare word is a legitimate key (#7's S16.8 would flag it; it is not copied)
      'export const o = { text: 1, url: 2, open: true };\n',
      'export const f = (o: Record<string, number>, k: string): number | undefined => o[k];\n',
    ];
    for (const code of silent) expect(selectorIds(await lint(code)), code).toEqual([]);
    expect(silent.length).toBe(8);
    expect(selectorIds(await lint("export const f = (s: string): boolean => s.includes('text');\n"))).toEqual(['S19.5']);
  });

  it('finds exactly the expected violations in one file that holds one of each class (counted, so the gate cannot pass vacuously)', async () => {
    const cfg = await loadConfig();
    const anywhere = cfg.OPS_WORDS.map((w, i) => `export const a${i} = '${w}';`);
    const bare = cfg.OPS_BARE_WORDS.map((w, i) => `export const b${i} = (s: string): boolean => s === '${w}';`);
    const clean = cfg.OPS_BARE_WORDS.map((w, i) => `export const c${i} = { ${w}: '' };`);
    const messages = await lint(`${[...anywhere, ...bare, ...clean].join('\n')}\n`);
    const ids = selectorIds(messages);
    // 7 gate words (6 of them underscored, so S18.1 and S18.3 each) and 8 bare words (S19.1 each); the 8 bare-word keys are silent
    expect(anywhere.length + bare.length + clean.length).toBe(23);
    expect(ids.filter((i) => i === 'S18.1').length).toBe(7);
    expect(ids.filter((i) => i === 'S18.3').length).toBe(6);
    expect(ids.filter((i) => i === 'S19.1').length).toBe(8);
    expect(ids.length).toBe(21);
  });

  it('keeps the bare words as plain identifiers and properties silent, while their twin in a comparison is reported', async () => {
    const silent = [
      'export const row = { text: "x", url: "y", agent: "z", query: "q", open: true, closed: false, failed: 0, advisory: "" };',
      'export interface Cell {\n  text: string;\n  url: string | null;\n}',
      'export const f = (o: { text: string; url: string }): string => o.text + o.url;',
      'export const g = (evidence: { url: string }): string => evidence.url;',
      'export class C {\n  text = "";\n  url = "";\n}',
      'export const { text, url } = { text: "", url: "" };',
    ];
    for (const code of silent) expect(selectorIds(await lint(`${code}\n`)), code).toEqual([]);
    expect(silent.length).toBe(6);
    expect(selectorIds(await lint("export const f = (o: { text: string }): boolean => o.text === 'text';\n"))).toEqual(['S19.1']);
    expect(selectorIds(await lint("export const f = (o: { url: string }): boolean => 'url' === o.url;\n"))).toEqual(['S19.1']);
  });

  it('exempts the Ops words in defaults and contract paths and reports them in an element', async () => {
    const code = "export const f = (s: string): boolean => s === 'doctor_sweep' || s === 'open';\n";
    let ran = 0;
    for (const file of ['packages/sample/src/defaults/ops-copy.ts', 'packages/sample/src/contract/types.ts']) {
      expect((await lint(code, file)).map((m) => m.ruleId), file).toEqual([null]);
      ran += 1;
    }
    expect(ran).toBe(2);
    expect(selectorIds(await lint(code, ELEMENT_FILE)).sort()).toEqual(['S18.1', 'S18.3', 'S19.1']);
  });

  it('does not touch the earlier vocabularies: a lane, a verdict word and a staleness word are still reported once', async () => {
    expect(selectorIds(await lint("export const x = 'blocked';\n"))).toEqual(['S1']);
    expect(selectorIds(await lint("export const x = 'changes_requested';\n"))).toEqual(['S13.1', 'S13.3']);
    expect(selectorIds(await lint("export const f = (s: string): boolean => s === 'stale';\n"))).toEqual(['S14.1']);
    // `done` is a lane word and is reported as one, not twice
    expect(selectorIds(await lint("export const x = 'done';\n"))).toEqual(['S1']);
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
    'member read of other': 'export const f = (item: { other: string }): string => item.other;',
    'member read of spec': 'export const f = (item: { spec: string }): string => item.spec;',
    'import path segment contract': "import { a } from 'contract';\nexport const b = a;",
    'relative import through a contract folder': "import { a } from '../contract/types.js';\nexport const b = a;",
    'data attribute containing contract': 'export const h = html`<div data-contract="x"></div>`;',
    'css attribute selector containing contract': 'export const c = css`[data-contract] { margin: 0; }`;',
    'prose containing research': 'export const t = `research notes and other things`;',
    'destructured other': 'export const f = (props: { other: string }): string => {\n  const { other } = props;\n  return other;\n};',
    'shorthand other': 'export const f = (other: string) => ({ other });',
    'type member of other': 'export interface R {\n  other: string;\n}',
    'variable named research': 'export const f = (): number => {\n  const research = 1;\n  return research;\n};',
    'object key text': 'export const c = { text: "x" };',
    'object key url': 'export const c = { url: "x" };',
    'member read evidence.url': 'export const f = (e: { url: string }) => e.url;',
    'type member agent': 'export interface R {\n  agent: string;\n}',
    'variable named open': 'export const f = (): boolean => {\n  const open = true;\n  return open;\n};',
  };

  it('has the declared number of negative cases', () => {
    expect(Object.keys(NEGATIVE).length).toBe(19 + 11 + 4 + 5);
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
    // the artifact words: the twins of the negative cases above are reported
    expect(selectorIds(await lint("export const f = (item: { other: string }, s: string) => item.other && s === 'other';\n"))).toEqual(['S16.1']);
    expect(selectorIds(await lint("export const m = { other: 1 };\n"))).toEqual(['S16.8']);
    expect(selectorIds(await lint('export const t = `x` + (s === `research`);\n'))).toEqual(['S16.3']);
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

// R-ops-1 (contracts/gates.md): the selectors that keep an item-derived value out of a link, an address or markup in the Ops part
// files. They live in eslint.config.mjs (scoped to elements/sk-ops-screen/*-parts.ts) and are exercised here on their own, so the
// proof does not depend on the typed-lint run. The plant in gates/plants/eslint proves the scoped rule inside `pnpm lint`.
describe('R-ops-1: the Ops parts-file selectors', () => {
  const CONFIG = new URL('../eslint.config.mjs', import.meta.url).href;
  interface Opsconfig {
    OPS_PARTS_GLOB: string;
    opsPartsRestrictions: SelectorEntry[];
  }
  async function loadOps(): Promise<Opsconfig> {
    return (await import(CONFIG)) as Opsconfig;
  }
  async function lintParts(code: string): Promise<string[]> {
    const { opsPartsRestrictions } = await loadOps();
    const config: Linter.Config[] = [
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser, sourceType: 'module' }, rules: { 'no-restricted-syntax': ['error', ...opsPartsRestrictions] } },
    ];
    const messages = new Linter({ configType: 'flat' }).verify(code, config, { filename: 'packages/sample/src/elements/sk-ops-screen/ops-row-parts.ts' });
    return messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => /^ops-parts: (R-ops-1\.\w) /.exec(m.message)?.[1] ?? m.message);
  }
  const tpl = (attr: string): string => `import { html } from 'lit';\nexport const t = (v: string) => html\`${attr}\`;\n`;

  it('is scoped to the parts files of the Ops screen and declares five entries with distinct ids', async () => {
    const { OPS_PARTS_GLOB, opsPartsRestrictions } = await loadOps();
    expect(OPS_PARTS_GLOB).toBe('packages/*/src/elements/sk-ops-screen/*-parts.ts');
    const ids = opsPartsRestrictions.map((e) => /^ops-parts: (R-ops-1\.\w) /.exec(e.message)?.[1]);
    expect(ids).toEqual(['R-ops-1.a', 'R-ops-1.b', 'R-ops-1.c', 'R-ops-1.d', 'R-ops-1.e']);
  });

  it('refuses unsafeHTML and unsafeSVG, as an identifier and as an import', async () => {
    // an import specifier is two identifier nodes (imported and local), so the identifier entry fires twice beside the source entry
    expect((await lintParts("import { unsafeHTML } from 'lit/directives/unsafe-html.js';\n")).sort()).toEqual(['R-ops-1.a', 'R-ops-1.a', 'R-ops-1.b']);
    expect((await lintParts("import { unsafeSVG } from 'lit/directives/unsafe-svg.js';\n")).sort()).toEqual(['R-ops-1.a', 'R-ops-1.a', 'R-ops-1.b']);
    expect(await lintParts('export const x = (v: string) => unsafeHTML(v);\n')).toEqual(['R-ops-1.a']);
  });

  it('refuses innerHTML: a read, an assignment and a computed name', async () => {
    expect(await lintParts('export const r = (e: Element) => e.innerHTML;\n')).toEqual(['R-ops-1.c']);
    expect(await lintParts('export const w = (e: Element, v: string) => { e.innerHTML = v; };\n')).toEqual(['R-ops-1.c']);
    expect(await lintParts("export const w = (e: Element, v: string) => { e['innerHTML'] = v; };\n")).toEqual(['R-ops-1.d']);
  });

  it('refuses an attribute binding named href, src, srcset, action, formaction or xlink:href', async () => {
    const names = ['href', 'src', 'srcset', 'action', 'formaction', 'xlink:href'];
    let ran = 0;
    for (const name of names) {
      expect(await lintParts(tpl(`<sk-x ${name}=\${v}></sk-x>`)), name).toEqual(['R-ops-1.e']);
      expect(await lintParts(tpl(`<sk-x ${name}="\${v}"></sk-x>`)), `${name} quoted`).toEqual(['R-ops-1.e']);
      expect(await lintParts(tpl(`<sk-x ${name}="/p/\${v}"></sk-x>`)), `${name} concatenated`).toEqual(['R-ops-1.e']);
      expect(await lintParts(tpl(`<sk-x .${name}=\${v}></sk-x>`)), `${name} property`).toEqual(['R-ops-1.e']);
      expect(await lintParts(tpl(`<sk-x ?${name}=\${v}></sk-x>`)), `${name} boolean`).toEqual(['R-ops-1.e']);
      expect(await lintParts(tpl(`<sk-x ${name.toUpperCase()} = \${v}></sk-x>`)), `${name} upper case`).toEqual(['R-ops-1.e']);
      ran += 1;
    }
    expect(ran).toBe(6);
    // the svg tag is covered as the html tag is
    expect(await lintParts("import { svg } from 'lit';\nexport const t = (v: string) => svg`<use xlink:href=${v}></use>`;\n")).toEqual(['R-ops-1.e']);
  });

  it('keeps ordinary bindings, static values, look-alike names and plain words silent (positive controls above)', async () => {
    const silent = [
      tpl('<sk-x label=${v}></sk-x>'),
      tpl('<sk-x data-src=${v} data-href="${v}"></sk-x>'),
      tpl('<sk-x resrc=${v} hreflang=${v}></sk-x>'),
      tpl('<sk-x href="/static" title="${v}"></sk-x>'),
      tpl('<p>href = ${v}</p>'),
      tpl('<bdi>${v}</bdi>'),
      "export const href = 1;\nexport const src = (e: { src: string }) => e.src;\n",
      "export const f = (e: Element) => e.textContent;\n",
    ];
    let ran = 0;
    for (const code of silent) {
      expect(await lintParts(code), code).toEqual([]);
      ran += 1;
    }
    expect(ran).toBe(8);
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

// Aliasing lit's `css` hides the template from postcss-lit (and so from every Stylelint rule). The selector lives in
// eslint-rules/index.mjs and applies to every package source file; the plant in gates/plants/eslint proves it inside `pnpm lint`.
describe('css alias ban', () => {
  const RULES = new URL('../eslint-rules/index.mjs', import.meta.url).href;
  async function lintCss(code: string): Promise<string[]> {
    const { elementSyntaxRestrictions } = (await import(RULES)) as { elementSyntaxRestrictions: SelectorEntry[] };
    const config: Linter.Config[] = [
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser, sourceType: 'module' }, rules: { 'no-restricted-syntax': ['error', ...elementSyntaxRestrictions] } },
    ];
    const messages = new Linter({ configType: 'flat' }).verify(code, config, { filename: 'packages/sample/src/x.ts' });
    return messages.filter((m) => m.ruleId === 'no-restricted-syntax').map((m) => m.message);
  }

  it('refuses an aliased css import, from lit and from a lit subpath', async () => {
    const cases = ["import { css as styles } from 'lit';\n", "import { css as c, html } from 'lit';\n", "import { css as c } from 'lit/static-html.js';\n"];
    let ran = 0;
    for (const code of cases) {
      const messages = await lintCss(code);
      expect(messages.filter((m) => m.startsWith("Do not alias lit's css tag")).length, code).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('accepts the plain css import and an alias of another name (positive controls)', async () => {
    expect((await lintCss("import { css } from 'lit';\nexport const s = css`:host { display: block; }`;\n")).length).toBe(0);
    expect((await lintCss("import { LitElement as L } from 'lit';\nexport const x = L;\n")).length).toBe(0);
    expect((await lintCss("import { css as c } from './local.js';\nexport const x = c;\n")).length).toBe(0);
  });
});
