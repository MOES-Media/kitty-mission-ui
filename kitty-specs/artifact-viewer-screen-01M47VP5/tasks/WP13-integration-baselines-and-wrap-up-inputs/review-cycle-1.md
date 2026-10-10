---
affected_files: []
cycle_number: 1
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T11:03:25Z'
reviewer_agent: user
wp_id: WP13
---

# WP13 review feedback, cycle 1: changes requested

The full review is in scratchpad `ui7-wp13-review.md`; it outranks this summary.

1. **Must fix: the shell-tree indent cap detached the class JSDoc and damaged the manifest of #4's shared element.**
   - In `packages/mission-ui/src/elements/sk-shell-tree/sk-shell-tree.ts`, at about lines 27-32, `const MAX_INDENT_LEVELS = 6` and its comment sit between the class JSDoc and `export class SkShellTree`.
   - As a result, the regenerated `packages/mission-ui/custom-elements.json` lost several things:
     - SkShellTree's description;
     - `tagName: "sk-shell-tree"`;
     - both event descriptions and their detail types (`CustomEvent<ShellNavigateDetail>` became `CustomEvent`).
   - `manifest:check` passes only because the manifest was regenerated from the broken source.
   - Remedy:
     - move the const above the class JSDoc;
     - run `pnpm manifest:generate` once;
     - confirm that the manifest diff against c606689 for `sk-shell-tree` is empty, or holds only the `[data-children][data-capped]` CSS rule;
     - add a guard test asserting that the manifest's `sk-shell-tree` entry keeps its `tagName`, its description and the typed event details. That test must fail on the broken placement; do the revert and report it.
2. **Then:**
   - run the full gate set and ONE `pnpm visual` (0 failures expected; no baseline should change);
   - run mark-status T087..T094;
   - run `move-task WP13 --to for_review` (no `--force`).
