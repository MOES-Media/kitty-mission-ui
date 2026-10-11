import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '@spec-kitty/elements';
import { CURSOR_REFUSAL_CODE, OPS_VOCABULARY, profileFactText } from '../../defaults/ops-copy.js';
import { buildOpsRow, copyResolver, lookAnnouncement, opsCopyText, opsCountLabel, opsEmptyText, opsErrorText, opsRetryDetail, opsSkippedLabel, resolveOpsLook } from '../../logic/index.js';
import type { OpsLabelHooks, OpsLookResult } from '../../logic/index.js';
import type { OpsInvocationView, PageInfo, Project } from '../../contract/types.js';
import { visuallyHidden } from '../../visually-hidden.js';
import type { SkLoadMoreDetail } from '../sk-missions-screen/sk-missions-screen.js';
import type { OpsPageRetryDetail } from '../../retry-types.js';
import { opsPageStyles, renderOpsFrame, renderOpsPage } from './ops-page-parts.js';
import type { OpsPageView } from './ops-page-parts.js';
import { opsRowStyles, renderOpsRow } from './ops-row-parts.js';
import { opsStateStyles, renderOpsEmpty, renderOpsError, renderOpsLoading } from './ops-state-parts.js';
import { emptyStateSheet } from '../../library-sheets.js';
import { progressSheet } from '../../progress-sheet.js';

/** The view state of the Ops screen; any other string collapses to `empty`. */
export type OpsScreenStatus = 'loading' | 'error' | 'empty' | 'ready';

/** The failure of a load-more request: its refusal code as the service gave it, or null when it carried none. */
export interface OpsLoadMoreError {
  code: string | null;
}

/** Payload of `sk-retry-load` from this screen: the Ops member of the event union (`src/retry-types.ts`), never declared again. */
export type SkOpsRetryLoadDetail = OpsPageRetryDetail;

/**
 * The Ops screen: a read-only list of invocation records, newest first, one page at a time. No I/O, nothing stored; the host
 * owns loading, paging and the filter by profile. The screen sorts nothing and counts nothing (`items.length` aside).
 * Renders inside the `sk-mission-shell` content slot. Not self-registering: `src/index.ts` defines the tag once.
 *
 * @screen
 * @element sk-ops-screen
 * @tagname sk-ops-screen
 *
 * @fires {CustomEvent<SkLoadMoreDetail>} sk-load-more - Load more was activated while a next page exists and `loadingMore` is false; once per cursor until `loadingMore`, `items` or `pageInfo` changes
 * @fires {CustomEvent<SkOpsRetryLoadDetail>} sk-retry-load - Retry was activated: `{ target: 'ops-page' }` for the first page or a refresh from the newest, with `cursor` to retry the page after it
 */
export class SkOpsScreen extends LitElement {
  static override styles = [
    emptyStateSheet,
    progressSheet,
    opsPageStyles,
    opsRowStyles,
    opsStateStyles,
    css`
    :host {
      display: block;
      min-width: 0;
    }
    [data-live] {
      ${visuallyHidden}
    }
  `,
  ];

  /** The view state; unknown values collapse to `empty`. */
  @property({ reflect: true })
  status: OpsScreenStatus = 'loading';

  /** The project (its name is the header's supporting line); null draws no line. */
  @property({ attribute: false })
  project: Project | null = null;

  /** The accumulated records in service order; never re-sorted. */
  @property({ attribute: false })
  items: OpsInvocationView[] = [];

  /** Pagination state of the last loaded page. */
  @property({ attribute: false })
  pageInfo: PageInfo | null = null;

  /** The total the service reports, shown as given. */
  @property({ type: Number, attribute: 'total-count' })
  totalCount = 0;

  /** The records the service could not read, shown as given. */
  @property({ type: Number, attribute: 'skipped-count' })
  skippedCount = 0;

  /** The profile filter the host applied; null when none. */
  @property()
  profile: string | null = null;

  /** The Load more control is busy and inert while true; host-owned. */
  @property({ type: Boolean, attribute: 'loading-more' })
  loadingMore = false;

  /** The failure of the last load-more request; read only in the ready look. */
  @property({ attribute: false })
  loadMoreError: OpsLoadMoreError | null = null;

  /** The refusal code of the first-page failure; read only in the error look. */
  @property({ attribute: 'refusal-code' })
  refusalCode: string | null = null;

  /** Word, time and copy hooks. */
  @property({ attribute: false })
  labels: OpsLabelHooks | null = null;

