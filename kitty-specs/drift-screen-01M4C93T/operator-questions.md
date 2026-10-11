# Operator questions: Drift screen (mission-ui#10)

**RULED 2026-10-08: every question and confirmation as recommended** (record: `spec.md` Clarifications and `tracer-design-decisions.md`). One amendment by the same ruling: Q10 (a) is superseded, the contract is re-vendored once by #9 on `main`, there are no stacked branches, and #10 starts from `main` after that.

Collected by the specify phase for the orchestrator to batch. Each is a genuine fork with options and a recommendation. Until
ruled, the spec follows the recommendation and marks the point PROPOSED. The numbering is this file's own; where the issue has a
question of the same subject, it is named.

## Confirmations (the issue's recommendations, adopted unless you object)

- Issue Q1: one element `sk-drift-screen` with list and detail inside, set to `flush`.
- Issue Q2: Rescan emits `sk-rescan-drift` `{ missionId }`; a `rescanning` boolean keeps the old report visible and the button busy.
- Issue Q7: a finding whose Mission the host does not list shows its `missionId`, no Mission link, and is never hidden.
- Issue Q8: a 400 (non-ULID `missionId`) is the generic scan error with retry.
- Issue Q10: the V2 prototype is assumed current; no design-pause notice was found. Redo the side-by-side first if that changes.

## Q1. What does `status="empty"` mean, given that a clean report is `findings: []`?

The charter has four states (`loading`, `error`, `empty`, `ready`). A clean scan is a `ready` report with no findings.
- (a) The screen derives the clean look from the data: `ready` with `findings.length === 0` draws "No drift found"; `status="empty"` draws the same look (with the last scan when a report is present, without it when not).
- (b) `empty` is the only way to get the clean look; a `ready` report with no findings draws an empty list.
- (c) `empty` means "no scan yet" (a different look); a clean report is only `ready`.
Recommendation: (a). It cannot disagree with the data and keeps the charter's four states.

## Q2. Who owns the first selection, and what is drawn for a null or unmatched `selectedFinding`?

The issue's DR-01 shows "the first finding selected". The host owns selection (like `wpId` on #5).
- (a) Null or a key not in the report marks nothing and draws a "Choose a finding" detail (a sentence added when the key is unmatched, for example after a rescan fixed it). The host preselects if it wants DR-01. Nothing is emitted.
- (b) The screen falls back to showing the first finding without emitting.
- (c) The screen emits `sk-select-finding` for the first finding on load.
Recommendation: (a). (b) shows a selection the host does not know about; (c) breaks "an incoming selection is never re-emitted" and fires on every rescan.

## Q3. `sourceCode` display (issue Q3)

- (a) A quiet mono tag under the detail title, from the data.
- (b) Not shown.
Recommendation: (a). It is a real contract value that helps the reader tell the three snapshot variants apart; it is never the headline badge (OR-9 gives no badge-code namespace). If (b), DD-2 and DR-32 drop out.

## Q4. Head roll-up and badge (issue Q4)

- (a) "N findings" plus "E errors, W warnings" counted from `severity`, and a head badge when any shown finding has a danger-tone severity (tone from `defaults/`, no `'error'` literal).
- (b) "N findings" and the badge only, no roll-up.
- (c) "N findings" only.
Recommendation: (a), presentation only. With `truncated` the roll-up is labelled as covering the shown findings.

## Q5. Copy protocol and the prototype's "failed" text

`copyResult` is `copied` or `manual`. Lit does not re-render on a repeated identical value.
- (a) Keep the two values; the host sets `copyResult` to null when it receives `sk-copy-command`, then to its answer; the screen shows and announces a result only for the finding whose Copy was pressed and drops it when the selection or report changes; the prototype's "failed" text is dropped and the host answers `manual` on failure.
- (b) Make `copyResult` an object `{ text, outcome }` so repeated copies and stale answers can be told apart without a reset by the host.
- (c) Add a third value `failed`.
Recommendation: (a) (it is the issue's contract). (b) is cleaner if you would rather not rely on the host's reset.

## Q6. The scoped scan and a foreign finding

`GET /drift?missionId=` returns a `DriftReport` that does not echo the scope (Gap 19).
- (a) A scoped screen (property `missionId` set) treats a report containing a finding of another Mission as NOT LOADED (loading look, nothing announced), as #5 CORR-004 and #7 FORK-3 (a).
- (b) Draw the report as given; the host is trusted.
Also confirm that no Pipeline-screen change is part of this mission (the entry point is the host's wiring; issue Q6).
Recommendation: (a); no Pipeline change.

## Q7. Mission link and the `sk-open-mission` payload

The issue says `{ missionId }`; the shipped event (Missions and Work Package screens) carries `{ missionId, slug }`. The Mission in a finding row is also the click target for selection.
- (a) Emit the shipped `{ missionId, slug }`; the link is the Mission name in the detail Facts (not in the row, to keep the row a single option); only when the slug is known.
- (b) Emit `{ missionId }` as the issue says (a payload change for a shared event).
- (c) Put the link in the row as well.
Recommendation: (a).

## Q8. Authority presentation: one panel, or the prototype's panel and notice

The prototype draws a panel with a green badge for the status finding and a notice "Authoritative source: local git refs" for the branch finding.
- (a) One authority panel for every authority; the word for `event_log` or `git` from `defaults/`; Facts on every finding (DD-6, DD-7).
- (b) Keep both layouts, chosen by a presentation key in `defaults/` per authority value (`panel` or `notice`), so the prototype is reproduced exactly with no literal in the component.
Recommendation: (a). (b) adds a presentation vocabulary for one visual difference; a fourth authority would need a ruling either way.

## Q9. Selected-row marker colour

The prototype paints the selected row's left border danger-red for every finding, including warnings.
- (a) A neutral selection marker token; severity is carried by the badge word and tone only (DD-15).
- (b) Keep danger for every selection (identical look, misleading on a warning).
- (c) Tone follows the finding's severity (needs a severity-to-token table, more data, more states to baseline).
Recommendation: (a).

## Q10. Start condition and shared touches

The issue says implementation needs spec-kitty#5776 merged and the contract re-vendored (once, first, as its own change shared with Projects and Ops), and that `sk-retry-load` and the nav items serialise.
- (a) Planning and design proceed against the PR #5881 worktree; implementation starts after the re-vendor lands on this planning branch, and `contract:check --require-main` is green before merge. `src/retry-types.ts` and the two one-line exports are merged in by whichever mission lands second.
- (b) Stack the implementation on the first screen to re-vendor, whatever its branch.
Recommendation: (a), no stacking on another screen's branch.
