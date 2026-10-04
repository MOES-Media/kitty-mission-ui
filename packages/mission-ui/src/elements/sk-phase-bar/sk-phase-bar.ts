// Display only: no events. Never contains a phase name, count or order (FR-013, FR-014, C-007): the phases arrive as
// data and every word comes from `src/defaults/`. Candidate B of spike S2 (confirmed at CP-1): exception E-04, a
// token-only `background` on the connector, is added by the work package that fills this element.
import { LitElement, css, html } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { nothing } from 'lit';
import '@spec-kitty/elements';
import { PHASES_LABEL, PHASE_GLYPH, PHASE_IS_CURRENT, PHASE_STATUS_TEXT, PHASE_TONE } from '../../defaults/index.js';
import { phaseState, resolvePhaseLabel } from '../../logic/index.js';
import type { LabelHooks } from '../../logic/index.js';
import type { PhaseView } from '../../contract/types.js';

/**
 * Renders the phases it receives, in array order and in whatever number. Pattern element (no screen contract). Not
 * self-registering: `src/index.ts` defines the tag once.
 *
 * @element sk-phase-bar
 * @tagname sk-phase-bar
 */
export class SkPhaseBar extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    ol {
      display: flex;
      flex-wrap: wrap;
      gap: var(--sk-space-2);
      margin: 0;
      padding: 0;
    }
    li {
      position: relative;
      display: flex;
      flex: 1 1 0;
      align-items: center;
      gap: var(--sk-space-2);
      min-width: 0;
    }
    /* The last phase takes only its own width, so the connectors fill the rest and the last item ends the row. */
    li:last-child {
      flex: 0 0 auto;
    }
    sk-status-indicator {
      min-width: 0;
    }
    /* The connector is the one painted part (exception E-04): a token-only background. */
    [data-connector] {
      flex: 1 1 0;
      min-width: var(--sk-space-2);
      block-size: var(--sk-border-width-1);
      background: var(--sk-border-default);
    }
    /* Read by assistive technology, takes no room. */
    [data-phase-status] {
      position: absolute;
      inline-size: 0;
      block-size: 0;
      overflow: hidden;
    }
  `;

  /** The phases in display order; names are strings, not the contract enum. */
  @property({ attribute: false })
  phases: PhaseView[] = [];

  /** Label hooks; only `phase` is read. */
  @property({ attribute: false })
  labels: LabelHooks | null = null;

  /** The accessible name of the list. */
  @property()
  label: string = PHASES_LABEL;

  protected override render(): TemplateResult {
    const last = this.phases.length - 1;
    return html`<ol aria-label=${this.label}>
      ${this.phases.map((phase, index) => {
        const state = phaseState(phase.status);
        return html`<li aria-current=${PHASE_IS_CURRENT[state] ? 'step' : nothing}>
          <sk-status-indicator tone=${PHASE_TONE[state]}>
            <span slot="marker">${PHASE_GLYPH[state]}</span>
            <span data-phase-label>${resolvePhaseLabel(phase.name, this.labels)}</span>
            <span data-phase-status>${PHASE_STATUS_TEXT[state]}</span>
          </sk-status-indicator>
          ${index < last ? html`<span data-connector aria-hidden="true"></span>` : nothing}
        </li>`;
      })}
    </ol>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sk-phase-bar': SkPhaseBar;
  }
}
