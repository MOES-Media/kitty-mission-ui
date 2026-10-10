# Artifact Viewer screen: design decisions

Running log of design decisions and their outcomes for mission `artifact-viewer-screen-01M47VP5` (mission-ui#7). Newest last. Full reasoning and rejected alternatives live in `research.md` (plan phase); this file records what changed and when. Same style as the files of mission-ui#4 and mission-ui#5.

## Operator rulings on the open questions Q1 to Q9 (2026-10-06)

Given by the operator on 2026-10-06 and recorded here by the orchestrator, verbatim: **"Approve + accept all 9"**. Two things are ruled by that sentence:

1. **The `markdown-it` runtime dependency is APPROVED** (Q1), under these conditions, all binding: `html: false`; its token stream turned into Lit templates; no `innerHTML` and no `unsafeHTML` anywhere in the screen; links never navigate; images never loaded; a hostile-corpus test is the gate (not the library's reputation).
2. **All nine questions are decided as their written recommendations** (issue #7, "Questions to confirm before planning"). The ruling text is the recommendation.

- **Q1, Markdown rendering.** Option (b): the screen renders with `markdown-it` (`html: false`), turned into Lit templates from its token stream. Links never navigate (relative artifact links and external links emit events), images are not loaded (shown as their alt text and a link), tables scroll inside their own box, and any throw falls to the AV-05 fallback. If a later need forces HTML output, it goes through DOMPurify with a fixed allowlist first. The dependency is named in the PR.
- **Q2, Who draws the tree.** The shell tree draws it (as it does Work Packages), fed by the pure `buildArtifactTree(entries)` helper this mission exports from `logic/`. `sk-artifact-screen` is the document pane plus inspector, set to `flush`. The screen's own events stay about the document; `sk-navigate` and `sk-tree-toggle` are the shell's.
- **Q3, Inspector contents.** File facts always (kind word, media type, size, modified, redacted yes or no); Mission facts only when the host passes them, hidden when absent; linked Work Packages only when the host passes them; "authoritative" dropped; the read-only note kept. Approved drift from the prototype.
- **Q4, Refusals.** One shared layout (the prototype's "Artifact unavailable" block: eyebrow, title, path, one sentence); the sentence is chosen by `code` from `defaults/` (words only: too large with its size, not text, credential found, unreadable, not found). No content is ever shown. Retry only on `artifact_unreadable` and on the listing error; a 404, 413, 415 and 422 are final for that path.
- **Q5, Fallback trigger and non-markdown files.** A known text `mediaType` that is not markdown (json, yaml, jsonl, csv, plain) shows Raw only, with no Rendered tab and no notice. "Rendered view degraded" is only for a markdown file whose renderer throws or exceeds a render budget.
- **Q6, Redaction notice.** When `redacted` is true, one quiet line in the inspector and above the document ("host paths and e-mail addresses are replaced"); the markers stay as they come; hidden when false.
- **Q7, Events.** `sk-select-artifact` `{ missionId, path, kind }` (internal markdown link; the tree leaf is the shell's `sk-navigate`, Q2); reuse `sk-select-work-package`, `sk-open-pipeline` and `sk-retry-load` from #5; new `sk-open-link` `{ href }` for external links; all verb-noun; `sk-open-artifact` is consumed from #5, not re-emitted. **Amended by N-Q10 (ruled 2026-10-06): #5 has no `sk-open-pipeline` event (its P-1 ruling); "Return to Pipeline" emits `sk-open-mission` `{ missionId, slug }`.**
- **Q8, Contract pin.** Vendor from spec-kitty `main` at `1.0.0-SNAPSHOT`, with the `contract` gate checking the pin; re-vendor when the next slice (spec-kitty#5776) or the `1.0.0` tag changes the artifact shapes or vocabulary. (Spec-phase finding: the pin on this branch is still #4's `9f41e48`, `infoVersion` 1.0.0, which has no artifact reads; the re-vendor is the first work of the mission.)
- **Q9, Large listings.** No virtualization in v1; a 1000-row tree is plain DOM, folders collapsed except the path to the selected file, and the `truncated` note when it applies. Revisit if the Storybook review shows a cost.

## Precedents carried over (from #4 and #5, as ruled there)

Binding on this mission, restated so a reviewer need not open #5: CP-1 rulings and the drift register discipline (an unconfirmed difference from the prototype is a REJECT); flat or library panels (the inspector is flat as in the prototype, no `sk-card`, so #5's E-18 does not apply); pills ellipsize from one shared rule with the full text in `title` and the accessible name; visible secondary `sk-button` for artifact actions; E-21 words-only wrapping (a single over-long word ellipsizes, never breaks mid-word, except in source blocks, see DA-22); drift is a REJECT unless confirmed; a CP-1 checkpoint after the spikes; baselines committed only at the end of the mission; the operator's Storybook review after the last work package and before wrap-up; verb-noun events; exceptions numbered on from E-21 (this mission starts at E-22).

## Spec phase (2026-10-06): findings and new questions

Found while specifying, not decided by the operator's ruling above. Each new question carries a recommendation and is PENDING OPERATOR (the plan squad holds the plan phase, not this one) [all ruled on 2026-10-06: see below].

- **F-1** The prototype page 05 has no breadcrumb; its toolbar is a file icon and the file name. The issue lists "breadcrumb" among the prototype elements. The spec follows the prototype (DA-11) and asks the operator to confirm at CP-1.
- **F-2** The vendored contract pin does not contain the artifact reads (see Q8 note).
- **F-3** `MissionDetail` carries `missionType`, `targetBranch`, `topology`, `lifecycleStatus`, `slug` and `friendlyName`, so Mission facts Type and Target do have a source (the issue's gap 3 doubted this). The prototype's "Status: implement" has none for an artifact page; the row shows the lifecycle word (DA-28).
- **N-Q10** "Return to Pipeline" event. **RULED 2026-10-06 (operator): `sk-open-mission` `{ missionId, slug }`.**
- **N-Q11** Which Work Package a prompt or review file belongs to. **RULED 2026-10-06 (operator): match the path against the host's Work Package ids; no id pattern in the screen.**
- **N-Q12** What a link inside markdown does. **RULED 2026-10-06 (operator): resolve against the listing; internal match emits `sk-select-artifact`; absolute `http`, `https` and `mailto` emit `sk-open-link`; everything else is inert text.**

The full wording of the three is in `spec.md`, "Open Questions".

## Drift register status

DA-1 to DA-41 are CONFIRMED (CP-1, 2026-10-07; see "CP-1 rulings (2026-10-07)" at the end of this file). History: DA-1 to DA-38 were PROPOSED at spec time; DA-39 and DA-40 were added by A-6 and DA-41 by PLAN-SECURE-009 in the plan.

## Operator rulings on N-Q10, N-Q11 and N-Q12 (2026-10-06)

The operator accepted all three as recommended, 2026-10-06. Recorded by the plan-phase agent.

- **N-Q10.** "Return to Pipeline" emits `sk-open-mission` `{ missionId, slug }`. No `sk-open-pipeline` is added.
- **N-Q11.** The Work Package of a prompt or review file is found by matching the path against the host's `workPackages` ids (leading token of a path segment under the data-held `tasks/` segment, longest id wins). No `WP<digits>` pattern in the screen.
- **N-Q12.** A relative link resolving to a path in the listing emits `sk-select-artifact`; an absolute `http`, `https` or `mailto` link emits `sk-open-link`; everything else is inert text.

## Operator rulings on the plan-phase forks (2026-10-06)

"ACCEPT ALL" of the arbiter's recommendations for the 23 plan forks and amendments A-1 to A-8, recorded by the plan-phase agent. The list is in `spec.md` Clarifications, "Operator rulings on the plan-phase forks". Items that depend on spike evidence (thresholds, E-22 values, the tab control, DA-39 and DA-40 values) are PENDING CP-1 [ruled at CP-1 on 2026-10-07: see "CP-1 rulings (2026-10-07)" at the end of this file]. The unapproved EV-2 sentence was reverted; A-8 and the N-Q12 narrowings are decided at CP-1. #5 shows the same 689 to 719 px mobile-tier band; the arbiter checks it in #5's own review.

## Operator rulings on the seven new plan forks (2026-10-06)

Accepted as recommended: FRESH3-001 (a) reuse OverflowRegion; FRESH3-004 (b) narrow vocabulary claim, foreign codes via labels.refusal; partly filled vocabulary completes per group against defaults/; FRESH3-005 (b) IC-06b derives the R4 list; FRESH3-006 (a) sk-notice for the three quiet notes; FRESH3-008 (b) host-held expandedIds Set from sk-tree-toggle; FRESH3-010 (b) AV-17 test in IC-10. Recorded in spec.md Clarifications.

## Operator rulings on the four last plan forks (2026-10-06)

FRESH4-002 (a) screen-side focus detection, surface unchanged; FRESH4-003 (b) no axe, ariaSnapshot and explicit assertions; FRESH4-007 (b) vocabulary without copy (five groups); FRESH4-008 (a) artifact_listing_unreadable not retryable in the content table. Recorded in spec.md Clarifications.

## Alignment with the landed #5 (2026-10-07)

mission-ui#5 merged to `main` (PR #8, merge `ad94164`) after this design was made; its landing pass changed public surface this mission reuses (rulings: `kitty-specs/work-package-screen-01M44DSJ/tracer-design-decisions.md`, "Landing rulings (PR #8, 2026-10-06)"). `main` was merged into this planning branch (a merge, no rebase). Every place that assumed the pre-landing surface was read; the mechanical ones were aligned (one obvious edit each), the rest are listed as forks for the operator and are NOT edited. The earlier lines of this file are left as written.

Applied (mechanical):

1. **Exception numbers shifted by one.** #5's landing registered E-22 (`::part` restyles), so this mission's proposed E-22 to E-28 are now E-23 to E-29 (E-24 stays merged into E-23; E-29 stays conditional). Applied in `spec.md`, `plan.md`, `research.md`, `contracts/gates.md`, `contracts/sk-artifact-screen.md` and the 13 work-package prompts. Earlier lines of this file (and the review records under `reviews/`) keep the old numbers; read them with the shift: "E-22 values" above is now E-23.
2. **"#5's E-17 to E-21 stand" became "E-17 to E-22 stand"** (`contracts/gates.md`, `contracts/sk-artifact-screen.md`, `plan.md`, WP01, WP08, WP13). `research.md` line 28 is a dated record of #5 as verified on 2026-10-06 and is left.
3. **`::part` discipline adopted** (`contracts/gates.md`, under the exceptions heading): this mission plans no `::part` rule; if one is needed it follows #5's E-22 (a numbered exception, each selector pinned with exactly its declarations, part names checked against the library's `cssParts`, and a non-visual geometry guard).
4. **Focus capture on every update** (`contracts/sk-artifact-screen.md`, rule 8): the screen records its one focus boolean on EVERY update in `willUpdate`, not only when `selectedPath`, `status`, `contentStatus` or `content` changes (#5's CORR-003). The destination (the pane), the frame wait and the "only when focus fell to `body`" test are unchanged (PLAN-FRESH4-002 (a)).
5. **#5's retry type described as it landed.** `RetryLoadDetail` is the union of `WorkPackageRetryDetail` and `DetailRetryDetail` (each `{ missionId, wpId, target }`), not an interface (`research.md` D-04, `plan.md`, `contracts/sk-artifact-screen.md`, WP01, WP08, WP13). The design is unchanged (A-3).
6. **R-14 marked superseded** (`research.md`): #5 now follows the shell's mobile tier through `ShellTierController`, so the defect R-14 describes is gone from `main`.

Checked, no change needed: no `data-shell-mobile` or tier code exists in this design (the one-column rule is a container threshold, A-1); `ArtifactScreenMission` already uses the contract's field names (`friendlyName`); `OverflowRegion` is untouched by the landing (`overflow-region.ts`, `target` / `also` / `edges`, horizontal only, as PLAN-FRESH3-001 describes); the `sk-retry-load` payload is already a union discriminated by `target`; the retry ownership of this screen's listing and content failures is a screen's own regions; `sk-mission-shell` `tier` is documented public and unchanged in behaviour; `wp-part-selectors.test.ts` globs only `elements/sk-work-package-screen/`, so it does not touch this screen. The CP-1 items stay CP-1 work.

Forks (not edited; options and recommendation):

- **FORK-1, the home of the `sk-retry-load` union.** (a) Keep A-3: the neutral `src/retry-types.ts` holds the union and the one `declare global`; #5's `SkRetryLoadDetail` stays its own two-member alias. (b) Extend in place, as #5's README reads ("a later screen adds its own member to the union"): add the two members to `RetryLoadDetail` in `logic/wp-retry.ts`. Recommendation (a): (b) widens `SkRetryLoadDetail['target']` to `content` and `listing`, which #5's `retryLoad` and `retryPayload` are typed on, so #5's screen would need edits and its payload loses its exact assertion; (a) was operator-accepted and is the shape the README's rule allows.
- **FORK-2, the mobile one-column rule.** (a) Keep A-1: the container pair on one threshold (cell of 720 px or more), which the mobile tier (cell below 720 px) can never reach; no controller. (b) Also follow the tier through `ShellTierController` and `:host(:state(shell-mobile))`, as #5 does ("one shared rule"). Recommendation (a): the controller adds no behaviour here, claims the host's single `attachInternals()`, and A-1 is ruled; revisit only if CP-1 chooses a threshold below 720 px.
- **FORK-3, a content that disagrees with the selection.** #5 treats a detail for another Work Package or Mission as omitted and keys announcements on what is shown. This design has no such rule: `content.path` may differ from `selectedPath`, and `listing.missionId` or `content.missionId` from `mission.missionId`, and "content ready" is announced on the property. (a) Adopt: such a content is treated as null (the loading look the contract already gives `ready` with null content), and announcements are keyed on the shown path, not the property. (b) Leave: the host owes consistent data. Recommendation (a): small, mirrors the operator's CORR-004 ruling, adds a test row; needs a spec line (FR) and an acceptance case.
- **FORK-4, WP01 (IC-01a) is a re-vendor of bytes already held.** #5 vendored `b61d1fa` (`provenance: main`), and that tree already holds all the artifact reads (151 blobs, the seven responses, nine schemas and 13 examples); the `contracts` tree of spec-kitty `main` at `2261ad5` and at the current tip has the same tree ids as `b61d1fa`. The contract-pin text ("that pin has NO artifact reads", `--from-repo` "not merged") is stale. (a) Keep the pin at `b61d1fa`; WP01 becomes register fixtures and overlays, relaxations and literals, with no `contract:update`. (b) Re-pin to the tip anyway for a fresh `retrievedAt`. Recommendation (a): no byte changes, no churn; the WP01 prompt and `contracts/contract-pin.md` then need a rewrite of steps 1 and 2.

## Operator rulings on the four landing-alignment forks (2026-10-07)

The operator ruled all four forks as recommended; `spec.md` Clarifications carries the same record ("Operator rulings on the landing-alignment forks, 2026-10-07"). Applied the same day:

- **FORK-1 (a).** The retry union lives in the neutral `src/retry-types.ts` (A-3 stands). WP08 T052 names the landed members (`WorkPackageRetryDetail`, `DetailRetryDetail`, `RetryLoadDetail`) that move; #5's `SkRetryLoadDetail` stays its own alias.
- **FORK-2 (a).** The A-1 container threshold stays; no `ShellTierController` in this screen. No file changed.
- **FORK-3 (a).** Selection agreement: a `content` whose `path` differs from `selectedPath`, or a `listing` whose `missionId` differs from the Mission's, counts as not loaded; announcements are keyed on what is shown. (`ArtifactContent` has a `path` but no Mission id, so the Mission check applies to the listing.) Added: the rule in `contracts/sk-artifact-screen.md` (Rendering, Announcements, tests), FR-035 and an Edge Cases row in `spec.md`, the derivation in WP08 T053 and its tests in T054, the announcement tests in WP10 T066 and the "selection-agreement" exit check in WP10 and `plan.md`. No new FR id, work package or story row, so `wps.yaml` and `tasks.md` are unchanged.
- **FORK-4 (a).** The pin stays at `b61d1fa`. WP01 T002 is now "Confirm the pin (no re-vendor)", with no `contract:update`; `contracts/contract-pin.md` steps 1 and 2, the WP01 prompt, `plan.md` IC-01a and FR-038 are rewritten to match. WP01 keeps T001 (baseline), T003 to T007 (generate, register 13 examples and 17 overlays, two relaxations, bulk generators, exit run).

## CP-1 rulings (2026-10-07)

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

Written through the same day (the CP-1 write-back list of `plan.md`, items (1) to (10), plus every value ruled above): `spec.md` (rows read as amended, the drift register DA-1 to DA-41, NFR-014 and NFR-015, A-2, A-3, A-6, A-7, A-8, A-9, Base A, the FR-017 edge case), `plan.md`, `contracts/gates.md` (E-23, E-25 to E-29), `contracts/defaults.md`, `contracts/markdown-renderer.md`, `contracts/sk-artifact-screen.md`, `research.md` (G-14 reworded) and the prompts of WP07 to WP13. The prompts of WP01 to WP06 (done) are history and are not rewritten. The budget retune (ruling 1) is a named edit of WP08; the ceiling-test shape is WP12's. The design-library issues G-14 to G-16, G-19, G-20 and G-21 are NOT filed by this write-back: filing is outward work and waits for the operator's word.

## Orchestrator note at WP07: the E-29 pill carries the shared ellipsis (2026-10-07)

The CP-1 pill ruling (raw `button.sk-pill-tag`) chose the option described as "matches the prototype pill, with the shared ellipsis and the full text as a tooltip". #5's shared ellipsis rule (E-21) targets `sk-pill-tag::part(tag)` and cannot match a `button.sk-pill-tag`, so it cannot be reused. As written, E-29 grants no ellipsis properties. Applying the ruling as stated, E-29 also grants, for `inspector-parts.ts` only, the E-21 ellipsis declarations: `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` and `max-width: 100%`, each pinned. The Stylelint entry and its declaration pin test land with the WP that writes the inspector CSS. The tab height comes from tokens (`calc(var(--sk-space-7) + var(--sk-space-1))` = 36 px), so no length grant is needed.

## Operator ruling at WP08: the screen's panel paint becomes exception E-30 (2026-10-08)

The prototype paints the inspector with a left border and a hero background, and paints the toolbar band with a bottom border and a card background. CP-1 granted no paint for these, and no drift row accepts their absence. **Ruling:** add E-30, a token-only paint entry for this screen in the style of the Pipeline screen's E-12. It grants `border-inline-start`, `border-block-start`, `border-block-end` and `background`, with token values only, for `sk-artifact-screen.ts`, `inspector-parts.ts` and `toolbar-parts.ts`, each declaration pinned by a test. The sunset is the library's panel or card paint gap, the same family as E-12's. Rejected: recording the absence as accepted drift.

## Operator ruling at WP09: widen the grants so the document pane matches the prototype (2026-10-08)

The WP09 build matched the prototype everywhere the CP-1 grants allowed. It drifted in five places the grants did not cover. **Ruling: grant all five**, each as a narrow pinned value, tested per file:
1. **Tabs (E-26 extension, `tab-parts.ts`):** `border-radius`, `border-width`, `border-style` and `font: inherit`, so the tablist draws as the prototype's pill tray. The selected tab keeps a visible edge, so state is not shown by colour alone.
2. **Eyebrow (E-23 extension, for the eyebrow selector only):** `text-transform: uppercase` and `letter-spacing: 0.08em`. The CP-1 drop of `letter-spacing` still applies to headings.
3. **Toolbar file name (`toolbar-parts.ts`):** the mono font token, plus the E-21 ellipsis declarations (`overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`, `max-width: 100%`). The full name goes in `title`.
4. **Raw block (E-25 extension):** `line-height: 1.5`.
5. **Headings (E-23):** `line-height: 1.2` on headings. Prose keeps 1.65.

**Fallback notice tone:** attention, as DA-21 records. The stub comment that said "info" is wrong.

## Rulings at WP11: inspector heading size and the pill reset (2026-10-08)

- **Operator:** the inspector group headings get a narrow pinned grant, `font-size: var(--sk-text-base)` and `line-height: 1.35`, to match the prototype. The browser default is 18.7 px.
- **Orchestrator, applying the CP-1 pill ruling (E-29: "matches the prototype pill"):** the raw `button.sk-pill-tag` resets the browser button border with `border: 0` and takes `cursor: pointer`, both pinned in the E-29 entry for `inspector-parts.ts`. Without the reset the pill is 30 px with a 2 px border, against the prototype's 26 px.
- **Orchestrator (FR-027, single remedy):** for a prompt or review-cycle artifact with no Work Package match, `inspectorView()` in the screen file passes `linked: []`, so no pill shows. This is a named out-of-map edit to the WP08-owned screen file.

## Rulings at WP10: refusal and state card look, and the focus carry-over (2026-10-08)

- **Operator: grant the refusal/state look (E-45).** `refusal-parts.ts` and `state-parts.ts` get a narrow, token-only, pinned grant so the unavailable/refusal block matches `05-artifact.html?state=unavailable`: the dashed card border (style, width and colour tokens), the card fill, the radius token, the eyebrow `text-transform: uppercase` with the mono font token, the mono font token on the path, and the display heading size token. Each declaration is pinned and leak-tested.
- **Orchestrator (defect, single remedy):** in `sk-artifact-screen.ts`, a pending focus restore carries across updates (`focusWasInside = insideNow || restorePending`). A follow-up update with no property changes must not cancel the restore that a link-activated content swap needs. This is a named out-of-map edit. The `it.fails` link-swap test becomes `it`.
- **Orchestrator, applying the operator's standing prototype-fidelity preference (narrow pinned grants over drift):** E-45 also covers the residual drift WP10 measured. The eyebrow gets its size token (12 px), subtle colour token, weight and `letter-spacing: 0.08em`. The heading gets the display font-face token. All are pinned and leak-tested, in the same two files only. The operator is told afterwards.
- **Orchestrator, at the WP10 review (standing prototype-fidelity preference):** the E-45 extension also pins, in the same two files, the h1 `font-weight: var(--sk-weight-bold)` and `letter-spacing: -0.01em`, the path `font-size: var(--sk-text-sm)`, and a unitless `line-height` of 1.5 (body) and 1.2 (heading). This closes the measured 10 px card-height drift against the prototype.

## Rulings at WP12: large-text reflow and the wide table (2026-10-08)

- **Operator: NFR-004 "at 320 px and 400%" takes the WCAG 1.4.10 reading.** The check is a 320 px viewport at the default root size (the width a 1280 px window has at 400% zoom), where only tables scroll. It is not a 400% root font inside a 320 px viewport: that compounds to 1600% and leaves a 128 px column. The 200% root cases at 1100 and 720 px stand as written.
- **Orchestrator (AV-32d):** the story keeps the pairing's properties but carries one unbroken line, because the pairing's 64-byte document can never overflow and the raw block is a tab stop only while it overflows. `fixtures.ts` is unchanged.
- **Orchestrator, at the WP12 review (narrow pinned grant, readability):** a many-column markdown table scrolls in its box, but every column shrinks to its min-content width, so a long cell wraps into rows about 230 px tall at every width. The cells get a readable floor (`min-width` in `ch`) in `prose-styles.ts`, pinned as an E-23 extension with its leak tests; the box still scrolls. The fix is done in WP13, before the baselines are taken.
- **Orchestrator, at the WP12 review (test gap):** the tab stops on the document `article` and on the pane region are unasserted, because no fixture overflows those two boxes. WP13 adds an overflowing case for each, and removing the `tabindex` must fail it.

## Rulings at WP13: baseline findings (2026-10-08)

- **Operator: cap the tree indent (AV-30c).** At ten folder levels the shell tree's indent pushes the selected leaf's name entirely out of the 240 px column. The shared shell tree stops adding indent after a fixed depth (about six levels), so deep labels stay readable. This is a named out-of-map edit to the shell tree. Existing shell baselines must stay byte-identical.
- **Orchestrator (evidence, single remedy):** baselines whose ruled evidence sits below the 800 px fold get a taller viewport tag, so the evidence is in the image. These are AV-25a/b, AV-26a/b, AV-27 and AV-28 (the Linked Work Packages pills and the Mission facts), and AV-34 and AV-35 (the document under the inspector-first stack). AV-16 opens the folder that holds the unreadable rows, so "unavailable" is shown.
- **Orchestrator (AV-14, single remedy):** the listing error repeated one sentence as both title and body. The panel follows #4's Missions error panel convention for an empty host `errorMessage`.
- **Orchestrator (wide table):** the `12ch` cell floor (E-23 extension) is accepted. A 9-column table now scrolls with rows of 164 px instead of 233 px, and a 4-column table still fits at 620 px. A last-column-only floor is not taken.
- **Orchestrator (contract pin):** #7 stays on its contract pin. spec-kitty `main` has moved (the Projects, Drift and Ops reads), but no artifact path changed and `contract:verify-remote` is ok. #9 re-vendors at its own pin; whichever of #7 and #9 lands second regenerates during its merge of `main`.
- **Visual streak:** the failures in WP13's five runs were all `toHaveScreenshot` stability timeouts under parallel Playwright load, never pixel diffs. The streak is re-run after the fixes above.

## Operator Storybook review (2026-10-08)

- **Operator: the document uses the whole content area.** The 800 px reading column (`max-width: 800px` on the article, E-23) is removed, so the article fills the pane. Tables, code blocks and the raw and fallback source use the full width; a table scrolls only when it truly does not fit. Paragraphs and lists keep the 68ch measure (E-23's `ch` grant), and headings follow the prose they introduce. The E-23 pin drops the `800px` literal, and a plant of `max-width: 800px` is refused.
- **Consequence:** the baselines that show a document are regenerated (AV-01, AV-03 and every story whose document is wider than 800 px at its tier). Each is read side by side again. This supersedes DA entries that described the prototype's `.prose` column width.
- This was the operator's only Storybook review item. The wrap-up follows WP13's re-approval.

## Design-library follow-ups filed (2026-10-08, operator: "file the design library follow ups")

The sunset issues for this mission's gaps, in spec-kitty/spec-kitty-design. The operator plans to tackle them after Kitty Desktop v1 and the new dashboard ship.

- G-14 → #519: prose family, reading-measure token and element-selector tables (sunset of E-23).
- G-15 → #520: code-block element (E-25).
- G-16 → #521: tabs element (E-26).
- G-18 → #522: inline event-emitting link.
- G-20 → #523: facts and empty-state elements (E-27); progress is the existing #498.
- G-21 → #524: interactive pill (E-29).
- G-17: added to the existing #496 (icon set) as a comment.
- G-19: added to the existing #505 (inspector width; this screen's 270 px against Pipeline's 260 px, E-28) as a comment. The reading-measure half is in #519.
- **Orchestrator, at the WP13 cycle-3 check (operator intent: "render the whole table" when the space exists):** with the reading column removed, the 9-column plan table still scrolled at a 1640 px window (1198 px of content in a 1026 px box), with rows 164 px tall. The cause is the WP12 `min-width: 12ch` floor on every cell. It is replaced:
  - no cell floor;
  - the table sizes to its content (`width: max-content`, never wider than needed);
  - a data cell caps at a readable measure (`max-width` in `ch`, about 30 to 40ch, chosen from evidence), so only long cells wrap.

  Short columns keep their natural width. The table fits whenever the pane can hold it, rows stay a few lines tall, and the box scrolls only when the content really is wider. The E-23 pin swaps the `12ch` literal for the new value; `12ch` becomes a refused plant. This supersedes the WP12 ruling on the 12ch floor.
