// The single place custom elements are registered. Element modules do not self-register, so importing one (from a
// test, a story or another package) never throws on a duplicate definition; the guard makes this entry idempotent.
import { SkArtifactScreen } from './elements/sk-artifact-screen/sk-artifact-screen.js';
import { SkDriftScreen } from './elements/sk-drift-screen/sk-drift-screen.js';
import { SkFilterToggleGroup } from './elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
import { SkMissionSample } from './elements/sk-mission-sample/sk-mission-sample.js';
import { SkMissionShell } from './elements/sk-mission-shell/sk-mission-shell.js';
import { SkOpenProjectDialog } from './elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { SkMissionsScreen } from './elements/sk-missions-screen/sk-missions-screen.js';
import { SkOpsScreen } from './elements/sk-ops-screen/sk-ops-screen.js';
import { SkPhaseBar } from './elements/sk-phase-bar/sk-phase-bar.js';
import { SkPipelineScreen } from './elements/sk-pipeline-screen/sk-pipeline-screen.js';
import { SkProjectsScreen } from './elements/sk-projects-screen/sk-projects-screen.js';
import { SkShellNavItem } from './elements/sk-shell-nav-item/sk-shell-nav-item.js';
import { SkShellTree } from './elements/sk-shell-tree/sk-shell-tree.js';
import { SkWorkPackageBoard } from './elements/sk-work-package-board/sk-work-package-board.js';
import { SkWorkPackageScreen } from './elements/sk-work-package-screen/sk-work-package-screen.js';

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
if (!customElements.get('sk-missions-screen')) {
  customElements.define('sk-missions-screen', SkMissionsScreen);
}
if (!customElements.get('sk-ops-screen')) {
  customElements.define('sk-ops-screen', SkOpsScreen);
}
if (!customElements.get('sk-pipeline-screen')) {
  customElements.define('sk-pipeline-screen', SkPipelineScreen);
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
if (!customElements.get('sk-work-package-screen')) {
  customElements.define('sk-work-package-screen', SkWorkPackageScreen);
}
if (!customElements.get('sk-projects-screen')) {
  customElements.define('sk-projects-screen', SkProjectsScreen);
}
if (!customElements.get('sk-open-project-dialog')) {
  customElements.define('sk-open-project-dialog', SkOpenProjectDialog);
}
if (!customElements.get('sk-artifact-screen')) {
  customElements.define('sk-artifact-screen', SkArtifactScreen);
}
if (!customElements.get('sk-drift-screen')) {
  customElements.define('sk-drift-screen', SkDriftScreen);
}

export {
  SkArtifactScreen,
  SkDriftScreen,
  SkFilterToggleGroup,
  SkMissionSample,
  SkMissionShell,
  SkMissionsScreen,
  SkOpenProjectDialog,
  SkOpsScreen,
  SkPhaseBar,
  SkPipelineScreen,
  SkProjectsScreen,
  SkShellNavItem,
  SkShellTree,
  SkWorkPackageBoard,
  SkWorkPackageScreen,
};
export { SHELL_MOBILE_STATE, ShellTierController } from './shell-tier.js';
export { buildArtifactTree, pathOfArtifactNode } from './logic/artifact-tree.js';
export type { ArtifactTreeOptions, ArtifactTreeResult } from './logic/artifact-tree.js';
export type {
  ArtifactContentStatus,
  ArtifactLabelHooks,
  ArtifactScreenMission,
  ArtifactScreenWorkPackage,
  ArtifactStatus,
  ArtifactTab,
  ArtifactVocabulary,
} from './logic/artifact-types.js';
export type { SkArtifactRetryLoadDetail, SkOpenLinkDetail, SkSelectArtifactDetail } from './elements/sk-artifact-screen/sk-artifact-screen.js';
export type { DriftRetryDetail, OpsPageRetryDetail, RetryLoadDetail, RetryLoadEventDetail, SkArtifactRetryDetail } from './retry-types.js';
export type {
  DriftCopyResult,
  DriftScreenStatus,
  SkCopyCommandDetail,
  SkDriftRetryLoadDetail,
  SkRescanDriftDetail,
  SkSelectFindingDetail,
} from './elements/sk-drift-screen/sk-drift-screen.js';
export type { SkFilterChangeDetail } from './elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
export type { SkLoadMoreDetail, SkOpenMissionDetail, SkSearchDetail } from './elements/sk-missions-screen/sk-missions-screen.js';
export type { SkBrowseFolderDetail, SkConfirmOpenProjectDetail } from './elements/sk-open-project-dialog/sk-open-project-dialog.js';
export type { SkOpenProjectDetail } from './elements/sk-projects-screen/sk-projects-screen.js';
export type { FolderEntry, FolderKind, ProjectEntry, ProjectEntryState, ProjectLabelHooks } from './project-types.js';
export type { ProjectView } from './contract/types.js';
export type { OpsLoadMoreError, OpsScreenStatus, SkOpsRetryLoadDetail } from './elements/sk-ops-screen/sk-ops-screen.js';
export type { SkOpenMissionsDetail, SkViewArtifactsDetail } from './elements/sk-pipeline-screen/sk-pipeline-screen.js';
export type { SkSelectWorkPackageDetail } from './elements/sk-work-package-board/sk-work-package-board.js';
export type {
  DetailStatus,
  SkOpenArtifactDetail,
  SkRetryLoadDetail,
  WpScreenMission,
  WpScreenStatus,
} from './elements/sk-work-package-screen/sk-work-package-screen.js';
export type {
  BadgeTone,
  FilterOption,
  LabelHooks,
  LaneGroup,
  StateBadge,
} from './logic/types.js';
export type {
  ArtifactContentView,
  ArtifactEntryView,
  ArtifactListingView,
  DriftFinding,
  DriftFindingKey,
  DriftFindingView,
  DriftMissionName,
  DriftRefusal,
  DriftRefusalCode,
  DriftReport,
  DriftReportView,
  LaneComparisonView,
  MissionDetailView,
  MissionOverviewView,
  OpsEvidenceView,
  OpsInvocationView,
  PageInfo,
  PhaseView,
  Project,
  WorkPackageDetailView,
  WorkPackageRecordView,
  WorkPackageView,
} from './contract/types.js';
export type { SkMissionRetryDetail } from './elements/sk-mission-sample/sk-mission-sample.js';
export type { OpsEvidenceDisplay, OpsFact, OpsFactKind, OpsLabelHooks, OpsRowView } from './logic/index.js';
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
