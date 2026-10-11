import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { artifactFrame, pairingProps } from './fixtures.js';
import type { ArtifactScreenProps } from './fixtures.js';

// Screen stories of the refusals and the states (IC-08): the five refusals, the failed listing, the two loading looks, nothing
// selected and a Mission not found. Every story is one row of the spec's story
// table: the export name is `Av` + the row number, and the `av-<nn>` tag repeats it. `vw-1280` sets the viewport the visual spec uses.
// Props come from the pairing table of `fixtures.ts` (`pairingProps`), the only place a listing and a content are paired. The frame is
// the mission shell with `flush`, dark theme. Tags and args are literal on each story: Storybook's static indexer cannot see them
// through a helper. No baseline is committed with these stories.
/** The instant the relative times are read against, fixed so the baselines never move. */
const NOW = '2026-09-24T10:00:00Z';

const meta: Meta<ArtifactScreenProps> = {
  title: 'Screens/Artifact/Refusals and states',
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

/** AV-09: the artifact does not exist: the shared refusal layout, the cause word, the title, the path and one sentence, no content and no Retry. */
export const Av09: Story = { tags: ['vw-1280', 'av-09'], args: pairingProps('AV-09') };
/** AV-10: too large: the sentence names the size of the entry, over the limit. */
export const Av10: Story = { tags: ['vw-1280', 'av-10'], args: pairingProps('AV-10') };
/** AV-11: not text: the same layout, the sentence says the artifact is not text. */
export const Av11: Story = { tags: ['vw-1280', 'av-11'], args: pairingProps('AV-11') };
/** AV-12: a credential was found: nothing of the artifact is shown. */
export const Av12: Story = { tags: ['vw-1280', 'av-12'], args: pairingProps('AV-12') };
/** AV-13: the content read failed: the one refusal that offers Retry. */
export const Av13: Story = { tags: ['vw-1280', 'av-13'], args: pairingProps('AV-13') };
/** AV-14: the listing read failed: a regional error with Retry for the whole listing. */
export const Av14: Story = { tags: ['vw-1280', 'av-14'], args: pairingProps('AV-14') };
/** AV-20: the listing is loading: a busy indicator and the live-region message. */
export const Av20: Story = { tags: ['vw-1280', 'av-20'], args: pairingProps('AV-20') };
/** AV-21: the content is loading: the toolbar kept, the pane busy, the tree still usable. */
export const Av21: Story = { tags: ['vw-1280', 'av-21'], args: pairingProps('AV-21') };
/** AV-22: nothing selected: "Choose an artifact". */
export const Av22: Story = { tags: ['vw-1280', 'av-22'], args: pairingProps('AV-22') };
/** AV-23: the Mission was not found: "Return to Pipeline". */
export const Av23: Story = { tags: ['vw-1280', 'av-23'], args: pairingProps('AV-23') };
