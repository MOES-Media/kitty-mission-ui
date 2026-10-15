# Contract: refresh policy and the expected read recording (FR-007 to FR-010, SC-002, NFR-001 to NFR-003)

The policy table and the displayed sets are in `data-model.md`. This file fixes the **recording** that the
refresh-policy test compares against, so the test, its plant and the reviewer share one oracle.

## The test set-up

- The shell controller, over `createFixtureClient({ scheduler: fake, initialState: 'connected' })`.
- The client is wrapped in a recording proxy. It records `"<op> <canonical params>"` for every read and delegates to
  the fixture. The proxy is test-only, and the port is unchanged.
- The fixture serves each route's default example whatever the parameters (CODE-BOUNDARY-011). The shell keys
  resources by the route's parameters, never by the response, so the ids in the examples do not matter.
- `M` is the sequence's Mission, `01JZAB3C4D5E6F7G8H9JKMNPQR` (the `missionId` of `contracts/fixtures/mission-status.changes.json`).
  `O` is any other valid ULID. `P` is any artifact path.
- The steps:
  1. Mount on the destination.
  2. Flush the initial reads and clear the recording.
  3. Advance the fake scheduler through the five scripted changes (`mission-lifecycle`, `status-transition` × 2,
     `log-truncated`, `status-transition`, 250 ms apart; all for M; the status transitions are for WP01).
  4. Force `reconnecting` and then `connected` with the internal hook (imported by relative path, as the #17 tests
     do), which delivers one `resync`.
- The replayed changes are 250 ms apart, more than the 100 ms window, so no two of them coalesce.
- The test runs in the shell's Node test project (`test/logic/`).

## Expected recording (reads after the initial load)

Counts per key. Any read not listed is a failure (NFR-003), and every listed key must appear at least once (the
positive control of SC-002).

| Destination | C1 lifecycle | C2 st WP01 | C3 st WP01 | C4 truncated | C5 st WP01 | resync | Total |
|---|---|---|---|---|---|---|---|
| Missions | `missions` | `missions` | `missions` | `missions` | `missions` | `project`, `missions` | `missions` 6, `project` 1 |
| Drift `*` | none | none | none | none | none | `project`, `drift:*`, `mission-names` | 3 |
| Drift `M` | none | none | none | `drift:M` | none | `project`, `drift:M`, `mission-names` | `drift:M` 2, others 1 |
| Ops | none | none | none | none | none | `project`, `ops` | 2 |
| Pipeline `M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` 6 |
| Pipeline `O` | none | none | none | none | none | `mission:O` | 1 |
| Work Package `M`/WP01 | `mission:M` | `mission:M`, `wp:M/WP01`, `wp-detail:M/WP01` | same as C2 | same as C2 | same as C2 | same as C2 | `mission:M` 6, `wp` 5, `wp-detail` 5 |
| Work Package `M`/WP02 | `mission:M` | `mission:M` | `mission:M` | `mission:M`, `wp:M/WP02`, `wp-detail:M/WP02` | `mission:M` | `mission:M`, `wp:M/WP02`, `wp-detail:M/WP02` | `mission:M` 6, `wp` 2, `wp-detail` 2 |
| Artifact `M`, `P` | `mission:M` | `mission:M` | `mission:M` | `mission:M`, `artifacts:M`, `artifact:M:P` | `mission:M` | `mission:M`, `artifacts:M`, `artifact:M:P` | `mission:M` 6, `artifacts` 2, `artifact` 2 |
| Projects (picker) | none | none | none | none | none | none | 0 |

Each row also asserts the read's parameters: a `wp:M/WP02` read carries `wpId: 'WP02'`, never `WP01`.

The plant for this test (`plan.md`, Gates) removes `missions` from the `mission-lifecycle` row of the policy table.
The Missions row's C1 cell then records nothing and the test fails with the failure-only message
`refresh-policy mismatch on missions`. That message is the assertion's custom message, so it is printed only on
failure. No test title contains it.

## Separate assertions (the same Node project, no plant)

- **NFR-002 (coalescing).** On Pipeline `M`, an injected change table of five `status-transition` items for M with
  `delayMs` 0, 10, 10, 10, 10 records at most 2 `mission:M` reads, and at least 1.
- **NFR-001 (latency).** With the fake scheduler, the re-read is issued at the change's delivery tick (0 ms after it).
  The screen value is applied once the read's promise settles: under 150 ms of fake time, and at 0 ms with a fixture
  that resolves at once.
- **FR-009 (latest wins).** A test-local client with deferred promises. The earlier `mission:M` read resolves last,
  and the snapshot holds the later read's value.
- **FR-007 (subscription counts).** Over mount, client change and unmount: subscribe 1 + 1, unsubscribe 1 + 1;
  `connection.onChange` the same; and a change delivered after unmount records 0 reads and no error.
- **FR-010 (refused).** `createFixtureClient({ examples: { streamEvents: 'StreamRefusal.content-mismatch' } })`
  shows the live-updates-off notice. A later read still resolves into the snapshot, and nothing throws.
- **Connection gating.** `initialState: 'connecting'`: 0 reads until `setConnectionState('connected')`, then exactly
  the destination's initial reads (US4-1, US4-2).
- **Edge: `resync` while a read is in flight.** The in-flight result is dropped (generation), and the resync read's
  result is shown.
