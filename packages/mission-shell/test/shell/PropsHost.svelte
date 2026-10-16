<script lang="ts">
  // A Svelte host of MissionShell for the prop-change test (quickstart "A Svelte host can use <MissionShell {client} {route} />").
  import { untrack } from 'svelte';
  import MissionShell from '../../src/ui/MissionShell.svelte';
  import type { ShellOptions } from '../../src/ui/options';

  let { initial }: { initial: ShellOptions } = $props();
  let client = $state.raw(untrack(() => initial.client));
  let route = $state(untrack(() => initial.route));

  const options = $derived<ShellOptions>({ ...initial, client, ...(route === undefined ? {} : { route }) });

  export function update(patch: { client?: ShellOptions['client']; route?: string }): void {
    if ('client' in patch) client = patch.client ?? null;
    if (patch.route !== undefined) route = patch.route;
  }
</script>

<MissionShell {...options} />
