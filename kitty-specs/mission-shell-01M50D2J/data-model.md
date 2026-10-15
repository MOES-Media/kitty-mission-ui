# Data Model: mission-shell (#18)

There is no persistent storage. Everything here lives in memory for the life of one mounted shell, and is dropped on
unmount or when the client changes.
- Contract shapes come from the port and the pinned contract, and are never redefined.
- The screens' view types are supertypes of the contract types, so a contract value is passed to a screen unchanged
  (FR-005).
- The port is frozen (C-003). Its contract is `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md` on this
  branch: five states, the `resync` and `refused` kinds, and reads that never reject.

## Destination

A discriminated union by `screen`:

| `screen` | Layout | Identifiers | Route (research R-02) |
|---|---|---|---|
| `missions` | project | none | `/missions` |
| `drift` | project | `missionId?` (scope) | `/drift`, `/drift/{missionId}` |
| `ops` | project | none | `/ops` |
| `pipeline` | mission | `missionId` | `/missions/{missionId}` |
| `work-packages` | mission | `missionId`, `wpId?` | `/missions/{missionId}/work-packages[/{wpId}]` |
| `artifacts` | mission | `missionId`, `path?` | `/missions/{missionId}/artifacts[/{encodeURIComponent(path)}]` |
| `projects` | picker | none | `/projects` (desktop only) |

**Invariants**:
- `parseRoute(formatRoute(d))` deep-equals `d` for every destination. A non-canonical encoding parses to the same
  destination.
- An unknown route parses to Missions. A route is unknown when:
  - a segment fails to decode;
  - an id does not match its contract pattern;
  - a decoded artifact path fails the contract's `ArtifactPath` pattern or length.
- `/projects` parses to Missions on the dashboard.
- With `client = null`:
  - on the desktop, the only destination is `projects`;
  - on the dashboard, the project layout shows the shell `error` "No project is open.", with no reads (research R-10).

## ResourceKey and the displayed set

| Key | Port read | Feeds |
|---|---|---|
| `project` | `getProject({})` | project head (chrome); `project` of Missions and Ops |
| `missions` | `listMissions` pages 1..n (a page chain) | Missions `missions`, `pageInfo`, `loadingMore`. **This is "the Missions list" of the refresh policy** |
| `mission-names` | `listMissions({})`, page 1 only | Drift `missions` (never "the Missions list") |
| `mission:{M}` | `getMission` | mission head (chrome); Pipeline, WP screen and Artifact `mission`; Artifact `workPackages`; WP tree |
| `wp:{M}/{W}` | `getWorkPackage` (no `includePrompt`) | WP `workPackage` |
| `wp-detail:{M}/{W}` | `getWorkPackageDetail` | WP `detail`, `detailStatus`, `detailRefusalCode` |
| `artifacts:{M}` | `listArtifacts` | Artifact `listing`; artifacts tree |
| `artifact:{M}:{P}` | `getArtifactContent` | Artifact `content`, `contentStatus` |
| `drift:{M or *}` | `getDriftReport` | Drift `report`, `rescanning` |
| `ops` | `listOpsInvocations` pages 1..n (a page chain) | Ops `items`, `pageInfo`, `loadingMore`, `loadMoreError` |

