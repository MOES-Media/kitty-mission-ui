// The Drift screen: the page header, the finding list (head and listbox) and the finding detail of one scan of the Mission
// Status read service, plus the loading, clean, unreadable, not-found and choose-a-finding states. No I/O, nothing stored.
// Renders inside the `sk-mission-shell` content slot (`flush`). Not self-registering: `src/index.ts` defines the tag once.
// THIS FILE IS FROZEN after IC-03b (the surface, the grid, the status switch, the six dispatch methods, the focus rule, the
// live region): a change is a reported exception. This file draws the container and region ids of the header, the list (head, truncation,
// listbox), the state and the detail (`data-region`); a part returns the BODY of its region only, never decides whether that region is
// drawn and never dispatches an event. The detail's own panels are the one exception: `panel-parts.ts` draws the `authority` and
// `facts` regions and `resolution-parts.ts` draws the `resolution` region (one section, one title id), as the detail's blocks.
// Exceptions: E-35 (the 420 px list track and its border, this file only) and E-37 G-1 (the screen type, this file only).
import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '@spec-kitty/elements';
import { ANNOUNCEMENT_SEPARATOR, COPY_MANUAL_FALLBACK, COPY_RESULT_TEXT, RESCANNING_ANNOUNCEMENT } from '../../defaults/index.js';
import {
  buildFindingView,
  announcementInput,
  driftRetryDetail,
  effectiveStatus,
  lookup,
  missionNaming,
  nextAnnouncement,
  rescanCompletion,
  resolveDriftRefusal,
  sameKey,
  selectedIndex,
} from '../../logic/index.js';
import type { AnnounceInput, DriftRetryDetail, DriftScreenStatus, FindingView, LabelHooks } from '../../logic/index.js';
import type { DriftFindingKey, DriftMissionName, DriftReportView } from '../../contract/types.js';
import { dataTableSheet, emptyStateSheet, factsSheet } from '../../library-sheets.js';
import { OverflowRegion } from '../../overflow-region.js';
import { progressSheet } from '../../progress-sheet.js';
import { ShellTierController } from '../../shell-tier.js';
import { visuallyHidden } from '../../visually-hidden.js';
import type { SkOpenMissionDetail } from '../sk-missions-screen/sk-missions-screen.js';
import type { SkOpenMissionsDetail } from '../sk-pipeline-screen/sk-pipeline-screen.js';
import { detailStyles, renderDetail } from './detail-parts.js';
import type { DetailProps } from './detail-parts.js';
import { headerStyles, renderHeader } from './header-parts.js';
import type { HeaderProps } from './header-parts.js';
import { listStyles, renderHead, renderListbox } from './list-parts.js';
import type { ListProps } from './list-parts.js';
import { panelStyles } from './panel-parts.js';
import { renderChoose, renderClean, renderError, renderLoading, renderNotFound, renderTruncationNote, stateStyles } from './state-parts.js';
import type { StateProps } from './state-parts.js';
import { tableStyles } from './table-parts.js';
import { resolutionStyles } from './resolution-parts.js';

// The view states, defined once in `logic/drift-report.ts` (the screen draws exactly these).
export type { DriftScreenStatus };
/** The host's answer to a copy request. */
export type DriftCopyResult = 'copied' | 'manual';

/** Payload of `sk-select-finding`: the identity of the chosen finding. */
export interface SkSelectFindingDetail {
  missionId: string;
  kind: string;
  artifactPath: string;
}
/** Payload of `sk-rescan-drift`: the scope of the scan, `null` for the whole project. */
export interface SkRescanDriftDetail {
  missionId: string | null;
}
/** Payload of `sk-copy-command`: the exact text shown, the Mission and the remedy it came from. */
export interface SkCopyCommandDetail {
  text: string;
  missionId: string;
  remedy: string;
}
/** Payload of `sk-retry-load` from this screen: the Drift member of the shared union (`logic/wp-retry.ts`), never declared again. */
export type SkDriftRetryLoadDetail = DriftRetryDetail;

