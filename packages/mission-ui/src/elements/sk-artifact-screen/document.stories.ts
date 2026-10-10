import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { artifactFrame, pairingProps } from './fixtures.js';
import type { ArtifactScreenProps } from './fixtures.js';

// Screen stories of the document pane (IC-07): the rendered document, the Raw tab, the full syntax, hostile text, the fallback, a
// raw-only file, the empty file, a redacted document and the focus on the active tab. Every story is one row of the spec's story
// table: the export name is `Av` + the row number, and the `av-<nn>` tag repeats it. `vw-1280` sets the viewport the visual spec uses.
// Props come from the pairing table of `fixtures.ts` (`pairingProps`), the only place a listing and a content are paired. The frame is
// the mission shell with `flush`, dark theme. Tags and args are literal on each story: Storybook's static indexer cannot see them
// through a helper. No baseline is committed with these stories.
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<ArtifactScreenProps> = {
  title: 'Screens/Artifact/Document',
  component: 'sk-artifact-screen',
  parameters: { layout: 'fullscreen' },
  render: (args) =>
    artifactFrame(
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
    ),
};

export default meta;
type Story = StoryObj<ArtifactScreenProps>;

/** AV-01: rendered markdown, the kind word as eyebrow, the title, the prose, the Rendered tab selected and the inspector filled. */
export const Av01: Story = { tags: ['vw-1280', 'av-01'], args: pairingProps('AV-01') };
/** AV-02: the Raw tab: the same content as monospace source, wrapped. */
export const Av02: Story = { tags: ['vw-1280', 'av-02'], args: pairingProps('AV-02') };
/** AV-03: the full syntax of the rendered view: emphasis, links, a wide table, lists, quotes, code, rules and an image placeholder. */
export const Av03: Story = { tags: ['vw-1280', 'av-03'], args: pairingProps('AV-03') };
/** AV-04: hostile markdown shown inert as text: raw HTML, script tags, unsafe links, remote images and unclosed constructs. */
export const Av04: Story = { tags: ['vw-1280', 'av-04'], args: pairingProps('AV-04') };
/** AV-05: the fallback: the first tab reads Fallback, a notice in words and the escaped source. */
export const Av05: Story = { tags: ['vw-1280', 'av-05'], args: pairingProps('AV-05') };
/** AV-06: non-markdown text: Raw only, no tablist and no notice, the source shown. */
export const Av06: Story = { tags: ['vw-1280', 'av-06'], args: pairingProps('AV-06') };
/** AV-07: the empty file: the toolbar and the inspector kept, "This file is empty." in the pane. */
export const Av07: Story = { tags: ['vw-1280', 'av-07'], args: pairingProps('AV-07') };
/** AV-08: a redacted document: one quiet line above the document, the markers shown as they come. */
export const Av08: Story = { tags: ['vw-1280', 'av-08'], args: pairingProps('AV-08') };
/** AV-31: keyboard focus on the active tab (the focus ring on the selected Rendered tab). `tab-13` counts the shell's stops (skip link, shell tree and nav) and the two Work Package pills of the inspector before it. */
export const Av31: Story = { tags: ['vw-1280', 'av-31', 'tab-13'], args: pairingProps('AV-31') };
