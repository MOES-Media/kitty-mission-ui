# ui#7 pre-merge squad: confirmed findings and the acceptance bar for the fix round (2026-10-10)

The source is R2 (`review-refute/v1`, recorded in the orchestrator transcript). The probes are in `probe-R2/`, `probe-SECURITY/` and `probe-TESTS/full`.
This file outranks any paraphrase of it. Implement exactly this, no more.

## Fix (single remedy unless noted)
1. **BOUNDARY-001/002/003 (sev 3/2/2), one commit.**
   - `src/index.ts` gains:
     - `export { buildArtifactTree, pathOfArtifactNode }` and `export type { ArtifactTreeOptions, ArtifactTreeResult }` from `./logic/artifact-tree.js`;
     - type-only exports of ArtifactListingView, ArtifactContentView, ArtifactEntryView, ArtifactStatus, ArtifactContentStatus, ArtifactTab, ArtifactScreenMission, ArtifactScreenWorkPackage, ArtifactLabelHooks and ArtifactVocabulary.
   - `sk-artifact-screen.ts` `declare global` gains HTMLElementEventMap entries `'sk-select-artifact': CustomEvent<SkSelectArtifactDetail>` and `'sk-open-link': CustomEvent<SkOpenLinkDetail>`.
   - `surface-freeze.test.ts` gets:
     - an entry-import case for the two helpers;
     - a compile-time block mirroring #5's BOUNDARY-004;
     - a compile-time `addEventListener` probe that reads `e.detail.path` and `e.detail.href`.
   - Regenerate the manifest only if it changes.
2. **BOUNDARY-004 (sev 1).** Write `G-nn (spec-kitty-design#NNN)` into the exception comments of `stylelint.config.mjs` and `eslint.config.mjs`, and into the gates.md sunset cells:
   - G-14 → #519, G-15 → #520, G-16 → #521, G-18 → #522, G-20 → #523, G-21 → #524, G-17 → #496, G-19 → #505 (and #519).
   - E-44 and the toolbar E-21 stay as written.
3. **SECURITY-001 (sev 3).**
   - R4 `scanTemplate` (`eslint-rules/markdown-renderer.mjs`) scans `quasi.value.cooked`, and reports the template when cooked is null.
   - Do the same for the raw-based selectors in `eslint-rules/index.mjs`.
   - Self-test: a `\x3ca href=${x}` case.
4. **SECURITY-002 (sev 2).** R4 reports:
   - any hole inside a RAW_TEXT element;
   - any tag name outside the `markdown-renderer.md` element list under `logic/markdown/**`;
   - any tag outside a reviewed list for the element files.

   Add self-tests for `<style>${x}</style>`, `<iframe title=${x}>` and `<svg><style>`.
5. **SECURITY-003, operator fork ruling (a).**
   - Add `document.execCommand` and `setAttribute`/`setAttributeNS`/`toggleAttribute` with a name matching `/^on/i` to R3 (elementSyntaxRestrictions), with self-tests.
   - Do NOT extend the no-io gate. The orchestrator states the four request-only sinks (ping, formAction, style url() writes, CSSStyleSheet replace/replaceSync) in the PR body as a known gap of #4's no-io gate.
6. **SECURITY-004 (sev 2).** In `classifyLink`'s mailto branch:
   - decode the address once with `decodeURIComponent`; a decode failure is inert;
   - on the decoded text, require exactly one `@` (not leading or trailing), no control characters and no comma.

   Add unit rows in `markdown-links.test.ts`. Each must be inert (not external):
   - `mailto:a%40x.example.invalid,b@y.example.invalid`
   - `mailto:a@b.example.invalid%0D%0ABcc:c%40d.example`
   - `mailto:a@b.example.invalid%2Cc%40d.example`
   - `mailto:a@b.example.invalid,c%40d.example`

   Keep the existing valid rows valid.
7. **CONTRACT-001 (sev 2).** Draw `TRUNCATED_NOTE` at the top of the pane whenever the listing is shown and truncated: nothing-selected, content loading, refused and error, as well as an open document.
   - Add red-first cases to `sk-artifact-screen.truncation.test.ts`, including nothing-selected.
   - Baselines: if no truncated story exists in those states, none changes. Otherwise regenerate by literal path and read the result.
8. **CONTRACT-002, ruled (a).**
   - Drop `max-width: 900px` from `source-parts.ts` and from E-25 (`stylelint.config.mjs`, including its `pxProperties`).
   - Make 900px a refused plant in `scripts/stylelint-exceptions.test.mjs`.
   - Flip `sk-artifact-screen.source.test.ts:90-95` to expect no measure.
   - Fix the source-parts header comment.
   - In the kitty-specs patch: mark DA-39 superseded and rewrite the gates.md E-25 row.
   - Raw and fallback baselines at 1280 and below should not change, because the pane is narrower than 900 px. Verify that.
9. **CONTRACT-003/004/006/007 (sev 1), docs only, via the kitty-specs patch.**
   - Reword FR-031 and `defaults.md:18`: copy is English constants from `defaults/`, the hooks are the four of the types row, and no new hooks are added.
   - Rewrite the gates.md E-23 row and its EXCEPTIONS snippet to match `stylelint.config.mjs` E-23. 800px and 12ch are refused plants.
   - Amend FR-034: rendered code blocks wrap (E-23); only the raw and fallback source scroll sideways.
   - `defaults.md`: add `LISTING_LOADING_TEXT`, and quote BIDI_NOTICE as coded.
10. **CONTRACT-008 (sev 1).**
    - Export `OPAQUE_LINK_SCHEME = 'mailto'` from `defaults/markdown.ts`.
    - Build `EXTERNAL_LINK_SCHEMES` from it, and import it in `links.ts`.
11. **TESTS-001 (sev 3).** On a live element with the content text held constant, change mediaType (markdown to json), then vocabulary, then the input to cache 3's vocabulary.
    - Assert that the view changes, and that `cacheBuilds.model` and `cacheBuilds.resolved` increment.
    - Kill mutants m3, m4 and the cache-3 vocabulary mutant (sk-artifact-screen.ts:415 and :431), and report the revert.
12. **TESTS-002 (sev 2).**
    - `refusal.test.ts:223`: derive the expectations from the measured computed font size and line height, not the 936 and 186.797 literals. That test reproduced 30.6 px off in another copy.
    - `table.test.ts`: derive the rowCeiling from the computed line height, and assert in the 1640 case that the inspector is present with a nonzero width.
13. **TESTS-003 (sev 1).** Reword the catalogue-test comment: the counts are a literal pin, cross-checked against the pairing table and the catalogue.
14. **TESTS-004 (pre-existing, folded).** Append `&& pnpm test:terminology` to the hygiene step in `ci.yml` (around line 300). It is already green. This is a named out-of-map edit.
15. **A11Y-001 (sev 2).**
    - `tab-parts.ts` `onKeyDown` returns early when altKey, ctrlKey, metaKey or shiftKey is set.
    - Add a test that Alt+ArrowLeft is not prevented and does not change the tab.

## Not fixed (ruled or refuted)
- BOUNDARY-005, CONTRACT-005, A11Y-003, TESTS-005: refuted, or ruled by PLAN-A11Y-005 (b) and #5's precedent.
- CONTRACT-005 still goes into the PR body ("a document with no leading `#` is accepted as authored").
- A11Y-002: operator ruling (b). Leave it, and flag it on spec-kitty-design#493 (done by the orchestrator).
