import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkOpsScreen } from './sk-ops-screen.js';
import { OPS_PROFILE, opsProps } from './fixtures.js';
import type { OpsScreenProps } from './fixtures.js';

// Screen stories of the non-ready looks (WP07): loading, empty (plain, with skipped records, with a profile, with both), error, the header
// kept in a non-ready look and the zero count. Every story is one row of the state matrix: the export name is `Op` + the row
// number and the one `op-<nn>` tag repeats it; `vw-<n>` sets the viewport the visual spec uses. Arguments come from `fixtures.ts`
// only; tags and args are literal on each story, because Storybook's static indexer cannot see them through a helper.
const meta: Meta<OpsScreenProps> = {
  title: 'Screens/Ops/States',
  component: 'sk-ops-screen',
  parameters: { layout: 'fullscreen' },
  args: opsProps.empty(),
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

// OP-19: empty, no records: the header and the notice stay; the heading and the neutral sentence replace the list.
export const Op19: Story = { tags: ['vw-1280', 'op-19'], args: opsProps.empty() };

// OP-20: empty with records the service could not read: the sentence names the count, in the "in this project" wording.
export const Op20: Story = { tags: ['vw-1280', 'op-20'], args: opsProps.emptySkipped() };

// OP-21: empty under a profile filter: "No records for this profile", the profile named in mono.
export const Op21: Story = { tags: ['vw-1280', 'op-21'], args: opsProps.emptyProfile() };

// OP-21a: empty under a profile filter with records the service could not read: two sentences, the profile in mono between them.
export const Op21a: Story = { tags: ['vw-1280', 'op-21a'], args: opsProps.emptyProfileSkipped() };

// OP-22: loading the first page: the indeterminate progress, the sentence, busy; no list and no badge.
export const Op22: Story = { tags: ['vw-1280', 'op-22'], args: opsProps.loading() };

// OP-23: the first page failed (500, unreadable records): one alert, no rows, a retry.
export const Op23: Story = { tags: ['vw-1280', 'op-23'], args: opsProps.error('opsRefusalUnreadable') };

// OP-36: the header (with the project line) and the source notice stay in a non-ready look: the loading look under a profile
// filter, so that its arguments differ from OP-22's.
export const Op36: Story = { tags: ['vw-1280', 'op-36'], args: { ...opsProps.loading(), profile: OPS_PROFILE } };

// OP-37: zero count: `ready` with no rows and a total of 0 is the empty look (as OP-19).
export const Op37: Story = { tags: ['vw-1280', 'op-37'], args: { ...opsProps.empty(), status: 'ready' } };
