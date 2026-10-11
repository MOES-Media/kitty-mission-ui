# Projects screen: design decisions

Running log of design decisions and their outcomes for mission `projects-screen-01M4C939` (mission-ui#9). Newest last. Full reasoning and rejected alternatives live in `research.md`; this file records what changed and when. Same style as the files of missions #4 and #5.

## Operator rulings on the open questions Q1 to Q10 (2026-10-08)

Given by the operator on 2026-10-08 and recorded here by the phase agent from the orchestrator's relay. The drift register DP-1 to DP-27 is not covered: it is PROPOSED and goes to the operator at checkpoint CP-1.

- **Q1** option A: a new top-bar-only layout value on the shell's existing `layout` property. The screen adds no property for it.
- **Q2** as recommended: every row openable unless the host marks it not openable.
- **Q3** option B: a separate optional `sk-open-project-dialog` with its own states and `sk-browse-folder`; the host does the real folder picking.
- **Q4 to Q7, Q10** as recommended (see `spec.md` Clarifications for the text).
- **Q8** the contract is re-vendored ONCE, first, by this mission after spec-kitty PR #5881 merges. No stacked branches; Drift and Ops start from `main` after the re-vendor lands.
- **Q9** the V2 prototype pages are current.

## Orchestrator decisions (mechanical, across the three screens, 2026-10-08)

- Exception ranges: Projects E-31..E-34, Drift E-35..E-39, Ops E-40..E-43. An unused number stays unused.
- `sk-retry-load` targets unique across screens: Projects `project`, `projects`, `folders`; Drift `drift-report`; Ops `ops-page`. The union lives in `src/retry-types.ts` (arrives on `main` with #7); a screen whose branch starts earlier extends it wherever `main` holds it, and the plan records this.
- `sk-open-mission` carries `{ missionId, slug }`, as shipped.

## Plan phase (2026-10-08), decided in `research.md`

Decisions D-01 to D-26 are in `research.md`. Plan squad (2026-10-08, in-session, no sub-agents): 13 raw findings, 12 confirmed, 1 refuted; two fix rounds; all resolved (`reviews/plan.fixes.md`). Proposed for CP-1: drift register DP-1..DP-27, exceptions E-31..E-34, spec amendments P-1 (dialog has no `labels`), P-2 (screen `labels` is `ProjectLabelHooks`), P-3 (entry gains optional `name`). No fork held.

## Spike outcomes (to be appended by the orchestrator from the work package reports)

(none yet)

## WP01 baseline and re-vendor (2026-10-08)

- **Re-vendor:** spec-kitty `805e122df79e862571839715d023920904891851` (PR #5881 merged 2026-10-08), `provenance: main`; 200 vendored files, 72 fixtures. `Project` carries the seven members the plan read; `Project.yaml`, `ProjectHealth.yaml` and the three examples are byte-identical upstream. The tree also carries the Drift and Ops paths and schemas that #10 and #11 need.
- **Build-base gate baseline (all green, nothing pre-existing red):** typecheck, lint, lint:styles, lint:no-io, lint:data-driven, manifest:check, hygiene, contract:check, build-storybook exit 0; test:no-io 69; test:data-driven 92; test 1058 (65 files); test:scripts 337; test:contract 97 (99 after the two overlays); test:terminology 12; visual 175 passed over 174 baseline PNGs.
- **Overlays:** `projectUnknownHealth` through the `health-open` relaxation (`ProjectView`, registry-only), and `projectLong` (255-character branch, 64-character version), each with a revert proof.

## WP02 and WP03 approvals (2026-10-08)

- **Retry union location (plan Build base item 2):** `main` has no `src/retry-types.ts`, so the three Projects members are in `logic/wp-retry.ts` (`RetryLoadDetail`). #7 creates `src/retry-types.ts`; whichever of #7 and #9 lands second moves the three members there during its merge of `main`. The `retryDetail` narrowing in `sk-work-package-screen.ts` is internal (`logic` is not exported) and changes no #5 behaviour.
- **Orchestrator (contract wording, single remedy):** `contracts/defaults.md` amended so `resolveEntry` returns `ResolvedEntry` (a non-row stub, or the row kind carrying the raw project) and `buildRow` returns the `EntryView` for every entry. Screens call `buildRow`.
- **Provisional copy for CP-1 (no contract text):** `CANCEL_LABEL`, `OPEN_DISABLED_REASON`, `LIST_LOADING_TEXT`, `LIST_EMPTY_TITLE`, `LIST_EMPTY_BODY`, `LIST_ERROR_BODY`, `FOLDERS_LOADING_TEXT`, `FOLDERS_EMPTY_TEXT`, `FOLDERS_ERROR_BODY`, `schemaVersionText` ("schema version N", assistive technology only; data-model Q4).
- **Wrap-up fold:** `project-retry.test.ts` "carries a repeated key as given" compares a call with itself and proves nothing; fix it in the test cleanup.
- **WP03 (two review cycles, test-only fixes):** the original absence check on `[aria-current]` was vacuous (the attribute lives in each nav item's shadow root); the test now reads the item's `current` property with an in-test positive control, and every loop asserts its count.
- **For CP-1 (WP03 review):** the shell brand mark (cat) differs from the prototype's arrows. It predates this mission and no DP entry names it.

## CP-1 confirmed (2026-10-08)

Operator rulings on the WP04 evidence packet (spikes S1 to S8). Every grant below is narrow, pinned to its file, its selector and its values, token-only except where a literal is named, and leak-tested against every sibling part file. A WP that cannot match the prototype within these grants reports the gap; it does not widen a grant.

**Fidelity (operator: "grant all five")**
1. Row hover paint (F1): granted, E-31(a).
2. Health pill outline and mono: granted, E-31(c). The prototype badge's 1px outline and JetBrains Mono close the N-1 gap.
3. Page header typography: granted, E-34 (the number is reused; S1 showed no family exception is needed). The prototype is a 24 px title and a 12 px mono uppercase muted eyebrow. The library `sk-page-header` draws 32 px and a plain sans eyebrow (N-3, N-8).
4. Dialog path field mono: granted, E-32(b) (N-4, the font half; the folder glyph in the field is confirmed drift).
5. Dialog shadow: granted as a literal in E-32. F3 is ruled "literal", not the token (N-5). The backdrop blur stays dropped (confirmed drift).

**Exceptions as ruled (each with the spike that decided it)**
- **E-31, `row-parts.ts` (S1, S4, S5):**
  - (a) `sk-action-row:hover::part(row)` sets `border-color` and `background-color` from tokens that render the prototype's rgb(129,129,139) and rgb(28,31,37). The implementer measures the token values. A token that does not match is reported, not replaced by a literal.
  - (b) `white-space: nowrap` and `text-overflow: ellipsis` on `sk-pill-tag::part(tag)` and on the version text.
  - (c) the pill `border` (width token, solid, the tone's foreground colour) and `font-family: var(--sk-font-mono)` on `sk-pill-tag::part(tag)`.
  - Dropped: border, radius, background, `min-height: 82px` and the raw row `button`. The row is `sk-action-row`, with `padding: var(--sk-space-4)` on `::part(trigger)` and no exception.
- **E-32, `sk-open-project-dialog` styles (S2, S5):**
  - `width: min(680px, calc(100vw - 32px))` and `max-height: min(720px, calc(100vh - 32px))`.
  - `border: var(--sk-border-width-1) solid var(--sk-border-control)`, `border-radius: var(--sk-radius-lg)`, `background: var(--sk-surface-card)`, `color: var(--sk-fg-body)`.
  - `box-shadow: 0 24px 80px rgb(0 0 0 / 0.48)` (literal).
  - `::backdrop { background: rgb(3 6 10 / 0.72) }` (literal; no token exists).
  - (b) `font-family: var(--sk-font-mono)` on `sk-form-input::part(control)`.
  - The dialog is native `dialog` with `showModal()`; the folder field is a `readonly` `sk-form-input`.
- **E-33, `folder-list-parts.ts` (S7, S5):** a raw `button type="button" role="option"`, with:
  - `background: var(--sk-surface-pill)` on hover and selected;
  - `color: var(--sk-fg-default)` on selected;
  - a forced-colours `border` on the selected option.
- **E-34, the screen's header styles (S1, S5):** on `sk-page-header` parts only:
  - the title gets a `font-size` token rendering 24 px;
  - the eyebrow gets `font-family: var(--sk-font-mono)`, a size token rendering 12 px, `text-transform: uppercase`, letter-spacing as the prototype, and the muted foreground token.
  - The same treatment applies to the "Recent projects" toolbar eyebrow.
  - Values are measured against `01-projects.html` at 1280.
- **Narrow column (DP-22):** use a lint-clean form if one exists (`max-inline-size` with a token or rem, to be probed in WP05). Otherwise use a one-line pinned grant of `width: min(900px, 100%)` in the screen styles, recorded in the WP05 hand-off.

**Container thresholds (S3, F2 ruled "flush"):** the screen sets the shell's `flush` and pads its own inset parts (Pipeline precedent). The header stacks at a content cell of 800 px or less; rows go to one column at 620 px or less. Both flip at exactly the prototype's viewport widths.

**Drift register:**
- Confirmed as annotated in the packet: DP-1 to DP-27.
- DP-8 is rewritten: the chrome comes from `sk-action-row`; row height 85 against 89.4 is confirmed drift; hover is E-31(a).
- DP-25 carries the flush thresholds 800 and 620.
- New entries:
  - N-1 is closed by E-31(c). N-3 and N-8 are closed by E-34.
  - N-4's font half is closed by E-32(b); its glyph half is confirmed drift.
  - N-5 is closed by the E-32 literal.
  - Confirmed drift: N-6 (`sk-notice` keeps the library look, the #7 precedent) and N-7 (the brand mark stays the shell's cat; operator: keep, known drift).
  - N-2 and N-9 do not arise (flush).
  - N-10 is a spike omission: the screen supplies the "Local filesystem" eyebrow.

**Amendments:** P-1 (the dialog has no `labels`), P-2 (screen `labels` is `ProjectLabelHooks`), P-3 (an entry gains an optional `name`), all confirmed as written.

**Copy:** the ten provisional strings recorded at the WP02 approval are confirmed as drafted.

**Notes for later WPs:**
- The S6 Tab walk in a native modal passes through one document-body stop before wrapping. The WP07 and WP08 focus tests should expect that stop, or assert only that no page control receives focus.
- S2: the open-dialog stories render the dialog open at load. There is no harness change; confirm this in the pinned container in WP09.

## CP-1 addendum at the WP05 review (2026-10-08)

Orchestrator, applying the operator's standing prototype-fidelity preference (narrow, pinned, token-only grants over drift; CP-1 "grant all five"). WP05 owns the lint configs, so these entries are added in WP05 and the later WPs use them. Values are measured against `01-projects.html` at 1280.

- **E-32(c), dialog chrome, dialog file only:**
  - the eyebrow "Local filesystem" gets the E-34 eyebrow treatment: mono family token, the size token rendering 12 px, `text-transform: uppercase`, `letter-spacing: 0.08em`, and the subtle foreground token;
  - the header and footer separators: `border-block-end` and `border-block-start` with the width token, `solid` and the border token;
  - the hint and the disabled reason in the muted or subtle foreground token the prototype renders;
  - `.kittify/` and `kitty-specs/` in the hint are drawn as `code` in the mono family token. The copy stays in `defaults/`; how the markup is split is the WP's choice, data-driven.
- **E-34(b), screen header band, `header-parts.ts` only:** the prototype's 1 px bottom border (width token, `solid`, border token) and its minimum block size (76 px, as a token or a rem calc; a px literal is refused).
- **E-35 is not used here** (it belongs to #10). The state panel look (DP-18, "#4's panel look") is drawn in `state-parts.ts` under a grant that mirrors #4's panel values (the #7 precedent E-45): dashed card border, fill, radius and padding tokens only. It is pinned to that file and added as **E-33(b)** so that #9 stays inside E-31..E-34.
- **Eyebrow colour (E-34 and E-32(c)):** "muted" in CP-1 means the token the prototype renders, `--sk-fg-subtle`.
- **E-33 reset words:** `transparent` and `inherit` in `folder-list-parts.ts` are accepted (a raw button needs them).
- **Copy gaps (WP05 decisions 5 and 6) accepted:** the folder-count announcement "Folders, N" is built from existing strings; per-entry announcements use the row's accessible name. The toolbar is drawn in every state, with the count only when ready; the notice only when ready or empty.
- **E-32(d), dialog type scale (orchestrator, at the second WP05 review, standing prototype-fidelity preference):** the dialog sets a base `font-size: var(--sk-text-sm)`, so the hint renders 14 px as in the prototype rather than 16 px. The title `h2` gets the display family token and the size token rendering 18 px, against the 24 px browser default, which brings the header band to the prototype's 78 px. The `sk-form-input::part(label)` weight takes the token rendering the prototype's 600. All three are pinned to the dialog file.
- **Dialog spacing (defect, tokens only, no grant):** body `padding: var(--sk-space-5)` and `gap: var(--sk-space-3)`, and actions `gap: var(--sk-space-4)`, as the prototype measures.
- **Dialog header line-height (orchestrator, at the WP05 approval):** the dialog header band measures 77 px against the prototype's 78.4 px. The prototype page sets `line-height` 1.5 (1.3 on the `h2`); the dialog keeps `normal`. This sub-2 px difference is accepted as drift rather than adding a line-height grant.
- **WP05 approved after two review cycles.** Note that the E-32 value pins are per property within the dialog file, not per selector (the #7 precedent).

## Rulings at WP07: folder list fidelity (2026-10-08)

Orchestrator, applying the operator's standing prototype-fidelity preference (narrow, pinned, token-only grants over drift). These are named out-of-map edits by WP07 to the WP05-owned `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs` and `sk-open-project-dialog.ts`. Each new entry carries a pass case, leak tests across every sibling and a value plant.

- **E-33(c), `folder-list-parts.ts` only.** Without these, the lint-clean raw option keeps the browser's 2 px outset border, 13.33 px Arial and square corners, and the listbox has no frame.
  - On `[role=option]`: `border: 0` (reset, inside the E-33 pin), `border-radius: var(--sk-radius-sm)`, `font: inherit`, `text-align: start`, and a minimum block size of 46 px as a token calc.
  - On `[role=option]:focus-visible`: the token focus outline the library uses.
  - The "Parent folder" text takes `color: var(--sk-fg-muted)`.
  - On `[role=listbox]`: `border: var(--sk-border-width-1) solid var(--sk-border-default)`, `border-radius: var(--sk-radius-md)`, `background: var(--sk-surface-page)`, and a minimum block size of 220 px as a token calc.
  - px literals are refused. Each value is measured against the prototype at 1280.
- **E-31(c) extended to `folder-list-parts.ts`:** the "valid project" `sk-pill-tag` takes the same outlined mono treatment as the row pills. The pill box size is closed with token padding on `::part(tag)` (a layout property, no grant).
- **E-32(e), dialog line-heights, dialog file only:** base `line-height: 1.5` and the title `h2` `line-height: 1.3`, as the prototype page sets. This closes the 11 px dialog height gap and the 77 px against 78.4 px header band (it supersedes the WP05 approval note that accepted the line-height drift).
- **Element defect (single remedy, T044):** Open is enabled only when the dialog `status` is ready AND the selection is valid (`ready && valid`), in both `render` and `confirmOpen`, and the reason is shown in every non-ready state. A test covers `status="error"` with a still-valid selection.
- **At the WP07 review (orchestrator, standing prototype-fidelity preference), named out-of-map config edits by WP07:**
  - **E-31(d), pill line-height:** `line-height: 1.2` on `sk-pill-tag::part(tag)`, pinned to the E-31(c) files (`row-parts.ts` and `folder-list-parts.ts`). The library's 1.5 makes the pill 28 px against the prototype's 24.4 px. WP07 draws it in the folder list. The row pills take it when WP08 merges lanes f and g; WP08 draws it in `row-parts.ts`.
  - **E-32(f), dialog footer buttons and field size, dialog file only:**
    - on the `sk-button` parts: `font-size: var(--sk-text-sm)`, the semibold weight token, a minimum block size of 44 px as a token calc, token inline padding (no grant), and the Cancel pill border (width token, `solid`, border token, `--sk-radius-full` or the token the prototype renders);
    - `font-size: var(--sk-text-sm)` on `sk-form-input::part(control)`, so the field is 14 px and 79 px tall.
  - **Focus outline:** "the token focus outline the library uses" is `--sk-border-width-2` with a width-2 offset, which is also the prototype. The E-33(c) pin moves from width-1 to width-2.

## Rulings at WP06: screen type and progress (2026-10-08)

Named out-of-map config edits by WP06 (`stylelint.config.mjs`, `eslint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`) and to the WP05-owned screen file. WP07 also added config entries in lane-g; WP08 merges the two as a union.

- **Operator: grant the screen type (U1, U2), as E-34(c).** One pinned type grant scoped to the Projects screen files (`sk-projects-screen.ts`, `header-parts.ts`, `row-parts.ts`, `state-parts.ts`), each value tied to its file:
  - base `font-size: var(--sk-text-sm)` and `line-height: 1.5` on the screen host;
  - the `h1` gets `font-family: var(--sk-font-display)` and `color: var(--sk-fg-default)`, with the prototype's `letter-spacing` and `line-height` 1.2;
  - the muted supporting copy gets `color: var(--sk-fg-muted)`;
  - weights: eyebrows semibold, project name bold, pill regular;
  - row text (version, location, side text) at `var(--sk-text-sm)`;
  - the toolbar count at `var(--sk-text-sm)`.

  Values are measured against `01-projects.html` at 1280, token-only. The pill padding is closed with token padding on `::part(tag)` (layout, no grant).
- **Operator: adopt #4's progress sheet (U4).** A `class=` prefix grant for `sk-progress` only, in `state-parts.ts` and `row-parts.ts` (ESLint, with leak tests in every other file), plus the sheet adopted in the screen file, as #4 does. The native browser-blue `<progress>` goes.
- **Orchestrator (U3):** the "Open project" button's folder icon and its library box are a library gap (the design library has no button icons). Confirmed drift, with a design-library sunset note.
- **Orchestrator (U5, narrow, single remedy):** long project names ellipsize on one line instead of breaking mid-word. E-31(b) (`white-space: nowrap`, `text-overflow: ellipsis`) is widened to the row title in `row-parts.ts`, and the full name stays available as the title text.
- **Orchestrator (panel heading):** the empty, loading and error panels mirror #4's panel (E-33(b)). That includes #4's heading size, so the 16 px against 18 px gap is a defect, closed with the token #4 uses.
- **Accepted design choices from WP06:**
  - the "Open project" button sits beside `sk-page-header`, not in its `actions` slot (needed for the 800 px flip), with the header's `::part(meta)` hidden;
  - the toolbar is `sk-section-header`;
  - the empty state has no second button;
  - the row container query is `max-width: 588px` (the row width at a 620 px cell).
- **Operator: FR-003 accessible name amended (WP06).** `sk-action-row` builds its name from all the visible row content and has no name passthrough. The row's name starts with the project name, then the health and the Mission count, followed by the row's other visible text. Nothing visible is hidden from assistive technology. The tests assert that order and that there is no arrow glyph. A strict "name, health, count" was declined, because it would hide the version, the activity and the location from screen readers.
- **At the WP06 review (orchestrator):**
  - **FR-003 wording, within the operator's ruling.** The computed name follows the row's visual reading order, which is also the prototype's order: name, version, health, count, active-ago, location. The test pins the exact computed string instead of a loose pattern. The decorative arrow stays `aria-hidden`, because it is a glyph, not text.
  - **Fixtures (FR-028, single remedy).** `projectSchemaDrift` and `projectAllNull` come from the vendored examples through the contract generator (`scripts/contract/registry.mjs` and `overlays.mjs`, as `structuredClone` of each example). This is a named out-of-map edit by WP06 to WP01-owned files; `fixtures.ts` imports them and spreads only host overrides.
  - **E-34(d), the "Open project" button, standing prototype-fidelity preference, `header-parts.ts` only:** `font-size: var(--sk-text-sm)`, the semibold weight token, a 44 px minimum block size as a token calc, and token inline padding, as the dialog footer buttons (E-32(f)). The target is 150x44 at 14 px and 600. The icon stays confirmed drift (U3).

## Operator Storybook review (2026-10-09)

- **Operator: the Storybook is approved as built.**
- **Operator: the stories move under `Screens/Projects/…`** (the screen, its tiers and the open-project dialog), matching #5's `Screens/Work Package/…` and #7's `Screens/Artifact/…`. Baselines are renamed, not regenerated, and must stay byte-identical.

## Wrap-up (2026-10-09)

- Accepted with `spec-kitty accept --mode local --lenient` (the `src/`, `tests/` and `docs/` path conventions do not apply to this repository) (a recorded spec-kitty tooling issue). The 33 acceptance criteria carry `pass` verdicts with evidence.
- Issue matrix: `#5528`, `#5776`, `#5881` and `#496` are `not-applicable` (cited only); `#9` stays `in-mission` until the orchestrator sets its terminal verdict after the merge.
- Dev-assist folds on lane-i, each its own commit:
  - the open-project dialog's listing-error "Try again" sits the screen error's 12 px (`--sk-space-3`) under the notice; one baseline regenerated (`screens-projects-open-project-dialog--error-1280`);
  - the stories moved to `Screens/Projects/Screen`, `Screens/Projects/Tiers` and `Screens/Projects/Open project dialog`; the 36 baselines renamed byte-identical (R100, no regeneration);
  - the README visual timing note corrected to 813 s (674 s x 210/174) and 2.07x for the 28-minute timeout;
  - the E-31 (b) comment in `stylelint.config.mjs` names the row title (U5).
- Not folded: the byte-identical story pairs `header`/`health-healthy` and `notice`/`not-openable` are accepted as harmless.

## Design-library follow-ups filed (2026-10-10, operator: file the ui#9 issues at wrap-up)

In spec-kitty/spec-kitty-design:
- action-row hover (E-31(a)) → #525;
- pill density and outlined mono (E-31(c), E-31(d)) → #526;
- listbox and option (E-33, E-33(c)) → #527;
- action-row accessible-name passthrough (the FR-003 ruling) → #528;
- page-header compact scale (E-34) → #529;
- modal dialog with slots (E-32): comment on the existing #503;
- button icons (U3): comment on the existing #496.

## Operator rulings on the pre-merge squad forks (2026-10-10)

- **Dialog error announcement (A11Y-003):** the polite region only. The dialog's error `sk-notice` has `announce="off"`, as on the screen.
- **Open's reason (A11Y-005):** the dead `aria-describedby` is dropped. The visible reason follows the button in reading order. Forwarding was asked upstream on spec-kitty-design#496.
- **PR-31 (CONTRACT-001):** waived as a story or baseline. PR-31 is proven by the interaction test, which uses real forced-colours emulation and the light theme. FR-031 and SC-001 are amended, and the acceptance evidence is corrected.
- **Schema version for assistive technology (CONTRACT-002, Q4):** blocked on the library. `sk-action-row` cannot carry a description to its inner control. Asked on spec-kitty-design#528. `ProjectRowView.description` stays, ready to wire.
- **Orchestrator:** TESTS-005 (the pre-existing loose `classOnly` prefix) is folded into #9 per the no-follow-up rule.
