---
affected_files: []
cycle_number: 2
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T08:40:10Z'
reviewer_agent: user
wp_id: WP03
---

# WP03 review feedback, cycle 2: changes requested

Cycle 1's two fixes are correct and accepted (including checking the nav item's `current` property instead of `[aria-current]`, which lives in each item's shadow root).

1. **Must fix (binding test-quality rule: every loop asserts its iteration count).** `packages/mission-ui/test/sk-mission-shell.picker.test.ts`, test "ignores navigation data in picker and still reflects the tier": the new `for (const width of [1280, 620])` loop has no iteration-count assertion, so a loop that never ran would pass vacuously. Remedy: `let ran = 0;` before it, `ran += 1;` at the end of its body, `expect(ran).toBe(2);` after it.

Also scan the whole file once more and apply the same fix to any other loop without a count. No production change; run `pnpm typecheck`, `pnpm lint` and `pnpm test` (1065 passing).
