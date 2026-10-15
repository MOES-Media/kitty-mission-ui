/**
 * The event-stream types of the mission-status contract, under shell-local names. The contract marks the stream schemas
 * as provisional, and the contract gate (C7) allows their identifiers only under `packages/<pkg>/src/contract/`, so this
 * module is the one place in the shell that names them. Everything else uses the aliases below.
 */
import type { components, operations } from '@moes-media/mission-ui/src/contract/types.generated';

type Schemas = components['schemas'];

/** The contract schema `StatusTransitionEvent`: a work package moved from one status lane to another. */
export type StatusChangeEvent = Schemas['StatusTransitionEvent'];

/** The contract schema `MissionLifecycleEvent`: a lifecycle event of a mission. */
export type LifecycleEvent = Schemas['MissionLifecycleEvent'];

/** The contract schema `LogTruncatedEvent`: the event log was truncated or replaced. */
export type TruncationEvent = Schemas['LogTruncatedEvent'];

/** The contract schema `StreamCursor`: a position in one Mission's event log, as `{ offset, invariant }`. Named
 *  `StreamPosition` here so identifiers outside this directory never spell the provisional name (C7). */
export type StreamPosition = Schemas['StreamCursor'];

/**
 * The text form of a cursor (the contract's `StreamCursorString`): the offset, a colon and the invariant. It is the same
 * string as the SSE `id:` line, the `streamCursor` query parameter and the `Last-Event-ID` header, and so the value of
 * `Change.cursor` and of `SubscriptionScope.cursor`. The contract marks the form provisional (#5528); this function is the
 * one place the shell knows it, so adapters convert the `streamCursor` object of an event's data through it and nothing else.
 */
export function toStreamCursorString(cursor: StreamPosition): string {
  return `${cursor.offset}:${cursor.invariant}`;
}

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

/**
 * Type test: the query parameters of `streamEvents` are exactly `missionId` and `streamCursor`. `SubscriptionScope`
 * (port.ts) is written by hand over them: its `missionId` is the `missionId` parameter and its `cursor` is the
 * `streamCursor` parameter (the `Last-Event-ID` header carries the same text and is the adapter's business, not the
 * scope's). A parameter added to or renamed in the contract fails this line at `pnpm typecheck`, so the scope cannot drift
 * silently from the contract.
 */
export const streamQueryKeysPinned: Equal<keyof NonNullable<operations['streamEvents']['parameters']['query']>, 'missionId' | 'streamCursor'> = true;
