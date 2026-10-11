// The Ops page parts: header, source notice, section heading with its badge and count, profile fact, Load more, skipped note and
// the load-more error with its retry. Pure `html` functions of view-models; the handlers arrive as arguments and nothing here
// dispatches an event. The part holds no copy (the screen resolves every text from `defaults/`) and loads nothing: no `href`,
// `src` or raw markup. Exception E-42 (text wrapping) applies to this file by name (stylelint.config.mjs): the pill and the
// other text ellipsize, scoped to the `text-overflow` and `white-space` keywords. Layout only otherwise, `--sk-*` tokens.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

/** The Load more control of the ready look; null when no next page can be asked for. */
export interface OpsLoadMoreView {
  readonly label: string;
  readonly busy: boolean;
}

/** The load-more error, which replaces the Load more control. */
export interface OpsLoadMoreErrorView {
  readonly sentence: string;
  /** "Try again", or "Refresh from the newest" when the cursor was refused. */
  readonly actionLabel: string;
  /** True when no retry request can be built: the control is drawn inert. */
  readonly inert: boolean;
}

/** Every text of the page, resolved by the screen (the part holds no copy). */
export interface OpsPageView {
  readonly eyebrow: string;
  readonly title: string;
  readonly badge: string;
  /** The muted line naming the project, shell-supplied; null or empty when none is supplied (nothing is drawn). */
  readonly supporting?: string | null;
  readonly notice: string;
  readonly sectionEyebrow: string;
  readonly sectionHeading: string;
  readonly countText: string;
  /** "Profile: {profile}", or null when no profile filter applies. */
  readonly profileFact: string | null;
  /** The skipped-record sentence, or null when none were skipped. */
  readonly skippedNote: string | null;
  readonly loadMore: OpsLoadMoreView | null;
  readonly loadMoreError: OpsLoadMoreErrorView | null;
}

/** The handlers of the page controls; both are the screen's own dispatch sites. */
export interface OpsPageHandlers {
  readonly onLoadMore: () => void;
  readonly onRetry: () => void;
}

/**
 * The page layout (layout only; the screen adds this sheet to its own). The cell is the 900 px column of the prototype's
 * `.content-narrow` and the container the row queries measure (CP-1: 696 px for the facts, 588 px for the heads and the
 * section heading, on a wrapper; exact only for the present shell chrome: rail 56, padding 24/16, mobile tier up to 719).
 */
export const opsPageStyles = css`
  [data-ops-header],
  [data-ops-body] {
    padding-inline: var(--sk-mission-shell-content-padding);
  }
  /* The header is the library's, as on the Missions screen (DO-17): the same top inset, no band of its own. */
  [data-ops-header] {
    padding-block: var(--sk-mission-shell-content-padding) 0;
  }
  /* The prototype's 900 px column (the .content-narrow class), centred: one grid track built from space tokens (7 x 8rem + 0.25rem =
     56.25rem), because no length literal is allowed here. The track is the container the row queries measure. */
  [data-ops-body] {
    display: grid;
    grid-template-columns: minmax(0, calc(var(--sk-space-12) * 7 + var(--sk-space-1)));
    justify-content: center;
    padding-block: 0 var(--sk-mission-shell-content-padding);
  }
  sk-page-header {
    min-width: 0;
  }
  [data-ops-cell] {
    container-type: inline-size;
    min-width: 0;
    display: grid;
    gap: var(--sk-space-6);
  }
  [data-ops-section] {
    display: grid;
    gap: var(--sk-space-4);
    min-width: 0;
    align-content: start;
  }
  /* Ops G-3: the "Read only" and count pills take the prototype's outlined mono badge (E-40 badge clause, selector pinned in
     ops-part-selectors.test.ts). The library pill has no border and the sans font; the line height follows Ops G-2. */
  sk-pill-tag[data-ops-page-badge]::part(tag) {
    padding-inline: var(--sk-space-2);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    font-family: var(--sk-font-mono);
    font-weight: var(--sk-weight-normal);
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }
  /* The library's action area spans the title and description rows and sits at their end: with no description the pill dropped
     below the heading. Layout only: the action takes the title row, as the prototype's heading row aligns it to the heading. */
  sk-section-header[data-ops-section-head]::part(action) {
    grid-row: title;
  }
  /* CP-1 S-O2: at a cell width of 36.75rem (588 px at the 16 px default; in rem so it grows with the text, A11Y-001) the section heading stacks, its count pill below the heading, as the prototype's
     .section-heading does at 620 px (the container is the cell). The head of a row stacks at the same width (ops-row-parts.ts). */
  @container (max-width: 36.75rem) {
    sk-section-header[data-ops-section-head]::part(header) {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'eyebrow' 'title' 'description' 'action';
    }
    sk-section-header[data-ops-section-head]::part(action) {
      grid-row: action;
      justify-self: start;
    }
  }
  /* A long count ellipsizes (E-42); the full text is the title attribute. */
  [data-count],
  [data-read-only] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* The profile is a fact and wraps, never ellipsizes (operator ruling on A11Y-001, 2026-10-11; F-2): at 200 percent or a long
     profile its text stays readable. The overflow-wrap keyword break-word is E-42. */
  [data-profile-fact] {
    display: block;
    min-width: 0;
    overflow-wrap: break-word;
  }
  ul {
    display: grid;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
    min-width: 0;
  }
  li {
    display: block;
    min-width: 0;
  }
  /* The Load more row sits below the list by the Missions distance: the list's own row gap plus this margin. */
  li[aria-busy] {
    margin-block: var(--sk-space-3) 0;
  }
  sk-notice {
    display: block;
    min-width: 0;
  }
  /* The retry sits BESIDE its notice, never in the notice's actions slot: the library's notice host carries tabindex=-1, which
     takes a slotted control out of the Tab order (measured here: Tab from the heading reached the body). */
  sk-button[data-retry] {
    justify-self: start;
  }
`;

