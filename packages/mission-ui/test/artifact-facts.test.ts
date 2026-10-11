import { describe, expect, it } from 'vitest';
import { contentMarkdown, contentRedacted, listingPopulated } from '../src/contract/fixtures.generated.js';
import type { ArtifactContentView, ArtifactEntryView } from '../src/contract/types.js';
import { resolveArtifactFacts, resolveKindLabel, resolveMediaTypeLabel } from '../src/logic/artifact-facts.js';
import type { ArtifactScreenMission } from '../src/logic/artifact-types.js';

const NOW = '2026-09-22T12:05:00Z';
const entryOf = (path: string): ArtifactEntryView => listingPopulated.entries.find((e) => e.path === path) as ArtifactEntryView;
const spec = entryOf('spec.md');
const mission: ArtifactScreenMission = {
  missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT',
  slug: 'example-mission',
  friendlyName: 'Example Mission',
  missionType: 'software-dev',
  topology: 'lanes',
  targetBranch: 'main',
  lifecycleStatus: 'active',
};
const input = (over: object = {}) => ({ entry: spec, content: contentMarkdown as ArtifactContentView, mission: null, selectedPath: 'spec.md', now: NOW, ...over });
const labels = (facts: { label: string }[]): string[] => facts.map((f) => f.label);

describe('resolveArtifactFacts: the file facts', () => {
  it('always reports kind, media type, size, modified, path and redaction, in that order, from the entry and the content', () => {
    const facts = resolveArtifactFacts(input());
    expect(facts.file).toEqual([
      { label: 'Kind', value: 'Specification' },
      { label: 'Media type', value: 'Markdown' },
      { label: 'Size', value: `${(spec.sizeBytes / 1024).toFixed(1).replace(/\.0$/, '')} KiB` },
      { label: 'Modified on this host', value: expect.any(String) },
      { label: 'Path', value: 'spec.md', mono: true },
      { label: 'Redacted', value: 'No' },
    ]);
    expect(facts.mission).toEqual([]);
    expect(facts.redactedNote).toBe(false);
  });

  it('sizes from the listing entry first and from the content when there is no entry', () => {
    const sized = resolveArtifactFacts(input({ entry: { ...spec, sizeBytes: 2048 }, content: { ...(contentMarkdown as ArtifactContentView), sizeBytes: 64 } }));
    expect(sized.file.find((f) => f.label === 'Size')?.value).toBe('2 KiB');
    const fromContent = resolveArtifactFacts(input({ entry: null }));
    expect(fromContent.file.find((f) => f.label === 'Size')?.value).toBe('64 B');
  });

  it('reports Modified through resolveActivity: the time hook, else relative to now, else the ISO string, and omits it with no entry', () => {
    const find = (facts: ReturnType<typeof resolveArtifactFacts>) => facts.file.find((f) => f.label === 'Modified on this host')?.value;
    expect(find(resolveArtifactFacts(input({ hooks: { time: () => 'a while back' } })))).toBe('a while back');
    expect(find(resolveArtifactFacts(input({ entry: { ...spec, modifiedAt: '2026-09-22T11:05:00Z' } })))).toBe('1 hour ago');
    expect(find(resolveArtifactFacts(input({ now: null })))).toBe(spec.modifiedAt);
    expect(find(resolveArtifactFacts(input({ entry: null })))).toBeUndefined();
  });

  it('flags a redacted document: Redacted says yes and the note is set', () => {
    const facts = resolveArtifactFacts(input({ content: contentRedacted as ArtifactContentView, entry: entryOf('notes/handoff.md') }));
    expect(facts.file.find((f) => f.label === 'Redacted')?.value).toBe('Yes');
    expect(facts.redactedNote).toBe(true);
  });

  it('keeps the rows the data supports when there is no content: kind, size, modified and path of the entry only', () => {
    const facts = resolveArtifactFacts(input({ content: null }));
    expect(labels(facts.file)).toEqual(['Kind', 'Size', 'Modified on this host', 'Path']);
    expect(facts.redactedNote).toBe(false);
  });

  it('has no rows at all with neither an entry, a content nor a path', () => {
    expect(resolveArtifactFacts(input({ entry: null, content: null, selectedPath: '' })).file).toEqual([]);
    expect(labels(resolveArtifactFacts(input({ entry: null, content: null })).file)).toEqual(['Path']);
  });
});

describe('resolveArtifactFacts: the Mission facts', () => {
  it('lists each fact the host passed, the name first and the target as mono text', () => {
    const facts = resolveArtifactFacts(input({ mission }));
    expect(facts.mission).toEqual([
      { label: 'Mission', value: 'Example Mission' },
      { label: 'Type', value: 'software-dev' },
      { label: 'Topology', value: 'lanes' },
      { label: 'Target', value: 'main', mono: true },
      { label: 'Status', value: 'active' },
    ]);
  });

  it('falls back to the slug for the name and omits every fact that is absent or empty', () => {
    const bare = resolveArtifactFacts(input({ mission: { missionId: 'x', slug: 'only-slug' } }));
    expect(bare.mission).toEqual([{ label: 'Mission', value: 'only-slug' }]);
    const partial = resolveArtifactFacts(input({ mission: { missionId: 'x', slug: 's', friendlyName: '', missionType: null, topology: '', targetBranch: 'main' } }));
    expect(partial.mission).toEqual([
      { label: 'Mission', value: 's' },
      { label: 'Target', value: 'main', mono: true },
    ]);
  });
});

describe('the kind and media words, hook then default then raw', () => {
  it('words a known kind, shows an unknown kind raw and lets the hook win', () => {
    expect(resolveKindLabel('research', null)).toBe('Research');
    expect(resolveKindLabel('diagram', null)).toBe('diagram');
    expect(resolveKindLabel('constructor', null)).toBe('constructor');
    expect(resolveKindLabel('research', { kind: () => 'Study' })).toBe('Study');
    expect(resolveKindLabel('research', { kind: () => undefined })).toBe('Research');
    expect(resolveKindLabel('gadget', null, { kinds: { gadget: { label: 'Gadget', icon: 'file' } } })).toBe('Gadget');
    expect(resolveKindLabel('research', null, { kinds: { gadget: { label: 'Gadget', icon: 'file' } } })).toBe('research');
    expect(resolveKindLabel('research', null, {})).toBe('Research');
  });

  it('words a known media type, shows another raw and lets the hook win', () => {
    expect(resolveMediaTypeLabel('text/markdown', null)).toBe('Markdown');
    expect(resolveMediaTypeLabel('application/x-ndjson', null)).toBe('JSON lines');
    expect(resolveMediaTypeLabel('image/png', null)).toBe('image/png');
    expect(resolveMediaTypeLabel('text/markdown', { mediaType: () => 'MD' })).toBe('MD');
  });

  it('reaches the facts: a foreign kind and media type show raw, and the hooks reach the rows', () => {
    const foreign = resolveArtifactFacts(input({ content: { ...(contentMarkdown as ArtifactContentView), kind: 'diagram', mediaType: 'image/x-odd' } }));
    expect(foreign.file.slice(0, 2)).toEqual([
      { label: 'Kind', value: 'diagram' },
      { label: 'Media type', value: 'image/x-odd' },
    ]);
    const hooked = resolveArtifactFacts(input({ hooks: { kind: () => 'K', mediaType: () => 'M', size: () => 'S' } }));
    expect(hooked.file.slice(0, 3).map((f) => f.value)).toEqual(['K', 'M', 'S']);
  });
});

// Deliberate revert (D-34 rule 4): make the Modified fact a hard-coded ISO string (skip resolveActivity); "reports
// Modified through resolveActivity" fails.
