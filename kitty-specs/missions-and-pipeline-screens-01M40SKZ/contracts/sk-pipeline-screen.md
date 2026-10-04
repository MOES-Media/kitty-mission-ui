# Contract: `sk-pipeline-screen`

Screen contract (`@screen`), file `src/elements/sk-pipeline-screen/sk-pipeline-screen.ts` with `fixtures.ts`, `pipeline-parts.ts` (private fragments: header, inspector, state panels) and stories. No I/O, nothing stored. Renders inside the `sk-mission-shell` content slot in the mission layout. Composes `sk-phase-bar` and `sk-work-package-board`.

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` | `ViewState` | `'loading'` | reflected; unknown collapses to `empty` |
| `mission` | none | `MissionDetailView \| null` | `null` | the contract `MissionDetail` (phases and work packages widened, optional host `actor` per work package); the target branch shown is `mission.targetBranch` |
| `laneGroups` | none | `LaneGroup[]` | `DEFAULT_LANE_GROUPS` | board columns (FR-015) |
| `labels` | none | `LabelHooks \| null` | `null` | phase, lane and state hooks (D-06) |
| `missionsHref` | `missions-href` | `string` | `'#/missions'` | the anchor target of the "Missions" crumb, so a modified click still works in the browser; the unmodified click is intercepted. A host-facing property the spec does not name: amendment proposal P-7 |
| `errorMessage` | `error-message` | `string` | `''` | overrides the default error body. A host-facing property the spec does not name: amendment proposal P-7 |

## Slots and parts

None.

## Events (`bubbles`, `composed`, literal names)

| Event | Detail | When |
|---|---|---|
| `sk-select-work-package` | `{ missionId, wpId }` | a card is activated (dispatched by `sk-work-package-board`, crosses the screen); `missionId` is `mission.missionId` |
| `sk-view-artifacts` | `{ missionId }` | View artifacts is activated |
| `sk-open-missions` | `{}` | the "Missions" crumb is activated by an unmodified primary click or Enter; a modified click emits nothing and keeps the browser default |

The screen never navigates. Library events stop at the screen.

## Rendering by `status`

The header always renders: breadcrumb nav (`.sk-breadcrumbs`: "Missions" link, then the Mission's `friendlyName` as the current item when a Mission is present), `h1` "Pipeline", and a `sk-pill-tag` with `targetBranch` when a Mission is present.

| `status` | Content |
|---|---|
| `loading` | busy region with a labelled indeterminate progress; no phase bar, board or inspector |
| `error` | alert notice; none of the three |
| `empty` | the `.sk-empty-state` panel, the same treatment as the Missions empty state (DR-9 as confirmed at CP-1; the copy is unchanged); none of the three |
| `ready` | phase bar, then board and inspector in a wrapping flex row |
| `ready` with `mission === null` | as `empty` |

## Inspector (private fragment; `<aside aria-label="Current step">`)

A flat full-height panel, not a card (operator ruling Q1: hero background, a 1 px left border only, radius 0, 20 px padding; E-12): the current-step text (`currentStep(mission)`: `nextAction` verbatim, else "Current step: <first current phase label>", else "No step in progress"); Mission progress (`.sk-progress` with a real `<label>` "Mission progress", a native `<progress value=<weightedPercentage> max="100">` and a meta text `<n>%` where `n` is `formatWholePercent(weightedPercentage)`, the value rounded to a whole percent for display only (DR-11 as confirmed at CP-1: 68%, not 68.4%; the `<progress value>` keeps `weightedPercentage` as given)); a `sk-metric` "Blockers" with `displayValue` `<blockedCount>`; a `sk-metric` "Target branch" with the branch; a content-width outlined `sk-button variant="secondary"` "View artifacts" (not full width, not borderless); a `sk-notice` carrying the static note. The Mission's `progress.semantics` and `donePercentage` are not shown (the label stays "Mission progress", as the prototype); `doneCount` is not shown.

## Behaviour

- Phase bar and board: see their contracts. The board's `missionId` is `mission.missionId`; `workPackages` and `laneGroups` are passed through unchanged.
- Zero work packages with `ready`: five empty columns, phases as given, blockers 0, progress as given.
- Footer agreement (scoped to `wpTotal` above 0): the host passes the shell `ShellMission.progress` as `{ done: doneCount, total: wpTotal, percentage: weightedPercentage }` (D-28), so the shell footer and the inspector show the same figure, both through `formatWholePercent` (the shell footer rounds a given `percentage` for display too, DR-11). The shell footer renders nothing when `total` is 0 (unchanged early return), so for a Mission with no work packages (`AllPending1280`, PL-02) the composition test asserts instead that NO footer is present and that the inspector shows the declared figure (0, as given). For every Pipeline story with `wpTotal` above 0 the test asserts the footer text and the inspector text are equal (the loop over stories asserts its iteration count, D-34).
- Layout: a wrapping flex row (board `flex: 1 1 60%`, inspector `flex: 1 1 260px` under exception E-08, DR-7 as confirmed at CP-1); the inspector sits below the board when the content cell is narrow and never overlaps it (PL-08).
- Tab order: the "Missions" crumb, the board's cards in column then card order (and the board scroll region when it overflows, P-4), View artifacts.

## Stories (22, title `Mission/Pipeline`, each inside the shell mission layout, tags `vw-<n>`)

`ImplementInProgress1280` (PL-01), `AllPending1280` (PL-02), `AllComplete1280` (PL-03), `Blockers1280` (PL-04), `Loading1280` (PL-05), `Error1280` (PL-06), `ThreePhases1280`, `SevenPhases1280` (PL-07), `Collapsed1024`, `Collapsed800`, `Mobile680`, `Mobile390`, `Mobile320` (PL-08), `BadgesBoard1280` (PL-09), `Empty1280` (PL-10), `SubtaskProgress1280` (PL-11), `TwoPhasesInProgress1280`, `NullAndUnknownLane1280`, `CustomLaneGroups1280`, `LongNames1280`, `CardFocused1280` (tag `tab-12`: the WP01 card), `ViewArtifactsFocused1280` (tag `tab-19`: View artifacts). A `tab-<n>` tag counts Tab stops from the page start, the header settings button included (the shell stories put it first).

## Tests (file `test/sk-pipeline-screen.test.ts`)

Events EV-5 to EV-7 with payloads, incl. cards of PL-09 (each with its own `wpId`), a modified click on the crumb (no event); view states and header kept; phase bar, five columns with counts; current step in all three cases and in the two-in-progress case; Mission progress displayed rounded to a whole percent (the meta text for 65 is `65%`, for 10.8333 it is `11%`) while the `<progress value>` is the given figure; blockers count only; target branch; zero work packages; footer and inspector agreement for every story with `wpTotal` above 0, and footer absent with the inspector figure shown for `wpTotal` 0 (composition inside the shell); 3 and 7 phases, a foreign vocabulary and custom groups (behavioural complement of gate `data-driven`); Tab-walk per tier; root font 200%.
