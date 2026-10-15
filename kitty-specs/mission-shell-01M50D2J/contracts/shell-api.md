# Contract: the shell's public surface (`@moes-media/mission-shell/shell`)

This is what #20 (Kitty Desktop) and #21 (Kitty Dashboard) mount. SC-005 requires that they can do so with only their
adapter and host interface, with 0 changes to this surface.

**Entries** (operator ruling, decision `01M50K4K059HSWKGA56KV7KNJC`):

| Entry | Contents |
|---|---|
| `.` (`src/index.ts`) | **unchanged and port-only**: `MissionStatusClient` and its types, `CLIENT_OPERATIONS`, `CONNECTION_STATES`, `CHANGE_KINDS`, `READ_OPS`, `toStreamCursorString` |
| `./shell` (`src/shell.ts`) | **new, additive**: everything below |
| `./testing` | unchanged |

`package.json` `exports` becomes `{ ".", "./testing", "./shell" }`, and `test/package.test.ts` expects exactly these
three.

```ts
// @moes-media/mission-shell/shell
import type { MissionStatusClient } from '@moes-media/mission-shell';
import type { ProjectEntry, FolderEntry } from '@moes-media/mission-ui';

export type ShellMode = 'desktop' | 'dashboard';

export interface ShellHost {
  copyText?(text: string): Promise<'copied' | 'manual'>;
  /**
   * Open an external link. The shell has already checked that the scheme is exactly http, https or mailto
   * (case-insensitive). The href is still UNTRUSTED document content. The host MUST re-validate the scheme
   * (case-insensitively) before acting, MUST NOT navigate its own window or webview to it, and SHOULD show the
   * destination to the user before opening it (the sk-open-link obligations of sk-artifact-screen).
   */
  openExternalLink?(href: string): void;
  listRecentProjects?(): Promise<ProjectEntry[]>;
  openProject?(target: { key: string } | { location: string }): void;
  listFolders?(location: string): Promise<{ location: string; folders: FolderEntry[] }>;
  /** Subscribe to "the window became visible or focused again"; returns an unsubscribe function. */
  onWindowRefocus?(listener: () => void): () => void;
  /** Called after each navigation the shell makes itself, and once with the canonical form when a host-set route
   *  was not canonical. Never called for a host-set route that is already canonical. */
  routeChanged?(route: string): void;
}

/** Declared once here; structurally identical to the fixture adapter's Scheduler (a type test asserts both ways). */
export interface ShellScheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ShellCopyOverrides {
  serviceMissing?: { title: string; body: string };
  contractMismatch?: { title: string; body: string };
}

export interface ShellOptions {
  /** One client per project (SO-DES-013). null on the desktop shows the picker. null on the dashboard shows the
   *  project layout in error ("No project is open."), with no reads and no throw. */
  client: MissionStatusClient | null;
  host?: ShellHost;
  mode: ShellMode;
  route?: string;
  scheduler?: ShellScheduler;
  clock?: () => Date;
  copy?: ShellCopyOverrides;
}

export { default as MissionShell } from './ui/MissionShell.svelte';   // props: ShellOptions

export function mountShell(target: Element, options: ShellOptions): {
  setRoute(route: string): void;
  /** A new project: releases the old subscriptions, drops all state, subscribes the new client, and optionally sets
   *  the route in the same step. */
  setClient(client: MissionStatusClient | null, route?: string): void;
  destroy(): void;
};

export function formatRoute(destination: Destination): string;
export function parseRoute(route: string, mode: ShellMode): Destination;
export type { Destination } from './core/routes';
```

## Host prerequisites (R4-02)

- `@spec-kitty/tokens` CSS is loaded, and its fonts can be resolved.
- `document.documentElement` carries `data-theme`.
- The host's bundler compiles Svelte for the `./shell` entry, for example Vite with `@sveltejs/vite-plugin-svelte`.
- The `sk-*` library elements need no action from the host. The shell imports `@moes-media/mission-ui` at top level,
  and mission-ui's element modules import `@spec-kitty/elements`. The shell relies on that registration and declares
  no direct dependency on the library.

## Behaviour a host can rely on

- **No I/O.** The shell calls the port, the `ShellHost` members and the scheduler, and nothing else (C-001: the no-io
  gate, plus the shell ESLint block of `plan.md` IC-07).
- **Subscriptions.** Exactly one unscoped `client.subscribe`, one `client.connection.onChange`, and one
  `host.onWindowRefocus` (when the member exists). All three are released on `destroy` and on `setClient`.
  - After a refused stream, the shell never subscribes again before a client change.
  - Each later reconnect is a shell-side resync.
- **Never throws** (NFR-007). A host member's throw or rejection becomes its fallback. Dashboard intents of the picker
  or dialog do nothing.
- **Not part of this surface**: adapters (#20, #21), `kitty-core` (#19), any write path, and a per-parameter fixture
  selector.
