# Decision Moment `01M50D3SCB6ZG0PDWCEBGVAG7T`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `specify`
- **Slot key:** `specify.client.transport`
- **Input key:** `client_transport`
- **Status:** `resolved`
- **Created:** `2026-10-15T18:27:40.043459+00:00`
- **Resolved:** `2026-10-15T19:25:13.176915+00:00`
- **Resolved by:** `operator`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

How should kitty-core speak HTTP and SSE to the service, given that reads are relayed verbatim (status plus raw body) and reconnect belongs to the adapters?

## Options

- Route table from the generated routes.json over the already-pinned hyper/hyper-util client, with kitty-core's own SSE frame reader (no typed models, fewest new crates)
- reqwest plus eventsource-stream for SSE, driven by the same routes.json table (more ergonomic, larger new dependency tree)
- A client generated from openapi.yaml (for example progenitor) with typed models, capturing raw bytes before deserialising
- Other

## Final answer

Route table from the generated routes.json over the already-pinned hyper/hyper-util client, with kitty-core's own SSE frame reader (no typed models, fewest new crates)

## Rationale

Operator ruling 2026-10-15, relayed by the coordinator

## Change log

- `2026-10-15T18:27:40.043459+00:00` — opened
- `2026-10-15T19:25:13.176915+00:00` — resolved (final_answer="Route table from the generated routes.json over the already-pinned hyper/hyper-util client, with kitty-core's own SSE frame reader (no typed models, fewest new crates)")
