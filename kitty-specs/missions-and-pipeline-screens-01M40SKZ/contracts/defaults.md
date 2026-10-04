# Contract: default mapping modules (`src/defaults/`) and logic (`src/logic/`)

Not elements: plain TypeScript modules, no I/O, no DOM. `src/defaults/` is the ONLY place a phase name, a lane value or one of the status words `pending`, `complete`, `draft`, `discarded` (the vocabulary the gate checks; `active` is not gated) may appear as a literal in non-generated, non-fixture, non-story source (gate `data-driven`, `gates.md`). Field and key names are held to the same rule: no type in `src/logic/` or an element has a member named like a lane, `specify`, `implement` or `tasks` (hence `RowView.blockedBadge`). `src/logic/` holds the algorithms and is scanned by that gate, which proves the algorithms contain no vocabulary. Elements import both and branch on neither vocabulary.

All lookups are `Readonly<Record<string, T>>` read through `lookup(table, key)` (`Object.hasOwn` guarded, returns `T | undefined`), so a key such as `constructor` or `__proto__` is just an unknown key.

## `defaults/lanes.ts`

| Export | Type | Value and use |
|---|---|---|
| `DEFAULT_LANE_GROUPS` | `readonly LaneGroup[]` | five groups, ids `planned`, `in-progress`, `review`, `approved`, `done`; labels Planned, In progress, Review, Approved, Done; lanes [planned, blocked], [claimed, in_progress], [for_review, in_review], [approved], [done, canceled] (operator decision, spec Clarifications 1) |
| `LANE_LABELS` | `Readonly<Record<string, string>>` | lane summary words, lowercase: planned `planned`, claimed `claimed`, in_progress `in progress`, for_review `for review`, in_review `in review`, approved `approved`, done `done`, blocked `blocked`, canceled `canceled` |
| `STATE_BADGES` | `Readonly<Record<string, StateBadge>>` | card state: planned `queued` neutral, claimed `claimed` info, in_progress `coding` info, for_review `review` recovery, in_review `reviewing` recovery, approved `approved` success, done `done` success, blocked `blocked` danger, canceled `canceled` neutral (prototype words kept for the three it shows; DR-2) |
| `NOT_STARTED_BADGE` | `StateBadge` | `not started`, neutral (null lane) |
| `BLOCKED_ROW_BADGE` | `(count: number) => StateBadge` | `<count> blocked`, danger (the count is `blockedCount` as given) |

## `defaults/phases.ts`

| Export | Type | Value and use |
|---|---|---|
| `DEFAULT_PHASE_LABELS` | `Readonly<Record<string, string>>` | specify Specify, plan Plan, tasks Tasks, implement Implement, review Review |
| `PhaseState` (type) | `'done' \| 'current' \| 'pending'` | DECLARED HERE and only imported elsewhere (`import type`); it holds the literal `'done'` and `'pending'`, which only `defaults/` and `contract/` may contain |
| `PHASE_STATE` | `Readonly<Record<string, PhaseState>>` | pending pending, in_progress current, complete done |
| `DEFAULT_PHASE_STATE` | `PhaseState` | `pending`: the state of a phase whose status is not in `PHASE_STATE`. It is declared here so that `phaseState` (scanned `src/logic/`) falls back through an imported constant and never writes the literal `'pending'` itself (a literal there trips S1b, reproduced at plan time) |
| `PHASE_STATUS_TEXT` | `Readonly<Record<PhaseState, string>>` | assistive text keyed by PhaseState, like the other three tables (no string-keyed hole): done `complete`, current `in progress`, pending `pending`. Lookup chain contract status -> PhaseState -> text: `PHASE_STATUS_TEXT[phaseState(status)]`; an unknown status already falls back to `DEFAULT_PHASE_STATE` in `phaseState`, so the text of an unknown status is the pending text. A `defaults` unit test asserts that every PhaseState (`done`, `current`, `pending`) has a non-empty entry in all four tables |
| `PHASE_TONE` | `Readonly<Record<PhaseState, 'success' \| 'info' \| 'neutral'>>` | done success, current info, pending neutral |
| `PHASE_GLYPH` | `Readonly<Record<PhaseState, string>>` | the `marker` slot text of the phase bar: done a check mark (U+2713), current a bullet (U+2022), pending the empty string (the dot geometry itself is S2/E-04 paint, not a glyph) |
| `PHASE_IS_CURRENT` | `Readonly<Record<PhaseState, boolean>>` | true for current only: the answer behind `aria-current="step"` and the current-step line, so no code compares a state with `'current'` |
| `NO_STEP_TEXT` | `string` | `No step in progress` |
| `CURRENT_STEP_PREFIX` | `string` | `Current step: ` |

