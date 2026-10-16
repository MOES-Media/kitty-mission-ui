---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: mission-shell-01M50D2J
mission_id: 01M50D2JBWV6TYMCYCK6ADFWKF
generated_at: '2026-10-16T11:41:06.982055+00:00'
analyzer_agent: analyst-annie
input_artifacts:
  spec.md:
    path: kitty-specs/mission-shell-01M50D2J/spec.md
    sha256: c057d70b59469854db6ccaea2d351c390d6a17f4762514f96e540a4a9361a3d7
  plan.md:
    path: kitty-specs/mission-shell-01M50D2J/plan.md
    sha256: 674993ab1eafe2bfbc4f1f0a698deae0a2f3ee278a79c14aec0d731953721618
  tasks.md:
    path: kitty-specs/mission-shell-01M50D2J/tasks.md
    sha256: 4197add75336ea64fd1645e7ef591c63d921347f2094b5c69053f61044ea0b7b
  charter:
    path: .kittify/charter/charter.yaml
    sha256: a2c150afd05fbc759da023d8ea357842418aed26b8b45c769b40532789e733ad
verdict: ready
issue_counts:
  high: 0
  low: 2
  critical: 0
  medium: 2
  info: 0
findings:
- id: B1
  severity: medium
  category: inconsistency
  summary: "WP03 T018 step 14 asked for a P-1 leg proof that WP03's Plants and exit checks never ran (remediated in 3a06344: the leg proof is deferred to WP06 T033 step 4; WP03 keeps a clean-output token grep)."
- id: B2
  severity: medium
  category: underspecified
  summary: "WP03 T018 step 11 (C-004) needed subscribe arguments that WP02's recording client only counted, and its wording covered reads' missionId and pageCursor (remediated in 3a06344: scoped to subscribe arguments; WP02 records them)."
- id: B3
  severity: low
  category: coverage
  summary: "WP06's FR-010 ref had no named mounted refused-stream case (remediated in 3a06344: WP06 T032 step 5 names the StreamRefusal.content-mismatch case)."
- id: B4
  severity: low
  category: traceability
  summary: WP03 proved FR-008, NFR-003, SC-002 and C-004 without listing them; plan IC-03 and IC-01 and WP07's dependents were stale (remediated in dfa9f83 and 3a06344).
---

## Specification Analysis Report

**Mission:** `mission-shell-01M50D2J` (issue #18). **Branch:** `feat/mission-shell-18`. **Analysed at:** ea534a6 (pass 2). The pass-2 findings were remediated at 3a06344, before this report was recorded.

**Analyst:** `analyst-annie`, read-only.

**Pass 1 (a269bc2):** 10 findings, A1 to A10: 1 high, 4 medium, 5 low.
- **A1 (high):** SC-002 was proven only on a test harness, not on the shipped controller.
- **Medium:** FR-007 and other refs missing (A2); the WP07 lint blocks landing after lanes a to e (A3); WP07's self-test edit missing from the plan (A4); the unamended FR-005 and US2-4 text (A5).

All ten were remediated in 7a16dac and ea534a6:
- WP03 gained `test/logic/controller-recording.test.ts`, which replays the literal recording through `createShellController`.
- The missing requirement refs were added.
- WP01 now depends on WP07.
- The plan notes the self-test edit.
- The spec wording was annotated.

**A7 deviation:** the manifest schema accepts only `IC-##`, so the IC-08a/IC-08b split is carried in the WP08 and WP09 titles.

**Pass 2 (ea534a6):** all ten pass-1 fixes were verified. Four new findings, B1 to B4, are below; all were remediated in dfa9f83 and 3a06344.

| ID | Category | Severity | Location(s) | Summary | Status |
|---|---|---|---|---|---|
| B1 | Inconsistency | medium | WP03 T018 step 14; WP03 Plants and exit checks | A P-1 leg proof was requested but never run | Done in 3a06344 |
| B2 | Underspecified | medium | WP03 T018 step 11; WP02 T010 step 4 | The C-004 assertion needed subscribe arguments, and its scope was ambiguous | Done in 3a06344 |
| B3 | Coverage | low | WP06 T032 step 5 | No named mounted refused-stream case | Done in 3a06344 |
| B4 | Traceability | low | `wps.yaml` WP03; plan IC-01 and IC-03; WP07 Context | Missing refs, plus a stale dependency and surfaces | Done in dfa9f83 and 3a06344 |

**WP07's one-line edit of `gates/markdown-lint.selftest.ts`:** judged an allowed test-content change. It does not breach C-001 (no-io unchanged) or the gate-wiring ruling. The edit swaps the `navigator.language` sample to `String(performance.now())`. It is needed because the new shell ban on `navigator` would otherwise fail that case. No rule is weakened, and the WP07 reviewer checks `--numstat` `1 1`.

## Coverage Summary Table

All 40 requirements map to WPs with a concrete proof, for 100% coverage. SC-005 is deferred by design to the #20 and #21 plan reviews.

| Group | Requirements | Notes |
|---|---|---|
| Functional | FR-001 to FR-018 | FR-005 is the amended rule. FR-008 and SC-002 are now proven on the shipped controller. |
| Non-functional | NFR-001 to NFR-007 | |
| Constraints | C-001 to C-008 | C-004 is asserted on the subscribe arguments. |
| Success criteria | SC-001 to SC-007 | SC-005 deferred by design. |

## Checks

- **Ownership:** `owned_files` equals `write_scope` for all ten WPs, and no two WPs overlap.
- **Out-of-map edits:** each is serialised behind its owner.
- **Plants:** P-1 to P-8 match the plan. Each token is unique per gate and absent from clean output.
- **`heavy`:** it wraps every browser, Storybook, visual and gate-proof command.
- **Dependencies:** they follow the plan's IC order, with IC-07 first. CP-1 sits between WP08 and WP09 (WP09 T044 precondition).
- **Frozen surface:** WP10's frozen-surface list matches research R-17, and no WP edits a frozen file.
- **Charter:** no alignment issues.
- **Unmapped tasks:** none. All 52 subtasks belong to a WP.

## Recording note

`record-analysis --report-only` is blocked on this machine by user-level mission templates in `~/.kittify/missions/`; this is ledger SK-336. The operator ruled on 2026-10-16 to leave `~/.kittify` untouched. This report is recorded in plain mode instead: tree committed, report on stdin.

## Next Actions

No critical or high issues remain. The mission can proceed to implementation, starting with WP07 (lane-g).
