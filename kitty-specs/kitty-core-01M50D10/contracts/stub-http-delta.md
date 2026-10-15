# Contract delta: `kitty-stub` (extends #17's `contracts/stub-http.md`)

Everything in `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/stub-http.md` still holds. This file adds one route and three options. The stub keeps `publish = false` and binds `127.0.0.1` only (C-008). The crate's module documentation links both files.

```
kitty-stub --fixtures <dir> [--port <n>] [--heartbeat-ms <ms>] [--time-scale <f>] [--header-timeout-ms <ms>]
           [--openapi <file>] [--select <operationId>=<Schema.name>]... [--select-fixture <operationId>=<fixture>]...
```

| Option | Default | Meaning |
|---|---|---|
| `--openapi` | `<fixtures>/mission-status.openapi.json` | The document served at `GET /api/v1/openapi.yaml`. It is read once, after the fixtures and before `listening`. An unreadable file is exit 1. |
| `--select` | none | Serve the named `examples.json` entry on that operation when the request carries no selection header. |
| `--select-fixture` | none | Serve the named `fixtures.json` entry on that operation when the request carries no selection header. |

## `GET /api/v1/openapi.yaml`

- **Rules.** It falls under the same guard (Host, Origin and forwarding, each refused with 403) and the same `405 Allow: GET` rule as every route. `/__stub/last-request` records it, because it is an `/api/v1` request.
- **Answer.** `200`, `content-type: application/yaml`, and the document bytes exactly as loaded. They are never re-serialised.
- **No document.** In library use without `with_openapi_document`, the answer is `404` with `{"code":"no-openapi-document"}`. kitty-core's "service without a contract route" test relies on this.
- **Collision.** A `routes.json` entry whose path is `/openapi.yaml` is refused at load, as a route conflict (SO-CORR-003 style).

## Start-up selection

- **Validation.** Each selection is checked before `listening` by the same rule as the headers.
  - The entry's schema must be the route's `responseSchema` (served 200), or one of its `refusals` schemas with the entry's own `status` in the allowed list (served `application/problem+json` with that status).
  - On `streamEvents`, only the declared refusals are selectable (`Problem` 404, `StreamRefusal` 400 or 409).
  - In practice only the five `StreamRefusal` examples are selectable: neither `examples.json` nor `fixtures.json` holds a `Problem` entry, and C-002 freezes both files.
- **Usage errors.** Exit 2 with the usage text in each of these cases:
  - an unknown operationId;
  - an unknown example or fixture;
  - a schema that does not fit;
  - a second selection for the same operation;
  - a malformed `op=name`.
- **Precedence.** `X-Kitty-Stub-Fixture`, then `X-Kitty-Stub-Example`, then the start-up selection, then the route's `defaultExample` (or the stream, on `streamEvents`).
- **Library form.** `Fixtures::with_selections(..)` returns `Result`, with the same validation. The `Options` struct, `app`, `Fixtures::load` and `Fixtures::from_values` are unchanged, so every #17 stub test runs unchanged (NFR-008).
