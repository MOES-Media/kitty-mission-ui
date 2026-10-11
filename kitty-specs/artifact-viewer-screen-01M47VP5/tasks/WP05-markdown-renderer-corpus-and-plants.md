---
work_package_id: WP05
title: Markdown renderer, hostile corpus and plants (the security gate) (IC-04)
dependencies: [WP04]
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-044
- C-014
- NFR-005
- NFR-006
- NFR-012
- NFR-013
- SC-003
- FR-043
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T11:03:38.341593+00:00'
subtasks:
- T027
- T028
- T029
- T030
- T031
- T032
phase: Phase 1 - Foundation
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/logic/markdown/render.ts
create_intent:
- packages/mission-ui/src/logic/markdown/render.ts
- packages/mission-ui/src/logic/markdown/index.ts
- packages/mission-ui/test/markdown-corpus.test.ts
- packages/mission-ui/test/markdown-corpus-model.test.ts
- gates/markdown-lint.selftest.ts
- scripts/bundle-budget.test.mjs
execution_mode: code_change
owned_files:
- packages/mission-ui/src/logic/markdown/render.ts
- packages/mission-ui/src/logic/markdown/index.ts
- packages/mission-ui/test/markdown-corpus.test.ts
- packages/mission-ui/test/markdown-corpus-model.test.ts
- packages/mission-ui/test/support/walk-allowed*.ts
- packages/mission-ui/test/walk-allowed*.test.ts
- eslint.config.mjs
- eslint-rules/**
- gates/markdown-lint.selftest.ts
- gates/plants/**
- scripts/bundle-budget.test.mjs
role: implementer
---

# Work Package Prompt: WP05 - Markdown renderer, hostile corpus and plants (the security gate) (IC-04)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Land the renderer (`render.ts`), the lint rules R1 to R5 with their self-test, the hostile-corpus test, the bundle-budget test, S-A0 step two and the five plants. This is the security gate of the mission.

## Context

Before dispatch the orchestrator has copied the IC-01b gzip figure and timing table into `research.md` D-05 and committed it to the target branch (lane mechanics step 6); this WP sets the bundle budget from them. The structural walk of the produced template (assertions 1 and 3) is the stated proof of NFR-005; the CSP listener is corroboration only. Test names owned here: `markdown-corpus.test.ts`, `markdown-corpus-model.test.ts` (the model twin), `support/walk-allowed*.ts` and `walk-allowed*.test.ts` (its self-test).

Read first: `plan.md` section "IC-04" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-04. Requirements: FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-044, C-014, NFR-005, NFR-006, NFR-012, NFR-013, SC-003, FR-043.

## Precondition (first step, before the first subtask)

First step: confirm that `research.md` D-05 on the dispatch base holds the IC-01b gzip figure and timing table (the orchestrator's copy). If absent, STOP and report; the budget cannot be set from nothing.

## Subtasks

### Subtask T027: `render.ts` and `index.ts`

**Steps**:
1. `renderMarkdown(blocks: ResolvedBlock[], handlers): TemplateResult`: exhaustive `switch` over the resolved node union, literal tags only, a `never` check; data reaches the DOM only as Lit text bindings and the attributes of the allowlist; no classification, no property binding; no `innerHTML`, `unsafeHTML`, `DOMParser`, `href`, `img`.
2. A table scroll box is a plain `div`, and `role="region"` with `tabindex="0"` and a static positional `aria-label` (`TABLE_LABEL(index, total)` from `defaults/`, no document text) only while the `overflowing` set the handlers carry names it (A11Y-003, A11Y-004).
3. `index.ts` is the pure surface; it does not re-export `render.ts` (`document-parts.ts` imports `render.ts` directly).

**Files**: `src/logic/markdown/render.ts`, `index.ts`

**Validation**: the hostile-corpus test passes

### Subtask T028: ESLint rules R1 to R5, `noInlineConfig`, self-test

**Steps**:
1. Implement D-06's R1 to R5 with a `linterOptions: { noInlineConfig: true }` block for `packages/*/src/**` (the main config has none today). R2 and R3 are appended to `elementSyntaxRestrictions` in `eslint-rules/index.mjs` (R2 is exactly the four member calls `render`, `renderInline`, `renderToken`, `renderAttrs` and the `.renderer` access, repo-wide; NO `render*` glob, so `this.renderNode(...)` stays clean, PLAN-FRESH4-012; the `.set`, `.use`, `.enable`, `.disable` selectors are dropped). R1 (`sk/markdown-it-import-home`) and R4 (`sk/markdown-template-attributes`, clause (a) only under `logic/markdown/**`; element non-story files take the attribute allowlist and the named-binding list; `*.stories.ts` and `fixtures.ts` excluded by glob) are dedicated local rules with their own ids.
2. `gates/markdown-lint.selftest.ts`: table-driven, one violating, one clean and one leak case per rule, a guard that exactly five rules are exercised, and the story-versus-`render.ts` case (FRESH-001); an `eslint-disable-next-line` above a banned construct still reports.
3. Add the self-test to the root `test:no-io` script (named edit).

**Files**: `eslint.config.mjs`, `eslint-rules/**`, `gates/markdown-lint.selftest.ts`, root `package.json` (named edit)

**Validation**: `pnpm lint` green on the UNCHANGED base (no existing code, including `Map.set` calls, trips a new rule); `pnpm lint:no-io && pnpm test:no-io` green

### Subtask T029: Walker and hostile-corpus test with model twin

**Steps**:
1. `test/support/walk-allowed.ts` and its own self-test: walks the whole subtree (open shadow roots), asserts the visited count above 0 and, for valid documents, equal to the count the model twin derives from the model.
2. `test/markdown-corpus.test.ts` (browser mode): a CSP `<meta http-equiv="Content-Security-Policy" content="img-src 'none'; frame-src 'none'; object-src 'none'">` inserted in THIS test file's document before rendering; a `securitypolicyviolation` listener that fires without network and a positive control (a hand-built `<img src="http://example.invalid/x.png">` triggers it, and the corpus fails if the listener is detached); each entry rendered into a container; assertions: element allowlist, no `href`, structural walk, link activation emits nothing or the one expected event, every entry also asserts its expected visible text and a visited-element count above 0 (R-08), a timing ceiling per entry (best of three after a warm-up, TEST-008).
3. The corpus covers raw HTML, `<script>`, event-handler attributes, `javascript:` and `data:` URLs, remote images, nested emphasis bombs, a 256 KiB single line and unclosed constructs, plus entries from the OWASP markdown XSS list and the CommonMark spec edge cases; record the source list in the WP report (R-07). Credential-shaped strings are assembled at run time, never stored.
4. `test/markdown-corpus-model.test.ts`: the same assertions on the model without mounting a screen (same Chromium project).

**Files**: `test/markdown-corpus.test.ts`, `markdown-corpus-model.test.ts`, `test/support/walk-allowed*.ts`, `test/walk-allowed*.test.ts`

**Validation**: the CSP positive control fires; a clean `pnpm test` prints no `corpus escape`

### Subtask T030: Bundle budget and S-A0 step two

**Steps**:
1. `scripts/bundle-budget.test.mjs` (node:test under `scripts/`, run by `test:scripts`): builds `parse.ts` with the root `vite` programmatic `build`; the budget constant cites the S-A0 figures. Add the file to the root `test:scripts` script (named edit).
2. S-A0 step two: re-measure the real `parse.ts` chunk and time the corpus in Chromium (the engine that asserts the ceilings). If the figures show that a limit of `defaults/markdown.ts` (WP03's file) must move, that is a CHANGE REQUEST to the orchestrator under the plan's shared-files rule ("a gap is a change request"), not an edit by this WP. The ceilings ARE the spec numbers (500 ms, 200 ms); no multiplier unless proposed as the numbered amendment A-10 in the WP report with the figures (default none; no amendment if headroom is about 2x or more), PENDING CP-1.

**Files**: `scripts/bundle-budget.test.mjs`, root `package.json` (named edit)

**Validation**: the budget and ceilings cite the S-A0 re-measurement

### Subtask T031: The five plants

**Steps**:
1. `unit-tests` (a) link destination into an `href`, (c) an `<img src>` for the image node, (d) a `.innerHTML=${text}` property binding, all with the token `corpus escape`; `eslint` (b) `new DOMParser()` in a file under `logic/markdown/` with `markdown-renderer: R3`, and (e) `.innerHTML=${text}` with `markdown-renderer: R4`.
2. Each plant is an array entry in the gate's `plant.json` (the two files become arrays; `loadPlants` accepts both) with the gate's existing `ciCommand`; no new gate id. Each plant red then green; the token is absent from a clean run.

**Files**: `gates/plants/**`

**Validation**: each plant red then green

### Subtask T032: Timeouts and exit run

**Steps**:
1. Measure the unit-tests suite wall time (clean plus the three planted runs) and re-derive the `unit-tests` proof-leg timeout in `ci.yml` by #4's rule (named edit of that file).
2. Run `pnpm test:terminology`, `pnpm lint`, `pnpm lint:no-io && pnpm test:no-io`; report what the orchestrator must run: `pnpm gate-proof --only unit-tests` and `--only eslint`.

**Files**: `.github/workflows/ci.yml` (timeout only)

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green; corpus green.
2. Each plant red then green; each ESLint rule has a violating, a clean and a leak case; an `eslint-disable-next-line` above a banned construct still reports.
3. `pnpm lint` green on the unchanged base; a clean `pnpm test` prints no `corpus escape`.
4. `pnpm lint:no-io && pnpm test:no-io` green; the CSP positive control fires and the corpus fails if the listener is detached.
5. The bundle budget and the Chromium corpus ceilings cite the S-A0 re-measurement; the unit-tests wall time is measured and the proof-leg timeout re-derived.
6. `pnpm gate-proof --only unit-tests` and `--only eslint` green (run by the orchestrator).

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

R-07 (corpus completeness: add entries from the OWASP markdown XSS list and the CommonMark spec edge cases and record the source list). R-08 (the allowlist test passes vacuously on an empty render: every entry also asserts expected visible text and a visited-element count above 0).

## Reviewer Guidance

Revert each planted weakening yourself and watch the named gate go red. Check R2 has no glob. Check the corpus cannot pass on an empty render. Check `render.ts` has no property binding and no attribute outside the allowlist. Check the CSP meta lives in the corpus test's own document only. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-04

#### IC-04 Markdown renderer, hostile corpus and plants (the security gate)
- **Purpose**: `logic/markdown/render.ts` (`renderMarkdown(blocks: ResolvedBlock[], handlers): TemplateResult`: exhaustive `switch` over the resolved node union, literal tags only, `never` check; data reaches the DOM only as Lit text bindings and the attributes of the allowlist; no classification, no property binding; a table scroll box is drawn as a plain `div`, and as `role="region"` with `tabindex="0"` and a static positional `aria-label` (`TABLE_LABEL(index, total)` from `defaults/`, no document text) only while the `overflowing` set the handlers carry names it, A11Y-003 and A11Y-004), `index.ts` (the pure surface; it does not re-export `render.ts`); the ESLint rules R1 to R5 of D-06 with a `linterOptions: { noInlineConfig: true }` block for `packages/*/src/**` (the main config has none today), R2 and R3 appended to `elementSyntaxRestrictions` in `eslint-rules/index.mjs` (R2 now only the four member calls `render`, `renderInline`, `renderToken` and `renderAttrs` and the `.renderer` access, repo-wide, exactly as `contracts/gates.md` R2 (no `render*` glob: existing code such as `this.renderNode(...)` must stay clean, PLAN-FRESH4-012); the `.set`, `.use`, `.enable`, `.disable` selectors are dropped), R1 (`sk/markdown-it-import-home`) and R4 (`sk/markdown-template-attributes`, clause (a) only under `logic/markdown/**`; element non-story files take the attribute allowlist and the named-binding list; `*.stories.ts` and `fixtures.ts` excluded by glob) as dedicated local rules with their own ids, and the self-test `gates/markdown-lint.selftest.ts` (table-driven: one violating, one clean and one leak case per rule, with a guard that exactly five rules are exercised, and the story-versus-`render.ts` case of FRESH-001; run by `test:no-io`, a named edit of the root `package.json`); the **hostile-corpus test** `test/markdown-corpus.test.ts` (browser mode: a CSP `<meta http-equiv="Content-Security-Policy" content="img-src 'none'; frame-src 'none'; object-src 'none'">` inserted in THIS test file's document before rendering, with a `securitypolicyviolation` listener that fires without network and a positive control (a hand-built `<img src="http://example.invalid/x.png">` triggers it); renders each entry into a container and walks the whole subtree with `walkAllowed` (open shadow roots, the visited count asserted above 0 and, for valid documents, equal to the count the model twin derives from the model), asserts a timing ceiling per entry measured in Chromium (hard ceilings, best of three after a warm-up, TEST-008), asserts activation of every link emits nothing or the one expected event, asserts no `href`; the structural walk (assertions 1 and 3) is the stated proof of NFR-005 and the CSP listener is corroboration) plus its model twin and the walker's own self-test; the bundle-budget test `scripts/bundle-budget.test.mjs` (node:test under `scripts/`, run by `test:scripts`, building `parse.ts` with the root `vite` programmatic `build`), S-A0 step two (re-measure the real `parse.ts` chunk and the Chromium corpus timings; the ceilings are the spec numbers, 500 ms and 200 ms; a multiplier exists only as amendment A-10, proposed with the S-A0 step two figures and PENDING CP-1; the default is none); **plants** (`contracts/gates.md`): (a) link destination into an `href`, (c) an `<img src>` for the image node, (d) a `.innerHTML=${text}` property binding, all `unit-tests` with the token `corpus escape`; (b) `DOMParser` and (e) the property binding, both `eslint` with `markdown-renderer: R3` and `markdown-renderer: R4`.
- **Relevant requirements**: FR-005, FR-006 to FR-010, FR-044, C-014, NFR-005, NFR-006, NFR-012, NFR-013, SC-003.
- **Affected surfaces**: `src/logic/markdown/render.ts` and `index.ts`, `test/markdown-corpus.test.ts` and its model twin, `test/support/walk-allowed.ts` and its self-test, `eslint.config.mjs` and `eslint-rules/**` (rules R1 to R5), `gates/markdown-lint.selftest.ts`, `gates/plants/**`, `scripts/bundle-budget.test.mjs`, root `package.json` (the named edits to `test:no-io` and `test:scripts`), `.github/workflows/ci.yml` (the `unit-tests` proof-leg timeout only).
- **Exit checks**: `pnpm test:terminology` green; corpus green; each plant red then green; each ESLint rule has a violating, a clean and a leak case, and an `eslint-disable-next-line` above a banned construct still reports; **`pnpm lint` green on the unchanged base** (no existing code, including `Map.set` calls, trips a new rule); a clean `pnpm test` prints no `corpus escape`; `pnpm lint:no-io && pnpm test:no-io` green; the CSP positive control fires and the corpus fails if the listener is detached; the bundle budget and the Chromium corpus ceilings cite the S-A0 re-measurement; the unit-tests suite wall time measured (clean plus three planted runs) and the `unit-tests` proof-leg timeout in `ci.yml` re-derived in this WP; `pnpm gate-proof --only unit-tests` and `--only eslint` green by the orchestrator.
- **Depends on**: IC-03. **Risks**: R-07 (corpus completeness: a reviewer adds entries from the OWASP markdown XSS list and the CommonMark spec edge cases and records the source list in the WP report), R-08 (the allowlist test passes vacuously on an empty render: every entry also asserts its expected visible text and a visited-element count above 0).

### From `plan.md`: shared-file rows that name IC-04

| File | Writer | Everyone else |
|---|---|---|
| `src/defaults/**`, `src/logic/**` (including `logic/markdown/**`) and their tests | IC-02 (defaults, non-markdown logic, `vocabulary-homes.test.ts`), IC-03 (`logic/markdown/{parse,model,links,budget}.ts`), IC-04 (`logic/markdown/render.ts`, `index.ts`, corpus, `test/support/walk-allowed.ts`) | a gap is a change request |
| `eslint.config.mjs`, `eslint-rules/**`, `gates/markdown-lint.selftest.ts` | IC-04 (rules R1 to R5, the `noInlineConfig` block, the local rules R1 and R4, the self-test and its leak cases), IC-06a (the options schema of rule R4 for the element files and the EMPTY named list with its leak cases; E-27 `classOnly` overrides, E-26 raw-button allowance if S-A5 rules it, and the `calculateConfigForFile` case that every override keeps R1 to R5) and IC-06b (ONLY the reviewed named list of rule R4 for the element files, DERIVED from the stubs and the part signatures it writes, each name with a one-line reason; PLAN-FRESH3-005 (b)). A name a later Work Package needs that the list lacks is a stop and a change request to the orchestrator, not an edit | none |
| `gates/plants/**` | IC-04 (five plants) | none |
| `package.json` (root), `.github/workflows/ci.yml` | IC-11, except the named edits: IC-01a needs no `test:contract` edit (the script is a glob that already matches new test files); IC-01b adds `markdown-it` to `packages/mission-ui/package.json` and the lockfile; IC-04 adds `gates/markdown-lint.selftest.ts` to the `test:no-io` script, `scripts/bundle-budget.test.mjs` to `test:scripts` and re-derives the `unit-tests` proof-leg timeout in `ci.yml`; IC-11 adds `scripts/artifact-story-catalogue.test.mjs` to `test:scripts` and re-derives the other timeouts; IC-02 adds its test files if the globs need it | change request |
| `scripts/bundle-budget.test.mjs` | IC-04 | none |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-4** (`FR-005`, `NFR-009`; ACCEPTED): the lint rule set is named (D-06, R1 to R5; R2 reshaped by PLAN-CORRECT-001 (b), R4 by PLAN-FRESH-001 (a)) and the `data-driven` gate learns `ArtifactKind` and the seven refusal codes from schema enums (D-11), which the spec left to this plan.

- **A-8** (`N-Q12`, `FR-007`, `EV-2`; PROPOSED amendment to N-Q12, decided at CP-1; it is NOT a clarification that changes no ruling). It is TWO separately rejectable parts; the host obligation is neither.
  - **A-8a (layer 1)**: markdown-it's default `validateLink` turns `javascript:`, `vbscript:`, `file:` and non-image `data:` destinations into LITERAL TEXT (the paragraph shows the raw `[x](...)` source, with no inert link and no `title`), where N-Q12 says "inert text with the destination in `title`". Written in IC-03 (link table, the `[x](javascript:1)` yields-no-`link_open` test) and IC-04 (corpus entries whose expected text is the literal source). IF REJECTED, the literal N-Q12 stands: the stuck point is the one line `md.validateLink = () => true` inside `parse.ts` (the instance is still never exported, so R1, R2 and the export-shape test are untouched); the blocked schemes then reach `classifyLink`, whose row 7 already returns inert, and the renderer draws the inert span with the destination in `title`; the layer-1 test flips to "a `link_open` exists and is classified inert, with no `href`", and the corpus expectations change from the literal source to the link text. Cost: one line, one test and the corpus expectations, all inside IC-03 and IC-04 files; no other WP is touched. The defence in depth is then `classifyLink` plus the walker (R4, the structural test), which the plan states as the accepted loss.
  - **A-8b (three narrowings)**: of an absolute link that N-Q12 would send as `sk-open-link`: a `mailto:` with a query or fragment (row 6), an authority with userinfo (`@`, row 5) and a destination over 2048 characters (row 1) are inert; an external link carries its truncated destination in `title`. Each narrowing is individually rejectable: a rejected one reverts its own table row and unit rows to N-Q12's literal wording (the destination is sent as `sk-open-link` and the host obligation covers it); the other two stay.
  - Until CP-1 the plan, the link table and the corpus are written to A-8a and A-8b as proposed. The sentence of `EV-2` in `spec.md` was REVERTED (done, commit of the operator's rulings). The HOST OBLIGATION stays a contract obligation in `contracts/sk-artifact-screen.md` and in the `@fires` text of `sk-open-link` whatever CP-1 decides (the `href` is untrusted; the host re-validates the scheme, never navigates its window to it, and shows the destination first). If A-8 is approved (in whole or in part), the orchestrator writes the EV-2 sentence back.

- **A-10** (`NFR-006`; PROPOSED only if S-A0 step two shows a need, PENDING CP-1): the spec numbers (500 ms, 200 ms) ARE the gate ceilings, with NO multiplier. A multiplier on any ceiling is allowed ONLY as this numbered amendment, which IC-04 reports with its S-A0 step two figures (best of three, Chromium) and the operator decides at CP-1; until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale. The default is no multiplier, and no amendment is written if the headroom is about 2x or more.

### From `contracts/`: what this work package is held to (verbatim)

#### Test obligations of IC-04 (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-04: the corpus (structural walk as the proof of NFR-005, CSP `securitypolicyviolation` corroboration with its positive control), the `walkAllowed` self-test, the five plants, the lint self-test (including a story with `.listing=${x}` clean and the same text in `render.ts` reported), `pnpm lint` green on the unchanged base.

#### Plants and renderer lint rules (`contracts/gates.md`)

#### Plants (new: five, in the plant arrays of two gates)

| Gate | Plant | Expect |
|---|---|---|
| `unit-tests` (a) | an anchored edit of `logic/markdown/render.ts` so a link node's destination is written into an `href` attribute | the corpus test fails with `corpus escape` |
| `unit-tests` (c) | an anchored edit of `render.ts` so the image node emits `<img src=${destination}>` | `corpus escape` (the element allowlist, assertion 1) |
| `unit-tests` (d) | an anchored edit of `render.ts` adding a property binding `.innerHTML=${text}` to a paragraph | `corpus escape` (assertions 1 to 3) |
| `eslint` (b) | an anchored edit adding `new DOMParser()` to a file under `logic/markdown/` | `markdown-renderer: R3` |
| `eslint` (e) | an anchored edit adding `.innerHTML=${text}` as a property binding to a template in `render.ts` | `markdown-renderer: R4` |

Together the three `unit-tests` plants prove the three mutations NFR-012 names (a raw HTML path, an `href`, an `img`). Each plant is an array entry in the gate's `plant.json` (the `unit-tests` and `eslint` files are single objects today and become arrays; `loadPlants` accepts both) with the gate's existing `ciCommand`; `gate-proof coverage` stays satisfied (plants per gate id, no new id). `runLeg` requires every plant token to be ABSENT from the clean run: `corpus escape` is a constant used only inside the failing assertion message (never in a title or a console line), and IC-04 has an exit check that a clean `pnpm test` prints no `corpus escape`. The `unit-tests` leg now runs the full suite four times (clean plus three planted); IC-04 measures the suite's wall time and re-derives the `unit-tests` proof-leg timeout in `ci.yml` (10 minutes today) in the same commit, a named edit of IC-04 (not IC-11). The existing eslint plant (`plantEslintUnused`) stays untouched as the first array entry.

#### Lint rules for the renderer (research D-06; IC-04)

Every message begins `markdown-renderer: R<n>` (so a plant can name the literal). Rules apply to `packages/*/src/**`; tests are out of scope; `linterOptions: { noInlineConfig: true }` is set in an `eslint.config.mjs` block covering `packages/*/src/**`. The main config has NO `noInlineConfig` today (only `eslint.no-io.config.mjs` and `eslint.data-driven.config.mjs` set it), so without that block one `eslint-disable-next-line` above a banned construct silences every rule; grep finds no `eslint-disable` in `packages/` at plan time, so nothing existing breaks. A leak case in the self-test: an `eslint-disable-next-line` above a banned construct still reports.

- **R1** `markdown-it` importable only by `src/logic/markdown/parse.ts`: a dedicated local rule (its own rule id, `sk/markdown-it-import-home`, in `eslint-rules/`) that reports an `ImportDeclaration` (including `import type`), an `ExportNamedDeclaration` or `ExportAllDeclaration` with a source, an `ImportExpression` and a `require(` call whose specifier is `markdown-it` or starts with `markdown-it/` (covers `markdown-it/browser`), in every file except the single path in its rule option. It is NOT `no-restricted-imports`: the base config's block for `packages/*/src/elements/**/*.ts` already sets `no-restricted-imports` (the story-support ban) and, in flat config, a later block replaces the option array of an earlier one, so an element file would escape an R1 written in that rule; and it is NOT a `no-restricted-syntax` selector, which every per-file override replaces. The exemption is the rule option, not a `files` override. Leak plant: an import in `model.ts`; a second leak case: an import in an element file.
- **R2** no `render`, `renderInline`, `renderToken`, `renderAttrs` member call and no `.renderer` access in `packages/*/src/**` (repo-wide: grep at plan time finds none of them, so nothing collides). The `.use(`, `.enable(`, `.set(` and `.disable(` selectors are NOT part of the rule (PLAN-CORRECT-001 (b), ruled 2026-10-06): a name-based selector cannot tell a markdown-it instance from a `Map`, and `Map.set` is called in merged code (`sk-shell-tree.ts`, `logic/summary.ts`); a glob would silently miss a newly added file. The guarantee is STRUCTURAL: `parse.ts` exports `parseTokens(source)` only and never the instance, R1 confines the `markdown-it` import to `parse.ts`, and an export-shape test (IC-03) asserts that `parse.ts` has exactly one export, so without an instance there is nothing to configure anywhere else. IC-04's exit check includes `pnpm lint` green on the unchanged base files.
- **R3** no `DOMParser`, `createContextualFragment`, `setHTML`, `insertAdjacentElement`, `Range`, `document.createElement('template')`, `.innerHTML` or `.outerHTML` in any use (the existing `unsafeHTML`, `unsafeSVG`, `unsafeStatic` and assignment rules stay). Grep at plan time finds none of these in `packages/*/src`.
- **R4** a dedicated local rule (its own rule id, `sk/markdown-template-attributes`, in `eslint-rules/`), an ALLOWLIST and not a denylist, over every `html` template under `logic/markdown/` and the NON-STORY files of `elements/sk-artifact-screen/` (`*.stories.ts` and `fixtures.ts` are excluded by glob; they bind properties by design, as every existing screen story does). It tokenises each template's static chunks (a small tag and attribute state machine, not a whitespace-prefixed regex) and reports (a) under `logic/markdown/**` ONLY, any binding whose name starts with `.` or `?` (property and boolean bindings: `.innerHTML=${x}`, `.href=${x}`, `.srcdoc=${x}`, `?href=${x}`); in the element files a property or boolean binding is allowed only BY NAME from the reviewed list in the rule options (the same list that holds the structural attribute names, each with a one-line reason, for example `?disabled` on an inert control), and `.innerHTML`, `.outerHTML`, `.href`, `.src`, `.srcdoc` and `.style` are never on it; (b) any attribute name, case-insensitively, regardless of whitespace or quoting before it (`HREF =`, `role="link"href=`, `xlink:href=`), that is not in the allowlist: for `logic/markdown/**` the contract's attribute list (`role`, `tabindex`, `title`, `scope`, `start`, `data-align`, `data-md`, `aria-label`, `aria-hidden`) plus the listener names `@click` and `@keydown`; for the element files that list plus the structural names IC-06b records in the rule options, derived from the stubs and part signatures it writes, each with a one-line reason (the rule fails on any other name; a name a later Work Package needs is a change request to the orchestrator, not an edit by that Work Package; `href`, `src`, `srcset`, `srcdoc`, `style` and `on*` are never on it). Being its own rule id, no per-file override of `no-restricted-syntax` (E-26, E-27) can replace it. IC-04 owns the rule and its `logic/markdown/**` options; IC-06a lands the options schema for the element files and the EMPTY list with the leak cases; IC-06b owns the element-file list, derived from the stubs it writes (PLAN-FRESH3-005 (b)).
- **R5** no `import(` and no `new URL(` under `logic/markdown/`.

Carrying the rules through the overrides: every existing per-file exception re-declares `no-restricted-syntax` as `...withoutClassBan` plus `classOnly`, which REPLACES the earlier block's array, and the elements block re-declares `no-restricted-imports`. Therefore the R2 and R3 entries are appended to `elementSyntaxRestrictions` in `eslint-rules/index.mjs` (so `withoutClassBan` carries them into every override), while R1 (`sk/markdown-it-import-home`) and R4 (`sk/markdown-template-attributes`) are their own rule ids, set once in a block for `packages/*/src/**`, and no override of `no-restricted-syntax` or `no-restricted-imports` can replace them. IC-06a adds a case (a named addition to `gates/markdown-lint.selftest.ts`) that calls `ESLint.calculateConfigForFile` for every overridden screen file (`inspector-parts.ts`, `state-parts.ts`, `refusal-parts.ts`, `tab-parts.ts`) and for one `elements/**` file, and asserts every R1 to R5 rule and message is still present.

Self-test (`gates/markdown-lint.selftest.ts`, run by `pnpm test:no-io`): table-driven, per rule one violating, one clean and one leak (inline disable) case; for R4 the violating cases `.innerHTML=${x}`, `.href=${x}`, `?href=${x}`, `HREF =`, `role="link"href=` and the clean case of an allowed attribute; IC-06a's cases: the schema accepts the empty element list and refuses `href`, `src`, `srcset`, `srcdoc`, `style`, `on*` and `.innerHTML` as entries; IC-06b's case asserts that every structural attribute name and every named binding IC-06b records in the R4 options for `elements/sk-artifact-screen/**` is present with its one-line reason and that `href`, `src`, `srcset`, `srcdoc`, `style`, `on*` and `.innerHTML` are absent from the options; one pair of cases proves clause (a) is scoped (PLAN-FRESH-001 (a)): a story file containing `.listing=${x}` is clean while the same text in `render.ts` is reported, and the same text in a non-story element file is reported unless its name is on the reviewed list; a guard asserts exactly five rules and their ids are exercised, so a rule silently removed turns the file red.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q1, operator ruling 2026-10-06.** **Markdown rendering.** #5 ruled "no markdown rendering in the Work Package screen; the host decides". Here rendering is the point. Ruling: the screen renders with `markdown-it` (`html: false`), turned into Lit templates from its token stream, so there is no `innerHTML` or `unsafeHTML` at all. Links never navigate (relative artifact links and external links emit events), images are not loaded (alt text and a link), tables scroll inside their own box, and any throw falls to the AV-05 fallback. If a later need forces HTML output, it goes through DOMPurify with a fixed allowlist first. The library is a new runtime dependency, approved; the hostile-corpus test is the gate.
- **N-Q12, operator ruling 2026-10-06.** **Links inside markdown.** A relative destination that resolves (against the open artifact's directory, never above the Mission root) to a path in the listing emits `sk-select-artifact` `{ missionId, path, kind }`; an absolute `http`, `https` or `mailto` link emits `sk-open-link` `{ href }`; everything else (fragment-only, `javascript:`, `data:`, `file:`, `vbscript:`, a relative path not in the listing, a malformed one) is inert text with the destination in `title`.

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1.
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1).
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1).
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before.
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided.

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1.

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

## Test strategy and test quality rules (verbatim)

From #4 `research.md` D-34 (rules 1 to 5; rule 6 is #4's 500-Mission test and does not apply):

**Test quality rules (binding; stated in every WP brief, checked by every reviewer).** The charter wants every event and its payload asserted; these rules make a test fail when the behaviour is reverted instead of passing vacuously:

1. Every no-event test carries a positive control in the same test: the same listener, on the same target, receives an event when a sibling action that does emit is performed (a listener on the wrong target or a misspelt event name cannot make "emits nothing" pass).
2. Every emit test asserts exactly one event (`events.length` equal to 1, so a library `click` bubbling beside the screen's own would show), `bubbles` and `composed` true, `cancelable` false, and the detail with deep equality (`toEqual`, not `toMatchObject`).
3. Counts are asserted with equality (3 and 7 phases, five columns, 22 fixtures, 118 stories against 118 baselines), never "at least". Every loop over fixtures, stories or items asserts that the loop ran the expected N times.
4. Every changed behaviour has a revert check: the WP report lists, per test file, one deliberate revert of the behaviour (a temporary local edit in the work-package worktree, never committed), the failing test name it produced, and the restore; the reviewer re-runs two of them.
5. The C-009 terminology check is a node test with a known-positive sample so it can fail (`scripts/terminology.test.mjs`, owned by IC-09; run by `pnpm test:scripts`, which is wired into the `hygiene` gate under ruling P-9, exception E-06); it scans `packages/*/src` source text and this mission's reader-facing guide `quickstart.md` (a docs line is how the word survived a source-only scan) for the word "feature" (case-insensitive, whole word; the spec, plan and decision records are not scanned because they quote the rule and the spec's own future-work prose) and its own test feeds a sample containing the word and requires a hit.

Reading note for rule 5 (not part of the quotation): "IC-09" and "this mission" there are #4's plan and mission. In this mission the terminology check is the existing `pnpm test:terminology` (`scripts/terminology.mjs` and its test), owned by no work package here and run as an exit check by every work package that writes under `packages/*/src`.

From this mission's `research.md` D-19:

#### D-19 Test strategy (D-34 of #4)
The package's vitest runs in Chromium only (`packages/mission-ui/vitest.config.ts`: browser mode, one chromium instance), so every file under `packages/mission-ui/test/` is a browser test: the pure model and logic are tested there too (the "model twin" is the same assertions run on the model without mounting a screen, in the same Chromium project), the screen, the corpus walk and the interaction tests use `page.viewport` first. Tests that need the file system or a bundler are `node:test` files under `scripts/`, run by `pnpm test:scripts` (the `hygiene` gate): the bundle budget (IC-04) and the row-to-story test (IC-11); #5's `scripts/wp-story-catalogue.test.mjs` is the model for the latter, but on #5's tip it runs under `test:terminology` (`node scripts/terminology.mjs && node --test scripts/terminology.test.mjs scripts/wp-story-catalogue.test.mjs scripts/visual-tags.test.mjs`), which CI does not run, so this mission deliberately places `scripts/artifact-story-catalogue.test.mjs` in `test:scripts` (run by the `hygiene` gate) so that CI runs it: a new CI behaviour, not precedent (PLAN-FRESH4-010); source scans use `import.meta.glob('../src/**/*.ts', { query: '?raw' })` in browser mode, as `defaults.test.ts` does with the contract YAML (PLAN-TEST-001 (b) plus (c), ruled 2026-10-06; the `unit-tests` gate command is unchanged). IC-01b checks that the root `vite` programmatic `build` is importable. No assertion on a class name; every event test has a positive control (the same interaction with a deliberately wrong precondition emits nothing, or the other event); every "no X" test is paired with a test that X appears in a control rendering (R-08); revert checks per test file; no `setTimeout` waits (`updateComplete`).

