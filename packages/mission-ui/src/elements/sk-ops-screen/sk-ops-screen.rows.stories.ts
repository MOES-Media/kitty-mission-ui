import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkOpsScreen } from './sk-ops-screen.js';
import { OPS_INVOCATION_FIXTURES, opsRowProps } from './fixtures.js';
import type { OpsInvocationFixtureName, OpsScreenProps } from './fixtures.js';

// The rows of the Ops screen, one story per matrix row (OP-02 to OP-14, OP-26, OP-27 and OP-33), dark, 1280 px, inside the
// shell with `flush` as shell content. The arguments come from `fixtures.ts` only; a row that needs several renders (OP-12,
// OP-13, OP-26, OP-27) shows them in ONE story. Export name `Op<NN>[letter]`; tags: the row tag and the tier tag.
const meta: Meta<SkOpsScreen> = {
  title: 'Screens/Ops/Rows',
  component: 'sk-ops-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: opsRowProps('opsClosedByAgent'),
  render: (args) =>
    shellFrame(
      html`<sk-ops-screen
        status=${args.status}
        .project=${args.project}
        .items=${args.items}
        .pageInfo=${args.pageInfo}
        total-count=${args.totalCount}
        skipped-count=${args.skippedCount}
        .profile=${args.profile}
        ?loading-more=${args.loadingMore}
        .loadMoreError=${args.loadMoreError}
        .refusalCode=${args.refusalCode}
      ></sk-ops-screen>`,
      { flush: true, current: 'nav-ops' },
    ),
};

export default meta;
type Story = StoryObj<SkOpsScreen>;

/** The arguments of a story that shows these invocation fixtures, in this order, as one ready page. */
function rows(...names: OpsInvocationFixtureName[]): OpsScreenProps {
  const first = opsRowProps(names[0] as OpsInvocationFixtureName);
  return { ...first, items: names.map((name) => structuredClone(OPS_INVOCATION_FIXTURES[name])), totalCount: names.length };
}

// OP-02: closed done by the agent, the six facts in order.
export const Op02: Story = { tags: ['vw-1280', 'op-02'], args: rows('opsClosedByAgent') };
// OP-03: closed failed, the danger tone.
export const Op03: Story = { tags: ['vw-1280', 'op-03'], args: rows('opsFailed') };
// OP-04: closed abandoned, the attention tone.
export const Op04: Story = { tags: ['vw-1280', 'op-04'], args: rows('opsAbandoned') };
// OP-05: open, the status word and Completed and Evidence not recorded yet.
export const Op05: Story = { tags: ['vw-1280', 'op-05'], args: rows('opsOpen') };
// OP-06: closed by the sweep, the Closed by fact.
export const Op06: Story = { tags: ['vw-1280', 'op-06'], args: rows('opsClosedBySweep') };
// OP-07: evidence null.
export const Op07: Story = { tags: ['vw-1280', 'op-07'], args: rows('opsEvidenceNull') };
// OP-08: evidence of the path class.
export const Op08: Story = { tags: ['vw-1280', 'op-08'], args: rows('opsEvidenceRepoPath') };
// OP-09: evidence text of 512 characters, wrapped.
export const Op09: Story = { tags: ['vw-1280', 'op-09', 'vh-1200'], args: rows('opsEvidence512') };
// OP-10: evidence of the address class, shown as text.
export const Op10: Story = { tags: ['vw-1280', 'op-10'], args: rows('opsEvidenceUrl') };
// OP-11: redacted evidence, the markers and the changed word.
export const Op11: Story = { tags: ['vw-1280', 'op-11'], args: rows('opsRedactedMarkers') };
// OP-12: Mission and Work Package present (both), one, and absent.
export const Op12: Story = { tags: ['vw-1280', 'op-12', 'vh-1400'], args: rows('opsOpen', 'opsMissionOnly', 'opsNoMissionNoWp') };
// OP-13: the four modes of work.
export const Op13: Story = { tags: ['vw-1280', 'op-13', 'vh-1800'], args: rows('opsClosedByAgent', 'opsEvidenceRepoPath', 'opsModeAdvisory', 'opsModeQuery') };
// OP-14: a start time served with a +02:00 offset, shown in UTC.
export const Op14: Story = { tags: ['vw-1280', 'op-14'], args: rows('opsOffsetStart') };
// OP-26: a foreign outcome, closer, mode and evidence kind, each shown as the raw word.
export const Op26: Story = { tags: ['vw-1280', 'op-26', 'vh-1800'], args: rows('opsUnknownOutcome', 'opsUnknownCloser', 'opsUnknownMode', 'opsUnknownEvidenceKind') };
// OP-27: long texts: a 512-character evidence, a 128-character profile, a long action and an unbroken token.
export const Op27: Story = { tags: ['vw-1280', 'op-27', 'vh-2300'], args: rows('opsEvidence512', 'opsProfile128', 'opsActionLong', 'opsEvidenceUnbroken512') };
// OP-33: a null actor.
export const Op33: Story = { tags: ['vw-1280', 'op-33'], args: rows('opsActorNull') };
