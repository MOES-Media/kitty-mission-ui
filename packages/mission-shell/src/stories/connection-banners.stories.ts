// The five connection banners (contracts/connection-presentation.md), one story each, for the CP-1 design review.
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unmount } from 'svelte';
import { formatRoute } from '../shell';
import { mountStory, storyOptions } from './story-support';
import { storyClient } from './story-client';
import type { ShellOptions } from '../shell';

// The one shell mounted by the running story; the meta `beforeEach` unmounts it so no shell outlives its story (R4-07).
let mounted: ReturnType<typeof mountStory>['instance'] | undefined;

function renderShell(options: ShellOptions): HTMLElement {
  const story = mountStory(options);
  mounted = story.instance;
  return story.element;
}

const missions = formatRoute({ screen: 'missions' });

const meta: Meta = {
  title: 'Shell/Connection banners',
  beforeEach: () => () => {
    if (mounted !== undefined) void unmount(mounted);
    mounted = undefined;
  },
};

export default meta;
type Story = StoryObj;

/** Project layout, Missions, `connecting` from the start: no read is issued, so the slots show `loading`. */
export const Connecting1280: Story = {
  tags: ['vw-1280'],
  render: () => renderShell(storyOptions({ client: storyClient({ state: 'connecting' }), mode: 'desktop', route: missions })),
};

/** Missions with data, `reconnecting` past the 1 s grace (the immediate scheduler fires the timer). */
export const Reconnecting1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(storyOptions({ client: storyClient({ state: 'reconnecting', startConnected: true }), mode: 'desktop', route: missions })),
};

/** Missions with data, `degraded: service-missing`. */
export const ServiceMissing1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(
      storyOptions({ client: storyClient({ state: 'degraded: service-missing', startConnected: true }), mode: 'desktop', route: missions }),
    ),
};

/** Missions without data: degraded from the start, so no read is issued and the no-value slots show `error`. */
export const ContractMismatch1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(storyOptions({ client: storyClient({ state: 'degraded: contract-mismatch' }), mode: 'desktop', route: missions })),
};

/** Missions with data, connected, and the service refused the change stream. */
export const LiveUpdatesOff1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(
      storyOptions({
        client: storyClient({ state: 'connected', startConnected: true, examples: { streamEvents: 'StreamRefusal.content-mismatch' } }),
        mode: 'desktop',
        route: missions,
      }),
    ),
};
