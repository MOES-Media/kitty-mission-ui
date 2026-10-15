# Contract: intent map (FR-003, FR-004, FR-013 to FR-016, SC-001)

Every `(element, intent)` pair declared in `packages/mission-ui/custom-elements.json` at this mission's base, with its
effect. `sk-mission-sample` and its `sk-mission-retry` are excluded by name (FR-004).

- The type-level coverage check (`research.md` R-09) makes this table complete by construction.
- A browser test triggers each row on a real element and asserts its effect (FR-003). The sweep is **driven from
  `INTENT_TABLE`**: one case per `(tag, event)` pair, 40 cases (R5-10).
- "via X" marks a nested pattern element whose bubbling, composed event is delivered through hosting element X's
  binding. The test asserts it is handled exactly once.

| Element | Intent | Effect | Dashboard |
|---|---|---|---|
| `sk-mission-shell` | `sk-navigate` | navigate to `parseRoute(detail.href without '#')` | same |
| `sk-mission-shell` | `sk-tree-toggle` | session: set folder `detail.id` expanded to `detail.expanded` | same |
| `sk-mission-shell` | `sk-toggle-drawer` | session: `drawerOpen = detail.open` | same |
| `sk-mission-shell` | `sk-toggle-flyout` | session: `flyoutOpen = detail.open` | same |
| `sk-mission-shell` | `sk-shell-retry` | re-read the chrome keys that are in `error` | same |
| `sk-shell-nav-item` | `sk-navigate` | via `sk-mission-shell` | same |
| `sk-shell-tree` | `sk-navigate`, `sk-tree-toggle` | via `sk-mission-shell` (the trees are slotted into it) | same |
| `sk-missions-screen` | `sk-open-mission` | navigate to Pipeline `detail.missionId` | same |
| `sk-missions-screen` | `sk-search` | session: `query = detail.query` (the screen filters its rows itself) | same |
| `sk-missions-screen` | `sk-load-more` | read the next `missions` page with `pageCursor = detail.cursor`; append; `loadingMore` while it runs | same |
| `sk-missions-screen` | `sk-filter-change` | session: `filter = detail.filter` | same |
| `sk-filter-toggle-group` | `sk-filter-change` | via `sk-missions-screen` | same |
| `sk-pipeline-screen` | `sk-open-missions` | navigate to Missions | same |
| `sk-pipeline-screen` | `sk-view-artifacts` | navigate to Artifacts `detail.missionId`, none selected | same |
| `sk-pipeline-screen` | `sk-select-work-package` | navigate to Work Package `detail.missionId` / `detail.wpId` | same |
| `sk-work-package-board` | `sk-select-work-package` | via `sk-pipeline-screen` | same |
| `sk-work-package-screen` | `sk-select-work-package` | navigate to Work Package | same |
| `sk-work-package-screen` | `sk-open-mission` | navigate to Pipeline | same |
| `sk-work-package-screen` | `sk-open-artifact` | navigate to Artifact `detail.missionId`, `detail.path` | same |
| `sk-work-package-screen` | `sk-retry-load` | `target: 'work-package'` re-reads `wp:`; `'detail'` re-reads `wp-detail:` (the named target only) | same |
| `sk-artifact-screen` | `sk-select-artifact` | navigate to Artifact `detail.missionId`, `detail.path` | same |
| `sk-artifact-screen` | `sk-open-link` | if the scheme of `detail.href` is exactly `http`, `https` or `mailto` (case-insensitive), call `host.openExternalLink(detail.href)`; else nothing | same |
| `sk-artifact-screen` | `sk-select-work-package` | navigate to Work Package | same |
| `sk-artifact-screen` | `sk-open-mission` | navigate to Pipeline | same |
| `sk-artifact-screen` | `sk-retry-load` | `'content'` re-reads `artifact:M:path`; `'listing'` re-reads `artifacts:M` | same |
| `sk-drift-screen` | `sk-select-finding` | session: `selectedFinding = detail` | same |
| `sk-drift-screen` | `sk-rescan-drift` | re-read `drift:{detail.missionId or *}`; `rescanning` true until it settles; the old report stays | same |
| `sk-drift-screen` | `sk-copy-command` | `copyResult = await host.copyText(detail.text)`, or `'manual'` | same |
| `sk-drift-screen` | `sk-open-mission` | navigate to Pipeline | same |
| `sk-drift-screen` | `sk-open-missions` | navigate to Missions | same |
| `sk-drift-screen` | `sk-retry-load` | `target: 'drift-report'` re-reads `drift:{missionId or *}` | same |
| `sk-ops-screen` | `sk-load-more` | read the next `ops` page with `pageCursor = detail.cursor`; append; `loadingMore` | same |
| `sk-ops-screen` | `sk-retry-load` | `target: 'ops-page'`: with a cursor, re-read that page; without one, re-read the first page | same |
| `sk-projects-screen` | `sk-open-project` | `host.openProject({ key: detail.key })` | **ignored** (never mounted; guarded) |
| `sk-projects-screen` | `sk-request-open-project` | open the dialog; `host.listFolders('')` for the start location | **ignored** (no host call, no state change) |
| `sk-projects-screen` | `sk-retry-load` | `'projects'` re-calls `host.listRecentProjects()`; `'project'` re-calls it as well (the host owns per-entry reads) | **ignored** (never mounted; guarded) |
| `sk-open-project-dialog` | `sk-browse-folder` | `host.listFolders(detail.location)`; pass the folders to the dialog | **ignored** |
| `sk-open-project-dialog` | `sk-confirm-open-project` | `host.openProject({ location: detail.location })` | **ignored** |
| `sk-open-project-dialog` | `sk-retry-load` | `'folders'` re-calls `host.listFolders(current location)` | **ignored** (never mounted; guarded) |
| `sk-phase-bar` | none | none | none |

