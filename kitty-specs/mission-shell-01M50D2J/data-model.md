# Data Model: mission-shell (#18)

There is no persistent storage. Everything here lives in memory for the life of one mounted shell, and is dropped on
unmount or when the client changes. Contract shapes (`Project`, `MissionDetail`, `MissionOverviewPage` and the rest)
come from the port and the pinned contract, and are never redefined. The screens' view types are supertypes of the
contract types, so a contract value is passed to a screen unchanged (FR-005). The port is frozen (C-003): nothing here
adds a field to `MissionStatusClient`, `Result`, `Refusal`, `ConnectionState`, `Change` or `SubscriptionScope`.

## Destination

A discriminated union by `screen`:

| `screen` | Layout | Identifiers | Route (`research.md` R-02) |
|---|---|---|---|
| `missions` | project | none | `/missions` |
| `drift` | project | `missionId?` (scope) | `/drift`, `/drift/{missionId}` |
| `ops` | project | none | `/ops` |
| `pipeline` | mission | `missionId` | `/missions/{missionId}` |
| `work-packages` | mission | `missionId`, `wpId?` | `/missions/{missionId}/work-packages[/{wpId}]` |
| `artifacts` | mission | `missionId`, `path?` | `/missions/{missionId}/artifacts[/{encodeURIComponent(path)}]` |
| `projects` | picker | none | `/projects` (desktop only) |

**Invariants**:
- `parseRoute(formatRoute(d))` deep-equals `d` for every destination (FR-002).
- An unknown route parses to `{ screen: 'missions' }`.
- `/projects` parses to Missions when `mode = 'dashboard'`.
- `missionId` matches the contract ULID pattern and `wpId` the contract WP id pattern. Otherwise the route is unknown.
- With `client = null` (desktop, no project open), the only reachable destination is `projects` (US5-3).

The current navigation item is derived from the destination:
- `missions`, `drift` and `ops` mark `nav-missions`, `nav-drift` and `nav-ops`;
- `pipeline`, `work-packages` and `artifacts` mark `nav-pipeline`, `nav-work-packages` and `nav-artifacts`;
- the rail marks `rail-missions` in the mission layout.

## ResourceKey and the displayed set

A displayed resource is one port read with its parameters (spec, Key Entities). Its key is a string, and the shell
records reads by key in tests.

| Key | Port read | Feeds |
|---|---|---|
| `project` | `getProject({})` | project head (chrome, project layout); `project` of the Missions and Ops screens |
| `missions` | `listMissions` pages 1..n (paged) | Missions screen `missions`, `pageInfo`, `loadingMore` |
| `mission-names` | `listMissions({})`, first page only | Drift screen `missions` (`research.md` R-18) |
| `mission:{M}` | `getMission({ path: { missionId: M } })` | Mission head (chrome, mission layout); Pipeline `mission`; WP screen `mission`; Artifact `mission` and `workPackages`; WP tree |
| `wp:{M}/{W}` | `getWorkPackage({ path: { missionId: M, wpId: W } })` | WP screen `workPackage` |
| `wp-detail:{M}/{W}` | `getWorkPackageDetail(...)` | WP screen `detail`, `detailStatus`, `detailRefusalCode` |
| `artifacts:{M}` | `listArtifacts({ path: { missionId: M } })` | Artifact `listing`; artifacts tree |
| `artifact:{M}:{P}` | `getArtifactContent({ path: { missionId: M }, query: { path: P } })` | Artifact `content`, `contentStatus` |
| `drift:{M or *}` | `getDriftReport({ query: { missionId } })` or `getDriftReport({})` | Drift `report`, `rescanning` |
| `ops` | `listOpsInvocations` pages 1..n (paged) | Ops `items`, `pageInfo`, `loadingMore`, `loadMoreError` |

The displayed set of each destination:

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
| Projects | none (host data: `listRecentProjects`) | none |

**"Of Mission M"**: a key is of M exactly when its read parameters carry `missionId = M` (`research.md` R-04). So
`drift:M` is of M, while `drift:*`, `missions`, `mission-names`, `project` and `ops` are of no Mission.

**Navigation**:
- On navigation the shell computes the new displayed set.
- It drops the slots of keys that are no longer displayed. Their generations are bumped, so late results are
  discarded.
- It issues a read for every key of the new destination's own data, and for every chrome key that was not displayed
  before.
- Re-selecting the current destination re-reads its explicit-refreshed keys (US6-2).
- The shell keeps no cache of keys that are not displayed.

## Refresh policy

The rule FR-007 to FR-009 implement. Only keys in the current displayed set are ever re-read. The exact, testable
recording for the scripted sequence is in `contracts/refresh-policy.md`.

| Change | Re-read, among displayed keys | Never |
|---|---|---|
| `status-transition` (M, W) | `mission:{M}`; `wp:{M}/{W}` and `wp-detail:{M}/{W}`; `missions` | artifacts, `artifact:*`, `drift:*`, `mission-names`, `ops`, `project` |
| `mission-lifecycle` (M) | `missions`; `mission:{M}` | as above |
| `log-truncated` (M) | every key of M; `missions` | keys of other Missions |
| `resync` | every displayed key, explicit-refreshed ones included | nothing |
| `refused` | nothing (the live-updates-off notice, FR-010) | everything |

## ResourceSlot (one per displayed key)

