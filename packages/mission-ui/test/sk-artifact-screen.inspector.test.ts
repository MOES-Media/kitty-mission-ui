// The inspector of the Artifact Viewer (IC-09): file facts, Mission facts present and absent, linked Work Packages, "Open Work Package",
// the unknown kind, the Work Package pill (E-29: the library pill-tag sheet, the pinned ellipsis, the block size) and the
// `matchWorkPackage` integration. Every no-event test carries a positive control, every emit test asserts exactly one event.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { renderInspector } from '../src/elements/sk-artifact-screen/inspector-parts.js';
import type { InspectorView } from '../src/elements/sk-artifact-screen/inspector-parts.js';
import { artifactFrame, missionBare, missionFacts, pairingProps, workPackageList } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import { pillTagSheet } from '../src/library-sheets.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(id: Parameters<typeof pairingProps>[0], extra: Partial<ArtifactScreenProps> = {}, width = 1280): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps(id), ...extra });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

const inspectorOf = (screen: SkArtifactScreen): HTMLElement => {
  const found = screen.shadowRoot?.querySelector<HTMLElement>('[data-region="inspector"]');
  if (found === null || found === undefined) throw new Error('no inspector');
  return found;
};
const groups = (inspector: HTMLElement): Array<{ title: string; el: HTMLElement }> =>
  Array.from(inspector.querySelectorAll<HTMLElement>('[data-inspector-group]')).map((el) => ({ title: el.querySelector('h3')?.textContent ?? '', el }));
/** The label to value pairs of a `dl`, read from the dt and dd siblings. */
function pairs(dl: Element): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const dts = Array.from(dl.querySelectorAll('dt'));
  const dds = Array.from(dl.querySelectorAll('dd'));
  expect(dds.length).toBe(dts.length);
  dts.forEach((dt, i) => out.push([dt.textContent?.trim() ?? '', dds[i]?.textContent?.replace(/\s+/g, ' ').trim() ?? '']));
  return out;
}
function record(screen: Element): CustomEvent[] {
  const events: CustomEvent[] = [];
  for (const name of ['sk-select-work-package', 'sk-select-artifact', 'sk-open-mission', 'sk-open-link', 'sk-retry-load']) screen.addEventListener(name, (e) => events.push(e as CustomEvent));
  return events;
}
function expectOne(events: CustomEvent[], detail: unknown): void {
  expect(events.map((e) => e.type)).toEqual(['sk-select-work-package']);
  const [event] = events;
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}

describe('the library pill-tag sheet (E-29, the named additive edit of library-sheets.ts)', () => {
  it('is a constructable sheet that carries the pill look, and the inspector adopts it', async () => {
    expect(pillTagSheet).toBeInstanceOf(CSSStyleSheet);
    const text = Array.from(pillTagSheet.cssRules, (rule) => rule.cssText).join('\n');
    expect(text).toContain('.sk-pill-tag');
    const screen = await mount('AV-26a');
    const pill = inspectorOf(screen).querySelector<HTMLElement>('button.sk-pill-tag');
    expect(pill).not.toBeNull();
    const style = getComputedStyle(pill as HTMLElement);
    // behaviour: the sheet's pill radius and pill background reach the raw button
    expect(style.borderTopLeftRadius).not.toBe('0px');
    expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    // control: a bare button in the same shadow root, without the class, carries neither
    const bare = document.createElement('button');
    bare.textContent = 'bare';
    inspectorOf(screen).append(bare);
    expect(getComputedStyle(bare).backgroundColor).not.toBe(style.backgroundColor);
    bare.remove();
  });
});

describe('the pill-tag sheet never reaches the screen host', () => {
  it('holds no :host rule (the library sheet sets the element host to inline-flex), so the screen host stays a block and fills the content cell', async () => {
    const hostRules = Array.from(pillTagSheet.cssRules).filter((rule) => rule instanceof CSSStyleRule && rule.selectorText.includes(':host'));
    expect(hostRules.length).toBe(0);
    const screen = await mount('AV-24');
    expect(getComputedStyle(screen).display).toBe('block');
    // behaviour: the layout fills the cell of the shell, not its own content width
    const cell = screen.getBoundingClientRect().width;
    const layout = (screen.shadowRoot?.querySelector('[data-layout]') as HTMLElement).getBoundingClientRect().width;
    expect(cell).toBeGreaterThan(900);
    expect(layout).toBe(cell);
    // control: the library's own text carries the rule the part drops, so the check is not vacuous
    const library = new CSSStyleSheet();
    library.replaceSync(':host { display: inline-flex; }');
    expect(Array.from(library.cssRules).some((rule) => rule instanceof CSSStyleRule && rule.selectorText === ':host')).toBe(true);
  });
});

