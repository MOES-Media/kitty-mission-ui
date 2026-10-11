# Quickstart: Drift screen

1. Start from `main` after the contract re-vendor (Drift schemas present, `PIN.json` provenance `main`).
2. `pnpm install`, then `pnpm contract:generate`; `pnpm storybook` for the stories.
3. Render the element: `<sk-drift-screen status="ready">` with `.report`, `.missions`, `.selectedFinding`, `.now` set as properties; listen for `sk-select-finding`, `sk-rescan-drift`, `sk-copy-command`, `sk-open-mission`, `sk-open-missions`, `sk-retry-load`.
4. Host loop: on `sk-rescan-drift` set `rescanning`, call `GET /drift` (with `missionId` when the detail has a scope), pass the new report, clear `rescanning`. On `sk-copy-command` set `copyResult` to null, write the clipboard, then set `copied` or `manual`.
5. Gates: see plan.md. Baselines only in the pinned container (`pnpm visual`).
