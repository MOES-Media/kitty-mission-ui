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
| number | converted to `f64` first (JavaScript semantics); `-0` becomes `0`; if integral with magnitude ≤ 2^53, a decimal integer with no fraction or exponent; otherwise one shortest round-trip formatter (`serde_json`'s `f64` text) (R2-10) |
| `true`, `false`, `null` | as is |

There is no whitespace anywhere.

## The digest

`digest_of(bytes) = lowercase_hex(SHA-256(canonical(parse(bytes))))`

- `parse` is `serde_json::from_slice` first. Only if that fails is it `yaml_serde` into `serde_json::Value` (R3-11). The pinned bundle is JSON, so it never reaches the YAML parser.
- A served document over 4 MiB is not parsed: it is contract-mismatch (A-09).
- A parse failure is an error, never a digest.
- **Pinned digest.** It is `digest_of(include_str!(bundle))`. There is no stored constant.
- **Served digest.** It is `digest_of(body of GET /api/v1/openapi.yaml)`, for a 200 answer only.

**Equality cases** (tested):
- the same document in JSON and in YAML block style;
- key order permuted;
- `1.0` and `1`;
- `-0` and `0`;
- `2^53 + 1` and `2^53`;
- the real bundle and its YAML re-serialisation (R5-12).

**Not a trust boundary** (R2-01). Equal digests mean "the same contract". They do not mean "the binary we launched". Any local process can serve the same document.

**Inequality cases** (tested):
- one changed scalar;
- one removed key;
- one added path.

## Known limit

If the real service serves its root file with unresolved relative `$ref`s, or another bundling, the result is contract-mismatch until #22 adapts the check (spec Assumptions).
