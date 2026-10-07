// Subtasks, Workspace and the artifact links: bodies only. The subtask bar is a native `<progress>` of the library's
// `sk-progress*` classes and the workspace is a `dl` of its `sk-facts*` classes (exception E-17, this file only); the
// links are ghost `sk-button`s. Layout CSS only beyond that. No part dispatches an event: the handlers are arguments.
import { css, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import {
  ABSENT_MARKER,
  LABEL_CODE_LANE,
  LABEL_LANE_BRANCH,
  LABEL_PLANNING_BRANCH,
  LABEL_WORKTREE_PRESENT,
  NO_SUBTASKS_TEXT,
  NO_WORD,
  OPEN_PROMPT_LABEL,
  OPEN_SPEC_LABEL,
  SUBTASK_PROGRESS_TEXT,
  YES_WORD,
} from '../../defaults/index.js';
import { resolveStateBadge } from '../../logic/index.js';
import type { LabelHooks, ResolvedSubtask } from '../../logic/index.js';
import { breakable } from './files-parts.js';
import { renderFileIcon } from './shared-parts.js';
import { renderEmptyForm } from './state-parts.js';

export interface SubtasksView {
  /** The progress as the contract gives it, shown unchanged (no arithmetic). */
  readonly done: number;
  readonly total: number;
  readonly items: readonly ResolvedSubtask[];
  /** The host's label hooks: a subtask's lane word is hook, then default, then the raw lane, like every other lane word. */
  readonly labels?: LabelHooks | null;
}

/** The four rows; a null member is drawn with the absent marker. */
export interface WorkspaceView {
  readonly laneId: string | null;
  readonly laneBranch: string | null;
  readonly planningBranch: string | null;
  readonly worktreePresent: boolean;
}

export interface ArtifactLinkView {
  readonly path: string;
  readonly kind: string;
}

/** Each link only when non-null; the region is not drawn when both are null. */
export interface ArtifactLinksView {
  readonly spec: ArtifactLinkView | null;
  readonly prompt: ArtifactLinkView | null;
  /** True while there is no Mission: the actions are drawn inert. */
  readonly inert: boolean;
}

export const workStyles = css`
  [data-subtasks] {
    display: grid;
    gap: var(--sk-space-2);
    margin: 0;
    padding: 0;
  }
  [data-subtasks] > li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--sk-space-2);
    min-width: 0;
  }
  [data-subtask-title] {
    flex: 1 1 0;
    min-width: 0;
  }
  /* The prototype's two columns (.8fr and 1.2fr, both able to shrink): a long branch name breaks at its slashes and stays inside the panel. */
  [data-workspace] {
    grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr);
  }
  [data-bar] {
    margin-block: 0 var(--sk-space-3);
  }
  [data-links] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sk-space-2);
  }
`;

/** One subtask row: the id, the title unless there is none (or it is the id), and the lane word of the subtask's lane. */
const renderSubtaskRow = (item: ResolvedSubtask, labels: LabelHooks | null): TemplateResult => {
  const lane = resolveStateBadge(item.lane, labels);
  return html`<li data-id=${item.id}>
    <span data-subtask-id>${item.id}</span>
    ${item.title === null || item.title === item.id ? nothing : html`<span data-subtask-title>${item.title}</span>`}
    <sk-pill-tag status=${lane.tone} title=${lane.label}>${lane.label}</sk-pill-tag>
  </li>`;
};

export const renderSubtasks: (view: SubtasksView) => TemplateResult | typeof nothing = (view) => {
  const label = SUBTASK_PROGRESS_TEXT(view.done, view.total);
  const bar =
    view.total > 0
      ? html`<div class="sk-progress" data-bar>
          <label class="sk-progress__label" for="subtask-progress">${label}</label>
          <progress class="sk-progress__bar" id="subtask-progress" value=${view.done} max=${view.total}>${view.done}/${view.total}</progress>
        </div>`
      : nothing;
  const list =
    view.items.length === 0
      ? view.total > 0
        ? nothing
        : renderEmptyForm(NO_SUBTASKS_TEXT)
      : html`<ul data-subtasks>
          ${repeat(view.items, (item) => item.id, (item) => renderSubtaskRow(item, view.labels ?? null))}
        </ul>`;
  return html`${bar}${list}`;
};

export const renderWorkspace: (view: WorkspaceView) => TemplateResult | typeof nothing = (view) => {
  // Four rows, always: a null member shows the one absent marker (never an empty value, never a "none" word).
  const rows: readonly (readonly [string, string])[] = [
    [LABEL_CODE_LANE, view.laneId ?? ABSENT_MARKER],
    [LABEL_LANE_BRANCH, view.laneBranch ?? ABSENT_MARKER],
    [LABEL_PLANNING_BRANCH, view.planningBranch ?? ABSENT_MARKER],
    [LABEL_WORKTREE_PRESENT, view.worktreePresent ? YES_WORD : NO_WORD],
  ];
  return html`<dl class="sk-facts sk-facts--two-col" data-workspace>
    ${rows.map(([term, value]) => html`<dt class="sk-facts__term">${term}</dt><dd class="sk-facts__value">${breakable(value)}</dd>`)}
  </dl>`;
};

export const renderArtifactLinks: (view: ArtifactLinksView, onOpenArtifact: (path: string, kind: string) => void) => TemplateResult | typeof nothing = (
  view,
  onOpenArtifact,
) => {
  const action = (label: string, link: ArtifactLinkView | null): TemplateResult | typeof nothing =>
    link === null
      ? nothing
      : html`<sk-button variant="secondary" ?disabled=${view.inert} @click=${view.inert ? nothing : () => onOpenArtifact(link.path, link.kind)}>${renderFileIcon()}${label}</sk-button>`;
  if (view.spec === null && view.prompt === null) return nothing;
  return html`<div data-links>${action(OPEN_SPEC_LABEL, view.spec)}${action(OPEN_PROMPT_LABEL, view.prompt)}</div>`;
};
