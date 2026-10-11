import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { driftFrame, pairReport, refusalProps, reportProps, stateProps } from './fixtures.js';
import type { DriftScreenProps } from './fixtures.js';
import { reportPopulated } from '../../contract/fixtures.generated.js';

// Screen stories of the states (IC-04): one story per state-matrix row, DR-18 to DR-23, DR-30 and DR-31. The export name is `Dr` + the row
// number (+ a letter where a row has two looks), and the `dr-<nn>` tag repeats it. Props come from the builders of `fixtures.ts`.
const meta: Meta<DriftScreenProps> = {
  title: 'Screens/Drift/States',
  component: 'sk-drift-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    driftFrame(
      html`<sk-drift-screen
        status=${args.status}
        mission-id=${args.missionId}
        refusal-code=${args.refusalCode ?? ''}
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

/** DR-18: a clean report: "No drift found" and the last scan; it never says everything is consistent. */
export const Dr18: Story = { tags: ['vw-1280', 'dr-18'], args: stateProps.clean() };
/** DR-19: a truncated report: the list and the note that only the first findings are shown. */
export const Dr19: Story = { tags: ['vw-1280', 'dr-19'], args: reportProps('reportTruncated', { select: 0 }) };
/** DR-20: loading the first scan: a labelled busy indicator under the header. */
export const Dr20: Story = { tags: ['vw-1280', 'dr-20'], args: stateProps.loading() };
/** DR-21: rescanning with a report shown: the report stays and the Rescan button is busy. */
export const Dr21: Story = { tags: ['vw-1280', 'dr-21'], args: reportProps('reportPopulated', { select: 1, rescanning: true }) };
/** DR-22: the scan was unreadable: the refusal in words and Retry. */
export const Dr22: Story = { tags: ['vw-1280', 'dr-22'], args: refusalProps('refusalScanUnreadable') };
/** DR-23: the Mission was not found: "Return to Missions". */
export const Dr23: Story = { tags: ['vw-1280', 'dr-23'], args: stateProps.notFound() };
/** DR-30a: nothing is selected: the list, and "Choose a finding" where the detail goes. */
export const Dr30a: Story = { tags: ['vw-1280', 'dr-30a'], args: reportProps('reportPopulated', { select: 'none' }) };
/** DR-30b: the selected key is not in this scan: nothing is marked, and one sentence says so. */
export const Dr30b: Story = {
  tags: ['vw-1280', 'dr-30b'],
  args: {
    ...pairReport(reportPopulated, { select: 'none' }),
    selectedFinding: { missionId: 'a-mission-the-scan-does-not-list', kind: 'a-kind', artifactPath: 'a/file.json' },
  },
};
/** DR-31: a refusal code the screen has never seen: the generic words and Retry. */
export const Dr31: Story = { tags: ['vw-1280', 'dr-31'], args: stateProps.unknownRefusal() };
