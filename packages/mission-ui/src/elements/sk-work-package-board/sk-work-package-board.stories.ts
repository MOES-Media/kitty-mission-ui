import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkWorkPackageBoard } from './sk-work-package-board.js';
import { DEFAULT_LANE_GROUPS } from '../../defaults/index.js';
import {
  badgesWps,
  customGroups,
  customGroupsWps,
  fiveColumnsWps,
  foreignLabels,
  longNamesWps,
  subtaskProgressWps,
  unknownAndNullWps,
} from './fixtures.js';

// Pattern element: no `@screen`. The visual gate's viewport is 800 px wide. Stories are driven from `args`.
const meta: Meta<SkWorkPackageBoard> = {
  title: 'Mission/Work package board',
  component: 'sk-work-package-board',
  tags: ['autodocs'],
  args: { workPackages: fiveColumnsWps, laneGroups: [...DEFAULT_LANE_GROUPS], missionId: 'MISSION-1', labels: null, label: 'Work Package board' },
  render: (args) =>
    html`<sk-work-package-board
      .workPackages=${args.workPackages}
      .laneGroups=${args.laneGroups}
      .labels=${args.labels}
      .label=${args.label}
      mission-id=${args.missionId}
    ></sk-work-package-board>`,
};

export default meta;
type Story = StoryObj<SkWorkPackageBoard>;

/** The default groups with a work package in or near every column, one of them in Review. */
export const FiveColumns: Story = {};

/** Blocked, in review, canceled and not started: four distinct badges. */
export const Badges: Story = { args: { workPackages: badgesWps } };

/** A lane no group holds and a null lane land in the first column. */
export const UnknownAndNullLane: Story = { args: { workPackages: unknownAndNullWps } };

/** Three custom columns holding two custom lanes, with a foreign badge vocabulary. */
export const CustomGroups: Story = { args: { workPackages: customGroupsWps, laneGroups: customGroups, labels: foreignLabels } };

/** 2 of 5, 3 of 3 and total 0 in the In progress column; no bar anywhere else. */
export const SubtaskProgress: Story = { args: { workPackages: subtaskProgressWps } };

/** Long titles, ids, dependencies and actors wrap inside the cards. */
export const LongNames: Story = { args: { workPackages: longNamesWps } };
