import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { buildArtifactTree } from '../../logic/artifact-tree.js';
import { artifactFrame, pairingProps } from './fixtures.js';
import type { ArtifactScreenProps } from './fixtures.js';

// Stories of the tiers and the edge cases (IC-10), thirteen: AV-30a to AV-30f (a long path, a 200-character file name, deep nesting,
// a 1000-entry tree, an unbroken source line, a 256 KiB document), AV-32a to AV-32d (the focus order and the focus ring on an inline
// link, on a table scroll box and on the raw block) and AV-33 to AV-35 (1100 px, 800 px and 620 px). Every story is one row of the
// pairing table of `fixtures.ts` (`pairingProps`), the only place a listing and a content are paired; the one override is AV-32d's
// content (see its comment). The export name is `Av` + the row number + the optional letter, and the one `av-<nn><letter>` tag repeats
// it. `vw-<n>` sets the viewport of the visual spec; `tab-<n>` presses Tab n times from the shell's wrapper, counting the shell's skip
// link, its navigation and the shell tree before the screen. Tags and args are literal on each story: Storybook's static indexer cannot
// see them through a helper. No baseline is committed with these stories.
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<ArtifactScreenProps> = {
  title: 'Screens/Artifact/Tiers and edge cases',
  component: 'sk-artifact-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) => {
    // The host's part: the tree is built from the listing and the open path, and the shell draws it.
    const tree = buildArtifactTree(args.listing?.entries ?? [], { selectedPath: args.selectedPath });
    return artifactFrame(
      html`<sk-artifact-screen
        status=${args.status}
        content-status=${args.contentStatus}
        selected-path=${args.selectedPath}
        view=${args.view}
        now=${NOW}
        error-message=${args.errorMessage}
        .listing=${args.listing}
        .content=${args.content}
        .refusalCode=${args.refusalCode}
        .mission=${args.mission}
        .workPackages=${args.workPackages}
      ></sk-artifact-screen>`,
      { items: tree.nodes, current: tree.current },
    );
  },
};

export default meta;
type Story = StoryObj<ArtifactScreenProps>;

/** The raw view of a document whose one line has no space to wrap at, so the source block scrolls sideways and is a tab stop (AV-32d). */
const unbroken = pairingProps('AV-32d');
const unbrokenContent = unbroken.content === null ? null : { ...unbroken.content, content: `${'unbroken'.repeat(500)}\n`, sizeBytes: 3501 };

/** AV-30a: a very long path: the file title and the path wrap or ellipsize, nothing leaves the pane. */
export const Av30a: Story = { tags: ['vw-1280', 'av-30a'], args: pairingProps('AV-30a') };
/** AV-30b: a 200-character file name: ellipsized in the toolbar with the full name in the title, the tree row clipped. */
export const Av30b: Story = { tags: ['vw-1280', 'av-30b'], args: pairingProps('AV-30b') };
/** AV-30c: deeply nested folders: the tree indents to the leaf and the path stays inside the inspector. */
export const Av30c: Story = { tags: ['vw-1280', 'av-30c'], args: pairingProps('AV-30c') };
/** AV-30d: a 1000-entry tree, plain DOM, folders collapsed except the path to the open file. */
export const Av30d: Story = { tags: ['vw-1280', 'av-30d'], args: pairingProps('AV-30d') };
/** AV-30e: a very long source line, past the pre-parse line limit: the Raw source block wraps it and falls back in words. */
export const Av30e: Story = { tags: ['vw-1280', 'av-30e'], args: pairingProps('AV-30e') };
/** AV-30f: a 256 KiB markdown document inside the budget: rendered, and the first screen is what the baseline holds. */
export const Av30f: Story = { tags: ['vw-1280', 'av-30f'], args: pairingProps('AV-30f') };
/** AV-32a: the focus order. `tab-21` is the first inspector control: it comes after the ten stops of the shell tree and before the tabs and the document. */
export const Av32a: Story = { tags: ['vw-1280', 'av-32a', 'tab-21'], args: pairingProps('AV-32a') };
/** AV-32b: the focus ring on an inline link of the rendered document (`tab-24`: the tree, the two inspector controls, the tab, then the first link). */
export const Av32b: Story = { tags: ['vw-1280', 'av-32b', 'tab-24'], args: pairingProps('AV-32b') };
/** AV-32c: the focus ring on a table scroll box (`tab-28`: the four links that precede the wide table). */
export const Av32c: Story = { tags: ['vw-1280', 'av-32c', 'tab-28'], args: pairingProps('AV-32c') };
/** AV-32d: the focus ring on the raw block (`tab-24`). The pairing's 64-byte document cannot overflow, and the block is a tab stop only while it overflows, so this story keeps the row's props and swaps in one unbroken line. */
export const Av32d: Story = { tags: ['vw-1280', 'av-32d', 'tab-24'], args: { ...unbroken, content: unbrokenContent } };
/** AV-33: the expanded tier edge at 1100 px: two columns, the inspector on the right. */
export const Av33: Story = { tags: ['vw-1100', 'av-33'], args: pairingProps('AV-33') };
/** AV-34: the collapsed tier at 800 px: one column, the inspector first. */
export const Av34: Story = { tags: ['vw-800', 'vh-1400', 'av-34'], args: pairingProps('AV-34') };
/** AV-35: the mobile tier at 620 px: the toolbar stacked and the tables scrolling. */
export const Av35: Story = { tags: ['vw-620', 'vh-1400', 'av-35'], args: pairingProps('AV-35') };