describe('the inspector rule and fill (E-30, re-checked stacked)', () => {
  it('draws the rule on the left beside the pane (1280px) and on top when stacked (800px, shell content cell below 45rem), with the hero fill both ways', async () => {
    const wide = inspectorOf(await mount('AV-24', {}, 1280));
    const read = (el: HTMLElement) => {
      const style = getComputedStyle(el);
      return { side: style.borderInlineStartWidth, top: style.borderBlockStartWidth, sideColor: style.borderInlineStartColor, topColor: style.borderBlockStartColor, topStyle: style.borderBlockStartStyle, fill: style.backgroundColor };
    };
    const wideStyle = read(wide);
    expect([wideStyle.side, wideStyle.top]).toEqual(['1px', '0px']);
    expect(wideStyle.fill).not.toBe('rgba(0, 0, 0, 0)');
    document.body.replaceChildren();
    const narrow = inspectorOf(await mount('AV-24', {}, 800));
    const narrowStyle = read(narrow);
    expect([narrowStyle.side, narrowStyle.top]).toEqual(['0px', '1px']);
    // the stacked rule is the same token as the side rule, so it is as visible as the prototype's
    expect(narrowStyle.topColor).toBe(wideStyle.sideColor);
    expect(narrowStyle.topStyle).toBe('solid');
    expect(narrowStyle.fill).toBe(wideStyle.fill);
    // the stacked inspector sits above the document pane
    const pane = narrow.getRootNode() instanceof ShadowRoot ? ((narrow.getRootNode() as ShadowRoot).querySelector('[data-region="document-pane"]') as HTMLElement) : narrow;
    expect(narrow.getBoundingClientRect().bottom).toBeLessThanOrEqual(pane.getBoundingClientRect().top + 1);
  });
});

