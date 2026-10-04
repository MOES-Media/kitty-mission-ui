# Contract: `sk-phase-bar`

Pattern element (no `@screen`), file `src/elements/sk-phase-bar/sk-phase-bar.ts`. Renders the phases it receives, in array order and in whatever number. Display only: no events. Never contains a phase name, a phase count or an order (FR-013, FR-014, C-007; gate `data-driven`).

## Properties

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `phases` | none | `PhaseView[]` | `[]` | `{ name: string, status, basis }`; the name is a string, not the contract enum |
| `labels` | none | `LabelHooks \| null` | `null` | only `phase` is read, through `resolvePhaseLabel`: `hook?.(name) ?? lookup(DEFAULT_PHASE_LABELS, name) ?? name` |
| `label` | `label` | `string` | `'Mission phases'` (from `PHASES_LABEL` in `defaults/pipeline-copy.ts`) | accessible name of the list; a host-facing property the spec does not name: amendment proposal P-7 |

## Slots and parts

None.

## Events

None.

## Semantics and rendering

- `<ol aria-label=<label>>` with one `<li>` per phase in array order. Each item holds a `sk-status-indicator` whose `tone` comes from `PHASE_TONE[state]` where `state = phaseState(status)` (complete success, in progress info, pending neutral), a decorative `marker` slot glyph `PHASE_GLYPH[state]` (check mark for done, a bullet for current, empty for pending; all in `defaults/phases.ts`), the phase label in the default slot and a layout-hidden status word `PHASE_STATUS_TEXT[state]` (a `Record<PhaseState, string>`; an unknown status is already pending through `phaseState`, so it reads the pending text) so assistive technology reads "Specify, complete". Only the FIRST item whose state is current (array order, the one the inspector names, FR-019) carries `aria-current="step"`; a later in-progress item keeps its status text but is not marked current (landing fold C-04). The element file contains no comparison with a `PhaseState` or a phase status (`state === 'done'` would be a gate `data-driven` finding): every state-dependent choice is a table read indexed by `state`.
- Empty `phases`: renders an empty list (the owning screen decides what to show).
- Connector and dot geometry: per spike S2 (D-17). Pre-decision B: connector and dot painted in this file with token values only under exception E-04, which exists only if S2 selects it; otherwise A (no connector, a drift entry) or C (`<hr>` connectors).
- Layout: a flex row that wraps (`flex-wrap`), each item `flex: 1 1 0`; no media queries; long labels wrap.

## Stories (4, title `Mission/Phase bar`, 800 px default)

`Default` (done, done, done, current, pending, the five default names), `AllPending`, `ThreeUnknown` (3 phases, names the screen has never seen), `SevenUnknown` (7 phases).

## Tests (file `test/sk-phase-bar.test.ts`)

Array order and count for 5, 3 and 7 phases with unknown names (rendered `li` count asserted with equality: 5, 3, 7; for 7 phases every item's bounding box lies inside the list's box, so the layout, not only the DOM count, is exercised); label by hook, by default, by raw name (including a phase named `constructor`); glyph and status text per state; unknown status renders as pending with the pending text (the unknown status word is not shown); `aria-current="step"` on the current item(s) only (asserted on every item, with the exact set of indexes); two in-progress phases both current; empty `phases` renders an empty list; no phase name literal in the element file (the gate, not this test). The test quality rules of `research.md` D-34 apply.
