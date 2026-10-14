// The MissionStatusClient port (WP05, FR-008, FR-009): the operation table covers exactly the contract's operations, the
// fixture adapter has exactly the table's methods, and the port's types hold the shape of contracts/client-port.md. The
// type tests are checked by `pnpm typecheck` (svelte-check over test/**); every `@ts-expect-error` has a positive twin.
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { page } from 'vitest/browser';
import routes from '../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import type { components } from '@moes-media/mission-ui/src/contract/types.generated';
import {
  CLIENT_OPERATIONS,
  CONNECTION_STATES,
  type ConnectionState,
  type MissionStatusClient,
  type Params,
  type Refusal,
  type Result,
} from '../src/client/port';
import { operationCoverage } from '../src/client/coverage';
import { createFixtureClient } from '../src/client/fixture';
import * as shell from '../src/index';

/** Two-way type equality: true only when A and B are the same type. */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

/** The operationIds of the contract, read from routes.json (the oracle; never from the port). */
const routeOperationIds = (): string[] => routes.map((route) => route.operationId);

beforeAll(async () => {
  await page.viewport(1024, 768);
});

describe('operation table against the contract routes', () => {
  it('covers exactly the ten operationIds of routes.json', () => {
    const ids = routeOperationIds();
    expect(ids.length).toBe(10);
    const problems = operationCoverage(Object.values(CLIENT_OPERATIONS), ids);
    expect(problems, problems.join('\n')).toEqual([]);
    expect([...Object.values(CLIENT_OPERATIONS)].sort()).toEqual([...ids].sort());
    expect(Object.keys(CLIENT_OPERATIONS).length).toBe(10);
  });

  it('the comparison helper names exactly a synthetic operation the table lacks', () => {
    const widened = [...routeOperationIds(), 'syntheticOperation'];
    expect(widened.length).toBe(11);
    expect(operationCoverage(Object.values(CLIENT_OPERATIONS), widened)).toEqual(['coverage: missing operation syntheticOperation']);
  });

  it('the comparison helper names exactly a table entry the routes lack', () => {
    const narrowed = routeOperationIds().filter((id) => id !== 'getDriftReport');
    expect(narrowed.length).toBe(9);
    expect(operationCoverage(Object.values(CLIENT_OPERATIONS), narrowed)).toEqual(['coverage: extra operation getDriftReport']);
  });

  it('the fixture adapter has exactly the methods of the table, plus connection', () => {
    const client = createFixtureClient();
    const methods = Object.keys(client).filter((key) => key !== 'connection');
    expect(methods.length).toBe(10);
    expect([...methods].sort()).toEqual([...Object.keys(CLIENT_OPERATIONS)].sort());
    expect(Object.keys(client)).toContain('connection');
  });
});

describe('connection states', () => {
  it('are exactly the four spec strings', () => {
    expect(CONNECTION_STATES.length).toBe(4);
    expect([...CONNECTION_STATES]).toEqual(['connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch']);
    const exact: Expect<Equal<ConnectionState, (typeof CONNECTION_STATES)[number]>> = true;
    // @ts-expect-error a widened union (a fifth value) is not equal to the runtime list
    const widened: Expect<Equal<ConnectionState | 'extra', (typeof CONNECTION_STATES)[number]>> = true;
    expect([exact, widened]).toEqual([true, true]);
  });

  it('spell the degraded states with a space after the colon', () => {
    const spaced: ConnectionState = 'degraded: service-missing';
    // @ts-expect-error no space after the colon is not a connection state
    const unspaced: ConnectionState = 'degraded:service-missing';
    expect([spaced, unspaced]).toEqual(['degraded: service-missing', 'degraded:service-missing']);
  });
});

describe('port types', () => {
  it('keep a required query parameter required', () => {
    const withPath: Params<'getArtifactContent'> = { path: { missionId: 'm' }, query: { path: 'spec.md' } };
    // @ts-expect-error getArtifactContent without query.path does not type-check
    const withoutPath: Params<'getArtifactContent'> = { path: { missionId: 'm' } };
    expect([withPath.query.path, withoutPath.path.missionId]).toEqual(['spec.md', 'm']);
  });

  it('declare problem+json refusals with a numeric status', () => {
    expectTypeOf<Refusal<'getArtifactContent'>>().not.toBeNever();
    expectTypeOf<Refusal<'getArtifactContent'>>().toEqualTypeOf<{ status: number; body: components['schemas']['ArtifactRefusal'] }>();
    expectTypeOf<Refusal<'getProject'>>().toBeNever();
  });

  it('carry the unavailable variant of Result', () => {
    const missing: Result<'getProject'> = { ok: false, unavailable: 'service-missing' };
    // @ts-expect-error offline is not an unavailable reason
    const offline: Result<'getProject'> = { ok: false, unavailable: 'offline' };
    expect([missing.ok, offline.ok]).toEqual([false, false]);
  });

  it('keep the refusal status inside the refusal', () => {
    const body: components['schemas']['ArtifactRefusal'] = {
      type: 'about:blank',
      title: 'The artifact was not found',
      status: 404,
      code: 'not_found',
      detail: 'No eligible artifact has this path in the Mission.',
    };
    const nested: Result<'getArtifactContent'> = { ok: false, refusal: { status: 404, body } };
    // @ts-expect-error a status at the top level drifts from the contract shape
    const topLevel: Result<'getArtifactContent'> = { ok: false, status: 404, refusal: { status: 404, body } };
    expect([nested.ok, topLevel.ok]).toEqual([false, false]);
  });

  it('tie the operation table to the interface', () => {
    type Table = { readonly [K in Exclude<keyof MissionStatusClient, 'connection'>]: string };
    const { getDriftReport, ...missingOne } = CLIENT_OPERATIONS;
    const complete: Table = CLIENT_OPERATIONS;
    // @ts-expect-error a table missing one method does not satisfy the interface's table type
    const incomplete: Table = missingOne;
    expect([getDriftReport, Object.keys(complete).length, Object.keys(incomplete).length]).toEqual(['getDriftReport', 10, 9]);
  });
});

describe('package entry', () => {
  it('exposes the port and the fixture adapter, and keeps the test hook private', () => {
    expect(typeof shell.createFixtureClient).toBe('function');
    expect(shell.CLIENT_OPERATIONS).toBe(CLIENT_OPERATIONS);
    expect(shell.CONNECTION_STATES).toBe(CONNECTION_STATES);
    expect(Object.keys(shell)).not.toContain('setConnectionState');
    expect([...Object.keys(shell)].sort()).toEqual(['CLIENT_OPERATIONS', 'CONNECTION_STATES', 'createFixtureClient']);
  });
});