/** The copy request the screen is waiting to be answered: the finding whose Copy was pressed, the report it was pressed on, the answer seen since. */
interface PendingCopy {
  key: DriftFindingKey;
  report: DriftReportView | null;
  answer: string | null;
}

/**
 * The Drift screen. Read-only (C-003): it only asks the host to scan again, to retry, to open a Mission, or to copy a command.
 *
 * @screen
 * @element sk-drift-screen
 * @tagname sk-drift-screen
 *
 * @fires {CustomEvent<SkSelectFindingDetail>} sk-select-finding - a finding was chosen by click, Enter, Space or a navigation key; never for an incoming `selectedFinding`
 * @fires {CustomEvent<SkRescanDriftDetail>} sk-rescan-drift - Rescan was activated (nothing while `rescanning`)
 * @fires {CustomEvent<SkCopyCommandDetail>} sk-copy-command - Copy was activated on the suggested resolution; the host writes the clipboard
 * @fires {CustomEvent<SkOpenMissionDetail>} sk-open-mission - the Mission link in the detail was activated
 * @fires {CustomEvent<SkOpenMissionsDetail>} sk-open-missions - "Return to Missions" was activated
 * @fires {CustomEvent<SkDriftRetryLoadDetail>} sk-retry-load - Retry was activated (`drift-report`)
 */
export class SkDriftScreen extends LitElement {
  static override styles = [
    dataTableSheet,
    factsSheet,
    emptyStateSheet,
    progressSheet,
    css`
      /* E-37 G-1: the screen type, 14 px on a 1.5 line. The host is the container of the thresholds below. */
      :host {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
        container-type: inline-size;
        font-size: var(--sk-text-sm);
        line-height: 1.5;
      }
      /* SR-1: the screen fills the shell's content cell (a column), so the divider reaches the bottom of the cell. */
      [data-root] {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        min-width: 0;
      }
      /* E-35: the two panes. A list track of 420 px (the prototype's) and the detail. Neither pane scrolls inside the page: the
         shell's content cell scrolls as a whole (CP-1 ruling F-5, drift DD-23). */
      [data-layout] {
        display: grid;
        grid-template-columns: 420px minmax(0, 1fr);
        flex-grow: 1;
        min-width: 0;
      }
      [data-region='list'] {
        min-width: 0;
        border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default);
      }
      /* The detail is a grid: its blocks stack in one pinned column, so one unbreakable word cannot widen the pane. */
      [data-region='detail'] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
        gap: var(--sk-space-5);
        min-width: 0;
        padding: var(--sk-space-6);
      }
      [data-region='state'] {
        min-width: 0;
        padding: var(--sk-space-6);
      }
      [data-region='head'],
      [data-region='truncation'],
      [data-region='listbox'] {
        min-width: 0;
      }
      /* One column below a container width of 800 px (CP-1 S2: the list track, its border and the prototype's own two-pane minimum
         of 380 px for the detail). The list border is dropped. */
      @container (max-width: 799px) {
        [data-layout] {
          grid-template-columns: minmax(0, 1fr);
          align-content: start;
        }
        [data-region='list'] {
          border-inline-end: 0;
        }
      }
      /* The shell's mobile tier: the content cell is the whole viewport, so the container query above and this rule agree; the rule
         stays because the tier is the shell's to name (the ShellTierController sets the state). */
      :host(:state(shell-mobile)) [data-layout] {
        grid-template-columns: minmax(0, 1fr);
        align-content: start;
      }
      :host(:state(shell-mobile)) [data-region='list'] {
        border-inline-end: 0;
      }
      /* The one polite live region: in the accessibility tree, taking no room. */
      [data-live] {
        ${visuallyHidden}
      }
    `,
    panelStyles,
    headerStyles,
    listStyles,
    stateStyles,
    detailStyles,
    tableStyles,
    resolutionStyles,
  ];

  /** The view state; unknown values collapse to `empty`, except `not-found`. */
  @property({ reflect: true })
  status: DriftScreenStatus = 'loading';

