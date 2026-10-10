# Contract: `sk-open-project-dialog`

Optional element, host-placed. The host does the real folder picking and listing; the element only draws and reports.

## Properties

| Name | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `open` | `open` (reflect) | boolean | `false` | semi-controlled: the element sets it false on Cancel, Escape and backdrop click |
| `location` | `location` | string | `''` | shown in the read-only folder field |
| `folders` | none | `FolderEntry[]` | `[]` | host order |
| `selected` | none | `string \| null` | `null` | `location` of the selected folder; controlled by the host |
| `status` | `status` (reflect) | `ViewState` | `ready` | the folder listing |

## Events

| Event | Payload | Trigger |
|---|---|---|
| `sk-browse-folder` | `{ location }` | a folder option is selected (click, Enter, Space) |
| `sk-confirm-open-project` | `{ location }` | Open, only when the selected folder has `valid: true` |
| `sk-retry-load` | `{ target: 'folders' }` | retry on a failed listing |

Cancel, Escape and a backdrop click close the dialog and emit nothing.

## Behaviour

- Native `dialog`; `showModal()` when `open` becomes true; focus moves to the dialog's first control (the listbox's active option, else Cancel).
- Focus returns to the element active when it opened, if still connected.
- Listbox keyboard: ArrowUp, ArrowDown, Home, End move focus (a chord with Alt, Ctrl, Meta or Shift is left to the browser); Enter and Space select. The active option is dialog state: it follows the arrow keys and resets only when `folders` or `selected` changes.
- Focus is captured on every update; when an update detaches the focused control (Retry on a listing that starts loading), focus moves to the dialog's first control.
- Open is disabled unless the selected folder is valid; the reason is visible text next to the button, in reading order just before the actions. There is no `aria-describedby` on the `sk-button` host: the library button does not forward it to its inner control (asked upstream, spec-kitty-design#496).
- States: `loading` (busy list), `error` (danger notice with announce off, and retry; the polite region is the only announcer), `empty` (empty-folder word), `ready`. A visually hidden polite status region inside the dialog announces the state as shown ("Loading folders", the empty word, the error sentence, or the folder count).
- The folder field is a read-only `sk-form-input` if spike S2 shows it supports `readonly`; otherwise a labelled static text element (DP-12 amended).
- Valid folders carry a "valid project" `sk-pill-tag` (success) with its word; the badge appears on any valid folder, not only the selected one (DP-14).

## Part signature

`renderFolderList(ctx: { folders; selected; activeIndex; onSelect(location: string): void; onActive(index: number): void }): TemplateResult` in `folder-list-parts.ts`.
