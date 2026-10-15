# Contract delta: `kitty-stub` (extends #17's `contracts/stub-http.md`)

Everything in `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/stub-http.md` still holds. This file adds one route and five options. The stub keeps `publish = false` and binds `127.0.0.1` only (C-008). The crate's module documentation links both files.

This version is revised for squad fix round 1 and amendment A-07.

```
kitty-stub [--fixtures <dir>] [--port <n> | --mission-status.port=<n>] [--mission-status.project-root=<dir>]
           [--heartbeat-ms <ms>] [--time-scale <f>] [--header-timeout-ms <ms>]
           [--openapi <file>] [--select <operationId>=<Schema.name>]... [--select-fixture <operationId>=<fixture>]...
```

| Option | Default | Meaning |
|---|---|---|
| `--fixtures` | see "Fixtures directory" | Directory holding the four `mission-status.*.json` files and the bundle. |
| `--mission-status.port=<n>` | — | Same as `--port`; the upstream launch form. Giving both is a usage error (exit 2). |
| `--mission-status.project-root=<dir>` | — | Accepted so `Core` can supervise the stub. It is used only to find `<dir>/fixtures`, and is never read otherwise. |
| `--openapi` | `<fixtures>/mission-status.openapi.json` | The document served at `GET /api/v1/openapi.yaml`. A **missing default** serves 404 `no-openapi-document`. An **explicit** file that cannot be read is exit 1 (R4-07). |
| `--select` | none | Serve this `examples.json` entry on the operation when the request carries no selection header. |
| `--select-fixture` | none | Serve this `fixtures.json` entry on the operation when the request carries no selection header. |

## Fixtures directory

The stub takes the first of these that applies:

1. `--fixtures` when it is given.
2. Otherwise `<project-root>/fixtures`, when `--mission-status.project-root` is given and that path is a directory.
3. Otherwise the workspace's `contracts/fixtures`, as a compile-time path: `concat!(env!("CARGO_MANIFEST_DIR"), "/../../contracts/fixtures")`.

The stub is a test stand-in run from this workspace, so a path relative to the working directory would break whenever a host starts it from elsewhere. The compile-time path ends up in the built binary only, never in a tracked file.

**Load order** (pinned):
1. arguments;
2. fixtures (`Fixtures::load`, conflict checks);
3. selections, checked against the fixtures;
4. the document;
5. the `listening` line.

## `GET /api/v1/openapi.yaml`

- **Rules.** The same guard applies as on every route: Host, Origin and forwarding headers, each refused with 403. The same `405 Allow: GET` rule applies. The request is recorded by `/__stub/last-request`.
- **Answer.** `200`, `content-type: application/yaml`, with the document bytes exactly as loaded.
- **No document.** `404 {"code":"no-openapi-document"}`. This happens when the library is used without `with_openapi_document`, or when the binary's default file is missing.
- **Collision.** A `routes.json` entry whose path is `/openapi.yaml` is refused at load as a route conflict.

## Start-up selection

- **Validation.** Before `listening`, each selection is checked by the header rule:
  - **Success.** A `responseSchema` match is served as 200.
  - **Refusal.** A declared refusal schema, whose own `status` is in the allowed list, is served as `application/problem+json` with that status.
  - **On `streamEvents`.** The declared refusals are `Problem` 404 and `StreamRefusal` 400 or 409.
- **Selectable in practice.** From the committed files, only the five `StreamRefusal` examples can be selected on `streamEvents`, because neither file holds a `Problem` entry and C-002 freezes both.
- **The 404 `Problem` refusal (A-08).** kitty-core's tests select it on an **in-process** stub built with `Fixtures::from_values(...)` from in-memory values that add one `Problem` example (status 404), plus `with_selections`.
- **Usage errors.** Each of these is exit 2 with the usage text:
  - an unknown operationId;
  - an unknown example or fixture;
  - a schema that does not fit;
  - a second selection for the same operation;
  - a malformed `op=name`.
- **Precedence.**
  1. `X-Kitty-Stub-Fixture`;
  2. `X-Kitty-Stub-Example`;
  3. the start-up selection;
  4. the route's `defaultExample` (or the stream, on `streamEvents`).
- **Library form.** `Fixtures::with_selections(..) -> Result` applies the same validation. `Options`, `app`, `Fixtures::load` and `Fixtures::from_values` are unchanged, so every #17 stub test runs unchanged (NFR-008).
