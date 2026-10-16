import { describe, expect, it } from 'vitest';
import examplesJson from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import routesJson from '../../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import { createFixtureClient, type ExampleTable } from '../../src/client/fixture';
import type { ReadOp } from '../../src/client/port';
import { appendFailure, applyResult, RESULT_RULES, type AppliedSlot } from '../../src/core/results';
import type { FailedResult, ReadResult } from '../../src/core/scheduler';
import type { ResourceKey } from '../../src/core/displayed';

type Kind = ResourceKey['kind'];

const EMPTY: AppliedSlot = { value: undefined, view: 'idle', refusal: null };
const examples = examplesJson as unknown as ExampleTable;

/** No vendored example has schema Problem (R-06): injected through fixtures.examples, an additive use of the option. */
const PROBLEM = 'Problem.test-not-found';
const withProblem: ExampleTable = {
  ...examples,
  [PROBLEM]: { schema: 'Problem', value: { type: 'about:blank', title: 'Not found', status: 404, code: 'not_found' } },
};

/** The literal of research R-06's refusal table: [operation, schema, statuses]. */
const R06: readonly (readonly [ReadOp, string, readonly number[]])[] = [
  ['getArtifactContent', 'ArtifactRefusal', [400, 404, 413, 415, 422, 500]],
  ['getDriftReport', 'DriftRefusal', [404, 500]],
  ['getMission', 'Problem', [404]],
  ['getWorkPackage', 'Problem', [404]],
  ['getWorkPackageDetail', 'WorkPackageDetailRefusal', [404, 500]],
  ['listArtifacts', 'ArtifactRefusal', [404, 500]],
  ['listMissions', 'PageCursorRefusal', [400]],
  ['listOpsInvocations', 'OpsRefusal', [500]],
  ['listOpsInvocations', 'PageCursorRefusal', [400]],
];
const R06_PAIRS = 6 + 2 + 1 + 1 + 2 + 2 + 1 + 1 + 1;

const KIND_OF: Partial<Record<ReadOp, Kind>> = {
  getArtifactContent: 'artifact',
  getDriftReport: 'drift',
  getMission: 'mission',
  getWorkPackage: 'wp',
  getWorkPackageDetail: 'wp-detail',
  listArtifacts: 'artifacts',
  listMissions: 'missions',
  listOpsInvocations: 'ops',
};

/** The oracle, written out: the content viewer has no not-found word, the others say not-found for a 404. */
function expectedWord(kind: Kind, status: number): string {
  if (kind === 'artifact') return 'refused';
  if (kind === 'missions' || kind === 'ops') return 'error';
  return status === 404 ? 'not-found' : 'error';
}

interface RoutesEntry {
  operationId: string;
  refusals: Record<string, number[]>;
}
const routes = routesJson as unknown as RoutesEntry[];

function exampleKey(schema: string, status: number): string {
  if (schema === 'Problem') return PROBLEM;
  const found = Object.entries(examples).find(([, example]) => example.schema === schema && (example.value as { status?: number }).status === status);
  if (!found) throw new Error(`no example for ${schema} ${status}`);
  return found[0];
}

async function refusalOf(op: ReadOp, schema: string, status: number): Promise<ReadResult> {
  const client = createFixtureClient({ fixtures: { examples: withProblem }, examples: { [op]: exampleKey(schema, status) } });
  const calls: Record<ReadOp, () => Promise<ReadResult>> = {
    getProject: () => client.getProject({}),
    listMissions: () => client.listMissions({}),
    getMission: () => client.getMission({ path: { missionId: 'x' } } as never),
    getWorkPackage: () => client.getWorkPackage({ path: { missionId: 'x', wpId: 'WP01' } } as never),
    getWorkPackageDetail: () => client.getWorkPackageDetail({ path: { missionId: 'x', wpId: 'WP01' } } as never),
    listArtifacts: () => client.listArtifacts({ path: { missionId: 'x' } } as never),
    getArtifactContent: () => client.getArtifactContent({ path: { missionId: 'x' }, query: { path: 'a.md' } } as never),
    getDriftReport: () => client.getDriftReport({}),
    listOpsInvocations: () => client.listOpsInvocations({}),
  };
  return calls[op]();
}

