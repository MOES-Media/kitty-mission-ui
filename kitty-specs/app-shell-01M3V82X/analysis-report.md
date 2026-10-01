---
schema_version: 1
artifact_type: spec-kitty.analysis-report
command: /spec-kitty.analyze
mission_slug: app-shell-01M3V82X
mission_id: 01M3V82XTXMDYCND2BWY7M5SZF
generated_at: '2026-10-01T08:47:40.860814+00:00'
analyzer_agent: unknown
input_artifacts:
  spec.md:
    path: kitty-specs/app-shell-01M3V82X/spec.md
    sha256: d21e7d74f932b7242ec7cd85d0d1c3a5f14087f19b5548a2589dcf9e6771caca
  plan.md:
    path: kitty-specs/app-shell-01M3V82X/plan.md
    sha256: 5662ad4962be901db7344e6daf53242db56b23202ffcaf2616398a993bf4a33a
  tasks.md:
    path: kitty-specs/app-shell-01M3V82X/tasks.md
    sha256: 4cf77570120d37c0e2fd07f1cf37397c572298e70e2b5046b290f0e5b7bf87ec
  charter:
    path: .kittify/charter/charter.yaml
    sha256: 6c4c0db601378555589b85d9a43049230d898543d26ecaa559c77fcd082211f5
verdict: ready
issue_counts:
  critical: 0
  high: 0
  low: 4
  medium: 3
  info: 0
findings:
- id: C1
  severity: medium
  category: coverage
  summary: NFR-004/SC-003 keyboard reachability is proven per tier only with the drawer closed (WP04 Tab-walk); WP05 has no Tab-walk with the drawer open or the flyout open, so drawer nav items and flyout tree items are not counted.
- id: C2
  severity: medium
  category: coverage
  summary: 'NFR-005 test (200% root font at 1100/620) is weak: tiers use px media queries, so keeping the tier is trivially true; only the no-horizontal-overflow assertion has force and no baseline backs it.'
- id: A1
  severity: medium
  category: acceptance
  summary: WP05 acceptance 5 uses git diff HEAD~1 HEAD for the four-call-site seam edit, which assumes a single WP commit; fails or lies with several commits.
- id: I1
  severity: low
  category: inconsistency
  summary: plan.md IC-05 lists sk-mission-shell.ts/shell-parts.ts as edited; tasks put the work in new shell-overlays.ts plus a four-call-site seam edit (disjointness is better in tasks).
- id: I2
  severity: low
  category: inconsistency
  summary: spec SC-001 says about 20 states; plan/tasks deliver 42 shell stories (57 baselines).
- id: T1
  severity: low
  category: traceability
  summary: FR-019 (focus lands on content target after drawer/flyout navigation) is tested in WP05 but is not in WP05 requirement_refs; tasks.md WP04 omits C-004 that its frontmatter lists.
- id: V1
  severity: low
  category: acceptance
  summary: WP06 acceptance 7 (orphan baseline plant) passes vacuously if pnpm visual fails for infra reasons (podman); assert the failure names the orphan.
---

## Specification Analysis Report

| ID | Category | Severity | Summary | Recommendation |
|----|----------|----------|---------|----------------|
| C1 | Coverage | MEDIUM | No Tab-walk with drawer/flyout open (NFR-004, SC-003) | Add one Tab-walk test per overlay to T029 |
| C2 | Coverage | MEDIUM | NFR-005 tier assertion trivial | Keep overflow assertion; drop or relabel tier check |
| A1 | Acceptance | MEDIUM | HEAD~1 diff brittle | Use diff against the WP04 tip / merge-base |
| I1 | Inconsistency | LOW | plan IC-05 surfaces vs tasks | Note tasks.md is authoritative |
| I2 | Inconsistency | LOW | SC-001 about 20 vs 42 | Update SC-001 wording |
| T1 | Traceability | LOW | FR-019 ref on WP05, C-004 | Add refs |
| V1 | Acceptance | LOW | orphan plant vacuity | Grep failure output for orphan |

Checks requested: (1) acceptance commands are literal, guarded (plants removed with rm -f / git checkout), and every script name exists in package.json (typecheck, lint, lint:styles, lint:no-io, test:no-io, hygiene, manifest:generate/check, storybook:build-only, visual, visual:update, gate-proof, test). (2) owned_files are disjoint; recorded exceptions only (WP01 skeleton seed, WP05 seam in sk-mission-shell.ts, custom-elements.json regeneration). (3) Chain WP01..WP06 serial, matches plan IC-01..IC-06 and lanes.json. (4) Every FR/NFR has a WP; FR-016 (WP05 tests + FlyoutWorkPackages1024/FlyoutArtifacts1024), FR-017 (WP02 tests + LabelBubbleVisible1024), FR-018 (WP02/WP04 tests + MissionPipeline1280), NFR-003 (WP04 main top edge test), NFR-004/005 see C1/C2. (5) Visual gate stays green: WP01-WP05 add no shell stories; WP02 (6) and WP03 (5) each ship their own baselines, clearing the 4-story minimum; 42+6+5+4=57 consistent.

Metrics: requirements 19 FR + 5 NFR, all covered (100%); tasks 36; critical 0; high 0.
