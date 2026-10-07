---
affected_files: []
cycle_number: 1
mission_slug: work-package-screen-01M44DSJ
reproduction_command:
reviewed_at: '2026-10-06T06:50:51Z'
reviewer_agent: claude
wp_id: WP10
---

# WP10 sent back by the orchestrator (2026-10-06)

WP10 is otherwise complete and green. Two items must be fixed before approval.

1. **Baselines miss the region under test (defect, reported by the implementer).** The visual harness screenshots `#storybook-root` at 1280x800, and a `vw-<n>` tag sets only the width. In about 25 stories the region under test sits below the fold and is not in the PNG:
   - WP-25, 26, 27, 31, 32, 33a, 33b, 34, 35a, 35b, 35c and 50 (the owned-files, workspace and links panels);
   - WP-36a, 36b and 37 (the refusal and loading notice);
   - WP-12, 15, 16, 28, 29 and 30 (they differ only below 800 px).
   Remedy: add a height tag (for example `vh-<n>`) to `apps/storybook/tests/visual/stories.visual.spec.ts`, parsed like the existing `vw-<n>` tag, and give each affected story a height that puts its region under test fully inside the capture. Check each one by LOOKING at the new PNG. Add a harness test for the height tag (parsed, applied, and a story without it keeps 800), red-first. Re-baseline only the affected stories; the other baselines must stay byte-identical. Five clean visual runs and gate-proof green again.
2. **Stories without `now`.** The chains-work, states and tiers stories do not pass `now`, so their timestamps render as raw ISO text. Pass the same fixed `now` the header and review stories use, and re-baseline the affected stories.

Commit in logical steps. Re-run the full gate set, `pnpm test`, five visual runs and gate-proof. Leave no untracked PNGs. The operator's Storybook will run from THIS lane (lane-j) on port 6210: never stop it or use that port.
