// Media-type vocabulary of the Artifact Viewer. The contract's `mediaType` is a free string, so the gate cannot read
// these from the schema: `test/vocabulary-homes.test.ts` asserts they are written only here, in the contract files and
// in the allow-listed fixtures and stories.

/** The one media type the screen branches on: it gets a rendered view and a Raw tab. */
export const MARKDOWN_MEDIA_TYPE = 'text/markdown';

/** The words of the media types the contract's extension table produces. A type not listed shows raw. */
export const MEDIA_TYPE_WORDS: Readonly<Record<string, string>> = {
  'text/markdown': 'Markdown',
  'application/json': 'JSON',
  'application/yaml': 'YAML',
  'application/x-ndjson': 'JSON lines',
  'text/csv': 'CSV',
  'text/plain': 'Plain text',
};
