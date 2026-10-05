---
affected_files: []
cycle_number: 1
mission_slug: missions-and-pipeline-screens-01M40SKZ
reproduction_command:
reviewed_at: '2026-10-03T19:02:27Z'
reviewer_agent: claude
wp_id: WP08
---

VERDICT: rejected

# WP08 review (sk-missions-screen, IC-07), reviewer Renata (independent)
Lane worktree lane-h at 664d14f; lane clean after every experiment (`git status --short` empty).

## 1. Gates (all run in the lane)
typecheck, lint, lint:styles, lint:no-io, test:no-io (69), lint:data-driven, test:data-driven (72), manifest:check, hygiene (0 findings), test:scripts (114/114), test:contract (59/59), contract:check, pnpm test (17 files, 385 pass, includes sk-missions-screen 58 tests), pnpm visual (87 passed, 0 diffs on existing; 24 `mission-missions--` baselines). All exit 0.

## 2. Revert experiments (own, all restored with `git checkout -- <file>`)
| # | Mutation | Result |
|---|---|---|
| E1 | Stale filter predicate ignores `stale` | RED (filters test) |
| E2 | search case-sensitive | RED (3 tests) |
| E3 | search no trim | RED |
| E4 | search drops topology | RED |
| E5 | draft matches Active | RED (2 tests) |
| E6 | Load more not inert while loadingMore | RED |
| E7 | no announce after filter change | RED (2) |
| E8 | no announce after search change | RED |
| E10 | sk-search payload untrimmed | RED |
| E11 | sk-open-mission payload wrong | RED (4) |
| E12 | stale replaces lifecycle badge | RED (DR-4 test) |
| E13 | rows no longer `hidden` (rejected design) | RED (5, incl. NFR-006 structural) |
| E14 | live region assertive | RED |
| E9 | live-region trigger widened: announce on ANY length change (shrink, growth from empty) | **GREEN = survivor** (finding F3) |

## 3. E-13 block
Scoped to `**/src/elements/sk-missions-screen/sk-missions-screen.ts` only; adds `font-weight` with token-only values (strict-value + property-allowed-list). Verified: the plant overlay in the same directory fails (`Unexpected property "font-weight"`); `font-weight: 700` in the scoped file fails (E-13 message); `color: red` in the scoped file fails; `sk-pipeline-screen.ts` is not in scope. No leak. PASS.

## 4. Visual: per-difference ruling
Evidence: CP-1 composites S3-state-panels-empty-loading-nomatch.png (N-7), S3-row-overview.png (N-3), N-1-page-header-missions.png (N-1/N-2); prototype rendered headless 1280 dark (`scratchpad/wp08/proto-*.png`) beside our baselines populated/empty/loading/error/no-match/mobile-390.
| # | Difference | Ruling |
|---|---|---|
| 1 | Panel chrome absent (no card border, no background, no radius, no dashed empty border) | **REJECT, sev 3 (F1).** The N-7 composite shows the prototype empty panel as a rounded, filled, dashed card and the loading panel as a rounded filled card; the operator REJECTED N-7 ("prototype's spacing and weight"). Our baselines (empty, loading, no-match) have NO visible container at all: farther from the prototype than the spike the operator saw (that spike still had a thin solid border). Spacing and weight are met (77% width, gap 0, bold heading); chrome is not, and nothing confirms or approves its absence. |
| 2 | Title and slug stacked (sk-action-row grid) | **REJECT, sev 3 (F2).** In the CP-1 spike (S3-row-overview.png, and S3 outcome "puts title and slug on one line") title and slug sat on one line, as in the prototype. N-3 confirmed only filled pills, smaller slug, smaller lifecycle/time block; it does not cover a stacked title. Our baselines stack them on every row. The G-08 `::part(trigger)` `grid-template-areas` override is layout-only (allowed list has it, shell files already use it), needs no exception. |
| 3 | Topology raw (`single_branch`, `unknown`) vs prototype `single-branch` | Accept as plan-level drift, sev 2 (F4): spec FR-004 and edge case say topology is shown and `unknown` shown as given; research.md D-20 renders the raw value. Underscore vs hyphen is not spelled out by the spec. List in the PR drift section; optional remedy is a label table in `src/defaults/` (no CSS). Baselines mostly show `lanes`/`unknown`, so the visible effect is small. |
| 4 | Panel heading sans (Inter bold) vs prototype display face | sev 2 (F5): visible in the N-7 composite but the operator's wording named spacing and weight only; E-13 has no `font-family`. Fold into F1's operator question (scoped token-only `font-family` in E-13, or confirm). Not blocking by itself. |
| 5 | Lane summary in library sans vs prototype mono | Accept, sev 2 (F6): DR-3 confirmed words and order; typography is library `sk-action-row` supporting styling, identical in the confirmed S3-row-overview composite the operator confirmed under N-3. List in the PR drift section. |
| 6 | Page header = sk-page-header (eyebrow plain, large title, own rows, not full-bleed) | **ACCEPT**: N-1 and N-2 confirmed verbatim. |
Also checked and fine: stale+active double badge (DR-4), arrow on every row (DR-6), error notice (DR-5), AD-3 six filters, filter group, search. Mobile-390 row reflow follows library layout (no horizontal overflow, tested at 200% root font).

