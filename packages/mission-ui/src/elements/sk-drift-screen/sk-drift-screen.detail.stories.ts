import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { reportPopulated } from '../../contract/fixtures.generated.js';
import type { DriftReportView } from '../../contract/types.js';
import type { SkDriftScreen } from './sk-drift-screen.js';
import { driftFrame, pairReport, reportProps } from './fixtures.js';
import type { DriftScreenProps } from './fixtures.js';

// Screen: the finding detail (kicker, title, explanation, authority panel, Facts, lane table, suggested resolution) in the mission
// shell, one story per state-matrix row this work package owns. Every story carries its row tag `dr-<NN>` and a `vw-<n>` tier tag;
// tags are literal on each story because Storybook's static indexer cannot see them through a helper.

const meta: Meta<SkDriftScreen> = {
  title: 'Screens/Drift/Detail',
  component: 'sk-drift-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: reportProps('reportPopulated', { select: 1 }),
  render: (args) => {
    const props = args as unknown as DriftScreenProps;
    return driftFrame(
      html`<sk-drift-screen
        status=${props.status}
        mission-id=${props.missionId}
        now=${props.now ?? ''}
        copy-result=${props.copyResult ?? ''}
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

/** The populated report's missing-file finding with a remedy and the status file: the DR-07a pairing. */
function missingFileReport(artifactPath: string, remedy: string | null): DriftReportView {
  const base = reportPopulated.findings[4];
  if (base === undefined) throw new Error('fixture');
  return { ...reportPopulated, findings: [{ ...base, artifactPath, remedy }] };
}

/** DR-02: a snapshot disagreement: danger kicker, authority panel, Facts, two lane rows and the suggested resolution. */
export const Dr02: Story = { tags: ['dr-02', 'vw-1280', 'vh-1100'] };
/** DR-03: one-sided Work Packages: "not present" on the null side. */
export const Dr03: Story = { tags: ['dr-03', 'vw-1280', 'vh-1100'], args: of(reportProps('reportOneSidedLane', { select: 0 })) };
/** DR-04: provenance only, a warning with no remedy and no rows: no table and no resolution. */
export const Dr04: Story = { tags: ['dr-04', 'vw-1280', 'vh-900'], args: of(reportProps('reportPopulated', { select: 2 })) };
/** DR-05: terminal snapshot, one lane row, no remedy: the table without a resolution. */
export const Dr05: Story = { tags: ['dr-05', 'vw-1280', 'vh-900'], args: of(reportProps('reportPopulated', { select: 3 })) };
/** DR-06: corrupt JSON: the table region is one sentence; the command stays. */
export const Dr06: Story = { tags: ['dr-06', 'vw-1280', 'vh-900'], args: of(reportProps('reportCorruptJson', { select: 0 })) };
/** DR-07a: a missing file with a remedy (the status file named): command and Copy, and no claim about which file is missing. */
export const Dr07a: Story = { tags: ['dr-07a', 'vw-1280', 'vh-900'], args: of(pairReport(missingFileReport('status.json', 'materialize_status'), { select: 0 })) };
/** DR-07b: a missing file with no remedy: no resolution region. */
export const Dr07b: Story = { tags: ['dr-07b', 'vw-1280', 'vh-900'], args: of(pairReport(missingFileReport('status.events.jsonl', null), { select: 0 })) };
/** DR-08: a missing lane branch: git authority, the lane manifest as the derived side, no branch name anywhere. */
export const Dr08: Story = { tags: ['dr-08', 'vw-1280', 'vh-900'], args: of(reportProps('reportPopulated', { select: 0 })) };
/** DR-10: an unknown kind: the raw kind word, the summary as title, no explanation. */
export const Dr10: Story = { tags: ['dr-10', 'vw-1280', 'vh-900'], args: of(reportProps('reportUnknownKind', { select: 0 })) };
/** DR-10: an unknown authority: the raw word in a neutral pill. */
export const Dr10Authority: Story = { tags: ['dr-10b', 'vw-1280', 'vh-900'], args: of(reportProps('reportUnknownAuthority', { select: 3 })) };
/** DR-11: an unknown remedy: no command, no Copy. */
export const Dr11: Story = { tags: ['dr-11', 'vw-1280', 'vh-1100'], args: of(reportProps('reportUnknownRemedy', { select: 1 })) };
/**
 * DR-12: the resolution after Copy was pressed and the host answered `manual`: the result words, the command selected. The screen
 * accepts an answer only after a press (FR-021), so the story presses Copy and then answers, as a host does.
 */
export const Dr12: Story = {
  tags: ['dr-12', 'vw-1280', 'vh-1100'],
  play: async ({ canvasElement }) => {
    const screen = canvasElement.querySelector('sk-drift-screen');
    screen?.shadowRoot?.querySelector<HTMLElement>('[data-copy]')?.click();
    if (screen !== null) screen.copyResult = 'manual';
    await screen?.updateComplete;
  },
};
/** DR-13: a Mission the host does not list: its id in Facts, no link, one sentence instead of the command. */
export const Dr13: Story = { tags: ['dr-13', 'vw-1280', 'vh-1100'], args: of(reportProps('reportMissionUnlisted', { select: 0 })) };
/** DR-32: a finding with a source code the screen has not seen (`SNAPSHOT_DRIFT_FUTURE`): the quiet mono tag under the title as given, and no explanation. DR-02 shows a known code. */
export const Dr32: Story = { tags: ['dr-32', 'vw-1280', 'vh-1100'], args: of(reportProps('reportUnknownSourceCode', { select: 2 })) };
