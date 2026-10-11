# Tasks notes: Drift screen

Orchestrator-owned notes on the work-package decomposition for mission `drift-screen-01M4C93T` (mission-ui#10). One WP per implementation concern, in the plan's order and dependencies.

## Concern to work package map

| WP | Plan concern | Depends on | Notes |
|---|---|---|---|
| WP01 | IC-01 | main after the #9 re-vendor | BLOCKED until `DriftReport.yaml` exists and `PIN.json` has `provenance: main`; carries a stop-check; nobody re-vendors from this branch |
| WP02 | IC-02 | WP01 | defaults, logic, hooks, retry member, data-driven gate extension |
| WP03 | IC-03a | WP02 | spikes S1..S6; named final commit removes all spike code |
| (CP-1) | orchestrator checkpoint | WP03 approved | NOT a work package |
| WP04 | IC-03b | WP03 + CP-1 | file precondition: a `CP-1 confirmed` entry in `tracer-design-decisions.md`, an ancestor of the lane |
| WP05 | IC-04 | WP04 | chain X |
| WP06 | IC-05 | WP04 | chain Y |
| WP07 | IC-06 | WP05, WP06 | also owns the whole-screen stories DR-01 and DR-24 |
| WP08 | IC-07 | WP07 | owns the 32 baselines; committed only here |

The CLI's `IC-##` regex refuses a/b suffixes, so `wps.yaml` cites `IC-03` for both WP03 (IC-03a) and WP04 (IC-03b); this table is the mapping. DR-24 is owned by WP07 (IC-06; it needs both chains); the plan's story-owner table was corrected to match.

## Lane mechanics (from plan.md, restated for the orchestrator)

1. Fast-forward `kitty/mission-<slug>` to `feat/drift-screen-10` before every first claim and after any merge of `main`.
2. Merge the planning branch into each new lane before dispatch; WP04 additionally needs the CP-1 entry as an ancestor.
3. WP07 needs two parents (WP05 and WP06): parent on one, merge the approved other tip before dispatch, apply the `status.json` rule.
4. Claims are serialised. 5. `move-task --force` only by the orchestrator where the operator allows.

## Shared files: single owner

`src/index.ts`, `custom-elements.json`, `stylelint.config.mjs`, `eslint.config.mjs`: WP04. `package.json`, `README.md`, both `CHANGELOG.md`, `.github/workflows/ci.yml`: WP08. WP01..WP04 and WP08 edits to files they do not own are recorded out-of-map edits, committed by the WP itself:

- WP01: `package.json` test-script names, one CHANGELOG line.
- WP02: `package.json` test-script names, one CHANGELOG line, `src/retry-types.ts` if #7 has merged.
- WP03: the stories glob and one ESLint `ignores` entry, both removed by its final commit.
- WP04: the six stub part files (owned by WP05 and WP06 afterwards), `package.json` test-script names.
- WP08: `custom-elements.json` regeneration only (owned by WP04), `pnpm-lock.yaml` if tooling changes it.

`tracer-*.md`, `spec.md`, `plan.md`, `tasks.md`, `tasks-notes.md` are orchestrator-owned.

## PR shape

One pull request for the mission, after accept, dev-assist cleanup, the aggregate review squad, history compaction and a rebase. 8 WPs; no per-WP split recommended. The operator reviews Storybook after WP08, before wrap-up. No adversarial squad runs on tasks (charter: squad after the plan only).
