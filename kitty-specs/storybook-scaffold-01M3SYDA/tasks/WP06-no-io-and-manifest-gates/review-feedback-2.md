# WP06 review feedback (cycle 2) — REQUEST CHANGES

Verified at 3fc5420:
- 49 selftests pass on 42 fixtures, and a missing fixture expectation fails the selftest.
- Manifest regeneration is byte-identical, and package.json is not touched.
- Both plants are caught for their own token, and the clean run exits 0.
- Cycle-1 cases now fail: 18 of 20 no-io cases and all 5 manifest cases.

The two cycle-1 no-io cases that still pass are `(document as any).write(...)` (issue 1) and the MINOR `const r = Reflect; r.get` alias.

Remaining issues are listed below. Prefer the structural remedies given; do not add one selector per probe.

**Issue 1 (MAJOR, no-io): a TypeScript cast defeats every member rule.**
`(document as any).cookie`, `(navigator as any).sendBeacon` and `(document as any).write(...)` all pass. R6 names `sendBeacon` and `cookie` explicitly.
Remedy: forbid `TSAsExpression`, `TSNonNullExpression` and `TSTypeAssertion` whose expression is `document`, `navigator`, `window`, `globalThis` or `self` (for example `TSAsExpression[expression.name=/^(document|navigator|window|globalThis|self)$/]`). Also forbid computed member access on `document` and `navigator` with a non-literal key: `(document as any)['cook'+'ie']` passes today.

**Issue 2 (MAJOR, no-io): other window aliases are not restricted.**
`top.fetch`, `parent.localStorage`, `frames.fetch`, `opener.fetch`, and a destructured `const { defaultView } = el.ownerDocument` all pass. This is the same class as the defaultView fix.
Remedy: add `top`, `parent`, `frames` and `opener` to `no-restricted-globals`. Forbid every `defaultView` identifier, including destructuring keys: `Identifier[name='defaultView']`.

**Issue 3 (MAJOR, no-io): the Function constructor is reachable without `new Function`.**
These all pass:
- `Function.prototype.constructor('...')`
- `Object.getPrototypeOf(async () => {}).constructor('...')`
- `const g = () => 0; (g.constructor as FunctionConstructor)(...)`

Remedy: move `Function` (and `eval`) into `no-restricted-globals` so that every reference is caught. Forbid calling a `.constructor` member (`CallExpression[callee.property.name='constructor']`). Forbid `FunctionConstructor` as a type (`TSTypeReference[typeName.name='FunctionConstructor']`).

**Issue 4 (MAJOR, manifest): an event dispatched through a computed key with no CustomEvent reference escapes.**
`const k='dispatch'+'Event'; (this as any)[k](new Event('sk-x'))` passes. So does `...[k](new (CustomEvent)('sk-x'))`, because the parenthesized callee is not collected.
Remedy: in `scanSource`, flag every `new Event(...)`, and every `CustomEvent` reference that is not the direct argument of an allowed `X.dispatchEvent(...)` call. Unwrap `ParenthesizedExpression` before checking the callee.

**Minor (non-blocking):**
- `class extends Image {}`, `const I = Image; new I()` and `el.setAttribute('src', url)` pass. Moving `Image`, `Audio`, `Worker` and `SharedWorker` to `no-restricted-globals` closes the first two; for `setAttribute`, add `src`/`href`/`srcdoc` checks.
- Lit `html` templates with `<img src=${url}>` are out of scope. Name them in the header's known-limitation note.

Add a fixture or probe for every item.
