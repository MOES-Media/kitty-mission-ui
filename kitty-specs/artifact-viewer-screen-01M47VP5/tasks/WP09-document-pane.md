---
work_package_id: WP09
title: Document pane (chain X) (IC-07)
dependencies: [WP08]
requirement_refs:
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-011
- FR-012
- FR-013
- FR-014
- FR-035
- NFR-003
- NFR-011
- FR-032
planning_base_branch: feat/artifact-viewer-screen-7
merge_target_branch: feat/artifact-viewer-screen-7
branch_strategy: Planning artifacts for this mission were generated on feat/artifact-viewer-screen-7. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/artifact-viewer-screen-7 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-artifact-viewer-screen-01M47VP5
base_commit: 5b8d37964759fd1fd1ed3f7ec4ca08f1d2b443e4
created_at: '2026-10-07T22:46:17.484237+00:00'
subtasks:
- T055
- T056
- T057
- T058
- T059
- T060
- T061
- T062
phase: Phase 4 - Regions
assignee: ''
agent: ''
shell_pid: ''
history:
- timestamp: '2026-10-06T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/
create_intent:
- packages/mission-ui/src/elements/sk-artifact-screen/toolbar-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/tab-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/document-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/source-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/prose-styles.ts
- packages/mission-ui/src/elements/sk-artifact-screen/document.stories.ts
- packages/mission-ui/test/markdown-corpus.screen.test.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-artifact-screen/toolbar-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/tab-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/document-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/source-parts.ts
- packages/mission-ui/src/elements/sk-artifact-screen/prose-styles.ts
- packages/mission-ui/src/elements/sk-artifact-screen/document.stories.ts
- packages/mission-ui/test/sk-artifact-screen.tabs*.test.ts
- packages/mission-ui/test/sk-artifact-screen.links*.test.ts
- packages/mission-ui/test/sk-artifact-screen.document*.test.ts
- packages/mission-ui/test/sk-artifact-screen.source*.test.ts
- packages/mission-ui/test/sk-artifact-screen.notices*.test.ts
- packages/mission-ui/test/markdown-corpus.screen.test.ts
role: implementer
---

# Work Package Prompt: WP09 - Document pane (chain X) (IC-07)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: assigned by the orchestrator at dispatch

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `authoritative_surface`.

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Fill the bodies of `toolbar-parts.ts`, `tab-parts.ts`, `document-parts.ts`, `source-parts.ts` and `prose-styles.ts` (signatures kept), and deliver the `Document` stories AV-01 to AV-08 with the tab, link, redaction, truncation-note, bidirectional-notice, escaped-source, semantics, heading and screen-pass-of-the-corpus tests.

## Context

Chain X (IC-07 then IC-08) runs in parallel with chain Y (IC-09, WP11); their write scopes are disjoint (part files are the unit of write ownership). The selected-tab state itself is WP08's and these parts are its consumers. The truncation note's render body is THIS WP's alone (`renderDocument`); AV-17's story title belongs to WP11 and its test to WP12. The story for the spec row titled with the word the terminology check forbids in source is named `Markdown full syntax`: neither the story, its doc comment nor the fixture text uses that word (C-009; the identifier `contentFeatures` is safe, the prose around it is not). Visuals follow the CP-1-confirmed drift register; DA-39, DA-40 and DA-41 are decided at CP-1.

Read first: `plan.md` section "IC-07" (reproduced verbatim below), `research.md`, `data-model.md`, the contracts under `contracts/` that the plan text names, and the `spec.md` requirements listed in `requirement_refs`. Implementation concern: `plan.md` IC-07. Requirements: FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-035, NFR-003, NFR-011, FR-032.
Requirements NFR-014 and NFR-015 (amendment A-7, accepted) are written into `spec.md` (CP-1 write-back item (7), 2026-10-07). They bind this work package as the plan's traceability table states: forced colors and reduced motion, and target size (a tab at least 36 px, a Work Package control at least 24 px of block size).

## Precondition (first step, before the first subtask)

First step: confirm the `CP-1 confirmed` entry is an ancestor of this lane (`git merge-base --is-ancestor <CP-1 commit> HEAD`); the exceptions and values this WP draws on are the ruled ones. The `CP-1 confirmed` entry now EXISTS (2026-10-07): the CP-1 commit is the one whose subject begins `spec(artifact-viewer-screen): CP-1 confirmed` (find it with `git log --grep='CP-1 confirmed' --format=%H`); the lane worktree must contain it, so merge the planning branch into the lane before dispatch. If absent: STOP and report.

## CP-1 rulings binding on this work package (2026-10-07)

The operator's CP-1 rulings are complete and binding (verbatim in "Binding rulings" below; `plan.md`, "CP-1 rulings (2026-10-07)"). No PENDING CP-1 value remains. For this work package:

- **Tabs** (`tab-parts.ts`): a raw `<button type="button" role="tab">` with NO class, painted with tokens keyed on `aria-selected` (E-26), a `Highlight` border on the selected tab in forced colors, at least 36 px of block size; BOTH panels rendered (the unselected one `hidden`) or `aria-controls` omitted on the unselected tab: the semantics test asserts no dangling idref in all three cases (two tabs, fallback, none).
- **Prose** (`prose-styles.ts`): the token CSS of E-23 as ruled (`max-width: 800px`, `max-width: 68ch` through the `ch` grant, `line-height: 1.65`); no `letter-spacing`, no `text-wrap`.
- **Raw and fallback block** (`source-parts.ts`): `white-space: pre-wrap`, pinned `max-width: 900px`, no `overflow-wrap`, no box (border, radius, background). The block is a tab stop only while it overflows; Home and End are inert for single-line files (DA-23; accepted).
- **Toolbar band** (`toolbar-parts.ts`): `min-height: 68px` (DA-40, E-28). The bidirectional-control notice (DA-41) is confirmed.
- Link copy and defaults stay as rendered (`contracts/defaults.md`).

## Subtasks

### Subtask T055: Toolbar and tablist (`toolbar-parts.ts`, `tab-parts.ts`)

**Steps**:
1. Toolbar: file icon by kind and the file name, no Mission breadcrumb (DA-11); the full path is the `title`; the file name ellipsizes with the full text in `title` and the accessible name.
2. Tablist per the control CP-1 ruled (the token paint variant, E-26: a raw `<button type="button" role="tab">` with no class, painted with tokens keyed on `aria-selected`; both panels rendered with the unselected one `hidden`, or `aria-controls` omitted on the unselected tab, so no idref dangles): roles, `aria-selected`, roving tabindex, arrows wrap, Home and End, selection follows focus, `aria-controls` to the panel; a tab at least 36 px of block size; the tab change is state-only and emits no event (EV-10).

**Files**: `toolbar-parts.ts`, `tab-parts.ts`

**Validation**: AV-31 key tests

### Subtask T056: Rendered document, eyebrow, redaction line, truncation note (`document-parts.ts`)

**Steps**:
1. `renderDocument(view, handlers)` draws the rendered article from `render.ts` (imported directly), the document EYEBROW (the kind word above the document title, DA-14, from `DocumentView.eyebrow`; exit evidence is the AV-01 side-by-side and an element test of the word), the redaction line above the document when `redacted` (markers verbatim), and the truncation note (DA-10) when `truncated`, each drawn with the library `sk-notice` of tone `info`.
2. The article is named and a tab stop ONLY WHILE IT OVERFLOWS, applied to the element that actually scrolls (A11Y-003 (a)); tests of both states with a positive control and a PageDown test that moves `scrollTop`.

**Files**: `document-parts.ts`

**Validation**: eyebrow, redaction and truncation element tests with positive controls

### Subtask T057: Raw, fallback and bidirectional notice (`source-parts.ts`)

**Steps**:
1. `renderSource(text, label, bidiNotice, scrolls)`: a `pre` with `content` as ONE text binding, named (`SOURCE_LABEL` for a raw-only block), wrapping at spaces with sideways scroll for an unbroken line (DA-22, E-25), a tab stop only while it overflows; the fallback notice with escaped source; the bidirectional-control notice ("contains N bidirectional control characters", words and code-point list from `defaults/`, the text itself unchanged) drawn with `sk-notice` tone `info` above the block in the raw and fallback blocks only (PLAN-SECURE-009).
2. Tests: a document holding the controls, one holding none as the positive control, escaped-source equality still passing; an uncommitted screenshot goes to the WP report (no prototype; DA-41 confirmed at CP-1).

**Files**: `source-parts.ts`

**Validation**: escaped-source equality test (`content` character for character for every non-empty file; the empty file has its own assertion)

### Subtask T058: Non-markdown, empty file, headings, semantics

**Steps**:
1. AV-06: `mediaType` json, yaml, jsonl, csv, plain shows Raw only, no Rendered tab, no notice (control: a markdown fixture shows the tab); AV-07 text/plain empty file via a call of `renderEmptyForm` (no tablist) and the markdown empty-file element test (row 9a: both tabs render "This file is empty.", no dangling idref; control: the same content with `text/plain` shows no tablist).
2. Heading cases: the hidden h1 appears for raw-only, Raw tab, fallback and empty-file bodies and NOT for a rendered body; semantics cases (two tabs, fallback, none: no dangling idref).

**Files**: `document-parts.ts`, `tab-parts.ts`, tests

**Validation**: heading and idref assertions with controls

### Subtask T059: Link behaviour and tests

**Steps**:
1. The inline link control per CP-1 (`<a role="link" tabindex="0">` with click and Enter handlers, never an `href`), accessible name = link text plus the visually hidden kind suffix from `defaults/`; EV-1 (`sk-select-artifact`), EV-2 (`sk-open-link`), EV-3 (inert: no event), EV-10; each with a positive control; the link name and description dump (internal, external and inert in one paragraph).

**Files**: `document-parts.ts`, `test/sk-artifact-screen.links*.test.ts`

**Validation**: EV-1 to EV-3 and EV-10 asserted with exact payloads

### Subtask T060: Prose styles (`prose-styles.ts`)

**Steps**:
1. `proseStyles`: the one stylesheet of the rendered document, token-only except the properties E-23 grants as ruled at CP-1; focus rings of followable links, the article, the pane and the table box (NFR-014 forced-colors survival; NFR-011 non-colour-only states).

**Files**: `prose-styles.ts`

**Validation**: `pnpm lint:styles` green

### Subtask T061: `Document` stories AV-01 to AV-08

