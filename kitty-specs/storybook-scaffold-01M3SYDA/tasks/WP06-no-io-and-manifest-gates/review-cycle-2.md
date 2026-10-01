---
affected_files: []
cycle_number: 2
mission_slug: storybook-scaffold-01M3SYDA
reproduction_command:
reviewed_at: '2026-09-30T22:21:50Z'
reviewer_agent: claude
wp_id: WP06
---

# WP06 review feedback (cycle 1) — REQUEST CHANGES

All DoD commands re-run and pass (25 selftest tests, byte-identical double regeneration, both plants caught for their own token, mutation and non-literal probes fail, clean grep, clean tree). package.json is never mutated. The implementation matches research R6 as written. The problems below are adversarial bypasses of FR-012 ("any network ... call ... fails") and FR-011 ("an undeclared ... event fails") that belong to the same evasion classes R6 set out to close. Each has one remedy. Add a fixture (no-io) or selftest/probe (manifest) for every item.

**Issue 1 (MAJOR, no-io): the global object is reachable through `defaultView`.**
`document.defaultView!.fetch('/x')` and `el.ownerDocument.defaultView!.localStorage` both pass. This is the aliasing route R6 closed for `window`/`globalThis`/`self`.
Remedy: forbid `defaultView` member access (for example `no-restricted-syntax` `MemberExpression[property.name='defaultView']`). Add fixture `default-view.ts.txt`.

**Issue 2 (MAJOR, no-io): an aliased `eval` passes.**
`const e = eval; e('1')` and `(0, eval)('1')` pass because only `CallExpression[callee.name='eval']` is matched.
Remedy: forbid every `Identifier[name='eval']` reference. Add fixture `eval-alias.ts.txt`.

**Issue 3 (MAJOR, no-io): creating a script element is only caught for the exact literal `'script'`.**
`createElement('scr'+'ipt')` and `createElement('SCRIPT')` both pass (HTML lowercases the tag name).
Remedy: flag `createElement` whose first argument is not a string literal, and match `script` case-insensitively (`/^script$/i`). Add fixtures for both.

**Issue 4 (MAJOR, no-io and manifest scope): only `*.ts` is gated.**
A `.js` file under `packages/*/src` is linted with no rules. `.mts` and `.tsx` files are not linted at all. The manifest analyzer glob and `scanDispatch` also see only `.ts`, so an untracked `sk-x/p.js` element that dispatches an undeclared event passes `manifest:check`.
Remedy: set no-io `files` to `**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}`. In `check-manifest.mjs`, fail on any `packages/*/src` source file whose extension is not `.ts` (or scan those files too).

**Issue 5 (MAJOR, manifest): the dispatch scan misses indirect dispatch.**
Each of these passes `manifest:check` with an undeclared `sk-*` event:
- `this['dispatchEvent'](new CustomEvent('sk-hidden-a'))`
- `const d = this.dispatchEvent.bind(this); d(...)`
- `EventTarget.prototype.dispatchEvent.call(this, new CustomEvent('sk-hidden-c'))`
- a literal dispatch in `src/probe.ts`, outside the `src/elements/**` analyzer glob. An element that imports that helper publishes an event the manifest never lists.

Remedy:
- In `scanDispatch`, flag every `dispatchEvent` reference (property access, element access with a string literal, or identifier) that is not the direct callee of `X.dispatchEvent(new CustomEvent('<literal>', ...))`.
- Collect every `CustomEvent` literal name across all of `packages/*/src` and require each one to appear in the manifest's event set.

**Minor (non-blocking; document as a known limitation in the gate's header comment):**
- `new Image` is caught, but `createElement('img'|'iframe'|'link')` with a `.src`/`.href` is not.
- These also pass: `innerHTML` markup that loads URLs, `document.write`, CSS `@import` in text, `new Audio(url)`, `navigator.serviceWorker`, `location.href =`, string `setTimeout`, `(()=>{}).constructor` as Function, and `const n = navigator; n.sendBeacon` / `const d = document; d.cookie` aliases.
- A lint gate cannot be complete. Name the residual so reviewers know what it does not cover.

**Planning note (not the implementer's defect):** the DoD no-io plant command `if pnpm lint:no-io && pnpm test:no-io >"$O" 2>&1` redirects only `test:no-io`, so the literal command never prints PLANT-CAUGHT: the lint output goes to the terminal. With grouping, `{ ...; } >"$O" 2>&1`, the plant is caught. The orchestrator should fix the DoD text.
