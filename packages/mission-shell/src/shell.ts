/**
 * @moes-media/mission-shell/shell: the mountable shell (contracts/shell-api.md). Re-exports only; the entry declares nothing.
 * The port stays in `.` and the fixture adapter in `./testing`.
 */
export { default as MissionShell } from './ui/MissionShell.svelte';
export { mountShell } from './ui/mount';
export type { MountedShell } from './ui/mount';
export { formatRoute, parseRoute } from './core/routes';
export type { Destination, ShellMode } from './core/routes';
export type { ShellHost } from './core/host';
export type { ShellScheduler } from './core/scheduler';
export type { ShellCopyOverrides } from './core/connection';
export type { ShellOptions } from './ui/options';
