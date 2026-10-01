# Research: Storybook scaffold

Phase 0 decisions for mission `storybook-scaffold-01M3SYDA`. Each entry states Decision, Rationale, Alternatives.
Facts marked **(verified)** were checked against the real `1.1.0-rc.10` packages installed into a throwaway
directory on 2026-09-30 (deleted afterwards), or against the design system repository's `origin/main`.

Operator decisions taken as given (not reopened): TypeScript strict, Lit 3, Storybook, Vite, pnpm workspaces;
exact-pinned private `@spec-kitty/*` packages; committed `.npmrc` with the scope mapping only; CI secret `NPM_TOKEN`;
GitHub-hosted `ubuntu-24.04`; elements over CSS; the screen contract.

## R0. Fold-in verification log (2026-09-30, pnpm 11.18.0, Node 22.22.2, Linux)

Run in throwaway directories under a throwaway temp directory (deleted afterwards), registry credential only at runtime from
`gh auth token`, never written into a committed file. Scratch workspaces used the same committed `.npmrc` shape.

| # | Question | Command (abridged) | Outcome |
|---|---|---|---|
| a1 | Key that allows dependency build scripts | `pnpm install` with `onlyBuiltDependencies: [esbuild]` in `pnpm-workspace.yaml`, then with `allowBuilds: { esbuild: true }` | `onlyBuiltDependencies` is ignored in 11.18.0 (`ERR_PNPM_IGNORED_BUILDS: esbuild@0.25.12`, exit non-zero). `allowBuilds` works (postinstall ran, `esbuild --version` = 0.25.12). **Use `allowBuilds`.** |
| a2 | Which deps need it | install of the full planned toolset (exact versions in R4) with no allow-list | `ERR_PNPM_IGNORED_BUILDS: esbuild@0.28.2, rs-module-lexer@2.9.0` (`rs-module-lexer` arrives via `@custom-elements-manifest/analyzer` -> `find-dependencies`). Playwright has no install script (browsers come from the image). After `allowBuilds: { esbuild: true, rs-module-lexer: true }` the install exits 0. **Allow-list = exactly those two packages**, explicit, no wildcard. Implementer re-runs this check after lockfile creation; any new entry is a reviewed change. |
| b1 | Root `.pnpmfile.cjs` aborts before auth failure | `.pnpmfile.cjs` that `process.exit(9)` with a `PREFLIGHT:` message when no credential; `env -u NODE_AUTH_TOKEN -u NPM_TOKEN HOME=<empty dir> pnpm install` | Named message printed, exit 9, before any registry request. Without the pnpmfile the same run ends with pnpm's opaque "No authorization header was set for the request". **Confirmed.** |
| b2 | Unusable token | (i) a non-token placeholder string in `NODE_AUTH_TOKEN`, empty HOME; (ii) a `//npm.pkg.github.com/` auth line carrying a non-token placeholder in the empty HOME's user npmrc | (ii) passes the offline check and pnpm fails with `ERR_PNPM_FETCH_401 GET https://npm.pkg.github.com/@spec-kitty%2Felements: Unauthorized - 401`, the value shown as `[hidden]`. A valid token written the same way installs (exit 0, `Done in 9.2s` from a cold store). |
| b3 | **New finding**: `NODE_AUTH_TOKEN` alone is NOT read by pnpm | valid `gh auth token` in `NODE_AUTH_TOKEN`, empty HOME, committed scope-only `.npmrc` | install fails `ERR_PNPM_FETCH_401 ... No authorization header was set`. Only a `//npm.pkg.github.com/:_authToken=<token>` line in a user-level npmrc authenticates. The earlier plan text ("set `NODE_AUTH_TOKEN`") was wrong for pnpm used directly (it works in CI only because `actions/setup-node` writes an npmrc). Consequences: the offline preflight checks for the `~/.npmrc` line (or `NPM_CONFIG_USERCONFIG` file); `NODE_AUTH_TOKEN`/`NPM_TOKEN` in the environment alone produce the named message "pnpm does not read NODE_AUTH_TOKEN; write the line to ~/.npmrc". CI writes `~/.npmrc` itself (R7, R9). Quickstart updated. |
| c1 | Exports map | read the three installed `package.json` files | `tokens`: `.` = `./dist/tokens.css`, `./catalogue`; no peers. `styles`: per-primitive `./<name>/*` paths plus `.` = `dist/src/index.js`. `elements`: `.` = `dist/index.js`, `./elements.js`, `./theme-bootstrap.js`, `./theme-preference.js`, `./custom-elements.json`, `./dist/*`; peers `lit ^3.3.3`, `styles ^1.1.0-rc.0`, `tokens ^1.1.0-rc.0`. No `sideEffects` field: bundlers must be told not to drop the registering import (the storybook preview imports it for effect; Vite does not tree-shake a bare import in dev, and the build keeps bare imports unless `sideEffects:false`). |
| c2 | Import registers `sk-*` | read `dist/index.js` | Guarded `define()` helper patches `customElements.define` and registers every tag; logs "already registered by a different constructor ... two copies" on duplicates. |
| c3 | One lit copy | workspace with `@x/a` (dep `lit@3.3.3`, peer+dev the three design packages) and `@x/b` (dep `lit`, `@x/a`, the three packages); `pnpm ls lit -r --depth 3`, `pnpm why lit`; then the full toolset install with `lit` | `Found 1 version of lit` (`lit@3.3.3`; `elements` resolves it as peer). Implementer asserts the same in hygiene (`pnpm ls lit -r --json` has one version) and keeps `resolve.dedupe: ['lit']`. |
| c4 | Fonts | `grep -o "url([^)]*)" dist/tokens.css` | 41 `url(...)` occurrences, all `url('./fonts/<file>.woff2\|.otf')` relative to the stylesheet; Vite resolves and emits them when the CSS is imported by path. The visual spec asserts `document.fonts.check` and the build test asserts no dangling `/assets/*.woff2`. |
| c5 | Lockfile integrity for the private packages | `grep integrity pnpm-lock.yaml` in the scratch workspace | `elements`, `styles`, `tokens` each carry `resolution: {integrity: sha512-..., tarball: https://npm.pkg.github.com/download/...}`. Hygiene asserts all three have `integrity:`. The tarball URL contains no credential. |
| c6 | Tool versions exist | full-toolset install with the exact versions in R4 | all resolve; `eslint 9.39.5` prints a deprecation notice (accepted: ESLint 9 is the flat-config line the plugins support; upgrade is a later change). No peer error. |
| d1 | corepack | `which corepack` | not installed on this machine (Node 22 from the distribution no longer bundles it). **Decision**: no corepack anywhere. CI uses `pnpm/action-setup` pinned by SHA with `version: 11.18.0`; contributors install pnpm 11.18.0 directly (`npm i -g pnpm@11.18.0`, the standalone installer, or their package manager). `package.json` keeps `packageManager: pnpm@11.18.0` and `engines.pnpm`; hygiene asserts the three agree (`.nvmrc`, `engines.node`, `packageManager`). |
| d2 | Playwright image digest | `skopeo inspect --raw docker://mcr.microsoft.com/playwright:v1.62.1-noble \| sha256sum` | multi-arch index digest `sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e` (the amd64 manifest inside is pinned transitively). **Pin the image as `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`.** Implementer re-runs the command and records any difference before first use. |
| d3 | Node inside the image | `podman run --rm mcr.microsoft.com/playwright:v1.62.1-noble node -v` | `v24.18.1`, not 22.22.2. Consequence (R5, R9): container jobs that run repo tooling install Node 22.22.2 inside the container via `actions/setup-node` and assert `node -v`; `visual:run` is plain Playwright and is allowed on the image's own Node, asserted against a pinned allow-list. |

