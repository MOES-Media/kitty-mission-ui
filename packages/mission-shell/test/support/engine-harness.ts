// A test-only engine: the core pieces the controller will compose (policy, scheduler, gate) behind one unscoped
// subscription. It never becomes shell code; WP03's createShellController replaces it.
import type { Change, MissionStatusClient } from '../../src/client/port';
import type { Destination } from '../../src/core/routes';
import { displayedKeys, type ResourceKey } from '../../src/core/displayed';
import { isStreamChange, refreshKeys } from '../../src/core/refresh-policy';
import {
  createConnectionGate,
  createReadScheduler,
  type ReadOutcome,
  type ReadResult,
  type ReadScheduler,
  type ResourceSlot,
  type ShellScheduler,
} from '../../src/core/scheduler';

/** The port call a key stands for; `cursor` is the page cursor of a chain's later pages. */
export function readKey(client: MissionStatusClient, key: ResourceKey, cursor?: string): Promise<ReadResult> {
  const page = cursor === undefined ? {} : { query: { pageCursor: cursor } };
  switch (key.kind) {
    case 'project':
      return client.getProject({});
    case 'missions':
    case 'mission-names':
      return client.listMissions(key.kind === 'missions' ? page : {});
    case 'mission':
      return client.getMission({ path: { missionId: key.missionId } });
    case 'wp':
      return client.getWorkPackage({ path: { missionId: key.missionId, wpId: key.wpId } });
    case 'wp-detail':
      return client.getWorkPackageDetail({ path: { missionId: key.missionId, wpId: key.wpId } });
    case 'artifacts':
      return client.listArtifacts({ path: { missionId: key.missionId } });
    case 'artifact':
      return client.getArtifactContent({ path: { missionId: key.missionId }, query: { path: key.path } });
    case 'drift':
      return client.getDriftReport(key.missionId === undefined ? {} : { query: { missionId: key.missionId } });
    case 'ops':
      return client.listOpsInvocations(page);
  }
}

/** The default `apply` of the harness: a success sets the value and `ready`; anything else sets `error`. */
export function defaultApply(slot: ResourceSlot, outcome: ReadOutcome): void {
  if (outcome.kind === 'result' && outcome.result.ok) {
    slot.value = outcome.result.value;
    slot.view = 'ready';
  } else if (outcome.kind === 'chain') {
    slot.value = outcome.pages;
    slot.view = 'ready';
  } else if (outcome.kind === 'append') {
    slot.value = [...(slot.value as unknown[]), outcome.value];
  } else {
    slot.view = 'error';
  }
}

export interface Engine {
  readonly scheduler: ReadScheduler;
  /** Every change the subscription delivered, in order. */
  readonly changes: Change[];
  navigate(destination: Destination): void;
  dispose(): void;
}

export interface EngineOptions {
  client: MissionStatusClient;
  destination: Destination;
  scheduler: ShellScheduler;
  apply?: (slot: ResourceSlot, outcome: ReadOutcome) => void;
}

export function mountEngine(options: EngineOptions): Engine {
  const { client } = options;
  let displayed: readonly ResourceKey[] = displayedKeys(options.destination);
  const gate = createConnectionGate(client.connection.state);
  const scheduler = createReadScheduler({
    scheduler: options.scheduler,
    read: (key, cursor) => readKey(client, key, cursor),
    apply: options.apply ?? defaultApply,
    isOpen: () => gate.isOpen(),
  });
  const changes: Change[] = [];

  gate.observe(client.connection.state);
  scheduler.setDisplayed(displayed);

  const unsubscribe = client.subscribe((change) => {
    changes.push(change);
    if (change.kind === 'refused') return;
    if (change.kind === 'resync') {
      scheduler.requestAll('resync');
      return;
    }
    if (!isStreamChange(change.kind)) return;
    for (const key of refreshKeys(change, displayed)) scheduler.request(key, 'stream');
  });
  const unwatch = client.connection.onChange((state) => {
    if (gate.observe(state) === 'first-connected') scheduler.requestAll('navigation');
  });

  return {
    scheduler,
    changes,
    navigate(destination) {
      displayed = displayedKeys(destination);
      scheduler.setDisplayed(displayed);
    },
    dispose() {
      unsubscribe();
      unwatch();
      scheduler.dispose();
    },
  };
}
