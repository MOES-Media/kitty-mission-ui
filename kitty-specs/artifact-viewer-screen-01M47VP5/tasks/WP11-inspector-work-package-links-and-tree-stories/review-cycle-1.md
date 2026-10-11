---
affected_files: []
cycle_number: 1
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-07T23:37:43Z'
reviewer_agent: user
wp_id: WP11
---

# WP11 review: changes requested (rulings on your three open items, 2026-10-08)

See the tracer section "Rulings at WP11: inspector heading size and the pill reset".
1. **Pill reset:** add `border: 0` and `cursor: pointer` to the E-29 entry for `inspector-parts.ts`, pinned and leak-tested. Write the CSS. Assert the pill's block size is exactly 26 px, not only "at least 24".
2. **Inspector h3:** add a narrow grant for the group headings, `font-size: var(--sk-text-base)` and `line-height: 1.35`, pinned and leak-tested. Write the CSS. Assert the computed size.
3. **FR-027 unmatched case:** in the screen file, `inspectorView()` passes `linked: []` when a prompt or review-cycle artifact has no Work Package match. This is a named out-of-map edit. Test it red-first, with a revert experiment.
4. **Record** the two grants as E-29 and inspector rows in `contracts/gates.md` through your kitty-specs patch.
5. **Gates:** the full set, `pnpm test`, and gate-proof once in the foreground. The only expected visual reds are the new stories, which have no baseline until WP13. Re-run the one flaky shell story alone and classify it.