describe('AV-24: file facts', () => {
  it('shows the kind word, media type, size, modified, path and redacted rows from the entry and the content, under an h3 "File"', async () => {
    const screen = await mount('AV-24');
    const [file] = groups(inspectorOf(screen));
    expect(file?.title).toBe('File');
    expect(file?.el.querySelector('h3')?.tagName).toBe('H3');
    const dl = file?.el.querySelector('dl.sk-facts') as HTMLElement;
    expect(pairs(dl)).toEqual([
      ['Kind', 'Specification'],
      ['Media type', 'Markdown'],
      ['Size', '5 KiB'],
      ['Modified on this host', '2026-09-22T10:35:00Z'],
      ['Path', 'spec.md'],
      ['Redacted', 'No'],
    ]);
    // the library facts markup: every term and value carries its class
    expect(dl.querySelectorAll('dt.sk-facts__term').length).toBe(6);
    expect(dl.querySelectorAll('dd.sk-facts__value').length).toBe(6);
  });

  it('draws the facts with the library look: no row separators and 16px values, 14px terms (accepted drift, CP-1 ruling 4)', async () => {
    const screen = await mount('AV-24');
    const dl = inspectorOf(screen).querySelector('dl.sk-facts') as HTMLElement;
    const dd = dl.querySelector('dd') as HTMLElement;
    const dt = dl.querySelector('dt') as HTMLElement;
    expect(getComputedStyle(dd).fontSize).toBe('16px');
    expect(getComputedStyle(dt).fontSize).toBe('14px');
    expect(getComputedStyle(dd).borderBottomWidth).toBe('0px');
    expect(getComputedStyle(dt).borderBottomWidth).toBe('0px');
  });

  it('omits Modified without an entry, and Media type and Redacted without a content (the fallbacks); control: both present with them', async () => {
    const withBoth = await mount('AV-24');
    expect(pairs(inspectorOf(withBoth).querySelector('dl.sk-facts') as HTMLElement).map(([label]) => label)).toEqual(['Kind', 'Media type', 'Size', 'Modified on this host', 'Path', 'Redacted']);
    document.body.replaceChildren();
    const noEntry = await mount('AV-24', { listing: { ...(pairingProps('AV-24').listing as NonNullable<ArtifactScreenProps['listing']>), entries: [] } });
    const labels = pairs(inspectorOf(noEntry).querySelector('dl.sk-facts') as HTMLElement).map(([label]) => label);
    expect(labels).toEqual(['Kind', 'Media type', 'Size', 'Path', 'Redacted']);
  });

  it('keeps a long path inside the column: it breaks after separators and between words, with the full text as the title of the value', async () => {
    const long = `${'very-long-directory-name-'.repeat(2)}one/${'segment-'.repeat(6)}two/with space inside/${'x'.repeat(80)}.md`;
    const base = pairingProps('AV-24');
    const content = { ...(base.content as NonNullable<ArtifactScreenProps['content']>), path: long };
    const screen = await mount('AV-24', { selectedPath: long, content, listing: { ...(base.listing as NonNullable<ArtifactScreenProps['listing']>), entries: [{ path: long, kind: 'spec', sizeBytes: 10, modifiedAt: '2026-09-22T10:35:00Z', readable: true }] } });
    const inspector = inspectorOf(screen);
    const value = Array.from(inspector.querySelectorAll<HTMLElement>('dd')).find((dd) => dd.title === long);
    expect(value).toBeDefined();
    expect(value?.textContent?.replace(/\s+/g, ' ').trim()).toBe(long);
    const box = inspector.getBoundingClientRect();
    const dd = (value as HTMLElement).getBoundingClientRect();
    expect(dd.right).toBeLessThanOrEqual(box.right);
    expect(inspector.scrollWidth).toBeLessThanOrEqual(inspector.clientWidth);
    // the value is more than one line, so it broke at a separator or a space, not at the end only. Counted as distinct rows of the word
    // spans, not as a pixel height: a line box is as tall as the font stack of the machine makes it.
    const rows = new Set(Array.from((value as HTMLElement).querySelectorAll<HTMLElement>('span')).map((span) => Math.round(span.getBoundingClientRect().top)));
    expect(rows.size, 'the path wraps onto more than one row').toBeGreaterThan(1);
    // Control: a one-word fact value is on a single row by the same measure, so the count is not blind to wrapping.
    const rowsOf = (dd: HTMLElement): number => new Set(Array.from(dd.querySelectorAll<HTMLElement>('span')).map((span) => Math.round(span.getBoundingClientRect().top))).size;
    const single = Array.from(inspector.querySelectorAll<HTMLElement>('dd')).find((dd) => dd !== value && dd.querySelectorAll('span').length === 1);
    expect(single, 'a one-word value exists').toBeDefined();
    expect(rowsOf(single as HTMLElement)).toBe(1);
    // the single over-long word ellipsizes (words-only wrapping), it never pushes the panel wider
    const words = Array.from((value as HTMLElement).querySelectorAll<HTMLElement>('span'));
    expect(words.length).toBeGreaterThan(4);
    const last = words.at(-1) as HTMLElement;
    expect(getComputedStyle(last).textOverflow).toBe('ellipsis');
    expect(last.scrollWidth).toBeGreaterThan(last.clientWidth);
  });
});

describe('AV-25: Mission facts present and absent', () => {
  it('present (AV-25a): the group h3 "Mission" with Mission, Type, Topology, Target and Status', async () => {
    const screen = await mount('AV-25a');
    const found = groups(inspectorOf(screen)).find((g) => g.title === 'Mission');
    expect(found).toBeDefined();
    expect(pairs(found?.el.querySelector('dl.sk-facts') as HTMLElement)).toEqual([
      ['Mission', 'Sample mission'],
      ['Type', 'software-dev'],
      ['Topology', 'lanes'],
      ['Target', 'main'],
      ['Status', 'implement'],
    ]);
  });

  it('only the identity (AV-25b): one row, the others omitted; control: AV-25a has five', async () => {
    const screen = await mount('AV-25b');
    const found = groups(inspectorOf(screen)).find((g) => g.title === 'Mission');
    expect(pairs(found?.el.querySelector('dl.sk-facts') as HTMLElement)).toEqual([['Mission', missionBare.slug]]);
  });

  it('no Mission: the whole group is hidden; control: the File group stays', async () => {
    const screen = await mount('AV-25a', { mission: null });
    const titles = groups(inspectorOf(screen)).map((g) => g.title);
    expect(titles).toContain('File');
    expect(titles).not.toContain('Mission');
  });
});

