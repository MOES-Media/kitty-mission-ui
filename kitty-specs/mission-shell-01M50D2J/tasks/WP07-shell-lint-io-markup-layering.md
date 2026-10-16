---
work_package_id: WP07
title: 'Shell lint: I/O globals, markup elements and layering'
dependencies: []
requirement_refs:
- C-001
- C-005
- C-007
- FR-017
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
subtasks:
- T034
- T035
- T036
- T037
history: []
agent_profile: node-norris
authoritative_surface: eslint.config.mjs
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- eslint.config.mjs
- gates/plants/eslint/**
role: implementer
tags: []
tracker_refs: []
---

# WP07 — Shell lint: I/O globals, markup elements and layering

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Make the shell's no-I/O (C-001), elements-over-CSS (C-005) and layering rules mechanical in the main ESLint
configuration: one shell I/O block, one Svelte markup block and one layering block. Each rule has a failure-only
message prefix (`shell-io:`, `shell-markup:`, `shell-layering:`) and is proven by an eslint plant (P-3, P-4, P-8).
The no-io gate stays exactly as it is.

## Context

- **Plan**: IC-07 ("Shell lint: I/O globals, markup and layering"). Sequencing: none, it lands first (plan dependency
  graph: `IC07 --> IC06`). Shared-file ownership: `eslint.config.mjs` and `gates/plants/eslint/plant.json` and
  payloads are owned by IC-07, and nobody else requests them.
- **Research**: R-13 ("C-001 and C-005 enforcement in the shell") is normative for the global, property and element
  lists, the messages and the plant tokens. R-01 ("The layering is enforced by lint") defines what `core/`,
  `controller/` and `intents/` may not import. R-08 ("no boundary exemption is added", R4-07) and R-18 "Copy
  protocol" (the controller takes an injected `afterRender` hook, so it never imports Svelte and P-8 holds).
- **Frozen surface**: research R-17. **no-io** (`eslint.no-io.config.mjs`, `eslint-rules/svelte.mjs`,
  `gates/no-io.selftest.ts`) is frozen, and C-001 keeps no-io unchanged. Plant `ciCommand`s are frozen (`pnpm lint`),
  and every base plant is retained. Rule content and new plants may change ("Rule content, plants, … may change").
- **Gates** (plan "Gates"): `eslint` / `pnpm lint` is "extended: the shell I/O and markup block, and the layering
  block". The gate command does not change.
- **Proof-leg timeout** (plan "Proof-leg timeouts"): the eslint leg has 12 plants after this WP (9 base + P-3, P-4,
  P-8). The formula is (1 + 12) × gate step + 2. The timeout stays at 8 only while the measured step is at most 0.46
  min. WP10 (IC-09) sets timeouts from the time you record (tasks-notes "Proof-leg timing obligations").
- **Spec**: C-001 (no I/O in the shell, including history, the clipboard and bare `window`), C-005 (`sk-*` elements
  for banners, notices and the Refresh button), C-007 (offline gates, plants required), FR-017 (every extended gate
  carries a plant).
- **Who depends on this WP**: WP06 (IC-06) writes the Svelte view under these rules. WP01 to WP05 write `core/`,
  `controller/` and `intents/` under the layering block once it lands. Because WP07 has no dependencies, none of
  those directories may exist yet. The globs must still be correct for files that do not exist yet. The plants prove
  them.
- **The current tree** (base): `packages/mission-shell/src/` holds `Shell.svelte`, `index.ts`, `testing.ts`,
  `client/{port,fixture,coverage}.ts`, `contract/stream.ts`, `generated/elements.d.ts` and
  `harness/{BindingHarness.svelte,intent.ts}`. None of them uses a banned global, property or element today, so
  `pnpm lint` must stay clean with no exemption.

## Ownership

**Owned files** (stage only these):

- `eslint.config.mjs`
- `gates/plants/eslint/**`

**Out-of-map edits** (granted by the plan agent at tasks time; record it in the final report):

- `gates/markdown-lint.selftest.ts`, owned by no WP of this mission, one line only: in the case "knows the browser
  globals", replace `navigator.language` with `String(performance.now())`. Keep `document.title` and
  `customElements` as the positive control.
  - Why: C-001 and research R-13 ban `navigator` in shell sources, and that case lints its code as
    `packages/mission-shell/src/Shell.svelte`, so it would turn `test:no-io` red.
  - `performance` is a browser global that neither no-io nor the shell block bans.
  - This changes no rule. no-io's own config and `gates/no-io.selftest.ts` stay untouched.

Any other change you need in a file you do not own goes in the final report as a **change request** (file, change,
reason). You do not make that edit yourself.

**Do not touch**:

- no-io (frozen, research R-17; C-001 keeps no-io unchanged): `eslint.no-io.config.mjs`, `eslint-rules/svelte.mjs`,
  `gates/no-io.selftest.ts`.
- `gates/markdown-lint.selftest.ts`, except the one granted line (see "Out-of-map edits").
- The frozen surface (C-003; research R-17): `packages/mission-shell/src/index.ts`, `src/testing.ts`, `src/client/**`,
  `src/contract/stream.ts`, `src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`, `packages/mission-ui/**`,
  and the gate wiring (`ci.yml` structure, gate scripts, `scripts/gate-proof*`, each plant's `ciCommand` and
  `prepare`).
- `eslint-rules/index.mjs`, `eslint-rules/markdown-renderer.mjs`, `eslint.data-driven.config.mjs`.
- The 9 existing entries of `gates/plants/eslint/plant.json` and their payload files.

## Subtasks

### Subtask T034: Shell I/O block for `packages/mission-shell/src/**`

**Purpose**: ban the I/O globals and properties that no-io does not cover (research R-13 "Facts": no-io bans
`location` and bare `window`, but not `history`, `navigator` and the rest). All I/O then goes through `ShellHost`
or the port (C-001; `contracts/shell-api.md` "No I/O").

**Steps**:

1. In `eslint.config.mjs`, add one block **after** the existing shell boundary block (the one commented "The import
   boundary inside the shell (SO-BND-005, CODE-BOUNDARY-003)"):
   ```js
   files: ['packages/mission-shell/src/**'],
   ```
   Give it **no `ignores`**. `testing.ts`, `client/fixture.ts` and `harness/**` are shell sources too, and the
   brief allows no silent exemption for them (see step 6).
2. `no-restricted-globals`, one object per name, in the R-13 order: `history`, `navigator`, `open`, `postMessage`,
   `print`, `alert`, `confirm`, `prompt`. Build the entries from one list so each message is exactly:
   ```
   shell-io: <name> is forbidden in the shell; go through the host interface (C-001)
   ```
   For example: `['error', ...SHELL_IO_GLOBALS.map((name) => ({ name, message: `shell-io: ${name} is forbidden in the shell; go through the host interface (C-001)` }))]`.
3. `no-restricted-properties`: `{ object: 'document', property: 'execCommand' }` and
   `{ object: 'document', property: 'location' }`. Use the same message shape, naming `document.execCommand` and
   `document.location` (for example `shell-io: document.location is forbidden in the shell; go through the host
   interface (C-001)`).
4. Add a comment above the block that cites C-001, research R-13 and IC-07. Say that no-io is unchanged, and that
   `no-restricted-globals` matches free references only (a local of the same name shadows it: plan IC-07 "Risks").
5. **Composition check**: run `grep -n "no-restricted-globals\|no-restricted-properties" eslint.config.mjs`. No earlier
   block sets these two rules for shell files, so this block cannot replace any options (a later block replaces a
   rule's options for the files it matches). If a match turns up other than yours, merge it into your block and
   record that in the final report. `noInlineConfig` already covers `packages/*/src/**/*.{…,svelte}` through the
   markdown-renderer block, so an `eslint-disable` comment cannot silence these rules. Do not add a second
   `linterOptions`.
6. **The current tree must stay clean.** Grep the shell sources:
   `grep -rnwE 'history|navigator|open|postMessage|print|alert|confirm|prompt|execCommand' packages/mission-shell/src`.
   The expected matches are prose in comments (`client/port.ts`, `client/fixture.ts`), property keys in
   `generated/elements.d.ts` (`open?: boolean`, `'onsk-open-…'`) and nothing else. None of these is a global
   reference. Then confirm with `pnpm lint`.
7. **The granted self-test edit.** `gates/markdown-lint.selftest.ts` lints code through the main config, filed at
   `packages/mission-shell/src/Shell.svelte`. Its case "knows the browser globals" reads `navigator.language` and
   expects `[]`, which this block now rejects.
   - Make the one granted edit: replace `navigator.language` with `String(performance.now())` (see "Out-of-map
     edits"). Do not exempt `Shell.svelte`, and do not weaken the rule.
   - Then run `heavy pnpm test:no-io` and expect green.
   - Any **other** harness or test code that legitimately needs a banned global is not granted: call it out and
     stop.

**Files**: `eslint.config.mjs`.

**Validation**:

- `pnpm lint` passes on the current tree, and its output contains no `shell-io:`.
- A scratch check (not committed) shows the rule fires. Use
  `npx eslint --stdin --stdin-filename packages/mission-shell/src/scratch.ts` on `export const h = history.length;`.
  It reports `shell-io: history is forbidden`. The same file with `const history = { length: 1 }; export const h =
  history.length;` reports nothing (shadowing). Delete nothing from the tree, because stdin leaves no file.
- The same stdin check filed under `packages/mission-ui/src/scratch.ts` reports no `shell-io:` (the block reaches
  the shell only).
- `heavy pnpm test:no-io` is green, after the granted one-line self-test edit of T034 step 7.

### Subtask T035: Markup block for `packages/mission-shell/src/**/*.svelte`

**Purpose**: ban raw controls and resource-loading elements in Svelte markup. The Lit-template restrictions of
`elementSyntaxRestrictions` do not see Svelte markup (research R-13 "Facts": raw controls are banned only inside Lit
templates). Controls, banners and notices must be `sk-*` elements (C-005), and no element of the shell may load
a resource by itself (C-001).

**Steps**:

1. Check the rule in the installed plugin before you write the block: run
   `pnpm ls eslint-plugin-svelte` (expect 3.23.0) and read
   `node_modules/eslint-plugin-svelte/lib/rules/no-restricted-html-elements.js`. The rule is
   `svelte/no-restricted-html-elements`. Its options are an array whose items are either a bare element name or
   `{ elements: string[] (unique, at least 1), message: string }`, with no other keys. It reports on the start tag
   of a `SvelteElement` of kind `html` whose name matches exactly. Record the version and the option shape you
   confirmed in the final report. If either differs, stop and report.
2. Add one block after the T034 block:
   ```js
   files: ['packages/mission-shell/src/**/*.svelte'],
   rules: {
     'svelte/no-restricted-html-elements': ['error', {
       elements: ['button', 'input', 'select', 'textarea', 'a', 'form', 'iframe', 'object', 'embed',
                  'img', 'link', 'audio', 'video', 'source'],
       message: 'shell-markup: raw controls and resource-loading elements are forbidden in shell markup; use the sk-* elements (C-001, C-005)',
     }],
   },
   ```
   The list is R-13's five groups: raw controls (`button`, `input`, `select`, `textarea`), links and forms (`a`,
   `form`), embedding (`iframe`, `object`, `embed`), resource loading (`img`, `link`) and media (`audio`, `video`,
   `source`). Use exactly these 14 names and the one message.
3. The `svelte` plugin is already registered by `svelte:base:setup-plugin` (kept unscoped in `svelteRecommended`),
   so the block needs no `plugins` key. Confirm this: if ESLint reports "could not find plugin", the setup block has
   been scoped wrongly. Fix the block, not the plugin setup.
4. **Composition check**: `grep -n "no-restricted-html-elements" eslint.config.mjs` should show only your block.
5. Comment the block: C-001, C-005, R-13, IC-07. Add a known limitation: `<svelte:element this={…}>` with a runtime
   tag is not detectable statically (the file header already states this class of limitation for run-time strings).

**Files**: `eslint.config.mjs`.

**Validation**:

- `pnpm lint` passes on the current tree (`Shell.svelte` and `harness/BindingHarness.svelte` render only `{@render}`
  and `<sk-missions-screen>`). The output contains no `shell-markup:`.
- A stdin check filed as `packages/mission-shell/src/Scratch.svelte` with `<button type="button">x</button>`
  reports `shell-markup: raw controls`. The same file with `<sk-button>x</sk-button>` reports nothing (positive
  control). The same file with `<img alt="">` also reports it.
- `heavy pnpm test:no-io` stays green. Its Svelte cases (`the shell .svelte sources get the rule set of the .ts
  sources`) contain no markup element from the list.

### Subtask T036: Layering block for `packages/mission-shell/src/{core,controller,intents}/**`

**Purpose**: enforce research R-01's layering. `core/`, `controller/` and `intents/` import neither `svelte` nor the
mission-ui runtime. Type imports from `@moes-media/mission-ui` stay allowed. The rule is lint, not the test runner
(plan IC-07, P-8).

**Steps**:

1. **Refactor the boundary block first, keeping its behaviour.** Lift its three patterns into one module-level
   constant, for example:
   ```js
   const SHELL_BOUNDARY_PATTERNS = [
     { group: ['**/client/fixture', '**/fixture'], message: 'Shell sources must not import the fixture adapter: it is reached only through the ./testing entry.' },
     { group: ['**/harness/**'], message: 'Shell sources must not import the binding harness: it is for the shell tests only.' },
     { group: ['**/contracts/fixtures/*.json'], message: 'Shell sources must not import the fixture JSON: only the fixture adapter reads it.' },
   ];
   ```
   Make the boundary block use `patterns: [...SHELL_BOUNDARY_PATTERNS]`. Keep its `files`, `ignores`, messages and
   group order byte-for-byte as they are. **No stories exemption is added** (R4-07; research R-08). Keep the
   existing comment.
2. Add the layering block **after the boundary block**. It replaces `no-restricted-imports` for the files it matches,
   so placed before the boundary block it would itself be overridden (plan IC-07 "Risks"):
   ```js
   files: ['packages/mission-shell/src/{core,controller,intents}/**'],
   rules: {
     'no-restricted-imports': ['error', {
       paths: [
         { name: 'svelte', message: SHELL_LAYERING_MESSAGE },
         { name: '@moes-media/mission-ui', allowTypeImports: true, message: SHELL_LAYERING_MESSAGE },
       ],
       patterns: [
         ...SHELL_BOUNDARY_PATTERNS,
         { group: ['svelte/*'], message: SHELL_LAYERING_MESSAGE },
         { group: ['@moes-media/mission-ui/*'], allowTypeImports: true, message: SHELL_LAYERING_MESSAGE },
       ],
     }],
   },
   ```
   with `SHELL_LAYERING_MESSAGE = 'shell-layering: core, controller and intents import neither svelte nor the
   mission-ui runtime'` (research R-13, "The layering block").
