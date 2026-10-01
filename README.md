# spec-kitty-mission-ui

Shared Spec Kitty mission screens (Lit web components) for the dashboard and Kitty Desktop.
Storybook is the workbench and the visual source of truth. The package is `@spec-kitty/mission-ui`.

## Setup

Prerequisites (one-time):

- Node 22.22.2, as pinned in `.nvmrc` (for example `nvm install` or `fnm use`).
- pnpm 11.18.0, installed directly (for example `npm install -g pnpm@11.18.0`). corepack is not used.
- A GitHub token with `read:packages` and access to the `spec-kitty` organisation (SSO authorised), see the next section.
- For the visual gate only: podman or docker.

### Credential

`@spec-kitty/tokens`, `@spec-kitty/styles` and `@spec-kitty/elements` come from GitHub Packages, which needs a token.
Add this line to your own user-level `~/.npmrc`, replacing `<token>` with your token:

```
//npm.pkg.github.com/:_authToken=<token>
```

- Do not use `NODE_AUTH_TOKEN` or `NPM_TOKEN` in your shell: pnpm ignores them for this scope.
- Never put the token in the repository `.npmrc` (it holds only the `@spec-kitty:registry` scope line), in a
  story, a fixture or any committed file. The hygiene gate fails on it.
- If the line is missing, `pnpm install` stops before resolving anything with a message that starts
  `Missing GitHub Packages credential for @spec-kitty/*` and names `~/.npmrc`.
- `pnpm preflight` runs the same offline check, then asks the registry. Exit codes: 9 credential missing,
  10 token rejected or expired (401), 11 token cannot read `@spec-kitty/elements` (403/404: needs `read:packages`
  and org access, SSO authorised), 12 registry unreachable. The token is never printed.
- CI reads the repository secret `NPM_TOKEN` (a token with `read:packages` and org access). Pull requests from forks
  and from Dependabot receive no secrets, so they fail `Gate: preflight` with the `NPM_TOKEN` message by design.

## Run the workbench

```bash
pnpm install
pnpm storybook
```

Storybook serves on port 6006. The four stories (`Ready`, `Empty`, `Loading`, `Error`) of the sample element are
under "Mission / Sample", plus an autodocs page.

## The screen contract

Every screen element in `packages/mission-ui/src/elements/` follows the charter:

- Data in as properties; a `status` property carries the view state `loading`, `error`, `empty` or `ready`.
- User intents out as `sk-*` CustomEvents with `bubbles` and `composed`, dispatched as
  `this.dispatchEvent(new CustomEvent('<string literal>', ...))` so the manifest can see them.
- No I/O: no fetch, XHR, WebSocket, Tauri API or browser storage. Hosts own fetching, routing and refresh.
- Every public property and event is declared in `packages/mission-ui/custom-elements.json`.

### Elements over CSS

- Every primitive `@spec-kitty/elements` provides (card, notice, pill tag, status indicator, button, ...) is rendered
  with its `sk-*` element. No raw `<button>`, `<input>`, `<select>`, `<textarea>`, no `class=`, no inline `style=`,
  no `styleMap` or `unsafeCSS` in element templates (ESLint).
- Project CSS is layout only (grid, flex, gaps) and uses `--sk-*` tokens. Stylelint rejects colour and font literals and
  any unit except `%` and `fr`.
- A primitive the library lacks is a component gap for the design library, not something to hand-roll. A temporary
  stand-in needs an exception recorded in the PR.
- Visible text of an `sk-*` element goes in its default slot. For `sk-button`, the `label` attribute is only the
  accessible name: `<sk-button label="Open">` alone renders a blank button. `sk-status-indicator` likewise colours
  its slotted text, so text placed in a sibling span loses its colour. Check the element's slots in the
  `@spec-kitty/elements` custom-elements manifest before using it.

## Gates

One workflow, `.github/workflows/ci.yml`; the job ids are the gate ids and the check names are `Gate: <id>`. The list
below is the set of job ids in that file; do not trust a count written anywhere else. Every gate evaluates whole
packages, never only the changed files.

