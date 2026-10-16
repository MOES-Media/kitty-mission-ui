<script lang="ts">
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'artifacts' ? snapshot.screen : undefined);
</script>

<sk-artifact-screen
  use:bindIntents={{ tag: 'sk-artifact-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  selectedPath={slice?.selectedPath ?? ''}
  mission={slice?.mission ?? null}
  workPackages={slice?.workPackages ?? []}
  listing={slice?.listing ?? null}
  content={slice?.content ?? null}
  contentStatus={slice?.contentStatus ?? 'loading'}
  refusalCode={slice?.refusalCode ?? null}
  now={snapshot.now}
></sk-artifact-screen>
