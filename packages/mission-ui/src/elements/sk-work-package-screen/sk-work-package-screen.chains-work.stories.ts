import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { pairingProps, workPackageFrame } from './fixtures.js';
import type { WpScreenProps } from './fixtures.js';

// Screen stories of the chains, subtasks, workspace and links regions (IC-06). Every story is one row of the state matrix: the
// export name is `Wp` + the row number + the optional letter, and the one `wp-<nn><letter>` tag repeats it (WP10's parser reads
// the tag and cross-checks the name). `vw-1280` sets the viewport the visual spec uses. Each pair comes from the pairing table
// of `fixtures.ts` (`pairingProps`), the only place a Work Package and a detail are paired. Tags and args are literal on each
// story: Storybook's static indexer cannot see them through a helper.
/** The instant the relative times are read against, fixed so the baselines never move (the same as the header and review stories). */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<WpScreenProps> = {
  title: 'Screens/Work Package/Chains, subtasks, workspace and links',
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

/** WP-10: no subtasks (total 0, empty list): the quiet "no subtasks" form and no progress bar. */
export const Wp10: Story = { tags: ['vw-1280', 'wp-10', 'vh-2000'], args: pairingProps('WP-10') };
/** WP-11: some subtasks done: the bar from the progress as given and a titled row with a lane word for each. */
export const Wp11: Story = { tags: ['vw-1280', 'wp-11', 'vh-2000'], args: pairingProps('WP-11') };
/** WP-12: a subtask with no title and no lane: the id alone and the not-started word. */
export const Wp12: Story = { tags: ['vw-1280', 'wp-12', 'vh-2000'], args: pairingProps('WP-12') };
/** WP-13: dependencies blocked: titled nodes with lane words, the unsatisfied ones marked in words. */
export const Wp13: Story = { tags: ['vw-1280', 'wp-13', 'vh-2000'], args: pairingProps('WP-13') };
/** WP-14: dependencies satisfied and ready to start. */
export const Wp14: Story = { tags: ['vw-1280', 'wp-14'], args: pairingProps('WP-14') };
/** WP-15: no dependencies: the quiet "no dependencies" form. */
export const Wp15: Story = { tags: ['vw-1280', 'wp-15', 'vh-2000'], args: pairingProps('WP-15') };
/** WP-16: a dependency with no lane whose title is its id: the id once and the not-started word. */
export const Wp16: Story = { tags: ['vw-1280', 'wp-16', 'vh-2000'], args: pairingProps('WP-16') };
/** WP-25: owned files, mixed: changed, unchanged and a glob, each with its state word. */
export const Wp25: Story = { tags: ['vw-1280', 'wp-25', 'vh-2000'], args: pairingProps('WP-25') };
/** WP-26: every owned file unknown: no per-row badges and one quiet note. */
export const Wp26: Story = { tags: ['vw-1280', 'wp-26', 'vh-2000'], args: pairingProps('WP-26') };
/** WP-27: no owned files: the empty-state form. */
export const Wp27: Story = { tags: ['vw-1280', 'wp-27', 'vh-2000'], args: pairingProps('WP-27') };
/** WP-31: the workspace, populated: four rows, worktree present yes. */
export const Wp31: Story = { tags: ['vw-1280', 'wp-31', 'vh-2000'], args: pairingProps('WP-31') };
/** WP-32: the worktree not present: "no" in words and no claim that it was removed. */
export const Wp32: Story = { tags: ['vw-1280', 'wp-32', 'vh-2000'], args: pairingProps('WP-32') };
/** WP-33a: the planning lane (no lane branch): the null member keeps its row with the absent marker. */
export const Wp33a: Story = { tags: ['vw-1280', 'wp-33a', 'vh-2000'], args: pairingProps('WP-33a') };
/** WP-33b: an all-null workspace: the panel is drawn with four rows of absent markers. */
export const Wp33b: Story = { tags: ['vw-1280', 'wp-33b', 'vh-2000'], args: pairingProps('WP-33b') };
/** WP-34: artifact links, spec and prompt both present. */
export const Wp34: Story = { tags: ['vw-1280', 'wp-34', 'vh-2000'], args: pairingProps('WP-34') };
/** WP-35a: the prompt reference null: only "Open spec.md". */
export const Wp35a: Story = { tags: ['vw-1280', 'wp-35a', 'vh-2000'], args: pairingProps('WP-35a') };
/** WP-35b: the spec reference null: only "Open prompt". */
export const Wp35b: Story = { tags: ['vw-1280', 'wp-35b', 'vh-2000'], args: pairingProps('WP-35b') };
/** WP-35c: both references null: no link region at all. */
export const Wp35c: Story = { tags: ['vw-1280', 'wp-35c', 'vh-2000'], args: pairingProps('WP-35c') };
/** WP-50: redaction markers in a subtask and a dependency title, shown verbatim. */
export const Wp50: Story = { tags: ['vw-1280', 'wp-50', 'vh-2000'], args: pairingProps('WP-50') };
