// The Evidence chain and the Dependency chain: bodies only. The Evidence chain is a native ordered list of `sk-pill-tag`
// items (CP-1, spike variant D; library gap spec-kitty-design#517). Each Dependency node is a ghost `sk-button` carrying
// its id, title and lane word in ONE slot element (CP-1, spike S6). This file carries no class and no exception (E-20 is
// dropped, so there is no raw `<button>`): layout CSS only. No part dispatches an event: the handler is an argument.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { BLOCKED_TEXT, NO_DEPENDENCIES_TEXT, READY_TEXT, SATISFIED_TEXT, UNSATISFIED_TEXT, dependencyNodeLabel } from '../../defaults/index.js';
import type { StateBadge } from '../../logic/index.js';
import { renderEmptyForm } from './state-parts.js';

const ARROW = '→';

export interface EvidenceChainView {
  readonly missionLabel: string;
  readonly wpId: string;
  readonly stateBadge: StateBadge;
}

export interface DependencyNodeView {
  readonly wpId: string;
  /** The title, the id when the detail gives none. */
  readonly title: string;
  readonly laneWord: string;
  /** True when the Work Package's readiness names this dependency as unsatisfied. */
  readonly unsatisfied: boolean;
}

export interface DependencyChainView {
  readonly nodes: readonly DependencyNodeView[];
  readonly satisfied: boolean;
  readonly readyToStart: boolean;
  /** True while there is no Mission: the nodes are drawn inert. */
  readonly inert: boolean;
}

export const chainStyles = css`
  /* The Evidence chain: pills in a row that wraps, a decorative arrow after each but the last. */
  [data-evidence] {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
  }
  [data-evidence] > li {
    display: flex;
    align-items: center;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  /* The Dependency chain: the nodes are stacked, each as wide as the column, with a decorative arrow between them. */
  [data-readiness] {
    display: grid;
    gap: var(--sk-space-1);
    margin: 0 0 var(--sk-space-3);
  }
  [data-readiness] > p {
    margin: 0;
  }
  [data-chain] {
    display: grid;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
  }
  [data-chain] > li {
    display: grid;
    justify-items: stretch;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  [data-chain] sk-button {
    display: flex;
    min-width: 0;
  }
  [data-chain] sk-button::part(button) {
    box-sizing: border-box;
    min-width: 0;
    display: flex;
    justify-content: flex-start;
    overflow-wrap: break-word;
    text-align: start;
  }
  /* The three texts of a node sit in one slot element, each on its own line (three bare spans would become flex items). */
  [data-node-text] {
    display: flex;
    flex-direction: column;
    gap: var(--sk-space-1);
    min-width: 0;
    padding-block: var(--sk-space-1);
    overflow: hidden;
  }
  [data-arrow] {
    justify-self: center;
  }
`;

export const renderEvidenceChain: (view: EvidenceChainView) => TemplateResult | typeof nothing = (view) => {
  // The stages are data: the Mission, the Work Package and the state word of the committed lane.
  const stages: readonly { readonly key: string; readonly text: string; readonly tone: string | null }[] = [
    { key: 'mission', text: view.missionLabel, tone: null },
    { key: 'work-package', text: view.wpId, tone: null },
    { key: 'state', text: view.stateBadge.label, tone: view.stateBadge.tone },
  ];
  return html`<ol data-evidence>
    ${stages.map(
      (stage, index) => html`<li>
        <sk-pill-tag status=${stage.tone ?? 'neutral'} title=${stage.text}>${stage.text}</sk-pill-tag>
        ${index < stages.length - 1 ? html`<span aria-hidden="true">${ARROW}</span>` : nothing}
      </li>`,
    )}
  </ol>`;
};

/** The readiness in words: blocked follows `satisfied`; ready needs `readyToStart`; started or finished says "satisfied" alone. */
function readinessWords(view: DependencyChainView): readonly string[] {
  if (!view.satisfied) return [BLOCKED_TEXT];
  return view.readyToStart ? [SATISFIED_TEXT, READY_TEXT] : [SATISFIED_TEXT];
}

export const renderDependencyChain: (view: DependencyChainView, onSelectWorkPackage: (wpId: string) => void) => TemplateResult | typeof nothing = (
  view,
  onSelectWorkPackage,
) => {
  if (view.nodes.length === 0) return renderEmptyForm(NO_DEPENDENCIES_TEXT);
  const last = view.nodes.length - 1;
  return html`<div data-readiness>${readinessWords(view).map((word) => html`<p>${word}</p>`)}</div>
    <ul data-chain>
      ${repeat(
        view.nodes,
        (n) => n.wpId,
        (n, index) => html`<li>
          <sk-button variant="ghost" label=${dependencyNodeLabel(n.wpId, n.title, n.laneWord)} ?disabled=${view.inert} @click=${view.inert ? nothing : () => onSelectWorkPackage(n.wpId)}>
            <span data-node-text>
              <span>${n.wpId}</span>
              ${n.title === n.wpId ? nothing : html`<span>${n.title}</span>`}
              <span>${n.laneWord}</span>
            </span>
          </sk-button>
          ${n.unsatisfied ? html`<span data-unsatisfied>${UNSATISFIED_TEXT}</span>` : nothing}
          ${index < last ? html`<span data-arrow aria-hidden="true">${ARROW}</span>` : nothing}
        </li>`,
      )}
    </ul>`;
};
