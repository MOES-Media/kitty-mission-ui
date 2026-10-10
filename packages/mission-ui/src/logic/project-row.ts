import type { ProjectView } from '../contract/types.js';
import { ACTIVE_PREFIX, HEALTH_BADGES, UNKNOWN_HEALTH_TONE, VERSION_PREFIX, missionCountText, schemaVersionText, SUMMARY_SEPARATOR } from '../defaults/index.js';
import type { ProjectEntry, ProjectLabelHooks } from '../project-types.js';
import { lookup } from './lookup.js';
import { locationSegments, resolveEntry, type EntryStub } from './project-entry.js';
import { resolveActivity } from './time.js';
import type { StateBadge } from './types.js';

/** One Projects row, all text already resolved. There is no `schemaVersion` field: it reaches assistive technology as text only. */
export interface ProjectRowView {
  kind: 'row';
  key: string;
  name: string;
  /** Null hides the slot. */
  versionText: string | null;
  health: StateBadge;
  locationLine: string;
  missionCountText: string;
  activityText: string;
  /** What the polite region reads when this row arrives. The row's real accessible name is computed by `sk-action-row` from its visible content (FR-003). */
  announcementText: string;
  /** The summary prepared for a library passthrough (spec-kitty-design#528); not yet wired: nothing renders it today. */
  description: string;
  openable: boolean;
}

export type EntryView = ProjectRowView | EntryStub;

/** hook, then the default table, then the raw value in a neutral tone; the badge follows `health` and nothing else. */
export function resolveHealth(value: string, hooks: ProjectLabelHooks | null): StateBadge {
  return hooks?.health?.(value) ?? lookup(HEALTH_BADGES, value) ?? { label: value, tone: UNKNOWN_HEALTH_TONE };
}

/** A key the host can be told about: a non-empty string (the same test as the retry control's). */
export function hasUsableKey(key: unknown): key is string {
  return typeof key === 'string' && key !== '';
}

function rowOf(entry: ProjectEntry, key: string, project: ProjectView, now: string | null, hooks: ProjectLabelHooks | null): ProjectRowView {
  const health = resolveHealth(project.health, hooks);
  const count = missionCountText(project.missionCount);
  const versionText = project.specKittyVersion === null ? null : `${VERSION_PREFIX}${project.specKittyVersion}`;
  const locationLine = locationSegments(entry, project.currentBranch);
  // The no-activity text stands alone; any activity (hook text, relative time or the raw ISO string) reads "active <it>".
  const activity = resolveActivity(project.lastActivityAt, now, hooks);
  const activityText = project.lastActivityAt === null ? activity : `${ACTIVE_PREFIX} ${activity}`;
  const description = [versionText, project.schemaVersion === null ? null : schemaVersionText(project.schemaVersion), locationLine, activityText]
    .filter((part): part is string => part !== null && part !== '')
    .join(SUMMARY_SEPARATOR);
  return {
    kind: 'row',
    key,
    name: project.name,
    versionText,
    health,
    locationLine,
    missionCountText: count,
    activityText,
    announcementText: `${project.name}, ${health.label}, ${count}`,
    description,
    // A row without a usable key cannot name itself in `sk-open-project`, so it is not openable.
    openable: entry.openable !== false && hasUsableKey(key),
  };
}

/** The view of one entry: a row for a read project, else the resolved stub. */
export function buildRow(entry: ProjectEntry, now: string | null, hooks: ProjectLabelHooks | null): EntryView {
  const resolved = resolveEntry(entry);
  return resolved.kind === 'row' ? rowOf(entry, resolved.key, resolved.project, now, hooks) : resolved;
}
