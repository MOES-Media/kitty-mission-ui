// INTENT_TABLE (plan IC-05, FR-003, FR-004): the one dispatch source of `controller.intent(tag, event, detail)`. One entry per
// (tag, event) pair of contracts/intent-map.md, one line each, typed by the pair's detail in `MissionUiIntents`. A hosting
// element carries a handler; a nested pattern element carries only `via`, the hosting element whose binding delivers the same
// bubbling event (so each intent is handled exactly once). Type imports only: this layer imports neither svelte nor the
// mission-ui runtime.
import type { MissionUiIntents, MissionUiTag } from '../generated/elements';
import type { IntentCommands } from '../controller/shell-controller';

/** Every element whose events the shell handles; `sk-mission-sample` is excluded by name (FR-004). */
export type HostedTag = Exclude<MissionUiTag, 'sk-mission-sample'>;
/** The elements the binding layer listens on. */
export type HostingTag =
  | 'sk-mission-shell'
  | 'sk-missions-screen'
  | 'sk-pipeline-screen'
  | 'sk-work-package-screen'
  | 'sk-artifact-screen'
  | 'sk-drift-screen'
  | 'sk-ops-screen'
  | 'sk-projects-screen'
  | 'sk-open-project-dialog';
export type NestedTag = Exclude<HostedTag, HostingTag>;

export type Handler<D> = (commands: IntentCommands, detail: D) => void | Promise<void>;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
/** The hosting tags that declare event E with a detail mutually assignable to T's (R4-05). */
export type ViaHost<T extends HostedTag, E extends keyof MissionUiIntents[T]> = {
  [H in HostingTag]: E extends keyof MissionUiIntents[H] ? (Same<MissionUiIntents[H][E], MissionUiIntents[T][E]> extends true ? H : never) : never;
}[HostingTag];
export type Entry<T extends HostedTag, E extends keyof MissionUiIntents[T]> = T extends HostingTag
  ? Handler<MissionUiIntents[T][E]>
  : { readonly via: ViaHost<T, E> };
export type IntentTableShape = {
  readonly [T in HostedTag]?: { readonly [E in keyof MissionUiIntents[T]]?: Entry<T, E> };
};

/** The dashboard ignores the picker and dialog intents (FR-015): no state change, host call or snapshot there. */
export const desktopOnly =
  <D>(handler: Handler<D>): Handler<D> =>
  (commands, detail) =>
    commands.mode === 'dashboard' ? undefined : handler(commands, detail);

// `satisfies`, not an annotation: it types every handler by its detail and rejects a wrong `via` or an excess key, while
// `typeof INTENT_TABLE` keeps the literal keys that coverage.ts reads. Keep each entry on one line.
export const INTENT_TABLE = {
  'sk-mission-shell': {
    'sk-navigate': (c, d) => c.navigateHref(d),
    'sk-tree-toggle': (c, d) => c.toggleFolder(d),
    'sk-toggle-drawer': (c, d) => c.toggleDrawer(d),
    'sk-toggle-flyout': (c, d) => c.toggleFlyout(d),
    'sk-shell-retry': (c) => c.retryChrome(),
  },
  'sk-shell-nav-item': { 'sk-navigate': { via: 'sk-mission-shell' } },
  'sk-shell-tree': { 'sk-navigate': { via: 'sk-mission-shell' }, 'sk-tree-toggle': { via: 'sk-mission-shell' } },
  'sk-missions-screen': {
    'sk-open-mission': (c, d) => c.openMission(d),
    'sk-search': (c, d) => c.search(d),
    'sk-load-more': (c, d) => c.loadMoreMissions(d),
    'sk-filter-change': (c, d) => c.filterChange(d),
  },
  'sk-filter-toggle-group': { 'sk-filter-change': { via: 'sk-missions-screen' } },
  'sk-pipeline-screen': {
    'sk-open-missions': (c) => c.openMissions(),
    'sk-view-artifacts': (c, d) => c.openArtifacts(d),
    'sk-select-work-package': (c, d) => c.openWorkPackage(d),
  },
  'sk-work-package-board': { 'sk-select-work-package': { via: 'sk-pipeline-screen' } },
  'sk-work-package-screen': {
    'sk-select-work-package': (c, d) => c.openWorkPackage(d),
    'sk-open-mission': (c, d) => c.openMission(d),
    'sk-open-artifact': (c, d) => c.openArtifact(d),
    'sk-retry-load': (c, d) => c.retryWorkPackage(d),
  },
  'sk-artifact-screen': {
    'sk-select-artifact': (c, d) => c.openArtifact(d),
    'sk-open-link': (c, d) => c.openLink(d),
    'sk-select-work-package': (c, d) => c.openWorkPackage(d),
    'sk-open-mission': (c, d) => c.openMission(d),
    'sk-retry-load': (c, d) => c.retryArtifact(d),
  },
  'sk-drift-screen': {
    'sk-select-finding': (c, d) => c.selectFinding(d),
    'sk-rescan-drift': (c, d) => c.rescanDrift(d),
    'sk-copy-command': (c, d) => c.copyCommand(d),
    'sk-open-mission': (c, d) => c.openMission(d),
    'sk-open-missions': (c) => c.openMissions(),
    'sk-retry-load': (c, d) => c.retryDrift(d),
  },
  'sk-ops-screen': {
    'sk-load-more': (c, d) => c.loadMoreOps(d),
    'sk-retry-load': (c, d) => c.retryOps(d),
  },
  'sk-projects-screen': {
    'sk-open-project': desktopOnly((c, d) => c.openProject(d)),
    'sk-request-open-project': desktopOnly((c) => c.requestOpenProject()),
    'sk-retry-load': desktopOnly((c, d) => c.retryProjects(d)),
  },
  'sk-open-project-dialog': {
    'sk-browse-folder': desktopOnly((c, d) => c.browseFolder(d)),
    'sk-confirm-open-project': desktopOnly((c, d) => c.confirmOpenProject(d)),
    'sk-retry-load': desktopOnly((c, d) => c.retryFolders(d)),
  },
  'sk-phase-bar': {},
} as const satisfies IntentTableShape;

/** Every (tag, event) pair of the table, derived from it: WP06's binding and sweep read this, never a hand-written list. */
export const INTENT_PAIRS: readonly (readonly [tag: string, event: string])[] = Object.entries(INTENT_TABLE).flatMap(([tag, events]) =>
  Object.keys(events).map((event) => [tag, event] as const),
);