| Gate (CI job) | Local command | What it checks |
|---|---|---|
| `Gate: preflight` | `pnpm preflight` | the registry credential is present and accepted (CI: `node scripts/preflight.mjs --ci`) |
| `Gate: typecheck` | `pnpm typecheck` | strict TypeScript over every workspace package |
| `Gate: eslint` | `pnpm lint` | elements-over-CSS template rules, Lit rules, no warnings allowed |
| `Gate: stylelint` | `pnpm lint:styles` | layout-only CSS, `--sk-*` tokens, no colour, font or size literals |
| `Gate: no-io` | `pnpm lint:no-io` and `pnpm test:no-io` | no network, desktop-bridge or browser-storage I/O in `packages/*/src`; the self-test asserts one fixture per rule |
| `Gate: manifest` | `pnpm manifest:check` | `custom-elements.json` equals a fresh regeneration and declares every property and event |
| `Gate: hygiene` | `pnpm hygiene` | no token, no absolute user path, pinned dependencies and actions, safe workflow triggers, baseline PNG checks |
| `Gate: storybook-build` | `pnpm build-storybook` | the static Storybook builds, then the output is scanned for tokens |
| `Gate: unit-tests` | `pnpm test` | Vitest browser-mode tests: one per emitted event and payload |
| `Gate: visual` | `pnpm visual` | screenshots of every story against the committed baselines, inside the pinned Playwright container |
| `Gate: proof (<gate>)` | `pnpm gate-proof` | one leg per gate: passes clean, fails with the plant (see below) |
| `Gate: proof` | (CI only) | checks coverage, assembles and schema-validates the proof record |
| `Gate: all` | (CI only) | fails unless every job above succeeded; skipped or cancelled counts as failed |

The operator marks `Gate: preflight` and `Gate: all` as required checks. The `preflight` job runs first and every
other job needs it.

### Visual baselines

Baselines live in `apps/storybook/tests/visual/__snapshots__/` and are produced and compared only inside the
digest-pinned Playwright image. `pnpm visual` builds Storybook then runs `scripts/visual.sh`, which FAILS (never
skips) if podman or docker cannot start the container. After an intentional visual change run `pnpm visual:update`
and review the PNG diff in the PR. CI repeats each screenshot 5 times to catch flakiness.

### Installs are frozen

CI installs with `pnpm install --frozen-lockfile`. The credential check is skipped only when pnpm runs with both
`--offline` and `--frozen-lockfile`, so an offline frozen install (which `pnpm gate-proof` uses inside its throwaway
worktrees, with `node_modules` symlinked) needs no token.

## Add an element

1. Copy `packages/mission-ui/src/elements/sk-mission-sample/` to a new folder and rename tag, class and files.
2. Keep the screen contract and elements-over-CSS rules above. The manifest gate requires a `status` property only
   for screens: modules under `packages/*/src/screens/`, or any element whose class JSDoc has a line `@screen`
   (the sample carries it). Reusable widgets under `src/elements/` need neither.
3. Register the tag in `packages/mission-ui/src/index.ts`
   (`if (!customElements.get('sk-new')) customElements.define('sk-new', SkNew)`) and export the class and its event
   detail types. Element modules must not use `@customElement`: they never self-register, so a test, story or other
   package can import them without a duplicate-definition error. Put `@element <tag>` and `@fires {CustomEvent<Detail>}
   <name>` in the class JSDoc so the manifest carries the tag and the typed events. Stories import `../../index.js`.
4. Write one story per view state with synthetic fixtures (no real data, no absolute paths, no usernames) tagged
   `autodocs`, and one test per emitted event asserting its payload.
5. Add a line under "Unreleased" in `packages/mission-ui/CHANGELOG.md` (and in the root `CHANGELOG.md` for any
   user-visible change).
6. Run `pnpm manifest:generate` and commit the regenerated `custom-elements.json`.
7. Run `pnpm visual:update` to create baselines and review the new PNGs.
8. Run the gates from the table before opening the PR.

## Verify the gates are not vacuous

