import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tag (the element module does not self-register).
import '../../index.js';
import type { SkMissionSample } from './sk-mission-sample.js';
import { exampleErrorMessage, exampleMission } from './fixtures.js';

// Stories are driven from `args` so the controls panel edits the rendered element; the API table comes from the
// committed custom-elements.json (see apps/storybook/.storybook/preview.ts).
const meta: Meta<SkMissionSample> = {
  title: 'Mission/Sample',
  component: 'sk-mission-sample',
  tags: ['autodocs'],
  args: { status: 'loading', mission: null, errorMessage: '' },
  render: (args) =>
    html`<sk-mission-sample
      .status=${args.status}
      .mission=${args.mission}
      .errorMessage=${args.errorMessage}
    ></sk-mission-sample>`,
};

export default meta;
type Story = StoryObj<SkMissionSample>;

export const Ready: Story = { args: { status: 'ready', mission: exampleMission } };

export const Empty: Story = { args: { status: 'empty' } };

export const Loading: Story = { args: { status: 'loading' } };

export const Error: Story = { args: { status: 'error', errorMessage: exampleErrorMessage } };
