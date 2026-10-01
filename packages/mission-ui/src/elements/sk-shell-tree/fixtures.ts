import type { TreeNode } from '../../shell-types.js';

// Synthetic work packages and artifacts: no real project or mission data.
export const workPackageItems: TreeNode[] = [
  { id: 'wp-01', label: 'Foundation and tokens', href: '#/wp/01', kind: 'leaf', prefix: 'WP01', icon: 'work-packages', meta: 'done' },
  { id: 'wp-02', label: 'Library elements', href: '#/wp/02', kind: 'leaf', prefix: 'WP02', icon: 'work-packages', meta: 'review' },
  { id: 'wp-03', label: 'Shell tree', href: '#/wp/03', kind: 'leaf', prefix: 'WP03', icon: 'work-packages', meta: 'doing' },
  { id: 'wp-04', label: 'Responsive shell', kind: 'leaf', prefix: 'WP04', icon: 'work-packages', meta: 'planned', unavailable: true },
];

export const artifactItems: TreeNode[] = [
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

export const collapsedItems: TreeNode[] = [
  {
    id: 'art-contracts',
    label: 'Contracts',
    kind: 'folder',
    expanded: false,
    children: [
      { id: 'art-contracts-1', label: 'Shell contract', href: '#/artifacts/contracts/1', kind: 'leaf', icon: 'file' },
      { id: 'art-contracts-2', label: 'Tree contract', href: '#/artifacts/contracts/2', kind: 'leaf', icon: 'file' },
    ],
  },
  { id: 'art-notes', label: 'Notes', href: '#/artifacts/notes', kind: 'leaf', icon: 'file' },
];

export const longNameItems: TreeNode[] = [
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
