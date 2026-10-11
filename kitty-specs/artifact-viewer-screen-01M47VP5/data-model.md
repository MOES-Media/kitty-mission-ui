# Data model: Artifact Viewer screen

## Contract types the screen reads (generated, never hand-copied)

From `src/contract/types.generated.ts` after the IC-01a re-vendor: `ArtifactListing` (`missionId`, `entries`, `truncated`), `ArtifactEntry` (`path`, `kind`, `sizeBytes`, `modifiedAt`, `readable`), `ArtifactContent` (`path`, `kind`, `mediaType`, `encoding`, `sizeBytes`, `redacted`, `content`), `ArtifactKind` (twelve values), `ArtifactRefusal` (a `Problem`; `code`, `status`, `title`, `detail`). Response schemas are closed. The vocabulary is `x-provisional`: kinds, the seven codes and `redacted` pass through and are worded only by `defaults/`.

## View types (hand-written, `src/contract/types.ts`; widening only, no member named like a kind, lane or phase)

| Type | Shape | Notes |
|---|---|---|
| `ArtifactListingView` | `ArtifactListing` with `entries` typed as `ArtifactEntryView[]` | `ArtifactEntryView` is `ArtifactEntry` with `kind: string` (the unknown-kind overlay is a supertype use, not a cast) |
| `ArtifactContentView` | `ArtifactContent` with `kind: string` | same |
| `ArtifactScreenMission` (host prop `mission`) | `{ missionId: string; slug: string; friendlyName?: string \| null; missionType?: string \| null; topology?: string \| null; targetBranch?: string \| null; lifecycleStatus?: string \| null }` | a structural subset of `MissionDetail`: the host may pass a `MissionDetail` as is. `slug` feeds `sk-open-mission`; every other field is a Mission fact row shown only when present |
| `ArtifactScreenWorkPackage` (host prop `workPackages`) | `{ wpId: string; title?: string \| null }` | a structural subset of `MissionDetail.workPackages[]` |

## Screen properties (the public surface, THIRTEEN properties, frozen in IC-06b; attributes in `contracts/sk-artifact-screen.md`)

FR-001 names twelve; the thirteenth, the optional `vocabulary`, is amendment A-9 (PLAN-DESIGN-022 (a), ruled 2026-10-06).

| Property | Type | Default | Meaning |
|---|---|---|---|
| `status` | `ArtifactStatus`: `'loading' \| 'ready' \| 'empty' \| 'error' \| 'not-found' \| 'nothing-selected'` (`VIEW_STATES` plus two) | `loading` | state of the listing and the screen; an unknown value collapses to `empty` (`normaliseArtifactStatus`) |
| `contentStatus` | `'loading' \| 'ready' \| 'refused' \| 'error'` | `ready` | state of the open document only; an unknown value collapses to `ready` |
| `listing` | `ArtifactListingView \| null` | `null` | the listing (tree data, sizes, kinds, link targets, `truncated`) |
| `content` | `ArtifactContentView \| null` | `null` | the open document |
| `refusalCode` | `string \| null` | `null` | the `code` of a refused content read (any string; unknown codes show raw) |
| `selectedPath` | `string` | `''` | the open path (while loading and for the refusal block) |
| `mission` | `ArtifactScreenMission \| null` | `null` | host Mission facts and identity |
| `workPackages` | `ArtifactScreenWorkPackage[]` | `[]` | host Work Package ids, for matching and for non-WP kinds |
| `view` | `'rendered' \| 'raw'` | `rendered` | seeds the selected tab; a tab change is internal state (no event); an unknown value collapses to `rendered` |
| `now` | `string \| null` | `null` | host clock for "modified" |
| `labels` | `ArtifactLabelHooks \| null` | `null` | `ArtifactLabelHooks extends LabelHooks` (`logic/artifact-types.ts`) with the optional hooks `kind(kind)`, `refusal(code)`, `mediaType(type)`, `size(bytes)`; the shared `LabelHooks` of #4 is not edited |
| `errorMessage` | `string` | `''` | host-neutral message for `status: 'error'` and `contentStatus: 'error'` |
| `vocabulary` | `ArtifactVocabulary \| null` | `null` | the one optional STRUCTURAL input (A-9): the kind table (label and icon), the kinds that link a Work Package, the container segment and token separator, the markdown media type and the budget. `null` means the `defaults/` values; a partly filled value is completed PER GROUP against `defaults/` (five groups: the kind table, the Work Package link kinds, the container segment with the token separator, the markdown media type and the budget; a group that is present is used as given, whole and not merged key by key; an absent group takes the `defaults/` value; `{}` equals `null`; the copy of `artifact-copy.ts` is NOT a member (PLAN-FRESH4-007 (b)): its strings are read from `defaults/` directly and a string-level override goes through the `labels` hooks). The functions that read a member take the resolved vocabulary as an argument (`labels` stays the string-level override; the refusal table, the media-type words, the link schemes, the bidirectional code points and the size units are NOT members, so a foreign refusal code goes through `labels.refusal`, which replaces the eyebrow). The type lives in `logic/artifact-types.ts` (IC-02). |

