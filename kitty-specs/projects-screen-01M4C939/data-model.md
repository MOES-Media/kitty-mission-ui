# Data model: Projects screen

Host wrapper types live in `src/project-types.ts` (plain TypeScript, no I/O). The contract type `Project` is the generated `Schemas['Project']` re-exported from `src/contract/types.ts`; it is never redeclared.

## Contract (read-only input)

`Project` = `{ name: string; missionCount: number; specKittyVersion: string | null; schemaVersion: number | null; health: 'healthy' | 'schema_drift'; currentBranch: string | null; lastActivityAt: string | null }`. All seven required, closed.

## Host wrappers

| Type | Field | Type | Rule |
|---|---|---|---|
| `ProjectEntryState` | | `'loading' \| 'error' \| 'unavailable'` | the entry has no `Project` yet |
| `ProjectEntry` | `key` | string | host-stable identity; the only identity an event carries |
| | `location` | string | opaque display text; never parsed |
| | `name` | string, optional | display name for an entry without a `project` (D-13) |
| | `localOnly` | boolean, optional | shows the "local only" segment |
| | `openable` | boolean, optional (default true) | false renders a plain row |
| | `project` | `Project`, optional | present only when the read succeeded |
| | `state` | `ProjectEntryState`, optional | wins over `project` when set |
| `FolderKind` | | `'parent' \| 'folder'` | |
| `FolderEntry` | `name` | string | display |
| | `location` | string | opaque host id of the folder; the payload of browse and confirm |
| | `kind` | `FolderKind` | |
| | `valid` | boolean | host's valid-project test |
| `ProjectLabelHooks` | `time?(iso, now)` | string or undefined | as `LabelHooks.time` |
| | `health?(value)` | `{ label, tone }` or undefined | consulted before the default table |

## View models (logic, internal)

| Type | Fields |
|---|---|
| `EntryView` | discriminated on `kind`: `row` (`key`, `name`, `versionText`, `health: { label, tone }`, `locationLine`, `missionCountText`, `activityText`, `description`, `openable`), `loading` (`key`, `name`, `locationLine`), `error` (same + retry), `unavailable` (`key`, `name`, `locationLine`) |

`description` is the accessible description string: version, schema version (ruled Q4: available to assistive technology only, but blocked by the library, spec-kitty-design#528: the string is prepared and not yet wired), location, branch, activity.

## Properties

`sk-projects-screen`: `status: ViewState` (reflect; default `loading`; unknown collapses to `empty`), `entries: ProjectEntry[]` (default `[]`), `now: string | null` (default null), `labels: ProjectLabelHooks | null`, `errorMessage: string` (attribute `error-message`).

`sk-open-project-dialog`: `open: boolean` (reflect), `location: string` (the shown folder text), `folders: FolderEntry[]`, `selected: string | null` (the selected folder's `location`), `status: ViewState` (the listing).

## Events (all `bubbles`, `composed`, declared once with `@fires`)

| Event | Payload | Fired by |
|---|---|---|
| `sk-open-project` | `{ key: string }` | screen |
| `sk-request-open-project` | none (`null` detail) | screen |
| `sk-retry-load` | `{ target: 'project'; key } \| { target: 'projects' } \| { target: 'folders' }` (members of the shared union) | screen, dialog |
| `sk-confirm-open-project` | `{ location: string }` | dialog |
| `sk-browse-folder` | `{ location: string }` | dialog |

State transitions: `entries` replaced wholesale by the host; the screen keeps no list state. Dialog `open` is semi-controlled; `selected` is controlled by the host.

## Validation rules

- Missing or non-array `entries` renders as empty.
- An entry with neither `project` nor `state` is treated as `error` (mismatched data counts as not loaded).
- An entry whose `project.name` is an empty string is treated as `error`.
- A repeated `key`: all rows render; the event carries the key as given (test records).
- Unknown `health`: neutral tone, raw word.
- `openable === false`, or kind not `row`: no control, no arrow, no event.
