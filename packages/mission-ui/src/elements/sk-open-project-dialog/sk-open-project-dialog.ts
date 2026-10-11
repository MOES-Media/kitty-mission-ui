// The open-project dialog: a native modal `dialog` the host places beside the Projects screen. The host does the real folder
// picking and listing; this element only draws and reports. No I/O, no timers, nothing stored (`showModal` and `close` are DOM
// calls). It is frozen after the skeleton work package: the folder listbox is the part `folder-list-parts.ts`, whose body (and
// styles) the region work package replaces. Not self-registering: `src/index.ts` defines the tag once.
// Exception E-32 (this file only; sunset: spec-kitty-design#503, a modal dialog with slots): the dialog chrome, the backdrop and the mono path field.
import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '@spec-kitty/elements';
import {
  CANCEL_LABEL,
  CLOSE_LABEL,
  CONFIRM_LABEL,
  DIALOG_EYEBROW,
  DIALOG_HINT,
  DIALOG_TITLE,
  FOLDERS_EMPTY_TEXT,
  FOLDERS_ERROR_BODY,
  FOLDERS_LOADING_TEXT,
  FOLDER_FIELD_LABEL,
  FOLDER_LIST_LABEL,
  OPEN_DISABLED_REASON,
  ENTRY_RETRY_LABEL,
} from '../../defaults/index.js';
import { foldersRetryDetail } from '../../logic/index.js';
import type { RetryLoadDetail } from '../../logic/index.js';
import type { FolderEntry } from '../../project-types.js';
import { normaliseViewState } from '../../view-state.js';
import type { ViewState } from '../../view-state.js';
import { visuallyHidden } from '../../visually-hidden.js';
import { folderListStyles, renderFolderList } from './folder-list-parts.js';

/** Payload of `sk-browse-folder`: the host's opaque `location` of the folder that was selected. */
export interface SkBrowseFolderDetail {
  location: string;
}
/** Payload of `sk-confirm-open-project`: the `location` of the selected, valid folder. */
export interface SkConfirmOpenProjectDetail {
  location: string;
}

/** The deepest active element, looking through shadow roots. */
function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** The hint's text with each path-like marker (a word ending in a slash, such as the two folder names) drawn as `code`; the words stay in `defaults/`. */
function hintParts(hint: string): (string | TemplateResult)[] {
  return hint.split(/(\S+\/)/).map((part, index) => (index % 2 === 1 ? html`<code>${part}</code>` : part));
}

/**
 * The open-project dialog. Semi-controlled: Cancel, Escape and a backdrop click set `open` false themselves and emit nothing.
 * It is a widget, not a screen: it has a `status` property (the folder listing) and carries no screen marker.
 *
 * @element sk-open-project-dialog
 * @tagname sk-open-project-dialog
 *
 * @fires {CustomEvent<SkBrowseFolderDetail>} sk-browse-folder - a folder option was selected
 * @fires {CustomEvent<SkConfirmOpenProjectDetail>} sk-confirm-open-project - Open was activated while the selected folder is a valid project
 * @fires {CustomEvent<RetryLoadDetail>} sk-retry-load - Retry was activated on a failed folder listing (`folders`)
 */
