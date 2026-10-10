// The refusal block (IC-08, FR-015, FR-016, SC-005): a table over the seven refusal codes READ from the vendored enum, the unknown
// code, the no-content-ever rule and the too-large size. Real renders of the real screen; every "absent" assertion has a control.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { parse } from 'yaml';
import '@spec-kitty/tokens';
import '../src/index.js';
import codeYaml from '../../../contracts/spec-kitty/mission-status/schemas/ArtifactRefusalCode.yaml?raw';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';
import { ARTIFACT_REFUSALS, CONTENT_ERROR_DEFAULT, REFUSAL_GENERIC, REFUSAL_GENERIC_EYEBROW, REFUSAL_TITLE } from '../src/defaults/index.js';

/** The seven codes of the vendored contract enum, never typed here. */
const CODES = (parse(codeYaml) as { enum: string[] }).enum;
/** The words each code must show, written out (the table of the screen is not its own oracle). */
const EXPECTED: Record<string, { eyebrow: string; sentence: string; retry: boolean }> = {
  invalid_artifact_path: { eyebrow: 'Invalid path', sentence: 'The path is not a valid artifact path.', retry: false },
  not_found: { eyebrow: 'Not found', sentence: 'This artifact does not exist in this Mission.', retry: false },
  artifact_too_large: { eyebrow: 'Too large', sentence: 'This artifact is 293 KiB, over the 256 KiB limit, so it is not shown.', retry: false },
  artifact_not_text: { eyebrow: 'Not text', sentence: 'This artifact is not text, so it is not shown.', retry: false },
  artifact_secret: { eyebrow: 'Credential found', sentence: 'This artifact holds what looks like a credential, so nothing of it is shown.', retry: false },
  artifact_unreadable: { eyebrow: 'Unreadable', sentence: 'This artifact could not be read.', retry: true },
  artifact_listing_unreadable: { eyebrow: 'Unreadable', sentence: 'The list of artifacts could not be read.', retry: false },
};
/** The marker no refusal may ever show: the text of a `content` property set beside a refusal. */
const MARKER = 'MARKER-never-shown-0451';
const BIG_PATH = 'notes/big-export.json';

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
  Object.assign(screen, { ...pairingProps('AV-13'), ...props });
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
const refusalOf = (screen: Element): HTMLElement => {
  const block = root(screen).querySelector<HTMLElement>('[data-refusal]');
  if (block === null) throw new Error('no refusal block');
  return block;
};
const words = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const retries = (screen: Element): HTMLElement[] => Array.from(refusalOf(screen).querySelectorAll<HTMLElement>('sk-button'));
const refused = (code: string, path = 'spec.md'): Partial<ArtifactScreenProps> => ({ refusalCode: code, selectedPath: path, contentStatus: 'refused', content: null });
const secretContent = (path: string): ArtifactContentView => ({ path, kind: 'spec', mediaType: 'text/markdown', encoding: 'utf-8', sizeBytes: 40, redacted: false, content: `# ${MARKER}\n\n${MARKER} body` });

describe('the seven refusal codes (SC-005: the cause is stated every time)', () => {
  it('reads seven codes from the vendored enum and the table of the screen has exactly those', () => {
    expect(CODES.length).toBe(7);
    expect(Object.keys(EXPECTED).sort()).toEqual([...CODES].sort());
    expect(Object.keys(ARTIFACT_REFUSALS).sort()).toEqual([...CODES].sort());
  });

  it('shows the cause word, the title as the one h1, the path and the sentence of every code, and Retry for exactly the retryable row', async () => {
    let ran = 0;
    let withRetry = 0;
    let withoutRetry = 0;
    for (const code of CODES) {
      const want = EXPECTED[code];
      if (want === undefined) throw new Error(`no expectation for ${code}`);
      const path = code === 'artifact_too_large' ? BIG_PATH : 'spec.md';
      const screen = await mount(refused(code, path));
      const block = refusalOf(screen);
      const paragraphs = Array.from(block.querySelectorAll('p')).map(words);
      expect(paragraphs, code).toEqual([want.eyebrow, path, want.sentence]);
      expect(Array.from(root(screen).querySelectorAll('h1')).map(words), code).toEqual([REFUSAL_TITLE]);
      expect(root(screen).querySelector('[data-refusal] h1'), code).not.toBeNull();
      const buttons = retries(screen);
      expect(buttons.length, code).toBe(want.retry ? 1 : 0);
      if (want.retry) {
        expect(words(buttons[0] ?? null), code).toBe('Retry');
        withRetry += 1;
      } else withoutRetry += 1;
      ran += 1;
    }
    expect(ran).toBe(7);
    // The positive control: both outcomes occurred.
    expect(withRetry).toBe(1);
    expect(withoutRetry).toBe(6);
  });

  it('keeps artifact_listing_unreadable out of the content block: no Retry there, while the listing error state has one', async () => {
    const content = await mount(refused('artifact_listing_unreadable'));
    expect(retries(content)).toHaveLength(0);
    const listing = await mount({ ...pairingProps('AV-14') });
    const buttons = Array.from(root(listing).querySelectorAll('sk-button'));
    expect(buttons.map(words)).toEqual(['Retry']);
  });
});

