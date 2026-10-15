// The MissionStatusClient port (WP05, FR-008, FR-009): the operation table covers exactly the contract's operations, the
// fixture adapter has exactly the table's methods, and the port's types hold the shape of contracts/client-port.md. The
// type tests are checked by `pnpm typecheck` (svelte-check over test/**); every `@ts-expect-error` has a positive twin.
import { beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import { page } from 'vitest/browser';
import routes from '../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import changes from '../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import type { components } from '@moes-media/mission-ui/src/contract/types.generated';
import {
  CHANGE_KINDS,
  CLIENT_OPERATIONS,
  CONNECTION_STATES,
  READ_OPS,
  type Change,
  type ConnectionState,
  type MissionStatusClient,
  type Params,
  type ReadOp,
  type Refusal,
  type Result,
  type SubscriptionScope,
} from '../src/client/port';
import { operationCoverage } from '../src/client/coverage';
import { createFixtureClient } from '../src/client/fixture';
import * as shell from '../src/index';
import * as testing from '../src/testing';

/** Two-way type equality: true only when A and B are the same type. */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

/** The operationIds of the contract, read from routes.json (the oracle; never from the port). */
const routeOperationIds = (): string[] => routes.map((route) => route.operationId);

beforeAll(async () => {
  await page.viewport(1024, 768);
});

describe('operation table against the contract routes', () => {
  it('covers exactly the operationIds of routes.json, naming any it lacks before anything else is checked (FR-009)', () => {
    const ids = routeOperationIds();
    // The named comparison comes first and no literal count precedes it, so a read added to routes.json fails here as
    // `coverage: missing operation <id>`, never as a bare count mismatch (CODE-TEST-002).
    const problems = operationCoverage(Object.values(CLIENT_OPERATIONS), ids);
    expect(problems, problems.join('\n')).toEqual([]);
    expect(ids.length).toBeGreaterThan(0);
    expect([...Object.values(CLIENT_OPERATIONS)].sort()).toEqual([...ids].sort());
    expect(Object.keys(CLIENT_OPERATIONS).length).toBe(ids.length);
  });

  it('the comparison helper names exactly a synthetic operation the table lacks', () => {
    const widened = [...routeOperationIds(), 'syntheticOperation'];
    expect(widened.length).toBe(routeOperationIds().length + 1);
    expect(operationCoverage(Object.values(CLIENT_OPERATIONS), widened)).toEqual(['coverage: missing operation syntheticOperation']);
  });

  it('the comparison helper names exactly a table entry the routes lack', () => {
    const narrowed = routeOperationIds().filter((id) => id !== 'getDriftReport');
    expect(narrowed.length).toBe(routeOperationIds().length - 1);
    expect(operationCoverage(Object.values(CLIENT_OPERATIONS), narrowed)).toEqual(['coverage: extra operation getDriftReport']);
  });

  it('the fixture adapter has exactly the methods of the table, plus connection', () => {
    const client = createFixtureClient();
    const methods = Object.keys(client).filter((key) => key !== 'connection');
    expect([...methods].sort()).toEqual([...Object.keys(CLIENT_OPERATIONS)].sort());
    expect(Object.keys(client)).toContain('connection');
  });
});

describe('read operations (SO-BND-006)', () => {
  it('are the table minus subscribe, derived and not repeated', () => {
    expect([...READ_OPS]).toEqual(Object.keys(CLIENT_OPERATIONS).filter((method) => method !== 'subscribe'));
    expect(READ_OPS.length).toBe(9);
    expect(READ_OPS.map((op) => CLIENT_OPERATIONS[op]).sort()).toEqual(
      routes.map((route) => route.operationId).filter((id) => id !== 'streamEvents').sort(),
    );
    // The hand-written ReadOp union is exactly the table without subscribe: a read in one and not the other fails here.
    const exact: Expect<Equal<Exclude<keyof typeof CLIENT_OPERATIONS, 'subscribe'>, ReadOp>> = true;
    expect(exact).toBe(true);
  });
});

describe('connection states', () => {
  it('are exactly the five strings: connecting before first contact, then the four of the spec', () => {
    expect(CONNECTION_STATES.length).toBe(5);
    expect([...CONNECTION_STATES]).toEqual(['connecting', 'connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch']);
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

describe('change kinds', () => {
  it('are exactly the three stream events, the refusal and the resync marker', () => {
    expect([...CHANGE_KINDS]).toEqual(['status-transition', 'mission-lifecycle', 'log-truncated', 'refused', 'resync']);
    const exact: Expect<Equal<Change['kind'], (typeof CHANGE_KINDS)[number]>> = true;
    // @ts-expect-error the kinds without the refusal are not every kind of Change
    const withoutRefusal: Expect<Equal<Exclude<Change['kind'], 'refused'>, (typeof CHANGE_KINDS)[number]>> = true;
    // @ts-expect-error the kinds without the resync marker are not every kind of Change
    const withoutResync: Expect<Equal<Exclude<Change['kind'], 'resync'>, (typeof CHANGE_KINDS)[number]>> = true;
    expect([exact, withoutRefusal, withoutResync]).toEqual([true, true, true]);
    // Every event the authored change sequence uses is a kind; the refusal and the resync marker are the kinds that are not events.
    const events = new Set(changes.items.map((item) => item.event));
    expect([...events].filter((event) => !(CHANGE_KINDS as readonly string[]).includes(event))).toEqual([]);
    expect(CHANGE_KINDS.filter((kind) => !events.has(kind))).toEqual(['refused', 'resync']);
  });
});

describe('stream refusals', () => {
  type Schemas = components['schemas'];

  it('are every problem+json refusal streamEvents declares, derived from the contract', () => {
    expectTypeOf<Refusal<'streamEvents'>>().not.toBeNever();
    expectTypeOf<Refusal<'streamEvents'>>().toEqualTypeOf<
      { status: number; body: Schemas['StreamRefusal'] } | { status: number; body: Schemas['Problem'] }
    >();
  });

  it('arrive as a change of kind refused, with a null cursor and the refusal of the contract', () => {
    type Refused = Extract<Change, { kind: 'refused' }>;
    expectTypeOf<Refused>().toEqualTypeOf<{ kind: 'refused'; cursor: null; refusal: Refusal<'streamEvents'> }>();
    const body: Schemas['StreamRefusal'] = {
      type: 'about:blank',
      title: 'The resume cursor was refused',
      status: 409,
      code: 'content_mismatch',
    };
    const refused: Change = { kind: 'refused', cursor: null, refusal: { status: 409, body } };
    // @ts-expect-error a refusal never carries a cursor
    const withCursor: Change = { kind: 'refused', cursor: '1:a', refusal: { status: 409, body } };
    // @ts-expect-error a refusal body without the Problem title is not a contract refusal
    const untitled: Change = { kind: 'refused', cursor: null, refusal: { status: 400, body: { status: 400, code: 'negative' } } };
    expect([refused.kind, withCursor.kind, untitled.kind]).toEqual(['refused', 'refused', 'refused']);
  });

  it('make a switch over the change kinds that forgets the refusal or the resync a type error', () => {
    const complete = (change: Change): string => {
      switch (change.kind) {
        case 'status-transition':
        case 'mission-lifecycle':
        case 'log-truncated':
          return change.kind;
        case 'refused':
          return String(change.refusal.status);
        case 'resync':
          return change.reason;
        default: {
          const unhandled: never = change;
          return unhandled;
        }
      }
    };
    const forgetful = (change: Change): string => {
      switch (change.kind) {
        case 'status-transition':
        case 'mission-lifecycle':
        case 'log-truncated':
        case 'resync':
          return change.kind;
        default: {
          // @ts-expect-error the refused kind is left over, so it is not never
          const unhandled: never = change;
          return unhandled;
        }
      }
    };
    const forgetsResync = (change: Change): string => {
      switch (change.kind) {
        case 'status-transition':
        case 'mission-lifecycle':
        case 'log-truncated':
          return change.kind;
        case 'refused':
          return String(change.refusal.status);
        default: {
          // @ts-expect-error the resync kind is left over, so it is not never
          const unhandled: never = change;
          return unhandled;
        }
      }
    };
    const change: Change = { kind: 'refused', cursor: null, refusal: { status: 404, body: { title: 'No such Mission', status: 404 } } };
    const resync: Change = { kind: 'resync', cursor: null, reason: 'reconnected' };
    expect([complete(change), forgetful(change), complete(resync), forgetsResync(resync)]).toEqual(['404', change, 'reconnected', resync]);
    // @ts-expect-error a resync never carries a cursor: it says "refetch everything", not "resume here"
    const withCursor: Change = { kind: 'resync', cursor: '1:a', reason: 'reconnected' };
    // @ts-expect-error the only reason is a reconnect
    const otherReason: Change = { kind: 'resync', cursor: null, reason: 'because' };
    expect([withCursor.kind, otherReason.kind]).toEqual(['resync', 'resync']);
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

  it('make a cursor without a missionId unrepresentable (CODE-BOUNDARY-002)', () => {
    const resumed: SubscriptionScope = { missionId: 'm', cursor: '1:a' };
    const scoped: SubscriptionScope = { missionId: 'm' };
    const unscoped: SubscriptionScope = {};
    // @ts-expect-error a cursor needs the Mission whose log it belongs to (the contract refuses it: cursor_without_mission)
    const orphan: SubscriptionScope = { cursor: '1:a' };
    // @ts-expect-error an explicit undefined missionId does not make a cursor valid either
    const undefinedMission: SubscriptionScope = { missionId: undefined, cursor: '1:a' };
    expect([resumed.cursor, scoped.missionId, unscoped.missionId, orphan.cursor, undefinedMission.cursor]).toEqual(['1:a', 'm', undefined, '1:a', '1:a']);
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

describe('package entries', () => {
  it('the main entry exposes the port only: no fixture adapter, no test hook (CODE-BOUNDARY-003)', () => {
    expect(Object.keys(shell)).not.toContain('createFixtureClient');
    expect(Object.keys(shell)).not.toContain('setConnectionState');
    expect(shell.CLIENT_OPERATIONS).toBe(CLIENT_OPERATIONS);
    expect(shell.CONNECTION_STATES).toBe(CONNECTION_STATES);
    expect(shell.CHANGE_KINDS).toBe(CHANGE_KINDS);
    expect([...Object.keys(shell)].sort()).toEqual(['CHANGE_KINDS', 'CLIENT_OPERATIONS', 'CONNECTION_STATES', 'READ_OPS', 'toStreamCursorString']);
  });

  it('the ./testing entry exposes the fixture adapter, and keeps the test hook private', () => {
    expect(testing.createFixtureClient).toBe(createFixtureClient);
    expect(Object.keys(testing)).not.toContain('setConnectionState');
    expect([...Object.keys(testing)].sort()).toEqual(['createFixtureClient']);
    // The option types travel with it (CODE-BOUNDARY-009): a typed options object built from the entry's own types.
    const scheduler: testing.Scheduler = { setTimeout: () => 0, clearTimeout: () => undefined };
    const options: testing.FixtureClientOptions = { scheduler, examples: { streamEvents: 'StreamRefusal.negative' } };
    expectTypeOf<testing.RouteEntry>().toHaveProperty('operationId');
    expectTypeOf<testing.ExampleTable>().not.toBeNever();
    expectTypeOf<testing.ChangesEnvelope>().toHaveProperty('items');
    expect(typeof testing.createFixtureClient(options).subscribe).toBe('function');
  });
});
