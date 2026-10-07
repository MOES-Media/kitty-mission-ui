import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import type { SkWorkPackageScreen } from './sk-work-package-screen.js';
import { pairingProps, workPackageFrame, workPackageProps } from './fixtures.js';
import type { WpScreenProps } from './fixtures.js';

// Screen: header band, Facts, Assignment and Frontmatter in the mission shell, one story per state-matrix row this work package
// owns. Every story carries its row tag `wp-<NN><letter>` and a `vw-<n>` tier tag; tags are literal on each story because
// Storybook's static indexer cannot see them through a helper. The regions of the other work packages render as their stubs
// until the chains merge.
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<SkWorkPackageScreen> = {
  title: 'Screens/Work Package/Header and facts',
  component: 'sk-work-package-screen',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: pairingProps('WP-01'),
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

/** WP-01: populated, in progress, actor present; the Review panel shows the empty summary form and the none-found cycles statement. */
export const Wp01: Story = { tags: ['wp-01', 'vw-1280', 'vh-2000'] };
/** WP-09: no events: a null lane reads "not started", no actor badge, no last transition. */
export const Wp09: Story = { tags: ['wp-09', 'vw-1280'], args: of(workPackageProps('wpNoEvents')) };
/** WP-17: a structured actor: the three handles joined by a colon. */
export const Wp17: Story = { tags: ['wp-17', 'vw-1280'], args: of(workPackageProps('wpActorStructured')) };
/** WP-18: a handle-only actor: the one handle in the badge and the Facts row, no Assignment rows. */
export const Wp18: Story = { tags: ['wp-18', 'vw-1280'], args: of(workPackageProps('wpActorHandle')) };
/** WP-19: a redacted actor (three nulls): no actor badge, no Actor row, no Assignment panel. */
export const Wp19: Story = { tags: ['wp-19', 'vw-1280'], args: of(workPackageProps('wpActorRedacted')) };
/** WP-20: a stale Work Package: the stale badge in the header with the minutes and the reason word. */
export const Wp20: Story = { tags: ['wp-20', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpStale')) };
/** WP-21a: a fresh Work Package: the quiet staleness row in Facts, no header badge. */
export const Wp21a: Story = { tags: ['wp-21a', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpFresh')) };
/** WP-21b: staleness not applicable: nothing visible; the hidden text sits in the Facts panel. */
export const Wp21b: Story = { tags: ['wp-21b', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpNotApplicable')) };
/** WP-22: staleness omitted: the same visible output as WP-21b, with no hidden text. */
export const Wp22: Story = { tags: ['wp-22', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpStalenessOmitted')) };
/** WP-38: Facts with every optional value null: only the always-present rows are drawn. */
export const Wp38: Story = { tags: ['wp-38', 'vw-1280', 'vh-2000'], args: of(workPackageProps('wpFactsNull')) };
