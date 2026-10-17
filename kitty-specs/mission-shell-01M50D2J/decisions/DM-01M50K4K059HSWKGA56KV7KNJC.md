# Decision Moment `01M50K4K059HSWKGA56KV7KNJC`

- **Mission:** `mission-shell-01M50D2J`
- **Origin flow:** `plan`
- **Slot key:** `plan.surface.entry-split`
- **Input key:** `shell_entry_split`
- **Status:** `resolved`
- **Created:** `2026-10-15T20:12:57.733810+00:00`
- **Resolved:** `2026-10-15T20:12:59.119319+00:00`
- **Resolved by:** `operator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

Squad R4-01: which package entry exports MissionShell, mountShell and ShellHost?

## Options

_(none)_

## Final answer

The . entry stays port-only; a new additive ./shell export carries MissionShell, mountShell, ShellHost and the shell types; ./testing is unchanged.

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T20:12:57.733810+00:00` — opened
- `2026-10-15T20:12:59.119319+00:00` — resolved (final_answer="The . entry stays port-only; a new additive ./shell export carries MissionShell, mountShell, ShellHost and the shell types; ./testing is unchanged.")
