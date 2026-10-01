// The single place custom elements are registered. Element modules do not self-register, so importing one (from a
// test, a story or another package) never throws on a duplicate definition; the guard makes this entry idempotent.
import { SkMissionSample } from './elements/sk-mission-sample/sk-mission-sample.js';
import { SkMissionShell } from './elements/sk-mission-shell/sk-mission-shell.js';
import { SkShellNavItem } from './elements/sk-shell-nav-item/sk-shell-nav-item.js';
import { SkShellTree } from './elements/sk-shell-tree/sk-shell-tree.js';

if (!customElements.get('sk-mission-sample')) {
  customElements.define('sk-mission-sample', SkMissionSample);
}
if (!customElements.get('sk-mission-shell')) {
  customElements.define('sk-mission-shell', SkMissionShell);
}
if (!customElements.get('sk-shell-nav-item')) {
  customElements.define('sk-shell-nav-item', SkShellNavItem);
}
if (!customElements.get('sk-shell-tree')) {
  customElements.define('sk-shell-tree', SkShellTree);
}

export { SkMissionSample, SkMissionShell, SkShellNavItem, SkShellTree };
export type { SkMissionOpenDetail, SkMissionRetryDetail } from './elements/sk-mission-sample/sk-mission-sample.js';
export type { MissionSummary, ViewState } from './view-state.js';
export type {
  CurrentMark,
  DrawerReason,
  FlyoutReason,
  ShellIcon,
  ShellLayout,
  ShellMission,
  ShellNavItem,
  ShellNavigateDetail,
  ShellProject,
  ShellRetryDetail,
  ShellStatus,
  ShellTag,
  ShellTier,
  ToggleDrawerDetail,
  ToggleFlyoutDetail,
  TreeNode,
  TreeToggleDetail,
} from './shell-types.js';
