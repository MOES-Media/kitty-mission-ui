// The panel wrapper of the Work Package screen: the library's `sk-card` with an `sk-section-header` title, forming a
// `section` named by its `h2`. Called by the screen file only, never by a part. Exception E-18 (narrowed at CP-1, 2026-10-05;
// sunset spec-kitty-design#516, a compact density for `sk-card`) applies to this file and nothing else: it restyles five
// things, each with a token (border width, radius, padding, title size and weight, title-to-body gap).
import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export interface PanelOptions {
  /** True for a panel nested inside another: the card keeps its inset surface. */
  inset?: boolean;
}

/**
 * One titled panel. `id` becomes the `data-region` attribute (null for the Review panel, which hosts two regions of its
 * own); `body` is the region's body, `nothing` for a stub.
 */
export function renderPanel(id: string | null, title: string, body: TemplateResult | typeof nothing, options: PanelOptions = {}): TemplateResult {
  const titleId = id === null ? 'panel-title' : `panel-title-${id}`;
  return html`<sk-card ?inset=${options.inset === true} data-region=${ifDefined(id ?? undefined)}>
    <section aria-labelledby=${titleId}>
      <sk-section-header><h2 slot="title" id=${titleId}>${title}</h2></sk-section-header>
      ${body}
    </section>
  </sk-card>`;
}

export const panelStyles = css`
  sk-card {
    display: block;
  }
  /* E-18 (1): border width. (2): radius. (3): padding. */
  sk-card::part(card) {
    border-width: var(--sk-border-width-1);
    border-radius: var(--sk-radius-md);
    padding: var(--sk-space-5);
  }
  /* E-18 (4): the title is 18 px at weight 700 (the title size and weight tokens). */
  sk-section-header h2 {
    font-size: var(--sk-text-lg);
    font-weight: var(--sk-weight-bold);
  }
  /* E-18 (5): the gap between the title and the body is 16 px and nothing else: the header's own empty eyebrow and description
     rows keep a library row gap that would add 8 px above the title and 8 px below it, so that gap is 0. */
  sk-section-header::part(header) {
    row-gap: 0;
  }
  sk-section-header {
    margin-block: 0 var(--sk-space-4);
  }
`;
