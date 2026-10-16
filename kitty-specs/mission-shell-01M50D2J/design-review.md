# Design review (CP-1)

## 2026-10-16: CP-1 confirmed, with amendments

The operator reviewed these items and confirmed them, with the amendments below:
- the eleven candidate `shell-*.png` baselines from WP08 (hashes in `design-review.sha256`, taken at the WP08 approval);
- the copy in `contracts/connection-presentation.md`;
- the research R-03 departure.

WP09 applies the amendments, regenerates the affected baselines in the pinned image, and re-proves P-6. It then asks the orchestrator to update `design-review.sha256`. The reconnecting tone line is unchanged, so the P-6 anchor stays as it is.

### Amendments

1. **A1, chrome error while degraded (D1).**
   - While a degraded banner (`service-missing` or `contract-mismatch`) is shown, the shell does not set `sk-mission-shell`'s chrome `errorMessage` or show its Retry. The banner explains the cause.
   - Candidates affected: `shell-connection-banners--contract-mismatch-1280`, and `--service-missing-1280` if it shows the chrome error.
   - Home: `src/ui/**`, within the IC-08b grant.
2. **A2, degraded body when nothing was loaded (D2).**
   - The two degraded banners drop the sentence "Data that was already loaded stays visible." when no data has been loaded yet. They keep it when data is on screen.
   - Tones, announce levels, titles and the h2 heading are unchanged.
   - Home: copy and condition in `src/core/connection.ts`, within the IC-08b grant.
3. **A3, brand follows the mode (D6).** The shell fills the `sk-mission-shell` brand with "kitty desktop" in desktop mode and "kitty dashboard" in dashboard mode.
   - Candidate affected: `shell-layouts--dashboard-project-1280`.
   - Home: `src/ui/**`, within the IC-08b grant.
4. **A4, picker time labels (D7).**
   - The controller sets the snapshot's `now` from the injected clock when it is created and whenever host results are applied, not only when a port read lands. A picker with no client open then shows relative times, not raw ISO text.
   - Candidate affected: `shell-layouts--picker-projects-1280`.
   - **Orchestrator grant (operator-approved at CP-1).** WP09 may make a recorded out-of-map edit to `packages/mission-shell/src/controller/shell-controller.ts` (and `snapshot.ts` if needed), and add a test under `packages/mission-shell/test/logic/`, red-first.
5. **A5, drawer and flyout survive a client swap (D10).**
   - `setClient` keeps the session's `drawerOpen` and `flyoutOpen`, as the data model says ("shell-wide, for the life of the mounted shell").
   - No candidate is affected.
   - **Orchestrator grant:** the same files as A4, plus a red-first logic test.

### Confirmed unchanged

- **D3.** The Refresh button's placement and idle look. A busy state goes to a mission-ui follow-up.
- **D4.** The Work Packages tree on both Pipeline and Work Packages.
- **D5.** The auto-opened folder that holds the current artifact. A visible "unavailable" treatment for tree leaves goes to a mission-ui follow-up.
- **D8.** The R-03 departure. With nothing selected, Work Packages and Artifacts show their own `nothing-selected` state.
- **D9.**
  - The rail marks Missions as current in the mission layout. Its current-item styling goes to a mission-ui follow-up.
  - The back link "All Missions" is confirmed and added to the contract copy table.
- The other banner tones, announce levels and copy.

### Follow-ups (not in this mission)

- mission-ui: a busy state for `sk-button` while a refresh re-reads.
- mission-ui: a visible treatment for unavailable tree leaves.
- mission-ui: a visible current state for the rail item.

## 2026-10-16: amendments applied (WP09)

WP09 applied A1 to A5 and regenerated three baselines in the pinned image: `shell-connection-banners--contract-mismatch-1280`, `shell-layouts--dashboard-project-1280` and `shell-layouts--picker-projects-1280`. The other eight are byte-identical to the CP-1 candidates. `design-review.sha256` now lists the eleven approved hashes. P-6 is re-proved with its anchor unchanged, and P-7 is re-proved because `MissionShell.svelte` changed.

Out-of-map edits under the operator-approved grant: `src/controller/shell-controller.ts` (A4, A5) and `src/controller/snapshot.ts` (A2's "nothing loaded" flag, and the snapshot side of A4). The orchestrator accepts the `snapshot.ts` edit under the same grant.

Story-data note: the picker story's fixed clock (2026-09-22) is earlier than the fixture's activity times (2026-10-01), so every recent project reads "active just now". This comes from the story's data, not from how the shell behaves.
