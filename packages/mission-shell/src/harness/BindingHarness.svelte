<script lang="ts">
  // The permanent Svelte–Lit binding check (FR-001, FR-002, R-06): mounts the real `sk-missions-screen` exactly as the
  // shell will, so test/binding.test.ts can prove the data arrives as properties and every declared intent reaches the
  // shell with its typed detail. Registration is the side-effect import below, at module top level, so it runs before
  // any mount; no prop can toggle it. The data comes from the caller; the harness hard-codes no data word and does no I/O.
  import '@moes-media/mission-ui';
  import type {
    MissionOverviewView,
    SkFilterChangeDetail,
    SkLoadMoreDetail,
    SkOpenMissionDetail,
    SkSearchDetail,
    ViewState,
  } from '@moes-media/mission-ui';
  import type { IntentEvent, OnIntent } from './intent';

  let {
    missions,
    status,
    loadingMore,
    onIntent,
  }: {
    missions: MissionOverviewView[];
    status: ViewState;
    loadingMore: boolean;
    onIntent: OnIntent;
  } = $props();

  // One handler per event the screen declares in custom-elements.json, bound through the `onsk-…` attribute path that
  // WP04 typed in src/generated/elements.d.ts. Each names its own event, so a handler bound to the wrong event is
  // caught, and forwards the detail unchanged.
  const onOpenMission = (event: IntentEvent<SkOpenMissionDetail>): void => onIntent('sk-open-mission', event.detail);
  const onSearch = (event: IntentEvent<SkSearchDetail>): void => onIntent('sk-search', event.detail);
  const onLoadMore = (event: IntentEvent<SkLoadMoreDetail>): void => onIntent('sk-load-more', event.detail);
  const onFilterChange = (event: IntentEvent<SkFilterChangeDetail>): void => onIntent('sk-filter-change', event.detail);
</script>

<sk-missions-screen
  {missions}
  {status}
  {loadingMore}
  onsk-open-mission={onOpenMission}
  onsk-search={onSearch}
  onsk-load-more={onLoadMore}
  onsk-filter-change={onFilterChange}
></sk-missions-screen>
