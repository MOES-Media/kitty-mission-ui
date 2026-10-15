# Contract: the shell's public surface (`@moes-media/mission-shell`)

This is what #20 (Kitty Desktop) and #21 (Kitty Dashboard) mount. SC-005 requires that they can do so with only their
adapter and host interface, with 0 changes to this surface. The port (`MissionStatusClient` and its types,
`kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md`) is unchanged and still exported as before. Everything
below is added to the `.` entry. The `./testing` entry is unchanged.

```ts
import type { MissionStatusClient } from './client/port';
import type { ProjectEntry, FolderEntry } from '@moes-media/mission-ui';

export type ShellMode = 'desktop' | 'dashboard';

/** The native actions a host can offer. Every member is optional; each has a fallback (data-model.md, ShellHost). */
export interface ShellHost {
  copyText?(text: string): Promise<'copied' | 'manual'>;
  openExternalLink?(href: string): void;
  listRecentProjects?(): Promise<ProjectEntry[]>;
  openProject?(target: { key: string } | { location: string }): void;
  listFolders?(location: string): Promise<{ location: string; folders: FolderEntry[] }>;
  /** Subscribe to "the window became visible or focused again"; returns an unsubscribe function. */
  onWindowRefocus?(listener: () => void): () => void;
  /** Told after every navigation the shell makes, with the new route. */
  routeChanged?(route: string): void;
}

/** The timer pair the shell coalesces and times banners with; the fixture adapter's `Scheduler` has the same shape. */
export interface ShellScheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ShellCopyOverrides {
  serviceMissing?: { title: string; body: string };
  contractMismatch?: { title: string; body: string };
}

export interface ShellOptions {
  /** One client per project (SO-DES-013). `null` is valid only on the desktop with no project open: the picker. */
  client: MissionStatusClient | null;
  host?: ShellHost;
  mode: ShellMode;
  /** The route to show; a later change navigates. Default '/missions' (or '/projects' with client null). */
  route?: string;
  scheduler?: ShellScheduler;
  clock?: () => Date;
  copy?: ShellCopyOverrides;
}

/** The Svelte component. Its props are ShellOptions. A new `client` value is a new project: everything is reset. */
export { default as MissionShell } from './ui/MissionShell.svelte';

/** For non-Svelte hosts: mounts MissionShell into `target`. */
export function mountShell(target: Element, options: ShellOptions): {
  setRoute(route: string): void;
  setClient(client: MissionStatusClient | null): void;
  destroy(): void;
};

export function formatRoute(destination: Destination): string;
export function parseRoute(route: string, mode: ShellMode): Destination;
export type { Destination } from './core/routes';
```

## Behaviour a host can rely on

- **No I/O.** The shell calls the port, the `ShellHost` members and the scheduler, and nothing else. It never touches
  `location`, `history`, the clipboard or storage (C-001; the no-io gate, plus the shell ESLint block of
  `plan.md` IC-07).
- **Subscriptions** (FR-007):
  - exactly one `client.subscribe(listener)`, unscoped, from mount to unmount or a client change;
  - exactly one `client.connection.onChange`;
  - exactly one `host.onWindowRefocus`, when the member exists.

  All three are released on unmount and on a client change.
- **Routes**:
  - The host sets the route through the `route` prop or `setRoute`.
  - The shell reports its own navigations through `routeChanged`.
  - Setting the route the shell just reported is a no-op, so no loop is possible.
- **Throws**: no option value, host member behaviour, port result or change kind makes the shell throw or leave an
  unhandled rejection (NFR-007).
- **Desktop-only intents** in `mode: 'dashboard'` are ignored (FR-015). The dashboard shows no picker entries.

## Not part of this surface

- The adapters and their transport (#20, #21).
- `kitty-core` (#19).
- Any write path.
- A per-parameter selector for the fixture adapter. It would be an additive fixture option if a later test needs it
  (CODE-BOUNDARY-011); this mission injects tables instead.
