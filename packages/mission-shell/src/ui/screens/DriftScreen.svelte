<script lang="ts">
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'drift' ? snapshot.screen : undefined);
</script>

<sk-drift-screen
  use:bindIntents={{ tag: 'sk-drift-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  missionId={slice?.missionId ?? ''}
  report={slice?.report ?? null}
  refusalCode={slice?.refusalCode ?? null}
  missions={slice?.missions ?? null}
  rescanning={slice?.rescanning ?? false}
  selectedFinding={slice?.selectedFinding ?? null}
  copyResult={slice?.copyResult ?? null}
  now={snapshot.now}
></sk-drift-screen>