| Destination | Stream-refreshed | Explicit-refreshed (the destination's own data, FR-016) |
|---|---|---|
| Missions | `project`, `missions` | none |
| Drift (scope S) | `project` | `drift:{S}`, `mission-names` |
| Ops | `project` | `ops` |
| Pipeline M | `mission:{M}` | none |
| Work Packages M, W | `mission:{M}`, `wp:{M}/{W}`, `wp-detail:{M}/{W}` | none |
| Work Packages M, none | `mission:{M}` | none |
| Artifacts M, P | `mission:{M}` | `artifacts:{M}`, `artifact:{M}:{P}` |
| Artifacts M, none | `mission:{M}` | `artifacts:{M}` |
| Projects | none (host data) | none |

- A key is "of Mission M" exactly when its read parameters carry `missionId = M`.
- **Navigation**:
  - The shell drops the slots of keys that are no longer displayed.
  - It creates fresh slots, without values, for new keys, and issues their reads as bypass reads.
  - Keys displayed before and after keep their slots and values.
  - Re-selecting the current destination re-reads its explicit-refreshed keys.

## Refresh policy

| Change | Re-read, among displayed keys | Never |
|---|---|---|
| `status-transition` (M, W) | `mission:{M}`; `wp:{M}/{W}`, `wp-detail:{M}/{W}`; `missions` | `artifacts:*`, `artifact:*`, `drift:*`, `mission-names`, `ops`, `project` |
| `mission-lifecycle` (M) | `missions`; `mission:{M}` | as above |
| `log-truncated` (M) | every key of M; `missions` | keys of other Missions |
| `resync` (adapter), or a shell-side resync (a non-first `connected` while the subscription is refused) | every displayed key | nothing |
| `refused` | nothing (the notice; FR-010) | everything |

Stream changes (the first three rows) coalesce. `resync` and every other trigger are bypass reads (below).

## Read scheduling

**One controller-wide, monotonic generation counter.** Every issued read takes the next number.

### ResourceSlot (one per displayed key)

| Field | Meaning |
|---|---|
| `latest` | the generation of the latest issued read (a page chain uses one generation) |
| `inFlight` | whether a read or chain of `latest` is unsettled |
| `trailing` | whether a coalesced stream request is pending |
| `windowTimer` | a handle on the injected scheduler, or none |
| `value` | the last applied success value, or none |
| `view` | the view state, or the screen's own status word |
| `refusal` | the last applied refusal, or `null` |

### Transitions

| Event | Effect |
|---|---|
| stream request, idle slot, no window | issue (new generation), set `inFlight`, arm a 100 ms window |
| stream request, window open or `inFlight` | set `trailing` |
| window timer fires | if `trailing` and not `inFlight`: issue, clear `trailing`, arm a new window. Otherwise the window simply closes |
| read or chain settles | apply only if its generation equals `latest`. Then, if `trailing` and the window is closed: issue, clear `trailing`, arm a new window |
| bypass trigger (navigation, `resync`, Refresh, refocus, retry, Rescan) | issue at once with a new generation, clear `trailing`, re-arm the window |
| slot removed | the timer is cleared and the slot discarded; later results find no slot |

### Connection gate

- While `connecting`, nothing is issued.
- The first transition out of `connecting`, to any state, issues the current displayed set as bypass reads.
- The first `connected` ever triggers no read of its own when it is not that transition.

### Page chain (`missions`, `ops`)

- Page 1, then each next page with the cursor of the page just read, up to the n pages loaded, or until a page has no
  next cursor.
- The chain uses one generation and is applied once, when complete.
- On page k > 1, a failure applies the pages read so far.
- Load-more:
  - it appends one page with `loadingMore` set;
  - a stream request during it becomes `trailing` and re-reads n + 1 pages;
  - a bypass during it supersedes it;
  - a load-more during a chain is queued, and issued with the new last cursor.

## Applying a result

| Result | Slot with a value | Slot without a value |
|---|---|---|
| `{ ok: true, value }` | replaced; `ready` or `empty` | set; `ready` or `empty` |
| `{ ok: false, refusal }` | `error` (or `not-found` for 404 where the screen defines it), with the refusal | the same |
| `{ ok: false, unavailable }` | value and view kept (spec FR-005 amendment) | `error` |

- **Stale-while-revalidate**: a slot with a value keeps its view while a re-read runs. `loading` appears only without a
  value.
- **Entering a degraded state** sets every slot without a value to `error` at once. Gated reads are kept and issued
  (research R-06).
- "Empty" follows each screen's definition: Missions has no items on page 1, Ops has no items, and Drift has no
  findings. The others have no `empty`.
- A refused load-more cursor (400, `PageCursorRefusal.invalid`) drops the loaded pages and re-reads page 1.
- An Ops load-more failure sets `loadMoreError` and keeps the items.

## ConnectionPresentation

| State | Banner | Reads | Screens |
|---|---|---|---|
| `connecting` | info notice, polite | gated | `loading` |
| `connected` | none | normal | per data |
| `reconnecting` | attention banner, polite, only once the state has lasted 1 s or more (the timer is armed after the state update, cleared on every exit, re-armed on re-entry) | normal | keep data |
| `degraded: service-missing` | danger banner, assertive, in the same render | normal | keep data; no data means `error` |
| `degraded: contract-mismatch` | danger banner, assertive, in the same render | normal | keep data; no data means `error` |
| subscription refused | neutral notice "live updates are off", until remount | normal | unchanged; each non-first `connected` is a shell-side resync |

Copy and tones are in `contracts/connection-presentation.md`. Every banner is an `sk-notice` (C-005).

## SessionState

| Item | Scope |
|---|---|
| Missions `query` and `filter` | survive leaving and re-entering Missions |
| Drift `selectedFinding` | survives re-entering the same Drift scope |
| artifacts tree expansion | per Mission |
| `drawerOpen`, `flyoutOpen` | shell-wide |
| `copyResult` | Drift. It is reset to `null` (and delivered) before each copy, and on navigation |
| open-project dialog: `open`, `location`, `folders`, `selected` | desktop picker only |

## ShellHost (FR-012)

| Member | Signature | Fallback when absent, throwing or rejecting |
|---|---|---|
| `copyText` | `(text) => Promise<'copied' or 'manual'>` | `'manual'` |
| `openExternalLink` | `(href) => void`. The host MUST re-validate the scheme case-insensitively, MUST NOT navigate its window or webview, and SHOULD show the destination first | nothing |
| `listRecentProjects` | `() => Promise<ProjectEntry[]>` | Projects `error` |
| `openProject` | `(target: { key } or { location }) => void` | nothing |
| `listFolders` | `(location) => Promise<{ location, folders: FolderEntry[] }>` | dialog `error` |
| `onWindowRefocus` | `(listener) => () => void` | no refocus refresh |
| `routeChanged` | `(route) => void`, called after the shell's own navigations and after normalising a non-canonical host route | nothing |

**Invariants**:
- In `mode = 'dashboard'`, none of the six picker and dialog intents reaches the host.
- `openExternalLink` is called only for a scheme of exactly `http`, `https` or `mailto` (case-insensitive), matched at
  position 0 with no leading whitespace.
- Host errors are converted to fallbacks. **Shell programming errors are never swallowed**: the test harnesses fail on
  any uncaught error or unhandled rejection (NFR-007).

## ShellOptions

- `client` (or `null`).
- `host` (default `{}`).
- `mode` (`'desktop'` or `'dashboard'`).
- `route` (default `/missions`, or `/projects` with a null client on the desktop).
- `scheduler`: a `ShellScheduler`, declared once in `src/core/scheduler.ts` and structurally identical to the fixture's
  `Scheduler`. A type test asserts that each is assignable to the other (R4-08). Default: global timers.
- `clock` (default the system clock).
- `copy` (degraded overrides).

## IntentTable

- `INTENT_TABLE: { [T in HostedTag]: { [E in keyof MissionUiIntents[T]]: Handler<MissionUiIntents[T][E]> or { via: H } } }`.
- `MissionUiIntents` maps each tag to `{ event: Detail }`, generated from the manifest.
- `HostedTag` = `Exclude<MissionUiTag, 'sk-mission-sample'>`.
- The check types are in research R-09, and the full effect table in `contracts/intent-map.md`.
- Counts: 40 pairs, 23 distinct intent names.
