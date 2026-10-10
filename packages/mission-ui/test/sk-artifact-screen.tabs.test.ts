// The Rendered / Raw tablist of the Artifact Viewer (IC-07, AV-31, EV-10): roles, roving tabindex, arrows wrap, Home and End,
// selection follows focus, `aria-controls` to the panel, a block size of 36 px, the paint keyed on `aria-selected`, no event from a
// tab change, and no dangling idref in the three semantics cases (two tabs, fallback, none). Real keyboard input on the real tabs.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, contentProps, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';

const EVENT_NAMES = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
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
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const tabs = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('[role="tab"]'));
const tabNamed = (screen: Element, name: string): HTMLElement => {
  const found = tabs(screen).find((tab) => tab.textContent === name);
  if (found === undefined) throw new Error(`no tab ${name}`);
  return found;
};
const selectedName = (screen: Element): string => one(root(screen), '[role="tab"][aria-selected="true"]').textContent ?? '';
const activeId = (screen: Element): string => root(screen).activeElement?.id ?? '';

function record(screen: Element): CustomEvent[] {
  const events: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.addEventListener(name, (e) => events.push(e as CustomEvent));
  return events;
}

/** Every idref of the shadow root resolves to an element of the same root; returns the number checked so a loop cannot be vacuous. */
function expectNoDanglingIdref(screen: Element): number {
  const ids = new Set(Array.from(root(screen).querySelectorAll('[id]')).map((el) => el.id));
  let checked = 0;
  for (const el of Array.from(root(screen).querySelectorAll('[aria-controls],[aria-labelledby]'))) {
    for (const name of ['aria-controls', 'aria-labelledby']) {
      const value = el.getAttribute(name);
      if (value === null) continue;
      for (const ref of value.split(' ')) {
        expect(ids.has(ref), `${name}="${ref}"`).toBe(true);
        checked += 1;
      }
    }
  }
  return checked;
}

