---
affected_files: []
cycle_number: 3
mission_slug: ops-screen-01M4C92P
reproduction_command:
reviewed_at: '2026-10-11T10:01:55Z'
reviewer_agent: user
wp_id: WP06
---

# WP06 review feedback, cycle 3: REJECT (one item, one minor)

Both cycle-2 items are fixed and verified: the G-3 check (c) and the supporting-line tail as copy.

1. **A test locks in behaviour that FR-003 forbids.** `ops-page-parts.test.ts:146-151` was added in 2e95792. It asserts that the loading look draws NO `sk-page-header`. But FR-003 says "The header stays in every state (OP-36)", and WP07 must prove exactly that. As written, this test locks in the stub behaviour and will block WP07.
   - **Fix:** delete the loading half of that test. Do not invert it here, because the loading look is WP07's.
   - **Keep the ready half,** and make sure it still has its positive control.
2. **Minor, fold in now:** the "override emits nothing" test (`:126-144`) has no positive control, which breaks binding rule 1.
   - After `expect(events).toEqual([])`, click `[data-load-more]` on `reworded` and expect exactly one `sk-load-more` (`expectOne`, with a `toEqual` detail).
   - Drop the dead `sk-open-mission` listener.