Totals: 9 hosting elements and 5 nested pattern elements (`sk-phase-bar` declares no event). There are **23 distinct
intent names** and **40 `(element, intent)` pairs**, verified against `custom-elements.json` (R1-07).

## Rules

- **The dashboard guard** (FR-015, R2-11). The spec's three desktop-only intents, and the other three intents of the
  Projects screen and the open-project dialog (`sk-open-project` and the two `sk-retry-load` intents), are ignored in
  `mode: 'dashboard'`: no host call, no state change, nothing thrown.
  - This is tested through `controller.intent` in Node, because those elements are never mounted on the dashboard.
  - The positive control is the same recording host in `mode: 'desktop'`, with exactly one call per intent.
  - A mounted dashboard test asserts that no picker entry point exists: no "All projects" footer item, no Projects
    rail item, no `sk-projects-screen` and no `sk-open-project-dialog` (R1-03).
- **The link scheme** is read with `/^([a-z][a-z0-9+.-]*):/i`, at position 0 with no trimming, lower-cased, and
  compared for equality with `http`, `https` and `mailto`. `HTTPS:` passes (FR-013). The positive control (one
  `https:` link gives exactly one host call) sits in the same test as every negative case (R3-05):
  - `httpx:` and `javascript:`;
  - mixed-case `JaVaScRiPt:`;
  - `data:`, `file:` and `vbscript:`;
  - a leading space and a leading tab before `https:`;
  - the protocol-relative `//evil.example`;
  - a relative path;
  - the empty string.

  The host's own obligations are in `contracts/shell-api.md` (`openExternalLink`).
- **A handler never throws.** A host member's throw or rejection resolves to its fallback (NFR-007). Shell
  programming errors are not swallowed: the harnesses fail on them.
- **Copy** follows the protocol of research R-18: `copyResult = null` reaches the element before the host is awaited.
- **The coverage type** (research R-09). The check type `Exclude<Declared, Mapped>` is assigned `true`, so a missing
  pair fails with the literal `'<tag> <event>'` in the svelte-check error. P-2's token is
  `sk-drift-screen sk-copy-command`. The reverse check rejects an extra pair. Entries are one per line, and handlers
  are typed by `MissionUiIntents[T][E]`.
