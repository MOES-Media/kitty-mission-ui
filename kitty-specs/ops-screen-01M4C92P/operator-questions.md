# Operator questions: Ops screen (mission-ui#11)

**RULED 2026-10-08:** OQ-9 exact UTC, `now` dropped; OQ-8 option (a) exact match (contract: `op.profile == profile`); all others as recommended. See `spec.md` Clarifications.

Mission `ops-screen-01M4C92P`, branch `feat/ops-screen-11`. Each question is a genuine fork. The specification is written on the
recommendation of each; a different ruling changes only the rows named. The drift register (DO-1 to DO-24) is separate: it is
confirmed at CP-1, not here.

## Contract corrections found while specifying (no ruling needed, for the record)

1. **`actor` is nullable.** The issue says `actor` is "required and never null in the final contract". The final contract's
   `ActorHandle` is `[string, null]` and a credential-shaped `actor` is served `null` (the ruling quoted in the brief). The spec
   draws a null actor (FR-014, OP-33).
2. **A bad `profile` query is a 400 without a stated code.** The issue calls both a bad cursor and a bad profile
   `invalid_page_cursor`; the contract types the 400 as `PageCursorRefusal` (code always `invalid_page_cursor`) while the operation
   text only says "a 400 problem" for a bad profile (CG-9). To raise on spec-kitty#5528; the screen does not assume the code.
3. **No `now` property.** The issue lists a host-supplied `now`. Times are absolute UTC (as the prototype), so a `now` would be a dead
   property in a frozen surface. Dropped (CG-17); confirmed under OQ-9.

## OQ-1. Show Mission, Work Package and mode facts? (issue question 3; CG-3)

The prototype brief allows only id, profile, action, actor, outcome, times and evidence, and forbids inferred Mission or Work Package
relations. The contract serves `missionId`, `wpId` and `modeOfWork` as plain, non-inferred fields.

- **(a) Recommended.** Show three extra facts, Mission, Work Package and Mode, only when present (Mission and Work Package hidden when
  null), as plain mono ids with no link and no resolved name. Approved drift DO-11.
- (b) Mode only: it is a classification, not a relation; hide Mission and Work Package until the design is revisited.
- (c) None of the three until the design is revisited.

Recommendation (a): the data is in the contract, it is not inferred, and a row without it cannot be tied to its work. The ids are
unlinked, so no relation is asserted and no row action exists. Affects OP-12, OP-13, FR-011, FR-012.

## OQ-2. Profile filter (issue question 2; CG-10)

The contract has a `profile` query and no list of profiles; the page does not echo the filter. The prototype has no filter. A filter
change restarts the cursor.

- **(a) Recommended.** No control. When the host passes `profile`, the heading shows one quiet mono fact "Profile: x". The "No records
  for this profile" empty state uses it. No new event.
- (b) The same, as a removable chip emitting `sk-clear-profile` `{ profile }` (the issue's recommendation). Adds one event and one
  tab stop; the host must restart the read.
- (c) A text field emitting `sk-filter-ops` `{ profile }`. A new control with no prototype, no profile list to validate against, and
  a 128-character pattern to enforce in the screen.

Recommendation (a): the host owns the query, and a chip that only the screen can remove invites a second filter surface. If the
operator wants the chip, (b) is small. Affects FR-031, OP-21, OP-34, EV-7, DO-12.

## OQ-3. Wording for null evidence and a null actor (CG-5, CG-12)

Evidence is null for no evidence, for an open Op, and when withheld because it held a credential. An actor is null when the stored
value is not a handle or held a credential. The row cannot tell the cases apart. The prototype says "Not recorded" for evidence.

- **(a) Recommended.** Evidence null: keep the prototype's "Not recorded" for a closed Op (approved wording, small risk) and "Not
  recorded yet" for an open Op. Actor null: "Not shown". The accessible description of both says the record may hold no value or
  the value may have been withheld.
- (b) "Not shown" for both and for evidence on a closed Op too: it never claims absence.
- (c) Hide both facts when null.

Recommendation (a) keeps the approved evidence wording where it is most often true (an Op closed without evidence) and uses the
non-claiming "Not shown" for an actor, which is rarely absent. (b) is the stricter reading of the contract gap and costs a drift
on the prototype's one approved null word. Affects OP-07, OP-33, FR-014, DO-10.

## OQ-4. Tones and words for open, abandoned and swept Ops (issue question 4; CG-4)

- **(a) Recommended.** `done` success, `failed` danger, `abandoned` attention, `open` neutral with the word "open", a swept Op shows
  an extra fact "Closed by: sweep"; an agent-closed Op shows no closer. Unknown values: raw word, neutral.
- (b) As (a), but every closer is a fact ("Closed by: agent" too), for uniform rows.
- (c) `abandoned` neutral (it is not a failure of the Op).

Recommendation (a): minimal change from the approved rows, and a sweep is the one closer that tells the reader the agent did not
close the Op. Affects OP-04 to OP-06, FR-008 to FR-010, DO-5, DO-6.

## OQ-5. Count badge wording (issue question 7; CG-2)

`totalCount` is the number of served Ops matching the filter and can lag the newest records; pages are 1 to 200.

- **(a) Recommended.** "{loaded} of {total}", for example "6 of 249". The lag caveat is not shown. When loaded equals total it may
  read "249 records".
- (b) Keep the prototype's structure without "newest": "{loaded} loaded · {total} total".
- (c) (a) plus a quiet "records may be missing from the total" always shown.

Recommendation (a), as the issue. Affects OP-15, OP-17, FR-005, FR-022, DO-1.

## OQ-6. Source notice and state copy (CG-1)

The prototype names `kitty-ops/*.jsonl`, "tracked records" and "Kitty Desktop". The contract says only "the Ops directory" and a closure
spine, and the dashboard host is not Kitty Desktop.

- **(a) Recommended.** Host-neutral copy built from the contract's words: "Read from this project's Ops directory and sorted by start
  time, newest first. Viewing Ops never invokes an agent." Loading: "Reading invocation records." Error: "Invocation records
  unavailable. The Ops records could not be read. No invocation rows are shown."
- (b) Keep the prototype's path and file format wording (drift-free, but wrong for a host that stores Ops differently and it exposes a
  storage detail the contract does not promise).

