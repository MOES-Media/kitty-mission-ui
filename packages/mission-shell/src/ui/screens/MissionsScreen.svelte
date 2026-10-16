<script lang="ts">
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'missions' ? snapshot.screen : undefined);
</script>

<sk-missions-screen
  use:bindIntents={{ tag: 'sk-missions-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  project={slice?.project ?? null}
  missions={slice?.missions ?? []}
  pageInfo={slice?.pageInfo ?? null}
  loadingMore={slice?.loadingMore ?? false}
  query={slice?.query ?? ''}
  filter={slice?.filter ?? ''}
  now={snapshot.now}
></sk-missions-screen>
