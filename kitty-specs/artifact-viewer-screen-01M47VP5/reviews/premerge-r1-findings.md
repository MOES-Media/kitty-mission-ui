# Pre-merge squad R1 findings (2026-10-08 to 2026-10-10)

Five lens groups, report-only, on lane-m 1643eb7: boundary (architect-alphonso), security (reviewer-renata, opus), contract (reviewer-renata), tests (debugger-debbie), a11y (frontend-freddy).

## R1 BOUNDARY (5 findings)
- CODE-BOUNDARY-001 sev4: buildArtifactTree, pathOfArtifactNode, ArtifactTreeOptions and ArtifactTreeResult are not exported from src/index.ts (the package entry; there is no exports map), yet quickstart.md:26,37 and spec Q2/FR-018 say a host calls them. Remedy: additive exports in index.ts plus a surface-freeze assertion.
- CODE-BOUNDARY-002 sev3: the screen's property types (ArtifactListingView, ArtifactContentView, ArtifactEntryView, ArtifactStatus, ArtifactContentStatus, ArtifactTab, ArtifactScreenMission, ArtifactScreenWorkPackage, ArtifactLabelHooks, ArtifactVocabulary) are not exported from index.ts; #5 set the precedent (surface-freeze BOUNDARY-004). Remedy: type-only exports plus a compile-time check.
- CODE-BOUNDARY-003 sev3: sk-select-artifact and sk-open-link are missing from HTMLElementEventMap (sk-artifact-screen.ts declare global, line ~697), so the quickstart's handlers do not type-check. Remedy: add both map entries plus a compile-time probe.
- CODE-BOUNDARY-004 sev2: the exception comments in stylelint.config.mjs and eslint.config.mjs and the gates.md sunset column cite G-nn but not the filed issues (#519-#524, #496, #505); E-44 and the toolbar E-21 cite no issue at all. Remedy: write in "G-nn (spec-kitty-design#NNN)".
- CODE-BOUNDARY-005 sev1: SkArtifactRetryLoadDetail is an alias of SkArtifactRetryDetail, so the manifest text and the dispatch spell the type differently. Remedy: keep it, or drop the alias and fix the @fires line.

## R1 SECURITY (4 findings; opus; probes in probe-SECURITY/). The renderer, classifyLink and render.ts held against every runtime probe; all four gaps are in the static gates and the mailto narrowing.
- CODE-SECURITY-001 sev3: R4 (eslint-rules/markdown-renderer.mjs scanTemplate) reads quasi.value.raw, but Lit renders the cooked strings, so html`<p>\x3ca href=${x}>` passes lint and renders a live href (probes zz-probe.ts, zz-probe2.ts). The raw-control and class= selectors in eslint-rules/index.mjs have the same hole. Remedy: scan value.cooked (report when it is null) plus a self-test case.
- CODE-SECURITY-002 sev3: R4 has no element allowlist and ignores holes inside raw-text elements. html`<style>${x}</style>`, <iframe> and <svg><style> are lint-clean, and a style url() makes a network request (probe zz-probe3, zz-security-probe3). Remedy: report tag names outside the contract's element list and any hole inside a RAW_TEXT element, plus self-tests.
- CODE-SECURITY-003 sev3: R3/R5 do not cover execCommand('insertHTML'), eval, setAttribute(href/on*/srcdoc), srcdoc, new Image().src, fetch, sendBeacon, location/open, style url() writes, CSSStyleSheet replace, ping or formAction in the logic/markdown and sk-artifact-screen files (probe zz-probe.ts). Remedy: no-eval plus restricted syntax and globals for each, with one self-test case per name.
- CODE-SECURITY-004 sev2: the mailto single-@/no-query check runs on the percent-encoded form, so %40, %2C and %0D%0A carry extra recipients and header lines. Remedy: decode once (inert on failure), then check the decoded text: single @, no control characters, no commas. Add unit rows.

## R1 CONTRACT (8 findings)
- CODE-CONTRACT-001 sev2: the truncation note (AV-17, FR-021) is drawn only above an open document. Nothing-selected (AV-22), loading, refusal and error panes never show it. Remedy: draw it in every ready-listing pane, and add a nothing-selected test.
- CODE-CONTRACT-002 sev2 FORK -> ORCHESTRATOR RULED (a): the raw and fallback source block keeps `max-width: 900px` (source-parts.ts, E-25 pin), although the operator asked to "use the whole content area to render the artifacts" (tracer: raw and fallback use full width). Remedy: drop 900px from source-parts.ts and the E-25 pin (900px becomes a refused plant); DA-39 is superseded.
- CODE-CONTRACT-003 sev2: FR-031 and defaults.md promise a label-hook override for all copy, but ArtifactLabelHooks covers only kind, refusal, mediaType, size and time. Remedy: reword FR-031 and defaults.md (English-only constants, no override in this mission). Add no hooks.
- CODE-CONTRACT-004 sev2: the gates.md E-23 row and its EXCEPTIONS snippet are stale (800px, missing 30ch, max-content, eyebrow uppercase and tracking, line-height 1.2). Remedy: rewrite them to match stylelint.config.mjs and reflect the E-25 outcome.
- CODE-CONTRACT-005 sev2: a rendered markdown body with no `#` heading leaves the pane without an h1 (needsHiddenHeading is false for every rendered body). Remedy: the model exposes whether it has a level-1 heading; draw the hidden h1 when there is none; add a test.
- CODE-CONTRACT-006 sev1: FR-034 says code blocks scroll sideways, but rendered code wraps under E-23. Remedy: amend FR-034.
- CODE-CONTRACT-007 sev1: defaults.md is missing LISTING_LOADING_TEXT, and its BIDI_NOTICE wording differs from the code. Remedy: doc update.
- CODE-CONTRACT-008 sev1: the 'mailto' literal sits in logic/markdown/links.ts as well as in defaults. Remedy: a named export in defaults/markdown.ts.

## R1 TESTS (5 findings; 11 mutation probes in probe-TESTS/full, 9 killed, 1 equivalent)
- CODE-TESTS-001 sev3: the model-cache key's mediaType and vocabulary terms are untested. Removing either leaves all 1632 tests green (probes m3, m4). Cache 3 has the same untested vocabulary term. Remedy: tests that change mediaType, then vocabulary, on a live element with the content held constant, asserting the view changes and cacheBuilds increments.
- CODE-TESTS-002 sev2: font-dependent pixel literals: refusal.test.ts:223 (936 px and 186.797 px) and the table.test rowCeiling. The 1640 test says "with the inspector" but never asserts the inspector. Remedy: assert the inspector exists and has a width; derive the refusal expectations from the measured computed style.
- CODE-TESTS-003 sev1: the catalogue test's comment says the 45 is not typed in, but EXPECTED is literal. Remedy: reword the comment.
- CODE-TESTS-004 sev1, PRE-EXISTING: CI has no test:terminology step, so wp-story-catalogue.test.mjs and visual-tags.test.mjs never run in CI. Remedy: add the step, or fold both into test:scripts.
- CODE-TESTS-005 sev1: the runtime no-I/O spy cannot see a module-level fetch; the static no-io gate covers it. Remedy: none, or a comment.
No hiding markers. NFR-006 and the gate self-tests are sound.

## R1 A11Y (3 findings)
- CODE-A11Y-001 sev2: tablist onKeyDown (tab-parts.ts) handles ArrowLeft/Right/Home/End without checking alt/ctrl/meta, so Alt+Left (Back), Cmd+arrows and Ctrl+Home/End are swallowed. Remedy: return early on modifier keys; add a unit test.
- CODE-A11Y-002 sev2: the current tree row has no visible marker in forced colours. sk-shell-tree uses sk-action-row flush; the library sets border-inline-start-width:0 for flush aria-current in forced colours and the only cue is a background. NFR-011/NFR-014. Remedy: forced-colors Highlight start border on sk-action-row[selected]::part(row) in sk-shell-tree styles, plus a forced-colours test in media.test.ts.
- CODE-A11Y-003 sev1: inspector headings are h3 and come before the pane h1 in DOM order (ruled DOM order). Remedy: make the inspector group headings h2, keeping the E-44 size.
