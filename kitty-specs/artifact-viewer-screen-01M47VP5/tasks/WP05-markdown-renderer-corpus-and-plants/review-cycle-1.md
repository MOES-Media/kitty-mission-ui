---
affected_files: []
cycle_number: 1
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-07T11:57:53Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review cycle 1: changes requested

Full review: scratchpad `ui7-wp05-review.md`. Fix every item below. Each behaviour fix is red-first, with self-test cases and a revert experiment.

1. **F1 (MEDIUM), R3 bypasses.** R3 misses `el['innerHTML']`, `` el[`innerHTML`] ``, `{ 'outerHTML': x }` and `` createElement(`template`) ``. The contract says "in any form". Add selectors for string-literal and template-literal keys and arguments, with self-test cases for each form.
2. **F2 (MEDIUM), R4/R5 scope.** R4 and R5 cover only .ts-type files under `logic/markdown/`. A `.js` file there passes unflagged. Widen the glob to every source extension in that folder, and add a self-test case.
3. **F3 (MEDIUM), R-07 provenance.** Fetch the sources R-07 names:
   - the OWASP XSS Filter Evasion cheat sheet;
   - the CommonMark spec's numbered examples;
   - markdown-it's own test fixtures for the pinned 15.0.2.
   Add the relevant payloads to the corpus with a citation per entry (source, plus section or example number). Relabel the entries written from knowledge as "authored". Update the corpus count and the R-07 record in the D-05 patch. Also add the reviewer's probes 02, 06, 08 and 11 from `scratchpad/ui7-wp05-probe/` as authored entries.
4. **F4 (LOW), ci.yml timeout.** Apply #4's rule as the prompt requires. Write the derived value, `ceil((2L+120)/60)` with the measured L, minimum 6, into ci.yml. Record C, L and the result in the patch.
5. **F5 (LOW).** Add R2's `.call` and destructuring bypass to the documented known limits; the `parse.ts` export-shape design covers it.
6. **F6 (LOW).** Name `test/support/markdown-corpus-entries.ts` in your hand-off as an out-of-map file, with its reason. It is accepted.
7. **I1.** Record the `LinkHandlers` shape in the patch for WP08 to adopt verbatim.

Gates: the full set plus gate-proof once.
