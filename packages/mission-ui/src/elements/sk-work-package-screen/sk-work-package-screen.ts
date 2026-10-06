// The Work Package screen: header band, nine panels in three columns and the regional notice of the detail, for one Work
// Package of one Mission. No I/O, nothing stored. Renders inside the `sk-mission-shell` content slot (`flush`). Not
// self-registering: `src/index.ts` defines the tag once. This file draws every `data-region` element of the ready screen
// (the panels through `renderPanel`, the plain wrappers itself); a part returns the BODY of its region only, never decides
// whether its region is drawn and never dispatches an event. Exception E-19 (b): the grid track minimums, this file only.
import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '@spec-kitty/elements';
import {
  ANNOUNCE_DETAIL_LOADED,
  ANNOUNCE_DETAIL_LOADING,
  ANNOUNCE_DETAIL_UNAVAILABLE,
  ASSIGNMENT_TITLE,
  DEPENDENCIES_TITLE,
  EVIDENCE_TITLE,
  FACTS_TITLE,
  FRONTMATTER_TITLE,
  HISTORY_TITLE,
  OWNED_FILES_TITLE,
  REASON_SOURCE_WORDS,
  REVIEW_CYCLE_ARTIFACT_KIND,
  REVIEW_TITLE,
  STAGE_MISSION,
  SUBTASKS_TITLE,
  WORKSPACE_TITLE,
  announceLoaded,
  announceLoadedDetailUnavailable,
  announceLoading,
  announceNotFound,
} from '../../defaults/index.js';
import {
  filesView,
  historyView,
  joinHandles,
  lookup,
  resolveActivity,
  resolveLists,
  resolveRefusal,
  resolveStateBadge,
  resolveVerdict,
  retryDetail,
  stalenessView,
} from '../../logic/index.js';
import type { LabelHooks, RetryLoadDetail } from '../../logic/index.js';
import type { MissionHead, WorkPackageDetailView, WorkPackageRecordView } from '../../contract/types.js';
import { eventTimelineSheet, breadcrumbsSheet, emptyStateSheet, factsSheet } from '../../library-sheets.js';
import { progressSheet } from '../../progress-sheet.js';
import { ShellTierController } from '../../shell-tier.js';
import { visuallyHidden } from '../../visually-hidden.js';
import { normaliseViewState } from '../../view-state.js';
import type { SkOpenMissionDetail } from '../sk-missions-screen/sk-missions-screen.js';
import type { SkSelectWorkPackageDetail } from '../sk-work-package-board/sk-work-package-board.js';
import { chainStyles, renderDependencyChain, renderEvidenceChain } from './chain-parts.js';
import type { DependencyChainView, EvidenceChainView } from './chain-parts.js';
import { factsStyles, renderAssignment, renderFacts, renderFrontmatter } from './facts-parts.js';
import type { AssignmentView, FactsView, FrontmatterView } from './facts-parts.js';
import { filesStyles, renderOwnedFiles } from './files-parts.js';
import type { OwnedFilesView } from './files-parts.js';
import { headerStyles, renderHeader } from './header-parts.js';
import type { BreadcrumbView, HeaderView } from './header-parts.js';
import { historyStyles, renderHistory } from './history-parts.js';
import type { HistoryView } from './history-parts.js';
import { renderPanel, panelStyles } from './panel-parts.js';
import { sharedStyles } from './shared-parts.js';
import { renderCancellation, renderReviewCycles, renderReviewSummary, reviewStyles } from './review-parts.js';
import type { CancellationView, ReviewCyclesView, ReviewSummaryView } from './review-parts.js';
import { renderDetailNotice, renderStatusContent, stateStyles } from './state-parts.js';
import type { DetailNoticeView, StatusContentView, StatusHandlers, WholeScreenState } from './state-parts.js';
import { renderArtifactLinks, renderSubtasks, renderWorkspace, workStyles } from './work-parts.js';
import type { ArtifactLinksView, SubtasksView, WorkspaceView } from './work-parts.js';

