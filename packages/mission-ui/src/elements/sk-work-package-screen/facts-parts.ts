// Facts, Assignment and Frontmatter: bodies only (the screen draws the panels). Exception E-17: `sk-facts*` classes in this
// file. No part dispatches an event.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import {
  ABSENT_MARKER,
  AUTHORED_TITLE,
  FRESH_TEXT,
  LABEL_ACTOR,
  LABEL_AGENT,
  LABEL_ASSIGNEE,
  LABEL_COMMITTED_STATE,
  LABEL_DEPENDENCIES,
  LABEL_EXECUTION_MODE,
  LABEL_FORCED_TRANSITIONS,
  LABEL_IMPLEMENTER_OF_RECORD,
  LABEL_LAST_TRANSITION,
  LABEL_MODEL,
  LABEL_PHASE,
  LABEL_PRIORITY,
  LABEL_PROFILE,
  LABEL_PROVIDER,
  LABEL_REQUIREMENT_REFS,
  LABEL_ROLE,
  LABEL_STALENESS,
  LABEL_TARGET_BRANCH,
  LABEL_TASK_TYPE,
  LABEL_TRACKER_REFS,
  LABEL_VERSION,
  LABEL_WORK_PACKAGE,
  STALENESS_NOT_APPLICABLE_TEXT,
  STALENESS_STATUS_ROLE,
} from '../../defaults/index.js';
import { lookup } from '../../logic/index.js';
import type { ResolvedDependency, StalenessView, StateBadge } from '../../logic/index.js';
import { visuallyHidden } from '../../visually-hidden.js';
import { renderEmptyForm } from './state-parts.js';

export interface FactsView {
  readonly wpId: string;
  /** The committed state: the status lane word and tone of the header badge. */
  readonly stateBadge: StateBadge;
  readonly actorText: string | null;
  readonly mergeTargetBranch: string | null;
  readonly phaseLabel: string | null;
  readonly taskType: string | null;
  readonly trackerRefs: readonly string[];
  /** The last transition, as the screen's time rule prints it; null when there is none. */
  readonly lastTransitionText: string | null;
  readonly forceCount: number;
  readonly implementerOfRecord: string | null;
  readonly staleness: StalenessView;
}

/** One group of Assignment rows: every member as the contract gives it, null when absent. */
export interface AssignmentGroupView {
  readonly agent: string | null;
  readonly assignee: string | null;
  readonly role: string | null;
  readonly agentProfile: string | null;
  readonly agentProfileVersion: string | null;
  readonly model: string | null;
  readonly provider: string | null;
}

export interface AuthoredGroupView {
  readonly role: string | null;
  readonly agentProfile: string | null;
  readonly model: string | null;
  readonly subtasks: readonly string[];
}

export interface AssignmentView {
  readonly assignment: AssignmentGroupView;
  readonly authored: AuthoredGroupView;
}

export interface FrontmatterView {
  /** The resolved dependencies, drawn as titled pills (plain, not actionable). */
  readonly dependencies: readonly ResolvedDependency[];
  readonly requirementRefs: readonly string[];
  readonly priority: string | null;
  readonly executionMode: string | null;
}

export const factsStyles = css`
  /* The prototype's two tracks (label .8fr, value 1.2fr) with a label floor of its longest word and a value floor of 0, so a label wraps and a value
     shrinks to its column instead of the label track taking its full text width in a narrow card. */
  .sk-facts--two-col {
    grid-template-columns: minmax(min-content, .8fr) minmax(0, 1.2fr);
  }
  /* E-21: a long unbroken value (a branch, a handle) wraps inside its column. */
  .sk-facts__value {
    min-width: 0;
    overflow-wrap: break-word;
  }
  /* Pill lists (dependencies, requirement references): side by side and wrapping. The items are plain blocks, so no list marker
     is drawn (list-style is not a layout property). */
  [data-pills] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
  }
  [data-pills] > li {
    display: block;
    min-width: 0;
  }
  /* The Assignment panel's two groups: the second is set apart from the first. */
  [data-group] + [data-group] {
    margin-block: var(--sk-space-4) 0;
  }
  [data-group] > h3 {
    margin-block: 0 var(--sk-space-2);
  }
  /* A staleness status with no visible form is still text in the accessibility tree. */
  [data-hidden-text] {
    ${visuallyHidden}
  }
`;

/** One row of a facts list: the term and its value, drawn only when the value is not null. */
function fact(label: string, value: unknown): TemplateResult | typeof nothing {
  return value === null || value === undefined ? nothing : html`<dt class="sk-facts__term">${label}</dt><dd class="sk-facts__value">${value}</dd>`;
}

/** Joined handles with a break opportunity after each colon: a long actor wraps at a handle instead of overflowing its column. */
function breakable(text: string | null): TemplateResult | null {
  return text === null ? null : html`${text.split(':').map((part, index) => html`${index === 0 ? nothing : html`:<wbr>`}${part}`)}`;
}

