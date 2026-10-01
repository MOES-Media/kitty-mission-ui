# WP08 review feedback (cycle 1) - REQUEST CHANGES

The gate itself is sound and every acceptance command passes. What was re-run and what it gave: DIGEST-OK; the visual.sh `--repeat-each=5` run passed 25/25 (exit=0, `node v24.18.1` asserted in the container); 4 baselines, and `--list` also shows 4; chunk check `4 files; bad chunks: []`; the no-runtime run fails with exit=1 and prints no PASS line; the plant toggle prints PLANT-CAUGHT and then clean-exit=0; a reviewer-made `--sk-space-4` -> `--sk-space-3` change failed 3 tests; there are no `/home` or `/Users` paths. The blocker is the content of one baseline.

**Issue 1 (blocking): the `mission-sample--loading.png` baseline records an unreadable state.**
The "Loading mission" text renders pure black (0,0,0) on the dark page surface (13,14,17), a contrast of about 1.1:1, so it is effectively invisible. The status indicator also renders as an empty sliver.
Cause: this is the same slot misuse that 4b1d679 fixed for sk-button. In the @spec-kitty/elements manifest, the default slot of `sk-status-indicator` is "Visible consumer-supplied status text", and the indicator colours that text with `--sk-fg-body`. `renderLoading()` leaves the indicator empty and puts the text in a bare sibling `<span>`, which inherits no colour because preview-head sets no `color`.
Remedy (a WP04 carry-over, done the same way as 4b1d679):
1. Render `<sk-status-indicator pulsing>Loading mission</sk-status-indicator>` in `sk-mission-sample.ts` and drop the bare span.
2. Extend the "visible slotted text" unit test so it also covers the loading state, checking for non-empty text inside `sk-status-indicator`. Show that it fails on the current markup.
3. Update both plant overlays (unit-tests and visual) to the new element text, and recompute both `baseSha256` values.
4. Regenerate only the loading baseline, in the pinned container, and confirm the ready, error and empty baselines are byte-identical. Re-run the `--repeat-each=5` and plant-toggle acceptance commands.

**Issue 2 (minor, fold in): the blank-screenshot guard is flimsy.**
`shot.length > 1500` is a byte-size proxy. The current loading PNG is 1515 bytes, only 15 bytes above the limit. Replace it with a real pixel-variance check, as R5 says ("non-blank pixel variance"): for example, at least N distinct colours, or foreground pixels differing from the surface colour.

The rest passes. The image is pinned by digest everywhere, and the digest was re-verified. visual.sh cannot skip. The index is filtered on `type === 'story'`. The test awaits `document.fonts.ready` and asserts Inter is loaded. Parity tests exist. Commit 4b1d679 is correct per the manifest, its test fails when the fix is reverted, and the unit-tests plant `baseSha256` (f108c19e...) matches the current element.
