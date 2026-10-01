import type { ShellMission, ShellNavItem, ShellProject, TreeNode } from '../../shell-types.js';
import type { ViewState } from '../../view-state.js';

// Synthetic shell data for every state in the matrix: no real project or mission data, no paths.

/** Global rail (mission layout): the pinned item sits in the bottom group. */
export const railItems: ShellNavItem[] = [
  { id: 'rail-missions', label: 'Missions', href: '#/missions', icon: 'missions' },
  { id: 'rail-drift', label: 'Drift', href: '#/drift', icon: 'drift' },
  { id: 'rail-ops', label: 'Ops', href: '#/ops', icon: 'ops' },
  { id: 'rail-projects', label: 'Projects', href: '#/projects', icon: 'projects', pinned: true },
];

export const projectNavItems: ShellNavItem[] = [
  { id: 'nav-missions', label: 'Missions', href: '#/missions', icon: 'missions' },
  { id: 'nav-drift', label: 'Drift', href: '#/drift', icon: 'drift' },
  { id: 'nav-ops', label: 'Ops', href: '#/ops', icon: 'ops' },
];

export const projectFooterItem: ShellNavItem = { id: 'nav-projects', label: 'All projects', href: '#/projects', icon: 'projects' };

export const missionNavItems: ShellNavItem[] = [
  { id: 'nav-pipeline', label: 'Pipeline', href: '#/pipeline', icon: 'pipeline' },
  { id: 'nav-work-packages', label: 'Work Packages', href: '#/work-packages', icon: 'work-packages' },
  { id: 'nav-artifacts', label: 'Artifacts', href: '#/artifacts', icon: 'artifacts' },
];

export const project: ShellProject = { eyebrow: 'Project', name: 'Sample Project', detail: 'Synthetic data' };

export const mission: ShellMission = {
  title: 'Sample mission',
  id: 'sample-mission-01',
  tags: [
    { label: 'software-dev', tone: 'info' },
    { label: 'in review', tone: 'attention' },
  ],
  backItem: { id: 'back-missions', label: 'Missions', href: '#/missions', icon: 'back' },
  progress: { done: 3, total: 6 },
};

export const workPackageTree: TreeNode[] = [
  { id: 'wp-01', label: 'Foundation and tokens', href: '#/wp/01', kind: 'leaf', prefix: 'WP01', icon: 'work-packages', meta: 'done' },
  { id: 'wp-02', label: 'Library elements', href: '#/wp/02', kind: 'leaf', prefix: 'WP02', icon: 'work-packages', meta: 'review' },
  { id: 'wp-03', label: 'Shell tree', href: '#/wp/03', kind: 'leaf', prefix: 'WP03', icon: 'work-packages', meta: 'doing' },
  { id: 'wp-04', label: 'Responsive shell', href: '#/wp/04', kind: 'leaf', prefix: 'WP04', icon: 'work-packages', meta: 'planned' },
];

export const artifactsTree: TreeNode[] = [
  { id: 'art-spec', label: 'Specification', href: '#/artifacts/spec', kind: 'leaf', icon: 'file' },
  {
    id: 'art-research',
    label: 'Research',
    kind: 'folder',
    expanded: true,
    children: [
      { id: 'art-research-1', label: 'Layout options', href: '#/artifacts/research/1', kind: 'leaf', icon: 'file' },
      { id: 'art-research-2', label: 'Tier breakpoints', href: '#/artifacts/research/2', kind: 'leaf', icon: 'file' },
    ],
  },
  { id: 'art-plan', label: 'Plan', href: '#/artifacts/plan', kind: 'leaf', icon: 'file' },
];

export const artifactsTreeCollapsed: TreeNode[] = artifactsTree.map((node) =>
  node.kind === 'folder' ? { ...node, expanded: false } : node,
);

// Unbroken names: they must wrap inside the head and the tree instead of widening the column.
export const longProject: ShellProject = {
  eyebrow: 'Project',
  name: 'Cross-repository-dependency-reconciliation-and-release-readiness-programme-for-the-whole-organisation',
  detail: 'A-long-unbroken-detail-line-that-has-no-spaces-to-break-on-at-all-whatsoever',
};

export const longMission: ShellMission = {
  title: 'A-mission-title-that-is-one-single-unbroken-word-which-keeps-going-and-going-past-any-sidebar-width',
  id: 'mission-with-a-very-long-identifier-that-also-does-not-break-anywhere-01M3V82X',
  tags: [{ label: 'a-tag-with-a-long-unbroken-label-in-it', tone: 'neutral' }],
  backItem: { id: 'back-missions', label: 'Missions', href: '#/missions', icon: 'back' },
  progress: { done: 1, total: 12 },
};

export const longTree: TreeNode[] = [
  {
    id: 'wp-long',
    label: 'Cross-repository-dependency-reconciliation-and-release-readiness-overview-for-the-whole-programme',
    href: '#/wp/long',
    kind: 'leaf',
    prefix: 'WP99',
    icon: 'work-packages',
    meta: 'in-progress-with-a-long-status',
  },
  {
    id: 'folder-long',
    label: 'A folder whose name is also long enough to need wrapping inside the sidebar width',
    kind: 'folder',
    expanded: true,
    children: [
      { id: 'leaf-long', label: 'Another-very-long-unbroken-artifact-name-with-no-spaces-at-all-to-wrap-on.md', href: '#/artifacts/long', kind: 'leaf', icon: 'file' },
    ],
  },
];

// Many leaves, for the story where the drawer scrolls and the content does not.
export const manyLeavesTree: TreeNode[] = Array.from({ length: 40 }, (_, index) => ({
  id: `many-${index + 1}`,
  label: `Synthetic work package number ${index + 1}`,
  href: `#/wp/many-${index + 1}`,
  kind: 'leaf' as const,
  prefix: `WP${String(index + 1).padStart(2, '0')}`,
  icon: 'work-packages' as const,
}));

export interface ShellFixtureArgs {
  layout: 'project' | 'mission';
  status: ViewState;
  current: string;
  railCurrent: string;
  errorMessage: string;
}

/** Argument helper per status; spread it into a story's args next to the layout data. */
export function statusArgs(status: ViewState, errorMessage = ''): Pick<ShellFixtureArgs, 'status' | 'errorMessage'> {
  return { status, errorMessage: status === 'error' && errorMessage === '' ? 'The mission could not be loaded.' : errorMessage };
}

export const projectArgs = {
  layout: 'project' as const,
  navItems: projectNavItems,
  footerItem: projectFooterItem,
  project,
  mission: null,
  railItems: [] as ShellNavItem[],
  current: 'nav-missions',
  railCurrent: '',
  ...statusArgs('ready'),
};

export const missionArgs = {
  layout: 'mission' as const,
  navItems: missionNavItems,
  footerItem: null,
  project: null,
  mission,
  railItems,
  current: 'nav-pipeline',
  railCurrent: 'rail-missions',
  ...statusArgs('ready'),
};
