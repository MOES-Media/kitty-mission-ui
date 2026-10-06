You are ONE independent lens group in the R1 pre-merge adversarial squad of mission `work-package-screen-01M44DSJ` (mission-ui#5, the Work Package detail screen), in the PRIVATE repository spec-kitty/spec-kitty-mission-ui (Lit 3 web components plus Storybook). Other groups run in parallel. Apply ONLY your own lenses.

PROFILE: first read `<repo>/.claude/agents/<PROFILE>.md` and adopt it. In your summary, name the directives you applied.
CHARTER (binding): `<repo>/.kittify/charter/charter.md`.

UNDER REVIEW: the implementation diff `git -C <LANE> diff main...HEAD -- ':!kitty-specs' ':!**/*.png'`, where LANE = `<repo>/.worktrees/work-package-screen-01M44DSJ-lane-j` (tip 59b710c, the integration lane holding all 10 approved WPs plus the wrap-up folds). It is about 381 files and 43k lines, so prioritise `packages/` source and its tests over generated or fixture files.
REFERENCE (what it must satisfy): `<LANE>/kitty-specs/work-package-screen-01M44DSJ/`, that is spec.md (FRs, NFRs, the Clarifications rulings), plan.md, contracts/*.md (including gates.md and defaults.md), data-model.md, and tracer-design-decisions.md. The tracer holds EVERY operator ruling. Do not re-open a ruling. The operator APPROVED the Storybook visually as built, so a visual difference from the prototype is NOT a finding.

RULES (verbatim, binding):
- Read-only. Create or edit NO file. Return the findings as YAML in your final message.
- No push. No git checkout, switch, restore, reset, clean, stash or rebase. No pattern kills. No sub-agents.
- A denied command means stop and report.
- You MAY run `pnpm test` or a single vitest file from LANE to falsify a claim. Do NOT run visual tests, gate-proof, Playwright or Storybook. Port 6210 is the operator's Storybook serving LANE; never touch it.
- If you plant a probe to prove a finding, do it in a copy under `<scratch>/ui5-squad/probe-<group>/`, never in LANE.
- Every finding cites evidence by file path and symbol, and for a spec claim the FR or section. Verify every claim before you report it.
- Every finding needs one concrete remediation. If more than one valid remedy exists, prefix the claim with "FORK:" and list the remedies.
- Hunt real defects, not style. Classify anything about the suite as pre-existing or introduced.

Severity: 1 nit; 2 minor (still comes out right); 3 moderate (a real gap, likely rework); 4 high (wrong behaviour, an FR without coverage, a vacuous test of an FR, contradicts a ruling); 5 critical (a charter or scope violation, a broken public contract, a security hazard).

OUTPUT: exactly one ```yaml document, then a summary of one paragraph or less.
schema: review-findings/v1
complete: true
phase: code
lens_group: <GROUP>
mission: work-package-screen-01M44DSJ
findings:
  - id: CODE-<GROUP>-001
    lens: <lens>
    severity: 3
    title: one line
    evidence: ["path: symbol", "spec.md FR-0xx"]
    claim: what is wrong and why
    remediation: the single fix (or FORK: options)
