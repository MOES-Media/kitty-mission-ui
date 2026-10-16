# WP06 review, cycle 1: changes requested

Verified: typecheck, lint, lint:styles, lint:no-io, lint:data-driven, hygiene and test:terminology are clean;
`pnpm --filter @moes-media/mission-shell test` passes 467 tests; plant.json has 10 entries with the first 9
byte-identical; the P-7 anchor and the P-6 line each occur once; the token appears only in the assertion message;
the diff stays inside the owned files plus the recorded plant.json append; `src/index.ts`, `src/testing.ts` and
`src/Shell.svelte` are untouched. The sweep, the via exactly-once spy, the banners, modes, mount and latency tests
are sound and non-vacuous. Two blocking items remain, both small.

## Blocking

**Issue 1 (blocking): a Svelte host that mirrors `routeChanged` into its `route` prop double-reads Ops and Artifacts.**

`MissionShell.svelte` forwards the `route` prop when it differs from the last *host-set* route. Routes the shell
navigates to itself never update `lastRoute`. So with the natural Svelte-host wiring
(`routeChanged: (r) => (route = r)`), every shell navigation to Ops or Artifacts is followed by a
`setRoute` to the destination the shell already shows. `show()` treats that as a re-selection (US6-2) and issues
the explicit re-read a second time.

Reproduced with a scratch test on `PropsHost.svelte`: mount on `/missions`, host `routeChanged` updates the
`route` prop, then dispatch `sk-navigate` to `#/ops`. Result: 2 `listOpsInvocations` reads. The control without
the echo gives 1. The same echo also re-applies a normalised route after a non-canonical host route.

Fix (within `src/ui/**`): in the route `$effect`, skip a route whose normalised form equals the destination the
shell already shows, for example by comparing `normaliseRoute(route, mode).route` with
`formatRoute(snapshot.destination)`, read untracked. Keep the existing `lastRoute` check. Then add a case to
`test/shell/props.test.ts` where the host mirrors `routeChanged` into `route` and a navigation to Ops issues exactly
one `listOpsInvocations` read. The WP step 5 wording ("differs from the last host-set route") caused this gap. The
implementation followed it, so this is a spec gap; the fix still belongs here.

**Issue 2 (blocking): `./shell` exports a name that is not in the contract.**

`src/shell.ts` re-exports `type MountedShell`. `contracts/shell-api.md` declares `mountShell`'s return type inline
and names no `MountedShell`. The DoD and T031 step 2 require exactly the contract surface (SC-005: #20 and #21 lock
against it). Adding the name later is additive, but removing it once published is breaking. Fix: drop the
`MountedShell` re-export from `src/shell.ts` (keep the interface in `ui/mount.ts` for internal use). In
`test/shell/entry.test.ts`, assert `ReturnType<typeof shell.mountShell>` structurally instead of against
`shell.MountedShell`.

## Non-blocking (record in the final report; no change required in this cycle)

- **N1, navigation model ownership.** `navItems`, `railItems`, `footerItem`, `current`, `railCurrent` and the trees
  are built in `src/ui/navigation.ts`, not taken from the snapshot as T027 step 8 and T028 step 7 say, because
  `buildSnapshot` has no such fields. The module is pure and has no Svelte, and the mounted tests prove it, so it is
  accepted for this WP. It does put decisions in the view: desktop-only picker entry points, rail-current, and the
  default expansion of the folder that holds the current path. FR-015 gating now lives both in the controller guard
  and in the view's hiding of the entry points. Record this as a change request: the snapshot (controller/core)
  should own the navigation model, either through a WP09 grant or a follow-up issue.
- **N2, `afterRender` not proven.** The reviewer reproduced it: with `afterRender: () => Promise.resolve()` the copy
  test stays green. Svelte's microtask flush already runs before the controller's continuation. The observable
  sequence `null, 'copied', null, 'copied'` is proven; the `tick` wiring is verified by inspection only. Say so in
  the `copy.test.ts` header comment, which currently implies the test pins the flush.
- **N3.** `ProjectsScreen.svelte` casts `entries` and `folders` (`as ProjectEntry[]`, `as FolderEntry[]`). The
  casts hide any mismatch between the snapshot and element types; a typed snapshot field would remove them.
- **N4.** The `slot=` spread in `RefreshButton.svelte` and `Trees.svelte` is an acceptable workaround for Svelte's
  slot-placement check. The refresh test asserts the attribute; no test asserts the trees' `sidebar-section` slot.
- **N5.** The unnamed `@moes-media/mission-ui` failure in the first clean gate-proof run is not explained. Name the
  test in the report so pre-merge can track it.

## Deviations judged acceptable

ShellOptions declared in `ui/options.ts` as the documented fallback, with fields matching the contract. The
`$state.raw` mirror with `untrack` around the initial prop reads. Uniform `{snapshot, controller}` screen props with
optional slices, which P-7's foreign-slice tolerance needs. The cast of `mount()`'s exports in `mountShell`. The
extra test files under `test/shell/`. The blank line removed in `test/package.test.ts`. Tree placement, folder ids,
unavailable leaves and the banner markup go to the CP-1 design review.
