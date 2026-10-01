# Contract: CI gates

Workflow `.github/workflows/ci.yml`; triggers `pull_request` into `main` and `push` to `main` only (`pull_request_target`
and `workflow_run` forbidden, hygiene-enforced); runner `ubuntu-24.04`. Each row is one job and one required-check
candidate. Every command runs over full packages. **Counts are derived from this file**: 10 gate jobs with plants, the
proof matrix (10 legs `Gate: proof (<gate>)`), the final `Gate: proof`, and the aggregate `Gate: all`.

| Check name | Job id | Needs | Runs in | Command | Spec | `timeout-minutes` |
|---|---|---|---|---|---|---|
| `Gate: preflight` (**required**) | `preflight` | none | runner | `node scripts/preflight.mjs --ci` | FR-013 | 1 |
| `Gate: typecheck` | `typecheck` | preflight | runner | `pnpm typecheck` | FR-006 | 5 |
| `Gate: eslint` | `eslint` | preflight | runner | `pnpm lint` | FR-007 | 5 |
| `Gate: stylelint` | `stylelint` | preflight | runner | `pnpm lint:styles` | FR-007 | 5 |
| `Gate: no-io` | `no-io` | preflight | runner | `pnpm lint:no-io && pnpm test:no-io` | FR-012 | 5 |
| `Gate: manifest` | `manifest` | preflight | runner | `pnpm manifest:check` | FR-011 | 5 |
| `Gate: hygiene` | `hygiene` | preflight | runner | `pnpm hygiene` | NFR-004 | 5 |
| `Gate: storybook-build` | `storybook-build` | preflight | runner | `pnpm build-storybook` (= `storybook build` then the hygiene token scan of `storybook-static`, as the last step); uploads it (`retention-days: 1`) | FR-008 | 5 |
| `Gate: unit-tests` | `unit-tests` | preflight | Playwright container (+ `setup-node` 22.22.2) | `pnpm test` | FR-009 | 6 |
| `Gate: visual` | `visual` | preflight, storybook-build | Playwright container (+ `setup-node` 22.22.2; filtered install of the Storybook app, see research R5) | `pnpm visual:run --repeat-each=5` on the downloaded `storybook-static` | FR-010, NFR-003 | 6 |
| `Gate: proof (<gate>)` x10 | `proof-leg` (matrix `gate:` = every plant dir) | preflight | runner; container for `unit-tests` and `visual` legs | checkout, auth, frozen install, delete `~/.npmrc`; clean command (exit 0, unique token absent); apply plant in the leg workspace; planted command (non-zero, token present); upload sanitised fragment | FR-015 | 6 typical; `preflight` 4; `storybook-build` 8; `unit-tests` 8; `visual` 9 |
| `Gate: proof` | `proof` | every proof leg | runner, frozen install with the credential lifecycle (assemble needs the pinned schema validator and hygiene scanner) | auth, frozen install, delete `~/.npmrc`; coverage check, assemble and schema-validate record, upload | FR-015 | 3 |
| `Gate: all` (**required**) | `all` | every job above incl. `proof` | runner | fails unless every `needs.*.result == 'success'`; `if: always()` | FR-014 | 1 |

`Gate: all` is the single check that cannot be satisfied by a skipped or cancelled gate; the operator marks
`Gate: preflight` and `Gate: all` required first (the other names are listed so they can be marked too). Pre-recorded
fallback (research R9): if the first green run's critical path exceeds 12 minutes, the `visual` and `storybook-build` proof
legs move to `schedule` + `workflow_dispatch`; coverage stays on every PR.

Failure semantics:
- `preflight` failure prints the credential name and where to set it (research R7); no other job starts.
- A job fails on any non-zero exit; no `continue-on-error`.
- Installs use `pnpm install --frozen-lockfile`. The preflight-core credential check is skipped only when pnpm runs
  with both `--offline` and `--frozen-lockfile`.
- **Token handling, in each job that installs** (container jobs use the container's `$HOME`): step-level `env` only;
  `::add-mask::`; `printf '//npm.pkg.github.com/:_authToken=%s\n' "$NPM_TOKEN" > "$HOME/.npmrc"` with `umask 077` and
  `chmod 600`; used only by the install step; `rm -f "$HOME/.npmrc"` immediately after install and again in an
  `if: always()` step; test and gate steps run without it. Never in the repository `.npmrc`, never in an artifact or cache.
- Dependabot and fork pull requests receive no secrets and fail `Gate: preflight` with the `NPM_TOKEN` message. Accepted.
- Container image: `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`
  (digest resolved 2026-09-30). The image's Node is v24.18.1; jobs that run repo tooling or install (`unit-tests`, `visual`,
  installing proof legs) run `actions/setup-node` 22.22.2 inside the container and assert `node -v` = `v22.22.2`; local
  `visual.sh` inside the image (no install) asserts `v24.18.1` or `v22.22.2`.
- Actions pinned to full commit SHAs; `permissions: contents: read` at workflow **and** job level; every
  `actions/checkout` has `persist-credentials: false`; cache holds the pnpm store only (restored before the credential
  step); artifacts `retention-days: 1`; no `VITE_*`/`STORYBOOK_*` secret.
- **Budget (NFR-002, critical path including `Gate: all`)**: worst case at ceilings `preflight 1 + visual proof leg 9 +
  proof 3 + all 1 = 14`, and `preflight 1 + storybook-build 5 + visual 6 + all 1 = 13`; typical about 12. Full table and
  arithmetic: research R9. Actuals from the first CI run are recorded in the PR description.