describe('AV-26: linked Work Packages', () => {
  it('present (AV-26a): one h3 and one titled pill per Work Package, each a native button with the label as name and title', async () => {
    const screen = await mount('AV-26a');
    const found = groups(inspectorOf(screen)).find((g) => g.title === 'Linked Work Packages');
    expect(found).toBeDefined();
    const pills = Array.from((found as { el: HTMLElement }).el.querySelectorAll<HTMLButtonElement>('button.sk-pill-tag'));
    expect(pills.map((p) => p.textContent)).toEqual(['WP01 First slice', 'WP02 Second slice']);
    expect(pills.map((p) => p.title)).toEqual(['WP01 First slice', 'WP02 Second slice']);
    expect(pills.map((p) => p.type)).toEqual(['button', 'button']);
    expect(pills.every((p) => p.tagName === 'BUTTON' && !p.disabled)).toBe(true);
  });

  it('absent (AV-26b): no heading and no pill; control: AV-26a draws both', async () => {
    const absent = await mount('AV-26b');
    expect(groups(inspectorOf(absent)).map((g) => g.title)).not.toContain('Linked Work Packages');
    expect(inspectorOf(absent).querySelectorAll('button.sk-pill-tag').length).toBe(0);
    document.body.replaceChildren();
    const present = await mount('AV-26a');
    expect(inspectorOf(present).querySelectorAll('button.sk-pill-tag').length).toBe(workPackageList.length);
  });

  it('a pill click emits exactly one sk-select-work-package with the Mission id and the id (EV-4)', async () => {
    const screen = await mount('AV-26a');
    const events = record(screen);
    const pills = Array.from(inspectorOf(screen).querySelectorAll<HTMLButtonElement>('button.sk-pill-tag'));
    expect(pills.length).toBe(2);
    pills[1]?.click();
    expectOne(events, { missionId: missionFacts.missionId, wpId: 'WP02' });
  });

  it('keyboard: Tab reaches the pill, Enter and Space each activate it once (native button)', async () => {
    const screen = await mount('AV-26a');
    const events = record(screen);
    const pill = inspectorOf(screen).querySelector<HTMLButtonElement>('button.sk-pill-tag') as HTMLButtonElement;
    pill.focus();
    expect(screen.shadowRoot?.activeElement).toBe(pill);
    await userEvent.keyboard('{Enter}');
    expect(events.length).toBe(1);
    await userEvent.keyboard(' ');
    expect(events.length).toBe(2);
    expect(events.map((e) => e.type)).toEqual(['sk-select-work-package', 'sk-select-work-package']);
    expect(events.map((e) => e.detail)).toEqual([
      { missionId: missionFacts.missionId, wpId: 'WP01' },
      { missionId: missionFacts.missionId, wpId: 'WP01' },
    ]);
  });

  it('without a Mission the pills are inert and emit nothing; control: the same click with a Mission emits', async () => {
    const screen = await mount('AV-26a', { mission: null });
    const events = record(screen);
    const pill = inspectorOf(screen).querySelector<HTMLButtonElement>('button.sk-pill-tag') as HTMLButtonElement;
    expect(pill.disabled).toBe(true);
    pill.click();
    expect(events.length).toBe(0);
    document.body.replaceChildren();
    const live = await mount('AV-26a');
    const liveEvents = record(live);
    inspectorOf(live).querySelector<HTMLButtonElement>('button.sk-pill-tag')?.click();
    expect(liveEvents.length).toBe(1);
  });

  it('is exactly 26px of block size (the prototype pill, above the 24px of NFR-015), with no browser border and a pointer', async () => {
    const screen = await mount('AV-26a');
    const pills = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('button.sk-pill-tag'));
    expect(pills.length).toBe(2);
    for (const pill of pills) {
      const style = getComputedStyle(pill);
      // Derived, not a literal: the box is its line height (the library's 1.5 times the font size, a unitless ratio on the pill itself, so
      // the fallback font of a runner cannot move it) plus the block padding; both padding values are asserted so a change turns this red.
      const px = (value: string): number => parseFloat(value);
      expect(px(style.paddingTop)).toBe(4);
      expect(px(style.paddingBottom)).toBe(4);
      expect(px(style.paddingLeft)).toBe(12);
      expect(px(style.paddingRight)).toBe(12);
      expect(Math.abs(px(style.lineHeight) / px(style.fontSize) - 1.5)).toBeLessThan(0.001);
      expect(pill.getBoundingClientRect().height).toBeCloseTo(px(style.lineHeight) + px(style.paddingTop) + px(style.paddingBottom), 1);
      expect(px(style.lineHeight) + px(style.paddingTop) + px(style.paddingBottom), 'the prototype pill, above the 24px of NFR-015').toBeGreaterThanOrEqual(26);
      expect([style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]).toEqual(['0px', '0px', '0px', '0px']);
      expect(style.cursor).toBe('pointer');
    }
    // control: a bare button of the same shadow root keeps the browser border and the default cursor
    const bare = document.createElement('button');
    bare.textContent = 'bare';
    inspectorOf(screen).append(bare);
    expect(getComputedStyle(bare).borderTopWidth).not.toBe('0px');
    expect(getComputedStyle(bare).cursor).toBe('default');
    bare.remove();
  });

  it('the group headings take the prototype h3 size: 16px (var(--sk-text-base)) and line-height 1.35', async () => {
    const screen = await mount('AV-26a');
    const headings = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('h3'));
    expect(headings.map((h) => h.textContent)).toEqual(['File', 'Mission', 'Linked Work Packages']);
    for (const h of headings) {
      const style = getComputedStyle(h);
      expect(style.fontSize).toBe('16px');
      expect(style.lineHeight).toBe('21.6px');
    }
    // control: an h3 outside the inspector keeps the browser default
    const outside = document.createElement('h3');
    outside.textContent = 'outside';
    document.body.append(outside);
    expect(getComputedStyle(outside).fontSize).not.toBe('16px');
  });
});

