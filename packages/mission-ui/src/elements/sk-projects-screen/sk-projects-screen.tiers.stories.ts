import { html } from 'lit';
import type { TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { SKIP_LINK_TEXT } from '../../defaults/index.js';
import type { SkProjectsScreen } from './sk-projects-screen.js';
import { NOW, longEntries, rowErrorEntries, threeEntries } from './fixtures.js';

// The tiers of the Projects screen (PR-27 to PR-29) and the keyboard walk (PR-26). Every story is the screen inside the shell's
// `picker` layout, `flush`, in the dark theme. `vw-<n>` sets the viewport the visual spec uses (and asserts the shell tier);
// `tab-<n>` presses Tab n times before the shot. The screen's columns follow the CONTENT cell (CP-1, DP-25), not the viewport.
// Tags and args are literal on each story: Storybook's static indexer cannot see them through a helper. Baselines belong to the
// integration work package.
// The prototype's gear icon, story-only markup (the library ships no icon set).
const settingsIcon = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M21 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6-.7-2h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z"/></svg>`;
const frame = (content: TemplateResult): TemplateResult => html`<sk-mission-shell layout="picker" flush status="ready">
  <span slot="skip-link">${SKIP_LINK_TEXT}</span>
  <sk-button slot="top-bar-actions" size="icon" variant="ghost" label="Settings">${settingsIcon}</sk-button>
  ${content}
</sk-mission-shell>`;

const meta: Meta<SkProjectsScreen> = {
  title: 'Screens/Projects/Tiers',
  component: 'sk-projects-screen',
  parameters: { layout: 'fullscreen' },
  args: { status: 'ready', entries: threeEntries(), now: NOW, labels: null, errorMessage: '' },
  render: (args) =>
    frame(
      html`<sk-projects-screen status=${args.status} now=${args.now ?? ''} error-message=${args.errorMessage} .entries=${args.entries} .labels=${args.labels}></sk-projects-screen>`,
    ),
};

export default meta;
type Story = StoryObj<SkProjectsScreen>;

/** PR-27: the 1100 px viewport. The rows keep two columns and the header stays on one line; the picker has no sidebar to collapse. */
export const Tier1100: Story = { tags: ['vw-1100'] };

/** PR-28: the 800 px viewport. The page header stacks (the button under the copy) and the content padding reduces. */
export const Tier800: Story = { tags: ['vw-800'] };

/** PR-29: the 620 px viewport. Every row is one column, the side block is aligned to the start and the button keeps its size (DP-27). */
export const Tier620: Story = { tags: ['vw-620'] };

/** PR-29 with the long texts: no mid-word wrap and no horizontal overflow at the narrowest tier. */
export const LongTexts620: Story = { tags: ['vw-620'], args: { entries: longEntries() } };

/** PR-26: the keyboard walk. The ring is on the Retry control of the failed row (stops: the skip link, Settings, Open project, the first row, then Retry). */
export const FocusRetry1280: Story = { tags: ['vw-1280', 'tab-5'], args: { entries: rowErrorEntries() } };
