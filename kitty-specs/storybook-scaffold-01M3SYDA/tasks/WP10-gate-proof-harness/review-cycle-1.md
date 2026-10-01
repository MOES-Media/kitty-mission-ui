---
affected_files: []
cycle_number: 1
mission_slug: storybook-scaffold-01M3SYDA
reproduction_command:
reviewed_at: '2026-09-30T23:09:31Z'
reviewer_agent: user
wp_id: WP10
---

# WP10 review feedback, cycle 1: changes requested

Reviewed lane-j at 4473da2. The local proof passed: all 10 gates ran against a dangling rev (lane HEAD plus
kitty-specs/ from feat/storybook-scaffold) and verdict was pass (preflight planted 9, stylelint/typecheck 2, others 1),
every token absent from the clean run, and every worktree clean after restore. The schema validates (Ajv and Ajv2020),
record hygiene passes, and the planted home path is caught. The preflight leg ran from a worktree with no node_modules.
Coverage checks passed. SIGINT cleanup worked: exit 130, the worktree count went back to its baseline, and nothing was
orphaned. The integration commits 230207b, cc1b8f1 and 39b51ab are all fine.

## Issue 1 (MEDIUM, NFR-004, security): the sanitiser turns a detectable token leak into one the scanner passes

`AUTH_VALUE` in `scripts/gate-proof/lib.mjs` only consumes unquoted values (`[^\s"',}]*`). When the value is quoted
(JSON `"_authToken": "<secret>"`, or an npmrc/YAML line `_authToken = "<secret>"`), it matches zero characters and
inserts `<redacted>` in FRONT of the value. The result looks like `"_authToken": <redacted>"<secret>"`.

Reproduced by assembling the string at run time and running `scripts/check-hygiene.mjs --record`:
- raw quoted form: 2 `auth-token-assignment` findings, so the assembler fails closed as intended
- after `sanitise()`: 0 findings for the record. The value now starts with an angle-bracket placeholder, so the fail-closed
  re-scan passes and the secret body would land in the fragment or record.

CI proof-leg fragments are also uploaded as artifacts before any hygiene scan, so a leaked fragment is not caught there
either.

Remedy:
- Make the value group consume a quoted value too, e.g. `("[^"]*"|'[^']*'|[^\s"',}]*)`, replaced by `<redacted>`.
- Add `gate-proof.test.mjs` cases for the JSON form and the quoted `=` form. Assert that the secret is absent and that
  `<redacted>` is not followed by the value.

## Issue 2 (LOW, DoD): `node --test scripts/gate-proof/` fails on Node 22.22.2

The first DoD command prints `# pass 0 / # fail 1` (`Cannot find module .../scripts/gate-proof`), because Node 22 loads
a directory argument as a module. Running the file directly gives 16/16 passing.

Remedy: add a `scripts/gate-proof/index.js` shim like the one WP07 added in `scripts/hygiene/index.js`
(`import('./gate-proof.test.mjs')`). It is inside owned_files.

## Non-blocking (fold in while there)

- LOW: `local --ref <rev>` records `commit` as the checkout's HEAD, not the rev that was proven. The record said 4473da2
  after proving bd4824f. Resolve the ref with `git rev-parse` and pass it as `commit` to `assemble`.
- INFO: `plantedExit` uses `p.r.status || 255`, so a planted exit of 0 would be recorded as 255. The problems list
  already blocks that case; `Math.min` over the raw statuses would be clearer.
- INFO: a local run with no `--out` writes `proof-record.json` and `PROOF.md` into the repository root, where they
  show up as untracked files. Consider defaulting to `proof-output/`, which is gitignored.
