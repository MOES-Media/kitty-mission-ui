// The single place custom elements are registered. Element modules do not self-register, so importing one (from a
// test, a story or another package) never throws on a duplicate definition; the guard makes this entry idempotent.
import { SkFilterToggleGroup } from './elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
import { SkMissionSample } from './elements/sk-mission-sample/sk-mission-sample.js';
import { SkMissionShell } from './elements/sk-mission-shell/sk-mission-shell.js';
import { SkPhaseBar } from './elements/sk-phase-bar/sk-phase-bar.js';
import { SkShellNavItem } from './elements/sk-shell-nav-item/sk-shell-nav-item.js';
import { SkShellTree } from './elements/sk-shell-tree/sk-shell-tree.js';
import { SkWorkPackageBoard } from './elements/sk-work-package-board/sk-work-package-board.js';

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
if (!customElements.get('sk-filter-toggle-group')) {
  customElements.define('sk-filter-toggle-group', SkFilterToggleGroup);
}
if (!customElements.get('sk-phase-bar')) {
  customElements.define('sk-phase-bar', SkPhaseBar);
}
if (!customElements.get('sk-work-package-board')) {
  customElements.define('sk-work-package-board', SkWorkPackageBoard);
}

export {
  SkFilterToggleGroup,
  SkMissionSample,
  SkMissionShell,
  SkPhaseBar,
  SkShellNavItem,
  SkShellTree,
  SkWorkPackageBoard,
};
export type { SkFilterChangeDetail } from './elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
export type { SkSelectWorkPackageDetail } from './elements/sk-work-package-board/sk-work-package-board.js';
export type {
  BadgeTone,
  FilterOption,
  LabelHooks,
  LaneGroup,
  PlacedCard,
  PlacedColumn,
  StateBadge,
} from './logic/types.js';
export type {
  MissionDetailView,
  MissionOverviewView,
  PageInfo,
  PhaseView,
  Project,
  WorkPackageView,
} from './contract/types.js';
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