describe('the tablist', () => {
  it('is a named tablist of two tabs, the selected one the only tab stop (roving tabindex), each with its role and state', async () => {
    const screen = await mount();
    const list = one<HTMLElement>(root(screen), '[role="tablist"]');
    expect(list.getAttribute('aria-label')).toBe('View');
    expect(tabs(screen).map((tab) => tab.textContent)).toEqual(['Rendered', 'Raw']);
    expect(tabs(screen).map((tab) => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(tabs(screen).map((tab) => tab.getAttribute('tabindex'))).toEqual(['0', '-1']);
    expect(tabs(screen).map((tab) => tab.getAttribute('type'))).toEqual(['button', 'button']);
    expect(tabs(screen).map((tab) => tab.hasAttribute('class'))).toEqual([false, false]);
    // Control: after a selection the roving tabindex moves with it.
    tabNamed(screen, 'Raw').click();
    await settle(screen);
    expect(tabs(screen).map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '0']);
  });

  it('keeps a block size of at least 36 px and paints the selected tab differently from the others (not by position)', async () => {
    const screen = await mount();
    for (const tab of tabs(screen)) expect(tab.getBoundingClientRect().height).toBe(36); // exact: the min-height meets the padding in border-box, as the prototype's .segment
    const paint = (tab: HTMLElement): string => {
      const style = getComputedStyle(tab);
      return [style.backgroundColor, style.color, style.borderTopColor].join('|');
    };
    const [rendered, raw] = tabs(screen);
    const selectedPaint = paint(rendered!);
    const plainPaint = paint(raw!);
    expect(selectedPaint).not.toBe(plainPaint);
    tabNamed(screen, 'Raw').click();
    await settle(screen);
    // The selected look follows `aria-selected`: after the change the two paints have swapped.
    expect(paint(tabs(screen)[1]!)).toBe(selectedPaint);
    expect(paint(tabs(screen)[0]!)).toBe(plainPaint);
  });
});

describe('the pill tray (operator ruling 2026-10-08)', () => {
  it('draws the tabs as pills in a bordered pill tray, the selected tab keeping a visible edge and the others none you can see', async () => {
    const screen = await mount();
    const tray = getComputedStyle(one(root(screen), '[role="tablist"]'));
    expect(parseFloat(tray.borderTopWidth)).toBe(1);
    expect(tray.borderTopStyle).toBe('solid');
    expect(parseFloat(tray.borderTopLeftRadius)).toBeGreaterThan(20);
    const [rendered, raw] = tabs(screen).map((tab) => getComputedStyle(tab));
    for (const style of [rendered!, raw!]) {
      expect(parseFloat(style.borderTopLeftRadius)).toBeGreaterThan(20);
      expect(style.borderTopStyle).toBe('solid');
      expect(parseFloat(style.borderTopWidth)).toBe(1);
      expect(style.fontFamily).toBe(getComputedStyle(one(root(screen), '[data-region="toolbar"]')).fontFamily);
    }
    // The state is not colour only: the selected tab's edge differs from the unselected tab's edge.
    expect(rendered!.borderTopColor).not.toBe(raw!.borderTopColor);
  });
});

describe('the keys (AV-31)', () => {
  it('ArrowRight moves focus and selection to the next tab, and wraps from the last to the first', async () => {
    const screen = await mount();
    tabNamed(screen, 'Rendered').focus();
    await userEvent.keyboard('{ArrowRight}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Raw');
    expect(activeId(screen)).toBe('tab-raw');
    expect(root(screen).querySelector('article[data-scroll="article"]')).toBeNull();
    expect(root(screen).querySelector('pre[data-scroll="source"]')).not.toBeNull();
    await userEvent.keyboard('{ArrowRight}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Rendered');
    expect(activeId(screen)).toBe('tab-rendered');
    expect(root(screen).querySelector('article[data-scroll="article"]')).not.toBeNull();
  });

  it('ArrowLeft moves to the previous tab, and wraps from the first to the last', async () => {
    const screen = await mount();
    tabNamed(screen, 'Rendered').focus();
    await userEvent.keyboard('{ArrowLeft}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Raw');
    expect(activeId(screen)).toBe('tab-raw');
    await userEvent.keyboard('{ArrowLeft}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Rendered');
    expect(activeId(screen)).toBe('tab-rendered');
  });

  it('End jumps to the last tab and Home to the first', async () => {
    const screen = await mount();
    tabNamed(screen, 'Rendered').focus();
    await userEvent.keyboard('{End}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Raw');
    expect(activeId(screen)).toBe('tab-raw');
    await userEvent.keyboard('{Home}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Rendered');
    expect(activeId(screen)).toBe('tab-rendered');
  });

  it('ignores a key that is not a tab key (control: ArrowRight on the same tab moves)', async () => {
    const screen = await mount();
    tabNamed(screen, 'Rendered').focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('x');
    await settle(screen);
    expect(selectedName(screen)).toBe('Rendered');
    expect(activeId(screen)).toBe('tab-rendered');
    await userEvent.keyboard('{ArrowRight}');
    await settle(screen);
    expect(selectedName(screen)).toBe('Raw');
  });

  it('leaves a key with Alt, Ctrl, Meta or Shift alone: not prevented, no tab change (A11Y-001; control: the bare key moves)', async () => {
    const screen = await mount();
    const rendered = tabNamed(screen, 'Rendered');
    rendered.focus();
    for (const [name, init] of [
      ['Alt+ArrowLeft', { key: 'ArrowLeft', altKey: true }],
      ['Alt+ArrowRight', { key: 'ArrowRight', altKey: true }],
      ['Ctrl+End', { key: 'End', ctrlKey: true }],
      ['Meta+ArrowRight', { key: 'ArrowRight', metaKey: true }],
      ['Shift+Home', { key: 'Home', shiftKey: true }],
    ] as const) {
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true, composed: true });
      rendered.dispatchEvent(event);
      await settle(screen);
      expect(event.defaultPrevented, `${name} is not prevented`).toBe(false);
      expect(selectedName(screen), `${name} changes no tab`).toBe('Rendered');
      expect(root(screen).activeElement, `${name} moves no focus`).toBe(rendered);
    }
    const bare = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, composed: true });
    rendered.dispatchEvent(bare);
    await settle(screen);
    expect(bare.defaultPrevented).toBe(true);
    expect(selectedName(screen)).toBe('Raw');
  });

  it('the Tab key leaves the tablist from the selected tab (only the selected tab is a tab stop)', async () => {
    const screen = await mount({ view: 'raw' });
    tabNamed(screen, 'Raw').focus();
    await userEvent.keyboard('{Tab}');
    expect(tabs(screen)).not.toContain(root(screen).activeElement);
  });
});

