# ui#5 squad R2: confirmed findings (16 confirmed, 3 refuted: CONTRACT-004 ruled by spec.md:198/WP-16; BOUNDARY-006 already pinned; TESTS-004 repo idiom)
Probe file: ui5-squad/probe-R2/packages/mission-ui/test/probe-r2.test.ts

## Single-remedy fixes
- A11Y-001 (sev3): render the live span as keyed(this.announcementSeq, html`<span>${this.announcement}</span>`), as sk-missions-screen.ts does (PR-CORRECTNESS-004). Add a MutationObserver test like sk-missions-screen.test.ts:722 (loading->error->loading gives a childList mutation). Update the data-seq tests (a11y.test.ts:89, skeleton.test.ts:543, states.test.ts:394).
- TESTS-001 (sev3): a detach test (remove the screen, change the shell tier, no data-shell-mobile), plus a re-parent test (follows the new shell only).
- A11Y-003 (sev2): compute the effective state (ready && workPackage!==null, else 'empty') once and feed it to transitionText and render. Test that ready+null does not announce "loaded".
- CONTRACT-001 (sev2): the Assignment draw condition comes from what assignedRows/authoredRows render (present() on every member), dropping au.subtasks. Test that all-null plus subtasks gives no assignment region.
- BOUNDARY-005 (sev2): find the shell across shadow roots (a getRootNode().host walk helper). Test the wrapper-shadow case. Add one contract line ("the enclosing shell, including across shadow roots").
- A11Y-002 (sev2): the cancellation heading becomes h2, plus a heading-outline test for the canceled fixtures.
- BOUNDARY-004 (sev2): export WorkPackageRecordView and WorkPackageDetailView types from src/index.ts.
- BOUNDARY-002 (sev2): gates.md E-18 "six properties (five plus row-gap)"; E-21 lists all five files with the WP09 rulings (cite the tracer).
- TESTS-002 (sev2): front-insertion node-identity tests for subtasks, owned files and the dependency chain, plus duplicate-key cases (duplicate dependency id, duplicate pattern) pinning the current output.
- TESTS-003 (sev2): replace the fixed 200 ms sleeps in tier.test.ts with expect.poll/vi.waitFor.
- A11Y-004 (sev1): title=${text} on both data-less h1s (state-parts.ts).
- CONTRACT-002 (sev1): delete the dead constants (OVERRIDE_BY/AT/REASON, CYCLE_LABEL, LABEL_VERDICT, STAGE_WORK_PACKAGE, STAGE_STATE, WP_PAGE_LABEL) and their wp-defaults assertions; amend defaults.md lines 14, 16 and 31.
- BOUNDARY-003 (sev1): delete ResolvedOwnedFile and import ResolvedFile type-only (data-model names ResolvedFile).
- BOUNDARY-007 (sev1): StalenessRole type-only import in defaults/staleness.ts.

## Forks (operator)
- BOUNDARY-001 (sev2): unregistered ::part rules in header-parts (breadcrumb sk-button padding-inline), review-parts (nested sk-card padding) and files-parts (sk-action-row grid + hidden parts + tags margin).
- A11Y-005 (sev1): no h3 on the assigned group, contrary to contract line 134.
- CONTRACT-003 (sev1): history lane words versus card badge words.

## Operator rulings on the forks (2026-10-06)
- BOUNDARY-001 -> (a) Register E-22 in gates.md covering the ::part rules of header-parts (breadcrumb sk-button padding-inline), review-parts ([data-cycles] sk-card::part(card) padding) and files-parts (sk-action-row::part(trigger) grid-template-areas/columns/row-gap, ::part(title|metadata|supporting|controls) display:none, ::part(tags) margin-block). Add a stylelint-config comment entry, and a test pinning the exact set of ::part selectors per file (an unlisted ::part rule fails). Sunsets: spec-kitty-design#516 (card compact density), #493 and #508 (sk-action-row flush empty parts / card layout), #518 (sk-button compact inline padding, filed today). FIRST check whether `sk-action-row layout="card"` (or presentation="flush") reproduces the file row; if it does with no visual change, drop the files rules instead of registering them, and say so. The visual baselines must not change.
- A11Y-005 -> (b) Amend contracts/sk-work-package-screen.md line ~134: only the Authored recommendation group carries an h3. No code change.
- CONTRACT-003 -> (b) Keep the split. Record it in the tracer as a DW-10 note (history rows use #4's summary lane words via resolveLaneLabel; the header, Facts, chain, subtasks and cancellation use the card badge words via resolveStateBadge). Add a test pinning that a labels.state-only host leaves the history words unchanged, and that labels.lane renames the history.
