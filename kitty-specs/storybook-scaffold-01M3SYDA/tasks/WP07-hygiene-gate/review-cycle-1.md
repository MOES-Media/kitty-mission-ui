---
affected_files: []
cycle_number: 1
mission_slug: storybook-scaffold-01M3SYDA
reproduction_command:
reviewed_at: '2026-09-30T22:25:15Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 review feedback (cycle 1) - REJECT

All DoD commands re-run on lane-g (5d77201, 484c7b6): node --test 33/33 pass; pnpm hygiene = ci.yml missing + 6 stale-copy prompt lines (clean against 722e41b); plant PLANT-CAUGHT then 0; untracked path exit 1; range exit 1; storybook-static exit 0 / probe exit 1 / build-storybook exit 0; tEXt case present; display-name grep 0. Runtime-assembled probes caught: all gh[pousr]_, github_pat_, npm_ tokens; .npmrc auth line; YAML underscore-authToken colon value; quoted authToken / npmAuthToken JSON keys; home, Users, C-drive and JSON-escaped C-drive paths; glued-placeholder segment with trailing slash; user path after a stripped CI root; ranges (>=, 1.x, latest, *, ~); missing typecheck; .ts and .d.ts under gates/plants; pull_request_target and workflow_run; tEXt PNG; token in --record. Status-file allow-list: other key, other file, nested dir, token or auth assignment on the same line are all still flagged.

## Required fixes (NFR-004 / research R6 scope)

1. HIGH - JSON with the underscore key misses: a line of the form {"_authToken" + quote + ": " + quoted real value} produces zero findings. AUTH_ASSIGN needs the key's closing quote allowed before the separator (e.g. `_authToken"?\s*[=:]`), or QUOTED_KEY must accept an optional leading underscore. Add a selftest case.
2. HIGH - .yarnrc (v1) form misses: a line `"//registry.example/:` + underscore-authToken + `" "<real value>"` (quoted key, space, quoted value, no = or :) produces zero findings although R6 names .yarnrc explicitly. Treat any quoted key ending in authToken (with or without leading underscore / scope prefix) in structured or .yarnrc files as a finding. Add a selftest case.
3. MEDIUM - user paths without a trailing slash escape: `cd ` + home-root + `<name>` at end of line, a quoted home-root + name + closing quote, and home-root + `<user>foo` at end of line all produce zero findings. Match the segment up to a boundary (slash, whitespace, quote, backslash or end of line) instead of requiring a trailing slash. Keep CI roots stripped first. Add selftest cases (assembled at run time).

## Should fix (low)

4. Charter allow-list suppresses every path finding on the matching line; anchor the pattern to the end (`packs/built-in/missions/[^/\s]+\.ya?ml\s*$` per R6) so a second path on that line is still flagged.
5. JSON slash-escaped home paths (backslash-slash form) are not detected; consider unescaping `\/` before the path scan.
6. R6 "no Playwright trace upload unless the step names the sanitiser" has no rule; add it or record in the hand-off which WP owns it.

## For the orchestrator (not an implementer defect)

- The second allow-list entry (status.json / status.events.jsonl feedback_path) makes `--list-allowed | wc -l` print 2 against a DoD of 1 and NFR-004's "only exception" wording; the entry itself is narrow (key-value strip only, per mission dir), but spec/prompt need amending.
- The DoD range command lets pnpm 11 auto-install and rewrite pnpm-lock.yaml; the restore step must also check out pnpm-lock.yaml (or run node directly).
- index.js is inside owned_files (scripts/hygiene/**); the "out-of-map" label in 484c7b6 is wrong but harmless.
