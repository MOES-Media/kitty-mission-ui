# Decision Moment `01M525WSMXB8VDB63XNDMTG80A`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.stub.fixtures-default`
- **Input key:** `stub_fixtures_default`
- **Status:** `resolved`
- **Created:** `2026-10-16T10:59:59.773174+00:00`
- **Resolved:** `2026-10-16T11:00:00.991762+00:00`
- **Resolved by:** `coordinator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

FS-10: where does the stub look for fixtures when only --mission-status.project-root is given?

## Options

- <project-root>/.kitty-stub/fixtures if present, else the compiled-in contracts/fixtures; update A-07
- <project-root>/fixtures
- Other

## Final answer

<project-root>/.kitty-stub/fixtures if present, else the compiled-in contracts/fixtures; A-07 updated

## Rationale

Orchestrator decision 2026-10-16 (plan-squad fix round 2), relayed by the coordinator

## Change log

- `2026-10-16T10:59:59.773174+00:00` — opened
- `2026-10-16T11:00:00.991762+00:00` — resolved (final_answer="<project-root>/.kitty-stub/fixtures if present, else the compiled-in contracts/fixtures; A-07 updated")