## `defaults/lifecycle.ts`

| Export | Type | Value and use |
|---|---|---|
| `FILTERS` | `readonly FilterDefinition[]` | All (always true), Active, Planned, Done, Stale (`stale === true`), Discarded, ids `all`, `active`, `planned`, `done`, `stale`, `discarded`; the four lifecycle filters compare `lifecycleStatus` |
| `DEFAULT_FILTER`, `DEFAULT_FILTER_ID` | `FilterDefinition`, `string` | the All entry and its id (`all`) |
| `LIFECYCLE_BADGES` | `Readonly<Record<string, StateBadge>>` | active `active` success, planned `planned` neutral, done `done` success, draft `draft` neutral, discarded `Discarded` danger (never "abandoned"); planned, done and draft have no prototype word (DR-2 class) |
| `STALE_BADGE` | `StateBadge` | `stale`, info |
| `NO_ACTIVITY_TEXT` | `string` | `no activity` |
| `FILTER_GROUP_LABEL`, `SEARCH_LABEL`, `LOAD_MORE_TEXT`, `NO_MATCH_HEADING`, `NO_MATCH_BODY`, `EMPTY_HEADING`, `EMPTY_BODY`, `LOADING_LABEL`, `LOADING_BODY`, `ERROR_HEADING`, `ERROR_BODY` | `string` | `Mission status filter`, `Search Missions`, `Load more Missions`, `No Missions match`, `Try another status or clear the search text.`, `No Missions in this project`, `The project contains no committed Mission records. Search and status filters are not shown because there is nothing to filter.`, `Reading local Mission index`, `Mission records are being read from the project.`, `Mission index unavailable`, `The Mission index could not be read. No Missions are shown.` (host-neutral, DR-5) |

## `defaults/pipeline-copy.ts` (screen copy that is not vocabulary)

`PIPELINE_TITLE` `Pipeline`, `MISSIONS_CRUMB` `Missions`, `PHASES_LABEL` `Mission phases`, `BOARD_LABEL` `Work Package board`, `INSPECTOR_LABEL` `Current step`, `PROGRESS_LABEL` `Mission progress`, `BLOCKERS_LABEL` `Blockers`, `TARGET_BRANCH_LABEL` `Target branch`, `VIEW_ARTIFACTS_TEXT` `View artifacts`, `STATIC_NOTE` `Committed Mission state. The board is a read-only reduction of local artifacts.`, `PIPELINE_EMPTY_HEADING` `No Mission to show`, `PIPELINE_EMPTY_BODY` `The host has not provided a Mission for this screen.` (DR-9), `PIPELINE_ERROR_HEADING`, `PIPELINE_ERROR_BODY`, `PIPELINE_LOADING_LABEL`. Wording from `<prototype>/03-pipeline.html` where it has any.

## `logic/` signatures

