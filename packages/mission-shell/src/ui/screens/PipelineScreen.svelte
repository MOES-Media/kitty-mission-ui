<script lang="ts">
  import { routeHref } from '../../core/routes';
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'pipeline' ? snapshot.screen : undefined);
</script>

<sk-pipeline-screen
  use:bindIntents={{ tag: 'sk-pipeline-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  mission={slice?.mission ?? null}
  missionsHref={routeHref({ screen: 'missions' })}
></sk-pipeline-screen>
