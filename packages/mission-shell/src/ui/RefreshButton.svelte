<script lang="ts">
  import type { ShellController, ShellSnapshot } from '../controller/shell-controller';
  import { UI_COPY } from './copy';

  let { snapshot, controller }: { snapshot: ShellSnapshot; controller: ShellController } = $props();
  const label = $derived(snapshot.destination.screen === 'ops' ? UI_COPY.refresh.ops : UI_COPY.refresh.artifacts);
  // The element belongs to the top-bar slot of sk-mission-shell, which is the parent that renders this component.
  const slotted = { slot: 'top-bar-actions' };
</script>

{#if snapshot.showRefresh}
  <sk-button {...slotted} variant="ghost" size="sm" {label} onclick={() => controller.refresh()}>{UI_COPY.refresh.label}</sk-button>
{/if}
