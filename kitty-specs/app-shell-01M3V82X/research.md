# Research: App shell with all its states

Mission `app-shell-01M3V82X`. Branch contract: planned on `feat/app-shell`, merging into `feat/app-shell`.
Paths: `<repo>` this repository; `<prototype>` the approved Kitty Desktop V2 prototype folder (`screens-opendesign-v2/`,
outside the repo); `<elements>` the installed `@spec-kitty/elements@1.1.0-rc.10` package (`custom-elements.json`,
`dist/index.js`). Claims cite a file; anything not read is labelled (inference). Revision 2: folds the post-plan squad
review, operator rulings R1 to R3 and the orchestrator rulings. No new dependency is added, so the supply-chain
section of the plan contract does not apply.

## Decisions

### D-01 Element decomposition: one screen-contract shell, two pattern elements

Three elements in `packages/mission-ui/src/elements/`:

| Element | Kind | Why |
|---|---|---|
| `sk-mission-shell` | screen contract, class JSDoc `@screen`, has `status` | FR-010 gives the shell a view state; `@screen` makes the manifest gate enforce `status` (`scripts/check-manifest.mjs`, `scripts/manifest-screen.mjs`) |
| `sk-shell-nav-item` | pattern element | one navigation item: icon, label, current marking, icon-only mode with label bubble (R3). Used by the rail, the sidebar, the footer, the drawer, the flyout |
| `sk-shell-tree` | pattern element, slotted by the host | work-package and artifact trees |

Top bar, rail, sidebar head, status panel, drawer and flyout are private render fragments (`shell-parts.ts`), not
elements: no outside consumer, and each element costs at least four stories and baselines.

Primitives (verified in `<elements>/custom-elements.json`): `sk-context-sidebar` (header, default, footer slots;
`<aside aria-label>`; used ONLY in the expanded tier, the flyout and the drawer, see M2 below), `sk-section-header` (head), `sk-pill-tag` (tags, label bubble), `sk-action-row` (navigation item
and tree leaf), `sk-button` (hamburger, close, retry, skip link, back link), `sk-notice`, `sk-status-indicator`.

`sk-app-shell` is NOT reused (R2). Evidence: its grid is always `rail / sidebar / 1fr`; its legacy layout goes single
column at a 720px container; `rail-preserving` hides the sidebar; it has no top-bar slot; and its compact drawer is an
in-flow block that pushes the content down (`<elements>/dist/index.js` lines 2846 to 3100), which the operator ruled out.
`sk-personal-rail` is NOT reused either: at `@media (max-width: 720px)` it flips to a row, and overriding it through
`::part` needs `border` and other properties the Stylelint allow-list rejects (verified: `property-allowed-list` rejects
`border`). The rail is a local `<nav aria-label="Global navigation">` column of `sk-shell-nav-item`.

Rejected: build everything on `sk-app-shell`; separate top-bar, rail and sidebar elements; trees as properties.

### D-02 Tier mechanism: window width read with `matchMedia`, one private source

`tier` is `expanded | collapsed | mobile` from two `MediaQueryList`s created with the bare global
`matchMedia('(min-width: 1100px)')` and `matchMedia('(min-width: 620px)')` (constants in TypeScript). The shell reads
them in ONE private function `readTier()`; a later container-query swap (Kitty Desktop panes) replaces only that
function. Contract text: render the shell full-bleed; the tier follows the window width.

- `tier` is reflected and output only: written privately and re-asserted in `willUpdate`, so a host-set stale value is
  overwritten before render.
- The `change` listener of the MediaQueryList updates `tier`, then dispatches the tier-related events (drawer and
  flyout closing: `sk-toggle-drawer`, `sk-toggle-flyout`), then calls `requestUpdate()`. Events never depend on the
  render finishing.
- Why not CSS media queries: Stylelint `unit-allowed-list` is `['%','fr']`; run against the real config,
  `@media (min-width: 1100px)` fails (`Unexpected unit "px"`). Why not `@container`: it passes the lint but only as a
  blind spot, and behaviour needs the tier in JavaScript anyway.
- no-I/O (`eslint -c eslint.no-io.config.mjs --stdin`): bare `matchMedia`, `ResizeObserver`, `.focus()`,
  `document.activeElement`, `showModal()` pass; `window.matchMedia` and `window.innerWidth` fail. Avoid identifiers named
  `parent`, `top`, `location`, `frames`, `opener` (restricted globals; `no-restricted-globals` also flags bare uses).
