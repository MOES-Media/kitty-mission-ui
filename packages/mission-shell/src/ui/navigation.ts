// What the sidebar, the rail and the trees show, built from the snapshot (plan IC-06, R-02, R-18). Pure functions: no
// Svelte, no decisions about data. Every row carries `routeHref(destination)`; the elements emit `sk-navigate`, the shell never
// navigates its window.
import type { ShellIcon, ShellNavItem, TreeNode } from '@moes-media/mission-ui';
import type { ShellSnapshot } from '../controller/shell-controller';
import { routeHref, type Destination } from '../core/routes';
import { UI_COPY } from './copy';

export interface NavigationModel {
  readonly navItems: ShellNavItem[];
  readonly railItems: ShellNavItem[];
  readonly footerItem: ShellNavItem | null;
  readonly current: string;
  readonly railCurrent: string;
}

export interface TreeModel {
  readonly id: string;
  readonly heading: string;
  readonly items: TreeNode[];
  readonly current: string;
}

const item = (prefix: string, key: string, label: string, destination: Destination, icon: ShellIcon, pinned = false): ShellNavItem => ({
  id: `${prefix}-${key}`,
  label,
  href: routeHref(destination),
  icon,
  ...(pinned ? { pinned } : {}),
});

const NONE: NavigationModel = { navItems: [], railItems: [], footerItem: null, current: '', railCurrent: '' };

export function navigationOf(snapshot: ShellSnapshot): NavigationModel {
  const { destination, mode } = snapshot;
  const desktop = mode === 'desktop';
  const copy = UI_COPY.nav;
  switch (snapshot.layout) {
    case 'picker':
      return NONE;
    case 'project':
      return {
        navItems: [
          item('nav', 'missions', copy.missions, { screen: 'missions' }, 'missions'),
          item('nav', 'drift', copy.drift, { screen: 'drift' }, 'drift'),
          item('nav', 'ops', copy.ops, { screen: 'ops' }, 'ops'),
        ],
        railItems: [],
        footerItem: desktop ? item('nav', 'projects', copy.allProjects, { screen: 'projects' }, 'projects') : null,
        current: `nav-${destination.screen}`,
        railCurrent: '',
      };
    case 'mission': {
      const missionId = 'missionId' in destination ? destination.missionId : '';
      return {
        navItems: [
          item('nav', 'pipeline', copy.pipeline, { screen: 'pipeline', missionId }, 'pipeline'),
          item('nav', 'work-packages', copy.workPackages, { screen: 'work-packages', missionId }, 'work-packages'),
          item('nav', 'artifacts', copy.artifacts, { screen: 'artifacts', missionId }, 'artifacts'),
        ],
        railItems: [
          item('rail', 'missions', copy.missions, { screen: 'missions' }, 'missions'),
          item('rail', 'drift', copy.drift, { screen: 'drift' }, 'drift'),
          item('rail', 'ops', copy.ops, { screen: 'ops' }, 'ops'),
          ...(desktop ? [item('rail', 'projects', copy.projects, { screen: 'projects' }, 'projects', true)] : []),
        ],
        footerItem: null,
        current: `nav-${destination.screen}`,
        railCurrent: 'rail-missions',
      };
    }
  }
}

/** The tree of a folder row: an id no artifact path can equal (a path never ends with a slash). */
const folderId = (prefix: string): string => `${prefix}/`;

function artifactNodes(
  entries: readonly { path: string; readable: boolean }[],
  missionId: string,
  expanded: Readonly<Record<string, boolean>>,
  currentPath: string,
): TreeNode[] {
  const root: TreeNode[] = [];
  const folders = new Map<string, TreeNode>();
  for (const entry of entries) {
    const segments = entry.path.split('/');
    let siblings = root;
    let prefix = '';
    for (const segment of segments.slice(0, -1)) {
      prefix = prefix === '' ? segment : `${prefix}/${segment}`;
      let folder = folders.get(prefix);
      if (folder === undefined) {
        const id = folderId(prefix);
        folder = { id, label: segment, kind: 'folder', icon: 'folder', expanded: expanded[id] ?? currentPath.startsWith(id), children: [] };
        folders.set(prefix, folder);
        siblings.push(folder);
      }
      siblings = folder.children ?? [];
    }
    siblings.push({
      id: entry.path,
      label: segments.at(-1) ?? entry.path,
      href: routeHref({ screen: 'artifacts', missionId, path: entry.path }),
      kind: 'leaf',
      icon: 'file',
      ...(entry.readable ? {} : { unavailable: true }),
    });
  }
  return root;
}

/** The sidebar trees of the mission layout: the Work Package tree on Pipeline and Work Packages, the artifacts tree on Artifacts. */
export function treesOf(snapshot: ShellSnapshot): TreeModel[] {
  const { screen, destination } = snapshot;
  switch (screen.screen) {
    case 'pipeline':
    case 'work-packages': {
      if (screen.mission === null || !('missionId' in destination)) return [];
      const { missionId } = destination;
      const items: TreeNode[] = screen.mission.workPackages.map((wp) => ({
        id: wp.wpId,
        label: wp.title,
        href: routeHref({ screen: 'work-packages', missionId, wpId: wp.wpId }),
        kind: 'leaf',
        prefix: wp.wpId,
        icon: 'work-packages',
        ...(wp.statusLane === null ? {} : { meta: wp.statusLane }),
      }));
      return [{ id: 'work-packages', heading: UI_COPY.trees.workPackages, items, current: screen.screen === 'work-packages' ? (screen.wpId ?? '') : '' }];
    }
    case 'artifacts': {
      if (screen.listing === null || !('missionId' in destination)) return [];
      const items = artifactNodes(screen.listing.entries, destination.missionId, snapshot.session.expanded, screen.selectedPath);
      return [{ id: 'artifacts', heading: UI_COPY.trees.artifacts, items, current: screen.selectedPath }];
    }
    default:
      return [];
  }
}
