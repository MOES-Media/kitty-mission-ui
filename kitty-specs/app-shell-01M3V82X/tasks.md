# Tasks: App shell with all its states

Mission `app-shell-01M3V82X`. One serial chain WP01 to WP06 (plan.md IC-01 to IC-06); each lane is created from its parent lane's branch. Prompts live in `tasks/`.

## Subtask Index

| ID | Description | WP | Parallel |
|----|-------------|----|----------|
| T001 | Types in shell-types.ts (WP01) | WP01 | No |
| T002 | Local icon set shell-icons.ts (WP01) | WP01 | No |
| T003 | Skeleton sk-shell-nav-item and sk-shell-tree with full surface (WP01) | WP01 | No |
| T004 | Skeleton sk-mission-shell with readTier(), literal dispatch stubs (WP01) | WP01 | No |
| T005 | Guarded registration and type exports in index.ts (WP01) | WP01 | No |
| T006 | Visual spec vw-/tab-/tier assertion and preview-head rule (WP01) | WP01 | No |
| T007 | Regenerate manifest, run all gates, freeze proof (WP01) | WP01 | No |
| T008 | Row render, current marks, delegatesFocus (WP02) | WP02 | No |
| T009 | sk-navigate, modifier clicks, library event stop (WP02) | WP02 | No |
| T010 | Compact mode and WCAG 1.4.13 label bubble (WP02) | WP02 | No |
| T011 | Fixtures and 6 stories (WP02) | WP02 | No |
| T012 | Nav item tests (WP02) | WP02 | No |
| T013 | Nav item baselines in pinned container (WP02) | WP02 | No |
| T014 | Tree leaves, heading, selection (WP03) | WP03 | No |
| T015 | Folders with details/summary (WP03) | WP03 | No |
| T016 | sk-navigate and sk-tree-toggle events (WP03) | WP03 | No |
| T017 | Tree fixtures and 5 stories (WP03) | WP03 | No |
| T018 | Tree tests and baselines (WP03) | WP03 | No |
| T019 | Grid, top bar, local rail (WP04) | WP04 | No |
| T020 | Expanded sidebar and collapsed icon column (WP04) | WP04 | No |
| T021 | Current marking (WP04) | WP04 | No |
| T022 | Status region, focus target, skip link (WP04) | WP04 | No |
| T023 | Tier handling, no shift, landmarks (WP04) | WP04 | No |
| T024 | Fixtures for every state (WP04) | WP04 | No |
| T025 | Frame, tier and status tests (WP04) | WP04 | No |
| T026 | Drawer dialog (WP05) | WP05 | No |
| T027 | Drawer behaviour and cancelable events (WP05) | WP05 | No |
| T028 | Flyout (WP05) | WP05 | No |
| T029 | Overlay tests (WP05) | WP05 | No |
| T030 | Visual check of drawer without baselines (WP05) | WP05 | No |
| T031 | The 42 shell stories (WP06) | WP06 | No |
| T032 | Shell baselines in pinned container (WP06) | WP06 | No |
| T033 | Five consecutive clean visual runs (WP06) | WP06 | No |
| T034 | CI timeouts and changelogs (WP06) | WP06 | No |
| T035 | Manifest check and gap record FR-015 (WP06) | WP06 | No |
| T036 | Gate proof and final design-review list (WP06) | WP06 | No |

## WP01: Foundation and frozen manifest (IC-01)

- Prompt: `tasks/WP01-foundation-and-frozen-manifest.md`
- Depends on: none
- Requirements: FR-011, FR-013, NFR-001, NFR-002, C-004
- Subtasks: T001-T007
- Estimated prompt size: about 100 lines of dense guidance

T001 Types in shell-types.ts (WP01)
T002 Local icon set shell-icons.ts (WP01)
T003 Skeleton sk-shell-nav-item and sk-shell-tree with full surface (WP01)
T004 Skeleton sk-mission-shell with readTier(), literal dispatch stubs (WP01)
T005 Guarded registration and type exports in index.ts (WP01)
T006 Visual spec vw-/tab-/tier assertion and preview-head rule (WP01)
T007 Regenerate manifest, run all gates, freeze proof (WP01)

## WP02: sk-shell-nav-item pattern element (IC-02)

