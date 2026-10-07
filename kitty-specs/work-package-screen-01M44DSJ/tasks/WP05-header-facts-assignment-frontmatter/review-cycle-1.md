---
affected_files: []
cycle_number: 1
mission_slug: work-package-screen-01M44DSJ
reproduction_command:
reviewed_at: '2026-10-05T11:48:13Z'
reviewer_agent: claude
wp_id: WP05
---

# WP05 sent back by the orchestrator (2026-10-05)

WP05 moved to for_review with red gates. A WP is not ready while `pnpm test` is red.

1. **`pnpm test` red: 3 skeleton tests** in `sk-work-package-screen.skeleton.test.ts` assume the header is an empty stub. Make that test robust for ALL chains: it must not assert emptiness of any region a later WP fills, but still prove the skeleton wiring (13 region ids present, the focus behaviour). Start from `scratchpad/ui5-wp05-skeleton-test.patch`. **WP07 (chain Y, parallel lane) applies the byte-identical change**, so keep it a self-contained patch to that one file. Write the final version to `scratchpad/ui5-skeleton-test-robust.patch`. The two focus tests must keep testing focus on removal (VISUAL-011) with a real h1 present.
2. **Breadcrumb renders "/ / /":** fix it at the source. `renderBreadcrumb` must not draw its own separator item when the library sheet draws one. Remove the explicit separator item in the renderer instead of hiding it with CSS in `headerStyles`. Add a test asserting exactly one visible separator between crumbs.
3. **E-21 (operator ruling, see the tracer section "Operator rulings during WP05"):** add the exception row for `text-overflow: ellipsis` in `header-parts.ts` and `overflow-wrap: break-word` in `facts-parts.ts`. Keyword values only, file-scoped, with stylelint proof cases. Use them, so that a single long word is ellipsized in the title band and wraps in Facts. Add a test for each. Put the gates.md row in your kitty-specs patch.
4. **Facts look** (row separators, pill borders, the h3 size): no change. The operator judges it at the Storybook review.
5. **gate-proof's visual red** for the ten un-baselined stories is expected until WP10 (ruling CORRECT-012). Keep the PNG output untracked and out of the worktree when you finish. Report that leg as known, and every other leg green.
