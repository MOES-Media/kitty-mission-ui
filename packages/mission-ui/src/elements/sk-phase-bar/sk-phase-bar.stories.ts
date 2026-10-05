import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkPhaseBar } from './sk-phase-bar.js';
import { allPendingPhases, defaultPhases, sevenUnknownPhases, threeUnknownPhases } from './fixtures.js';

// Pattern element: no `@screen`. The visual gate's viewport is 800 px wide. Stories are driven from `args`.
const meta: Meta<SkPhaseBar> = {
  title: 'Mission/Phase bar',
  component: 'sk-phase-bar',
  tags: ['autodocs'],
  args: { phases: defaultPhases, labels: null, label: 'Mission phases' },
  render: (args) => html`<sk-phase-bar .phases=${args.phases} .labels=${args.labels} .label=${args.label}></sk-phase-bar>`,
};

export default meta;
type Story = StoryObj<SkPhaseBar>;

export const Default: Story = {};

export const AllPending: Story = { args: { phases: allPendingPhases } };

export const ThreeUnknown: Story = { args: { phases: threeUnknownPhases } };

export const SevenUnknown: Story = { args: { phases: sevenUnknownPhases } };