## R1. Workspace layout, Node and pnpm

- **Decision**: pnpm workspace with two globs: `packages/*` (publishable libraries) and `apps/*` (non-published tooling).
  `packages/mission-ui` is `@spec-kitty/mission-ui`. Storybook lives in `apps/storybook` (private
  `@spec-kitty/storybook-app`), not inside the package. Node `22.22.2` (`.nvmrc`, `engines.node: ">=22.22.2 <23"`),
  pnpm `11.18.0` (`packageManager` field; no corepack, see R0 d1). Lockfile committed; CI uses `--frozen-lockfile`.
- **Rationale**: Storybook, Playwright and gate tooling are dev concerns that must never ship in the library tarball;
  the design repo uses the same `apps/storybook` + `packages/*` split. The versions are the ones already on the
  operator's machine, so local and CI match (NFR-005).
- **Alternatives**: Storybook inside the package (simpler, but pollutes `files`/deps and blocks a second package such
  as `dashboard-web`); Nx (the design repo uses it; overkill for two projects, and pnpm `-r`/`--filter` covers it).
- **pnpm 11 caveats (verified, R0 a1/a2)**: dependency build scripts are blocked by default; the key is
  `allowBuilds` (not `onlyBuiltDependencies`) in `pnpm-workspace.yaml`, with exactly `esbuild` and `rs-module-lexer`.
  `minimumReleaseAge` may delay very fresh npm releases; every dependency is exact-pinned and the lockfile commits
  the resolution, so a fresh-release delay cannot alter an existing build.

## R2. How Storybook loads the design system (verified)

Package facts for `1.1.0-rc.10`:

| Package | Entry | Notes |
|---|---|---|
| `@spec-kitty/tokens` | `exports["."] = ./dist/tokens.css`, `./catalogue` = `dist/token-catalogue.json` | Fonts ship in `dist/fonts/`; every `@font-face` uses `url('./fonts/...')`, resolved relative to the stylesheet. No peer deps. |
| `@spec-kitty/styles` | per-primitive CSS under `./<name>/*` (e.g. `./button/sk-button.css`) | CSS and markup only. The charter forbids copying its classes, so the project imports none of it; it is installed because `elements` has it as a peer dependency. |
| `@spec-kitty/elements` | `.` = `dist/index.js` (ESM, registers every `sk-*` tag on import via a guarded `define()`), `./elements.js` = IIFE bundle, `./custom-elements.json`, `./theme-bootstrap.js` | Peer deps: `lit ^3.3.3`, `styles`, `tokens`. 31 elements including `sk-card`, `sk-notice`, `sk-button`, `sk-pill-tag`, `sk-status-indicator`, `sk-grid`, `sk-metric`. |

- **Decision**: `apps/storybook/.storybook/preview.ts` does three things: (1) `import '@spec-kitty/tokens'` (the
  `dist/tokens.css`; Vite resolves and emits the fonts because the CSS sits beside `fonts/`), (2)
  `import '@spec-kitty/elements'` (side-effect registration), (3) a global decorator plus `preview-head.html` that set
  `<html data-theme="dark">` and the page background from `var(--sk-surface-page)`.
  `@spec-kitty/mission-ui` declares `lit` as a dependency and the three design packages as `peerDependencies` (exact
  versions also in root `devDependencies` for the workspace); `apps/storybook` depends on all of them.
- **Rationale**: the theme pin is load-bearing. `tokens.css` adds a `@media (prefers-color-scheme: light)` fallback
  under `:root:not([data-theme])`, and headless Chromium defaults to light. The design repo measured stories silently
  flipping to a white page and failing contrast checks for exactly this reason. An explicit `data-theme` makes every
  screenshot independent of the machine's colour scheme (NFR-003). Importing `@spec-kitty/styles` CSS globally is
  deliberately skipped: elements-over-CSS.
- **Alternatives**: the IIFE `elements.js` via `preview-head.html` (not tree-shakeable, loses types and HMR); copying
  fonts to a static dir (the design repo hit a font-404 here; relying on Vite's relative-URL emit avoids a copy step,
  to be confirmed by a `document.fonts` assertion in the visual spec).
- **Verify in implementation**: `document.fonts.check("16px Inter")` is true in a rendered story; a built story
  has no 404 for `/assets/*.woff2`.

## R3. Sample element

