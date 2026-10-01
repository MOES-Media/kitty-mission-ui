---
work_package_id: WP01
title: Workspace skeleton and toolchain pins
dependencies: []
requirement_refs:
- C-001
- C-002
- FR-001
- FR-002
- NFR-001
- NFR-005
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-storybook-scaffold-01M3SYDA
base_commit: c7123a3cfb56d46c8fc1f20254422fd6d21d1583
created_at: '2026-09-30T21:25:54.905117+00:00'
subtasks:
- T001
- T002
- T003
- T004
- T005
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: package.json
create_intent:
- .nvmrc
- .npmrc
- .gitignore
- package.json
- pnpm-workspace.yaml
- pnpm-lock.yaml
- .pnpmfile.cjs
- scripts/preflight-core.cjs
- tsconfig.base.json
- packages/mission-ui/package.json
- packages/mission-ui/tsconfig.json
- apps/storybook/package.json
- apps/storybook/tsconfig.json
execution_mode: code_change
owned_files:
- .nvmrc
- .npmrc
- .gitignore
- package.json
- pnpm-workspace.yaml
- pnpm-lock.yaml
- .pnpmfile.cjs
- scripts/preflight-core.cjs
- tsconfig.base.json
- packages/mission-ui/package.json
- packages/mission-ui/tsconfig.json
- apps/storybook/package.json
- apps/storybook/tsconfig.json
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP01 - Workspace skeleton and toolchain pins

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Create the pnpm workspace with every tool pinned exactly, the scope-only `.npmrc`, the committed lockfile, the `.pnpmfile.cjs` credential hook backed by `scripts/preflight-core.cjs`, and run a first hygiene-style scan over `kitty-specs/` and `.kittify/`.

## Context

This is the foundation; every other WP depends on it. Read `plan.md` (Technical Context, Source Code tree, IC-01, hard WP requirements 1-6), `research.md` R0, R1, R4 (pin table), R7 and `spec.md` FR-001, FR-002, NFR-005, C-001, C-002.

