import { describe, expect, it } from 'vitest';
import { contentEmpty, contentJson, contentMarkdown, contentRedacted, listingPopulated } from '../src/contract/fixtures.generated.js';
import type { ArtifactContentView, ArtifactListingView } from '../src/contract/types.js';
import { BIDI_CONTROL_CODE_POINTS, CONTENT_ERROR_DEFAULT } from '../src/defaults/index.js';
import { countBidiControls, needsHiddenHeading, resolveArtifactView, type ArtifactView, type ArtifactViewInput } from '../src/logic/artifact-view.js';

const OK = { kind: 'ok' } as const;
const FALLBACK = { kind: 'fallback' } as const;

const base = (over: Partial<ArtifactViewInput> = {}): ArtifactViewInput => ({
  status: 'ready',
  contentStatus: 'ready',
  selectedPath: 'spec.md',
  listing: listingPopulated as ArtifactListingView,
  content: contentMarkdown as ArtifactContentView,
  refusalCode: null,
  errorMessage: '',
  view: 'rendered',
  markdown: OK,
  ...over,
});

const NONE = { tabs: 'none', body: 'raw', markdown: false, redacted: false, bidiControls: 0, errorText: null } as const;
const pane = (p: ArtifactView['pane'], over: Partial<ArtifactView> = {}): ArtifactView => ({ pane: p, ...NONE, ...over });

describe('resolveArtifactView: one test per row of the total table', () => {
  const rows: Array<[string, ArtifactViewInput, ArtifactView]> = [
    ['1 loading', base({ status: 'loading' }), pane('listing-state')],
    ['1 error', base({ status: 'error' }), pane('listing-state')],
    ['1 empty', base({ status: 'empty' }), pane('listing-state')],
    ['1 not-found', base({ status: 'not-found' }), pane('listing-state')],
    ['1 ready with a null listing', base({ listing: null }), pane('listing-state')],
    ['1 ready with a null listing beats an empty path (first row wins)', base({ listing: null, selectedPath: '' }), pane('listing-state')],
    ['2 nothing-selected with a path', base({ status: 'nothing-selected' }), pane('nothing-selected')],
    ['2 nothing-selected with no path', base({ status: 'nothing-selected', selectedPath: '' }), pane('nothing-selected')],
    ['2 nothing-selected with no listing', base({ status: 'nothing-selected', listing: null }), pane('nothing-selected')],
    ['2 ready with an empty path', base({ selectedPath: '' }), pane('nothing-selected')],
    ['3 content loading, content ignored', base({ contentStatus: 'loading' }), pane('loading')],
    ['3 content loading with no content', base({ contentStatus: 'loading', content: null }), pane('loading')],
    ['4 refused with no code, content ignored', base({ contentStatus: 'refused' }), pane('refusal')],
    ['5 refused with a known code, content ignored', base({ contentStatus: 'refused', refusalCode: 'artifact_secret' }), pane('refusal')],
    ['5 refused with an unknown code', base({ contentStatus: 'refused', refusalCode: 'artifact_quarantined', content: null }), pane('refusal')],
    ['6 error with no message', base({ contentStatus: 'error' }), pane('error', { errorText: CONTENT_ERROR_DEFAULT })],
    ['7 error with a message', base({ contentStatus: 'error', errorMessage: 'The host says no.' }), pane('error', { errorText: 'The host says no.' })],
    ['8 ready with null content', base({ content: null }), pane('loading')],
    [
      '9a an empty markdown file',
      base({ content: { ...(contentEmpty as ArtifactContentView), mediaType: 'text/markdown' }, markdown: null }),
      pane('empty-file', { tabs: 'two', markdown: true }),
    ],
    ['9b an empty file of another type', base({ content: contentEmpty as ArtifactContentView, markdown: null }), pane('empty-file')],
    ['10 a markdown document that rendered', base(), pane('document', { tabs: 'two', body: 'rendered', markdown: true })],
    ['10 a markdown document that fell back', base({ markdown: FALLBACK }), pane('document', { tabs: 'two', body: 'fallback', markdown: true })],
    ['10 a markdown document with no model result', base({ markdown: null }), pane('document', { tabs: 'two', body: 'fallback', markdown: true })],
    ['10 a document of another type', base({ content: contentJson as ArtifactContentView, markdown: null }), pane('document')],
  ];

  for (const [name, input, want] of rows) {
    it(`row ${name}`, () => {
      expect(resolveArtifactView(input)).toEqual(want);
    });
  }

  it('has the declared number of rows (every row of the table is covered, 9a and 9b separately)', () => {
    expect(rows.length).toBe(24);
    const covered = new Set(rows.map(([name]) => /^(\d+[ab]?) /.exec(name)?.[1]));
    expect([...covered].sort()).toEqual(['1', '10', '2', '3', '4', '5', '6', '7', '8', '9a', '9b']);
  });

  it('takes a content that is empty by text but not by size as a document (positive control for 9a and 9b)', () => {
    const odd = { ...(contentEmpty as ArtifactContentView), sizeBytes: 5 };
    expect(resolveArtifactView(base({ content: odd, markdown: null })).pane).toBe('document');
    const oddText = { ...(contentEmpty as ArtifactContentView), content: ' ' };
    expect(resolveArtifactView(base({ content: oddText, markdown: null })).pane).toBe('document');
  });

  it('carries the redaction flag of a document and counts its bidirectional controls', () => {
    const redacted = resolveArtifactView(base({ content: contentRedacted as ArtifactContentView }));
    expect(redacted.redacted).toBe(true);
    expect(resolveArtifactView(base()).redacted).toBe(false);
    const rlo = String.fromCodePoint(0x202e);
    const hostile = { ...(contentJson as ArtifactContentView), content: `a${rlo}b${rlo}c` };
    expect(resolveArtifactView(base({ content: hostile, markdown: null })).bidiControls).toBe(2);
    expect(resolveArtifactView(base({ content: contentJson as ArtifactContentView, markdown: null })).bidiControls).toBe(0);
  });

  it('reads the markdown media type from an explicit vocabulary and from the defaults', () => {
    const json = base({ content: contentJson as ArtifactContentView, markdown: OK });
    expect(resolveArtifactView(json).tabs).toBe('none');
    expect(resolveArtifactView(json, { mediaType: 'application/json' })).toEqual(pane('document', { tabs: 'two', body: 'rendered', markdown: true }));
    expect(resolveArtifactView(base(), { mediaType: 'application/json' }).tabs).toBe('none');
    expect(resolveArtifactView(base(), {})).toEqual(resolveArtifactView(base(), null));
    expect(resolveArtifactView(base())).toEqual(resolveArtifactView(base(), null));
  });
});