- **Decision**: `sk-mission-sample` (file `packages/mission-ui/src/elements/sk-mission-sample/`). Name is scoped so it
  cannot collide with a future upstream `sk-*` element. Details in `contracts/sample-element.md`: properties `status`
  (`loading|error|empty|ready`), `mission` (synthetic `MissionSummary | null`), `errorMessage`; events
  `sk-mission-open` (`{ slug }`) and `sk-mission-retry` (`{}`), both `bubbles: true, composed: true`. Composition:
  `sk-card` + `sk-pill-tag` + `sk-button` (ready), `sk-status-indicator` (loading), `sk-notice tone=info` (empty),
  `sk-notice tone=danger` + `sk-button` (error). Only layout CSS (one grid with a `--sk-space-*` gap, and in `ready` at
  least two grid children so a gap change is measurable). Stories: `Ready`, `Empty`, `Loading`, `Error`, plus a
  Storybook autodocs page (`tags: ['autodocs']`) generated from the element's manifest; fixtures in `fixtures.ts` (no
  real data, no paths, no usernames). A package `CHANGELOG.md` exists from the first commit (charter
  documentation_policy).
- **Syntax constraint (R2-2)**: `@custom-elements-manifest/analyzer` 0.11.0 bundles TypeScript ~5.4. The element uses
  plain, conservative syntax: standard Lit decorators (`@customElement`, `@property`) in the form that compiles
  under both TS 5.4 and 5.9.3, no `accessor` keyword, no `satisfies`, no `const` type parameters, no TS 5.5+ only
  features. The manifest plant (R4) edits the real element source, so an analyzer that cannot parse the source fails the
  clean manifest job too.
- **Rationale**: it exercises every rule of the screen contract and gives each gate real input: stories for build and
  visual, two events for the test gate, a public surface for the manifest gate, and imports and CSS for the lint gates.
- **Alternatives**: a bare `<sk-card>` wrapper (no events, so FR-009 would be vacuous); using `title` as a property
  (collides with `HTMLElement.title`, hence `mission.name`).

## R4. Gates: tools, commands, scope

All gates run over whole packages. No gate may use `--changed`, `git diff`-derived file lists or lint-staged. The
hygiene gate asserts that no gate script does, and lists files with `git ls-files --cached --others --exclude-standard`
so an untracked new file is seen (a diff-based gate passes vacuously on files not yet added).

**Gate count, derived from `ci.yml`**: 11 gate ids (`preflight`, `typecheck`, `eslint`, `stylelint`, `no-io`, `manifest`,
`hygiene`, `storybook-build`, `unit-tests`, `visual`, `proof`). The `proof` gate is a matrix: 10 legs named
`Gate: proof (<gate>)` (one per plant) plus the final `Gate: proof` job; with the aggregate `Gate: all` that is 10 + 10 +
1 + 1 = 22 `Gate:` check names in `ci.yml` (the ten real gate jobs other than `proof` count once each, the ten legs once
each). The charter's eight gates map to `typecheck`, `eslint`+`stylelint` (lint split in two), `storybook-build`,
`unit-tests`, `visual`, `manifest`, `no-io`; `preflight`, `hygiene` and `proof` are added. Plants exist for the **10** gates
other than `proof` and `all`. No count is hard-coded in any script: hygiene derives `{gate jobs named 'Gate: <id>'} \
{proof, all}` and the matrix `gate:` list from `ci.yml`, and asserts both equal `gates/plants/*` directory names.
The exclusion list is itself pinned to exactly `{proof, all}`.

| Gate (check name) | Spec | Tool and command | Planted violation (proof) and its unique token |
|---|---|---|---|
| `preflight` | FR-013 | `node scripts/preflight.mjs --ci` (no deps, runs before install) | two plants: (1) no credential, empty HOME: expects `PLANT-PREFLIGHT-MISSING` marker emitted with the named message; (2) a bogus token in a temp npmrc: expects the online check's `token rejected or expired` (401) text |
| `typecheck` | FR-006 | `pnpm -r typecheck` = `tsc --noEmit` per project (`tsconfig` includes `src`, `test` and `gates/**/*.ts` selftests), TypeScript `5.9.3`, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | `const plantTypecheck: number = 'x'` (token `plantTypecheck`) |
| `eslint` | FR-007 | `eslint . --max-warnings 0`, ESLint 9 flat config, `typescript-eslint`, `eslint-plugin-lit`, plus local rules (R6) | unused variable `plantEslintUnused` |
| `stylelint` | FR-007/C-005 | `stylelint "packages/*/src/**/*.{css,ts}"` with `postcss-lit` syntax | two plants: `color: #ff00aa` and a `16px` size, each naming a unique custom class `.plant-stylelint-*` |
| `storybook-build` | FR-008 | `pnpm --filter @spec-kitty/storybook-app build` | a story importing `./plant-storybook-missing.js` |
| `unit-tests` | FR-009 | Vitest `4.1.11` browser mode (`@vitest/browser-playwright`, Chromium) in `packages/mission-ui/test` | rename the `slug` key in the `sk-mission-open` detail; assertion message contains `plant-unit-slug` |
| `visual` | FR-010 | `build-storybook` then `visual:run` (plain Playwright `1.62.1`, R5) inside the pinned container | a `--sk-space-*` token changed to a measurably different one on the Ready story grid (>= 2 children); plant command is `build-storybook && visual:run` |
| `manifest` | FR-011 | analyzer 0.11.0 regenerates to a temp file, compared to committed `custom-elements.json`, plus `scripts/check-manifest.mjs` (every event name starts `sk-`; `status` present; every `dispatchEvent` in element source is `new CustomEvent('<string literal>', ...)`, R6) | dispatch an undeclared `sk-plant-manifest-x` event in the real element source |
| `no-io` | FR-012 | `eslint -c eslint.no-io.config.mjs packages/*/src` plus Vitest self-test `gates/no-io.selftest.ts` | `fetch('/plant-no-io')` in the element |
| `hygiene` | NFR-004 | `node scripts/check-hygiene.mjs` | generated (run-time assembled) non-placeholder token-shaped string in a **new untracked** file |
| `proof` | FR-015 | matrix legs + final `Gate: proof` (R8); locally `pnpm gate-proof` | n/a (coverage check; the legs verify the others) |

- **Unique tokens (R1-2)**: each plant's `expectFailPattern` contains a token unique to that plant (table, last
  column). `--verify` also asserts the token is **absent** from the clean gate job's output, so a pattern that matches
  ordinary output cannot pass.
