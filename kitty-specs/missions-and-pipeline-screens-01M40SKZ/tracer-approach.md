# Tracer: approach

Running log of how the mission is approached, one entry per phase. Newest last.

## Plan phase (2026-10-03)

- Read the binding inputs in this order: the charter, the spec (incl. Clarifications, Contract gaps, PL-11 and the progress-bar decision of e59da7d), the app-shell mission's plan and research as the conventions to copy, the repository (gates, scripts, ESLint and Stylelint config, visual spec, manifest tooling, CI workflow, shell sources), the prototype's two screens and stylesheets, the library manifest and its styles-only families, and the pinned contract (schemas and examples).
- Followed the app-shell shape: plan with a Charter Check table, an Implementation Concern Map and Complexity Tracking; research with numbered decisions D-nn, a gap table G-nn and a risk register; per-element contracts.
- Front-loaded risk: the contract tooling and its gate first (IC-01), then the data-driven gate and the vocabulary boundary before any element exists (IC-02), then one foundation work package that makes the only change to accepted code (the shell footer), runs the library-fit spikes S1 to S4, obtains the operator's confirmation of the drift register (checkpoint CP-1) and only then freezes the manifest with skeletons (IC-03a before CP-1, IC-03b after it, in that order); two disjoint chains of work packages afterwards, merged by an orchestrator procedure that answers the recorded spec-kitty tooling issues.
- Decided the element count by cost: five elements (two screens, three patterns), everything else a private fragment, because each element costs at least four stories and baselines.
- Counted stories and baselines from the matrix instead of estimating: 60 new, 118 in total, 590 test executions per visual run; the CI timeouts are scaled from recorded runs (36880654992, 36882394060) and written in IC-09 (the visual and unit-tests figures) with the two new gates figures provisional until IC-09 re-measures them on the integrated tree.
- Checked each of the orchestrator's stated facts against the files and the repo; one correction is recorded in `research.md` (the contract's `MissionDetail.populated` example does contain a null-lane work package and a two-phases-in-progress case).
- No rendering was run in this phase: every visual claim is a spike (S1 to S4), not a fact.

## Plan review fix round (2026-10-03)

- The adversarial squad after the plan phase returned 35 confirmed findings (`reviews/plan.confirmed.yaml`); every one was addressed in `plan.md`, `research.md`, `data-model.md`, `contracts/*` and `quickstart.md`, fixing the defect class and not only the cited instance (all files swept for stale ids, counts, fixture names and statements about what a script enforces).
- Decisions taken in that round: `test:contract` is an explicit glob; PL-01 is built from work packages the contract allows next to a pending review (P-8, DR-12); overlays tally counts and declare every other derived value, and gate check C5 recomputes the contract's derivations; the data-driven selector set grew to 19 entries with `noInlineConfig` (31 once each alternative became its own entry); the drift register is provisional until checkpoint CP-1 between IC-03a and IC-03b; the lane mechanics for the three recorded tool defects (the facts are in `tracer-tooling-friction.md`) are stated in the Concern Map; timeouts are scaled from recorded CI runs; the wrap-up gains tree-hash and post-rebase gate checks.
