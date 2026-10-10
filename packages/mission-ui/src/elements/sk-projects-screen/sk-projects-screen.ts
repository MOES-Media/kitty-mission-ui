// The Projects screen: header band, toolbar, the list of recent projects (or one whole-list state) and the read-only notice.
// No I/O, nothing stored; the host owns loading, routing and the clock. Renders inside the `sk-mission-shell` content slot
// with `layout="picker"` and `flush`: the screen pads its own inset parts (the Pipeline screen's precedent). Not
// self-registering: `src/index.ts` defines the tag once.
//
// This file draws every `data-region` element and the polite live region; a part returns the BODY of its region only, never
// decides whether its region is drawn and never dispatches an event. It is frozen after the skeleton work package: the
// region work packages replace part bodies and part styles only.
// Narrow column (DP-22; sunset: spec-kitty-design#529): `width: min(900px, 100%)` is the one pinned grant of the CP-1 ruling (no lint-clean form exists).
import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import { repeat } from 'lit/directives/repeat.js';
import '@spec-kitty/elements';
import {
  ENTRY_ERROR_TEXT,
  ENTRY_LOADING_TEXT,
  ENTRY_UNAVAILABLE_TEXT,
  LIST_EMPTY_TITLE,
  LIST_ERROR_BODY,
  LIST_LOADING_TEXT,
  projectCountText,
} from '../../defaults/index.js';
import { buildRow, projectRetryDetail, projectsRetryDetail } from '../../logic/index.js';
import type { EntryView, ProjectRowView, RetryLoadDetail } from '../../logic/index.js';
import type { ProjectEntry, ProjectLabelHooks } from '../../project-types.js';
import { normaliseViewState } from '../../view-state.js';
import type { ViewState } from '../../view-state.js';
import { progressSheet } from '../../progress-sheet.js';
import { visuallyHidden } from '../../visually-hidden.js';
import { headerStyles, renderHeader, renderToolbar } from './header-parts.js';
import { renderRow, rowStyles } from './row-parts.js';
import { renderListState, renderNotice, stateStyles } from './state-parts.js';

/** Payload of `sk-open-project`: the host's entry key, the only identity an event carries. */
export interface SkOpenProjectDetail {
  key: string;
}

/**
 * The Projects screen. Read-only: it only asks the host to open a project, to open the folder dialog or to read again.
 *
 * @screen
 * @element sk-projects-screen
 * @tagname sk-projects-screen
 *
 * @fires {CustomEvent<SkOpenProjectDetail>} sk-open-project - an openable row was activated; the screen never navigates
 * @fires {CustomEvent<null>} sk-request-open-project - the "Open project" button was activated
 * @fires {CustomEvent<RetryLoadDetail>} sk-retry-load - Retry was activated on a failed row (`project`) or on the failed list (`projects`)
 */
export class SkProjectsScreen extends LitElement {
  static override styles = [
    progressSheet,
    css`
      /* The prototype's body type (E-34 c): 14px on a 1.5 line. */
      :host {
        display: block;
        font-size: var(--sk-text-sm);
        line-height: 1.5;
        min-width: 0;
        container-type: inline-size;
      }
      /* The header band: the screen is flush, so it pads its own inset parts; a column at the header threshold. */
      [data-region='header'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sk-space-5);
        padding: var(--sk-space-4) var(--sk-space-6);
        min-width: 0;
      }
      [data-content] {
        min-width: 0;
        padding: var(--sk-space-6);
      }
      [data-narrow] {
        width: min(900px, 100%);
        margin-inline: auto;
        min-width: 0;
      }
      [data-region='toolbar'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--sk-space-4);
        margin-block: 0 var(--sk-space-5);
      }
      ul {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--sk-space-2);
        margin: 0;
        padding: 0;
        min-width: 0;
      }
      li {
        display: block;
        min-width: 0;
      }
      [data-region='state'] {
        display: block;
        min-width: 0;
      }
      [data-region='notice'] {
        display: block;
        margin-block: var(--sk-space-7) 0;
        min-width: 0;
      }
      [data-live] {
        ${visuallyHidden}
      }
      /* The header stacks at a content cell of 800px or less (CP-1, DP-25: the prototype's viewport 800px, the cell is flush). */
      @container (max-width: 800px) {
        [data-region='header'] {
          flex-direction: column;
          align-items: flex-start;
        }
        [data-content] {
          padding: var(--sk-space-4);
        }
      }
      /* Rows go to one column at 620px or less (CP-1, DP-25): the row styles use the same threshold. */
    `,
    headerStyles,
    rowStyles,
    stateStyles,
  ];

  /** The view state of the whole list; unknown values collapse to `empty`. It wins over every entry state. */
  @property({ reflect: true })
  status: ViewState = 'loading';

  /** The recent projects in host order: never sorted, filtered or grouped. */
  @property({ attribute: false })
  entries: ProjectEntry[] = [];

  /** ISO instant for relative times; null shows the ISO timestamp as given. */
  @property()
  now: string | null = null;

  /** Optional label hooks: `time` and `health`. */
  @property({ attribute: false })
  labels: ProjectLabelHooks | null = null;

  /** Overrides the default body of the whole-list error. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  /** The text of the polite live region; empty until the first change after the first render. */
  private announcement = '';

  /** Counts the announcements: each one re-creates the text node, so a repeated text is still a change a screen reader reads. */
  private announcementSeq = 0;

  /** The views of the current update, in host order (empty unless the list is ready). */
  private views: EntryView[] = [];

