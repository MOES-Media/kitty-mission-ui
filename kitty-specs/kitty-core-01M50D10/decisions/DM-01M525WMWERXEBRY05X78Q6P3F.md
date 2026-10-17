# Decision Moment `01M525WMWERXEBRY05X78Q6P3F`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.supervision.starting-503`
- **Input key:** `starting_503`
- **Status:** `resolved`
- **Created:** `2026-10-16T10:59:54.894933+00:00`
- **Resolved:** `2026-10-16T10:59:56.097643+00:00`
- **Resolved by:** `coordinator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

FS-05: what does a 503 from /api/v1/openapi.yaml mean while the service is starting?

## Options

- Not yet ready: keep polling within the start budget; a budget spent on 503s is a start failure (Crashed); spec amendment A-10
- Final answer: contract-mismatch
- Other

## Final answer

Not yet ready: keep polling within the start budget; a start budget spent on 503s counts as a start failure (Crashed); spec amendment A-10 and a data-model row

## Rationale

Orchestrator decision 2026-10-16 (plan-squad fix round 2), relayed by the coordinator

## Change log

- `2026-10-16T10:59:54.894933+00:00` — opened
- `2026-10-16T10:59:56.097643+00:00` — resolved (final_answer="Not yet ready: keep polling within the start budget; a start budget spent on 503s counts as a start failure (Crashed); spec amendment A-10 and a data-model row")
