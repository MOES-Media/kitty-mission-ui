import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import type { SkPipelineScreen } from './sk-pipeline-screen.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import { DEFAULT_LANE_GROUPS } from '../../defaults/index.js';
import {
  allComplete,
  allPending,
  badgesBoard,
  blockers,
  customGroupsMission,
  customLaneGroups,
  implementInProgress,
  longNames,
  nullAndUnknownLane,
  sevenPhases,
  shellMissionOf,
  subtaskProgress,
  threePhases,
  twoPhasesInProgress,
} from './fixtures.js';

// Screen: it renders inside the shell's mission layout, so the frame the prototype shows is in every baseline. Every story
// carries a `vw-<n>` tag (the visual spec sets that viewport width and asserts the shell tier); `tab-<n>` presses Tab n
// times first. Tags and args are literal on each story: Storybook's static indexer cannot see them through a helper.
// Tab stops at 1280 in the mission layout: skip link, rail (4), back link, sidebar (3), settings, the Missions crumb, then the cards.
const meta: Meta<SkPipelineScreen> = {
  title: 'Mission/Pipeline',
  component: 'sk-pipeline-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    status: 'ready',
    mission: implementInProgress,
    laneGroups: [...DEFAULT_LANE_GROUPS],
    labels: null,
    missionsHref: '#/missions',
    errorMessage: '',
  },
  render: (args) =>
    shellFrame(
      html`<sk-pipeline-screen
        status=${args.status}
        missions-href=${args.missionsHref}
        error-message=${args.errorMessage}
        .mission=${args.mission}
        .laneGroups=${args.laneGroups}
        .labels=${args.labels}
      ></sk-pipeline-screen>`,
      { layout: 'mission', flush: true, mission: args.mission === null ? null : shellMissionOf(args.mission) },
    ),
};

export default meta;
type Story = StoryObj<SkPipelineScreen>;

/** PL-01: planned, claimed, in progress, in review and canceled cards; review and implement phases in progress. */
export const ImplementInProgress1280: Story = { tags: ['vw-1280'] };
/** PL-02: no work packages, every phase pending; five empty columns, progress 0, no footer. */
export const AllPending1280: Story = { tags: ['vw-1280'], args: { mission: allPending } };
/** PL-03: every work package done or canceled; the host's next-action text is shown verbatim. */
export const AllComplete1280: Story = { tags: ['vw-1280'], args: { mission: allComplete } };
/** PL-04: a blocked work package; the blockers count reads 1. */
export const Blockers1280: Story = { tags: ['vw-1280'], args: { mission: blockers } };
/** PL-05: loading. */
export const Loading1280: Story = { tags: ['vw-1280'], args: { status: 'loading', mission: null } };
/** PL-06: error. */
export const Error1280: Story = { tags: ['vw-1280'], args: { status: 'error', mission: null } };
/** PL-07: three phases the screen has never seen. */
export const ThreePhases1280: Story = { tags: ['vw-1280'], args: { mission: threePhases } };
/** PL-07: seven phases the screen has never seen. */
export const SevenPhases1280: Story = { tags: ['vw-1280'], args: { mission: sevenPhases } };
/** PL-08: collapsed tier. */
export const Collapsed1024: Story = { tags: ['vw-1024'] };
/** PL-08: collapsed tier, narrower. */
export const Collapsed800: Story = { tags: ['vw-800'] };
/** PL-08: mobile tier; the inspector sits below the board. */
export const Mobile680: Story = { tags: ['vw-680'] };
/** PL-08: mobile tier. */
export const Mobile390: Story = { tags: ['vw-390'] };
/** PL-08: mobile tier, smallest. */
export const Mobile320: Story = { tags: ['vw-320'] };
/** PL-09: blocked, in review, canceled and not-started cards. */
export const BadgesBoard1280: Story = { tags: ['vw-1280'], args: { mission: badgesBoard } };
/** PL-10: no Mission to show (the empty-state panel, as the Missions screen). */
export const Empty1280: Story = { tags: ['vw-1280'], args: { status: 'empty', mission: null } };
/** PL-11: one work package in each of the nine lanes, every column populated. */
export const SubtaskProgress1280: Story = { tags: ['vw-1280'], args: { mission: subtaskProgress } };
/** Two phases in progress, no next action: the current step names the first one. */
export const TwoPhasesInProgress1280: Story = { tags: ['vw-1280'], args: { mission: twoPhasesInProgress } };
/** An unknown lane and a null lane land in the first column. */
export const NullAndUnknownLane1280: Story = { tags: ['vw-1280'], args: { mission: nullAndUnknownLane } };
/** Three custom columns passed as a property. */
export const CustomLaneGroups1280: Story = { tags: ['vw-1280'], args: { mission: customGroupsMission, laneGroups: customLaneGroups } };
/** Long names in the crumb, the cards and the inspector. */
export const LongNames1280: Story = { tags: ['vw-1280'], args: { mission: longNames } };
/** The first card focused (stop 12: skip link, rail 4, back link, sidebar 3, settings, crumb, card). */
export const CardFocused1280: Story = { tags: ['vw-1280', 'tab-12'] };
/** View artifacts focused (stop 19: after the seven cards). */
export const ViewArtifactsFocused1280: Story = { tags: ['vw-1280', 'tab-19'] };
