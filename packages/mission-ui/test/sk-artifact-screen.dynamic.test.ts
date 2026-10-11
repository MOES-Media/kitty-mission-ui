// The dynamic-pipeline test (SC-004): a `vocabulary` with a thirteenth kind, its own icon and a different container segment renders in
// full with no change to the element; a refusal code outside the seven renders through `labels.refusal` as its eyebrow, with the generic
// sentence and no retry; `copy` is not a member of `ArtifactVocabulary`, and a refusal code is not carried by `vocabulary` (type level, so
// `pnpm typecheck` is the proof: an `@ts-expect-error` that stops erroring fails the build).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps, workPackageList } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactLabelHooks, ArtifactVocabulary } from '../src/logic/artifact-types.js';
import { ARTIFACT_KIND_WORDS, REFUSAL_GENERIC, REFUSAL_GENERIC_EYEBROW } from '../src/defaults/index.js';
import { listingPopulated } from '../src/contract/fixtures.generated.js';
import type { ArtifactContentView, ArtifactListingView } from '../src/contract/types.js';

afterEach(() => document.body.replaceChildren());

const frames = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(props: Partial<ArtifactScreenProps>, extra: { vocabulary?: ArtifactVocabulary | null; labels?: ArtifactLabelHooks | null } = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-01'), ...props, ...extra });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frames();
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const words = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

// The foreign values: a kind no table knows, a container segment that is not `tasks`, a refusal code outside the seven.
const FOREIGN_KIND = 'glossary_entry';
const VOCABULARY: ArtifactVocabulary = {
  kinds: { ...ARTIFACT_KIND_WORDS, [FOREIGN_KIND]: { label: 'Glossary entry', icon: 'table' } },
  container: { segment: 'items', separator: '_' },
};
const listingOf = (entries: ArtifactListingView['entries']): ArtifactListingView => ({ ...listingPopulated, entries, truncated: false });
const contentOf = (path: string, kind: string): ArtifactContentView => ({ path, kind, mediaType: 'text/markdown', encoding: 'utf-8', sizeBytes: 20, redacted: false, content: '# Term\n\nA defined term.\n' }) as ArtifactContentView;

describe('a thirteenth kind, its own icon and another container segment render with no change to the element', () => {
  it('shows the foreign kind word as the eyebrow and in the inspector, with the icon of its row, only when the vocabulary carries it (control: without it the raw word shows with the neutral icon)', async () => {
    const path = 'terms/entry-1.md';
    const props = { listing: listingOf([{ path, kind: FOREIGN_KIND, sizeBytes: 20, modifiedAt: '2026-09-23T09:00:00Z', readable: true } as never]), content: contentOf(path, FOREIGN_KIND), selectedPath: path };
    const withVocabulary = await mount(props, { vocabulary: VOCABULARY });
    expect(words(root(withVocabulary).querySelector('article > p'))).toBe('Glossary entry');
    expect(words(root(withVocabulary).querySelector('[data-region="inspector"]'))).toContain('Glossary entry');
    const iconOf = (screen: Element): string => root(screen).querySelector('[data-toolbar-name] svg')?.innerHTML ?? '';
    const tableIcon = iconOf(withVocabulary);
    document.body.replaceChildren();
    const without = await mount(props, { vocabulary: null });
    expect(words(root(without).querySelector('article > p'))).toBe(FOREIGN_KIND);
    const neutral = iconOf(without);
    expect(tableIcon).not.toBe('');
    expect(neutral).not.toBe('');
    expect(tableIcon, 'the icon of the vocabulary row differs from the neutral glyph').not.toBe(neutral);
  });

  it('finds the Work Package of a file under another container segment, and only with that vocabulary (control: the default segment does not match it)', async () => {
    const path = 'items/WP01_slice.md';
    const props = {
      listing: listingOf([{ path, kind: 'work_package_prompt', sizeBytes: 20, modifiedAt: '2026-09-23T09:00:00Z', readable: true }]),
      content: contentOf(path, 'work_package_prompt'),
      selectedPath: path,
      workPackages: workPackageList,
    };
    const ruled = await mount(props, { vocabulary: VOCABULARY });
    expect(words(root(ruled).querySelector('[data-region="inspector"]'))).toContain('Open Work Package');
    const pills = Array.from(root(ruled).querySelectorAll('[data-region="inspector"] button.sk-pill-tag')).map(words);
    expect(pills).toEqual(['WP01 First slice']);
    document.body.replaceChildren();
    const defaults = await mount(props, { vocabulary: null });
    expect(words(root(defaults).querySelector('[data-region="inspector"]'))).not.toContain('Open Work Package');
  });
});

describe('a refusal code outside the seven renders through labels.refusal', () => {
  const FOREIGN_CODE = 'artifact_quota_exceeded';
  const refused = { content: null, contentStatus: 'refused' as const, refusalCode: FOREIGN_CODE };
  it('shows the hook word as the eyebrow, the generic sentence and no retry (control: a known code shows its own sentence and a retry for the retryable one)', async () => {
    const hooks: ArtifactLabelHooks = { refusal: (code) => (code === FOREIGN_CODE ? 'Quota reached' : undefined) };
    const screen = await mount(refused, { labels: hooks });
    const block = root(screen).querySelector('[data-refusal]');
    expect(block).not.toBeNull();
    expect(words(block)).toContain('Quota reached');
    expect(words(block)).toContain(REFUSAL_GENERIC);
    expect(block?.querySelectorAll('sk-button').length).toBe(0);
    document.body.replaceChildren();
    // Without the hook the eyebrow is the code itself (the generic eyebrow is for a missing code), the sentence is still generic.
    const bare = await mount(refused);
    expect(words(root(bare).querySelector('[data-refusal]'))).toContain(FOREIGN_CODE);
    expect(words(root(bare).querySelector('[data-refusal]'))).toContain(REFUSAL_GENERIC);
    expect(REFUSAL_GENERIC_EYEBROW).not.toBe('');
    document.body.replaceChildren();
    const known = await mount({ content: null, contentStatus: 'refused', refusalCode: 'artifact_unreadable' });
    expect(root(known).querySelectorAll('[data-refusal] sk-button').length).toBe(1);
  });
});

describe('the shape of ArtifactVocabulary (type level: pnpm typecheck is the proof)', () => {
  it('has five groups, no copy and no refusal code', () => {
    // @ts-expect-error `copy` is not a member of ArtifactVocabulary (PLAN-FRESH4-007 (b)): string overrides go through `labels`.
    const withCopy: ArtifactVocabulary = { copy: { retry: 'Again' } };
    // @ts-expect-error a refusal code is not carried by `vocabulary` (PLAN-FRESH3-004 (b)): a foreign code goes through `labels.refusal`.
    const withRefusals: ArtifactVocabulary = { refusals: { artifact_quota_exceeded: 'Quota' } };
    const fine: ArtifactVocabulary = { kinds: null, linkKinds: null, container: null, mediaType: null, budget: null };
    expect(Object.keys(fine).sort()).toEqual(['budget', 'container', 'kinds', 'linkKinds', 'mediaType']);
    expect([withCopy, withRefusals].length).toBe(2);
  });
});
