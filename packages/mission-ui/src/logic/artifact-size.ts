// The one size-display rule of the screen, and the only arithmetic on a contract size value (C-004).
import { SIZE_BYTE_UNIT, SIZE_UNITS } from '../defaults/index.js';
import type { ArtifactLabelHooks } from './artifact-types.js';

/** A number printed by `String` has no trailing ".0", so rounding to one decimal is the whole rule. */
const BASE = SIZE_UNITS[0]?.bytes ?? 1;
const DECIMALS = 10;

/**
 * Below one unit "N B"; else the largest unit of the data table with at most one decimal and no trailing ".0". A size that
 * rounds up to the next unit is shown in that unit. The `size` hook wins; a negative or non-finite number is its own text.
 */
export function formatArtifactSize(bytes: number, hooks?: ArtifactLabelHooks | null): string {
  const hooked = hooks?.size?.(bytes);
  if (hooked !== undefined) return hooked;
  if (!Number.isFinite(bytes) || bytes < 0) return String(bytes);
  if (bytes < BASE) return `${bytes} ${SIZE_BYTE_UNIT}`;
  let index = 0;
  for (let i = 0; i < SIZE_UNITS.length; i += 1) {
    if (bytes >= (SIZE_UNITS[i]?.bytes ?? Infinity)) index = i;
  }
  let unit = SIZE_UNITS[index];
  let value = Math.round((bytes / (unit?.bytes ?? 1)) * DECIMALS) / DECIMALS;
  const next = SIZE_UNITS[index + 1];
  if (unit && next && value * unit.bytes >= next.bytes) {
    unit = next;
    value = Math.round((bytes / next.bytes) * DECIMALS) / DECIMALS;
  }
  return `${value} ${unit?.unit ?? SIZE_BYTE_UNIT}`;
}
