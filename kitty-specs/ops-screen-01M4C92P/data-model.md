# Data model: Ops screen

## Inputs (screen properties)

| Property | Type | Default | Notes |
|---|---|---|---|
| `status` | `'loading' \| 'error' \| 'empty' \| 'ready'` | `'loading'` | reflected; unknown collapses to `empty` |
| `project` | `Project \| null` | `null` | contract-shaped, as on the Missions screen; its `name` is the header's muted supporting line ("<name> · invocation records"); nothing is drawn when it is null or its name is empty |
| `items` | `OpsInvocation[]` | `[]` | accumulated pages, service order, never re-sorted |
| `pageInfo` | `PageInfo \| null` | `null` | of the last loaded page |
| `totalCount` | `number` | `0` | shown as given |
| `skippedCount` | `number` | `0` | shown as given |
| `profile` | `string \| null` | `null` | the filter the host applied |
| `loadingMore` | `boolean` | `false` | |
| `loadMoreError` | `{ code: string \| null } \| null` | `null` | read only in the ready look |
| `refusalCode` | `string \| null` | `null` | read only in the error look |
| `labels` | `OpsLabelHooks \| null` | `null` | word and time overrides |
| `errorMessage` | `string` | `''` | overrides the error sentence |

`OpsLabelHooks`: optional methods returning `string | undefined` (undefined falls back to `defaults/`), in the shape of #4's `LabelHooks`: `outcome(word)`, `status(word)`, `closer(word)`, `mode(word)`, `evidenceClass(word)`, `time(iso)`, `copy(key)`. Tones are the existing `BadgeTone` and badges the existing `StateBadge` (`logic/types.ts`).

`OpsInvocation` and `OpsEvidence` are the generated contract types. No view type renames a field.

## Derived (pure, never stored)

- `OpsLook` = `resolveOpsLook(props)`: `loading | error | empty | ready` (plan D-02, precedence table in `contracts/sk-ops-screen.md`).
- `OpsRowView` = `buildOpsRow(item, vocabulary, labels)`: `id`, `badge { word, tone }`, `facts[]` (each `{ term, value, mono, kind: 'text' | 'time' | 'evidence' | 'quiet' }`), `evidence { classWord, value, changed } | null`.
- Announcement = function of (look, shown row count, loadMoreError code).

## Vocabulary (screen data, `defaults/ops-copy.ts`)

Tables keyed by the contract word: outcome (word, tone), status (word, tone), closer (word), mode (word), evidence class (word); tones from the existing `BadgeTone`; copy strings (header, notice, heading, badge, quiet words, empty, loading, error by refusal code, skipped, load-more, load-more error, refresh); months. An unknown key falls back to the raw word with the neutral tone.

## Events

| Event | Detail |
|---|---|
| `sk-load-more` | `SkLoadMoreDetail { cursor: string }` (the Missions screen's type) |
| `sk-retry-load` | union member `{ target: 'ops-page'; cursor?: string }` |
