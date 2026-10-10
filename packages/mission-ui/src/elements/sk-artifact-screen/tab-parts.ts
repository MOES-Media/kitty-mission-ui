// The Rendered / Raw tablist: native `<button type="button" role="tab">` painted with tokens keyed on `aria-selected` (exception E-26,
// the paint entry ruled at CP-1). A stub with its final signature; the selected tab is held by the screen file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { ArtifactTab } from '../../logic/artifact-types.js';

export interface TabView {
  readonly tab: ArtifactTab;
  readonly label: string;
  readonly selected: boolean;
  /** The ids are static and shadow-root-local. */
  readonly tabId: string;
  /** The id of the panel this tab controls; null on a tab whose panel is not rendered, so no idref dangles. */
  readonly panelId: string | null;
}

export interface TabsView {
  /** The name of the tablist. */
  readonly label: string;
  readonly tabs: readonly TabView[];
}

export const tabStyles = css`
  /* The tablist is the prototype's segmented control: a pill tray (token fill, 1px edge) holding pill tabs (E-26 extension). */
  [role='tablist'] {
    display: inline-flex;
    gap: var(--sk-space-1);
    padding: var(--sk-space-1);
    border-width: var(--sk-border-width-1);
    border-style: solid;
    border-color: var(--sk-border-default);
    border-radius: var(--sk-radius-pill);
    background: var(--sk-surface-input);
  }
  /* A tab keeps a block size of at least 36 px (NFR-015). The paint is keyed on aria-selected (E-26): the unselected tab's edge is
     the tray's own colour (so it reads as no edge), the selected tab has a visible edge and a fill, so the state is not colour only. */
  [role='tab'] {
    min-height: calc(var(--sk-space-7) + var(--sk-space-1));
    padding: var(--sk-space-1) var(--sk-space-3);
    border-width: var(--sk-border-width-1);
    border-style: solid;
    border-radius: var(--sk-radius-pill);
    font: inherit;
    border-color: var(--sk-surface-input);
    background: transparent;
    color: var(--sk-fg-muted);
  }
  [role='tab']:hover {
    color: var(--sk-fg-default);
  }
  [role='tab'][aria-selected='true'] {
    border-color: var(--sk-border-strong);
    background: var(--sk-surface-pill);
    color: var(--sk-fg-default);
  }
  @media (forced-colors: active) {
    [role='tab'] {
      border-color: CanvasText;
    }
    [role='tab'][aria-selected='true'] {
      border-color: Highlight;
    }
  }
`;

/** The tab a key moves to, or null for a key that is not a tab key. Arrows wrap; Home and End jump. */
function targetIndex(key: string, at: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (at + 1) % count;
    case 'ArrowLeft':
      return (at - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * Selection follows focus: the key moves focus to the target tab and selects it, in one step. The tablist is the tab's parent, so
 * the order of the tabs is the order in the DOM and no id is read from a template.
 */
function onKeyDown(event: KeyboardEvent, tabs: readonly TabView[], onSelect: (tab: ArtifactTab) => void): void {
  // A chord belongs to the browser or the system (Alt+ArrowLeft is Back): the tablist answers the bare key only.
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const current = event.currentTarget;
  if (!(current instanceof HTMLElement) || current.parentElement === null) return;
  const buttons = Array.from(current.parentElement.querySelectorAll<HTMLElement>('[role="tab"]'));
  const to = targetIndex(event.key, buttons.indexOf(current), buttons.length);
  const next = to === null ? undefined : tabs[to];
  if (to === null || next === undefined) return;
  event.preventDefault();
  buttons[to]?.focus();
  onSelect(next.tab);
}

export function renderTabs(view: TabsView, onSelect: (tab: ArtifactTab) => void): TemplateResult {
  return html`<div role="tablist" aria-label=${view.label}>
    ${view.tabs.map(
      (tab) =>
        html`<button type="button" role="tab" id=${tab.tabId} aria-selected=${tab.selected ? 'true' : 'false'} aria-controls=${tab.panelId ?? nothing} tabindex=${tab.selected ? '0' : '-1'} @click=${() => onSelect(tab.tab)} @keydown=${(event: KeyboardEvent) => onKeyDown(event, view.tabs, onSelect)}>${tab.label}</button>`,
    )}
  </div>`;
}