- Stylelint allow-list for implementers (properties): `display position inset inset-inline inset-block top right bottom
  left z-index box-sizing overflow overflow-x overflow-y contain container-type container-name aspect-ratio width
  min-width max-width height min-height max-height inline-size block-size padding(-inline/-block) margin(-inline/-block)
  gap row-gap column-gap flex flex-direction flex-wrap flex-grow flex-shrink flex-basis grid grid-template(-columns/-rows/
  -areas) grid-area grid-column grid-row grid-auto-flow grid-auto-columns grid-auto-rows align-items align-content
  align-self justify-items justify-content justify-self place-items place-content place-self order`. Units: `%` and `fr`
  only. Verified rejected: `border`, `outline`, `visibility`, `transition`, `transform`, `min-block-size`, `overflow-wrap`,
  `text-overflow`, `white-space`, `clip`, `rem`, `px`, `calc()`-like literals. Values for padding, margin, gap, width, inset,
  `top/left` and similar must be `var(--sk-*)`, `0`, `auto` or `inherit` (so `left: 100%` and `max-width: none` fail).
  Layout is therefore built from grid placement (`grid-column`, `justify-self`, `z-index`), not from percentage offsets.

### D-03 Collapsed icons, labels, flyout and the mobile drawer

Collapsed tier (620 to 1099 px). The sidebar becomes a LOCAL icon column (a `<nav>` of `sk-shell-nav-item`, like the local
rail, of `var(--sk-layout-personal-rail-width)`), not `sk-context-sidebar`: that element has the same
`@media (max-width: 720px)` flip as the dropped `sk-personal-rail` (height auto, border moves to the bottom; not
overridable under the lint rules) and its `var(--sk-space-4)` padding crowds a 3.5rem column (G-15). The mission layout
keeps the rail beside it. Where `sk-context-sidebar` is used (expanded, flyout, drawer) its padding is set through
`::part(sidebar)` (layout properties only). Each icon is a `sk-shell-nav-item` in `compact` mode: icon in the row's
`marker` slot, label text in the `title` slot hidden by layout-only CSS (`position: absolute; width: 0; height: 0;
overflow: hidden`), so the accessible name is kept.

R3 label bubble. In compact mode the nav item shows its label in a bubble on hover and on keyboard focus: a local
`sk-pill-tag` (library-styled, so no colour CSS) placed as a second grid column of the nav item (`overflow: visible`,
`z-index`) so it floats over the content without moving it. WCAG 1.4.13: dismissable (Escape, caught by a document `keydown` listener added while the bubble is shown and removed when hidden and on disconnect, hides it until the next
hover or focus; Escape closes the bubble before the flyout), hoverable (the bubble is inside the item's hover area), persistent (stays while pointer or focus is on
the item or the bubble). The bubble is `aria-hidden="true"` because the name already exists in the hidden text. The
icon column must not clip it (`overflow: visible` on the column; the collapsed column holds at most the navigation
icons, so it never needs to scroll). Local build recorded as G-12.

R1 flyout. In the collapsed tier, when the shell has slotted `sidebar-section` content, activating the icon of the
current destination (Work Packages, Artifacts) opens a flyout: the full sidebar section (head plus the slotted tree) as
an overlay beside the icon column, wrapped in an `sk-context-sidebar` for its surface (so it has the library background and border). Mechanism (no percentage offsets allowed): the body is a grid; the flyout is a grid
item placed in the content column (`grid-column`, `grid-row`, `justify-self: start`, `width: var(--sk-layout-context-
sidebar-width)`, `z-index`) so it overlays the content without moving it (NFR-003 holds). Closing: choosing an item
(after `sk-navigate`, reason `navigate`), Escape, a `pointerdown` outside the flyout and its icon (document listener,
allowed by no-io, removed on close AND on disconnect; the test uses `event.composedPath()` because the targets are in shadow roots),
or a `focusout` where focus leaves both the flyout and its icon (reason `outside`; Tab-out closes it, WCAG 2.4.11);
also when leaving the collapsed tier (reason `tier`). Activating the current-section icon that opens the flyout does
NOT emit `sk-navigate` (the default is cancelled and only `sk-toggle-flyout` is dispatched); a test asserts this. Focus moves into the flyout on open (first focusable) and returns to the icon on close; after a
navigation it goes to the content focus target (D-04). `flyoutOpen` is semi-controlled; `sk-toggle-flyout` is
cancelable. Other icons (and the current icon when there is no section content) navigate normally. Without
`aria-expanded` on `sk-action-row` the icon cannot announce the flyout state; focus moving into a labelled flyout
region is the cue (G-05). The slotted tree is rendered only while the flyout is open, so it is not duplicated.

