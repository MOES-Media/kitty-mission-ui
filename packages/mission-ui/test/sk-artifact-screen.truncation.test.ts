// AV-17 (moved here from IC-09, PLAN-FRESH3-010 (b)): the truncation note is present when the listing is `truncated` and absent
// otherwise, read through the screen on the merged chains. The note is drawn with `sk-notice` above the document, in the Rendered
// view, the Raw view and over a raw-only file alike.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { TRUNCATED_NOTE } from '../src/defaults/index.js';
import { listingPopulated, listingTruncated } from '../src/contract/fixtures.generated.js';

afterEach(() => document.body.replaceChildren());

async function mount(props: Partial<ArtifactScreenProps>): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-17'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const notes = (screen: Element): string[] =>
  Array.from(screen.shadowRoot?.querySelectorAll('[data-document] sk-notice') ?? [])
    .map((n) => (n.textContent ?? '').trim())
    .filter((text) => text === TRUNCATED_NOTE);

describe('AV-17: the truncation note', () => {
  it('is present exactly once when the listing is truncated, in the Rendered view and in the Raw view', async () => {
    const rendered = await mount({});
    expect(rendered.listing?.truncated).toBe(true);
    expect(notes(rendered)).toEqual([TRUNCATED_NOTE]);
    document.body.replaceChildren();
    const raw = await mount({ view: 'raw' });
    expect(notes(raw)).toEqual([TRUNCATED_NOTE]);
  });

  it('is absent when the listing is not truncated (control: the same document and path, one flag apart)', async () => {
    const base = pairingProps('AV-17');
    const open = base.listing?.entries[0];
    expect(open).toBeDefined();
    const plain = await mount({ listing: { ...listingPopulated, entries: [...listingPopulated.entries, ...(open === undefined ? [] : [open])], truncated: false } });
    expect(plain.listing?.truncated).toBe(false);
    expect(notes(plain)).toEqual([]);
    document.body.replaceChildren();
    const flagged = await mount({ listing: { ...plain.listing, truncated: true } as ArtifactScreenProps['listing'] });
    expect(notes(flagged)).toEqual([TRUNCATED_NOTE]);
    expect(listingTruncated.truncated).toBe(true);
  });

  it('shows over a raw-only file too (the note belongs to the listing, not to the markdown view)', async () => {
    const json = pairingProps('AV-06');
    const screen = await mount({ ...json, listing: { ...(json.listing as NonNullable<typeof json.listing>), truncated: true } });
    expect(screen.shadowRoot?.querySelector('[role="tablist"]')).toBeNull();
    expect(notes(screen)).toEqual([TRUNCATED_NOTE]);
  });
});

describe('AV-17: the truncation note in every state that shows the listing (CONTRACT-001)', () => {
  const anywhere = (screen: Element): string[] =>
    Array.from(screen.shadowRoot?.querySelectorAll('sk-notice') ?? [])
      .map((n) => (n.textContent ?? '').trim())
      .filter((text) => text === TRUNCATED_NOTE);
  const states: [string, Partial<ArtifactScreenProps>][] = [
    ['nothing selected', { status: 'nothing-selected', selectedPath: '', content: null }],
    ['ready with no open path', { selectedPath: '', content: null }],
    ['content loading', { contentStatus: 'loading', content: null }],
    ['content refused', { contentStatus: 'refused', content: null, refusalCode: 'too_large' }],
    ['content error', { contentStatus: 'error', content: null }],
  ];

  for (const [name, props] of states) {
    it(`draws the note once, above the pane, when the listing is truncated: ${name}`, async () => {
      const screen = await mount(props as Partial<ArtifactScreenProps>);
      expect(screen.listing?.truncated).toBe(true);
      expect(anywhere(screen)).toEqual([TRUNCATED_NOTE]);
      const note = screen.shadowRoot?.querySelector('[data-region="truncation-note"]');
      expect(note, name).not.toBeNull();
      // At the top of the pane: nothing the pane draws comes before it except the toolbar and the hidden heading.
      const pane = screen.shadowRoot?.querySelector('[data-region="document-pane"]') ?? screen.shadowRoot?.querySelector('[data-root]');
      const before = Array.from(pane?.querySelectorAll('[data-region="toolbar"], [data-refusal], [data-state-panel], .sk-empty-state') ?? []).filter(
        (el) => note !== null && note !== undefined && (note.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) !== 0 && !el.contains(note),
      );
      expect(before.filter((el) => el.matches('[data-refusal], [data-state-panel], .sk-empty-state')), name).toEqual([]);
    });

    it(`draws no note when the listing is not truncated (control): ${name}`, async () => {
      const base = pairingProps('AV-17');
      const listing = { ...(base.listing as NonNullable<typeof base.listing>), truncated: false };
      const screen = await mount({ ...props, listing } as Partial<ArtifactScreenProps>);
      expect(anywhere(screen)).toEqual([]);
    });
  }

  it('draws no note when no listing agrees with the Mission (nothing is shown to be truncated)', async () => {
    const screen = await mount({ status: 'loading', listing: null, selectedPath: '', content: null } as Partial<ArtifactScreenProps>);
    expect(anywhere(screen)).toEqual([]);
  });
});

