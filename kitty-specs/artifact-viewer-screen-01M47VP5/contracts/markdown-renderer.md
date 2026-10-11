# Contract: the markdown renderer (`src/logic/markdown/`)

Binding on IC-03 and IC-04 and on every reviewer. The operator's Q1 ruling (2026-10-06): `markdown-it`, `html: false`, token stream to Lit templates, no `innerHTML`, no `unsafeHTML`, links never navigating, images never loaded, a hostile-corpus test as the gate.

## Files

| File | Role | Imports |
|---|---|---|
| `parse.ts` | builds the one `MarkdownIt` instance and exposes `parseTokens(source): Token[]` only (never the instance); an export-shape test asserts exactly one export | `markdown-it` (the ONLY importer in the repository) |
| `budget.ts` | pre-parse guards and post-parse counts over the flattened token stream, limits from `defaults/markdown.ts` | defaults only |
| `model.ts` | `buildMarkdownModel(source: string, budget?: MarkdownBudget): MarkdownResult` (the budget member of the vocabulary, default `MARKDOWN_BUDGET`); token stream to the closed node union; never throws; knows nothing of the listing | `parse.ts`, `budget.ts` |
| `links.ts` | `classifyLink(destination, openPath, kindOf): LinkTarget` and `resolveLinks(blocks, context)`: the one place a link or image destination is classified, producing the resolved tree the renderer draws | defaults, `../artifact-path.ts` |
| `render.ts` | `renderMarkdown(blocks: ResolvedBlock[], handlers): TemplateResult`: pure drawing of the resolved tree, no classification | `lit` (`html`, `nothing`) and type-only imports of the node types |
| `index.ts` | re-exports the pure surface only: `buildMarkdownModel`, `resolveLinks`, `classifyLink`, the budget helpers and the types. It does NOT re-export `render.ts`: the renderer is imported directly by `document-parts.ts` (and by the corpus test), so no importer of the model ever loads `lit` | |

`kindOf` is a `ReadonlyMap<string, string>` from listing path to entry kind, built once per listing identity by the screen (see "Caches" below); `classifyLink` returns `{ kind: 'artifact', path, entryKind }` so the screen file compares nothing and does no second lookup. The model carries the raw `destination`; `resolveLinks` returns the resolved tree in which every link and image node carries its `target: LinkTarget`.

## Caches (the screen's `willUpdate`; no timer, no storage)

1. Markdown model: keyed by the PAIR (`content.content` string, `content.mediaType`) BY VALUE, not by the identity of the `content` object, so a host that rebuilds the content object per render does not re-parse. The decision whether to parse at all is made in `logic/` by `markdownFor(content): MarkdownResult | null`, which returns `null` unless `content.mediaType` equals `MARKDOWN_MEDIA_TYPE`; the screen compares no media type and never parses a non-markdown file.
2. Path to kind map: keyed by listing identity (the `entries` array), built once.
3. Resolved tree: keyed by (model identity, `openPath`, map identity). A listing change re-resolves but does not re-parse.

One test per cache: the same string in a new object does not re-parse; a non-markdown file never reaches `parseTokens`; a listing swap re-resolves without a parse.

## Parser configuration (one table, `parse.ts`)

| Option | Value | Why |
|---|---|---|
| `html` | `false` | raw HTML is text (FR-006) |
| `linkify` | `false` | no auto-links from bare text; also removes the linkify quadratic paths |
| `typographer` | `false` | removes `replacements` and `smartquotes` (a quadratic advisory) |
| `breaks` | `false` | CommonMark soft breaks |
| `maxNesting` | library default (100) | stops BLOCK nesting (blockquote, list) at 100 levels; INLINE nesting (emphasis, strikethrough, links) is not capped by it, which is why the budget walks the flattened stream (R-05) |
| plugins, `use()`, `enable()` | none | the default preset (CommonMark plus tables and strikethrough) is the set |
| `md.render`, `md.renderInline`, `md.renderer` | never touched | only `md.parse(source, {})` is called |

`md.disable(['html_block', 'html_inline', 'replacements', 'smartquotes'])` is called explicitly as well (defence in depth: the option and the rule set must agree).

markdown-it's default `validateLink` is the FIRST layer of the link defence (see "Link rule"); a test asserts that parsing `[x](javascript:1)` yields no `link_open` token, so a replaced or loosened `md.validateLink` turns the suite red (the test is the one that flips if amendment A-8a is ever rejected: `plan.md` records the one-line recipe; the operator ACCEPTED A-8a and A-8b as drafted at CP-1 on 2026-10-07).

