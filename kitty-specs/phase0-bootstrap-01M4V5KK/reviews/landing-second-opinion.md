# Landing second-opinion squad (PR #32, 2026-10-15)

This review ran during the landing pass, after the pre-merge squad (`premerge-*`). That squad's record was input to this one, not a substitute for it.

- **Scope:** the integrated diff `origin/main...d27832e`. Every lens was read-only.
- **Lenses:**
  - correctness and fail-closed (debugger-debbie, opus);
  - boundary, overlap and single source of truth (paula-patterns, opus);
  - design of the new seams (architect-alphonso, opus).
- **Folds:** each fold is its own `<type>(landing):` commit with a focused test that fails before the fix. They were made on two fold branches (`land/rust` by implementer-ivan and `land/ts` by frontend-freddy, both sonnet) and merged into the landing branch.

## Operator decisions

The port now has a `connecting` state (SO-DES-003) and an in-band `resync` change (SO-DES-002), and the stub resumes deterministically (SO-DES-008). These are recorded as a spec amendment.

## Dispositions

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| SO-CORR-001 | MINOR | cargo-pins fails open on commented or spaced `[workspace]` headers, quoted or spaced dotted keys, and `[patch]`/`[replace]` tables | Folded (12 test cases) |
| SO-CORR-002 | MINOR | a legacy `rust-toolchain` file overrides the checked `.toml` | Folded (test and hygiene plant) |
| SO-CORR-003 | MINOR | conflicting route templates panic after `listening` | Folded: conflicts are refused at load and the router is built before `listening` |
| SO-CORR-004 | MINOR | a SIGTERM right after `listening` kills the stub by signal | Folded: handlers are installed first; 400-run race test |
| SO-CORR-005 | MINOR | a synchronous scheduler reverses the fixture's delivery order | Folded: deliver, then schedule |
| SO-CORR-006 | NOTE | a throwing state listener starves the listeners after it | Folded: errors are isolated and rethrown as an `AggregateError` |
| SO-CORR-007 | NOTE | accept errors loop silently | Folded: errors are logged at a limited rate, and the stub stops on unrecoverable kinds |
| SO-BND-001 | MAJOR | the stub and the fixture adapter share no conformance vectors | Not folded: it needs its own design pass. Recorded as future-mission architecture in the PR body; #19 and #21 carry the note |
| SO-BND-002 | MAJOR | the C7 provisional-identifier scan skips `.svelte` | Folded (test and contract plant) |
| SO-BND-003 | MINOR | source extensions and roots are hand-listed in each scanner | Future-mission architecture (PR body) |
| SO-BND-004 | MINOR | gate ids live in six places, and the gate-proof schema lives in a past mission's folder | Future-mission architecture (PR body) |
| SO-BND-005 | MINOR | no import boundary between production code and test support inside mission-shell | Folded (ESLint block, self-test and eslint plant) |
| SO-BND-006 | MINOR | read-op and event-kind lists are hand copies | Folded: `READ_OPS` and the event kinds are derived |
| SO-BND-007 / SO-DES-006 | MINOR | `SubscriptionScope` is not tied to the contract | Folded: type pin on the `streamEvents` query keys |
| SO-BND-008 | MINOR | regenerating the typings is a separate step | Folded: `manifest:generate` chains `typings.mjs` |
| SO-BND-009 | MINOR | the Svelte language setup is written three times; the ESLint self-tests run under `Gate: no-io` | Folded: shared `eslint-rules/svelte.mjs`, byte-identical lint results. Moving the self-test is future work (PR body) |
| SO-BND-010 | NOTE | drifted wording in the CHANGELOG and README | Folded |
| SO-BND-011 | NOTE | the fixture JSON has no LF or generated attributes | Folded (`.gitattributes` and a test) |
| SO-BND-012 / 013 | NOTE | duplicated Rust setup steps; `src/contract/` exempt from two gates | Future-mission architecture (PR body) |
| SO-DES-001 | MAJOR | refresh and resume have no single owner across #18, #19 and #20 | Folded into `data-model.md` and `client-port.md`; notes on #19 and #20 |
| SO-DES-002 | MAJOR | subscription lifecycle under reconnect is unspecified | Folded: `resync` kind (operator) and a "Subscription lifecycle" section |
| SO-DES-003 | MAJOR | no initial connection state | Folded: `connecting` (operator); FR-008 amended |
| SO-DES-004 | MINOR | read error contract undefined | Folded: reads never reject; the fixture conforms (red-first test) |
| SO-DES-005 | MINOR | every consumer hand-formats the cursor text | Folded: `toStreamCursorString` |
| SO-DES-007 | MAJOR | #21's EventSource cannot implement the port | Note on #21; PR body |
| SO-DES-008 | MAJOR | log-truncated recovery loops forever against the stub | Folded: deterministic resume (operator) |
| SO-DES-009 / 010 / 012 / 013 / 014 / 015 / 016 | MINOR or NOTE | stub selection, the openapi route, the verbatim relay, one client per project, Tauri in `Gate: rust`, exact pins, package versioning | Notes on #19, #20 and #21, and in the PR body |
| SO-DES-011 | MINOR | no shared adapter conformance suite | With SO-BND-001: future-mission architecture |
| SO-DES-017 | MAJOR | gate-proof cost grows with suite size × plants | Its own gate-architecture mission (PR body); not foldable |

## Result

- **Plants:** the folds added 3 plants (hygiene, contract and eslint), so the mission adds 24 new plants in total.
- **Proof-leg timeouts:** `contract` rises to 19 minutes and `hygiene` to 10, by the formula on the CI-measured gate times.
- **Gates:** the fold branches ran the hygiene, rust, contract, eslint and unit-tests proof legs locally, and all of them passed. CI on the landing head is the final word.
