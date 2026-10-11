// The inspector body: file facts, Mission facts, linked Work Packages, "Open Work Package", the redaction note and the read-only note.
// Exception E-27: `sk-facts*` and `sk-pill-tag` classes in this file. E-29: the one raw `button.sk-pill-tag`, with the four pinned ellipsis
// declarations. E-30: the panel paint is drawn by the screen file. The facts are the library `sk-facts` look (CP-1 ruling 4, accepted
// drift DA-28 and DA-34). No part dispatches an event: a Work Package control calls the handler.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { PATH_SEPARATOR } from '../../defaults/index.js';
import { pillTagSheet } from '../../library-sheets.js';
import { renderIcon } from '../../shell-icons.js';
import type { ArtifactFact } from '../../logic/artifact-facts.js';

export interface LinkedWorkPackageView {
  readonly wpId: string;
  /** The name of the control: the Work Package title and id. */
  readonly label: string;
}

export interface InspectorView {
  readonly fileTitle: string;
  readonly missionTitle: string;
  readonly linkedTitle: string;
  readonly file: readonly ArtifactFact[];
  readonly mission: readonly ArtifactFact[];
  readonly linked: readonly LinkedWorkPackageView[];
  /** The "Open Work Package" control for a prompt or a review cycle; null draws none. */
  readonly open: LinkedWorkPackageView | null;
  readonly openLabel: string;
  /** The redaction line when the content is redacted; null otherwise. */
  readonly redactedNote: string | null;
  readonly readOnlyNote: string;
  /** True while there is no Mission: the Work Package controls are drawn inert. */
  readonly inert: boolean;
}

export interface InspectorHandlers {
  /** A Work Package control: `sk-select-work-package` for this id. */
  readonly onSelectWorkPackage: (wpId: string) => void;
}

export const inspectorStyles = [
  // The library's pill-tag sheet gives the raw button its pill look (E-29); the rules below only make it a block that can ellipsize.
  pillTagSheet,
  css`
    [data-inspector-group] {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--sk-space-3);
      min-width: 0;
    }
    /* The group headings take the prototype's h3 size (E-44). */
    [data-inspector-group] > h3 {
      margin: 0;
      font-size: var(--sk-text-base);
      line-height: 1.35;
    }
    [data-inspector-group] > .sk-facts {
      min-width: 0;
    }
    /* Words-only wrapping (FR-034, E-21 in spirit): a fact value wraps between words and, for a path, after each separator; one word
       wider than the column ellipsizes (the full text is the title of the value). The four declarations are E-29's. */
    .sk-facts__value span {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    /* The flex row of Work Package controls: the pills, and the "Open Work Package" button at its own width (a flex item). */
    [data-inspector-pills] {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sk-space-2);
      min-width: 0;
      margin: 0;
      padding: 0;
    }
    [data-inspector-pills] > li {
      min-width: 0;
      max-width: 100%;
      display: flex;
    }
    /* The Work Package pill (E-29): a native button in the pill look: no browser border (26px, not 30px), the pointer, and the ellipsis that keeps one long title on one line. */
    button.sk-pill-tag {
      display: block;
      min-width: 0;
      max-width: 100%;
      margin: 0;
      border: 0;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    sk-button > svg {
      inline-size: var(--sk-space-4);
      block-size: var(--sk-space-4);
      margin-inline: 0 var(--sk-space-2);
    }
  `,
];

/** A value as words: spaces between wrapping words, and for a path a break opportunity after each separator. */
function renderValue(fact: ArtifactFact): TemplateResult {
  const parts = fact.value.split(/(\s+)/).map((token) => {
    if (token === '' || /^\s+$/.test(token)) return token;
    if (fact.mono !== true) return html`<span>${token}</span>`;
    // Every glyph sits inside a word span (the separator closes its segment), so the text stays on one baseline.
    const segments = token.split(PATH_SEPARATOR);
    const last = segments.length - 1;
    return segments.map((segment, i) => html`<span>${i === last ? segment : `${segment}${PATH_SEPARATOR}`}</span>${i === last ? nothing : html`<wbr />`}`);
  });
  return fact.mono === true ? html`<code>${parts}</code>` : html`${parts}`;
}

function renderFacts(facts: readonly ArtifactFact[]): TemplateResult {
  return html`<dl class="sk-facts">
    ${facts.map((fact) => html`<dt class="sk-facts__term">${fact.label}</dt><dd class="sk-facts__value" title=${fact.value}>${renderValue(fact)}</dd>`)}
  </dl>`;
}

export function renderInspector(view: InspectorView, handlers: InspectorHandlers): TemplateResult {
  const linked = view.linked;
  return html`<div data-inspector-group>
      <h3>${view.fileTitle}</h3>
      ${renderFacts(view.file)}
    </div>
    ${view.mission.length === 0 ? nothing : html`<div data-inspector-group><h3>${view.missionTitle}</h3>${renderFacts(view.mission)}</div>`}
    ${linked.length === 0
      ? nothing
      : html`<div data-inspector-group>
          <h3>${view.linkedTitle}</h3>
          <ul data-inspector-pills>
            ${linked.map(
              (wp) =>
                html`<li><button type="button" class="sk-pill-tag" title=${wp.label} ?disabled=${view.inert} @click=${() => handlers.onSelectWorkPackage(wp.wpId)}>${wp.label}</button></li>`,
            )}
          </ul>
        </div>`}
    ${view.open === null
      ? nothing
      : html`<div data-inspector-pills>
          <sk-button variant="secondary" ?disabled=${view.inert} @click=${() => handlers.onSelectWorkPackage(view.open?.wpId ?? '')}>${renderIcon('file')}${view.openLabel}</sk-button>
        </div>`}
    ${view.redactedNote === null ? nothing : html`<sk-notice tone="info" announce="off">${view.redactedNote}</sk-notice>`}
    <sk-notice tone="info" announce="off">${view.readOnlyNote}</sk-notice>`;
}
