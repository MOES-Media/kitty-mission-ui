// The pure surface of the markdown logic: the model, the link table and the budget helpers, and their types. It does NOT
// re-export `render.ts`: the renderer is imported directly by `document-parts.ts` (and by the corpus test), so no importer of
// the model ever loads `lit`. It does not re-export `parse.ts` either: the parser seam is for the model alone.
export { checkSource, checkTokens, measureTokens, truncate } from './budget.js';
export type { MarkdownToken, SourceVerdict, TokenStats, TokenVerdict } from './budget.js';
export { classifyLink, resolveLinks } from './links.js';
export type { LinkContext, LinkTarget, ResolvedBlock, ResolvedInline, ResolvedTarget } from './links.js';
export { MarkdownUnsupported, buildMarkdownModel, buildModelFromTokens, markdownFor } from './model.js';
export type { Block, Inline, MarkdownFallbackReason, MarkdownResult, TableAlign, TablePosition } from './model.js';
