// The project health vocabulary (ProjectHealth.yaml): the only place the two contract words appear as strings.
import type { BadgeTone, StateBadge } from '../logic/types.js';

/** The ruled badge of each contract health value (Q5). */
export const HEALTH_BADGES: Readonly<Record<string, StateBadge>> = {
  healthy: { label: 'healthy', tone: 'success' },
  schema_drift: { label: 'schema drift', tone: 'attention' },
};

/** A value the table does not know shows its raw word in this tone. */
export const UNKNOWN_HEALTH_TONE: BadgeTone = 'neutral';
