// Styles every region of the Work Package screen shares. Pills ELLIPSIZE (operator ruling during WP09): one rule on the
// library pill's `tag` part, here and nowhere else, so a later library fix replaces this one block. The full text stays
// available as the pill's `title` and as its text (its accessible name). Exception E-21 (this file): keyword values only.
// The artifact-opening actions carry a decorative file icon, sized by the same sheet.
import { css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { renderIcon } from '../../shell-icons.js';

export const sharedStyles = css`
  sk-pill-tag {
    max-width: 100%;
    min-width: 0;
  }
  sk-pill-tag::part(tag) {
    display: block;
    box-sizing: border-box;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  sk-button > svg {
    inline-size: var(--sk-space-4);
    block-size: var(--sk-space-4);
    flex: none;
  }
`;

/** The leading file icon of an artifact-opening action. */
export const renderFileIcon = (): TemplateResult => html`${renderIcon('file')}`;
