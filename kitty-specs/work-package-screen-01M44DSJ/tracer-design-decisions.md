# Work Package screen: design decisions

Running log of design decisions and their outcomes for mission `work-package-screen-01M44DSJ` (mission-ui#5). Newest last. Full reasoning and rejected alternatives live in `research.md`; this file records what changed and when. Same style as the Missions and Pipeline mission's file (mission-ui#4).

## Operator rulings on the open questions Q1 to Q12 (2026-10-04)

Given by the operator on 2026-10-04 and recorded here by the orchestrator: all twelve recommendations of `spec.md` accepted as written. The ruling text is the recommendation. The 30-item Visual Drift Register (DW-1 to DW-30) is not covered: it is PROPOSED and goes to the operator at checkpoint CP-1 (after the plan phase and the squad, before the work packages that build visuals). Reviewers audit against the DW list as provisional until then; an unconfirmed item is a REJECT.

- **Q1** accepted as recommended. A small header badge "stale, N min since last commit" when `stale`; a quiet fact row for `fresh`; nothing for `not_applicable` or null; the field stays optional and hidden when absent.
- **Q2** accepted as recommended. Progress bar from `subtaskProgress` as given (hidden at total 0) plus a semantic list of id, title and lane word; a null title shows the id alone; the detail list wins over the 1.0 map (N-2).
- **Q3** accepted as recommended. (a) render the four contract members, drop the path row and the "removed" notice (R-3, R-4); (b) see Q6; (c) drop the inline text, show cycle number, verdict, reviewer, time and an "Open review" action to the artifact; (d) do not render, lane history takes its place, and log the phase timeline as out of scope; (e) render from `artifactReferences.spec`.
- **Q4** accepted as recommended. An "Open prompt" action from `artifactReferences.prompt` emitting the artifact event; no markdown rendering; the screen neither reads `promptMarkdown` nor needs `includePrompt` (N-3).
- **Q5** accepted as recommended. One `sk-open-artifact` `{ missionId, path, kind }` for spec, prompt and review cycles; no `sk-view-artifacts` on this screen (the shell's Artifacts item covers the listing); `sk-open-pipeline` `{ missionId }` for "Return to Pipeline" and `sk-open-mission` `{ missionId, slug }` for the crumb, collapsed to one event if both route to the Pipeline; `sk-retry-load` `{ missionId, wpId, target }`. All verb-noun.
- **Q6** accepted as recommended. Words "changed", "unchanged", "unknown" with tones info, neutral, neutral, never colour-only; when every entry is `unknown` (host without git or worktree) show no per-row badges and one quiet note "Change state unavailable on this host".
- **Q7** accepted as recommended. Keep `status` for the whole screen and add `detailStatus` (`loading`, `ready`, `error`, `not-found`) for the detail regions; a refused detail is a regional notice naming `not_found` or `source_unreadable` in words with a retry, the 1.0 regions stay; only a `WorkPackage` 404 is the whole-screen not-found.
- **Q8** accepted as recommended. Vendor from spec-kitty `main` once #5625 merges; if planning must proceed earlier, pin to a recorded commit of the #5625 branch as provisional and re-pin to `main` before the PR, with gate `contract` checking the pin.
- **Q9** accepted as recommended. Consume them as optional regions that hide when the property is omitted (as staleness); an empty array or null member is drawn as defined; the artifact `kind` and refusal `code` are passed through, worded only through `defaults/`.
- **Q10** accepted as recommended. Header badge and Facts row show the non-null handles joined with a colon (matches the prototype look); the Assignment panel shows them as separate rows.
- **Q11** accepted as recommended. One panel: a summary (latest result, override notice) above the cycle list; show both without reconciling them; when no cycles exist but a latest result does, show the summary alone.
- **Q12** accepted as recommended. "Current" on the newest entry only; no lane-keyed "Complete" marker, since it needs a lane literal; a host-supplied lane-group prop could add one later.

## Plan phase (2026-10-04), decided in `research.md`

(Appended by the plan phase: decisions D-01 onward, numbered afresh for this mission.)

## Spike outcomes (to be appended by the orchestrator from the work package reports)

(none yet)

## Operator rulings on the plan squad's forks and amendments (2026-10-05)

Given by the operator on 2026-10-05 and recorded here by the orchestrator. The full text and options of each item are in `plan.md` history (commit 47cea35, "Open forks for the operator") and `reviews/plan.forks.yaml`, `reviews/plan.forks2.yaml`. Operator ruling 2026-10-05: all 14 technical forks and ARCH-010 (A), and P-1, P-2, P-3, P-4 and P-6 are ACCEPTED exactly as the arbiter recommended; the rulings are written out in `spec.md`, Clarifications, "Operator rulings, 2026-10-05". In brief:

- Forks: CORRECT-003 (a), CORRECT-004 (a), CORRECT-008 (a), CORRECT-012 (a), ARCH-003 (A), ARCH-006 (A), ARCH-013 (a'), VISUAL-001 (a), VISUAL-006 (b), VISUAL-011 (a), VISUAL-014 (a), FRESH-001 (b), FRESH-002 (a), FRESH-003 (a). ARCH-010 (A): panels are `sk-card` plus `sk-section-header`, DW-30 "keep", card spike S9.
- Amendments: P-1, P-2, P-3 (with `detailRefusalCode` and the payload rule), P-4, P-6 accepted; P-7 ruled: titled pills, plain in the Frontmatter, actionable only in the dependency chain (DW-7 amended); P-5 stays unused.
- Exceptions: E-17 approved (no `state-parts.ts` breadcrumb row); E-18 rejected as written, conditional and narrowed on spike S9; E-19 (a) conditional on the Stylelint probe (deleted if it passes); E-19 (b) approved; E-20 conditional on spike S6.
- Still pending: the drift register DW-1 to DW-30 (CP-1, after the IC-03a spikes).

## CP-1 operator rulings (2026-10-05)

The operator ruled on 2026-10-05, after the IC-03a spike evidence (`WP03` review PASS; renders, `measurements.json`, accessibility trees and the verbatim Stylelint probe in the CP-1 evidence set), accepting every recommendation. This is the `CP-1 confirmed` entry that the WP04 to WP10 file preconditions look for.

1. **DW-30 and E-18 (panels).** The panels stay `sk-card` plus `sk-section-header`, with a NARROWED E-18 in `panel-parts.ts` only. It restyles exactly five properties, each with a token: border width 1px (`--sk-border-width-1`), radius `--sk-radius-md` (12px), padding `--sk-space-5` (20px), title 18px and weight 700 (title typography tokens), and the title-to-body gap `--sk-space-4` (16px). No other panel chrome property is restyled; no `letter-spacing` literal. Sunset: spec-kitty-design#516 (a compact density for `sk-card`). DW-30 becomes "keep the prototype look via the narrowed E-18" (CONFIRMED).
2. **DW-16 and E-19 gap (Evidence chain).** A native ordered list (`ol`) of `sk-pill-tag` items with `aria-hidden` arrow separators and a layout-only `flex-wrap` (spike variant D). No style exception. The library gap (the library `sk-evidence-chain` cannot fit the column or reproduce the chips) is recorded as spec-kitty-design#517 (a wrapping evidence chain). DW-16 is CONFIRMED in that form; it no longer reads "keep" with `sk-evidence-chain`.
3. **DW-24 (thresholds).** Three columns from content-cell `min-width: 848px` (NOT 805: the prototype's three tracks need 760px plus two 20px gaps plus 24px padding on both sides = 848px, and between 805 and 847px the grid overflows its padding box and the shell scrolls sideways); one column at `max-width: 688px`; two columns between (689 to 847px). This intentionally deviates from the prototype in the band of browser windows of about 1101 to 1143px in the expanded shell tier (content cell 805 to 847px): two columns where the prototype shows three. The header wraps at the same 688px threshold (the prototype's 800px block; an 800px viewport has a cell of 688px). Every statement of 805, 690 or "about 690" in the mission artifacts is replaced (P-6, WP-46 to WP-48, FR-029, DW-24, plan, contracts, research, WP04, WP09). DW-24 is CONFIRMED with these values.
4. **DW-17 and E-20 (dependency nodes).** Nodes are library ghost `sk-button`s carrying three texts (id, title, lane word) wrapped in ONE slot element, stacked vertically in the narrow column, with layout-only `::part(button)` rules (`overflow-wrap`, `text-align`) for long titles where needed (three bare spans become flex items and shatter, so the one wrapper is mandatory). **E-20 is dropped.** DW-17 is CONFIRMED.
5. **DW-10, DW-11, DW-12 (history).** The history timeline is confirmed on the library event-timeline sheet with the "from -> to" summary. The final wording stays tunable at the operator's Storybook review. DW-10, DW-11 and DW-12 are CONFIRMED.
6. **E-19 (a) is DELETED** (the Stylelint probe passed: `@container (min-width: 805px)` and `(max-width: 688px)` raised no error; the only errors were the six `px` track minimums, which are E-19 (b)). E-19 (b) stays APPROVED. E-17 stands.
7. **The other 24 DW items** (DW-1 to DW-9, DW-13 to DW-15, DW-18 to DW-23, DW-25 to DW-29; not rendered by the spikes) are built as the register states them and are confirmed at the operator's Storybook review after the last WP, as on #4. Until then they stay PROPOSED; a difference from the prototype that is in neither the register nor this entry is a REJECT item.
8. **Lesson for WP04 (spike S9).** A stack that is `display: grid` needs `grid-template-columns: minmax(0, 1fr)`, or an unbreakable word widens the whole column (the prototype's `.stack` lacks it). WP04's layout step and exit checks carry it.

Container-query form for WP04: `@container (min-width: 848px)` three columns; `@container (max-width: 688px)` one column; two columns between.

## Operator ratification: E-18 section-header row gap (2026-10-05)

The library `sk-section-header` keeps an 8px row gap above and below its title even when its eyebrow and description slots are empty. To meet the CP-1 panel ruling (title-to-body gap 16px), WP04 added `row-gap: 0` on `sk-section-header::part(header)`. The operator ratified it: E-18 covers six properties, the five ruled at CP-1 plus this row gap. It is token-free (0), pinned in the stylelint table, scoped to `panel-parts.ts`, and sunsets on spec-kitty-design#516.

## Operator rulings during WP05 (2026-10-05)

- **E-21, long unbroken words:** allowed, scoped. `text-overflow: ellipsis` in `header-parts.ts` (the title band) and `overflow-wrap: break-word` in `facts-parts.ts` (Facts values). Keyword values only, file-scoped, with stylelint proof cases (allowed in the scoped file, refused in a sibling, other values refused), like #4's E-11. Sunset: none needed if the library grows the utilities; otherwise kept as a deliberate local allowance.
- **Facts look:** the library look stays for now (no row separators from the adopted `sk-facts` sheet, borderless library pills, and the "Authored recommendation" h3 at the user-agent size). The operator judges these at the Storybook review after the final work package, with every region filled.

## Operator ruling during WP09: overflowing pills and values (2026-10-05)

WP09's overflow and 200 percent text tests found three defects: Frontmatter dependency pills (`facts-parts.ts`), the actor and staleness badges (`header-parts.ts`) and the review latest-result values (`review-parts.ts`) can run off the screen, because the library pill is `nowrap` and the result values have no wrap rule. Operator ruling: **pills wrap**. E-21 is amended with a rule on `sk-pill-tag::part(tag)`: `white-space: normal; overflow-wrap: anywhere; max-width: 100%`, as the library's own `sk-metric` sheet does, scoped to the three files above. The review result values get `overflow-wrap: break-word`. Long pills become multi-line pills; nothing leaves the screen. The `KNOWN_DEFECTS` hiding in the overflow and 200 percent tests is removed.

Consequence for US6 AC3 (over-wide words ellipsize): only the header title ellipsizes (E-21, WP05 ruling). Facts, Workspace, dependency-node, pill and review-result text breaks mid-word instead. The spec's US6 AC3 is read with that exception; the operator rulings above take precedence.

## Operator ruling change: pills ellipsize everywhere (2026-10-05)

Supersedes "pills wrap" above. Wrapped pills look almost like circles at tablet width, and one rule for every pill is easier to maintain than per-spot fixes. Ruling: every pill the screen draws stays on one line and ellipsizes (`max-width: 100%`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` on `sk-pill-tag::part(tag)`), defined in one shared place where possible. The full text stays in the `title` attribute and the accessible name. The review latest-result values are not pills and keep `overflow-wrap: break-word`. The `KNOWN_DEFECTS` hiding is still removed.

## Operator ruling from the Storybook preview: visible artifact actions (2026-10-05)

The "Open spec.md", "Open prompt" and "Open review" actions were ghost buttons and disappeared into the panel background, so it was not clear they navigate. Ruling: they use the library's visible (outlined or secondary) `sk-button` variant, with a leading document icon where the library offers one. The dependency-chain nodes stay as ruled at CP-1. No new style exception.

## Operator ruling during WP10: one column in the shell's mobile tier (2026-10-06)

The WP10 review measured two columns at viewports 689 to 719 px, inside the shell's mobile tier, because the mobile content cell is the whole viewport and exceeds the 688 px one-column threshold. A container query alone cannot separate mobile from collapsed (their cell widths overlap). Ruling: the shell exposes its current tier (an additive, documented surface such as a reflected attribute or a CSS custom property), and the screen forces one column in the mobile tier. The 848 and 688 px container thresholds for the other tiers stay as ruled at CP-1.

## Operator approval: Storybook review after WP10 (2026-10-06)

The operator reviewed the Storybook preview built from the lane-j tip (WP10 approved at cycle 3, f249bab) and approved it with no change requests. The visual differences from the prototype that were noted for this review are accepted as built. These include the header badge row under the title, the dependency node typography, the ghost Open-spec and Open-prompt buttons, the not-found states, verdict and cycle-time styling, compact type sizes, the h1 weight and colour, the dependency pill ellipsis at 1280, and the Facts rows without dividers. The wrap-up (accept, dev-assist, squad, compaction, PR) proceeds.

## Operator rulings on the pre-merge squad forks (2026-10-06)

The pre-merge squad (round 2) confirmed 17 of 20 distinct findings (3 refuted); 14 had one remedy and 3 were forks. The operator ruled all three.

1. **BOUNDARY-001, unregistered `::part` rules: register E-22 (option a).** `header-parts.ts` (breadcrumb `sk-button::part(button)` inline padding), `review-parts.ts` (nested `sk-card::part(card)` padding) and `files-parts.ts` (`sk-action-row::part(trigger)` grid areas, columns and row gap; `display: none` on the title, metadata, supporting and controls parts; `::part(tags)` margin) are registered as E-22 in `contracts/gates.md`, with a comment entry in `stylelint.config.mjs` and a test that pins the exact set of `::part` selectors per file (`wp-part-selectors.test.ts`; an unlisted `::part` rule fails). Sunsets: spec-kitty-design#516 (compact card density), #493 and #508 (`sk-action-row` flush empty parts and a card layout) and #518 (a compact inline padding for `sk-button`, filed 2026-10-06). The operator asked to try `sk-action-row layout="card"` (or `presentation="flush"`) first and to drop the files rules if the row looked the same. Outcome: it does not. With `layout="card"` and the rules removed, the file row measured 122 px against 102 px (the empty title and metadata areas keep their gaps); with `layout="card" presentation="flush"` it measured 120 px and lost its border. So the files rules stay and are registered. No baseline changed.
2. **A11Y-005, no `h3` on the assigned group: amend the contract (option b).** `contracts/sk-work-package-screen.md` ("Semantics", Headings) now says that only the Authored recommendation group carries an `h3` (with the review override notice); the assigned group has none. No code change. The cancellation notice heading became an `h2` (A11Y-002, a peer of the panels).
3. **CONTRACT-003, history lane words versus card badge words: keep the split (option b), DW-10 note.** The history rows use #4's summary lane words (`resolveLaneLabel`, hook `labels.lane`, then `LANE_LABELS`, then the raw lane). The header, Facts, the dependency chain, the subtasks and the cancellation notice use the card badge words (`resolveStateBadge`, hook `labels.state`, then `STATE_BADGES`). A host that sets only `labels.state` leaves the history words unchanged; a host that sets `labels.lane` renames the history and not the badges. Pinned by a test in `wp-history-parts.test.ts` (positive control: the badge follows `labels.state`).

## Landing rulings (PR #8, 2026-10-06)

The landing pass (second-opinion squad: correctness lens CORR-001 to CORR-005, design lens DESIGN-001 to DESIGN-009) folded every finding. Four forks were ruled by the operator on 2026-10-06; the contract files above are updated to match.

1. **CORR-004, a `wpId` that disagrees with the Work Package: fail closed (option a).** When `wpId` is non-empty and differs from `workPackage.wpId` in `ready`, the screen renders `loading` (the data-less header carrying `wpId`). It never shows a mixed identity.
2. **DESIGN-005, the shape of `mission`: the contract's names (option a).** `WpScreenMission` is `Pick<MissionHead, 'missionId' | 'slug' | 'friendlyName' | 'wpTotal'>`, so the Pipeline screen's Mission object is assignable unchanged. Every use, fixture and story follows; the rendered text is identical.
3. **DESIGN-006, `sk-retry-load`: keep the name, widen the payload (option a).** The payload is a union discriminated by `target`, with this screen's members `'work-package'` and `'detail'`; later screens extend it. Retry ownership is stated in the README: the shell owns a whole-page failure, a screen owns its own regions.
4. **DESIGN-004 and DESIGN-003, the tier seam: extract now.** `ShellTierController` (`src/shell-tier.ts`) finds the enclosing shell across shadow roots, observes `tier`, disconnects with its host and exposes the tier. It exposes the CSS custom state `:state(shell-mobile)` through `ElementInternals` in place of the `data-shell-mobile` attribute, and the Work Package screen is its first consumer. The shell's "tier is public" sentence moved onto the `tier` property JSDoc, so the manifest carries it on the attribute. A browser without custom states is not supported; there is no silent fallback.
