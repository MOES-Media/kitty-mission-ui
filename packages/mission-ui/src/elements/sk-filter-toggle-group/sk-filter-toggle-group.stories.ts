import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkFilterToggleGroup } from './sk-filter-toggle-group.js';
import { defaultOptions, groupLabel, longLabelOptions } from './fixtures.js';

// Pattern element: no `@screen`. Stories are driven from `args`; the default width is the 800 px of the story frame.
const meta: Meta<SkFilterToggleGroup> = {
  title: 'Mission/Filter toggle group',
  component: 'sk-filter-toggle-group',
  tags: ['autodocs'],
  args: { options: defaultOptions, value: 'all', label: groupLabel },
  render: (args) =>
    html`<sk-filter-toggle-group .options=${args.options} value=${args.value} label=${args.label}></sk-filter-toggle-group>`,
};

export default meta;
type Story = StoryObj<SkFilterToggleGroup>;

export const AllPressed: Story = { args: { value: 'all' } };

export const StalePressed: Story = { args: { value: 'stale' } };

export const LongLabels: Story = { args: { options: longLabelOptions, value: 'second' } };

// A 320 px-wide container: the six default options wrap onto rows without overflow. The visual gate requires the story's
// first element to be a custom element, so the width is set on the (block) host itself instead of on a wrapper div.
export const SixOptionsNarrow: Story = {
  args: { value: 'planned' },
  render: (args) =>
    html`<sk-filter-toggle-group
      ${ref((el) => (el as HTMLElement | undefined)?.style.setProperty('inline-size', '320px'))}
      .options=${args.options}
      value=${args.value}
      label=${args.label}
    ></sk-filter-toggle-group>`,
};
