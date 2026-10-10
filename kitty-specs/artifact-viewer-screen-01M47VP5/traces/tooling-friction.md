# Tracer: tooling-friction

One entry per finding: `YYYY-MM-DD · actor · <text>`.

---

2026-10-06 · claude-opus-tasks-phase · Tasks phase (verified first-hand, CLI 4.0.0rc5): wps.yaml plan_concern_refs must match IC-## (pydantic: 'plan_concern_ref must match IC-## (e.g. IC-01), got: IC-01a'), but this plan splits two concerns as IC-01a/IC-01b and IC-06a/IC-06b (operator ruling PLAN-DESIGN-019). The four split WPs cite IC-01 and IC-06 in wps.yaml; every prompt, tasks-notes.md and the plan keep the a/b names. Also _plan_contains_implementation_concerns uses the regex IC-\d{2}\b, so a heading 'IC-01a' does not count as a concern heading.

2026-10-06 · claude-opus-tasks-phase · Tasks phase (verified first-hand): finalize-tasks --validate-only fails with LANE_DEPENDENCY_CYCLE (lane-a -> lane-b -> lane-a) when two dependency-ordered WPs share owned_files and a disjoint WP sits between them in the chain (WP01 and WP13 both owned the contract files; WP03 and WP05 both owned the root package.json while WP04 owned neither). The no-overlap check exempts dependency-ordered pairs, but lane computation collapses ANY overlapping pair into one lane, so the two checks disagree. Workaround: every shared file has ONE owner in owned_files and other writers record named out-of-map edits (the #4 precedent); the plan's shared-files table is quoted in each WP prompt.

2026-10-06 · claude-opus-tasks-phase · Tasks phase (verified first-hand): the staged commands tasks-outline and tasks-packages are slash-command prompts, not CLI verbs (agent tasks has no such subcommand; same class as ledger a spec-kitty tooling issue). The canonical flow was wps.yaml, WP prompt files, then spec-kitty agent mission finalize-tasks. finalize-tasks also requires create_intent in WP frontmatter for every new literal owned file (31 paths here), and two files owned by WP08 (logic/wp-retry.ts, sk-work-package-screen.ts) exist only after mission-ui#5 merges (Base A), so they are declared as .* globs, which pass the literal-path check.

2026-10-06 · claude-opus-tasks-phase · Tasks phase (verified first-hand): the generated tasks.md carries only per-WP header lines (dependencies, refs, concerns, owned files, subtasks, prompt) and says 'Do not edit directly'; it has no dependency graph, no CP-1 or Base A note and no coverage table. A companion file tasks-notes.md (not tool state) holds those, because finalize-tasks regenerates tasks.md from wps.yaml. Also: the issue-matrix scaffold took #5533 from a 'see the changelog on #5533' aside in spec.md and set verdict unknown; resolved with issue-verdict not-applicable.

2026-10-06 · claude-opus-tasks-phase · Correction to the previous create_intent entry: the count of new literal owned paths declared in WP frontmatter is 28 (counted from the committed WP files), not 31.
