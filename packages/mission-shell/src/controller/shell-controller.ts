// createShellController (plan IC-03): the deep module that ties the core (routes, displayed sets, refresh policy, read
// scheduler) to one MissionStatusClient. It turns port results into each screen's properties and view state, holds the
// session state, runs the explicit refresh triggers and owns the connection presentation's logic. Plain TypeScript: no
// Svelte, no I/O. Time comes only from the injected scheduler and clock. Nothing of the controller's own is caught
// (NFR-007); only host calls are guarded, in core/host.ts.
import type { Change, ConnectionState, MissionStatusClient } from '../client/port';
import type { DriftCopyResult, DriftFindingKey, FolderEntry, OpsLoadMoreError } from '@moes-media/mission-ui';
import {
  createConnectionPresenter,
  type ConnectionPresenter,
  type ShellCopyOverrides,
} from '../core/connection';
import { displayedKeys, displayedSet, keyString, type ResourceKey } from '../core/displayed';
import { isStreamChange, refreshKeys } from '../core/refresh-policy';
import { appendFailure, applyResult, RESULT_RULES } from '../core/results';
import {
  safeCopyText,
  safeListFolders,
  safeListRecentProjects,
  safeOnWindowRefocus,
  safeOpenExternalLink,
  safeOpenProject,
  safeRouteChanged,
  type ShellHost,
} from '../core/host';
import { isAllowedExternalHref } from '../core/links';
import { formatRoute, isValidDestination, normaliseRoute, parseRoute, type Destination, type ShellMode } from '../core/routes';
import {
  createConnectionGate,
  createReadScheduler,
  type ReadOutcome,
  type ReadResult,
  type ResourceSlot,
  type ShellScheduler,
} from '../core/scheduler';
import { INTENT_TABLE } from '../intents/table';
import { readKey } from './read-key';
import { buildSnapshot, type PickerState, type ShellSnapshot, type SlotRead } from './snapshot';

export type { ShellSnapshot } from './snapshot';

