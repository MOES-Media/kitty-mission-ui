import type { ViewState } from './view-state.js';

/** Which regions the shell renders. `picker` is the top bar and one content column only, at every tier. */
export type ShellLayout = 'project' | 'mission' | 'picker';

/** Output only: derived from the window width by the shell, never accepted from a host. */
export type ShellTier = 'expanded' | 'collapsed' | 'mobile';

/** The closed set of icons drawn by `shell-icons.ts`. */
export type ShellIcon =
  | 'missions'
  | 'drift'
  | 'ops'
  | 'projects'
  | 'pipeline'
  | 'work-packages'
  | 'artifacts'
  | 'file'
  | 'folder'
  | 'magnifier'
  | 'table'
  | 'menu'
  | 'close'
  | 'back';

/** One navigation entry. `id` is unique across rail, navigation, footer and back link. */
export interface ShellNavItem {
  id: string;
  label: string;
  href: string;
  icon: ShellIcon;
  /** Puts a rail item in the bottom group. */
  pinned?: boolean;
}

/** `aria-current` value of a nav item or tree row. */
export type CurrentMark = 'page' | 'true' | '';

export interface ShellTag {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'attention' | 'danger';
}

/** Project sidebar head. */
export interface ShellProject {
  eyebrow: string;
  name: string;
  detail?: string;
}

/** Mission head and footer text. */
export interface ShellMission {
  title: string;
  id: string;
  tags: ShellTag[];
  backItem?: ShellNavItem;
  /** `percentage` is shown verbatim when finite (FR-033); otherwise the footer derives its figure from done and total. */
  progress?: { done: number; total: number; percentage?: number };
}

/** Folders have `children` and no `href`. */
export interface TreeNode {
  id: string;
  label: string;
  href?: string;
  kind: 'leaf' | 'folder';
  prefix?: string;
  icon?: ShellIcon;
  meta?: string;
  unavailable?: boolean;
  expanded?: boolean;
  children?: TreeNode[];
}

/** The shell's own data state: loading, error, empty or ready. */
export type ShellStatus = ViewState;

export type DrawerReason = 'hamburger' | 'close' | 'escape' | 'backdrop' | 'navigate' | 'resize' | 'host';

export type FlyoutReason = 'activate' | 'escape' | 'outside' | 'navigate' | 'tier';

/** Payload of `sk-navigate`. */
export interface ShellNavigateDetail {
  id: string;
  href: string;
}

/** Payload of `sk-tree-toggle`: the requested folder state. */
export interface TreeToggleDetail {
  id: string;
  expanded: boolean;
}

/** Payload of `sk-toggle-drawer` (cancelable). */
export interface ToggleDrawerDetail {
  open: boolean;
  reason: DrawerReason;
}

/** Payload of `sk-toggle-flyout` (cancelable). */
export interface ToggleFlyoutDetail {
  open: boolean;
  reason: FlyoutReason;
}

/** Payload of `sk-shell-retry`: always an empty object. */
export type ShellRetryDetail = Record<string, never>;
