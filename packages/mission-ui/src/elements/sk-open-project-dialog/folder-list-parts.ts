// The folder listbox of the open-project dialog. The part never dispatches an event: it calls the handler it is given.
// Exception E-33 (this file only; sunset: spec-kitty-design#527, a listbox and option): the options are raw `button role="option"` elements
// painted on hover and when selected, with a forced-colours border on the selected one. Everything else is layout.
import { css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import type { TemplateResult } from 'lit';
import '@spec-kitty/elements';
import { FOLDER_LIST_LABEL, PARENT_FOLDER_TEXT, VALID_PROJECT_TEXT } from '../../defaults/index.js';
import type { FolderEntry } from '../../project-types.js';

/**
 * What the listbox needs from the dialog: the folders in host order, the selected folder's `location`, the index of the option that
 * holds the one tab stop (the dialog owns it, so an unrelated re-render keeps it), and the select and active-index handlers.
 */
export interface FolderListContext {
  folders: readonly FolderEntry[];
  selected: string | null;
  activeIndex: number;
  onSelect(location: string): void;
  onActive(index: number): void;
}

export const folderListStyles = css`
  [role='listbox'] {
    display: grid;
    align-content: start;
    box-sizing: border-box;
    min-height: calc(var(--sk-space-10) + var(--sk-space-10) + var(--sk-space-10) + var(--sk-space-6) + var(--sk-space-1));
    padding: var(--sk-space-2);
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    border-radius: var(--sk-radius-md);
    background: var(--sk-surface-page);
  }
  [role='option'] {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    justify-items: start;
    gap: var(--sk-space-3);
    box-sizing: border-box;
    min-height: calc(var(--sk-space-9) - var(--sk-border-width-2));
    padding: var(--sk-space-2) var(--sk-space-3);
    border: 0;
    border-radius: var(--sk-radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
  }
  [role='option']:focus-visible {
    outline: var(--sk-border-width-2) solid var(--sk-border-focus);
    outline-offset: var(--sk-border-width-2);
  }
  [role='option']:hover,
  [role='option'][aria-selected='true'] {
    background: var(--sk-surface-pill);
  }
  [role='option'][aria-selected='true'] {
    color: var(--sk-fg-default);
  }
  @media (forced-colors: active) {
    [role='option'][aria-selected='true'] {
      border: var(--sk-border-width-1) solid currentColor;
    }
  }
  [data-name] {
    min-width: 0;
  }
  [data-parent-text] {
    color: var(--sk-fg-muted);
  }
  sk-pill-tag::part(tag) {
    padding: var(--sk-space-1) var(--sk-space-2);
    line-height: 1.2;
    border: var(--sk-border-width-1) solid var(--sk-on-status-success);
    font-family: var(--sk-font-mono);
  }
`;

/** The folder glyph of the prototype, drawn locally: the library ships no icon set. */
const folderIcon = html`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 7h7l2 2h9v10H3z" /></svg>`;

/** Moves focus between the options with the arrow keys, Home and End; the tab stop follows the focus. Selection stays on Enter and Space. A modified chord belongs to the browser. */
function onKeydown(event: KeyboardEvent, ctx: FolderListContext): void {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const options = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="option"]'));
  const index = options.indexOf(event.target as HTMLElement);
  if (index < 0) return;
  let next = -1;
  if (event.key === 'ArrowDown') next = Math.min(index + 1, options.length - 1);
  else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = options.length - 1;
  if (next < 0) return;
  event.preventDefault();
  for (const option of options) option.tabIndex = option === options[next] ? 0 : -1;
  ctx.onActive(next);
  options[next]?.focus();
}

function renderOption(folder: FolderEntry, ctx: FolderListContext, tabStop: boolean): TemplateResult {
  const selected = folder.location === ctx.selected;
  return html`<button
    type="button"
    role="option"
    aria-selected=${selected ? 'true' : 'false'}
    tabindex=${live(tabStop ? '0' : '-1')}
    data-location=${folder.location}
    @click=${() => ctx.onSelect(folder.location)}
  >
    ${folderIcon}
    <span data-name>${folder.name}</span>
    ${folder.kind === 'parent'
      ? html`<span data-parent-text>${PARENT_FOLDER_TEXT}</span>`
      : folder.valid
        ? html`<sk-pill-tag status="success">${VALID_PROJECT_TEXT}</sk-pill-tag>`
        : nothing}
  </button>`;
}

/** The `role="listbox"` of folder options. */
export function renderFolderList(ctx: FolderListContext): TemplateResult {
  // One tab stop, at the dialog's active index.
  return html`<div role="listbox" aria-label=${FOLDER_LIST_LABEL} @keydown=${(event: KeyboardEvent) => onKeydown(event, ctx)}>
    ${ctx.folders.map((folder, index) => renderOption(folder, ctx, index === ctx.activeIndex))}
  </div>`;
}
