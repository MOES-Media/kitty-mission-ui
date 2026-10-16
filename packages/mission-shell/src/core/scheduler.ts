// The read scheduler of plan IC-02 (data-model "Read scheduling"): one controller-wide generation counter, 100 ms
// coalescing of stream requests, bypass triggers, stale-while-revalidate, page chains and load-more, plus the per-client
// connection gate. I/O-free: time comes only from the injected `ShellScheduler`, reads from the injected `read`, and a
// result goes to the injected `apply`. Nothing here catches an error: a programming error surfaces (NFR-007).
import type { ConnectionState } from '../client/port';
import { keyString, type ResourceKey } from './displayed';

/** The timer pair the shell schedules with; structurally identical to the fixture's `Scheduler` (R4-08). */
export interface ShellScheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** The coalescing window of stream requests. */
export const COALESCE_WINDOW_MS = 100;

/** Why a read is requested. Only `stream` coalesces; the others are bypass reads. */
export type Trigger = 'stream' | 'navigation' | 'resync' | 'refresh' | 'refocus' | 'retry' | 'rescan';
export type BypassTrigger = Exclude<Trigger, 'stream'>;

/** What a read of the port resolves to (a supertype of `Result<Op>`, so any read fits). */
export type ReadResult =
  | { ok: true; value: unknown }
  | { ok: false; refusal: unknown }
  | { ok: false; unavailable: 'service-missing' | 'contract-mismatch' | 'transport' };
export type FailedResult = Extract<ReadResult, { ok: false }>;

/** What `apply` receives. A chain key (`missions`, `ops`) settles as `chain`, or as `result` when page 1 itself failed. */
export type ReadOutcome =
  | { kind: 'result'; key: ResourceKey; result: ReadResult }
  | { kind: 'chain'; key: ResourceKey; pages: unknown[]; failed?: FailedResult }
  | { kind: 'append'; key: ResourceKey; value: unknown }
  | { kind: 'append-failed'; key: ResourceKey; result: FailedResult };

/** One per displayed key: the fields of the data model, written by the scheduler (all but `value`, `view`, `refusal`) and
 *  by `apply` (those three). */
export interface ResourceSlot {
  /** The generation of the latest issued read or chain. */
  latest: number;
  inFlight: boolean;
  trailing: boolean;
  windowTimer: unknown;
  value: unknown;
  view: string;
  refusal: unknown;
}

export interface ReadSchedulerOptions {
  scheduler: ShellScheduler;
  /** One read of the port; `pageCursor` is set for the later pages of a chain and for a load-more. */
  read: (key: ResourceKey, pageCursor?: string) => Promise<ReadResult>;
  /** Applies a settled outcome to the slot. Called only for the latest generation of a live slot. */
  apply: (slot: ResourceSlot, outcome: ReadOutcome) => void;
  /** The connection gate: while it returns false nothing is issued. Default: always open. */
  isOpen?: () => boolean;
}

export interface ReadScheduler {
  /** Navigation: drops the slots of keys no longer displayed, creates slots for new keys and issues them as bypass reads
   *  (when the gate is open), and keeps the slots and values of keys displayed before and after. */
  setDisplayed(keys: readonly ResourceKey[]): void;
  /** One read request. A `stream` request coalesces; the other triggers bypass. A `retry` with a cursor is a load-more. */
  request(key: ResourceKey, trigger: Trigger, cursor?: string): void;
  /** A bypass read of every displayed key, in displayed order. */
  requestAll(trigger: BypassTrigger): void;
  /** Appends one page to a chain with the given cursor (queued behind a chain in flight). */
  loadMore(key: ResourceKey, cursor: string): void;
  /** Drops the loaded pages and re-reads page 1 as a bypass (a refused page cursor). */
  restartFromFirstPage(key: ResourceKey): void;
  slot(key: ResourceKey): ResourceSlot | undefined;
  /** The number of pages a chain holds (0 for an unknown key). */
  pages(key: ResourceKey): number;
  loadingMore(key: ResourceKey): boolean;
  dispose(): void;
}

/** `'loading'` only while a read is in flight and the slot has no value; otherwise the slot's own view (R2-05). */
export function pendingView(slot: ResourceSlot): string {
  return slot.inFlight && slot.value === undefined ? 'loading' : slot.view;
}

