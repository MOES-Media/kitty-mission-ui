<script lang="ts">
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'work-packages' ? snapshot.screen : undefined);
</script>

<sk-work-package-screen
  use:bindIntents={{ tag: 'sk-work-package-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  wpId={slice?.wpId ?? ''}
  mission={slice?.mission ?? null}
  workPackage={slice?.workPackage ?? null}
  detail={slice?.detail ?? null}
  detailStatus={slice?.detailStatus ?? 'loading'}
  detailRefusalCode={slice?.detailRefusalCode ?? null}
  now={snapshot.now}
></sk-work-package-screen>
