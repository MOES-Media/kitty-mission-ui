# Contract: `sk-filter-toggle-group`

Pattern element (no `@screen`), file `src/elements/sk-filter-toggle-group/sk-filter-toggle-group.ts`. A generic single-choice toggle group: knows no vocabulary, receives options and a value. It is the ONE file with the native `<button aria-pressed>` exception (E-01, gap G-01) and adopts the library's `segmented-choice` stylesheet through `src/library-sheets.ts`.

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `options` | none | `FilterOption[]` | `[]` | `{ id, label }`; rendered in array order |
| `value` | `value` | `string` | `''` | the id of the pressed option; reflected; semi-controlled (a user press assigns it); an id that matches no option leaves none pressed |
| `label` | `label` | `string` | `''` | the accessible name of the group (`aria-label` on `role="group"`); a host-facing property the spec does not name: amendment proposal P-7 |

## Slots and parts

None.

## Events

| Event | Detail | When |
|---|---|---|
| `sk-filter-change` (`bubbles`, `composed`) | `{ filter }` (the pressed option's id) | a button that is not the pressed one is activated; pressing the pressed button emits nothing and changes nothing |

## Behaviour and semantics

- Markup: `<div class="sk-segmented-choice" role="group" aria-label=<label>>` of `<button type="button" class="sk-segmented-choice__item" aria-pressed="true|false">` with the option label as text. The class and the raw `<button>` are permitted in this file only by the per-file ESLint override, whose pattern allows nothing but `<button class="sk-segmented-choice__item" ...>` and `class="sk-segmented-choice"`.
- Exactly one button is pressed when `value` matches an option. Each button is its own tab stop; Enter and Space activate (native). No roving tabindex, no arrow-key handling (D-16).
- Long labels wrap through the library's `overflow-wrap: anywhere`; the group wraps (`flex-wrap` in the library CSS).
- Project CSS: `:host { display: block; min-width: 0 }` only.

## Stories (4, title `Mission/Filter toggle group`, 800 px default)

`AllPressed`, `StalePressed`, `LongLabels`, `SixOptionsNarrow` (a 320 px-wide container through a layout wrapper in the story).

## Tests (file `test/sk-filter-toggle-group.test.ts`)

Group role and name; one `aria-pressed="true"` for a matching value, none for an unknown value; activating another option emits `sk-filter-change` once (`events.length` equal to 1) with the id as a deep-equal detail `{ filter }`, `bubbles` and `composed` true, sets `value`, flips `aria-pressed`; activating the pressed option emits nothing, and that no-event test first proves its listener works (a positive control in the same test: the same listener receives the event when a different option is activated, so a listener on the wrong target or a misspelt name cannot make it pass); Enter and Space; focus order (each button a stop); a host assignment to `value` flips the state and emits nothing (same positive control); the event crosses a shadow boundary; options `x`, `y`, `z` that match no default render and press correctly (the element knows no vocabulary). The test quality rules of `research.md` D-34 apply.
