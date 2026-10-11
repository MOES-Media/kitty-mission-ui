// The finding head and the finding listbox of the Drift screen. Keys are a pure helper in `logic/drift-keys.ts`. The screen draws the
// `head` and `listbox` wrappers and dispatches `sk-select-finding` from `onSelect`; a part never dispatches an event.
// Exception E-36: the option is a raw `button` with `role="option"` (the library ships no listbox). E-37 G-2 to G-4 paint its text and
// its pills, E-39 lets the Mission slug break mid-word.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FINDINGS_LIST_LABEL } from '../../defaults/index.js';
import type { DriftFindingKey, DriftMissionName, DriftReportView } from '../../contract/types.js';
import { findingKey, findingTitle, headSummary, listboxTarget, missionLabel, missionNaming, resolveSeverity, rowKeys } from '../../logic/index.js';
import type { LabelHooks } from '../../logic/index.js';
import { visuallyHidden } from '../../visually-hidden.js';

/** What the head and the listbox read. The findings are drawn in the report's own order. */
export interface ListProps {
  report: DriftReportView;
  /** The index of the selected finding in `report.findings`, or -1 (nothing, or a key that is not in this scan). */
  selectedIndex: number;
  /** True in a scoped scan: the Mission column is dropped (DD-20). */
  scoped: boolean;
  missions: Readonly<Record<string, DriftMissionName>> | null;
  hooks: LabelHooks | null;
  /** An option was chosen by click, Enter, Space or a key that moves the selection. */
  onSelect(key: DriftFindingKey): void;
}

/** The head: the count, the roll-up for assistive technology, and a badge when any shown finding has a danger-tone severity. */
export function renderHead(p: ListProps): TemplateResult {
  const summary = headSummary(p.report, p.hooks);
  const badge = summary.headBadge;
  return html`<div data-head>
    <span data-count>${summary.countText}</span>
    ${summary.tallies.length === 0 ? nothing : html`<span data-rollup>${summary.rollupText}</span>`}
    ${badge === null ? nothing : html`<sk-pill-tag data-head-badge status=${badge.tone}>${badge.label}</sk-pill-tag>`}
  </div>`;
}

/**
 * Up/Left, Down/Right with wrap, Home and End move the focus to the target option and choose it (selection follows focus): one
 * event per key. A chord with a modifier, or a key the table does not know, is left alone. A key that moves nowhere on an option that
 * is already the selected one emits nothing.
 */
function onKeydown(p: ListProps, event: KeyboardEvent): void {
  const options = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="option"]')];
  const from = options.indexOf(event.target as HTMLElement);
  if (from === -1) return;
  const to = listboxTarget(event, from, options.length);
  if (to === null) return;
  event.preventDefault();
  options[to]?.focus();
  const finding = p.report.findings[to];
  if (finding === undefined || (to === from && to === p.selectedIndex)) return;
  p.onSelect(findingKey(finding));
}

/** The listbox: one native button per finding, in the report's order. The tab stop is the selected option, else the first. */
export function renderListbox(p: ListProps): TemplateResult {
  const findings = p.report.findings;
  const keys = rowKeys(findings);
  const stop = p.selectedIndex === -1 ? 0 : p.selectedIndex;
  return html`<div role="listbox" aria-label=${FINDINGS_LIST_LABEL} @keydown=${(event: KeyboardEvent) => onKeydown(p, event)}>
    ${repeat(
      findings,
      (_finding, index) => keys[index] ?? String(index),
      (finding, index) => {
        const severity = resolveSeverity(finding.severity, p.hooks);
        return html`<button
          type="button"
          role="option"
          aria-selected=${index === p.selectedIndex ? 'true' : 'false'}
          tabindex=${index === stop ? '0' : '-1'}
          @click=${() => p.onSelect(findingKey(finding))}
        >
          <strong data-title>${findingTitle(finding, p.hooks)}</strong>
          ${p.scoped ? nothing : html`<span data-mission>${missionLabel(missionNaming(finding.missionId, p.missions))}</span>`}
          <sk-pill-tag status=${severity.tone}>${severity.word}</sk-pill-tag>
        </button>`;
      },
    )}
  </div>`;
}

export const listStyles = css`
  /* The head: the count and the badge, with the prototype's padding and rule under it. */
  [data-head] {
    display: flex;
    justify-content: space-between;
    gap: var(--sk-space-2);
    padding: var(--sk-space-4);
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
  }
  /* The roll-up ("2 errors, 1 warning") is read, not drawn: the prototype's head has none. */
  [data-rollup] {
    ${visuallyHidden}
  }
  /* E-37 G-3: the eyebrow. */
  [data-count] {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sk-fg-subtle);
  }
  /* E-36: the finding option is a raw button (the library has no listbox). */
  [role='option'] {
    display: grid;
    gap: var(--sk-space-2);
    inline-size: 100%;
    min-width: 0;
    padding: var(--sk-space-4);
    border: 0;
    border-block-end: var(--sk-border-width-1) solid var(--sk-border-default);
    border-inline-start: var(--sk-border-width-2) solid transparent;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
  }
  [role='option']:hover {
    background: var(--sk-surface-card);
  }
  /* The selected marker is the neutral selection token: selection is not severity (DD-15). */
  [role='option'][aria-selected='true'] {
    border-inline-start-color: var(--sk-border-selected);
    background: var(--sk-surface-pill);
  }
  @media (forced-colors: active) {
    [role='option'][aria-selected='true'] {
      border-inline-start-color: Highlight;
    }
  }
  [role='option'] [data-title] {
    min-width: 0;
  }
  /* E-37 G-2 and E-39: the Mission slug is mono and muted, and breaks mid-word instead of widening the list. */
  [data-mission] {
    min-width: 0;
    font-family: var(--sk-font-mono);
    color: var(--sk-fg-muted);
    overflow-wrap: anywhere;
  }
  [role='option'] sk-pill-tag {
    justify-self: start;
  }
  /* E-37 G-4: the outlined mono pill, the one rule for every pill of the screen (the head badge and the rows here, the kicker and the
     authority in the detail), scoped to the two regions that draw pills. */
  [data-region='list'] sk-pill-tag::part(tag),
  [data-region='detail'] sk-pill-tag::part(tag) {
    font-family: var(--sk-font-mono);
    font-weight: var(--sk-weight-normal);
    padding: var(--sk-space-1) var(--sk-space-2);
    border: var(--sk-border-width-1) solid currentColor;
    line-height: 1.2;
  }
`;
