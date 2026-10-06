# Pre-merge squad R3: verification (lane-j 26f03a6)

All 14 single-remedy fixes and the 3 operator fork rulings were RESOLVED. Each behaviour fix was proven by a revert experiment on a copy: reverting it turned its test red. The R2 probe file shows each defect gone.
- A11Y-001: keyed live span; the MutationObserver test is red without it.
- TESTS-001: the detach test is red without `tierObserver.disconnect()`.
- A11Y-003: ready with a null Work Package announces nothing and draws the empty form.
- CONTRACT-001: no Assignment card when every member is absent.
- BOUNDARY-005: `enclosingShell()` crosses shadow roots; the wrapper test is red with plain `closest()`.
- A11Y-002: the cancellation heading is an h2.
- BOUNDARY-004: the types are exported, pinned by tsc.
- BOUNDARY-002: the gates.md rows are corrected.
- TESTS-002: key identity is pinned for subtasks, files and the chain.
- TESTS-003: the fixed sleeps are replaced by `expect.poll`.
- A11Y-004: the data-less h1s carry a title.
- CONTRACT-002: the dead copy is deleted and defaults.md amended.
- BOUNDARY-003 and BOUNDARY-007: one declaration each.
- BOUNDARY-001: E-22 is registered, with a selector pin test. The `layout="card"` precondition was measured at 102 px against 122 px and 120 px, so the rules stay.
- A11Y-005: contract amendment.
- CONTRACT-003: tracer note plus the history word tests.
Concern checked: `effectiveState` is a TS-private helper, absent from custom-elements.json, so the surface is not widened.
Fresh sweep: two severity-1 doc nits (the E-18 wording and the squad finding count), fixed on the planning branch.
Gates: `pnpm test` 1025 passed, typecheck, lint, lint:styles, lint:data-driven, test:data-driven (92), manifest:check, stylelint-exceptions 219/219. The fixer ran visual 175/175 with no baseline diff, and gate-proof gave 12 gates, verdict pass.
