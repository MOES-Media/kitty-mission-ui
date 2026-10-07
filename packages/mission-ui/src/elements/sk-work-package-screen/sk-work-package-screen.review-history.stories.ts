import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import type { SkWorkPackageScreen } from './sk-work-package-screen.js';
import { pairingProps, workPackageFrame, workPackageProps } from './fixtures.js';
import type { WpScreenProps } from './fixtures.js';

// Screen: Lane history, the Review panel (summary, override, cycles) and the cancellation notice in the mission shell, one story per
// state-matrix row this work package owns. Every story carries its row tag `wp-<NN><letter>` and a `vw-<n>` tier tag; tags are literal on each story because
// Storybook's static indexer cannot see them through a helper. The regions of the other work packages render as their stubs
// until the chains merge (the Review panel and Lane history are the regions drawn here).
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<SkWorkPackageScreen> = {
  title: 'Screens/Work Package/Review and history',
  component: 'sk-work-package-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: pairingProps('WP-02'),
  render: (args) => {
    const props = args as unknown as WpScreenProps;
    return workPackageFrame(
      html`<sk-work-package-screen
        status=${props.status}
        detail-status=${props.detailStatus}
        wp-id=${props.wpId}
        now=${NOW}
        .detailRefusalCode=${props.detailRefusalCode}
        .workPackage=${props.workPackage}
        .detail=${props.detail}
        .mission=${props.mission}
      ></sk-work-package-screen>`,
    );
  },
};

export default meta;
type Story = StoryObj<SkWorkPackageScreen>;

const of = (props: WpScreenProps): Partial<SkWorkPackageScreen> => props;

/** WP-02: no latest result and no cycles: the summary says no review outcome is recorded and the cycles region says none were found. */
export const Wp02: Story = { tags: ['wp-02', 'vw-1280', 'vh-2000'] };
/** WP-03: approved, one cycle (the last): the verdict as word and tone, the cycle with its "Open review" control. */
export const Wp03: Story = { tags: ['wp-03', 'vw-1280', 'vh-2000'], args: of(pairingProps('WP-03')) };
/** WP-04: changes requested, one cycle (the first): the danger-tone verdict word and the cycle with "Open review". */
export const Wp04: Story = { tags: ['wp-04', 'vw-1280', 'vh-2000'], args: of(pairingProps('WP-04')) };
/** WP-05: a complete override: the notice with who, when and why, beside the latest result. */
export const Wp05: Story = { tags: ['wp-05', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpOverride')) };
/** WP-06: a partial override: blank members read "not recorded" and the notice says the merge gate stays blocked. */
export const Wp06: Story = { tags: ['wp-06', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpOverridePartial')) };
/** WP-07: done: the lane history ends on the done lane, "Current" on the last entry only. */
export const Wp07: Story = { tags: ['wp-07', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpDone')) };
/** WP-08: a rich history: forced transitions with reasons, verdicts and several actors, in array order. */
export const Wp08: Story = { tags: ['wp-08', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpHistoryRich')) };
/** WP-23: canceled with an operator reason: the notice above the Review panel with the reason and who recorded it. */
export const Wp23: Story = { tags: ['wp-23', 'vw-1280'], args: of(workPackageProps('wpCanceled')) };
/** WP-24a: canceled with a synthetic reason: the notice names the tool as its source. */
export const Wp24a: Story = { tags: ['wp-24a', 'vw-1280'], args: of(workPackageProps('wpCanceledSynthetic')) };
/** WP-24b: canceled with a null reason: the notice carries the heading only and no made-up reason. */
export const Wp24b: Story = { tags: ['wp-24b', 'vw-1280'], args: of(workPackageProps('wpCanceledNullReason')) };
/** WP-28: both cycles of an approved Work Package, in the order the contract gives them, each with its own "Open review". */
export const Wp28: Story = { tags: ['wp-28', 'vw-1280', 'vh-2000'], args: of(pairingProps('WP-28')) };
/** WP-29: a latest result and no cycles: the summary alone (no cycles region, no none-found text). */
export const Wp29: Story = { tags: ['wp-29', 'vw-1280', 'vh-2000'], args: of(pairingProps('WP-29')) };
/** WP-30: a cycle whose nullable members are all null: absent markers, the no-verdict text and no "Open review". */
export const Wp30: Story = { tags: ['wp-30', 'vw-1280', 'vh-2000'], args: of(pairingProps('WP-30')) };