/** The whole-screen view states: the four of the charter plus the two of this screen. Unknown values collapse to `empty`. */
export type WpScreenStatus = 'loading' | 'error' | 'empty' | 'ready' | 'not-found' | 'nothing-selected';
/** The state of the detail regions only. Unknown values collapse to `error`. */
export type DetailStatus = 'loading' | 'ready' | 'error' | 'not-found';

/** The Mission the screen shows a Work Package of: host data, with the contract's field names (the Pipeline screen's Mission is assignable). */
export type WpScreenMission = Pick<MissionHead, 'missionId' | 'slug' | 'friendlyName' | 'wpTotal'>;

/** Payload of `sk-open-artifact`: the artifact `kind` is passed through unchanged. */
export interface SkOpenArtifactDetail {
  missionId: string;
  path: string;
  kind: string;
}
/** Payload of `sk-retry-load`: the one shape of `logic/wp-retry.ts`, aliased and never declared again. */
export type SkRetryLoadDetail = RetryLoadDetail;

const EXTRA_STATUSES: readonly WpScreenStatus[] = ['not-found', 'nothing-selected'];
const DETAIL_STATUSES: readonly DetailStatus[] = ['loading', 'ready', 'error', 'not-found'];

/** The four charter states through #4's normaliser, the two screen states through an allow-list; anything else is `empty`. */
function normaliseWpStatus(value: unknown): WpScreenStatus {
  return EXTRA_STATUSES.find((status) => status === value) ?? normaliseViewState(value);
}

/** Unknown values collapse to `error`: a refusal word is safer than a silent success. */
function normaliseDetailStatus(value: unknown): DetailStatus {
  return DETAIL_STATUSES.find((status) => status === value) ?? 'error';
}

/**
 * The Work Package screen. Read-only (C-003): it only asks the host to read again.
 *
 * @screen
 * @element sk-work-package-screen
 * @tagname sk-work-package-screen
 *
 * @fires {CustomEvent<SkSelectWorkPackageDetail>} sk-select-work-package - a dependency-chain node was activated; `wpId` is the dependency's
 * @fires {CustomEvent<SkOpenMissionDetail>} sk-open-mission - the Mission crumb or "Return to Pipeline" was activated
 * @fires {CustomEvent<SkOpenArtifactDetail>} sk-open-artifact - "Open spec.md", "Open prompt" or "Open review" was activated
 * @fires {CustomEvent<SkRetryLoadDetail>} sk-retry-load - Retry was activated on the whole screen (`work-package`) or on a refused detail (`detail`)
 */
