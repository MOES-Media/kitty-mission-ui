# @moes-media/mission-ui

Lit elements for the Spec Kitty mission screens, built on `@spec-kitty/elements`. The repository README
(setup, credential, gates, "Add an element") applies; this note covers the package itself.

- `src/index.ts` is the only place custom elements are registered (guarded `customElements.define`). Element modules
  never self-register.
- Events are typed: import `SkOpenMissionDetail` and `SkMissionRetryDetail` from the package entry; they are also in
  `HTMLElementEventMap` and in the generated `custom-elements.json`. Event names are verb first
  (`sk-open-mission`, `sk-select-work-package`, `sk-view-artifacts`, `sk-load-more`); the shell's older noun-first
  names (`sk-tree-toggle`, `sk-mission-retry`, `sk-shell-retry`) are left for a separate pass.
- The Work Package screen adds `SkOpenArtifactDetail`, `SkRetryLoadDetail` (a union keyed on `target`), `WpScreenMission`
  (the contract's `missionId`, `slug`, `friendlyName` and `wpTotal`, so the Pipeline screen's Mission object is assignable
  unchanged), `WpScreenStatus` and `DetailStatus`; `sk-select-work-package` reuses the board's `SkSelectWorkPackageDetail`.
  The retry events are `sk-shell-retry` (the shell, a whole-page failure) and `sk-retry-load` (a screen, its own regions).
- The Drift screen adds `SkSelectFindingDetail`, `SkRescanDriftDetail`, `SkCopyCommandDetail`, `SkDriftRetryLoadDetail`
  (the `'drift-report'` member of the `sk-retry-load` union), `DriftScreenStatus` and `DriftCopyResult`. The host owns the
  clipboard: `sk-copy-command` carries the exact text, and the host answers through `copyResult` (`copied` or `manual`).
  `selectedFinding` is host-owned and an incoming change is never re-emitted.
- Render a screen that pads its own inset parts (the Work Package and Pipeline screens) inside an `sk-mission-shell` with the
  `flush` attribute set: the shell then adds no padding, and the screen pads with the shell's public
  `--sk-mission-shell-content-padding` (24px, 16px at the mobile tier). Without `flush` the content is padded twice.
- The shell's `tier` (`expanded`, `collapsed`, `mobile`) is public. A screen follows it with `ShellTierController`
  (`src/shell-tier.ts`; it and `SHELL_MOBILE_STATE` are importable from `@moes-media/mission-ui`), which sets the CSS custom state `:state(shell-mobile)` on its host; style it with
  `:host(:state(shell-mobile))`. A browser without custom states, or one whose `states.add` throws, degrades loudly: one `console.warn` per page, no custom state, and the container-query layout still applies.
- A screen re-exposes the events of the pattern elements it composes (`sk-filter-change` from the filter group,
  `sk-select-work-package` from the board): those names and detail keys are part of the screen's API, listed in its
  `@fires`. The Pipeline screen's `missionsHref` has a default only for a modified click; a host sets it to its own
  Missions route.
- **`@spec-kitty/styles` is declared only because `@spec-kitty/elements` lists it as a peer dependency** (so the
  frozen install resolves one copy of each). Nothing in this package imports it directly; component CSS only uses `--sk-*` custom properties, whose
  stylesheet (`@spec-kitty/tokens`) the host page loads (the Storybook preview does).