describe('countBidiControls', () => {
  const chars = BIDI_CONTROL_CODE_POINTS.map((c) => String.fromCodePoint(c));

  it('counts every character of the default list, one each, and returns zero for none', () => {
    expect(chars.length).toBe(11);
    let ran = 0;
    for (const ch of chars) {
      expect(countBidiControls(`a${ch}b`), ch.codePointAt(0)?.toString(16)).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(11);
    expect(countBidiControls(chars.join(''))).toBe(11);
    expect(countBidiControls('plain text, with a é and an arrow →')).toBe(0);
    expect(countBidiControls('')).toBe(0);
  });

  it('counts a repeated control each time and leaves the text alone', () => {
    const text = `x${chars[4]}y${chars[4]}z`;
    expect(countBidiControls(text)).toBe(2);
    expect(text.length).toBe(5);
  });

  it('takes its own code-point list', () => {
    expect(countBidiControls('abca', [0x61])).toBe(2);
    expect(countBidiControls(`a${chars[0]}`, [])).toBe(0);
  });
});

describe('needsHiddenHeading: one case per pane and tab', () => {
  const view = (over: Partial<ArtifactView>): ArtifactView => ({ ...pane('document'), ...over });
  const cases: Array<[string, ArtifactView, 'rendered' | 'raw', boolean]> = [
    ['a rendered markdown body keeps its headings', view({ tabs: 'two', body: 'rendered', markdown: true }), 'rendered', false],
    ['the Raw tab of a markdown file', view({ tabs: 'two', body: 'rendered', markdown: true }), 'raw', true],
    ['the fallback on the rendered tab', view({ tabs: 'two', body: 'fallback', markdown: true }), 'rendered', true],
    ['the fallback on the Raw tab', view({ tabs: 'two', body: 'fallback', markdown: true }), 'raw', true],
    ['a raw-only file, rendered tab value', view({}), 'rendered', true],
    ['a raw-only file, raw tab value', view({}), 'raw', true],
    ['the empty file, rendered tab', pane('empty-file', { tabs: 'two', markdown: true }), 'rendered', true],
    ['the empty file, raw tab', pane('empty-file', { tabs: 'two', markdown: true }), 'raw', true],
    ['the empty file of another type', pane('empty-file'), 'rendered', true],
    ['the loading look, rendered tab', pane('loading'), 'rendered', true],
    ['the loading look, raw tab', pane('loading'), 'raw', true],
    ['the refusal block, whose title is the h1', pane('refusal'), 'rendered', false],
    ['the error block', pane('error', { errorText: 'x' }), 'rendered', false],
    ['the nothing-selected state', pane('nothing-selected'), 'rendered', false],
    ['the listing state', pane('listing-state'), 'rendered', false],
  ];

  for (const [name, v, tab, want] of cases) {
    it(`${name}: ${want}`, () => {
      expect(needsHiddenHeading(v, tab)).toBe(want);
    });
  }

  it('has the declared number of cases and both answers occur (positive control)', () => {
    expect(cases.length).toBe(15);
    expect(cases.filter(([, , , want]) => want).length).toBe(10);
    expect(cases.filter(([, , , want]) => !want).length).toBe(5);
  });
});

// Deliberate revert (D-34 rule 4): make the row-8 branch (ready with null content) return the document pane; "row 8
// ready with null content" fails. For needsHiddenHeading: return false for the Raw tab; "the Raw tab of a markdown file" fails.
