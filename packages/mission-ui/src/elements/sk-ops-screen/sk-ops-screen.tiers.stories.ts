import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkOpsScreen } from './sk-ops-screen.js';
import { opsProps } from './fixtures.js';
import type { OpsScreenProps } from './fixtures.js';

// Screen stories of the tiers and the keyboard (WP08): the focus order with the ring visible, and the screen at the 1100, 800 and
// 620 px viewports. Every story is one row of the state matrix: the export name is `Op` + the row number and the one `op-<nn>`
// tag repeats it; `vw-<n>` sets the viewport the visual spec uses (and asserts the shell tier); `tab-<n>` presses Tab n times
// before the shot. The screen's columns follow the page cell it measures (a container query at 696 px and 588 px), not the
// viewport. Arguments come from `fixtures.ts` only; tags and args are literal on each story, because Storybook's static indexer
// cannot see them through a helper.
const meta: Meta<OpsScreenProps> = {
  title: 'Screens/Ops/Tiers and edge cases',
  component: 'sk-ops-screen',
  parameters: { layout: 'fullscreen' },
  args: opsProps.ready(),
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

/** Six rows of a page that has a next page, against the 249 records the service reports. */
const sixOfManyProps = (): OpsScreenProps => ({ ...opsProps.longPage(6), totalCount: 249 });

// OP-29: the focus order and the focus ring: after the shell's own stops the one control of the page, Load more, takes the ring.
export const Op29: Story = { tags: ['vw-1280', 'op-29', 'tab-7', 'vh-2600'], args: sixOfManyProps() };

// OP-30: the 1100 px viewport (the shell's expanded tier, the page cell about 900 px): the facts in two columns.
export const Op30: Story = { tags: ['vw-1100', 'op-30'], args: sixOfManyProps() };

// OP-31: the 800 px viewport (the page cell 696 px): the facts in one column, the row head still on one line.
export const Op31: Story = { tags: ['vw-800', 'op-31'], args: sixOfManyProps() };

// OP-32: the 620 px viewport (the page cell 588 px, the shell's mobile tier): the row head and the section heading stacked.
export const Op32: Story = { tags: ['vw-620', 'op-32'], args: sixOfManyProps() };
