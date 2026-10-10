---
work_package_id: WP03
title: Defaults, logic and data-driven extension (IC-02)
dependencies: [WP02]
requirement_refs:
- FR-018
- FR-020
- FR-021
- FR-022
- FR-025
- FR-026
- FR-027
- FR-028
- FR-030
- FR-031
- FR-033
- FR-042
- C-004
- C-007
- NFR-009
- NFR-011
- FR-034
- FR-037
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T08:20:05.047798+00:00'
subtasks:
- T013
- T014
- T015
- T016
- T017
- T018
- T019
- T020
phase: Phase 1 - Foundation
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/defaults/
create_intent:
- packages/mission-ui/test/vocabulary-homes.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/defaults/**
- packages/mission-ui/src/logic/artifact-*.ts
- packages/mission-ui/src/shell-types.ts
- packages/mission-ui/src/shell-icons.ts
- packages/mission-ui/test/artifact-*.test.ts
- packages/mission-ui/test/vocabulary-homes.test.ts
- eslint.data-driven.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
role: implementer
---

# Work Package Prompt: WP03 - Defaults, logic and data-driven extension (IC-02)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Land the five default modules, the nine artifact logic files with unit tests (foreign-value inputs included), the two additive `ShellIcon` glyphs, `test/vocabulary-homes.test.ts` and the extension of the `data-driven` gate to the twelve `ArtifactKind` values and seven refusal codes read from the vendored schema enums.

## Context

IC-02 stays whole (PLAN-DESIGN-019 (b)); each concern has its own exit-check subsection and the reviewer judges each against its own evidence. Every vocabulary word lives in `defaults/` only; no kind, lane, phase or refusal-code literal may appear elsewhere (C-007, NFR-009).

Read first: `plan.md` section "IC-02" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-02. Requirements: FR-018, FR-020, FR-021, FR-022, FR-025, FR-026, FR-027, FR-028, FR-030, FR-031, FR-033, FR-042, C-004, C-007, NFR-009, NFR-011, FR-034, FR-037.

## Subtasks

### Subtask T013: Default modules

**Steps**:
1. Create `defaults/artifact-kinds.ts` (the whole kind table: word and icon per kind; the icon typed `ShellIcon`; IMPORTS `REVIEW_CYCLE_ARTIFACT_KIND` from #5's `defaults/review.ts`, D-12), `artifact-media.ts`, `artifact-refusals.ts`, `artifact-copy.ts` (exports the single `LISTING_MAX_ENTRIES`, 1000, from which `TRUNCATED_NOTE` is built; fixtures import it) and `markdown.ts` (the budget `MARKDOWN_BUDGET`, the bidirectional code points), plus the `defaults/index.ts` re-export.
2. Copy values are provisional until CP-1 (`contracts/defaults.md`); no kind, lane, phase or code literal appears outside these files.

**Files**: `src/defaults/**`

**Validation**: the unit tests of this WP pass; `vocabulary-homes.test.ts` finds each word in exactly its home

### Subtask T014: Two additive `ShellIcon` glyphs

**Steps**:
1. Add the members `magnifier` and `table` to `shell-types.ts` and the paths to `shell-icons.ts`, copied from the prototype (`05-artifact.html:23-24`; magnifier `<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>`, table `<path d="M5 5h14v14H5zM5 10h14"/>`). Additions only (A-5 rejected; no existing member or path edited, so no baseline changes).
2. A unit case renders both new glyphs as decorative inline SVG (`aria-hidden`).

**Files**: `src/shell-types.ts`, `src/shell-icons.ts`

**Validation**: `git diff` shows additions only; existing union members and path strings byte-identical

### Subtask T015: Types, vocabulary and normalisers

**Steps**:
1. `logic/artifact-types.ts`: `ArtifactLabelHooks extends LabelHooks` (the shared `LabelHooks` is NOT edited) and `ArtifactVocabulary` with FIVE groups: the kind table, the Work Package link kinds, the container segment with the token separator, the markdown media type and the budget. `copy` is NOT a member (PLAN-FRESH4-007 (b)); string overrides go through `labels`.
2. A partly filled `vocabulary` is completed PER GROUP against `defaults/`: a present group is used as given, whole, not merged key by key; an absent group takes the `defaults/` value; `{}` equals `null`.
3. `logic/artifact-status.ts`: the normalisers for `status`, `contentStatus` and `view` (unknown value falls to the documented default, never throws).

**Files**: `src/logic/artifact-types.ts`, `artifact-status.ts`

**Validation**: per-group completion cases pass (one group, empty object equals null, a present group not merged)

### Subtask T016: Path helper and tree

**Steps**:
1. `logic/artifact-path.ts`: `splitPath`, `dirOf`, `resolveRelative` behind one `PATH_SEPARATOR`; shared by the tree, the link classifier and the Work Package matcher.
2. `logic/artifact-tree.ts`: pure `buildArtifactTree(entries, ...)` (memoisable on `entries` and `selectedPath`; accepts the host's `expandedIds` Set) and `pathOfArtifactNode`: folders from path segments, file counts at any depth, byte order kept, the selected leaf current, ancestors of the selection open, other folders collapsed (Q9), an unreadable leaf `unavailable: true` with `meta: UNAVAILABLE_TEXT`, and `current` is `''` when the SELECTED leaf is unavailable (PLAN-DESIGN-005). No `spec.md` or `tasks/` literal in the file.

**Files**: `src/logic/artifact-path.ts`, `artifact-tree.ts`

**Validation**: the tree tests of this WP pass

### Subtask T017: View resolver, facts, size, refusal, Work Package matcher

**Steps**:
1. `logic/artifact-view.ts`: `resolveArtifactView` (the total table of `data-model.md`, one test per row; its `markdown` input and the vocabulary budget group are typed STRUCTURALLY in `artifact-types.ts`, `{ kind: 'ok' | 'fallback' }` and the numeric budget record of `defaults/markdown.ts`, so nothing here imports `logic/markdown/`; `markdownFor` is WP04's), `needsHiddenHeading` (one case per pane and tab).
2. `logic/artifact-facts.ts`: `resolveArtifactFacts` (the Modified fact is `resolveActivity`); `artifact-size.ts`: `formatArtifactSize` (the one size-display rule; no other arithmetic on contract values, C-004); `artifact-refusal.ts`: `resolveArtifactRefusal` and `countBidiControls` over the code-point list of `defaults/markdown.ts`.
3. `logic/artifact-wp.ts`: `matchWorkPackage` (N-Q11: the id is a leading token of a path segment under the data-held `tasks/` segment; the segment, without extension, equals the id or starts with the id and the separator; longest id wins; no match returns none). Only the functions that read a vocabulary member take `vocabulary` (`buildArtifactTree` and `resolveArtifactFacts` the kind table, `markdownFor` (WP04) the media type, `buildMarkdownModel` (WP04) the budget, `matchWorkPackage` the link kinds, container segment and token separator); `formatArtifactSize`, `resolveArtifactRefusal` and `countBidiControls` take none (PLAN-FRESH3-004 (b)). A refusal code outside the seven goes through `labels.refusal(code)`, which replaces the eyebrow only.

**Files**: `src/logic/artifact-view.ts`, `artifact-facts.ts`, `artifact-size.ts`, `artifact-refusal.ts`, `artifact-wp.ts`

**Validation**: each function tested with and without a `vocabulary`

### Subtask T018: Unit tests (red first)

**Steps**:
1. `test/artifact-*.test.ts` and `test/vocabulary-homes.test.ts`: tree nesting, counts, byte order, the selected leaf current, ancestors open, unreadable rows, 1000 entries under the NFR-006 bound (best of three after a warm-up), unknown kind, grep test for no `spec.md` or `tasks/` literal; `pathOfArtifactNode` round trip over odd paths; the path cross-check (for every entry of the 1000-entry listing, `resolveRelative` of its own relative name from its directory returns its own path and the tree builds the leaf with the matching id).
2. One test per row of the `resolveArtifactView` table; `countBidiControls` with and without the controls; `needsHiddenHeading` one case per pane and tab; the media-type words appear only in `defaults/artifact-media.ts`, `src/contract/**` and the allow-listed fixtures and stories (`vocabulary-homes.test.ts`).
3. Each test file lists one deliberate revert that fails a named test (D-34 rule 4).

**Files**: `packages/mission-ui/test/artifact-*.test.ts`, `vocabulary-homes.test.ts`

**Validation**: `pnpm test` output lists the new files; positive controls present

### Subtask T019: Extend the `data-driven` gate

**Steps**:
1. `eslint.data-driven.config.mjs`: read `ArtifactKind` from `schemas/ArtifactKind.yaml` and the seven codes from the ENUM of `schemas/ArtifactRefusalCode.yaml` (not the example files); extend #5's merged shape (selector entries, bare words matched only in comparisons); derive every count from the arrays (no literal arithmetic); guards assert exactly 12 kinds and 7 codes.
2. `gates/data-driven.selftest.ts` and `gates/fixtures/data-driven/**`: new positive cases red against the UNCHANGED config; false-positive cases stay green (member-access `item.other`, member-access `item.spec`, an import path segment `contract`, a data attribute containing `contract`; an object-literal KEY of a bare word outside the allow-list is reported, not clean). Write the holes that stay open into the config's Known limitations header (R-04: rename, never silence).

**Files**: `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`, `gates/fixtures/data-driven/**`

**Validation**: `pnpm lint:data-driven && pnpm test:data-driven` green; each new case red without the config change

### Subtask T020: Exit run

**Steps**:
1. `pnpm test:terminology`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, the data-driven pair; confirm `git diff` of the two shell files is additions only and that no existing baseline can change (FR-037).

**Files**: WP report

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green.
2. Defaults and logic: unit tests with positive controls; tree, path, view-table, bidi, hidden-heading and per-group vocabulary cases (the unit-test subtask).
3. Data-driven gate: `pnpm lint:data-driven && pnpm test:data-driven` green; each new case red without the config change; false-positive cases green.
4. Shell icons: `git diff` additions only; both glyphs render decorative inline SVG.
5. `git status --short` empty after the commit.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

R-04 (selector false positives on bare words: rename, never silence).

## Reviewer Guidance

Judge each of the three concerns (defaults and logic, data-driven gate, shell icons) against its own evidence. Check no vocabulary literal outside `defaults/`; no arithmetic on contract values beyond `formatArtifactSize`; `copy` absent from `ArtifactVocabulary`; the per-group completion rule exactly as ruled; the shared `LabelHooks` untouched. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-02

#### IC-02 Defaults, logic and data-driven extension
- **Purpose**: the five default modules (and the `defaults/index.ts` re-export; `defaults/artifact-copy.ts` exports the single `LISTING_MAX_ENTRIES`, 1000, from which `TRUNCATED_NOTE` is built, and the fixtures import it) and the logic of `contracts/defaults.md` with unit tests (foreign-value inputs included): `artifact-types.ts` (`ArtifactLabelHooks extends LabelHooks`; the shared `LabelHooks` is not edited; the `ArtifactVocabulary` type of the one optional `vocabulary` property, DESIGN-022, whose default is the `defaults/` values; a partly filled `vocabulary` is completed PER GROUP against `defaults/` (PLAN-FRESH3-004 (b)): the five groups are the kind table, the Work Package link kinds, the container segment with the token separator, the markdown media type and the budget (the copy of `artifact-copy.ts` is not a member; string overrides go through `labels`, PLAN-FRESH4-007 (b)); a group that is present is used as given, whole and not merged key by key, and a group that is absent takes the `defaults/` value, so `{}` equals `null`; the argument claim covers ONLY the functions that read a member of the vocabulary (`buildArtifactTree` and `resolveArtifactFacts` read the kind table, `markdownFor` (IC-03) the media type, `buildMarkdownModel` (IC-03) the budget, `matchWorkPackage` the link kinds, the container segment and the token separator), while `formatArtifactSize`, `resolveArtifactRefusal` and `countBidiControls` read tables that are not members and take no `vocabulary`; a refusal code outside the seven is not part of `vocabulary`: it goes through `labels.refusal(code)`, which replaces the eyebrow (the cause word) only), the screen's own normalisers for `status`, `contentStatus` and `view`, the path helper (`splitPath`, `dirOf`, `resolveRelative`) behind one `PATH_SEPARATOR`, `buildArtifactTree` and `pathOfArtifactNode`, `resolveArtifactView` (the total table of `data-model.md`, one test per row; its `markdown` input and the vocabulary's budget group are typed structurally in `artifact-types.ts`, `{ kind: 'ok' | 'fallback' }` and the numeric budget record of `defaults/markdown.ts`, which IC-03's `MarkdownResult` and `MARKDOWN_BUDGET` satisfy; `markdownFor` is IC-03's, operator ruling on analyze A1, option (A)), `matchWorkPackage`, `formatArtifactSize`, `resolveArtifactRefusal`, `resolveArtifactFacts` (the Modified fact is `resolveActivity`), the bidirectional-control count (`countBidiControls`, over the code-point list of `defaults/markdown.ts`) and the hidden-heading predicate (`needsHiddenHeading`); **two additive `ShellIcon` members** (`magnifier`, `table`) in `shell-types.ts` and `shell-icons.ts`, the paths copied from the prototype (`05-artifact.html:23-24`), because the per-kind icon table of `defaults/artifact-kinds.ts` is typed `ShellIcon` and uses them (A-5 rejected; no existing member or path is edited); `test/vocabulary-homes.test.ts`; extend the `data-driven` gate (D-11) to read `ArtifactKind` from `schemas/ArtifactKind.yaml` and the seven refusal codes from the enum of `schemas/ArtifactRefusalCode.yaml` (guards 12 and 7), extending #5's shape with counts derived from the arrays and new positive self-test cases red against the UNCHANGED config.
- **Relevant requirements**: FR-018, FR-020 to FR-022, FR-025 to FR-028, FR-030, FR-031, FR-042, C-004, C-007, NFR-009, NFR-011.
- **Affected surfaces**: `src/defaults/**`, `src/logic/artifact-*.ts` (nine files), `src/shell-types.ts` and `src/shell-icons.ts` (two additive members), `test/artifact-*.test.ts`, `test/vocabulary-homes.test.ts`, the data-driven trio. `logic/types.ts` is not edited.
- **Exit checks, one subsection per concern** (the reviewer judges each against its own evidence, PLAN-DESIGN-019 (b)):
  - *Defaults and logic*: `pnpm test:terminology` green; unit tests with positive controls; `buildArtifactTree` tests: nesting, counts, byte order kept, the selected leaf current, ancestors open, unreadable rows (a leaf with `readable` false has `unavailable: true` and `meta: UNAVAILABLE_TEXT`, and when the SELECTED leaf is unavailable `current` is `''`, PLAN-DESIGN-005), 1000 entries under the NFR-006 bound, unknown kind, no `spec.md` or `tasks/` literal in the file (grep test); `pathOfArtifactNode` round trip over odd paths; the path cross-check (for every entry of the 1000-entry listing, `resolveRelative` of its own relative name from its directory returns its own path and the tree builds the leaf with the matching id); one test per row of the `resolveArtifactView` table; `countBidiControls` (a document with and without the controls: the count and zero), `needsHiddenHeading` (one case per pane and tab); each function that reads a vocabulary member called with an explicit `vocabulary` and with none, and the per-group completion cases (a vocabulary with one group, an empty object equals `null`, a present group is not merged key by key).
  - *Data-driven gate*: `pnpm lint:data-driven && pnpm test:data-driven` green; each new case red without the config change; false-positive cases (a member-access read `item.other`, a member-access read `item.spec`, an import path segment `contract`, a data attribute containing `contract`; an object-literal KEY of a bare word outside the allow-list is reported, not clean) stay green.
  - *Shell icons*: `git diff` of `shell-types.ts` and `shell-icons.ts` shows additions only (existing union members and path strings byte-identical); no existing baseline can change (FR-037); a unit case renders both new glyphs as decorative inline SVG (`aria-hidden`).
- **Depends on**: IC-01b. **Risks**: R-04 (selector false positives on bare words; rename, never silence).

### From `plan.md`: shared-file rows that name IC-02

| File | Writer | Everyone else |
|---|---|---|
| `fixtures.ts` of the element (prop builders and the story pairing table of `contracts/contract-pin.md`) | IC-06b creates a builder for every fixture name and the whole pairing table (IC-02 does not touch this file); later WPs only import | change request |
| `src/defaults/**`, `src/logic/**` (including `logic/markdown/**`) and their tests | IC-02 (defaults, non-markdown logic, `vocabulary-homes.test.ts`), IC-03 (`logic/markdown/{parse,model,links,budget}.ts`), IC-04 (`logic/markdown/render.ts`, `index.ts`, corpus, `test/support/walk-allowed.ts`) | a gap is a change request |
| `shell-types.ts`, `shell-icons.ts` (#4's files) | IC-02 only: two additive `ShellIcon` members, `magnifier` and `table`, and their paths (A-5 rejected; no existing member or path edited, so no baseline changes) | none |
| `eslint.data-driven.config.mjs`, `gates/fixtures/data-driven/**`, `gates/data-driven.selftest.ts` | IC-02 | none |
| `package.json` (root), `.github/workflows/ci.yml` | IC-11, except the named edits: IC-01a needs no `test:contract` edit (the script is a glob that already matches new test files); IC-01b adds `markdown-it` to `packages/mission-ui/package.json` and the lockfile; IC-04 adds `gates/markdown-lint.selftest.ts` to the `test:no-io` script, `scripts/bundle-budget.test.mjs` to `test:scripts` and re-derives the `unit-tests` proof-leg timeout in `ci.yml`; IC-11 adds `scripts/artifact-story-catalogue.test.mjs` to `test:scripts` and re-derives the other timeouts; IC-02 adds its test files if the globs need it | change request |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-4** (`FR-005`, `NFR-009`; ACCEPTED): the lint rule set is named (D-06, R1 to R5; R2 reshaped by PLAN-CORRECT-001 (b), R4 by PLAN-FRESH-001 (a)) and the `data-driven` gate learns `ArtifactKind` and the seven refusal codes from schema enums (D-11), which the spec left to this plan.

- **A-5** (`FR-003`, `AV-15`, `AV-29`, `DA-3`; REJECTED): the proposed collapse of every per-kind icon to one file glyph is NOT adopted. Replacement: the magnifier (`<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>`) and the table (`<path d="M5 5h14v14H5zM5 10h14"/>`) glyphs of the prototype (`05-artifact.html:23-24`) are added to `shell-icons.ts` (and `shell-types.ts`) as two additive `ShellIcon` members, `magnifier` and `table`, the file's own stated rule being "paths copied from the prototype"; the per-kind icon stays data in `defaults/artifact-kinds.ts`, so DA-3 is met without drift; existing baselines are untouched (FR-037 protects baselines, not additive glyphs); G-17 shrinks to the general icon-set gap (#4's G-08). The prototype's no-fold glyph for `plan.md` and `tasks.md` goes to CP-1 as a question.

- **A-9** (`FR-001`; ACCEPTED with PLAN-DESIGN-022 (a)): FR-001's "twelve properties" becomes THIRTEEN: the twelve named there plus one optional `vocabulary` property (`ArtifactVocabulary | null`, default null meaning the `defaults/` values), passed into the logic functions, so a later charter-driven pipeline changes props and not the element (the spec's dynamic-pipeline constraint). The surface is 13 properties everywhere (this plan, `data-model.md`, `contracts/sk-artifact-screen.md`, `contracts/gates.md`, the surface-freeze text, IC-06b).

### From `contracts/`: what this work package is held to (verbatim)

#### Test obligations of IC-02 (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-02: tree and logic unit tests (one per row of the `resolveArtifactView` total table; the seven refusal rows; path round trip and the path cross-check; `vocabulary-homes`; an unreadable leaf carries `unavailable: true` and `meta: UNAVAILABLE_TEXT`, and `current` is `''` when the selected leaf is unavailable; `countBidiControls` and `needsHiddenHeading`; each function with and without an explicit `vocabulary`; the per-group completion over the five groups); the two additive `ShellIcon` glyphs render and no existing glyph path changed.

#### The `data-driven` extension (`contracts/gates.md`)

#### The `data-driven` extension (D-11)

`eslint.data-driven.config.mjs` adds the `ArtifactKind` enum read from `schemas/ArtifactKind.yaml` and the seven codes read from the ENUM of `schemas/ArtifactRefusalCode.yaml`, as the existing words are read from `MissionPhase.yaml` and `StatusLane.yaml`; the example files are not read. Count guards assert exactly 12 kinds and 7 codes, so a vocabulary change fails the guard loudly until a reviewer has updated `defaults/` (the gate does not widen with no edit; the guard is what makes a change visible). It extends the shape #5 already added to that file (S13 and S14: the verdict, change-state and staleness words, bare words matched only in comparisons; 38 selector entries on #5's tip): the new entries append to that array, and `EXPECTED_WORDS`, the word count, the selector-count and distinct-id guards and the "covers every selector" test are derived from the arrays, not from new literals, so merging onto #5's extended arrays needs no arithmetic. Underscored words (`review_cycle`, `work_package_prompt`, `data_model`, `analysis_report`, the six underscored codes and `invalid_artifact_path`) are gate words wherever a lane word is (S1, S3c, S5 keys). Bare ordinary words (`spec`, `quickstart`, `research`, `contract`, `checklist`, `other`) are matched only in comparisons (`===`, `!==`, an `includes` argument, an element of an array literal that is the receiver of `includes`, the literal argument of `Map` and `Set` `has` and `get`) and `case` labels, plus as an object KEY in `packages/*/src` outside the allow-list (grep at plan time found no existing key or comparison of these words outside `defaults/` and `contract/`, so nothing collides; IC-02 repeats the grep). `plan` and `tasks` are already phase words. `not_found` is a gate word and its two homes are `defaults/` tables. New positive self-test cases, one per word family (underscored kind, bare kind in a comparison, bare kind in a `case`, bare kind in an array receiver, in a `Map` or `Set` call, as a key, refusal code), are shown RED against the unchanged config before the change makes them pass; a case aimed at a word the gate already catches does not count. False-positive cases stay green: a member-access read of `other` or `spec` (only an object-literal KEY is reported), a template containing the word `research` in prose, an import path segment `contract`, a CSS selector or data attribute containing `contract`, and a fixture named by kind in an allow-listed story file.

Holes that stay open are written into the `Known limitations` header of the config (as #4 and #5 did): `kind.startsWith('spec')`, a bare word held in a plain `const` and compared through the variable, and a value assembled at run time. The foreign-vocabulary composition test of IC-10 (a thirteenth kind with its own icon, a different container segment, folder names no fixture has and a refusal code outside the seven through `labels.refusal`) is the stated backstop for them.

The media-type words are not gate words (the contract's `mediaType` is a free string): `test/vocabulary-homes.test.ts` (IC-02) asserts they appear only in `defaults/artifact-media.ts`, `src/contract/**` and the allow-listed fixtures and stories.

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q2, operator ruling 2026-10-06.** **Who draws the tree.** Ruling: the shell tree draws it (as it does Work Packages), fed by the pure `buildArtifactTree(entries)` helper this mission exports from `logic/`; `sk-artifact-screen` is the document pane plus inspector, set to `flush`. The screen's events stay about the document; the tree's `sk-navigate` and `sk-tree-toggle` are the shell's. Verified against #4's code: `TreeNode` already has `kind` (`leaf` or `folder`), `children`, `meta` (the count), `unavailable`, `expanded`, `icon` and `prefix`, and the shell emits `sk-navigate` `{ id, href }` and `sk-tree-toggle` `{ id, expanded }`.
- **Q3, operator ruling 2026-10-06.** **Inspector contents.** Ruling: file facts always (kind word, media type, size, modified, redacted yes or no); Mission facts only when the host passes them, hidden when absent; linked Work Packages only when the host passes them; "authoritative" dropped; the read-only note kept. Approved drift (DA-27, DA-28).
- **Q9, operator ruling 2026-10-06.** **Large listings.** Ruling: no virtualization in v1; a 1000-row tree is plain DOM, folders collapsed except the path to the selected file, the `truncated` note when it applies; revisit if the Storybook review shows a cost.
- **N-Q11, operator ruling 2026-10-06.** **Work Package of a prompt or review file.** The screen matches the open path against the ids of the host's `workPackages`; there is no `WP<digits>` pattern in the screen. The id is a leading token of a path segment under the data-held `tasks/` segment (the segment, without extension, equals the id or starts with the id and the separator), longest id wins; no match means no "Open Work Package" action and no linked pill for that file.
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

- `package.json` (root; only if the test globs need a new script entry; the owner is WP13)

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP02. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP03 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
