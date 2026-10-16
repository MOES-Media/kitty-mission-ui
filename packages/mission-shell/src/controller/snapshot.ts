// The controller's immutable view model and the pure function that builds it from the slots (WP03). The view (WP06)
// renders only from this; every status word is typed against the screens' own vocabularies. No Svelte, no I/O.
import type { Ok, ConnectionState } from '../client/port';
import type {
  ArtifactContentStatus,
  ArtifactStatus,
  DetailStatus,
  DriftCopyResult,
  DriftFindingKey,
  DriftScreenStatus,
  FolderEntry,
  OpsLoadMoreError,
  OpsScreenStatus,
  ProjectEntry,
  ShellMission,
  ShellProject,
  ViewState,
  WpScreenStatus,
} from '@moes-media/mission-ui';
import { bannerCopy, SHELL_COPY, type BannerText, type ConnectionCondition, type ShellCopyOverrides } from '../core/connection';
import type { ResourceKey } from '../core/displayed';
import { LAYOUT, routeHref, type Destination, type Layout, type ShellMode } from '../core/routes';

/** What the builder reads of a slot: the value, the EFFECTIVE view (loading/degraded rules applied) and the refusal. */
export interface SlotRead {
  readonly value: unknown;
  readonly view: string;
  readonly refusal: unknown;
}

export interface ConnectionSnapshot {
  readonly state: ConnectionState | null;
  readonly condition: ConnectionCondition | null;
  readonly copy: BannerText | null;
  readonly refused: boolean;
}

export interface ChromeSnapshot {
  readonly status: ViewState;
  readonly errorMessage: string;
  readonly project: ShellProject | null;
  readonly mission: ShellMission | null;
}

export interface SessionSnapshot {
  /** Folder id to expanded, for the Mission of the current destination. */
  readonly expanded: Readonly<Record<string, boolean>>;
  readonly drawerOpen: boolean;
  readonly flyoutOpen: boolean;
}

type Project = Ok<'getProject'>;
type MissionDetail = Ok<'getMission'>;

export interface MissionsScreen {
  readonly screen: 'missions';
  readonly status: ViewState;
  readonly errorMessage: string;
  readonly project: Project | null;
  readonly missions: Ok<'listMissions'>['items'];
  readonly pageInfo: Ok<'listMissions'>['pageInfo'] | null;
  readonly loadingMore: boolean;
  readonly query: string;
  readonly filter: string;
}

export interface DriftScreen {
  readonly screen: 'drift';
  readonly status: DriftScreenStatus;
  readonly errorMessage: string;
  readonly missionId: string | undefined;
  readonly report: Ok<'getDriftReport'> | null;
  readonly refusalCode: string | null;
  readonly missions: Readonly<Record<string, Ok<'listMissions'>['items'][number]>> | null;
  readonly rescanning: boolean;
  readonly selectedFinding: DriftFindingKey | null;
  readonly copyResult: DriftCopyResult | null;
}

export interface OpsScreen {
  readonly screen: 'ops';
  readonly status: OpsScreenStatus;
  readonly errorMessage: string;
  readonly refusalCode: string | null;
  readonly project: Project | null;
  readonly items: Ok<'listOpsInvocations'>['items'];
  readonly pageInfo: Ok<'listOpsInvocations'>['pageInfo'] | null;
  readonly totalCount: number;
  readonly skippedCount: number;
  readonly profile: string | null;
  readonly loadingMore: boolean;
  readonly loadMoreError: OpsLoadMoreError | null;
}

export interface PipelineScreen {
  readonly screen: 'pipeline';
  readonly status: ViewState;
  readonly errorMessage: string;
  readonly mission: MissionDetail | null;
}

export interface WorkPackagesScreen {
  readonly screen: 'work-packages';
  readonly status: WpScreenStatus;
  readonly errorMessage: string;
  readonly wpId: string | undefined;
  readonly mission: MissionDetail | null;
  readonly workPackage: Ok<'getWorkPackage'> | null;
  readonly detail: Ok<'getWorkPackageDetail'> | null;
  readonly detailStatus: DetailStatus;
  readonly detailRefusalCode: string | null;
}

