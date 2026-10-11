# Mission Specification: Artifact Viewer screen

**Mission Branch**: `feat/artifact-viewer-screen-7`
**Created**: 2026-10-06
**Status**: Draft (questions Q1-Q9 and N-Q10 to N-Q12 ruled 2026-10-06; CP-1 confirmed 2026-10-07: the drift register DA-1 to DA-41 is confirmed, the values are ruled)
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#7 ("Artifact Viewer screen against the Mission Status contract"); the Mission Status contract `1.0.0-SNAPSHOT` on spec-kitty `main` (the two artifact reads of spec-kitty#5625); the approved Kitty Desktop V2 prototype page `05-artifact.html` with its `prototype.css` and `prototype.js`; and the design artifacts of #4 (merged) and #5 (not merged; read from its planning branch).

## Intent Summary

- **Primary actor**: a host (the local dashboard served by the Mission Status read service, or Kitty Desktop) that renders the Artifact Viewer inside the app shell, and the user reading one planning artifact of a Mission.
- **Trigger**: the shell's Artifacts item and tree, and the Work Package screen's "Open spec.md", "Open prompt" and "Open review" (`sk-open-artifact`, consumed here, never re-emitted). The host reads the listing and the open artifact and passes the data in.
- **Desired outcome**: one screen, **Artifact Viewer** (`sk-artifact-screen`), that takes `ArtifactListing` and `ArtifactContent` (or an `ArtifactRefusal` code) in as properties plus view states, shows one artifact rendered or as raw source, emits `sk-*` intent events out, and is visible in every state of the state matrix as a Storybook story with an approved visual baseline, built without a live service.
- **Rules that always hold**: no I/O (no fetch, XHR, WebSocket, Tauri API, browser storage, timer, clock or navigation, and nothing in the document is ever loaded or followed). Read-only: no write of any kind. Every UI primitive the design library provides is rendered with that library element (elements over CSS). The prototype is the visual source of truth; only drift listed in the Drift Register and confirmed by the operator is allowed. The screen does no arithmetic on contract values. No pipeline fact is hard-coded (see "The dynamic-pipeline constraint"). Document text is untrusted: it is never turned into markup by string.
- **Canonical terms**: *Mission* (never "feature"); *Work Package* (WP); *artifact* (one eligible file of the Mission directory); *kind* (`ArtifactKind`, the path-derived class); *refusal* (an `ArtifactRefusal`, branched on `code`, never on `title`); *rendered view* and *raw view* (the two tabs); *fallback* (the degraded rendered view: a notice plus escaped source); *view state* (`loading`, `ready`, `empty`, `error`, plus this screen's `not-found` and `nothing-selected`); *content state* (`loading`, `ready`, `refused`, `error`, for the open artifact only); *tier* (expanded, collapsed, narrow, mobile; the shell owns its tier change, the screen owns its own column collapse).
- **Out of scope**: see "Scope".

## Clarifications

### Operator rulings, 2026-10-06

The operator answered "Approve + accept all 9" on 2026-10-06. Two rulings follow from it, both binding on plan, tasks and review, mirrored in `tracer-design-decisions.md`:

1. **The `markdown-it` runtime dependency is APPROVED**, with `html: false`, its token stream turned into Lit templates, no `innerHTML` and no `unsafeHTML` anywhere in the screen, links never navigating, images never loaded, and a hostile-corpus test as the gate.
2. **All nine questions are decided as their written recommendations.** The ruling text is the recommendation.

- **Q1, operator ruling 2026-10-06.** **Markdown rendering.** #5 ruled "no markdown rendering in the Work Package screen; the host decides". Here rendering is the point. Ruling: the screen renders with `markdown-it` (`html: false`), turned into Lit templates from its token stream, so there is no `innerHTML` or `unsafeHTML` at all. Links never navigate (relative artifact links and external links emit events), images are not loaded (alt text and a link), tables scroll inside their own box, and any throw falls to the AV-05 fallback. If a later need forces HTML output, it goes through DOMPurify with a fixed allowlist first. The library is a new runtime dependency, approved; the hostile-corpus test is the gate.
- **Q2, operator ruling 2026-10-06.** **Who draws the tree.** Ruling: the shell tree draws it (as it does Work Packages), fed by the pure `buildArtifactTree(entries)` helper this mission exports from `logic/`; `sk-artifact-screen` is the document pane plus inspector, set to `flush`. The screen's events stay about the document; the tree's `sk-navigate` and `sk-tree-toggle` are the shell's. Verified against #4's code: `TreeNode` already has `kind` (`leaf` or `folder`), `children`, `meta` (the count), `unavailable`, `expanded`, `icon` and `prefix`, and the shell emits `sk-navigate` `{ id, href }` and `sk-tree-toggle` `{ id, expanded }`.
- **Q3, operator ruling 2026-10-06.** **Inspector contents.** Ruling: file facts always (kind word, media type, size, modified, redacted yes or no); Mission facts only when the host passes them, hidden when absent; linked Work Packages only when the host passes them; "authoritative" dropped; the read-only note kept. Approved drift (DA-27, DA-28).
- **Q4, operator ruling 2026-10-06.** **Refusals.** Ruling: one shared layout (the prototype's "Artifact unavailable" block: eyebrow, title, path, one sentence), the sentence chosen by `code` from `defaults/` (words only: too large with its size, not text, credential found, unreadable, not found); no content is ever shown; retry only on `artifact_unreadable` and the listing error; a 404, 413, 415 and 422 are final for that path.
- **Q5, operator ruling 2026-10-06.** **Fallback trigger and non-markdown files.** Ruling: a known text `mediaType` that is not markdown (json, yaml, jsonl, csv, plain) shows Raw only, with no Rendered tab and no notice; the "Rendered view degraded" fallback is only for a markdown file whose renderer throws or exceeds a render budget.
- **Q6, operator ruling 2026-10-06.** **Redaction notice.** Ruling: when `redacted` is true, one quiet line in the inspector and above the document ("host paths and e-mail addresses are replaced"); the markers stay as they come; hidden when false.
- **Q7, operator ruling 2026-10-06.** **Events.** Ruling: `sk-select-artifact` `{ missionId, path, kind }` (internal markdown link; the tree leaf is the shell's `sk-navigate`, Q2); reuse `sk-select-work-package`, `sk-open-pipeline` and `sk-retry-load` from #5; new `sk-open-link` `{ href }`; all verb-noun; `sk-open-artifact` is consumed from #5, not re-emitted. **Conflict found by this phase: #5 has no `sk-open-pipeline` (its P-1 ruling collapsed it into `sk-open-mission`). See N-Q10.**
- **Q8, operator ruling 2026-10-06.** **Contract pin.** Ruling: vendor from `main` at `1.0.0-SNAPSHOT`, the `contract` gate checking the pin, re-vendor when spec-kitty#5776 or the `1.0.0` tag changes the artifact shapes or vocabulary. (Finding: the pin on this branch is #4's `9f41e48`, which has no artifact reads; FR-038.)
- **Q9, operator ruling 2026-10-06.** **Large listings.** Ruling: no virtualization in v1; a 1000-row tree is plain DOM, folders collapsed except the path to the selected file, the `truncated` note when it applies; revisit if the Storybook review shows a cost.

### Operator rulings on N-Q10, N-Q11 and N-Q12, 2026-10-06

The operator accepted the three new questions as recommended on 2026-10-06. Binding on plan, tasks and review, mirrored in `tracer-design-decisions.md`.

- **N-Q10, operator ruling 2026-10-06.** **"Return to Pipeline"** emits `sk-open-mission` `{ missionId, slug }` (option (a)). No `sk-open-pipeline` event exists or is added; this supersedes the literal reuse in Q7. The `mission` property carries `slug`. EV-5 and AV-23 read as ruled.
- **N-Q11, operator ruling 2026-10-06.** **Work Package of a prompt or review file.** The screen matches the open path against the ids of the host's `workPackages`; there is no `WP<digits>` pattern in the screen. The id is a leading token of a path segment under the data-held `tasks/` segment (the segment, without extension, equals the id or starts with the id and the separator), longest id wins; no match means no "Open Work Package" action and no linked pill for that file.
- **N-Q12, operator ruling 2026-10-06.** **Links inside markdown.** A relative destination that resolves (against the open artifact's directory, never above the Mission root) to a path in the listing emits `sk-select-artifact` `{ missionId, path, kind }`; an absolute `http`, `https` or `mailto` link emits `sk-open-link` `{ href }`; everything else (fragment-only, `javascript:`, `data:`, `file:`, `vbscript:`, a relative path not in the listing, a malformed one) is inert text with the destination in `title`. [Narrowed at CP-1, 2026-10-07 (amendments A-8a and A-8b, accepted): markdown-it's own link validation turns `javascript:`, `vbscript:`, `file:` and non-image `data:` destinations into LITERAL TEXT (the raw `[x](...)` source, no inert link); and of an absolute link, a `mailto:` with a query or a fragment, an authority with userinfo (`@`) and a destination over 2048 characters are inert, an external link carrying its truncated destination in `title`.]

### Operator rulings on the plan-phase forks, 2026-10-06

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

### Operator rulings on the seven new plan forks, 2026-10-06

The operator accepted the orchestrator's recommendations on 2026-10-06. Binding on tasks and review.

- **PLAN-FRESH3-001 (a)**: reuse `OverflowRegion`, extended to several targets and both axes as one named additive edit.
- **PLAN-FRESH3-004 (b)**: the `vocabulary` claim covers only the functions that read a member; a foreign refusal code goes through `labels.refusal`.
- **Partly filled `vocabulary`**: completed per group against `defaults/` (the conservative option).
- **PLAN-FRESH3-005 (b)**: IC-06b derives the R4 binding list from its stubs; IC-06a lands only the schema.
- **PLAN-FRESH3-006 (a)**: the truncation note, the redaction line and the bidi notice are drawn with `sk-notice`; no new exception.
- **PLAN-FRESH3-008 (b)**: the host keeps a Set from `sk-tree-toggle` (read-only, never written back to the shell) and passes it as `expandedIds` on the next rebuild, so opened folders stay open.
- **PLAN-FRESH3-010 / AV-17 (b)**: the AV-17 test moves to IC-10; only the story title stays with IC-09.

CP-1 items stay pending CP-1 [all ruled on 2026-10-07; see below].

### Operator rulings on the four last plan forks, 2026-10-06

- **PLAN-FRESH4-002 (a)**: screen-side focus detection in `willUpdate`; after `updateComplete` plus one animation frame, focus moves to the pane only if the active element is body or null. The public surface is unchanged.
- **PLAN-FRESH4-003 (b)**: no axe; role, name, landmark and idref assertions plus a Playwright `ariaSnapshot` dump. Axe leaves the spikes and IC-10's exit checks.
- **PLAN-FRESH4-007 (b)**: `copy` is removed from `ArtifactVocabulary` (five groups); string overrides go through `labels`.
- **PLAN-FRESH4-008 (a)**: `artifact_listing_unreadable` is not retryable in the content-refusal table; the listing failure is `status: error` (AV-14), consistent with FR-015.

### Operator ruling on analyze A1 (tasks phase), 2026-10-06

The operator ruled option (A): `markdownFor` and its tests move from IC-02 (WP03) to IC-03 (WP04, exported from `logic/markdown/model.ts`); WP03 types the `markdown` input of `resolveArtifactView` and the vocabulary budget group structurally in `artifact-types.ts`. No WP count, dependency or signature changes. Applied in plan.md (two sentences), `contracts/defaults.md` and the WP03 and WP04 prompts.

### Operator rulings on the landing-alignment forks, 2026-10-07

mission-ui#5 landed (PR #8, `ad94164`) after this design was made; the alignment and the four forks are in `tracer-design-decisions.md`, "Alignment with the landed #5 (2026-10-07)". The operator ruled all four as recommended. Binding on tasks and review.

- **FORK-1 (a).** The `sk-retry-load` union lives in the neutral `src/retry-types.ts` (A-3); #5's `SkRetryLoadDetail` stays its own two-member alias.
- **FORK-2 (a).** The A-1 container threshold (a cell of 720 px or more) stays the one-column rule; `ShellTierController` is NOT used in this screen. [Amended at CP-1, 2026-10-07 (ruling 5): the one-column rule is unchanged and has no controller, but the controller IS used for the toolbar stack ONLY, option C: `@container (max-width: 38.75rem)` combined with `:host(:state(shell-mobile))`. It consumes the host's one `attachInternals()`; the screen calls `attachInternals` nowhere else.]
- **FORK-3 (a).** Selection agreement (operator ruling 2026-10-07, FORK-3 (a), after #5's landing rulings CORR-004 and DESIGN-005): the screen draws only what agrees with the selection. A `content` whose `path` differs from a non-empty `selectedPath` counts as NOT LOADED (as if `content` were null: the loading look of a `ready` pane), and a `listing` whose `missionId` differs from a non-empty `mission.missionId` counts as NOT LOADED (as if `listing` were null). Announcements are keyed on what is SHOWN, not on the property: "<name> loaded" and "<name> unavailable" name the path of the content actually drawn, a property refresh that shows the same content announces nothing, and a content that arrives later and agrees is announced once. (`ArtifactContent` carries `path`, not a Mission id, so the Mission check applies to the listing.) See FR-035, `contracts/sk-artifact-screen.md` ("Selection agreement") and the Edge Cases.
- **FORK-4 (a).** The contract pin stays at #5's `b61d1fa`: WP01 only registers fixtures, overlays, relaxations and literals (FR-038); `contract:update` is not run.

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

### Precedents that bind (from #4 and #5)

CP-1 rulings and the drift-register discipline; flat or library panels (here the inspector is flat as in the prototype, so #5's narrowed E-18 does not apply); one shared pill ellipsis rule (full text in `title` and the accessible name); visible secondary `sk-button` for artifact actions; E-21 words-only wrapping; drift is a REJECT unless confirmed; a CP-1 checkpoint after the spikes; baselines committed only at the end; the Storybook review by the operator after the last work package. #4's merged artifacts (page header N-1 and N-2, host-neutral error copy DR-5, state words, whole-percent display, numbered exceptions E-04 to E-16) apply as precedents; #5's E-17 to E-21 are read from its planning branch and this mission's exceptions continue at **E-23**.

## Contract Basis (Mission Status `1.0.0-SNAPSHOT`)

Two reads, both from spec-kitty#5625, merged on spec-kitty `main` (checked in `contracts/mission-status/` at spec time). They are two operations and fail independently.

| Region | Operation | What the screen reads |
|---|---|---|
| Tree | `GET /missions/{missionId}/artifacts` (`listArtifacts`) | `ArtifactListing.entries[]`: `path` (forward slashes, relative to the Mission directory), `kind`, `sizeBytes`, `modifiedAt` (UTC, whole seconds, the serving host's file time), `readable`. Flat list sorted by path in byte order, at most 1000; `truncated` says more existed. `status.events.jsonl` and `status.json` are never listed; a symlink is never listed |
| Kind | schema `ArtifactKind` | twelve snake_case values, decided from the path by one ordered rule: `review_cycle` (`tasks/<dir>/review-cycle-<N>.md`), `work_package_prompt` (`tasks/WP<digits>-<name>.md`), `spec`, `plan`, `tasks`, `data_model`, `quickstart`, `analysis_report` (the six root files), `research`, `contract`, `checklist`, `other`. x-provisional |
| Document | `GET /missions/{missionId}/artifacts/content?path=` (`getArtifactContent`) | `ArtifactContent`: `path`, `kind`, `mediaType` (from the extension only: md `text/markdown`, json `application/json`, yaml and yml `application/yaml`, jsonl `application/x-ndjson`, csv `text/csv`, else `text/plain`), `encoding` (always `utf-8`), `sizeBytes` (before redaction, 0 for an empty file), `redacted`, `content` (strict UTF-8, a leading byte order mark stays, already redacted) |
| Redaction | `ArtifactContent.redacted` | true when a host path became `[path]` or an e-mail address became `[email]`; x-provisional (flag and markers) |
| Refusals | `ArtifactRefusal` (a `Problem`) | seven `code`s, branch on `code`: 400 `invalid_artifact_path`, 404 `not_found` (also an unknown Mission, a file that is not an eligible artifact, and the two status records), 413 `artifact_too_large` (over 262,144 bytes, not read; the refusal carries no size, the size comes from the listing entry), 415 `artifact_not_text` (NUL byte or invalid UTF-8), 422 `artifact_secret` (a credential), 500 `artifact_unreadable`, 500 `artifact_listing_unreadable`. A refusal never carries content. x-provisional (the seven codes) |
| Readable | `ArtifactEntry.readable` | false when a read would be refused (413, 415, 422 or 500); no reason is given |
| Mission facts | `MissionDetail`, host-held | `friendlyName`, `slug`, `missionId`, `missionType`, `targetBranch`, `topology`, `lifecycleStatus`; passed in, not part of the artifact reads |
| Linked Work Packages | `MissionDetail.workPackages` (`wpId`, `title`, ...), host-held | host-supplied; no artifact field names one (gap 7, N-Q11) |

- The `ArtifactListing` carries `missionId`; `ArtifactContent` does not (the host passes the Mission in, as #5 did). Response schemas are closed. Fixtures are generated from the contract's own examples (FR-038): `ArtifactListing.populated` and `.truncated`, `ArtifactContent.markdown`, `.redacted`, `.json` and `.empty`, and `ArtifactRefusal.*` (seven).
- The changelog's deferred list (per-Mission staleness, actor on `WorkPackageSummary`, project branch, lane weights) does not touch the artifact reads. The next slice is spec-kitty#5776; the epic is spec-kitty#5528.
- Contract version at spec time: `1.0.0-SNAPSHOT` (not tagged). The twelve kinds, the seven codes and `redacted` are x-provisional; the screen passes kinds and codes through and words them only through `defaults/`.

## Contract Gaps

The issue's thirteen gaps stand and are adopted. Each prototype element below has no source in the artifact reads today; each is raised on spec-kitty#5528 or dropped, none is invented. Where this phase checked the code, the result is added.

| # | Gap | Handling |
|---|---|---|
| 1 | **Directories.** The listing is flat; no folder entries, so an empty folder is invisible and a folder has no time or kind | The tree and its counts are derived from paths by `buildArtifactTree` (a presentation, not a contract concept) |
| 2 | **Status records and Mission metadata files.** The prototype lists `status.events.jsonl` and `meta.json`; the contract never lists the two status records and says nothing of `meta.json` or `lanes.json` beyond "eligible file, kind `other`" | The status-record rows are dropped; other files show only if the listing carries them (DA-7) |
| 3 | **Inspector facts and "authoritative".** The prototype inspector shows Mission ID, Type, Topology, Target, Status as the artifact's metadata | File facts from `ArtifactContent` and `ArtifactEntry`; Mission facts from the host's `MissionDetail`. **Checked: `MissionDetail` carries `missionType` and `targetBranch`**, so Type and Target have a source; "Status: implement" has none for this page, so the row shows the lifecycle word (DA-28); "authoritative" has no source and is dropped |
| 4 | **Eyebrow "Specification · factual".** "factual" has no source | The kind word comes from `kind` through `defaults/` (DA-14) |
| 5 | **Fallback source for refused files.** A 413, 415 or 422 carries no content | Escaped source exists only for a 200 whose rendering fails (FR-010) |
| 6 | **Why a file is unreadable.** `readable: false` carries no reason | The tree says "unavailable"; the reason appears only after a content read is refused; no read-ahead |
| 7 | **Linked Work Packages.** No artifact field names them | For `work_package_prompt` and `review_cycle` the id is in the path (N-Q11); for other kinds the host supplies the Mission's Work Packages, or the region is hidden |
| 8 | **Unavailable copy.** The prototype says "does not exist in the committed snapshot"; the 404 also covers an unknown Mission and a status record | Host-neutral copy chosen by `code` (DA-24) |
| 9 | **Modified time.** `modifiedAt` is the serving host's file time and changes with a fresh checkout | Shown as "modified on this host", never as history (FR-042) |
| 10 | **Truncation.** `truncated` is provisional (a cursor may replace it) | A note and nothing more (FR-021) |
| 11 | **Redaction markers.** A Work Package prompt read as an artifact is redacted; the same text as `promptMarkdown` on the Work Package read is not | The screen does not reconcile them |
| 12 | **Static prototype notices** ("Only spec.md is populated...", "Folder contents are not expanded...") | Prototype tooling, not product states; not built (DA-9) |
| 13 | **Vocabulary freeze.** Kinds, codes and `redacted` are x-provisional at `1.0.0-SNAPSHOT` | Fixtures regenerated when the vocabulary is tagged (Q8) |

New observations from this phase (to be raised on spec-kitty#5528 by the orchestrator, not worked around by this mission):

- **N-1** The `413` refusal carries no size; the size shown with it comes from the listing entry, which the screen holds when the listing was read (FR-015). If the listing is absent the sentence omits the size.
- **N-2** `ArtifactContent` and `ArtifactRefusal` carry no `missionId`; the host passes `mission`.
- **N-3** The vendored contract pin on this branch predates the artifact reads (Q8 note).
- **N-4** No field says which Work Package a prompt or review file belongs to; the id is derivable only from the path (N-Q11).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read one planning artifact rendered (Priority: P1)

As a user, I open `spec.md` (or any markdown artifact) and read it as a document: headings, paragraphs, lists, tables, code, quotes, links.

**Why this priority**: it is the point of the screen.
**Independent Test**: render the screen with the markdown fixture; the Rendered tab shows the document (AV-01, AV-03).

**Acceptance Scenarios**:
1. **Given** a ready listing and `ArtifactContent` of media type markdown, **When** the screen renders, **Then** the Rendered tab is selected and shows the document, with the kind word as eyebrow, and no `innerHTML`, `unsafeHTML` or loaded image exists in the DOM.
2. **Given** a table wider than the pane, **When** it renders, **Then** it scrolls inside its own box and the page does not scroll sideways.
3. **Given** a relative link naming another artifact in the listing, **When** it is activated, **Then** `sk-select-artifact` is emitted and nothing navigates.

### User Story 2 - See the raw source, and read non-markdown files (Priority: P1)

As a user, I switch to Raw to see the exact text, and for a JSON, YAML, JSONL, CSV or plain file I see Raw only.

**Why this priority**: every artifact must be readable even when it is not markdown.
**Independent Test**: AV-02 and AV-06.

**Acceptance Scenarios**:
1. **Given** markdown content, **When** I select Raw, **Then** the same `content` shows as monospace source, wrapped at spaces, and the block is keyboard-scrollable.
2. **Given** `mediaType` not markdown, **When** the screen renders, **Then** there is no Rendered tab and no notice.
3. **Given** a markdown file whose render throws or exceeds the budget, **When** the screen renders, **Then** the fallback shows (notice plus escaped source) and the Raw tab still works.

### User Story 3 - Browse the Mission's artifacts (Priority: P1)

As a user, I choose a file in the tree and the viewer opens it; folders open and close; a file that cannot be read says "unavailable".

**Why this priority**: without it the screen is reachable only from a Work Package.
**Independent Test**: AV-15 to AV-19, with the shell tree.

**Acceptance Scenarios**:
1. **Given** a flat listing, **When** `buildArtifactTree` runs, **Then** folders are nested from path segments, each with a file count, each file with a kind icon, and the selected file is marked current with its parent folders open.
2. **Given** `readable: false`, **When** the row renders, **Then** it is disabled and says "unavailable".
3. **Given** `truncated`, **When** the listing is shown, **Then** a note says only the first 1000 artifacts are shown.

### User Story 4 - Understand why an artifact is not shown (Priority: P1)

As a user, when the artifact is missing, too large, not text, holds a credential or cannot be read, I see in words which, never the content, and a retry only where a retry can help.

**Why this priority**: refusals are routine here (the contract has seven).
**Independent Test**: AV-09 to AV-14.

**Acceptance Scenarios**:
1. **Given** a refusal `code`, **When** the block renders, **Then** the sentence names the cause from `defaults/` by `code`, not by `title`, and no content is shown.
2. **Given** `artifact_unreadable`, **When** I activate Retry, **Then** `sk-retry-load` is emitted with `{ missionId, target: 'content', path }`.
3. **Given** a 404, 413, 415 or 422, **Then** no retry control exists.

### User Story 5 - Know the file and jump to its Work Package (Priority: P2)

As a user, the inspector tells me the file's kind, media type, size, modified time and whether it was redacted, the Mission it belongs to, and, for a Work Package prompt or review cycle, a button takes me to that Work Package.

**Why this priority**: orientation, but the document reads without it.
**Independent Test**: AV-24 to AV-28.

**Acceptance Scenarios**:
1. **Given** no Mission facts from the host, **Then** the Mission rows are hidden, not blank.
2. **Given** a `review_cycle` open and the Work Package in the host list, **When** I activate "Open Work Package", **Then** `sk-select-work-package` is emitted with the Work Package id (the same event and payload as #5).

### User Story 6 - Hostile document text is inert (Priority: P1)

As an operator, I can open any file, including one with script tags, `javascript:` links and remote images, and nothing runs, loads or navigates.

**Why this priority**: the screen shows text it did not author, under an approved runtime dependency whose gate is this test.
**Independent Test**: the hostile corpus, AV-04.

**Acceptance Scenarios**:
1. **Given** each corpus entry, **Then** no element, attribute or request outside the renderer's allowlist is produced, and the text appears as text.
2. **Given** a throw or a render over budget, **Then** the fallback appears, never a blank screen.

### User Story 7 - Every state keeps the frame (Priority: P2)

As a user, loading, empty, error, not-found, nothing-selected and a refused document each show a stated state; a failed document leaves the tree usable; a failed listing replaces the tree with one regional error.

**Independent Test**: AV-07, AV-09 to AV-14, AV-18, AV-20 to AV-23.

### User Story 8 - The screen follows the data, not the pipeline (Priority: P2)

As a maintainer, I can pass an unknown `kind`, new kind words, folder names or refusal wording and the screen renders them with no code change.

**Independent Test**: AV-29 and the `data-driven` gate.

### Edge Cases

- **A content or listing that disagrees with the selection** (FR-035; ruling 2026-10-07): **Given** `selectedPath` is `a.md` and `content.path` is `b.md`, **When** the screen renders `ready`, **Then** it shows the loading look and announces nothing for `b.md`; **When** a content with `path` `a.md` arrives, **Then** it is drawn and "a.md loaded" is announced once. The same holds for a `listing` whose `missionId` differs from `mission.missionId`.
- **Unknown `kind`** (a thirteenth value, or a spelling change before the freeze): the raw value as the word, the neutral icon, never dropped.
- **Unknown refusal `code`**: the raw code as the sentence's cause, with a generic line; a code other than `artifact_unreadable` is final in the content block (no retry); the listing failure is `status: error` with Retry `target: 'listing'` (FR-017, AV-14).
- **Empty file** (`content` empty, `sizeBytes` 0): the file header and inspector stay; the pane says "This file is empty."; Rendered and Raw tabs both show it.
- **Non-markdown with a `.md`-like extension, or markdown with a byte order mark**: the content is shown as it came; the BOM is not stripped and not shown as a glyph artifact (plain text rule).
- **Very long path or a 200-character file name**: the tree row and the toolbar name ellipsize (one rule, full text in `title` and the accessible name); the inspector Path row breaks at separators and between words.
- **Deep nesting and a 1000-entry tree**: plain DOM, folders collapsed except the path to the selection (Q9); no virtualization.
- **A very long unbroken source line** (256 KiB on one line): the source block scrolls sideways inside itself (DA-22); the page does not.
- **A 256 KiB document**: the renderer has a render budget; over it, the fallback (FR-009).
- **`selectedPath` not in the listing**: the content read says what it says (404 refusal); the tree marks nothing current.
- **`selectedPath` inside a collapsed folder**: the folder is opened (AV-19).
- **Listing present but `content` and `contentStatus` absent**: nothing-selected if `selectedPath` is empty, else the content-loading state; the host decides, the screen never reads.
- **Listing `status` ready but `entries` empty**: the empty-listing state (AV-18), not an error.
- **Redaction markers**: `[path]` and `[email]` are shown verbatim.
- **Incoming `sk-open-artifact`** from the Work Package screen: a host matter; consumed, never re-emitted (asserted with a positive control).
- **Large text**: at a root font size of 200% the pane reflows with no horizontal overflow caused by the screen.
- **Link text equal to its href, adjacent links, a link inside a table cell or a heading**: each is one control, with its own name.

## State Matrix and Acceptance

Each row is one Storybook story and one visual baseline: dark theme, 1280 px unless the row names a tier, synthetic fixtures, rendered inside the mission shell (`shellFrame`, `flush`). "Prototype source" names the prototype element of `05-artifact.html`; "None" means the prototype has no such state and the row is built from the named analogue, with the drift listed in the Drift Register. Baselines are committed only at the end of the mission (precedent). Tree rows are stories of the shell's tree fed by `buildArtifactTree`; where the tree has no place for a state, the screen draws it in its own pane (DA-10, DA-35).

| ID | State | Prototype source | Pass condition |
|---|---|---|---|
| AV-01 | Rendered markdown, `spec`, populated, Rendered tab, inspector filled | `05-artifact.html` default: title, eyebrow, prose, requirements table | the document shows; eyebrow is the kind word; inspector facts filled; tab Rendered selected |
| AV-02 | Raw tab: the same `content` as monospace source, wrapped | Raw tab (`artifact-raw`) | source equals `content` character for character; keyboard-scrollable |
| AV-03 | Markdown feature set: headings, paragraphs, lists, tables (scroll sideways when wide), code blocks, block quotes, links, images | prose and `requirements` table; the rest built from the prose look | every feature present; table in its own scroll box; images show alt text and a link, none loaded |
| AV-04 | Hostile markdown: raw HTML, script tags, `javascript:` links, remote images, unclosed constructs, shown inert as text | None; analogue: the fallback source block (AV-05) | zero elements or requests outside the allowlist; text visible as text |
| AV-05 | Fallback: Rendered view degraded, notice plus escaped source | `?state=fallback` (tab reads "Fallback", attention notice, `fallback-source` block) | notice in words; escaped source equals `content`; Raw tab still works |
| AV-06 | Non-markdown text (json, yaml, jsonl, csv, plain): Raw only, no Rendered tab | None; Raw tab alone (Q5) | no Rendered tab, no notice, source shown |
| AV-07 | Empty file | None; the empty-state look, file header kept | header and inspector shown; "This file is empty." |
| AV-08 | Redacted (`redacted` true) | None (Q6) | markers visible verbatim; one quiet line above the document and one in the inspector |
| AV-09 | Unavailable: 404 `not_found` on a selected path, path shown, no content | `?state=unavailable` ("Artifact unavailable") | eyebrow word, title, path, one sentence; no retry; no content |
| AV-10 | Refused too large: 413, size from the listing entry shown | None; AV-09 layout, code-specific sentence (Q4) | sentence names the size from the entry; no retry |
| AV-11 | Refused not text: 415 | None; AV-09 layout | sentence says it is not text; no retry |
| AV-12 | Refused credential: 422 | None; AV-09 layout | sentence says a credential was found and nothing is shown; no retry |
| AV-13 | Content read failed: 500 `artifact_unreadable`, retry | None; AV-09 layout plus the retry look of the error panel | Retry emits `sk-retry-load` `{ missionId, target: 'content', path }` |
| AV-14 | Listing failed: 500 `artifact_listing_unreadable`, tree replaced by a regional error with retry | `?state=error` panel look (Missions page) | regional error in words; Retry emits `sk-retry-load` `{ missionId, target: 'listing' }` |
| AV-15 | Tree populated: nested folders, counts, kind icons, selected file current | artifact tree (`tasks/` expanded, `contracts/` 2) | built by `buildArtifactTree`; selected row `aria-current` |
| AV-16 | Tree: `readable` false rows disabled, "unavailable" | `quickstart.md` row ("unavailable", disabled) | row disabled and the word present |
| AV-17 | Tree: `truncated`, "Showing the first 1000 artifacts" | None; a quiet note | note present only when `truncated` |
| AV-18 | Tree: empty listing | None; empty-state look | stated empty state, not an error |
| AV-19 | Tree: folder toggle; a selected path inside a collapsed folder opens its parents | `tasks/` toggle (`aria-expanded`) | toggle emits the shell's `sk-tree-toggle`; parents of the selection open |
| AV-20 | Loading the listing | `?state=loading` panel look (not on page 05) | busy indicator and a live-region message |
| AV-21 | Loading one artifact's content (tree ready) | None; same panel look inside the pane | tree interactive; pane busy |
| AV-22 | Nothing selected: listing ready, no path | None; nearest the Work Package page `?state=unselected` | "Choose an artifact" |
| AV-23 | Mission not found (listing 404) with "Return to Pipeline" | None; as WP-26 in #5 | the stated state; the button emits the Mission-level event (N-Q10) |
| AV-24 | Inspector: file facts (kind word, media type, size, modified, path) | inspector facts block, re-sourced | each fact from `ArtifactContent` and `ArtifactEntry`; "modified on this host" |
| AV-25 | Inspector: Mission facts present, and absent | inspector facts block | rows hidden when the host passes none |
| AV-26 | Inspector: Linked Work Packages present (pills, actionable) and absent | "Linked Work Packages" badges | present only when supplied; pills emit `sk-select-work-package` |
| AV-27 | A `work_package_prompt` open: "Open Work Package" for its id | None; nearest the linked WP badge | visible secondary button; emits `sk-select-work-package` |
| AV-28 | A `review_cycle` open: kind word "Review cycle", "Open Work Package" | None; as AV-27 | as AV-27; the word from `defaults/` |
| AV-29 | Unknown `kind`: neutral icon and the raw word | None; rule from #4 (data-driven) | raw value as the word in the tree, eyebrow and inspector |
| AV-30 | Long texts: long path, 200-character file name, deep nesting, 1000-entry tree, very long unbroken source line, 256 KiB document | None; words-only wrapping and the shared pill ellipsis rule | no horizontal overflow of the page; full text reachable |
| AV-31 | Rendered and Raw tabs are a real tablist: arrows move, Home and End jump, selection follows focus | `bindArrowKeys` on `artifact-view-tabs` | roles, `aria-selected`, roving tabindex, key tests |
| AV-32 | Focus order and focus ring: tree, inspector, tabs, document (the inspector is first in the DOM); tab stops tagged | None; rules from #4 | documented order; each stop tagged; ring visible |
| AV-33 | Expanded tier edge (1100 px viewport, content about 804 px): two columns, the inspector in the right-hand track | the shell changes tier at 1100 px; `.reading-layout` is still two columns there (A-1) | two columns; the inspector first in the DOM, placed right (thresholds per DA-33) |
| AV-34 | Collapsed tier (800 px viewport, content cell 688 px): one column, the inspector first | breakpoint 800 px | one column; the inspector first; the toolbar as the prototype (a row; it stacks only in the mobile tier at a cell of 620 px or less, DA-33) |
| AV-35 | Mobile tier (620 px): single column, toolbar stacked, tables scroll sideways, tabs reachable | breakpoint 620 px (tables `overflow-x: auto`) | single column; toolbar stacked; tabs reachable; table in its own box |

Sum of rows: 35 (AV-01 to AV-35). Rows 09 to 14 share one block (FR-015); rows 22 and 23 and 20 and 21 share the #4 state look.

### Event interaction checks

Every event bubbles and is composed, is declared once with `@fires` and is typed; names are verb-noun (Q7).

| Check | Trigger | Asserted event and payload |
|---|---|---|
| EV-1 | Internal markdown link (a relative path that is in the listing) | `sk-select-artifact` `{ missionId, path, kind }` (the listing entry's kind) |
| EV-2 | External markdown link (absolute `http`, `https`, `mailto`) | `sk-open-link` `{ href }`; the link never navigates. Narrowed by A-8b (CP-1, 2026-10-07): a `mailto:` with a query or fragment, an authority with userinfo (`@`) and a destination over 2048 characters are inert (no event), the truncated destination in `title`; by A-8a a `javascript:`, `vbscript:`, `file:` or non-image `data:` destination is literal text. The host re-validates the scheme and never navigates its window to the `href` (contract obligation) |
| EV-3 | Any other link (`javascript:`, `data:`, `file:`, a relative path not in the listing, a malformed href) | none; inert text or, for the schemes markdown-it refuses, literal text (N-Q12 as narrowed by A-8a) |
| EV-4 | A linked Work Package pill, or "Open Work Package" | `sk-select-work-package` `{ missionId, wpId }` (the same event and payload as #5) |
| EV-5 | "Return to Pipeline" (Mission not found) | the Mission-level event (N-Q10: recommended `sk-open-mission` `{ missionId, slug }`) |
| EV-6 | Retry on `artifact_unreadable` | `sk-retry-load` `{ missionId, target: 'content', path }` |
| EV-7 | Retry on the listing error | `sk-retry-load` `{ missionId, target: 'listing' }` |
| EV-8 | Incoming `sk-open-artifact` from the Work Package screen | none re-emitted (positive control) |
| EV-9 | Tree leaf and folder toggle | the shell's `sk-navigate` and `sk-tree-toggle`; not emitted by this screen (asserted that the screen emits neither) |
| EV-10 | Tab change, focus, scroll | none (state-only) |

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | Requirement | Priority | Status |
|----|-------|-------------|----------|--------|
| FR-001 | Element and public surface | One element `sk-artifact-screen` in `@spec-kitty/mission-ui`, thirteen properties (the twelve of the original text plus one optional `vocabulary`, amendment A-9): `status`, `contentStatus`, `listing`, `content`, `refusalCode`, `selectedPath`, `mission`, `workPackages`, `view`, `now`, `labels`, `errorMessage`, `vocabulary` (an `ArtifactVocabulary | null`, default null meaning the `defaults/` values; final names and attributes are frozen by the plan); no property named like a kind, lane or phase | High | Open |
| FR-002 | Regions | Document pane (file header, Rendered and Raw tabs, document) and inspector (file facts, Mission facts, linked Work Packages, read-only note), set to the shell's `flush` | High | Open |
| FR-003 | File header | The toolbar shows a file icon (by kind) and the file name; no Mission breadcrumb (DA-11); the full path is the `title` and an inspector row | High | Open |
| FR-004 | Tabs | Rendered and Raw as a tablist: roving tabindex, arrow keys wrap, Home and End jump, selection follows focus, `aria-controls` to its panel (AV-31); `view` seeds the selected tab; a tab change is state-only (no event) | High | Open |
| FR-005 | Markdown renderer | Markdown is parsed with `markdown-it` (`html: false`, linkify off) in `logic/` and its token stream is turned into Lit templates; no `innerHTML`, `unsafeHTML`, `unsafeSVG` or `DOMParser`-to-DOM path exists in the screen or `logic/` (an ESLint rule proves it) | High | Open |
| FR-006 | Feature set | Headings (as authored, levels kept), paragraphs, ordered and unordered lists (nested), tables with real header cells, fenced and indented code, inline code, block quotes, thematic breaks, emphasis and strong, strikethrough, links, images (AV-03). Raw HTML in the source is shown as text | High | Open |
| FR-007 | Links | A link never navigates and has no `href` the browser can follow. Internal (relative path resolving, against the open artifact's path, to a listing entry) emits `sk-select-artifact`; external (`http`, `https`, `mailto`) emits `sk-open-link`; anything else is inert text with its destination in `title` (N-Q12) | High | Open |
| FR-008 | Images | An image is never loaded: no `img`, `picture`, `srcset`, CSS `url()` or background request. It is shown as its alt text (or "image" when empty) and, when its destination is external, as a link per FR-007 | High | Open |
| FR-009 | Hostile corpus and budget | A test corpus (raw HTML, `<script>`, event-handler attributes, `javascript:` and `data:` URLs, remote images, nested emphasis bombs, a 256 KiB single line, unclosed constructs) asserts that no element, attribute or request escapes the renderer's allowlist. A throw, a nesting depth over a fixed limit or a token count over a fixed budget lands in the fallback (AV-05), never a blank screen. The limits are data in `defaults/`; the corpus is the gate | High | Open |
| FR-010 | Fallback | A markdown file whose render fails shows the attention notice (library `sk-notice`) and the escaped source; the Rendered tab is labelled "Fallback" as in the prototype; the Raw tab remains. Refused files have no fallback (gap 5) | High | Open |
| FR-011 | Raw only | `mediaType` json, yaml, jsonl, csv or plain text shows the raw view alone, with no Rendered tab and no notice (Q5). Markdown is decided by `mediaType` `text/markdown` only, never by sniffing | High | Open |
| FR-012 | Raw view | Monospace, the exact `content`, wrapped at spaces; a line with no break scrolls sideways inside the block (DA-22); the block is focusable and named only while it overflows (A11Y-003), so it scrolls by keyboard; Home and End are inert for a single-line file | High | Open |
| FR-013 | Empty file | `content` empty and `sizeBytes` 0: header and inspector kept; the pane says the file is empty (AV-07) | High | Open |
| FR-014 | Redaction | `redacted` true: one quiet line above the document and one in the inspector; markers verbatim; absent when false (Q6) | High | Open |
| FR-015 | Refusal block | One layout for every refusal (AV-09 to AV-13): eyebrow word, title "Artifact unavailable", the path, one sentence. Eyebrow word and sentence come from `defaults/` by `code`; an unknown code shows its raw value with a generic sentence. 413 shows the entry's size when the listing holds it. No content is ever shown. Retry only for `artifact_unreadable` (Q4) | High | Open |
| FR-016 | Content error | 500 `artifact_unreadable` and the content `error` state show the block with Retry; Retry emits `sk-retry-load` `{ missionId, target: 'content', path }` | High | Open |
| FR-017 | Listing error and not found | `artifact_listing_unreadable` replaces the whole screen content with a regional error and Retry (`target: 'listing'`); a listing 404 is the Mission-not-found state with "Return to Pipeline" (AV-23) | High | Open |
| FR-018 | `buildArtifactTree` | A pure function in `logic/` turns `entries` into `TreeNode[]` for the shell tree: folders from path segments (no folder entry is invented beyond a path segment), file counts (files at any depth), the file name as label, kind icon and word from `defaults/`, `unavailable` from `readable`, the selected leaf marked current, byte order of the listing kept (DA-4). No `spec.md` or `tasks/` literal anywhere | High | Open |
| FR-019 | Tree is the shell's | The tree is drawn by the shell's `sk-shell-tree` (Q2); a leaf emits the shell's `sk-navigate`, a folder the shell's `sk-tree-toggle`; this screen emits neither | High | Open |
| FR-020 | Unreadable rows | `readable` false: row disabled with the word "unavailable"; no click, no `sk-navigate` | High | Open |
| FR-021 | Truncation note | `truncated` true: a quiet note "Showing the first 1000 artifacts" (DA-10); the number is the contract maximum as data in `defaults/`, not computed | Medium | Open |
| FR-022 | Empty and expanded folders | An empty listing is a stated empty state (AV-18). Folders are collapsed except the path to the selected file, which is open (Q9, AV-19) | High | Open |
| FR-023 | View states | `status` `loading`, `ready`, `empty`, `error`, `not-found`, `nothing-selected` and `contentStatus` `loading`, `ready`, `refused`, `error`, each with #4's look and host-neutral copy (DR-5); a content state never hides the tree | High | Open |
| FR-024 | Nothing selected | Listing ready, `selectedPath` empty: "Choose an artifact" (AV-22) | High | Open |
| FR-025 | File facts | Kind word, media type word, size, modified ("modified on this host"), path, redacted yes or no; from `ArtifactContent` with the matching `ArtifactEntry` (size and modified) | High | Open |
| FR-026 | Mission facts | Mission, Type, Topology, Target, Status (lifecycle word) from the host's `mission`, each row only when the value is present; the whole group hidden when none (AV-25) | High | Open |
| FR-027 | Linked Work Packages | For a `work_package_prompt` or `review_cycle` the one Work Package of the path (N-Q11); for any other kind the host's Work Package list; hidden when none; each pill (title attribute, one shared ellipsis rule) emits `sk-select-work-package` | Medium | Open |
| FR-028 | Open Work Package | For `work_package_prompt` and `review_cycle`, a visible secondary `sk-button` "Open Work Package" that emits `sk-select-work-package`; absent when the id cannot be matched (AV-27, AV-28) | High | Open |
| FR-029 | Read-only note | One quiet `sk-notice`: the screen is read-only (DA-31) | Low | Open |
| FR-030 | Unknown kind | A `kind` not in `defaults/` renders as given with the neutral icon; never dropped, never branched on | High | Open |
| FR-031 | Words from data | Kind words and icons, media-type words, folder-independent labels, refusal eyebrows and sentences, tab labels and notices are English constants from `defaults/`, with the raw value as fallback (NFR-009). The `labels` hooks are the four of the `ArtifactLabelHooks` types row (`kind`, `refusal`, `mediaType`, `size`, on top of the shared `LabelHooks`); no new hook is added | High | Open |
| FR-032 | Events declared | Exactly the events of the table EV-1 to EV-10: `sk-select-artifact`, `sk-open-link`, `sk-select-work-package`, the Mission-level navigation event (N-Q10), `sk-retry-load`; each declared once with `@fires`, typed, bubbling and composed, dispatched from the screen file only. `sk-retry-load` is shared with #5 and its payload is a discriminated union on `target`: `'content'` and `'listing'` here, `'work-package'` and `'detail'` there (A-3; the union lives in the neutral `src/retry-types.ts`) | High | Open |
| FR-033 | Incoming open | `sk-open-artifact` from #5 is a host matter: the screen consumes the `path` and `kind` through `selectedPath` and never re-emits it (asserted) | High | Open |
| FR-034 | Wrapping | Words-only wrapping (E-21): an over-long single word in the toolbar, tree label, eyebrow, pill or fact value ellipsizes with its full text in `title` and the accessible name; the rendered code blocks wrap (E-23), and only the raw and fallback source scrolls sideways for an unbroken line (DA-22); every pill from one shared rule | High | Open |
| FR-035 | Keyboard and live region | Every control by Tab, Enter and Space; visible focus ring; no trap; documented focus order tree, inspector, tabs, document (the inspector is first in the DOM); the document pane focusable; one polite live region announces loading, ready, refused and error changes, keyed on the content actually shown; a `content` whose `path` differs from `selectedPath`, or a `listing` whose `missionId` differs from the Mission's, counts as not loaded (selection agreement, ruling 2026-10-07); state is never colour-only | High | Open |
| FR-036 | Tiers | The screen's column collapse follows the prototype (inspector under the toolbar at the one-column width, tables scroll, tabs reachable); the thresholds are content-cell container thresholds derived at plan from real widths (DA-33), not viewport media queries: two columns from a cell of 45 rem (720 px); the toolbar stacks at a cell of 38.75 rem (620 px) or less in the shell's mobile tier (CP-1, option C) | High | Open |
| FR-037 | Shell wiring | The shell's Artifacts item and tree get the screen as content with `flush`; the existing shell baselines are untouched (as #5's P-4); this mission's own stories show the screen as shell content in `shellFrame` | Medium | Open |
| FR-038 | Contract vendoring and fixtures | Keep the Mission Status contract pin at `1.0.0-SNAPSHOT` (#5's `b61d1fa`, `provenance: main`, which already holds the artifact reads; ruling 2026-10-07, no re-vendor); the generated types already hold the artifact types, and the fixtures are registered (`ArtifactListing.populated` and `.truncated`, `ArtifactContent.markdown`, `.redacted`, `.json` and `.empty`, seven refusals) plus named overlays (a listing with unreadable entries, an unknown kind, hostile markdown, a long-name tree, a 1000-entry tree); the `contract` gate checks the pin | High | Open |
| FR-039 | Manifest and surface freeze | Custom-elements manifest regenerated with `manifest:generate`, `manifest:check` green; the surface test gains `sk-artifact-screen` (properties, attributes, defaults, event names) so a later change fails there | High | Open |
| FR-040 | Exceptions | Local overrides (prose typography, table scroll box, source block, the tab paint, class-only allowances for the library's styles-only families) are numbered exceptions from E-23 in `contracts/gates.md`, each with scope, rationale, a Stylelint or ESLint proof case and a sunset tied to a spec-kitty-design issue (a prose or markdown-document element is the likely one) | High | Open |
| FR-041 | Stories and baselines | One story and one dark-theme baseline per AV row at the tier it names; baselines committed only in the last work package; the drift register confirmed by the operator before the skeleton freezes | High | Open |
| FR-042 | Time and size words | Modified time and size are shown through `now` or the label hook with an ISO fallback (as #4 and #5); the screen computes no date arithmetic beyond the host-supplied hook and no unit conversion beyond display formatting that #4's percent rule already allows (size uses one fixed rule in `logic/`, data-driven unit words) | Medium | Open |
| FR-043 | Dependency record | `markdown-it` 15.0.2 is added to `@spec-kitty/mission-ui` as the one new runtime dependency; it ships its own types and no `@types/markdown-it` is added (A-2); the pull request names it with version, licence and the hostile-corpus evidence | High | Open |
| FR-044 | Hygiene | Fixtures contain no real user data, absolute path, OS username, e-mail address or credential-shaped string; the redaction fixture uses the contract's `[path]` and `[email]` markers; credential-shaped test strings in the corpus are inert and assembled so no scanner flags the file | High | Open |

Sum of functional requirements: 44 (FR-001 to FR-044).

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | Typecheck, ESLint (`data-driven`, `no-io`), Stylelint, `contract`, `manifest`, hygiene, Storybook build, unit and interaction tests and gate-proof pass with 0 findings on the pull request | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline of the state matrix gives 0 visual failures across 5 consecutive runs on an unchanged commit, at the tiers each row names | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of interactive controls reachable and operable by keyboard alone in every tier, in no more tab stops than controls shown; a scroll region is a tab stop only while it overflows (A11Y-003) | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200% the screen causes no horizontal overflow of the content area at 1100 px and 720 px (at that size the 1100 px viewport resolves to one column), and at 320 px and 400% only tables scroll (A-7) | Accessibility | Medium | Open |
| NFR-005 | No I/O | The `no-io` gate reports 0 violations in the screen, its parts and `logic/`; the document causes 0 network requests (asserted by the structural walk of the produced template, the proof, PLAN-TEST-003 (a); a CSP and a resource-load observation are corroboration only) | Security | High | Open |
| NFR-006 | Render responsiveness | A 256 KiB markdown document renders to the fallback or the document, and a 1000-entry tree builds and renders, each in 500 ms or less in the interaction test environment; a re-render on a property change 200 ms or less | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address, the executing account's username or a credential; checked by the hygiene and `contract` gates | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences from the prototype in the side-by-side review of each baseline; a difference not in the confirmed drift register is a REJECT | Quality | High | Open |
| NFR-009 | Data-driven gate | The `data-driven` gate reports 0 violations: no kind, lane or phase literal outside `defaults/`, no view-type field named like one; kind words and refusal wording live in `defaults/` or `labels`. The gate does not read `ArtifactKind` or the refusal codes today; the self-check list and foreign-value tests (an unknown kind, an unknown code) cover them, and the plan decides whether the gate learns the kind enum | Quality | High | Open |
| NFR-010 | Contract gate | The `contract` gate reports 0 findings with the re-vendored contract: pin equal, generated types and fixtures fresh, every fixture producible by the contract | Quality | High | Open |
| NFR-011 | Text never colour-only | 100% of statuses (kind, refused cause, redaction, unavailable, fallback, the selected tab, the current tree row) carry a text or non-colour form in the DOM | Accessibility | High | Open |
| NFR-012 | Renderer safety | The hostile corpus passes with 0 escapes (no disallowed element, attribute or request), and a mutation of the renderer that allows a raw HTML node, an `href` or an `img` is proven to fail it (a planted case, as the gate-proof pattern) | Security | High | Open |
| NFR-013 | Bundle weight | The markdown dependency adds a recorded, bounded size to the package bundle; the plan sets the budget from the measured figure and a gate fails above it | Performance | Low | Open |

| NFR-014 | Forced colors and reduced motion | In forced colors the selected tab (a `Highlight` border), the focus ring and the table scroll box stay distinguishable; under reduced motion the screen's own elements run no animation (A-7) | Accessibility | Medium | Open |
| NFR-015 | Target size | A tab is at least 36 px and a Work Package control at least 24 px of block size (A-7) | Accessibility | Medium | Open |

Sum of non-functional requirements: 15 (NFR-001 to NFR-015).

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the contract; view state as a property; intent out as `sk-*` CustomEvents that bubble and are composed; no I/O (charter) | Technical | High | Open |
| C-002 | Contract basis | Types generated from the vendored contract at a recorded pin; response schemas closed; provisional parts consumed as optional and passed through | Technical | High | Open |
| C-003 | Read-only | No write of any kind: no edit, save or delete; a retry event asks the host to read again | Product | High | Open |
| C-004 | No arithmetic | No arithmetic on contract values beyond display formatting of sizes and counts through one fixed rule | Product | High | Open |
| C-005 | Elements over CSS | Charter: every primitive the library provides is that element; project CSS is layout with `--sk-*` tokens only; a missing primitive is a design-library gap, a temporary stand-in a numbered exception | Technical | High | Open |
| C-006 | Prototype authority | `05-artifact.html` is the visual source of truth; only confirmed drift is allowed | Design | High | Open |
| C-007 | Data-driven | See "The dynamic-pipeline constraint" | Technical | High | Open |
| C-008 | Fixtures and risk boundaries | Synthetic fixtures: no real user data, absolute paths, usernames, e-mail addresses or secrets | Security | High | Open |
| C-009 | Terminology | "Mission" everywhere, never "feature" | Product | Medium | Open |
| C-010 | Shell dependency | The screen renders inside `sk-mission-shell` (with `flush`); the shell owns the top bar, rail, sidebar and tree, tiers and the skip link (its text "Skip to artifact" comes from the shell's `skip-link` slot) | Scope | High | Open |
| C-011 | Review and governance | Pull request into `main`; the operator merges; every work package is reviewed by a separate reviewer; the adversarial squad runs after the plan phase only; the operator reviews Storybook after the last work package, before wrap-up | Governance | High | Open |
| C-012 | Stacking | Builds on #4 and #5 (both merged to `main`): implementation starts after #5 has merged to `main`; nothing is stacked (Base A, PLAN-DESIGN-017); `sk-open-artifact`, `sk-select-work-package` and `sk-retry-load` come from #5 and the vocabulary and exception numbering continue from it | Scope | High | Open |
| C-013 | New dependency | `markdown-it` is the only new runtime dependency, approved 2026-10-06 under the Q1 conditions; any other new runtime dependency needs the operator's approval first | Governance | High | Open |
| C-014 | Untrusted text | Document content is never concatenated into markup, a URL, a style or a selector; nothing the document names is fetched, followed or evaluated | Security | High | Open |

### Key Entities *(include if the mission involves data)*

- **Artifact entry (listing)**: `path`, `kind`, `sizeBytes`, `modifiedAt`, `readable`.
- **Artifact listing**: `missionId`, `entries[]` (at most 1000), `truncated`.
- **Artifact content**: `path`, `kind`, `mediaType`, `encoding` (`utf-8`), `sizeBytes`, `redacted`, `content`.
- **Artifact refusal**: a `Problem` with `code` (seven values), `status`, `title`, `detail`; no content.
- **Tree node (shell)**: `id`, `label`, `kind` (`leaf` or `folder`), `href`, `meta` (count), `unavailable`, `expanded`, `icon`, `children`; built by `buildArtifactTree`.
- **Mission (host prop)**: `missionId`, `slug`, name, `missionType`, `topology`, `targetBranch`, `lifecycleStatus` (each optional).
- **Work Package reference (host prop)**: `wpId`, `title`.
- **View state**: `status` (`loading`, `ready`, `empty`, `error`, `not-found`, `nothing-selected`), `contentStatus` (`loading`, `ready`, `refused`, `error`), `view` (`rendered`, `raw`).
- **Intent events**: `sk-select-artifact`, `sk-open-link`, `sk-select-work-package`, the Mission-level event (N-Q10), `sk-retry-load`.

## Visual Drift Register (PROPOSED: confirmed by the operator at CP-1)

Every prototype element of `05-artifact.html` against what the screen will show. Each item was PROPOSED drift until the operator confirmed it at CP-1 (after the plan phase and its spikes, before the work packages that build visuals). CONFIRMED at CP-1 on 2026-10-07 for DA-1 to DA-41, with the additions recorded in the rows below (ruling 7); an item ruled "confirm" or "keep" is confirmed. A difference from the prototype that is in neither this register nor a CP-1 ruling is a REJECT in review. Prefix `DA`.

| ID | Prototype element | What the screen shows | Proposed ruling |
|----|-------------------|-----------------------|-----------------|
| DA-1 | Top bar, personal rail, sidebar head (back link, title, id, tags) and Mission nav | The shell's, unchanged | keep (shell-owned, no drift) |
| DA-2 | Skip link "Skip to artifact" | The shell's skip-link slot with that text | keep |
| DA-3 | Tree rows: one icon per file type (document, magnifier for research, table for data-model, folder) | An icon per `kind` from `defaults/` (closed set of shell icons), a neutral icon for an unknown or `other` kind; folders the folder icon | confirm (kind-driven, not name-driven) |
| DA-4 | Tree order: hand-ordered (spec, plan, tasks, research, data-model, contracts/, tasks/, lanes.json, status record, meta.json) | The contract's byte order of paths, no re-ordering | confirm (data, not curation) |
| DA-5 | Folder `tasks/` expanded with 4, `contracts/` collapsed with 2; the count is the direct children | Collapsed except the path to the selection; the count is files at any depth | confirm per Q9 |
| DA-6 | Nested WP rows labelled by id in mono, linking to the Work Package page | Plain file-name leaves that select the artifact; Work Package navigation is the inspector's | confirm |
| DA-7 | Rows for `status.events.jsonl` and `meta.json` | Not listed (the contract never lists the status records); `meta.json` and `lanes.json` appear only if the listing carries them, as kind `other` | confirm (gap 2) |
| DA-8 | Disabled row `quickstart.md` with the word "unavailable" | Same, driven by `readable` false | keep |
| DA-9 | Static notices on rows ("Only spec.md is populated...", "Folder contents are not expanded...", "Metadata is shown in the inspector.") and the toast region | Not built (gap 12) | confirm |
| DA-10 | (none) truncation | A quiet note "Showing the first 1000 artifacts" at the top of the document pane, because the tree is the shell's and has no note slot | confirm (new element) |
| DA-11 | Toolbar: file icon and bold file name only (no breadcrumb; the issue lists one) | Same: icon and file name; the full path in `title` and the inspector Path row; no Mission breadcrumb (the shell's sidebar head names the Mission) | confirm (follows the prototype, not the issue) Paint: the band's bottom rule and card fill are drawn under E-30 (WP08 ruling, 2026-10-08). |
| DA-12 | Segmented Rendered and Raw (`role=tablist`) | The same look as a raw `<button type="button" role="tab">` painted with tokens keyed on `aria-selected` (E-26; the library segmented-choice class is not used, its selected look does not follow `aria-selected`); for a non-markdown file no tablist: the toolbar keeps the file name and the pane is the raw block | confirm (Q5; E-26, CP-1) |
| DA-13 | In the fallback state the first tab is relabelled "Fallback" | Same label from `defaults/` | keep |
| DA-14 | Eyebrow "Specification · factual" above the document title | The kind word only (for example "Specification"); "factual" dropped; the document's own `#` heading is the h1 | confirm (gap 4) |
| DA-15 | `.prose`: 800 px column, line height 1.65, h1 at 3xl, h2 spacing, paragraphs at 68ch | The same measures with tokens, written as a numbered exception (prose typography is not layout) | confirm (E-23; confirmed at CP-1, `ch` grant for `max-width: 68ch`, no `letter-spacing` or `text-wrap`) |
| DA-16 | Requirements table: bordered, mono header, scrolls only at 620 px | Every table in its own scroll box at every width, real `th` header cells, the same look | confirm |
| DA-17 | (none) lists, code blocks, block quotes, links, rules, emphasis, strikethrough | Built from the prose look and tokens | new elements, confirm |
| DA-18 | (none) images | Never loaded: alt text and, if external, a link | new, confirm (Q1) |
| DA-19 | (none) links | Never navigate; internal emit `sk-select-artifact`, external `sk-open-link`, others inert text | new, confirm (Q1, N-Q12) |
| DA-20 | (none) hostile text | Shown as inert text | new, confirm |
| DA-21 | Fallback notice: attention `notice`, copy "The selected artifact format is unsupported or malformed, so Kitty Desktop is showing escaped source text." | Library `sk-notice` (attention); host-neutral copy ("The rendered view could not be built, so the escaped source is shown."); the product name dropped | confirm (precedent DR-5) |
| DA-22 | Raw and fallback source: `white-space: pre-wrap; overflow-wrap: anywhere` (breaks mid-word, 900 px max) | Wraps at spaces; a line with no break scrolls sideways inside the block; nothing is cut and no word is broken | confirm (words-only precedent, E-21, without losing source text) |
| DA-23 | Raw view focusable (`tabindex=0`), rendered view not | The rendered article and the raw block are focusable and named ONLY WHILE THEY OVERFLOW (the element that actually scrolls carries the tab stop), so they scroll by keyboard; Home and End are inert for single-line files (CP-1) | confirm (A11Y-003; CP-1) |
| DA-24 | Unavailable block: eyebrow "Committed snapshot", title "Artifact unavailable", mono path, "does not exist in the committed snapshot" | Eyebrow is the refusal word by `code`, title kept, path kept, one host-neutral sentence by `code` | confirm (gap 8, Q4) |
| DA-25 | Unavailable state hides the toolbar and inspector and uses one column | Same for every refusal: the block alone; the 413 size sits in its sentence | confirm |
| DA-26 | (none) retry | A visible secondary `sk-button` "Retry" on `artifact_unreadable`, the listing error and the content error | new, confirm |
| DA-27 | Inspector head: eyebrow "meta.json" and a success badge "authoritative" | Eyebrow "File"; no badge | confirm (Q3, gap 3) |
| DA-28 | Inspector facts: Mission ID, Type, Topology, Target, Status ("implement") | Two groups: File (Kind, Media type, Size, Modified on this host, Path, Redacted) always; Mission (Mission, Type, Topology, Target, Status = lifecycle word) only when passed. The facts take the library `sk-facts` look: no row separators and 16 px values (14 px terms), where the prototype has a 1 px bottom border per row and 14 px values (accepted drift, CP-1 2026-10-07; see DA-34) | confirm (Q3; Status value differs; facts look accepted at CP-1) |
| DA-29 | "Linked Work Packages": four badges linking to the Work Package page | Titled pills from the host list or the one derived from the path; each pill is a raw `button.sk-pill-tag` (E-29; `sk-pill-tag` is `classOnly` in `inspector-parts.ts`, 26 px block size, round focus ring, ellipsis with the full text in `title`); each emits `sk-select-work-package`; hidden when none | confirm (resolved by the pill ruling at CP-1: S-A4 outcome (c), E-29, G-21) |
| DA-30 | (none) "Open Work Package" | A visible secondary `sk-button` with a leading document icon, for `work_package_prompt` and `review_cycle` | new, confirm |
| DA-31 | Note "Rendered from committed local content. No editing controls are exposed." | Host-neutral "Read-only. Nothing here can be edited."; "committed" dropped (the file time and content are the serving host's) | confirm |
| DA-32 | (none) redaction | One quiet line above the document and one in the inspector when `redacted` | new, confirm (Q6) |
| DA-33 | Breakpoints 1100 px, 800 px, 620 px (viewport media queries) | The same behaviours per tier, switched by container thresholds on the content cell derived at plan from real widths (as #5's DW-24); the rows AV-33 to AV-35 name the viewport tiers. Numbers (CP-1): two columns from a cell of 45 rem (720 px); the viewports 801 to 831 px (collapsed tier, cell 689 to 719 px) show one column where the prototype shows two (confirmed drift); the toolbar stacks by option C (`@container (max-width: 38.75rem)` combined with `:host(:state(shell-mobile))`), so there is NO toolbar window (zero drift over the sampled widths) | confirmed at CP-1 with the derived numbers |
| DA-34 | Inspector: flat column with a left border and a hero background; the facts are the library facts look | Flat as in the prototype (no `sk-card`); the adopted `facts` family and `sk-notice`, class-only exception for the families the library has only as styles. The facts look differs from the prototype in two visible ways, accepted at CP-1: no row separators and 16 px values (14 px terms, max-content term column, so long values wrap earlier) | confirm (precedent: flat panels, #4 N-4; facts look accepted at CP-1, no exception) Paint: the inspector's rule (left beside the pane, top when stacked) and hero fill are drawn under E-30 (WP08 ruling, 2026-10-08), so the prototype paint is matched, not drifted. |
| DA-35 | (page 05 has no loading, error, empty, not-found, nothing-selected) | #4's panel look and host-neutral copy; "Choose an artifact" in the shape of #5's unselected state | new states, confirm |
| DA-36 | Content loading inside the pane (none) | The same busy look inside the pane with the tree interactive | new, confirm |
| DA-37 | Tab keys: arrows wrap, Home and End jump, selection follows focus | Kept exactly | keep |
| DA-38 | `?state=fallback` and `?state=unavailable` query-driven states, document `<title>` "spec.md · Kitty Desktop" | Property-driven; the page title is the host's | confirm (prototype tooling) |

| DA-39 | Raw block reading measure: `.raw-view` `width: min(900px, 100%)` | SUPERSEDED (operator ruling (a), pre-merge squad 2026-10-10, CONTRACT-002): the raw and fallback block has no measure of its own and takes its pane; `max-width: 900px` is removed from `source-parts.ts` and from E-25, and is a refused plant. At 1280 px and below the pane is narrower than 900 px, so no baseline changes | superseded (was: keep, A-6, pinned at CP-1) |
| DA-40 | Toolbar band `min-height: 68px` | Kept: the toolbar band's `min-height` is a pinned `68px` (E-28), so a raw-only file's toolbar keeps the prototype's 68 px | keep (A-6; pinned at CP-1) |
| DA-41 | (none) text with bidirectional control characters | In the raw and fallback views only, a quiet `sk-notice` of tone `info`, "contains N bidirectional control characters" (words and the code-point list U+202A to U+202E, U+2066 to U+2069, U+200E and U+200F from `defaults/`); the text itself is shown unchanged, so FR-012 and the escaped-source equality hold. The rendered view shows no notice (R-09, accepted, no mitigation) | new, confirm (PLAN-SECURE-009; confirmed at CP-1) |

Sum of drift-register items: 41 (DA-1 to DA-41).

## The dynamic-pipeline constraint

Nothing about the pipeline is hard-coded. Artifact kind words, kind icons, folder names, media-type labels, refusal wording, the render budget and badge tones come in as data, with the defaults in `src/defaults/`, exactly as lanes do on the board. The existing `data-driven` gate applies to this screen unchanged: no kind, lane or phase literal outside `defaults/`, and no view-type field named like one. A `kind` the screen has never seen (a thirteenth value, or a spelling change before the vocabulary freezes) renders as given, with the neutral icon and the raw value as its word. The tree is built from paths, not from a fixed file list: no `spec.md` or `tasks/` literal in a component or in `buildArtifactTree`; the Work Package of a prompt or review file is found by matching the host's ids, not a `WP<digits>` pattern (N-Q11). Markdown media type is the one value the screen branches on (`text/markdown`, Q5), as data in `defaults/`. A later dynamic pipeline (artifacts following the charter and doctrine packs) must need no change to this element, only different props.

## Scope

**In**
- New element `sk-artifact-screen`: properties for the listing, the open artifact's content or refusal code, the selected path, the status and content status, labels and `now`; events for every user action (FR-032).
- Regions: file header; Rendered and Raw tabs; the rendered document; the raw source; the escaped-source fallback; the refused and unavailable states; the inspector (file facts, Mission facts, linked Work Packages, read-only note).
- The pure `buildArtifactTree(entries)` helper in `logic/`; the tree itself is the shell's (Q2).
- The markdown renderer in `logic/` on `markdown-it`, with its hostile-corpus test (Q1, FR-009).
- Fixtures generated from the contract examples plus named overlays; stories, interaction tests, visual baselines (committed last), manifest entry; the shell wiring (FR-037); contract re-vendor (FR-038).
- The drift register, numbered exceptions from E-23.

**Out**
- Any fetching, routing, URL handling or time source; the host passes data and `now` and handles events.
- Writes of any kind: no edit, save or delete.
- Search, filtering in the tree, diff between artifacts, the dossier overview and the snapshot export (the contract does not cover them; see the changelog on #5533).
- Fields the contract does not carry (the gaps above); none is invented.
- Server-side anything; no paging beyond what the contract returns; no virtualization (Q9).
- HTML output of any kind from markdown (a later need goes through DOMPurify with a fixed allowlist, a separate decision).
- Rendering images, following links, executing anything in a document.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every row of the state matrix (AV-01 to AV-35) exists as a Storybook story with an approved visual baseline and passes its pass condition. - [build]
- **SC-002**: Every event of EV-1 to EV-10 is asserted by an interaction test with its exact payload, and 0 events are emitted that are not declared in the manifest. - [build]
- **SC-003**: The hostile corpus yields 0 escapes (0 disallowed elements, attributes or requests) and a planted renderer weakening is caught by it (NFR-012). - [build]
- **SC-004**: A listing and a document with a kind, a refusal code and a folder name the screen has never seen render in full with the `data-driven` gate green. - [build]
- **SC-005**: A refused document shows 100% of the time a stated cause in words and 0% of the time any content; retry exists for exactly the codes of Q4. - [build]
- **SC-006**: A keyboard-only user reaches and operates every control in every tier with a visible focus ring; 100% of controls. - [build]
- **SC-007**: All quality gates pass on the pull request with 0 findings and 0 visual failures across 5 consecutive runs. - [build]
- **SC-008**: A side-by-side review of each baseline against the prototype finds 0 differences outside the confirmed drift register. - [build]
- **SC-009**: A host renders the screen by passing only contract-shaped data, the Mission, the view states, `now` and labels, with no change to the screen and no I/O performed by it. - [build]
- **SC-010**: Every statement the screen makes about an artifact (kind, refused cause, redacted, unavailable, fallback) is available as text to assistive technology; 0 are colour-only. - [build]

## Assumptions

- The app shell, `defaults/`, the vendored contract tooling, the gates and the exception approach come from #4 (merged in this branch); `sk-open-artifact`, `sk-select-work-package`, `sk-retry-load` and the exceptions up to E-21 come from #5, after its merge (C-012; nothing is stacked).
- The screens are built against the contract and fixtures, not a live service (the read service is built in parallel, spec-kitty#5528).
- The host passes `mission` and `workPackages`; the artifact reads carry neither (N-2).
- The shell's tree needs no change for folders, counts, an unavailable row or an expanded folder (checked in `shell-types.ts`); whether a leaf `href` is the artifact path and how the host maps `sk-navigate` to `selectedPath` is the host's concern.
- A tab change is internal state seeded by the `view` property; no event is declared for it (the operator's Q7 list has none). If the host needs it, that is a change request.
- No Decision Moments were recorded for this specify phase; the binding inputs are the issue, the operator's answers of 2026-10-06, the contract as read, the prototype and the rulings of #4 and #5.

## Open Questions

None. Q1 to Q9 and N-Q10 to N-Q12 are ruled (Clarifications). The drift register DA-1 to DA-41 and the derived tier thresholds (DA-33) were confirmed by the operator at CP-1 on 2026-10-07; no open item remains.
