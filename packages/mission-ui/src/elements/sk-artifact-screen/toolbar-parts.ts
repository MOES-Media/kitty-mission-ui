// The toolbar band: the kind icon and the file name (DA-11). A stub with its final signature; the document pane work package fills the
// body. Exceptions E-28 (the pinned `min-height: 68px`, DA-40) and E-30 (the band's rule and fill). No part dispatches an event.
import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { renderIcon } from '../../shell-icons.js';
import type { ShellIcon } from '../../shell-types.js';

export interface ToolbarView {
  /** The glyph of the file's kind (decorative). */
  readonly icon: ShellIcon;
  /** The file name, a `strong` and not a heading. */
  readonly name: string;
  /** The full path, shown as the title of the name. */
  readonly path: string;
}

export const toolbarStyles = css`
  /* The band's rule and card fill (E-30) and its pinned minimum height (E-28). */
  [data-region='toolbar'] {
    box-sizing: border-box;
    min-height: 68px;
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
    background: var(--sk-surface-card);
  }
  [data-toolbar-name] {
    display: flex;
    align-items: center;
    gap: var(--sk-space-3);
    min-width: 0;
  }
  [data-toolbar-name] svg {
    display: block;
    flex: 0 0 auto;
    inline-size: var(--sk-space-5);
    block-size: var(--sk-space-5);
  }
  /* The file name: the mono face, one line, ellipsized (E-21 for this file); the full name is the title. */
  [data-toolbar-name] strong {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--sk-font-mono);
  }
`;

export function renderToolbar(view: ToolbarView): TemplateResult {
  return html`<span data-toolbar-name>${renderIcon(view.icon)}<strong title=${view.path}>${view.name}</strong></span>`;
}