| Field | Meaning |
|---|---|
| `state` | `idle`, `in-flight` or `in-flight+trailing`; plus `windowOpenUntil` |
| `generation` | incremented on every issued read, and on removal |
| `value` | the last applied success value, or `undefined` |
| `view` | `loading`, `ready`, `empty` or `error` (or the screen's own status words, below) |
| `refusal` | `{ status, body }` of the last applied refusal, or `null` |

**Transitions** (`research.md` R-05):
- A request on `idle` issues a read, sets `in-flight`, and opens a 100 ms window.
- A request on `in-flight`, or while the window is open, sets `trailing`.
- A read settles: the result is applied only when its `generation` equals the slot's current generation (FR-009).
  Then, when `trailing` is set and the window has closed, exactly one read is issued and a new window opens.
  Otherwise the slot becomes `idle`.
- While the connection state is `connecting`, requests are recorded but issued only at the first `connected`.

**Applying a result** (`research.md` R-06):

| Result | Slot has a value | Slot has no value |
|---|---|---|
| `{ ok: true, value }` | value replaced; `ready` or `empty` | value set; `ready` or `empty` |
| `{ ok: false, refusal }` | `error` with the refusal (an answer, applied) | `error` with the refusal |
| `{ ok: false, unavailable }` | value and view kept | `error` |

- "Empty" follows each screen's own definition:
  - Missions: no items on the first page;
  - Ops: no items;
  - Drift: no findings, which is `empty` per `DriftScreenStatus`;
  - the others have no `empty` for their data.
- A 404 refusal maps to the screens' `not-found` status where they define it (`WpScreenStatus`, `DetailStatus`,
  `DriftScreenStatus`, `ArtifactStatus`).
- A refused load-more cursor (400, `PageCursorRefusal`; the example is `PageCursorRefusal.invalid`) drops the loaded
  pages and re-reads page 1.
- On Ops, a load-more failure is shown through `loadMoreError` and keeps the loaded items.

## ConnectionPresentation

| State | Banner (in the content column, above the screen) | Reads | Screens |
|---|---|---|---|
| `connecting` | info notice "connecting", `announce` polite | none until the first `connected` | `loading` |
| `connected` | none | normal | as their data says |
| `reconnecting` | attention banner "data may be out of date", only after the state has lasted 1 s or more (NFR-004) | normal (results go through the table above) | keep their last data |
| `degraded: service-missing` | danger banner, `announce` assertive, within 100 ms | normal | keep data; no data means `error` |
| `degraded: contract-mismatch` | danger banner, `announce` assertive, within 100 ms | normal | keep data; no data means `error` |
| (subscription refused) | neutral notice "live updates are off", independent of the state | normal | unchanged |

- Any state back to `connected` hides the banner within 100 ms. The `resync` that the adapter delivers next re-reads
  every displayed key (US4-6).
- The first `connecting` to `connected` gets no `resync`, so the shell reads the current destination itself (US4-2).
- Copy and tones are in `contracts/connection-presentation.md`.
- Every banner is an `sk-notice` (C-005). Shell CSS only places it.

## SessionState

This state lives in memory while the shell is mounted, and is reset when the client changes.

| Item | Scope |
|---|---|
| Missions `query` and `filter` | survive leaving and re-entering Missions (US2-7) |
| Drift `selectedFinding` | survives re-entering the same Drift scope |
| tree expansion (artifacts folders) | per Mission |
| `drawerOpen`, `flyoutOpen` | shell-wide; the shell accepts the elements' requests (it does not cancel them) |
| `copyResult` | Drift, until the next copy or navigation |
| open-project dialog: `open`, `location`, `folders`, `selected` | desktop picker only |

## ShellHost (the host interface, FR-012)

| Member | Signature | Fallback when absent, throwing or rejecting |
|---|---|---|
| `copyText` | `(text: string) => Promise<'copied' or 'manual'>` | `'manual'` |
| `openExternalLink` | `(href: string) => void` | nothing |
| `listRecentProjects` | `() => Promise<ProjectEntry[]>` | Projects screen `error` |
| `openProject` | `(target: { key: string } or { location: string }) => void` | nothing |
| `listFolders` | `(location: string) => Promise<{ location: string; folders: FolderEntry[] }>` | dialog `error` |
| `onWindowRefocus` | `(listener: () => void) => () => void` | no refocus refresh |
| `routeChanged` | `(route: string) => void` | nothing |

**Invariants**:
- No member is ever called in `mode = 'dashboard'` for `sk-request-open-project`, `sk-browse-folder` or
  `sk-confirm-open-project` (FR-015).
- `openExternalLink` is called only with a scheme of exactly `http:`, `https:` or `mailto:`, compared
  case-insensitively, after the shell's own check (FR-013).

## ShellOptions (the mount surface; the contract is `contracts/shell-api.md`)

`client` (`MissionStatusClient` or `null`), `host` (`ShellHost`, default `{}`), `mode` (`'desktop'` or
`'dashboard'`), `route` (string, default `/missions`), `scheduler` (the same `{ setTimeout, clearTimeout }` shape as
the fixture adapter's, default global timers), `clock` (`() => Date`, default system clock), and `copy` (partial
overrides of the degraded explanations).

## IntentTable

`INTENT_TABLE: { [T in HostedTag]: { [E in MissionUiIntents[T]]: Handler or { via: HostedTag } } }`.
- `HostedTag` is `Exclude<MissionUiTag, 'sk-mission-sample'>`.
- A missing pair is a type error naming the pair through `{ unmappedIntent: '<tag> <event>' }` (FR-004).
- The full table of effects is `contracts/intent-map.md`.