## 5. Findings
| id | sev | file:line | claim | remedy |
|---|---|---|---|---|
| F1 | 3 | `packages/mission-ui/src/elements/sk-missions-screen/sk-missions-screen.ts` styles (`[data-state-panel]`, `.sk-empty-state`, ~lines 120-140); baselines `mission-missions--empty-1280/loading-1280/filter-no-match-last-page-1280/search-no-match-more-pages-1280.png` | N-7 rejected at CP-1; panels have no card chrome while the prototype has background, rounded border, dashed border for empty. Not confirmed, not approved, not spec-mandated. | Operator question first if token-only paint is not allowed: extend E-13 to `border` (keyword style `dashed`, token colour), `border-radius`, `background` with `var(--sk-*)` only (and the `padding` already there), scoped to this file, update gates.md E-13, plant stays; then regenerate baselines. Alternative: operator confirms "no panel chrome" as drift. Do not wave through. |
| F2 | 3 | `mission-row-parts.ts` / `sk-missions-screen.ts` (no `sk-action-row::part(trigger)` rule); all row baselines | Title and slug stacked; CP-1 evidence and prototype have them inline. | Add layout-only `sk-action-row::part(trigger) { grid-template-areas: ... }` as in spike S3 / G-08 (no exception needed), re-shoot row baselines, assert in a test or baseline. |
| F3 | 2 | `sk-missions-screen.ts` `willUpdate` (about line 213); `test/sk-missions-screen.test.ts` ~675 | Contract: announce only when `missions` grows from non-empty; shrink, equal length and growth from empty announce nothing. Mutation E9 (announce on any length change) stays green; only the unchanged-array case is tested. | Add shrink and from-empty cases (with the positive control) to the "announces nothing" test. |
| F4 | 2 | `src/logic/row.ts:15` | Raw topology string vs prototype hyphenated. | List in PR drift; optionally a label map in defaults. |
| F5 | 2 | E-13 / `.sk-empty-state__heading` | Heading face differs from prototype display font. | Decide together with F1. |
| F6 | 2 | library `supporting` slot | Lane summary typography not mono. | List in PR drift. |

Approved only if no finding at 3 or above: two exist (F1, F2), so REJECTED. Tests, gates, E-13 scope and plant are otherwise sound; fix round should be visual only plus F3.

## 6. Notes (not WP findings)
The implementer used `git reset -q` once (own intent-to-add) and `pgrep -f` in a wait loop, per the dispatch notes; I did not audit those beyond recording them. Gate re-runs were by me, in the lane; Playwright host Chromium was used for the prototype shots only.
