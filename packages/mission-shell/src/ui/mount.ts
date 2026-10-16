// mountShell (contracts/shell-api.md): mounts MissionShell into a target and returns the host's three handles. Both setters
// reach the one controller through the component's exports; destroy unmounts once, which destroys the controller.
import { mount, unmount } from 'svelte';
import type { MissionStatusClient } from '../client/port';
import MissionShell from './MissionShell.svelte';
import type { ShellOptions } from './options';

export interface MountedShell {
  setRoute(route: string): void;
  /** A new project: releases the old subscriptions, drops all state, subscribes the new client, and optionally sets the route in the same step. */
  setClient(client: MissionStatusClient | null, route?: string): void;
  destroy(): void;
}

/** The functions MissionShell.svelte exports. */
type ShellExports = {
  setRoute(route: string): void;
  setClient(client: MissionStatusClient | null, route?: string): void;
};

export function mountShell(target: Element, options: ShellOptions): MountedShell {
  const app = mount(MissionShell, { target, props: options }) as ShellExports;
  let mounted = true;
  return {
    setRoute(route) {
      if (mounted) app.setRoute(route);
    },
    setClient(client, route) {
      if (mounted) app.setClient(client, route);
    },
    destroy() {
      if (!mounted) return;
      mounted = false;
      void unmount(app);
    },
  };
}
