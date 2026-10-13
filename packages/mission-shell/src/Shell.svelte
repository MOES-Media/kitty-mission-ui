<script lang="ts">
  // The layout root of the shell. Phase 0 renders its children only; routing and state arrive with #18.
  import type { Snippet } from 'svelte';

  let { children }: { children?: Snippet } = $props();
</script>

{@render children?.()}