Mobile tier (below 620 px), R2. A local overlay drawer: native `<dialog>` opened with `showModal()` (backdrop and focus
trap, inert page, Escape fires `cancel`, content never moves). Native dialog is the only way to get a dimmed backdrop
under the layout-only CSS rule: a backdrop colour cannot be written (no colour properties), but `::backdrop` has the
UA default dim. The dialog is placed at the inline start edge of the viewport (`inset`, `margin: 0`, `padding: 0`,
`width: var(--sk-layout-context-sidebar-width)`, `height: 100%`, `max-height: 100%`, because the UA modal style caps `max-height`). The UA dialog style sets `background: Canvas` and
`color: CanvasText` (a white panel in the dark theme) and a border, and none of `background`, `color`, `border` can be
overridden (rejected by `property-allowed-list`). Remedy: the `sk-context-sidebar` inside the dialog fills it
(`::part(sidebar)` with `height: 100%`, verified passing Stylelint) and carries the library surface, with the rail strip
inside it, so the Canvas background never shows. Recorded as G-11 (background, colour and border of native dialogs).
IC-05 renders every drawer story; if any still shows a light panel or a visible UA border, that is flagged in IC-05 and
escalated to the operator (narrow Stylelint allowance or a library `sk-drawer`). Inside: a close `sk-button` (icon,
first focusable), a local `<nav aria-label="Global navigation">` (mission layout, horizontal strip) and the
`sk-context-sidebar` with head, nav and the slotted sections. The dialog itself is the only role (dialog, labelled);
no `nav` inside another landmark and no `aside` inside a region (the drawer wrapper has no landmark role).

Drawer behaviour:
- Hamburger activation (the hamburger is `sk-button size="icon" variant="ghost"`) requests open. `sk-toggle-drawer`
  `{open, reason}` is cancelable and dispatched before applying; the shell applies the state only if not prevented.
- `drawerOpen` is forced `false` outside the mobile tier (in `willUpdate`); host-set changes inside mobile open or close
  the dialog and move focus the same way (into the dialog on open, to the hamburger on close). Setting it `true`
  outside mobile has no effect.
- Close paths: the close button, Escape (the dialog's `cancel` event is handled; `drawerOpen` is also synced from the dialog's `close` event so any native close, for example a host-removed state, cannot leave the property stale), a backdrop click (detected through an inner wrapper that fills the dialog: a click whose target is the dialog but not the wrapper; the dialog element itself has no padding), a navigation (`reason: 'navigate'`, then focus to the content focus target) and leaving the mobile tier (`reason: 'resize'`). Escape, the close button and the backdrop return focus to the hamburger.
- Reasons: `'hamburger' | 'close' | 'escape' | 'backdrop' | 'navigate' | 'resize' | 'host'`.
- Library events do not leak: the shell and the tree call `stopPropagation()` on `sk-action-row-activate`; no
  `sk-app-shell-dismiss` exists (the element is not used). Only declared `sk-*` events cross the shell boundary.
- Why not `sk-nav-pill` for the hamburger: it is a horizontal link row that collapses to its own hamburger, owning its
  toggle state and `sk-nav-pill-toggle` event, with no vertical or drawer content mode and no icon-only trigger; it
  cannot host the rail and sidebar.
- Why `sk-button` state in the name: `sk-button` forwards only `label`; no `aria-expanded` (gap G-06). The hamburger
  `label` is "Open navigation" (it is never reachable while the dialog is modal, so a single name is enough).

### D-04 Content focus target, skip link, status, current marking, tree

