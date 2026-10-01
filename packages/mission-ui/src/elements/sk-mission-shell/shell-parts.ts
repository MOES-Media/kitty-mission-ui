// Render fragments of the shell frame. They are templates rendered inside the shell's shadow root, so the shell's
// `static styles` apply to them. They read no state of their own: every input arrives through a context object.
// Gap G-01 .. G-03, G-07, G-10, G-15 (sunset: library `sk-app-shell` modes, top-bar slot, rail, skip link): the grid,
// top bar, rail, icon column and skip link are local.
import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import '@spec-kitty/elements';
import '../sk-shell-nav-item/sk-shell-nav-item.js';
import { renderIcon } from '../../shell-icons.js';
import type {
  CurrentMark,
  ShellLayout,
  ShellMission,
  ShellNavItem,
  ShellProject,
  ShellTier,
} from '../../shell-types.js';
import type { ViewState } from '../../view-state.js';

const GENERIC_ERROR = 'Something went wrong while loading.';

/** Which shell item is the deepest marked one: the tree leaf when a tree is shown, else the sidebar item, else the rail. */
export type DeepestMark = 'leaf' | 'sidebar' | 'rail' | 'none';

export interface Marking {
  /** Sidebar (and icon column) item id that is marked, if any. */
  current: string;
  /** Rail item id that is marked, if any. */
  railCurrent: string;
  deepest: DeepestMark;
}

/** Only the deepest marked item announces `page`; the marked ancestors carry `true`. */
export function markFor(scope: 'sidebar' | 'rail', id: string, marking: Marking): CurrentMark {
  const marked = scope === 'sidebar' ? marking.current !== '' && marking.current === id : marking.railCurrent !== '' && marking.railCurrent === id;
  if (!marked) return '';
  return marking.deepest === scope ? 'page' : 'true';
}

/** Resolves which regions are marked. `sidebarIds` are the ids of every item the sidebar can show. */
export function resolveMarking(
  current: string,
  railCurrent: string,
  sidebarIds: readonly string[],
  railIds: readonly string[],
  treeShown: boolean,
): Marking {
  const sidebarMarked = current !== '' && sidebarIds.includes(current);
  const railMarked = railCurrent !== '' && railIds.includes(railCurrent);
  let deepest: DeepestMark = 'none';
  if (treeShown) deepest = 'leaf';
  else if (sidebarMarked) deepest = 'sidebar';
  else if (railMarked) deepest = 'rail';
  return { current: sidebarMarked ? current : '', railCurrent: railMarked ? railCurrent : '', deepest };
}

export interface TopBarContext {
  tier: ShellTier;
  /** The project name or mission title: shown beside the brand on mobile, where no sidebar is on screen. */
  context: string;
  onHamburger: () => void;
}

// The prototype's brand mark (two arrowheads), drawn here because the library ships no brand mark.
const BRAND_MARK = html`<svg data-brand-mark viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 12 9 7v10Zm18 0-6-5v10ZM9 9h6v6H9z"/></svg>`;

export function renderTopBar(ctx: TopBarContext): TemplateResult {
  return html`<header data-top-bar>
    ${ctx.tier === 'mobile'
      ? html`<sk-button size="icon" variant="ghost" label="Open navigation" @click=${ctx.onHamburger}>${renderIcon('menu')}</sk-button>`
      : nothing}
    <div data-brand><slot name="brand">${BRAND_MARK}<span>kitty desktop</span></slot></div>
    ${ctx.tier === 'mobile' && ctx.context !== '' ? html`<span data-top-bar-context>${ctx.context}</span>` : nothing}
    <div data-top-bar-actions><slot name="top-bar-actions"></slot></div>
  </header>`;
}

function navItem(item: ShellNavItem, current: CurrentMark, compact: boolean): TemplateResult {
  return html`<sk-shell-nav-item
    item-id=${item.id}
    href=${item.href}
    icon=${item.icon}
    .label=${item.label}
    .current=${current}
    ?compact=${compact}
  ></sk-shell-nav-item>`;
}

export interface RailContext {
  items: ShellNavItem[];
  marking: Marking;
}

/** The library personal rail: items in its primary slot, pinned items in its account slot (below its divider). */
export function renderRail(ctx: RailContext): TemplateResult {
  const main = ctx.items.filter((item) => item.pinned !== true);
  const pinned = ctx.items.filter((item) => item.pinned === true);
  return html`<sk-personal-rail data-rail label="Global navigation">
    ${main.map((item) => html`<div slot="primary" data-rail-item>${navItem(item, markFor('rail', item.id, ctx.marking), true)}</div>`)}
    ${pinned.length > 0
      ? html`<div slot="account" data-rail-pinned>${pinned.map((item) => navItem(item, markFor('rail', item.id, ctx.marking), true))}</div>`
      : nothing}
  </sk-personal-rail>`;
}

export interface SidebarContext {
  layout: ShellLayout;
  items: ShellNavItem[];
  footerItem: ShellNavItem | null;
  project: ShellProject | null;
  mission: ShellMission | null;
  marking: Marking;
  onBack: (event: MouseEvent, item: ShellNavItem) => void;
  onSectionSlotChange: () => void;
}

function renderProjectHead(project: ShellProject | null): TemplateResult | typeof nothing {
  if (project === null) return nothing;
  return html`<sk-section-header>
    <span slot="eyebrow">${project.eyebrow}</span>
    <span slot="title">${project.name}</span>
    ${project.detail ? html`<span slot="description">${project.detail}</span>` : nothing}
  </sk-section-header>`;
}