| Function | Signature | Behaviour |
|---|---|---|
| `lookup` | `<T>(table: Readonly<Record<string, T>>, key: string) => T \| undefined` | `Object.hasOwn` guarded read |
| `resolvePhaseLabel` | `(name: string, hooks: LabelHooks \| null) => string` | `hooks.phase?.(name) ?? lookup(DEFAULT_PHASE_LABELS, name) ?? name` |
| `resolveLaneLabel` | `(lane: string, hooks) => string` | hook, then `LANE_LABELS`, then raw |
| `resolveStateBadge` | `(lane: string \| null, hooks) => StateBadge` | null gives `NOT_STARTED_BADGE`; else hook, then `STATE_BADGES`, then `{ label: lane, tone: 'neutral' }` |
| `phaseState` | `(status: string) => PhaseState` | `lookup(PHASE_STATE, status) ?? DEFAULT_PHASE_STATE` (an unknown status is pending, through the imported constant, no literal); the returned state is only used as an INDEX into the `Record<PhaseState, ...>` tables, never compared with a literal |
| `placeWorkPackages` | `(wps: readonly WorkPackageView[], groups: readonly LaneGroup[], hooks, boardLabel: string) => PlacedColumn[]` | the placement algorithm of data-model.md; empty `groups` uses one synthetic group |
| `laneSummary` | `(counts: Readonly<Record<string, number>>, groups, hooks) => string` | the lane summary rule of data-model.md; `''` when nothing to show |
| `matchesMission` | `(mission: MissionOverviewView, filterId: string, query: string) => boolean` | the match rule of data-model.md; no regular expression |
| `relativeTime` | `(iso: string, now: string) => string` | the thresholds of data-model.md; unparsable input returned unchanged |
| `resolveActivity` | `(iso: string \| null, now: string \| null, hooks) => string` | null gives `NO_ACTIVITY_TEXT`; hook; `relativeTime` when `now`; else the ISO string |
| `currentStep` | `(mission: MissionDetailView, hooks) => string` | `nextAction` when non-null, else prefix plus the label of the first phase for which `PHASE_IS_CURRENT[phaseState(p.status)]` holds, else `NO_STEP_TEXT` |
| `buildRowView` | `(mission: MissionOverviewView, groups, hooks, now: string \| null) => RowView` | assembles one row's already-resolved text and badges; the blocked badge (from `blockedCount` and `BLOCKED_ROW_BADGE`) goes in the field `blockedBadge` |

## Tests (unit-tests gate, one file per module under `test/`)

Row view: `blockedBadge` present iff `blockedCount` is above 0, `stale`, lifecycle badge for each lifecycle value, activity text. Placement: every default lane; null lane; unknown lane; a lane in two groups; empty groups; custom groups; order preserved. Summary: the two prototype strings; claimed and in progress as separate segments; unknown lane appended; all zero. Match: each filter with a draft, a stale-and-active and a discarded Mission; trim; case; `a.b` and `(` as plain text; null type. Time: each threshold, future, unparsable, null, hook wins, no `now`. Labels: hook wins, default, raw fallback, `constructor` as a name. Current step: `nextAction` verbatim, first current phase, none. Each pure function runs in the browser-mode test project like every other test.

## Export surface: exactly what each consumer imports

Elements and private fragments import only the names below, so no scanned file needs a vocabulary word as an identifier or a literal. Everything else in `defaults/` and `logic/` is internal to those modules and their tests.

| Consumer | From `src/defaults/` | From `src/logic/` |
|---|---|---|
| `sk-phase-bar` | `DEFAULT_PHASE_LABELS`, `PHASE_STATUS_TEXT`, `PHASE_TONE`, `PHASE_GLYPH`, `PHASE_IS_CURRENT`, type `PhaseState` | `lookup`, `phaseState`, `resolvePhaseLabel` |
| `sk-work-package-board` | `DEFAULT_LANE_GROUPS`, `BOARD_LABEL`, `STATE_BADGES`, `NOT_STARTED_BADGE` (through the logic functions) | `placeWorkPackages`, `resolveStateBadge` |
| `sk-filter-toggle-group` | none (it knows no vocabulary) | none |
| `sk-missions-screen` and `mission-row-parts.ts` | `FILTERS`, `DEFAULT_FILTER_ID`, `LIFECYCLE_BADGES`, `STALE_BADGE`, `BLOCKED_ROW_BADGE`, the copy strings of `lifecycle.ts`, `DEFAULT_LANE_GROUPS` | `matchesMission`, `buildRowView`, `laneSummary`, `resolveActivity` |
| `sk-pipeline-screen` and `pipeline-parts.ts` | `DEFAULT_LANE_GROUPS`, the copy strings of `pipeline-copy.ts`, `NO_STEP_TEXT`, `CURRENT_STEP_PREFIX` | `currentStep`, `resolvePhaseLabel` |
