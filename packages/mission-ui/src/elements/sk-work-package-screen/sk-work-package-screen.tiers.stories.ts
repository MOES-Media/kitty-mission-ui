import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame } from './fixtures.js';
import type { WpScreenProps } from './fixtures.js';

// Screen stories of the tiers and edge cases (IC-08): long texts, lane values the tables do not know, the three narrower viewports and the tab-stop composition. Every story is one row of the state matrix: the
// export name is `Wp` + the row number + the optional letter, and the one `wp-<nn><letter>` tag repeats it (WP10's parser reads
// the tag and cross-checks the name). `vw-<n>` sets the viewport the visual spec uses (and asserts the shell tier); `tab-<n>` presses Tab n times before the shot; the screen's columns follow the CONTENT cell, not the viewport. Each pair comes from the pairing table
// of `fixtures.ts` (`pairingProps`), the only place a Work Package and a detail are paired. Tags and args are literal on each
// story: Storybook's static indexer cannot see them through a helper.
/** The instant the relative times are read against, fixed so the baselines never move (the same as the header and review stories). */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<WpScreenProps> = {
  title: 'Screens/Work Package/Tiers and edge cases',
  component: 'sk-work-package-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    workPackageFrame(
      html`<sk-work-package-screen
        status=${args.status}
        detail-status=${args.detailStatus}
        wp-id=${args.wpId}
        now=${NOW}
        .detailRefusalCode=${args.detailRefusalCode}
        .workPackage=${args.workPackage}
        .detail=${args.detail}
        .mission=${args.mission}
      ></sk-work-package-screen>`,
    ),
};

export default meta;
type Story = StoryObj<WpScreenProps>;

/** WP-44: long texts and the bulk lists (40 subtasks, 60 history entries, 100 files): no mid-word wrap and no horizontal overflow. */
export const Wp44: Story = { tags: ['vw-1280', 'wp-44'], args: { ...pairingProps('WP-44'), workPackage: { ...WORK_PACKAGE_FIXTURES.wpLong, history: WORK_PACKAGE_FIXTURES.wpBulkHistory.history } } };
/** WP-45: lane values the tables do not know (header, history, a dependency, a subtask): shown raw, in order, nothing dropped. */
export const Wp45: Story = { tags: ['vw-1280', 'wp-45'], args: pairingProps('WP-45') };
/** WP-46: the 1100 px viewport (shell expanded, content cell about 804 px): two columns, the third stack spanning below. */
export const Wp46: Story = { tags: ['vw-1100', 'wp-46'], args: pairingProps('WP-46') };
/** WP-47: the 800 px viewport (content cell about 688 px): one column, the header wraps. */
export const Wp47: Story = { tags: ['vw-800', 'wp-47'], args: pairingProps('WP-47') };
/** WP-48: the 620 px viewport: one column, the header wraps, the timeline stays readable. */
export const Wp48: Story = { tags: ['vw-620', 'wp-48'], args: pairingProps('WP-48') };
/** WP-49: every control kind (crumb, review links, dependency nodes, spec and prompt actions); Tab 14 (the shell's ten stops, then the crumb, two Open review, the dependency node, Open spec, Open prompt: stops 11 to 16) puts the ring on the dependency node. */
export const Wp49: Story = { tags: ['vw-1280', 'wp-49', 'tab-14'], args: pairingProps('WP-49') };
