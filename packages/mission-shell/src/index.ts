/**
 * @moes-media/mission-shell: the Svelte 5 shell over the mission-ui screens. It owns routing, layout and state, and maps
 * the `sk-*` intents of the screens to a port. It performs no I/O: adapters under apps/* and crates/* do. The public
 * surface is the MissionStatusClient port (contracts/client-port.md). The fixture adapter is the separate entry
 * `@moes-media/mission-shell/testing` (./testing), so this entry carries no fixture data.
 */
export * from './client/port';
export { toStreamCursorString } from './contract/stream';
export type { StreamPosition } from './contract/stream';
