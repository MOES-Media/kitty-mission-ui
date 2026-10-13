# Contract: `kitty-stub` HTTP and SSE surface

The crate has `publish = false` and is never part of a release artefact.

```
kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>]
```

| Option | Default | Meaning |
|---|---|---|
| `--port` | `0` | port to bind on `127.0.0.1`; `0` means ephemeral |
| `--heartbeat-ms` | `30000` | interval between `: heartbeat` comments |
| `--time-scale` | `1.0` | multiplier for every item's `delayMs`; tests use `0` |

The stub binds `127.0.0.1:<port>` only. The first line on stdout is `listening <addr>`, printed from the bound listener's `local_addr()` (never from configuration), so tests and later missions can read the bound port. The loopback test runs the real binary, asserts the announced address is `127.0.0.1`, and connects on a non-loopback local address expecting a refusal. That address is found with `std` only (a UDP socket "connect" to a documentation-range address reveals the default-route local IP without sending traffic); the test is skipped, with the reason logged, when it is loopback or unavailable. No crate is added (R2-08, R3-07). (The upstream service does not announce its port, epic #16; the stub deliberately does.) The stub loads every file in `<dir>` once at start-up.

## Request rules (all routes, mirroring the upstream service)

Any request that breaks a rule gets `403`, with body `{"code":"<rule>"}`:

| Rule | Condition |
|---|---|
| Host | `Host` must be exactly `127.0.0.1:<port>` or `localhost:<port>` (`code: "host"`) |
| Origin | `Origin`, when present, must equal `http://127.0.0.1:<port>` or `http://localhost:<port>` (`code: "origin"`) |
| Forwarded | any `Forwarded` or `X-Forwarded-*` header (`code: "forwarded"`) |

- A non-GET method gets `405`.
- No request value (path parameter, query or header) is ever used to build a filesystem path. A test sends `../` traversal in `ArtifactPath` and must get fixture data or a 404, never a file read.

## Reads

`GET /api/v1/<path>` for each `kind: "read"` entry in `routes.json`, with path parameters matched by template. Path-parameter values are not checked against the data.

Which body is served (the fixture header takes precedence over the example header when both are present; A23):
1. With header `X-Kitty-Stub-Fixture: <fixture name>`: that `fixtures.json` value. An unknown name gets `404` with `{"code":"no-fixture"}`.
2. Otherwise, with header `X-Kitty-Stub-Example: <Schema>.<name>`: that `examples.json` value. An unknown name gets `404` with `{"code":"no-example"}`.
3. Otherwise: the route's `defaultExample`.

A selection (1 or 2) is accepted only when the entry's schema fits the route (R2-06):
- equal to the route's `responseSchema`: served with `200`;
- equal to one of the route's declared refusal schemas (`routes.json` `refusals`): served with the selected example's **own `status` field**, which the contract makes authoritative ("the status follows from the code"; one schema such as `ArtifactRefusal` covers several statuses). If that status is not in the schema's allowed set in `refusals`, the selection is a `400` `schema-mismatch` (R3-02);
- anything else, including every event example (`StatusTransitionEvent`, `MissionLifecycleEvent`, `LogTruncatedEvent`): `400` with `{"code":"schema-mismatch","schema":"<entry schema>","operationId":"<id>"}`.

Where two operations share a refusal schema (`ArtifactRefusal` on `listArtifacts` and `getArtifactContent`), a refusal example whose status is allowed on the route is served even if its `code` belongs to the other operation. The body is still schema-valid, and the check is by schema and status, not by code.

So every vendored example that is a **complete response** of some route is reachable on that route. That covers successes, refusals, and the five `StreamRefusal` examples, which `GET /api/v1/events` serves (as `application/problem+json` with their own status, instead of the stream) when `X-Kitty-Stub-Example` names one. The events route applies the same rule as reads: the example's schema must be in the route's `refusals` (`StreamRefusal: [400, 409]`) and its own `status` in that list, otherwise `400` `schema-mismatch` (A5). The stub never serves a refusal or an event payload as a successful read. Of the 77 examples, 20 are not selectable:

- 13 component-level examples, for example a single `MissionOverview` row. They stay in `examples.json` for the shell's fixture adapter.
- 7 event examples. These are stream items: the stub emits events from `changes.json`, not as response bodies (R3-06). When the default is `null`: `501` with `{"code":"no-example","operationId":"<id>"}`. This branch is tested with a synthetic routes file, because the current pin has no null.

These two headers and the `code` values (`no-fixture`, `no-example`, `schema-mismatch`) are stub-local, not part of the contract.

A served success has `content-type: application/json`; a served refusal has `content-type: application/problem+json`, matching the contract (R3-01). Both use the status given above. The body is **JSON-value-equal** to the selected entry. `serde_json` with `preserve_order` keeps the file's key order for readability, but byte layout and key order are not contractual. The tests compare parsed values against `examples.json`, which the contract gate has verified against the YAML. That makes the oracle independent of what the stub serves.

A path that matches no route gets `404`.

## Events

`GET /api/v1/events[?missionId=<id>]` responds `200` with `content-type: text/event-stream`.

`changes.json` is `{ "missionId": …, "items": [ … ] }` (data-model ChangeItem). Each item is written after `delayMs × time-scale` milliseconds:

```
event: <event>
id: <scopedId>    # only when the item has a scopedId AND the request is mission-scoped (never on log-truncated)
data: <JSON of data, one line>

```

After the last item, the stream stays open and sends `: heartbeat` every `--heartbeat-ms` until the client disconnects.

The test runs with `--time-scale 0 --heartbeat-ms 50` and captures up to the first heartbeat. It parses the captured stream and asserts that the event names, the `id:` lines and the `data` equal the items of `changes.json` in order, once for a mission-scoped request and once for an unscoped one (no `id:` lines) (R3-04). Determinism (NFR-004) is checked on top: the captured bytes are identical across 10 runs.

## Test support

`GET /__stub/last-request` returns exactly `{"method","path","headers":{…}}` for the most recent `/api/v1` request, with header names lower-cased. `path` is the request path without the query string; there is no separate `query` field (A23). This lets #21 assert what its proxy forwarded. The same request rules apply to this route.

## Not provided (by design)

Cursor resume, the contract's *conditional* refusal behaviour (it never decides on its own to answer 400, 404 or 409 the way the service would; refusal bodies are served only when selected), and paging behaviour. The stub serves data; it does not reproduce the service's semantics.