describe('applyResult: every refusal of research R-06', () => {
  it('counts the (operation, refusal) pairs from routes.json and compares them with the R-06 literal', () => {
    const pairs = routes
      .filter((route) => route.operationId !== 'streamEvents')
      .flatMap((route) => Object.entries(route.refusals).flatMap(([schema, statuses]) => statuses.map((status) => [route.operationId, schema, status] as const)));
    expect(pairs.length).toBe(R06_PAIRS);
    expect(R06.flatMap(([, , statuses]) => statuses).length).toBe(R06_PAIRS);
    const literal = R06.flatMap(([op, schema, statuses]) => statuses.map((status) => `${op} ${schema} ${status}`)).sort();
    expect(pairs.map(([op, schema, status]) => `${op} ${schema} ${status}`).sort()).toEqual(literal);
  });

  it('applies each refusal, with and without a value, to the word its screen declares', async () => {
    let ran = 0;
    const pairs = routes
      .filter((route) => route.operationId !== 'streamEvents')
      .flatMap((route) => Object.entries(route.refusals).flatMap(([schema, statuses]) => statuses.map((status) => ({ op: route.operationId as ReadOp, schema, status }))));
    for (const { op, schema, status } of pairs) {
      const kind = KIND_OF[op];
      if (!kind) throw new Error(`no kind for ${op}`);
      const result = await refusalOf(op, schema, status);
      expect(result.ok, `${op} ${schema} ${status} is a refusal`).toBe(false);
      const word = expectedWord(kind, status);
      const without = applyResult(EMPTY, result, RESULT_RULES[kind]);
      expect(without.view, `${op} ${schema} ${status} without a value`).toBe(word);
      expect(without.refusal).toBe((result as { refusal: unknown }).refusal);
      const value = { held: true };
      const withValue = applyResult({ value, view: 'ready', refusal: null }, result, RESULT_RULES[kind]);
      expect(withValue.view, `${op} ${schema} ${status} with a value`).toBe(word);
      expect(withValue.refusal).toBe((result as { refusal: unknown }).refusal);
      ran += 1;
    }
    expect(ran).toBe(R06_PAIRS);
  });

  it('getProject has no refusal in routes.json', () => {
    expect(routes.find((route) => route.operationId === 'getProject')?.refusals).toEqual({});
  });
});

describe('applyResult: success', () => {
  it('passes the value through unchanged (identity) and marks it ready', () => {
    const value = { name: 'p' };
    const next = applyResult(EMPTY, { ok: true, value }, RESULT_RULES.project);
    expect(next.value).toBe(value);
    expect(next.view).toBe('ready');
    expect(next.refusal).toBeNull();
  });

  it('clears an earlier refusal on success', () => {
    const next = applyResult({ value: undefined, view: 'error', refusal: { status: 500 } }, { ok: true, value: {} }, RESULT_RULES.project);
    expect(next.view).toBe('ready');
    expect(next.refusal).toBeNull();
  });

  const pages = (items: unknown[]): unknown[] => [{ items, pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 } }];

  it('is empty exactly where a screen defines empty: Missions, Ops and Drift (with a non-empty control each)', () => {
    const words = (kind: Kind, value: unknown): string => applyResult(EMPTY, { ok: true, value }, RESULT_RULES[kind]).view;
    expect(words('missions', pages([]))).toBe('empty');
    expect(words('missions', pages([{}]))).toBe('ready');
    expect(words('ops', pages([]))).toBe('empty');
    expect(words('ops', pages([{}]))).toBe('ready');
    expect(words('drift', { findings: [], truncated: false })).toBe('empty');
    expect(words('drift', { findings: [{}], truncated: false })).toBe('ready');
    // No other kind has empty, even for an empty-looking value.
    expect(words('artifacts', { entries: [], truncated: false })).toBe('ready');
    expect(words('mission-names', pages([]))).toBe('ready');
    expect(words('project', {})).toBe('ready');
    expect(words('artifact', { content: '' })).toBe('ready');
  });

  it('the empty rule looks at page 1 only', () => {
    const page = (n: number): unknown => ({ items: Array.from({ length: n }, () => ({})), pageInfo: {} });
    expect(applyResult(EMPTY, { ok: true, value: [page(0), page(2)] }, RESULT_RULES.missions).view).toBe('empty');
    expect(applyResult(EMPTY, { ok: true, value: [page(1), page(0)] }, RESULT_RULES.missions).view).toBe('ready');
  });

  it('applies the fixture examples by their kind', async () => {
    const client = createFixtureClient();
    const drift = await client.getDriftReport({});
    const clean = createFixtureClient({ examples: { getDriftReport: 'DriftReport.clean' } });
    expect(applyResult(EMPTY, drift, RESULT_RULES.drift).view).toBe('ready');
    expect(applyResult(EMPTY, await clean.getDriftReport({}), RESULT_RULES.drift).view).toBe('empty');
  });
});

