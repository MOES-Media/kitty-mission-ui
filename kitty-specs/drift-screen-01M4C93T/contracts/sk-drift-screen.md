# Public contract: `sk-drift-screen`

Frozen by IC-03b (surface freeze). A change after that is a change request to the orchestrator. Everything here is derived from
`spec.md` (FR-001, FR-015, FR-020 to FR-022, EV-1 to EV-6) and the operator rulings of 2026-10-08.

## Properties (11)

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` (reflected) | `'loading' \| 'ready' \| 'empty' \| 'error' \| 'not-found'` | `'loading'` | Unknown value collapses to `empty` (as `normaliseViewState`), except `not-found` which is the screen's own. |
| `report` | none | `DriftReportView \| null` | `null` | Contract `DriftReport`, widened by the vocabulary-open relaxation (data-model.md). |
| `selectedFinding` | none | `DriftFindingKey \| null` | `null` | Host-owned. An incoming change is never re-emitted. |
| `missionId` | `mission-id` | `string` | `''` | Scope. Non-empty means a scoped scan (FR-009). |
| `missions` | none | `Readonly<Record<string, DriftMissionName>> \| null` | `null` | By `missionId`; `DriftMissionName = Pick<MissionHead, 'missionId' \| 'slug' \| 'friendlyName'>`. |
| `rescanning` | `rescanning` (boolean) | `boolean` | `false` | Report stays visible; the Rescan button is busy (`aria-busy`), the root is not, and "Rescanning" is announced once in the polite region. The end is announced once, decided against the report captured when the rescan started (not the previous update), so the order in which the host sets `report` and clears `rescanning` does not matter: a later scan time says `RESCANNED_TEXT`, a report that differs otherwise says the load line, and the same report, state and words say `RESCAN_UNCHANGED_ANNOUNCEMENT` ("Rescan complete: no changes"), in the error and not-found states too. **Host ordering (no timers, NFR-005):** the host delivers the new report before, or in the same update as, clearing `rescanning`. The end line is decided in the update where the flag falls. A host that clears the flag first hears "Rescan complete: no changes", then the report's own line when the report lands. |
| `copyResult` | `copy-result` | `'copied' \| 'manual' \| null` | `null` | The host resets it to null on `sk-copy-command`, then answers (Q5 (a)). The screen clears its shown result at press time and accepts only a change observed after the press (FR-021). |
| `refusalCode` | `refusal-code` | `string \| null` | `null` | A `DriftRefusalCode` or any string; unknown shows the generic words. |
| `now` | `now` | `string \| null` | `null` | ISO instant for relative time; null falls back to the ISO string. |
| `labels` | none | `LabelHooks \| null` | `null` | `LabelHooks` gains optional drift hooks (IC-02, additive; defaults.md). |
| `errorMessage` | `error-message` | `string` | `''` | Host text for `error`; empty uses the refusal words. |

Deliberately absent: a `findings` filter, a sort, a page cursor, a clipboard handle, a `selectedIndex`.

## Events (6; each declared once with `@fires`, `bubbles`, `composed`)

| Event | Detail type | Payload | Owner of the dispatch method |
|---|---|---|---|
| `sk-select-finding` | `SkSelectFindingDetail` | `{ missionId, kind, artifactPath }` | IC-03b (written complete) |
| `sk-rescan-drift` | `SkRescanDriftDetail` | `{ missionId: string \| null }` (the scope, `null` for the whole project) | IC-03b |
| `sk-copy-command` | `SkCopyCommandDetail` | `{ text, missionId, remedy }` | IC-03b |
| `sk-open-mission` | `SkOpenMissionDetail` (existing) | `{ missionId, slug }` | IC-03b |
| `sk-open-missions` | `SkOpenMissionsDetail` (existing) | `{}` | IC-03b |
| `sk-retry-load` | `SkDriftRetryLoadDetail` (the alias of `DriftRetryDetail`, one new member of the existing `RetryLoadDetail` union) | `{ missionId: string \| null, target: 'drift-report' }`, built by the new `driftRetryDetail(missionId)` (IC-02), not by `retryDetail()` | IC-03b |

`sk-open-mission`, `sk-open-missions` and `sk-retry-load` are NOT redeclared in `HTMLElementEventMap`: this element adds the
`DriftRetryDetail` member to the union where `main` holds it (today `logic/wp-retry.ts`; `src/retry-types.ts` once #7 lands) and
imports the two navigation detail types. The three new event names are declared in this element's `HTMLElementEventMap` block.

## Part signatures (stubs created by IC-03b with these final exports; owners replace bodies only)

| File | Exports | Owner |
|---|---|---|
| `header-parts.ts` | `renderHeader(p: HeaderProps)`, `headerStyles` | IC-04 |
| `list-parts.ts` | `renderHead(p)`, `renderListbox(p)`, `listStyles` (roving tabindex, key handling is a pure helper in `logic/drift-keys.ts`) | IC-04 |
| `state-parts.ts` | `renderLoading`, `renderClean`, `renderError`, `renderNotFound`, `renderChoose`, `renderTruncationNote`, `stateStyles` | IC-04 |
| `detail-parts.ts` | `renderDetail(view: FindingView, p)`, `detailStyles` (kicker, title, explanation, authority panel, facts) | IC-05 |
| `table-parts.ts` | `renderLaneTable(rows, p)`, `tableStyles` (scroll region via `OverflowRegion`) | IC-05 |
| `resolution-parts.ts` | `renderResolution(command, p)`, `resolutionStyles` (command field, Copy, result region) | IC-05 |
| `panel-parts.ts` | `renderPanel(title, body)`, `panelStyles` (`sk-card` plus `sk-section-header`; E-18 scope extension) | IC-03b (complete) |
| `fixtures.ts` | one builder per fixture name and `pairReport(report, options)` | IC-03b (complete; later WPs only import) |
| `sk-drift-screen.ts` | the class, 11 properties, layout grid, status switch, dispatch methods, `updated()` focus rule, live region, composed `static styles` | IC-03b only |

## View-model (pure, `logic/drift-finding.ts`; no DOM)

`buildFindingView(finding, ctx): FindingView` with `FindingView = { key, title, kicker: { severity: {word, tone}, kind: string },
sourceCodeTag: string | null, explanation: string | null, authorityWord: string, derivedSideWord: string, file: string,
mission: { missionId, slug | null, friendlyName | null }, laneRows: { wpId, persisted: string, derived: string }[],
laneNote: string | null, command: { text, remedy } | null, commandNote: string | null }`. `ctx` carries the name map, the hooks and
the defaults tables. Rules: `command` only when `remedy` is a key of `REMEDY_COMMANDS` and the slug is known; `commandNote` is set
only for a known remedy with an unknown slug (DR-13); `explanation` is null for an unknown pair; every word falls back to the raw
value; lane words go through `resolveLaneLabel`, a null lane reads `NOT_PRESENT_WORD`.

## Focus order (documented; stops tagged `tab-N` as #4 and #5)

1. the skip target `#content` (shell-owned); then the shell's own stops; `tab-7` Rescan; `tab-8` the listbox (one stop; arrows move inside
it); `tab-9` the Mission link in Facts; the lane table region (only while it overflows; between the Mission link and Copy); `tab-10`
Copy. The command field is never a stop (E-38 was re-scoped: it is a `code`, not a field). The numbers count the Tab presses from the top
of the page in the 1280 px story; the screen's own stops are consecutive. In error and not-found the single action is the only stop after Rescan.