export interface ArtifactsScreen {
  readonly screen: 'artifacts';
  readonly status: ArtifactStatus;
  readonly errorMessage: string;
  readonly selectedPath: string;
  readonly mission: MissionDetail | null;
  readonly workPackages: MissionDetail['workPackages'];
  readonly listing: Ok<'listArtifacts'> | null;
  readonly content: Ok<'getArtifactContent'> | null;
  readonly contentStatus: ArtifactContentStatus;
  readonly refusalCode: string | null;
}

/** The open-project dialog's properties, by the element's own names (desktop picker only). */
export interface DialogModel {
  readonly open: boolean;
  readonly location: string;
  readonly folders: readonly FolderEntry[];
  readonly selected: string | null;
  readonly status: ViewState;
}

/** The desktop picker, filled from the host (FR-014); the properties are those of `sk-projects-screen`. */
export interface ProjectsScreen {
  readonly screen: 'projects';
  readonly status: ViewState;
  readonly entries: readonly ProjectEntry[];
  readonly dialog: DialogModel;
}

/** The picker's session state as the controller holds it. */
export interface PickerState {
  readonly status: ViewState;
  readonly entries: readonly ProjectEntry[];
  readonly dialog: DialogModel;
}

export type ScreenModel = MissionsScreen | DriftScreen | OpsScreen | PipelineScreen | WorkPackagesScreen | ArtifactsScreen | ProjectsScreen;

export interface ShellSnapshot {
  readonly mode: ShellMode;
  readonly destination: Destination;
  readonly layout: Layout;
  readonly chrome: ChromeSnapshot;
  readonly screen: ScreenModel;
  readonly connection: ConnectionSnapshot;
  readonly session: SessionSnapshot;
  readonly copyResult: DriftCopyResult | null;
  /** Whether the top bar shows Refresh: the Artifact and Ops destinations only (FR-016). */
  readonly showRefresh: boolean;
  /** The clock at the time the latest result was applied; `null` before any. */
  readonly now: string | null;
}

export interface SnapshotInput {
  readonly mode: ShellMode;
  readonly destination: Destination;
  readonly read: (key: ResourceKey) => SlotRead;
  readonly loadingMore: (key: ResourceKey) => boolean;
  readonly loadMoreError: (key: ResourceKey) => OpsLoadMoreError | null;
  readonly rescanning: (key: ResourceKey) => boolean;
  readonly connectionState: ConnectionState | null;
  readonly condition: ConnectionCondition | null;
  readonly refused: boolean;
  readonly copyOverrides: ShellCopyOverrides;
  readonly query: string;
  readonly filter: string;
  readonly selectedFinding: DriftFindingKey | null;
  readonly expanded: Readonly<Record<string, boolean>>;
  readonly drawerOpen: boolean;
  readonly flyoutOpen: boolean;
  readonly copyResult: DriftCopyResult | null;
  readonly now: string | null;
  readonly picker: PickerState;
  /** A dashboard without a client: the project layout shows the shell error "No project is open.". */
  readonly noProject: boolean;
}

const NO_FOLDERS: Readonly<Record<string, boolean>> = Object.freeze({});

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null && name in value ? (value as Record<string, unknown>)[name] : undefined;
}

/** The refusal's `code`, when the refusal carries one. */
export function refusalCodeOf(refusal: unknown): string | null {
  const code = field(field(refusal, 'body'), 'code');
  return typeof code === 'string' ? code : null;
}

const viewState = (view: string): ViewState => {
  switch (view) {
    case 'ready':
    case 'empty':
    case 'error':
      return view;
    case 'not-found':
    case 'refused':
      return 'error';
    default:
      return 'loading';
  }
};

const present = <T>(read: SlotRead): T | null => (read.value === undefined ? null : (read.value as T));

function pagesOf(read: SlotRead): readonly { items: unknown[]; pageInfo: unknown }[] {
  return Array.isArray(read.value) ? (read.value as { items: unknown[]; pageInfo: unknown }[]) : [];
}

function wpStatus(view: string): WpScreenStatus {
  switch (view) {
    case 'ready':
    case 'empty':
    case 'error':
    case 'not-found':
      return view;
    default:
      return 'loading';
  }
}

function detailStatus(view: string): DetailStatus {
  switch (view) {
    case 'ready':
    case 'error':
    case 'not-found':
      return view;
    default:
      return 'loading';
  }
}