export class SkOpenProjectDialog extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
      }
      dialog {
        box-sizing: border-box;
        padding: 0;
        overflow: hidden;
        font-size: var(--sk-text-sm);
        line-height: 1.5;
        width: min(680px, calc(100vw - 32px));
        max-height: min(720px, calc(100vh - 32px));
        border: var(--sk-border-width-1) solid var(--sk-border-control);
        border-radius: var(--sk-radius-lg);
        background: var(--sk-surface-card);
        color: var(--sk-fg-body);
        box-shadow: 0 24px 80px rgb(0 0 0 / 0.48);
      }
      dialog::backdrop {
        background: rgb(3 6 10 / 0.72);
      }
      /* An author display value beats the UA closed-dialog rule: only the open dialog is a grid. */
      dialog[open] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
      }
      [data-card] {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
      }
      [data-region='header'] {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--sk-space-4);
        padding: var(--sk-space-4) var(--sk-space-5);
        border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
      }
      [data-region='header'] > div {
        display: grid;
        gap: var(--sk-space-1);
      }
      /* E-32 (d): the title is the 18px display face; the field label is the 600 weight. */
      h2 {
        margin: 0;
        font-family: var(--sk-font-display);
        font-size: var(--sk-text-lg);
        line-height: 1.3;
      }
      sk-form-input::part(label) {
        font-weight: var(--sk-weight-semibold);
        margin-block: 0 var(--sk-space-1);
      }
      /* E-32 (c): the eyebrow takes the page header's eyebrow treatment; the hint and the reason are muted; the markers are mono. */
      [data-eyebrow] {
        font-family: var(--sk-font-mono);
        font-size: var(--sk-text-xs);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--sk-fg-subtle);
      }
      [data-hint],
      [data-reason] {
        color: var(--sk-fg-muted);
      }
      code {
        font-family: var(--sk-font-mono);
      }
      [data-region='body'] {
        display: grid;
        gap: var(--sk-space-3);
        align-content: start;
        padding: var(--sk-space-5);
        overflow: auto;
        min-width: 0;
      }
      [data-region='actions'] {
        display: flex;
        justify-content: flex-end;
        gap: var(--sk-space-4);
        padding: var(--sk-space-4) var(--sk-space-5);
        border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
      }
      [data-region='folders'] {
        min-width: 0;
      }
      /* The listing error's Try again sits the screen error's 12px under the notice (the same token gap). */
      [data-state='error'] sk-button {
        margin-block: var(--sk-space-3) 0;
      }
      sk-form-input::part(control) {
        font-family: var(--sk-font-mono);
        font-size: var(--sk-text-sm);
        min-height: calc(var(--sk-space-9) - var(--sk-border-width-2));
      }
      /* E-32 (f): the footer buttons are the prototype's 44px, 14px semibold pills; Cancel keeps the quiet pill border. */
      [data-region='actions'] sk-button::part(button) {
        min-height: calc(var(--sk-space-8) + var(--sk-space-1));
        padding: var(--sk-space-2) var(--sk-space-4);
        font-size: var(--sk-text-sm);
        font-weight: var(--sk-weight-semibold);
      }
      [data-cancel]::part(button) {
        border: var(--sk-border-width-1) solid var(--sk-border-default);
      }
      p {
        margin: 0;
      }
      [data-live] {
        ${visuallyHidden}
      }
    `,
    folderListStyles,
  ];

  /** Whether the dialog is open; semi-controlled: Cancel, Escape and a backdrop click set it false. */
  @property({ type: Boolean, reflect: true })
  open = false;

  /** The location shown in the read-only folder field; opaque host text. */
  @property()
  location = '';

  /** The folders of the listing in host order. */
  @property({ attribute: false })
  folders: FolderEntry[] = [];

  /** The `location` of the selected folder, or null; controlled by the host. */
  @property({ attribute: false })
  selected: string | null = null;

  /** The view state of the folder listing; unknown values collapse to `empty`. */
  @property({ reflect: true })
  status: ViewState = 'ready';

  private opener: Element | null = null;
  private announcement = '';
  private announcementSeq = 0;
  private lastText: string | null = null;
  /** The option that holds the listbox's one tab stop: set by the arrow keys, reset only when `folders` or `selected` changes. */
  private activeIndex = 0;
  /** The dialog's focused node at the start of the update; moved only when the update detached it. */
  private focusedBefore: Element | null = null;

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('folders') || changed.has('selected')) {
      // One tab stop: the selected option, else the first.
      const stop = this.folders.findIndex((folder) => folder.location === this.selected);
      this.activeIndex = stop < 0 ? 0 : stop;
    }
    // The element that had focus when the dialog opened gets it back after the close, if it is still connected.
    if (changed.has('open') && this.open) this.opener = deepActiveElement();
    // On EVERY update (the Projects screen's pattern): any property can detach the focused node.
    this.focusedBefore = this.shadowRoot?.activeElement ?? null;
    const text = this.listingText();
    // Announcements follow what is shown; nothing is announced for the first content.
    if (this.lastText !== null && text !== this.lastText) {
      this.announcement = text;
      this.announcementSeq += 1;
    }
    this.lastText = text;
  }

  protected override updated(changed: PropertyValues<this>): void {
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>('dialog');
    if (dialog === null) return;
    const before = this.focusedBefore;
    this.focusedBefore = null;
    if (this.open && !dialog.open) {
      dialog.showModal();
      void this.focusFirstControl(dialog);
    } else if (this.open && before !== null && !before.isConnected) {
      // The update removed the focused control (Retry on a listing that began loading): focus would fall to the body.
      void this.focusFirstControl(dialog);
    } else if (!this.open && dialog.open) {
      dialog.close();
    }
    if (changed.has('open') && !this.open && changed.get('open') === true) this.returnFocus();
  }

  /** The first control: the listbox's active option, else Cancel. */
  private async focusFirstControl(dialog: HTMLDialogElement): Promise<void> {
    const option = dialog.querySelector<HTMLElement>('[role="option"][tabindex="0"]');
    const target = option ?? dialog.querySelector<HTMLElement & { updateComplete?: Promise<unknown> }>('[data-cancel]');
    if (target === null) return;
    // A library button that has not rendered yet has no focusable control inside it: wait for its own first render.
    if ('updateComplete' in target) await (target as { updateComplete?: Promise<unknown> }).updateComplete;
    if (dialog.open) target.focus();
  }

  private returnFocus(): void {
    const opener = this.opener;
    this.opener = null;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  }

  /** The words the listing shows now, which the polite status region announces. */
  private listingText(): string {
    const state = normaliseViewState(this.status);
    if (state === 'loading') return FOLDERS_LOADING_TEXT;
    if (state === 'error') return FOLDERS_ERROR_BODY;
    if (state === 'empty') return FOLDERS_EMPTY_TEXT;
    return `${FOLDER_LIST_LABEL}, ${this.folders.length}`;
  }

  /** The selected folder when the listing is ready, it exists in the listing and the host flagged it a valid project. */
  private selectedValid(): FolderEntry | null {
    // Open is offered only while the listing is shown (`ready`): a failed, empty or loading listing has nothing to open.
    if (normaliseViewState(this.status) !== 'ready') return null;
    const folder = this.folders.find((candidate) => candidate.location === this.selected);
    return folder !== undefined && folder.valid ? folder : null;
  }

  // ---- Closing: Cancel, Escape and a backdrop click set `open` false and emit nothing.

  protected closeDialog(): void {
    this.open = false;
  }

  private readonly onCancel = (event: Event): void => {
    // Escape: the element decides, so `open` and the native state cannot disagree.
    event.preventDefault();
    this.closeDialog();
  };

  private readonly onClick = (event: MouseEvent): void => {
    // The card fills the dialog, so a click on the dialog itself is a click on the backdrop.
    if (event.target === event.currentTarget) this.closeDialog();
  };

  // A native close that no request caused (for example the dialog was closed by script) cannot leave the property stale.
  private readonly onClose = (): void => {
    if (this.open) this.open = false;
  };

  // ---- Dispatch methods: the only places this element builds an event.

  protected selectFolder(location: string): void {
    const detail: SkBrowseFolderDetail = { location };
    this.dispatchEvent(new CustomEvent<SkBrowseFolderDetail>('sk-browse-folder', { detail, bubbles: true, composed: true }));
  }

  /** Open: only for a selected folder the host flagged valid; the payload is that folder's `location`. */
  protected confirmOpen(): void {
    const folder = this.selectedValid();
    if (folder === null) return;
    const detail: SkConfirmOpenProjectDetail = { location: folder.location };
    this.dispatchEvent(new CustomEvent<SkConfirmOpenProjectDetail>('sk-confirm-open-project', { detail, bubbles: true, composed: true }));
  }

  protected retryFolders(): void {
    const detail: RetryLoadDetail = foldersRetryDetail();
    this.dispatchEvent(new CustomEvent<RetryLoadDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  // ---- Rendering.

  private renderListing(): TemplateResult | typeof nothing {
    const state = normaliseViewState(this.status);
    if (state === 'loading') return html`<p data-state="loading" aria-busy="true">${FOLDERS_LOADING_TEXT}</p>`;
    if (state === 'empty') return html`<p data-state="empty">${FOLDERS_EMPTY_TEXT}</p>`;
    if (state === 'error') {
      return html`<div data-state="error">
        <sk-notice tone="danger" announce="off">${FOLDERS_ERROR_BODY}</sk-notice>
        <sk-button variant="secondary" @click=${() => this.retryFolders()}>${ENTRY_RETRY_LABEL}</sk-button>
      </div>`;
    }
    return renderFolderList({
      folders: this.folders,
      selected: this.selected,
      activeIndex: this.activeIndex,
      onSelect: (location: string) => this.selectFolder(location),
      onActive: (index: number) => {
        this.activeIndex = index;
      },
    });
  }

  protected override render(): TemplateResult {
    const valid = this.selectedValid() !== null;
    return html`<dialog aria-labelledby="open-project-title" @cancel=${this.onCancel} @click=${this.onClick} @close=${this.onClose}>
      <div data-card>
        <div data-region="header">
          <div>
            <p data-eyebrow>${DIALOG_EYEBROW}</p>
            <h2 id="open-project-title">${DIALOG_TITLE}</h2>
          </div>
          <sk-button size="icon" variant="ghost" label=${CLOSE_LABEL} @click=${() => this.closeDialog()}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </sk-button>
        </div>
        <div data-region="body">
          <sk-form-input label=${FOLDER_FIELD_LABEL} readonly .value=${this.location}></sk-form-input>
          <div data-region="folders">${this.renderListing()}</div>
          <p data-hint>${hintParts(DIALOG_HINT)}</p>
          ${valid ? nothing : html`<p id="open-reason" data-reason>${OPEN_DISABLED_REASON}</p>`}
        </div>
        <div data-region="actions">
          <sk-button data-cancel variant="ghost" @click=${() => this.closeDialog()}>${CANCEL_LABEL}</sk-button>
          <sk-button variant="primary" ?disabled=${!valid} @click=${() => this.confirmOpen()}>${CONFIRM_LABEL}</sk-button>
        </div>
        <div data-live role="status" aria-live="polite">
          ${this.announcement === '' ? nothing : keyed(this.announcementSeq, html`<span data-seq=${this.announcementSeq}>${this.announcement}</span>`)}
        </div>
      </div>
    </dialog>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-browse-folder': CustomEvent<SkBrowseFolderDetail>;
    'sk-confirm-open-project': CustomEvent<SkConfirmOpenProjectDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-open-project-dialog': SkOpenProjectDialog;
  }
}