## Token to node (the only reading of a token the model may do)

The model functions take only `{ type, tag, content, level, attrs-by-name }` of a token; they never copy an attribute map and never read an attribute by index.

| Token field | Rule |
|---|---|
| table cell alignment | exact match of the `style` attribute to `text-align:left`, `text-align:center` or `text-align:right`, else `none`; markdown-it expresses alignment only as that CSS string, so a loose `includes` test is a defect |
| ordered list `start` | the `start` attribute is already a number (absent for 1): `Number.isSafeInteger(start)` and `0 <= start <= 999999999`, else 1; the digits regex of the attribute table is applied to `String(start)` |
| link `href`, image `src` | read BY ATTRIBUTE NAME (`href`, `src`), never by index |
| link and image `title` attribute | never read (the document's own title is not shown); the title the renderer writes is the truncated destination (below) |
| image `alt` | the attribute is empty in markdown-it 15.0.2; `alt` is the concatenated plain text of `image.children`: text and inline-code content as is, `softbreak` and `hardbreak` as one space, emphasis, strong and strike flattened to their text, a nested image contributing its own flattened alt, a link inside an alt flattened to its text; the result is truncated to `maxAltChars` |
| reference definitions and `[^1]` | a definition `[^1]: n` becomes an ordinary reference link to `n` with the text `^1` (markdown-it core has no footnotes); it is a corpus entry |

## Node union (closed; `model.ts` exports the type)

Blocks: `heading { level: 1..6, inline }`, `paragraph { inline }`, `list { ordered: boolean, start: number, items: Block[][] }`, `quote { blocks }`, `rule`, `code { text }` (fence and indented code alike; the info string is dropped), `table { align: ('left'|'center'|'right'|'none')[], head: Inline[][], rows: Inline[][][], position: { index: number, total: number } }`. Inlines: `text { text }`, `softbreak`, `hardbreak`, `code { text }`, `emphasis { children }`, `strong { children }`, `strike { children }`, `link { destination, children }`, `image { alt, destination }`; after `resolveLinks` each link and image node also carries `target`. Any token type not in this mapping, including `html_block`, `html_inline` and any future type, makes `buildMarkdownModel` return `{ kind: 'fallback', reason: 'error' }`. Task-list markers and definition lists are not core syntax and appear as literal text; a footnote reference with its definition is an ordinary reference link (table above).

## Budget (`defaults/markdown.ts`; values are data, re-measured by S-A0 in IC-04)

`md.parse()` returns only BLOCK tokens plus one `inline` token per paragraph, heading or table cell; every emphasis, strong, strike, link, code and text token sits in `inline.children`, and a 266,667-character paragraph of nested emphasis openers parses to 3 top-level tokens and about 160,000 inline children nested 40,000 deep (probe, markdown-it 15.0.2). Therefore `maxTokens`, `maxNodes` and `maxDepth` are computed over the FLATTENED stream: every token of the top-level array AND, recursively, every token of every `children` array. Depth is the maximum of `token.level` (and of the open/close nesting count) over that whole flattened stream. The check runs BEFORE the model recursion, and the model recursion (and with it the nesting of Lit templates) is bounded by `maxDepth`: a document at exactly `maxDepth` renders, one level deeper falls back, and a test asserts both.

| Limit | Value (the three budget rows are option O3, ruled at CP-1 on 2026-10-07; the others are the plan-time values) | Over the limit |
|---|---|---|
| `maxSourceChars` | 270000 | not parsed; fallback `too-complex` |
| `maxLineChars` | 20000 | not parsed; fallback `too-complex` |
| `maxTokens` (flattened) | 150000 | fallback `budget` |
| `maxDepth` (flattened token `level`) | 24 | fallback `budget` |
| `maxNodes` (flattened) | 110000 | fallback `budget` |
| `maxTableCells` | 32000 | fallback `budget` |
| `maxTextRun` | 20000 | a longer run is not split; fallback `budget` |
| `titleMax` | 512 | `title` text truncated (never the destination used for events) |
| `maxDestinationChars` | 2048 | a longer destination is inert (not truncated, never emitted) |
| `maxAltChars` | 512 | `alt` text truncated |

Budget rationale (CP-1, 2026-10-07, option O3 of the WP06 evidence): the previous 60,000 / 40,000 / 5,000 sent a mixed 256 KiB document (about 64k tokens) and a 1.7k-row table to the fallback. At 150,000 tokens the best full-pipeline render (parse, model, link resolve, Lit render, forced layout) measured 305 to 346 ms (mixed, headings, bullets and table shapes) and 430 to 460 ms on the worst run; inline-heavy documents of 149k tokens within 256 KiB measured 437 to 512 ms against the 500 ms ceiling of NFR-006. No A-10 multiplier is written; the ceiling test must use a document shape and a margin that do not flake, and a flake goes back to the operator (never a quiet relaxation). `maxTableCells` moves with the tokens (about 0.21 cells per token of a table). `maxDepth` 24 and the other limits are unchanged.

A caught exception anywhere in `buildMarkdownModel`, including a `RangeError`, is `fallback` with reason `error`. The fallback is never a blank screen (US6 AC2); the depth cap above is what makes a render throw impossible outside that try, so no second fallback wrapper is needed around the Lit render of the model.

## What the renderer may write into the DOM

Elements, all literal in templates: `p`, `h1` to `h6` (six literal templates chosen by `level`), `ul`, `ol`, `li`, `blockquote`, `hr`, `pre`, `code`, `em`, `strong`, `s`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `br`, `a` (never with `href`), `span`, `div` (the table scroll box). Nothing else: no `img`, `picture`, `source`, `svg`, `script`, `style`, `link`, `iframe`, `object`, `embed`, `form`, `input`, `button`, `video`, `audio`, `template`, `slot`.

Attributes, all static names, closed by the lint allowlist rule R4 (`contracts/gates.md`): `role`, `tabindex`, `title`, `scope` (`col` on header cells), `start` (digits `^[0-9]{1,9}$` only, from the model's integer), `data-align` (a keyword chosen by a switch), `data-md` (a literal node-kind hook for CSS), `aria-label`, `aria-hidden`, and the listener names `@click` and `@keydown`. A value from the document reaches only `title` (truncated), and only the `title` of a link control (external), an inert link or an image placeholder. No `class`, `style`, `id`, `name`, `href`, `src`, `srcset`, `srcdoc`, `action`, `formaction`, `xlink:href`, `on*` or document-derived `data-*` or `aria-*` value exists, and no property (`.name`) or boolean (`?name`) binding exists in any template of this directory. The table scroll box (the `div` around a `table`) is a plain `div`; only while the `overflowing` set passed in the handlers names it does it carry `role="region"`, `tabindex="0"` and `aria-label` = `TABLE_LABEL(index, total)`, a static positional string from `defaults/` built from the two integers of the table node's `position` ("Table 2 of 5"), so no document text reaches any `aria-*` value (PLAN-A11Y-003 (a) and PLAN-A11Y-004 (a)); both forms are literal templates.

Text: every document string is a Lit child text binding. Nothing is concatenated into a template string; no `unsafeHTML`; no string is parsed as markup (`DOMParser`, `createContextualFragment`, `innerHTML` and the rest are lint-refused).

## Link rule (N-Q12, ruled 2026-10-06) and `classifyLink`

Two layers. Layer 1 is markdown-it's `validateLink`: it turns a destination with the scheme `javascript:`, `vbscript:`, `file:` or `data:` (except the `data:image/{gif,png,jpeg,webp};` forms) into LITERAL TEXT: the paragraph holds the source `[x](javascript:alert(1))` as a text node and no link token exists (probe, markdown-it 15.0.2: plain, mixed-case, `&#106;` entity-letter, literal tab and leading-space forms, and the same for `![x](javascript:x)`). An entity-encoded tab or newline (`[x](java&#9;script:x)`) is NOT rejected by layer 1: it survives as a relative link whose `href` is `java%09script:x`, which layer 2 makes inert through the decoded-control check of row 8. The user therefore sees the raw bracket syntax and no inert link with a title; the corpus expectation for those entries is that literal source text. Layer 2 is `classifyLink`, for everything layer 1 lets through (other schemes such as `x:y`, `//host`, `http://`, relative paths, `data:image/png;...`). Rows 1 and 7 for the blocked schemes are defence in depth, kept with their unit rows.

Input: the link token's `href` attribute (read by name) as markdown-it normalised it. `openPath` is `content.path` (else `selectedPath`); `kindOf` the path-to-kind map of the listing.

| # | Destination | Result |
|---|---|---|
| 1 | empty, longer than `maxDestinationChars`, or contains any character below U+0020, U+007F, whitespace, backslash, or NUL | inert |
| 2 | starts with `#` (fragment only) | inert |
| 3 | starts with `//` (protocol-relative) | inert |
| 4 | starts with `/` (root-relative) | inert |
| 5 | has a scheme (`^[A-Za-z][A-Za-z0-9+.-]*:`): scheme matched case-insensitively against `http`, `https`; `^https?://[^/?#]+` matched case-insensitively and the authority (the part up to the first `/`, `?` or `#`) contains no `@` (a userinfo spoof such as `http://github.com@evil.example.invalid/` is inert) | external (`href` as markdown-it normalised it; the scheme keeps its case, so the host compares it case-insensitively) |
| 6 | scheme `mailto` (case-insensitive) and the whole destination matches `^mailto:[^?#\s]+$` with exactly one `@` in the address; a query or fragment (`mailto:?bcc=...&body=...`) makes it inert | external |
| 7 | any other scheme (`javascript`, `data`, `vbscript`, `file`, `blob`, `tel`, unknown) or `http:`/`https:` without `//host` | inert |
| 8 | relative: strip `?query` and `#fragment`; percent-decode once (failure: inert); reject if the decoded text has a C0 control character, DEL, a character U+0080 to U+009F, NUL or a backslash (the space character U+0020 is allowed: `my%20file.md` names the entry `my file.md`); resolve with `logic/artifact-path.ts` (`resolveRelative`) against the directory of `openPath` (`.` dropped, `..` pops, `..` above the root: inert); an empty segment (`a//b.md`), a trailing slash (`dir/`) or a `.`-only or empty result is inert; a double-encoded `%252e%252e/x.md` decodes once to the literal `%2e%2e/x.md` and is inert | artifact if the result is a key of `kindOf` byte for byte, else inert |

`kind` in `sk-select-artifact` is the matched entry's kind (`entryKind`). An artifact link whose entry has `readable: false` is still an artifact link (D-04). The resolved path is built from segments by the shared path helper, by string operations only. A relative link to the open file itself is an artifact link (re-selecting it is a host matter). The scheme list, the character classes and the length limits are data (`defaults/markdown.ts`).

Unit rows beyond the table: `HTTP://x`, `http://a@b/`, `mailto:?bcc=x`, a 3000-character `https` URL, `my%20file.md`, `a//b.md`, `dir/`, `.`, `%2e%2e/%2e%2e/x.md`, `%252e%252e/x.md`, `data:image/png;base64,AAA` (a link that survives layer 1 and is then inert by row 7), `java%09script:x` (the entity-encoded form above), and each blocked scheme.

Rendering: external and artifact links are `<a role="link" tabindex="0" data-md="link">` with text children, an Enter handler and a click handler calling the handlers passed in (the screen file dispatches), and a visually hidden suffix word from `defaults/` (`LINK_SUFFIX`: artifact, external). An external link ALSO carries `title` = the destination truncated to `titleMax`, so the destination is available to a pointer before the host acts. Inert links are `<span data-md="inert-link" title=${destination truncated}>` with their own visually hidden suffix (`LINK_SUFFIX.inert`, "not a followable link"): one rule for the three results, each carries a state word in the DOM (NFR-011). No `a` has an `href`.

Images: `<span data-md="image">` with the word "Image" from `defaults/`, the alt text (or the word alone when empty), and, when the destination classifies as external and the image is NOT inside a link, the whole placeholder is the external link control above. No request is ever made for an image (FR-008). An image whose destination is an artifact path is NOT linked (the link table applies to links only), so the placeholder is plain text there.

Nesting: links never nest controls. An image that is a descendant of a link renders as plain placeholder text (no control of its own); the outer link is the one control, its visible text includes the placeholder. A link inside an image's alt is flattened to text (see the token table). Consequently one activation emits at most one event and no `a` element contains another.

## Hostile corpus (the gate; `test/markdown-corpus.test.ts`, its model twin (the same assertions on the model, run in the same Chromium project), and the screen pass)

Entries (each with its expected visible text, R-08; for the entries layer 1 rejects, the expected text is the literal source): raw `<script>`, `<img onerror>`, `<iframe>`, `<svg onload>`, `<a href="javascript:...">`, `<style>`, `<form>`, `<base>`, `<meta http-equiv=refresh>`, event-handler attributes in every case spelling, HTML entities that decode to tags and to `javascript:` (`&#106;avascript:`), `[x](javascript:...)` in every case and with embedded tab, newline and entity forms (literal text, except the entity-encoded tab and newline forms, which are inert relative links), `[x](data:text/html,...)`, `[x](vbscript:...)`, `[x](file:///...)` (literal text), `[x](data:image/png;base64,...)` (inert), `[x](//host/path)`, `[x](\\host\share)`, `[x](../../../outside.md)`, `[x](%2e%2e/outside.md)`, `[x](http://)`, `[x](http://a@b/)`, `[x](mailto:?bcc=...)`, `[x](HTTP://EXAMPLE.COM/p)`, a 3000-character destination, reference-style links to each, autolinks `<javascript:...>` and `<http://x>`, `![x](http://remote/p.png)` and a data URL image, `![](...)` with empty alt, a link inside a table cell and a heading and an emphasis, link text equal to its destination, two adjacent links, the image-in-link and link-in-image cases `[![a](http://r/p.png)](b.md)`, `[![a](http://x)](http://y)`, `[![a](x.md)](y.md)`, an image inside an inert link, `![[l](b.md)](http://r/p.png)` and a nested-image alt, a footnote-shaped `[^1]` with its definition `[^1]: n` (an ordinary link), a fence with an info string of `"><script>`, an HTML comment and a CDATA, a 256 KiB single line, 256 KiB of each shape: unclosed `*`, `_`, `[`, `(`, `` ` ``, `<`, `!`, `>`, `\`, `|` table rows, nested `>` and nested `-` lists past `maxDepth`, 50,000 unmatched emphasis delimiters AND matched alternating nested emphasis, strong and strike openers closed in reverse (at 25 and at 40,000 levels deep), 60,001 inline tokens inside a single paragraph, a table cell with deep inline nesting, 5,000 reference definitions, the BOM-prefixed document, NUL and U+FFFD, bidirectional controls (the screen pass also asserts the raw and fallback notice count and that the text is unchanged), a table of 5,001 cells, a document of 60,001 tokens. Credential-shaped strings are assembled from fragments at run time and appear in no file.

The walker is ONE exported test helper, `walkAllowed(root)` (`test/support/walk-allowed.ts`): it descends open shadow roots, treats a library element of the screen's compositions as an allowed leaf whose slotted children are still walked: `sk-notice` (the fallback notice, the truncation note, the redaction line and the bidirectional-control notice, PLAN-FRESH3-006 (a)) and `sk-button`, and returns the visited element count. Every entry asserts `count > 0` and, for valid documents, an exact count derived from the node model (the model twin). A self-test proves the walker itself: a hand-built subtree for each disallowed construct (`img`, `a[href]`, `script`, `style`, `iframe`, `svg`, an `onclick` attribute, a `class` attribute, a `style` attribute) makes it report a violation, and a clean subtree reports none.

Assertions per entry: (1) every element in the walked subtree is in the element allowlist; (2) every attribute name is in the attribute allowlist; (3) no `href`, `src`, `srcset`, `srcdoc`, `style`, `class` (from the document) or `on*` attribute exists; (4) corroboration only: a `<meta http-equiv="Content-Security-Policy" content="img-src 'none'; frame-src 'none'; object-src 'none'">` is inserted in THIS test file's document before any entry renders (a meta CSP cannot be removed for the document, so it is scoped to this file and to the screen-pass file) and a `securitypolicyviolation` listener records any violation; it fires without a network and needs no settle; the positive control is a hand-built `<img src="http://example.invalid/x.png">` in the same harness, which must trigger the listener, and a test fails if the listener is detached (PLAN-TEST-003 (a); a resource-timing observer is not used: it cannot see pending or `data:` requests); (5) activation (click and Enter) of every link emits exactly the expected event or none, never two and never an event from a nested control; (6) the expected visible text is present; (7) a wall-time ceiling per entry (measured in Chromium by S-A0 in IC-04); (8) no uncaught error and the pane is never empty. Assertions (1) and (3) (the structural walk: no `img`, no `src`, no `href`) are the STATED PROOF of NFR-005; (4) is corroboration. Every failure message of the corpus begins with the token `corpus escape`, and that token appears nowhere else (not in a `describe` or `it` title, not in a console line), so a clean run never contains it.

The screen pass (`test/markdown-corpus.screen.test.ts`, IC-07): every entry is also mounted inside `sk-artifact-screen` in `shellFrame`; the same walker runs over the pane including the Raw tab and the fallback source block, and every `sk-*` event is recorded. A guard asserts the entry count equals the model twin's.

Plants (`contracts/gates.md`): (a) the renderer weakened to put the destination in an `href`, (b) `DOMParser` in `logic/markdown/`, (c) `render.ts` emits an `<img src>` for the image node, (d) a property binding `.innerHTML=${text}` in `render.ts`, (e) a lint plant for the property binding. A reviewer extends the corpus from the sources named in R-07.