function driftStatus(view: string): DriftScreenStatus {
  switch (view) {
    case 'ready':
    case 'empty':
    case 'error':
    case 'not-found':
      return view;
    default:
      return 'loading';
  }
}

function artifactStatus(view: string): ArtifactStatus {
  switch (view) {
    case 'ready':
    case 'empty':
    case 'error':
    case 'not-found':
      return view;
    default:
      return 'loading';
  }
}

function contentStatus(view: string): ArtifactContentStatus {
  switch (view) {
    case 'ready':
    case 'refused':
    case 'error':
      return view;
    default:
      return 'loading';
  }
}

function opsStatus(view: string): OpsScreenStatus {
  return viewState(view);
}

/** The generic message for a read that failed without a refusal code to show (screens with a refusal property show theirs). */
const errorText = (status: string, code: string | null): string => (status === 'error' && code === null ? SHELL_COPY.readFailed : '');

function missionHead(read: SlotRead): ShellMission | null {
  const mission = read.value;
  if (mission === undefined) return null;
  const friendly = field(mission, 'friendlyName');
  const slugValue = field(mission, 'slug');
  const slug = typeof slugValue === 'string' ? slugValue : '';
  const type = field(mission, 'missionType');
  return {
    title: typeof friendly === 'string' && friendly !== '' ? friendly : slug,
    id: slug,
    tags: typeof type === 'string' ? [{ label: type, tone: 'neutral' }] : [],
    backItem: { id: 'back-missions', label: SHELL_COPY.backToMissions, href: routeHref({ screen: 'missions' }), icon: 'back' },
  };
}

function chromeOf(input: SnapshotInput): ChromeSnapshot {
  const { destination, read } = input;
  switch (LAYOUT[destination.screen]) {
    case 'picker':
      return { status: 'ready', errorMessage: '', project: null, mission: null };
    case 'project': {
      if (input.noProject) return { status: 'error', errorMessage: SHELL_COPY.noProjectOpen, project: null, mission: null };
      const slot = read({ kind: 'project' });
      const name = field(slot.value, 'name');
      const status = viewState(slot.view);
      return {
        status,
        errorMessage: status === 'error' ? SHELL_COPY.chromeError : '',
        project: typeof name === 'string' ? { eyebrow: SHELL_COPY.projectEyebrow, name } : null,
        mission: null,
      };
    }
    case 'mission': {
      const missionId = 'missionId' in destination ? destination.missionId : '';
      const slot = read({ kind: 'mission', missionId });
      const status = viewState(slot.view);
      return {
        status,
        errorMessage: status === 'error' ? SHELL_COPY.chromeError : '',
        project: null,
        mission: missionHead(slot),
      };
    }
  }
}