- One structure in every tier: top bar, then a body grid with rail, sidebar or icon column, and the content cell.
- Content cell: `<main id="content">` wrapping a shell-owned `<div tabindex="-1">` that wraps the default slot. The skip
  link (first tab stop) and post-navigation focus from the drawer or flyout focus that div. Exactly one `main` in every
  tier. A fragment link cannot reach an id inside the shadow root, so the skip link's click handler calls
  `preventDefault()` and `focus()` on the div. The skip link is an `sk-button variant="primary" href="#content"`, hidden
  until focused with layout-only CSS (`position: absolute; width: 0; height: 0; overflow: hidden`, restored on
  `:focus-within`). Its visible text comes from a `skip-link` slot (fallback "Skip to content"), e.g. "Skip to Missions".
- Shell status (FR-010) renders in NORMAL FLOW at the top of the content column in every tier (above `main`; an overlay would hide the screen's page header and its focusable actions, WCAG 2.4.11), never only in the sidebar head. A status change may move the content. Loading `sk-status-indicator pulsing`, error `sk-notice tone="danger"` with Retry in `actions`, empty
  `sk-notice tone="info"`. The head stays blank or shows its last data. `aria-busy="true"` is set on the status region
  only, never over `main`. NFR-003 test (no layout shift on tier change): within the same status, the content area's top edge is unchanged when the width crosses 1100 and 620.
- Current marking (FR-018): properties `current` (sidebar item) and `railCurrent` (rail item; the prototype marks the
  rail item for the project-level destination, `<prototype>/03-pipeline.html:16,24`). Only the deepest item carries
  `aria-current="page"` (the selected tree leaf, else the sidebar item); its ancestors in the shell (sidebar item when a
  leaf is current, rail item) carry `aria-current="true"` and the same visual mark. The nav item takes
  `current: 'page' | 'true' | ''`.
- Visual mark: the non-flush `sk-action-row` is used for navigation items (it keeps the `Highlight` edge in forced
  colours, `<elements>/dist/index.js` row CSS). The approved PNG's yellow edge (`<prototype>/../review-rel4/05-artifact.png`;
  `prototype-train-v2.css:374` `--sk-border-focus`, while `prototype.css:733` says `--sk-border-strong`) cannot be
  reproduced by library rows (their selected state uses `--sk-border-strong` and `--sk-surface-pill`). Recorded as G-13.
  The merge stays honest because the baselines are approved by the operator against the library look and the PR lists
  G-13 as the visual exception to the PNG.
- Folder toggle with `aria-expanded`/`aria-controls`: chosen mechanism is a native `<details>`/`<summary>` for each
  folder (not `sk-action-row selectable`, which cannot expose `aria-expanded`, `<elements>` row template lines 722-729).
  Evidence: the ESLint element rule lists only `button|input|select|textarea` (`eslint-rules/index.mjs` RAW_ELEMENT), so
  no lint exception is needed; browsers expose `<summary>` as a disclosure with expanded state natively; `<details>`
  fires `toggle` (also on programmatic `open` changes), so the tree emits `sk-tree-toggle` only when the new state differs from the rendered model (a user-initiated change); folder rendering is keyed by the identity of `items` so a reset re-renders `open`. Tests: no event on the initial render, none on an `items` reset, no loop with a host that writes state back. The default `summary` focus ring is kept and the default marker is hidden with `::-webkit-details-marker { display: none }` (both recorded under G-05). Rows inside the summary are non-interactive visual content
  (icon, text, count). Sunset: replaced by the library tree (G-05). IC-03 verifies colour inheritance in dark theme;
  if it fails, the fallback is a narrowly documented `eslint-disable-next-line no-restricted-syntax` on one native
  `<button aria-expanded aria-controls>` per folder, with the comment naming G-05 as sunset (ask the operator first).
- Long names wrap: library rows already wrap (`.sk-action-row__title` has `overflow-wrap: anywhere`); project CSS cannot
  set `overflow-wrap`, `text-overflow` or `white-space` (rejected), so head text uses library elements and a long
  unbroken name story proves it (G-14 if a head primitive does not wrap).
- Icons: local `shell-icons.ts` inline SVG templates with `viewBox`, `stroke="currentColor"`, `fill="none"`,
  `stroke-width`; no `width`/`height` attributes; sized by a tokenized layout (`inline-size: var(--sk-space-5)`).
  No icon set exists in the library (G-08): the manifest has no icon tag and `dist/` no icon folder.
