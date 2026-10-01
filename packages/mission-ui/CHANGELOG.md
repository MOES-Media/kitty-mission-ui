# Changelog

## Unreleased

### Changed

- `sk-mission-sample` no longer self-registers (`src/index.ts` defines the tag once), composes `sk-notice` and
  `sk-section-header` through their slots, and exports `SkMissionOpenDetail` / `SkMissionRetryDetail` (typed events in
  `HTMLElementEventMap` and the manifest).

### Added

- `sk-mission-sample`: template element encoding the screen contract (`status` view state, data in as
  properties, `sk-mission-open` and `sk-mission-retry` events out, no I/O), with `Ready`, `Empty`, `Loading`
  and `Error` stories and Vitest browser-mode tests.
