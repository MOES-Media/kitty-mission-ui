import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import type { SkDriftScreen } from './sk-drift-screen.js';
import { bulkProps, driftFrame, reportProps, unbreakableSlug } from './fixtures.js';
import type { DriftScreenProps } from './fixtures.js';

// The tiers and the long-text stories (IC-06): DR-25 to DR-29. Every story carries its row tag and a `vw-<n>` tier tag; the tags are
// literal on each story because Storybook's static indexer cannot see them through a helper.
// `tab-<n>` presses Tab n times from the top of the page (the shell has six stops before Rescan: skip link, one control, four items).

const meta: Meta<SkDriftScreen> = {
  title: 'Screens/Drift/Tiers',
  component: 'sk-drift-screen',
  parameters: { layout: 'fullscreen' },
  args: reportProps('reportPopulated', { select: 1 }),
  render: (args) => {
    const props = args as unknown as DriftScreenProps;
    return driftFrame(
      html`<sk-drift-screen
        status=${props.status}
        mission-id=${props.missionId}
        now=${props.now ?? ''}
        .report=${props.report}
        .selectedFinding=${props.selectedFinding}
        .missions=${props.missions}
        .labels=${props.labels}
      ></sk-drift-screen>`,
    );
  },
};

export default meta;
type Story = StoryObj<SkDriftScreen>;

const of = (props: DriftScreenProps): Partial<SkDriftScreen> => props;

/** DR-25a: a Mission with a very long name and slug: the list row and the detail wrap or ellipsize, the page does not overflow. */
export const Dr25MissionName: Story = {
  tags: ['dr-25', 'vw-1280', 'vh-900'],
  args: of(reportProps('reportLongSlugMission', { select: 0 })),
};
/** DR-25b: 1000 rows (a truncated report): plain DOM, the page scrolls as a whole. */
export const Dr25Rows: Story = { tags: ['dr-25b', 'vw-1280', 'vh-900'], args: of(bulkProps({ select: 0 })) };
/** DR-25c: a lane table with 40 Work Packages. */
export const Dr25Lanes: Story = { tags: ['dr-25c', 'vw-1280', 'vh-1600'], args: of(reportProps('reportManyLanes', { select: 0 })) };
/** DR-25d: a command with an unbreakable slug: the command wraps inside its field. */
export const Dr25Command: Story = {
  tags: ['dr-25d', 'vw-1280', 'vh-900'],
  args: of(reportProps('reportPopulated', { select: 1, slug: unbreakableSlug })),
};
/** DR-26a: the first stop of the screen in the documented order, Rescan, with its focus ring (the shell has six stops before it). */
export const Dr26Rescan: Story = { tags: ['dr-26', 'vw-1280', 'vh-900', 'tab-7'], args: of(reportProps('reportPopulated', { select: 1 })) };
/** DR-26b: the last stop, Copy, after the listbox (one stop) and the Mission link: the ring on the button. */
export const Dr26Copy: Story = { tags: ['dr-26b', 'vw-1280', 'vh-900', 'tab-10'], args: of(reportProps('reportPopulated', { select: 1 })) };
/** DR-27: the collapsed tier, about 1100 px: the list and the detail side by side. */
export const Dr27: Story = { tags: ['dr-27', 'vw-1100', 'vh-900'] };
/** DR-28: the narrow tier, about 800 px: the list above the detail, the list border dropped. */
export const Dr28: Story = { tags: ['dr-28', 'vw-800', 'vh-1600'] };
/** DR-29: the mobile tier, 620 px: one column, the table scrolls sideways, Copy reachable. */
export const Dr29: Story = { tags: ['dr-29', 'vw-620', 'vh-1600'], args: of(reportProps('reportManyLanes', { select: 0 })) };

