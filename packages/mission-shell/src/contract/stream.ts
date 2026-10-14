/**
 * The event-stream types of the mission-status contract, under shell-local names. The contract marks the stream schemas
 * as provisional, and the contract gate (C7) allows their identifiers only under `packages/<pkg>/src/contract/`, so this
 * module is the one place in the shell that names them. Everything else uses the aliases below.
 */
import type { components } from '@moes-media/mission-ui/src/contract/types.generated';

type Schemas = components['schemas'];

/** The contract schema `StatusTransitionEvent`: a work package moved from one status lane to another. */
export type StatusChangeEvent = Schemas['StatusTransitionEvent'];

/** The contract schema `MissionLifecycleEvent`: a lifecycle event of a mission. */
export type LifecycleEvent = Schemas['MissionLifecycleEvent'];

/** The contract schema `LogTruncatedEvent`: the event log was truncated or replaced. */
export type TruncationEvent = Schemas['LogTruncatedEvent'];
