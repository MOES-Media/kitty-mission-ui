# Decision Moment `01M3V83D9ZCHNRWYVMTNK4X517`

- **Mission:** `app-shell-01M3V82X`
- **Origin flow:** `specify`
- **Slot key:** `specify.library.gaps`
- **Input key:** `library_gap_strategy`
- **Status:** `resolved`
- **Created:** `2026-10-01T08:08:10.815141+00:00`
- **Resolved:** `2026-10-01T08:10:46.301108+00:00`
- **Opened by:** `cli`
- **Other answer:** `true`

## Question

Build local pattern elements for layouts sk-app-shell cannot express, or wait for design-library changes?

## Options

_(none)_

## Final answer

Projects picker is outside the shell (no shell, no side rail). Shell has two layouts: project (one sidebar, no rail: Missions, Drift, Ops) and mission (rail + mission sidebar: Pipeline, Work Packages, Artifacts). Where sk-app-shell cannot express a layout, build it locally on sk-* primitives and record the gap for the design library.

## Rationale

_(none)_

## Change log

- `2026-10-01T08:08:10.815141+00:00` — opened
- `2026-10-01T08:10:46.301108+00:00` — resolved (final_answer="Projects picker is outside the shell (no shell, no side rail). Shell has two layouts: project (one sidebar, no rail: Missions, Drift, Ops) and mission (rail + mission sidebar: Pipeline, Work Packages, Artifacts). Where sk-app-shell cannot express a layout, build it locally on sk-* primitives and record the gap for the design library.")