  /** Overrides the error sentence. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  // The one polite live region: the text of the last announcement, keyed on a sequence number so a repeated text is still new.
  private announcement = '';
  private announcementSeq = 0;
  private announcing = false;
  // What was shown at the last update: the look and reason, the rows shown, the identity of the page (its first record and its
  // next-page cursor), whether Load more was busy, and the load-more error (as a key, or null).
  private shown: {
    look: OpsLookResult['look'] | null;
    reason: OpsLookResult['reason'] | null;
    rows: number;
    firstId: string | null;
    cursor: string | null;
    busy: boolean;
    errorKey: string | null;
  } = {
    look: null,
    reason: null,
    rows: 0,
    firstId: null,
    cursor: null,
    busy: false,
    errorKey: null,
  };
  private current: OpsLookResult = { look: 'loading', reason: 'status' };
  // The cursor of the Load more request already emitted and not yet answered.
  private requestedCursor: string | null = null;
  // The element that had focus inside the shadow root when the current update began.
  private focusedBefore: Element | null = null;

  // ---- Dispatch: one literal site per event; the part files receive these as arguments.

  protected loadMore(): void {
    const cursor = this.pageInfo?.nextPageCursor ?? null;
    if (this.current.look !== 'ready' || this.pageInfo?.hasNextPage !== true || cursor === null) return;
    if (this.loadingMore || cursor === this.requestedCursor) return;
    this.requestedCursor = cursor;
    const detail: SkLoadMoreDetail = { cursor };
    this.dispatchEvent(new CustomEvent<SkLoadMoreDetail>('sk-load-more', { detail, bubbles: true, composed: true }));
  }

  protected retryPage(): void {
    const detail = this.retryPayload();
    if (detail === null) return;
    this.dispatchEvent(new CustomEvent<SkOpsRetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  /**
   * The retry payload, or null when the control is inert: the error look retries the first page; a load-more error retries the
   * page after the next cursor, or (when the cursor was refused) starts again from the newest; with no cursor to send there is
   * nothing to build.
   */
  private retryPayload(): SkOpsRetryLoadDetail | null {
    if (this.current.look === 'error') return opsRetryDetail();
    if (this.current.look !== 'ready' || this.loadMoreError === null) return null;
    if (this.loadMoreError.code === CURSOR_REFUSAL_CODE) return opsRetryDetail();
    const cursor = this.pageInfo?.nextPageCursor ?? null;
    return cursor === null ? null : opsRetryDetail(cursor);
  }

  // ---- Announcements and focus.

  protected override willUpdate(changed: PropertyValues<this>): void {
    // The host answered (`loadingMore` moved, a page arrived or `pageInfo` was replaced): Load more may ask again.
    if (changed.has('loadingMore') || changed.has('items') || changed.has('pageInfo')) this.requestedCursor = null;
    // On every update: any property can detach the focused node; `updated` moves focus only when the captured node is gone.
    this.focusedBefore = this.shadowRoot?.activeElement ?? null;

    this.current = resolveOpsLook({ status: this.status, items: this.items, profile: this.profile });
    const { look, reason } = this.current;
    const rows = look === 'ready' ? this.items.length : 0;
    const code = this.loadMoreError?.code;
    const errorKey = look !== 'ready' || this.loadMoreError === null ? null : code === null || code === undefined ? '' : `c:${code}`;
    const firstId = look === 'ready' ? (this.items[0]?.invocationId ?? null) : null;
    const cursor = look === 'ready' ? (this.pageInfo?.nextPageCursor ?? null) : null;
    const previous = this.shown;
    if (this.announcing) {
      const text = this.announcementText(previous, rows, firstId, cursor, errorKey);
      if (text !== null) {
        this.announcement = text;
        this.announcementSeq += 1;
      }
    }
    this.shown = { look, reason, rows, firstId, cursor, busy: this.loadingMore, errorKey };
    this.announcing = true;
  }

