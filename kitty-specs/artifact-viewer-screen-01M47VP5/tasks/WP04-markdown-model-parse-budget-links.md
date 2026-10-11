---
work_package_id: WP04
title: 'Markdown model: parse, budget and links (IC-03)'
dependencies: [WP03]
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- C-014
- NFR-006
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T10:33:28.652353+00:00'
subtasks:
- T021
- T022
- T023
- T024
- T025
- T026
phase: Phase 1 - Foundation
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/
create_intent:
- packages/mission-ui/src/logic/markdown/parse.ts
- packages/mission-ui/src/logic/markdown/model.ts
- packages/mission-ui/src/logic/markdown/links.ts
- packages/mission-ui/src/logic/markdown/budget.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/logic/markdown/parse.ts
- packages/mission-ui/src/logic/markdown/model.ts
- packages/mission-ui/src/logic/markdown/links.ts
- packages/mission-ui/src/logic/markdown/budget.ts
- packages/mission-ui/test/markdown-parse*.test.ts
- packages/mission-ui/test/markdown-model*.test.ts
- packages/mission-ui/test/markdown-links*.test.ts
- packages/mission-ui/test/markdown-budget*.test.ts
- packages/mission-ui/test/markdown-source*.test.ts
role: implementer
---

# Work Package Prompt: WP04 - Markdown model: parse, budget and links (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Build the pure, lit-free markdown model: `parse.ts` (the only `markdown-it` importer, exporting `parseTokens` only), `budget.ts`, `model.ts` (`buildMarkdownModel`) and `links.ts` (`classifyLink`, `resolveLinks`), with their tests. `render.ts` and `index.ts` of that directory are IC-04's (WP05).

## Context

Security design: document text is data (C-014). A throw, a budget overrun or an unknown token always ends as `{ kind: 'fallback' }`, never a thrown error out of `buildMarkdownModel`. The link table is written to the N-Q12 rule with the PROPOSED amendments A-8a and A-8b as written in the plan (decided at CP-1; each is separately revertable and the revert instructions are in the plan text below). Test file names under `test/markdown-*` are fixed by this task breakdown to keep ownership disjoint: this WP uses the prefixes `markdown-parse`, `markdown-model`, `markdown-links`, `markdown-budget` and `markdown-source`; WP05 owns `markdown-corpus*` and WP09 owns `markdown-corpus.screen`.

Read first: `plan.md` section "IC-03" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-03. Requirements: FR-005, FR-006, FR-007, FR-008, FR-009, C-014, NFR-006.

## Subtasks

### Subtask T021: `parse.ts`: the single markdown-it importer

**Steps**:
1. Build the instance once from the option table of `contracts/markdown-renderer.md` (`html: false`, linkify off, typographer off, plugins off). Export `parseTokens(source)` and NOTHING else, never the instance (CORRECT-001 (b)).
2. Provide a counted-spy seam that tests can use to count `parseTokens` calls (the parse-count test the cache and NFR-006 rely on), without exporting a second symbol from `parse.ts`.

**Files**: `src/logic/markdown/parse.ts`

**Validation**: export-shape test: exactly one export, `parseTokens`

### Subtask T022: `budget.ts`

**Steps**:
1. Pre-parse guards `maxSourceChars` and `maxLineChars`; post-parse `maxTokens`, `maxDepth`, `maxNodes`, `maxTableCells`, `maxTextRun`; all values read from `defaults/markdown.ts`; counted over the FLATTENED token stream, inline children included, before the model recursion (R-05, R-06).

**Files**: `src/logic/markdown/budget.ts`

**Validation**: a document at exactly `maxDepth` is accepted, one level deeper falls back

### Subtask T023: `model.ts`: `buildMarkdownModel`

