# Contract: the bundled contract document and the canonical digest

## The file

`contracts/fixtures/mission-status.openapi.json` is generated, committed and `linguist-generated`, with LF line ends.

**How it is built.** `pnpm contract:generate` builds it in two steps:

1. `new $RefParser().dereference('contracts/spec-kitty/mission-status/openapi.yaml', { dereference: { circular: false } })`. Every relative file `$ref` under `mission-status/` and `_shared/` is inlined. A circular reference fails generation.
2. `jsonText(doc)`: two-space JSON with a trailing newline. A BOM or a bidi control is written as a `\uXXXX` escape (F-21).

**Rules.**
- No `$ref` key remains anywhere in the document.
- `Gate: contract` regenerates the file in memory and compares it byte for byte (`checkJsonFresh`). The failure text is `stale generated file: contracts/fixtures/mission-status.openapi.json differs from a fresh generation; run pnpm contract:generate`.
- The four existing files in `contracts/fixtures/` are not changed by this mission (SC-004).

**Consumers.**
- kitty-core embeds the file with `include_str!` and derives the pinned digest from it at run time, once.
- `kitty-stub` serves it at `GET /api/v1/openapi.yaml` by default (see `stub-http-delta.md`).

## The canonical form

`canonical(value)`, for a parsed document:

| Value | Written as |
|---|---|
| object | `{` + members sorted by key (UTF-8 byte order), each `"key":value`, separated by `,` + `}` |
| array | `[` + items in order, separated by `,` + `]` |
| string | `serde_json` string escaping |
| number | if finite, integral and with a magnitude below 2^53: a decimal integer with no fraction or exponent; otherwise `serde_json`'s float text |
| `true`, `false`, `null` | as is |

There is no whitespace anywhere.

## The digest

`digest_of(bytes) = lowercase_hex(SHA-256(canonical(parse_yaml(bytes))))`

- `parse_yaml` is `yaml_serde` into `serde_json::Value`. JSON is accepted, because JSON is a subset of YAML.
- A parse failure is an error, never a digest.
- **Pinned digest.** It is `digest_of(include_str!(bundle))`. There is no stored constant.
- **Served digest.** It is `digest_of(body of GET /api/v1/openapi.yaml)`, for a 200 answer only.

**Equality cases** (tested):
- the same document in JSON and in YAML block style;
- key order permuted;
- `1.0` and `1`.

**Inequality cases** (tested):
- one changed scalar;
- one removed key;
- one added path.

## Known limit

If the real service serves its root file with unresolved relative `$ref`s, or another bundling, the result is contract-mismatch until #22 adapts the check (spec Assumptions).