Shared-file rule: this WP is the ONLY owner of root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, both package `package.json`/`tsconfig.json` files. Later WPs only ADD files in their own scopes, so this WP must declare up front: (a) every devDependency any later WP needs (full R4 table, including `@playwright/test`, `@vitest/browser-playwright`, `@custom-elements-manifest/analyzer`, `postcss-lit`, `stylelint-declaration-strict-value`, `eslint-plugin-lit`, a JSON-schema validator such as `ajv` exact-pinned, `yaml` exact-pinned for workflow parsing if needed); (b) every root script name listed in T003, pointing at files later WPs will create.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP01 --agent claude` resolves. Do not create branches or switch branches by hand.
- Do NOT push.

## Guidance for this WP

Do not spawn sub-agents or forks; do this WP yourself.

Standing rules:

- Do not spawn sub-agents or forks; do this WP yourself.
- If any command is denied, STOP and report; never retry another way.
- No absolute home paths, usernames or tokens in any committed file or in any file you write (use `<repo>`/`<home>` placeholders).
- Every `package.json` dependency spec is exact (no `^`, `~`, ranges); the pins are in `research.md` R4.
- Gates evaluate full packages, never changed-files; a new file must be seen (list files with `git ls-files --cached --others --exclude-standard`).
- Stay inside `owned_files`; a small out-of-map edit is allowed only with a one-line rationale in your hand-off note.
- Plants live under `gates/plants/<gate>/` as non-source extensions (`*.ts.plant`, `*.css.plant`, `*.json.plant`) and are shipped in the same WP as their gate.

## Subtasks

### T001 Root files and exact pins
Create `.nvmrc` (`22.22.2`), root `package.json` (`private: true`, `packageManager: "pnpm@11.18.0"`, `engines`, all devDependencies exact), `.gitignore` (node_modules, storybook-static, test-results, playwright-report, `.env*`, proof output dir), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, target ES2023, `experimentalDecorators` per Lit decorator needs, `useDefineForClassFields: false` if required). Use NO corepack. Exact pins: research R4 table.

### T002 pnpm-workspace.yaml and the two package manifests
`pnpm-workspace.yaml`: `packages: [packages/*, apps/*]` and `allowBuilds` (NOT `onlyBuiltDependencies`) listing exactly `esbuild: true` and `rs-module-lexer: true`; re-verify against the real lockfile after install (hard requirement 3) and record the result in your hand-off note. `packages/mission-ui/package.json` (`@spec-kitty/mission-ui`, private, dependencies `lit`, `@spec-kitty/tokens|styles|elements` at `1.1.0-rc.10`, scripts `typecheck`, `test`, `manifest:generate`), `apps/storybook/package.json` (`@spec-kitty/storybook-app`, private, depends on `@spec-kitty/mission-ui` via `workspace:*`, scripts `typecheck`, `storybook`, `build`, `visual:run`). Each package `tsconfig.json` extends the base; `include` covers `src`, `test`, (storybook app: `.storybook`, `tests`). Root tsconfig handling for `gates/**/*.ts` belongs to a package tsconfig include (`packages/mission-ui/tsconfig.json` includes `../../gates/**/*.ts`) so the no-IO selftest is typechecked.

### T003 Root scripts (complete set, declared once)
Declare: `preflight` (`node scripts/preflight.mjs`), `typecheck` (`pnpm -r typecheck`), `lint` (`eslint . --max-warnings 0`), `lint:styles` (`stylelint "packages/*/src/**/*.{css,ts}"`), `lint:no-io` (`eslint -c eslint.no-io.config.mjs packages/*/src`), `test:no-io` (vitest run of `gates/no-io.selftest.ts` via `gates/vitest.config.ts`), `manifest:generate`, `manifest:check` (`node scripts/check-manifest.mjs`), `hygiene` (`node scripts/check-hygiene.mjs`), `test` (`pnpm --filter @spec-kitty/mission-ui test`), `storybook`, `storybook:build-only` (exactly `pnpm --filter @spec-kitty/storybook-app build`, i.e. `storybook build` WITHOUT the hygiene scan), `build-storybook` (exactly `pnpm storybook:build-only && node scripts/check-hygiene.mjs --storybook-static`), `visual:run`, `visual` (`pnpm build-storybook && bash scripts/visual.sh`), `visual:update`, `gate-proof` (`node scripts/gate-proof.mjs`), `test:preflight` (`node --test scripts/preflight.test.mjs`). Scripts may point at not-yet-existing files; that is expected at this stage.

### T004 .npmrc, .pnpmfile.cjs, preflight-core.cjs, lockfile
`.npmrc` is exactly one line: `@spec-kitty:registry=https://npm.pkg.github.com` (byte-exact, newline terminated, no token). `scripts/preflight-core.cjs` exports the offline check: a `//npm.pkg.github.com/:_authToken=<non-empty>` line in `$NPM_CONFIG_USERCONFIG` or `~/.npmrc`; on failure print the exact message of research R7 (mention `NODE_AUTH_TOKEN`/`NPM_TOKEN` explicitly when set but file line absent) and `process.exit(9)`. `.pnpmfile.cjs` requires it and runs the check before resolution. Offline-skip rule (verifier N2): inspect pnpm's argv (`process.argv`) and skip the check ONLY when BOTH `--offline` AND `--frozen-lockfile` are present; `--prefer-offline` alone, `--offline` alone, `--frozen-lockfile` alone do NOT skip. Export the decision as a pure function `shouldSkip(argv)` so WP02 can unit-test it. Run `pnpm install` with a real credential to create `pnpm-lock.yaml`; assert it has an `integrity:` for each of the three `@spec-kitty/*` packages.

### T005 Hygiene-rules pass over kitty-specs/ and .kittify/ (plan hard requirement 6)
The hygiene gate does not exist yet (WP07). Apply its intended rules now with a one-off scan (grep is fine, do not commit the script): absolute user paths (`/home/<name>`, `/Users/<name>`, `C:\Users\`), token shapes (`ghp_`, `github_pat_`, `_authToken=` with a real value, `npm_` + 30+ chars), and any config carrying a literal username. Scan `kitty-specs/` and `.kittify/` including untracked files. For every hit either fix it in the planning document (an edit under `kitty-specs/` is permitted for this purpose only, note each in the hand-off) or, for the CLI-written `source_path` line in `.kittify/charter/charter.yaml`, leave the file unedited and list it as the single allow-list entry WP07 must encode (file + line pattern). Do not edit the charter files.

## Definition of Done (objective, command-verifiable)

- [ ] `cat .npmrc | wc -l` prints 1 and the line equals `@spec-kitty:registry=https://npm.pkg.github.com` (`cmp` against a printf of the same).
- [ ] `grep -REn '"(\^|~|>|<|\*|latest)' package.json packages/*/package.json apps/*/package.json` prints nothing; `grep -n 'workspace:' ` hits only `workspace:*`.
- [ ] `node -e "console.log(require('./scripts/preflight-core.cjs').shouldSkip(['install','--offline','--frozen-lockfile']))"` prints `true`; the same with `['install','--prefer-offline','--frozen-lockfile']`, `['install','--offline']` and `['install']` each print `false`.
- [ ] `HOME=$(mktemp -d) pnpm install --frozen-lockfile` exits 9 with the R7 message and makes no registry request (no `ERR_PNPM_FETCH`).
- [ ] With a valid credential `pnpm install --frozen-lockfile` exits 0 and `git status --short` is empty afterwards (NFR-005, lockfile unchanged).
- [ ] `grep -c 'integrity:' pnpm-lock.yaml` > 0 and for each of `@spec-kitty/tokens`, `styles`, `elements` an `integrity` value exists under `1.1.0-rc.10`.
- [ ] `grep -n allowBuilds pnpm-workspace.yaml` shows exactly `esbuild` and `rs-module-lexer`; no `onlyBuiltDependencies`.
- [ ] The T005 scan over `kitty-specs/` and `.kittify/` (command recorded in the hand-off) returns only the single documented CLI-record-path hit.
- [ ] Hand-off note records the skopeo digest check of plan hard requirement 1 if this WP touches the image (otherwise 'not applicable here; WP08 owns it').

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

pnpm writing a registry token into a committed file; a range slipped into a transitive manifest; `allowBuilds` names that differ from the lockfile's real build-needing packages; `pnpm install` needing a credential the implementer lacks (report, do not work around).

## Reviewer Guidance

Verify the pin table against R4 line by line, run the four `shouldSkip` cases yourself, run the install with an empty HOME, and confirm no token or home path appears in `git diff main --stat` content. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP01 --agent claude`
