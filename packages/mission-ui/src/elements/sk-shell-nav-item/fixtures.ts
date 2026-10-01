import type { ShellNavItem } from '../../shell-types.js';

// Synthetic navigation entries: no real project or mission data.
export const workPackagesItem: ShellNavItem = {
  id: 'work-packages',
  label: 'Work Packages',
  href: '#/work-packages',
  icon: 'work-packages',
};

export const artifactsItem: ShellNavItem = {
  id: 'artifacts',
  label: 'Artifacts',
  href: '#/artifacts',
  icon: 'artifacts',
};

export const longLabelItem: ShellNavItem = {
  id: 'long-label',
  label: 'Cross-repository dependency reconciliation and release readiness overview for the whole programme',
  href: '#/long-label',
  icon: 'pipeline',
};

// Same visible label, different ids: the emitted id (not the label) tells them apart.
export const sameLabelItems: ShellNavItem[] = [
  { id: 'overview-a', label: 'Overview', href: '#/a/overview', icon: 'file' },
  { id: 'overview-b', label: 'Overview', href: '#/b/overview', icon: 'folder' },
];