function renderMissionHead(mission: ShellMission | null, onBack: SidebarContext['onBack']): TemplateResult | typeof nothing {
  if (mission === null) return nothing;
  const back = mission.backItem;
  return html`${back
      ? html`<sk-button data-back variant="ghost" size="sm" href=${back.href} @click=${(event: MouseEvent) => onBack(event, back)}
          >${renderIcon('back')} ${back.label}</sk-button
        >`
      : nothing}
    <sk-section-header>
      <span slot="title">${mission.title}</span>
      <div slot="description" data-mission-meta>
        <span data-mission-id>${mission.id}</span>
        ${mission.tags.length > 0
          ? html`<div data-mission-tags>${mission.tags.map((tag) => html`<sk-pill-tag status=${tag.tone}>${tag.label}</sk-pill-tag>`)}</div>`
          : nothing}
      </div>
    </sk-section-header>`;
}

/** The sidebar head (expanded sidebar, drawer and flyout share it): project or mission, with its divider below. */
export function renderHead(ctx: SidebarContext): TemplateResult {
  return html`<div data-head>${ctx.layout === 'mission' ? renderMissionHead(ctx.mission, ctx.onBack) : renderProjectHead(ctx.project)}</div>`;
}

/**
 * The sidebar footer, or `nothing` when there is none. The mission footer is the prototype's progress text; the library
 * has no progress element yet, so no bar is drawn.
 */
export function renderFooter(ctx: SidebarContext): TemplateResult | typeof nothing {
  if (ctx.layout === 'mission') {
    const progress = ctx.mission?.progress;
    if (!progress) return nothing;
    const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return html`<div slot="footer" data-footer data-footer-progress>
      <span>${progress.total} Work Packages</span><span data-footer-percent>${percent}%</span>
    </div>`;
  }
  const item = ctx.footerItem;
  return item ? html`<div slot="footer" data-footer>${navItem(item, markFor('sidebar', item.id, ctx.marking), false)}</div>` : nothing;
}

/** The section navigation, shared by the expanded sidebar and the drawer. */
export function renderSectionNav(ctx: SidebarContext): TemplateResult {
  return html`<nav data-nav aria-label="Section navigation">
    ${ctx.items.map((item) => navItem(item, markFor('sidebar', item.id, ctx.marking), false))}
  </nav>`;
}

/** Expanded tier: the library sidebar (complementary landmark) with head, one navigation and the slotted sections. */
export function renderSidebar(ctx: SidebarContext): TemplateResult {
  return html`<sk-context-sidebar label=${ctx.layout === 'mission' ? 'Mission sidebar' : 'Project sidebar'}>
    <div slot="header">${renderHead(ctx)}</div>
    ${renderSectionNav(ctx)}
    <slot name="sidebar-section" @slotchange=${ctx.onSectionSlotChange}></slot>
    ${renderFooter(ctx)}
  </sk-context-sidebar>`;
}

/** Collapsed tier: a LOCAL icon column (G-15), a navigation of compact items. No tree, no complementary landmark. */
export function renderIconColumn(ctx: SidebarContext): TemplateResult {
  const footer = ctx.layout === 'project' ? ctx.footerItem : null;
  return html`<nav data-icon-column aria-label="Section navigation">
    ${ctx.items.map((item) => navItem(item, markFor('sidebar', item.id, ctx.marking), true))}
    ${footer ? html`<div data-icon-column-pinned>${navItem(footer, markFor('sidebar', footer.id, ctx.marking), true)}</div>` : nothing}
  </nav>`;
}

export interface StatusContext {
  status: ViewState;
  errorMessage: string;
  onRetry: () => void;
}

/** The status region: normal flow at the top of the content column; `aria-busy` lives here and nowhere else. */
export function renderStatus(ctx: StatusContext): TemplateResult {
  let body: TemplateResult | typeof nothing = nothing;
  if (ctx.status === 'loading') {
    body = html`<sk-status-indicator pulsing>Loading</sk-status-indicator>`;
  } else if (ctx.status === 'error') {
    body = html`<sk-notice tone="danger">
      ${ctx.errorMessage === '' ? GENERIC_ERROR : ctx.errorMessage}
      <sk-button slot="actions" variant="secondary" @click=${ctx.onRetry}>Retry</sk-button>
    </sk-notice>`;
  } else if (ctx.status === 'empty') {
    body = html`<sk-notice tone="info">Nothing to show yet.</sk-notice>`;
  }
  return html`<div data-status aria-busy=${ifDefined(ctx.status === 'loading' ? 'true' : undefined)}>
    ${body === nothing ? nothing : html`<div data-status-body>${body}</div>`}
  </div>`;
}

export interface ContentContext {
  onSkipLink: (event: MouseEvent) => void;
}

/** The skip link: first tab stop, hidden until focused. The text comes from the `skip-link` slot. */
export function renderSkipLink(ctx: ContentContext): TemplateResult {
  return html`<div data-skip-link>
    <sk-button variant="primary" href="#content" @click=${ctx.onSkipLink}
      ><slot name="skip-link">Skip to content</slot></sk-button
    >
  </div>`;
}

/** The content cell: exactly one `main`, wrapping the shell-owned focus target. */
export function renderContent(): TemplateResult {
  return html`<main id="content"><div data-focus-target tabindex="-1"><slot></slot></div></main>`;
}
