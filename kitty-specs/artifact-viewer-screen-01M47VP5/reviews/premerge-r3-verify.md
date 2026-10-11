# Pre-merge squad R3 verification and round 2 (2026-10-10)

**R3** ran on lane-m 183726c, after fix round 1 (7bbeaf3..586717d) and the docs patch. It used a full copy with real `node_modules` and a revert experiment per fix, and it re-ran the R2 and SECURITY probes.

- **All 15 items are RESOLVED.** Every revert turned its test or self-test red. The SECURITY probe sources are now refused.
- **Quiet-machine gates:**
  - `pnpm test`: 1648 of 1648 pass.
  - `GDK_BACKEND=x11 pnpm visual`: 220 of 220 pass.
  - `pnpm gate-proof`: 12 gates, verdict pass (visual proof 985 s).
  - LANE `git status` stayed clean.
- **The out-of-map edit to `gates/plants/hygiene/plant.json` is required.** Reverting it alone fails the gate-proof coverage check.

**Fresh findings, fixed in round 2** (9f3fe10, 9f279f2). Each has a red-first or mutant proof:
- **F-1 (sev 2):** mailto rows for a comma, an encoded comma, and an encoded CRLF header. Removing the comma check or the control-character check now turns a row red.
- **F-2 (sev 1):** the raw-text end tag is found by a case-insensitive regex, not by indexing the lowercased chunk. Adds a U+0130 self-test.
- **F-3 (sev 1):** a computed `setAttributeNS` on* self-test.
- **F-4 (sev 1):** R4 itself treats `<!-->` and `<!--->` as complete comments.
- **F-5 and F-6:** informational. The 20-entry `allowTags` list is exactly the tags in use, and the cooked-null case is handled.

**Round-2 gates:**
- typecheck, lint, lint:no-io: pass.
- test:scripts: 416 pass.
- test:no-io: 195 pass.
- `pnpm test`: 1648 pass.

**Operator rulings applied:**
- SECURITY-003: option (a), the R3 gate only. The request-only sinks are a known gap of #4's no-io gate and are stated in the PR.
- A11Y-002: option (b). Left out of #7 and flagged on spec-kitty-design#493.
- CONTRACT-002: option (a). The source block goes full width.
