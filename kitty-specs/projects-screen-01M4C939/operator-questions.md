# Operator questions: Projects screen (mission-ui#9)

**All ten RULED on 2026-10-08** (Q1 option A, Q3 option B, the rest as recommended; Q8 amended: the contract is re-vendored once, first, by this mission after PR #5881 merges). See `spec.md` Clarifications and `tracer-design-decisions.md`. The text below is the original question set.

Specify phase, 2026-10-08. Q1 to Q9 are the issue's own nine questions, re-checked against what is on `main` (`ad94164`).
Q10 is new. Each has options and a recommendation; `spec.md` follows the recommendation and marks it "(per Qn)" until ruled.

## Q1. Where the screen sits relative to the shell (issue Q1)

**Finding.** The shell's `layout` is a closed union, `'project' | 'mission'`, and an unknown value falls back to `project`
(`shell-types.ts`, `sk-mission-shell.ts`). The `project` layout draws a context sidebar (and, collapsed, a rail; on mobile, a
hamburger and drawer). So a host cannot ask the shell for "no navigation" without a change. The prototype draws a top bar and
a full-width picker; its sentence "Navigation appears after a project is selected" is part of the copy.

- **A. New shell layout value** (for example `picker`): top bar only, no sidebar, no rail, no hamburger, in every tier.
  One additive value on an existing property. It is a shell change, so it serialises with the Drift and Ops missions
  (C-007) and needs a shell story plus baseline.
- **B. Screen renders outside the shell** and owns a top bar region. No shell change, but it duplicates the top bar, the skip
  link and the tier handling the shell already owns, and the host then has two chrome implementations.
- **C. Keep `layout: project` and pass no nav items.** No change, but the sidebar column and the mobile hamburger still
  render, empty. Fails the prototype look.

**Recommendation: A.** It matches the issue's own preference, adds no property, and does not constrain a later dynamic
pipeline (the value names a chrome, not a pipeline). Name and the exact value to be settled at plan.

## Q2. Which rows are openable (issue Q2)

The prototype links only row 1; the others are inert `article`s in a static prototype.

- **A. Every row is openable by default; the host marks one not openable.** A not-openable row is rendered like the
  prototype's `article` row (no arrow, no link semantics). Loading, error and unavailable entries are never openable.
- **B. Follow the prototype literally.** Only the first row opens. Not a real behaviour.

**Recommendation: A**, treated as approved drift DP-3. Field name `openable` (default true) on the entry wrapper.

## Q3. The open-project dialog (issue Q3, widened)

**Finding.** The prototype dialog is a static mock: the path field is read-only and pre-filled, and Open navigates to a fixed
page. A working in-page folder browser needs the host to list folders and say which are valid (G-2), so it needs events the
issue does not list.

- **A. Button only.** The screen emits `sk-request-open-project`; no dialog element. PR-20 to PR-23 are dropped.
- **B. Button plus a separate optional `sk-open-project-dialog`** (the issue's recommendation). Host-driven: props `open`,
  `location`, `folders` (each `name`, `location`, `kind` parent or folder, `valid`), `selected`, `status`; events
  `sk-browse-folder` `{ location }` (the person selected or entered a folder; the host re-feeds the listing),
  `sk-confirm-open-project` `{ location }` (Open, enabled only on a valid selected folder), and
  `sk-retry-load` `{ target: 'folders' }`. The dialog closes itself on Cancel, Escape and backdrop and emits nothing for them;
  it returns focus to whatever was active when it opened. The desktop host may ignore it for the native picker.
- **C. Dialog inside `sk-projects-screen`.** Fewer elements, but it bloats the screen's surface and cannot be omitted.

**Recommendation: B**, with the event set above, because the issue's acceptance already lists the dialog states. Note two
consequences: the event `sk-browse-folder` is not in the issue (new; verb-noun), and the Open button is disabled unless the
host says the selection is valid (drift DP-15). If you prefer to keep the first slice small, A is a clean cut and B becomes a
later mission; say so now, because the ledger rule forbids a follow-up issue.

## Q4. Row detail (issue Q4)

- **A.** Show everything the prototype shows (name, version, health, location, branch, Mission count, active-ago).
  `schemaVersion` is not shown; it is available to the host through the row's accessible description only. A null version
  hides its slot.
- **B.** Also show `schemaVersion` visibly (for example "schema 3") for a `schema_drift` row.
- **C.** Show a quiet "version unknown" word for a null version instead of hiding the slot.

**Recommendation: A** (the prototype has no slot, and G-5 says the row must not guess why). Note the accessible description
would carry a number the sighted person cannot see; if you want parity, choose B.

## Q5. Health tone mapping (issue Q5)

`healthy` is success; `schema_drift` is either attention (as the prototype draws it) or danger.

**Recommendation: attention**, from `defaults/`. Schema drift is a state to act on, not a failure, and `health` never reflects
a drift finding (OR-8). An unknown value is neutral with its raw word.

## Q6. Per-row failure wording and the unavailable state (issue Q6, widened)

The contract has no refusal code (G-3), so a failed row can say only one generic thing.

- **A.** One generic sentence from `defaults/` ("Could not read this project"), a retry, and no use of the `Problem` body.
  Add an entry state `unavailable` (host knows the folder is gone or is not a project) with its own word, no retry, not
  openable.
- **B.** Only `error`; the host maps "folder gone" to `error` as well.

**Recommendation: A.** Without `unavailable`, the host must offer a retry that cannot succeed.

## Q7. Event names (issue Q7)

`sk-open-project` `{ key }`, `sk-request-open-project`, `sk-confirm-open-project` `{ location }`, `sk-browse-folder`
`{ location }` (new, Q3), and `sk-retry-load` with new `target` members `'project'` (with `key`), `'projects'` and
`'folders'`. All verb-noun.

**Recommendation: confirm.** Collision risk: the Drift and Ops specs are written in parallel and may choose `target` values
too; the targets here are distinct nouns (`project`, `projects`, `folders`), and the orchestrator should check the three
specs for the same `target` word and the same E-number range (this spec proposes E-31 to E-34).

## Q8. Contract pin and who re-vendors (issue Q8)

The vendored contract predates the five new `Project` properties; the final slice is unmerged (PR #5881; the issue calls it
#5776).

- **A.** This mission's first work package re-vendors once, as its own small change, and the Drift and Ops missions rebase on
  it (the issue calls Projects the natural lander). A provisional branch pin is allowed locally; `contract:check
  --require-main` must be green before merge.
- **B.** The orchestrator lands the re-vendor as a separate small pull request first, and all three missions start from it.
- **C.** Each mission re-vendors for itself. Rejected: three conflicting copies.

**Recommendation: B if #5881 merges soon, else A.** B keeps the three missions independent of each other's merge order.

## Q9. Prototype freshness (issue Q9)

No design-pause notice was found in the design workspace for the V2 pages (`01-projects.html`, `prototype.css`), and the
prototype is read-only. Confirm the V2 pages are still current before the side-by-side; if they are being reworked, the
register (DP-1 to DP-27) is redone first.

**Recommendation: confirm they are current.**

## Q10. The entry wrapper shape (new)

The issue says "a host-built wrapper, not a contract type" but fixes only `key`, a display location, an optional flag and
either a `Project` or a status. This spec fixes: `key`, `location` (opaque text), `localOnly?`, `openable?`, and one of
`project` or `state` (`loading`, `error`, `unavailable`). Contract fields keep the contract's names, so the host can pass the
`GET /project` body unchanged.

- **A.** As above.
- **B.** Flatten the contract members into the entry. Rejected: the contract-shaped input convention (a `Project` stays a
  `Project`).

**Recommendation: A.** Also confirm that `status` of the whole screen wins over entry states, and that an entry's `state`
wins over a present `project` (mismatched data counts as not loaded).
