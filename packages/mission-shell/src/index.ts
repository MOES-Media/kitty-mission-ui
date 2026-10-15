/**
 * @moes-media/mission-shell: the Svelte 5 shell over the mission-ui screens. It owns routing, layout and state, and maps
 * the `sk-*` intents of the screens to a port. It performs no I/O: adapters under apps/* and crates/* do. The public
 * surface is the MissionStatusClient port (contracts/client-port.md) and its fixture adapter (WP05).
 */
export * from './client/port';
export { createFixtureClient } from './client/fixture';
