// The story-local client (contracts/stories.md "Story data"; research R-08). Reads delegate to the fixture adapter and are
// tracked, so a story "with data" can switch to its connection state only after the screens have filled. The port stays
// frozen: this module adds nothing to it and never uses the fixture's connection-state test hook.
import type { ConnectionState, MissionStatusClient, Ok, Result } from '../index';
import { createFixtureClient, type FixtureClientOptions } from '../testing';
import { immediateScheduler, STORY_ARTIFACT_PATH, STORY_MISSION_ID } from './story-support';

export interface StoryClientOptions {
  /** The connection state the story is about. */
  state: ConnectionState;
  /** Report `connected` first and switch to `state` once every read has settled (a story with data). */
  startConnected?: boolean;
  /** Example selection, passed to the fixture client (the refused story selects the stream refusal). */
  examples?: FixtureClientOptions['examples'];
}

export type StoryClient = MissionStatusClient & { whenSettled(): Promise<void> };

/**
 * Points an artifact read at the story's Mission and artifact. The shipped listing names another Mission than the default
 * Mission detail, and the Artifact screen shows `loading` for a listing that does not belong to its Mission, so the
 * unmodified examples could never fill that screen. The fixture adapter ignores request parameters, so the story does it.
 */
function retarget<Op extends 'listArtifacts' | 'getArtifactContent'>(result: Result<Op>, change: Partial<Ok<Op>>): Result<Op> {
  return result.ok ? { ok: true, value: { ...result.value, ...change } } : result;
}

export function storyClient({ state, startConnected = false, examples }: StoryClientOptions): StoryClient {
  // No change replays during a story: the sequence is empty (R2-12), under the id of the fixture's own sequence.
  const base = createFixtureClient({
    ...(examples === undefined ? {} : { examples }),
    fixtures: { changes: { missionId: STORY_MISSION_ID, items: [] } },
    scheduler: immediateScheduler(),
  });

  const pending = new Set<Promise<unknown>>();
  const listeners = new Set<(next: ConnectionState) => void>();
  let current: ConnectionState = startConnected ? 'connected' : state;
  let switched = !startConnected;
  const waiters: (() => void)[] = [];

  const settleCheck = (): void => {
    // Re-check on the microtask: a read that settled may have chained another (a page chain) in between.
    void Promise.resolve().then(() => {
      if (pending.size > 0) return;
      for (const resolve of waiters.splice(0)) resolve();
      if (switched) return;
      switched = true;
      if (current === state || listeners.size === 0) {
        current = state;
        return;
      }
      current = state;
      for (const listener of [...listeners]) listener(state);
    });
  };

  const track = <T>(promise: Promise<T>): Promise<T> => {
    pending.add(promise);
    const done = (): void => {
      pending.delete(promise);
      if (pending.size === 0) settleCheck();
    };
    promise.then(done, done);
    return promise;
  };

  // Each of the nine reads is wrapped; `satisfies` makes a missing or extra port method a type error.
  const client = {
    getProject: (params) => track(base.getProject(params)),
    listMissions: (params) => track(base.listMissions(params)),
    getMission: (params) => track(base.getMission(params)),
    getWorkPackage: (params) => track(base.getWorkPackage(params)),
    getWorkPackageDetail: (params) => track(base.getWorkPackageDetail(params)),
    listArtifacts: (params) => track(base.listArtifacts(params).then((result) => retarget(result, { missionId: STORY_MISSION_ID }))),
    getArtifactContent: (params) => track(base.getArtifactContent(params).then((result) => retarget(result, { path: STORY_ARTIFACT_PATH }))),
    getDriftReport: (params) => track(base.getDriftReport(params)),
    listOpsInvocations: (params) => track(base.listOpsInvocations(params)),
    subscribe: (listener, scope) => base.subscribe(listener, scope),
    connection: {
      get state(): ConnectionState {
        return current;
      },
      onChange(listener: (next: ConnectionState) => void): () => void {
        listeners.add(listener);
        // The shell subscribes as it mounts and issues its first reads in the same step; look once after that.
        if (startConnected && !switched) settleCheck();
        return () => {
          listeners.delete(listener);
        };
      },
    },
    whenSettled(): Promise<void> {
      return new Promise((resolve) => {
        waiters.push(resolve);
        settleCheck();
      });
    },
  } satisfies StoryClient;
  return client;
}
