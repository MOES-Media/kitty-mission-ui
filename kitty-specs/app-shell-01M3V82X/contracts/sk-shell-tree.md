# Contract: `sk-shell-tree`

Pattern element slotted as `slot="sidebar-section"`.

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `heading` | none | `string` | `''` | `sk-section-header` title slot |
| `label` | `label` | `string` | `''` | accessible name of the group |
| `items` | none | `TreeNode[]` | `[]` | replacing the array resets folder state |
| `current` | `current` | `string` | `''` | selected leaf id; empty marks none |

Leaves: non-flush `sk-action-row` route rows; the selected leaf has `aria-current="page"`; `unavailable` renders no link.
Folders: native `<details>`/`<summary>` (exposes `aria-expanded` natively; no lint exception, evidence in research D-04;
sunset library G-05); nested leaves inside. Folder state is semi-controlled: starts from `expanded`, toggled by the user.
Long names wrap (library row behaviour). The tree scrolls inside the sidebar, never the content.

Events (`bubbles`, `composed`): `sk-navigate { id, href }` (leaf), `sk-tree-toggle { id, expanded }` (the requested state,
from the `toggle` event, only when the state differs from the rendered model; no event on first render or `items` reset). Default summary focus ring kept, marker hidden (G-05). `sk-action-row-activate` is stopped here.

Stories (5): work packages selected, none selected, artifacts folder expanded, folder collapsed, long names.
