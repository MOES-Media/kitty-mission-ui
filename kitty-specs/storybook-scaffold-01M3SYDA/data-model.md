# Data Model: Storybook scaffold

No persistent data. The model is the set of typed values the sample element and the gate tooling exchange.

## ViewState (value type)

`type ViewState = 'loading' | 'error' | 'empty' | 'ready'`. Closed set. Defined once in
`packages/mission-ui/src/view-state.ts`; every screen-contract element takes it as property `status`.

| State | Meaning | Data required |
|---|---|---|
| `loading` | host is fetching | none |
| `empty` | fetched, nothing to show | none |
| `error` | fetch failed | `errorMessage` optional |
| `ready` | data present | `mission` non-null |

Transitions are owned by the host container, not the element; the element renders any state from any prior state.
Invariant: in `ready` with `mission === null` the element renders the `empty` view (defensive, asserted in tests).

## MissionSummary (synthetic fixture shape)

| Field | Type | Rule |
|---|---|---|
| `slug` | string | kebab-case synthetic, e.g. `example-mission-01ABCDEF` |
| `name` | string | human label |
| `workPackagesDone` | integer >= 0 | <= `workPackagesTotal` |
| `workPackagesTotal` | integer >= 0 | |

Fixtures live in `fixtures.ts`; contain no real user data, paths or usernames (hygiene-checked). This shape is a
placeholder and is replaced by types generated from the spec-kitty read contract in a later mission (out of scope).

## Events (payload contracts)

| Event | `detail` | Options | Emitted when |
|---|---|---|---|
| `sk-mission-open` | `{ slug: string }` | bubbles, composed | the ready-state open button is activated |
| `sk-mission-retry` | `{}` | bubbles, composed | the error-state retry button is activated |

## Gate

| Field | Notes |
|---|---|
| `id` | `preflight`, `typecheck`, `eslint`, `stylelint`, `storybook-build`, `unit-tests`, `visual`, `manifest`, `no-io`, `hygiene`, `proof` (11 gate ids; `proof` is a 10-leg matrix plus a final job); the aggregate `all` is a job but not a gate |
| `command` | one root script per gate, invoked identically locally and in CI |
| `ciCheckName` | `Gate: <id>`; `Gate: all` aggregates |
| `spec` | requirement ids |
| `scope` | always full package(s); never changed-files |

Counts are derived from `ci.yml`, never hard-coded: plants and record entries exist for the gates other than
`proof` and `all` (10 today).

## Plant (planted violation)

`gates/plants/<gate>/plant.json`: `{ gate, command, expectFailPattern, overlays: [{ target, source | generated }] }`.
`expectFailPattern` contains a token unique to that plant (absent from the clean gate's output). `target` is
repo-relative; `source` files use non-source extensions (`*.ts.plant`, `*.css.plant`, `*.json.plant`) so no gate scans
them; `generated` names a run-time generator (token-shaped strings, a non-placeholder user-path name, an untracked new
file). The `preflight` gate has two plants (missing token, bogus token): `plant.json` holds an array for that gate.

## GateProofRecord

Schema: `contracts/gate-proof-record.schema.json` (version 2). Each matrix leg emits a fragment: clean exit (0), planted
exit, pattern matched, plant token absent from the clean output, duration, sanitised excerpt (locally also
`localWorktreeCleanAfterRestore`). The final `Gate: proof` job checks coverage and assembles the record: commit sha,
`snapshotOf` (`head` for the CI artifact, `parent` when committed), image reference, generated-at. Invariant:
`cleanExit == 0`, `plantedExit != 0`, `patternMatched` and `tokenAbsentFromCleanOutput` true for every gate; gate ids
pairwise distinct and equal to the `Gate:` jobs in `ci.yml` minus `{proof, all}`, the matrix list, the
`gates/plants/*` directories and the fragments; otherwise `verdict = "fail"`.

## VisualBaseline

One PNG per story id under `apps/storybook/tests/visual/__snapshots__/`, named by story id, produced only in the pinned
container (digest-pinned image). Invariants: baselines map 1:1 to stories (no orphan, none missing; test count equals
the Sample story count and is >= 4); each PNG has only `IHDR`, `IDAT`, `IEND` (plus `PLTE`/`tRNS`) chunks; 5 consecutive
runs on an unchanged commit produce 0 diffs (NFR-003).

## ElementManifest

`packages/mission-ui/custom-elements.json`, generated, committed. Invariant: regenerating produces a byte-identical
file; every event name matches `^sk-`; every screen-contract element declares `status`; every `dispatchEvent` in
element source is `dispatchEvent(new CustomEvent('<string literal>', ...))` so the manifest sees every event.
