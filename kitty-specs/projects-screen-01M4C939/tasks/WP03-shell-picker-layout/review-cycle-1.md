---
affected_files: []
cycle_number: 1
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T08:38:03Z'
reviewer_agent: user
wp_id: WP03
---

# WP03 review feedback, cycle 1: changes requested

1. **Must fix (binding test-quality rule: every loop asserts its iteration count).** `packages/mission-ui/test/sk-mission-shell.picker.test.ts:129`, test "forces drawer-open and flyout-open false": the `for (const width of [620, 800])` loop never asserts how many times it ran. Remedy: add `let ran = 0;` before the loop, `ran += 1;` inside it, and `expect(ran).toBe(2);` after it, the way the file's other loops do.
2. **Must fix (binding test-quality rule: every no-event / absence test carries a positive control in the same test).** `sk-mission-shell.picker.test.ts:124`, test "ignores navigation data in picker": it asserts `[aria-current]` count 0 and `[data-top-bar-context]` null with nothing in the same test showing that the `project` (or `mission`) layout draws them from the same data. Remedy: in the same test, render the same data with `layout="project"` first and assert `[aria-current]` count above 0 and `[data-top-bar-context]` present, then switch to `picker` and assert the absence.

No production change. Re-run the revert check for the test file and `pnpm test` (expect 1065, all pass), typecheck and lint.
