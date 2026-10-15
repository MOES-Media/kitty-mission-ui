/**
 * @moes-media/mission-shell/testing: the in-memory fixture adapter of the MissionStatusClient port, for tests, stories and
 * the hosts' own test suites. It is a separate entry so the production entry (`.`) never pulls in the fixture JSON of
 * contracts/fixtures (CODE-BOUNDARY-003). The connection-state test hook `setConnectionState` is deliberately not exported
 * here either: it stays internal to this package's tests, which import it from ./client/fixture by relative path.
 */
export { createFixtureClient } from './client/fixture';
export type { ChangesEnvelope, ExampleTable, FixtureClientOptions, RouteEntry, Scheduler } from './client/fixture';
