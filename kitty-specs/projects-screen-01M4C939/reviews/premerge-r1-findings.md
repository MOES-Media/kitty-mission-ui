# Pre-merge squad R1 findings (2026-10-10)

Four lens groups, report-only, on lane-i 5de533c. Profiles: architect-alphonso (boundary), reviewer-renata (contract), debugger-debbie (tests), frontend-freddy (a11y).

## R1 BOUNDARY (3 findings; all three lint configs pass; layering, picker, tooling, surface and grants clean)
- CODE-BOUNDARY-001 sev2: the stylelint.config.mjs E-31(a), E-32, E-33 and E-33(c) comments say "issue to be opened"; E-34(b)-(d) and DP-22 carry no sunset. Remedy: cite #525/#526/#527/#529/#503 (comment only).
- CODE-BOUNDARY-002 sev2: ProjectView (the type of ProjectEntry.project) is not exported from index.ts. Remedy: add the type export plus a surface-freeze check.
- CODE-BOUNDARY-003 sev1: the dialog's deepActiveElement reads document.activeElement (read-only; no-io passes). Remedy: optional getRootNode().activeElement, or note it in the contract.

## R1 CONTRACT (6 findings; contract fidelity holds; manifest, contract, data-driven, no-io and hygiene green)
- CODE-CONTRACT-001 sev3 FORK: PR-31 (forced colours / light theme) has no story or baseline. FR-031/SC-001 require one per matrix row, and the tiers stories header wrongly claims PR-31. Options: (a) a story plus a baseline (light theme or forced colours); (b) an operator waiver plus corrected comments.
- CODE-CONTRACT-002 sev3: Q4's schemaVersion never reaches assistive technology. ProjectRowView.description is built and unit-tested but never rendered (no aria-describedby). Remedy: render a hidden description on the row trigger (schema-version phrase only) plus a computed accessible-description test.
- CODE-CONTRACT-003 sev3: the ruled wrap-up fold of the vacuous project-retry test ("carries a repeated key as given" compares a call with itself) was NOT applied (an orchestrator omission from the fold list). Remedy: toStrictEqual({target:'project', key:'dup'}) plus a screen-level same-key retry check.
- CODE-CONTRACT-004 sev2: an error row with an empty or missing key draws a Retry that does nothing (renderStub draws it unconditionally). Remedy: draw it only when projectRetryDetail(view) is non-null, plus a test with a keyed sibling as control.
- CODE-CONTRACT-005 sev2: ProjectRowView.accessibleName is the declined strict form and feeds the live region. Remedy: rename it to announcementText and comment that the real name is computed from the visible content.
- CODE-CONTRACT-006 sev1: doc drift. schemaVersionText is missing from defaults.md; the sk-projects-screen.md Structure line still says "action slot"; the P-2/P-3 comment labels are swapped in project-types.ts; ListStateContext.onRequestOpen is unused.

## R1 TESTS (7 findings; probes in probe-TESTS/full; baseline 1289/1290 on this host; 7 risky-path mutants all KILLED)
- CODE-TESTS-001 sev3: the dialog "prototype measures" test (states.test.ts ~185) FAILS on this host: Cancel is 79 px wide against an expected 81 (font-dependent: fc-match sans gives Noto Sans). The same assumption sits in tier.test (89.4/155.4/68.4) and skeleton (78.39). Remedy: pin the font in the tests, or assert layout relations, or move the literals to the pinned visual suite.
- CODE-TESTS-002 sev3: the live region goes stale when errorMessage changes while the state stays error (transitionText returns null when the state is unchanged). Probe: the region reads 'first' while the screen shows 'second'. NFR-012. Remedy: compare against the previously announced text, plus a test.
- CODE-TESTS-003 sev2: replacing a ready list with a different entry of the same count announces nothing (probe: live()===''). Remedy: announce the new keys, or pin silence with a ruling.
- CODE-TESTS-004 sev3: the PR-31 forced-colours test passes with the emulation off; only the matchMedia self-check and the library pill background trip it. The screen has no forced-colours rule; the dialog's forced-colors block is untested. Remedy: assert something the emulation changes and the screen owns, plus a dialog forced-colours case.
- CODE-TESTS-005 sev2: the sk-progress ESLint grant regex accepts class="sk-progressive" and "sk-progressx"; the plant test excuses it with `|| plant.includes('sk-progressive')`. Remedy: tighten to sk-progress(?:(?:--|__)[a-z0-9-]+)?, drop the ||, and split the plant into its own case.
- CODE-TESTS-006 sev2: OVERLAP and shared files skip the leak assertion entirely, so over-grants inside the list are invisible. Remedy: assert the positive half (the declaration passes) for each OVERLAP or shared file.
- CODE-TESTS-007 sev2: the perf test is an absolute 200 ms wall clock including a rAF wait (10311 ms seen once under load). Remedy: one retry, or a same-run calibration baseline.
Process note: the agent ran `pkill -x yes` against its own spinners (a pattern kill, disclosed; none remain).

## R1 A11Y (6 findings; by code reading, no browser)
- CODE-A11Y-001 sev3: the folder listbox onKeydown (folder-list-parts.ts) swallows Alt/Ctrl/Meta/Shift with the arrow keys, Home and End. Same defect as #7's tablist. Remedy: return early on modifiers, plus a test.
- CODE-A11Y-002 sev3: the dialog's Retry removes the focused button and nothing restores focus (focusFirstControl runs only on open). The listing arriving after an open-on-loading does not move focus either. Remedy: capture focus in willUpdate and restore it in updated() (as the screen does), plus a retry focus test.
- CODE-A11Y-003 sev3: the dialog's listing error is announced twice (assertive sk-notice plus the polite [data-live] region carrying the same text). Remedy: one announcer (listingText returns null for error, as in the WP screen precedent), pinned in a test.
- CODE-A11Y-004 sev2: the selected folder option is shown by the background tint alone, the same as hover (border only in forced colours, with a 1px layout shift). Remedy: a permanent non-colour cue (an inset border or an aria-hidden check glyph), plus a transparent border on every option.
- CODE-A11Y-005 sev2 FORK: aria-describedby="open-reason" sits on the sk-button host and does not reach the inner button; the test checks only the host attribute. Options: (a) upstream forwarding, (b) drop the dead attribute and keep the visible text, (c) aria-disabled instead of disabled.
- CODE-A11Y-006 sev1: the roving tab stop is reset by a re-render that does not change the selection (live() puts tabindex 0 back on the selected option). Remedy: keep the active index as state.
