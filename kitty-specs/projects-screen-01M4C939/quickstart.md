# Quickstart: Projects screen

Run from the clone root; every repo-wide command is guarded with `test "$(git rev-parse --show-toplevel)" = "<clone>"`.

1. Precondition: spec-kitty PR #5881 is merged to `main`. Then `pnpm install`, `pnpm preflight`.
2. Baseline: `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm lint:data-driven && pnpm manifest:check && pnpm hygiene && pnpm contract:check && pnpm test && pnpm test:scripts && pnpm test:contract` (record the result).
3. Re-vendor (IC-01): `pnpm contract:update --sha <merged main sha>`, `pnpm contract:generate`, `pnpm contract:check --require-main`.
4. Develop a screen part: `pnpm storybook`, open "Screens/Projects"; run `pnpm --filter @spec-kitty/mission-ui test -- sk-projects-screen`.
5. Regenerate the manifest after a surface change (IC-04b, IC-08 only): `pnpm manifest:generate && pnpm manifest:check`.
6. Visual: `pnpm visual` runs in the pinned container; baselines are updated with `pnpm visual:update` in IC-08 only.
7. Before the PR: `pnpm gate-proof`, `pnpm contract:verify-remote`.

Host usage:

```html
<sk-mission-shell layout="picker" status="ready">
  <sk-projects-screen status="ready"></sk-projects-screen>
</sk-mission-shell>
<sk-open-project-dialog></sk-open-project-dialog>
```
```js
screen.entries = [{ key: 'a1', location: '~/work/example-app', project: { name: 'example-app', /* ...GET /project body */ } }];
screen.addEventListener('sk-open-project', (e) => route(e.detail.key));
screen.addEventListener('sk-request-open-project', () => (dialog.open = true));
```