function screenOf(input: SnapshotInput): ScreenModel {
  const { destination, read } = input;
  switch (destination.screen) {
    case 'missions': {
      const key: ResourceKey = { kind: 'missions' };
      const slot = read(key);
      const pages = pagesOf(slot);
      const status = viewState(slot.view);
      return {
        screen: 'missions',
        status,
        errorMessage: errorText(status, null),
        project: present(read({ kind: 'project' })),
        missions: pages.flatMap((page) => page.items) as MissionsScreen['missions'],
        pageInfo: (pages.at(-1)?.pageInfo ?? null) as MissionsScreen['pageInfo'],
        loadingMore: input.loadingMore(key),
        query: input.query,
        filter: input.filter,
      };
    }
    case 'drift': {
      const key: ResourceKey = destination.missionId === undefined ? { kind: 'drift' } : { kind: 'drift', missionId: destination.missionId };
      const slot = read(key);
      const names = pagesOf(read({ kind: 'mission-names' }));
      const code = refusalCodeOf(slot.refusal);
      const status = driftStatus(slot.view);
      const lookup: Record<string, Ok<'listMissions'>['items'][number]> = {};
      for (const page of names) for (const item of page.items as Ok<'listMissions'>['items']) lookup[item.missionId] = item;
      return {
        screen: 'drift',
        status,
        errorMessage: errorText(status, code),
        missionId: destination.missionId,
        report: present(slot),
        refusalCode: code,
        missions: names.length === 0 ? null : lookup,
        rescanning: input.rescanning(key),
        selectedFinding: input.selectedFinding,
        copyResult: input.copyResult,
      };
    }
    case 'ops': {
      const key: ResourceKey = { kind: 'ops' };
      const slot = read(key);
      const pages = pagesOf(slot);
      const last = pages.at(-1);
      const code = refusalCodeOf(slot.refusal);
      const status = opsStatus(slot.view);
      const count = (name: string): number => {
        const value = field(last, name);
        return typeof value === 'number' ? value : 0;
      };
      return {
        screen: 'ops',
        status,
        errorMessage: errorText(status, code),
        refusalCode: code,
        project: present(read({ kind: 'project' })),
        items: pages.flatMap((page) => page.items) as OpsScreen['items'],
        pageInfo: (last?.pageInfo ?? null) as OpsScreen['pageInfo'],
        totalCount: count('totalCount'),
        skippedCount: count('skippedCount'),
        profile: null,
        loadingMore: input.loadingMore(key),
        loadMoreError: input.loadMoreError(key),
      };
    }
    case 'pipeline': {
      const slot = read({ kind: 'mission', missionId: destination.missionId });
      const status = viewState(slot.view);
      return {
        screen: 'pipeline',
        status,
        errorMessage: slot.view === 'not-found' ? SHELL_COPY.missionNotFound : errorText(status, null),
        mission: present(slot),
      };
    }
    case 'work-packages': {
      const { missionId, wpId } = destination;
      const missionSlot = read({ kind: 'mission', missionId });
      const mission = present<MissionDetail>(missionSlot);
      const base = { screen: 'work-packages', wpId, mission } as const;
      if (wpId === undefined) {
        const word = wpStatus(missionSlot.view);
        const status: WpScreenStatus = word === 'ready' || word === 'empty' ? 'nothing-selected' : word;
        return {
          ...base,
          status,
          errorMessage: errorText(status, null),
          workPackage: null,
          detail: null,
          detailStatus: 'loading',
          detailRefusalCode: null,
        };
      }
      const wpSlot = read({ kind: 'wp', missionId, wpId });
      const detailSlot = read({ kind: 'wp-detail', missionId, wpId });
      const status = wpStatus(wpSlot.view);
      return {
        ...base,
        status,
        errorMessage: errorText(status, null),
        workPackage: present(wpSlot),
        detail: present(detailSlot),
        detailStatus: detailStatus(detailSlot.view),
        detailRefusalCode: refusalCodeOf(detailSlot.refusal),
      };
    }
    case 'artifacts': {
      const { missionId, path } = destination;
      const missionSlot = read({ kind: 'mission', missionId });
      const mission = present<MissionDetail>(missionSlot);
      const listingSlot = read({ kind: 'artifacts', missionId });
      const word = artifactStatus(listingSlot.view);
      const status: ArtifactStatus = path === undefined && word === 'ready' ? 'nothing-selected' : word;
      const contentSlot: SlotRead = path === undefined ? { value: undefined, view: 'ready', refusal: null } : read({ kind: 'artifact', missionId, path });
      return {
        screen: 'artifacts',
        status,
        errorMessage: errorText(status, null),
        selectedPath: path ?? '',
        mission,
        workPackages: mission?.workPackages ?? [],
        listing: present(listingSlot),
        content: present(contentSlot),
        contentStatus: contentStatus(contentSlot.view),
        refusalCode: refusalCodeOf(contentSlot.refusal),
      };
    }
    case 'projects':
      return { screen: 'projects', status: input.picker.status, entries: input.picker.entries, dialog: input.picker.dialog };
  }
}

export function buildSnapshot(input: SnapshotInput): ShellSnapshot {
  const { destination } = input;
  return {
    mode: input.mode,
    destination,
    layout: LAYOUT[destination.screen],
    chrome: chromeOf(input),
    screen: screenOf(input),
    connection: {
      state: input.connectionState,
      condition: input.condition,
      copy: input.condition === null ? null : bannerCopy(input.condition, input.copyOverrides),
      refused: input.refused,
    },
    session: { expanded: input.expanded === undefined ? NO_FOLDERS : input.expanded, drawerOpen: input.drawerOpen, flyoutOpen: input.flyoutOpen },
    copyResult: input.copyResult,
    showRefresh: destination.screen === 'artifacts' || destination.screen === 'ops',
    now: input.now,
  };
}