Request absence (PLAN-TEST-003 (a)): the structural walk (no `img`, `src` or `href`, assertions 1 and 3 of the corpus) is the stated proof of NFR-005. A `<meta http-equiv="Content-Security-Policy" content="img-src 'none'; frame-src 'none'; object-src 'none'">` is inserted in the corpus test file's document before rendering, with a `securitypolicyviolation` listener (it fires without a network), and a positive control: a hand-built `<img src="http://example.invalid/x.png">` triggers the listener. The meta applies to the corpus test file only, because a meta CSP cannot be removed for the document. A resource-timing observer is NOT used (it cannot see pending or `data:` requests).

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier is allowed ONLY if proposed as the numbered amendment A-10 (`plan.md`), reported by IC-04 with its S-A0 step two figures (the real `parse.ts` chunk and the corpus in Chromium) and decided at CP-1 (PENDING CP-1); until the operator rules, a test over the spec numbers that fails is a finding, not a trigger to scale, and none is written before the measurement.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1; before CP-1 every entry is PROPOSED and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)

- `package.json` (root): the `test:no-io` and `test:scripts` entries only (named edit)
- `.github/workflows/ci.yml`: the `unit-tests` proof-leg timeout only

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP04. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP05 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

## PR shape and standing rules (verbatim from `plan.md`)