**Steps**:
1. Story title `Document`: AV-01 rendered, AV-02 raw, AV-03 `Markdown full syntax`, AV-04 hostile, AV-05 fallback, AV-06 non-markdown raw-only, AV-07 empty file, AV-08 redacted and AV-31 (focus on the active tab), nine stories in all (`contracts/sk-artifact-screen.md` "Story catalogue"), inside `shellFrame` with `flush`, dark theme, 1280 px, synthetic fixtures from the element `fixtures.ts`. No baseline PNG is committed here.

**Files**: `document.stories.ts`

**Validation**: stories build (`pnpm build-storybook`)

### Subtask T062: Screen pass of the corpus and exit evidence

**Steps**:
1. `test/markdown-corpus.screen.test.ts`: every corpus entry mounted in `sk-artifact-screen` inside `shellFrame`; the same walker over the pane, the Raw tab and the fallback source block; every `sk-*` event recorded; the entry count equals the model twin's.
2. Re-run `pnpm gate-proof --only unit-tests` (orchestrator) so the planted renderer weakenings also fail this pass.
3. An uncommitted side-by-side per story against the prototype in the WP report, including the per-region forced-colors screenshot (NFR-014, NFR-015); no `pnpm visual` before WP13.

**Files**: `test/markdown-corpus.screen.test.ts`

**Validation**: all of Acceptance exits 0

## Acceptance (all runnable)

1. `pnpm test:terminology` green (the AV-03 story name and fixture text are the likeliest leak).
2. The tab, link, redaction, truncation-note, bidirectional-notice, escaped-source-equality, semantics and heading tests and the screen pass of the corpus green, each with its positive control; the eyebrow test (the kind word above the title).
3. `gate-proof --only unit-tests` re-run so the planted renderer weakenings also fail the screen pass.
4. An uncommitted side-by-side screenshot per story against the prototype is in the WP report (no `pnpm visual`, no committed PNG).
5. A diff touching a file outside the owned list is a stop.

## Definition of Done

Every acceptance command exits 0; each new test file has its revert check listed; the hand-off lists commit hashes verified with `git cat-file -t`, the out-of-map edits with a one-line rationale, any change request, every exception and drift item relied on, and every uncommitted screenshot by name. Per-subtask completion evidence is a `spec-kitty agent tasks mark-status <Txxx> --status done --mission artifact-viewer-screen-01M47VP5` record.

## Risks

Prototype drift not in the confirmed register is a REJECT, not a design-review item. The eyebrow and truncation note are rendered here only; a duplicate in WP11 would be a chain overlap.

## Reviewer Guidance

Screenshot the prototype beside each story. Re-run two revert checks. Check the escaped-source equality is character for character. Check no `innerHTML`, `unsafeHTML` or `href` in the diff. Check the diff touches no chain Y file. The reviewer is a separate agent and re-runs two revert checks.

## Plan text for this work package (verbatim, binding)

### From `plan.md`: IC-07

