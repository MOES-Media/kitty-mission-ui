import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { driftFrame, reportProps } from './fixtures.js';
import type { DriftScreenProps } from './fixtures.js';

// Screen stories of the header, the finding head and the finding list (IC-04): one story per state-matrix row, DR-14 to DR-17. The
// export name is `Dr` + the row number, and the `dr-<nn>` tag repeats it. The detail is the other chain's, so these rows are about the
// header band and the list. `vw-1280` sets the viewport the visual spec uses. Tags and args are literal on each story: Storybook's
// static indexer cannot see them through a helper.
const meta: Meta<DriftScreenProps> = {
  title: 'Screens/Drift/List',
  component: 'sk-drift-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    driftFrame(
      html`<sk-drift-screen
        status=${args.status}
        mission-id=${args.missionId}
        now=${args.now ?? ''}
        ?rescanning=${args.rescanning}
        .report=${args.report}
        .selectedFinding=${args.selectedFinding}
        .missions=${args.missions}
        .labels=${args.labels}
      ></sk-drift-screen>`,
    ),
};

export default meta;
type Story = StoryObj<DriftScreenProps>;

/** DR-14: the head: the count, and the danger badge because a shown finding is an error. The roll-up is read, not drawn. */
export const Dr14: Story = { tags: ['vw-1280', 'dr-14'], args: reportProps('reportPopulated', { select: 0 }) };
/** DR-15: the rows: summary, Mission slug in mono, and the severity badge with its word; an unknown severity is its raw word, neutral. */
export const Dr15: Story = { tags: ['vw-1280', 'dr-15'], args: reportProps('reportUnknownSeverity', { select: 'none' }) };
/** DR-16: a chosen row: the neutral selection marker and the selected surface. */
export const Dr16: Story = { tags: ['vw-1280', 'dr-16'], args: reportProps('reportPopulated', { select: 1 }) };
/** DR-17: the end of the list (what End selects): the marker on the last row. */
export const Dr17: Story = { tags: ['vw-1280', 'dr-17'], args: reportProps('reportPopulated', { select: 2 }) };