export class SkWorkPackageScreen extends LitElement {
  static override styles = [
    factsSheet,
    eventTimelineSheet,
    breadcrumbsSheet,
    emptyStateSheet,
    progressSheet,
    css`
      :host {
        display: block;
        min-width: 0;
        container-type: inline-size;
      }
      /* The header band: padded like the Pipeline screen's header; a column at the one-column threshold. */
      [data-region='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sk-space-5);
        min-width: 0;
        padding: var(--sk-mission-shell-content-padding) var(--sk-mission-shell-content-padding) 0;
      }
      /* The detail grid (the prototype's .detail-grid). Two columns by default; three from a content cell of 848 px (three
         tracks need 760 px plus two gaps plus the padding on both sides); one at 688 px or less. Track minimums: E-19 (b). */
      [data-grid] {
        display: grid;
        grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.2fr);
        gap: var(--sk-space-5);
        padding: var(--sk-mission-shell-content-padding);
      }
      /* Every stack is a grid; its own column is pinned to the stack, or one unbreakable word widens the whole column. */
      [data-stack] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: var(--sk-space-5);
        min-width: 0;
      }
      [data-stack]:last-child {
        grid-column: 1 / -1;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      @container (min-width: 848px) {
        [data-grid] {
          grid-template-columns: minmax(220px, .8fr) minmax(320px, 1.3fr) minmax(220px, .8fr);
        }
        [data-stack]:last-child {
          grid-column: auto;
          grid-template-columns: minmax(0, 1fr);
        }
      }
      @container (max-width: 688px) {
        [data-region='header'] {
          align-items: flex-start;
          flex-direction: column;
        }
        [data-grid] {
          grid-template-columns: minmax(0, 1fr);
        }
        [data-stack]:last-child {
          grid-column: auto;
          grid-template-columns: minmax(0, 1fr);
        }
      }
      /* The shell's mobile tier (operator ruling during WP10): its content cell is the whole viewport, so the container
         queries above would leave two columns between 689 and 719 px. The screen follows the shell's reflected 'tier' through the ShellTierController. */
      :host(:state(shell-mobile)) [data-region='header'] {
        align-items: flex-start;
        flex-direction: column;
      }
      :host(:state(shell-mobile)) [data-grid] {
        grid-template-columns: minmax(0, 1fr);
      }
      :host(:state(shell-mobile)) [data-stack]:last-child {
        grid-column: auto;
        grid-template-columns: minmax(0, 1fr);
      }
      [data-region='review-summary'],
      [data-region='review-cycles'],
      [data-region='detail-notice'],
      [data-region='cancellation'],
      [data-region='artifact-links'] {
        min-width: 0;
      }
      /* The one polite live region: in the accessibility tree, taking no room. */
      [data-live] {
        ${visuallyHidden}
      }
    `,
    sharedStyles,
    panelStyles,
    headerStyles,
    factsStyles,
    filesStyles,
    historyStyles,
    reviewStyles,
    chainStyles,
    workStyles,
    stateStyles,
  ];

  /** The view state; unknown values collapse to `empty`. */
  @property({ reflect: true })
  status: WpScreenStatus = 'loading';

  /** The state of the detail regions only; unknown values collapse to `error`. */
  @property({ attribute: 'detail-status' })
  detailStatus: DetailStatus = 'ready';

  /** The refusal code of a refused detail, read only when `detailStatus` is `error` or `not-found`; null gives one generic wording. */
  @property({ attribute: false })
  detailRefusalCode: string | null = null;

  /** The Work Package (contract 1.0 with open lanes); null renders as `empty`. */
  @property({ attribute: false })
  workPackage: WorkPackageRecordView | null = null;

  /** The detail (contract 1.1); null means the host gave none. */
  @property({ attribute: false })
  detail: WorkPackageDetailView | null = null;

  /** The Mission: host data. Controls that need its id are drawn inert while this is null. */
  @property({ attribute: false })
  mission: WpScreenMission | null = null;

  /** The selected Work Package id: the not-found header and the retry payloads use it first. */
  @property({ attribute: 'wp-id' })
  wpId = '';

  /** RFC 3339 instant for relative times; null shows the ISO text as given. */
  @property()
  now: string | null = null;