**Steps**:
1. `buildMarkdownModel(source: string, budget?: MarkdownBudget): MarkdownResult`; the budget is the vocabulary's member with `MARKDOWN_BUDGET` as default.
2. The token stream to the closed node model by the token-to-node table; each table node carries its integer position (`index`, `total`) in the document; an unknown token type throws `MarkdownUnsupported` internally and the result is `{ kind: 'ok', blocks } | { kind: 'fallback', reason }`.
3. Also export `markdownFor(content: ArtifactContentView | null): MarkdownResult | null` from `model.ts` (moved here from WP03 by the operator's ruling on analyze A1, option (A)): `null` unless `content.mediaType` equals `MARKDOWN_MEDIA_TYPE` (the vocabulary's media-type member, default from `defaults/`), else `buildMarkdownModel(content.content)`; the screen compares no media type. Tests with and without an explicit `vocabulary`, the with-and-without-`vocabulary` case of the budget, and a type-level case that `MarkdownResult` satisfies WP03's structural `{ kind: 'ok' | 'fallback' }` seam.

**Files**: `src/logic/markdown/model.ts`

**Validation**: no throw escapes `buildMarkdownModel` for any corpus input

### Subtask T024: `links.ts`: N-Q12 in two layers

**Steps**:
1. `classifyLink(destination, openPath, kindOf)` and `resolveLinks`: layer 1 is markdown-it's `validateLink` (blocked schemes yield no `link_open`, A-8a as proposed); layer 2 is the exact table of `contracts/markdown-renderer.md` (internal resolves against the open artifact's directory, never above the Mission root, to a path in the listing; absolute `http`, `https`, `mailto` external; everything else inert), with the A-8b narrowings as proposed (mailto with query or fragment, userinfo, destination over 2048 characters are inert; an external link carries its truncated destination in `title`).
2. Keep each A-8 part separately revertable as the plan text describes (A-8a is one line in `parse.ts`: `md.validateLink = () => true`).

**Files**: `src/logic/markdown/links.ts`

**Validation**: the link-table test of this WP

### Subtask T025: Tests (red first)

**Steps**:
1. Link table: every row of N-Q12 including `javascript:`, `JaVaScRiPt:`, `data:`, `vbscript:`, `file:`, `//host`, `\\host`, control characters, `..` above the root, percent-encoded `..`, fragment-only, mailto, http with no host, userinfo, an over-long destination, a space in a decoded path, empty segments, a trailing slash, double encoding.
2. `[x](javascript:1)` yields no `link_open`; depth, token and line-length cases land in `fallback`; the depth test uses nested INLINE emphasis (matched alternating emphasis, strong and strike, 25 and 40,000 deep) and 60,001 inline tokens in one paragraph, not only nested block quotes.
3. Expected branch pinned per fixture: `makeLargeMarkdown` resolves to `{ kind: 'ok' }` with a block count above 0; `makeOverBudgetMarkdown` to `fallback` with reason `budget`.
4. Export-shape test for `parse.ts`; the counted `parseTokens` spy test.

**Files**: `test/markdown-parse*.test.ts`, `markdown-model*.test.ts`, `markdown-links*.test.ts`, `markdown-budget*.test.ts`

**Validation**: every test has a positive control; counts asserted with equality

### Subtask T026: Source-scan test and gates

**Steps**:
1. A source-level test in browser mode (`import.meta.glob(..., { query: '?raw' })`) that `markdown-it` is imported by `parse.ts` alone and that no file calls `.render(` or `.renderInline(` (also enforced by lint in IC-04).
2. Run `pnpm test:terminology`, `pnpm test`, `pnpm lint:no-io && pnpm test:no-io` and the data-driven pair on the new directory.

**Files**: `test/markdown-source*.test.ts`

**Validation**: all gates green on `logic/markdown/`

## Acceptance (all runnable)

1. `pnpm test:terminology` green.
2. Test files for each module exist and are listed in `pnpm test` output.
3. The link table, layer-1, depth, line-length, pinned-branch, export-shape, parse-count and source-scan tests green, each with its positive control.
4. `pnpm lint:no-io && pnpm test:no-io` and the data-driven pair green on the new directory.
5. `git status --short` empty after the commit; the diff touches no file outside the owned list.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

