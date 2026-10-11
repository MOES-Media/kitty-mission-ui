import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import kindYaml from '../../../contracts/spec-kitty/mission-status/schemas/ArtifactKind.yaml?raw';
import codeYaml from '../../../contracts/spec-kitty/mission-status/schemas/ArtifactRefusalCode.yaml?raw';
import * as defaults from '../src/defaults/index.js';
import * as kinds from '../src/defaults/artifact-kinds.js';
import * as media from '../src/defaults/artifact-media.js';
import * as refusals from '../src/defaults/artifact-refusals.js';
import * as copy from '../src/defaults/artifact-copy.js';
import * as markdown from '../src/defaults/markdown.js';
import { lookup } from '../src/logic/lookup.js';

const KIND_ENUM = (parse(kindYaml) as { enum: string[] }).enum;
const CODE_ENUM = (parse(codeYaml) as { enum: string[] }).enum;

const modules: Array<[string, Record<string, unknown>, readonly string[]]> = [
  [
    'artifact-kinds',
    kinds,
    [
      'ARTIFACT_KIND_WORDS', 'UNKNOWN_KIND_ICON', 'WORK_PACKAGE_PROMPT_ARTIFACT_KIND', 'REVIEW_CYCLE_ARTIFACT_KIND', 'WORK_PACKAGE_LINK_KINDS',
      'WP_CONTAINER_SEGMENT', 'TOKEN_SEPARATOR', 'PATH_SEPARATOR', 'TREE_ID_PREFIX', 'TREE_FOLDER_ID_PREFIX', 'ARTIFACT_HREF_PREFIX',
    ],
  ],
  ['artifact-media', media, ['MARKDOWN_MEDIA_TYPE', 'MEDIA_TYPE_WORDS']],
  [
    'artifact-refusals',
    refusals,
    ['ARTIFACT_REFUSALS', 'REFUSAL_GENERIC', 'REFUSAL_GENERIC_EYEBROW', 'REFUSAL_TITLE', 'CONTENT_ERROR_DEFAULT', 'LISTING_ERROR_DEFAULT', 'LISTING_ERROR_HEADING', 'CONTENT_SIZE_LIMIT_BYTES'],
  ],
  [
    'markdown',
    markdown,
    ['MARKDOWN_BUDGET', 'OPAQUE_LINK_SCHEME', 'EXTERNAL_LINK_SCHEMES', 'LINK_SUFFIX', 'INERT_LINK_TITLE_PREFIX', 'IMAGE_WORD', 'CODE_LANGUAGE_SHOWN', 'BIDI_CONTROL_CODE_POINTS'],
  ],
];

describe('the artifact default modules export exactly what contracts/defaults.md names', () => {
  it('has every named export in its file, re-exported from the index as the same value', () => {
    let ran = 0;
    for (const [name, mod, names] of modules) {
      expect(Object.keys(mod).sort(), name).toEqual([...names].sort());
      for (const n of names) {
        expect((defaults as Record<string, unknown>)[n], `${name}.${n}`).toBe(mod[n]);
        ran += 1;
      }
    }
    expect(ran).toBe(11 + 2 + 8 + 8);
  });

  it('exports the copy module names and re-exports each from the index', () => {
    const names = Object.keys(copy);
    expect(names.length).toBeGreaterThan(40);
    for (const n of names) expect((defaults as Record<string, unknown>)[n], n).toBe((copy as Record<string, unknown>)[n]);
    for (const n of ['LISTING_MAX_ENTRIES', 'TRUNCATED_NOTE', 'UNAVAILABLE_TEXT', 'ARTIFACT_INSPECTOR_LABEL', 'OPEN_WP_LABEL', 'TABLE_LABEL', 'BIDI_NOTICE', 'announceListingLoaded', 'SIZE_UNITS']) {
      expect(names, n).toContain(n);
    }
  });

  it('keeps the review-cycle kind the one value of the landed review module', async () => {
    const review = await import('../src/defaults/review.js');
    expect(kinds.REVIEW_CYCLE_ARTIFACT_KIND).toBe(review.REVIEW_CYCLE_ARTIFACT_KIND);
  });
});

