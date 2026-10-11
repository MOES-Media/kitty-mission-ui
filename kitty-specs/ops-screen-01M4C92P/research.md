# Research: Ops screen

Evidence behind the plan decisions. Sources are the vendored-contract slice of spec-kitty PR #5881 (read-only), the prototype `07-ops.html` and `prototype.css`, and mission-ui `main` at `ad94164`.

## Findings

- **R-01 The prototype row.** `article.collection-row.invocation-row` holds `.invocation-head` (a mono `strong` id with `overflow-wrap: anywhere`, and a `badge`) and `dl.facts.invocation-facts` (two columns of `minmax(0, 1fr)`, each fact a `minmax(80px, .55fr) minmax(0, 1.45fr)` pair; one column at 800 px; the head stacks at 620 px). The `:hover` rule repeats the resting border and background, so it changes nothing (DO-18).
- **R-02 Missions row precedent.** The Missions screen renders its rows with the library `sk-action-row` filled through slots, with `sk-pill-tag status=...` badges and `sk-button variant="secondary" ?busy` for Load more inside an `li` carrying `aria-busy`; the live region is `role="status"` keyed on a sequence number. Ops reuses the Load more and live-region mechanics verbatim and does NOT reuse `sk-action-row` (it is a selectable row; Ops rows have no action). Whether the library has a non-selectable row is spike S-O1.
- **R-03 Contract facts the plan depends on.** `actor` nullable; `evidence` nullable with kind, value (at most 512), redacted; `status` and `outcome` independent vocabularies; page cursor bound to the profile; `skippedCount` independent of the filter; the 400 for a bad profile has no stated code (spec CG-9).
- **R-04 Time.** The contract serves `date-time` with an offset; examples use `Z`. The prototype prints seconds and a locale-neutral English month. `Intl.DateTimeFormat` would make baselines depend on the browser's ICU data; D-04 formats by hand from parsed fields.
- **R-05 Data-driven gate.** It already reads lane and phase enums, and #5 added verdict, change-state and staleness enums with a split between bare common identifiers (comparison-only) and literals (anywhere). The Ops enums follow the same split (D-12). `done` is already a lane word.
- **R-06 Retry union.** At `ad94164` the union is in `logic/wp-retry.ts` with members carrying `missionId` and `wpId`; the `ops-page` member carries neither. The union's type is `RetryLoadDetail`, discriminated on `target`; adding a member needs `HTMLElementEventMap['sk-retry-load']` to stay declared once.
- **R-07 Evidence safety.** No part may build an element from an item value. #7 proved request absence with a CSP meta and `securitypolicyviolation` observation with a positive control; Ops reuses that harness shape for a text-only value (nothing should ever load, so the harness proves the negative).

## Decisions (D-nn are in plan.md; alternatives rejected here)

| Decision | Rejected alternative and why |
|---|---|
| Rows are plain `li` items | `sk-action-row` non-selectable: it shows an arrow and a hover state meant for activation |
| Look resolved by one pure function | State logic inside render: untestable, and the agreement rule must be shared by the announcement |
| Hand-formatted UTC | `Intl`: locale-dependent baselines; `toISOString`: not the prototype's form |
| `loadMoreError` as an object with a code | Two booleans: cannot carry an unknown code through to the generic wording |
| Container queries | Viewport media queries: the shell's sidebar changes the content width per tier |

## Spikes (IC-03a; evidence for CP-1)

Each spike is a throwaway story or script in a scratch directory, run in the pinned container, no committed baseline. Output: renders at 1280 px (and the tiers named), `measurements.json`, accessibility trees, and the verbatim Stylelint probe.

- **S-O1 Row frame and facts.** Render the prototype row beside (a) a plain `li` with the library `sk-facts` if present, (b) the library `sk-card` (inset), (c) a plain `li` with project layout CSS and the prototype grid. Measure border width, radius, padding, term and value font sizes, row gaps against the prototype; run Stylelint on `minmax(80px, ...)` to learn whether the px track needs E-41. Decides DO-22, DO-24, E-40, E-41.
- **S-O2 Tier thresholds.** Measure the content-cell width of the project layout (with `flush`) at viewports 1100, 800 and 620 and at 390; derive the container thresholds for one-column facts and the stacked head so the screen matches the prototype's breakpoints at zero drift; test whether a pure container query reproduces the 620 px head stack in the shell's mobile tier or `ShellTierController` is needed. Decides D-10.
- **S-O3 Wrapping.** Render a 26-character id, a 128-character profile, a long action, a 512-character unbroken evidence token and a 512-character prose evidence in the head, a pill and a fact value, with (a) `overflow-wrap: anywhere` and (b) the shared ellipsis rule. Record which keep the row within its width and keep the 512 characters readable. Decides DO-13 and E-43, and whether the head `strong` needs an exception.
- **S-O4 Focus across paging.** In the Missions screen mechanics, render Load more, toggle `busy`, replace `items`, replace the control with the error notice and with nothing (last page); record `document.activeElement` at each step, and whether `sk-button busy` keeps focus. Decides D-09 and whether the heading fallback is exercised.

## CP-1 questions the spikes answer

1. The row construction and facts look (S-O1) and the final text of DO-22 and DO-24.
2. E-40 and E-41: needed, narrowed or deleted.
3. The id and evidence wrapping rule (S-O3): E-43 as written, narrowed or dropped.
4. The tier thresholds and whether the controller is used (S-O2).
5. Whether to add #7's bidirectional-control notice to evidence (D-11 isolates values in `bdi` and draws no notice).
