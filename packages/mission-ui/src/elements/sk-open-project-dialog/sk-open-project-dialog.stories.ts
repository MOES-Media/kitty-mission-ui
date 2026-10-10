import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { SkOpenProjectDialog } from './sk-open-project-dialog.js';
import { LOCATION, longNameFolders, mixedFolders, noFolders, otherValidProject, plainFolder, readyFolders, validProject } from './fixtures.js';

// Every story is the dialog rendered OPEN at load (PR-20..PR-23), placed beside the Projects screen inside the accepted shell;
// the native modal covers the shell with its backdrop, as in the prototype. Dark theme, 1280 wide unless the tag says otherwise.
const meta: Meta<SkOpenProjectDialog> = {
  title: 'Screens/Projects/Open project dialog',
  component: 'sk-open-project-dialog',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    location: LOCATION,
    folders: readyFolders,
    selected: validProject.location,
    status: 'ready',
  },
  render: (args) =>
    shellFrame(
      html`<sk-projects-screen status="empty"></sk-projects-screen>
        <sk-open-project-dialog
          ?open=${args.open}
          location=${args.location}
          .folders=${args.folders}
          .selected=${args.selected}
          status=${args.status}
        ></sk-open-project-dialog>`,
      { layout: 'picker', flush: true },
    ),
};

export default meta;
type Story = StoryObj<SkOpenProjectDialog>;

// PR-20, PR-21: the parent row, the selected valid project with its pill, an ordinary folder. Open is enabled.
export const Selected1280: Story = { tags: ['vw-1280'] };
export const Selected620: Story = { tags: ['vw-620'] };

// PR-21: the pill shows on any valid folder, not only the selected one (the second valid project is not selected).
export const TwoValidProjects1280: Story = { tags: ['vw-1280'], args: { folders: mixedFolders, selected: otherValidProject.location } };

// PR-23: no valid selection. Open is disabled and the reason is stated, with no selection and with an ordinary folder selected.
export const NoSelection1280: Story = { tags: ['vw-1280'], args: { selected: null } };
export const InvalidSelected1280: Story = { tags: ['vw-1280'], args: { selected: plainFolder.location } };

// PR-23: the listing states.
export const Loading1280: Story = { tags: ['vw-1280'], args: { status: 'loading', folders: noFolders, selected: null } };
export const EmptyFolder1280: Story = { tags: ['vw-1280'], args: { status: 'empty', folders: noFolders, selected: null } };
export const Error1280: Story = { tags: ['vw-1280'], args: { status: 'error', folders: noFolders, selected: null } };

// PR-24: a name that cannot break the layout.
export const LongName1280: Story = { tags: ['vw-1280'], args: { folders: longNameFolders } };