  /** The drift report (contract `DriftReport`, widened by the vocabulary-open relaxation); null while none was loaded. */
  @property({ attribute: false })
  report: DriftReportView | null = null;

  /** The selected finding's key. Host-owned: an incoming change is never re-emitted. */
  @property({ attribute: false })
  selectedFinding: DriftFindingKey | null = null;

  /** The scope: non-empty means a scoped scan of that Mission. */
  @property({ attribute: 'mission-id' })
  missionId = '';

  /** Host data: the names of the Missions the findings belong to, by `missionId`. */
  @property({ attribute: false })
  missions: Readonly<Record<string, DriftMissionName>> | null = null;

  /** True while a rescan is in flight: the report stays visible and the button is busy. */
  @property({ type: Boolean })
  rescanning = false;

  /** The host's answer to the last `sk-copy-command`; the host resets it to null on the event, then answers. */
  @property({ attribute: 'copy-result' })
  copyResult: DriftCopyResult | null = null;

  /** The refusal code of a refused scan, read only when `status` is `error`; unknown or null gives the generic words. */
  @property({ attribute: 'refusal-code' })
  refusalCode: string | null = null;

  /** RFC 3339 instant for relative times; null shows the ISO text as given. */
  @property()
  now: string | null = null;

  /** Label hooks for the drift words (kind, severity, authority, derived side, refusal) and the shared lane and time hooks. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** Overrides the refusal words of the error state. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  // The one polite live region: the text of the last announcement; empty until one happens (never on first render).
  private announcement = '';
  private announcementSeq = 0;
  private lastInput: AnnounceInput | null = null;
  private announcing = false;
  // The input captured when the current rescan started, and whether a line other than "Rescanning" was said since: the end of the
  // rescan is decided against this, not against the previous update.
  private rescanBase: AnnounceInput | null = null;
  private rescanSpoke = false;
  // True between a `manual` answer and the read-back of the selection: the words that say "the command is selected" wait for it.
  private awaitingReadBack = false;
  // The copy request in flight (FR-021): the answer counts only if it was observed after the press, for this finding and this report.
  private pending: PendingCopy | null = null;
  // The element that had focus inside the shadow root when the current update began.
  private focusedBefore: Element | null = null;

  // Sets the custom state `:state(shell-mobile)` on this host while the enclosing shell reads its mobile tier.
  protected readonly shellTier = new ShellTierController(this);
  // The lane table's scroller is a focusable, labelled region only while it overflows (the part draws it from `overflowing`).
  private readonly laneTable = new OverflowRegion(this, { target: () => this.renderRoot.querySelector('.sk-data-table__scroller') });

  // ---- Dispatch: one literal site per event; the part files receive these as arguments.

  protected selectFinding(key: DriftFindingKey): void {
    const detail: SkSelectFindingDetail = { missionId: key.missionId, kind: key.kind, artifactPath: key.artifactPath };
    this.dispatchEvent(new CustomEvent<SkSelectFindingDetail>('sk-select-finding', { detail, bubbles: true, composed: true }));
  }

  /** Nothing while a rescan is in flight (FR-004). */
  protected rescanDrift(): void {
    if (this.rescanning) return;
    const detail: SkRescanDriftDetail = { missionId: this.missionId === '' ? null : this.missionId };
    this.dispatchEvent(new CustomEvent<SkRescanDriftDetail>('sk-rescan-drift', { detail, bubbles: true, composed: true }));
  }

  /**
   * Copy of the selected finding's command, the exact text the detail shows. Nothing without a command (no remedy, a remedy the
   * screen does not know, a Mission the host does not list, nothing selected). The press clears any shown result and starts a new
   * request; the answer counts only if the host changes `copyResult` after this call.
   */
  protected copyCommand(): void {
    const view = this.selectedView();
    if (view === null || view.command === null) return;
    this.pending = { key: view.key, report: this.report, answer: null };
    const detail: SkCopyCommandDetail = { text: view.command.text, missionId: view.key.missionId, remedy: view.command.remedy };
    this.dispatchEvent(new CustomEvent<SkCopyCommandDetail>('sk-copy-command', { detail, bubbles: true, composed: true }));
    this.requestUpdate();
  }

