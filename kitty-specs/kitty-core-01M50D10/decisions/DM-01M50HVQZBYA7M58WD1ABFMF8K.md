# Decision Moment `01M50HVQZBYA7M58WD1ABFMF8K`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.client.hyper-layer`
- **Input key:** `hyper_client_layer`
- **Status:** `open`
- **Created:** `2026-10-15T19:50:39.339703+00:00`
- **Opened by:** `architect-alphonso`
- **Other answer:** `false`

## Question

Which hyper client layer does kitty-core use?

## Options

- A: hyper::client::conn::http1 over a tokio TcpStream with hyper_util::rt::TokioIo; one connection per request, no pool (adds want, try-lock) (recommended)
- B: hyper_util client-legacy pooled Client with HttpConnector (adds want, try-lock, tracing, tracing-core, once_cell)
- Other

## Final answer

_(none)_

## Rationale

_(none)_

## Change log

- `2026-10-15T19:50:39.339703+00:00` — opened