#### IC-07 Document pane (chain X)
- **Purpose**: `toolbar-parts.ts`, `tab-parts.ts`, `document-parts.ts`, `source-parts.ts`, `prose-styles.ts`; **the document eyebrow (the kind word above the document title, DA-14; drawn by `renderDocument` from `DocumentView.eyebrow`, `contracts/sk-artifact-screen.md` "Part signatures", PLAN-FRESH4-001; its exit evidence is the AV-01 side-by-side and an element test of the word)**; story title `Document`: AV-01 to AV-08 (rendered, raw, `Markdown full syntax` (the spec row AV-03 is titled with the word the terminology check forbids in source, so the story, its doc comment and the fixture text never use it), hostile, fallback, non-markdown raw-only, empty file, redacted) and the tab and link tests (AV-31, EV-1 to EV-3, EV-10): the tablist (roles, `aria-selected`, roving tabindex, arrows wrap, Home and End, selection follows focus, `aria-controls`; the selected-tab state itself is IC-06b's and these are its consumers), the rendered article and raw block named (`SOURCE_LABEL` for a raw-only block) and each a tab stop ONLY WHILE IT OVERFLOWS, applied to the element that actually scrolls (A11Y-003 (a); the `overflowing` set comes from IC-06b): tests of both states with a positive control (a wide child flips the stop on, removing it flips it off) and a PageDown test that moves `scrollTop`; the link activation tests with positive controls, the link name and description dump (internal, external and inert in one paragraph), the semantics cases (two tabs, fallback, none: no dangling idref), the redaction line, **the truncation note (DA-10), whose render body is IC-07's alone** (`renderDocument`; AV-17's story title belongs to IC-09 and its test to IC-10; the note is drawn with the library `sk-notice` of tone `info` (the tone the package's other quiet notes use), as are the redaction line and the bidirectional-control notice), the empty-file body (a call of `renderEmptyForm` from `state-parts.ts`; AV-07 is the text/plain file, row 9b, no tablist; the markdown empty file, row 9a, is an element test with inline content built from `contentEmpty` with the markdown media type: both tabs render "This file is empty.", the tabpanel and `aria-labelledby` wiring has no dangling idref, and the positive control is the same content with `text/plain`, which shows no tablist), the fallback notice, **the bidirectional-control notice in the raw and fallback source blocks** (PLAN-SECURE-009: "contains N bidirectional control characters", drawn with the library `sk-notice` of tone `info` (the tone the package's other quiet notes use), words and code-point list from `defaults/`, the text itself unchanged; element tests with a document that holds the controls, one that holds none as the positive control, and the escaped-source equality still passing; an uncommitted screenshot goes to the WP report, there is no prototype for it and the new drift entry DA-41 is decided at CP-1), the escaped-source equality test (`content` character for character, for every non-empty file; the empty file has its own assertion, rows 9a and 9b), AV-06 (no Rendered tab and no notice, with a markdown fixture as the control that shows the tab), the heading cases of the bodies it draws (the hidden h1 appears for raw-only, Raw tab, fallback and empty-file bodies and not for a rendered body), and the screen pass of the corpus (`test/markdown-corpus.screen.test.ts`: every entry mounted in `sk-artifact-screen` inside `shellFrame`, the same walker over the pane, the Raw tab and the fallback source block, every `sk-*` event recorded; the entry count equals the model twin's; `gate-proof --only unit-tests` is re-run so the planted renderer weakenings also fail this pass). FR-003 to FR-014. Checked at IC-07: for AV-01 and AV-08 the document pane and the redaction line above the document; the inspector facts and the inspector redaction line of those two rows are IC-09's and are checked at the IC-10 review of the merged chains, where the side-by-side for those two stories is repeated. Exit evidence: uncommitted side-by-side screenshot per story against the prototype (no `pnpm visual` until IC-11); exit check `pnpm test:terminology` green (the AV-03 story name and fixture text are the likeliest leak). Depends on IC-06b.
- **Relevant requirements**: FR-003 to FR-014, FR-035 (part), NFR-003 (part), NFR-011 (part), NFR-014 and NFR-015 (the per-region forced-colors screenshot), DA-14, DA-39 and DA-40 (as decided at CP-1).
- **Affected surfaces**: `toolbar-parts.ts`, `tab-parts.ts`, `document-parts.ts` (the document eyebrow included), `source-parts.ts` and `prose-styles.ts` (stub bodies replaced, signatures kept); the `Document` stories file; its tests under `test/` (`sk-artifact-screen.<area>.test.ts`) and `test/markdown-corpus.screen.test.ts`. Never `sk-artifact-screen.ts`, `state-parts.ts`, `refusal-parts.ts` or `inspector-parts.ts`.
- **Exit checks**: `pnpm test:terminology` green; the tab, link, redaction, truncation-note, bidirectional-notice, escaped-source-equality, semantics and heading tests and the screen pass of the corpus green, each with its positive control; the eyebrow test (the kind word above the title); `gate-proof --only unit-tests` re-run so the planted renderer weakenings also fail the screen pass; an uncommitted side-by-side screenshot per story against the prototype in the WP report (no `pnpm visual`, no committed PNG); a diff touching a file outside the surfaces above is a stop.
- **Depends on**: IC-06b.

### From `plan.md`: shared-file rows that name IC-07

| File | Writer | Everyone else |
|---|---|---|
| `test/markdown-corpus.screen.test.ts` | IC-07 | none |

### From `plan.md`: amendments, spec rows and sections that bind this work package (verbatim)

- **A-6** (the drift register; ACCEPTED as "keep"; values ruled at CP-1, 2026-10-07: DA-39 a pinned 900 px, DA-40 a pinned 68 px): two items the prototype carries and the register does not mention are DA-39 (the raw block's reading measure, `.raw-view` `width: min(900px, 100%)`) and DA-40 (the toolbar band's `min-height: 68px`); each is carried with a token where one exists, otherwise by E-25 or E-28 pinned. S-A2 and S-A4 include the two numbers in their prototype side-by-sides.

- **A-7** (`NFR-004`, `NFR-011`, new `NFR-014`, `NFR-015`; ACCEPTED): NFR-004 gains a reflow clause (at a 200% root size the 1100 px viewport resolves to one column, and at 320 px and 400% only tables scroll); NFR-011's list of non-colour-only states gains the selected tab and the current tree row; NFR-014 forced colors and reduced motion (the selected tab, the focus ring and the table box stay distinguishable in forced colors; the screen's own elements run no animation under reduced motion); NFR-015 target size (a tab at least 36 px and a Work Package control at least 24 px of block size).