/**
 * The frame every look shares (OP-36, FR-003): the header and the source notice, then `inner` (the section of the ready look, or
 * the loading, empty or error look). Only `inner` differs between looks; the header is never withheld.
 */
export function renderOpsFrame(view: OpsPageView, inner: TemplateResult): TemplateResult {
  const supporting = view.supporting === undefined || view.supporting === null || view.supporting === '' ? null : view.supporting;
  return html`
    <div data-ops-header>
      <sk-page-header>
        <span slot="eyebrow">${view.eyebrow}</span>
        <h1 slot="title">${view.title}</h1>
        ${supporting === null ? nothing : html`<span slot="supporting">${supporting}</span>`}
        <sk-pill-tag slot="actions" data-read-only data-ops-page-badge title=${view.badge}>${view.badge}</sk-pill-tag>
      </sk-page-header>
    </div>
    <div data-ops-body>
      <div data-ops-cell>
        <sk-notice tone="neutral" announce="off" data-source-notice>${view.notice}</sk-notice>
        ${inner}
      </div>
    </div>
  `;
}

/** The ready look: the frame around the section heading, then `rows` (already drawn by the screen), then the paging controls. */
export function renderOpsPage(view: OpsPageView, handlers: OpsPageHandlers, rows: TemplateResult): TemplateResult {
  return renderOpsFrame(
    view,
    html`
        <section data-ops-section>
          <sk-section-header data-ops-section-head>
            <span slot="eyebrow" data-section-eyebrow>${view.sectionEyebrow}</span>
            <h2 slot="title" tabindex="-1" data-focus-target>${view.sectionHeading}</h2>
            ${view.profileFact === null
              ? nothing
              : html`<code slot="description" data-profile-fact title=${view.profileFact}>${view.profileFact}</code>`}
            <sk-pill-tag slot="action" data-count data-ops-page-badge title=${view.countText}>${view.countText}</sk-pill-tag>
          </sk-section-header>
          <ul>
            ${rows}
            ${view.loadMore === null
              ? nothing
              : html`<li aria-busy=${view.loadMore.busy ? 'true' : 'false'}>
                  <sk-button variant="secondary" data-load-more ?busy=${view.loadMore.busy} @click=${handlers.onLoadMore}>${view.loadMore.label}</sk-button>
                </li>`}
          </ul>
          ${view.skippedNote === null ? nothing : html`<sk-notice tone="neutral" announce="off" data-skipped-note>${view.skippedNote}</sk-notice>`}
          ${view.loadMoreError === null
            ? nothing
            : html`<sk-notice tone="danger" announce="off" data-load-more-error>${view.loadMoreError.sentence}</sk-notice>
                <sk-button variant="secondary" data-retry ?disabled=${view.loadMoreError.inert} @click=${handlers.onRetry}>${view.loadMoreError.actionLabel}</sk-button>`}
        </section>`,
  );
}
