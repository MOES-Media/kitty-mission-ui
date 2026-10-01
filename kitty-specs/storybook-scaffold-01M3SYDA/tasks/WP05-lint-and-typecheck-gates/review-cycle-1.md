---
affected_files: []
cycle_number: 1
mission_slug: storybook-scaffold-01M3SYDA
reproduction_command:
reviewed_at: '2026-09-30T22:22:39Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review feedback (cycle 1)

Reviewed commit b8729bb on lane-e. Every DoD command was re-run and passes: clean `pnpm typecheck && pnpm lint && pnpm lint:styles` exits 0; all four plant toggles print PLANT-CAUGHT and clean-exit=0 with a 0 count on the clean tree; the untracked-file check exits 1 then 0; the three rule probes fail as required; the `--changed|git diff|lint-staged` grep prints nothing. The R4 tool versions are exact. Nothing leaks a path, username or token. Two blocking issues remain.

**Issue 1 (blocking): the out-of-map `apps/storybook/tsconfig.json` edit drops `tests` from the typecheck scope.**
The include went from `[".storybook", "tests"]` to `[".storybook/**/*.ts"]`. As a result, WP08's `apps/storybook/tests/visual/*.spec.ts` and `apps/storybook/playwright.config.ts` are never type-checked. Reproduction: create `apps/storybook/tests/zz.spec.ts` containing `export const zzProbe: number = "x";`. `pnpm typecheck` exits 0. This contradicts research R1-15 (the include must cover the package's test directory).
Remedy (verified by the reviewer): `"include": [".storybook/**/*.ts", "tests/**/*.ts", "*.ts"]`. With that include the clean run exits 0 (no TS18003) and the probe above fails with exit 2.

**Issue 2 (blocking): the elements-over-CSS ESLint rules can be bypassed.** `pnpm lint` exits 0 for each of these in `packages/mission-ui/src`:
- `import {html as h} from "lit"; export const x = h\`<button>x</button>\`;` (aliased tag)
- `import * as lit from "lit"; export const x = lit.html\`<button>x</button>\`;` (namespace tag)
- `html\`<BUTTON>x</BUTTON>\`` (HTML tag names are case-insensitive, but the regex is not)
- `html\`<div>${unsafeHTML("<button>x</button>")}</div>\`` (raw markup, including `style=`, enters through `unsafeHTML`)

Remedy:
- Make the regexes case-insensitive (`/.../i`).
- Also match `TaggedTemplateExpression[tag.property.name='html']` and `svg`.
- Forbid aliasing: `ImportSpecifier[imported.name=/^(html|svg)$/][local.name!=/^(html|svg)$/]`, or forbid namespace imports of `lit`.
- Add `unsafeHTML`, `unsafeSVG`, `unsafeStatic` and `lit/static-html.js` to the forbidden identifiers and imports.
- Add one probe per bypass to the hand-off.

**Non-blocking notes**
- Deviation (1), the typecheck plant rewritten to an undeclared name: accepted. The literal `'x'` form never puts `plantTypecheck` into tsc output. The stylelint tokens also reach the output only through the file name, which is fine because the names are unique.
- Deviation (3), `unbound-method` turned off: accepted. The rationale is correct (Lit binds `@event` handlers to the host) and it is commented. You could narrow it to `packages/*/src/elements/**`.
- Stylelint: longhands such as `padding-inline`, `margin-block` and `row-gap`, and also `top` and `inset`, accept a bare `%` value because the strict-value rule lists only the R4 shorthands. This is within R4 as written. Consider adding the longhands.
