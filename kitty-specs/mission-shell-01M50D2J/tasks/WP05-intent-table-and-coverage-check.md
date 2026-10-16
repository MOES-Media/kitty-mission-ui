---
work_package_id: WP05
title: Intent table and the type-level coverage check
dependencies:
- WP04
requirement_refs:
- FR-003
- FR-004
- FR-017
- SC-001
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
subtasks:
- T023
- T024
- T025
- T026
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/src/intents/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- scripts/typings.mjs
- scripts/typings.test.mjs
- packages/mission-shell/src/generated/**
- packages/mission-shell/src/intents/**
- gates/plants/typecheck/**
role: implementer
tags: []
tracker_refs: []
---

# WP05 — Intent table and the type-level coverage check

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Generate `MissionUiIntents` and `MissionUiTag` from the mission-ui manifest, write `INTENT_TABLE` (one entry per
`(tag, event)` pair, 40 in all) as the single dispatch source of `controller.intent`, and make the table complete by
construction with the check types of research R-09, proven by plant P-2 in `Gate: typecheck`.

## Context

- **Plan**: IC-05 ("Intent table and the coverage check types"). It depends on IC-03 and IC-04. IC-06 (WP06) binds the
  table once per hosting element and drives its 40-case browser sweep from `INTENT_TABLE` (R5-10).
- **Contracts and design** (normative; never contradict them):
  - `contracts/intent-map.md`: every row's effect, the Dashboard column, the totals (9 hosting elements, 5 nested
    pattern elements including the event-less `sk-phase-bar`, **40 pairs, 23 distinct intent names**), and "Rules"
    (dashboard guard, link scheme, a handler never throws, copy, the coverage type).
  - research R-09 (the check types word for word, `HostedTag`, one entry per line, `via` entries), R-01 (layering:
    `src/intents/**` imports neither `svelte` nor the mission-ui runtime; type imports are fine), R1-07 (counts).
  - data-model "IntentTable" (the table's type, `HostedTag`, counts).
  - plan "Gates" (the `typecheck` gate is extended in content only; `manifest` covers the regenerated typings through
    its staleness check), plan "Plants" (P-2), plan "Shared-file ownership" (`scripts/typings.mjs`,
    `scripts/typings.test.mjs`, `src/generated/elements.d.ts` and `gates/plants/typecheck/plant.json` are IC-05's;
    `src/controller/shell-controller.ts` is IC-03's).
- **Squad findings applied**: R4-05 (`MissionUiIntents` carries the detail types; handlers are typed by detail; `via`
  is constrained to hosting tags with the same event and a mutually assignable detail), R5-02 (the check-type form),
  R5-10 (the sweep is table-driven, so the table must be iterable at run time).
- **Spec**: FR-003 (no control is a dead end), FR-004 (a check that names the unmapped intent; `sk-mission-sample` and
  its `sk-mission-retry` excluded by name), FR-017 (the extended gate carries a plant), SC-001 (0 unmapped).
- **What the dependencies deliver**:
  - WP03: `createShellController`, the named session, retry, load-more and rescan commands, and
    `controller.intent(tag, event, detail)` as a dispatcher keyed on `(tag, event)` that does nothing for a pair it
    does not know (WP03 T015 step 0).
  - WP04: the host-facing commands (picker, dialog, link, copy, refocus, `routeChanged`) and the dashboard guard over
    the six picker and dialog intents, all inside that dispatcher, with Node tests through `controller.intent`.
- **Who consumes this WP**: WP06 imports `INTENT_TABLE` to bind intents once per hosting element and to drive the
  sweep; WP07's layering block lints `src/intents/**`; WP10 uses this WP's typecheck leg time.

## Ownership

**Owned files** (stage only these, plus the recorded out-of-map edit):

- `scripts/typings.mjs`
- `scripts/typings.test.mjs`
- `packages/mission-shell/src/generated/**`
- `packages/mission-shell/src/intents/**`
- `gates/plants/typecheck/**`

**Out-of-map edits**:

- `packages/mission-shell/src/controller/shell-controller.ts` (owned by WP03) — make `INTENT_TABLE` the dispatch
  source of `controller.intent(tag, event, detail)`, which WP03 created and WP04 extended, so the table and the
  dispatcher cannot diverge.

Commit it with a plain `git add` of that path and list it in the final report with the rationale above. Any other
change you need in a file you do not own is a **change request** in the final report (file, change, reason), not an
edit. In particular, WP03's and WP04's tests (`test/logic/**`) are not yours: they must stay green unchanged, and they
are this WP's regression proof for the rewiring.

**Do not touch**:

- The frozen surface (C-003; research R-17): `src/client/port.ts` and all of `src/client/**`, `src/contract/stream.ts`,
  `src/testing.ts`, `src/index.ts`, `src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`,
  `packages/mission-ui/**` (including `custom-elements.json`: the generator reads it, never writes it), and the gate
  wiring (`ci.yml` structure, gate scripts, every plant's `ciCommand`).
- The four existing entries of `gates/plants/typecheck/plant.json` and their payload files.
- `gates/plants/manifest/**` (no new manifest plant; the existing `elements.d.ts is stale` plant still proves
  staleness).
- `src/core/**` (WP01 to WP04), `src/ui/**` and `src/shell.ts` (WP06), `eslint.config.mjs` (WP07),
  `vitest.config.ts` (WP01), `test/**` (WP01 to WP04, WP06).

## Subtasks

### Subtask T023: Generate `MissionUiIntents` and `MissionUiTag`

**Purpose**: the type-level source of truth for which `(tag, event)` pairs exist and what each detail is, read from
the manifest by the existing generator, so FR-004 cannot drift from mission-ui (research R-09; R4-05).

**Steps**:

1. In `scripts/typings.mjs`, extend `generate()` to emit, **after** the `declare module 'svelte/elements'` block and at
   the file's top level:
   ```ts
   export interface MissionUiIntents {
     'sk-drift-screen': {
       'sk-copy-command': SkCopyCommandDetail;
       // … every event of the element, sorted
     };
     'sk-phase-bar': {};
     // … every element of the manifest, sorted, sk-mission-sample included
   }
   export type MissionUiTag = keyof MissionUiIntents;
   ```
   - Each detail is the **same text** `readElements()` already captured for the `on<event>` handler (`e.detail`), so
     `MissionUiIntents[T][E]` and `CustomEvent<…>` of `on<E>` can never disagree. Reuse the existing `elements` list and
     `importsOf()` result; no new import names arise.
   - An element with no events maps to `{}` (`sk-phase-bar`). If the generated-file lint test (the "lint clean under
     all three ESLint configs" case) rejects `{}` through `@typescript-eslint/no-empty-object-type`, emit
     `Record<never, never>` instead (also `keyof … = never`; `Record` is already in `BUILT_IN`) and say so in the
     final report. Do not add an ESLint disable comment.
   - `sk-mission-sample` stays in `MissionUiIntents`: the exclusion is by name in `HostedTag` (T024), not in the
     generator (FR-004 names it).
   - Keep `export {};` only if it is still needed; the new exports already make the file a module.
2. **Indentation collision.** The existing real-run test counts element entries with `/^ {4}'(sk-[a-z-]+)': /gm`.
   Event keys inside `MissionUiIntents` also start with `'sk-`. Indent the interface so its tag keys sit at 2 spaces
   and its event keys at 4, then tighten that regex to the `SvelteHTMLElements` block (slice the text between
   `export interface SvelteHTMLElements {` and its closing `  }`), so the 15-element assertion still means what it
   says. Keep the manifest plant anchor `      selectedPath?: string;\n` unique: `MissionUiIntents` carries no
   properties, so it does.
3. Update the generator's header comment (one or two lines) to say what the new block is for (IC-05, FR-004).
4. In `scripts/typings.test.mjs`, add cases:
   - a fixture manifest with one element and two events yields `MissionUiIntents` with both events and their detail
     texts, and an element without events yields `{}` (or the `Record<never, never>` fallback);
   - the `MissionUiIntents` detail of each event equals the `on<event>` handler's detail in the same output (R4-05);
   - `export type MissionUiTag = keyof MissionUiIntents;` is emitted exactly once;
   - **the real run**: with the manifest as an independent oracle (as the existing real-run case does), the pairs
     outside `sk-mission-sample` number **40**, their distinct event names number **23**, the tags number 15, and
     `sk-mission-sample` declares `sk-mission-retry` (R1-07). If the manifest disagrees with 40/23, stop and report:
     the contract is wrong, not the test.
5. Regenerate with `node scripts/typings.mjs` and commit the regenerated `src/generated/elements.d.ts`.

**Files**: `scripts/typings.mjs`, `scripts/typings.test.mjs`, `packages/mission-shell/src/generated/elements.d.ts`.

**Validation**:
- `pnpm test:scripts` passes (it runs `scripts/typings.test.mjs` in node; not heavy).
- `pnpm manifest:check` passes (`typings: … is current`).
- Hand-edit one detail type in the committed `elements.d.ts` and run `node scripts/typings.mjs --check`: it reports
  `elements.d.ts is stale`; restore with `node scripts/typings.mjs`. This is the existing manifest plant's path; no
  manifest plant is added.

### Subtask T024: `INTENT_TABLE` in `src/intents/table.ts`

**Purpose**: one table, one entry per line, mapping all 40 pairs to the effects of `contracts/intent-map.md`, typed by
detail, iterable at run time for WP06's binding and sweep (FR-003; data-model "IntentTable").

**Steps**:

1. Create `packages/mission-shell/src/intents/table.ts`. Imports are **type-only** except for nothing at all from
   `svelte` or `@moes-media/mission-ui` (R-01; WP07's layering block, P-8):
   `import type { MissionUiIntents, MissionUiTag } from '../generated/elements';` and a type import of the controller's
   command surface from `src/controller/`.
2. Types (names are yours unless given):
   - `export type HostedTag = Exclude<MissionUiTag, 'sk-mission-sample'>;` (excluded **by name**, FR-004).
   - `HostingTag`: the 9 hosting elements of `contracts/intent-map.md`, as an explicit union of literals
     (`sk-mission-shell`, the seven screens, `sk-open-project-dialog`). `NestedTag = Exclude<HostedTag, HostingTag>`.
   - `Handler<D> = (commands: IntentCommands, detail: D) => void`, where `IntentCommands` is the type of the named
     command surface WP03 and WP04 built (session, retry, load-more, rescan, navigation, host-facing commands, and
     the `mode`). If WP03 has no exported type for it, the controller edit below exports one; do not widen the public
     `ShellController`.
   - `Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false`.
   - `ViaHost<T, E>`: the `HostingTag`s `H` for which `E` is a key of `MissionUiIntents[H]` and
     `Same<MissionUiIntents[H][E], MissionUiIntents[T][E]>` is `true` (R4-05).
   - `Entry<T, E> = T extends HostingTag ? Handler<MissionUiIntents[T][E]> : { readonly via: ViaHost<T, E> }`: hosting
     tags carry handlers, nested tags carry only `via` (the binding layer listens on hosting elements only, so each
     intent is handled exactly once).
   - `IntentTableShape = { readonly [T in HostedTag]?: { readonly [E in keyof MissionUiIntents[T]]?: Entry<T, E> } }`.
3. Declare the table with **`satisfies`, not a type annotation**:
   `export const INTENT_TABLE = { … } as const satisfies IntentTableShape;`
   - `satisfies` contextually types every handler's `detail` and rejects a wrong `via` or an excess key, while
     `typeof INTENT_TABLE` keeps the literal keys the R-09 `Mapped` type reads. An annotation with the full required
     type would turn a deleted pair into TS2741 ("Property 'sk-copy-command' is missing"), which does **not** print
     P-2's token. The T025 spike settles this.
   - Include `'sk-phase-bar': {},` so the table has every `HostedTag` key (data-model "IntentTable").
4. **One entry per line** (R-09): each `(tag, event)` pair is exactly one line, e.g.
   `'sk-copy-command': (c, d) => c.copyCommand(d.text),`. Keep handlers short enough that no formatter or lint rule
   splits them; a handler body that needs more belongs in a named controller command. **No comment, string or other
   line in `table.ts` may contain `'sk-copy-command':`**, so P-2's anchor is unique.
5. **Effects exactly as `contracts/intent-map.md`**, row by row, each calling an existing named command:
   - navigations (`sk-navigate`, `sk-open-mission`, `sk-open-missions`, `sk-view-artifacts`, `sk-select-work-package`,
     `sk-open-artifact`, `sk-select-artifact`);
   - session (`sk-tree-toggle`, `sk-toggle-drawer`, `sk-toggle-flyout`, `sk-search`, `sk-filter-change`,
     `sk-select-finding`);
   - reads (`sk-shell-retry`, each screen's `sk-retry-load` by named target, `sk-load-more`, `sk-rescan-drift`);
   - host actions (`sk-open-link`, `sk-copy-command`, the picker and dialog rows).
   - `via` rows: `sk-shell-nav-item` and `sk-shell-tree` → `{ via: 'sk-mission-shell' }`; `sk-filter-toggle-group` →
     `{ via: 'sk-missions-screen' }`; `sk-work-package-board` → `{ via: 'sk-pipeline-screen' }`.
6. **Dashboard guard rows** (FR-015; intent-map "Rules"): the six picker and dialog rows (`sk-projects-screen`
   `sk-open-project`, `sk-request-open-project`, `sk-retry-load`; `sk-open-project-dialog` `sk-browse-folder`,
   `sk-confirm-open-project`, `sk-retry-load`) are wrapped in one exported combinator, e.g.
   `desktopOnly(handler)`, which returns before any state change, host call or snapshot when `commands.mode` is
   `'dashboard'`. The guard then lives in the table, row by row, and the controller's separate hard-coded list from
   WP04 is removed in the controller edit (one list, not two). WP04's six dashboard triples and their desktop positive
   control must pass unchanged.
7. Export a run-time list of the pairs for WP06's sweep, derived from the table (e.g. `INTENT_PAIRS`, built with
   `Object.entries`), not written by hand.

**Files**: `packages/mission-shell/src/intents/table.ts` (and, if you split them, small siblings under
`src/intents/`).

**Validation**:
- `pnpm typecheck` passes; a deliberately wrong detail use (e.g. `d.txt`) or a `via: 'sk-ops-screen'` on
  `sk-shell-tree` fails it (try once by hand, do not commit).
- `pnpm lint` passes for `src/intents/**`, including WP07's layering block once it is on the branch.
- Counting the table at run time (a throwaway `node`/`tsx` check or a REPL; no committed test under `src/`): 40
  pairs, 23 distinct event names, 4 via-tags, 6 `desktopOnly` rows.

### Subtask T025: The coverage check types, after a spike

**Purpose**: make a missing or an extra pair a typecheck error that **names** the pair, with svelte-check as the judge
in `Gate: typecheck` (research R-09; FR-004; SC-001).

**Steps**:

1. **Spike first** (plan IC-05 "Risks"). With the table and the check types of step 2 in place, delete the one-line
   `'sk-copy-command':` entry of `sk-drift-screen` in a scratch edit and run `pnpm typecheck`. Confirm that:
   - the run fails with TS2322, `Type 'true' is not assignable to type '"sk-drift-screen sk-copy-command"'` (svelte-check
     `--output human-verbose` prints the literal; double quotes are fine, the token has none);
   - that literal is the **only** new error (no TS2741 from the table declaration, no knock-on errors);
   - the clean run's output does not contain `sk-drift-screen sk-copy-command`.
   Restore the line (`git diff` must show no change to `table.ts` from the spike). Record the exact error line in the
   final report. If the literal is not printed, stop and report: do not write P-2 against another message.
2. Create `packages/mission-shell/src/intents/coverage.ts` with the R-09 types **word for word** in their logic:
   ```ts
   type Declared = { [T in HostedTag]: `${T} ${keyof MissionUiIntents[T] & string}` }[HostedTag];
   type Mapped = { [T in keyof typeof INTENT_TABLE]: `${T} ${keyof (typeof INTENT_TABLE)[T] & string}` }[keyof typeof INTENT_TABLE];
   export const unmapped: [Exclude<Declared, Mapped>] extends [never] ? true : Exclude<Declared, Mapped> = true;
   export const unknownIntent: [Exclude<Mapped, Declared>] extends [never] ? true : Exclude<Mapped, Declared> = true;
   ```
   - Export the two constants (or otherwise use them) so `no-unused-vars` does not fire; do not disable the rule.
   - `import type` only (`import type { INTENT_TABLE, HostedTag } from './table';` is valid for `typeof` queries
     under `verbatimModuleSyntax`), so `coverage.ts` has no run-time import.
   - The file is checked because `packages/mission-shell/tsconfig.json` includes `src/**/*.ts`; it needs no importer.
3. **Reverse check** (extra pair): add a scratch pair that no element declares (e.g. `'sk-not-an-intent'` on
   `sk-ops-screen`) and confirm the run fails. `satisfies` may report it first as an excess property (TS2353); either
   failure is acceptable, the reverse type is the second line of defence. Restore.
4. Keep the check out of reach of `any`: a `Mapped` built from a widened table would be `string`-ish and make
   `unknownIntent` fail on a clean table, which is the signal that `as const satisfies` was lost.

**Files**: `packages/mission-shell/src/intents/coverage.ts` (or the same types at the end of `table.ts`, provided
they contain no `'sk-copy-command':` text).

**Validation**:
- Clean: `pnpm typecheck` passes with 0 errors and 0 warnings (`--fail-on-warnings`).
- Spike results recorded (exact message, single error, token absent from the clean run).
- Non-vacuity: removing **any** other one entry (try one more, e.g. a `via` row) also fails, naming that pair.

### Subtask T026: Plant P-2 and the controller rewiring

**Purpose**: prove the extended `typecheck` gate fails when the table loses a pair (FR-017; plan "Plants" P-2), and
make `INTENT_TABLE` the only dispatch source (the out-of-map edit).

**Steps**:

1. **Controller rewiring** (out-of-map, `src/controller/shell-controller.ts`): `intent(tag, event, detail)` looks up
   `INTENT_TABLE[tag]?.[event]`:
   - a handler: call it with the internal command surface and the detail;
   - `{ via: H }`: dispatch to `INTENT_TABLE[H][event]` with the same detail (one hop; exactly once);
   - absent (including `sk-mission-sample` and unknown pairs): do nothing, never throw (WP03's rule).
   Delete the hand-written `(tag, event)` branches WP03 and WP04 wrote, and WP04's hard-coded dashboard list (now the
   `desktopOnly` rows). Keep the named commands and their behaviour exactly; only the dispatch moves. This import is a
   **run-time** import of `src/intents/table.ts` into `src/controller/`, which is allowed (neither is `svelte` or the
   mission-ui runtime); `table.ts` only type-imports from the controller, so there is no run-time cycle.
   - Keep `intent()`'s public parameter types as WP03/WP04 left them. If tightening them to
     `<T extends HostedTag, E extends keyof MissionUiIntents[T] & string>` keeps every existing test compiling, do it;
     otherwise leave them and note it in the final report.
2. **Plant P-2**: append one object to the array in `gates/plants/typecheck/plant.json`, leaving the existing four
   entries byte-for-byte untouched:
   ```json
   {
     "gate": "typecheck",
     "ciCommand": "pnpm typecheck",
     "expectFailPattern": "sk-drift-screen sk-copy-command",
     "overlays": [
       {
         "target": "packages/mission-shell/src/intents/table.ts",
         "edits": [{ "find": "<the whole sk-copy-command line, with its leading spaces and trailing \\n>", "replace": "" }]
       }
     ]
   }
   ```
   - The `find` is the complete line, copied from the committed `table.ts`, so the deletion leaves valid syntax and
     the only error is the R-09 one. The gate-proof lib rejects an absent or ambiguous anchor; `"replace": ""` is a
     valid string.
   - No payload file is needed (an anchored edit, like the manifest and visual plants).
3. Prove it: `heavy pnpm gate-proof leg --gate typecheck` runs all five typecheck plants; each turns red with its
   token and the clean run is green. Record the local leg time for IC-09 (plan "Proof-leg timeouts": typecheck
   projected about 0.35 min per run; the matrix timeout stays 6).

**Files**: `gates/plants/typecheck/plant.json`, `packages/mission-shell/src/controller/shell-controller.ts`
(out-of-map).

**Validation**:
- WP03's and WP04's Node tests (`test/logic/**`) pass unchanged, including the six dashboard triples and their
  desktop positive control, the link negatives with the `https:` positive control, and the copy protocol.
- The gate-proof leg reports P-2 red on `sk-drift-screen sk-copy-command` and the clean run green.
- `git diff` of `gates/plants/typecheck/plant.json` shows only an appended object.

## Plants

- **P-2** (`typecheck`; plan "Plants"): target `packages/mission-shell/src/intents/table.ts`; anchored edit deleting the
  one-line `'sk-copy-command':` entry of `sk-drift-screen` (the `find` is that whole line); failure-only token
  `sk-drift-screen sk-copy-command`; `ciCommand` `pnpm typecheck`. Appended to `gates/plants/typecheck/plant.json`;
  the existing four entries untouched.
- The regenerated `elements.d.ts` adds no plant: the existing manifest plant (`elements.d.ts is stale`) still proves
  staleness (plan "Gates", "Extended in content only").

## Exit checks

- [ ] T025 spike done before P-2 was written: the TS2322 line naming `"sk-drift-screen sk-copy-command"` recorded,
      single error, token absent from the clean output, `table.ts` restored.
- [ ] `node scripts/typings.mjs` regenerated `src/generated/elements.d.ts`, committed.
- [ ] `pnpm manifest:check` passes.
- [ ] `pnpm test:scripts` passes (runs `scripts/typings.test.mjs` among others; node, not heavy).
- [ ] `pnpm typecheck` passes with 0 errors and 0 warnings.
- [ ] `pnpm lint` passes, including `src/intents/**` under WP07's layering block when present (no `svelte`, no
      run-time `@moes-media/mission-ui` import in `src/intents/**`).
- [ ] `heavy pnpm test` passes (WP03's and WP04's `logic` tests unchanged and green after the rewiring); run in the
      foreground, alone.
- [ ] `heavy pnpm gate-proof leg --gate typecheck` passes: all five typecheck plants red on their tokens, clean run
      green. The **local leg time** is recorded in the final report (IC-09 needs it).
- [ ] The table has 40 pairs, 23 distinct event names, 4 via-tags and 6 `desktopOnly` rows (counted once at run time,
      recorded in the final report).
- [ ] The existing four typecheck plants are byte-for-byte unchanged; no manifest plant added.
- [ ] Hygiene: no local paths, usernames or machine names in any tracked file this WP touches (the hygiene gate scans
      the generated file too).
- [ ] The out-of-map edit to `src/controller/shell-controller.ts` is listed in the final report with its rationale.
- [ ] Each subtask recorded: `spec-kitty agent tasks mark-status T023 --status done` (and T024, T025, T026).
- [ ] Nothing pushed; no PR opened.

## Definition of Done

- `MissionUiIntents` (`{ [tag]: { [event]: Detail } }`, details identical to the `on<event>` handlers) and
  `MissionUiTag` are generated, tested and committed; `--check` reports them stale when edited.
- `INTENT_TABLE` covers every `HostedTag` with one entry per pair per line, effects as `contracts/intent-map.md`,
  `via` rows constrained to hosting tags with a mutually assignable detail, and the dashboard guard on exactly the
  six picker and dialog rows.
- The R-09 check types reject a missing pair (naming it) and an extra pair; P-2 proves the first in the gate-proof leg.
- `controller.intent` dispatches only through `INTENT_TABLE`; WP03's and WP04's tests pass unchanged.
- All exit checks pass; the final report carries the spike line, the leg time, the counts and the out-of-map edit.

## Risks

- **TS2741 instead of the literal**: annotating `INTENT_TABLE` with the full required type reports the missing
  property, not P-2's token. Use `satisfies` over the optional shape; the spike catches this before P-2 is written.
- **Union truncation**: TypeScript abbreviates long unions in messages. One missing pair is a single literal, so the
  token prints in full; do not plant a multi-pair deletion.
- **Lost literal keys**: without `as const satisfies` (or with a widening helper around the table), `keyof typeof
  INTENT_TABLE[T]` widens and both check constants fail on a clean table.
- **Anchor uniqueness**: a comment or a second line containing `'sk-copy-command':` in `table.ts` makes the gate-proof
  anchor ambiguous; a formatter that splits the line breaks the `find`. Keep the entry short and on one line.
- **Generator regex collision**: the new interface's `'sk-…':` keys can inflate the existing 15-element count; scope
  the regex (T023 step 2).
- **Empty object lint**: `{}` for `sk-phase-bar` may trip `no-empty-object-type` in the generated-file lint case; the
  `Record<never, never>` fallback keeps `keyof` at `never`.
- **Guard drift**: keeping WP04's hard-coded dashboard list beside the `desktopOnly` rows would give two lists. Remove
  the controller list; WP04's tests are the proof that behaviour did not change.
- **Over-catching `sk-retry-load`**: five other screens declare it. The guard is per row, so only the Projects and
  dialog rows carry `desktopOnly`.
- **Rewiring regressions**: the dispatcher change touches every intent. Keep commands identical and rely on the
  untouched `test/logic/**` suites; do not edit them to pass.

## Reviewer Guidance

- **Spike evidence**: the final report quotes the TS2322 line with `"sk-drift-screen sk-copy-command"`; reproduce it
  by deleting the line locally and running `pnpm typecheck`, then restore.
- **Non-vacuity of the check**: delete a different entry (e.g. `sk-work-package-board`'s via row) and confirm the error
  names `sk-work-package-board sk-select-work-package`; add an undeclared pair and confirm a failure. A clean table
  passes with 0 errors (positive control).
- **Constraint of `via`**: change one `via` to a hosting tag that does not declare the event (e.g.
  `sk-shell-tree` `sk-tree-toggle` → `{ via: 'sk-ops-screen' }`): typecheck must fail. A nested tag given a handler
  instead of `via` must fail too.
- **Effects vs contract**: walk `contracts/intent-map.md` row by row against `table.ts` (40 lines plus
  `'sk-phase-bar': {}`); check each retry row's named targets, the copy and link rows go through WP04's wrapped
  commands, and `desktopOnly` sits on exactly the six rows of the Dashboard column marked **ignored**.
- **Exclusion by name**: `HostedTag` excludes `'sk-mission-sample'` literally; `MissionUiIntents` still contains it.
- **Single dispatch source**: `shell-controller.ts` has no `(tag, event)` branches and no dashboard list left; WP03's
  and WP04's tests are unchanged in the diff and green.
- **Generator**: details in `MissionUiIntents` equal the `on<event>` detail texts; the real-run case asserts 40 and 23
  from the manifest as an oracle; `pnpm manifest:check` is green and the existing manifest plant's anchor still
  matches once.
- **Plant file**: only an appended object; the `find` matches the committed line exactly once; no payload file added.
- **Layering**: `src/intents/**` has only type imports from `@moes-media/mission-ui` (if any) and none from `svelte`.
- **Leg time** recorded in the final report.

## Implementation command

`spec-kitty agent action implement WP05 --agent claude`