- Typed events and manifest: events are `sk-navigate {id, href}`, `sk-tree-toggle {id, expanded}` (requested state),
  `sk-toggle-drawer {open, reason}` (cancelable), `sk-toggle-flyout {open, reason}` (cancelable, reasons `'activate' |
  'escape' | 'outside' | 'navigate' | 'tier'`), `sk-shell-retry {}`. Navigation: unmodified primary click or Enter is
  intercepted (`preventDefault`); modified clicks are left to the browser.

### D-05 Visual spec, state matrix and widths

Visual spec (`apps/storybook/tests/visual/stories.visual.spec.ts`), no wrapper decorator:
- Tag `vw-<n>` sets `page.setViewportSize({ width: n, height: 800 })` before `goto`. For EVERY `vw-*` story the spec
  asserts the shell's reflected `tier` equals the tier expected for that width (mandatory, not optional).
- Tag `tab-<n>` presses Tab `n` times before the screenshot (skip link = `tab-1`; a nav item = `tab-2`), deterministic
  unlike a `play` function.
- Frame height without a decorator: a rule in `apps/storybook/.storybook/preview-head.html` scoped by element,
  `sk-mission-shell { display: block; height: 800px; }` (outside `packages/*/src`, not linted). It touches only shell
  stories, so the existing `mission-sample--*` baselines do not change. IC-01 proves the spec change is a no-op for
  tagless stories (the four sample baselines compare identical, the `visual` plant still fails).
- Stories use `parameters.layout = 'fullscreen'`. Baseline names stay `<id>.png` (1:1 parity unchanged).

Tests (FR-014, NFR-003/004/005, Vitest browser mode): `import { page } from 'vitest/browser'`; call
`page.viewport(w, h)` first in each test because the default iframe is 414x896 (mobile); reset in `afterEach`.
Tier assertions at 619, 620, 1099, 1100 and 680. One test at root font-size 200% at 1100 and 620 (NFR-005).
One Tab-walk per tier counting stops equals items shown plus skip link and hamburger (SC-003). One `main` per tier.
`main` top edge equal across tiers within the same status (NFR-003; status changes may move content). Every event and its payload; cancelable drawer and flyout
(prevented means no change); drawer Escape, close, backdrop, navigate, resize-out; focus into and back; flyout open,
Escape, outside pointerdown (via `composedPath()`), Tab-out (`focusout`, WCAG 2.4.11), navigate, tier-leave, and no `sk-navigate` when the icon opens it; bubble Escape closes the bubble before the flyout; tree: no `sk-tree-toggle` on first render or `items` reset and no loop with a write-back host; drawer `close` event syncs `drawerOpen`; label bubble shown on hover and focus, Escape hides it, hoverable; library
events do not escape; host-set `drawerOpen` outside mobile is ignored; duplicate labels with distinct ids.

State matrix (title `Mission/Shell`, id `mission-shell--<export>`; tag in brackets):