describe('the too-large sentence names the size of the entry', () => {
  it('shows the size of the listing entry, and none when the listing has no entry for the path (control: the entry present)', async () => {
    const withEntry = await mount(refused('artifact_too_large', BIG_PATH));
    expect(words(refusalOf(withEntry).querySelector('.sk-empty-state__body'))).toBe(EXPECTED['artifact_too_large']?.sentence);
    const noEntry = await mount(refused('artifact_too_large', 'notes/not-in-the-listing.json'));
    expect(words(refusalOf(noEntry).querySelector('.sk-empty-state__body'))).toBe('This artifact is over the 256 KiB limit, so it is not shown.');
  });
});

describe('an unknown code', () => {
  it('shows the raw code, the generic sentence and no Retry (control: the retryable known code has Retry)', async () => {
    const screen = await mount(refused('artifact_quarantined'));
    expect(Array.from(refusalOf(screen).querySelectorAll('p')).map(words)).toEqual(['artifact_quarantined', 'spec.md', REFUSAL_GENERIC]);
    expect(retries(screen)).toHaveLength(0);
    const known = await mount(refused('artifact_unreadable'));
    expect(retries(known)).toHaveLength(1);
  });

  it('shows the generic cause word and sentence when the refused read carries no code, and no Retry', async () => {
    const screen = await mount({ ...refused('x'), refusalCode: null });
    expect(Array.from(refusalOf(screen).querySelectorAll('p')).map(words)).toEqual([REFUSAL_GENERIC_EYEBROW, 'spec.md', REFUSAL_GENERIC]);
    expect(retries(screen)).toHaveLength(0);
  });

  it('never falls back to Retry for names every object has (control: a real code resolves)', async () => {
    for (const name of ['constructor', '__proto__', 'toString']) {
      const screen = await mount(refused(name));
      expect(retries(screen), name).toHaveLength(0);
      expect(words(refusalOf(screen).querySelector('p')), name).toBe(name);
    }
  });
});

