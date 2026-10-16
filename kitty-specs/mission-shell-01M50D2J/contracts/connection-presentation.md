# Contract: connection presentation and shell copy (FR-010, FR-011, NFR-004, C-005)

The banners and the Refresh button are **not in the prototype**. Everything in this file carries the design-review
flag and is confirmed or amended by the operator at CP-1 (`plan.md`, "Design review").

## Banners

- Each banner is one `sk-notice` from `@spec-kitty/elements`, placed in the `sk-mission-shell` content slot above the
  hosted screen.
- **One home for each part** (FS-06). `src/core/connection.ts` owns the state → condition mapping (including the
  refused flag and the grace timer) and the copy below. `src/ui/ConnectionBanner.svelte` owns only the tone and
  announce table, one line per condition. The reconnecting line is
  exactly `reconnecting: { tone: 'attention', announce: 'polite' },`, which is the anchor of visual plant P-6.
- Shell CSS only lays it out: a flex column, with a gap from a `--sk-space-*` token.
- The screen below keeps its own state.

| Condition | Story id (`Shell/Connection banners`) | `tone` | `announce` | Title | Body (default copy) |
|---|---|---|---|---|---|
| `connecting` | `shell-connection-banners--connecting-1280` | `info` | `polite` | Connecting | Connecting to the Mission Status service. |
| `reconnecting` (1 s or more) | `shell-connection-banners--reconnecting-1280` | `attention` | `polite` | Reconnecting | The connection was lost. The data shown may be out of date until it is restored. |
| `degraded: service-missing` | `shell-connection-banners--service-missing-1280` | `danger` | `assertive` | Service not available | The Mission Status service could not be found or started. Data that was already loaded stays visible. |
| `degraded: contract-mismatch` | `shell-connection-banners--contract-mismatch-1280` | `danger` | `assertive` | Incompatible service | The Mission Status service speaks a different contract version than this app. Data that was already loaded stays visible. |
| subscription `refused` | `shell-connection-banners--live-updates-off-1280` | `neutral` | `polite` | Live updates are off | The service refused the change stream. Views are not updated automatically; navigate or refresh to read again. |

- **When no data has been loaded yet** (CP-1 amendment A2), the two degraded banners drop the sentence "Data that was
  already loaded stays visible.": `service-missing` reads "The Mission Status service could not be found or started."
  and `contract-mismatch` reads "The Mission Status service speaks a different contract version than this app."
  Titles, tones and announce levels are unchanged. Host overrides are shown as given.
- **While a degraded banner is shown** (CP-1 amendment A1), the shell does not show the chrome error or its Retry.
- The two degraded bodies can be overridden by the host through `ShellOptions.copy` (`contracts/shell-api.md`), for
  example to explain an unsigned or quarantined service binary on the desktop.
- **Timing (NFR-004)**:
  - A degraded banner appears in the first render after the state change.
  - Entering `reconnecting` updates the state first, then arms a 1 s timer on the injected scheduler. Every exit
    clears the timer, and a re-entry arms a fresh one (R2-08). The banner appears only if the state is still
    `reconnecting` when the timer fires, so a shorter drop shows nothing.
  - `connected` hides any banner in the same render.
  - Tests assert these with a fake scheduler.
- The words "Mission", "service" and "contract" follow the domain language. The terminology gate scans the copy.

## Refresh button

- `<sk-button variant="ghost" size="sm">Refresh</sk-button>` in the `top-bar-actions` slot.
- It is rendered only on the Artifact and Ops destinations (FR-016). Pressing it re-reads that destination's own data
  once.
- Its accessible name is "Refresh", plus the destination's name: "Refresh artifacts" or "Refresh Ops", through the
  button's `label`.
- Its layout stories are `shell-layouts--project-ops-1280` and `shell-layouts--mission-artifact-1280`. The
  compositions without it are `shell-layouts--project-missions-1280` and `shell-layouts--mission-pipeline-1280`.

## Other shell copy (defaults)

| Where | Copy |
|---|---|
| Project head eyebrow | Project |
| Mission sidebar back link (confirmed at CP-1) | All Missions |
| Brand (CP-1 amendment A3) | kitty desktop (desktop mode), kitty dashboard (dashboard mode) |
| Mission not found (Pipeline `errorMessage`) | This Mission could not be found. It may have been removed. |
| Read failed with no data (`errorMessage`, where the screen has no refusal property) | The data could not be loaded. |
| Shell chrome error (`sk-mission-shell` `errorMessage`) | The project could not be loaded. |
| Dashboard mounted with no client (`sk-mission-shell` `errorMessage`) | No project is open. |

The design review at CP-1 covers this copy too, together with the no-selection screens of research R-03 (a departure
from the spec's assumption, flagged for the operator).
