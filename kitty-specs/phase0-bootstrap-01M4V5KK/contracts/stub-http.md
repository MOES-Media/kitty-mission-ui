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

The stub binds `127.0.0.1:<port>` only. The first line on stdout is `listening 127.0.0.1:<port>`, so tests and later missions can read the bound port. (The upstream service does not announce its port, epic #16; the stub deliberately does.) The stub loads every file in `<dir>` once at start-up.

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

Which body is served:
1. With header `X-Kitty-Stub-Fixture: <fixture name>`: that `fixtures.json` value. An unknown name gets `404` with `{"code":"no-fixture"}`.
2. Otherwise, with header `X-Kitty-Stub-Example: <Schema>.<name>`: that `examples.json` value. Every vendored example is reachable this way. An unknown name gets `404` with `{"code":"no-example"}`.
3. Otherwise: the route's `defaultExample`. When that is `null`: `501` with `{"code":"no-example","operationId":"<id>"}`. This branch is tested with a synthetic routes file, because the current pin has no null.

These two headers and the `code` values are stub-local, not part of the contract.

A successful response is `200` with `content-type: application/json`. The body is **JSON-value-equal** to the selected entry. `serde_json` with `preserve_order` keeps the file's key order for readability, but byte layout and key order are not contractual. The tests compare parsed values against `examples.json`, which the contract gate has verified against the YAML. That makes the oracle independent of what the stub serves.

A path that matches no route gets `404`.

## Events

`GET /api/v1/events[?missionId=<id>]` responds `200` with `content-type: text/event-stream`.

Each item of `changes.json` is written after `delayMs × time-scale` milliseconds:

```
event: <event>
id: <id>          # only when the item has an id AND the request is mission-scoped
data: <JSON of data, one line>

```

After the last item, the stream stays open and sends `: heartbeat` every `--heartbeat-ms` until the client disconnects.

The output is deterministic (NFR-004). The test runs with `--time-scale 0 --heartbeat-ms 50`, captures up to the first heartbeat, and compares the bytes across 10 runs.

## Test support

`GET /__stub/last-request` returns `{"method","path","headers":{…}}` for the most recent `/api/v1` request, with header names lower-cased. This lets #21 assert what its proxy forwarded. The same request rules apply to this route.

## Not provided (by design)

Cursor resume, contract refusals (400, 404 and 409 per the contract), and paging behaviour. The stub serves data; it does not reproduce the service's semantics.