describe('no content is ever shown (SC-005: content 0%)', () => {
  it('shows none of the text of a `content` property set beside a refusal, for every code (control: a ready state shows it)', async () => {
    let ran = 0;
    for (const code of CODES) {
      const screen = await mount({ ...refused(code), content: secretContent('spec.md') });
      expect(root(screen).textContent, code).not.toContain(MARKER);
      expect(root(screen).querySelector('article, pre, [data-document]'), code).toBeNull();
      ran += 1;
    }
    expect(ran).toBe(7);
    const ready = await mount({ contentStatus: 'ready', refusalCode: null, content: secretContent('spec.md'), selectedPath: 'spec.md' });
    expect(root(ready).textContent).toContain(MARKER);
  });

  it('draws no inspector, no tabs and no toolbar beside a refusal (DA-25; control: the document has them)', async () => {
    const screen = await mount({ ...refused('artifact_secret'), content: secretContent('spec.md') });
    expect(root(screen).querySelector('[data-region="inspector"], [role="tablist"], [data-region="toolbar"]')).toBeNull();
    const doc = await mount({ ...pairingProps('AV-01') });
    expect(root(doc).querySelector('[data-region="inspector"]')).not.toBeNull();
    expect(root(doc).querySelector('[role="tablist"]')).not.toBeNull();
  });

  it('shows a failed content read (contentStatus error) in the same block with Retry and the host text (control: the default text)', async () => {
    const custom = await mount({ contentStatus: 'error', refusalCode: null, errorMessage: 'The disk did not answer.' });
    expect(Array.from(refusalOf(custom).querySelectorAll('p')).map(words)).toEqual([REFUSAL_GENERIC_EYEBROW, 'spec.md', 'The disk did not answer.']);
    expect(retries(custom)).toHaveLength(1);
    const plain = await mount({ contentStatus: 'error', refusalCode: null, errorMessage: '' });
    expect(words(refusalOf(plain).querySelector('.sk-empty-state__body'))).toBe(CONTENT_ERROR_DEFAULT);
  });

  it('draws the dashed card with border-box sizing, so the padding and the border sit inside the box (E-45; control: the box is not wider than its cell)', async () => {
    const screen = await mount(refused('artifact_unreadable'));
    const card = refusalOf(screen).querySelector<HTMLElement>('.sk-empty-state');
    if (card === null) throw new Error('no card');
    const style = getComputedStyle(card);
    expect(style.boxSizing).toBe('border-box');
    expect(style.borderTopStyle).toBe('dashed');
    expect(style.borderTopWidth).not.toBe('0px');
    expect(parseFloat(style.paddingTop)).toBeGreaterThan(0);
    expect(card.getBoundingClientRect().width).toBeLessThanOrEqual(refusalOf(screen).getBoundingClientRect().width);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    const eyebrow = card.querySelector('p');
    expect(getComputedStyle(eyebrow as Element).textTransform).toBe('uppercase');
    const probe = document.createElement('span');
    probe.style.fontFamily = 'var(--sk-font-mono)';
    document.body.append(probe);
    const mono = getComputedStyle(probe).fontFamily;
    const path = refusalOf(screen).querySelector('[data-refusal-path]') as Element;
    const sentence = refusalOf(screen).querySelector('.sk-empty-state__body') as Element;
    expect(mono).not.toBe('');
    expect(getComputedStyle(path).fontFamily).toBe(mono);
    expect(getComputedStyle(eyebrow as Element).fontFamily).toBe(mono);
    expect(getComputedStyle(sentence).fontFamily).not.toBe(mono);
    // The eyebrow's size, colour, weight and tracking and the heading's display face, each measured against a probe of the token.
    const probeOf = (css: string): CSSStyleDeclaration => {
      const el = document.createElement('span');
      el.setAttribute('style', css);
      document.body.append(el);
      return getComputedStyle(el);
    };
    const eyebrowStyle = getComputedStyle(eyebrow as Element);
    expect(eyebrowStyle.fontSize).toBe(probeOf('font-size: var(--sk-text-xs)').fontSize);
    expect(eyebrowStyle.color).toBe(probeOf('color: var(--sk-fg-subtle)').color);
    expect(eyebrowStyle.fontWeight).toBe(probeOf('font-weight: var(--sk-weight-semibold)').fontWeight);
    expect(parseFloat(eyebrowStyle.letterSpacing)).toBeCloseTo(parseFloat(eyebrowStyle.fontSize) * 0.08, 2);
    const h1 = refusalOf(screen).querySelector('h1') as Element;
    expect(getComputedStyle(h1).fontFamily).toBe(probeOf('font-family: var(--sk-font-display)').fontFamily);
    expect(getComputedStyle(h1).fontFamily).not.toBe(mono);
    expect(getComputedStyle(sentence).color).not.toBe(eyebrowStyle.color);
    // Control: a document draws no refusal card.
    const doc = await mount({ ...pairingProps('AV-07') });
    expect(root(doc).querySelector('[data-refusal]')).toBeNull();
  });

  // The prototype's block (`05-artifact.html?state=unavailable`, a 1280 px viewport) measured 936 px by 186.797 px in one Chromium, but a
  // font-dependent pixel literal drifts by a few px with the font stack of another machine (one copy reproduced 30.6 px off). So the
  // expectations are DERIVED from what this document measures about itself: the computed font size and line height of each line
  // (the prototype's ratios 1.5, 1.2, 1.5, 1.5), the computed spacing of the card, and the pane that holds it.
  it('measures as the prototype does at 1280 px: line heights from the computed font size, the card from its lines and spacing, the width from the pane', async () => {
    const screen = await mount(refused('not_found'));
    const card = refusalOf(screen).querySelector<HTMLElement>('.sk-empty-state');
    if (card === null) throw new Error('no card');
    const box = card.getBoundingClientRect();
    const px = (value: string): number => (value === 'normal' || value === '' ? 0 : parseFloat(value));
    // The four lines: a single-line box is as tall as its computed line height, and that is the prototype's ratio of its font size.
    const lines = Array.from(card.querySelectorAll<HTMLElement>('p, h1'));
    expect(lines).toHaveLength(4);
    const ratios = lines.map((el) => {
      const style = getComputedStyle(el);
      const height = el.getBoundingClientRect().height;
      expect(Math.abs(height - px(style.lineHeight)), `${el.tagName} height ${height} vs line-height ${style.lineHeight}`).toBeLessThanOrEqual(0.5);
      return Math.round((px(style.lineHeight) / px(style.fontSize)) * 100) / 100;
    });
    expect(ratios).toEqual([1.5, 1.2, 1.5, 1.5]);
    // The card: its lines, their margins, its padding and its border; the row gap is zero.
    const cardStyle = getComputedStyle(card);
    const spacing = px(cardStyle.paddingTop) + px(cardStyle.paddingBottom) + px(cardStyle.borderTopWidth) + px(cardStyle.borderBottomWidth);
    const content = lines.reduce((sum, el) => sum + el.getBoundingClientRect().height + px(getComputedStyle(el).marginTop) + px(getComputedStyle(el).marginBottom), 0);
    expect(Math.abs(box.height - (spacing + content)), `card ${box.height} vs lines and spacing ${spacing + content}`).toBeLessThanOrEqual(1);
    expect(cardStyle.rowGap === 'normal' ? '0px' : cardStyle.rowGap).toBe('0px');
    // The width: the card fills the pane's content box less the block's own inline padding and margins.
    const pane = root(screen).querySelector<HTMLElement>('[data-region="document-pane"]') as HTMLElement;
    const paneStyle = getComputedStyle(pane);
    const wrapper = getComputedStyle(refusalOf(screen));
    const available = pane.getBoundingClientRect().width - px(paneStyle.paddingLeft) - px(paneStyle.paddingRight) - px(paneStyle.borderLeftWidth) - px(paneStyle.borderRightWidth);
    expect(Math.abs(box.width - (available - px(wrapper.marginLeft) - px(wrapper.marginRight) - px(wrapper.paddingLeft) - px(wrapper.paddingRight))), `card width ${box.width} in a pane of ${available}`).toBeLessThanOrEqual(1);
    // The heading: its text is as wide as the same text set in the same face (a probe), at weight 700 and -0.01em tracking.
    const h1 = card.querySelector('h1') as HTMLElement;
    const h1Style = getComputedStyle(h1);
    const range = document.createRange();
    range.selectNodeContents(h1);
    const probe = document.createElement('span');
    probe.textContent = h1.textContent;
    probe.setAttribute('style', 'position:absolute;white-space:nowrap;visibility:hidden');
    Object.assign(probe.style, { font: h1Style.font, letterSpacing: h1Style.letterSpacing });
    document.body.append(probe);
    expect(Math.abs(range.getBoundingClientRect().width - probe.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    expect(h1Style.fontWeight).toBe('700');
    expect(parseFloat(h1Style.letterSpacing)).toBeCloseTo(parseFloat(h1Style.fontSize) * -0.01, 2);
    // Control: with the Retry row the card is taller by the control and its margin, so the measurement is not blind to height.
    const withRetry = await mount(refused('artifact_unreadable'));
    expect((refusalOf(withRetry).querySelector('.sk-empty-state') as HTMLElement).getBoundingClientRect().height).toBeGreaterThan(box.height + 20);
  });
});
