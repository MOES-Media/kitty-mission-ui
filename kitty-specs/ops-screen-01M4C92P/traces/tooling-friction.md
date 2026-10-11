# Tracer: tooling-friction

One entry per finding: `YYYY-MM-DD · actor · <text>`.

---

2026-10-07 · claude-opus-5.5 (orchestrator tasks phase) · tasks phase 2026-10-08: the IC-## regex in wps.yaml refuses the plan's IC-03a and IC-03b; both are cited IC-03 and the mapping is in tasks-notes.md (known from the work-package-screen mission).

2026-10-07 · claude-opus-5.5 (orchestrator tasks phase) · tasks phase: tasks.md is regenerated from wps.yaml and carries no prose (dependency graph, CP-1, shared-file owners, out-of-map edits); that narrative lives in tasks-notes.md. The tasks-packages prompt tells the agent to dispatch one sub-agent per WP; this mission forbids sub-agents, so the nine prompts were generated sequentially by the orchestrator. finalize-tasks warns that two literal-glob owned_files (spikes/ic-03a-ops/**, screens-ops-*.png) match zero files even when listed in create_intent; the warning is expected and non-blocking. finalize-tasks and issue-verdict commit via the CLI without the session trailers; the tasks and notes commits use safe-commit.