  /** Lane and state label hooks. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** Overrides the default error body. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  // The one polite live region: the text of the last transition; empty until one happens (never on first render).
  private announcement = '';
  private announcementSeq = 0;
  private lastStatus: WpScreenStatus | null = null;
  private lastDetailStatus: DetailStatus | null = null;
  // The id of the Work Package the screen shows while ready (null in any other state): what "loaded" is announced for.
  private lastShownWpId: string | null = null;
  private announcing = false;
  // The element that had focus inside the shadow root when the current update began.
  private focusedBefore: Element | null = null;

  // Sets the custom state `:state(shell-mobile)` on this host while the enclosing shell reads its mobile tier.
  protected readonly shellTier = new ShellTierController(this);

  // ---- Dispatch: one literal site per event; the part files receive these as arguments.

  protected selectWorkPackage(wpId: string): void {
    const mission = this.mission;
    if (mission === null) return;
    const detail: SkSelectWorkPackageDetail = { missionId: mission.missionId, wpId };
    this.dispatchEvent(new CustomEvent<SkSelectWorkPackageDetail>('sk-select-work-package', { detail, bubbles: true, composed: true }));
  }

  protected openMission(): void {
    const mission = this.mission;
    if (mission === null) return;
    const detail: SkOpenMissionDetail = { missionId: mission.missionId, slug: mission.slug };
    this.dispatchEvent(new CustomEvent<SkOpenMissionDetail>('sk-open-mission', { detail, bubbles: true, composed: true }));
  }

  protected openArtifact(path: string, kind: string): void {
    const mission = this.mission;
    if (mission === null) return;
    const detail: SkOpenArtifactDetail = { missionId: mission.missionId, path, kind };
    this.dispatchEvent(new CustomEvent<SkOpenArtifactDetail>('sk-open-artifact', { detail, bubbles: true, composed: true }));
  }

  /** The Open-review handler: the kind is the review cycle's, read from `defaults/review.ts`. */
  protected openReview(artifactPath: string): void {
    this.openArtifact(artifactPath, REVIEW_CYCLE_ARTIFACT_KIND);
  }

