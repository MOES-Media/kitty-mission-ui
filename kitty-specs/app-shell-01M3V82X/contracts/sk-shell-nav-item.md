# Contract: `sk-shell-nav-item`

Pattern element (no `@screen`). Wraps a non-flush `sk-action-row` (route mode, keeps the forced-colours `Highlight` edge).

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `itemId` | `item-id` | `string` | `''` | echoed in the event |
| `label` | none | `string` | `''` | text in the row's `title` slot |
| `href` | `href` | `string` | `''` | |
| `icon` | `icon` | `ShellIcon` | `'file'` | `marker` slot |
| `current` | `current` | `CurrentMark` | `''` | `'page'` or `'true'` sets `selected` and `aria-current` |
| `compact` | `compact` | `boolean` | `false` | icon-only: label hidden by layout-only CSS, still the accessible name; shows the label bubble |

Bubble (R3, gap G-12): a local `sk-pill-tag` `aria-hidden` shown on hover and focus within; Escape hides it until the next
hover or focus; the pointer can enter it; it stays while hover or focus remains. The collapsed column must not clip it.

Event: `sk-navigate { id, href }` (`bubbles`, `composed`) for an unmodified primary click or Enter; the default is
cancelled; modified clicks emit nothing. `delegatesFocus` on; verified by test, fallback: focus the row's anchor
through the shadow chain.

Stories (6): current page, current true, not current, compact with bubble, long label, same label different id.
