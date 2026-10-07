import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { detailLoadingProps, refusalProps, stateProps, workPackageFrame } from './fixtures.js';
import type { WpScreenProps } from './fixtures.js';

// Screen stories of the view states (IC-07): the regional detail notice (a refused or pending detail) and the five
// whole-screen states. Every story is one row of the state matrix: the export name is `Wp` + the row number + the optional
// letter, and the one `wp-<nn><letter>` tag repeats it (WP10's parser reads the tag and cross-checks the name). `vw-1280`
// sets the viewport the visual spec uses. Props come from the builders of `fixtures.ts`. Tags and args are literal on each
// story: Storybook's static indexer cannot see them through a helper.
/** The instant the relative times are read against, fixed so the baselines never move (the same as the header and review stories). */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<WpScreenProps> = {
  title: 'Screens/Work Package/States',
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

/** WP-36a: the detail refused as not found: the 1.0 regions show and one notice names the refusal in words, with Retry. */
export const Wp36a: Story = { tags: ['vw-1280', 'wp-36a', 'vh-2000'], args: refusalProps('detailRefusalNotFound') };
/** WP-36b: the detail unreadable: the same notice with the other refusal's words. */
export const Wp36b: Story = { tags: ['vw-1280', 'wp-36b', 'vh-2000'], args: refusalProps('detailRefusalUnreadable') };
/** WP-37: the detail still loading: the 1.0 regions show and a busy indicator stands in for the detail-only regions. */
export const Wp37: Story = { tags: ['vw-1280', 'wp-37', 'vh-2000'], args: detailLoadingProps() };
/** WP-39: loading the whole screen: the data-less header band and a labelled busy indicator. */
export const Wp39: Story = { tags: ['vw-1280', 'wp-39'], args: stateProps.loading() };
/** WP-40: empty: the frame and the neutral empty copy. */
export const Wp40: Story = { tags: ['vw-1280', 'wp-40'], args: stateProps.empty() };
/** WP-41: error: one alert notice and Retry (live: the id is given), no panels. */
export const Wp41: Story = { tags: ['vw-1280', 'wp-41'], args: { ...stateProps.error(), wpId: 'WP04' } };
/** WP-42: not found: the crumb and the id, "Task detail unavailable" and "Return to Pipeline". */
export const Wp42: Story = { tags: ['vw-1280', 'wp-42'], args: stateProps.notFound() };
/** WP-43: nothing selected: the screen as shell content, the heading, the Mission slug and the Work Package count. */
export const Wp43: Story = { tags: ['vw-1280', 'wp-43'], args: stateProps.nothingSelected() };