3. Check `allowTypeImports` against the installed core rule. ESLint 9.39's `no-restricted-imports` accepts it on
   `paths` and `patterns` entries (`node_modules/eslint/lib/rules/no-restricted-imports.js`). If the schema rejects
   it, stop and report. Do not switch to `@typescript-eslint/no-restricted-imports` without a ruling, because two
   rules would then split the boundary.
4. The layering globs do not overlap the boundary block's `ignores` (`testing.ts`, `client/fixture.ts`,
   `harness/**`), so the re-spread keeps the boundary in force for every layering file. Say so in a comment, and
   cite R-01, R-13 (R4-04) and IC-07.
5. Put the T034 and T035 blocks and the layering block next to the boundary block, in this order: boundary, layering,
   shell I/O, shell markup. The last block of the file (`@typescript-eslint/unbound-method` for mission-ui elements)
   stays last.

**Files**: `eslint.config.mjs`.

**Validation** (stdin checks, nothing committed):

- `packages/mission-shell/src/core/scratch.ts` with `import { tick } from 'svelte'; export const t = tick;` reports
  `shell-layering:`. With `import { writable } from 'svelte/store'; …` it reports `shell-layering:`. With
  `import '@moes-media/mission-ui';` it reports `shell-layering:`.
- The same path with `import type { ProjectEntry } from '@moes-media/mission-ui'; export type P = ProjectEntry;`
  reports nothing (positive control for `allowTypeImports`). So does `import type { Snippet } from 'svelte'`, which
  is not a run-time import either. Record whether core reports it. Neither answer is wrong, but WP06 needs to know.
