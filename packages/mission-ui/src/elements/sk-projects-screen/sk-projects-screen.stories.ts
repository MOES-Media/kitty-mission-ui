import { html } from 'lit';
import type { TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { SKIP_LINK_TEXT } from '../../defaults/index.js';
import type { SkProjectsScreen } from './sk-projects-screen.js';
import {
  NOW,
  activityEntries,
  allNullEntries,
  countEntries,
  driftEntries,
  fiftyEntries,
  healthyEntries,
  locationEntries,
  longEntries,
  notOpenableEntries,
  nullBranchEntries,
  nullVersionEntries,
  redactionEntries,
  rowErrorEntries,
  rowLoadingEntries,
  rowUnavailableEntries,
  threeEntries,
  unknownHealthEntries,
} from './fixtures.js';

// The prototype's gear icon, drawn locally for the top-bar action (the library ships no icon set); story-only markup.
const settingsIcon = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M21 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6-.7-2h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z"/></svg>`;

// The screen inside the shell's `picker` layout, `flush`, with the skip link text of the screen (FR-023). `shellFrame` fixes the
// skip link text of the other screens, so this file frames the screen itself (the picker ignores every navigation input).
const frame = (content: TemplateResult): TemplateResult => html`<sk-mission-shell layout="picker" flush status="ready">
  <span slot="skip-link">${SKIP_LINK_TEXT}</span>
  <sk-button slot="top-bar-actions" size="icon" variant="ghost" label="Settings">${settingsIcon}</sk-button>
  ${content}
</sk-mission-shell>`;

// Every story is the screen inside the shell (dark theme, tagged `vw-1280`). Tags and args are literal on each story:
// Storybook's static indexer cannot see them through a helper. Baselines belong to the integration work package.
const meta: Meta<SkProjectsScreen> = {
  title: 'Screens/Projects/Screen',
  component: 'sk-projects-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    status: 'ready',
    entries: threeEntries(),
    now: NOW,
    labels: null,
    errorMessage: '',
  },
  render: (args) =>
    frame(
      html`<sk-projects-screen status=${args.status} now=${args.now ?? ''} error-message=${args.errorMessage} .entries=${args.entries} .labels=${args.labels}></sk-projects-screen>`,
    ),
};

export default meta;
type Story = StoryObj<SkProjectsScreen>;

/** PR-01: three recent projects with every fact, in host order, with the toolbar count. */
export const Ready1280: Story = { tags: ['vw-1280'] };

/** PR-02, PR-03, PR-04: health healthy, schema drift and a value outside the table. */
export const HealthHealthy1280: Story = { tags: ['vw-1280'], args: { entries: healthyEntries() } };
export const HealthSchemaDrift1280: Story = { tags: ['vw-1280'], args: { entries: driftEntries() } };
export const HealthUnknown1280: Story = { tags: ['vw-1280'], args: { entries: unknownHealthEntries() } };

/** PR-05, PR-06, PR-07: the all-null project, a null version, a null branch. */
export const AllNull1280: Story = { tags: ['vw-1280'], args: { entries: allNullEntries() } };
export const NullVersion1280: Story = { tags: ['vw-1280'], args: { entries: nullVersionEntries() } };
export const NullBranch1280: Story = { tags: ['vw-1280'], args: { entries: nullBranchEntries() } };

/** PR-08, PR-09, PR-10: activity against the host clock, Mission counts 0, 1 and large, the location line with and without the flag. */
export const Activity1280: Story = { tags: ['vw-1280'], args: { entries: activityEntries() } };
export const MissionCounts1280: Story = { tags: ['vw-1280'], args: { entries: countEntries() } };
export const LocationLine1280: Story = { tags: ['vw-1280'], args: { entries: locationEntries() } };

/** PR-11: an openable row beside a row the host marked not openable (a plain box, no arrow). */
export const NotOpenable1280: Story = { tags: ['vw-1280'], args: { entries: notOpenableEntries() } };

/** PR-12, PR-13, PR-14: one row loading, one whose read failed, one unavailable, the others ready. */
export const RowLoading1280: Story = { tags: ['vw-1280'], args: { entries: rowLoadingEntries() } };
export const RowError1280: Story = { tags: ['vw-1280'], args: { entries: rowErrorEntries() } };
export const RowUnavailable1280: Story = { tags: ['vw-1280'], args: { entries: rowUnavailableEntries() } };

/** PR-15, PR-16, PR-17: the whole-list states. */
export const Empty1280: Story = { tags: ['vw-1280'], args: { status: 'empty', entries: [] } };
export const Loading1280: Story = { tags: ['vw-1280'], args: { status: 'loading', entries: [] } };
export const Error1280: Story = { tags: ['vw-1280'], args: { status: 'error', entries: [] } };

/** PR-18: the header band (eyebrow, title, muted copy, "Open project") over one row. */
export const Header1280: Story = { tags: ['vw-1280'], args: { entries: healthyEntries() } };

/** PR-19: the read-only notice at the foot of the list. */
export const Notice1280: Story = { tags: ['vw-1280'], args: { entries: notOpenableEntries() } };

/** PR-24: an unbroken name, location, branch, a 64-character version and a large count. */
export const LongTexts1280: Story = { tags: ['vw-1280'], args: { entries: longEntries() } };

/** PR-25: fifty rows in plain DOM. */
export const Fifty1280: Story = { tags: ['vw-1280'], args: { entries: fiftyEntries() } };

/** PR-30: redaction-like text in a name, a branch and a location is shown verbatim. */
export const RedactionLike1280: Story = { tags: ['vw-1280'], args: { entries: redactionEntries() } };
