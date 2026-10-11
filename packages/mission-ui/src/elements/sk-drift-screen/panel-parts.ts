// The panel wrapper of the Drift screen: the library's `sk-card` with an `sk-section-header` whose label sits in the EYEBROW slot
// (CP-1 ruling F-6), forming a `section` named by that label through `aria-labelledby`. Called by the detail part only. The E-18
// extension (CP-1, 2026-10-10; sunset spec-kitty-design#516, a compact density for `sk-card`) applies to this file: it restyles
// four things, each pinned to one token (border width, radius, padding, the header row gap), and E-37 G-3 paints the eyebrow.
import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export interface PanelOptions {
  /** Becomes the `data-region` attribute; omitted for an anonymous panel. */
  id?: string;
}

/** The id slug of a label: lower case words joined by hyphens. */
function slugOf(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** One labelled panel. `title` is the eyebrow label; `body` is the region's body (`nothing` for a stub). */
export function renderPanel(title: string, body: TemplateResult | typeof nothing, options: PanelOptions = {}): TemplateResult {
  const titleId = `panel-title-${options.id ?? slugOf(title)}`;
  return html`<sk-card data-region=${ifDefined(options.id)}>
    <section aria-labelledby=${titleId}>
      <sk-section-header><span slot="eyebrow" id=${titleId}>${title}</span></sk-section-header>
      ${body}
    </section>
  </sk-card>`;
}

export const panelStyles = css`
  sk-card {
    display: block;
  }
  /* E-18 extension: border width, radius and padding. */
  sk-card::part(card) {
    border-width: var(--sk-border-width-1);
    border-radius: var(--sk-radius-md);
    padding: var(--sk-space-5);
  }
  /* The header's own empty title and description rows keep a library row gap: it is 0, and the block margin is 0. */
  sk-section-header {
    margin-block: 0;
  }
  sk-section-header::part(header) {
    row-gap: 0;
  }
  /* E-37 G-3: the eyebrow. */
  sk-section-header [slot='eyebrow'] {
    display: block;
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sk-fg-subtle);
  }
`;
