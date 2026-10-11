# Contract: re-vendoring Mission Status from spec-kitty `main` (pin, types, fixtures)

## Baseline this extends

#4 vendored the contract at `9f41e48` (98 files, `infoVersion` `1.0.0`), with `contract:update --sha`, `contract:check`, `contract:verify-remote`, generated types and fixtures, overlays and relaxations. That pin had NO artifact reads (N-3 of the spec). #5 then re-vendored at `b61d1fa` (`provenance: main`, merged to `main` as PR #8, `ad94164`), which already holds them; the original text follows. #5's lane branches (verified at the lane-j tip `d15cb5d`, 2026-10-06) carry the `--from-repo` form of `contract:update`, a `provenance` field in `PIN.json` and check C8; they are not merged into this checkout, and under Base A (PLAN-DESIGN-017) IC-01a starts only after #5 has merged, so that tooling is present when the re-vendor runs.

## What IC-01a (steps 1 to 5 and 7) and IC-01b (step 6) do

1. **Confirm the pin (operator ruling 2026-10-07, FORK-4 (a): the pin stays).** The pin is #5's `b61d1fa336478dae023a2d82808fef0d811816c3` (`provenance: main`, 2026-10-05 commit). Its vendored tree holds `paths/missions_missionId_artifacts.yaml`, `paths/missions_missionId_artifacts_content.yaml`, `parameters/ArtifactPath.yaml`, the nine `schemas/Artifact*.yaml` (`ArtifactContent`, `ArtifactEntry`, `ArtifactKind`, `ArtifactListing`, `ArtifactPath`, `ArtifactReference`, `ArtifactReferences`, `ArtifactRefusal`, `ArtifactRefusalCode`), the seven `responses/Artifact*.yaml` and the 13 artifact examples (`ArtifactContent` x4, `ArtifactListing` x2, `ArtifactRefusal` x7). Figures are read from the vendored tree by `git ls-tree -r` counting BLOBS only (never tree entries): 151 files, 142 under `contracts/mission-status` and 9 under `contracts/_shared`. The `contracts` tree of spec-kitty `main` at `2261ad5` and at the tip checked on 2026-10-07 has the same tree ids as `b61d1fa`, so a re-vendor would change no byte. A missing artifact file, or a pin other than `b61d1fa`, is reported to the orchestrator, not repaired.
2. **No re-vendor.** `pnpm contract:update` is not run and nothing under `contracts/spec-kitty/**` is edited; `pnpm contract:check --require-main` (and, with network, `pnpm contract:verify-remote`) confirms the pin and that `PIN.json` records no path or username (`git grep` of the checkout prefix is the additional check). The version strings (`1.0.0-SNAPSHOT`) stay read from the pinned tree and are hard-coded nowhere. The generated types already contain the artifact types.
3. **Update literals.** The vendored file count, the fixture count, the kind tallies (`registry.test.mjs`), `Object.keys(fixtures).length` (`overlays.test.mjs`), the counts in `check.test.mjs`, the guard texts that name counts; each from the pinned tree and the base's own current literal (#5 edits the same literals), not from this document. Prefer deriving a count from the registry over adding another literal.
4. **Fixtures.** 13 example fixtures plus the 17 overlays below (30 registered fixtures), registered in `registry.mjs` and `overlays.mjs`. Generated bulk documents are NOT registered (see "Bulk generators").
5. **Relaxations** (modelled on #4's `lane-open`, whose `patch(schema)` rewrites one property and whose `allowedPath` is matched against the STRICT validator's errors; each has a reverted-must-fail proof):
   - `artifact-kind-open`: patches the `kind` property of `ArtifactEntry` and of `ArtifactContent` to `{ type: string, minLength: 1 }`; `allowedPath` `/^\/entries\/\d+\/kind$|^\/kind$/`.
   - `refusal-code-open`: patches the `code` property of the LAST `allOf` entry of `ArtifactRefusal` (the one that `$ref`s `ArtifactRefusalCode.yaml`, a closed seven-value enum) to `{ type: string, minLength: 1 }`; `allowedPath` `/^\/code$/`, which is the only strict error an unknown code produces (the seven if/then branches key on `const` codes, so none of them fires for an unknown code and none adds an error). The unknown-code fixture carries `status: 500` (any integer 400 to 599 satisfies `Problem`).
   Reverted proof for each: with the patch removed the fixture fails the strict schema and check C4 reports `fails even the <name> schema` (token `violates contract`), as the existing relaxations do.
6. **Dependency (IC-01b).** `markdown-it` 15.0.2 exact in `packages/mission-ui/package.json`; `pnpm install`; lockfile reviewed: the new lockfile entries equal the set printed by `pnpm why markdown-it` (not a hard-coded list; the transitive versions float, see `research.md` D-05); evidence recorded.
7. **Existing screens (IC-01a).** `tsc` and the tests of #4's three screens (and #5's) green on the new pin; a break is fixed in the tooling or the overlays, never in a screen, and reported.

## Fixture inventory (frozen after IC-01a; names are the generated export names)

### Registered fixtures (stored in `fixtures.generated.ts`; 13 examples and 17 overlays)

| Fixture | Source | Used by |
|---|---|---|
| `listingPopulated`, `listingTruncated` | contract examples | AV-01 to AV-04, AV-15, AV-17 |
| `contentMarkdown`, `contentRedacted`, `contentJson`, `contentEmpty` | contract examples | AV-01, AV-08, AV-06, AV-07 (`contentEmpty` is text/plain: row 9b; the markdown empty file of row 9a is an IC-07 element test with inline content built from `contentEmpty`, no new fixture or story) |
| `refusalInvalidPath`, `refusalNotFound`, `refusalTooLarge`, `refusalNotText`, `refusalSecret`, `refusalUnreadable`, `refusalListingUnreadable` | contract examples | AV-09 to AV-14, AV-23 |
| `listingWithOpenFiles` | overlay: the entries of `listingPopulated` plus one entry for each open path the content examples and overlays use that `listingPopulated` lacks (`notes/handoff.md`, `contracts/schema.json`, `notes/empty.txt`, and the paths of `contentJsonl`, `contentCsv`, `contentPlain`), in byte order, `truncated: false`; valid against `ArtifactListing` | AV-06, AV-07, AV-08 and the media-type overlays (the listing holds the open path, so size and modified facts come from the entry, AV-24) |
| `listingEmpty` | overlay: `entries: []`, `truncated: false` | AV-18 |
| `listingUnreadableRows` | overlay: three entries with `readable: false` | AV-16 |
| `listingUnknownKind` (relaxed) | overlay: one entry whose kind is outside the enum | AV-29, SC-004 |
| `contentUnknownKind` (relaxed) | overlay: the content of that entry (same path, same unknown kind); the two are separate registry documents | AV-29, SC-004 |
| `refusalUnknownCode` (relaxed) | overlay: a `code` outside the seven, `status: 500` | EV, SC-004 |
| `listingLongNames` | overlay: a 200-character file name, a path near 512 characters | AV-30a, AV-30b |
| `listingDeep` | overlay: ten nested folders | AV-30c |
| `contentFeatures` | overlay: a markdown document exercising every FR-006 element (the document text and its headings never contain the whole word `feature`, C-009), a wide table, nested lists, quotes, code, rules, internal and external links to entries of `listingPopulated` (path `plan.md`) | AV-03 |
| `contentHostile` | overlay: hostile TEXT (script tags, `javascript:` links, remote image destinations, unclosed constructs); no credential-shaped string (path `research.md`) | AV-04 |
| `contentYaml`, `contentJsonl`, `contentCsv`, `contentPlain` | overlays: media type and path changed (`contracts/api.yaml` for the YAML one, the others under `notes/`), content kept short | AV-06 |
| `contentBom` | overlay: leading U+FEFF (path `notes/with space.md`) | edge case |
| `contentPrompt`, `contentReviewCycle` | overlays: kind `work_package_prompt` at `tasks/WP01-example.md` and kind `review_cycle` at `tasks/WP01-example/review-cycle-1.md` | AV-27, AV-28 |

The registry grows by 30 documents; 27 are valid and 3 are relaxed. The totals in `registry.test.mjs` and `overlays.test.mjs` are updated relative to the base's own totals (22 on this checkout; #5 changes them).

Host props (not registry documents; builders in the element's `fixtures.ts`): `missionFacts`, `workPackageList`, shaped like `MissionDetail` fields (AV-25, AV-26).

### Bulk generators (NOT registered, never stored; FR-044, size)

`packages/mission-ui/src/contract/bulk.ts` gains pure functions, imported by the element's `fixtures.ts` builders: `makeArtifactListing(n, { truncated })` (the 1000-entry nested tree, AV-30d, NFR-006, and its truncated form), `makeLargeMarkdown(bytes, path)` (a valid 256 KiB markdown document that the model resolves to `{ kind: 'ok' }` with a block count above 0, a pinned expectation asserted in IC-03 and in the NFR-006 test, AV-30f), `makeLongLine(bytes, path)` (one unbroken 256 KiB line, AV-30e), `makeOverBudgetMarkdown(path)` (a markdown document over the token budget that resolves to `fallback`, pinned the same way, AV-05). Each content generator takes the path it is opened at, and the story pairs it with a listing from `makeArtifactListing` that contains that path. IC-01a extends `checkBulk` in `scripts/contract/check.mjs` (today the only place generated documents are validated against the contract) to validate each generator's output: listings against `ArtifactListing`, contents against `ArtifactContent`, and a size assertion that no generated document is written to a stored file. A bulk generator is never a registry entry, so `fixtures.generated.ts` stays small and check C3's byte comparison does not carry hundreds of KiB.

Every fixture value is synthetic: `[path]` and `[email]` markers appear only as the contract's markers.

## Pairing (story to fixtures)

`contracts/sk-artifact-screen.md` names the stories; IC-06b is the sole owner and creates a pairing table `row -> { listing, content, refusal, selectedPath, mission, workPackages, status, contentStatus }` in `fixtures.ts`, and IC-11's row-to-story test reads it. Constraint (as #5): where both a listing and a content are given, `content.path` must equal `selectedPath`, and the entry for that path must exist in the listing unless the row is the "selected path not in the listing" edge case (R-12). The content examples whose paths `listingPopulated` lacks (`ContentRedacted`, `ContentJson`, `ContentEmpty`) therefore pair with `listingWithOpenFiles`.

## Gate `contract` changes

Counts and literals as above; `checkBulk` is extended for the generators; no new check is added (the provenance check C8 comes from #5, merged under Base A, and applies unchanged: the final pin must be `provenance: main`). The `--require-main` form is the PR-readiness check at IC-11.