- **A-8** (`N-Q12`, `FR-007`, `EV-2`; amendment to N-Q12, PROPOSED and ACCEPTED in whole at CP-1 on 2026-10-07 (A-8a and A-8b both stand as drafted; the revert recipes below stay as the record); it is NOT a clarification that changes no ruling). It is TWO separately rejectable parts; the host obligation is neither.
  - **A-8a (layer 1)**: markdown-it's default `validateLink` turns `javascript:`, `vbscript:`, `file:` and non-image `data:` destinations into LITERAL TEXT (the paragraph shows the raw `[x](...)` source, with no inert link and no `title`), where N-Q12 says "inert text with the destination in `title`". Written in IC-03 (link table, the `[x](javascript:1)` yields-no-`link_open` test) and IC-04 (corpus entries whose expected text is the literal source). IF REJECTED, the literal N-Q12 stands: the stuck point is the one line `md.validateLink = () => true` inside `parse.ts` (the instance is still never exported, so R1, R2 and the export-shape test are untouched); the blocked schemes then reach `classifyLink`, whose row 7 already returns inert, and the renderer draws the inert span with the destination in `title`; the layer-1 test flips to "a `link_open` exists and is classified inert, with no `href`", and the corpus expectations change from the literal source to the link text. Cost: one line, one test and the corpus expectations, all inside IC-03 and IC-04 files; no other WP is touched. The defence in depth is then `classifyLink` plus the walker (R4, the structural test), which the plan states as the accepted loss.
  - **A-8b (three narrowings)**: of an absolute link that N-Q12 would send as `sk-open-link`: a `mailto:` with a query or fragment (row 6), an authority with userinfo (`@`, row 5) and a destination over 2048 characters (row 1) are inert; an external link carries its truncated destination in `title`. Each narrowing is individually rejectable: a rejected one reverts its own table row and unit rows to N-Q12's literal wording (the destination is sent as `sk-open-link` and the host obligation covers it); the other two stay.
  - Until CP-1 the plan, the link table and the corpus are written to A-8a and A-8b as proposed. The sentence of `EV-2` in `spec.md` was REVERTED (done, commit of the operator's rulings). The HOST OBLIGATION stays a contract obligation in `contracts/sk-artifact-screen.md` and in the `@fires` text of `sk-open-link` whatever CP-1 decides (the `href` is untrusted; the host re-validates the scheme, never navigates its window to it, and shows the destination first). If A-8 is approved (in whole or in part), the orchestrator writes the EV-2 sentence back. [CP-1, 2026-10-07: A-8 approved in whole; the EV-2 sentence is written back in `spec.md`. WP04's `mailto:` check also rejects a leading or trailing `@`, which the A-8b wording does not name; the operator was told.]

New drift-register entry for CP-1 (PLAN-SECURE-009, ruled 2026-10-06): **DA-41** (proposed; CONFIRMED at CP-1, 2026-10-07): in the raw and fallback views only, a quiet notice drawn with the library `sk-notice` of tone `info` "contains N bidirectional control characters" (words and the code-point list, U+202A to U+202E, U+2066 to U+2069 and U+200E and U+200F, from `defaults/`; the text itself is shown unchanged, so FR-012 and the escaped-source equality hold). There is no prototype counterpart; the operator decides its look at CP-1. R-09 is corrected to "accepted, no mitigation" (the rendered view shows no notice).

Spec rows read as amended by the rulings (the spec rows were written back by the orchestrator at CP-1 on 2026-10-07; this list is kept as the record, and a reviewer holding an older spec text reads these rows as follows): AV-32 (focus order) reads "tree, inspector, tabs, document" because the inspector is first in the DOM (PLAN-A11Y-009 (b)); FR-035 ("the document pane focusable; documented focus order tree, tabs, document, inspector") reads the same order, tree, inspector, tabs, document; NFR-003's "scrolling region counts as a control" reads "a scroll region is a tab stop only while it overflows" (PLAN-A11Y-003 (a)); FR-012 ("the block is focusable and named, so it scrolls by keyboard") and DA-23 ("both the rendered article and the raw block focusable and named", a drift-register item shown to the operator at CP-1) read "focusable and named only while it overflows", the same rule, on the element that actually scrolls; NFR-005 ("asserted in the corpus test by observing resource loads") reads "asserted by the structural walk of the produced template (the proof, PLAN-TEST-003 (a)); a CSP and a resource-load observation are corroboration only".

### From `contracts/`: what this work package is held to (verbatim)

#### Story catalogue (`contracts/sk-artifact-screen.md`): the stories this work package owns

| Title | Stories |
|---|---|
| `Document` (IC-07) | AV-01, 02, 03, 04, 05, 06, 07, 08, 31 (focus on the active tab) |

Count: 9 + 10 + 13 + 13 = 45 (35 rows: AV-25 and AV-26 two states each, AV-30 six, AV-32 four). Row to story map and the fixture of each story: `contract-pin.md`, "Pairing". A story title is owned by exactly one WP. The tier test of IC-10 also samples 1000 px (collapsed tier, two columns) without a baseline.

#### Test obligations of IC-07 (`contracts/sk-artifact-screen.md`, "Test obligations by owner")

- IC-07: the document eyebrow (the kind word above the title, the `Specification` word of AV-01 and the dropped "factual" of DA-14; the raw kind as eyebrow for an unknown kind is asserted in IC-10, not here), tablist keys (AV-31, consumer of IC-06b's tab state), escaped-source equality, redaction line, the truncation note (DA-10; an `sk-notice` of tone `info`; its render body is IC-07's alone), link activation with positive controls (EV-1 to EV-3), raw-only (AV-06: no Rendered tab and no notice, with a markdown fixture as the control that shows the tab), the link name and description dump, the three semantics cases, scroll regions as tab stops only while they overflow (both states with a positive control, and a PageDown test that moves `scrollTop`), the bidirectional-control notice in the raw and fallback blocks (with a no-controls control and the text unchanged), the hidden `h1` in the bodies that have none, the screen pass of the corpus.

#### Part signatures (`contracts/sk-artifact-screen.md`)

#### Part signatures (IC-06b creates every file as a stub with these final signatures)