| # | Export | State | Tier |
|---|---|---|---|
| 1-3 | `ProjectMissions1280`, `ProjectDrift1280`, `ProjectOps1280` | project, each destination (SH-02..04) | expanded |
| 4 | `MissionPipeline1280` | mission, Pipeline, rail and sidebar both marked (SH-05) | expanded |
| 5-6 | `MissionWorkPackageSelected1280`, `...NoneSelected1280` | WP tree (SH-06, 07) | expanded |
| 7-8 | `MissionArtifactsFolderExpanded1280`, `...Collapsed1280` | artifact tree (SH-08, 09) | expanded |
| 9-11 | `ContentLoading1280`, `ContentEmpty1280`, `ContentError1280` | content states, frame unchanged (SH-10..12) | expanded |
| 12-15 | `ShellLoading1280`, `ShellError1280`, `ShellEmpty1280` (project), `MissionShellError1280` | shell status (SH-13) | expanded |
| 16 | `SkipLinkFocused1280` [tab-1] | skip link with per-screen text (SH-21) | expanded |
| 17 | `NavItemFocusVisible1280` [tab-3] | focus ring on a sidebar item | expanded |
| 18 | `LongNames1280` | long project, mission, tree names wrap | expanded |
| 19-20 | `ProjectMissions1024`, `ProjectDrift1024` | icon column (SH-15) | collapsed |
| 21-23 | `MissionPipeline1024`, `MissionWorkPackageNoneSelected1024`, `MissionArtifacts1024` | rail + icon column (SH-16) | collapsed |
| 24-25 | `MissionShellError1024`, `ProjectShellLoading1024` | shell status, collapsed | collapsed |
| 26 | `LabelBubbleVisible1024` [tab-2] | R3 bubble on keyboard focus | collapsed |
| 27-28 | `FlyoutWorkPackages1024`, `FlyoutArtifacts1024` | R1 flyout open (arg `flyoutOpen`) | collapsed |
| 29-31 | `ProjectMissions800`, `ProjectOps800`, `MissionArtifacts800` | 800 baselines | collapsed |
| 32 | `ProjectMissions680` | inside the 620..720 corner | collapsed |
| 33-34 | `ProjectClosed390`, `MissionClosed390` | drawer closed (SH-17) | mobile |
| 35-36 | `ProjectDrawerOpen390`, `MissionDrawerOpen390` | overlay drawer open (SH-18, 19) | mobile |
| 37 | `MissionDrawerOpenLongTree390` | drawer scrolls, content does not | mobile |
| 38 | `SkipLinkFocused390` [tab-1] | skip link at 390 | mobile |
| 39-40 | `ShellError390`, `MissionShellLoading390` | shell status, mobile | mobile |
| 41-42 | `ProjectClosed320`, `MissionDrawerOpen320` | smallest width | mobile |

