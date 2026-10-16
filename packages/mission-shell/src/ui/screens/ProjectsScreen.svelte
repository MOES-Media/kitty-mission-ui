<script lang="ts">
  import type { FolderEntry, ProjectEntry } from '@moes-media/mission-ui';
  import { bindIntents } from '../bind-intents';
  import type { ScreenProps } from './props';

  let { snapshot, controller }: ScreenProps = $props();
  const slice = $derived(snapshot.screen.screen === 'projects' ? snapshot.screen : undefined);
</script>

<sk-projects-screen
  use:bindIntents={{ tag: 'sk-projects-screen', controller }}
  status={slice?.status ?? 'loading'}
  entries={(slice?.entries as ProjectEntry[] | undefined) ?? []}
  now={snapshot.now}
></sk-projects-screen>
<sk-open-project-dialog
  use:bindIntents={{ tag: 'sk-open-project-dialog', controller }}
  open={slice?.dialog.open ?? false}
  location={slice?.dialog.location ?? ''}
  folders={(slice?.dialog.folders as FolderEntry[] | undefined) ?? []}
  selected={slice?.dialog.selected ?? null}
  status={slice?.dialog.status ?? 'ready'}
></sk-open-project-dialog>
