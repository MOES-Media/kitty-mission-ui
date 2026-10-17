---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: kitty-core-01M50D10
mission_id: 01M50D10J2DWR9J76F7APJQJDP
generated_at: '2026-10-16T12:02:33.321107+00:00'
analyzer_agent: analyst-annie
input_artifacts:
  spec.md:
    path: kitty-specs/kitty-core-01M50D10/spec.md
    sha256: bc4f648bef149b8c93c4383c1240aec19da2f790ddd4fa99a73057857aa9e376
  plan.md:
    path: kitty-specs/kitty-core-01M50D10/plan.md
    sha256: 97758132a88959f7bf8b4bb519090d4efde7b5c89f6b2bb809b759eb8e0876e6
  tasks.md:
    path: kitty-specs/kitty-core-01M50D10/tasks.md
    sha256: 0dc422c6d2c5e6afe5fcf62b068fbc46dfe7d50eb9673d3ace81cc4cf18b2e55
  charter:
    path: .kittify/charter/charter.yaml
    sha256: a2c150afd05fbc759da023d8ea357842418aed26b8b45c769b40532789e733ad
verdict: ready
issue_counts:
  low: 1
  critical: 0
  high: 0
  medium: 0
  info: 0
findings:
- id: C1
  severity: low
  category: drift
  summary: "plan.md IC-08 'Socket ownership' Test bullet still described the pre-A4 single-squatter alive-no-bind test (remediated in 298fadf: aligned with WP08 T045.5)."
---

## Specification Analysis Report

**Mission:** `kitty-core-01M50D10` (issue #19). **Branch:** `feat/kitty-core-19`. **Analysed at:** ce5d9d6 (pass 3). The pass-3 finding was remediated in 298fadf, before this report was recorded.

**Analyst:** `analyst-annie`, read-only.

## Passes

| Pass | Commit | Verdict | Findings | Remediated in |
|---|---|---|---|---|
| 1 | 307ba66 | Blocked | 18 (A1–A18): 1 high, 8 medium, 9 low | aca9618, b83817e |
| 2 | b83817e | Blocked | 5 (B1–B5): 1 high, 1 medium, 3 low | c9b6534, ce5d9d6 |
| 3 | ce5d9d6 | Ready | 1 (C1): low | 298fadf |

### Pass 1 (307ba66)

The high finding was **A1**. WP08 owned the fake service's `host` mode, which runs `kitty_core::Core`, but `Core` is only built in WP09.

All 18 findings were remediated:
- **`host` mode:** moved, with scenario 13, to WP09 (`tests/host_exit.rs`, as a recorded out-of-map edit).
- **Supervisor seam:** public `#[doc(hidden)]` `StatusSink` and `spawn_supervisor`.
- **Budgets:** 300 ms for the budget-exhaustion tests.
- **Ports:** a squatter on each of three scripted ports.
- **Fork-child:** `fork-child` honours `crashAfterMs`.
- **New tests:** stream headers, a raw-TCP 404, the `retry()` scenarios and a missing project root.
- **Harness API:** `StubSpec` defined.
- **Rename:** the facade module is renamed from `core` to `facade`.
- **`heavy`:** it now wraps every gate run.
- **Traceability, contract wording and the SC-004 `ci.yml` check:** fixed.

### Pass 2 (b83817e)

The high finding was **B1**, a defect already present at 307ba66. The Core-only variants `NotReady(CoreStatus)` and `ContractMismatch(Mismatch)` of `ReadOutcome` (`client.rs`, WP04) and `StreamOpenError` (`sse.rs`, WP05) had no owner.

All 5 findings were remediated:
- **B1:** both enums are `#[non_exhaustive]` from the start, and WP09 adds the two variants as recorded out-of-map edits, serialised after WP04 and WP05.
- **B2:** alive-no-bind went back to the 2 s budget.
- **B3:** the WP that sets `left_initial_start` is named (WP08).
- **B4:** stale subtask numbers fixed.
- **B5:** `host_exit.rs` writes its inner scenario file.

### Pass 3 (ce5d9d6)

| ID | Category | Severity | Location | Summary | Status |
|---|---|---|---|---|---|
| C1 | Drift | low | `plan.md` IC-08 "Socket ownership" Test bullet | Pre-A4 wording: one squatter, and "Ready never occurs" | Done in 298fadf |

## Coverage Summary Table

All 47 requirements (24 FR, 8 NFR, 9 C, 6 SC) and the 10 amendments (A-01 to A-10) map to work packages with a concrete proof, for 100% coverage. SC-005 is deferred by the spec to the #20 and #21 plan reviews.

| Group | WPs |
|---|---|
| FR-001 to FR-010 | WP04, WP05 |
| FR-011 to FR-015 | WP02, WP03, WP06, WP09 |
| FR-016 to FR-024 | WP07, WP08, WP09 |
| NFR-001 to NFR-008 | WP01, WP03 to WP10 |
| C-001 to C-009, SC-001 to SC-006 | WP01 to WP10 |

## Checks

- **Ownership:** for all 10 WPs, `owned_files` equals `write_scope`, checked by script. No globs overlap.
- **Out-of-map edits:** each is serialised behind its owner:
  - `Cargo.lock`
  - both crate manifests
  - the stub module files
  - `status.rs`
  - the fake binary
  - `client.rs`
  - `sse.rs`
  - `lib.rs`
  - `tests/common`
- **Lanes:** 10 lanes in 7 parallel groups. Each WP's exit checks pass in its own lane.
- **Rust plants:** the anchors in `lib.rs` are preserved and checked by grep.
- **Contract plant:** there is one, in WP02, and its token is unique.
- **`heavy`:** it wraps every gate-proof leg and every full gate run.
- **New crates:** they come only from WP01, each with its publish date.
- **SC-004 probe:** it matches plan IC-10, plus the timeout-only `ci.yml` check.
- **Charter:** no alignment issues.
- **Unmapped tasks:** none. All 57 subtasks belong to a WP.

## Recording note

`record-analysis --report-only` is blocked on this machine by user-level mission templates. The operator ruled on 2026-10-16 to leave `~/.kittify` untouched, so this report is recorded in plain mode (committed tree, report from a file).

## Next Actions

No critical, high or medium issues remain. The mission can proceed to implementation, starting with WP01 and WP02 in parallel.
