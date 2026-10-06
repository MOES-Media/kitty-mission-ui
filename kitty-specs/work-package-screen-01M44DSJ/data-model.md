# Data model: Work Package detail screen

Types come from the vendored contract (1.1, pinned: `contracts/contract-pin.md`) through `packages/mission-ui/src/contract/types.generated.ts`. Hand-written aliases and widened view types live in `src/contract/types.ts` (IC-01 owns the file; this mission adds the names below). #4 already exports `WorkPackageView` from the same file (a widened `WorkPackageSummary` used by the board, `PlacedCard` and `MissionDetailView`); it stays untouched, and this mission's widened full Work Package is named `WorkPackageRecordView`. No I/O, no clock. Decisions: `research.md` D-05, D-06, D-07, D-08. The plan-phase forks are ruled (operator, 2026-10-05; `plan.md`, "Rulings applied").

## Contract types the screen reads (generated, never hand-copied)

| Alias | Generated schema | Notes |
|---|---|---|
| `WorkPackage` | `components['schemas']['WorkPackage']` | 1.0, closed |
| `WorkPackageDetail` | `...['WorkPackageDetail']` | 1.1, closed |
| `Subtask`, `DependencyRef`, `ReviewCycle`, `Workspace`, `OwnedFile` | same names | 1.1 |
| `ChangeState`, `ReviewVerdict`, `Staleness`, `Cancellation`, `ReviewOverride`, `ReviewResult`, `HistoryEntry`, `Actor`, `Assignment`, `Authored`, `Readiness` | same names | 1.0 / 1.1 |
| `ArtifactReference`, `ArtifactReferences` | same names | `kind` is the provisional `ArtifactKind` union; the screen copies it into the event, never branches |
| `WorkPackageDetailRefusalCode` | `...['WorkPackageDetailRefusalCode']` | `not_found`, `source_unreadable`; provisional |

## Widened view types (hand-written, `src/contract/types.ts`)

| Type | Definition | Why |
|---|---|---|
| `WorkPackageRecordView` | `Omit<WorkPackage, 'statusLane' \| 'subtasks' \| 'history' \| 'staleness'> & { statusLane: string \| null; subtasks: Record<string, string>; history: HistoryEntryView[]; staleness?: Staleness \| null }` | the contract enum is closed; the screen must survive a value it has never seen (FR-023, WP-45), including in the open `subtasks` map; `staleness` is provisional and a host may omit the property (FR-018, WP-22) |
| `HistoryEntryView` | `Omit<HistoryEntry, 'fromStatusLane' \| 'toStatusLane'> & { fromStatusLane: string \| null; toStatusLane: string }` | same |
| `WorkPackageDetailView` | `Omit<WorkPackageDetail, 'subtasks' \| 'dependencies' \| 'reviewCycles' \| 'workspace'> & { subtasks: SubtaskView[]; dependencies: DependencyRefView[]; reviewCycles?: ReviewCycle[]; workspace?: Workspace }` | same; `reviewCycles` and `workspace` are provisional parts a host may omit (FR-018, Q9) |
| `SubtaskView`, `DependencyRefView` | the contract type with `statusLane: string \| null` | same |

