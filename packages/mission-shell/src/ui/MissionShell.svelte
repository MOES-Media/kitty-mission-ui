<script lang="ts">
  // The one component a host mounts (plan IC-06). It owns the controller's lifetime, mirrors the snapshot into runes and
  // renders exactly one root element, <sk-mission-shell>, so stories and hosts get that element itself (R-07). Every
  // decision is the controller's; this file renders the snapshot and forwards intents.
  import '@moes-media/mission-ui';
  import { onDestroy, tick, untrack } from 'svelte';
  import type { MissionStatusClient } from '../client/port';
  import { createShellController } from '../controller/shell-controller';
  import { formatRoute } from '../core/routes';
  import { bindIntents } from './bind-intents';
  import ConnectionBanner from './ConnectionBanner.svelte';
  import { UI_COPY } from './copy';
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
  // The client effect is declared first: a client and a route changed in the same tick must read the new screen on the new client.
  $effect(() => {
    const client = options.client;
    if (client !== lastClient) setClient(client);
  });
  $effect(() => {
    const route = options.route;
    if (route === undefined || route === lastRoute) return;
    // A host that echoes routeChanged back into its route prop sends the canonical route of the screen already shown: not a
    // navigation. Compared raw, so a non-canonical route still reaches the controller and is announced canonically.
    if (route === formatRoute(untrack(() => controller.snapshot().destination))) {
      lastRoute = route;
      return;
    }
    setRoute(route);
  });

  onDestroy(() => {
    mirror.release();
    controller.destroy();
  });

  const snapshot = $derived(mirror.snapshot);
  const navigation = $derived(navigationOf(snapshot));
  const Screen = $derived(SCREENS[snapshot.destination.screen]);
  // While a degraded banner explains the cause, the chrome shows no error and no Retry of its own (CP-1 A1). Any other
  // chrome error, with no banner, is shown as before.
  const degraded = $derived(snapshot.connection.condition === 'service-missing' || snapshot.connection.condition === 'contract-mismatch');
  const chromeStatus = $derived(degraded && snapshot.chrome.status === 'error' ? 'ready' : snapshot.chrome.status);
  const chromeError = $derived(degraded ? '' : snapshot.chrome.errorMessage);
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
  status={chromeStatus}
  errorMessage={chromeError}
  drawerOpen={snapshot.session.drawerOpen}
  flyoutOpen={snapshot.session.flyoutOpen}
>
  <span slot="brand">{UI_COPY.brand[snapshot.mode]}</span>
  <RefreshButton {snapshot} {controller} />
  <Trees {snapshot} />
  <ConnectionBanner {snapshot} />
  <Screen {snapshot} {controller} />
</sk-mission-shell>
