/**
 * A percentage as a whole number for DISPLAY (DR-11 as confirmed at CP-1: 68%, not 68.4%). Pure formatting: the value
 * a host or a progress bar uses stays the figure the contract gave. A non-finite figure shows as 0.
 */
export function formatWholePercent(percentage: number): string {
  if (!Number.isFinite(percentage)) return '0';
  const whole = Math.round(percentage);
  return String(whole === 0 ? 0 : whole);
}
