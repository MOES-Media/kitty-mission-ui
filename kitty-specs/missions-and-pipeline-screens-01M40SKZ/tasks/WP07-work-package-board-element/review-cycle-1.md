---
affected_files: []
cycle_number: 1
mission_slug: missions-and-pipeline-screens-01M40SKZ
reproduction_command:
reviewed_at: '2026-10-03T19:22:14Z'
reviewer_agent: claude
wp_id: WP07
---

VERDICT: rejected

WP07 sk-work-package-board (IC-06, CR-1, F1, F4, E-10 correction) - reviewer Renata. Lane g clean after review (git status empty).
Rejected on one sev 3 visual finding (F-1). Everything else passes.

## Gates (run in the lane, all exit 0)
typecheck, lint, lint:styles, lint:no-io, test:no-io, lint:data-driven, test:data-driven, manifest:check, hygiene, test:scripts, test:contract, contract:check, pnpm test (17 files, 374 tests), pnpm visual (69 passed, 0 diffs on existing, 6 new baselines match 1:1).

## 1. CR-1 / DR-1 - PASS
LaneGroup.showsProgress is optional; true only on the default In progress group (defaults/lanes.ts). The card renders the bar only when showsProgress && total > 0 (card-parts.ts); the board passes column.group.showsProgress === true. The subtask-progress baseline shows: bar in In progress (2 of 5, 3 of 3), none at total 0, none on Planned/Review/Done cards that have total > 0. Data-driven gate stays green (flag is data).
Revert experiments (9, each restored with git checkout -- <file>; all went red):
1 grouping first->last group: 1 red (two-group lane test)
2 unknown lane dropped: 1 red
3 null-lane badge replaced: 2 red (badges, null/unknown)
4 showsProgress ignored (always true): 3 red
5 showsProgress removed from default group: 4 red (incl. the defaults test)
6 event payload missionId dropped: 4 red
7 scroll region role always on: 3 red
8 stopPropagation of the library event removed: 1 red (positive control works)
9 bar at total 0 (guard removed): 2 red

## 2. E-10 - PASS
The five-lane fit test (904 px cell, 260 px inspector, 24 px board padding) is real: with min-inline-size 120px it fails (1 red) and lint:styles also fails; 96px passes. stylelint.config.mjs EXCEPTIONS (96px), the plant (96px) and stylelint-exceptions.test.mjs (96px allowed; 97px, 8rem, inline-size, min-width still fail; sibling-file leaks) are consistent. A 100px value fails lint:styles. gates.md derivation arithmetic is right (904-260-48-8-96=492, /5=98.4). E-09/E-11 are file-scoped and token-only; a raw lane word in card-parts.ts fails lint:data-driven.

## 3. VISUAL (prototype 03-pipeline.html headless 1280 dark, compared with the 6 baselines)
(a) Pill look - ACCEPTED. The CP-1 DR-02 composite showed prototype outlined mono .badge beside the spike's filled sans pills, and the operator confirmed DR-2 (and N-3 "filled pills"). The card uses the same sk-pill-tag. No finding.
(b) Lane-title letter-spacing 0.08em - NOT acceptable (F-1). In the side-by-side the prototype's "PLANNED / IN PROGRESS" is visibly tracked; ours is tight. N-4 was REJECTED with "small uppercase mono title", so the title must match; the operator never saw or approved a tracking difference (DR-12 composite showed the pre-fix sentence-case title). Contract text says "Met by E-09" and E-09 even lists letter-spacing, but the property is absent from the implementation and the omission is not disclosed.
(c) Board h2 visually hidden - ACCEPTED. The prototype shows no board heading (section carries aria-label only), so hiding matches it visually; the h2 only names the board and the scroll region. Disclosed in the contract (P-7).

## 4. SUBTASK_PROGRESS_TEXT in defaults/lanes.ts - ACCEPTABLE
It holds the word "done", which gate data-driven keeps in src/defaults/. defaults/ is the sanctioned home for copy; the element imports it and does no arithmetic. Contract documents it. Sev 1 nit only: the filename is lane-themed for a non-lane string; not worth moving.

## Findings
F-1 | sev 3 | packages/mission-ui/src/elements/sk-work-package-board/sk-work-package-board.ts:72-77 (.sk-workflow-lane__title) | Lane title lacks the prototype's letter-spacing .08em (prototype-train-v2.css:439); unconfirmed, unapproved, undisclosed drift against rejected N-4. No library token exists, and a raw 0.08em fails lint:styles (verified), so the omission is by tooling, not by choice.
  Remedy options (operator decision, then implementer):
  (i) extend E-09 with one pinned value (letter-spacing: 0.08em, like E-08's 260px and E-10's 96px; file-scoped, plus plant and exceptions test), and name spec-kitty-design#506 as the token issue; this matches the operator's rule that a missing size is named in the exception;
  (ii) the operator explicitly accepts the drift, recorded in the tracer and PR description, and the unused letter-spacing entry is dropped from E-09 so the table matches the code.
  Either way the contract "Look" paragraph and gates.md must say which.
F-2 | sev 1 | gates.md E-09 row / stylelint.config.mjs E-09 | E-09 lists letter-spacing as allowed but nothing uses it; the table claims a look the element does not have. Resolve together with F-1.
F-3 | sev 1 | lanes.ts (SUBTASK_PROGRESS_TEXT) | see item 4; no action.