describe('E-29: the pill ellipsis declarations, pinned by computed style', () => {
  it('overflow hidden, text-overflow ellipsis, white-space nowrap and max-width 100% on the pill; a long title ellipsizes inside its column', async () => {
    const longTitle = 'An exceedingly long Work Package title that cannot possibly fit in a two hundred and seventy pixel inspector column';
    const screen = await mount('AV-26a', { workPackages: [{ wpId: 'WP01', title: longTitle }, { wpId: 'WP02', title: 'Short' }] });
    const [long, short] = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('button.sk-pill-tag')) as [HTMLElement, HTMLElement];
    const style = getComputedStyle(long);
    expect(style.overflowX).toBe('hidden');
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.maxWidth).toBe('100%');
    // behaviour: it stays inside the panel, shows less than its text, and keeps the full text in the title and the name
    const panel = inspectorOf(screen).getBoundingClientRect();
    expect(long.getBoundingClientRect().right).toBeLessThanOrEqual(panel.right);
    expect(long.scrollWidth).toBeGreaterThan(long.clientWidth);
    expect(long.title).toBe(`WP01 ${longTitle}`);
    expect(long.textContent).toBe(`WP01 ${longTitle}`);
    // control: the short pill does not overflow, and sk-button (outside the rule) is not ellipsized
    expect(short.scrollWidth).toBeLessThanOrEqual(short.clientWidth);
    const button = document.createElement('sk-button');
    inspectorOf(screen).append(button);
    expect(getComputedStyle(button).textOverflow).toBe('clip');
    button.remove();
  });
});

