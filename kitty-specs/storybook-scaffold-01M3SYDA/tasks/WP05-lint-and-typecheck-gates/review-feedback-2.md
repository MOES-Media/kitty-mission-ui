# WP05 review feedback (cycle 2)

Re-reviewed rework cf02b84 on lane-e.

**Closed from cycle 1**
- Issue 1 is closed. A type error in `apps/storybook/tests/*.spec.ts` or in `apps/storybook/playwright.config.ts` now fails with TS2322.
- The four cycle-1 bypasses now fail lint, each on its intended rule message:
  - aliased import: the "Do not alias" message;
  - `lit.html`: the namespace-import message, plus the raw-element rule;
  - `<BUTTON>`: the raw-element rule;
  - `unsafeHTML`: the unsafe* rule.
- `<Button>`, upper-case `CLASS=`/`STYLE=` and `lit/static-html.js` are also caught by their intended rules.
- On the clean tree, typecheck, lint and lint:styles all exit 0, and all four plants still fail carrying their tokens.
- Narrowing `unbound-method` to `elements/**` is fine.

**Issue A (blocking): `.mts` / `.cts` / `.tsx` files in `packages/*/src` are invisible to ESLint and Stylelint.**
- A file `packages/mission-ui/src/rule-probe.mts` containing ``html`<button>x</button>` `` passes `pnpm lint`.
- A file `zz-style.mts` containing a css template with `color: #ff00aa` passes `pnpm lint:styles`.
- `tsc` does compile these files, so they are real source. This breaks "gates evaluate full packages".

Remedy:
- ESLint: change the `files` globs to `packages/*/src/**/*.{ts,mts,cts,tsx}` (and do the same for the `**/*.ts` block).
- Stylelint: change the `lint:styles` glob to `{css,ts,mts,cts,tsx}` and the stylelint override to `**/*.{ts,mts,cts,tsx}`.
- Alternatively, have lint fail on any non-`.ts` script file under `packages/*/src`.

**Issue B (blocking): the html/svg tag can still be aliased by value.** Each of these passes lint:
- `const t = html; t\`<button>x</button>\``
- `const o = {t: html}; o.t\`<button>\``
- a local re-export `export { html as h } from "lit"`, which a sibling module then imports as `h`

This is the same aliasing class as cycle-1 issue 2.

Remedy: forbid every reference to `html`/`svg` other than as a tag or an import binding. For example:
- `Identifier[name=/^(html|svg)$/]:not(TaggedTemplateExpression > Identifier.tag):not(ImportSpecifier > Identifier):not(MemberExpression > Identifier.property)`
- `ExportSpecifier[local.name=/^(html|svg)$/]`

Add one probe per form to the hand-off, and name the rule that fires for each probe, not just the exit code.