/** A non-empty text, or null: an empty string is an absent value. */
const present = (value: string | null): string | null => (value === null || value === '' ? null : value);

/** The staleness row: only for the quiet role. A status the table knows shows the quiet word; a foreign one its raw text. */
function stalenessRow(view: StalenessView): TemplateResult | typeof nothing {
  if (view.role !== 'row' || view.status === null) return nothing;
  return fact(LABEL_STALENESS, lookup(STALENESS_STATUS_ROLE, view.status) === undefined ? view.status : FRESH_TEXT);
}

export const renderFacts: (view: FactsView) => TemplateResult | typeof nothing = (view) => {
  return html`<dl class="sk-facts sk-facts--two-col">
      ${fact(LABEL_WORK_PACKAGE, view.wpId)}
      ${fact(LABEL_COMMITTED_STATE, html`<sk-pill-tag status=${view.stateBadge.tone} title=${view.stateBadge.label}>${view.stateBadge.label}</sk-pill-tag>`)}
      ${fact(LABEL_ACTOR, breakable(view.actorText))}
      ${fact(LABEL_TARGET_BRANCH, present(view.mergeTargetBranch))}
      ${fact(LABEL_PHASE, present(view.phaseLabel))}
      ${fact(LABEL_TASK_TYPE, present(view.taskType))}
      ${fact(LABEL_TRACKER_REFS, view.trackerRefs.length === 0 ? null : view.trackerRefs.join(', '))}
      ${fact(LABEL_LAST_TRANSITION, present(view.lastTransitionText))}
      ${fact(LABEL_FORCED_TRANSITIONS, view.forceCount)}
      ${fact(LABEL_IMPLEMENTER_OF_RECORD, present(view.implementerOfRecord))}
      ${stalenessRow(view.staleness)}
    </dl>
    ${view.staleness.role === 'none' && view.staleness.status !== null
      ? html`<span data-hidden-text>${STALENESS_NOT_APPLICABLE_TEXT(view.staleness.reason)}</span>`
      : nothing}`;
};

/** The rows of one group of Assignment: each only when non-null. */
function assignedRows(view: AssignmentGroupView): TemplateResult | typeof nothing {
  const rows = [
    fact(LABEL_AGENT, present(view.agent)),
    fact(LABEL_ASSIGNEE, present(view.assignee)),
    fact(LABEL_ROLE, present(view.role)),
    fact(LABEL_PROFILE, present(view.agentProfile)),
    fact(LABEL_VERSION, present(view.agentProfileVersion)),
    fact(LABEL_MODEL, present(view.model)),
    fact(LABEL_PROVIDER, present(view.provider)),
  ];
  return [view.agent, view.assignee, view.role, view.agentProfile, view.agentProfileVersion, view.model, view.provider].every((member) => present(member) === null)
    ? nothing
    : html`<div data-group="assigned"><dl class="sk-facts sk-facts--two-col">${rows}</dl></div>`;
}

/** The authored recommendation: its own labelled group, never merged with the assigned values. */
function authoredRows(view: AuthoredGroupView): TemplateResult | typeof nothing {
  return [view.role, view.agentProfile, view.model].every((member) => present(member) === null)
    ? nothing
    : html`<div data-group="authored">
        <h3>${AUTHORED_TITLE}</h3>
        <dl class="sk-facts sk-facts--two-col">
          ${fact(LABEL_ROLE, present(view.role))}${fact(LABEL_PROFILE, present(view.agentProfile))}${fact(LABEL_MODEL, present(view.model))}
        </dl>
      </div>`;
}

export const renderAssignment: (view: AssignmentView) => TemplateResult | typeof nothing = (view) => html`${assignedRows(view.assignment)}${authoredRows(view.authored)}`;

/** A list of plain pills: not controls, so no tab stop and no accessible name of their own. */
function pills(texts: readonly string[]): TemplateResult | null {
  return texts.length === 0 ? null : html`<ul data-pills>${texts.map((text) => html`<li><sk-pill-tag title=${text}>${text}</sk-pill-tag></li>`)}</ul>`;
}

export const renderFrontmatter: (view: FrontmatterView) => TemplateResult | typeof nothing = (view) => {
  const dependencies = view.dependencies.map((d) => (d.title === null || d.title === d.wpId ? d.wpId : `${d.wpId} ${d.title}`));
  const priority = present(view.priority);
  const mode = present(view.executionMode);
  if (dependencies.length === 0 && view.requirementRefs.length === 0 && priority === null && mode === null) return renderEmptyForm(ABSENT_MARKER);
  return html`<dl class="sk-facts sk-facts--two-col">
    ${fact(LABEL_DEPENDENCIES, pills(dependencies))}
    ${fact(LABEL_REQUIREMENT_REFS, pills(view.requirementRefs))}
    ${fact(LABEL_PRIORITY, priority)}${fact(LABEL_EXECUTION_MODE, mode)}
  </dl>`;
};