| File | Exports |
|---|---|
| `toolbar-parts.ts` | `renderToolbar(view: ToolbarView)`, `toolbarStyles` |
| `tab-parts.ts` | `renderTabs(view: TabsView, onSelect: (tab: ArtifactTab) => void)`, `tabStyles` (the selected tab is held by the screen file) |
| `document-parts.ts` | `renderDocument(view: DocumentView, handlers: LinkHandlers)` (the document EYEBROW, the kind word drawn above the document title, DA-14, carried by `DocumentView.eyebrow: string` (the kind's label through `ARTIFACT_KIND_WORDS` and `labels.kind`, the raw kind when unknown, so AV-01 and AV-29 have an owner; IC-07's alone, PLAN-FRESH4-001); rendered body, the empty-file body by calling `renderEmptyForm` of `state-parts.ts`, the redaction line and the truncation note, each drawn with the library `sk-notice` of tone `info` (PLAN-FRESH3-006 (a)); the note's render body is IC-07's alone, PLAN-CORRECT-013 (a)), `documentStyles` |
| `source-parts.ts` | `renderSource(text: string, label: string, bidiNotice: string \| null, scrolls: boolean)` (raw, fallback source; the bidirectional-control notice above the block when `bidiNotice` is not null, drawn with the library `sk-notice` of tone `info`; the block is a tab stop only when `scrolls`, from the `overflowing` set), `sourceStyles` |
| `refusal-parts.ts` | `renderRefusal(view: RefusalView, onRetry: () => void)`, `refusalStyles` |
| `inspector-parts.ts` | `renderInspector(view: InspectorView, handlers: InspectorHandlers)`, `inspectorStyles` |
| `state-parts.ts` | `renderStatus(view: StatusView, handlers: StatusHandlers)` (stub in IC-06b; the bodies for loading, error, not-found and nothing-selected are IC-08's), `renderEmptyForm(text: string, heading?: string)` (COMPLETE in IC-06b; the one place `sk-empty-state*` appears besides the refusal block; AV-18 uses it), `stateStyles` |
| `prose-styles.ts` | `proseStyles` (the one stylesheet of the rendered document, E-23) |

The exact view and handler types are recorded by IC-06b in this file under "View types recorded by IC-06b" (the `DocumentView` type carries the `eyebrow` string, so the frozen signature holds the data the eyebrow needs). `LinkHandlers` (and the document view) also carry the `overflowing` set, so the renderer and the parts draw `tabindex="0"` and the table box's role and positional name only for a member (A11Y-003, A11Y-004).

#### Self-check list for reviewers (`contracts/gates.md`; its own heading says to copy it into every WP brief that touches these files)

#### Self-check list for reviewers (copy into every WP brief that touches these files)

## Binding rulings (verbatim from `spec.md` Clarifications)

Rulings on the questions this work package touches:

- **Q1, operator ruling 2026-10-06.** **Markdown rendering.** #5 ruled "no markdown rendering in the Work Package screen; the host decides". Here rendering is the point. Ruling: the screen renders with `markdown-it` (`html: false`), turned into Lit templates from its token stream, so there is no `innerHTML` or `unsafeHTML` at all. Links never navigate (relative artifact links and external links emit events), images are not loaded (alt text and a link), tables scroll inside their own box, and any throw falls to the AV-05 fallback. If a later need forces HTML output, it goes through DOMPurify with a fixed allowlist first. The library is a new runtime dependency, approved; the hostile-corpus test is the gate.
- **Q5, operator ruling 2026-10-06.** **Fallback trigger and non-markdown files.** Ruling: a known text `mediaType` that is not markdown (json, yaml, jsonl, csv, plain) shows Raw only, with no Rendered tab and no notice; the "Rendered view degraded" fallback is only for a markdown file whose renderer throws or exceeds a render budget.
- **Q6, operator ruling 2026-10-06.** **Redaction notice.** Ruling: when `redacted` is true, one quiet line in the inspector and above the document ("host paths and e-mail addresses are replaced"); the markers stay as they come; hidden when false.
- **N-Q12, operator ruling 2026-10-06.** **Links inside markdown.** A relative destination that resolves (against the open artifact's directory, never above the Mission root) to a path in the listing emits `sk-select-artifact` `{ missionId, path, kind }`; an absolute `http`, `https` or `mailto` link emits `sk-open-link` `{ href }`; everything else (fragment-only, `javascript:`, `data:`, `file:`, `vbscript:`, a relative path not in the listing, a malformed one) is inert text with the destination in `title`.

#### Operator rulings on the plan-phase forks, 2026-10-06

After the plan squad held 23 forks, the operator ruled "ACCEPT ALL" of the arbiter's recommendations on 2026-10-06, for all 23 forks and the plan amendments A-1 to A-8. They bind tasks and review; the plan carries the detail. In short:

- **Base A**: build on #5 (after it merges). **Retry types**: a neutral `src/retry-types.ts` holds the shared `sk-retry-load` union (A-3). **Splits**: IC-01 and IC-06 are split; IC-02 stays whole.
- **Layout**: two columns only from a content cell of 720 px or wider, never in the mobile tier (A-1 accepted; numbers settled at CP-1 on S-A6 [T = 45 rem, ruled 2026-10-07]). **Inspector first in the DOM**; grid placement keeps it on the right in two columns. A-6 (DA-39, DA-40) accepted; values pending CP-1 [ruled at CP-1, 2026-10-07: 900 px and 68 px pinned].
- **Exceptions**: E-23 gets a `ch` grant in the Stylelint mechanism and complete property tables; tabs prefer the adopted segmented-choice family (S-A5 decides, pending CP-1) [ruled at CP-1, 2026-10-07: the token paint variant, E-26; see "Operator rulings at CP-1, 2026-10-07" below].
- **Renderer**: `parse.ts` exports only `parseTokens`; lint rule R4 is strict only in `logic/markdown`; element files use a reviewed named list; table scroll boxes get positional names with no document text in `aria-*`; request absence is proved by a CSP meta plus `securitypolicyviolation` with a positive control; a bidi-control notice and a corrected R-09 (a new DA entry at CP-1) [DA-41, confirmed 2026-10-07].
- **Spec edits**: the unapproved EV-2 sentence is REVERTED (done above); A-8 and the N-Q12 narrowings are decided at CP-1, not before [A-8a and A-8b accepted as drafted at CP-1, 2026-10-07; the EV-2 sentence is written back].
- **Evidence**: five local pinned `pnpm visual` runs in IC-11 (CI repeat is extra). Node-only tests via `scripts/` and `?raw`. NFR-006 gets hard ceilings plus a parse-count spy.
- **Tree**: an unreadable row stays disabled and `current` is empty when the selected leaf is unavailable; the host never writes tree toggles back. **Truncation note**: owned by IC-07. **Focus**: a table or panel is a tab stop only while it overflows. **Headings**: a visually hidden h1 where the pane has none.
- **Vocabulary**: one optional `vocabulary` property (so 13 properties; FR-001's "twelve" is amended by the plan). **Icons**: A-5 rejected; the magnifier and table glyphs are added to `shell-icons.ts`.
- A-2, A-4, A-7 accepted. Values that depend on spikes are PENDING CP-1, not decided [ruled at CP-1 on 2026-10-07: see "Operator rulings at CP-1, 2026-10-07" below].

#### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1 [all ruled on 2026-10-07; see below].

#### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

#### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

### Operator rulings at CP-1, 2026-10-07 (CP-1 confirmed)

CP-1 confirmed, 2026-10-07. The operator ruled on the WP06 evidence (WP06 approved; the spikes S-A1 to S-A6 were run in Chromium and Firefox 153; WebKit could not launch on the host and is NOT TAKEN). The rulings below are binding and complete; they bind tasks and review. The write-through to the plan, the contracts and the work package prompts is recorded in `plan.md`, "CP-1 rulings (2026-10-07)".

1. **Markdown budget: option O3.** `maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000 (the cells move with the tokens). `maxDepth` 24 and the other limits are unchanged. No A-10 multiplier: A-10 is not written. Risk noted: inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling, so the ceiling test uses a document shape and a margin that do not flake; if it flakes, that goes back to the operator and the ceiling is never quietly relaxed.
2. **Tab control: the token paint variant.** E-26 becomes the paint entry: token `border-color`, `background` and `color` keyed on `aria-selected`, the forced-colours `Highlight` border, and the raw `<button type="button" role="tab">` allowance. The segmented-choice class is not used, so the `sk-segmented-choice*` row leaves E-27. Both panels are rendered (one `hidden`), or `aria-controls` is omitted on the unselected tab, so that no idref dangles. Sunset: G-16.
3. **Work Package pill: raw `button.sk-pill-tag`** (S-A4 outcome (c)). E-29 is approved and `sk-pill-tag` goes into E-27 as `classOnly` for `inspector-parts.ts`. Sunset: G-21. DA-29 is resolved by this ruling.
4. **Inspector facts: the library `sk-facts` look is accepted**: no row separators and 16 px values (14 px terms). Recorded explicitly as accepted drift in DA-34 and DA-28. No exception.
5. **Toolbar stack: option C.** Container `max-width: 38.75rem` combined with `:host(:state(shell-mobile))` through #5's `ShellTierController`, which gives zero drift across the sampled widths (no toolbar window). This amends FORK-2 (a) of 2026-10-07: the one-column rule stays the A-1 container threshold T = 45 rem (720 px) with no controller, and the controller is used ONLY for the toolbar stack. The controller consumes the host's one `attachInternals()`, so the screen must not call `attachInternals` anywhere else.
6. **Prose: keep our token CSS (E-23).** The `ch` grant is approved for `max-width: 68ch`. `letter-spacing` and `text-wrap` are dropped (not in E-23). G-14 is reworded: `sk-prose` exists in `@spec-kitty/styles` 1.1.0-rc.10 but does not match the prototype.
7. **Everything else as the evidence recommends.**
   - The drift register DA-1 to DA-41 is confirmed as proposed, with these additions: (i) DA-34 and DA-28 name the facts drift; (ii) DA-23 reads "focusable only while it overflows", and Home and End are inert for single-line files; (iii) DA-33 has no toolbar window under option C; (iv) DA-29 is resolved by the pill ruling. DA-39 (`900px` measure) and DA-40 (`68px` toolbar `min-height`) are kept as pinned values; DA-41 (the bidirectional-control notice) is confirmed.
   - A-1 numbers: T = 720 px (45 rem); the toolbar stack is option C of ruling 5.
   - A-8a and A-8b are accepted as drafted (both parts); the EV-2 sentence is written back. Note: WP04's `mailto:` check also rejects a leading or trailing `@`.
   - E-25: `white-space: pre-wrap` plus a pinned 900 px measure; no `overflow-wrap` grant; no box paint.
   - E-28: the `270px` track and the `68px` toolbar `min-height` are pinned.
   - A-10 is not written.
   - The copy stays as rendered (`contracts/defaults.md`).
   - WebKit is untested: an ACCEPTED OPEN RISK (Kitty Desktop on Linux runs WebKitGTK). The PR description states it.

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

Timing (PLAN-TEST-008 (a), ruled 2026-10-06): the spec numbers of NFR-006 are HARD ceilings (500 ms for a 256 KiB document and for a 1000-entry tree, 200 ms for a re-render), each measured as the best of three runs after a warm-up, in Chromium (the engine that asserts them), by the test clock (never in the screen). Before the clock starts the test pins the expected branch: the 256 KiB document (`makeLargeMarkdown`, the large content of the stories) must resolve to `ok` with a block count above 0, and the over-budget document to `fallback`, so a fast fallback cannot pass the large-document check. The re-render claim is proved by a counted `parseTokens` spy: after N property changes that leave `content` unchanged the spy count is 1 (removing the cache fails it), plus the node identity of an unchanged rendered block. The spec numbers (500 ms, 200 ms) ARE the gate ceilings; there is no multiplier. A multiplier would be allowed ONLY as the numbered amendment A-10 (`plan.md`); CP-1 ruled on 2026-10-07 that A-10 is NOT written and there is no multiplier: a test over the spec numbers that fails is a finding that goes back to the operator and is never quietly relaxed. The markdown budget is the option O3 values (`maxTokens` 150,000, `maxNodes` 110,000, `maxTableCells` 32,000), and the ceiling test uses a document shape and a margin that do not flake, because inline-heavy 149k-token documents measured 437 to 512 ms against the 500 ms ceiling.

## Owned files, gates, red-first, commit rule

**Owned files** (frontmatter `owned_files` is authoritative and tool-owned; stage only these). A change you need in a file you do not own is a change request in the hand-off (file and change), not an edit. The part files created as stubs by WP08 are owned by WP09, WP10 and WP11 afterwards.

**Gates this work package must pass before hand-off** (each exits 0 with the reporter's pass count above 0 and fail 0 where a reporter exists): `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm manifest:check`, `pnpm hygiene`, `pnpm test:scripts`, `pnpm contract:check && pnpm test:contract`, `pnpm test` (the unit-tests gate; its output must list your test files), `pnpm build-storybook`, and `pnpm test:terminology` for every work package that writes under `packages/*/src` (and its exit check). `pnpm visual` is NOT an exit check before WP13; `pnpm gate-proof` is run by the orchestrator where a plant changed. A gate that is red is classed against the baseline table WP01 recorded and the orchestrator names in the dispatch (`tracer-approach.md`): a red absent from it is INTRODUCED and fixed here; a red present in it is reported as pre-existing and not fixed here.

**Red-first rule.** For every behaviour, plant and gate case: write the failing test (or the plant, or the negative case) FIRST, run it, and see it fail for the right reason; record the failing line in the hand-off; only then implement. A test that never failed proves nothing. Per test file, one deliberate revert of the behaviour (temporary local edit, never committed) producing a named failing test, then the restore, is listed in the hand-off; the reviewer re-runs two of them.

**Test quality rules and test strategy**: the binding text is quoted VERBATIM in the section "Test strategy and test quality rules (verbatim)" below (#4 D-34 rules 1 to 5 and this mission's `research.md` D-19). Rule 6 of #4 is its 500-Mission test and does not apply here.

**Visual drift = REJECT.** The approved prototype (`<prototype>/05-artifact.html` with `prototype.css`) is the visual authority (C-006, NFR-008). The only allowed differences are the drift register DA-1 to DA-41 (`spec.md` "Visual Drift Register", extended by DA-39 to DA-41 in the plan) AS CONFIRMED by the operator at CP-1 (DA-1 to DA-41 confirmed on 2026-10-07; an entry not confirmed would be PROPOSED) and any entry the operator did not confirm is a REJECT item for the work package that introduces it. Any other visible difference is a defect, not a "design review" item. Screenshot the prototype beside your story and describe both in the hand-off (uncommitted; no baseline PNG before WP13).

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept, test cleanup, the aggregate review squad, history compaction into named slices and a rebase; that sequence belongs to the orchestrator. Commit on your lane branch with `spec-kitty safe-commit` (explicit files, `--to-branch`), a conventional message (`feat(artifact-viewer-screen): ... (#7)`) ending with the attribution trailer the harness gives you; stage owned files only (never `git add -A`); the hand-off lists each commit hash verified with `git cat-file -t`.

## Named edits outside this work package's own surface (recorded in the hand-off with a one-line rationale)

- none planned; a defect found in `sk-artifact-screen.ts`, `state-parts.ts`, `refusal-parts.ts` or `inspector-parts.ts` is a change request to the orchestrator

The tool refuses to auto-commit uncommitted paths outside `owned_files`: commit any out-of-map edit yourself with `spec-kitty safe-commit` before moving the WP to review. Shared-file ownership across work packages is the plan's table "Shared files: who may write them" (quoted above).

## Branch Strategy

Planning branch and final merge target: `feat/artifact-viewer-screen-7`. Execution happens in the lane worktree the tool allocates (see `lanes.json`); depends on: WP08. Start from the approved parent's tip (the orchestrator pre-creates or verifies the lane per the plan's lane mechanics); do not create, switch or reset branches yourself.

Implementation command: `spec-kitty agent action implement WP09 --mission artifact-viewer-screen-01M47VP5 --agent <name>`

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