describe('the kind table', () => {
  it('has a key per contract kind, each with a label and an icon, and no other key', () => {
    expect(KIND_ENUM.length).toBe(12);
    expect(Object.keys(kinds.ARTIFACT_KIND_WORDS).sort()).toEqual([...KIND_ENUM].sort());
    let ran = 0;
    for (const kind of KIND_ENUM) {
      const word = lookup(kinds.ARTIFACT_KIND_WORDS, kind);
      expect(typeof word?.label, kind).toBe('string');
      expect(word?.label.length, kind).toBeGreaterThan(0);
      expect(typeof word?.icon, kind).toBe('string');
      ran += 1;
    }
    expect(ran).toBe(12);
  });

  it('words the twelve kinds as the contract table says', () => {
    const labels = Object.fromEntries(Object.entries(kinds.ARTIFACT_KIND_WORDS).map(([k, v]) => [k, v.label]));
    expect(labels).toEqual({
      spec: 'Specification', plan: 'Plan', tasks: 'Tasks', data_model: 'Data model', quickstart: 'Quickstart', analysis_report: 'Analysis report',
      research: 'Research', contract: 'Contract', checklist: 'Checklist', work_package_prompt: 'Work Package prompt', review_cycle: 'Review cycle', other: 'File',
    });
  });

  it('draws the magnifier for research, the table for the data model and the file glyph for every other kind', () => {
    const icons = Object.fromEntries(Object.entries(kinds.ARTIFACT_KIND_WORDS).map(([k, v]) => [k, v.icon]));
    expect(icons.research).toBe('magnifier');
    expect(icons.data_model).toBe('table');
    const others = Object.entries(icons).filter(([k]) => k !== 'research' && k !== 'data_model');
    expect(others.length).toBe(10);
    expect(others.every(([, icon]) => icon === 'file')).toBe(true);
    expect(kinds.UNKNOWN_KIND_ICON).toBe('file');
  });

  it('names the two Work Package link kinds and the container, separator and id prefixes', () => {
    expect(kinds.WORK_PACKAGE_PROMPT_ARTIFACT_KIND).toBe('work_package_prompt');
    expect(kinds.REVIEW_CYCLE_ARTIFACT_KIND).toBe('review_cycle');
    expect(kinds.WORK_PACKAGE_LINK_KINDS).toEqual(['work_package_prompt', 'review_cycle']);
    expect(kinds.WP_CONTAINER_SEGMENT).toBe('tasks');
    expect(kinds.TOKEN_SEPARATOR).toBe('-');
    expect(kinds.PATH_SEPARATOR).toBe('/');
    expect(kinds.TREE_ID_PREFIX).not.toBe(kinds.TREE_FOLDER_ID_PREFIX);
    expect(kinds.TREE_FOLDER_ID_PREFIX.startsWith(kinds.TREE_ID_PREFIX)).toBe(false);
    expect(kinds.TREE_ID_PREFIX.startsWith(kinds.TREE_FOLDER_ID_PREFIX)).toBe(false);
    expect(kinds.ARTIFACT_HREF_PREFIX.length).toBeGreaterThan(0);
  });
});

describe('the media words and the refusal table', () => {
  it('words the six media types and treats text/markdown as the one branch value', () => {
    expect(media.MARKDOWN_MEDIA_TYPE).toBe('text/markdown');
    expect(media.MEDIA_TYPE_WORDS).toEqual({
      'text/markdown': 'Markdown', 'application/json': 'JSON', 'application/yaml': 'YAML', 'application/x-ndjson': 'JSON lines', 'text/csv': 'CSV', 'text/plain': 'Plain text',
    });
  });

  it('has a row per contract refusal code and no other, with the retry flag only on the unreadable content read', () => {
    expect(CODE_ENUM.length).toBe(7);
    expect(Object.keys(refusals.ARTIFACT_REFUSALS).sort()).toEqual([...CODE_ENUM].sort());
    const retryable = Object.entries(refusals.ARTIFACT_REFUSALS).filter(([, row]) => row.retryable).map(([code]) => code);
    expect(retryable).toEqual(['artifact_unreadable']);
    const eyebrows = Object.fromEntries(Object.entries(refusals.ARTIFACT_REFUSALS).map(([code, row]) => [code, row.eyebrow]));
    expect(eyebrows).toEqual({
      invalid_artifact_path: 'Invalid path', not_found: 'Not found', artifact_too_large: 'Too large', artifact_not_text: 'Not text',
      artifact_secret: 'Credential found', artifact_unreadable: 'Unreadable', artifact_listing_unreadable: 'Unreadable',
    });
  });

  it('builds the sentence of every row, the size row with and without a size text', () => {
    const ctx = { sizeText: null, limitText: '256 KiB' };
    const sentences = Object.fromEntries(Object.entries(refusals.ARTIFACT_REFUSALS).map(([code, row]) => [code, row.sentence(ctx)]));
    expect(sentences).toEqual({
      invalid_artifact_path: 'The path is not a valid artifact path.',
      not_found: 'This artifact does not exist in this Mission.',
      artifact_too_large: 'This artifact is over the 256 KiB limit, so it is not shown.',
      artifact_not_text: 'This artifact is not text, so it is not shown.',
      artifact_secret: 'This artifact holds what looks like a credential, so nothing of it is shown.',
      artifact_unreadable: 'This artifact could not be read.',
      artifact_listing_unreadable: 'The list of artifacts could not be read.',
    });
    expect(refusals.ARTIFACT_REFUSALS.artifact_too_large.sentence({ sizeText: '300 KiB', limitText: '256 KiB' })).toBe('This artifact is 300 KiB, over the 256 KiB limit, so it is not shown.');
    expect(refusals.CONTENT_SIZE_LIMIT_BYTES).toBe(262144);
    expect(refusals.REFUSAL_GENERIC).toBe('This artifact could not be shown.');
    expect(refusals.REFUSAL_TITLE).toBe('Artifact unavailable');
  });
});