  private lastState: ViewState | null = null;
  /** The words of the whole-list state at the previous update (null while the list is ready): a changed text announces even if the state did not. */
  private lastStateText: string | null = null;
  private lastCount: number | null = null;
  /** The kind of every entry at the previous update, by key. */
  private lastKinds = new Map<string, EntryView['kind']>();
  private focusedBefore: Element | null = null;
  private announcing = false;

  protected override willUpdate(): void {
    const state = normaliseViewState(this.status);
    this.views = state === 'ready' ? this.entries.map((entry) => buildRow(entry, this.now, this.labels)) : [];
    // On EVERY update: any property can detach the focused node; `updated` moves focus only when the captured node is gone.
    this.focusedBefore = this.shadowRoot?.activeElement ?? null;
    const kinds = new Map(this.views.map((view) => [view.key, view.kind]));
    if (this.announcing) {
      const text = this.transitionText(state);
      if (text !== null) {
        this.announcement = text;
        this.announcementSeq += 1;
      }
    }
    this.lastState = state;
    this.lastStateText = state === 'ready' ? null : this.stateText(state);
    this.lastCount = state === 'ready' ? this.views.length : null;
    this.lastKinds = kinds;
    this.announcing = true;
  }

  /** What changed on screen since the last update, in words; null when nothing did (first render, same content). */
  private transitionText(state: ViewState): string | null {
    if (state !== this.lastState) return this.stateText(state);
    if (state !== 'ready') {
      // The state is unchanged: only a changed text (the host's error message) is news.
      const words = this.stateText(state);
      return words === this.lastStateText ? null : words;
    }
    const parts: string[] = [];
    if (this.views.length !== this.lastCount) parts.push(projectCountText(this.views.length));
    for (const view of this.views) {
      const before = this.lastKinds.get(view.key);
      if (before === undefined || before === view.kind) continue;
      parts.push(this.entryText(view));
    }
    return parts.length === 0 ? null : parts.join('. ');
  }

  /** The announcement of a whole-list state: the words that state shows. */
  private stateText(state: ViewState): string {
    if (state === 'loading') return LIST_LOADING_TEXT;
    if (state === 'error') return this.errorMessage === '' ? LIST_ERROR_BODY : this.errorMessage;
    if (state === 'empty') return LIST_EMPTY_TITLE;
    return projectCountText(this.views.length);
  }

  /** The announcement of an entry whose kind changed: a row that arrived reads its accessible name, a failed one its sentence. */
  private entryText(view: EntryView): string {
    if (view.kind === 'row') return view.announcementText;
    const sentence = view.kind === 'error' ? ENTRY_ERROR_TEXT : view.kind === 'unavailable' ? ENTRY_UNAVAILABLE_TEXT : ENTRY_LOADING_TEXT;
    return `${view.title}. ${sentence}`;
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

  // ---- Dispatch methods: the only places this screen builds an event.

  /** A row was activated; only a shown, openable row opens (loading, error and unavailable entries are plain). */
  protected openProject(view: ProjectRowView): void {
    if (!view.openable) return;
    const detail: SkOpenProjectDetail = { key: view.key };
    this.dispatchEvent(new CustomEvent<SkOpenProjectDetail>('sk-open-project', { detail, bubbles: true, composed: true }));
  }

  protected requestOpenProject(): void {
    this.dispatchEvent(new CustomEvent<null>('sk-request-open-project', { bubbles: true, composed: true }));
  }

  /** Retry of one failed row; an entry without a key is inert. */
  protected retryProject(key: string): void {
    const detail: RetryLoadDetail | null = projectRetryDetail({ key });
    if (detail === null) return;
    this.dispatchEvent(new CustomEvent<RetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  protected retryProjects(): void {
    const detail: RetryLoadDetail = projectsRetryDetail();
    this.dispatchEvent(new CustomEvent<RetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  // ---- Rendering.

  private renderBody(state: ViewState): TemplateResult {
    if (state !== 'ready') {
      return html`<div data-region="state">
        ${renderListState(state, {
          errorMessage: this.errorMessage,
          onRetry: () => this.retryProjects(),
        })}
      </div>`;
    }
    const ctx = { onOpen: (view: ProjectRowView) => this.openProject(view), onRetry: (key: string) => this.retryProject(key) };
    return html`<ul data-region="list">
      ${repeat(
        this.views,
        (view) => view.key,
        (view) => html`<li data-key=${view.key}>${renderRow(view, ctx)}</li>`,
      )}
    </ul>`;
  }

  protected override render(): TemplateResult {
    const state = normaliseViewState(this.status);
    return html`<div data-root tabindex="-1">
        <div data-region="header">${renderHeader({ onRequestOpen: () => this.requestOpenProject() })}</div>
        <div data-content>
          <div data-narrow>
            <div data-region="toolbar">${renderToolbar({ countText: state === 'ready' ? projectCountText(this.views.length) : null })}</div>
            ${this.renderBody(state)}
            ${state === 'ready' || state === 'empty' ? html`<div data-region="notice">${renderNotice()}</div>` : nothing}
          </div>
        </div>
      </div>
      <div data-live role="status" aria-live="polite">
        ${this.announcement === '' ? nothing : keyed(this.announcementSeq, html`<span data-seq=${this.announcementSeq}>${this.announcement}</span>`)}
      </div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-open-project': CustomEvent<SkOpenProjectDetail>;
    'sk-request-open-project': CustomEvent<null>;
  }
  interface HTMLElementTagNameMap {
    'sk-projects-screen': SkProjectsScreen;
  }
}
