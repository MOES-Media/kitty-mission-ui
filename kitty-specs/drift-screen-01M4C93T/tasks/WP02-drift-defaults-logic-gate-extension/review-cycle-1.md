---
affected_files: []
cycle_number: 1
mission_slug: drift-screen-01M4C93T
reproduction_command:
reviewed_at: '2026-10-10T06:27:59Z'
reviewer_agent: user
wp_id: WP02
---

# WP02 review feedback, cycle 1: changes requested

The independent review is in scratchpad `ui10-wp02-review.md`, and the tracer section "WP02 review (2026-10-10)" also applies. Both outrank this summary.

1. **Must fix: the explanation follows the spec, which is pair-keyed.** spec.md:189 says an unknown `sourceCode` gets "no explanation", FR-011 says "none for an unknown pair", and the contract view-model has `explanation: null` for an unknown pair.
   - Files: `logic/drift-finding.ts` `explanationOf` (around line 98) and `test/drift-finding.test.ts:84`.
   - Today a known kind with an unknown or null `sourceCode`, or a mismatched pair (`lane_branch_missing` with `CORRUPT_JSON`), returns the kind's sentence.
   - Remedy:
     - key the explanation by pair, and add `SNAPSHOT_DRIFT` to `bySourceCode`;
     - return non-null only when `sourceCode` is an own key of the kind's `bySourceCode`, or when the kind has no `bySourceCode` and `sourceCode === null`;
     - flip line 84 to expect null, with the six valid pairs as controls.
   - Write it red-first.
2. **Must fix: positive controls.** In `test/drift-announce.test.ts`, three absence tests need an announcing expectation on the same function inside the same test:
   - the clock tick (line 27);
   - copy outside a report state (line 94);
   - missing `scannedAt` (line 100).
3. **Must fix: loop counts.** In `test/drift-keys.test.ts`, the loop over `[-1, 5, 99]` (line 62) and the hostile-key loop (line 81) need `ran` assertions of 3 and 4.

No other change. Run the gates without visual and without gate-proof, and use `pnpm test --maxWorkers=2`.
