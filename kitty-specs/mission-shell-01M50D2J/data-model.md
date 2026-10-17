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

| Destination | Re-read by `status-transition` and `mission-lifecycle` (per the policy)¹ | Explicit-refreshed (the destination's own data, FR-016)¹ |
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

¹ FS-12. The column names only the two status changes. `log-truncated` (M) re-reads every displayed key of M, including
explicit-refreshed ones such as `drift:M`, `artifacts:M` and `artifact:M:P`. `resync` re-reads every displayed key of
both columns.

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
| `resync` (adapter), or a shell-side resync (a `connected` that is not the client's first, while that client's subscription is refused) | every displayed key | nothing |
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

### Connection gate (FS-01, FS-02; spec FR-011, US4-1, US4-2)

- **Per client** (FS2-01): the gate, the "first `connected`" mark and the refused flag belong to the current client.
  `setClient` resets all three. A client whose state is already `connected` when it is mounted, or passed to
  `setClient`, counts as that client's first `connected` and issues the displayed set at once.
- **`setClient` without a route** (amended 2026-10-17, pre-merge squad ARCH-001, ARCH-009): it shows the default route
  for the new client and mode, `/missions`, or `/projects` for a null client on the desktop, and announces it through
  `routeChanged` when that differs from the screen shown. With a route, it shows that route. A null client on the
  desktop coerces every route to `/projects`. On the Svelte component, a client-only change of the `client` prop resets
  to the default route; the `route` prop is forwarded only when it changed in the same tick (R2-NEW-001).
- Nothing is issued until the client's first `connected`, so `connecting`, and any `degraded` or `reconnecting`
  state before that, issue nothing.
- A degraded state before the first `connected` sets the no-value slots of the displayed set to `error`, without
  reads.
- The first `connected`, whatever came before it, issues the current displayed set itself, as bypass reads. It is not
  a `resync`: there is no `resync` at first contact.
- Later `connected` transitions are reconnects, re-read by the adapter's `resync` (or a shell-side resync while
  refused).

### Page chain (`missions`, `ops`)

- Page 1, then each next page with the cursor of the page just read, up to the n pages loaded, or until a page has no
  next cursor.
- The chain uses one generation and is applied once, when complete.
- On page k > 1, a failure applies the pages read so far.
- Load-more:
  - it appends one page with `loadingMore` set;
  - a stream request during it becomes `trailing` and re-reads n + 1 pages;
  - a bypass during it supersedes it;
  - a load-more during a chain is queued, and issued with the new last cursor;
  - **a cursor retry is a load-more** (FS-08): an Ops `sk-retry-load` with a `cursor` appends; it is not a bypass.

## Applying a result

| Result | Slot with a value | Slot without a value |
|---|---|---|
| `{ ok: true, value }` | replaced; `ready` or `empty` | set; `ready` or `empty` |
| `{ ok: false, refusal }` | `error` (or `not-found` for 404 where the screen defines it), with the refusal | the same |
| `{ ok: false, unavailable }` | value and view kept (spec FR-005 amendment) | `error`, with no refusal (a stale refusal is dropped, CON-004, 2026-10-17) |

- **Stale-while-revalidate**: a slot with a value keeps its view while a re-read runs. `loading` appears only without a
  value.
- **While degraded**, every displayed slot without a value shows `error`, even with a read in flight (FS-05). Before
  the first `connected`, there are no reads at all (see "Connection gate").
- "Empty" follows each screen's definition: Missions has no items on page 1, Ops has no items, and Drift has no
  findings. The others have no `empty`.
- A refused load-more cursor (400, `PageCursorRefusal.invalid`) drops the loaded pages and re-reads page 1.
- An Ops load-more failure sets `loadMoreError` and keeps the items.

## ConnectionPresentation

Amended 2026-10-17 (pre-merge squad ARCH-002, CON-003): a connection state equal to the current one is ignored. A
second `reconnecting` neither hides a banner already shown nor re-arms the grace timer. The connection gate still
observes every state.

| State | Banner | Reads | Screens |
|---|---|---|---|
| `connecting` | info notice, polite | gated | `loading` |
| `connected` | none | normal | per data |
| `reconnecting` | attention banner, polite, only once the state has lasted 1 s or more (the timer is armed after the state update, cleared on every exit, re-armed on re-entry) | gated before the first `connected`; normal after | keep data |
| `degraded: service-missing` | danger banner, assertive, in the same render | gated before the first `connected`; normal after | keep data; no data means `error` |
| `degraded: contract-mismatch` | danger banner, assertive, in the same render | gated before the first `connected`; normal after | keep data; no data means `error` |
| subscription refused | neutral notice "live updates are off", until remount or `setClient` | normal | unchanged; each `connected` that is not the client's first is a shell-side resync |

**One home for each part** (FS-06):
- **core** (`src/core/connection.ts`) owns the state → condition mapping, including the refused flag and the 1 s grace
  timer, and the copy;
- **the view** (`src/ui/ConnectionBanner.svelte`) owns the tone and announce table, one line per condition.

Values are in `contracts/connection-presentation.md`. Every banner is an `sk-notice` (C-005).

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
- `copy` (degraded overrides). Amended 2026-10-17 (pre-merge squad ARCH-003): the host can also change them after
  mount with `setCopy`, which replaces the whole set and treats `{}` and `null` as the defaults.

## IntentTable

- `INTENT_TABLE: { [T in HostedTag]: { [E in keyof MissionUiIntents[T]]: Handler<MissionUiIntents[T][E]> or { via: H } } }`.
- `MissionUiIntents` maps each tag to `{ event: Detail }`, generated from the manifest.
- `HostedTag` = `Exclude<MissionUiTag, 'sk-mission-sample'>`.
- The check types are in research R-09, and the full effect table in `contracts/intent-map.md`.
- Counts: 40 pairs, 23 distinct intent names.