  /** The resolution part selected the command after a `manual` answer: announce what the selection read back (FR-021). */
  private manualReadBack(selected: boolean): void {
    if (!this.awaitingReadBack) return;
    this.awaitingReadBack = false;
    this.announcement = selected ? (lookup(COPY_RESULT_TEXT, 'manual') ?? COPY_MANUAL_FALLBACK) : COPY_MANUAL_FALLBACK;
    this.announcementSeq += 1;
    this.requestUpdate();
  }

  /** The selected finding's Mission; nothing when the host does not know its slug (the link is not drawn then either). */
  protected openMission(): void {
    const view = this.selectedView();
    if (view === null || view.mission.slug === null) return;
    const detail: SkOpenMissionDetail = { missionId: view.mission.missionId, slug: view.mission.slug };
    this.dispatchEvent(new CustomEvent<SkOpenMissionDetail>('sk-open-mission', { detail, bubbles: true, composed: true }));
  }

  protected openMissions(): void {
    const detail: SkOpenMissionsDetail = {};
    this.dispatchEvent(new CustomEvent<SkOpenMissionsDetail>('sk-open-missions', { detail, bubbles: true, composed: true }));
  }

  /** The whole-project scan has no Mission: `driftRetryDetail` turns the empty scope into null. */
  protected retryLoad(): void {
    const detail: SkDriftRetryLoadDetail = driftRetryDetail(this.missionId);
    this.dispatchEvent(new CustomEvent<SkDriftRetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  // ---- What is shown.

  /** The state the screen draws, so also what a transition announces (FR-008, FR-009). */
  private effectiveState(): DriftScreenStatus {
    return effectiveStatus(this.status, this.report, this.missionId);
  }

  /** The report that is drawn: only in the states that draw one. */
  private shownReport(state: DriftScreenStatus): DriftReportView | null {
    return state === 'ready' || state === 'empty' ? this.report : null;
  }

  private selectedPosition(state: DriftScreenStatus): number {
    const report = this.shownReport(state);
    return state === 'ready' && report !== null ? selectedIndex(report.findings, this.selectedFinding) : -1;
  }

  /** The view of the selected finding, or null (nothing selected, or a key that is not in this scan). */
  private selectedView(): FindingView | null {
    const state = this.effectiveState();
    const report = this.shownReport(state);
    const index = this.selectedPosition(state);
    const finding = report?.findings[index];
    return finding === undefined ? null : buildFindingView(finding, { missions: this.missions, hooks: this.labels });
  }

  /** The copy answer that is shown: the one observed after the press, for the selected finding and the shown report. */
  private shownCopyResult(): string | null {
    const pending = this.pending;
    if (pending === null || pending.answer === null) return null;
    const selected = this.selectedFinding;
    // `pending.report === this.report` is belt and braces: `willUpdate` already drops `pending` on any report change, so no test can
    // reach a state where only this guard holds (TESTS-007). It stays so the rule does not depend on the order of the two.
    return selected !== null && sameKey(selected, pending.key) && pending.report === this.report ? pending.answer : null;
  }

  // ---- Focus and announcements.

  protected override willUpdate(changed: PropertyValues<this>): void {
    // On every update: any property can detach the focused node (a report swap, a state change); `updated` moves focus only when
    // the captured node is gone.
    this.focusedBefore = this.shadowRoot?.activeElement ?? null;
    const pending = this.pending;
    if (pending !== null) {
      // A change of the property since the press is the host's answer (the value present at press time is stale).
      if (changed.has('copyResult')) pending.answer = this.copyResult;
      // The selection or the report moved on: the pressed finding is no longer the one shown.
      const selected = this.selectedFinding;
      if (changed.has('selectedFinding') && (selected === null || !sameKey(selected, pending.key))) this.pending = null;
      else if (changed.has('report') && pending.report !== this.report) this.pending = null;
    }
    const input = announcementInput({
      status: this.status,
      report: this.report,
      missionId: this.missionId,
      now: this.now,
      refusalCode: this.refusalCode,
      errorMessage: this.errorMessage,
      copyResult: this.shownCopyResult(),
      labels: this.labels,
      rescanning: this.rescanning,
    });
    const before = this.lastInput;
    if (this.announcing && before !== null && input.rescanning && !before.rescanning && input.state !== 'loading') {
      this.rescanBase = input;
      this.rescanSpoke = false;
    }
    if (this.announcing) {
      let text = nextAnnouncement(before, input, this.labels);
      const copyText = input.copyResult === null ? null : lookup(COPY_RESULT_TEXT, input.copyResult);
      // A line other than the start or a copy answer already told the host's news: the end of the rescan has nothing to add.
      if (text !== null && text !== RESCANNING_ANNOUNCEMENT && text !== copyText) this.rescanSpoke = true;
      // The rescan ends in this update: its line is decided now, against the input captured when it started (NFR-005, no timers).
      // A host that clears the flag before it delivers the report hears "no changes", then the report's own line.
      if (this.rescanBase !== null && before?.rescanning === true && !input.rescanning) {
        const end = this.rescanSpoke ? null : rescanCompletion(this.rescanBase, input, this.labels);
        this.rescanBase = null;
        if (end !== null) {
          // One update speaks one line: a copy answer that lands with the end of the rescan is kept, the end follows it.
          const manualPending = text !== null && input.copyResult === 'manual' && text === copyText;
          text = text === null || manualPending ? end : /[.!?]$/.test(text) ? `${text} ${end}` : `${text}${ANNOUNCEMENT_SEPARATOR}${end}`;
        }
      }
      if (text !== null && input.copyResult === 'manual' && text === lookup(COPY_RESULT_TEXT, input.copyResult)) {
        // Announced by `manualReadBack`, once the selection says whether the command really is selected (FR-021).
        this.awaitingReadBack = true;
      } else if (text !== null) {
        this.announcement = text;
        this.announcementSeq += 1;
        this.awaitingReadBack = false;
      }
    }
    this.lastInput = input;
    this.announcing = true;
  }

  /** When the focused element was detached by an update, focus moves to the list, else the `h1`, else the root (FR-025). */
  protected override updated(): void {
    const before = this.focusedBefore;
    this.focusedBefore = null;
    if (before === null) return;
    if (!before.isConnected) {
      void this.moveFocusIntoView();
      return;
    }
    // A control that stays connected but stops being focusable (the lane table's scroller once it no longer overflows) loses focus
    // at the browser's next focus fix-up, after this update: look again once the frame has been rendered. This is the one recovery
    // for that case (a synchronous check here would find focus still in place), pinned by the a11y 620 to 1600 scroller test.
    requestAnimationFrame(() => {
      if (before.isConnected && this.focusFellToBody()) void this.moveFocusIntoView();
    });
  }

  /** FR-025's definition of lost: nothing inside this screen has focus and the page's active element is the body (or none). */
  private focusFellToBody(): boolean {
    const active = document.activeElement;
    return (this.shadowRoot?.activeElement ?? null) === null && (active === null || active === document.body);
  }

  /**
   * A freshly created `sk-page-header` has no slot in its shadow root until its first render, so the slotted `h1` takes no
   * focus in the task that created it: the move waits for the headers' own updates (a microtask), then lands.
   */
  private async moveFocusIntoView(): Promise<void> {
    const headers = Array.from(this.renderRoot.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-page-header'));
    await Promise.all(headers.map((header) => header.updateComplete ?? Promise.resolve()));
    const target =
      this.renderRoot.querySelector<HTMLElement>('[data-region="listbox"] [role="option"][tabindex="0"]') ??
      this.renderRoot.querySelector<HTMLElement>('h1') ??
      this.renderRoot.querySelector<HTMLElement>('[data-root]');
    if (target === null) return;
    if (target.tabIndex < 0) target.tabIndex = -1;
    target.focus();
  }

  // ---- Part props: each builder reads the screen's properties and nothing else.

  private headerProps(state: DriftScreenStatus): HeaderProps {
    return {
      state,
      report: this.shownReport(state),
      scope: this.missionId === '' ? null : missionNaming(this.missionId, this.missions),
      rescanning: this.rescanning,
      now: this.now,
      hooks: this.labels,
      onRescan: () => this.rescanDrift(),
    };
  }

  private stateProps(state: DriftScreenStatus): StateProps {
    return {
      report: this.shownReport(state),
      now: this.now,
      hooks: this.labels,
      refusalText: this.errorMessage !== '' ? this.errorMessage : resolveDriftRefusal(this.refusalCode, this.labels),
      stale: this.selectedFinding !== null && this.selectedPosition(state) === -1,
      onRetry: () => this.retryLoad(),
      onReturnToMissions: () => this.openMissions(),
    };
  }

  private listProps(report: DriftReportView, index: number): ListProps {
    return {
      report,
      selectedIndex: index,
      scoped: this.missionId !== '',
      missions: this.missions,
      hooks: this.labels,
      onSelect: (key) => this.selectFinding(key),
    };
  }

  private detailProps(): DetailProps {
    return {
      onOpenMission: () => this.openMission(),
      table: { overflowing: this.laneTable.overflowing },
      resolution: { result: this.shownCopyResult(), onCopy: () => this.copyCommand(), onManualReadBack: (selected) => this.manualReadBack(selected) },
    };
  }

  private renderDetailRegion(state: DriftScreenStatus): TemplateResult {
    const view = this.selectedView();
    if (view !== null) {
      const props = this.detailProps();
      return html`<div data-region="detail" data-detail="finding">${renderDetail(view, props)}</div>`;
    }
    const stateProps = this.stateProps(state);
    return html`<div data-region="detail" data-detail=${stateProps.stale ? 'stale' : 'choose'}>${renderChoose(stateProps)}</div>`;
  }

  private renderReady(report: DriftReportView, state: DriftScreenStatus): TemplateResult {
    const index = this.selectedPosition(state);
    const list = this.listProps(report, index);
    return html`<div data-layout>
      <div data-region="list">
        <div data-region="head">${renderHead(list)}</div>
        ${report.truncated ? html`<div data-region="truncation">${renderTruncationNote(this.stateProps(state))}</div>` : nothing}
        <div data-region="listbox">${renderListbox(list)}</div>
      </div>
      ${this.renderDetailRegion(state)}
    </div>`;
  }

  private renderState(state: Exclude<DriftScreenStatus, 'ready'>): TemplateResult {
    const props = this.stateProps(state);
    const body = state === 'loading' ? renderLoading(props) : state === 'error' ? renderError(props) : state === 'not-found' ? renderNotFound(props) : renderClean(props);
    return html`<div data-region="state">${body}</div>`;
  }

  protected override render(): TemplateResult {
    const state = this.effectiveState();
    const report = this.shownReport(state);
    const content = state === 'ready' && report !== null ? this.renderReady(report, state) : this.renderState(state === 'ready' ? 'loading' : state);
    // A11Y-004: the root is busy only for the first load; during a rescan the busy state sits on the Rescan control.
    const busy = state === 'loading';
    return html`<div data-root tabindex="-1" data-state=${state} aria-busy=${busy ? 'true' : 'false'}>
        <div data-region="header">${renderHeader(this.headerProps(state))}</div>
        ${content}
      </div>
      <div data-live role="status" aria-live="polite">${this.announcement === '' ? nothing : keyed(this.announcementSeq, html`<span data-seq=${this.announcementSeq}>${this.announcement}</span>`)}</div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-select-finding': CustomEvent<SkSelectFindingDetail>;
    'sk-rescan-drift': CustomEvent<SkRescanDriftDetail>;
    'sk-copy-command': CustomEvent<SkCopyCommandDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-drift-screen': SkDriftScreen;
  }
}