`OwnedFile.changeState` is not widened: the 1.1 contract carries the open value as the `unknown` member, a future state is shown raw by `resolveChangeState` (a string lookup), and no view type is needed. Every widened type is a SUPERTYPE of the contract type, so each generated fixture `satisfies` the contract type and is accepted as the view type (the #4 D-05 pattern). The gate `contract` never sees the view types. IC-01 exit check: `tsc` is green for the Pipeline board and screen (#4's `WorkPackageView` unchanged), and the four other new names (`WorkPackageDetailView`, `HistoryEntryView`, `SubtaskView`, `DependencyRefView`) are grepped for collisions before they are added.

## Screen entities (host props and derived read models)

### `WpScreenMission` (host prop `mission`)
| Field | Type | Rule |
|---|---|---|
| `missionId` | `string` | in every event payload |
| `slug` | `string` | in `sk-open-mission`; shown in nothing-selected |
| `name` | `string` | the breadcrumb's Mission crumb |
| `workPackageCount` | `number` | "N Work Packages", shown as given; used only in nothing-selected |

### View states
`WpScreenStatus = 'loading' | 'error' | 'empty' | 'ready' | 'not-found' | 'nothing-selected'` (unknown collapses to `empty`); `DetailStatus = 'loading' | 'ready' | 'error' | 'not-found'` (unknown collapses to `error`: a refusal word is safer than a silent success). The detail refusal code reaches the screen through the optional property `detailRefusalCode` (`string | null`, no attribute, default null; operator ruling 2026-10-05, CORRECT-008 (a)): the contract's `not_found` or `source_unreadable`, or a code the screen has never seen. It is read only when `detailStatus` is `error` or `not-found`.

| `status` | Regions drawn |
|---|---|
| `loading` | frame, header band without data (the complete breadcrumb renderer and the `h1`, drawn from `state-parts.ts`; never `renderHeader`), busy indicator |
| `error` | frame, alert notice, retry `target: 'work-package'` |
| `empty` | frame, neutral empty form |
| `ready` | all regions; `detailStatus` governs the detail regions only |
| `not-found` | header with crumb and id only, "Task detail unavailable", return action |
| `nothing-selected` | eyebrow, "Choose a Work Package", slug, count |
| `ready` with `workPackage === null` | as `empty` |

| `detailStatus` (with `status` `ready`) | Regions |
|---|---|
| `ready`, `detail` present | all regions as data |
| `ready`, `detail` null | omitted-by-host degradation: the three overlapping lists (subtasks, dependencies, owned files) in their bare 1.0 forms from `resolveLists`; detail-only regions (review cycles, workspace, artifact links) not drawn; no notice, no claim that anything is missing |
| `loading` | the three overlapping lists in their bare 1.0 forms (the 1.0 regions stay, FR-024, SC-004); the three detail-only regions replaced by ONE busy indicator |
| `error` / `not-found` | the three overlapping lists in their bare 1.0 forms; the three detail-only regions replaced by ONE regional notice naming the refusal in words with a retry (`target: 'detail'`): the word is `lookup(DETAIL_REFUSAL_WORDS, detailRefusalCode)` with the raw code as fallback; without a code (null) one generic regional wording is used |

Reason for the two "no detail" paths: a null `detail` with `detailStatus` `ready` is the host saying it has no detail part (no claim is made), while a pending or refused detail is a statement about a detail that exists; both keep every 1.0 region, and the only difference is the single notice or busy indicator in place of the detail-only regions. The notice or busy indicator is drawn once, at the position of the first detail-only region in reading order (the review-cycles slot in column 2, inside the Review panel, proposed with DW-23 at CP-1). Region identifiers, who draws each container (the screen file draws every panel container and `data-region` element; parts return bodies only) and the set-equality test are in `contracts/sk-work-package-screen.md`, "Regions" and "Containers and drawn-when".

### `ResolvedLists` (output of `logic/wp-lists.ts` `resolveLists`, FR-004)
| Field | Type | Detail present | Detail absent |
|---|---|---|---|
| `source` | `'detail' \| 'bare'` | `detail` | `bare` |
| `detail` | `WorkPackageDetailView \| null` | the detail (matching `wpId`) | null |
| `subtasks` | `{ id, title: string \| null, lane: string \| null }[]` | the detail's | ids from `workPackage.subtasks` keys, lane from its values, title null |
| `dependencies` | `{ wpId, title: string \| null, lane: string \| null }[]` | the detail's | ids from `workPackage.dependencies`, title and lane null |
| `ownedFiles` | `{ pattern, isGlob: boolean, changeState: string \| null }[]` | the detail's | patterns from `workPackage.ownedFiles`, `isGlob` false, state null |

The detail counts as present only when its `wpId` equals `workPackage.wpId`; a detail for another Work Package is treated as omitted (source `bare`, no detail-only region drawn, no notice; operator ruling 2026-10-05, ARCH-013 (a')). The screen passes `detail` to `resolveLists` ONLY when `detailStatus` is `ready`; under `loading`, `error` and `not-found` it passes `null` whatever the host still holds (a stale detail never mixes detail-form lists with the notice; spec FR-024, US6 AC2, SC-004; test owner WP08). `resolveLists` is the one place that decides the rest and returns the usable detail (or null) as `detail`, from which the detail-only regions (review cycles, workspace, artifact links) draw.

Invariants: a part reads only `ResolvedLists`; the two payloads never both feed one list; no list is sorted, filtered or counted by the screen (the progress bar takes `subtaskProgress` as given).

### `ResolvedFile` and `FilesView` (derived, `logic/wp-files.ts`)
`ResolvedFile` is one element of `ResolvedLists.ownedFiles` (`{ pattern, isGlob, changeState }`) and the input of `filesView(files: ResolvedFile[])`; its output is `FilesView = { allUnknown: boolean; rows: { pattern, isGlob, badge: StateBadge | null }[] }`. `allUnknown` is true when the list is non-empty and every `changeState` equals the table key `UNKNOWN_CHANGE_STATE` declared in `defaults/files.ts` (the one name of that constant; the logic never writes the literal); then per-row badges are suppressed and one note shows. A single `unknown` among others is shown (WP-25), and a foreign change state among known ones is shown raw (it does not collapse the list). A null state (bare degradation) shows no badge and no note.

### `ActorText` (derived, `logic/wp-actor.ts`)
`joinHandles(actor)` returns the non-null handles of `[tool, role, profile]` joined by `:`, or `null` when none. Used by the header badge and the Facts row. The Assignment panel does not join.

## Vocabulary tables (`src/defaults/`, new files; every value read through `lookup`, raw fallback)

| Module | Exports | Keys |
|---|---|---|
| `review.ts` | `VERDICT_BADGES` (`StateBadge` per verdict), `NO_VERDICT_TEXT`, `OVERRIDE_*` copy, `OPEN_REVIEW_LABEL(n)`, `REVIEW_CYCLE_ARTIFACT_KIND` | verdict values of `ReviewVerdict` |
| `files.ts` | `CHANGE_STATE_BADGES` (`StateBadge` per state), `UNKNOWN_CHANGE_STATE`, `GLOB_MARKER`, `CHANGE_STATE_UNAVAILABLE_NOTE`, `NO_FILES_TEXT` | the three `ChangeState` values |
| `refusals.ts` | `DETAIL_REFUSAL_WORDS`, `DETAIL_RETRY_LABEL`, `DETAIL_REFUSAL_GENERIC` | the two refusal codes (an unknown code shows raw) |
| `staleness.ts` | `STALENESS_STATUS_ROLE`, `STALENESS_REASON_WORDS`, `STALENESS_MINUTES_TEXT`, `FRESH_TEXT` | the three statuses, the two reasons |
| `wp-copy.ts` | panel titles, `NOTHING_SELECTED_*`, `NOT_FOUND_*`, `ABSENT_MARKER`, `CURRENT_MARKER`, `FORCED_WORD`, absent-list forms, `WP_ERROR_*`, `WP_LOADING_*`, accessible-name and announcement copy | none (plain strings) |

Reused from #4 by import (no second home): lane words, tones and the not-started badge (`LANE_LABELS`, `STATE_BADGES`, `NOT_STARTED_BADGE`), the stale badge (`STALE_BADGE`), the count text (`LANE_COUNT_TEXT`), the subtask progress text (`SUBTASK_PROGRESS_TEXT`), and the `StateBadge` and `BadgeTone` types. The artifact `kind` has no table at all (pass-through; the review cycle's own kind is the one export `REVIEW_CYCLE_ARTIFACT_KIND`).

Staleness display: `stalenessView` returns role `badge` (stale), `row` (fresh, and any status that is not a table key, shown with its raw status text) or `none` (not applicable and absent). A `not_applicable` status keeps its visual silence and has a text form in the DOM: visually hidden text in the Facts panel, "Staleness: not applicable, <reason>" (reason through `STALENESS_REASON_WORDS`, raw fallback), drawn with `visually-hidden.ts` and asserted by a DOM text query (operator ruling 2026-10-05, VISUAL-014 (a)); an absent staleness draws nothing.

## Events (declared once each with `@fires`, literal dispatch in the screen file)

| Event | Detail type | Source of the type |
|---|---|---|
| `sk-select-work-package` | `SkSelectWorkPackageDetail { missionId, wpId }` | imported from `sk-work-package-board` (#4) |
| `sk-open-mission` | `SkOpenMissionDetail { missionId, slug }` | imported from `sk-missions-screen` (#4) |
| `sk-open-artifact` | `SkOpenArtifactDetail { missionId: string; path: string; kind: string }` | new, exported from `sk-work-package-screen.ts` |
| `sk-retry-load` | `SkRetryLoadDetail { missionId: string; wpId: string; target: 'work-package' \| 'detail' }` | new, same file |

`missionId` is `mission.missionId` for every payload. Every payload takes its Work Package id from one builder (`retryDetail` and the small literal builders of the screen): the host property `wpId` first, then `workPackage.wpId`, then `detail.wpId` (amendment P-3, `research.md` D-04, D-05; operator ruling 2026-10-05, ARCH-013 (a')). The not-found header ("crumb and id only", WP-42) and the retry of a `WorkPackage` read that failed need an id when `workPackage` is null, and neither the contract payload nor the `mission` prop carries one. A detail whose `wpId` differs from `workPackage.wpId` is treated as omitted (above). Controls that need `missionId` (the crumb, dependency nodes, artifact links, retry, return) are drawn inert (not activatable, no event) when `mission` is null. One test per branch.

Dispatch ownership: IC-03b writes all four dispatch methods and their payload builders in the screen file (one literal `dispatchEvent` per event, `@fires` declared, part files receive the handlers as arguments), with a skeleton test per event; region WPs own and run the event tests of the controls they draw (`plan.md`, "Shared files").

## State and transitions

The element is stateless: no internal state besides focus and a measured nothing. Every interaction is an event out. No lifecycle transition exists in the screen (C-003 read-only).

## Traceability seeds (fixtures to rows) — see `contracts/contract-pin.md`

Rows and their fixture exports are listed in `contracts/sk-work-package-screen.md`.

## CP-1 rulings that touch the data shapes (2026-10-05)

No property, type or event changes. The dependency node shows three texts from `DependencyRefView` (`wpId`, `title` falling back to the id, the lane word from `statusLane`), wrapped in ONE slot element of the ghost `sk-button` (`dependencyNodeLabel(wpId, title, laneWord)` stays the accessible name). The Evidence chain items (Mission, Work Package, state word from `statusLane`) are `sk-pill-tag` list items, not `stages` objects of `sk-evidence-chain`. The history entries keep their fields; the visible "from -> to" summary is derived from the previous and the entry's own lane value (array order, no lane literal). Layout thresholds are container widths (`min-width: 848px`, `max-width: 688px`), not data.
