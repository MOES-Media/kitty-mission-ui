# Quickstart: Work Package detail screen

For a developer or reviewer picking up a work package of this mission. Commands run from `<repo>` on the mission's lane worktree, after the build base (mission-ui#4 merged in) is present.

## Use the element (a host)

```html
<sk-mission-shell layout="mission" flush ...>
  <sk-work-package-screen id="wp" status="ready" detail-status="ready" wp-id="WP04"></sk-work-package-screen>
</sk-mission-shell>
<script type="module">
  const el = document.querySelector('#wp');
  el.mission = { missionId, slug, name, workPackageCount };   // host data
  el.workPackage = workPackageFromGetWorkPackage;              // contract 1.0 WorkPackage
  el.detail = detailFromGetWorkPackageDetail;                  // contract 1.1 WorkPackageDetail, or null
  el.detailRefusalCode = detailRefusal ? detailRefusal.code : null; // when detail-status is error or not-found
  el.now = new Date().toISOString();                           // the host owns the clock
  el.addEventListener('sk-select-work-package', (e) => route(e.detail.wpId));
  el.addEventListener('sk-open-mission', (e) => route(e.detail.slug));
  el.addEventListener('sk-open-artifact', (e) => openArtifact(e.detail.path, e.detail.kind));
  el.addEventListener('sk-retry-load', (e) => reload(e.detail.target));
</script>
```

The host performs the reads, passes `status` and `detailStatus` (`loading`, `ready`, `error`, `not-found`) and, for a refused detail, the refusal code in `detailRefusalCode`, and routes every event. The screen performs no I/O.

Host contract (operator ruling 2026-10-05): every payload takes the Work Package id from `wp-id`, then `workPackage.wpId`, then `detail.wpId`; a `detail` whose `wpId` differs from `workPackage.wpId` is treated as omitted; controls that need `missionId` are drawn inert while `mission` is null, so pass `mission` whenever `status` is `ready`. When the focused control is removed by a status or `wp-id` change (Retry going from error to loading, a dependency node when you swap `wp-id`), the screen moves focus to its own heading; after "Return to Pipeline" (`sk-open-mission`) you navigate away, and focus on the new screen is yours.

## Everyday commands

| Task | Command |
|---|---|
| Typecheck, lint, style, hygiene, no-I/O | `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm hygiene`, `pnpm lint:no-io && pnpm test:no-io` (the names every work package prompt uses; if the merged build base names a script differently, use its name) |
| Unit and interaction tests | `pnpm test` |
| Contract gate and its tests (function-level, CLI-level and `--from-repo` tests) | `pnpm contract:check && pnpm test:contract` |
| PR-readiness form of the contract gate (wrap-up) | `pnpm contract:check --require-main` |
| Data-driven gate | `pnpm lint:data-driven && pnpm test:data-driven` |
| Manifest | `pnpm manifest:check` (regenerate only in IC-03b and IC-09: `pnpm manifest:generate`) |
| Regenerate types and fixtures | `pnpm contract:generate` |
| Provisional 1.1 pin (IC-01) | `pnpm contract:update --from-repo <spec-kitty lane checkout> --sha <lane tip>` |
| Re-pin to main (IC-09) | `pnpm contract:update --sha <main sha>` (the sha must be an ancestor of upstream `main`) then `pnpm contract:verify-remote`; IC-09 then re-runs `pnpm contract:check && pnpm test:contract`, the five clean `pnpm visual` runs, the baseline check and `pnpm gate-proof` on the re-pinned tree |
| Storybook | `pnpm storybook` and `pnpm build-storybook` (a gate of every work package); the stories sit under `Screens/Work Package/` |
| Visual baselines | only inside the pinned container: `pnpm visual` through `scripts/visual.sh` (implementation WPs only); region WPs (IC-04 to IC-08) do not run `pnpm visual` as an exit check (missing snapshots are the known red; it first runs green in IC-09) and hand over uncommitted side-by-side screenshots, `pnpm visual:update` and the commit of baseline PNGs belong to IC-09 only |

## Where things live

`packages/mission-ui/src/elements/sk-work-package-screen/` (element, `panel-parts.ts` (the panel wrapper over `sk-card` and `sk-section-header`) and the region parts, `fixtures.ts` with the `pairDetail` helper), `src/defaults/` (review, files, refusals, staleness, wp-copy), `src/logic/wp-*.ts`, `src/contract/` (generated and view types, fixtures, bulk), `contracts/spec-kitty/` (vendored contract and `PIN.json`), `kitty-specs/work-package-screen-01M44DSJ/contracts/` (element contract, pin, defaults, gates).

## Rules in one list

No I/O, no write, no arithmetic on contract values. No lane, phase, verdict, change-state, staleness-status or `review_cycle` literal outside `defaults/`; `WorkPackageView` is #4's type and stays untouched (this mission's is `WorkPackageRecordView`). Every primitive is a library element; project CSS is layout with tokens; anything else is a numbered exception. A prototype difference that the operator did not confirm at CP-1 is a REJECT. No absolute path or username in any committed file.

## Manual checks before handing a WP over

1. Every story of your title renders in the shell frame at its width and tier, and your hand-over carries an uncommitted side-by-side screenshot against the prototype for each (no baseline PNG is committed by a region WP); keyboard: Tab reaches every control once, Enter and Space operate it, the focus ring is visible.
2. Replace a fixture with an unknown lane value and with a null optional member: nothing is dropped, nothing is blank.
3. `git diff` shows no edit outside your owned files except the listed out-of-map commits.
