# Decision Moment `01M3SYEVBW2T2DBAK77SVNMWRC`

- **Mission:** `storybook-scaffold-01M3SYDA`
- **Origin flow:** `specify`
- **Slot key:** `specify.ci.package-access`
- **Input key:** `ci_package_access`
- **Status:** `resolved`
- **Created:** `2026-09-30T20:00:25.468686+00:00`
- **Resolved:** `2026-09-30T20:17:08.313492+00:00`
- **Opened by:** `cli`
- **Other answer:** `true`

## Question

How should CI authenticate to install the private @spec-kitty/* packages from GitHub Packages?

## Options

- GITHUB_TOKEN with this repo granted Actions access on each package
- Org secret holding a read:packages PAT
- Other

## Final answer

CI runs on GitHub-hosted ubuntu-24.04 runners and installs @spec-kitty/* with a read:packages classic PAT stored as the repo secret NPM_TOKEN (same kind as QA_NPM_TOKEN). The repo .npmrc holds only the scope mapping; local builds use the developer's own ~/.npmrc token.

## Rationale

_(none)_

## Change log

- `2026-09-30T20:00:25.468686+00:00` — opened
- `2026-09-30T20:17:08.313492+00:00` — resolved (final_answer="CI runs on GitHub-hosted ubuntu-24.04 runners and installs @spec-kitty/* with a read:packages classic PAT stored as the repo secret NPM_TOKEN (same kind as QA_NPM_TOKEN). The repo .npmrc holds only the scope mapping; local builds use the developer's own ~/.npmrc token.")
