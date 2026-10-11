# Tracer: design-decisions

One entry per finding: `YYYY-MM-DD · actor · <text>`.

---

2026-10-06 · claude-opus-tasks-phase · FORK PENDING OPERATOR (tasks phase, analyze finding A1): plan IC-02 (WP03) is ordered before IC-03 (WP04) but markdownFor, resolveArtifactView's markdown: MarkdownResult input and the vocabulary budget group name types and a builder that IC-03 creates; IC-03 cannot precede IC-02 (links.ts imports artifact-path.ts, budget.ts imports defaults/markdown.ts). Options: (A, recommended) move markdownFor and its tests to WP04 and type the seam structurally in WP03; (B) inject the builder into markdownFor and move the MarkdownResult type to IC-02; (C) merge IC-02 and IC-03. Not self-ruled; see tasks-notes.md. WP03 and WP04 carry an OPEN FORK banner and must not be dispatched until ruled.

2026-10-06 · claude-opus-tasks-phase · OPERATOR RULING 2026-10-06 on analyze A1: option (A). markdownFor and its tests move from IC-02 (WP03) to IC-03 (WP04), exported from logic/markdown/model.ts; WP03 types resolveArtifactView's markdown input and the vocabulary budget group structurally in artifact-types.ts. No WP count, dependency or signature change. Applied in spec.md Clarifications, plan.md (two sentences), contracts/defaults.md, WP03 and WP04 (OPEN FORK banners cleared).

2026-10-06 · claude-opus-tasks-phase · DELIBERATE DEVIATION, no further action: the tasks-phase adversarial squad was an orchestrator instruction; charter and spec C-011 say the squad runs after the plan phase only.
