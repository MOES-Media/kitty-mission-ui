---
affected_files: []
cycle_number: 1
mission_slug: projects-screen-01M4C939
reproduction_command:
reviewed_at: '2026-10-08T09:50:39Z'
reviewer_agent: user
wp_id: WP05
---

# WP05 review feedback, cycle 1: changes requested (orchestrator rulings on your decisions)

Your decisions 1 to 6 are ruled in `tracer-design-decisions.md`, section "CP-1 addendum at the WP05 review (2026-10-08)" (commit cc05e27). That section outranks this summary. WP05 owns the lint configs, so the new entries are added here.

1. **E-32(c), dialog chrome:** add the Stylelint entries (dialog file only, pinned values, leak tests in every sibling, value plants) AND draw them in the dialog element, which you own:
   - eyebrow: mono family, size token rendering 12 px, uppercase, `letter-spacing: 0.08em`, colour `--sk-fg-subtle`;
   - header and footer separators: `border-block-end` / `border-block-start` with the width token, `solid`, the border token;
   - hint and disabled-reason text in the token the prototype renders (measure it);
   - `.kittify/` and `kitty-specs/` drawn as `code` in the mono family. The copy stays in `defaults/`, and the split stays data-driven.
   Show it side by side with `01-projects.html` at 1280 and 620 afterwards.
2. **E-34(b), header band, `header-parts.ts`:** add the config entries and tests only; WP06 draws them:
   - a 1 px bottom border (width token, solid, border token);
   - a minimum block size of 76 px as a token or a rem calc. Probe which form passes; a px literal is refused.
3. **E-33(b), state panel, `state-parts.ts` only:** add the config entries and tests that mirror #4's panel values (the #7 E-45 precedent): dashed card border, fill, radius and padding, tokens only. Read #4's values from its own grant entry. WP06 draws them.
4. **E-34 eyebrow colour:** pin it to `--sk-fg-subtle`, since "muted" means the token the prototype renders.
5. **No change needed for these:** the E-33 reset words (`transparent`, `inherit`) are accepted, and the copy and announcement decisions 5 and 6 are accepted.

Every new entry follows the existing proof pattern: a pass case, leak tests, a value plant and a revert check. Re-run the full gate set (no `pnpm visual`).
