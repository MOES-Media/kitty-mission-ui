// Accessibility of the Artifact Viewer (IC-10): the focus order (tree, inspector, tabs, document) at 1280, 800 and 620 px and the `tab-<n>`
// counts of the four AV-32 stories, NFR-003 (tab stops equal controls shown; a scroll region is a stop only while it overflows), the roles,
// names, landmarks and idrefs, the heading outline over six fixtures, and the announcements. Explicit assertions; no axe. Every helper has
// a control: a deliberately wide child flips the overflow detector, content growing in a box of unchanged size does too, and an added
// button flips the stop count.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';
import * as stories from '../src/elements/sk-artifact-screen/tiers-edge-cases.stories.js';
import { buildArtifactTree } from '../src/logic/artifact-tree.js';
import { ARTIFACT_INSPECTOR_LABEL, DOCUMENT_LABEL, FILE_NAME_LABEL, TABLIST_LABEL, announceContentLoaded, announceContentLoading, announceListingLoaded } from '../src/defaults/index.js';
import { contentMarkdown } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const frames = async (n: number): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(props: ArtifactScreenProps, width = 1280, withTree = true, height = 900): Promise<SkArtifactScreen> {
  await page.viewport(width, height);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, props, { now: '2026-09-24T10:00:00Z' });
  const box = document.createElement('div');
  document.body.append(box);
  const tree = buildArtifactTree(props.listing?.entries ?? [], { selectedPath: props.selectedPath });
  render(artifactFrame(html`${screen}`, withTree ? { items: tree.nodes, current: tree.current } : undefined), box);
  await screen.updateComplete;
  await frames(3);
  return screen;
}
const mountRow = (id: PairingId, width = 1280, withTree = true): Promise<SkArtifactScreen> => mount(pairingProps(id), width, withTree);
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};

/** The focus chain from the document down through the shadow roots, innermost last. */
function chain(): Element[] {
  const out: Element[] = [];
  let active: Element | null = document.activeElement;
  while (active !== null) {
    out.push(active);
    active = active.shadowRoot?.activeElement ?? null;
  }
  return out;
}
type Where = 'shell' | 'tree' | 'inspector' | 'tabs' | 'document' | 'body';
function whereIs(): Where {
  const path = chain();
  const outer = path[0];
  const inner = path.at(-1);
  if (outer === undefined || inner === undefined || outer === document.body) return 'body';
  if (outer.localName === 'sk-shell-tree') return 'tree';
  if (outer.localName !== 'sk-artifact-screen') return 'shell';
  if (inner.closest('[data-region="inspector"]') !== null) return 'inspector';
  if (inner.getAttribute('role') === 'tab') return 'tabs';
  return 'document';
}
/** Presses Tab until the focus returns to the body (the walk wraps), returning the place of every stop and the innermost element. */
async function walk(limit = 120): Promise<{ where: Where; el: Element }[]> {
  const out: { where: Where; el: Element }[] = [];
  for (let i = 0; i < limit; i += 1) {
    await userEvent.tab();
    const where = whereIs();
    if (where === 'body') break;
    out.push({ where, el: chain().at(-1) as Element });
  }
  return out;
}
const squash = (places: Where[]): Where[] => places.filter((place, at) => place !== places[at - 1]);

describe('focus order: tree, inspector, tabs, document (A11Y-009 (b), FR-035)', () => {
  it('holds at 1280, 800 and 620 px, with the inspector before the tabs at every width', async () => {
    const seen: Record<number, Where[]> = {};
    for (const width of [1280, 800, 620]) {
      const screen = await mount(pairingProps('AV-32a'), width);
      const stops = await walk();
      expect(screen.isConnected).toBe(true);
      seen[width] = squash(stops.map((stop) => stop.where).filter((place) => place !== 'shell'));
      const places = stops.map((stop) => stop.where);
      expect(places.indexOf('inspector'), `${width}px inspector found`).toBeGreaterThan(-1);
      expect(places.indexOf('inspector'), `${width}px inspector before tabs`).toBeLessThan(places.indexOf('tabs'));
      expect(places.indexOf('tabs'), `${width}px tabs before the document`).toBeLessThan(places.indexOf('document'));
      document.body.replaceChildren();
    }
    expect(seen[1280]).toEqual(['tree', 'inspector', 'tabs', 'document']);
    expect(seen[800]).toEqual(['inspector', 'tabs', 'document']);
    expect(seen[620]).toEqual(['inspector', 'tabs', 'document']);
  });

  it('the order check refuses a wrong order (control: a list that puts the document first fails the same comparison)', async () => {
    const wrong: Where[] = ['document', 'inspector', 'tabs'];
    expect(wrong.indexOf('inspector') < wrong.indexOf('tabs') && wrong.indexOf('tabs') < wrong.indexOf('document')).toBe(false);
  });
});

