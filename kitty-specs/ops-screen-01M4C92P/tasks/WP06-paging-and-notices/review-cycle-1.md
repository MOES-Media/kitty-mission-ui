---
affected_files: []
cycle_number: 1
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T09:41:07Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 review feedback, cycle 1: REJECT

The paging mechanics are sound. The fixes below are needed.

1. **G-3, the page badges.** Tracer commit e665824, "Fidelity grants at WP05 and WP06", is merged into the planning branch, so merge `feat/ops-screen-11` into this lane first.
   - **Where:** `ops-page-parts.ts:133` and `:146` are plain `sk-pill-tag`.
   - **Look:** give the "Read only" and count pills the outlined mono badge, with G-2's `line-height: 1.2`. Use `data-ops-badge`, or the pinned selectors G-3 names.
   - **Pins:** extend `ops-part-selectors.test.ts` (which today allows `::part` only in ops-row-parts.ts, at :70) and the `stylelint.config.mjs` E-40 badge clause to these two selectors in `ops-page-parts.ts` ONLY. Each needs a leak plant and a positive control.
   - **Alignment:** the pill sits low. The library's action area spans the title and description rows with `align-self: end`. Pin the layout-only rule `[data-ops-section-head]::part(action){grid-row:title}`, or the equivalent, and verify it side by side against the prototype at 1280.
2. **A vacuous test.** `ops-page-parts.test.ts:290`, "Load more is not drawn beside it", uses a view whose `loadMore` is already null. Dropping `this.loadMoreError === null &&` at `sk-ops-screen.ts:222` keeps the suite green.
   - Add a through-screen test: the `[data-load-more]` count is 0 for `opsProps.loadMoreError(null)`, paired with 1 for `opsProps.ready()`.
   - Revert check: dropping that condition must turn it red.
3. **The OP-17 story** (`paging.stories.ts:53`). Spec OP-17 says the badge reads "loaded equals total", but `lastPage()` shows "1 of 5".
   - Use `{...opsProps.longPage(6), totalCount: 6, pageInfo: opsProps.lastPage().pageInfo}`, which gives "6 records".
   - Fix the comment too.
4. **The OP-28 story** (`:65`). It shows "200 records" while a next page exists. Set `totalCount` above 200, for example 1000.
5. **The load-more error button** (`:161`) sits inline in the sentence. Put it in sk-notice's own `slot="actions"` and drop the margin hack at `:119-121`.
6. **The emit positive controls** at `events.test.ts:165` and `:188` assert the count only. Use `expectOne` with a `toEqual` detail.

Not REJECT items:
- The notice look is DO-20 (confirmed).
- The header is DO-17 (confirmed).
- The `supporting` hook for the FR-003 project line stays as written; whether the screen gets a `project` property is pending an operator ruling.
