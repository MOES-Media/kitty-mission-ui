// The suggested resolution of the Drift screen: the command as text, Copy and the result region. The screen dispatches
// `sk-copy-command` from `onCopy` and passes the answer it accepted for THIS finding as `result` (FR-021); a part never
// dispatches an event and never touches the clipboard (C-001, C-003). The field is our own `code` beside an `sk-button` (E-38,
// CP-1 ruling F-1 option a: the host owns the copy); E-37 carries the eyebrow (G-3), the type (G-2) and the 44 px Copy (F-3, G-7).
import { css, html, nothing } from 'lit';
import type { ElementPart, TemplateResult } from 'lit';
import { Directive, PartType, directive } from 'lit/directive.js';
import type { PartInfo } from 'lit/directive.js';
import { COPY_ACCESSIBLE_LABEL, COPY_LABEL, COPY_MANUAL_FALLBACK, COPY_RESULT_TEXT, DRIFT_RESOLUTION_TITLE } from '../../defaults/index.js';
import { lookup } from '../../logic/index.js';

export interface ResolutionProps {
  /** The host's answer for the finding whose Copy was pressed (`copied` or `manual`), else null. */
  result: string | null;
  /** Copy was activated. */
  onCopy(): void;
  /** The command was selected for the user after a `manual` answer: `selected` is what the selection read back (FR-021). */
  onManualReadBack(selected: boolean): void;
}

/** The eyebrow of the region names the region (`aria-labelledby`). */
const TITLE_ID = 'resolution-title';

/**
 * Selects the contents of the element it is placed on once, on the transition INTO `active` (a later render while it stays active
 * never touches the user's own selection), then reads the selection back: the words that say the command is selected are shown
 * only if it is, else the fallback words, and `onReadBack` tells the screen so its live region says the same (S5, FR-021).
 */
class SelectContents extends Directive {
  private wasActive = false;
  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.ELEMENT) throw new Error('selectWhen is an element directive');
  }
  render(active: boolean, onReadBack: (selected: boolean) => void): typeof nothing {
    void active;
    void onReadBack;
    return nothing;
  }
  override update(part: ElementPart, [active, onReadBack]: [boolean, (selected: boolean) => void]): typeof nothing {
    const entering = active && !this.wasActive;
    this.wasActive = active;
    if (entering) {
      const element = part.element;
      // After the commit: a freshly created element is not in the document during `update`.
      void Promise.resolve().then(() => {
        const selected = selectContents(element);
        revealManualWords(element, selected);
        onReadBack(selected);
      });
    }
    return nothing;
  }
}
const selectWhen = directive(SelectContents);

/** True when the document selection reads back exactly the text of `element`. */
function selectContents(element: Element): boolean {
  if (!element.isConnected) return false;
  const selection = document.getSelection();
  const wanted = element.textContent ?? '';
  if (selection === null) return false;
  if (selection.toString() !== wanted) selection.setBaseAndExtent(element, 0, element, element.childNodes.length);
  return selection.toString() === wanted;
}

/** Shows the `manual` words when the command is selected, the fallback words when it could not be. */
function revealManualWords(element: Element, selected: boolean): void {
  const region = element.closest('[data-region="resolution"]');
  const manual = region?.querySelector<HTMLElement>('[data-manual]');
  const fallback = region?.querySelector<HTMLElement>('[data-fallback]');
  if (manual == null || fallback == null) return;
  manual.hidden = !selected;
  fallback.hidden = selected;
}

/** What the resolution region shows: the command (with Copy), else the one sentence that stands for it, else nothing (no region). */
export interface ResolutionView {
  command: { text: string; remedy: string } | null;
  commandNote: string | null;
}

/** The one place the resolution section is drawn: the same eyebrow and `resolution-title` for the command and for the note (DR-13). */
export function renderResolution(view: ResolutionView, p: ResolutionProps): TemplateResult | typeof nothing {
  if (view.command === null && view.commandNote === null) return nothing;
  return html`<section data-region="resolution" aria-labelledby=${TITLE_ID}>
    <span data-eyebrow id=${TITLE_ID}>${DRIFT_RESOLUTION_TITLE}</span>
    ${view.command !== null ? renderCommand(view.command, p) : html`<p data-resolution-note>${view.commandNote}</p>`}
  </section>`;
}

function renderCommand(command: { text: string; remedy: string }, p: ResolutionProps): TemplateResult {
  const answer = p.result === null ? undefined : lookup(COPY_RESULT_TEXT, p.result);
  // `manual` draws both sentences hidden: the directive shows the one that is true once it has tried to select the command.
  const result =
    p.result === 'manual'
      ? html`<span data-manual hidden>${answer}</span><span data-fallback hidden>${COPY_MANUAL_FALLBACK}</span>`
      : (answer ?? nothing);
  return html`<div data-field>
      <code data-command ${selectWhen(p.result === 'manual', p.onManualReadBack)}>${command.text}</code>
      <sk-button data-copy variant="secondary" label=${COPY_ACCESSIBLE_LABEL} @click=${p.onCopy}>${COPY_LABEL}</sk-button>
    </div>
    <div data-copy-result>${result}</div>`;
}

export const resolutionStyles = css`
  [data-region='resolution'] {
    display: grid;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  /* E-37 G-3: the eyebrow. */
  [data-region='resolution'] [data-eyebrow] {
    font-family: var(--sk-font-mono);
    font-size: var(--sk-text-xs);
    font-weight: var(--sk-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sk-fg-subtle);
  }
  [data-region='resolution'] [data-resolution-note] {
    margin: 0;
    color: var(--sk-fg-muted);
  }
  /* E-38: the field of the prototype: a bordered, muted box holding the wrapping command and Copy. */
  [data-field] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sk-space-2);
    min-width: 0;
    border: var(--sk-border-width-1) solid var(--sk-border-default);
    border-radius: var(--sk-radius-md);
    background: var(--sk-surface-muted);
  }
  /* E-37 G-2 (mono, the body colour) and E-38 (the command wraps). */
  [data-command] {
    min-width: 0;
    padding: var(--sk-space-3) var(--sk-space-4);
    font-family: var(--sk-font-mono);
    color: var(--sk-fg-body);
    overflow-wrap: anywhere;
  }
  /* E-37 G-7 and F-3: Copy, 44 px high. */
  sk-button[data-copy]::part(button) {
    min-block-size: 44px;
    font-size: var(--sk-text-sm);
    font-weight: var(--sk-weight-semibold);
    padding: var(--sk-space-2) var(--sk-space-4);
  }
  /* E-37: the result keeps one line of room, so a result does not shift the layout. */
  [data-copy-result] {
    min-block-size: 1.5em;
    font-size: var(--sk-text-xs);
    color: var(--sk-fg-muted);
  }
`;
