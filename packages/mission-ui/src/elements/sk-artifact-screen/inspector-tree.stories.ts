import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { TREE_FOLDER_ID_PREFIX } from '../../defaults/index.js';
import { buildArtifactTree } from '../../logic/artifact-tree.js';
import { artifactFrame, pairingProps } from './fixtures.js';
import type { ArtifactScreenProps } from './fixtures.js';

// Stories of the inspector and the shell tree (IC-09), thirteen: AV-15 to AV-19 (the tree the host feeds the shell from
// `buildArtifactTree`: populated, unreadable rows, a truncated listing, an empty listing, the selection's parents open) and AV-24 to AV-29
// (file facts, Mission facts present and absent, linked Work Packages present and absent, "Open Work Package" for a prompt and for a
// review cycle, an unknown kind). Every story is one row of the pairing table of `fixtures.ts` (`pairingProps`), the only place a
// listing and a content are paired. The export name is `Av` + the row number + the optional letter, and the one `av-<nn><letter>` tag
// repeats it. `vw-<n>` sets the viewport of the visual spec. AV-17 keeps only its title and its render: the truncation note is the
// document pane's. Tags and args are literal on each story: Storybook's static indexer cannot see them through a helper.
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<ArtifactScreenProps> = {
  title: 'Screens/Artifact/Inspector and tree',
  component: 'sk-artifact-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) => renderStory(args),
};

/** The host's part: the tree is built from the listing and the open path, and the shell draws it. */
function renderStory(args: ArtifactScreenProps, expandedIds: ReadonlySet<string> | null = null): ReturnType<typeof artifactFrame> {
    const tree = buildArtifactTree(args.listing?.entries ?? [], { selectedPath: args.selectedPath, expandedIds });
    return artifactFrame(
      html`<sk-artifact-screen
        status=${args.status}
        content-status=${args.contentStatus}
        selected-path=${args.selectedPath}
        view=${args.view}
        now=${NOW}
        .listing=${args.listing}
        .content=${args.content}
        .refusalCode=${args.refusalCode}
        .mission=${args.mission}
        .workPackages=${args.workPackages}
        error-message=${args.errorMessage}
      ></sk-artifact-screen>`,
      { items: tree.nodes, current: tree.current },
    );
}

export default meta;
type Story = StoryObj<ArtifactScreenProps>;

/** AV-15: the populated tree; the open file's row is the current one (`aria-current`). */
export const Av15: Story = { tags: ['vw-1280', 'av-15'], args: pairingProps('AV-15') };
/** AV-16: unreadable rows stay disabled and carry the word "unavailable". */
export const Av16: Story = {
  tags: ['vw-1280', 'av-16'],
  args: pairingProps('AV-16'),
  // The folder that holds the unreadable rows is open, so the word "unavailable" is in the image.
  render: (args) => renderStory(args, new Set([`${TREE_FOLDER_ID_PREFIX}notes`])),
};
/** AV-17: a truncated listing renders (title only here; the truncation note is asserted with the document pane). */
export const Av17: Story = { tags: ['vw-1280', 'av-17'], args: pairingProps('AV-17') };
/** AV-18: an empty listing: no rows and the one empty form. */
export const Av18: Story = { tags: ['vw-1280', 'av-18'], args: pairingProps('AV-18') };
/** AV-19: a file inside a folder; its parent folder is open and the others are closed. */
export const Av19: Story = { tags: ['vw-1280', 'av-19'], args: pairingProps('AV-19') };
/** AV-24: the file facts (kind word, media type, size, modified, path, redacted). */
export const Av24: Story = { tags: ['vw-1280', 'av-24'], args: pairingProps('AV-24') };
/** AV-25a: the Mission facts present (Mission, Type, Topology, Target, Status). */
export const Av25a: Story = { tags: ['vw-1280', 'vh-1100', 'av-25a'], args: pairingProps('AV-25a') };
/** AV-25b: the Mission with only its identity: the other rows are omitted. */
export const Av25b: Story = { tags: ['vw-1280', 'vh-1100', 'av-25b'], args: pairingProps('AV-25b') };
/** AV-26a: linked Work Packages present: titled pills that act. */
export const Av26a: Story = { tags: ['vw-1280', 'vh-1100', 'av-26a'], args: pairingProps('AV-26a') };
/** AV-26b: no Work Package list from the host: no heading and no pill. */
export const Av26b: Story = { tags: ['vw-1280', 'vh-1100', 'av-26b'], args: pairingProps('AV-26b') };
/** AV-27: a Work Package prompt: "Open Work Package" and its own pill. */
export const Av27: Story = { tags: ['vw-1280', 'vh-1100', 'av-27'], args: pairingProps('AV-27') };
/** AV-28: a review cycle: the kind word "Review cycle" and "Open Work Package". */
export const Av28: Story = { tags: ['vw-1280', 'vh-1100', 'av-28'], args: pairingProps('AV-28') };
/** AV-29: an unknown kind: the raw value as the word in the inspector and the neutral icon in the tree. */
export const Av29: Story = { tags: ['vw-1280', 'av-29'], args: pairingProps('AV-29') };