Pattern stories: `Mission/Shell nav item` (current page, current true, not current, compact with bubble, long label,
same label different id: 6) and `Mission/Shell tree` (WP selected, none, artifacts expanded, collapsed, long names: 5).
Total 53 new baselines (57 with the sample's 4). Picker rows SH-01 and SH-20 are dropped (C-003).

NFR-002 basis: fonts awaited, viewport fixed before navigation, reduced motion on, animations off, no `play`, no timers,
no CSS transitions in project CSS. The proof of 5 consecutive clean runs on an unchanged commit is an IC-06 task.

Budget (estimate, no measurement exists yet because no story exists): today 4 stories x 5 = 20 screenshots; after 57 x 5
= 285, at roughly 1 s each inside the pinned container the `Gate: visual` job grows by about 4 to 5 minutes; the
`Gate: proof (visual)` leg runs the command twice (clean, planted), about doubling that. Decision: visual job
`timeout-minutes: 10`; proof visual matrix leg `timeout-minutes: 15`; the `ciCommand` stays
`bash scripts/visual.sh -- --repeat-each=5`. IC-06 records the measured durations from the first PR run in the PR and
revises the limits if they are tight.

### D-06 Gates

No new plants: existing plants are anchored edits of `sk-mission-sample` or standalone files; none depends on the shell;
every gate globs `packages/*/src` (manifest sources come from `git ls-files --cached --others`). Manifest freeze: the
IC-01 skeletons carry the FULL public surface (properties with attributes, every `@fires`, `@slot`, `@csspart`, `@screen`,
and every literal `dispatchEvent(new CustomEvent('...'))`), so later lanes do not change `custom-elements.json`. Any WP
that changes JSDoc or public members must run `pnpm manifest:generate` and commit the result; merge conflicts in that
file are resolved by regeneration only.

### D-07 Icons for project navigation in the collapsed tier

See D-04: no icon set in `<elements>` or `@spec-kitty/tokens` (tokens hold fonts, token CSS and a catalogue only); local
inline SVG from the prototype's own drawings, gap G-08, flagged for design review (C-001).

### D-08 Library gaps (each: proposed API, acceptance, sunset, operator approval)

Operator approval for every row is **pending** (charter: a temporary local stand-in needs an exception recorded in the PR;
the operator approves the exceptions when reviewing the PR). Each gap is also an issue for the design library.

| ID | Gap | Proposed library API | Acceptance | Sunset |
|---|---|---|---|---|
| G-01 | `sk-app-shell` grid is fixed to rail, sidebar, content; no project (sidebar-only) layout and no icon-column mode | `layout="project\|mission"` and `sidebar="expanded\|icons"` on `sk-app-shell` | the shell's grid renders project and collapsed layouts from attributes, no empty column | the local grid is deleted when the library ships it |
| G-02 | no top-bar slot or banner landmark | a `top-bar` slot rendered in a `<header>` | banner landmark present, full-width above rail and sidebar | local top bar removed |
| G-03 | tier breakpoints are container-based and fixed (860/1100/720) | configurable or window-based thresholds, 1100 and 620 | tiers switch at 1100/620 without CSS overrides | `matchMedia` tier code removed |
| G-04 | compact drawer is an in-flow block, not an overlay with backdrop; hides the rail | overlay drawer with backdrop, focus trap, Escape, return focus | content never moves; keyboard parity | local dialog drawer removed |
| G-05 | no vertical navigation item (icon, current, icon-only) and no tree with `aria-expanded`/`aria-controls`; `sk-action-row` has no expanded state | `sk-nav-item` and `sk-tree` | name kept in icon-only, `aria-current` and `aria-expanded` exposed | `sk-shell-nav-item` and `sk-shell-tree` become thin wrappers or are removed |
| G-06 | `sk-button` forwards only `label`; no `aria-expanded`, `aria-controls`, `aria-current` | passthrough of those attributes to the inner control | state announced on the real control | state-in-name workaround removed |
| G-07 | `sk-personal-rail` flips to a row at `max-width: 720px`; cannot be overridden under the layout-only rule (`border` rejected) | a `vertical` attribute or container-based flip | stays a column in the collapsed tier | local rail `<nav>` removed |
| G-08 | no icon element or icon set | `sk-icon` with the prototype's glyphs | project and mission navigation icons available | `shell-icons.ts` removed |
| G-09 | no progress element | `sk-progress` | mission footer shows a bar | footer text-only stand-in removed |
| G-10 | no skip-link element; fragment links do not cross shadow roots | `sk-skip-link target` | works inside shadow DOM | local skip link removed |
| G-11 | no overlay primitive; the native `<dialog>` UA background, colour and border cannot be reset (`background`, `color`, `border` rejected); the UA modal border will show | `sk-drawer` and `sk-flyout` | no UA chrome, token colours | local dialog and flyout removed; or the operator approves `border: 0` meanwhile |
| G-12 | no label bubble / tooltip meeting WCAG 1.4.13 (R3) | `sk-tooltip` | hover, focus, Escape, hoverable, persistent | local bubble removed |
| G-13 | current-item marking: library rows use `--sk-border-strong`; the approved PNG shows the `--sk-border-focus` yellow edge | a `current` tone attribute on `sk-action-row` | edge matches the approved PNG, forced-colours keeps `Highlight` | baselines re-approved |
| G-15 | `sk-context-sidebar` has the same `@media (max-width: 720px)` flip as `sk-personal-rail` (height auto, border to the bottom) and fixed `--sk-space-4` padding that crowds a 3.5rem column | a `compact` or icon-column mode, container-based flip | usable as the collapsed icon column | local icon column removed |
| G-14 | project CSS cannot set `overflow-wrap`; wrapping depends on library elements | wrap behaviour in library head elements | long unbroken names wrap | only if a head primitive fails the long-name story |

G-12 of the previous revision (breadcrumb and toast) is dropped: they are not shell gaps (out of scope per the spec).

## Adversarial evidence

The charter's squad ran on the first revision of this plan; the operator and orchestrator rulings are folded above
(contested points: matchMedia versus container queries, reuse of `sk-app-shell`, `::part` override of the rail, hidden
trees, drawer state ownership, skip link target, status placement, current marking, folder toggle). No dependency decision.

## Risks

1. The `<dialog>` UA surface and the details/summary colour inheritance are unverified until rendered (IC-05, IC-03).
2. The label bubble and the flyout rely on grid-item overlays with `z-index`; the collapsed column must not clip them.
3. CI time (D-05); the numbers are estimates until the first PR run.
4. Pixel stability at 1024, 800 and 680 across 5 repeats (NFR-002).
5. Design review items (C-001): the UA modal border WILL show on the drawer dialog (G-11; operator design-review item, no IC-05 escalation), icon column without a tree, flyout, overlay drawer chrome, 48 px top bar (no 52 px token;
   `--sk-space-12` is 8rem), no progress bar, yellow edge not reproducible (G-13), local icons, non-flush bordered rows in a 3.5rem column, and the edge-less local top bar and rail (no border or surface can be written locally).
