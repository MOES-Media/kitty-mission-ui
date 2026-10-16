---
affected_files: []
cycle_number: 1
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T14:29:24Z'
reviewer_agent: claude
wp_id: WP05
---

# WP05 review feedback, cycle 1

Verdict: **changes requested** (one blocking finding, small fix).

Everything else checks out: generator, `MissionUiIntents`/`MissionUiTag`, staleness, the table against
`contracts/intent-map.md` (40 pairs, 23 events, 5 `via` rows on 4 tags, 6 `desktopOnly` rows), the R-09 coverage
types, P-2, the gates, and 326/326 tests. See "Verified" below.

## F1 (blocking, medium): `controller.intent` throws or calls `Object.prototype` members for inherited keys

The new dispatcher in `packages/mission-shell/src/controller/shell-controller.ts` looks up
`table[tag]?.[event]` on plain object literals, then `table[entry.via]?.[event]`. The `as unknown as IntentLookup`
cast (deviation 3) claims the lookup yields either an entry or `undefined`. For inherited property names it yields
neither. `intent` is public with `(tag: string, event: string, detail?: unknown)`, so these strings are reachable.
Reproduced through a temporary Node test (since removed), with `mode: 'desktop'` and `client: null`:

| call | result |
|---|---|
| `intent('constructor', 'call', {})` | `TypeError: handler is not a function` |
| `intent('constructor', 'name', {})` | `TypeError: Cannot use 'in' operator to search for 'via' in Object` |
| `intent('__proto__', 'hasOwnProperty', {})` | `TypeError: Cannot convert undefined or null to object` |
| `intent('toString', 'call', {})` | `TypeError: handler is not a function` |
| `intent('sk-mission-shell', 'constructor', {})` | no throw, but it invokes `Object(intentCommands, detail)` |

This breaks T026 step 1 and WP03's rule: an absent pair (including an unknown one) does nothing and never throws.
It is also a regression. WP03/WP04's dispatcher keyed on `` `${tag} ${event}` ``, and that key always contains a
space, so it could not hit a prototype member.

**Fix:** resolve only own properties at every hop: the tag, the event, the `via` target and its event. For example,
use `Object.hasOwn(table, tag)` and `Object.hasOwn(row, event)` before indexing. Another way is a null-prototype map
or a `Map` built once from `INTENT_TABLE`. Then check that the resolved value is a function, or an object with a
string `via`, before calling it or following it. Keep the one-hop rule.

**Test:** `test/logic/**` is not WP05's. Either list a change request for a WP03/WP04 test that covers
`constructor`/`__proto__`/`toString` with `call`/`name`/`hasOwnProperty`, or record a throwaway probe's output in
the final report. The reviewer will re-run the probe above.

## Non-blocking observations (no change required)

- **N1 (low):** `IntentCommands` takes `detail: unknown`, and each command re-reads its fields tolerantly. A
  mistyped detail therefore cannot misbehave at run time; it just does nothing. But detail typing stops at the
  table's handler parameter. If mission-ui renamed a detail field (for example `href` to `url`), the table would
  still compile and the command would quietly read `undefined`. R4-05 is met as written (handlers are typed by
  detail; `d.txt` fails), so this is only a note for later.
- **N2 (info):** The `via` constraint admits any hosting tag that declares the same event with the same detail. For
  example, `sk-work-package-board` `{ via: 'sk-artifact-screen' }` typechecks, because `sk-artifact-screen` also
  declares `sk-select-work-package` with `SkSelectWorkPackageDetail`. This matches the spec's constraint. WP06's
  exactly-once sweep is the guard against the wrong host.
- **N3 (info):** `Handler<D>` returns `void | Promise<void>`, where the prompt had `void`. This is needed for the
  async host commands, and it is fine.

## Verified (evidence)

- **Scope:** `git diff 1ca4d4a^ 37210d4` touches only the 7 expected files. It covers the owned files plus the
  recorded out-of-map `shell-controller.ts`. `test/**` is identical to lane-d's tip.
- **Generator:**
  - `MissionUiIntents` emits a sorted `{tag:{event:Detail}}` for all 15 tags, with `sk-mission-sample` included and
    `sk-phase-bar: Record<never, never>`.
  - The detail texts equal the `on<event>` handler texts.
  - `export {};` is removed, and the file is still a module through the new exports.
  - The scoped 15-element regex is sound: the first `\n  }\n` after `SvelteHTMLElements {` is that interface's close.
  - `pnpm manifest:check` is green.
  - With one detail hand-edited, `node scripts/typings.mjs --check` reports `elements.d.ts is stale` (exit 1).
- **Table:**
  - Every row matches the intent map.
  - Run-time count: 40 pairs, 23 distinct events, 5 `via` rows on 4 tags, 14 keys (including `sk-phase-bar`), and
    6 `desktopOnly(` rows on exactly the six Dashboard-ignored rows.
  - `'sk-copy-command':` occurs once.
- **Type probes** (all restored):

  | probe | result |
  |---|---|
  | missing `sk-copy-command` | 1 error: `coverage.ts:11:14 Type 'true' is not assignable to type '"sk-drift-screen sk-copy-command"'` |
  | missing board `via` | names `"sk-work-package-board sk-select-work-package"` |
  | undeclared pair | TS2353 plus `unknownIntent` naming `"sk-ops-screen sk-not-an-intent"` |
  | wrong `via` (`sk-ops-screen` on `sk-shell-tree` `sk-tree-toggle`) | fails |
  | `via` to a host lacking the event (`sk-pipeline-screen` for `sk-filter-change`) | fails |
  | nested tag with a handler | fails |
  | hosting tag with a `via` | fails |
  | `d.txt` | fails: `Property 'txt' does not exist on type 'SkCopyCommandDetail'` |
  | `sk-mission-sample` in the table | fails |

- **P-2:** an appended object only. The `find` matches the committed line once. `heavy pnpm gate-proof leg --gate
  typecheck` reports `typecheck proven (clean 0, planted 1, 35770 ms)`, 36.4 s wall time. The lane was clean before
  and after, with `table.ts` intact.
- **Controller:**
  - No `(tag, event)` branches and no `DASHBOARD_IGNORED` remain.
  - The `pickerAllowed` guards remain at lines 377, 390, 411, 421, 668 and 675.
  - The commands are identical to WP03/WP04's bodies.
- **Gates:** `pnpm typecheck` (0/0), `lint`, `lint:no-io`, `hygiene` (0 findings), `test:scripts` (646/646), and
  `heavy pnpm --filter @moes-media/mission-shell test` (326/326).
- **Layering:** `src/intents/**` has type-only imports, from `../generated/elements`, `../controller/shell-controller`
  and `./table`. It has no `svelte` import and no mission-ui runtime import.