function nextCursor(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('pageInfo' in value)) return null;
  const info = value.pageInfo;
  if (typeof info !== 'object' || info === null || !('nextPageCursor' in info)) return null;
  return typeof info.nextPageCursor === 'string' ? info.nextPageCursor : null;
}

interface Entry {
  readonly key: ResourceKey;
  readonly slot: ResourceSlot;
  readonly chain: boolean;
  pages: number;
  lastCursor: string | null;
  loadingMore: boolean;
  queuedMore: boolean;
  removed: boolean;
}

export function createReadScheduler(options: ReadSchedulerOptions): ReadScheduler {
  const { scheduler, read, apply } = options;
  const isOpen = options.isOpen ?? ((): boolean => true);
  /** The one generation counter: it only increases, and survives navigation and every slot. */
  let counter = 0;
  let entries = new Map<string, Entry>();

  const create = (key: ResourceKey): Entry => ({
    key,
    slot: { latest: 0, inFlight: false, trailing: false, windowTimer: null, value: undefined, view: 'idle', refusal: null },
    chain: key.kind === 'missions' || key.kind === 'ops',
    pages: 1,
    lastCursor: null,
    loadingMore: false,
    queuedMore: false,
    removed: false,
  });

  const remove = (entry: Entry): void => {
    entry.removed = true;
    if (entry.slot.windowTimer !== null) scheduler.clearTimeout(entry.slot.windowTimer);
    entry.slot.windowTimer = null;
  };

  const armWindow = (entry: Entry): void => {
    const { slot } = entry;
    if (slot.windowTimer !== null) scheduler.clearTimeout(slot.windowTimer);
    slot.windowTimer = scheduler.setTimeout(() => closeWindow(entry), COALESCE_WINDOW_MS);
  };

  const closeWindow = (entry: Entry): void => {
    if (entry.removed) return;
    const { slot } = entry;
    slot.windowTimer = null;
    if (slot.trailing && !slot.inFlight) {
      slot.trailing = false;
      issue(entry);
      armWindow(entry);
    }
  };

  /** Applies a settled read when it is the latest of a live slot, then follows up (queued load-more, trailing read). */
  const settle = (entry: Entry, generation: number, build: () => ReadOutcome): void => {
    if (entry.removed || generation !== entry.slot.latest) return;
    entry.slot.inFlight = false;
    entry.loadingMore = false;
    apply(entry.slot, build());
    afterSettle(entry);
  };

  const afterSettle = (entry: Entry): void => {
    if (entry.removed) return;
    const { slot } = entry;
    if (entry.queuedMore) {
      entry.queuedMore = false;
      if (entry.lastCursor !== null) {
        issueLoadMore(entry, entry.lastCursor);
        return;
      }
    }
    if (slot.trailing && slot.windowTimer === null) {
      slot.trailing = false;
      issue(entry);
      armWindow(entry);
    }
  };

  /** Issues the read, or the whole chain of the pages loaded, under a new generation. */
  const issue = (entry: Entry): void => {
    const { slot, key } = entry;
    counter += 1;
    const generation = counter;
    slot.latest = generation;
    slot.inFlight = true;
    entry.loadingMore = false;
    if (entry.chain) {
      void runChain(entry, generation, Math.max(1, entry.pages));
    } else {
      void read(key).then((result) => settle(entry, generation, () => ({ kind: 'result', key, result })));
    }
  };

  const runChain = async (entry: Entry, generation: number, count: number): Promise<void> => {
    const { key } = entry;
    const pages: unknown[] = [];
    let cursor: string | undefined;
    for (let index = 0; index < count; index += 1) {
      const result = await read(key, cursor);
      // A newer generation (or a removed slot) ends the chain: no further page, no apply.
      if (entry.removed || generation !== entry.slot.latest) return;
      if (!result.ok) {
        settle(entry, generation, () => {
          if (index === 0) {
            entry.queuedMore = false;
            return { kind: 'result', key, result };
          }
          entry.pages = pages.length;
          entry.lastCursor = nextCursor(pages[pages.length - 1]);
          return { kind: 'chain', key, pages, failed: result };
        });
        return;
      }
      pages.push(result.value);
      const next = nextCursor(result.value);
      if (next === null) break;
      cursor = next;
    }
    settle(entry, generation, () => {
      entry.pages = pages.length;
      entry.lastCursor = nextCursor(pages[pages.length - 1]);
      return { kind: 'chain', key, pages };
    });
  };

  const issueLoadMore = (entry: Entry, cursor: string): void => {
    const { slot, key } = entry;
    counter += 1;
    const generation = counter;
    slot.latest = generation;
    slot.inFlight = true;
    entry.loadingMore = true;
    void read(key, cursor).then((result) =>
      settle(entry, generation, (): ReadOutcome => {
        if (!result.ok) return { kind: 'append-failed', key, result };
        entry.pages += 1;
        entry.lastCursor = nextCursor(result.value);
        return { kind: 'append', key, value: result.value };
      }),
    );
  };

  const bypass = (entry: Entry): void => {
    entry.slot.trailing = false;
    issue(entry);
    armWindow(entry);
  };

  const lookup = (key: ResourceKey): Entry | undefined => entries.get(keyString(key));

  const loadMore = (key: ResourceKey, cursor: string): void => {
    const entry = lookup(key);
    if (!entry || !entry.chain || !isOpen() || entry.loadingMore) return;
    if (entry.slot.inFlight) {
      entry.queuedMore = true;
      return;
    }
    issueLoadMore(entry, cursor);
  };

  return {
    setDisplayed(keys) {
      const next = new Map<string, Entry>();
      const created: Entry[] = [];
      for (const key of keys) {
        const id = keyString(key);
        if (next.has(id)) continue;
        const existing = entries.get(id);
        const entry = existing ?? create(key);
        if (!existing) created.push(entry);
        next.set(id, entry);
      }
      for (const [id, entry] of entries) if (!next.has(id)) remove(entry);
      entries = next;
      if (isOpen()) for (const entry of created) bypass(entry);
    },
    request(key, trigger, cursor) {
      const entry = lookup(key);
      if (!entry || !isOpen()) return;
      const { slot } = entry;
      if (trigger === 'stream') {
        if (slot.windowTimer !== null || slot.inFlight) {
          slot.trailing = true;
        } else {
          issue(entry);
          armWindow(entry);
        }
        return;
      }
      if (trigger === 'retry' && cursor !== undefined && entry.chain) {
        loadMore(key, cursor);
        return;
      }
      bypass(entry);
    },
    requestAll(trigger) {
      if (!isOpen()) return;
      for (const entry of entries.values()) {
        void trigger;
        bypass(entry);
      }
    },
    loadMore,
    restartFromFirstPage(key) {
      const entry = lookup(key);
      if (!entry || !isOpen()) return;
      entry.pages = 1;
      entry.lastCursor = null;
      entry.queuedMore = false;
      bypass(entry);
    },
    slot: (key) => lookup(key)?.slot,
    pages: (key) => lookup(key)?.pages ?? 0,
    loadingMore: (key) => lookup(key)?.loadingMore ?? false,
    dispose() {
      for (const entry of entries.values()) remove(entry);
      entries = new Map();
    },
  };
}