export interface ShellControllerOptions {
  /** One client per project; `null` has no subscription and no reads. */
  client: MissionStatusClient | null;
  host?: ShellHost;
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

/**
 * The commands the intent table calls (plan IC-05). Each takes the event's detail as it arrived and reads it tolerantly, so a
 * malformed detail does nothing rather than throw; `mode` lets the table guard the dashboard (FR-015). Not part of the public
 * `ShellController`.
 */
export interface IntentCommands {
  readonly mode: ShellMode;
  navigateHref(detail: unknown): void;
  toggleFolder(detail: unknown): void;
  toggleDrawer(detail: unknown): void;
  toggleFlyout(detail: unknown): void;
  retryChrome(): void;
  openMission(detail: unknown): void;
  openMissions(): void;
  openArtifacts(detail: unknown): void;
  openArtifact(detail: unknown): void;
  openWorkPackage(detail: unknown): void;
  search(detail: unknown): void;
  filterChange(detail: unknown): void;
  loadMoreMissions(detail: unknown): void;
  loadMoreOps(detail: unknown): void;
  retryWorkPackage(detail: unknown): void;
  retryArtifact(detail: unknown): void;
  retryDrift(detail: unknown): void;
  retryOps(detail: unknown): void;
  selectFinding(detail: unknown): void;
  rescanDrift(detail: unknown): void;
  openLink(detail: unknown): void;
  copyCommand(detail: unknown): Promise<void>;
  openProject(detail: unknown): void;
  requestOpenProject(): Promise<void>;
  retryProjects(detail: unknown): Promise<void>;
  browseFolder(detail: unknown): Promise<void>;
  confirmOpenProject(detail: unknown): void;
  retryFolders(detail: unknown): Promise<void>;
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
  /** Replaces the host's banner copy overrides as a whole (not a merge); `{}` restores the defaults. Shown on the next render. */
  setCopy(copy: ShellCopyOverrides): void;
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
  // Desktop picker commands (FR-014); each ignores itself on a dashboard controller (no host call, no state change).
  openProject(key: string): void;
  requestOpenProject(): Promise<void>;
  retryProjects(): Promise<void>;
  browseFolder(location: string): Promise<void>;
  confirmOpenProject(location: string): void;
  retryFolders(): Promise<void>;
  openExternalLink(href: string): void;
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

/** The table read by run-time strings: any (tag, event) may be absent. */
type IntentHandler = (commands: IntentCommands, detail: unknown) => void | Promise<void>;
type IntentEntry = IntentHandler | { readonly via: string };
type IntentLookup = Readonly<Record<string, Readonly<Record<string, IntentEntry>>>>;

const table = INTENT_TABLE as unknown as IntentLookup;

function ownEntry(tag: string, event: string): IntentEntry | undefined {
  const events = Object.hasOwn(table, tag) ? table[tag] : undefined;
  return events !== undefined && Object.hasOwn(events, event) ? events[event] : undefined;
}

function resolveHandler(tag: string, event: string): IntentHandler | undefined {
  const entry = ownEntry(tag, event);
  if (typeof entry === 'function') return entry;
  if (typeof entry === 'object' && entry !== null && typeof entry.via === 'string') {
    const hosted = ownEntry(entry.via, event);
    return typeof hosted === 'function' ? hosted : undefined;
  }
  return undefined;
}

const CLOSED_DIALOG: PickerState['dialog'] = { open: false, location: '', folders: [], selected: null, status: 'ready' };
const FRESH_PICKER: PickerState = { status: 'loading', entries: [], dialog: CLOSED_DIALOG };

const MISSIONS_KEY: ResourceKey = { kind: 'missions' };
const OPS_KEY: ResourceKey = { kind: 'ops' };

/** The route a client gets when none is given: `/missions`, or `/projects` for a null client on the desktop. */
function defaultRouteOf(client: MissionStatusClient | null, mode: ShellMode): string {
  return client === null && mode === 'desktop' ? '/projects' : '/missions';
}

export function createShellController(options: ShellControllerOptions): ShellController {
  const { mode } = options;
  const defaultRoute = (forClient: MissionStatusClient | null): string => defaultRouteOf(forClient, mode);
  /** A null client on the desktop has one destination, the picker (data-model "Destination"). */
  const coerce = (requested: Destination, forClient: MissionStatusClient | null): Destination =>
    forClient === null && mode === 'desktop' && requested.screen !== 'projects' ? { screen: 'projects' } : requested;
  /** A route normalised and coerced for a client: `canonical` is false when what is shown differs from the input. */
  function reconcile(route: string, forClient: MissionStatusClient | null): { destination: Destination; route: string; canonical: boolean } {
    const destination = coerce(normaliseRoute(route, mode).destination, forClient);
    const canonicalRoute = formatRoute(destination);
    return { destination, route: canonicalRoute, canonical: canonicalRoute === route };
  }
  const host: ShellHost = options.host ?? {};
  const timers = options.scheduler ?? defaultScheduler;
  const clock = options.clock ?? ((): Date => new Date());
  const afterRender = options.afterRender ?? ((): Promise<void> => Promise.resolve());
  let overrides: ShellCopyOverrides = options.copy ?? {};

  // ---- per-controller state ----
  let client: MissionStatusClient | null = null;
  const initial = reconcile(options.route ?? defaultRoute(options.client), options.client);
  let destination: Destination = initial.destination;
  let destroyed = false;
  // The clock when the controller is created, and again whenever a port read or a host result is applied (CP-1 A4).
  let now: string | null = clock().toISOString();
  let copyResult: DriftCopyResult | null = null;
  let copyToken = 0;
  let rescanKey: string | null = null;
  const loadMoreErrors = new Map<string, OpsLoadMoreError>();
  // The desktop picker (session state, FR-014); each listing carries a counter so a stale answer is dropped.
  let picker: PickerState = FRESH_PICKER;
  let projectsSeq = 0;
  let foldersSeq = 0;
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
  let releaseRefocus: (() => void) | null = null;
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
    // A dashboard without a client has nothing to read: its project layout is the shell error (R-10).
    if (client === null && mode === 'dashboard') return { value: undefined, view: 'error', refusal: null };
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
      picker,
      noProject: client === null && mode === 'dashboard',
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
    releaseRefocus?.();
    releaseRefocus = null;
    presenter?.dispose();
    presenter = null;
  }

  function attach(next: MissionStatusClient | null): void {
    client = next;
    // Exactly one refocus registration per client. The listener is the shell's own: a throw inside it is a shell error.
    releaseRefocus = safeOnWindowRefocus(host, () => controller.windowRefocused());
    if (destination.screen === 'projects') void loadProjects();
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
    // drawerOpen and flyoutOpen are shell-wide, for the life of the mounted shell: a client swap keeps them (CP-1 A5).
    copyResult = null;
    copyToken += 1;
    rescanKey = null;
    loadMoreErrors.clear();
    leavePicker();
  }

  // ---- the desktop picker ----
  /** The one predicate behind FR-015: the picker and dialog commands act on the desktop only. */
  const pickerAllowed = mode === 'desktop';

  /** Drops any listing in flight and closes the dialog. */
  function leavePicker(): void {
    projectsSeq += 1;
    foldersSeq += 1;
    picker = FRESH_PICKER;
  }