- `packages/mission-shell/src/controller/scratch.ts` with `import { createFixtureClient } from '../client/fixture';`
  still reports `Shell sources must not import the fixture adapter` (the boundary survives the replacement).
- `packages/mission-shell/src/ui/Scratch.svelte` importing `tick` from `svelte` reports no `shell-layering:` (the
  view may import Svelte).
- `heavy pnpm test:no-io` stays green: the "import boundary inside the shell (SO-BND-005)" cases are unchanged by the
  refactor.

### Subtask T037: Plants P-3, P-4 and P-8

**Purpose**: prove that each new rule fails when it should (FR-017, C-007). Each plant has one failure-only token
(plan "Plants", research R-13 table).

**Steps**:

1. Append three entries to `gates/plants/eslint/plant.json` (a JSON array). Leave the existing 9 entries byte-for-byte
   untouched. Follow the `PlantEslint.svelte.plant` entry format: `gate`, `ciCommand`, `expectFailPattern`, and
   `overlays` with `{ target, source }`. Use `ciCommand: "pnpm lint"`, exactly as the other entries do (frozen,
   R-17).

   | Plant | `expectFailPattern` | `target` | `source` |
   |---|---|---|---|
   | P-3 | `shell-markup: raw controls` | `packages/mission-shell/src/PlantRawControl.svelte` | `PlantRawControl.svelte.plant` |
   | P-4 | `shell-io: navigator is forbidden` | `packages/mission-shell/src/plant-shell-navigator.ts` | `plant-shell-navigator.ts.plant` |
   | P-8 | `shell-layering:` | `packages/mission-shell/src/core/plant-core-svelte.ts` | `plant-core-svelte.ts.plant` |