`ARTIFACT_STATUSES` is `VIEW_STATES` of `view-state.ts` spread into a list typed `readonly ArtifactStatus[]` in `logic/artifact-status.ts`; `view-state.ts` is not edited (it is #4's file).

No property is named like a kind, lane, phase or code. `view` has two structural values. The three enumerated properties are normalised by the screen's own functions (`logic/artifact-status.ts`), one closed list each; `normaliseViewState` of #4 is not used.

## Derived read models (pure, in `logic/`)

### `ArtifactView` (output of `resolveArtifactView`, `logic/artifact-view.ts`): what the document pane shows
`{ pane: 'listing-state' | 'nothing-selected' | 'loading' | 'refusal' | 'error' | 'empty-file' | 'document'; tabs: 'two' | 'none'; body: 'rendered' | 'fallback' | 'raw'; markdown: boolean; redacted: boolean; bidiControls: number; errorText: string | null }`. `bidiControls` is the count of bidirectional control characters in `content.content` (code points from `defaults/markdown.ts`, `countBidiControls`); the raw and fallback source blocks show their quiet notice (an `sk-notice` of tone `info`) when it is above 0 (PLAN-SECURE-009, DA-41). `needsHiddenHeading(view, tab)` (same file) says whether the pane has no `h1` of its own (a raw-only file, the Raw tab, the fallback, the empty file, the loading look) so the screen draws the visually hidden `h1` (PLAN-A11Y-005); a rendered markdown body keeps the headings it was authored with, and every state and refusal title is an `h1`. `markdown` is `mediaType` equal to the data constant only; the `MarkdownResult` the resolver receives comes from `markdownFor(content)`, which returns `null` unless the media type is the markdown constant, so the screen compares no media type and never parses a non-markdown file.

The mapping is TOTAL over (`status`, `selectedPath` empty, `contentStatus`, `content` null, `refusalCode` null, `errorMessage` empty); the first matching row wins; IC-02 has one unit test per row (9a and 9b are two rows, and 9a is a unit case built inline from `contentEmpty` with the markdown media type, not a new fixture):

| # | `status` | `selectedPath` | `contentStatus` | `content` | other | `pane` |
|---|---|---|---|---|---|---|
| 1 | `loading`, `error`, `empty`, `not-found`, or `ready` with `listing` null | any | any | any | any | `listing-state` (the screen's status switch draws it; `ready` with a null listing shows the loading look) |
| 2 | `nothing-selected` (any path), or `ready` with an empty path | any, or empty | any | any | any | `nothing-selected` |
| 3 | `ready` | set | `loading` | any | any | `loading` |
| 4 | `ready` | set | `refused` | ignored, never shown (even when set, FR-015) | `refusalCode` null | `refusal`, the generic sentence (`resolveArtifactRefusal(null, ctx, hooks)`), not retryable |
| 5 | `ready` | set | `refused` | ignored | `refusalCode` set (known or unknown) | `refusal`, the table row or the raw code with the generic sentence; Retry only for `artifact_unreadable` (`artifact_listing_unreadable` is not retryable here: the listing failure is `status: error`, AV-14, Retry `target: 'listing'`) |
| 6 | `ready` | set | `error` | ignored | `errorMessage` empty | `error`, `errorText` = `CONTENT_ERROR_DEFAULT`, Retry |
| 7 | `ready` | set | `error` | ignored | `errorMessage` set | `error`, `errorText` = `errorMessage`, Retry |
| 8 | `ready` | set | `ready` | null | any | `loading` (the spec edge case: a listing and a selected path with no content yet) |
| 9a | `ready` | set | `ready` | `content === ''` and `sizeBytes === 0`, markdown media type | any | `empty-file`; `tabs: 'two'`, `body: 'raw'` (no rendered DOM and no notice: both tabs draw the same empty-state form, "This file is empty.", spec edge case); the header and the inspector stay |
| 9b | `ready` | set | `ready` | `content === ''` and `sizeBytes === 0`, any other media type | any | `empty-file`; `tabs: 'none'`, `body: 'raw'`; the empty-state form; the header and the inspector stay |
| 10 | `ready` | set | `ready` | present | any | `document` |

For `document`: a non-markdown file has `tabs: 'none'` and `body: 'raw'`; a markdown file has `tabs: 'two'`, `body` is `rendered` or `fallback` per the model result, (the `raw` tab always works). The resolver does not output the selected tab: which of the two panels is shown is state held by `sk-artifact-screen.ts` (seeded by `view`, reset on a path change, changed by `onSelect`; `contracts/sk-artifact-screen.md` rule 1), and the resolver says only whether tabs exist and what body each draws.

### `MarkdownResult` (output of `buildMarkdownModel`, `logic/markdown/model.ts`)
`{ kind: 'ok'; blocks: Block[] } | { kind: 'fallback'; reason: 'error' | 'budget' | 'too-complex' }`. The node union is closed (`contracts/markdown-renderer.md`); it contains text and structure only: no URL, no attribute map and no free-form string that reaches an attribute other than a link or image destination string (kept as a plain string for `classifyLink` and `title`) and the integer `start`.

### `ArtifactTreeResult` (`logic/artifact-tree.ts`)
`{ nodes: TreeNode[]; current: string }`; nodes are the shell's `TreeNode`; `current` is the id of the selected leaf or `''`. A leaf whose entry is not readable has `unavailable: true` and `meta: UNAVAILABLE_TEXT`, because the shell draws only `node.meta` beside the label and no other step supplies the word. When the SELECTED leaf is unavailable, `current` is `''` (PLAN-DESIGN-005 (b)): the shell then keeps `aria-current` on the nav item and the pane still shows the refusal. The result is memoised by the host on `entries` and `selectedPath`; the host never writes `sk-tree-toggle` back to the shell tree (PLAN-DESIGN-006 (a)) but keeps a read-only `Set` of toggled folder ids, passed as `expandedIds` on the next rebuild, so an opened folder stays open after a selection change (PLAN-FRESH3-008 (b)). `pathOfArtifactNode(id)` is the inverse of the leaf id.

### `LinkTarget` (`logic/markdown/links.ts`)
`{ kind: 'artifact'; path: string; entryKind: string } | { kind: 'external'; href: string } | { kind: 'inert' }`, produced by `classifyLink(destination, openPath, kindOf)` with `kindOf` a `ReadonlyMap` from listing path to entry kind. `resolveLinks` writes one `target` into every link and image node of the model, in the cached step, so the renderer only draws (`contracts/markdown-renderer.md`).

### `WorkPackageMatch` (`logic/artifact-wp.ts`)
`matchWorkPackage(path, kind, workPackages): { wpId: string } | null`. Applies only to the kinds in `WORK_PACKAGE_LINK_KINDS`; the id is the first path segment after the data-held container segment, matched as a leading token (segment without extension equals the id, or starts with the id and the separator); the longest matching id wins; no match is `null`. For every other kind the linked Work Packages are the host list, unfiltered.

### `ArtifactFacts` (`logic/artifact-facts.ts`)
`{ file: Fact[]; mission: Fact[]; redactedNote: boolean }` where `Fact = { label: string; value: string; mono?: boolean }`. File facts always: Kind (word from `defaults/`, raw when unknown), Media type (word or raw), Size (`formatArtifactSize` of the listing entry, else of `content.sizeBytes`), Modified on this host (`resolveActivity(entry.modifiedAt, now, hooks)` of `logic/time.ts`: the `time` hook, else `relativeTime` against `now`, else the ISO string; the row is omitted when there is no listing entry, and this mission adds no time logic), Path (full), Redacted (yes or no word). Mission facts: Mission (`friendlyName`, else `slug`), Type, Topology, Target, Status (the lifecycle word as given), each only when present; the group is empty and hidden when none. "authoritative" has no source and is not produced. The document eyebrow (the kind word above the document title, DA-14) is the same Kind word, resolved once and handed to `renderDocument` as `DocumentView.eyebrow` (PLAN-FRESH4-001).

## Vocabulary tables (`src/defaults/`; every value read through `lookup`, raw fallback)

See `contracts/defaults.md`. `ARTIFACT_KIND_WORDS` (twelve keys, one structure `{ label, icon }`; the icons are `ShellIcon` members, `magnifier` for research and `table` for the data model, added by this mission, and `file` for the rest), `MEDIA_TYPE_WORDS`, `ARTIFACT_REFUSALS` (seven keys: `eyebrow`, `sentence(context)`, `retryable`), `MARKDOWN_BUDGET`, `EXTERNAL_LINK_SCHEMES`, copy constants. A value that is not a key shows raw (FR-030, FR-031).

## Events (declared once each with `@fires`, literal dispatch in the screen file)

| Event | Payload | Trigger |
|---|---|---|
| `sk-select-artifact` | `{ missionId, path, kind }` | internal markdown link (EV-1); `kind` is the listing entry's kind |
| `sk-open-link` | `{ href }` | external markdown link (EV-2); the `href` is untrusted document content and the host MUST re-validate the scheme (`contracts/sk-artifact-screen.md`, Events) |
| `sk-select-work-package` | `{ missionId, wpId }` | a linked Work Package pill or "Open Work Package" (EV-4) |
| `sk-open-mission` | `{ missionId, slug }` | "Return to Pipeline" (EV-5, N-Q10) |
| `sk-retry-load` | `{ missionId, target: 'content', path }` or `{ missionId, target: 'listing' }` | Retry (EV-6, EV-7); typed as the union of #5's `RetryLoadDetail` and `SkArtifactRetryDetail`, declared once in the neutral `src/retry-types.ts` (A-3) |

The screen emits neither `sk-navigate` nor `sk-tree-toggle` (the shell's, EV-9), and re-emits no `sk-open-artifact` (EV-8). `missionId` comes from one builder: `mission.missionId`, else `listing.missionId`, else the control is inert. Payload rule for the `path` of a content retry: `selectedPath`, else `content.path`.

## State and transitions

The element is stateless except: the selected tab (seeded by `view`, reset when `view` changes or when the open path changes to a different path; held by `sk-artifact-screen.ts`), the three caches of `contracts/markdown-renderer.md` (the markdown model keyed by the value of `content.content` and `content.mediaType`, the path-to-kind map keyed by the listing, the resolved tree), the `overflowing` set fed by the package's `OverflowRegion` (extended to several targets and both axes by IC-06b; the scroll elements that currently overflow, which are the only scroll regions that are tab stops; it measures on every update and after the fonts are ready), and focus. Every interaction is an event out. No lifecycle transition exists in the screen (C-003).

## Traceability seeds (fixtures to rows): see `contracts/contract-pin.md`

## Rulings that touch the data shapes

N-Q10: `mission.slug` is required for the return event. N-Q11: `workPackages` ids drive matching, no pattern in the screen. N-Q12: the link table in `contracts/markdown-renderer.md`. Q9: no virtualisation; the tree is plain nodes.
