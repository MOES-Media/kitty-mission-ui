# Quickstart: Missions and Pipeline screens

Prerequisites as in `README.md` (Node 22.22.2, pnpm 11.18.0, the registry credential, podman or docker for the visual gate). Commands run from `<repo>`. The visual baselines are produced and compared only inside the pinned container through `scripts/visual.sh`.

## Use the screens (host)

```ts
import '@spec-kitty/mission-ui';   // registers sk-missions-screen, sk-pipeline-screen and the three pattern elements
```

```html
<sk-mission-shell layout="project" current="nav-missions" status="ready">
  <sk-missions-screen status="ready" branch="main" now="2026-10-03T12:00:00Z"></sk-missions-screen>
</sk-mission-shell>
```

Set `project`, `missions`, `pageInfo` (and optionally `filter`, `query`, `loadingMore`, `laneGroups`, `labels`) as properties; listen for `sk-open-mission`, `sk-filter-change`, `sk-search`, `sk-load-more`. For a Mission, use the shell's mission layout and `<sk-pipeline-screen status="ready">` with `mission` (the contract `MissionDetail`, plus the optional host `actor` on work packages), and listen for `sk-select-work-package`, `sk-view-artifacts`, `sk-open-missions`. Pass the shell `mission.progress` as `{ done: doneCount, total: wpTotal, percentage: weightedPercentage }` so the footer and the inspector agree (the footer renders nothing when `wpTotal` is 0; a `percentage` that is not a finite number is ignored). The host loads pages, owns `now`, `branch`, the `stale` flag, routing and refresh.

## Verify (in this order)

```bash
# 0. baseline, before any change (IC-01): record exit codes, a sanitised excerpt and the local wall-clock of each
pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io
pnpm manifest:check && pnpm hygiene && pnpm build-storybook && pnpm test
pnpm visual                              # inside the pinned container; 58 PNGs, 0 diffs; one run, wall-clock recorded
pnpm gate-proof                          # every gate still fails with its plant

# 1. the contract (new gate `contract`)
pnpm contract:generate                   # types.generated.ts and fixtures.generated.ts from the vendored files
pnpm contract:check && pnpm test:contract   # test:contract = node --test scripts/contract/*.test.mjs; pass count above 0, fail 0
node scripts/gate-proof.mjs local --only contract   # record the wall-clock of this and of the line above; the contract timeouts are set from them (gates.md)
pnpm contract:verify-remote              # once, on the initial vendoring; output goes in the PR description (needs the network)
node --test scripts/gate-proof/ && node --test scripts/hygiene/   # the earlier suites; no CI gate runs them
node scripts/gate-proof.mjs coverage     # job ids, matrix, plants, all.needs, ciCommand; the record schema's gate enum is checked by the suite above

# 2. the data-driven rule (new gate `data-driven`)
pnpm lint:data-driven && pnpm test:data-driven
node scripts/gate-proof.mjs local --only data-driven
node --test scripts/gate-proof/ && node scripts/gate-proof.mjs coverage

# 3. the elements
pnpm storybook                           # Mission/Missions, Mission/Pipeline, Mission/Phase bar, Mission/Filter toggle group, Mission/Work package board
pnpm manifest:generate && pnpm manifest:check
pnpm test                                # events, no-event cases, states, NFR-006, 3 and 7 phases, custom groups, Tab-walks
pnpm visual:update                       # inside the pinned image; review every new PNG against the prototype side by side
pnpm visual                              # compare; CI repeats each test 5 times (IC-09 runs it 5 times in a row)

# 4. everything
pnpm gate-proof
node --test scripts/terminology.test.mjs   # C-009, IC-09; a node test with a known-positive sample, run by hand
```

Both new gates need the baseline run of step 0 green first. After a gate change, run its proof (`node scripts/gate-proof.mjs local --only <id>`) before the full `pnpm gate-proof`.

## Re-pin the contract

```bash
pnpm contract:verify-remote              # the current pin exists remotely and the vendored bytes equal upstream's and the nine producer lane weights in check.mjs equal progress.py's at that pin (needs the network)
pnpm contract:update --sha <40-hex sha>  # fetch, copy, regenerate, rewrite PIN.json, run the gate, print the diff summary (needs the network)
git diff --stat -- contracts packages/mission-ui/src/contract
pnpm typecheck && pnpm test && pnpm visual
```

Read the diff in this order: vendored files, `types.generated.ts`, `fixtures.generated.ts`. `PIN.json` records the new sha, committer date, `infoVersion` and `changelogTopVersion` exactly as the new commit says (after spec-kitty seam 4 that may read `1.0.0-SNAPSHOT`; do not edit it by hand). A breaking change (a removed or retyped property, a major `info.version`, closed enums going open) makes `tsc` or the gate fail where the screens depend on it: stop, do not relax a closed shape, amend the spec or open a mission. Gaps are raised on spec-kitty#5528 by the orchestrator, never by a mission.

## Add a vocabulary-dependent change without breaking the data-driven gate

Put every new phase name, lane, status or lifecycle value, and its English copy, in `src/defaults/`; read it from elements through `lookup(...)` or the exported tables. If `pnpm lint:data-driven` reports `data-driven: S<n> ...` in an element, move the literal; do not add the file to the allow-list (the allow-list is fixed in `contracts/gates.md`) and do not write an `eslint-disable` comment (the config ignores inline directives, and a reviewer rejects one). A field, key or property read named like a lane or a phase is reported too: name it differently (`blockedBadge`, not `blocked`). Anything that depends on a phase state (glyph, tone, status text, is-current) is read from the `Record<PhaseState, ...>` tables of `src/defaults/phases.ts`, never by comparing the state with a literal.

## Manual checks

At 1280, 1024, 800, 680, 390 and 320: Missions search, six filters, rows, Load more; Pipeline phase bar, five columns, inspector; keyboard only (Tab through search, filters, rows, Load more; crumb, cards, View artifacts; Enter and Space activate); a root font size of 200% at 1100 and 720 px shows no horizontal overflow of the content area; forced-colors keeps the pressed filter and focus visible; the footer percentage in the shell equals the inspector's Mission progress (for a Mission with work packages; with none there is no footer); resize across 1100 and 720 with a board that overflows (the scroll region gains `role="region"` and a tab stop only while it overflows).

## Timing record

IC-01 records the local baseline wall-clock of `pnpm test`, `pnpm build-storybook` and one `pnpm visual` run, plus the wall-clock of `pnpm contract:check`, `pnpm test:contract` and `gate-proof local --only contract` (IC-02 the same for its gate), from which the two new gates' timeouts are set; next to the recorded CI runs 36880654992 and 36882394060 (`contracts/gates.md`). IC-09 writes the timeouts of that file into `ci.yml` and puts the derivation and the five consecutive local `pnpm visual` results in the PR description. The measured durations of the first pull-request run for `Gate: unit-tests`, `Gate: visual` and `Gate: proof (visual)` are added afterwards as a PR comment; a timeout that proves too tight is changed by one explicit timeout-only commit, the only commit allowed after the draft PR opens.
