// createShellController (plan IC-03): the deep module that ties the core (routes, displayed sets, refresh policy, read
// scheduler) to one MissionStatusClient. It turns port results into each screen's properties and view state, holds the
// session state, runs the explicit refresh triggers and owns the connection presentation's logic. Plain TypeScript: no
// Svelte, no I/O. Time comes only from the injected scheduler and clock. Nothing of the controller's own is caught
// (NFR-007); only host calls are guarded, in host-seam.ts.
import type { Change, ConnectionState, MissionStatusClient } from '../client/port';
import type { DriftCopyResult, DriftFindingKey, OpsLoadMoreError } from '@moes-media/mission-ui';
import {
  createConnectionPresenter,
  type ConnectionPresenter,
  type ShellCopyOverrides,
} from '../core/connection';
import { displayedKeys, displayedSet, keyString, type ResourceKey } from '../core/displayed';
import { isStreamChange, refreshKeys } from '../core/refresh-policy';
import { appendFailure, applyResult, RESULT_RULES } from '../core/results';
import { formatRoute, parseRoute, type Destination, type ShellMode } from '../core/routes';
import {
  createConnectionGate,
  createReadScheduler,
  type ReadOutcome,
  type ReadResult,
  type ResourceSlot,
  type ShellScheduler,
} from '../core/scheduler';
import { copyViaHost, type ControllerHost } from './host-seam';
import { readKey } from './read-key';
import { buildSnapshot, type ShellSnapshot, type SlotRead } from './snapshot';

export type { ShellSnapshot } from './snapshot';

export interface ShellControllerOptions {
  /** One client per project; `null` has no subscription and no reads. */
  client: MissionStatusClient | null;
  host?: ControllerHost;
  mode: ShellMode;
  route?: string;
  /** Default: the global timers. */
  scheduler?: ShellScheduler;
  /** Default: the system clock. */
  clock?: () => Date;
  copy?: ShellCopyOverrides;
  /** Flushes the screen after a snapshot (T017). The view supplies Svelte's `tick`; the default resolves at once. */
  afterRender?: () => Promise<void>;
}

export interface ShellController {
  /** The current immutable view model. */
  snapshot(): ShellSnapshot;
  /** The Svelte store contract without importing Svelte: calls `run` at once, then on every change. */
  subscribe(run: (snapshot: ShellSnapshot) => void): () => void;
  navigate(destination: Destination): void;
  setRoute(route: string): void;
  /** A new client: releases the old subscription and listener, drops all state and starts the new client's gate. */
  setClient(client: MissionStatusClient | null, route?: string): void;
  destroy(): void;
  /** Re-reads the destination's own data (Artifact and Ops only). */
  refresh(): void;
  windowRefocused(): void;
  /** The single entry for the screens' intents; a pair it does not know does nothing. */
  intent(tag: string, event: string, detail?: unknown): Promise<void>;
  // The named commands the intent table calls.
  setQuery(query: string): void;
  setFilter(filter: string): void;
  selectFinding(finding: DriftFindingKey | null): void;
  toggleFolder(id: string, expanded: boolean): void;
  setDrawerOpen(open: boolean): void;
  setFlyoutOpen(open: boolean): void;
  retry(key: ResourceKey, cursor?: string): void;
  retryChrome(): void;
  loadMore(key: ResourceKey, cursor: string): void;
  rescan(missionId: string | null): void;
  copyCommand(text: string): Promise<void>;
}

const defaultScheduler: ShellScheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function field(detail: unknown, name: string): unknown {
  return typeof detail === 'object' && detail !== null && name in detail ? (detail as Record<string, unknown>)[name] : undefined;
}

function text(detail: unknown, name: string): string | undefined {
  const value = field(detail, name);
  return typeof value === 'string' ? value : undefined;
}

function driftScope(destination: Destination): string | null {
  return destination.screen === 'drift' ? (destination.missionId ?? '*') : null;
}

const MISSIONS_KEY: ResourceKey = { kind: 'missions' };
const OPS_KEY: ResourceKey = { kind: 'ops' };

