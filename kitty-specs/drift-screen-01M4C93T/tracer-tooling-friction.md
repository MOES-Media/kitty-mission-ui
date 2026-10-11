# Tooling friction: Drift screen

- 2026-10-07: `spec-kitty agent mission create` from the checkout CLI (4.0.0rc5) did not crash here (the ledger records a crash with other CLIs); it scaffolded and committed the empty mission. No friction.
- 2026-10-08: `spec-kitty agent mission setup-plan` was not used: plan artifacts were written directly because the template scaffolding adds nothing this mission needs. Recorded so a reviewer does not assume it ran.
