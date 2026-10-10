// The Artifact Viewer: the document pane and the inspector for one artifact of one Mission. No I/O, nothing stored. Renders inside the
// `sk-mission-shell` content slot (`flush`); the shell's tree draws the listing. Not self-registering: `src/index.ts` defines the tag once.
// This file draws every region container and `data-region` element, makes every decision (which state, which view, which words go into
// a view) and dispatches the five events; a part returns the BODY of its region only and never dispatches. Exception E-28: the 270px
// inspector track, in this file only. The screen draws only what agrees with the selection (FORK-3): a content for another path, or a
// listing of another Mission, counts as not loaded.
import { LitElement, css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import '@spec-kitty/elements';
import {
  ANNOUNCE_LISTING_ERROR,
  ANNOUNCE_LISTING_LOADING,
  ARTIFACT_INSPECTOR_LABEL,
  BIDI_NOTICE,
  CONTENT_ERROR_DEFAULT,
  DOCUMENT_LABEL,
  EMPTY_FILE_TEXT,
  EMPTY_LISTING_TEXT,
  FALLBACK_NOTICE,
  FILE_GROUP,
  FILE_NAME_LABEL,
  LINKED_WP_TITLE,
  LISTING_ERROR_DEFAULT,
  LISTING_ERROR_HEADING,
  LISTING_LOADING_TEXT,
  MISSION_GROUP,
  NOTHING_SELECTED_TEXT,
  NOT_FOUND_TEXT,
  NOT_FOUND_TITLE,
  OPEN_WP_LABEL,
  READ_ONLY_NOTE,
  REDACTION_LINE,
  REFUSAL_GENERIC_EYEBROW,
  REFUSAL_TITLE,
  RETRY_LABEL,
  RETURN_LABEL,
  SOURCE_LABEL,
  TABLIST_LABEL,
  TAB_FALLBACK,
  TAB_RAW,
  TAB_RENDERED,
  TRUNCATED_NOTE,
  UNKNOWN_KIND_ICON,
  announceContentLoaded,
  announceContentLoading,
  announceListingLoaded,
  announceUnavailable,
} from '../../defaults/index.js';
import type { ArtifactContentView, ArtifactEntryView, ArtifactListingView } from '../../contract/types.js';
import { emptyStateSheet, factsSheet } from '../../library-sheets.js';
import { progressSheet } from '../../progress-sheet.js';
import { ShellTierController } from '../../shell-tier.js';
import { visuallyHidden } from '../../visually-hidden.js';
import { resolveArtifactFacts, resolveKindLabel } from '../../logic/artifact-facts.js';
import { splitPath } from '../../logic/artifact-path.js';
import { resolveArtifactRefusal } from '../../logic/artifact-refusal.js';
import { formatArtifactSize } from '../../logic/artifact-size.js';
import { normaliseArtifactStatus, normaliseArtifactView, normaliseContentStatus } from '../../logic/artifact-status.js';
import { resolveArtifactVocabulary } from '../../logic/artifact-types.js';
import type {
  ArtifactContentStatus,
  ArtifactLabelHooks,
  ArtifactScreenMission,
  ArtifactScreenWorkPackage,
  ArtifactStatus,
  ArtifactTab,
  ArtifactVocabulary,
} from '../../logic/artifact-types.js';
import { needsHiddenHeading, resolveArtifactView } from '../../logic/artifact-view.js';
import type { ArtifactView } from '../../logic/artifact-view.js';
import { matchWorkPackage } from '../../logic/artifact-wp.js';
import { lookup } from '../../logic/lookup.js';
import { markdownFor, resolveLinks } from '../../logic/markdown/index.js';
import type { MarkdownResult, ResolvedBlock } from '../../logic/markdown/index.js';
import type { LinkHandlers } from '../../logic/markdown/render.js';
import { OverflowRegion } from '../../overflow-region.js';
import type { SkArtifactRetryDetail } from '../../retry-types.js';
import type { SkOpenMissionDetail } from '../sk-missions-screen/sk-missions-screen.js';
import type { SkSelectWorkPackageDetail } from '../sk-work-package-board/sk-work-package-board.js';
import { documentStyles, renderDocument, renderTruncationNote } from './document-parts.js';
import type { DocumentView } from './document-parts.js';
import { inspectorStyles, renderInspector } from './inspector-parts.js';
import type { InspectorHandlers, InspectorView, LinkedWorkPackageView } from './inspector-parts.js';
import { proseStyles } from './prose-styles.js';
import { refusalStyles, renderRefusal } from './refusal-parts.js';
import type { RefusalView } from './refusal-parts.js';
import { sourceStyles } from './source-parts.js';
import { renderEmptyForm, renderStatus, stateStyles } from './state-parts.js';
import type { StatusHandlers, StatusView } from './state-parts.js';
import { renderTabs, tabStyles } from './tab-parts.js';
import type { TabsView, TabView } from './tab-parts.js';
import { renderToolbar, toolbarStyles } from './toolbar-parts.js';
import type { ToolbarView } from './toolbar-parts.js';

/** Payload of `sk-select-artifact`: an internal link of the rendered document; `kind` is the target entry's, passed through. */
export interface SkSelectArtifactDetail {
  missionId: string;
  path: string;
  kind: string;
}
/** Payload of `sk-open-link`: UNTRUSTED document content, already limited to `http`, `https` and `mailto`. */
export interface SkOpenLinkDetail {
  href: string;
}
/** Payload of `sk-retry-load` from this screen: the open content (with its path) or the whole listing. */
export type SkArtifactRetryLoadDetail = SkArtifactRetryDetail;

const TAB_ID_PREFIX = 'tab-';
const PANEL_ID_PREFIX = 'panel-';
const SIDEBAR_SLOT = '[slot="sidebar-section"]';

/** The last segment of a path: the file name. */
function fileNameOf(path: string): string {
  return splitPath(path).at(-1) ?? path;
}

/** True when focus sits in the sidebar tree of a shell, looking through the shadow roots of tree hosts. */
function focusInSidebarTree(root: Document | ShadowRoot): boolean {
  let active: Element | null = root.activeElement ?? null;
  while (active !== null) {
    if (active.closest(SIDEBAR_SLOT) !== null) return true;
    active = active.shadowRoot?.activeElement ?? null;
  }
  return false;
}

/** What the screen shows and so announces: one key per shown thing, and its words. */
interface Shown {
  key: string;
  text: string;
}

/**
 * The Artifact Viewer. Read-only (C-003): it only asks the host to read again, to open another artifact or Work Package, or to open a link.
 *
 * @screen
 * @element sk-artifact-screen
 * @tagname sk-artifact-screen
 *
 * @fires {CustomEvent<SkSelectArtifactDetail>} sk-select-artifact - an internal link of the rendered document was activated; `path` and `kind` are the target entry's
 * @fires {CustomEvent<SkOpenLinkDetail>} sk-open-link - an external link of the rendered document was activated. The `href` is untrusted document content, already limited to http, https and mailto: the host MUST re-validate the scheme (case-insensitively) before acting, MUST NOT navigate the host window or webview to it, and SHOULD show the destination to the user before opening it
 * @fires {CustomEvent<SkSelectWorkPackageDetail>} sk-select-work-package - a linked Work Package control or "Open Work Package" was activated
 * @fires {CustomEvent<SkOpenMissionDetail>} sk-open-mission - "Return to Pipeline" was activated
 * @fires {CustomEvent<SkArtifactRetryLoadDetail>} sk-retry-load - Retry was activated on the listing error (`listing`) or on a failed or refused content (`content`)
 */
export class SkArtifactScreen extends LitElement {
  static override styles = [
    factsSheet,
    emptyStateSheet,
    progressSheet,
    css`
      :host {
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        container-type: inline-size;
      }
      [data-root] {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 100%;
      }
      /* The reading layout (the prototype's .reading-layout). One column below 45rem (720px) of content cell, the inspector first in the
         DOM; two columns from it, the inspector placed in the right-hand track by grid placement. The pair is complementary on one
         threshold, so no width matches neither. A single-pane state (a refusal, a loading file) has no inspector and one column. */
      [data-layout] {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
      }
      /* The inspector's paint (E-30): the hero fill and the prototype's rule, on the left beside the pane and on top when stacked. */
      [data-region='inspector'] {
        background: var(--sk-surface-hero);
      }
      @container (width < 45rem) {
        [data-region='inspector'] {
          border-block-start: var(--sk-border-width-1) solid var(--sk-border-default);
        }
      }
      @container (width >= 45rem) {
        [data-region='inspector'] {
          border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default);
        }
        [data-layout]:not([data-single]) {
          grid-template-columns: minmax(0, 1fr) 270px;
        }
        [data-layout]:not([data-single]) > [data-region='inspector'] {
          grid-column: 2;
          grid-row: 1;
        }
        [data-layout]:not([data-single]) > [data-region='document-pane'] {
          grid-column: 1;
          grid-row: 1;
        }
      }
      [data-region='inspector'] {
        min-width: 0;
        overflow: auto;
        padding: var(--sk-space-5);
      }
      [data-region='inspector'] > * + * {
        margin-block: var(--sk-space-4) 0;
      }
      [data-region='document-pane'] {
        min-width: 0;
        overflow: auto;
      }
      [data-region='toolbar'] {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--sk-space-4);
        padding: var(--sk-space-4) var(--sk-space-6);
        min-width: 0;
      }
      /* The toolbar stacks only in the shell's mobile tier at a cell of 620px or less (CP-1 option C): the custom state comes from the
         one ShellTierController of this host; the one-column rule above has no controller. */
      @container (max-width: 38.75rem) {
        :host(:state(shell-mobile)) [data-region='toolbar'] {
          align-items: flex-start;
          flex-direction: column;
        }
      }
      [data-hidden-heading],
      [data-region='live-region'] {
        ${visuallyHidden}
      }
    `,
    proseStyles,
    toolbarStyles,
    tabStyles,
    documentStyles,
    sourceStyles,
    refusalStyles,
    inspectorStyles,
    stateStyles,
  ];

  /** The state of the listing and the screen; an unknown value collapses to `empty`. */
  @property({ reflect: true })
  status: ArtifactStatus = 'loading';

  /** The state of the open document only; an unknown value collapses to `ready`. */
  @property({ attribute: 'content-status' })
  contentStatus: ArtifactContentStatus = 'ready';

  /** The listing: tree data, sizes, kinds, link targets and `truncated`. */
  @property({ attribute: false })
  listing: ArtifactListingView | null = null;

  /** The open document. */
  @property({ attribute: false })
  content: ArtifactContentView | null = null;

  /** The `code` of a refused content read (any string; an unknown code shows raw). */
  @property({ attribute: false })
  refusalCode: string | null = null;

  /** The open path. */
  @property({ attribute: 'selected-path' })
  selectedPath = '';

  /** The Mission: host data. Controls that need its id are drawn inert while this is null. */
  @property({ attribute: false })
  mission: ArtifactScreenMission | null = null;

  /** The host's Work Package ids, for matching and for the linked Work Packages. */
  @property({ attribute: false })
  workPackages: ArtifactScreenWorkPackage[] = [];

  /** Seeds the selected tab; a tab change is internal and emits nothing. An unknown value collapses to `rendered`. */
  @property()
  view: ArtifactTab = 'rendered';

  /** RFC 3339 instant for "modified"; null shows the ISO text as given. */
  @property()
  now: string | null = null;

  /** Label hooks: the shared `time` hook plus `kind`, `refusal`, `mediaType` and `size`. */
  @property({ attribute: false })
  labels: ArtifactLabelHooks | null = null;

  /** Overrides the default error text of `status: error` and `contentStatus: error`. */
  @property({ attribute: 'error-message' })
  errorMessage = '';

  /** The one optional structural input; null means the `defaults/` values. */
  @property({ attribute: false })
  vocabulary: ArtifactVocabulary | null = null;

  // The selected tab: seeded from `view`, reset on a path change.
  @state()
  private selectedTab: ArtifactTab = 'rendered';
  private tabPath: string | null = null;

  // Sets the custom state of the shell's mobile tier on this host. The only consumer of the host's element internals.
  protected readonly shellTier = new ShellTierController(this);

  // The scroll elements of the screen, measured by the package's one overflow measurement (A11Y-003).
  private readonly region = new OverflowRegion(this, {
    target: () => this.renderRoot.querySelector('[data-region="document-pane"]'),
    targets: () => [
      ...this.renderRoot.querySelectorAll('[data-region="document-pane"]'),
      ...this.renderRoot.querySelectorAll('[data-scroll]'),
      ...this.renderRoot.querySelectorAll('[data-md="table-scroll"]'),
    ],
    axis: 'both',
  });

  // The three caches, filled in `willUpdate`; `cacheBuilds` counts the rebuilds so a test can see a hit.
  private readonly cacheBuilds = { model: 0, kindOf: 0, resolved: 0 };
  private modelKey: { source: string; mediaType: string; vocabulary: ArtifactVocabulary | null } | null = null;
  private model: MarkdownResult | null = null;
  private kindOfFor: ArtifactListingView | null = null;
  private kindOf: ReadonlyMap<string, string> = new Map();
  private resolvedKey: { model: MarkdownResult | null; openPath: string; kindOf: ReadonlyMap<string, string>; vocabulary: ArtifactVocabulary | null } | null = null;
  private resolved: ResolvedBlock[] | null = null;

  // What agrees with the selection, as of the current update.
  private shownListing: ArtifactListingView | null = null;
  private shownContent: ArtifactContentView | null = null;

  // The one polite live region: the text of the last transition; empty until one happens (never on first render).
  private announcement = '';
  private lastKey: string | null = null;
  private announcing = false;

  // The focus rule (PLAN-FRESH4-002 (a)): whether focus was in the sidebar tree or in the screen at the start of the current update.
  private focusWasInside = false;
  private focusSeq = 0;
  // A restore that has started and not finished: a follow-up update (the overflow measurement asks for one) must not cancel it.
  private restorePending = false;

  // ---- Dispatch: one literal site per event; the part files receive these as arguments.

  protected selectArtifact(path: string, kind: string): void {
    const mission = this.mission;
    if (mission === null) return;
    const detail: SkSelectArtifactDetail = { missionId: mission.missionId, path, kind };
    this.dispatchEvent(new CustomEvent<SkSelectArtifactDetail>('sk-select-artifact', { detail, bubbles: true, composed: true }));
  }

  protected openLink(href: string): void {
    const detail: SkOpenLinkDetail = { href };
    this.dispatchEvent(new CustomEvent<SkOpenLinkDetail>('sk-open-link', { detail, bubbles: true, composed: true }));
  }

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

  protected retryLoad(target: SkArtifactRetryDetail['target']): void {
    const detail = this.retryPayload(target);
    if (detail === null) return;
    this.dispatchEvent(new CustomEvent<SkArtifactRetryDetail>('sk-retry-load', { detail, bubbles: true, composed: true }));
  }

  /** The retry payload, or null (no Mission, or no open path for a content retry): the control is inert. */
  private retryPayload(target: SkArtifactRetryDetail['target']): SkArtifactRetryDetail | null {
    const mission = this.mission;
    if (mission === null) return null;
    if (target === 'listing') return { missionId: mission.missionId, target: 'listing' };
    return this.selectedPath === '' ? null : { missionId: mission.missionId, target: 'content', path: this.selectedPath };
  }

  // ---- What agrees with the selection.

  private agreeingListing(): ArtifactListingView | null {
    const listing = this.listing;
    const id = this.mission?.missionId ?? '';
    return listing === null || (id !== '' && listing.missionId !== id) ? null : listing;
  }

  private agreeingContent(): ArtifactContentView | null {
    const content = this.content;
    return content === null || (this.selectedPath !== '' && content.path !== this.selectedPath) ? null : content;
  }

  private entryOf(path: string): ArtifactEntryView | null {
    return this.shownListing?.entries.find((entry) => entry.path === path) ?? null;
  }

  // ---- Caches, announcements and focus capture.

  protected override willUpdate(changed: PropertyValues<this>): void {
    this.shownListing = this.agreeingListing();
    this.shownContent = this.agreeingContent();

    // The tab: seeded from `view`, reset on a path change.
    if (this.tabPath !== this.selectedPath || changed.has('view')) {
      this.tabPath = this.selectedPath;
      this.selectedTab = normaliseArtifactView(this.view);
    }

    // Cache 1: the markdown model, by VALUE of the content text and media type (and the vocabulary that rules them).
    const content = this.shownContent;
    const key = content === null ? null : { source: content.content, mediaType: content.mediaType, vocabulary: this.vocabulary };
    if (key === null) {
      this.modelKey = null;
      this.model = null;
    } else if (this.modelKey === null || this.modelKey.source !== key.source || this.modelKey.mediaType !== key.mediaType || this.modelKey.vocabulary !== key.vocabulary) {
      this.modelKey = key;
      this.model = markdownFor(content, this.vocabulary);
      this.cacheBuilds.model += 1;
    }

    // Cache 2: the path-to-kind map, by listing.
    if (this.kindOfFor !== this.shownListing) {
      this.kindOfFor = this.shownListing;
      this.kindOf = new Map((this.shownListing?.entries ?? []).map((entry) => [entry.path, entry.kind]));
      this.cacheBuilds.kindOf += 1;
    }

    // Cache 3: the resolved tree, by the model, the open path, the map and the vocabulary.
    const wanted = { model: this.model, openPath: this.selectedPath, kindOf: this.kindOf, vocabulary: this.vocabulary };
    const rk = this.resolvedKey;
    if (rk === null || rk.model !== wanted.model || rk.openPath !== wanted.openPath || rk.kindOf !== wanted.kindOf || rk.vocabulary !== wanted.vocabulary) {
      this.resolvedKey = wanted;
      const budget = resolveArtifactVocabulary(this.vocabulary).budget;
      this.resolved = this.model !== null && this.model.kind === 'ok' ? resolveLinks(this.model.blocks, { openPath: this.selectedPath, kindOf: this.kindOf, budget }) : null;
      this.cacheBuilds.resolved += 1;
    }

    // Announcements follow what is SHOWN.
    const shown = this.shownThing();
    if (this.announcing && shown.key !== this.lastKey) {
      this.announcement = shown.text;
    }
    this.lastKey = shown.key;
    this.announcing = true;

    // Focus capture, on EVERY update, whatever property changed (a landing found that a capture limited to named properties misses one).
    this.focusSeq += 1;
    const insideNow = (this.shadowRoot?.activeElement ?? null) !== null || focusInSidebarTree(document) || focusInSidebarTree(this.getRootNode() as Document | ShadowRoot);
    this.focusWasInside = insideNow || this.restorePending;
  }

  protected override updated(): void {
    if (!this.focusWasInside) return;
    this.restorePending = true;
    void this.restoreFocus(this.focusSeq);
  }

  /** After the update and one frame (the shell tree has then re-rendered): focus moves to the pane only when it fell to the body. */
  private async restoreFocus(seq: number): Promise<void> {
    await this.updateComplete;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (seq !== this.focusSeq) return;
    this.restorePending = false;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const target = this.renderRoot.querySelector<HTMLElement>('[data-region="document-pane"]') ?? this.renderRoot.querySelector<HTMLElement>('[data-root]');
    target?.focus();
  }

  /** The key and the words of what the screen shows now. */
  private shownThing(): Shown {
    const view = this.resolvedView();
    const path = this.selectedPath;
    const name = fileNameOf(path);
    switch (view.pane) {
      case 'listing-state': {
        const status = normaliseArtifactStatus(this.status);
        if (status === 'error') return { key: 'listing:error', text: ANNOUNCE_LISTING_ERROR };
        if (status === 'not-found') return { key: 'listing:not-found', text: NOT_FOUND_TITLE };
        if (status === 'empty') return { key: 'listing:empty', text: EMPTY_LISTING_TEXT };
        return { key: 'listing:loading', text: ANNOUNCE_LISTING_LOADING };
      }
      case 'nothing-selected': {
        const listing = this.shownListing;
        return listing === null ? { key: 'nothing-selected', text: NOTHING_SELECTED_TEXT } : { key: `listing:ready:${listing.entries.length}`, text: announceListingLoaded(listing.entries.length) };
      }
      case 'loading':
        return { key: `content:loading:${path}`, text: announceContentLoading(name) };
      case 'refusal': {
        const text = this.refusalText();
        return { key: `content:refused:${path}:${this.refusalCode ?? ''}`, text: announceUnavailable(name, text.eyebrow) };
      }
      case 'error':
        return { key: `content:error:${path}`, text: announceUnavailable(name, view.errorText ?? CONTENT_ERROR_DEFAULT) };
      default:
        return { key: `content:ready:${path}`, text: announceContentLoaded(name) };
    }
  }

  private resolvedView(): ArtifactView {
    return resolveArtifactView(
      {
        status: normaliseArtifactStatus(this.status),
        contentStatus: normaliseContentStatus(this.contentStatus),
        selectedPath: this.selectedPath,
        listing: this.shownListing,
        content: this.shownContent,
        refusalCode: this.refusalCode,
        errorMessage: this.errorMessage,
        markdown: this.model,
      },
      this.vocabulary,
    );
  }

  private refusalText(): ReturnType<typeof resolveArtifactRefusal> {
    const entry = this.entryOf(this.selectedPath);
    const sizeText = entry === null ? null : formatArtifactSize(entry.sizeBytes, this.labels);
    return resolveArtifactRefusal(this.refusalCode, { sizeText }, this.labels);
  }

  // ---- Scroll state, from the one overflow measurement.

  private scrollState(): { pane: boolean; article: boolean; source: boolean; tables: Set<number> } {
    const state = { pane: false, article: false, source: false, tables: new Set<number>() };
    let table = 0;
    for (const { element, overflowing } of this.region.results) {
      if (element.getAttribute('data-region') === 'document-pane') state.pane = overflowing;
      else if (element.getAttribute('data-scroll') === 'article') state.article = overflowing;
      else if (element.getAttribute('data-scroll') === 'source') state.source = overflowing;
      else if (element.getAttribute('data-md') === 'table-scroll') {
        table += 1;
        if (overflowing) state.tables.add(table);
      }
    }
    return state;
  }

  // ---- View builders.

  private statusView(view: ArtifactView): StatusView {
    const inert = this.mission === null;
    const status = normaliseArtifactStatus(this.status);
    if (view.pane === 'nothing-selected') return { state: 'nothing-selected', title: NOTHING_SELECTED_TEXT, text: '', actionLabel: '', inert };
    if (view.pane === 'loading') return { state: 'content-loading', title: announceContentLoading(fileNameOf(this.selectedPath)), text: '', actionLabel: '', inert };
    if (status === 'error') return { state: 'error', title: LISTING_ERROR_HEADING, text: this.errorMessage === '' ? LISTING_ERROR_DEFAULT : this.errorMessage, actionLabel: RETRY_LABEL, inert: this.retryPayload('listing') === null };
    if (status === 'not-found') return { state: 'not-found', title: NOT_FOUND_TITLE, text: NOT_FOUND_TEXT, actionLabel: RETURN_LABEL, inert };
    if (status === 'empty') return { state: 'empty', title: EMPTY_LISTING_TEXT, text: '', actionLabel: '', inert };
    return { state: 'loading', title: LISTING_LOADING_TEXT, text: '', actionLabel: '', inert };
  }

  private refusalView(view: ArtifactView): RefusalView {
    const retryInert = this.retryPayload('content') === null;
    if (view.pane === 'error') {
      return { eyebrow: REFUSAL_GENERIC_EYEBROW, title: REFUSAL_TITLE, path: this.selectedPath, sentence: view.errorText ?? CONTENT_ERROR_DEFAULT, retryable: true, retryInert, retryLabel: RETRY_LABEL };
    }
    const text = this.refusalText();
    return { eyebrow: text.eyebrow, title: REFUSAL_TITLE, path: this.selectedPath, sentence: text.sentence, retryable: text.retryable, retryInert, retryLabel: RETRY_LABEL };
  }

  private kindOfOpen(): string {
    return this.shownContent?.kind ?? this.entryOf(this.selectedPath)?.kind ?? '';
  }

  private toolbarView(): ToolbarView {
    const kind = this.kindOfOpen();
    const icon = lookup(resolveArtifactVocabulary(this.vocabulary).kinds, kind)?.icon ?? UNKNOWN_KIND_ICON;
    return { icon, name: fileNameOf(this.selectedPath), path: this.selectedPath };
  }

  private tabsView(view: ArtifactView): TabsView | null {
    if (view.tabs === 'none') return null;
    const tab = this.selectedTab;
    const first: ArtifactTab = 'rendered';
    const second: ArtifactTab = 'raw';
    const tabView = (which: ArtifactTab, label: string): TabView => ({
      tab: which,
      label,
      selected: tab === which,
      tabId: `${TAB_ID_PREFIX}${which}`,
      panelId: tab === which ? `${PANEL_ID_PREFIX}${which}` : null,
    });
    return { label: TABLIST_LABEL, tabs: [tabView(first, view.body === 'fallback' ? TAB_FALLBACK : TAB_RENDERED), tabView(second, TAB_RAW)] };
  }

  /** The truncation note, whenever the listing is shown and cut: the document pane, and every pane that draws no document. */
  private truncationText(): string | null {
    return this.shownListing?.truncated === true ? TRUNCATED_NOTE : null;
  }

  private documentView(view: ArtifactView, scroll: { article: boolean; source: boolean }): DocumentView {
    const content = this.shownContent;
    const tab = view.tabs === 'two' ? this.selectedTab : 'rendered';
    const mode: DocumentView['mode'] =
      view.pane === 'empty-file' ? 'empty' : view.body === 'raw' ? 'raw' : tab === 'raw' ? 'raw' : view.body === 'rendered' ? 'rendered' : 'fallback';
    const showsSource = mode === 'raw' || mode === 'fallback';
    return {
      eyebrow: resolveKindLabel(this.kindOfOpen(), this.labels, this.vocabulary),
      name: fileNameOf(this.selectedPath),
      tab,
      mode,
      blocks: mode === 'rendered' ? this.resolved : null,
      source: content?.content ?? '',
      sourceLabel: SOURCE_LABEL,
      emptyText: EMPTY_FILE_TEXT,
      bidiNotice: showsSource && view.bidiControls > 0 ? BIDI_NOTICE(view.bidiControls) : null,
      truncationNote: this.truncationText(),
      redactionLine: view.redacted ? REDACTION_LINE : null,
      fallbackNotice: mode === 'fallback' ? FALLBACK_NOTICE : null,
      articleScrolls: scroll.article,
      sourceScrolls: scroll.source,
      panel: view.tabs === 'two' ? { id: `${PANEL_ID_PREFIX}${tab}`, labelledBy: `${TAB_ID_PREFIX}${tab}` } : null,
    };
  }

  private inspectorView(): InspectorView {
    const content = this.shownContent;
    const path = this.selectedPath;
    const entry = this.entryOf(path);
    const facts = resolveArtifactFacts({ entry, content, mission: this.mission, selectedPath: path, now: this.now, hooks: this.labels, vocabulary: this.vocabulary });
    const kind = this.kindOfOpen();
    const match = matchWorkPackage(path, kind, this.workPackages, this.vocabulary);
    const label = (wpId: string, title: string | null | undefined): string => (title === undefined || title === null || title === '' ? wpId : `${wpId} ${title}`);
    // FR-027: a prompt or review cycle links its own Work Package only (none when unmatched); every other kind lists the host's.
    const own = resolveArtifactVocabulary(this.vocabulary).linkKinds.includes(kind);
    const listed = own ? this.workPackages.filter((wp) => wp.wpId === match?.wpId) : this.workPackages;
    const linked: LinkedWorkPackageView[] = listed.map((wp) => ({ wpId: wp.wpId, label: label(wp.wpId, wp.title) }));
    return {
      fileTitle: FILE_GROUP,
      missionTitle: MISSION_GROUP,
      linkedTitle: LINKED_WP_TITLE,
      file: facts.file,
      mission: facts.mission,
      linked,
      open: match === null ? null : { wpId: match.wpId, label: OPEN_WP_LABEL(match.wpId) },
      openLabel: match === null ? '' : OPEN_WP_LABEL(match.wpId),
      redactedNote: facts.redactedNote ? REDACTION_LINE : null,
      readOnlyNote: READ_ONLY_NOTE,
      inert: this.mission === null,
    };
  }

  // ---- Render.

  private renderPane(view: ArtifactView, scroll: ReturnType<SkArtifactScreen['scrollState']>): TemplateResult {
    const pane = view.pane;
    const name = fileNameOf(this.selectedPath);
    const hiddenHeading = needsHiddenHeading(view, this.selectedTab) ? html`<h1 data-hidden-heading>${FILE_NAME_LABEL(name)}</h1>` : nothing;
    const handlers: LinkHandlers = {
      openArtifact: (path, kind) => this.selectArtifact(path, kind),
      openExternal: (href) => this.openLink(href),
      overflowing: scroll.tables,
    };
    const truncation = renderTruncationNote(this.truncationText());
    const tabs = this.tabsView(view);
    const toolbar = html`<div data-region="toolbar">${renderToolbar(this.toolbarView())}${tabs === null ? nothing : renderTabs(tabs, (tab) => (this.selectedTab = tab))}</div>`;
    let body: TemplateResult;
    switch (pane) {
      case 'refusal':
      case 'error':
        return html`${truncation}${renderRefusal(this.refusalView(view), () => this.retryLoad('content'))}`;
      case 'loading':
        body = html`${toolbar}${truncation}${renderStatus(this.statusView(view), this.statusHandlers())}`;
        break;
      case 'empty-file':
      case 'document':
        body = html`${toolbar}${renderDocument(this.documentView(view, scroll), handlers)}`;
        break;
      default:
        body = html`${truncation}${renderEmptyForm(NOTHING_SELECTED_TEXT)}`;
    }
    return html`${hiddenHeading}${body}`;
  }

  private statusHandlers(): StatusHandlers {
    return { onRetry: () => this.retryLoad('listing'), onReturn: () => this.openMission() };
  }

  private renderReady(view: ArtifactView): TemplateResult {
    const scroll = this.scrollState();
    const single = view.pane !== 'document' && view.pane !== 'empty-file';
    const handlers: InspectorHandlers = { onSelectWorkPackage: (wpId) => this.selectWorkPackage(wpId) };
    return html`<div data-layout ?data-single=${single}>
      ${single ? nothing : html`<div data-region="inspector" role="group" aria-label=${ARTIFACT_INSPECTOR_LABEL}>${renderInspector(this.inspectorView(), handlers)}</div>`}
      <div data-region="document-pane" role="region" aria-label=${DOCUMENT_LABEL(fileNameOf(this.selectedPath))} tabindex=${scroll.pane ? '0' : '-1'}>
        ${this.renderPane(view, scroll)}
      </div>
    </div>`;
  }

  protected override render(): TemplateResult {
    const view = this.resolvedView();
    const content =
      view.pane === 'nothing-selected'
        ? html`${renderTruncationNote(this.truncationText())}${renderStatus(this.statusView(view), this.statusHandlers())}`
        : view.pane === 'listing-state'
          ? renderStatus(this.statusView(view), this.statusHandlers())
          : this.renderReady(view);
    return html`<div data-root tabindex="-1">${content}</div>
      <div data-region="live-region" role="status" aria-live="polite">${this.announcement}</div>`;
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-select-artifact': CustomEvent<SkSelectArtifactDetail>;
    'sk-open-link': CustomEvent<SkOpenLinkDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-artifact-screen': SkArtifactScreen;
  }
}