describe('applyResult: unavailable (decision 01M50K4DBT2VCW6DD4JQAGEMB4, FR-005 amendment)', () => {
  const unavailable: ReadResult = { ok: false, unavailable: 'transport' };

  it('keeps value and view on a slot with a value; a refusal on the same slot changes it', () => {
    const value = { held: true };
    const slot: AppliedSlot = { value, view: 'ready', refusal: null };
    const kept = applyResult(slot, unavailable, RESULT_RULES.mission);
    expect(kept.value).toBe(value);
    expect(kept.view).toBe('ready');
    const changed = applyResult(slot, { ok: false, refusal: { status: 500, body: {} } }, RESULT_RULES.mission);
    expect(changed.view).toBe('error');
  });

  it('keeps an empty view with its value', () => {
    const value = [{ items: [], pageInfo: {} }];
    const kept = applyResult({ value, view: 'empty', refusal: null }, unavailable, RESULT_RULES.missions);
    expect(kept.view).toBe('empty');
    expect(kept.value).toBe(value);
  });

  it('is error on a slot without a value, for every kind', () => {
    for (const kind of Object.keys(RESULT_RULES) as Kind[]) {
      expect(applyResult(EMPTY, unavailable, RESULT_RULES[kind]).view, kind).toBe('error');
    }
    expect(Object.keys(RESULT_RULES).length).toBe(10);
  });

  it('the three unavailable reasons behave alike', () => {
    for (const reason of ['service-missing', 'contract-mismatch', 'transport'] as const) {
      const kept = applyResult({ value: 1, view: 'ready', refusal: null }, { ok: false, unavailable: reason }, RESULT_RULES.ops);
      expect(kept.view).toBe('ready');
    }
  });
});

describe('appendFailure (refused load-more cursor, Ops loadMoreError)', () => {
  const refusal = (status: number, code?: string): FailedResult => ({ ok: false, refusal: { status, body: code === undefined ? {} : { code } } });

  it('restarts from page 1 on a 400 page-cursor refusal, for both lists', () => {
    expect(appendFailure('missions', refusal(400, 'invalid_page_cursor'))).toEqual({ action: 'restart' });
    expect(appendFailure('ops', refusal(400, 'invalid_page_cursor'))).toEqual({ action: 'restart' });
  });

  it('sets loadMoreError on Ops for unavailable and for any other refusal, and keeps the items', () => {
    expect(appendFailure('ops', { ok: false, unavailable: 'transport' })).toEqual({ action: 'load-more-error', error: { code: null } });
    expect(appendFailure('ops', refusal(500, 'ops_unreadable'))).toEqual({ action: 'load-more-error', error: { code: 'ops_unreadable' } });
    expect(appendFailure('ops', refusal(500))).toEqual({ action: 'load-more-error', error: { code: null } });
  });

  it('keeps the Missions items without an error word (the screen has no loadMoreError)', () => {
    expect(appendFailure('missions', { ok: false, unavailable: 'transport' })).toEqual({ action: 'keep' });
    expect(appendFailure('missions', refusal(500, 'x'))).toEqual({ action: 'keep' });
  });
});