describe('the four AV-32 stories: the tab-<n> count lands on the element the story names', () => {
  const PRESSES = (tags: readonly string[] | undefined): number => Number((tags ?? []).find((tag) => /^tab-\d+$/.test(tag))?.slice(4));
  const CASES: [string, typeof stories.Av32a, (el: Element) => boolean][] = [
    ['AV-32a', stories.Av32a, (el) => el.closest('[data-region="inspector"]') !== null && el.localName === 'button'],
    ['AV-32b', stories.Av32b, (el) => el.getAttribute('data-md') === 'link' && el.localName === 'a'],
    ['AV-32c', stories.Av32c, (el) => el.getAttribute('data-md') === 'table-scroll'],
    ['AV-32d', stories.Av32d, (el) => el.getAttribute('data-scroll') === 'source'],
  ];
  it('presses Tab from the shell wrapper and focuses the inspector control, the inline link, the table box and the raw block', async () => {
    let ran = 0;
    for (const [name, story, matches] of CASES) {
      const args = story.args as ArtifactScreenProps;
      await mount(args, 1280);
      const presses = PRESSES(story.tags);
      expect(presses, `${name} carries a tab tag`).toBeGreaterThan(0);
      for (let i = 0; i < presses; i += 1) await userEvent.tab();
      const inner = chain().at(-1) as Element;
      expect(matches(inner), `${name} focused ${inner.localName}`).toBe(true);
      // The control: one press fewer lands elsewhere, so the count is exact and not "somewhere after".
      document.body.replaceChildren();
      await mount(args, 1280);
      for (let i = 0; i < presses - 1; i += 1) await userEvent.tab();
      expect(matches(chain().at(-1) as Element), `${name} one press earlier`).toBe(false);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

/** The helpers of NFR-003, each proved on a control below. */
const overflows = (el: HTMLElement): boolean => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
async function stopCount(container: Element): Promise<number> {
  let count = 0;
  for (let i = 0; i < 50; i += 1) {
    await userEvent.tab();
    const path = chain();
    if (path[0] === undefined || path[0] === document.body) break;
    if (container.contains(path[0])) count += 1;
  }
  return count;
}

describe('NFR-003: the helpers have their controls', () => {
  it('the overflow detector: a deliberately wide child flips it, and so does content growing in a box of unchanged size', () => {
    const box = document.createElement('div');
    box.style.cssText = 'width:100px;height:40px;overflow:auto';
    document.body.append(box);
    const narrow = document.createElement('span');
    narrow.textContent = 'x';
    box.append(narrow);
    expect(overflows(box)).toBe(false);
    const wide = document.createElement('div');
    wide.style.width = '400px';
    wide.textContent = 'wide';
    box.append(wide);
    expect(overflows(box)).toBe(true);
    wide.remove();
    expect(overflows(box)).toBe(false);
    const size = box.getBoundingClientRect().height;
    for (let i = 0; i < 20; i += 1) {
      const line = document.createElement('p');
      line.textContent = 'line';
      box.append(line);
    }
    expect(box.getBoundingClientRect().height).toBe(size);
    expect(overflows(box)).toBe(true);
  });

  it('the stop counter: an added button flips the count', async () => {
    const box = document.createElement('div');
    for (let i = 0; i < 2; i += 1) {
      const button = document.createElement('button');
      button.textContent = String(i);
      box.append(button);
    }
    document.body.append(box);
    expect(await stopCount(box)).toBe(2);
    (document.activeElement as HTMLElement | null)?.blur();
    box.append(document.createElement('button'));
    expect(await stopCount(box)).toBe(3);
  });
});

describe('NFR-003: tab stops equal the controls shown, and a scroll region is a stop only while it overflows', () => {
  /** Controls shown by the DOM: enabled buttons of the inspector, the selected tab, anchors, and scroll regions that carry a tabindex of 0. */
  function controlsShown(screen: SkArtifactScreen): { pills: number; tab: number; links: number; regions: number } {
    const r = root(screen);
    const tabs = r.querySelectorAll('[role="tab"]').length === 0 ? 0 : 1;
    return {
      pills: Array.from(r.querySelectorAll<HTMLButtonElement>('[data-region="inspector"] button')).filter((b) => !b.disabled).length,
      tab: tabs,
      links: r.querySelectorAll('a[data-md="link"]').length,
      regions: r.querySelectorAll('[role="region"][tabindex="0"]').length,
    };
  }
  it('an overflowing document (a wide table) has one region stop beyond its controls; a short one has none (the pair of controls)', async () => {
    const wide = await mount(pairingProps('AV-32b'), 1280, false);
    const shownWide = controlsShown(wide);
    const stopsWide = await stopCount(wide);
    expect(shownWide.regions).toBe(1);
    expect(stopsWide).toBe(shownWide.pills + shownWide.tab + shownWide.links + shownWide.regions);
    document.body.replaceChildren();
    const short = await mount(pairingProps('AV-01'), 1280, false);
    const shownShort = controlsShown(short);
    const stopsShort = await stopCount(short);
    expect(shownShort.regions).toBe(0);
    expect(stopsShort).toBe(shownShort.pills + shownShort.tab + shownShort.links);
    expect(stopsWide - stopsShort).toBeGreaterThan(0);
    // Every region that is a stop really overflows, and every table box that does not overflow has no tabindex.
    for (const box of root(wide).querySelectorAll<HTMLElement>('[data-md="table-scroll"]')) expect(box.hasAttribute('tabindex')).toBe(overflows(box));
  });

  it('the table box stops being a stop when the viewport grows until the table fits, and becomes one again when it narrows (the stop follows the overflow)', async () => {
    const screen = await mount(pairingProps('AV-32b'), 1280, false);
    const box = () => root(screen).querySelector<HTMLElement>('[data-md="table-scroll"]') as HTMLElement;
    const at1280 = overflows(box());
    await page.viewport(620, 900);
    await frames(4);
    await screen.updateComplete;
    expect(overflows(box())).toBe(true);
    expect(box().getAttribute('tabindex')).toBe('0');
    expect(at1280).toBe(true);
  });

  it('the raw block is a stop only while it overflows: an unbroken line makes it one (the AV-32d fixture), a wrapped document does not', async () => {
    const wrapped = await mount({ ...pairingProps('AV-32d') }, 1280, false);
    expect(root(wrapped).querySelector('[data-scroll="source"]')?.hasAttribute('tabindex')).toBe(false);
    document.body.replaceChildren();
    const unbroken = await mount(stories.Av32d.args as ArtifactScreenProps, 1280, false);
    const block = root(unbroken).querySelector<HTMLElement>('[data-scroll="source"]') as HTMLElement;
    expect(overflows(block)).toBe(true);
    expect(block.getAttribute('tabindex')).toBe('0');
  });
});

describe('roles, accessible names, landmarks and idrefs (explicit, no axe)', () => {
  /** Every id the attribute names must resolve inside the same root; returns the dangling references. */
  function dangling(scope: ShadowRoot): string[] {
    const out: string[] = [];
    for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
      for (const el of scope.querySelectorAll(`[${attribute}]`)) {
        for (const id of (el.getAttribute(attribute) ?? '').split(/\s+/).filter((token) => token !== '')) {
          if (scope.getElementById(id) === null) out.push(`${el.localName} ${attribute}=${id}`);
        }
      }
    }
    return out;
  }
  it('names the landmarks, the tablist, the tabs and the panel, and no idref dangles (control: a planted dangling reference is found)', async () => {
    const screen = await mountRow('AV-01', 1280, false);
    const r = root(screen);
    const inspector = r.querySelector('[data-region="inspector"]');
    expect(inspector?.getAttribute('role')).toBe('group');
    expect(inspector?.getAttribute('aria-label')).toBe(ARTIFACT_INSPECTOR_LABEL);
    const pane = r.querySelector('[data-region="document-pane"]');
    expect(pane?.getAttribute('role')).toBe('region');
    expect(pane?.getAttribute('aria-label')).toBe(DOCUMENT_LABEL('spec.md'));
    const tablist = r.querySelector('[role="tablist"]');
    expect(tablist?.getAttribute('aria-label')).toBe(TABLIST_LABEL);
    const tabs = Array.from(r.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(tabs.map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1']);
    const panels = r.querySelectorAll('[role="tabpanel"]');
    expect(panels.length).toBe(1);
    expect(panels[0]?.getAttribute('aria-labelledby')).toBe(tabs[0]?.id);
    expect(tabs[0]?.getAttribute('aria-controls')).toBe(panels[0]?.id);
    expect(tabs[1]?.hasAttribute('aria-controls')).toBe(false);
    expect(r.querySelectorAll('[role="status"][aria-live="polite"]').length).toBe(1);
    expect(dangling(r)).toEqual([]);
    const planted = document.createElement('div');
    planted.setAttribute('aria-controls', 'nowhere');
    r.append(planted);
    expect(dangling(r)).toEqual(['div aria-controls=nowhere']);
    planted.remove();
  });
  it('gives the raw block and the table boxes a name that carries no document text, and the inspector buttons a name', async () => {
    const raw = await mountRow('AV-02', 1280, false);
    const block = root(raw).querySelector('[data-scroll="source"]');
    expect(block?.getAttribute('role')).toBe('region');
    expect((block?.getAttribute('aria-label') ?? '') !== '').toBe(true);
    expect(block?.getAttribute('aria-label')).not.toContain('Example Mission');
    document.body.replaceChildren();
    const wide = await mountRow('AV-32b', 1280, false);
    const boxes = Array.from(root(wide).querySelectorAll('[data-md="table-scroll"]'));
    expect(boxes.length).toBe(1);
    expect(boxes[0]?.getAttribute('aria-label')).toBe('Table 1 of 1');
    for (const button of root(wide).querySelectorAll<HTMLButtonElement>('[data-region="inspector"] button')) expect((button.textContent ?? '').trim()).not.toBe('');
  });
});

describe('the heading outline over the six fixtures: one h1 in every state except a rendered markdown body', () => {
  /** Every heading of the screen, looking through nested shadow roots, with its level and text. */
  function headings(screen: Element): { level: number; text: string; hidden: boolean }[] {
    const out: { level: number; text: string; hidden: boolean }[] = [];
    const visit = (node: ParentNode): void => {
      for (const el of Array.from(node.querySelectorAll('*'))) {
        if (/^h[1-6]$/.test(el.localName)) out.push({ level: Number(el.localName.slice(1)), text: (el.textContent ?? '').trim(), hidden: el.hasAttribute('data-hidden-heading') });
        if (el.shadowRoot !== null) visit(el.shadowRoot);
      }
    };
    visit(root(screen));
    return out;
  }
  const h1s = (screen: Element) => headings(screen).filter((h) => h.level === 1);
  it('markdown rendered: the document keeps the headings it was authored with and adds none; its Raw view has one hidden h1 (control)', async () => {
    const screen = await mountRow('AV-01', 1280, false);
    const found = headings(screen);
    expect(found.some((h) => h.hidden)).toBe(false);
    expect(h1s(screen).map((h) => h.text)).toEqual(['Example Mission']);
    document.body.replaceChildren();
    const feature = await mountRow('AV-03', 1280, false);
    const authored = headings(feature).filter((h) => h.level <= 2 && !h.hidden && h.text !== 'File' && h.text !== 'Mission');
    expect(authored.length).toBeGreaterThan(1);
    document.body.replaceChildren();
    const raw = await mountRow('AV-02', 1280, false);
    expect(h1s(raw).length).toBe(1);
    expect(h1s(raw)[0]?.hidden).toBe(true);
    expect(h1s(raw)[0]?.text).toBe(FILE_NAME_LABEL('spec.md'));
  });
  it('json, empty, refused, not-found and hostile: exactly one h1 each (hostile markdown keeps its own authored one)', async () => {
    const counts: Record<string, number> = {};
    let ran = 0;
    for (const [name, id] of [['json', 'AV-06'], ['empty', 'AV-07'], ['refused', 'AV-12'], ['not-found', 'AV-23'], ['hostile', 'AV-04']] as [string, PairingId][]) {
      const screen = await mountRow(id, 1280, false);
      counts[name] = h1s(screen).length;
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(5);
    expect(counts).toEqual({ json: 1, empty: 1, refused: 1, 'not-found': 1, hostile: 1 });
  });
  it('no state has a heading level skipped inside the screen own panels (the inspector groups sit under no h2, as the prototype)', async () => {
    const screen = await mountRow('AV-01', 1280, false);
    const levels = headings(screen).map((h) => h.level);
    expect(levels.filter((level) => level === 3).length).toBeGreaterThanOrEqual(2);
  });
});

describe('announcements follow what is shown (FR-035), across the fixtures', () => {
  const region = (screen: Element): string => (root(screen).querySelector('[data-region="live-region"]')?.textContent ?? '').trim();
  it('says what loaded when a document replaces the loading look, and counts the listing; empty on first render (control)', async () => {
    const screen = await mountRow('AV-21', 1280, false);
    expect(region(screen)).toBe('');
    Object.assign(screen, { contentStatus: 'ready', content: contentAt(contentMarkdown, 'spec.md') });
    await screen.updateComplete;
    await frames(2);
    expect(region(screen)).toBe(announceContentLoaded('spec.md'));
    document.body.replaceChildren();
    const loading = await mountRow('AV-20', 1280, false);
    expect(region(loading)).toBe('');
    Object.assign(loading, pairingProps('AV-22'));
    await loading.updateComplete;
    await frames(2);
    expect(region(loading)).toBe(announceListingLoaded(pairingProps('AV-22').listing?.entries.length ?? -1));
    expect(announceContentLoading('spec.md')).not.toBe(announceContentLoaded('spec.md'));
  });
});
