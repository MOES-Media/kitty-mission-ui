---
affected_files: []
cycle_number: 2
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T15:51:56Z'
reviewer_agent: claude
wp_id: WP06
---

# WP06 review, cycle 2: changes requested (one line)

Verified: B2 is fixed. `./shell` now re-exports exactly the contract block (`MissionShell`, `mountShell`, `formatRoute`,
`parseRoute`, and the types `Destination`, `ShellMode`, `ShellHost`, `ShellScheduler`, `ShellCopyOverrides`,
`ShellOptions`). The B1 echo is fixed: the reviewer's cycle-1 reproduction now gives 1 Ops read. The N2 and N4 folds
are in. Typecheck, lint and hygiene are clean, and 468 tests pass. The fix commit touches only WP06 files. The P-7
token still appears only in the routing assertion message and in `plant.json`.

## Blocking

**Issue 1 (blocking): the B1 skip swallows a non-canonical host route, so `routeChanged` no longer announces the
canonical form.**

The new skip compares the *normalised* host route with the shown destination. A non-canonical route that normalises
to the current destination is therefore dropped silently. Examples: an unknown route such as `/nowhere` while on
Missions, `/projects` on the dashboard while on Missions, or an encoding variant of the current route.
`contracts/shell-api.md` says `routeChanged` is called "once with the canonical form when a host-set route was not
canonical". The host's route stays non-canonical.

Reproduced on `PropsHost.svelte` without echo, mounted on `/missions`: updating `route` to `/nowhere` gives
`routeChanged` calls `[]`. Before this fix it gave `['/missions']`. In the sequence `/nowhere`, `/ops`, `/nowhere`,
only the second `/nowhere` is announced.

Fix: compare the raw route instead, `route === formatRoute(untrack(() => controller.snapshot().destination))`, and
drop the now-unused `normaliseRoute` import and the `mode` read. An echoing host always echoes the canonical route,
so B1 stays fixed. A non-canonical route goes through `setRoute`, which announces the canonical form; the echo of
that canonical form is then skipped. The reviewer checked this in a scratch edit: the new props test, `mount.test.ts`
and the probes all pass. Add a props case: a non-echo host sets `/nowhere` while on Missions, and `routeChanged` is
`['/missions']`.

## Non-blocking (carry to pre-merge)

- **N6.** If a Svelte host changes `client` and `route` in the same tick, the route effect runs first. It reads the
  new destination on the *old* client, and the client effect then reads it again on the new one. The reviewer saw one
  `listOpsInvocations` on the replaced client. This predates cycle 2. Possible fix: declare the client effect first,
  or pass the pending route into `setClient`.
- **Accepted behaviour.** A host-set route equal to the shown canonical route is now a no-op from the Svelte prop
  path, so it no longer triggers a re-read. The imperative `mountShell().setRoute` is unchanged. After a client swap
  the new client reads anyway (checked: 0 reads on the old client, 1 Ops read on the new one).
- **N1, N3 and N5** from cycle 1 still stand as recorded.
