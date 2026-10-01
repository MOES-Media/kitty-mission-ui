# WP04 review feedback, cycle 1

Verdict: changes requested (one finding, one remedy). Everything else re-verified and passing.

**Issue 1 (medium): non-layout declaration in element CSS.**
`packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts` line 22 sets
`:host { font-family: var(--sk-font-sans); }`. The WP prompt (T015) says "CSS: `:host{display:block}` and the grid
wrapper only"; `contracts/sample-element.md` allows `:host { display: block; }` plus one grid wrapper; the charter
("Elements over CSS") limits project CSS to layout, and research R4 has WP05's Stylelint `property-allowed-list`
restrict project CSS to layout properties. `font-family` is typography, not layout, even when its value is a token, so
it would either fail the WP05 stylelint gate or force that allow-list to be loosened.

Remedy:
1. Delete the `font-family: var(--sk-font-sans);` line from the element.
2. Typography is the host page's concern: set `font-family: var(--sk-font-sans)` on `html, body` in
   `apps/storybook/.storybook/preview-head.html` (WP03-owned; a one-line out-of-map edit, record the rationale in the
   hand-off).
3. Regenerate `gates/plants/unit-tests/sk-mission-sample.ts.plant` from the new element (only diff: the
   `'plant-unit-slug'` detail key) and update `baseSha256` in `plant.json` to the new file's sha256.
4. Re-run: mission-ui typecheck, `pnpm test` (12 passed), both literal mutations, the plant toggle, the grep checks,
   `literal-events-ok`, `pnpm storybook:build-only` and the runtime design-system check.

Notes (no action required in WP04):
- `pnpm typecheck` (recursive) fails with TS18003 in `apps/storybook`: its tsconfig (WP01) includes `.storybook` and
  `tests`, but TypeScript's include globbing skips dot-directories and `tests` does not exist yet. The DoD asks only for
  the mission-ui project, which passes. This blocks the WP05 typecheck gate; WP05 (owner of that gate) should change the
  include to `.storybook/**/*.ts` (and `tests/**/*.ts`).
- `mission-sample--docs` is the autodocs entry (`type: docs`) that the contract's `tags: ['autodocs']` requires; the
  four `type: story` ids are exactly ready/empty/loading/error. Acceptable; WP08 should select by `type === 'story'`.
- `cem analyze` 0.11.0 parses the element (events `sk-mission-open`, `sk-mission-retry`; attributes `status`,
  `error-message`), but it writes a `customElements` field into `packages/mission-ui/package.json` unless the WP06 config
  sets `packagejson: false`.
