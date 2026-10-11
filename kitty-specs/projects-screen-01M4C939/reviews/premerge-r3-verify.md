# Pre-merge squad R3 verification (2026-10-10)

Verifier on lane-i 8721ccf, after fix round 1 (3e6fecf..ea12193) and the docs patch. The verifier worked on a full copy with real `node_modules`, ran a revert experiment for every behaviour or gate fix, and re-ran the R2 probe.

**Result: all 18 items RESOLVED.** Every revert turned its test red, apart from TESTS-007, a robustness change with nothing to revert.

| Item | Finding | Verdict |
|---|---|---|
| 1 | A11Y-001 modifier chords in the folder listbox | RESOLVED |
| 2 | A11Y-002 dialog focus after Retry | RESOLVED |
| 3 | A11Y-003 single announcer (announce off) | RESOLVED |
| 4 | A11Y-005 dead aria-describedby dropped | RESOLVED (the reason sits before the actions; adjacency asserted) |
| 5 | A11Y-006 active option index as state | RESOLVED |
| 6 | BOUNDARY-001 sunset citations | RESOLVED |
| 7 | BOUNDARY-002 ProjectView export | RESOLVED (typecheck-enforced) |
| 8 | CONTRACT-001 PR-31 waiver and FR-031 evidence | RESOLVED (re-recorded by the CLI) |
| 9 | CONTRACT-002 schema version blocked on library | RESOLVED |
| 10 | CONTRACT-003 vacuous retry test | RESOLVED |
| 11 | CONTRACT-004 keyless Retry not drawn | RESOLVED |
| 12 | CONTRACT-005 announcementText rename | RESOLVED |
| 13 | CONTRACT-006 doc drift | RESOLVED |
| 14 | TESTS-001 font-load guard | RESOLVED |
| 15 | TESTS-002 same-state text announced | RESOLVED |
| 16 | TESTS-004 dialog forced-colours case | RESOLVED |
| 17 | TESTS-005 classOnly tightened (pre-existing, folded) | RESOLVED; whole-repo lint green |
| 18 | TESTS-007 perf median of 5 | RESOLVED |

**Fresh sweep:** no defects. Three severity-1 notes:
- F-1: the dialog's measuring tests also get the font guard (folded at compaction).
- F-2: the spec E-31/E-32 sunset cells cite the filed issues (fixed on the planning branch).
- F-3: a dialog opened already in the error state announces nothing. This is unchanged and matches the screen's first-content rule; no action.

**Gates on 8721ccf:** typecheck, lint, lint:styles, test:scripts, test:contract, manifest:check and hygiene all pass. `pnpm test --maxWorkers=2` passed 1300 of 1300. Visual and gate-proof run in the final evidence.
