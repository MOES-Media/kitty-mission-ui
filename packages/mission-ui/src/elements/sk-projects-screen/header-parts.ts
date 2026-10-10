// The header band and the toolbar of the Projects screen. A part returns the BODY of its region only: the screen draws the
// `data-region` wrapper, a part never dispatches an event and imports only from `defaults/`, `logic/` and the library.
// Exception E-34 (CP-1; sunset: spec-kitty-design#529) covers this file: the 24px title, the 12px mono uppercase eyebrow (also the toolbar's "Recent projects")
// in the subtle foreground token, and E-34 (b), the band's 1px bottom border; the 76px minimum is a lint-clean token calc.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { OPEN_PROJECT_LABEL, PROJECTS_EYEBROW, PROJECTS_INTRO, PROJECTS_TITLE, RECENT_PROJECTS_EYEBROW } from '../../defaults/index.js';

/** What the header band needs from the screen: the one handler of the "Open project" button. */
export interface HeaderContext {
  onRequestOpen(): void;
}

/** What the toolbar needs from the screen: the count text, null while the whole list is not ready (nothing is drawn for it). */
export interface ToolbarContext {
  countText: string | null;
}

export const headerStyles = css`
  /* The band (the screen draws the wrapper and its padding): 76px minimum, a line below it, copy left and button right. */
  [data-region='header'] {
    min-height: calc(var(--sk-space-10) + var(--sk-space-3));
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
    box-sizing: border-box;
  }
  /* The screen's band already pads its inset parts, so the library header keeps no padding of its own (the prototype's one padding). */
  [data-region='header'] > sk-page-header {
    flex: 1 1 auto;
    min-width: 0;
  }
  /* The prototype's button: 14px semibold, 44px high, token padding (E-34 c, d). */
  [data-region='header'] > sk-button {
    flex: 0 0 auto;
    min-block-size: calc(var(--sk-space-8) + var(--sk-space-1));
  }
  [data-region='header'] > sk-button::part(button) {
    min-block-size: calc(var(--sk-space-8) + var(--sk-space-1));
    padding: var(--sk-space-2) var(--sk-space-4);
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-semibold);
  }
  sk-page-header::part(header) {
    padding: 0;
    gap: var(--sk-space-5);
    align-items: center;
  }
  /* The header's own actions group stays empty here (the button sits beside it in the band): it takes no grid track. */
  sk-page-header::part(meta) {
    display: none;
  }
  sk-page-header::part(text) {
    gap: var(--sk-space-1);
  }
  /* The prototype's type scale: a 24px title and a 12px mono uppercase eyebrow (E-34), on the header's parts. */
  sk-page-header h1[slot='title'] {
    margin: 0;
    font-size: var(--sk-text-2xl);
    font-family: var(--sk-font-display);
    color: var(--sk-fg-default);
    letter-spacing: -0.01em;
    line-height: 1.2;
  }
  sk-page-header [slot='supporting'] {
    color: var(--sk-fg-muted);
  }
  sk-page-header::part(eyebrow),
  sk-section-header::part(eyebrow) {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--sk-fg-subtle);
    font-weight: var(--sk-weight-semibold);
  }
  /* The toolbar is one library section header: the eyebrow on the left, the mono count on the right. */
  [data-region='toolbar'] > sk-section-header {
    flex: 1 1 auto;
    min-width: 0;
  }
  /* The library header's template reserves rows for the title and the description; unused here, they take no gap. */
  sk-section-header::part(header) {
    row-gap: 0;
  }
  sk-section-header::part(metadata) {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
  }
`;

/** The page header (eyebrow, `h1`, muted copy) and, beside it in the band, the "Open project" button (the band is a flex row that stacks at 800px). */
export function renderHeader(ctx: HeaderContext): TemplateResult | typeof nothing {
  return html`<sk-page-header>
    <span slot="eyebrow">${PROJECTS_EYEBROW}</span>
    <h1 slot="title">${PROJECTS_TITLE}</h1>
    <span slot="supporting">${PROJECTS_INTRO}</span>
  </sk-page-header>
  <sk-button variant="primary" @click=${() => ctx.onRequestOpen()}>${OPEN_PROJECT_LABEL}</sk-button>`;
}

/** The "Recent projects" eyebrow and the entry count. */
export function renderToolbar(ctx: ToolbarContext): TemplateResult | typeof nothing {
  return html`<sk-section-header>
    <span slot="eyebrow" data-eyebrow>${RECENT_PROJECTS_EYEBROW}</span>
    ${ctx.countText === null ? nothing : html`<span slot="metadata" data-count>${ctx.countText}</span>`}
  </sk-section-header>`;
}
