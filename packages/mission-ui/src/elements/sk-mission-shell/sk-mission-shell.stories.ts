import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
// The package entry point registers the tags (the element modules do not self-register).
import '../../index.js';
import { exampleErrorMessage, exampleMission } from '../sk-mission-sample/fixtures.js';
import type { SkMissionShell } from './sk-mission-shell.js';
import type { ShellMission, ShellNavItem, ShellProject, TreeNode } from '../../shell-types.js';
import type { ViewState } from '../../view-state.js';
import {
  artifactsTree,
  artifactsTreeCollapsed,
  longMission,
  longProject,
  longTree,
  manyLeavesTree,
  missionArgs,
  projectArgs,
  statusArgs,
  workPackageTree,
} from './fixtures.js';

// Argument helpers for the stories below. The shell data itself lives in fixtures.ts (synthetic, no real project or
// mission data, no paths); these helpers only compose it into story args. They stay private to this file: Storybook
// turns every export of a stories file into a story, and a separate helper module would enter the element manifest.

/** One slotted `sk-shell-tree` section. */
interface ShellSection {
  heading: string;
  label: string;
  items: TreeNode[];
  current: string;
}

/** What a story renders inside the shell's content slot. */
type ContentKind = 'none' | 'ready' | 'loading' | 'empty' | 'error';

interface ShellStoryArgs {
  layout: 'project' | 'mission';
  status: ViewState;
  errorMessage: string;
  current: string;
  railCurrent: string;
  navItems: ShellNavItem[];
  footerItem: ShellNavItem | null;
  railItems: ShellNavItem[];
  project: ShellProject | null;
  mission: ShellMission | null;
  drawerOpen: boolean;
  flyoutOpen: boolean;
  sections: ShellSection[];
  content: ContentKind;
  skipLinkText: string;
  /** Product name slotted into the brand slot; empty keeps the "kitty desktop" fallback. */
  brandName: string;
}

// Rows whose destination does not exist yet read as unavailable through their meta text: the library row has no
// disabled state, so the text is what tells the reader (the tree also withholds the link).
const unavailableRows = (nodes: TreeNode[]): TreeNode[] =>
  nodes.map((node) =>
    node.id === 'wp-04' ? { ...node, href: '', meta: 'unavailable', unavailable: true } : node,
  );

const workPackageSection = (current: string): ShellSection => ({
  heading: 'Work Packages',
  label: 'Work packages',
  items: unavailableRows(workPackageTree),
  current,
});

const artifactsSection = (current: string, collapsed = false): ShellSection => ({
  heading: 'Artifacts',
  label: 'Artifacts',
  items: collapsed ? artifactsTreeCollapsed : artifactsTree,
  current,
});

const base: ShellStoryArgs = {
  ...projectArgs,
  drawerOpen: false,
  flyoutOpen: false,
  sections: [],
  content: 'ready',
  skipLinkText: 'Skip to the sample content',
  brandName: '',
};

/** Project layout, one destination (nav item id) marked. */
const project = (current: string, over: Partial<ShellStoryArgs> = {}): Partial<ShellStoryArgs> => ({
  ...base,
  current,
  ...over,
});

/** Mission layout (rail plus mission sidebar), with the given sections. */
const mission = (
  current: string,
  sections: ShellSection[] = [],
  over: Partial<ShellStoryArgs> = {},
): Partial<ShellStoryArgs> => ({
  ...base,
  ...missionArgs,
  current,
  sections,
  ...over,
});

const wpSelected = (): ShellSection[] => [workPackageSection('wp-03')];
const wpNone = (): ShellSection[] => [workPackageSection('')];
const artifactsExpanded = (): ShellSection[] => [artifactsSection('art-research-2')];
const artifactsCollapsed = (): ShellSection[] => [artifactsSection('', true)];

/** Shell status stories: the shell shows its own state and the content slot stays empty. */
const shellStatus = (status: ViewState): Partial<ShellStoryArgs> => ({
  ...statusArgs(status),
  content: 'none',
});

