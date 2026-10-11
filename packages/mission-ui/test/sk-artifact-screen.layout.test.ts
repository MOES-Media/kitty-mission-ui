// The layout of the Artifact Viewer (IC-06b, ruled at CP-1): two columns from a content cell of 45rem (720px) by a container query with
// no controller, one column below it with the inspector first in the DOM; the toolbar stacks only in the shell's mobile tier at a cell
// of 620px or less (option C); exactly one `attachInternals` call in the source, the tier controller's.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import tierSource from '../src/shell-tier.ts?raw';

// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;

afterEach(() => document.body.replaceChildren());

async function mount(width: number): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, pairingProps('AV-01'));
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const q = <T extends Element>(screen: Element, selector: string): T => {
  const found = screen.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`missing ${selector}`);
  return found;
};
const tracks = (screen: Element): number => getComputedStyle(q(screen, '[data-layout]')).gridTemplateColumns.split(' ').filter((t) => t !== '').length;

/** viewport, expected tracks (the ruled outcome), expected toolbar, shell tier. */
const SAMPLES: [number, number, 'row' | 'stack', 'expanded' | 'collapsed' | 'mobile'][] = [
  [1280, 2, 'row', 'expanded'],
  [1100, 2, 'row', 'expanded'],
  [1000, 2, 'row', 'collapsed'],
  [832, 2, 'row', 'collapsed'],
  [831, 1, 'row', 'collapsed'],
  [800, 1, 'row', 'collapsed'],
  [732, 1, 'row', 'collapsed'],
  [720, 1, 'row', 'collapsed'],
  [719, 1, 'row', 'mobile'],
  [689, 1, 'row', 'mobile'],
  [620, 1, 'stack', 'mobile'],
];

describe('the reading layout', () => {
  it('has two tracks from a content cell of 45rem and one below it, over the sampled viewports (both outcomes occur)', async () => {
    const seen = new Set<number>();
    let ran = 0;
    for (const [width, expected, , tier] of SAMPLES) {
      const screen = await mount(width);
      const cell = screen.getBoundingClientRect().width;
      expect(tracks(screen), `${width}px (cell ${cell}, ${tier})`).toBe(expected);
      expect(tracks(screen), `${width}px against the cell`).toBe(cell >= 720 ? 2 : 1);
      seen.add(tracks(screen));
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(SAMPLES.length);
    expect([...seen].sort()).toEqual([1, 2]);
  });

  it('places the inspector in the right-hand track in two columns and above the pane in one', async () => {
    const wide = await mount(1280);
    const inspector = q<HTMLElement>(wide, '[data-region="inspector"]').getBoundingClientRect();
    const pane = q<HTMLElement>(wide, '[data-region="document-pane"]').getBoundingClientRect();
    expect(inspector.left).toBeGreaterThanOrEqual(pane.right - 1);
    expect(Math.round(inspector.width)).toBe(270);
    document.body.replaceChildren();
    const narrow = await mount(800);
    const i2 = q<HTMLElement>(narrow, '[data-region="inspector"]').getBoundingClientRect();
    const p2 = q<HTMLElement>(narrow, '[data-region="document-pane"]').getBoundingClientRect();
    expect(i2.bottom).toBeLessThanOrEqual(p2.top + 1);
  });

  it('keeps the inspector before the pane in the DOM at 1280, 800 and 620 px (no order property)', async () => {
    for (const width of [1280, 800, 620]) {
      const screen = await mount(width);
      const inspector = q<HTMLElement>(screen, '[data-region="inspector"]');
      const pane = q<HTMLElement>(screen, '[data-region="document-pane"]');
      expect(inspector.compareDocumentPosition(pane) & Node.DOCUMENT_POSITION_FOLLOWING, `${width}px`).toBeTruthy();
      expect(getComputedStyle(inspector).order, `${width}px`).toBe('0');
      document.body.replaceChildren();
    }
  });

  it('draws one column and no inspector for a single-pane state at every width (control: the document draws both)', async () => {
    for (const width of [1280, 620]) {
      await page.viewport(width, 900);
      const screen = document.createElement('sk-artifact-screen');
      Object.assign(screen, pairingProps('AV-13'));
      const box = document.createElement('div');
      document.body.append(box);
      render(artifactFrame(html`${screen}`), box);
      await screen.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(tracks(screen)).toBe(1);
      expect(screen.shadowRoot?.querySelector('[data-region="inspector"]')).toBeNull();
      document.body.replaceChildren();
    }
    const document_ = await mount(1280);
    expect(document_.shadowRoot?.querySelector('[data-region="inspector"]')).not.toBeNull();
  });
});

describe('the toolbar stack (option C)', () => {
  it('is a row at 732, 720, 719 and 689 px and stacked at 620 px; the custom state is set in the mobile tier only', async () => {
    const seen = new Set<string>();
    let ran = 0;
    for (const [width, , toolbar, tier] of SAMPLES) {
      const screen = await mount(width);
      const direction = getComputedStyle(q(screen, '[data-region="toolbar"]')).flexDirection;
      expect(direction, `${width}px`).toBe(toolbar === 'stack' ? 'column' : 'row');
      expect(screen.matches(':state(shell-mobile)'), `${width}px state`).toBe(tier === 'mobile');
      seen.add(direction);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(SAMPLES.length);
    expect([...seen].sort()).toEqual(['column', 'row']);
  });

  it('keeps the band at least 68px high', async () => {
    const screen = await mount(1280);
    expect(q<HTMLElement>(screen, '[data-region="toolbar"]').getBoundingClientRect().height).toBeGreaterThanOrEqual(68);
  });
});

describe('the panel paint (E-30)', () => {
  const widths = (el: Element, selector: string) => {
    const style = getComputedStyle(q(el, selector));
    return { start: style.borderInlineStartWidth, top: style.borderBlockStartWidth, end: style.borderBlockEndWidth, bg: style.backgroundColor };
  };
  it('draws the inspector rule on the left beside the pane and on top when stacked, with the hero fill, and no other side', async () => {
    const wide = await mount(1280);
    const w = widths(wide, '[data-region="inspector"]');
    expect([w.start, w.top, w.end]).toEqual(['1px', '0px', '0px']);
    expect(w.bg).not.toBe('rgba(0, 0, 0, 0)');
    document.body.replaceChildren();
    const narrow = await mount(800);
    const n = widths(narrow, '[data-region="inspector"]');
    expect([n.start, n.top, n.end]).toEqual(['0px', '1px', '0px']);
    expect(n.bg).toBe(w.bg);
  });
  it('draws the toolbar band with a bottom rule and the card fill, different from the inspector fill', async () => {
    const screen = await mount(1280);
    const t = widths(screen, '[data-region="toolbar"]');
    expect([t.start, t.top, t.end]).toEqual(['0px', '0px', '1px']);
    expect(t.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(t.bg).not.toBe(widths(screen, '[data-region="inspector"]').bg);
  });
});

describe('the host internals', () => {
  it('has exactly one attachInternals call in the whole source: the tier controller, none in the screen or a part', () => {
    const files = (import.meta as unknown as { glob: Glob }).glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const hits = Object.entries(files)
      .filter(([path]) => !path.endsWith('.stories.ts'))
      .flatMap(([path, source]) => (source.match(/\.attachInternals\(/g) ?? []).map(() => path));
    const screenHits = hits.filter((path) => path.includes('sk-artifact-screen'));
    expect(screenHits).toEqual([]);
    expect(tierSource.match(/\.attachInternals\(/g)).toHaveLength(1);
    expect(hits.filter((path) => path.endsWith('/shell-tier.ts'))).toHaveLength(1);
  });
});
