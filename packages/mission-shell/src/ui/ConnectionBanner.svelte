<script lang="ts">
  import type { ConnectionCondition } from '../core/connection';
  import type { ShellSnapshot } from '../controller/shell-controller';

  // The tone and announce table, one line per condition (contracts/connection-presentation.md). It is the only thing this file
  // owns: the condition, the timing and the copy come from the snapshot (FS-06).
  const PRESENTATION = {
    connecting: { tone: 'info', announce: 'polite' },
    reconnecting: { tone: 'attention', announce: 'polite' },
    'service-missing': { tone: 'danger', announce: 'assertive' },
    'contract-mismatch': { tone: 'danger', announce: 'assertive' },
    'live-updates-off': { tone: 'neutral', announce: 'polite' },
  } as const satisfies Record<ConnectionCondition, { tone: string; announce: string }>;

  let { snapshot }: { snapshot: ShellSnapshot } = $props();
  const condition = $derived(snapshot.connection.condition);
  const copy = $derived(snapshot.connection.copy);
</script>

{#if condition !== null && copy !== null}
  <div class="banners">
    <sk-notice tone={PRESENTATION[condition].tone} announce={PRESENTATION[condition].announce} message={copy.body}>
      <h2 slot="heading">{copy.title}</h2>
    </sk-notice>
  </div>
{/if}

<style>
  .banners {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-3);
    margin-block: 0 var(--sk-space-3);
  }
</style>
