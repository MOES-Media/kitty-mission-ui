import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkShellTree } from './sk-shell-tree.js';
import { artifactItems, collapsedItems, longNameItems, workPackageItems } from './fixtures.js';

// Pattern element: no `@screen`. The width is set through the DOM so no `style=` attribute appears in a template. The
// caption is a notice (not a pill) that names the state under test and is the story's Inter-set text: the visual gate
// requires Inter to be loaded, and library row titles are set in the display face.
const meta: Meta<SkShellTree> = {
  title: 'Mission/Shell tree',
  component: 'sk-shell-tree',
  tags: ['autodocs'],
  args: { heading: 'Work Packages', label: 'Work packages', items: workPackageItems, current: '' },
  render: (args) =>
    html`<sk-shell-tree
        ${ref((el) => (el as HTMLElement | undefined)?.style.setProperty('inline-size', 'var(--sk-layout-context-sidebar-width)'))}
        .heading=${args.heading}
        label=${args.label}
        .items=${args.items}
        current=${args.current}
      ></sk-shell-tree>
      <sk-notice tone="info">current: ${args.current === '' ? 'none' : args.current}</sk-notice>`,
};

export default meta;
type Story = StoryObj<SkShellTree>;

export const WorkPackagesSelected: Story = { args: { current: 'wp-03' } };

export const WorkPackagesNoneSelected: Story = { args: { current: '' } };

export const ArtifactsFolderExpanded: Story = {
  args: { heading: 'Artifacts', label: 'Artifacts', items: artifactItems, current: 'art-research-2' },
};

export const FolderCollapsed: Story = {
  args: { heading: 'Artifacts', label: 'Artifacts', items: collapsedItems, current: '' },
};

export const LongNames: Story = {
  args: { heading: 'Long names', label: 'Long names', items: longNameItems, current: 'leaf-long' },
};