Recommendation (a). Affects FR-004, FR-025 to FR-027, DO-2 to DO-4. The exact sentences are final at the Storybook review.

## OQ-7. The word for redacted evidence (R-D)

`redacted` is true exactly when `value` differs from the stored reference, because something was removed or the text was cut. The issue
says "changed".

- **(a) Recommended.** A quiet "changed" word beside the value, with an accessible description "host paths and e-mail addresses are
  replaced, or the text was cut". The word is accurate for both causes.
- (b) "Redacted", the contract's own field name. It is inaccurate for a value that was only cut.
- (c) No word; the markers `[path]` and `[email]` speak for themselves. A cut value would then look complete.

Recommendation (a). Affects OP-11, FR-015, DO-8.

## OQ-8. Enforce the profile agreement check? (CG-10)

If the host sets `profile` and a page arrives whose items carry another `profileId`, the page is for another request (a late page).

- **(a) Recommended.** Count the page as not loaded (the loading look, nothing announced), by exact string equality, as #7's selection
  agreement does. Risk: if the service matches the profile case-insensitively, a correct page would show as loading forever. The
  contract does not say.
- (b) No check; draw whatever the host passes.

Recommendation (a) only if the operator can confirm the service matches the profile exactly; otherwise (b), since a false mismatch is
worse than a late page that the host's own request sequencing already prevents. This one needs the operator's knowledge of the
service. Affects FR-032, OP-35, A-5.

## OQ-9. Time display and the `now` property (issue question 6; CG-11, CG-17)

- **(a) Recommended.** UTC text as the prototype ("22 Aug 2026, 09:29:46 UTC"), the exact served string in `datetime`, a label hook to
  reword; no `now` property and no relative time.
- (b) UTC text plus a `now` property for a relative form ("12 minutes ago") beside it. A `now` also lets a host show local time later.
- (c) Local time (the host's zone). The prototype's UTC is dropped.

Recommendation (a): Ops are an audit log; an exact instant matters more than "ago", and a dead property is a frozen surface.
Affects OP-14, FR-017, FR-018, CG-17.

## OQ-10. Prototype freshness (issue question 11)

Ops received its visual approval in an earlier design round and `states.html` says it is "visually approved", but the design brief
still says the Ops screen "has no approved Stitch reference and requires explicit human visual approval". The design workspace holds
no pause notice for Ops that the specifier found.

- **(a) Recommended.** Treat `07-ops.html` and its three `?state=` variants as current and approved; the side-by-side review at CP-1
  stands on that.
- (b) Hold the visual work until the operator re-approves the page.

Recommendation (a), pending the operator's word, since the brief and the page disagree. Affects C-006, NFR-008, A-6.

## Issue questions adopted as recommended (confirm in the batch, no fork found)

| Issue question | Handling in the spec |
|---|---|
| 1 Paging | The Missions pattern: `sk-load-more` `{ cursor }`, `loadingMore`; no infinite scroll, no virtualization (FR-021, EV-1). |
| 5 Evidence rendering | Every kind is plain mono text, never a link, never loaded; the class word is a quiet label (FR-013, NFR-005). |
| 8 Refused cursor | Keep rows, a regional notice and "Refresh from the newest" emitting `sk-retry-load` without a cursor (FR-030, EV-5). |
| 9 Events | `sk-load-more` reused, `sk-retry-load` gains the member `target: 'ops-page'` (without `missionId`; the union's existing members carry one), `sk-clear-profile` only under OQ-2 (b) (EV-1 to EV-7). Name collisions with Projects and Drift are checked by the orchestrator. |
| 10 Contract pin | Re-vendor from `main` after spec-kitty #5881, once, first, shared; `contract:check --require-main` green (FR-041). |