const longNames = (): Partial<ShellStoryArgs> =>
  mission('nav-work-packages', [{ heading: 'Work Packages', label: 'Work packages', items: longTree, current: 'leaf-long' }], {
    mission: longMission,
    project: longProject,
  });

/** A drawer long enough to scroll while the content does not. */
const manyLeaves = (): ShellSection[] => [
  { heading: 'Work Packages', label: 'Work packages', items: manyLeavesTree, current: 'many-3' },
];

// The shell is a screen: it renders full-bleed and its tier follows the window width. Every story carries a `vw-<n>`
// tag; the visual spec sets that viewport width and FAILS the story when the shell does not reflect the tier that
// width belongs to. `tab-<n>` presses Tab n times before the screenshot. Drawer and flyout stories open through the
// element's own `drawer-open` / `flyout-open` properties; there are no play functions and no timers.
type StoryArgs = SkMissionShell & ShellStoryArgs;

// The host's top-bar action (the prototype's settings gear), drawn locally: the library ships no icon set.
const settingsIcon = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M21 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6-.7-2h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z"/></svg>`;

function content(args: ShellStoryArgs): TemplateResult | undefined {
  if (args.content === 'none') return undefined;
  if (args.content === 'ready') return html`<sk-mission-sample status="ready" .mission=${exampleMission}></sk-mission-sample>`;
  if (args.content === 'error') {
    return html`<sk-mission-sample status="error" error-message=${exampleErrorMessage}></sk-mission-sample>`;
  }
  return html`<sk-mission-sample status=${args.content}></sk-mission-sample>`;
}

const meta: Meta<StoryArgs> = {
  title: 'Mission/Shell',
  component: 'sk-mission-shell',
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: project('nav-missions'),
  render: (args) =>
    html`<sk-mission-shell
      layout=${args.layout}
      current=${args.current}
      rail-current=${args.railCurrent}
      status=${args.status}
      error-message=${args.errorMessage}
      .navItems=${args.navItems}
      .footerItem=${args.footerItem}
      .railItems=${args.railItems}
      .project=${args.project}
      .mission=${args.mission}
      ?drawer-open=${args.drawerOpen}
      ?flyout-open=${args.flyoutOpen}
    >
      <span slot="skip-link">${args.skipLinkText}</span>
      ${args.brandName === '' ? nothing : html`<span slot="brand">${args.brandName}</span>`}
      <sk-button slot="top-bar-actions" size="icon" variant="ghost" label="Settings">${settingsIcon}</sk-button>
      ${args.sections.map(
        (section) =>
          html`<sk-shell-tree
            slot="sidebar-section"
            .heading=${section.heading}
            label=${section.label}
            .items=${section.items}
            current=${section.current}
          ></sk-shell-tree>`,
      )}
      ${content(args)}
    </sk-mission-shell>`,
};

export default meta;
type Story = StoryObj<StoryArgs>;

// Tags and args are literal on each story: Storybook's static indexer cannot see them through a helper call.

// Expanded tier (1280): rail, sidebar and content.
export const ProjectMissions1280: Story = { tags: ['vw-1280'], args: project('nav-missions') };
// The web dashboard host slots its own product name; the mark stays.
export const MissionDashboardBrand1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline', [], { brandName: 'kitty dashboard' }) };
export const ProjectDrift1280: Story = { tags: ['vw-1280'], args: project('nav-drift') };
export const ProjectOps1280: Story = { tags: ['vw-1280'], args: project('nav-ops') };
export const MissionPipeline1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline') };
export const MissionWorkPackageSelected1280: Story = { tags: ['vw-1280'], args: mission('nav-work-packages', wpSelected()) };
export const MissionWorkPackageNoneSelected1280: Story = { tags: ['vw-1280'], args: mission('nav-work-packages', wpNone()) };
export const MissionArtifactsFolderExpanded1280: Story = { tags: ['vw-1280'], args: mission('nav-artifacts', artifactsExpanded()) };
export const MissionArtifactsFolderCollapsed1280: Story = { tags: ['vw-1280'], args: mission('nav-artifacts', artifactsCollapsed()) };
export const ContentLoading1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline', [], { content: 'loading' }) };
export const ContentEmpty1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline', [], { content: 'empty' }) };
export const ContentError1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline', [], { content: 'error' }) };
export const ShellLoading1280: Story = { tags: ['vw-1280'], args: project('nav-missions', shellStatus('loading')) };
export const ShellError1280: Story = { tags: ['vw-1280'], args: project('nav-missions', shellStatus('error')) };
export const ShellEmpty1280: Story = { tags: ['vw-1280'], args: project('nav-missions', shellStatus('empty')) };
export const MissionShellError1280: Story = { tags: ['vw-1280'], args: mission('nav-pipeline', [], shellStatus('error')) };
export const SkipLinkFocused1280: Story = { tags: ['vw-1280', 'tab-1'], args: project('nav-missions') };
export const NavItemFocusVisible1280: Story = { tags: ['vw-1280', 'tab-4'], args: project('nav-missions') };
export const LongNames1280: Story = { tags: ['vw-1280'], args: longNames() };