Reading of the charter: the plan-phase squad runs once after this phase; the aggregate review squad before the draft PR is the operator's standing wrap-up rule (charter 046), report-only, over the implementation diff. ONE pull request, opened only after: accept, test cleanup, the aggregate squad, compaction of history into named slices, rebase onto `main`, full gate re-run, and the operator's Storybook review after the last WP and before wrap-up; then the DRAFT PR. Work packages never push and never open pull requests. Compaction slices, named in advance: contract re-vendor and fixtures (IC-01a); markdown-it dependency and supply-chain record (IC-01b); defaults, logic and gate cases (IC-02); markdown model (IC-03); markdown renderer, corpus, lint rules and plants (IC-04); exceptions, Stylelint grant and lint configuration (IC-06a); skeleton, layout and surface freeze (IC-06b); document pane (IC-07); refusals and states (IC-08); inspector, tree and Work Package links (IC-09); tiers, accessibility and edge cases (IC-10); integration and baselines (IC-11). There is no spike slice: the IC-05 spike code is deleted by a named final commit (`chore(ic-05): remove spike code`), as #5 did. **The PR description names the new runtime dependency** (`markdown-it` 15.0.2, MIT, the licences of its transitive set as printed by `pnpm why markdown-it`, the advisory check re-run at wrap-up against the repository list and the global database (six advisories at plan time), the measured bundle figure and the hostile-corpus evidence, FR-043). Every WP brief states: the word `feature` (whole word, any case) is forbidden in `packages/*/src`, story titles, doc comments, fixture content and corpus text (C-009; the identifier `contentFeatures` is safe, the prose around it is not), and every WP that writes under `packages/*/src` (IC-01a, IC-02 to IC-04, IC-06b, IC-07 to IC-11) runs `pnpm test:terminology` as an exit check (CI first sees a red tree only on the PR run, after compaction); no sub-agents; no push; baselines only inside the pinned container; `pnpm visual` is not an exit check before IC-11; no absolute path or username in any committed file (use `<repo>`, `<prototype>`); a denied command means stop and report; the test-quality rules of #4 D-34 and the drift register status are copied in.