describe('the copy and the markdown data', () => {
  it('builds the truncation note from the one listing cap', () => {
    expect(copy.LISTING_MAX_ENTRIES).toBe(1000);
    expect(copy.TRUNCATED_NOTE).toBe('Showing the first 1000 artifacts');
  });

  it('words the parametrised copy', () => {
    expect(copy.OPEN_WP_LABEL('WP01')).toBe('Open Work Package WP01');
    expect(copy.TABLE_LABEL(2, 5)).toBe('Table 2 of 5');
    expect(copy.DOCUMENT_LABEL('spec.md')).toBe('Document: spec.md');
    expect(copy.BIDI_NOTICE(3)).toContain('3');
    expect(copy.announceListingLoaded(4)).toContain('4');
    expect(copy.announceContentLoaded('spec.md')).toContain('spec.md');
    expect(copy.announceContentLoading('spec.md')).toContain('spec.md');
    expect(copy.announceUnavailable('spec.md', 'Not found')).toContain('Not found');
    expect(copy.UNAVAILABLE_TEXT).toBe('unavailable');
    expect(copy.SIZE_UNITS.map((u) => u.unit)).toEqual(['KiB', 'MiB']);
  });

  it('holds the ten budget limits, the three link schemes and the eleven bidirectional code points', () => {
    expect(markdown.MARKDOWN_BUDGET).toEqual({
      maxSourceChars: 270000, maxLineChars: 20000, maxTokens: 150000, maxDepth: 24, maxNodes: 110000, maxTableCells: 32000,
      maxTextRun: 20000, titleMax: 512, maxDestinationChars: 2048, maxAltChars: 512,
    });
    expect([...markdown.EXTERNAL_LINK_SCHEMES]).toEqual(['http', 'https', 'mailto']);
    // The opaque scheme is named once: the external list is built from it, and links.ts imports it (CONTRACT-008).
    expect(markdown.OPAQUE_LINK_SCHEME).toBe('mailto');
    expect(markdown.EXTERNAL_LINK_SCHEMES).toContain(markdown.OPAQUE_LINK_SCHEME);
    expect(markdown.BIDI_CONTROL_CODE_POINTS.length).toBe(11);
    expect(markdown.BIDI_CONTROL_CODE_POINTS.map((c) => c.toString(16).toUpperCase())).toEqual([
      '202A', '202B', '202C', '202D', '202E', '2066', '2067', '2068', '2069', '200E', '200F',
    ]);
    expect(markdown.LINK_SUFFIX.inert).toBe('not a followable link');
    expect(markdown.IMAGE_WORD).toBe('Image');
    expect(markdown.CODE_LANGUAGE_SHOWN).toBe(false);
  });
});

// Deliberate revert (D-34 rule 4): change the research icon in defaults/artifact-kinds.ts from 'magnifier' to 'file'; the
// test "draws the magnifier for research, the table for the data model and the file glyph for every other kind" fails.