  /**
   * The text for the change since `previous`, or null when nothing that is announced changed: the load-more error appearing; Load
   * more starting; a different look; or, in the ready look, a different page (its rows, or its first record or next-page cursor,
   * differ). The empty look is one look however it is reached, so its reason is ignored.
   */
  private announcementText(previous: SkOpsScreen['shown'], rows: number, firstId: string | null, cursor: string | null, errorKey: string | null): string | null {
    const { look, reason } = this.current;
    if (errorKey !== null && errorKey !== previous.errorKey) {
      return opsCopyText(this.loadMoreError?.code === CURSOR_REFUSAL_CODE ? 'refusedCursor' : 'loadMoreError', this.labels);
    }
    const sameReason = look === 'empty' || reason === previous.reason;
    const samePage = look !== 'ready' || (previous.look === 'ready' && firstId === previous.firstId && cursor === previous.cursor);
    if (look === previous.look && sameReason && rows === previous.rows && samePage) {
      // Nothing about the look or the rows moved: Load more starting is the one change left to announce.
      return look === 'ready' && this.loadingMore && !previous.busy ? opsCopyText('announceLoadingMore', this.labels) : null;
    }
    // Rows were added by a load-more only when the page is the same one grown (its first record is still first).
    const added = look === 'ready' && previous.look === 'ready' && previous.rows > 0 && rows > previous.rows && firstId === previous.firstId ? rows - previous.rows : null;
    return lookAnnouncement(this.current, { loaded: rows, total: this.totalCount, added }, this.labels);
  }

  /** When the focused element was detached by an update and focus fell to the body, focus moves to the heading of what is shown. */
  protected override updated(): void {
    const before = this.focusedBefore;
    this.focusedBefore = null;
    if (before === null || before.isConnected) return;
    void this.moveFocusIntoView();
  }

  private async moveFocusIntoView(): Promise<void> {
    await this.updateComplete;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const target = this.shadowRoot?.querySelector<HTMLElement>('[data-focus-target]');
    if (target === null || target === undefined) return;
    target.tabIndex = -1;
    target.focus();
  }

  // ---- Views.

  private pageView(): OpsPageView {
    const labels = this.labels;
    const copy = (key: Parameters<typeof opsCopyText>[0]): string => opsCopyText(key, labels);
    const cursor = this.pageInfo?.nextPageCursor ?? null;
    const refused = this.loadMoreError?.code === CURSOR_REFUSAL_CODE;
    return {
      eyebrow: copy('headerEyebrow'),
      title: copy('headerTitle'),
      badge: copy('headerBadge'),
      supporting: this.project === null || this.project.name === '' ? null : `${this.project.name}${copy('headerSeparator')}${copy('headerSupportingTail')}`,
      notice: copy('sourceNotice'),
      sectionEyebrow: copy('sectionEyebrow'),
      sectionHeading: copy('sectionHeading'),
      countText: opsCountLabel(this.items.length, this.totalCount, labels),
      profileFact: this.profile === null ? null : profileFactText(this.profile, copyResolver(labels)),
      skippedNote: this.skippedCount > 0 ? opsSkippedLabel(this.skippedCount, labels) : null,
      loadMore:
        this.loadMoreError === null && this.pageInfo?.hasNextPage === true && cursor !== null
          ? { label: copy('loadMore'), busy: this.loadingMore }
          : null,
      loadMoreError:
        this.loadMoreError === null
          ? null
          : {
              sentence: copy(refused ? 'refusedCursor' : 'loadMoreError'),
              actionLabel: copy(refused ? 'refreshAction' : 'retryLabel'),
              inert: this.retryPayload() === null,
            },
    };
  }

  /** What the look draws below the shared header and source notice (OP-36). */
  private renderLook(): TemplateResult {
    const labels = this.labels;
    switch (this.current.look) {
      case 'ready': {
        const rows = this.items.map((item) => renderOpsRow(buildOpsRow(item, OPS_VOCABULARY, labels)));
        return renderOpsPage(this.pageView(), { onLoadMore: () => this.loadMore(), onRetry: () => this.retryPage() }, html`${rows}`);
      }
      case 'error':
        return renderOpsFrame(
          this.pageView(),
          renderOpsError(
            {
              heading: opsCopyText('errorHeading', labels),
              body: opsErrorText(this.refusalCode, this.errorMessage, labels),
              refusalCode: this.refusalCode,
              retryLabel: opsCopyText('retryLabel', labels),
            },
            () => this.retryPage(),
          ),
        );
      case 'empty':
        return renderOpsFrame(this.pageView(), renderOpsEmpty({ ...opsEmptyText(this.profile, this.skippedCount, labels), profile: this.profile }));
      default:
        return renderOpsFrame(this.pageView(), renderOpsLoading({ label: opsCopyText('loadingLabel', labels), body: opsCopyText('loadingBody', labels) }));
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div data-live role="status" aria-live="polite">${this.announcement === '' ? nothing : keyed(this.announcementSeq, html`<span>${this.announcement}</span>`)}</div>
      <div data-ops-root data-look=${this.current.look}>${this.renderLook()}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sk-ops-screen': SkOpsScreen;
  }
}