  async function loadProjects(): Promise<void> {
    if (destroyed || !pickerAllowed) return;
    const seq = ++projectsSeq;
    picker = { ...picker, status: 'loading', entries: [] };
    emit();
    const answer = await safeListRecentProjects(host);
    if (destroyed || seq !== projectsSeq) return;
    now = clock().toISOString();
    picker = answer.ok
      ? { ...picker, status: answer.entries.length === 0 ? 'empty' : 'ready', entries: answer.entries }
      : { ...picker, status: 'error', entries: [] };
    emit();
  }

  async function listFolders(location: string, selected: string | null): Promise<void> {
    if (destroyed || !pickerAllowed) return;
    const seq = ++foldersSeq;
    picker = { ...picker, dialog: { ...picker.dialog, open: true, selected, status: 'loading' } };
    emit();
    const answer = await safeListFolders(host, location);
    if (destroyed || seq !== foldersSeq) return;
    now = clock().toISOString();
    const dialog = picker.dialog;
    const folders: readonly FolderEntry[] = answer.ok ? answer.folders : dialog.folders;
    picker = {
      ...picker,
      dialog: {
        ...dialog,
        location: answer.ok ? answer.location : dialog.location,
        folders,
        status: !answer.ok ? 'error' : answer.folders.length === 0 ? 'empty' : 'ready',
      },
    };
    emit();
  }

  const requestOpenProject = (): Promise<void> => {
    if (destroyed || !pickerAllowed) return Promise.resolve();
    picker = { ...picker, dialog: { open: true, location: '', folders: [], selected: null, status: 'loading' } };
    return listFolders('', null);
  };

  // ---- navigation ----
  /** Shows a destination: all the state work, and no `routeChanged`. */
  function show(requested: Destination): void {
    if (destroyed) return;
    // The picker does not exist on the dashboard: `/projects` is Missions there, as in parseRoute.
    const hosted: Destination = requested.screen === 'projects' && !pickerAllowed ? { screen: 'missions' } : requested;
    // A null client on the desktop shows the picker whatever is asked for (ARCH-001).
    const next = coerce(hosted, client);
    const same = formatRoute(destination) === formatRoute(next);
    destination = next;
    if (next.screen !== 'projects') leavePicker();
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
    if (next.screen === 'projects') void loadProjects();
    emit();
  }

  /** A navigation the shell makes itself: the state first, then `routeChanged` with the canonical route. */
  function navigate(next: Destination): void {
    if (destroyed) return;
    show(next);
    safeRouteChanged(host, formatRoute(destination));
  }

