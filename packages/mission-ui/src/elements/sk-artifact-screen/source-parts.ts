// The raw and fallback source block (exception E-25: `white-space: pre-wrap`; no measure of its own, the block takes its pane, as the prototype's does). One text binding carries the
// whole content, so the text is the file character for character. It wraps at spaces and scrolls sideways for an unbroken line; it is a
// tab stop only while it overflows (A11Y-003). No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

export const sourceStyles = css`
  [data-scroll='source'] {
    box-sizing: border-box;
    margin: 0;
    padding: var(--sk-space-6);
    overflow-x: auto;
    white-space: pre-wrap;
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-sm);
    color: var(--sk-fg-body);
    line-height: 1.5;
  }
  [data-scroll='source']:focus-visible {
    outline-width: var(--sk-border-width-2);
    outline-style: solid;
    outline-color: var(--sk-border-focus);
    outline-offset: calc(-1 * var(--sk-border-width-2));
  }
`;

/** `bidiNotice` is the quiet notice above the block (null: none); `scrolls` is true while the block is in the `overflowing` set. */
export function renderSource(text: string, label: string, bidiNotice: string | null, scrolls: boolean): TemplateResult {
  return html`${bidiNotice === null ? nothing : html`<sk-notice tone="info" announce="off">${bidiNotice}</sk-notice>`}<pre data-scroll="source" role="region" aria-label=${label} tabindex=${scrolls ? '0' : nothing}>${text}</pre>`;
}