2. Write the payloads in `gates/plants/eslint/` (ignored by `pnpm lint` through `gates/plants/**`). Keep each one
   otherwise lint-clean, so the token is the only reason it fails:
   - `PlantRawControl.svelte.plant`: a component whose markup is `<button type="button">Plant</button>`, with no
     script.
   - `plant-shell-navigator.ts.plant`:
     `export const plantShellNavigator = (text: string): Promise<void> => navigator.clipboard.writeText(text);`
   - `plant-core-svelte.ts.plant`: `import { tick } from 'svelte';` and `export const plantCoreSvelte = tick;`.
     `src/core/` may not exist when this WP lands. The gate-proof overlay creates the target directory
     (`mkdirSync(dirname(target), { recursive: true })` in `scripts/gate-proof/lib.mjs`).
3. **Failure-only tokens.** Each token must be absent from a clean `pnpm lint`. Run `pnpm lint 2>&1 | tee` into a
   scratch file outside the repo, then `grep -c` each of the three tokens. All three counts must be 0. Record the
   counts in the final report.
4. **Single cause.** Prove each plant by hand once before gate-proof. Copy the payload to its target, run `pnpm lint`,
   and confirm the token appears and no other rule fires on that file. Then remove the copy, and check with
   `git status` that the tree is clean. P-8 must report `shell-layering:` and not a boundary message.
