<script lang="ts">
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'ops' ? snapshot.screen : undefined);
</script>

<sk-ops-screen
  use:bindIntents={{ tag: 'sk-ops-screen', controller }}
  status={slice?.status ?? 'loading'}
  errorMessage={slice?.errorMessage ?? ''}
  refusalCode={slice?.refusalCode ?? null}
  project={slice?.project ?? null}
  items={slice?.items ?? []}
  pageInfo={slice?.pageInfo ?? null}
  totalCount={slice?.totalCount ?? 0}
  skippedCount={slice?.skippedCount ?? 0}
  profile={slice?.profile ?? null}
  loadingMore={slice?.loadingMore ?? false}
  loadMoreError={slice?.loadMoreError ?? null}
></sk-ops-screen>
