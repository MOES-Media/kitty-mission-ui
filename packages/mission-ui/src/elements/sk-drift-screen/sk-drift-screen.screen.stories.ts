import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import type { SkDriftScreen } from './sk-drift-screen.js';
import { driftFrame, reportProps } from './fixtures.js';
import type { DriftScreenProps } from './fixtures.js';

// The two whole-screen stories that need both chains (IC-06): DR-01 and DR-24, each in the mission shell at 1280 px, dark theme.
// Tags are literal on each story because Storybook's static indexer cannot see them through a helper.

const meta: Meta<SkDriftScreen> = {
  title: 'Screens/Drift/Tiers',
  component: 'sk-drift-screen',
  parameters: { layout: 'fullscreen' },
  args: reportProps('reportPopulated', { select: 0 }),
  render: (args) => {
    const props = args as unknown as DriftScreenProps;
    return driftFrame(
      html`<sk-drift-screen
        status=${props.status}
        mission-id=${props.missionId}
        now=${props.now ?? ''}
        ?rescanning=${props.rescanning}
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

/** DR-01: ready; the status.json finding is selected (the prototype's default) and its detail drawn; the header holds the last scan and Rescan. DR-08 shows the first finding. */
export const Dr01: Story = { tags: ['dr-01', 'vw-1280', 'vh-900'], args: of(reportProps('reportPopulated', { select: 1 })) };
/** DR-24: a scoped scan: the header names the Mission, only its own findings are listed, and the rows carry no Mission column. */
export const Dr24: Story = { tags: ['dr-24', 'vw-1280', 'vh-900'], args: of(reportProps('reportScoped', { select: 0 })) };
