# Contract: `sk-ops-screen`

## Surface (frozen at IC-03b)

Twelve properties as in `data-model.md` (the twelfth, `project`, was added at the 2026-10-11 ruling). Attributes: `status` (reflected), `loading-more` (boolean), `error-message`, `profile`, `total-count` (number), `skipped-count` (number), `refusal-code`. Events (`bubbles`, `composed`, declared once with `@fires`): `sk-load-more`, `sk-retry-load`. Slots: none. Not self-registering: `src/index.ts` defines the tag once.

`resolveOpsLook` returns `{ look, reason }`, `reason` being `status`, `empty-ready`, `mismatch` or `ready`; announcements are keyed on the pair, so a `loading` look with reason `mismatch` announces nothing, while a `loading` look with reason `status` announces the loading text.

## Look resolution (D-02), evaluated in this order

| # | Condition | Look |
|---|---|---|
| 1 | `status` is `loading` | loading |
| 2 | `status` is `error` | error |
| 3 | `status` is `empty`, or unknown | empty |
| 4 | `status` is `ready` and `items` is empty | empty (OP-37) |
| 5 | `status` is `ready`, `profile` non-null and non-empty (null or empty means no filter) and some `item.profileId !== profile` | loading, nothing announced (FR-032) |
| 6 | otherwise | ready |

Empty wording (CP-1): the headline is `profile` non-null: "No records for this profile"; else the plain wording. Whenever `skippedCount > 0` the skipped note ("in this project" wording) is appended, so the count is never hidden.

## Events

| Trigger | Event | Payload | Guard |
|---|---|---|---|
| Load more | `sk-load-more` | `{ cursor }` | `hasNextPage` true, cursor non-null, not `loadingMore`, cursor differs from the last requested cursor |
| First-page error retry | `sk-retry-load` | `{ target: 'ops-page' }` | error look |
| Load-more error retry | `sk-retry-load` | `{ target: 'ops-page', cursor }` | `loadMoreError` non-null, code not the cursor-refusal code, `pageInfo.nextPageCursor` non-null |
| Refresh from the newest | `sk-retry-load` | `{ target: 'ops-page' }` | `loadMoreError.code` is the cursor-refusal code |

If a retry has no cursor to send (`nextPageCursor` null with a non-refusal error), the control is inert and no event is built.

## Announcements (live region, polite)

| Shown change | Text |
|---|---|
| loading look entered (reason `status`) | "Loading invocation records" |
| ready look entered, or rows added | "{loaded} of {total} records loaded" (after a load-more: "{n} more records loaded") |
| empty look entered | the empty heading |
| load-more error appears | the load-more error sentence |
| error look | none (the alert speaks) |
| mismatched page (row 5) | none |
| same shown pair re-rendered | none |

## Focus

Rows are never focus targets. Document order: heading, Load more or the load-more error actions (the retry sits beside its notice, never in the notice's actions slot, which is out of the Tab order), retry. The header and the source notice are drawn in every look (OP-36); only the list region is replaced, so a non-ready look has no section heading and its own heading is the focus target. When the focused control is removed (the last page arrives, a state replaces the list), focus moves to the section heading, or to the state's heading in loading, empty and error, only if focus was inside the screen or on the body.

## Structural rules

No anchor, image, `src`, `href`, `srcset`, `unsafeHTML`, `unsafeSVG`, `innerHTML` is derived from an item. Evidence is a text binding in a mono span. Rows carry no `role` of button or link, no `tabindex`, no event listener.
