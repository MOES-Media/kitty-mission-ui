// The optional host interface and the only place a host member is called (plan IC-04, FR-012, NFR-007). Every member is
// optional and has a fallback. Each wrapper guards only the host call itself: a synchronous throw, or the rejection of the
// promise the member returned. The shell's own continuation runs outside every catch, so a shell bug still surfaces as an
// uncaught error and fails the harnesses (R5-11). Nothing is logged. Plain TypeScript: no Svelte, no runtime mission-ui.
import type { FolderEntry, ProjectEntry } from '@moes-media/mission-ui';

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

export type ProjectsListing = { readonly ok: true; readonly entries: ProjectEntry[] } | { readonly ok: false };
export type FoldersListing =
  | { readonly ok: true; readonly location: string; readonly folders: FolderEntry[] }
  | { readonly ok: false };

const FAILED = { ok: false } as const;
const noop = (): void => undefined;

/** A fire-and-forget member that returned a promise (the type says `void`, a host may still be async): its rejection is the host's. */
function absorbRejection(result: unknown): void {
  if (typeof result === 'object' && result !== null && 'then' in result) Promise.resolve(result).catch(noop);
}

/** `host.copyText(text)`; absent, throwing or rejecting is `'manual'`. */
export async function safeCopyText(host: ShellHost, text: string): Promise<'copied' | 'manual'> {
  let answer: unknown;
  try {
    answer = await host.copyText?.(text);
  } catch {
    return 'manual';
  }
  return answer === 'copied' ? 'copied' : 'manual';
}

/** `host.openExternalLink(href)`; absent or failing does nothing. The caller has checked the scheme. */
export function safeOpenExternalLink(host: ShellHost, href: string): void {
  try {
    absorbRejection(host.openExternalLink?.(href));
  } catch {
    // The host's failure; the fallback is nothing.
  }
}

/** `host.openProject(target)`; absent or failing does nothing. */
export function safeOpenProject(host: ShellHost, target: { key: string } | { location: string }): void {
  try {
    absorbRejection(host.openProject?.(target));
  } catch {
    // The host's failure; the fallback is nothing.
  }
}

/** `host.routeChanged(route)`; absent or failing does nothing. */
export function safeRouteChanged(host: ShellHost, route: string): void {
  try {
    absorbRejection(host.routeChanged?.(route));
  } catch {
    // The host's failure; the fallback is nothing.
  }
}

/** `host.listRecentProjects()` (known limit: only the container shape is checked, not the elements; the typed contract owns those); absent, throwing, rejecting or answering a non-list is `{ ok: false }` (the Projects screen shows `error`). */
export async function safeListRecentProjects(host: ShellHost): Promise<ProjectsListing> {
  let answer: unknown;
  try {
    answer = await host.listRecentProjects?.();
  } catch {
    return FAILED;
  }
  return Array.isArray(answer) ? { ok: true, entries: answer as ProjectEntry[] } : FAILED;
}

/** `host.listFolders(location)` (same element-shape limit); absent, throwing, rejecting or answering a malformed listing is `{ ok: false }` (the dialog shows `error`). */
export async function safeListFolders(host: ShellHost, location: string): Promise<FoldersListing> {
  let answer: unknown;
  try {
    answer = await host.listFolders?.(location);
  } catch {
    return FAILED;
  }
  if (typeof answer !== 'object' || answer === null) return FAILED;
  const { location: answered, folders } = answer as { location?: unknown; folders?: unknown };
  return typeof answered === 'string' && Array.isArray(folders) ? { ok: true, location: answered, folders: folders as FolderEntry[] } : FAILED;
}

/**
 * `host.onWindowRefocus(listener)`; absent or throwing is a no-op unsubscribe (no refocus refresh). The unsubscribe is
 * wrapped as well. The `listener` is handed over as it is: if the host calls it and shell code throws, that is a shell
 * error and is not caught here.
 */
export function safeOnWindowRefocus(host: ShellHost, listener: () => void): () => void {
  let unsubscribe: unknown;
  try {
    unsubscribe = host.onWindowRefocus?.(listener);
  } catch {
    return noop;
  }
  if (typeof unsubscribe !== 'function') return noop;
  const stop = unsubscribe as () => void;
  return (): void => {
    try {
      stop();
    } catch {
      // The host's failure; the fallback is nothing.
    }
  };
}
