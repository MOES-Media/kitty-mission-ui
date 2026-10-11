// The quiet notices of the document pane (IC-07): the redaction line above the document (DA-32), the truncation note (DA-10), the
// fallback notice (DA-21, attention), and the bidirectional-control notice of the raw and fallback blocks (DA-41, PLAN-SECURE-009). Each
// is the library `sk-notice` (tone `info`, the fallback notice `attention`); each has a control that shows the notice is absent when its condition is false.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';
import { BIDI_CONTROL_CODE_POINTS, BIDI_NOTICE, FALLBACK_NOTICE, REDACTION_LINE, TRUNCATED_NOTE } from '../src/defaults/index.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
/** The notices of the document body only (the inspector draws its own `sk-notice`). */
const notices = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('[data-document] sk-notice'));
const words = (el: Element): string => (el.textContent ?? '').trim();
const CTRL = (count: number): string => String.fromCodePoint(...BIDI_CONTROL_CODE_POINTS.slice(0, count));
const plain = (text: string, mediaType: string, path = 'spec.md'): ArtifactContentView => ({ path, kind: 'spec', mediaType, encoding: 'utf-8', sizeBytes: text.length, redacted: false, content: text });

describe('the redaction line (DA-32)', () => {
  it('stands above the document when `redacted` is true, as an info notice, with the markers verbatim (control: an unredacted file has none)', async () => {
    const screen = await mount(pairingProps('AV-08'));
    const found = notices(screen);
    expect(found.map(words)).toEqual([REDACTION_LINE]);
    expect(found[0]?.getAttribute('tone')).toBe('info');
    const document_ = root(screen).querySelector('[data-document]')!;
    expect(found[0]?.nextElementSibling).toBe(document_.querySelector('[role="tabpanel"]'));
    expect(words(document_.querySelector('article')!)).toContain('[path]');
    expect(words(document_.querySelector('article')!)).toContain('[email]');
    const clean = await mount();
    expect(notices(clean)).toHaveLength(0);
    expect(words(root(clean).querySelector('[data-document]')!)).toContain('Example Mission');
  });

  it('shows no redaction line for a raw-only file that is not redacted and one for a redacted raw view', async () => {
    const tab = await mount({ ...pairingProps('AV-08'), view: 'raw' });
    expect(notices(tab).map(words)).toEqual([REDACTION_LINE]);
    const none = await mount(pairingProps('AV-06'));
    expect(notices(none)).toHaveLength(0);
  });
});

describe('the truncation note (DA-10)', () => {
  it('is drawn when the listing is truncated, once, as an info notice above the document (control: a whole listing draws none)', async () => {
    const screen = await mount(pairingProps('AV-17'));
    const found = notices(screen);
    expect(found.map(words)).toEqual([TRUNCATED_NOTE]);
    expect(found[0]?.getAttribute('tone')).toBe('info');
    expect(found[0]!.compareDocumentPosition(root(screen).querySelector('article')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(words(found[0]!)).toBe('Showing the first 1000 artifacts');
    const whole = await mount();
    expect(notices(whole)).toHaveLength(0);
  });

  it('comes before the redaction line when both apply', async () => {
    const screen = await mount({ ...pairingProps('AV-08'), listing: pairingProps('AV-17').listing });
    expect(notices(screen).map(words)).toEqual([TRUNCATED_NOTE, REDACTION_LINE]);
  });
});

describe('the fallback notice', () => {
  it('is drawn above the escaped source of a fallback (control: the rendered view and the Raw tab draw none)', async () => {
    const screen = await mount(pairingProps('AV-05'));
    expect(notices(screen).map(words)).toEqual([FALLBACK_NOTICE]);
    // DA-21: the fallback notice keeps the prototype's attention tone (the others are quiet info notices).
    expect(notices(screen)[0]?.getAttribute('tone')).toBe('attention');
    const raw = await mount({ ...pairingProps('AV-05'), view: 'raw' });
    expect(notices(raw)).toHaveLength(0);
    const rendered = await mount();
    expect(notices(rendered)).toHaveLength(0);
  });
});

describe('the bidirectional-control notice (DA-41)', () => {
  it('names the count in words above the Raw block, leaves the text unchanged, and is an info notice', async () => {
    const text = `before ${CTRL(3)} after\n`;
    const screen = await mount({ content: plain(text, 'text/markdown'), view: 'raw' });
    expect(notices(screen).map(words)).toEqual([BIDI_NOTICE(3)]);
    expect(words(notices(screen)[0]!)).toBe('Contains 3 bidirectional control characters');
    expect(notices(screen)[0]?.getAttribute('tone')).toBe('info');
    const block = root(screen).querySelector<HTMLElement>('pre[data-scroll="source"]')!;
    expect(block.textContent).toBe(text);
    expect(notices(screen)[0]?.nextElementSibling).toBe(block);
  });

  it('says "character" for one and counts every listed code point (11 of them)', async () => {
    expect(BIDI_CONTROL_CODE_POINTS).toHaveLength(11);
    const one = await mount({ content: plain(`a${CTRL(1)}b`, 'text/plain'), selectedPath: 'spec.md' });
    expect(notices(one).map(words)).toEqual(['Contains 1 bidirectional control character']);
    const all = await mount({ content: plain(`a${CTRL(11)}b`, 'text/plain') });
    expect(notices(all).map(words)).toEqual(['Contains 11 bidirectional control characters']);
  });

  it('draws it in the fallback block too, below the fallback notice (control: the same text with none draws only the fallback notice)', async () => {
    const hostile = pairingProps('AV-05');
    const bulk = hostile.content!;
    const withControls: ArtifactContentView = { ...bulk, content: `${bulk.content}${CTRL(2)}` };
    const screen = await mount({ ...hostile, content: withControls });
    expect(notices(screen).map(words)).toEqual([FALLBACK_NOTICE, BIDI_NOTICE(2)]);
    expect(root(screen).querySelector('pre[data-scroll="source"]')?.textContent).toBe(withControls.content);
    const control = await mount(hostile);
    expect(notices(control).map(words)).toEqual([FALLBACK_NOTICE]);
  });

  it('draws none in the rendered view, whatever the text holds (R-09, accepted), and none for a text without controls (positive control: the Raw tab draws it)', async () => {
    const text = `# Title\n\nbefore ${CTRL(4)} after\n`;
    const rendered = await mount({ content: plain(text, 'text/markdown') });
    expect(notices(rendered)).toHaveLength(0);
    expect(root(rendered).querySelector('article')).not.toBeNull();
    const raw = await mount({ content: plain(text, 'text/markdown'), view: 'raw' });
    expect(notices(raw).map(words)).toEqual([BIDI_NOTICE(4)]);
    const clean = await mount({ content: plain('# Title\n', 'text/markdown'), view: 'raw' });
    expect(notices(clean)).toHaveLength(0);
  });
});