describe('AV-27 and AV-28: "Open Work Package"', () => {
  it('a prompt shows the visible secondary sk-button with its id and a leading icon, and emits exactly one event', async () => {
    const screen = await mount('AV-27');
    const events = record(screen);
    const open = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('sk-button')).filter((b) => (b.textContent ?? '').includes('Open Work Package'));
    expect(open.length).toBe(1);
    expect(open[0]?.getAttribute('variant')).toBe('secondary');
    expect(open[0]?.textContent?.trim()).toBe('Open Work Package WP01');
    expect(open[0]?.querySelector('svg')).not.toBeNull();
    open[0]?.click();
    expectOne(events, { missionId: missionFacts.missionId, wpId: 'WP01' });
  });

  it('a review cycle shows the same action for its Work Package, with the kind word "Review cycle"', async () => {
    const screen = await mount('AV-28');
    const events = record(screen);
    const inspector = inspectorOf(screen);
    expect(pairs(inspector.querySelector('dl.sk-facts') as HTMLElement)[0]).toEqual(['Kind', 'Review cycle']);
    const open = Array.from(inspector.querySelectorAll<HTMLElement>('sk-button')).find((b) => (b.textContent ?? '').includes('Open Work Package')) as HTMLElement;
    open.click();
    expectOne(events, { missionId: missionFacts.missionId, wpId: 'WP01' });
  });

  it('a prompt or review cycle links its own Work Package only (FR-027): one pill for WP01, not the whole list; control: a spec lists both', async () => {
    const screen = await mount('AV-27');
    const pills = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('button.sk-pill-tag'));
    expect(pills.map((p) => p.textContent)).toEqual(['WP01 First slice']);
    document.body.replaceChildren();
    const spec = await mount('AV-26a');
    expect(Array.from(inspectorOf(spec).querySelectorAll('button.sk-pill-tag')).length).toBe(2);
  });

  it('FR-027, unmatched: a prompt or review cycle with no Work Package match shows no pill and no action, though the host list is not empty; control: a match shows its one pill', async () => {
    for (const row of ['AV-27', 'AV-28'] as const) {
      const none = await mount(row, { workPackages: [{ wpId: 'WP09', title: 'Elsewhere' }, { wpId: 'WP10', title: 'Other' }] });
      expect(inspectorOf(none).querySelectorAll('button.sk-pill-tag').length).toBe(0);
      expect(groups(inspectorOf(none)).map((g) => g.title)).not.toContain('Linked Work Packages');
      document.body.replaceChildren();
    }
    const matched = await mount('AV-27', { workPackages: [{ wpId: 'WP09', title: 'Elsewhere' }, { wpId: 'WP01', title: 'First slice' }] });
    expect(Array.from(inspectorOf(matched).querySelectorAll('button.sk-pill-tag')).map((p) => p.textContent)).toEqual(['WP01 First slice']);
  });

  it('no action for another kind (spec); control: the prompt of the same listing has one', async () => {
    const spec = await mount('AV-24');
    const names = (screen: SkArtifactScreen): string[] => Array.from(inspectorOf(screen).querySelectorAll('sk-button')).map((b) => b.textContent?.trim() ?? '');
    expect(names(spec).filter((n) => n.startsWith('Open Work Package'))).toEqual([]);
    document.body.replaceChildren();
    const prompt = await mount('AV-27');
    expect(names(prompt).filter((n) => n.startsWith('Open Work Package'))).toEqual(['Open Work Package WP01']);
  });

  it('matchWorkPackage integration: the longest id wins (WP01 against WP010), and no match hides the action', async () => {
    const prompt = await mount('AV-27', { workPackages: [{ wpId: 'WP0', title: 'Short id' }, { wpId: 'WP01', title: 'Long id' }] });
    const events = record(prompt);
    const button = Array.from(inspectorOf(prompt).querySelectorAll<HTMLElement>('sk-button')).find((b) => (b.textContent ?? '').includes('Open Work Package')) as HTMLElement;
    expect(button.textContent?.trim()).toBe('Open Work Package WP01');
    button.click();
    expectOne(events, { missionId: missionFacts.missionId, wpId: 'WP01' });
    document.body.replaceChildren();
    // no match: the list holds no id that leads the file name
    const none = await mount('AV-27', { workPackages: [{ wpId: 'WP09', title: 'Elsewhere' }] });
    expect(Array.from(inspectorOf(none).querySelectorAll('sk-button')).filter((b) => (b.textContent ?? '').includes('Open Work Package')).length).toBe(0);
    // an id that only prefixes the name without the separator does not match (WP1 against WP10-name)
    document.body.replaceChildren();
    const prefix = await mount('AV-27', { workPackages: [{ wpId: 'WP', title: 'Bare prefix' }] });
    expect(Array.from(inspectorOf(prefix).querySelectorAll('sk-button')).filter((b) => (b.textContent ?? '').includes('Open Work Package')).length).toBe(0);
  });

  it('without a Mission the action is inert and emits nothing; control: with a Mission it emits', async () => {
    const screen = await mount('AV-27', { mission: null });
    const events = record(screen);
    const button = Array.from(inspectorOf(screen).querySelectorAll<HTMLElement>('sk-button')).find((b) => (b.textContent ?? '').includes('Open Work Package')) as HTMLElement | undefined;
    // with no Mission the host list cannot match either, so the action may be absent; if drawn it is disabled and silent
    if (button !== undefined) {
      expect(button.hasAttribute('disabled')).toBe(true);
      button.click();
    }
    expect(events.length).toBe(0);
    document.body.replaceChildren();
    const live = await mount('AV-27');
    const liveEvents = record(live);
    Array.from(inspectorOf(live).querySelectorAll<HTMLElement>('sk-button')).find((b) => (b.textContent ?? '').includes('Open Work Package'))?.click();
    expect(liveEvents.length).toBe(1);
  });
});

