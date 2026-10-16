<script lang="ts">
  // The one component a host mounts (plan IC-06). It owns the controller's lifetime, mirrors the snapshot into runes and
  // renders exactly one root element, <sk-mission-shell>, so stories and hosts get that element itself (R-07). Every
  // decision is the controller's; this file renders the snapshot and forwards intents.
  import '@moes-media/mission-ui';
  import { onDestroy, tick, untrack } from 'svelte';
  import type { MissionStatusClient } from '../client/port';
  import { createShellController } from '../controller/shell-controller';
  import { bindIntents } from './bind-intents';
  import ConnectionBanner from './ConnectionBanner.svelte';
  import { navigationOf } from './navigation';
  import type { ShellOptions } from './options';
  import RefreshButton from './RefreshButton.svelte';
  import ArtifactScreen from './screens/ArtifactScreen.svelte';
  import DriftScreen from './screens/DriftScreen.svelte';
  import MissionsScreen from './screens/MissionsScreen.svelte';
  import OpsScreen from './screens/OpsScreen.svelte';
  import PipelineScreen from './screens/PipelineScreen.svelte';
  import ProjectsScreen from './screens/ProjectsScreen.svelte';
  import WorkPackageScreen from './screens/WorkPackageScreen.svelte';
  import { mirrorSnapshot } from './shell-state.svelte';
  import Trees from './Trees.svelte';

  const options: ShellOptions = $props();

  // The screen each destination shows. One entry per line (plant P-7 anchors on the drift line).
  const SCREENS = {
    missions: MissionsScreen,
    drift: DriftScreen,
    ops: OpsScreen,
    pipeline: PipelineScreen,
    'work-packages': WorkPackageScreen,
    artifacts: ArtifactScreen,
    projects: ProjectsScreen,
  } as const;

  // The controller takes the options once, at creation; later changes of `client` and `route` are forwarded below.
  const controller = untrack(() => createShellController({ ...options, afterRender: () => tick() }));
  const mirror = mirrorSnapshot(controller);
  let lastClient = untrack(() => options.client);
  let lastRoute = untrack(() => options.route);

  export function setRoute(route: string): void {
    lastRoute = route;
    controller.setRoute(route);
  }

  export function setClient(client: MissionStatusClient | null, route?: string): void {
    lastClient = client;
    if (route !== undefined) lastRoute = route;
    controller.setClient(client, route);
  }

  // A Svelte host that changes its props keeps working: only a changed value reaches the controller.
  $effect(() => {
    const route = options.route;
    if (route !== undefined && route !== lastRoute) setRoute(route);
  });
  $effect(() => {
    const client = options.client;
    if (client !== lastClient) setClient(client);
  });

  onDestroy(() => {
    mirror.release();
    controller.destroy();
  });

  const snapshot = $derived(mirror.snapshot);
  const navigation = $derived(navigationOf(snapshot));
  const Screen = $derived(SCREENS[snapshot.destination.screen]);
</script>

<sk-mission-shell
  use:bindIntents={{ tag: 'sk-mission-shell', controller }}
  layout={snapshot.layout}
  current={navigation.current}
  railCurrent={navigation.railCurrent}
  navItems={navigation.navItems}
  railItems={navigation.railItems}
  footerItem={navigation.footerItem}
  project={snapshot.chrome.project}
  mission={snapshot.chrome.mission}
  status={snapshot.chrome.status}
  errorMessage={snapshot.chrome.errorMessage}
  drawerOpen={snapshot.session.drawerOpen}
  flyoutOpen={snapshot.session.flyoutOpen}
>
  <RefreshButton {snapshot} {controller} />
  <Trees {snapshot} />
  <ConnectionBanner {snapshot} />
  <Screen {snapshot} {controller} />
</sk-mission-shell>
