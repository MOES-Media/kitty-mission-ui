import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkOpsScreen } from './sk-ops-screen.js';
import { opsProps } from './fixtures.js';
import type { OpsScreenProps } from './fixtures.js';

// Screen stories of the page frame and its paging (WP06): the header, the source notice, the section heading with its count
// badge, Load more, the skipped note, the load-more error and the refused cursor. Every story is one row of the state matrix:
// the export name is `Op` + the row number and the one `op-<nn>` tag repeats it; `vw-<n>` sets the viewport the visual spec
// uses. Arguments come from `fixtures.ts` only (the helpers `opsProps.*`); tags and args are literal on each story, because
// Storybook's static indexer cannot see them through a helper.
const meta: Meta<OpsScreenProps> = {
  title: 'Screens/Ops/Paging and notices',
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

// The tall stories carry `vh-<n>` (the harness viewport height, as the Work Package stories do) so the part of the page that
// defines the story is in the baseline.
// OP-01: ready, six rows newest first, the header, the source notice, the count badge "6 of 249" and Load more.
export const Op01: Story = { tags: ['vw-1280', 'op-01', 'vh-2600'], args: sixOfManyProps() };

// OP-15: the count badge, loaded against total, nothing flags a lag.
export const Op15: Story = { tags: ['vw-1280', 'op-15', 'vh-1200'], args: { ...opsProps.longPage(2), totalCount: 249 } };

// OP-16: a next page exists and the host is loading it: Load more is busy, the list item says so.
export const Op16: Story = { tags: ['vw-1280', 'op-16', 'vh-1200'], args: { ...opsProps.longPage(2), totalCount: 249, loadingMore: true } };

// OP-17: the last page: six rows, all of the six the service reports, so the badge reads "6 records", no Load more, and nothing is
// said about the end.
export const Op17: Story = {
  tags: ['vw-1280', 'op-17', 'vh-2400'],
  args: { ...opsProps.longPage(6), totalCount: 6, pageInfo: opsProps.lastPage().pageInfo },
};

// OP-18: records the service could not read: one quiet note below the list.
export const Op18: Story = { tags: ['vw-1280', 'op-18', 'vh-1400'], args: { ...opsProps.ready(), skippedCount: 3 } };

// OP-24: the next page failed to load: the rows and the badge stay, Load more is replaced by the notice and Try again.
export const Op24: Story = { tags: ['vw-1280', 'op-24', 'vh-1500'], args: opsProps.loadMoreError(null) };

// OP-25: the cursor was refused: the rows stay and the action is "Refresh from the newest".
export const Op25: Story = { tags: ['vw-1280', 'op-25', 'vh-1500'], args: opsProps.refusedCursor() };

// OP-28: many rows: 200 on one page, with a next page, against the 1000 records the service reports ("200 of 1000").
export const Op28: Story = { tags: ['vw-1280', 'op-28', 'vh-2600'], args: { ...opsProps.longPage(), totalCount: 1000 } };

// OP-35: the page's rows disagree with the profile filter: the loading look, nothing announced for it.
export const Op35: Story = { tags: ['vw-1280', 'op-35'], args: opsProps.mismatchedProfile() };
