R1 A11Y (frontend-freddy), 5 findings:
- A11Y-001 sev3: a second failed Retry announces nothing. The live text stays identical ("Loading X") through the error state, and only the data-seq attr changes. Fix: clear the announcement on null transitions, or key the span on the seq; test that textContent mutates over loading->error->loading.
- A11Y-002 sev2: the cancellation h3 sits outside any panel and outlines under "Lane history". Fix: h2, or a section with its own heading.
- A11Y-003 sev2: ready + workPackage null announces "loaded" while the empty state draws. Fix: the effective state feeds transitionText, plus a test.
- A11Y-004 sev1: the data-less h1 (loading/not-found) has no title tooltip.
- A11Y-005 sev1 FORK(copy): the assigned group has no h3, but the contract says both groups have one. Options: add an "Assigned" h3 default, or amend the contract.
R1 CONTRACT (reviewer-renata), 5 findings:
- CONTRACT-001 sev2: the Assignment panel is drawn on authored.subtasks.length>0, but subtasks never render, so it can be a titled empty card. Fix: base the draw condition on the rendered members.
- CONTRACT-002 sev2: dead/duplicate copy (review.ts OVERRIDE_BY/AT/REASON duplicate wp-copy LABEL_OVERRIDDEN_*; CYCLE_LABEL, LABEL_VERDICT, STAGE_WORK_PACKAGE, STAGE_STATE, WP_PAGE_LABEL unused), pinned only by wp-defaults tests. Fix: delete them plus their assertions.
- CONTRACT-003 sev2 FORK: lane words differ (history uses resolveLaneLabel "in progress"; other regions use resolveStateBadge "coding"). Options: (a) history uses resolveStateBadge, (b) keep the split, record it in DW-10, and add a test.
- CONTRACT-004 sev2: bare-form dependency nodes say "not started" for an unknown lane. Fix: distinguish unknown from null; the bare form shows no lane word.
- CONTRACT-005 sev2: closest() shadow crossing (duplicate of BOUNDARY-005).
