# Contract: `sk-mission-sample`

Template element that encodes the charter's screen contract. Location:
`packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts`. Registered by `packages/mission-ui/src/index.ts`
through a guarded `customElements.get` check.

## Properties (attributes where scalar)

| Property | Attribute | Type | Default | Notes |
|---|---|---|---|---|
| `status` | `status` (reflected) | `'loading' \| 'error' \| 'empty' \| 'ready'` | `'loading'` | unknown values render `empty` |
| `mission` | none | `MissionSummary \| null` | `null` | used in `ready` |
| `errorMessage` | `error-message` | `string` | `''` | used in `error`; empty falls back to a fixed generic sentence |

## Events (all `CustomEvent`, `bubbles: true`, `composed: true`)

| Name | `detail` | Trigger |
|---|---|---|
| `sk-mission-open` | `{ slug: string }` | activation of the open button in `ready` |
| `sk-mission-retry` | `{}` | activation of the retry button in `error` |

The element listens to the inner `sk-button` click and re-emits; it does not navigate, fetch or store anything.

## Rendering

| Status | Composition (all `sk-*` from `@spec-kitty/elements`) |
|---|---|
| `ready` | `sk-card` containing heading text, `sk-pill-tag` (`done/total`), `sk-button variant=primary` |
| `empty` | `sk-notice tone=info` |
| `loading` | `sk-status-indicator pulsing` plus text; `aria-busy="true"` on host |
| `error` | `sk-notice tone=danger` plus `sk-button variant=secondary` (retry) |

Host CSS: `:host { display: block; }` and one `display: grid; gap: var(--sk-space-4);` wrapper; in `ready` the wrapper has
at least two children so a gap change is measurable by the visual gate. No colour, font or size literals and no `px`,
`rem`, `em` unit (Stylelint-enforced, `unit-allowed-list: ['%', 'fr']`); no inline `style=`, `styleMap` or `unsafeCSS`
(ESLint); no raw `<button`, `<input` or `class=` in templates (ESLint). Every `dispatchEvent` is
`dispatchEvent(new CustomEvent('<string literal>', { ... }))` (ESLint, so the manifest sees it).

Source syntax: plain TypeScript and standard Lit decorators compatible with the analyzer's bundled TypeScript ~5.4 (no
`accessor`, no `satisfies`, no 5.5+ only features); the manifest plant edits this real file.

## Stories (`Mission/Sample`)

`Ready`, `Empty`, `Loading`, `Error`; each sets `status` and passes synthetic fixtures from `fixtures.ts`. The story
file sets `tags: ['autodocs']`, giving a generated docs page for the element. A package `CHANGELOG.md` records the
element's addition (charter documentation_policy).

## Tests (`packages/mission-ui/test/sk-mission-sample.test.ts`)

- each status renders its composition and no other;
- clicking open emits exactly one `sk-mission-open` with `detail.slug === mission.slug`, bubbling and composed
  (asserted by catching it on `document`);
- clicking retry emits exactly one `sk-mission-retry`;
- `ready` with `mission = null` renders the empty view;
- the element source performs no I/O (covered by the no-io gate, not re-tested here).