## Hard rules (every work package in this mission)

- No sub-agents or forks; do this work package yourself.
- A command that is DENIED means stop and report the exact text; never retry it another way, never pattern-kill processes, never `git stash`, never `git rebase`, never `rm` with variable globs. Keep `core.bare` false.
- No absolute home paths or usernames in any committed file (use `<repo>`, `<prototype>`, `<elements>`); `pnpm hygiene` before committing.
- Visual baselines are generated ONLY inside the pinned container and ONLY in WP13 (`pnpm visual:update` through `scripts/visual.sh`, which fails rather than skips); Read every new PNG and describe it in the hand-off; never hand-edit or copy a PNG.
- Source syntax stays compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no 5.5+ features. Generated files only through their generator (`pnpm contract:generate`, `pnpm manifest:generate`); a merge conflict in a generated file is resolved by regeneration, never by hand.
- No I/O in screens or pattern elements; project CSS is layout only with `--sk-*` tokens and `%`/`fr` (rem in container queries); every UI primitive the design library provides is rendered with its `sk-*` element (Elements over CSS); a missing primitive is recorded as a gap (`research.md` G-nn), never hand-rolled outside the ruled exceptions.
- Screens do no arithmetic on contract values (C-004); no kind, lane, phase or refusal-code literal outside `defaults/` (C-007); document text never becomes markup, a URL, a style or a selector (C-014).
- Never call status `materialize()`; never hand-edit spec-kitty state, `lanes.json`, `status.json`, `owned_files` or WP dependencies (all tool-owned).
- `tracer-*.md`, `spec.md`, `plan.md`, `research.md` and `contracts/` are orchestrator-owned: report spike outcomes, decisions and friction in the hand-off.
