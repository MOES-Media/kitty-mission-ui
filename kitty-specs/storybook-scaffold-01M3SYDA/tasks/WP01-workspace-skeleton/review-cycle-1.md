---
affected_files: []
cycle_number: 1
mission_slug: storybook-scaffold-01M3SYDA
reproduction_command:
reviewed_at: '2026-09-30T21:49:44Z'
reviewer_agent: user
wp_id: WP01
---

# WP01 review feedback (cycle 1) — changes requested

Reviewed implementer commit 28f5a9a in the lane-a worktree. Every DoD command was re-run by the reviewer.

## Issue 1 (BLOCKING): `.pnpmfile.cjs` blocks every pnpm command, not just installs

`.pnpmfile.cjs` calls `check()` at module top level. pnpm 11.18.0 loads the pnpmfile for every command,
so without a credential on disk ALL pnpm commands exit 9. Reproduced in the lane worktree (deps already
installed), `HOME=<empty tmp dir>`, `NODE_AUTH_TOKEN`/`NPM_TOKEN`/`NPM_CONFIG_USERCONFIG` unset:

- `pnpm exec node -e 0` -> PREFLIGHT message, exit 9
- `pnpm ls --depth 0` -> exit 9
- `pnpm run typecheck` / `pnpm --filter @spec-kitty/mission-ui run typecheck` -> exit 9

This contradicts research.md R9 "Token handling per installing job", steps 3-4: `~/.npmrc` is removed
right after `pnpm install --frozen-lockfile` and "every test/gate step then runs **without** the credential
on disk or in env". With this hook every CI gate step (`pnpm typecheck`, `pnpm lint`, `pnpm test`,
`pnpm storybook:build-only`, ...) would fail with the preflight message. R7 scopes the hook to
"loaded before resolution ... stops the install", i.e. dependency-fetching commands only.

**Remedy**: make the check fire only for commands that resolve/fetch dependencies. Either
(a) run it from a pnpm hook that only executes during install (e.g. `hooks.preResolution`) — verify it
still fires before any registry request under `--frozen-lockfile`; or (b) keep the top-level call but gate
it on pnpm's argv command (install/i/add/update/up/fetch/dedupe/...), exporting that decision as a pure
function next to `shouldSkip` so WP02 can unit-test it. Whichever you choose, prove in the hand-off:
1. `HOME=$(mktemp -d) pnpm install --frozen-lockfile` still exits 9 with the R7 message, no `ERR_PNPM_FETCH`;
2. in an installed tree with no credential, `pnpm run typecheck` and `pnpm exec node -e 0` are NOT blocked
   by the preflight (they may fail for other reasons at this stage, but not with `PREFLIGHT:`/exit 9);
3. the four `shouldSkip` DoD cases unchanged.

## Everything else passed (no change needed)

- `.npmrc`: 1 line, `cmp` byte-equal to the printf. PASS
- Range grep over the three manifests: no output; `workspace:` only `workspace:*`. PASS
- `shouldSkip`: true / false / false / false as required (also `--frozen-lockfile` alone -> false). PASS
- Empty-HOME install: exit 9, R7 message, 0 `ERR_PNPM_FETCH`; with `NODE_AUTH_TOKEN` set the extra
  env sentence appears. PASS
- Credentialed `pnpm install --frozen-lockfile`: exit 0, tree clean. PASS
- Lockfile: integrity for tokens/styles/elements @1.1.0-rc.10. PASS
- `allowBuilds` exactly esbuild + rs-module-lexer, no `onlyBuiltDependencies`; `pnpm ignored-builds` = None. PASS
- One lit copy (3.3.3). PASS
- Pins match research R4 line by line. PASS
- T005: only the CLI-record-path `source_path` line in `.kittify/charter/charter.yaml`. PASS
- No home paths, usernames or tokens in the 13 committed files. PASS

Accepted deviations: `engines.node` exact `22.22.2` (R1 names a range, but the WP DoD grep rejects `>`/`<`
and R0 d1 hygiene asserts `.nvmrc`/`engines.node`/`packageManager` agree — exact is consistent);
extra exact devDependencies `@types/node`, `@storybook/addon-docs`, `ajv`, `yaml` (ajv/yaml named in the
WP; addon-docs is needed for autodocs in WP11; @types/node for script typechecking).

## Dependents

WP02 and WP03 depend on WP01; they should start from the fixed lane once this is re-approved.
