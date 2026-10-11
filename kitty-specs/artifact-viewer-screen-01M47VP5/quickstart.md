# Quickstart: Artifact Viewer screen

For a developer or reviewer picking up a work package of this mission. Commands run from `<repo>` on the mission's lane worktree, after the build base (see `plan.md`, "Build base") is present.

## Use the element (a host)

```html
<sk-mission-shell layout="mission" flush ...>
  <sk-shell-tree slot="sidebar-section" id="tree" heading="Artifacts" label="Artifacts"></sk-shell-tree>
  <sk-artifact-screen id="art" status="ready" content-status="ready"></sk-artifact-screen>
</sk-mission-shell>
<script type="module">
  const tree = document.querySelector('#tree');
  const art = document.querySelector('#art');
  art.listing = listingFromListArtifacts;               // ArtifactListing
  art.content = contentFromGetArtifactContent;          // ArtifactContent (or null)
  art.refusalCode = refusal ? refusal.code : null;      // when content-status is refused
  art.selectedPath = 'spec.md';
  art.mission = missionDetail;                          // missionId, slug, friendlyName, ...; host-held
  art.workPackages = missionDetail.workPackages;        // wpId and title
  art.now = new Date().toISOString();                   // the host owns the clock
  // art.vocabulary = ...                               // optional structural input (A-9); null or unset means the defaults
  // build ONCE per change of entries or selectedPath (memoise on those identities); a new items array resets the shell tree's folder state
  // and re-creates its rows, so the host keeps the opened folders itself and passes them in as expandedIds
  const opened = new Set();                              // folder ids the user opened; held by the host, read-only
  const { nodes, current } = buildArtifactTree(listing.entries, { selectedPath: art.selectedPath, expandedIds: opened });
  tree.items = nodes; tree.current = current;   // current is '' when the selected leaf is unavailable
  art.addEventListener('sk-select-artifact', (e) => open(e.detail.path));
  art.addEventListener('sk-open-link', (e) => openExternal(e.detail.href));   // untrusted: re-validate the scheme (case-insensitively) first
  art.addEventListener('sk-select-work-package', (e) => route(e.detail.wpId));
  art.addEventListener('sk-open-mission', (e) => route(e.detail.slug));
  art.addEventListener('sk-retry-load', (e) => reload(e.detail));             // discriminate on e.detail.target
  tree.addEventListener('sk-navigate', (e) => { const path = pathOfArtifactNode(e.detail.id); if (path !== null) open(path); });  // the inverse of the leaf id
  // sk-tree-toggle: record it in the Set (add when expanded, delete when not); never write it back to the shell tree and never rebuild on it,
  // so the focused summary survives the toggle; the Set is only read at the next rebuild (a selection change), where an opened sibling folder stays open
  tree.addEventListener('sk-tree-toggle', (e) => { if (e.detail.expanded) opened.add(e.detail.id); else opened.delete(e.detail.id); });
  // a selection change rebuilds the tree, the shell tree re-creates its rows and the focused row is gone: the screen records in willUpdate that focus was in the tree and, after updateComplete plus one animation frame, moves focus to the pane if it fell to the body (no host code needed)
</script>
```

The host performs both reads (`listArtifacts`, `getArtifactContent`), passes `status` and `content-status`, the refusal `code` (never the title), the Mission, the Work Packages and `now`, builds the tree with `buildArtifactTree`, keeps the `Set` of opened folders and routes every event. The screen performs no I/O and opens nothing: `sk-open-link` is a request carrying an UNTRUSTED destination: the host must accept only `http`, `https` and `mailto` (compared case-insensitively) before opening it, must not navigate its own window or webview to it, and should show the destination to the user first.

## Everyday commands

| Task | Command |
|---|---|
| Typecheck, lint, style, hygiene, no-I/O | `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm hygiene`, `pnpm lint:no-io && pnpm test:no-io` (use the base's script names if they differ) |
| Unit, interaction and corpus tests (Chromium) | `pnpm test` |
| Terminology check (the word `feature` appears nowhere under `packages/*/src`, C-009; an exit check of every WP that writes there: IC-01a, IC-02 to IC-04, IC-06b, IC-07 to IC-11) | `pnpm test:terminology` |
| Node tests (the bundle budget and the row-to-story test, under `scripts/`; source scans run in the browser project through `?raw` globs) and the lint self-test | `pnpm test:scripts`, and `pnpm lint:no-io && pnpm test:no-io` (which also runs `gates/markdown-lint.selftest.ts`) |
| Contract gate and its tests | `pnpm contract:check && pnpm test:contract` |
| Re-vendor the contract (IC-01a, IC-11) | `pnpm contract:update --sha <spec-kitty main sha>` |
| Data-driven gate | `pnpm lint:data-driven && pnpm test:data-driven` |
| Manifest | `pnpm manifest:check` (regenerate only in IC-06b and IC-11: `pnpm manifest:generate`) |
| Regenerate types and fixtures | `pnpm contract:generate` |
| Storybook | `pnpm storybook` |
| Visual baselines (IC-11 only, pinned container) | `pnpm visual`, `pnpm visual:update` |
| Gate proof (orchestrator) | `pnpm gate-proof --only unit-tests`, `--only eslint`, `--only data-driven` |

## Where things live

Defaults in `packages/mission-ui/src/defaults/` (five modules and `index.ts`; the shared `sk-retry-load` types in `src/retry-types.ts`), logic in `src/logic/` (nine files; the markdown model and renderer in `src/logic/markdown/`, six files, the only importer of `markdown-it` is `parse.ts`, and `render.ts` is imported directly, never through the barrel), the element in `src/elements/sk-artifact-screen/`, fixtures generated into `src/contract/fixtures.generated.ts`, tests in `packages/mission-ui/test/`, contract notes in `kitty-specs/artifact-viewer-screen-01M47VP5/contracts/`.

## Rules in one list

No I/O. No `innerHTML`, `unsafeHTML`, `DOMParser`, `href` or `img` anywhere in the screen. Document text is data: a text binding, or the truncated destination in the `title` of an external link, an inert link or an image placeholder. Kinds, codes, words and the budget live in `defaults/`. Every exception is numbered, token-only, file-scoped and has a sunset. Baselines only in IC-11, only in the pinned container (five consecutive local `pnpm visual` runs there are IC-11's exit evidence). A WP never pushes and never starts sub-agents. A denied command means stop and report.

## Manual checks before handing a WP over

1. The gate commands above for the files you touched, and `pnpm test:terminology` for any WP that wrote under `packages/*/src`. 2. For a visual WP, an uncommitted side-by-side screenshot per story against the prototype (no PNG committed). 3. For IC-03 and IC-04, run the corpus with one entry deliberately removed to prove the harness fails it, and confirm a clean `pnpm test` prints no `corpus escape`. 4. List every file you wrote and confirm it is inside your WP's write scope.