5. Run `heavy pnpm gate-proof leg --gate eslint` (foreground, alone). It must show all 12 eslint plants turning the
   gate red on their own token, with the clean run green. Record the leg's wall time and the measured gate step.
   Check the formula: (1 + 12) × step + 2 ≤ 8, which means a step of at most 0.46 min. If the step exceeds 0.46,
   report it and do not edit `ci.yml`. WP10 owns the matrix timeouts (plan "Proof-leg timeouts").

**Files**: `gates/plants/eslint/plant.json`, `gates/plants/eslint/PlantRawControl.svelte.plant`,
`gates/plants/eslint/plant-shell-navigator.ts.plant`, `gates/plants/eslint/plant-core-svelte.ts.plant`.

**Validation**:

- `git diff gates/plants/eslint/plant.json` shows only additions after the 9th entry. `node -e` with `JSON.parse`
  gives 12 entries, all with `ciCommand: "pnpm lint"`.
- `heavy pnpm gate-proof leg --gate eslint` passes, and the leg time is recorded.
- `pnpm test:scripts` (the gate-proof unit tests) stays green.

## Plants

| # | Gate | Overlay | Failure-only token |
|---|---|---|---|
| P-3 | eslint | `packages/mission-shell/src/PlantRawControl.svelte` from `PlantRawControl.svelte.plant` (`<button type="button">`) | `shell-markup: raw controls` |
| P-4 | eslint | `packages/mission-shell/src/plant-shell-navigator.ts` from `plant-shell-navigator.ts.plant` (`navigator.clipboard.writeText`) | `shell-io: navigator is forbidden` |
| P-8 | eslint | `packages/mission-shell/src/core/plant-core-svelte.ts` from `plant-core-svelte.ts.plant` (`import { tick } from 'svelte'`) | `shell-layering:` |