  protected retryLoad(target: SkRetryLoadDetail['target']): void {
    const detail = this.retryPayload(target);
    if (detail === null) return;
    this.dispatchEvent(new CustomEvent<SkRetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  /** The retry payload, or null (no Mission or no id anywhere): the control is inert. A detail for another Work Package counts as omitted. */
  private retryPayload(target: SkRetryLoadDetail['target']): SkRetryLoadDetail | null {
    return retryDetail(target, { mission: this.mission, wpId: this.wpId, workPackage: this.workPackage, detail: this.matchingDetail() });
  }

  /**
   * The detail, or null when it belongs to another Work Package or another Mission than the one shown (it then counts as
   * omitted). A `wpId` is unique only within one Mission, so the Mission is compared too, once the host has given one.
   */
  private matchingDetail(): WorkPackageDetailView | null {
    const wp = this.workPackage;
    const detail = this.detail;
    if (detail === null) return null;
    if (wp !== null && detail.wpId !== wp.wpId) return null;
    if (this.mission !== null && detail.missionId !== this.mission.missionId) return null;
    return detail;
  }

  /** The id every control and header of the screen uses: the `wpId` property, then the Work Package's, then the detail's. */
  private currentWpId(): string {
    return [this.wpId, this.workPackage?.wpId, this.matchingDetail()?.wpId].find((id): id is string => typeof id === 'string' && id !== '') ?? '';
  }

  // ---- Focus and announcements.

  /**
   * The state the screen draws, so also what a transition announces. `ready` with no Work Package is the empty form; `ready`
   * with a `wpId` that differs from the Work Package's fails closed to `loading` (the data-less header of the selected id):
   * the screen never shows a mixed identity.
   */
  private effectiveState(): WpScreenStatus {
    const state = normaliseWpStatus(this.status);
    if (state !== 'ready') return state;
    const wp = this.workPackage;
    if (wp === null) return 'empty';
    return this.wpId !== '' && this.wpId !== wp.wpId ? 'loading' : state;
  }

  protected override willUpdate(): void {
    const state = this.effectiveState();
    const detailState = normaliseDetailStatus(this.detailStatus);
    // On every update: any property can detach the focused node (a Work Package swap under the same id, an effective state
    // change); `updated` moves focus only when the captured node is gone.
    this.focusedBefore = this.shadowRoot?.activeElement ?? null;
    const shown = state === 'ready' ? (this.workPackage?.wpId ?? null) : null;
    if (this.announcing) {
      const text = this.transitionText(state, detailState, shown);
      if (text !== null) {
        this.announcement = text;
        this.announcementSeq += 1;
      }
    }
    this.lastStatus = state;
    this.lastDetailStatus = detailState;
    this.lastShownWpId = shown;
    this.announcing = true;
  }

  /**
   * The announcement of a transition since the last update, or null when there is none (first render, same-Work-Package
   * refresh). "Loaded" is keyed on the Work Package that is SHOWN (`workPackage.wpId`), never on the `wpId` property alone.
   */
  private transitionText(state: WpScreenStatus, detailState: DetailStatus, shown: string | null): string | null {
    const id = this.currentWpId();
    const loaded = (): string => (detailState === 'error' || detailState === 'not-found' ? announceLoadedDetailUnavailable(id) : announceLoaded(id));
    if (state !== this.lastStatus) {
      if (state === 'loading') return announceLoading(id);
      if (state === 'ready') return loaded();
      if (state === 'not-found') return announceNotFound(id);
      return null;
    }
    if (state === 'ready' && shown !== this.lastShownWpId) return loaded();
    if (state === 'ready' && detailState !== this.lastDetailStatus) {
      if (detailState === 'loading') return ANNOUNCE_DETAIL_LOADING;
      if (detailState === 'ready') return ANNOUNCE_DETAIL_LOADED;
      return ANNOUNCE_DETAIL_UNAVAILABLE;
    }
    return null;
  }

  /** When the focused element was detached by an update, focus moves to the `h1`, else to the root. */
  protected override updated(): void {
    const before = this.focusedBefore;
    this.focusedBefore = null;
    if (before === null || before.isConnected) return;
    void this.moveFocusIntoView();
  }

  /**
   * A freshly created `sk-page-header` has no slot in its shadow root until its first render, so the slotted `h1` takes no
   * focus in the task that created it: the move waits for the headers' own updates (a microtask), then lands.
   */
  private async moveFocusIntoView(): Promise<void> {
    const headers = Array.from(this.renderRoot.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-page-header'));
    await Promise.all(headers.map((header) => header.updateComplete ?? Promise.resolve()));
    const target = this.renderRoot.querySelector<HTMLElement>('h1') ?? this.renderRoot.querySelector<HTMLElement>('[data-root]');
    if (target === null) return;
    target.tabIndex = -1;
    target.focus();
  }

  // ---- View builders: each returns null for the contract's "not drawn" form.

  private breadcrumbView(): BreadcrumbView {
    return { missionLabel: this.mission?.friendlyName ?? STAGE_MISSION, wpId: this.currentWpId(), inert: this.mission === null };
  }

  private statusContentView(state: WholeScreenState): StatusContentView {
    return {
      state,
      wpId: this.currentWpId(),
      breadcrumb: this.breadcrumbView(),
      errorMessage: this.errorMessage,
      mission: this.mission === null ? null : { friendlyName: this.mission.friendlyName, slug: this.mission.slug, wpTotal: this.mission.wpTotal },
      inert: this.mission === null,
      retryInert: this.retryPayload('work-package') === null,
    };
  }

  private renderStatus(state: WholeScreenState): TemplateResult {
    const handlers: StatusHandlers = { onOpenMission: () => this.openMission(), onRetry: () => this.retryLoad('work-package') };
    return html`${renderStatusContent(this.statusContentView(state), handlers)}`;
  }

  /** The regional notice of a detail that is not ready: the one caller has already ruled `ready` out. */
  private renderDetailNoticeRegion(detailState: Exclude<DetailStatus, 'ready'>): TemplateResult {
    const view: DetailNoticeView = {
      kind: detailState,
      refusalText: detailState === 'loading' ? '' : resolveRefusal(this.detailRefusalCode),
      retryInert: this.retryPayload('detail') === null,
    };
    return html`<div data-region="detail-notice">${renderDetailNotice(view, () => this.retryLoad('detail'))}</div>`;
  }

  private renderReady(wp: WorkPackageRecordView, detailState: DetailStatus): TemplateResult {
    const hooks = this.labels;
    const inert = this.mission === null;
    const lists = resolveLists(wp, detailState === 'ready' ? this.matchingDetail() : null);
    const usable = lists.detail;
    const stateBadge = resolveStateBadge(wp.statusLane, hooks);
    const staleness = stalenessView(wp.staleness);
    const actorText = joinHandles(wp.actor);

    const header: HeaderView = { breadcrumb: this.breadcrumbView(), title: wp.title, stateBadge, actorText, staleness };
    const facts: FactsView = {
      wpId: wp.wpId,
      stateBadge,
      actorText,
      mergeTargetBranch: wp.mergeTargetBranch,
      phaseLabel: wp.phaseLabel,
      taskType: wp.taskType,
      trackerRefs: wp.trackerRefs,
      lastTransitionText: wp.lastTransitionAt === null ? null : resolveActivity(wp.lastTransitionAt, this.now, hooks),
      forceCount: wp.forceCount,
      implementerOfRecord: wp.implementerOfRecord,
      staleness,
    };
    const a = wp.assignment;
    const au = wp.authored;
    // Drawn exactly when `renderAssignment` has a row to print: a null or empty member is absent (CONTRACT-001).
    const absent = (member: string | null): boolean => member === null || member === '';
    const assignment: AssignmentView | null = [a.agent, a.assignee, a.role, a.agentProfile, a.agentProfileVersion, a.model, a.provider, au.role, au.agentProfile, au.model].every(absent)
      ? null
      : {
          assignment: {
            agent: a.agent,
            assignee: a.assignee,
            role: a.role,
            agentProfile: a.agentProfile,
            agentProfileVersion: a.agentProfileVersion,
            model: a.model,
            provider: a.provider,
          },
          authored: { role: au.role, agentProfile: au.agentProfile, model: au.model, subtasks: au.subtasks },
        };
    const frontmatter: FrontmatterView = {
      dependencies: lists.dependencies,
      requirementRefs: wp.requirementRefs,
      priority: wp.priority,
      executionMode: wp.executionMode,
    };
    const files: OwnedFilesView = filesView(lists.ownedFiles);
    const history: HistoryView = { items: historyView(wp.history, hooks, this.now) };

    const result = wp.review.latestResult;
    const override = wp.review.override;
    const summary: ReviewSummaryView = {
      latestResult: result === null ? null : { reviewer: result.reviewer, verdict: resolveVerdict(result.verdict), reference: result.reference },
      override:
        override === null
          ? null
          : {
              complete: override.complete,
              atText: override.at === null ? null : resolveActivity(override.at, this.now, hooks),
              actor: override.actor,
              reason: override.reason,
            },
    };
    const cycleList = usable?.reviewCycles;
    const cycles: ReviewCyclesView | null =
      cycleList === undefined || (cycleList.length === 0 && (result !== null || override !== null))
        ? null
        : {
            cycles: cycleList.map((c) => ({
              cycleNumber: c.cycleNumber,
              reviewedAtText: c.reviewedAt === null ? null : resolveActivity(c.reviewedAt, this.now, hooks),
              reviewer: c.reviewer,
              verdict: resolveVerdict(c.verdict),
              feedbackReference: c.feedbackReference,
              artifactPath: c.artifactPath,
              inert,
            })),
            noneFound: cycleList.length === 0,
          };
    const cancellation: CancellationView | null =
      wp.cancellation === null
        ? null
        : { sourceText: lookup(REASON_SOURCE_WORDS, wp.cancellation.reasonSource) ?? wp.cancellation.reasonSource, reason: wp.cancellation.reason, stateBadge };

    const evidence: EvidenceChainView = { missionLabel: this.mission?.friendlyName ?? STAGE_MISSION, wpId: wp.wpId, stateBadge };
    const dependencyChain: DependencyChainView = {
      nodes: lists.dependencies.map((d) => ({
        wpId: d.wpId,
        title: d.title ?? d.wpId,
        laneWord: resolveStateBadge(d.lane, hooks).label,
        unsatisfied: wp.readiness.unsatisfied.includes(d.wpId),
      })),
      satisfied: wp.readiness.satisfied,
      readyToStart: wp.readyToStart,
      inert,
    };
    const subtasks: SubtasksView = { done: wp.subtaskProgress.done, total: wp.subtaskProgress.total, items: lists.subtasks, labels: hooks };
    const workspace: WorkspaceView | null = usable?.workspace === undefined ? null : { ...usable.workspace };
    const refs = usable?.artifactReferences;
    const links: ArtifactLinksView | null =
      refs === undefined || (refs.spec === null && refs.prompt === null)
        ? null
        : {
            spec: refs.spec === null ? null : { path: refs.spec.path, kind: refs.spec.kind },
            prompt: refs.prompt === null ? null : { path: refs.prompt.path, kind: refs.prompt.kind },
            inert,
          };

    const onOpenMission = (): void => this.openMission();
    return html`
      <div data-region="header">${renderHeader(header, onOpenMission)}</div>
      <div data-grid>
        <div data-stack>
          ${renderPanel('facts', FACTS_TITLE, renderFacts(facts))}
          ${assignment === null ? nothing : renderPanel('assignment', ASSIGNMENT_TITLE, renderAssignment(assignment))}
          ${renderPanel('frontmatter', FRONTMATTER_TITLE, renderFrontmatter(frontmatter))}
          ${renderPanel('owned-files', OWNED_FILES_TITLE, renderOwnedFiles(files))}
        </div>
        <div data-stack>
          ${renderPanel('history', HISTORY_TITLE, renderHistory(history))}
          ${cancellation === null ? nothing : html`<div data-region="cancellation">${renderCancellation(cancellation)}</div>`}
          ${renderPanel(
            null,
            REVIEW_TITLE,
            html`<div data-region="review-summary">${renderReviewSummary(summary)}</div>
              ${detailState !== 'ready'
                ? this.renderDetailNoticeRegion(detailState)
                : cycles === null
                  ? nothing
                  : html`<div data-region="review-cycles">${renderReviewCycles(cycles, (path) => this.openReview(path))}</div>`}`,
          )}
        </div>
        <div data-stack>
          ${renderPanel('evidence-chain', EVIDENCE_TITLE, renderEvidenceChain(evidence))}
          ${renderPanel('dependency-chain', DEPENDENCIES_TITLE, renderDependencyChain(dependencyChain, (id) => this.selectWorkPackage(id)))}
          ${renderPanel('subtasks', SUBTASKS_TITLE, renderSubtasks(subtasks))}
          ${workspace === null ? nothing : renderPanel('workspace', WORKSPACE_TITLE, renderWorkspace(workspace))}
          ${links === null ? nothing : html`<div data-region="artifact-links">${renderArtifactLinks(links, (path, kind) => this.openArtifact(path, kind))}</div>`}
        </div>
      </div>
    `;
  }

  protected override render(): TemplateResult {
    const state = this.effectiveState();
    const detailState = normaliseDetailStatus(this.detailStatus);
    const wp = this.workPackage;
    const content = state === 'ready' && wp !== null ? this.renderReady(wp, detailState) : this.renderStatus(state === 'ready' ? 'empty' : state);
    return html`<div data-root tabindex="-1">${content}</div>
      <div data-live role="status" aria-live="polite">${this.announcement === '' ? nothing : keyed(this.announcementSeq, html`<span data-seq=${this.announcementSeq}>${this.announcement}</span>`)}</div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-open-artifact': CustomEvent<SkOpenArtifactDetail>;
    'sk-retry-load': CustomEvent<SkRetryLoadDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-work-package-screen': SkWorkPackageScreen;
  }
}