A gate that never fails proves nothing. Each gate has a plant under `gates/plants/<gate>/`: a known violation stored
as a non-source file (`*.ts.plant`, `*.css.plant`, `*.json.plant`), an anchored `{find, replace}` edit of a real file
(fails if the anchor text is gone or no longer unique, never because the file changed elsewhere), or generated at run time, with a
unique token in the failure output.

```bash
pnpm gate-proof                          # every gate, in a throwaway git worktree of HEAD
node scripts/gate-proof.mjs local --only hygiene    # one gate
```

For each gate the harness checks coverage (the `Gate: <id>` job ids in `ci.yml`, the proof matrix and the plant
directories must agree; `Gate: all` must need every gate, `proof-leg` and `proof`; each plant's `ciCommand` must equal
the `run:` of the `id: gate` step of that job, which has no `if:`; the proof runs that same command), runs the gate clean (must pass, token absent), applies the plant, runs it again (must fail,
token present), restores and checks the tree is clean. The result is a `proof-record.json` and `PROOF.md` in
`proof-output/` (git-ignored).

In CI, evidence for SC-002 is the green `Gate: proof (<gate>)` legs and `Gate: proof` on the PR head, plus the
uploaded, sanitised `proof-record` artifact of that run (retained one day). A record committed to the repo, if any, is
a snapshot of its parent commit, not proof of the current head.

### Timed clean-clone check (NFR-001, SC-001)

The accepting reviewer, on a machine with the prerequisites done and a valid credential, starts a stopwatch at
`git clone <repo>`, runs `pnpm install` then `pnpm storybook`, and stops when the preview answers. It must take under 5
minutes and all four Sample stories must render. The measured time goes in the PR description.

## Known limitations

No lint gate is complete. These are documented, not gated; reviewers must catch them.

- **`no-io`** (`eslint.no-io.config.mjs`): Lit template attributes that load URLs (`<img src=${url}>`, `<link href>`,
  `<iframe>`) and `@import` or `url()` inside `css` text are not analysed (stylelint owns CSS). `setAttribute` is only
  checked for a literal `src`, `href`, `srcdoc`, `action`, `formaction` or `data` name. Aliases of objects other than
  `navigator`, `document` and `Reflect`, and objects reached through helper functions or other modules, are not
  followed (no data-flow analysis). Computed keys and property descriptors, for example
  `Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')`, can reach a banned API unseen. Identifier rules
  assume no local shadowing of the banned names (shadowing is itself reported). Only `packages/*/src` is linted.
- **`manifest`** (`scripts/check-manifest.mjs`): events dispatched outside `packages/*/src` or from `.d.ts` files are
  not seen; `class X extends Event` or `extends CustomEvent` subclasses and Event factories in other packages are not
  followed; only `Event` and `CustomEvent` are policed (not `MessageEvent`, `KeyboardEvent`, ...); a `@fires` tag with
  no matching dispatch is accepted.
- **`eslint` and `stylelint`** (`eslint-rules/index.mjs`, `stylelint.config.mjs`): markup assembled from plain
  strings at run time (`document.createElement('button')`, `innerHTML = ...`), a second template library imported
  under another name, and CSS built from run-time strings are invisible to static rules. ESLint bans `unsafeCSS` and
  `styleMap` to close the CSS route at its source.
- **`hygiene`** (`scripts/hygiene/rules.mjs`): the token and path rules work line by line, so a token split across
  lines is not matched, and a quoted value containing an escaped quote is only read up to the quote. Token-shaped
  values are matched by prefix and length, so a differently shaped credential is not recognised.
- **CLI-record-path allow-list: two entries, three CLI record-path classes.** The spec-kitty CLI writes absolute paths into
  its own records, and operator policy keeps them un-scrubbed. Hygiene therefore exempts exactly three kinds of
  CLI-written path: the charter's `source_path:` line in `.kittify/charter/charter.yaml`, and, in
  `kitty-specs/*/status.json` and `status.events.jsonl`, the review `feedback_path` value and the retrospective
  `record_path` value. Nothing else is exempt; `pnpm hygiene --list-allowed` prints the two entries (the status entry
  covers both status-record keys).
