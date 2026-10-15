---
affected_files: []
cycle_number: 1
mission_slug: phase0-bootstrap-01M4V5KK
reproduction_command:
reviewed_at: '2026-10-14T01:05:03Z'
reviewer_agent: claude
wp_id: WP04
---

# WP04 review feedback (cycle 1) — changes requested

## Verdict
Request changes: one focused defect. Everything else verified green (see bottom).

## Issue 1 (blocking): the generated elements.d.ts is not lint-clean; the triple-slash reference makes E-46 permanent

**Where:** `scripts/typings.mjs` (`CSS_INLINE_REFERENCE`, the `/// <reference path=...>` line in `generate`), and therefore line 5 of `packages/mission-shell/src/generated/elements.d.ts`; `scripts/typings.test.mjs` `EXPECTED_FIXTURE`.

**Evidence:**
```
$ npx eslint --no-ignore packages/mission-shell/src/generated/elements.d.ts
  5:1  error  Do not use a triple slash reference for ../../../mission-ui/src/css-inline.d.ts, use `import` style instead  @typescript-eslint/triple-slash-reference
```
This is the only lint error in the generated file. Exception E-46 (eslint.config.mjs) states its sunset as "the generator emits lint-clean output"; the triple-slash form means the generator can never meet it, and E-46 now hides a rule violation introduced by a design choice rather than by generator limits.

**Fix (verified feasible within owned files, reviewer test, reverted):** emit a side-effect import instead of the reference:
```ts
import '../../../mission-ui/src/css-inline';
```
With that line in place of the reference: `pnpm --filter @moes-media/mission-shell typecheck` -> 0 errors; `eslint --no-ignore` under eslint.config.mjs, eslint.no-io.config.mjs and eslint.data-driven.config.mjs -> exit 0 each. Removing the line entirely fails svelte-check (`Cannot find module '@spec-kitty/styles/...css?inline'`), so the ambient declaration is genuinely needed and the import does bring it in.

**Do:**
1. Change the generator to emit the import form; update the comment wording ("reference" -> "import") and `EXPECTED_FIXTURE`.
2. Regenerate `elements.d.ts` with `node scripts/typings.mjs`.
3. Add an assertion (in typings.test.mjs, real-run test or a new one) that the generated file has no `/// <reference` line, or better, lints clean with ESLint's Node API `--no-ignore` equivalent; red-first: it must fail on the current generator.
4. Keep E-46 unchanged (its removal is a separate decision), but record in the hand-off that the generated file is now lint-clean so E-46 can sunset.
5. Re-run: typecheck, lint, manifest:check, test:scripts, gate-proof local --only manifest and --only typecheck. The manifest plant edit (`selectedPath?: string;`) is unaffected.

## Design judgement on the css-inline coupling (non-blocking)
Pulling in mission-ui's `css-inline.d.ts` is sound and the minimal option within WP04's owned files (shell tsconfig `types`/`include` is WP02-owned; re-declaring `*.css?inline` would duplicate the ambient module). Coupling to a mission-ui internal path fails loudly at typecheck if it moves, which is acceptable. Only its form (triple-slash) is the problem.

## Verified OK (no action)
- 15 elements, equality-asserted against the manifest oracle; event count asserted by equality; imports by name; unknown property/event type names fail with the name; no `any`; deterministic sorted output.
- `--check` drift -> `typings: packages/mission-shell/src/generated/elements.d.ts is stale`, exit 1; restored -> current, exit 0; wired into `pnpm manifest:check`; `typings.test.mjs` in `test:scripts`.
- T021 reproduced: `onsk-open-misson` -> "does not exist in type" error; wrong handler type -> not assignable; non-existent property -> error; `loadingMore` positive control clean. No intents.ts fallback needed.
- Plants: manifest array conversion keeps the original plant; typecheck plants appended (2), payloads `PlantProp.svelte.plant`/`PlantIntent.svelte.plant`. `gate-proof local --only manifest` ok (5977 ms), `--only typecheck` ok (30353 ms); per-plant tokens absent from clean output.
- Gates exit 0: typecheck, lint, manifest:check, hygiene, test:scripts (605/605), test:terminology. `git diff --exit-code <base> -- packages/mission-ui` empty. Only recorded out-of-map edits touched.
