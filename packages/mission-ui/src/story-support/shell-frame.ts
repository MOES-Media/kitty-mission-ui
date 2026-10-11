// Story-only helper: composes a story's content inside the accepted `sk-mission-shell`, so a screen baseline shows the
// frame the prototype shows around it. It is NOT part of the element manifest (it lives outside `src/elements/**` and
// `src/screens/**`), is not exported from `src/index.ts` and holds no behaviour of its own. Synthetic data only.
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import '@spec-kitty/elements';
import {
  missionNavItems,
  project as sampleProject,
  projectFooterItem,
  projectNavItems,
  railItems,
} from '../elements/sk-mission-shell/fixtures.js';
import type { ShellMission, ShellNavItem, ShellProject, TreeNode } from '../shell-types.js';

/** One `sk-shell-tree` section in the sidebar, for the stories whose host draws a tree (the Artifact Viewer). */
export interface ShellFrameTree {
  items: TreeNode[];
  current: string;
  /** The section title; default `Artifacts`. */
  heading?: string;
  /** The accessible name of the tree; default `Artifacts`. */
  label?: string;
}

export interface ShellFrameOptions {
  /** `project` frames the Missions screen, `mission` frames the Pipeline screen (rail plus mission sidebar), `picker` the top bar only. */
  layout?: 'project' | 'mission' | 'picker';
  /** The marked navigation item id; the default marks the screen the layout hosts. */
  current?: string;
  project?: ShellProject | null;
  /** `null` frames a screen that has no Mission to show (empty, loading, error): no Mission header and no progress footer. */
  mission?: ShellMission | null;
  /** `sk-mission-shell flush`: the screen pads its own inset parts (the Pipeline screen). */
  flush?: boolean;
  /** An optional sidebar tree (`items`, `current`); omitted, no tree is drawn and no existing baseline moves. */
  tree?: ShellFrameTree;
  /** The skip link text; the default `Skip to the content` is unchanged, the Artifact Viewer's stories pass `Skip to artifact`. */
  skipLink?: string;
}

// The prototype's gear icon, drawn locally: the library ships no icon set. The literal width/height/stroke-width are the
// shell stories' convention (`sk-mission-shell.stories.ts` `settingsIcon`, same markup): SVG presentation attributes in
// story-only markup, not project CSS, so the paint and size lint rules do not apply and no token exists for them.
const settingsIcon = html`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M21 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6-.7-2h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z"/></svg>`;

const frameProject: ShellProject = { eyebrow: 'Project', name: 'Sample Project', detail: 'main . 6 Missions' };

const frameMission: ShellMission = {
  title: 'Sample mission',
  id: 'sample-mission-01',
  tags: [
    { label: 'active', tone: 'success' },
    { label: 'lanes', tone: 'neutral' },
  ],
  backItem: { id: 'back-missions', label: 'All Missions', href: '#/missions', icon: 'back' },
  progress: { done: 3, total: 4, percentage: 68 },
};

/** Renders `content` in the shell's default slot, inside the project or mission frame. */
export function shellFrame(content: TemplateResult, options: ShellFrameOptions = {}): TemplateResult {
  const layout = options.layout ?? 'project';
  const navItems: ShellNavItem[] = layout === 'mission' ? missionNavItems : projectNavItems;
  const current = options.current ?? (layout === 'mission' ? 'nav-pipeline' : 'nav-missions');
  return html`<sk-mission-shell
    layout=${layout}
    ?flush=${options.flush === true}
    current=${current}
    rail-current=${layout === 'mission' ? 'rail-missions' : ''}
    status="ready"
    .navItems=${navItems}
    .footerItem=${layout === 'mission' ? null : projectFooterItem}
    .railItems=${layout === 'mission' ? railItems : []}
    .project=${layout === 'mission' ? null : (options.project ?? { ...sampleProject, ...frameProject })}
    .mission=${layout === 'mission' ? (options.mission === undefined ? frameMission : options.mission) : null}
  >
    <span slot="skip-link">${options.skipLink ?? 'Skip to the content'}</span>
    <sk-button slot="top-bar-actions" size="icon" variant="ghost" label="Settings">${settingsIcon}</sk-button>
    ${options.tree === undefined
      ? nothing
      : html`<sk-shell-tree
          slot="sidebar-section"
          .heading=${options.tree.heading ?? 'Artifacts'}
          label=${options.tree.label ?? 'Artifacts'}
          .items=${options.tree.items}
          current=${options.tree.current}
        ></sk-shell-tree>`}
    ${content}
  </sk-mission-shell>`;
}