  /** A route the host set: normalised, and announced once only when it was not already canonical (no echo loop). */
  function applyHostRoute(route: string): void {
    if (destroyed) return;
    const normalised = normaliseRoute(route, mode);
    show(normalised.destination);
    // Announce what is shown when it is not the route given: a normalisation, or the null-client coercion.
    const shown = formatRoute(destination);
    if (!normalised.canonical || shown !== normalised.route) safeRouteChanged(host, shown);
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
    const answer = await safeCopyText(host, value);
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

  // ---- the intent commands (the table in ../intents/table.ts is the only dispatcher) ----
  // An intent's detail is untrusted: a destination whose ids miss their contract patterns is dropped silently, with no host
  // call, no read and no routeChanged (CON-002).
  const go = (next: Destination): void => {
    if (isValidDestination(next)) navigate(next);
  };
  const hrefDestination = (d: unknown): Destination => parseRoute((text(d, 'href') ?? '').replace(/^#/, ''), mode);

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
  function retryDrift(d: unknown): void {
    const missionId = text(d, 'missionId');
    const key: ResourceKey = missionId === undefined ? { kind: 'drift' } : { kind: 'drift', missionId };
    if (isValidDestination({ screen: 'drift', ...(missionId === undefined ? {} : { missionId }) })) retry(key);
  }
  function retryWorkPackage(d: unknown): void {
    const missionId = text(d, 'missionId');
    const wpId = text(d, 'wpId');
    if (missionId === undefined || wpId === undefined) return;
    if (!isValidDestination({ screen: 'work-packages', missionId, wpId })) return;
    const target = text(d, 'target');
    if (target === 'work-package') retry({ kind: 'wp', missionId, wpId });
    else if (target === 'detail') retry({ kind: 'wp-detail', missionId, wpId });
  }
  function retryArtifact(d: unknown): void {
    const missionId = text(d, 'missionId');
    if (missionId === undefined) return;
    const target = text(d, 'target');
    const path = text(d, 'path');
    if (!isValidDestination({ screen: 'artifacts', missionId, ...(path === undefined ? {} : { path }) })) return;
    if (target === 'content' && path !== undefined) retry({ kind: 'artifact', missionId, path });
    else if (target === 'listing') retry({ kind: 'artifacts', missionId });
  }
  function findingOf(d: unknown): DriftFindingKey | null {
    const missionId = text(d, 'missionId');
    const kind = text(d, 'kind');
    const artifactPath = text(d, 'artifactPath');
    return missionId === undefined || kind === undefined || artifactPath === undefined ? null : { missionId, kind, artifactPath };
  }

  const intentCommands: IntentCommands = {
    mode,
    navigateHref: (d) => go(hrefDestination(d)),
    toggleFolder: (d) => controller.toggleFolder(text(d, 'id') ?? '', field(d, 'expanded') === true),
    toggleDrawer: (d) => controller.setDrawerOpen(field(d, 'open') === true),
    toggleFlyout: (d) => controller.setFlyoutOpen(field(d, 'open') === true),
    retryChrome: () => controller.retryChrome(),
    openMission,
    openMissions: () => go({ screen: 'missions' }),
    openArtifacts,
    openArtifact,
    openWorkPackage,
    search: (d) => controller.setQuery(text(d, 'query') ?? ''),
    filterChange: (d) => controller.setFilter(text(d, 'filter') ?? ''),
    loadMoreMissions: (d) => loadMore(MISSIONS_KEY, text(d, 'cursor') ?? ''),
    loadMoreOps: (d) => loadMore(OPS_KEY, text(d, 'cursor') ?? ''),
    retryWorkPackage,
    retryArtifact,
    retryDrift,
    retryOps: (d) => retry(OPS_KEY, text(d, 'cursor')),
    selectFinding: (d) => controller.selectFinding(findingOf(d)),
    rescanDrift: (d) => rescan(text(d, 'missionId') ?? null),
    openLink: (d) => controller.openExternalLink(text(d, 'href') ?? ''),
    copyCommand: (d) => copyCommand(text(d, 'text') ?? ''),
    openProject: (d) => controller.openProject(text(d, 'key') ?? ''),
    requestOpenProject,
    retryProjects: (d) => (['projects', 'project'].includes(text(d, 'target') ?? '') ? loadProjects() : Promise.resolve()),
    browseFolder: (d) => controller.browseFolder(text(d, 'location') ?? ''),
    confirmOpenProject: (d) => controller.confirmOpenProject(text(d, 'location') ?? ''),
    retryFolders: (d) => (text(d, 'target') === 'folders' ? controller.retryFolders() : Promise.resolve()),
  };

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
    setRoute: applyHostRoute,
    setClient(next, route) {
      if (destroyed) return;
      detach();
      scheduler.setDisplayed([]);
      resetSession();
      // No route: the default of (client, mode), never the old client's destination (ARCH-001a).
      const previous = formatRoute(destination);
      const target = reconcile(route ?? defaultRoute(next), next);
      destination = target.destination;
      attach(next);
      emit();
      // A given route is announced when it was not canonical; a defaulted one when it moves the host's screen.
      if (route === undefined ? target.route !== previous : !target.canonical) safeRouteChanged(host, target.route);
    },
    setCopy(copy) {
      mutate(() => {
        overrides = copy;
      });
    },
    destroy() {
      if (destroyed) return;
      detach();
      scheduler.dispose();
      destroyed = true;
      listeners.clear();
    },
    refresh() {
      explicitRefresh('refresh');
      // The Refresh flow counts as a navigation the shell made itself (R-02).
      if (!destroyed && (destination.screen === 'artifacts' || destination.screen === 'ops')) safeRouteChanged(host, formatRoute(destination));
    },
    windowRefocused: () => explicitRefresh('refocus'),
    intent(tag, event, detail) {
      // Own properties only: a name inherited from Object.prototype is no pair. One hop at most: a nested element's `via`
      // names the hosting element whose entry handles the same event.
      const handler = resolveHandler(tag, event);
      return handler === undefined ? Promise.resolve() : Promise.resolve(handler(intentCommands, detail));
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
    openProject(key) {
      if (destroyed || !pickerAllowed) return;
      safeOpenProject(host, { key });
    },
    requestOpenProject,
    retryProjects: loadProjects,
    browseFolder: (location) => listFolders(location, location),
    confirmOpenProject(location) {
      if (destroyed || !pickerAllowed) return;
      safeOpenProject(host, { location });
    },
    retryFolders: () => listFolders(picker.dialog.location, picker.dialog.selected),
    openExternalLink(href) {
      if (!destroyed && isAllowedExternalHref(href)) safeOpenExternalLink(host, href);
    },
  };

  attach(options.client);
  if (options.route !== undefined && !initial.canonical) safeRouteChanged(host, initial.route);
  return controller;
}