R-05 (markdown-it stops BLOCK nesting at its own `maxNesting` and does not cap inline nesting; the model's depth check over the flattened stream is lower, so a truncated or deep parse is always a fallback). R-06 (quadratic shapes: pre-parse guards plus the corpus timing in IC-04).

## Reviewer Guidance

Check the depth test really uses inline nesting. Check `parse.ts` has exactly one export. Check the link rows against N-Q12 and the proposed A-8 text. Check no `lit` import in `logic/markdown/{parse,model,links,budget}.ts`. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-03

#### IC-03 Markdown model (parse, budget, links)
- **Purpose**: `logic/markdown/parse.ts` (the ONLY file that imports `markdown-it`; builds the instance once from the option table of `contracts/markdown-renderer.md`; exports `parseTokens(source)` and NOTHING else, never the instance), `budget.ts` (pre-parse guards `maxSourceChars` and `maxLineChars`, post-parse `maxTokens`, `maxDepth`, `maxNodes`, `maxTableCells`, `maxTextRun`, all read from `defaults/markdown.ts`, computed over the FLATTENED token stream, inline children included, before the model recursion), `model.ts` (`buildMarkdownModel(source: string, budget?: MarkdownBudget): MarkdownResult`, the budget being the vocabulary's member with `MARKDOWN_BUDGET` as default, the token stream to the closed node model by the token-to-node table, each table node carrying its integer position (`index`, `total`) in the document; unknown token type throws `MarkdownUnsupported`; the result is `{ kind: 'ok', blocks } | { kind: 'fallback', reason }`), `markdownFor(content)` (exported from `model.ts`, moved here from IC-02 by the operator's ruling on analyze A1, option (A): `null` unless `content.mediaType` equals `MARKDOWN_MEDIA_TYPE`, else `buildMarkdownModel(content.content)`; its tests, with and without an explicit `vocabulary`, are this WP's, as is the with-and-without-`vocabulary` case of `buildMarkdownModel`), `links.ts` (`classifyLink(destination, openPath, kindOf)` and `resolveLinks`: the N-Q12 rule in two layers, exact, with the unit rows of the contract). All pure, no `lit` import, testable without a DOM (they still run in the package's Chromium vitest: the "model twin" tests are model assertions in the browser project, not a separate environment).
- **Relevant requirements**: FR-005 (model half), FR-006, FR-007, FR-008, FR-009 (budget half), C-014, NFR-006.
- **Affected surfaces**: `src/logic/markdown/{parse,model,links,budget}.ts` and their tests (`test/markdown-*.test.ts`; the model twin and the source-scan tests). No other file (`render.ts` and `index.ts` of that directory are IC-04's).
- **Exit checks**: `pnpm test:terminology` green; `pnpm test` files for each module; the link table (every row of N-Q12 including `javascript:`, `JaVaScRiPt:`, `data:`, `vbscript:`, `file:`, `//host`, `\\host`, control characters, `..` above the root, percent-encoded `..`, fragment-only, mailto, http with no host, userinfo, an over-long destination, a space in a decoded path, empty segments, a trailing slash, double encoding); a test that `[x](javascript:1)` yields no `link_open` (the first layer, markdown-it's `validateLink`); depth, token and line-length cases land in `fallback`, never in a thrown error out of `buildMarkdownModel`, and the depth test uses nested INLINE emphasis (matched alternating emphasis, strong and strike, 25 and 40,000 deep) and 60,001 inline tokens in one paragraph, not only nested block quotes; a document at exactly `maxDepth` renders into the model and one level deeper falls back; the expected branch is pinned per fixture: `makeLargeMarkdown` resolves to `{ kind: 'ok' }` with a block count above 0 and `makeOverBudgetMarkdown` to `fallback` with reason `budget`; an export-shape test that `parse.ts` has exactly one export, `parseTokens` (so no instance can be configured elsewhere, CORRECT-001 (b)); a counted `parseTokens` spy (the parse-count test the cache and NFR-006 rely on); the `no-io` and `data-driven` gates green on the new directory; a source-level test (an `import.meta.glob` with `?raw` in browser mode) that `markdown-it` is imported by `parse.ts` alone and that no file calls `.render(` or `.renderInline(` (also enforced by lint in IC-04).
- **Depends on**: IC-02. **Risks**: R-05 (markdown-it stops BLOCK nesting at its own `maxNesting` and does not cap inline nesting; the model's depth check over the flattened stream is lower, so a truncated or deep parse is always a fallback), R-06 (quadratic shapes; pre-parse guards plus the corpus timing in IC-04).

### From `plan.md`: shared-file rows that name IC-03

| File | Writer | Everyone else |
|---|---|---|
| `src/defaults/**`, `src/logic/**` (including `logic/markdown/**`) and their tests | IC-02 (defaults, non-markdown logic, `vocabulary-homes.test.ts`), IC-03 (`logic/markdown/{parse,model,links,budget}.ts`), IC-04 (`logic/markdown/render.ts`, `index.ts`, corpus, `test/support/walk-allowed.ts`) | a gap is a change request |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-8** (`N-Q12`, `FR-007`, `EV-2`; PROPOSED amendment to N-Q12, decided at CP-1; it is NOT a clarification that changes no ruling). It is TWO separately rejectable parts; the host obligation is neither.
  - **A-8a (layer 1)**: markdown-it's default `validateLink` turns `javascript:`, `vbscript:`, `file:` and non-image `data:` destinations into LITERAL TEXT (the paragraph shows the raw `[x](...)` source, with no inert link and no `title`), where N-Q12 says "inert text with the destination in `title`". Written in IC-03 (link table, the `[x](javascript:1)` yields-no-`link_open` test) and IC-04 (corpus entries whose expected text is the literal source). IF REJECTED, the literal N-Q12 stands: the stuck point is the one line `md.validateLink = () => true` inside `parse.ts` (the instance is still never exported, so R1, R2 and the export-shape test are untouched); the blocked schemes then reach `classifyLink`, whose row 7 already returns inert, and the renderer draws the inert span with the destination in `title`; the layer-1 test flips to "a `link_open` exists and is classified inert, with no `href`", and the corpus expectations change from the literal source to the link text. Cost: one line, one test and the corpus expectations, all inside IC-03 and IC-04 files; no other WP is touched. The defence in depth is then `classifyLink` plus the walker (R4, the structural test), which the plan states as the accepted loss.
  - **A-8b (three narrowings)**: of an absolute link that N-Q12 would send as `sk-open-link`: a `mailto:` with a query or fragment (row 6), an authority with userinfo (`@`, row 5) and a destination over 2048 characters (row 1) are inert; an external link carries its truncated destination in `title`. Each narrowing is individually rejectable: a rejected one reverts its own table row and unit rows to N-Q12's literal wording (the destination is sent as `sk-open-link` and the host obligation covers it); the other two stay.
  - Until CP-1 the plan, the link table and the corpus are written to A-8a and A-8b as proposed. The sentence of `EV-2` in `spec.md` was REVERTED (done, commit of the operator's rulings). The HOST OBLIGATION stays a contract obligation in `contracts/sk-artifact-screen.md` and in the `@fires` text of `sk-open-link` whatever CP-1 decides (the `href` is untrusted; the host re-validates the scheme, never navigates its window to it, and shows the destination first). If A-8 is approved (in whole or in part), the orchestrator writes the EV-2 sentence back.

### From `contracts/`: what this work package is held to (verbatim)

#### Test obligations of IC-03 (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-03: the `parse.ts` export-shape test (exactly one export, `parseTokens`), the counted `parseTokens` spy, the pinned branch per generator (`makeLargeMarkdown` is `ok` with blocks above 0, `makeOverBudgetMarkdown` is `fallback`).

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


The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP03. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP04 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