- **Plant overlays (R1-5)**: overlay files use non-source extensions (`*.ts.plant`, `*.css.plant`, `*.json.plant`) and are
  copied to their real target only inside the leg's disposable workspace (CI) or the throwaway worktree (local). Hygiene asserts no lintable/compilable file exists
  under `gates/plants/`, so no real gate ever scans a plant.
- **Stylelint rule set (C-005, R1-6)**: `stylelint-declaration-strict-value` (1.12.1; peer range covers Stylelint 16.x)
  on colour, background, font, font-size, line-height, padding, margin, gap, border-radius, border and width
  properties, allowing only `var(--sk-*)`, `0`, `auto`, `inherit`, `currentColor`, `transparent`; core `color-no-hex`
  and `function-disallowed-list` (`rgb`, `rgba`, `hsl`, `hsla`, `oklch`, `color-mix`); `property-allowed-list`
  restricting project CSS to layout properties. **Global `unit-allowed-list: ['%', 'fr']`** (unitless values are always
  allowed): no `px`, `rem`, `em`, `vh`, `vw`, `ch` anywhere in project CSS. ESLint forbids inline `style=`, Lit
  `styleMap` and `unsafeCSS` in element packages (R6), so literals cannot enter by another route. `postcss-lit`
  lets one config cover `css\`\`` templates in `.ts` files.
- **Elements over CSS, enforced (R1-18)**: an ESLint `no-restricted-syntax` rule over Lit `html\`\`` templates in
  `packages/*/src` forbids raw `<button`, `<input`, `<select`, `<textarea` and `class=` attributes (use
  `sk-button`, `sk-*`; layout uses the single named grid wrapper through `part`/element selectors, not classes). A fixture and plant exist.
- **Type checking scope (R1-15)**: each workspace package's `tsconfig.json` `include` covers `src`, `test`, and (root
  config) `gates/**/*.ts` and `scripts/**/*.ts` if any. Hygiene asserts every workspace package has a `typecheck`
  script and that `pnpm -r typecheck` visits as many projects as `pnpm -r ls --json` lists.
- **Why not TypeScript 7**: `typescript` 7 (native) is current on npm but `typescript-eslint` and the
  custom-elements analyzer track the JS API of 5.x. Pin `5.9.3`.
- **Exact versions, all tools (R1-16, R2-1, verified to resolve together, R0 c6)**: every `package.json` dependency
  spec in the repository is an exact version; hygiene rejects any `^`, `~`, `>`, `<`, `*`, `x`, `latest` or
  workspace-range outside `workspace:*`.

  | Tool | Version | Tool | Version |
  |---|---|---|---|
  | typescript | 5.9.3 | eslint | 9.39.5 |
  | @eslint/js | 9.39.5 | typescript-eslint | 8.71.0 |
  | eslint-plugin-lit | 2.3.1 | stylelint | 16.26.1 |
  | stylelint-declaration-strict-value | 1.12.1 | postcss-lit | 1.4.1 |
  | lit | 3.3.3 | vite | 7.3.6 |
  | storybook, @storybook/web-components-vite | 10.6.1 | @custom-elements-manifest/analyzer | 0.11.0 |
  | vitest, @vitest/browser, @vitest/browser-playwright | 4.1.11 (hygiene asserts all `vitest`/`@vitest/*` equal) | @playwright/test | 1.62.1 (hygiene asserts equals the image tag) |
  | @spec-kitty/tokens, styles, elements | 1.1.0-rc.10 | pnpm | 11.18.0 |

  Playwright stays at 1.62.1 deliberately although 1.63.0 exists: the version is coupled to the pinned image tag and
  digest (R5); a Playwright bump is one reviewed change that moves the package, the tag, the digest and the baselines
  together. Newer majors of Vitest, Vite, ESLint and Stylelint exist and are deliberately not adopted here (mirrors the
  design repository; upgrade missions are separate).
- **Lockfile**: committed; hygiene asserts `pnpm-lock.yaml` carries an `integrity:` value for each of the three private
  rc packages (R0 c5) and that `pnpm install --frozen-lockfile` leaves the tree unchanged (NFR-005).

## R5. Visual regression and the single rendering environment (NFR-003)

- **Decision**: Playwright screenshot tests (`toHaveScreenshot`) against the built `storybook-static` served by a
  static server, one test per story id, run by **`visual:run`** (a plain `playwright test` invocation in
  `apps/storybook`; it does not build, install or start containers). Screenshots are taken **only** inside
  `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`
  (digest resolved 2026-09-30, R0 d2): in CI through `container:`, locally through `scripts/visual.sh`, which
  **runs `visual:run` itself when it is already inside the pinned image**
  (detected by `SK_VISUAL_IMAGE` equal to the full pinned reference, which only the script's own `docker run -e` and the CI
  job's `container.env` set, plus `PLAYWRIGHT_BROWSERS_PATH` pointing at the image's browsers) and otherwise starts `podman` or `docker run` with the repo mounted. **If neither condition
  holds and no container engine can be started, `visual.sh` FAILS with a named message; it never skips and never falls
  back to host Chromium** (R1-3). `pnpm visual` = `build-storybook && visual.sh`; `pnpm visual:update` same container,
  `--update-snapshots`. Fixed conditions: viewport 800x600, `deviceScaleFactor: 1`, `colorScheme: 'dark'`,
  `reducedMotion: 'reduce'`, animations disabled, `data-theme="dark"`, wait for `document.fonts.ready` and the
  element's `updateComplete`. The CI job runs `--repeat-each=5` so NFR-003 is evidenced by every CI run.
- **Node in the image (R0 d3, R2-3, F6)**: the image ships Node v24.18.1. `visual:run` is plain Playwright.
  - **CI `visual` job** (container): installs with the full token lifecycle of R9, filtered to the Storybook app and its
    dependencies (`pnpm install --frozen-lockfile --filter @spec-kitty/storybook-app...`, which brings `@playwright/test`
    and nothing else); runs `actions/setup-node` 22.22.2 inside the container first and asserts `node -v` = `v22.22.2`;
    then runs `visual:run` on the downloaded `storybook-static`.
  - **Local `visual.sh` inside the image** does not install; it uses the mounted host `node_modules` on the image's own
    Node and asserts `node -v` is `v24.18.1` or `v22.22.2`, printing it.
  - Container jobs that run repo tooling (`unit-tests`, each `proof` leg that installs) do the same setup-node step and assertion.
