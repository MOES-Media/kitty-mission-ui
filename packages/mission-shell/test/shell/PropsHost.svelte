<script lang="ts">
  // A Svelte host of MissionShell for the prop-change test (quickstart "A Svelte host can use <MissionShell {client} {route} />").
  import { untrack } from 'svelte';
  import MissionShell from '../../src/ui/MissionShell.svelte';
  import type { ShellOptions } from '../../src/ui/options';

  let { initial, echo = false }: { initial: ShellOptions; echo?: boolean } = $props();
  let client = $state.raw(untrack(() => initial.client));
  let route = $state(untrack(() => initial.route));

  // An echoing host copies every routeChanged back into its route prop, as a router-bound Svelte host does.
  const host = $derived<ShellOptions['host']>(
    echo
      ? {
          ...initial.host,
          routeChanged(next: string) {
            route = next;
            initial.host?.routeChanged?.(next);
          },
        }
      : initial.host,
  );

  const options = $derived<ShellOptions>({ ...initial, ...(host === undefined ? {} : { host }), client, ...(route === undefined ? {} : { route }) });

  export function currentRoute(): string | undefined {
    return route;
  }

  export function update(patch: { client?: ShellOptions['client']; route?: string }): void {
    if ('client' in patch) client = patch.client ?? null;
    if (patch.route !== undefined) route = patch.route;
  }
</script>

<MissionShell {...options} />