/** What a connection state means to one client's gate. */
export type GateObservation = 'first-connected' | 'reconnected' | 'degraded-before-first' | 'none';

export interface ConnectionGate {
  /** Classifies the next state of the client's connection. */
  observe(next: ConnectionState): GateObservation;
  /** False until the client's first `connected`; while false nothing is read. */
  isOpen(): boolean;
  /** `setClient`: forgets the mark and starts again from the new client's state. */
  reset(state: ConnectionState): void;
}

/**
 * The gate and the first-`connected` mark of one client (FS-01, FS-02, FS2-01). Pure logic: no timers, no I/O. A client
 * that is already `connected` when the gate is created or reset is open at once and reports `first-connected` once. The
 * first `connected` is not a `resync`: the caller issues the displayed set itself.
 */
export function createConnectionGate(initial: ConnectionState): ConnectionGate {
  let open = false;
  let reported = false;
  let last: ConnectionState = initial;
  const start = (state: ConnectionState): void => {
    open = state === 'connected';
    reported = false;
    last = state;
  };
  start(initial);
  return {
    observe(next) {
      const previous = last;
      last = next;
      if (next === 'connected') {
        if (!reported) {
          reported = true;
          open = true;
          return 'first-connected';
        }
        return previous === 'connected' ? 'none' : 'reconnected';
      }
      return !open && next.startsWith('degraded') ? 'degraded-before-first' : 'none';
    },
    isOpen: () => open,
    reset: start,
  };
}
