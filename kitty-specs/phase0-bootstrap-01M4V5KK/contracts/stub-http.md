# Contract: `kitty-stub` HTTP and SSE surface

The binary is `kitty-stub --fixtures <dir> [--port <n>]`. It binds `127.0.0.1:<n>`, where port 0 means ephemeral. The port it bound is printed on stdout as the first line, `listening 127.0.0.1:<port>`, so that tests and later missions can read it. Upstream's service does not announce its port (epic #16); the stub deliberately does.

## Reads

- `GET /api/v1/<path>`, for each `kind: "read"` entry in `routes.json`, with path parameters matched by template.
- When `defaultFixture` is set: `200`, `content-type: application/json`, and the body is the fixture `value` byte-for-byte as stored in `fixtures.json` (serialised with `serde_json`, keys in file order).
- When `defaultFixture` is null: `501` with body `{"code":"no-example","operationId":"<id>"}`. The `code` is a stub-local value, not a contract refusal code.
- A path that matches no route gives `404`, and a non-GET method gives `405`.
- Path-parameter values are not checked against the fixture. Any `missionId` returns the default fixture. Selecting a named fixture per request is a later need (#18, #19) and is out of scope.

## Events

- `GET /api/v1/events[?missionId=<id>]` responds `200` with `content-type: text/event-stream`.
- Each item of `changes.json` is written, after its `delayMs`, as:
  ```
  event: <event>
  id: <id>          # only when the item has an id AND the request is mission-scoped
  data: <JSON of data, one line>

  ```
- After the last item, the stream stays open, sending `: heartbeat` comments every 30 s, until the client disconnects.
- The output is deterministic: the same request gives the same bytes (NFR-004). The test captures the stream up to the first heartbeat and compares it across 10 runs.

## Not provided (by design)

- No Host or Origin checks (research R-07).
- No cursor resume, no refusals (400, 404, 409), no paging.
- Never part of a release artefact.
