import { html } from 'lit';
import type { TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkShellNavItem } from './sk-shell-nav-item.js';
import { artifactsItem, longLabelItem, sameLabelItems, workPackagesItem } from './fixtures.js';

// Pattern element: no `@screen`. Stories are driven from `args`.
// The caption (a notice, not a pill, so it cannot be mistaken for the bubble) names the state under test. It is also the story's Inter-set text: the visual gate requires Inter to be
// loaded, and the row title is set in the display face, so without it no Inter text would be on screen.
function caption(args: Partial<SkShellNavItem>): TemplateResult {
  const mode = args.compact === true ? 'compact' : 'full';
  return html`<sk-notice tone="info">current: ${args.current === '' ? 'none' : args.current}, ${mode}</sk-notice>`;
}

const meta: Meta<SkShellNavItem> = {
  title: 'Mission/Shell nav item',
  component: 'sk-shell-nav-item',
  tags: ['autodocs'],
  args: {
    itemId: workPackagesItem.id,
    label: workPackagesItem.label,
    href: workPackagesItem.href,
    icon: workPackagesItem.icon,
    current: '',
    compact: false,
  },
  render: (args) =>
    html`<sk-shell-nav-item
      item-id=${args.itemId}
      .label=${args.label}
      href=${args.href}
      icon=${args.icon}
      current=${args.current}
      ?compact=${args.compact}
    ></sk-shell-nav-item>
      ${caption(args)}`,
};

export default meta;
type Story = StoryObj<SkShellNavItem>;

export const CurrentPage: Story = { args: { current: 'page' } };

export const CurrentTrue: Story = { args: { current: 'true' } };

export const NotCurrent: Story = { args: { itemId: artifactsItem.id, label: artifactsItem.label, href: artifactsItem.href, icon: artifactsItem.icon, current: '' } };

// The item itself is made as wide as the collapsed icon column (the rail width token) and the bubble is not shown at rest.
// The width is set through the DOM so no `style=` attribute appears in a template. WP04: the collapsed column must set
// `overflow: visible`, or the bubble is clipped.
export const CompactWithBubble: Story = {
  args: { current: 'page', compact: true },
  render: (args) =>
    html`<sk-shell-nav-item
      ${ref((el) => (el as HTMLElement | undefined)?.style.setProperty('inline-size', 'var(--sk-layout-personal-rail-width)'))}
      item-id=${args.itemId}
      .label=${args.label}
      href=${args.href}
      icon=${args.icon}
      current=${args.current}
      ?compact=${args.compact}
    ></sk-shell-nav-item>
      ${caption(args)}`,
};

export const LongLabel: Story = {
  args: { itemId: longLabelItem.id, label: longLabelItem.label, href: longLabelItem.href, icon: longLabelItem.icon, current: '' },
  render: (args) =>
    html`<sk-shell-nav-item
      ${ref((el) => (el as HTMLElement | undefined)?.style.setProperty('inline-size', 'var(--sk-layout-context-sidebar-width)'))}
      item-id=${args.itemId}
      .label=${args.label}
      href=${args.href}
      icon=${args.icon}
      current=${args.current}
    ></sk-shell-nav-item>
      ${caption(args)}`,
};

// Two entries with the same label are told apart by id, not by text.
export const SameLabelDifferentId: Story = {
  render: () =>
    html`${sameLabelItems.map(
        (item) =>
          html`<sk-shell-nav-item item-id=${item.id} .label=${item.label} href=${item.href} icon=${item.icon}></sk-shell-nav-item>`,
      )}
      <sk-notice tone="info">same label, ids ${sameLabelItems.map((item) => item.id).join(' and ')}</sk-notice>`,
};
