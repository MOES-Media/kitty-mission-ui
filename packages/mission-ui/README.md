# @spec-kitty/mission-ui

Private Lit elements for the Spec Kitty mission screens, built on `@spec-kitty/elements`. The repository README
(setup, credential, gates, "Add an element") applies; this note covers the package itself.

- `src/index.ts` is the only place custom elements are registered (guarded `customElements.define`). Element modules
  never self-register.
- Events are typed: import `SkOpenMissionDetail` and `SkMissionRetryDetail` from the package entry; they are also in
  `HTMLElementEventMap` and in the generated `custom-elements.json`. Event names are verb first
  (`sk-open-mission`, `sk-select-work-package`, `sk-view-artifacts`, `sk-load-more`); the shell's older noun-first
  names (`sk-tree-toggle`, `sk-mission-retry`, `sk-shell-retry`) are left for a separate pass.
- A screen re-exposes the events of the pattern elements it composes (`sk-filter-change` from the filter group,
  `sk-select-work-package` from the board): those names and detail keys are part of the screen's API, listed in its
  `@fires`. The Pipeline screen's `missionsHref` has a default only for a modified click; a host sets it to its own
  Missions route.
- **`@spec-kitty/styles` is declared only because `@spec-kitty/elements` lists it as a peer dependency** (so the
  frozen install resolves one copy of each). Nothing in this package imports it directly; component CSS only uses `--sk-*` custom properties, whose
  stylesheet (`@spec-kitty/tokens`) the host page loads (the Storybook preview does).
