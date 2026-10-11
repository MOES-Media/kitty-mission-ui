# Contract: gates, fixtures, exceptions and plants for this mission

#4's `contracts/gates.md` and #5's are the reference for every gate command, plant mechanism and timeout rule. This file records only what this mission changes.

## How each gate applies

| Gate | Applies unchanged | This mission's change |
|---|---|---|
| `preflight`, `typecheck`, `eslint`, `stylelint`, `no-io`, `hygiene`, `storybook-build`, `unit-tests` | yes | new files covered by the globs; the `no-io` gate scans every new file including the dialog |
| `manifest` | yes | regenerated once in IC-04b and once in IC-08 |
| `data-driven` | extended by IC-02 | reads `ProjectHealth.yaml` into the config's word lists and adds `healthy` to the config's literal bare-word list (comparison/case only); `schema_drift` underscored; self-test cases, no plants. NFR-009 |
| `contract` | yes | IC-01 re-vendors from `main` (`provenance: main`); fixture-count floors updated; no new check |
| `visual` | yes | about 32 new stories, baselines committed only in IC-08; existing baselines identical; timeouts re-derived in IC-08 |
| `gate-proof` | yes | no new plant planned |

## Fixtures

Generated from `Project.example`, `Project.schema-drift` and `Project.all-null`; host overlays (relaxations on the contract's closed shapes, each with a reverted-must-fail proof as #5's relaxations): `project-unknown-health` (health outside the enum), `project-long` (255-char branch matching the pattern, 64-char version matching the pattern, long name). Host-only fixtures (not contract payloads, defined in the element `fixtures.ts`): entry builders for `loading`, `error`, `unavailable`, `fifty`; folder listings. No path, username or e-mail: locations `~/work/<synthetic>`; `hygiene` checks them.

## Proposed exceptions (E-31..E-34; each conditional on the spike named; need the operator's approval at CP-1)

| Id | Item | Files (only) | Allowed | Sunset | Decided by |
|---|---|---|---|---|---|
| E-31 | Row chrome: border, radius, card background, hover, `min-height: 82px`, the raw `button` as the row control (`type="button"`) | `row-parts.ts` | listed properties with tokens; `button` allowance | spec-kitty-design#525 (action-row hover) for E-31(a); #526 (pill density, outlined mono) for E-31(c) and E-31(d) | S1, S5 |
| E-32 | Dialog chrome: `width: min(680px, ...)`, `max-height`, border, radius, backdrop paint | `sk-open-project-dialog.ts` styles | listed properties, token colours | spec-kitty-design#503 (a modal dialog with slots) | S2, S5 |
| E-33 | Folder option paint on `aria-selected` and the raw `role="option"` button | `folder-list-parts.ts` | `background`, `color`, forced-colours border | spec-kitty-design#527 (a listbox and option) for E-33 and E-33(c) | S7 |
| E-34 | `classOnly([...])` for styles-only library families used (as #5's E-17) | per file | class prefixes per file, each with a leak plant | spec-kitty-design#529 (page-header compact scale) for E-34 and E-34(b) to (d), and DP-22 | S1 |

A spike that proves a library element carries the look deletes its exception; the number stays unused.

## Self-check list for reviewers (copy into every WP brief)

- `healthy` and `schema_drift` appear only in `defaults/` and `src/contract/`; no `=== 'healthy'`.
- No `Date`, `setTimeout`, `fetch`, `localStorage`, `location`, `history` use; no `Math.` on contract values.
- Every `dispatchEvent` has a literal `sk-*` name, sits in the element file and is declared by `@fires`.
- The screen never parses a `location`, a branch or a name; it never derives health from `schemaVersion`.
- Every `class=` has an approved prefix in that file's E-34 row, or the file has none.
- No absolute home path or username in any committed file (fixtures, stories, tests).
- Every changed behaviour has a test that fails when the change is reverted (the charter requires a test per event and a story per state; this list makes the reverse check explicit for the WP reviewer).
