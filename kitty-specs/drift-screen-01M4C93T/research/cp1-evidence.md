# CP-1 evidence packet: Drift screen (mission-ui#10), WP03 / IC-03a

Measured with a throwaway spike (library elements in the shell's project layout, `flush`), Chromium headless, dark theme, scale 1, same viewport on both sides.
Prototype = `06-drift.html`. Numbers are computed styles and bounding boxes from the page, not eyeballing.
Images: `ui10-wp03-shots/` (`proto-<w>.png`, `spike-<w>.png` with candidate grants, `raw-1280.png` library only, `side-by-side-<w>.png`, `side-by-side-1280-no-grants.png`; w = 1280, 1100, 800, 620, 390). Spike source copy: `ui10-wp03-shots/spike-src/` (deleted from the tree).
I looked at the 1280, 800 and 390 composites; the 1100 and 620 ones were produced and measured but not looked at.

## 1. What needs your ruling (forks)

| # | Fork | Recommended | Alternatives |
|---|------|-------------|--------------|
| F-1 | Copy field: library `sk-copy-field` or own `code` + `sk-button` (S1) | Own `code` + `sk-button`, E-38 re-scoped (below). Keeps Q5 (host owns the copy, `sk-copy-command`). File the library gap: no "request only" mode | (b) use `sk-copy-field`: zero style grants and looks nearly identical, but the element itself writes to the clipboard, so the host path (FR-015, FR-021, `copyResult`, NFR-005 wording) is dropped |
| F-2 | Lane table frame (S1/S4) | C: library `data-table` family + the shared type grants (mono, xs, eyebrow-style headers); accept library frame (zebra, horizontal rules only, no outer border) as new drift DD-22 | A: library as-is (3 more drifts, no grants); B: full restyle grant (about 14 declarations over a library family, not narrow) |
| F-3 | Button height (a11y-affecting). Rescan and Copy are 32 px high with the grants, prototype 44 px | Grant pinned `min-block-size: 44px` on `sk-button::part(button)` in this screen's file (E-10 precedent for a pinned px) | Accept 32 px (above WCAG 2.5.8 minimum of 24) |
| F-4 | Mission slug that cannot break (mono text in rows, header) | Mid-word wrap, keyword `overflow-wrap: anywhere` (E-21 precedent for Facts text). Full id stays readable and copyable | E-39 as written (ellipsis); nothing (measured overflow, see S2) |
| F-5 | List and detail scrolling independently inside the viewport (plan table) | Accept: the shell's content cell scrolls as a whole; both panes stretch to content. New drift DD-23 | Shell change request: `min-height: 0` on `main` and `[data-focus-target]` (measured: works, panes become 661 px = prototype's 661.2), but it edits the landed shell and can move #4/#5 baselines |
| F-6 | Panel label (authority panel and Facts panel) | Eyebrow in the `sk-section-header` eyebrow slot, name via `aria-labelledby` on that span (matches prototype, no extra grant beyond the shared eyebrow grant; panel measured 572 x 84.4 = prototype) | `h2` title per E-18 (4)(5) (as #5): drift from the prototype; keeps heading navigation |
| F-7 | Tone of the authority pill (prototype: green for the event log) | Neutral pill: no tone source in the contract, a green-per-authority table would be a literal in defaults | Add a tone to `AUTHORITY_WORDS` (event_log success, git neutral): invented mapping |
| F-8 | Head badge word | `error` (see section 6) | `disagreement`: inaccurate for `CORRUPT_JSON` errors |

Everything else below is recommended as "confirm" or "narrow grant" and needs only a yes.

## 2. Spikes

### S1 Library fit (question: does the pinned library ship table, listbox/option, copy field, split pane; which pill tones?)
- Measured (manifest and style families, plus rendered):
  - Ships: `sk-data-table` styles family (with `.sk-data-table__scroller`), `sk-copy-field` element (+ styles), `sk-action-row` (selectable), `sk-section-header`, `sk-notice`, facts family.
  - Does not ship: listbox/option, split pane.
  - `sk-pill-tag` `status` tones: neutral, info, success, attention, danger, recovery. Danger and attention colours equal the prototype's (computed bg `43,21,21` / text `233,115,115`, identical).
- Rule (research S1): E-36..E-38 are dropped where a family exists.
- Outcome per exception:
  - E-36 option: KEEP. No listbox. `sk-action-row` selectable keeps its trigger button in its own shadow root, so it cannot carry `role=option` (by inspection of its d.ts and styles; focus not run).
  - E-37 table scroll: DROP as an exception. The family's `.sk-data-table__scroller` already holds `overflow-x: auto`. The focus/region triad comes from the existing `OverflowRegion` (S4). Needs a `dataTableSheet` line in `library-sheets.ts` (shared file; change request for WP04).
  - E-38 copy field: element exists but does the clipboard write itself (reads `navigator.clipboard.writeText`, falls back to selecting its value, emits `sk-copy-field-result`). See F-1. Library copy field look measured: field 572 x 76, radius 12, border 1 px default, mono 14 px (prototype 572 x 68, same radius/border/mono, bg `38,44,54` vs library `28,31,37`).
  - E-36's severity badge tones: no exception needed beyond pill grants (below).

### S2 Layout thresholds (question: content cell widths in the project layout)
Cell = width of the screen host in the shell (`flush`). Tier breaks at 1100 and 720 (shell).

| viewport | tier | cell | detail pane if two-pane |
|---|---|---|---|
| 1440 | expanded | 1200 | 780 |
| 1280 | expanded | 1040 | 620 |
| 1100 | expanded | 860 | 440 |
| 1099 | collapsed | 1043 | 623 |
| 900 | collapsed | 844 | 424 |
| 800 | collapsed | 744 | 324 |
| 720 | collapsed | 664 | 244 |
| 719 | mobile | 719 | n/a |
| 620 | mobile | 620 | n/a |
| 390 | mobile | 390 | n/a |

- Forced two-pane (420 px track) with 40 rows and an unbreakable WP id:
  - cell 804 (detail 384), 764 (344): no horizontal overflow of the table.
  - cell 744 (324): table scroller engages. cell 704 (284): same.
  - cell 664 (244): the detail itself overflows. No page overflow at any width tested.
- Decision rule: the 420 track survives at 1100 (cell 860, detail 440). One column below a cell of 800 (list 420 + 1 + detail 380, the prototype's own two-pane minimum; first scroller at 744).
- Recommendation: `@container (max-width: 799px)` one column, plus `:state(shell-mobile)` as D-06. Not #5's 848/688. Every stack `grid-template-columns: minmax(0, 1fr)` (done in the spike).
- Also measured (shell, not a threshold): `main` has no `min-height: 0`, so the content cell scrolls as a whole (F-5).

### S3 1000 options (question: cost, focus, roving tabindex)
- 1000 `button role=option`, each with an `sk-pill-tag`, Lit `repeat`, one tab stop:
  - initial render + forced layout: median of 5 = 32.5 ms Chromium, 42 ms Firefox.
  - selection change + forced layout: median of 40 = 0.4 ms Chromium (max 2.4), 2 ms Firefox (max 6).
  - budget NFR-006 is 200 ms.
- Focus: a host-driven selection change did not move focus (option 930 kept focus after setting the selection to 500). Tab stops = 1 (roving).
- Keyboard (spike, 900 px): ArrowDown x3 wraps a to b to c to a; End goes to c; Home to a; ArrowUp wraps to c; focus and selection moved together, 6 events for 6 keys.
- Rule: no virtualization unless S3 forces it. It does not (about 6 times under budget). D-02, D-03, D-04 stand.
- Not measured: paint/raster cost (headless), a full screen with 1000 rows plus detail, WebKit.

### S4 Lane table at 620 with 40 rows and a long WP id
- Library table family, 40 rows, unbreakable 70-character WP id: table 717 px in a 570 px scroller (620 and 1280 viewports) and 340 px at 390. It overflows even at 1280, so the scroller matters in practice.
- `OverflowRegion` reuse: the `role=region`, `aria-label` and `tabindex=0` triad was present only while overflowing; absent for the 3-row table at 620 and 1280 (no dead tab stop).
- Hyphenated ids wrap at the hyphens and the 3-column table fits down to a 309 px scroller.
- Recommendation: E-37 dropped (S1). Reuse `OverflowRegion` as D-07 says.

### S5 Selection inside a shadow root
Routes written as product code, checked as written:

| route | `lint:no-io` | `tsc` | works (Chromium and Firefox) |
|---|---|---|---|
| `getSelection()` (bare global) | pass | pass | yes |
| `node.ownerDocument?.getSelection()` | pass | pass | yes |
| `document.getSelection()` | pass | pass | yes |
| `globalThis.getSelection()` | FAIL (bare global-object rule) | pass | n/a |
| `(root as ShadowRoot).getSelection()` | pass | FAIL (TS2339, not in lib.dom) | n/a |

- In Chromium and Firefox, `setBaseAndExtent` on the `code` text node inside the shadow root gives `selection.toString()` equal to the command (80 chars); `rangeCount` 1; a native Ctrl+C fires `copy` with the same 80 characters.
- WebKit (engine nearest to the Desktop webview): NOT MEASURED. The Playwright WebKit build will not launch on this machine (missing system libraries). The Desktop webview engine itself is also not measured.
- Recommendation: `document.getSelection()` (simplest, passes both gates). Read back `selection.toString()` and compare with the command, as the library's own copy field does. Fallback, recorded not silent: if the read-back differs, the live region says "Select the command and copy it with your keyboard." (it must not claim the command is selected).

### S6 Panel and selected-row tokens
- Authority panel with `sk-card` + `sk-section-header` eyebrow slot, E-18 (1)(2)(3) values (border width, radius, padding) and row gap 0: 572 x 84.4, equal to the prototype `.panel` (572 x 84.4), same border (1 px), radius 12, padding 20.
- Selected row: background `--sk-surface-pill` = `33,40,48` equals the prototype exactly. Hover `--sk-surface-card` equals the prototype. Marker: token `--sk-border-selected` (`214,214,218`) exists, contrast 10.3:1 on the selected background; `--sk-border-strong` is only 1.34:1, so do not use it. (Prototype's danger marker is DD-15.)

## 3. Drift register DD-1..DD-21

| ID | Recommendation | Evidence/notes |
|---|---|---|
| DD-1 | confirm | |
| DD-2 | confirm | severity word; `sourceCode` as quiet tag (DR-32) |
| DD-3 | confirm | head row outside the listbox measured equal (419 x 57.4 vs 59; same padding and rule) |
| DD-4 | confirm, word `error` (F-8) | |
| DD-5 | confirm | copy |
| DD-6 | confirm | |
| DD-7 | confirm | |
| DD-8 | confirm (+F-4) | |
| DD-9 | confirm (+F-2) | |
| DD-10 | confirm | |
| DD-11 | confirm | |
| DD-12 | confirm | |
| DD-13 | confirm | spike shows relative text |
| DD-14 | confirm | but see N-6 (the prototype's "quiet" button is bordered) |
| DD-15 | confirm, token `--sk-border-selected` | S6 |
| DD-16 | confirm (depends on F-1) | |
| DD-17 | confirm | S6: panel equal with E-18 (1)-(3) |
| DD-18 | confirm, judged at Storybook review | |
| DD-19 | confirm, numbers from S2 | track 420 measured equal; one column below cell 800 |
| DD-20 | confirm | |
| DD-21 | confirm | |

## 4. Exceptions E-35..E-39 and the E-18 extension (exact proposed values)

All token-only except the pinned literals named. Each lives in the file named; sunsets are library issues you allocate (none invented here).

- **E-35 (keep).** Layout file only.
  - `grid-template-columns: 420px minmax(0, 1fr)` (pinned `420px`, px allowed for that property only).
  - `border-inline-end: var(--sk-border-width-1) solid var(--sk-border-default)` on the list.
  - `@container (max-width: 799px)` and `:host(:state(shell-mobile))`: `grid-template-columns: minmax(0, 1fr)`, list border dropped.
  - Sunset: list-detail pane in the design library.
- **E-36 (keep).** `list-parts.ts`, the finding option as a raw `button` with `role=option`.
  - Reset: `border: 0`, `background: transparent`, `color: inherit`, `text-align: start`, `inline-size: 100%`.
  - Paint: `border-block-end: var(--sk-border-width-1) solid var(--sk-border-default)`; `border-inline-start: var(--sk-border-width-2) solid transparent`.
  - `[aria-selected='true']`: `border-inline-start-color: var(--sk-border-selected)`, `background: var(--sk-surface-pill)`.
  - `:hover`: `background: var(--sk-surface-card)`.
  - Forced colours: `Highlight` on the marker.
  - Sunset: listbox/option element.
- **E-37 (drop as written).** Replaced by the library data-table family plus `OverflowRegion`. If you take F-2 option C, reuse the number for the screen type and paint grant below (the operator allocates; an unused number may stay unused).
- **E-38 (re-scoped, F-1 recommended).** `resolution-parts.ts`.
  - Wrapper: `border: var(--sk-border-width-1) solid var(--sk-border-default)`, `border-radius: var(--sk-radius-md)`, `background: var(--sk-surface-muted)`.
  - Command `code`: `font-family: var(--sk-font-mono)`, `padding: var(--sk-space-3) var(--sk-space-4)`, `overflow-wrap: anywhere` (wrap, as the prototype; not scroll).
  - The measured 80-character command is 672 px wide against a 572 px detail at 1280, so a no-wrap field would scroll in the common case.
  - Copy button stays a library pill (prototype: flat full-height cell; closing that needs radius 0, a start border and `min-inline-size: 88px`, not recommended).
  - Sunset: a request-only copy field in the library.
- **E-39 (F-4).** Either `overflow-wrap: anywhere` (recommended) or `text-overflow: ellipsis; overflow: hidden; white-space: nowrap`, on the slug in rows and header only, keyword values.
  - Measured: a hyphenated 80-character slug breaks at hyphens; no rule needed. An unbreakable 80-character one gives an option 797 px wide in a 417 px column, so the list scrolls sideways.
- **E-18 extension (confirm).** Add this element's `panel-parts.ts`, same sunset (#516). Properties used: border width, radius, padding, header `row-gap: 0`, header margin 0. (4) and (5) title bits are unused if you take F-6 eyebrow form.

### New narrow grants that close measured differences (proposed, recommended)
Each is shown closing its measurement. Scope: the Drift screen's own part files (stylelint file-scoped). Proposed to live under E-37's number or a number you allocate.

| Grant | Declarations (all `var(--sk-*)` unless marked) | Measured result |
|---|---|---|
| G-1 screen type | `font-size: var(--sk-text-sm)`; `line-height: 1.5` (pinned literal, no token) | library text is 16 px / normal everywhere; with grant option, slug, title, explanation heights equal the prototype |
| G-2 mono and muted | `font-family: var(--sk-font-mono)` on slug, last scan, command, table cells, Facts values; `color: var(--sk-fg-muted)` on slug, subtitle, explanation, last scan | fonts and colours equal on slug, last scan (width differs only by text) |
| G-3 eyebrow | mono, `--sk-text-xs`, `--sk-weight-semibold`, `letter-spacing: 0.08em` (extends E-09's pinned literal to these files), `text-transform: uppercase`, `color: var(--sk-fg-subtle)` | head, kicker, "Suggested resolution" eyebrows: font, size, weight, tracking, case, colour equal |
| G-4 pill | on `sk-pill-tag::part(tag)`: mono, `--sk-weight-normal`, `padding: var(--sk-space-1) var(--sk-space-2)`, `border: var(--sk-border-width-1) solid currentcolor`, `line-height: 1.2` (pinned) | row and kicker pills: width, height, font, padding, border, radius all equal (danger 54 x 24.4) |
| G-5 header band | `sk-page-header::part(header)` padding `var(--sk-space-4) var(--sk-space-6)`; `::part(text)` `row-gap: 0`; subtitle `margin-block-start: var(--sk-space-1)`; h1 display face, `--sk-text-2xl`, `letter-spacing: -0.01em`, `line-height: 1.2`, `color: var(--sk-fg-default)`; band `border-block-end: var(--sk-border-width-1) solid var(--sk-border-default)` | band 85.8 + 1 rule = 86.8, prototype 86.8; h1 equal in font, size, tracking |
| G-6 detail title | display face, `--sk-text-lg`, `--sk-weight-bold`, `line-height: 1.3` (pinned), `color: var(--sk-fg-default)` | before the 1.3 line-height was added: font and size equal, height 27 vs 23.4. NOT re-measured after adding it |
| G-7 buttons | `sk-button::part(button)`: `font-size: var(--sk-text-sm)`, `font-weight: var(--sk-weight-semibold)`, `padding: var(--sk-space-2) var(--sk-space-4)`; variant `secondary` (library `ghost` is borderless) | Rescan 84 wide = prototype; height 32 vs 44 (F-3), text colour `255` vs `214` |
| G-8 Facts | `dt` `--sk-weight-normal`; `dd` mono `--sk-text-sm` | library: dt 500, dd Inter 16; prototype dt 400, dd mono 14. Prototype Facts are in a hidden panel: styles read, geometry not measured |

Table (F-2, option C, recommended): G-2 plus th as G-3 with `letter-spacing: 0.06em` and `padding: var(--sk-space-3)`; measured th typography equal. Not closed on purpose: zebra, no vertical rules, no outer border, library hover brightness.

Without any grant the library-only render at 1280 (`raw-1280.png`) differs on every row above: body 16 vs 14 px, h1 32 vs 24 px Inter vs display face, pills 26 vs 24.4 px with no outline, header band 166.9 vs 86.8 px.

## 5. Spec amendments proposed

- A-1 (applied already): the nav item exists; story only.
- A-2 keep: null `remedy` on an `error` finding draws nothing.
- A-3 FR-032 and the exception table: E-37 dropped (S1), E-38 re-scoped, E-39 per F-4, grants G-1..G-8 added, E-18 extended.
- A-4 DR-27..DR-29 and DD-19: one column below a container width of 800 (S2); DR-27 (1100) stays two panes.
- A-5 (only if F-1 option b): FR-015, FR-021, NFR-005 wording and the `copyResult` property are reworded or dropped.
- A-6 plan table "list scrolls inside its column": reworded per F-5.
- A-7 `contracts/defaults.md`: add `SEVERITY_WORDS` use for the head badge (no new word); add the manual-selection fallback sentence from S5.

## 6. Head badge word
The screen reads the severity word (`error`); the prototype reads "disagreement". Recommend `error`.
- "disagreement" is the prototype's word for a status finding; it is wrong for `CORRUPT_JSON` and for a missing file, both `error`-capable.
- It would need a fixed literal in defaults keyed on the danger tone, a claim the contract does not make.
- `error` is data-driven, matches the row badges and passes the data-driven gate.
- Alternative: roll-up text "N errors" in the badge (`SEVERITY_ROLLUP_TEXT` exists).

## 7. New differences not in the register (all measured)

| ID | Difference | Proposed |
|---|---|---|
| N-1 | Base type 16 px / normal line-height vs 14 px / 1.5 | G-1 |
| N-2 | Mono and muted colours on slug, last scan, command, cells | G-2 |
| N-3 | Eyebrow style | G-3 |
| N-4 | Pill outline, mono, weight 500 vs 400, padding 12 vs 8 | G-4 (#4's CP-1 accepted filled pills; your standing preference is the grant) |
| N-5 | Header band spacing and h1 face/size (28-32 px library vs 24 px display) | G-5 (#4 N-1 accepted the library header) |
| N-6 | Rescan: prototype "quiet" button is bordered, 84 x 44, 14 px / 600; library `ghost` is borderless (122 x 42) | G-7, variant `secondary`, F-3 |
| N-7 | Lane table frame: library has zebra, horizontal rules only, no outer border, sans cells | F-2 (DD-22 if C) |
| N-8 | Copy field: prototype wraps the command and has a flush full-height Copy cell; plan says scroll | F-1, E-38 |
| N-9 | Panel label eyebrow vs title; authority pill tone | F-6, F-7 |
| N-10 | Independent column scroll not available in the shell | F-5 (DD-23 if accepted) |
| N-11 | Table has no visible caption (prototype none); name via `aria-label` | no action; the library example uses `<caption>`, we do not draw it |
| N-12 | Shell chrome (collapsed rail at 720-1099, icons, project block) differs from the prototype's stacked sidebar | pre-existing, #4's accepted shell; not Drift's |

## 8. Not measured or not done
- WebKit and the Desktop webview (S5, S3).
- Paint cost, hover and focus-ring pixels, forced colours, 200% text.
- Facts panel geometry on the prototype side (hidden element).
- The G-6 heading height after the `line-height: 1.3` edit.
- `sk-action-row` focus behaviour (inspection only).
- `lib-copy` flow end to end in the screen (the host path was not built).
- Stylelint acceptance of G-1..G-8 as written was not run (the spike CSS lived outside the lint scope); WP04 must prove each entry with allowed, refused-sibling and refused-value cases.
