<script lang="ts">
  import type { ShellSnapshot } from '../controller/shell-controller';
  import { treesOf } from './navigation';

  let { snapshot }: { snapshot: ShellSnapshot } = $props();
  const trees = $derived(treesOf(snapshot));
  const slotted = { slot: 'sidebar-section' };
</script>

{#each trees as tree (tree.id)}
  <sk-shell-tree {...slotted} heading={tree.heading} label={tree.heading} items={tree.items} current={tree.current}></sk-shell-tree>
{/each}