All three are proven with `heavy pnpm gate-proof leg --gate eslint` (12 eslint plants in all).

## Exit checks

- [ ] The granted `gates/markdown-lint.selftest.ts` edit (one line: `navigator.language` →
      `String(performance.now())`) is made and recorded in the final report as an out-of-map edit.
- [ ] `pnpm lint` is clean on the current tree with no new `ignores` or exemption: `Shell.svelte`,
      `harness/BindingHarness.svelte`, `harness/intent.ts`, `client/**`, `testing.ts`, `index.ts`,
      `contract/stream.ts` and `generated/elements.d.ts` all pass under the new blocks.
- [ ] Clean `pnpm lint` output contains 0 occurrences of `shell-markup: raw controls`,
      `shell-io: navigator is forbidden` and `shell-layering:` (counts recorded).
- [ ] `pnpm lint:no-io` is clean, and `git diff --exit-code -- eslint.no-io.config.mjs eslint-rules/svelte.mjs
      gates/no-io.selftest.ts` is empty (R-17).
- [ ] `heavy pnpm test:no-io` is green (`gates/markdown-lint.selftest.ts` lints shell paths through the main config).
- [ ] `heavy pnpm gate-proof leg --gate eslint` is green with 12 plants. The local leg wall time and gate step are
      recorded in the final report for WP10 (IC-09), with the formula check (1 + 12) × step + 2 ≤ 8.
- [ ] `pnpm test:scripts` is green.
- [ ] Hygiene: no local paths or usernames in any tracked file this WP touches (`pnpm hygiene`).
- [ ] `git diff --name-only` against the WP base lists only `eslint.config.mjs` and files under
      `gates/plants/eslint/`.
- [ ] The boundary block's behaviour is unchanged: same `files`, `ignores`, groups and messages, now read from the
      shared constant, and no stories exemption.
- [ ] Each subtask marked: `spec-kitty agent tasks mark-status T034 --status done` (and T035, T036, T037).

## Definition of Done

- One shell I/O block bans the 8 globals and 2 `document` properties of research R-13, each with its `shell-io:`
  message, for `packages/mission-shell/src/**`, with no exemptions.
- One markup block bans the 14 elements of R-13 in shell `.svelte` files with the one `shell-markup:` message. The
  rule name and option shape are checked against eslint-plugin-svelte 3.23.0.