- Prompt: `tasks/WP02-shell-nav-item-element.md`
- Depends on: WP01
- Requirements: FR-004, FR-006, FR-011, FR-012, FR-014, FR-017, FR-018, NFR-004
- Subtasks: T008-T013
- Estimated prompt size: about 100 lines of dense guidance

T008 Row render, current marks, delegatesFocus (WP02)
T009 sk-navigate, modifier clicks, library event stop (WP02)
T010 Compact mode and WCAG 1.4.13 label bubble (WP02)
T011 Fixtures and 6 stories (WP02)
T012 Nav item tests (WP02)
T013 Nav item baselines in pinned container (WP02)

## WP03: sk-shell-tree pattern element (IC-03)

- Prompt: `tasks/WP03-shell-tree-element.md`
- Depends on: WP02
- Requirements: FR-003, FR-011, FR-014
- Subtasks: T014-T018
- Estimated prompt size: about 100 lines of dense guidance

T014 Tree leaves, heading, selection (WP03)
T015 Folders with details/summary (WP03)
T016 sk-navigate and sk-tree-toggle events (WP03)
T017 Tree fixtures and 5 stories (WP03)
T018 Tree tests and baselines (WP03)

## WP04: Shell frame, tiers and status (IC-04)

- Prompt: `tasks/WP04-shell-frame-tiers-status.md`
- Depends on: WP03
- Requirements: FR-001, FR-002, FR-004 to FR-006, FR-008 to FR-010, FR-012, FR-014, FR-018, FR-019, NFR-003 to NFR-005, C-001 to C-003, C-005
- Subtasks: T019-T025
- Estimated prompt size: about 100 lines of dense guidance

T019 Grid, top bar, local rail (WP04)
T020 Expanded sidebar and collapsed icon column (WP04)
T021 Current marking (WP04)
T022 Status region, focus target, skip link (WP04)
T023 Tier handling, no shift, landmarks (WP04)
T024 Fixtures for every state (WP04)
T025 Frame, tier and status tests (WP04)

## WP05: Shell drawer and flyout (IC-05)

- Prompt: `tasks/WP05-shell-drawer-and-flyout.md`
- Depends on: WP04
- Requirements: FR-007, FR-011, FR-014, FR-016, NFR-004, C-002
- Subtasks: T026-T030
- Estimated prompt size: about 100 lines of dense guidance

T026 Drawer dialog (WP05)
T027 Drawer behaviour and cancelable events (WP05)
T028 Flyout (WP05)
T029 Overlay tests (WP05)
T030 Visual check of drawer without baselines (WP05)

## WP06: Shell stories, baselines and integration (IC-06)

- Prompt: `tasks/WP06-shell-stories-baselines-integration.md`
- Depends on: WP05
- Requirements: FR-013, FR-015, NFR-001, NFR-002, SC-001, SC-004
- Subtasks: T031-T036
- Estimated prompt size: about 100 lines of dense guidance

T031 The 42 shell stories (WP06)
T032 Shell baselines in pinned container (WP06)
T033 Five consecutive clean visual runs (WP06)
T034 CI timeouts and changelogs (WP06)
T035 Manifest check and gap record FR-015 (WP06)
T036 Gate proof and final design-review list (WP06)

## Hot files and shared surfaces

- `packages/mission-ui/src/index.ts`, `apps/storybook/tests/visual/stories.visual.spec.ts`, `apps/storybook/.storybook/preview-head.html`: WP01 only.
- `packages/mission-ui/custom-elements.json`: owned by WP01; every later WP keeps `pnpm manifest:check` green and regenerates only on a JSDoc or member change (regenerate, never hand-merge); WP06 confirms it is clean.
- Element directories are seeded by WP01 (skeleton files, recorded exception) and owned by WP02 (nav item), WP03 (tree), WP04 (shell frame). WP05 owns the new `shell-overlays.ts` and makes one recorded four-call-site seam edit in `sk-mission-shell.ts`.
- Baselines: WP02 `mission-shell-nav-item--*.png`, WP03 `mission-shell-tree--*.png`, WP06 `mission-shell--*.png`.
- `.github/workflows/ci.yml` and both CHANGELOGs: WP06 only.