- **Anti-vacuity (R1-14)**: screenshots are of `#storybook-root` at a fixed viewport, `maxDiffPixelRatio: 0` with a small
  colour `threshold`; the spec asserts each story rendered (sk element upgraded, no `.sb-errordisplay`, non-blank pixel
  variance, no "two copies" console warning). **The spec asserts the Playwright test count equals the number of
  Sample stories discovered from `storybook-static/index.json` (and that count is >= 4), and that baselines map 1:1
  to stories: an orphan baseline PNG or a story without a baseline fails.** The planted token change on a grid with
  >= 2 children must fail it.
- **Baseline hygiene**: hygiene asserts every baseline PNG contains only `IHDR`, `IDAT`, `IEND` chunks (plus `PLTE`/`tRNS`
  if present): no `tEXt`/`iTXt`/`zTXt`/`eXIf` metadata can smuggle a path or token.
- **Alternatives**: Chromatic/Percy (paid, external); Storybook test-runner (0.26 not proven with Storybook 10, and adds a
  second browser driver); host-installed Chromium on the runner (font and version drift).
- **Implementer risk**: `visual.sh` mounts the host `node_modules`; on a non-linux/x64 host the native binaries differ.
  The script detects `uname -sm` != `Linux x86_64` and fails with a named message telling the contributor to run
  the visual commands on CI or a Linux host; it does not silently install inside the container.

## R6. No-I/O gate and credential hygiene

