# Contract: new default modules and logic

Plain TypeScript, no I/O, no DOM. Reuses by import: `lookup`, `missionCountText`, `SUMMARY_SEPARATOR`, `NO_ACTIVITY_TEXT`, `relativeTime`, `resolveActivity`, `ViewState`.

## `defaults/health.ts`
| Export | Value |
|---|---|
| `HEALTH_BADGES` | `{ healthy: { label: 'healthy', tone: 'success' }, schema_drift: { label: 'schema drift', tone: 'attention' } }` (ruled Q5); the only place the two words appear as strings |
| `UNKNOWN_HEALTH_TONE` | `'neutral'` (an unknown value shows its raw word) |

## `defaults/projects-copy.ts`
| Export | Value |
|---|---|
| `PROJECTS_EYEBROW` | "Local workspace" |
| `PROJECTS_TITLE` | "Open a spec-kitty project" |
| `PROJECTS_INTRO` | "Choose a recent project or open a folder from this machine. Navigation appears after a project is selected." |
| `OPEN_PROJECT_LABEL` | "Open project" |
| `RECENT_PROJECTS_EYEBROW` | "Recent projects" |
| `projectCountText(n)` | "1 project" / "N projects" |
| `VERSION_PREFIX` | "v" |
| `schemaVersionText(n)` | "schema version N" (part of the row `description` only; never drawn) |
| `LOCAL_ONLY_TEXT` | "local only" |
| `ACTIVE_PREFIX` | "active" (the row text is `ACTIVE_PREFIX + ' ' + activity`; the no-activity text stands alone) |
| `ENTRY_LOADING_TEXT` | "Reading this project" |
| `ENTRY_ERROR_TEXT` | "Could not read this project" |
| `ENTRY_UNAVAILABLE_TEXT` | "This project is not available" |
| `ENTRY_RETRY_LABEL` | "Try again" |
| `UNNAMED_PROJECT_TEXT` | "Project" |
| `LIST_LOADING_TEXT`, `LIST_EMPTY_TITLE`, `LIST_EMPTY_BODY`, `LIST_ERROR_BODY` | whole-list state copy (host-neutral, as #4's DR-5) |
| `READ_ONLY_NOTICE` | "This release is a read-only view. Kitty Desktop never changes the selected project." |
| `SKIP_LINK_TEXT` | "Skip to Projects" |
| dialog copy | `DIALOG_EYEBROW` "Local filesystem", `DIALOG_TITLE` "Open Project", `FOLDER_FIELD_LABEL` "Project folder", `FOLDER_LIST_LABEL` "Folders", `PARENT_FOLDER_TEXT` "Parent folder", `VALID_PROJECT_TEXT` "valid project", `DIALOG_HINT` "A valid project contains .kittify/ and kitty-specs/. It will be opened read-only.", `CANCEL_LABEL`, `CONFIRM_LABEL` "Open", `CLOSE_LABEL` "Close dialog", `OPEN_DISABLED_REASON`, `FOLDERS_LOADING_TEXT`, `FOLDERS_EMPTY_TEXT`, `FOLDERS_ERROR_BODY` |

Copy is provisional until CP-1, as #4's was.

## `logic/project-entry.ts`, `logic/project-row.ts`
- `resolveEntry(entry: ProjectEntry): ResolvedEntry` (amended at the WP02 review, 2026-10-08): a non-row `EntryView` stub (`loading`, `error`, `unavailable`), or `{ kind: 'row', key, project }` carrying the raw project for `buildRow`. `state` set wins; no `project` and no `state` is `error`; an empty `project.name` is `error`.
- `buildRow(entry, now, hooks): EntryView` for every entry (the stub when `resolveEntry` resolves a non-row kind; screens call `buildRow`, not `resolveEntry`); for the `row` kind: `versionText`, health `{label,tone}` (hook, table, raw), `locationLine` (D-08), `missionCountText`, `activityText`, `description` (includes `schemaVersion` when non-null, as text only), `openable` (`entry.openable !== false`).
- No function reads a literal of the vocabulary; no function does arithmetic on `missionCount` or any contract value.
