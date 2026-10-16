// The layout compositions of the shell (contracts/stories.md), one story each, for the CP-1 design review.
import type { ProjectEntry } from '@moes-media/mission-ui';
import type { MissionStatusClient } from '../index';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { unmount } from 'svelte';
import { formatRoute } from '../shell';
import type { ShellHost, ShellOptions } from '../shell';
import { mountStory, STORY_ARTIFACT_PATH, STORY_MISSION_ID, storyOptions } from './story-support';
import { storyClient } from './story-client';

// The one shell mounted by the running story; the meta `beforeEach` unmounts it so no shell outlives its story (R4-07).
let mounted: ReturnType<typeof mountStory>['instance'] | undefined;

function renderShell(options: ShellOptions): HTMLElement {
  const story = mountStory(options);
  mounted = story.instance;
  return story.element;
}

const sampleProject = (name: string, missionCount: number, health: string): NonNullable<ProjectEntry['project']> => ({
  name,
  missionCount,
  specKittyVersion: '4.0.0',
  schemaVersion: 3,
  health,
  currentBranch: 'main',
  lastActivityAt: '2026-10-01T09:30:00Z',
});

const connected = (): MissionStatusClient => storyClient({ state: 'connected', startConnected: true });

/** A host that lists synthetic projects and nothing else. */
const pickerHost: ShellHost = {
  listRecentProjects: () =>
    Promise.resolve<ProjectEntry[]>([
      { key: 'sample-alpha', location: 'Sample location A', name: 'Sample Alpha', project: sampleProject('example-alpha', 4, 'healthy') },
      { key: 'sample-beta', location: 'Sample location B', name: 'Sample Beta', project: sampleProject('example-beta', 2, 'schema_drift') },
      { key: 'sample-gamma', location: 'Sample location C', name: 'Sample Gamma', localOnly: true, state: 'unavailable' },
    ]),
  listFolders: (location) => Promise.resolve({ location, folders: [] }),
};

const meta: Meta = {
  title: 'Shell/Layouts',
  beforeEach: () => () => {
    if (mounted !== undefined) void unmount(mounted);
    mounted = undefined;
  },
};

export default meta;
type Story = StoryObj;

/** Project layout, Missions: no Refresh; the desktop footer offers "All projects". */
export const ProjectMissions1280: Story = {
  tags: ['vw-1280'],
  render: () => renderShell(storyOptions({ client: connected(), mode: 'desktop', route: formatRoute({ screen: 'missions' }) })),
};

/** Project layout, Ops: Refresh shown. */
export const ProjectOps1280: Story = {
  tags: ['vw-1280'],
  render: () => renderShell(storyOptions({ client: connected(), mode: 'desktop', route: formatRoute({ screen: 'ops' }) })),
};

/** Mission layout, Pipeline: no Refresh. */
export const MissionPipeline1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(storyOptions({ client: connected(), mode: 'desktop', route: formatRoute({ screen: 'pipeline', missionId: STORY_MISSION_ID }) })),
};

/** Mission layout, Artifact selected: Refresh shown. */
export const MissionArtifact1280: Story = {
  tags: ['vw-1280'],
  render: () =>
    renderShell(
      storyOptions({
        client: connected(),
        mode: 'desktop',
        route: formatRoute({ screen: 'artifacts', missionId: STORY_MISSION_ID, path: STORY_ARTIFACT_PATH }),
      }),
    ),
};

/** Picker layout, Projects: desktop, no client, a host that lists synthetic projects. */
export const PickerProjects1280: Story = {
  tags: ['vw-1280'],
  render: () => renderShell(storyOptions({ client: null, mode: 'desktop', host: pickerHost, route: formatRoute({ screen: 'projects' }) })),
};

/** Project layout, Missions, dashboard mode: no "All projects" and no Projects rail item. */
export const DashboardProject1280: Story = {
  tags: ['vw-1280'],
  render: () => renderShell(storyOptions({ client: connected(), mode: 'dashboard', route: formatRoute({ screen: 'missions' }) })),
};
