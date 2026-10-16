# Decision Moment `01M525WQ8AFYF4PZAF4ACKSBXJ`

- **Mission:** `kitty-core-01M50D10`
- **Origin flow:** `plan`
- **Slot key:** `plan.supervision.socket-ownership`
- **Input key:** `socket_ownership`
- **Status:** `resolved`
- **Created:** `2026-10-16T10:59:57.322674+00:00`
- **Resolved:** `2026-10-16T10:59:58.535545+00:00`
- **Resolved by:** `coordinator`
- **Opened by:** `claude`
- **Other answer:** `false`

## Question

FS-06: how is a squatter on the chosen port kept from passing readiness?

## Options

- Deterministic squatter test (holds its answer until the fake exits or 200 ms); on Linux check the listening socket inode against the child process group fds before Ready (std only, mismatch = start failure); elsewhere document the limit and add a #22 note
- Rely on the biased select only
- Other

## Final answer

Deterministic squatter test: the squatter holds its answer until the fake exits or for 200 ms. On Linux, before Ready, check the listening socket inode (/proc/net/tcp) against the fds of the child process group (/proc/<pid>/fd), std only; a mismatch is a start failure. Other platforms: document the cross-project limit; #22 note: the service identifies its project root and pid

## Rationale

Orchestrator decision 2026-10-16 (plan-squad fix round 2), relayed by the coordinator

## Change log

- `2026-10-16T10:59:57.322674+00:00` — opened
- `2026-10-16T10:59:58.535545+00:00` — resolved (final_answer="Deterministic squatter test: the squatter holds its answer until the fake exits or for 200 ms. On Linux, before Ready, check the listening socket inode (/proc/net/tcp) against the fds of the child process group (/proc/<pid>/fd), std only; a mismatch is a start failure. Other platforms: document the cross-project limit; #22 note: the service identifies its project root and pid")
