# Contract: `sk-projects-screen`

Public surface, frozen at IC-04b (`surface-freeze.test.ts`).

The class carries the `@screen` JSDoc line (the manifest gate requires a `status` property on a screen and finds screens by that line). `sk-open-project-dialog` is a widget: it has a `status` property but no `@screen` line.

## Properties

| Name | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` (reflect) | `ViewState` | `loading` | unknown collapses to `empty` (`normaliseViewState`) |
| `entries` | none | `ProjectEntry[]` | `[]` | host order is display order; never sorted or filtered |
| `now` | `now` | `string \| null` | `null` | ISO instant; null shows ISO strings as given |
| `labels` | none | `ProjectLabelHooks \| null` | `null` | `time`, `health` hooks |
| `errorMessage` | `error-message` | `string` | `''` | overrides the default list-error body |

## Events (`@fires`, each once, literal `dispatchEvent` in `sk-projects-screen.ts`)

| Event | Payload | Trigger |
|---|---|---|
| `sk-open-project` | `{ key }` | activation of an openable row (click, Enter, Space) |
| `sk-request-open-project` | none | header "Open project" and the empty state's action (one button, shown once) |
| `sk-retry-load` | `{ target: 'project', key }` / `{ target: 'projects' }` | retry of a failed row / failed list |

No other event is emitted. Incoming events from children are stopped when the screen re-emits (`event.stopPropagation()` before the screen's own dispatch, as `sk-missions-screen` does).

## Part signatures (stubs created by IC-04b, bodies by IC-05)

```ts
renderHeader(ctx: { onRequestOpen(): void }): TemplateResult           // header-parts.ts
renderToolbar(ctx: { countText: string | null }): TemplateResult       // header-parts.ts
renderRow(view: EntryView, ctx: { onOpen(key: string): void; onRetry(key: string): void }): TemplateResult  // row-parts.ts
renderListState(kind: 'loading'|'error'|'empty', ctx: {...}): TemplateResult  // state-parts.ts
renderNotice(): TemplateResult                                          // state-parts.ts
```

## Regions and ids (for tests)

`data-region` values: `header`, `toolbar`, `list`, `notice`, `state`; rows carry `data-key`; the live region is `[data-live]`. These are test hooks, not public API.

## Structure

`<sk-page-header>` (eyebrow "Local workspace", `h1` "Open a spec-kitty project", muted copy, beside the page header: `sk-button` primary "Open project") then `<div data-narrow>` (max inline size 900 px, centred): toolbar, `ul` of rows or the state, the `sk-notice`. Rows are `li`. The live region is a visually hidden polite status.

## Dependencies on `main`

Symbols imported: `ViewState`, `normaliseViewState` (`view-state.ts`), `lookup` (`logic/lookup.ts`), `resolveActivity` (`logic/time.ts`), `missionCountText` (`defaults/missions-copy.ts`), `SUMMARY_SEPARATOR` (`defaults/lanes.ts`), `NO_ACTIVITY_TEXT` (`defaults/lifecycle.ts`), `ShellTierController` (`shell-tier.ts`), `visuallyHidden` (`visually-hidden.ts`), `overflow-region.ts` if a scroll region is used. IC-02 re-verifies every symbol exists in the file named (a mismatch is reported, not absorbed).
