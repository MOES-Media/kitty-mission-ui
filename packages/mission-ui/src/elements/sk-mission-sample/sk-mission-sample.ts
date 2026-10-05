import { LitElement, css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import '@spec-kitty/elements';
import { normaliseViewState } from '../../view-state.js';
import type { MissionSummary, ViewState } from '../../view-state.js';
import type { SkOpenMissionDetail } from '../sk-missions-screen/sk-missions-screen.js';

/** Payload of `sk-mission-retry`: always an empty object. */
export type SkMissionRetryDetail = Record<string, never>;

const GENERIC_ERROR = 'Something went wrong while loading the mission.';

/**
 * Template element encoding the charter screen contract: data in as properties,
 * a `status` view state, events out, no I/O.
 *
 * Not self-registering: `src/index.ts` defines the tag once (guarded), so importing this module alone never
 * throws on a duplicate definition.
 *
 * @screen
 * @element sk-mission-sample
 * @tagname sk-mission-sample
 *
 * @fires {CustomEvent<SkOpenMissionDetail>} sk-open-mission - the ready-state open button was activated (the same event and detail type as the Missions screen's; the sample has no Mission id, so `missionId` is empty)
 * @fires {CustomEvent<SkMissionRetryDetail>} sk-mission-retry - the error-state retry button was activated
 */
export class SkMissionSample extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    [data-layout] {
      display: grid;
      gap: var(--sk-space-4);
    }
  `;

  @property({ reflect: true })
  status: ViewState = 'loading';

  @property({ attribute: false })
  mission: MissionSummary | null = null;

  @property({ attribute: 'error-message' })
  errorMessage = '';

  protected override willUpdate(): void {
    if (this.status === 'loading') {
      this.setAttribute('aria-busy', 'true');
    } else {
      this.removeAttribute('aria-busy');
    }
  }

  private onOpen(): void {
    const slug = this.mission?.slug ?? '';
    const detail: SkOpenMissionDetail = { missionId: '', slug };
    this.dispatchEvent(new CustomEvent<SkOpenMissionDetail>('sk-open-mission', { detail, bubbles: true, composed: true }));
  }

  private onRetry(): void {
    this.dispatchEvent(new CustomEvent<SkMissionRetryDetail>('sk-mission-retry', { detail: {}, bubbles: true, composed: true }));
  }

  private renderReady(mission: MissionSummary): TemplateResult {
    return html`
      <sk-card>
        <div data-layout>
          <sk-section-header><h3 slot="title">${mission.name}</h3></sk-section-header>
          <sk-pill-tag>${mission.workPackagesDone}/${mission.workPackagesTotal}</sk-pill-tag>
          <sk-button variant="primary" @click=${this.onOpen}>Open mission</sk-button>
        </div>
      </sk-card>
    `;
  }

  private renderEmpty(): TemplateResult {
    return html`<sk-notice tone="info">No mission to show yet.</sk-notice>`;
  }

  private renderLoading(): TemplateResult {
    return html`
      <div data-layout>
        <sk-status-indicator pulsing>Loading mission</sk-status-indicator>
      </div>
    `;
  }

  private renderError(): TemplateResult {
    const message = this.errorMessage === '' ? GENERIC_ERROR : this.errorMessage;
    return html`
      <sk-notice tone="danger">
        ${message}
        <sk-button slot="actions" variant="secondary" @click=${this.onRetry}>Retry</sk-button>
      </sk-notice>
    `;
  }

  protected override render(): TemplateResult | typeof nothing {
    switch (normaliseViewState(this.status)) {
      case 'ready':
        return this.mission === null ? this.renderEmpty() : this.renderReady(this.mission);
      case 'loading':
        return this.renderLoading();
      case 'error':
        return this.renderError();
      default:
        return this.renderEmpty();
    }
  }
}

declare global {
  interface HTMLElementEventMap {
    'sk-mission-retry': CustomEvent<SkMissionRetryDetail>;
  }
  interface HTMLElementTagNameMap {
    'sk-mission-sample': SkMissionSample;
  }
}