export function createShellController(options: ShellControllerOptions): ShellController {
  const { mode } = options;
  const host: ControllerHost = options.host ?? {};
  const timers = options.scheduler ?? defaultScheduler;
  const clock = options.clock ?? ((): Date => new Date());
  const afterRender = options.afterRender ?? ((): Promise<void> => Promise.resolve());
  const overrides: ShellCopyOverrides = options.copy ?? {};

  // ---- per-controller state ----
  let client: MissionStatusClient | null = null;
  let destination: Destination = parseRoute(options.route ?? (options.client === null && mode === 'desktop' ? '/projects' : '/missions'), mode);
  let destroyed = false;
  let now: string | null = null;
  let copyResult: DriftCopyResult | null = null;
  let copyToken = 0;
  let rescanKey: string | null = null;
  const loadMoreErrors = new Map<string, OpsLoadMoreError>();
  const listeners = new Set<(snapshot: ShellSnapshot) => void>();

  // ---- session ----
  let query = '';
  let filter = '';
  let selected: { scope: string; finding: DriftFindingKey } | null = null;
  const expandedByMission = new Map<string, Record<string, boolean>>();
  let drawerOpen = false;
  let flyoutOpen = false;

  // ---- per-client state (FS2-01): the gate, the first-connected mark and the refused flag all reset in `attach` ----
  const gate = createConnectionGate('connecting');
  let presenter: ConnectionPresenter | null = null;
  let release: (() => void) | null = null;
  let epoch = 0;

  const scheduler = createReadScheduler({
    scheduler: timers,
    read: (key, cursor) => {
      if (client === null) throw new Error('shell controller: a read was issued without a client');
      return readKey(client, key, cursor);
    },
    apply,
    isOpen: () => client !== null && gate.isOpen(),
  });

  // ---- the snapshot ----
  const missionOf = (): string | undefined => ('missionId' in destination ? destination.missionId : undefined);

  function effective(key: ResourceKey): SlotRead {
    const slot = scheduler.slot(key);
    if (slot === undefined) return { value: undefined, view: 'loading', refusal: null };
    if (slot.value !== undefined) return { value: slot.value, view: slot.view, refusal: slot.refusal };
    const degraded = presenter?.state().startsWith('degraded') ?? false;
    const answered = slot.view !== 'idle' && !(slot.inFlight && degraded === false);
    // FS-05: while degraded, a slot without a value shows error even with a read in flight; an answered view stays.
    if (degraded) return { value: undefined, view: slot.view === 'idle' || slot.view === 'loading' ? 'error' : slot.view, refusal: slot.refusal };
    return { value: undefined, view: answered ? slot.view : 'loading', refusal: slot.refusal };
  }

  function build(): ShellSnapshot {
    const mission = missionOf();
    return buildSnapshot({
      mode,
      destination,
      read: effective,
      loadingMore: (key) => scheduler.loadingMore(key),
      loadMoreError: (key) => loadMoreErrors.get(keyString(key)) ?? null,
      rescanning: (key) => rescanKey === keyString(key),
      connectionState: client === null || presenter === null ? null : presenter.state(),
      condition: presenter?.condition() ?? null,
      refused: presenter?.refused() ?? false,
      copyOverrides: overrides,
      query,
      filter,
      selectedFinding: selected !== null && selected.scope === driftScope(destination) ? selected.finding : null,
      expanded: (mission === undefined ? undefined : expandedByMission.get(mission)) ?? {},
      drawerOpen,
      flyoutOpen,
      copyResult,
      now,
    });
  }

  function emit(): void {
    if (destroyed || listeners.size === 0) return;
    const current = build();
    for (const run of [...listeners]) run(current);
  }

  // ---- applying results ----
  function apply(slot: ResourceSlot, outcome: ReadOutcome): void {
    if (destroyed) return;
    now = clock().toISOString();
    const { key } = outcome;
    const id = keyString(key);
    switch (outcome.kind) {
      case 'result':
        Object.assign(slot, applyResult(slot, outcome.result, RESULT_RULES[key.kind]));
        break;
      case 'chain': {
        // Pages read so far when a later page failed (WP02): applied as they are.
        const result: ReadResult = { ok: true, value: outcome.pages };
        Object.assign(slot, applyResult(slot, result, RESULT_RULES[key.kind]));
        loadMoreErrors.delete(id);
        break;
      }
      case 'append':
        slot.value = [...(Array.isArray(slot.value) ? (slot.value as unknown[]) : []), outcome.value];
        slot.refusal = null;
        loadMoreErrors.delete(id);
        break;
      case 'append-failed': {
        if (key.kind !== 'missions' && key.kind !== 'ops') break;
        const outcomeOf = appendFailure(key.kind, outcome.result);
        if (outcomeOf.action === 'restart') scheduler.restartFromFirstPage(key);
        else if (outcomeOf.action === 'load-more-error') loadMoreErrors.set(id, outcomeOf.error);
        break;
      }
    }
    if (rescanKey === id) rescanKey = null;
    emit();
  }

  // ---- per-client wiring ----
  function detach(): void {
    epoch += 1;
    release?.();
    release = null;
    presenter?.dispose();
    presenter = null;
  }

  function attach(next: MissionStatusClient | null): void {
    client = next;
    if (next === null) {
      gate.reset('connecting');
      scheduler.setDisplayed(displayedKeys(destination));
      return;
    }
    const mine = epoch;
    const current = next.connection.state;
    presenter = createConnectionPresenter({ scheduler: timers, initial: current, onChange: emit });
    gate.reset(current);
    // A client that is already connected has had its first connected: the open gate issues the displayed set (a bypass,
    // never a resync).
    scheduler.setDisplayed(displayedKeys(destination));
    const unsubscribe = next.subscribe((change) => onChange(mine, change));
    const unwatch = next.connection.onChange((state) => onState(mine, state));
    release = (): void => {
      unsubscribe();
      unwatch();
    };
  }

  function onChange(mine: number, change: Change): void {
    if (destroyed || mine !== epoch) return;
    switch (change.kind) {
      case 'refused':
        presenter?.setRefused();
        return;
      case 'resync':
        scheduler.requestAll('resync');
        break;
      default:
        if (isStreamChange(change.kind)) for (const key of refreshKeys(change, displayedKeys(destination))) scheduler.request(key, 'stream');
    }
    emit();
  }

  function onState(mine: number, state: ConnectionState): void {
    if (destroyed || mine !== epoch) return;
    const observed = gate.observe(state);
    presenter?.setState(state);
    if (observed === 'first-connected') scheduler.requestAll('navigation');
    else if (observed === 'reconnected' && presenter?.refused() === true) scheduler.requestAll('resync');
    emit();
  }

  function resetSession(): void {
    query = '';
    filter = '';
    selected = null;
    expandedByMission.clear();
    drawerOpen = false;
    flyoutOpen = false;
    copyResult = null;
    copyToken += 1;
    rescanKey = null;
    loadMoreErrors.clear();
  }

  // ---- navigation ----
  function navigate(next: Destination): void {
    if (destroyed) return;
    const same = formatRoute(destination) === formatRoute(next);
    destination = next;
    copyToken += 1;
    copyResult = null;
    const scope = driftScope(next);
    if (scope !== null && selected !== null && selected.scope !== scope) selected = null;
    scheduler.setDisplayed(displayedKeys(next));
    // Re-selecting the current destination reads its own data fresh (US6-2).
    if (same) for (const key of displayedSet(next).explicit) scheduler.request(key, 'navigation');
    const shown = new Set(displayedKeys(next).map(keyString));
    for (const id of [...loadMoreErrors.keys()]) if (!shown.has(id)) loadMoreErrors.delete(id);
    if (rescanKey !== null && !shown.has(rescanKey)) rescanKey = null;
    emit();
  }

  function explicitRefresh(trigger: 'refresh' | 'refocus'): void {
    if (destroyed) return;
    if (destination.screen !== 'artifacts' && destination.screen !== 'ops') return;
    for (const key of displayedSet(destination).explicit) scheduler.request(key, trigger);
    emit();
  }

  // ---- commands ----
  function chromeKeys(): ResourceKey[] {
    switch (destination.screen) {
      case 'missions':
      case 'drift':
      case 'ops':
        return [{ kind: 'project' }];
      case 'pipeline':
      case 'work-packages':
      case 'artifacts':
        return [{ kind: 'mission', missionId: destination.missionId }];
      case 'projects':
        return [];
    }
  }

  async function copyCommand(value: string): Promise<void> {
    if (destroyed) return;
    const token = ++copyToken;
    copyResult = null;
    emit();
    await afterRender();
    const answer = await copyViaHost(host, value);
    // The destination changed while the host was copying: navigation reset copyResult; the late answer is not applied.
    if (destroyed || token !== copyToken) return;
    copyResult = answer;
    emit();
  }

  const retry = (key: ResourceKey, cursor?: string): void => {
    if (destroyed) return;
    scheduler.request(key, 'retry', cursor);
    emit();
  };

  const loadMore = (key: ResourceKey, cursor: string): void => {
    if (destroyed) return;
    loadMoreErrors.delete(keyString(key));
    scheduler.loadMore(key, cursor);
    emit();
  };

  const rescan = (missionId: string | null): void => {
    if (destroyed) return;
    const key: ResourceKey = missionId === null ? { kind: 'drift' } : { kind: 'drift', missionId };
    if (scheduler.slot(key) === undefined) return;
    rescanKey = keyString(key);
    scheduler.request(key, 'rescan');
    emit();
  };

  const mutate = (change: () => void): void => {
    if (destroyed) return;
    change();
    emit();
  };

  // ---- the intent dispatcher (WP04 and WP05 extend it) ----
  const go = (next: Destination): void => navigate(next);
  const sync: Record<string, (detail: unknown) => void> = {
    'sk-mission-shell sk-navigate': (d) => go(parseRoute((text(d, 'href') ?? '').replace(/^#/, ''), mode)),
    'sk-shell-nav-item sk-navigate': (d) => go(parseRoute((text(d, 'href') ?? '').replace(/^#/, ''), mode)),
    'sk-shell-tree sk-navigate': (d) => go(parseRoute((text(d, 'href') ?? '').replace(/^#/, ''), mode)),
    'sk-mission-shell sk-tree-toggle': (d) => controller.toggleFolder(text(d, 'id') ?? '', field(d, 'expanded') === true),
    'sk-shell-tree sk-tree-toggle': (d) => controller.toggleFolder(text(d, 'id') ?? '', field(d, 'expanded') === true),
    'sk-mission-shell sk-toggle-drawer': (d) => controller.setDrawerOpen(field(d, 'open') === true),
    'sk-mission-shell sk-toggle-flyout': (d) => controller.setFlyoutOpen(field(d, 'open') === true),
    'sk-mission-shell sk-shell-retry': () => controller.retryChrome(),
    'sk-missions-screen sk-open-mission': (d) => openMission(d),
    'sk-missions-screen sk-search': (d) => controller.setQuery(text(d, 'query') ?? ''),
    'sk-missions-screen sk-load-more': (d) => loadMore(MISSIONS_KEY, text(d, 'cursor') ?? ''),
    'sk-missions-screen sk-filter-change': (d) => controller.setFilter(text(d, 'filter') ?? ''),
    'sk-filter-toggle-group sk-filter-change': (d) => controller.setFilter(text(d, 'filter') ?? ''),
    'sk-pipeline-screen sk-open-missions': () => go({ screen: 'missions' }),
    'sk-pipeline-screen sk-view-artifacts': (d) => openArtifacts(d),
    'sk-pipeline-screen sk-select-work-package': (d) => openWorkPackage(d),
    'sk-work-package-board sk-select-work-package': (d) => openWorkPackage(d),
    'sk-work-package-screen sk-select-work-package': (d) => openWorkPackage(d),
    'sk-work-package-screen sk-open-mission': (d) => openMission(d),
    'sk-work-package-screen sk-open-artifact': (d) => openArtifact(d),
    'sk-work-package-screen sk-retry-load': (d) => retryWorkPackage(d),
    'sk-artifact-screen sk-select-artifact': (d) => openArtifact(d),
    'sk-artifact-screen sk-select-work-package': (d) => openWorkPackage(d),
    'sk-artifact-screen sk-open-mission': (d) => openMission(d),
    'sk-artifact-screen sk-retry-load': (d) => retryArtifact(d),
    'sk-drift-screen sk-select-finding': (d) => controller.selectFinding(findingOf(d)),
    'sk-drift-screen sk-rescan-drift': (d) => rescan(text(d, 'missionId') ?? null),
    'sk-drift-screen sk-open-mission': (d) => openMission(d),
    'sk-drift-screen sk-open-missions': () => go({ screen: 'missions' }),
    'sk-drift-screen sk-retry-load': (d) => retry(text(d, 'missionId') === undefined ? { kind: 'drift' } : { kind: 'drift', missionId: text(d, 'missionId') ?? '' }),
    'sk-ops-screen sk-load-more': (d) => loadMore(OPS_KEY, text(d, 'cursor') ?? ''),
    'sk-ops-screen sk-retry-load': (d) => retry(OPS_KEY, text(d, 'cursor')),
  };

  function openMission(d: unknown): void {
    const missionId = text(d, 'missionId');
    if (missionId !== undefined) go({ screen: 'pipeline', missionId });
  }
  function openArtifacts(d: unknown): void {
    const missionId = text(d, 'missionId');
    if (missionId !== undefined) go({ screen: 'artifacts', missionId });
  }
  function openArtifact(d: unknown): void {
    const missionId = text(d, 'missionId');
    const path = text(d, 'path');
    if (missionId !== undefined && path !== undefined) go({ screen: 'artifacts', missionId, path });
  }
  function openWorkPackage(d: unknown): void {
    const missionId = text(d, 'missionId');
    const wpId = text(d, 'wpId');
    if (missionId !== undefined && wpId !== undefined) go({ screen: 'work-packages', missionId, wpId });
  }
  function retryWorkPackage(d: unknown): void {
    const missionId = text(d, 'missionId');
    const wpId = text(d, 'wpId');
    if (missionId === undefined || wpId === undefined) return;
    const target = text(d, 'target');
    if (target === 'work-package') retry({ kind: 'wp', missionId, wpId });
    else if (target === 'detail') retry({ kind: 'wp-detail', missionId, wpId });
  }
  function retryArtifact(d: unknown): void {
    const missionId = text(d, 'missionId');
    if (missionId === undefined) return;
    const target = text(d, 'target');
    const path = text(d, 'path');
    if (target === 'content' && path !== undefined) retry({ kind: 'artifact', missionId, path });
    else if (target === 'listing') retry({ kind: 'artifacts', missionId });
  }
  function findingOf(d: unknown): DriftFindingKey | null {
    const missionId = text(d, 'missionId');
    const kind = text(d, 'kind');
    const artifactPath = text(d, 'artifactPath');
    return missionId === undefined || kind === undefined || artifactPath === undefined ? null : { missionId, kind, artifactPath };
  }

  const controller: ShellController = {
    snapshot: build,
    subscribe(run) {
      listeners.add(run);
      run(build());
      return () => {
        listeners.delete(run);
      };
    },
    navigate,
    setRoute: (route) => navigate(parseRoute(route, mode)),
    setClient(next, route) {
      if (destroyed) return;
      detach();
      scheduler.setDisplayed([]);
      resetSession();
      if (route !== undefined) destination = parseRoute(route, mode);
      attach(next);
      emit();
    },
    destroy() {
      if (destroyed) return;
      detach();
      scheduler.dispose();
      destroyed = true;
      listeners.clear();
    },
    refresh: () => explicitRefresh('refresh'),
    windowRefocused: () => explicitRefresh('refocus'),
    intent(tag, event, detail) {
      const handler = sync[`${tag} ${event}`];
      if (handler !== undefined) handler(detail);
      else if (tag === 'sk-drift-screen' && event === 'sk-copy-command') return copyCommand(text(detail, 'text') ?? '');
      return Promise.resolve();
    },
    setQuery: (value) => mutate(() => (query = value)),
    setFilter: (value) => mutate(() => (filter = value)),
    selectFinding(finding) {
      const scope = driftScope(destination);
      mutate(() => {
        selected = finding === null || scope === null ? null : { scope, finding };
      });
    },
    toggleFolder(id, expanded) {
      const mission = missionOf();
      if (mission === undefined) return;
      mutate(() => {
        expandedByMission.set(mission, { ...(expandedByMission.get(mission) ?? {}), [id]: expanded });
      });
    },
    setDrawerOpen: (open) => mutate(() => (drawerOpen = open)),
    setFlyoutOpen: (open) => mutate(() => (flyoutOpen = open)),
    retry,
    retryChrome() {
      if (destroyed) return;
      for (const key of chromeKeys()) {
        const view = effective(key).view;
        if (view === 'error' || view === 'not-found') scheduler.request(key, 'retry');
      }
      emit();
    },
    loadMore,
    rescan,
    copyCommand,
  };

  attach(options.client);
  return controller;
}