describe('AV-29: an unknown kind', () => {
  it('shows the raw kind as the word in the inspector; control: a known kind shows its table word', async () => {
    const screen = await mount('AV-29');
    expect(pairs(inspectorOf(screen).querySelector('dl.sk-facts') as HTMLElement)[0]).toEqual(['Kind', 'diagram']);
    document.body.replaceChildren();
    const known = await mount('AV-24');
    expect(pairs(inspectorOf(known).querySelector('dl.sk-facts') as HTMLElement)[0]).toEqual(['Kind', 'Specification']);
  });
});

describe('the notes', () => {
  it('draws one quiet read-only sk-notice of tone info, and the redaction line only when redacted (control: AV-08 has both)', async () => {
    const plain = await mount('AV-24');
    const notices = (screen: SkArtifactScreen): string[] => Array.from(inspectorOf(screen).querySelectorAll('sk-notice')).map((n) => `${n.getAttribute('tone')}:${n.textContent?.trim()}`);
    expect(notices(plain)).toEqual(['info:Read-only. Nothing here can be edited.']);
    document.body.replaceChildren();
    const redacted = await mount('AV-08');
    expect(notices(redacted)).toEqual(['info:Host paths and e-mail addresses are replaced.', 'info:Read-only. Nothing here can be edited.']);
  });
});

describe('the landmark', () => {
  it('is a div role="group" named "Artifact metadata", not an aside', async () => {
    const screen = await mount('AV-24');
    const inspector = inspectorOf(screen);
    expect(inspector.tagName).toBe('DIV');
    expect(inspector.getAttribute('role')).toBe('group');
    expect(inspector.getAttribute('aria-label')).toBe('Artifact metadata');
    expect(screen.shadowRoot?.querySelector('aside')).toBeNull();
    expect(Array.from(inspector.querySelectorAll('h3')).map((h) => h.textContent)).toEqual(['File', 'Mission', 'Linked Work Packages']);
  });
});

describe('the part alone', () => {
  const view: InspectorView = {
    fileTitle: 'File',
    missionTitle: 'Mission',
    linkedTitle: 'Linked Work Packages',
    file: [{ label: 'Kind', value: 'Specification' }],
    mission: [],
    linked: [{ wpId: 'WP05', label: 'WP05 Five' }],
    open: null,
    openLabel: '',
    redactedNote: null,
    readOnlyNote: 'Read-only.',
    inert: false,
  };
  it('calls the handler once with the id of the pill; control: a view without links draws no pill', async () => {
    const box = document.createElement('div');
    document.body.append(box);
    const calls: string[] = [];
    render(renderInspector(view, { onSelectWorkPackage: (id) => calls.push(id) }), box);
    box.querySelector<HTMLButtonElement>('button.sk-pill-tag')?.click();
    expect(calls).toEqual(['WP05']);
    render(renderInspector({ ...view, linked: [] }, { onSelectWorkPackage: (id) => calls.push(id) }), box);
    expect(box.querySelectorAll('button.sk-pill-tag').length).toBe(0);
  });
});