- **No-I/O decision**: a dedicated ESLint config over `packages/*/src/**` (stories included) using
  `no-restricted-globals` (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`,
  `indexedDB`, `caches`, `BroadcastChannel`, `__TAURI__`, `__TAURI_INTERNALS__`, **and bare `window`, `globalThis`,
  `self`**: the only permitted member access of the global object is `customElements`, done through a dedicated
  allowed form), `no-restricted-properties` for the same names and `navigator.sendBeacon`, `document.cookie`;
  `no-restricted-imports` for `@tauri-apps/*`, `node:http*`, `node:net`; `no-restricted-syntax` for `new Worker`,
  `new SharedWorker`, `new Image`, `new Function`, `eval`, `Reflect.get`, `document.createElement('script')`,
  `import()` of a non-relative URL and any computed-member access on a global (`window['fetch']`).
  A Vitest self-test lints each banned pattern from `gates/fixtures/no-io/*.ts.txt` with the ESLint API and asserts a
  violation per fixture plus a clean control. **Fixtures exist for each of: bare `window.fetch`, `globalThis.fetch`,
  `self.fetch`, `Reflect.get(globalThis,'fetch')`, `new Function('return fetch')()`, `eval`, `new Image().src=`,
  `document.createElement('script')`, `window['fe'+'tch']`.** Kept separate from the general `eslint` job so it has
  its own named check (FR-014).
- **Event visibility (R1-13)**: a local ESLint rule in the general config requires every `dispatchEvent` call in
  element source to be `dispatchEvent(new CustomEvent('<string literal>', ...))`, so the manifest gate sees every
  event; a dynamic event name fails lint.
- **Inline style/CSS injection (R1-6)**: the general ESLint config forbids `style=` attributes in templates,
  `styleMap`, `unsafeCSS` and `.style.` assignment in element packages; fixtures and plants cover them.
- **Hygiene decision**: `scripts/check-hygiene.mjs`, zero dependencies, scans `git ls-files -co --exclude-standard`
  (so **the planning documents under `kitty-specs/` are scanned like any other file**; plus `storybook-static/` if present
  and any `*.map`) for:
  - token shapes with their body, so naming a prefix in prose is not a hit: `ghp_`, `gho_`, `ghs_`, `ghu_`, `ghr_` each
    followed by 36 alphanumerics; `github_pat_` followed by 22 or more word characters; `npm_` followed by 36 alphanumerics;
  - credential assignments: any `_authToken` followed by optional whitespace and `=` or `:` whose value is neither an
    angle-bracket placeholder (for example `<token>`) nor a printf `%s`, and any quoted authToken key (double-quoted name) in YAML, JSON or
    `.yarnrc` files (**the `${VAR}` allowance is removed, R1-8/C-002**: a `${NODE_AUTH_TOKEN}` value is rejected);
    any `_authToken` in a file named `.npmrc` is rejected outright (byte-equality below); `Authorization: Bearer <literal>`.
    Documentation and `ci.yml` may show only the placeholder and `%s` forms;
  - absolute user paths: `/home/<user>/`, `/Users/<user>/` and `C:` drive forms (single or JSON-escaped double backslash)
    followed by `Users` and a name. CI roots are stripped first (`/home/runner`, `/github/workspace`, `/__w/`,
    `/github/home`), then any remaining absolute user path is flagged. **Placeholder allow-list, explicit**: a path segment
    that is exactly `<user>`, `<name>`, `<repo>` or `${...}` is allowed; anything else, including a segment that merely
    begins with a placeholder, is flagged. The negative-test strings (a name glued to a placeholder, an auth line with a
    fake value, and so on) live **only** in the hygiene selftest, assembled at run time from fragments, never as literals
    in any document or fixture file;
  - **`.npmrc` byte-equality (R1-8)**: the committed root `.npmrc` must be byte-equal to the single scope line
    (`@spec-kitty:registry=https://npm.pkg.github.com` plus a newline); plant: append a second line;
  - **exact versions (R1-16)**, vitest family equality, `@playwright/test` == image tag, lockfile integrity (R4);
  - **workflow rules (R3 MINOR-1)**: no `pull_request_target` and no `workflow_run` in any workflow; `permissions:
    contents: read` present at workflow level and on every job; every `actions/checkout` has `persist-credentials: false`;
    no `VITE_*` or `STORYBOOK_*` variable whose value references `secrets.`; every artifact upload sets
    `retention-days: 1`; no Playwright trace upload unless the step names the sanitiser;
  - **PNG chunk allow-list** (R5);
  - **`storybook-static` scan** (F7): the `pnpm build-storybook` script is `storybook build` followed by
    `node scripts/check-hygiene.mjs --scan-dir storybook-static`, so the scan is the last step of the `storybook-build`
    job and of that gate's proof leg (which therefore re-scans its own build);
  - **Narrow allow-list, two CLI-record-path entries (R3 MAJOR-1; second entry added in WP07 review)**: (1) the CLI-written `source_path:` line in
    `.kittify/charter/charter.yaml`. Matching is on the file path **and** a line pattern: `source_path:` followed by an
    absolute path under `<user>`'s `.local/share/uv/tools/spec-kitty-cli/` ending in a `packs/built-in/missions/` yaml
    file (`<user>` standing for exactly one path segment; today line 1582). Every other line of that file, and every other
    file, is scanned normally. Operator policy keeps CLI-written record paths un-scrubbed (tracked upstream as a spec-kitty tooling issue);
    the file is NOT edited by this mission. The allow-list entry carries a comment citing the CLI record-path policy and is removed when
    upstream stops writing the path.
    (2) The CLI-written `"feedback_path"` values (absolute review-feedback paths) in `kitty-specs/<mission>/status.json`
    and `status.events.jsonl`: matched by file and key, only that value is stripped, so any other path or token on the
    same line is still flagged. Same CLI-record-path policy and removal condition.
  - **First implementation WP requirement**: run the hygiene gate against `kitty-specs/` and the charter directory
    before anything else merges, and fix or allow-list (narrowly) every hit.
  The proof plants for this gate are assembled at run time from string fragments so no token-shaped literal is ever
  committed; the plant is a generated non-placeholder name in a **new untracked** file (R1-11), proving untracked files
  are scanned.
- **secretlint** (npm) was considered and rejected: a dependency for a 60-line check, and it does not cover the
  user-path rule.

## R7. Credential preflight (FR-013)

- **Verified findings (R0 b1-b3)**: a root `preinstall` script does **not** fire before resolution; a root
  **`.pnpmfile.cjs`** is loaded before resolution and `process.exit(9)` stops the install with the named message
  before any registry request (also verified with an empty HOME and no env). `NODE_AUTH_TOKEN` in the environment is
  **not** used by pnpm for a scope mapped only in `.npmrc`; only a user-level npmrc auth line works. A present-but-bad
  token yields `ERR_PNPM_FETCH_401 ... Unauthorized - 401` from pnpm, after the pnpmfile.
- **Decision, local**: `.pnpmfile.cjs` calls `scripts/preflight-core.cjs` (offline part): a
  `//npm.pkg.github.com/:_authToken=<non-empty>` line exists in `$NPM_CONFIG_USERCONFIG` or `~/.npmrc`. If absent it
  exits non-zero with: `Missing GitHub Packages credential for @spec-kitty/*. Add //npm.pkg.github.com/:_authToken=<token>
  to ~/.npmrc (token needs read:packages and access to the spec-kitty org; pnpm does not read NODE_AUTH_TOKEN for this).`
  If `NODE_AUTH_TOKEN`/`NPM_TOKEN` is set but the file line is absent the message says so explicitly. `pnpm preflight`
  (`scripts/preflight.mjs`) additionally performs the online check: `GET https://npm.pkg.github.com/@spec-kitty%2felements`
  with the token; 401 = "token rejected or expired", 403/404 = "token cannot read @spec-kitty/elements: needs
  read:packages and org access (SSO authorised)". The token is never printed.
- **Decision, CI**: job `preflight` runs first with no install, step-level `env.NPM_TOKEN: ${{ secrets.NPM_TOKEN }}`;
  empty secret => failure naming the repository secret `NPM_TOKEN`; non-empty but unusable => the online messages above.
  Every other job has `needs: preflight`. `Gate: preflight` is a required check candidate, marked required in
  `contracts/ci-gates.md` (R1-17). Token handling for installing jobs is specified in R9.
- **Offline-install skip**: `preflight-core.cjs` does nothing when pnpm is invoked with both `--offline` and
  `--frozen-lockfile` (no registry request can happen, so no credential is needed). A harness test runs exactly that
  invocation in a scratch copy with no credential and asserts it is not blocked, and a second test runs the online form
  with no credential and asserts the named message.
- **Plants (R1-12)**: two: missing token (empty HOME, expects the named message and the `PLANT-PREFLIGHT-MISSING` marker)
  and an unusable token (temp user npmrc with a generated non-token placeholder, expects the 401 text). The harness tests
  above run in the same `preflight` proof leg; the third guards the `.pnpmfile.cjs` hook against a future pnpm that stops
  loading it early.
- **Dependabot and fork PRs**: neither receives repository secrets, so `preflight` fails with the `NPM_TOKEN` message on
  them. **Accepted** for a private repository: Dependabot is not enabled for the private scope anyway, and fork PRs are
  not part of the workflow.
- **Alternatives**: `preinstall` script (verified ineffective); a committed auth line whose value is an environment-variable reference (the saas
  repo's `nextjs-migration` experience: a project-level token line overrides and breaks a developer's own `~/.npmrc`; also
  forbidden by hygiene byte-equality); `GITHUB_TOKEN` (operator decided against, see decision record
  DM-01M3SYEVBW2T2DBAK77SVNMWRC).

## R8. FR-015 gate proof (redesigned after the plan squad and the verifier)

- **Decision, CI = a matrix**: `Gate: proof (<gate>)`, one leg per plant (10 legs; the `preflight` gate's leg runs both
  plants), in parallel, `needs: [preflight]`. Each leg runs in its own disposable CI workspace (no git worktree in CI):
  1. checkout (`persist-credentials: false`) and, unless the leg is `preflight`, registry auth then
     `pnpm install --frozen-lockfile` then delete `~/.npmrc` (R9 lifecycle);
  2. run the gate's **clean** command; assert exit 0 **and** that the plant's unique token is **absent** from its output;
  3. apply the plant in that workspace (overlays: `*.plant` to real targets; `generated` overlays produced at run time);
  4. run the **planted** command; assert a non-zero exit **and** the unique token present;
  5. emit that leg's sanitised **record fragment** as an artifact (`retention-days: 1`).
  The clean run here is this leg's own, so the real `Gate:` jobs and the proof never disagree about commit or environment.
  A final `Gate: proof` job (`needs:` the whole matrix; frozen install with the credential lifecycle so assemble can use the pinned schema validator and hygiene scanner) runs the **coverage check** (the `Gate: <id>` jobs in
  `ci.yml` minus `{proof, all}` == the matrix `gate:` list == `gates/plants/*` dirs == the fragment set, ids pairwise
  distinct) and assembles and schema-validates `proof-record.json` and `PROOF.md`, uploading them.
- **Local `pnpm gate-proof`**: same legs sequentially, but each planted run happens in a throwaway `git worktree` of
  `HEAD` whose `node_modules` are **symlinked** from the main checkout (no worktree install, so no credential), then
  restore and assert `git status --porcelain` is empty there (recorded as `localWorktreeCleanAfterRestore`), and remove the
  worktree in a `finally`. The visual plant runs through `visual.sh` (F8), so the pinned-container rule applies locally
  too. The main checkout is never mutated.
- **Non-CI installs**: any remaining offline frozen install needs no credential (R7 offline-install skip).
- **SC-002 evidence**: green `Gate: proof` (and all its legs) on the PR head commit **plus** the uploaded sanitised record.
  Any record committed to the repository is labelled, in its `commit`/`snapshotOf` fields and in `PROOF.md`, a **snapshot
  of its parent commit**, informational only; nothing gates on it. The former "diff committed record" check is dropped.
- **Sanitiser (R3 MAJOR-4, F3)**: excerpts replace roots in this order: cwd, `$HOME`, `/__w`, `/github/workspace`,
  `/github/home`, repository root -> `<repo>` / `<home>`; and rewrite any `_authToken` assignment value to
  `_authToken=<redacted>`. Before writing, the assembler runs the hygiene scanner over the candidate record and
  `PROOF.md` and **fails closed** on any match. The schema's `excerpt` carries a `not` pattern that bans absolute user
  paths, drive paths, token shapes with bodies and any `_authToken` assignment whose value is not an angle-bracket
  placeholder, so a record that violates it cannot validate. The placeholder `<redacted>` passes; a real value does not.
- **Plants never reach real gates**: plants sit in `gates/plants/` as non-source extensions (hygiene asserts no lintable
  file there) and overlays land only in the leg workspace or throwaway worktree.

## R9. CI workflow shape (FR-014, C-003)

- **Decision**: one workflow `.github/workflows/ci.yml`, `on: pull_request (branches: [main])` and `push` to `main`;
  `pull_request_target` and `workflow_run` are forbidden (hygiene greps). `permissions: contents: read` at workflow
  level **and** on every job; every `actions/checkout` sets `persist-credentials: false`; `concurrency`
  cancel-in-progress per ref. Jobs, each a separately named check (`name: Gate: <id>`): `preflight` first; then in
  parallel, all `needs: preflight`: `typecheck`, `eslint`, `stylelint`, `no-io`, `manifest`, `hygiene`,
  `storybook-build`, `unit-tests` (container), and the proof matrix `Gate: proof (<gate>)` (R8; container for the
  `unit-tests` and `visual` legs, runner otherwise). `visual` (container) `needs: [preflight, storybook-build]` and
  downloads its `storybook-static` artifact. `Gate: proof` `needs:` the matrix. **`Gate: all`** is the aggregate job:
  `needs:` every other job including `Gate: proof`, `if: always()`, and fails unless **every** `needs.<job>.result ==
  'success'` (a failed, cancelled or skipped job fails it). `Gate: preflight` and `Gate: all` are the two checks the
  operator marks required first; all names remain listed in `contracts/ci-gates.md`. Runner `ubuntu-24.04`. Pnpm via
  `pnpm/action-setup` (SHA-pinned, `version: 11.18.0`; no corepack), Node via `actions/setup-node` with
  `node-version-file: .nvmrc` (and inside container jobs, see R5). Actions pinned to full commit SHAs.
- **Token handling per installing job (R2-4, R3 MAJOR-2)**: in **each** job or leg that runs `pnpm install` (containers use
  the container's own `$HOME`):
  1. step `Write registry credential`, **step-level** `env: NPM_TOKEN: ${{ secrets.NPM_TOKEN }}` only:
     `echo "::add-mask::$NPM_TOKEN"`; `umask 077`; `printf '//npm.pkg.github.com/:_authToken=%s\n' "$NPM_TOKEN" > "$HOME/.npmrc"`; `chmod 600 "$HOME/.npmrc"`;
  2. step `pnpm install --frozen-lockfile` (the only step that needs it);
  3. step `rm -f "$HOME/.npmrc"` immediately after install, and again in a final `if: always()` step;
  4. every test/gate step then runs **without** the credential on disk or in env. Nothing writes the token to the
     workspace, to an artifact or to the cache.
- **Caching and artifacts (R3 MINOR-2)**: cache only the pnpm store (`actions/cache` on `pnpm store path`, keyed on the
  lockfile hash), restored **before** the credential step and saved after the credential is deleted; never cache
  `node_modules`, `~/.npmrc` or `$HOME`. Artifacts (`storybook-static`, record fragments, proof record) use
  `retention-days: 1`; no Playwright trace/video is uploaded unless produced through the sanitiser. `VITE_*` and
  `STORYBOOK_*` variables must never carry a secret (hygiene asserts).
- **Node assertions (R2-3)**: every job that runs repo tooling has a step `node -v` asserting `v22.22.2`
  (`actions/setup-node` exact version from `.nvmrc`; container jobs install it inside the container first).
- **Container jobs** use the digest-pinned image of R5; GitHub-hosted runners pull it from `mcr.microsoft.com` without
  credentials.
- **Time budget (NFR-002: critical path under 15 min including `Gate: all`)**. Estimates (replaced by first-run actuals
  in the PR description). Storybook build is costed explicitly at 2 min for a one-element app; container pull 1 min;
  checkout and tool setup 0.5 min; warm-store install 1.5 min; each gate's own command as stated.

  | Job / leg | Composition (typical, est.) | typical | `timeout-minutes` |
  |---|---|---|---|
  | `preflight` | checkout, script, online check (20 s request timeout) | 0.5 | 1 |
  | `typecheck`, `eslint`, `stylelint`, `no-io`, `manifest`, `hygiene` | setup 0.5 + install 1.5 + gate ~1 | 3 | 5 |
  | `storybook-build` | setup 0.5 + install 1.5 + build 2 + scan | 4 | 5 |
  | `unit-tests` (container) | setup 0.5 + pull 1 + install 1.5 + tests 1.5 | 4.5 | 6 |
  | `visual` (container) | setup 0.5 + pull 1 + filtered install 1 + 5x4 shots 1.5 | 4 | 6 |
  | proof leg: lint-type gates (typecheck, eslint, stylelint, no-io, manifest, hygiene) | setup 0.5 + install 1.5 + clean 1 + planted 1 | 4 | 6 |
  | proof leg `preflight` | no install; two plants + two harness tests | 1.5 | 4 |
  | proof leg `storybook-build` | setup 0.5 + install 1.5 + clean build 2 + planted build 2 | 6 | 8 |
  | proof leg `unit-tests` (container) | 0.5 + pull 1 + install 1.5 + clean 1.5 + planted 1.5 | 6 | 8 |
  | proof leg `visual` (container) | 0.5 + pull 1 + install 1.5 + clean (build 2 + run 1) + planted (build 2 + run 1) | 8.5 | 9 |
  | `Gate: proof` (frozen install with credential lifecycle, then artifacts, coverage, assemble) | setup 0.5 + install 1 + 1 | 2.5 | 3 |
  | `Gate: all` | seconds | 0.3 | 1 |

  **Worst-case chain arithmetic (every job at its `timeout-minutes` ceiling, serial dependencies only)**:
  - proof path: `preflight 1` + slowest proof leg (`visual`) `9` + `Gate: proof 3` + `Gate: all 1` = **14**
    (the `storybook-build` and `unit-tests` legs at 8 give `1 + 8 + 3 + 1 = 13`);
  - gate path: `preflight 1` + `storybook-build 5` + `visual 6` + `Gate: all 1` = **13**.
  Worst case 14 minutes, under 15. Typical critical path: `0.5 + 8.5 + 2.5 + 0.3`, about **12** minutes (the 12-minute fallback threshold below is therefore close; the first real run decides).
- **Pre-recorded fallback (decided now, not a trigger to re-plan)**: the rebuild-heavy proof legs (`visual`,
  `storybook-build`) are the only ones near the ceiling. If the first green CI run's measured critical path exceeds 12
  minutes, the implementer **moves exactly those two legs to `schedule` + `workflow_dispatch`** (they stay in the matrix
  definition and in coverage; the PR-triggered matrix excludes them via a matrix `include` flag), records the measurement
  in the PR description, and raises no further planning round. The coverage check still runs on every PR. The other
  eight legs stay on every PR.
- **Required checks**: which checks the `main` ruleset requires is an operator setting outside this repo; the plan
  lists the names in `contracts/ci-gates.md`.

## R10. Supply chain (DIRECTIVE_051, advisory)

- Every dependency is pinned to an exact version (hygiene-enforced, R4) and the lockfile is committed with integrity
  hashes; CI installs with `--frozen-lockfile`; install scripts are allow-listed by explicit package name
  (`allowBuilds`, R0 a2); registry scope mapping is explicit so `@spec-kitty/*` can only resolve from GitHub Packages
  (no dependency-confusion fallback for that scope); GitHub Actions pinned by SHA; container image pinned by digest.
- `pnpm audit` cannot query GitHub Packages for the private scope; it is run against the public registry with
  `--prod` for public dependencies only and is advisory (not one of the named gates). Disposition: recorded, not gating.
- Provenance of the private packages: versions exist (`gh api /orgs/spec-kitty/packages/npm/elements/versions` lists
  `1.1.0-rc.10` newest); contents inspected as in R2 and R0.
- **Adversarial squad findings disposition (plan phase)**: folded by the orchestrator's rulings on 2026-09-30 (R1-1 to
  R1-20, R2-1 to R2-4, R3 MAJOR-1 to MAJOR-4, MINOR-1 to MINOR-3); each is applied in the section named in this file, in
  `plan.md` and in `contracts/`. Rulings were applied as given; the two items needing an experiment (pnpm build-script
  key, pnpmfile ordering) are verified in R0 and corrected where the suspicion was wrong (`NODE_AUTH_TOKEN`, R0 b3).

## Recorded scope decision: no prototype visual comparison (R1-18)

The charter asks for visual regression "against the prototype". This mission does **not** do that and this is **not a
charter exception**: it follows from the operator-confirmed Intent Summary (2026-09-30), whose Out of scope line excludes
real V2 screens, and from C-006 (no real screens). With no real screen there is nothing to compare to the prototype;
the baselines are the sample element's own approved rendering (spec Assumptions). Prototype comparison begins with the
first real screen mission.

## Open risks

1. `.pnpmfile.cjs` as the pre-resolution hook is verified to load and stop pnpm 11.18.0 before any registry request but
   is an implementation detail; if a future pnpm stops loading it early, the third preflight test (R7) fails and local
   preflight degrades to `pnpm preflight` plus the README.
2. The pinned image carries Node 24.18.1; repo tooling runs on 22.22.2 installed inside the container (R5, R9). If
   `actions/setup-node` cannot run inside the image, the implementer halts and reports rather than relaxing the assertion.
3. Proof-leg runtime may threaten NFR-002 (worst-case chain 14 min; fallback pre-recorded in R9).
4. rc packages may rename elements in later rcs; exact pins plus the manifest and visual gates make a bump reviewable.
5. Storybook 10.6.1 with Vite 7 and pnpm strict `node_modules`: `lit` must resolve as one copy (verified at the install
   level, R0 c3); `resolve.dedupe: ['lit']` stays, and the "two copies" warning from `define()` is asserted absent in the
   visual spec.
6. `elements` declares no `sideEffects` field; the preview imports it for effect. If a production build drops the bare
   import, the visual spec's "sk element upgraded" assertion fails; the remedy is `build.rollupOptions.treeshake` or
   importing a named export the preview uses.