- One layering block, placed after the boundary block, bans `svelte`, `svelte/*` and run-time
  `@moes-media/mission-ui(/*)` in `core/`, `controller/` and `intents/`, allows type imports, and re-spreads the
  boundary patterns from the one shared constant that the boundary block also uses.
- no-io is byte-unchanged. No base plant changed. P-3, P-4 and P-8 are appended and proven by gate-proof.
- The current tree lints clean, and every token is failure-only.
- The leg time is recorded for WP10.

## Risks

- **Selftest collision** (T034 step 7): `gates/markdown-lint.selftest.ts` "knows the browser globals" reads
  `navigator` at a shell path. It will fail. Do not exempt `Shell.svelte` or narrow the globs to get round it. Stop
  and request the change.
- **Block order**: a later `no-restricted-imports` block replaces the earlier block's options for the files it
  matches. If the layering block sits before the boundary block, the boundary block overrides it and P-8 passes.
  If the boundary patterns are not re-spread, `core/` loses the fixture boundary. The T036 validation covers both.
- **Shadowing and indirect access**: `no-restricted-globals` matches free references only. `globalThis.navigator`
  and `self.navigator` are not caught. Bare `window` is still banned by no-io. Record this as a known limitation in
  the block comment, and do not widen the rule beyond R-13 without a ruling.
- **Dynamic elements**: `<svelte:element this={tag}>` escapes `svelte/no-restricted-html-elements`. This is a known
  limitation, the same class as the run-time-string limitation the file header already states.
- **Type-only Svelte imports**: `import type { Snippet } from 'svelte'` in `core/` may or may not be reported,
  because `svelte` in `paths` has no `allowTypeImports`. R-13 does not grant it, so leave it banned, and report what
  happens so WP06 knows where `Snippet`-typed code must live.
- **Leg time**: three more lint runs. If the measured step exceeds 0.46 min, the timeout of 8 no longer holds.
  Report it and do not edit `ci.yml`.
- **Plant not single-cause**: a payload that also trips another rule could hide a broken token. Check each payload
  by hand (T037 step 4).

## Reviewer Guidance

- **The granted self-test edit (A4)**: `git diff --numstat "$base" -- gates/markdown-lint.selftest.ts` shows exactly
  `1	1`, and the changed line swaps `navigator.language` for `String(performance.now())` and nothing else (plan
  "Decisions", the WP07 self-test note).

- Diff the R-13 lists against the config: the 8 globals, the 2 properties and the 14 elements, with the messages
  exactly as R-13 gives them (`shell-io: <name> is forbidden in the shell; go through the host interface (C-001)`,
  and the one `shell-markup:` sentence, and the `shell-layering:` sentence).
- Confirm block order: boundary, then layering, then I/O and markup. Confirm the boundary block uses the shared
  constant and keeps its `ignores` and messages unchanged, with no stories exemption (R4-07).
- Confirm no-io is byte-unchanged (`git diff --exit-code` on the three R-17 no-io files).
- **Non-vacuity**: run P-3, P-4 and P-8 yourself through `heavy pnpm gate-proof leg --gate eslint`, or by copying a
  payload to its target and running `pnpm lint`. Confirm the token appears, and that clean `pnpm lint` contains
  none of the three tokens.
- **Positive controls**: an `import type` from `@moes-media/mission-ui` in `core/` is not reported; `<sk-button>`
  in a shell `.svelte` file is not reported; a fixture import in `controller/` still reports the boundary message;
  `svelte` imported in `src/ui/` is not reported.
- Confirm `plant.json` keeps its first 9 entries unchanged and every `ciCommand` is `pnpm lint`.
- Confirm the only `gates/markdown-lint.selftest.ts` change is the granted one-line replacement, that no rule was
  weakened, and that no exemption was added.
- Confirm the final report records the leg time, the gate step and the formula check.

## Implementation command

`spec-kitty agent action implement WP07 --agent claude`
