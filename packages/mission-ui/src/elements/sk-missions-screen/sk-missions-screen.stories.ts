import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkMissionsScreen } from './sk-missions-screen.js';
import {
  BRANCH,
  NOW,
  fullMissions,
  fullMoreInfo,
  fullPageInfo,
  firstMissions,
  firstPageInfo,
  lastPageInfo,
  longMissions,
  longNameMissions,
  longNamePageInfo,
  longPageInfo,
  mixedMissions,
  mixedPageInfo,
  projectOf,
} from './fixtures.js';

const missionCountText = (count: number): string => (count === 1 ? '1 Mission' : `${count} Missions`);

// Every story is the screen inside the accepted shell (the story's first element, so the visual gate asserts the tier
// of each `vw-<n>` tag). `tab-<n>` presses Tab n times before the shot; the Tab-walk test computes those counts.
const meta: Meta<SkMissionsScreen> = {
  title: 'Mission/Missions',
  component: 'sk-missions-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    status: 'ready',
    project: projectOf(mixedMissions.length),
    branch: BRANCH,
    missions: mixedMissions,
    pageInfo: mixedPageInfo,
    now: NOW,
    filter: 'all',
    query: '',
    loadingMore: false,
    errorMessage: '',
  },
  render: (args) =>
    shellFrame(
      html`<sk-missions-screen
        status=${args.status}
        .project=${args.project}
        branch=${args.branch}
        .missions=${args.missions}
        .pageInfo=${args.pageInfo}
        now=${args.now ?? ''}
        filter=${args.filter}
        query=${args.query}
        ?loading-more=${args.loadingMore}
        error-message=${args.errorMessage}
      ></sk-missions-screen>`,
      // The empty, loading and error states carry a shell that agrees with them: the sidebar names the same count as the
      // header (a populated story keeps the shared sample frame).
      args.status === 'ready' ? {} : { project: { eyebrow: 'Project', name: 'Sample Project', detail: `${args.branch} . ${missionCountText(args.project?.missionCount ?? 0)}` } },
    ),
};

export default meta;
type Story = StoryObj<SkMissionsScreen>;

const full = { missions: fullMissions, pageInfo: fullPageInfo, project: projectOf(9) };

// MS-01: the mixed page, last page.
export const Populated1280: Story = { tags: ['vw-1280'] };

// MS-02: one filter pressed, on the full page (drafts and a discarded Mission exist, only All shows drafts).
export const FilterActive1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'active' } };
export const FilterPlanned1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'planned' } };
export const FilterDone1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'done' } };
export const FilterStale1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'stale' } };
export const FilterDiscarded1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'discarded' } };

// MS-02a: All on the full page; drafts and the discarded Mission show, so it differs from MS-01.
export const FilterAllWithDrafts1280: Story = { tags: ['vw-1280'], args: { ...full, filter: 'all' } };

// MS-03: nothing matches, with more pages (Load more offered) and on the last page (not offered).
export const SearchNoMatchMorePages1280: Story = {
  tags: ['vw-1280'],
  args: { missions: fullMissions, pageInfo: fullMoreInfo, project: projectOf(9), query: 'zzzz' },
};
export const FilterNoMatchLastPage1280: Story = { tags: ['vw-1280'], args: { filter: 'discarded' } };

// MS-04, MS-05, MS-06.
export const Empty1280: Story = { tags: ['vw-1280'], args: { status: 'empty', missions: [], pageInfo: null, project: projectOf(0) } };
export const Loading1280: Story = { tags: ['vw-1280'], args: { status: 'loading', missions: [], pageInfo: null } };
export const Error1280: Story = { tags: ['vw-1280'], args: { status: 'error', missions: [], pageInfo: null, errorMessage: '' } };

// MS-07: paging.
export const PagedFirstPage1280: Story = { tags: ['vw-1280'], args: { missions: firstMissions, pageInfo: firstPageInfo, project: projectOf(4) } };
export const PagedLastPage1280: Story = { tags: ['vw-1280'], args: { missions: firstMissions, pageInfo: lastPageInfo(2), project: projectOf(2) } };
export const PagedLongList1280: Story = { tags: ['vw-1280'], args: { missions: longMissions, pageInfo: longPageInfo, project: projectOf(120) } };
export const PagedLoadingMore1280: Story = {
  tags: ['vw-1280'],
  args: { missions: firstMissions, pageInfo: firstPageInfo, project: projectOf(4), loadingMore: true },
};

// MS-08: the shell's tiers.
export const Collapsed1024: Story = { tags: ['vw-1024'] };
export const Collapsed800: Story = { tags: ['vw-800'] };
export const Mobile680: Story = { tags: ['vw-680'] };
export const Mobile390: Story = { tags: ['vw-390'] };
export const Mobile320: Story = { tags: ['vw-320'] };

// Extras: names that cannot break, and the two focus rings.
export const LongNames1280: Story = { tags: ['vw-1280'], args: { missions: longNameMissions, pageInfo: longNamePageInfo, project: projectOf(1) } };
export const SearchFocused1280: Story = { tags: ['vw-1280', 'tab-7'] };
export const RowFocused1280: Story = { tags: ['vw-1280', 'tab-14'] };
