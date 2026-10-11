# Plan-phase adversarial review: Ops screen (mission-ui#11)

Mode: in-session, one reviewer, no sub-agents (dispatch rule). Six lenses were run one after another against `spec.md`, `plan.md`, `research.md`, `data-model.md` and `contracts/`, each re-reading the artifacts and the repo facts it cites (`main` at `ad94164`, the contract slice of spec-kitty PR #5881, the prototype). Findings were then re-verified against the files before any fix (a finding is CONFIRMED only if the quoted text is present and wrong).
Lenses: R1 correspondence (spec to plan), R2 correctness, R3 security and safety, R4 architecture, R5 testability, R6 process and gates.

## Round 1: raw findings

| Id | Lens | Sev | Finding | Verified | Fix |
|---|---|---|---|---|---|
| F-01 | R1 | medium | FR-041 and the contract-pin row say this mission re-vendors; the operator ruled the Projects mission does it once, first | CONFIRMED (spec lines quoted) | spec rewritten: this mission verifies the pin only; plan IC-01 already said so |
| F-02 | R1 | medium | `fixtures.ts` and the four stories files had no owning IC in the shared-file table | CONFIRMED | ownership added (fixtures IC-01; each stories file with its part's IC; tiers IC-07) |
| F-03 | R1 | low | NFR-012 says a null actor "is counted in the badge" (meaningless) | CONFIRMED | reworded: served in `items`, draws the quiet word |
| F-04 | R1 | low | DO-12 still says "fact or chip" after OQ-2 (a) | CONFIRMED | "one quiet mono fact" |
| F-05 | R2 | medium | announcement table announces "Loading" when the look is loading, but row 5 (profile mismatch) is also the loading look and must announce nothing | CONFIRMED (contract file) | `resolveOpsLook` returns `{ look, reason }`; announcements keyed on the pair |
| F-06 | R2 | medium | D-04 does not say what happens for out-of-range fields (Feb 30, second 60, offset 25:99); hand arithmetic would silently roll over | CONFIRMED | range checks added; failure returns null, text shown as given |
| F-07 | R3 | medium | evidence text can hold bidirectional override characters that reorder neighbouring text; #7 drew a notice for this | CONFIRMED (no mention in spec or plan) | every item-derived text wrapped in `bdi` (D-11); notice left to CP-1 (research question 5); edge case added to spec |
| F-08 | R4 | low | `labels` type unspecified (`OpsLabelHooks` named, never defined) | CONFIRMED | defined in data-model.md |
| F-09 | R5 | low | no test named for the inert retry (no cursor to send) | CONFIRMED | already a guard in the contract file; IC-05 test list must include it (added to the event table note, kept as a test obligation below) |
| F-10 | R6 | low | CP-1 list lacked the bidi question | CONFIRMED | research.md question 5 |
| F-11 | R4 | low | header and notice ownership between page and state parts unstated | CONFIRMED | IC-05 owns header and notice for every look; IC-06 owns only the state bodies (plan IC text already lists header/notice in IC-05; confirmed, no edit) |

Raw 11, confirmed 11, refuted 0.

## Fix round 1 and verification

All fixes applied in one commit. Verification: grep for each changed phrase in the artifacts (F-01 `re-vendors from` gone; F-04 `chip` gone from spec rows except the NOT BUILT note; `bdi` present in plan and spec; `reason` present in the contract file; `OpsLabelHooks` defined).

## Round 2: fresh sweep (new lens passes over the changed files, looking for what the fixes broke or the first round missed)

| Id | Lens | Sev | Finding | Verified | Fix |
|---|---|---|---|---|---|
| F-12 | R4 | low | `OpsLabelHooks` as first written was a bag of maps; #4's `LabelHooks` is methods returning `string \| undefined` | CONFIRMED (`logic/types.ts`) | data-model rewritten to methods |
| F-13 | R4 | low | data-model invented a four-value tone vocabulary; `BadgeTone` and `StateBadge` already exist | CONFIRMED | reuse stated |
| F-14 | R2 | none | `sk-notice announce="off"` and `tone` names used in D-07 | REFUTED: both appear in the Wp screen (`announce="off"`, `tone="attention"`, `tone="danger"`) | none |
| F-15 | R3 | none | profile mismatch could hide a real page forever | REFUTED: ruled exact equality (contract reference reader `==`); the host controls `profile` | none |
| F-16 | R5 | none | the 1,000-row ceiling may flake | NOTED: hard ceiling stays, flake goes back to the operator, never relaxed (as #7) | none |

Round 2: raw 5, confirmed 2, refuted 2, noted 1. Fixed and re-verified (data-model grep). A third sweep over the final files found nothing new.

## Totals

Raw 16, confirmed 13, refuted 2 (plus 1 noted). Fix rounds: 2 of 3. Forks: none (the proposed exceptions and the bidi notice are CP-1 decisions, not plan forks).

## Test obligations carried to IC-05 and IC-06

An inert retry (no cursor to send) emits nothing; a refused-cursor refresh emits no `cursor` key; a mismatched page announces nothing and then the matching page announces once.