// Collapsed tier (1024, 800): icon column, flyout on demand.
export const ProjectMissions1024: Story = { tags: ['vw-1024'], args: project('nav-missions') };
export const ProjectDrift1024: Story = { tags: ['vw-1024'], args: project('nav-drift') };
export const MissionPipeline1024: Story = { tags: ['vw-1024'], args: mission('nav-pipeline') };
export const MissionWorkPackageNoneSelected1024: Story = { tags: ['vw-1024'], args: mission('nav-work-packages', wpNone()) };
export const MissionArtifacts1024: Story = { tags: ['vw-1024'], args: mission('nav-artifacts', artifactsExpanded()) };
export const MissionShellError1024: Story = { tags: ['vw-1024'], args: mission('nav-pipeline', [], shellStatus('error')) };
export const ProjectShellLoading1024: Story = { tags: ['vw-1024'], args: project('nav-missions', shellStatus('loading')) };
export const LabelBubbleVisible1024: Story = { tags: ['vw-1024', 'tab-3'], args: project('nav-missions') };
export const FlyoutWorkPackages1024: Story = { tags: ['vw-1024'], args: mission('nav-work-packages', wpSelected(), { flyoutOpen: true }) };
export const FlyoutArtifacts1024: Story = { tags: ['vw-1024'], args: mission('nav-artifacts', artifactsExpanded(), { flyoutOpen: true }) };
export const ProjectMissions800: Story = { tags: ['vw-800'], args: project('nav-missions') };
export const ProjectOps800: Story = { tags: ['vw-800'], args: project('nav-ops') };
export const MissionArtifacts800: Story = { tags: ['vw-800'], args: mission('nav-artifacts', artifactsExpanded()) };

// Mobile tier (680, 390, 320): the sidebar lives in an overlay drawer opened from the top bar. 680 is mobile since the
// collapsed tier now starts at 720.
export const ProjectClosed680: Story = { tags: ['vw-680'], args: project('nav-missions') };
export const ProjectClosed390: Story = { tags: ['vw-390'], args: project('nav-missions') };
export const MissionClosed390: Story = { tags: ['vw-390'], args: mission('nav-pipeline') };
export const ProjectDrawerOpen390: Story = { tags: ['vw-390'], args: project('nav-missions', { drawerOpen: true }) };
export const MissionDrawerOpen390: Story = { tags: ['vw-390'], args: mission('nav-work-packages', wpSelected(), { drawerOpen: true }) };
export const MissionDrawerOpenLongTree390: Story = { tags: ['vw-390'], args: mission('nav-work-packages', manyLeaves(), { drawerOpen: true }) };
export const SkipLinkFocused390: Story = { tags: ['vw-390', 'tab-1'], args: project('nav-missions') };
export const ShellError390: Story = { tags: ['vw-390'], args: project('nav-missions', shellStatus('error')) };
export const MissionShellLoading390: Story = { tags: ['vw-390'], args: mission('nav-pipeline', [], shellStatus('loading')) };
export const ProjectClosed320: Story = { tags: ['vw-320'], args: project('nav-missions') };
export const MissionDrawerOpen320: Story = { tags: ['vw-320'], args: mission('nav-artifacts', artifactsExpanded(), { drawerOpen: true }) };