describe('a tab change is state only (EV-10)', () => {
  it('emits no event from a click or a key (positive control: a link click on the same screen emits one)', async () => {
    const screen = await mount(pairingProps('AV-03'));
    const events = record(screen);
    tabNamed(screen, 'Raw').click();
    await settle(screen);
    tabNamed(screen, 'Rendered').focus();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{Home}');
    await settle(screen);
    expect(events).toHaveLength(0);
    tabNamed(screen, 'Rendered').click();
    await settle(screen);
    Array.from(root(screen).querySelectorAll<HTMLElement>('a[data-md="link"]')).find((a) => (a.textContent ?? '').includes('project site'))?.click();
    expect(events.map((e) => e.type)).toEqual(['sk-open-link']);
  });
});

describe('the semantics cases: no dangling idref (two tabs, fallback, none)', () => {
  it('two tabs: the selected tab controls the one panel, the panel is named by its tab, in both selections', async () => {
    for (const view of ['rendered', 'raw'] as const) {
      const screen = await mount({ view });
      const selected = one<HTMLElement>(root(screen), '[role="tab"][aria-selected="true"]');
      const panel = one<HTMLElement>(root(screen), '[role="tabpanel"]');
      expect(selected.getAttribute('aria-controls')).toBe(panel.id);
      expect(panel.getAttribute('aria-labelledby')).toBe(selected.id);
      const unselected = tabs(screen).find((tab) => tab !== selected);
      expect(unselected?.hasAttribute('aria-controls')).toBe(false);
      expect(root(screen).querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
      expect(expectNoDanglingIdref(screen)).toBeGreaterThanOrEqual(2);
    }
  });

  it('fallback: the first tab reads Fallback, the source block is the panel, no idref dangles in either selection', async () => {
    for (const view of ['rendered', 'raw'] as const) {
      const screen = await mount({ ...pairingProps('AV-05'), view });
      expect(tabs(screen).map((tab) => tab.textContent)).toEqual(['Fallback', 'Raw']);
      expect(root(screen).querySelector('pre[data-scroll="source"]')).not.toBeNull();
      expect(root(screen).querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
      expect(expectNoDanglingIdref(screen)).toBeGreaterThanOrEqual(2);
    }
  });

  it('none: a raw-only file draws no tablist and no tabpanel and no idref at all (control: the markdown file draws them)', async () => {
    const raw = await mount(pairingProps('AV-06'));
    expect(root(raw).querySelector('[role="tablist"]')).toBeNull();
    expect(root(raw).querySelector('[role="tab"]')).toBeNull();
    expect(root(raw).querySelector('[role="tabpanel"]')).toBeNull();
    expect(expectNoDanglingIdref(raw)).toBe(0);
    const control = await mount();
    expect(root(control).querySelector('[role="tablist"]')).not.toBeNull();
    expect(expectNoDanglingIdref(control)).toBeGreaterThan(0);
  });

  it('a markdown empty file keeps both tabs, each showing the empty words, and no idref dangles (control: text/plain has no tablist)', async () => {
    const empty = { ...contentAt(contentProps('contentEmpty'), 'spec.md'), mediaType: 'text/markdown' };
    const screen = await mount({ content: empty, selectedPath: 'spec.md' });
    expect(tabs(screen).map((tab) => tab.textContent)).toEqual(['Rendered', 'Raw']);
    for (const name of ['Rendered', 'Raw']) {
      tabNamed(screen, name).click();
      await settle(screen);
      expect(selectedName(screen)).toBe(name);
      expect(one(root(screen), '[role="tabpanel"]').textContent).toContain('This file is empty.');
      expect(expectNoDanglingIdref(screen)).toBeGreaterThanOrEqual(2);
    }
    const plain = await mount({ content: contentAt(contentProps('contentEmpty'), 'spec.md'), selectedPath: 'spec.md' });
    expect(root(plain).querySelector('[role="tablist"]')).toBeNull();
    expect(root(plain).textContent).toContain('This file is empty.');
  });
});

describe('the tab story fixture (AV-31)', () => {
  it('focus on the active tab leaves the rendered tab selected and focused (control: the Raw tab is not)', async () => {
    const screen = await mount(pairingProps('AV-31'));
    tabNamed(screen, 'Rendered').focus();
    expect(activeId(screen)).toBe('tab-rendered');
    expect(selectedName(screen)).toBe('Rendered');
    expect(tabNamed(screen, 'Raw').getAttribute('tabindex')).toBe('-1');
  });
});
