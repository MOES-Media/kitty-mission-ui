import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkShellNavItem } from '../src/elements/sk-shell-nav-item/sk-shell-nav-item.js';
import { sameLabelItems, workPackagesItem } from '../src/elements/sk-shell-nav-item/fixtures.js';
import type { ShellNavigateDetail } from '../src/shell-types.js';

beforeEach(async () => {
  await page.viewport(1024, 768);
});

afterEach(async () => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

async function mount(props: Partial<SkShellNavItem> = {}, host: HTMLElement = document.body): Promise<SkShellNavItem> {
  const el = document.createElement('sk-shell-nav-item');
  el.itemId = workPackagesItem.id;
  el.label = workPackagesItem.label;
  el.href = workPackagesItem.href;
  el.icon = workPackagesItem.icon;
  Object.assign(el, props);
  host.append(el);
  await el.updateComplete;
  return el;
}

function row(el: SkShellNavItem): HTMLElement {
  const found = el.shadowRoot?.querySelector<HTMLElement>('sk-action-row');
  if (!found) throw new Error('row missing');
  return found;
}

function anchor(el: SkShellNavItem): HTMLAnchorElement {
  const found = row(el).shadowRoot?.querySelector('a');
  if (!found) throw new Error('anchor missing');
  return found;
}

function bubble(el: SkShellNavItem): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>('sk-pill-tag') ?? null;
}

// Dispatches a click on the anchor and reports whether the element cancelled it. A document listener then cancels the
// click so the real browser never follows the href (a modified click would otherwise open a window and hang the run).
function clickAnchor(el: SkShellNavItem, init: MouseEventInit): boolean {
  let prevented = false;
  const swallow = (event: Event): void => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', swallow);
  anchor(el).dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init }));
  document.removeEventListener('click', swallow);
  return prevented;
}

function collectNavigate(): CustomEvent<ShellNavigateDetail>[] {
  const seen: CustomEvent<ShellNavigateDetail>[] = [];
  const onNavigate = (event: Event): void => {
    // Keep the browser from really navigating the test page.
    seen.push(event as CustomEvent<ShellNavigateDetail>);
  };
  document.addEventListener('sk-navigate', onNavigate);
  return seen;
}

describe('sk-shell-nav-item rendering', () => {
  it('puts the label as visible text in the title slot and the icon in the marker slot', async () => {
    const el = await mount();
    const r = row(el);
    expect(r.hasAttribute('presentation')).toBe(false);
    expect(r.getAttribute('href')).toBe(workPackagesItem.href);
    expect(r.querySelector('[slot="title"]')?.textContent?.trim()).toBe(workPackagesItem.label);
    expect(r.querySelector('[slot="marker"] svg')).not.toBeNull();
    expect(r.hasAttribute('label')).toBe(false);
  });

  // The link inside the row's shadow root is the node assistive technology reads, so the tests assert it.
  it('current=page selects the row and its link announces aria-current=page', async () => {
    const el = await mount({ current: 'page' });
    expect(row(el).hasAttribute('selected')).toBe(true);
    expect(anchor(el).getAttribute('aria-current')).toBe('page');
    expect(row(el).hasAttribute('aria-current')).toBe(false);
    expect(el.hasAttribute('aria-current')).toBe(false);
  });

  it('current=true (ancestor) is not selected and its link carries no aria-current (G-16)', async () => {
    const el = await mount({ current: 'true' });
    expect(row(el).hasAttribute('selected')).toBe(false);
    expect(anchor(el).hasAttribute('aria-current')).toBe(false);
    expect(row(el).hasAttribute('aria-current')).toBe(false);
  });

  it('no current: no selected and no aria-current on the link', async () => {
    const el = await mount({ current: '' });
    expect(row(el).hasAttribute('selected')).toBe(false);
    expect(anchor(el).hasAttribute('aria-current')).toBe(false);
  });

  it('a leaf with its ancestors renders exactly one aria-current=page link', async () => {
    const group = [await mount({ current: 'true' }), await mount({ current: 'true' }), await mount({ current: 'page' })];
    const pages = group.filter((el) => anchor(el).getAttribute('aria-current') === 'page');
    expect(pages).toEqual([group[2]]);
  });

  it('the focus() override focuses the row anchor through the shadow chain (delegatesFocus alone does not reach it)', async () => {
    const el = await mount();
    el.focus();
    expect(row(el).shadowRoot?.activeElement).toBe(anchor(el));
  });
});

describe('sk-navigate', () => {
  it('a primary click emits { id, href } once, composed, bubbling, and cancels the default', async () => {
    const seen = collectNavigate();
    const el = await mount();
    const prevented = clickAnchor(el, { button: 0 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toEqual({ id: workPackagesItem.id, href: workPackagesItem.href });
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
    expect(prevented).toBe(true);
  });

  it('Enter on the focused item emits { id, href }', async () => {
    const seen = collectNavigate();
    const el = await mount();
    el.focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toEqual({ id: workPackagesItem.id, href: workPackagesItem.href });
    expect(window.location.hash).toBe('');
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    'a modified click %o emits nothing and leaves the default alone',
    async (init) => {
      const seen = collectNavigate();
      const el = await mount();
      const prevented = clickAnchor(el, init);
      expect(seen).toHaveLength(0);
      expect(prevented).toBe(false);
    },
  );

  it('two items with the same label and different ids emit different ids', async () => {
    const seen = collectNavigate();
    const [a, b] = sameLabelItems;
    const first = await mount({ itemId: a?.id ?? '', label: a?.label ?? '', href: a?.href ?? '' });
    const second = await mount({ itemId: b?.id ?? '', label: b?.label ?? '', href: b?.href ?? '' });
    clickAnchor(first, { button: 0 });
    clickAnchor(second, { button: 0 });
    expect(seen.map((event) => event.detail.id)).toEqual(['overview-a', 'overview-b']);
  });

  it('sk-action-row-activate does not escape the element', async () => {
    const leaked: Event[] = [];
    document.addEventListener('sk-action-row-activate', (event) => leaked.push(event));
    const el = await mount();
    row(el).dispatchEvent(new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true, detail: {} }));
    expect(leaked).toHaveLength(0);
  });
});

describe('compact mode', () => {
  it('keeps the label as the accessible name while it is visually hidden', async () => {
    const el = await mount({ compact: true });
    const title = row(el).querySelector<HTMLElement>('[slot="title"]');
    expect(title?.textContent?.trim()).toBe(workPackagesItem.label);
    const box = title?.getBoundingClientRect();
    expect(box?.width).toBe(0);
    expect(box?.height).toBe(0);
    const labelledBy = anchor(el).getAttribute('aria-labelledby');
    const named = row(el).shadowRoot?.getElementById(labelledBy ?? '');
    expect(named?.querySelector('slot')?.assignedNodes({ flatten: true })[0]?.textContent).toBe(workPackagesItem.label);
    expect(page.elementLocator(el).getByRole('link', { name: workPackagesItem.label }).element()).toBe(anchor(el));
  });

  it('has no bubble at rest', async () => {
    const el = await mount({ compact: true });
    expect(bubble(el)).toBeNull();
  });

  it('a non-compact item never shows a bubble', async () => {
    const el = await mount({ compact: false });
    await userEvent.hover(page.elementLocator(el));
    expect(bubble(el)).toBeNull();
  });
});

describe('label bubble (WCAG 1.4.13)', () => {
  it('flips below the item when a clipping container would cut the bubble, and stays beside it otherwise', async () => {
    const box = document.createElement('div');
    box.style.cssText = 'overflow:hidden;width:140px;margin-left:100px;';
    document.body.append(box);
    const el = await mount({ compact: true }, box);
    await userEvent.hover(page.elementLocator(el));
    await vi.waitFor(() => expect(bubble(el)?.getAttribute('data-placement')).toBe('below-end'));
    const clip = box.getBoundingClientRect();
    const tag = bubble(el)?.getBoundingClientRect();
    expect(tag?.right).toBeLessThanOrEqual(clip.right + 0.5);
    expect(tag?.left).toBeGreaterThanOrEqual(clip.left - 0.5);
    await userEvent.unhover(page.elementLocator(el));
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
    // Recomputed on each show: roomy container, beside again.
    box.style.width = '600px';
    el.style.width = '56px';
    await userEvent.hover(page.elementLocator(el));
    await vi.waitFor(() => expect(bubble(el)).not.toBeNull());
    await el.updateComplete;
    expect(bubble(el)?.hasAttribute('data-placement')).toBe(false);
  });

  it('shows on hover with the label, aria-hidden, and hides when the pointer leaves', async () => {
    const el = await mount({ compact: true });
    await userEvent.hover(page.elementLocator(el));
    await el.updateComplete;
    expect(bubble(el)?.textContent?.trim()).toBe(workPackagesItem.label);
    expect(bubble(el)?.getAttribute('aria-hidden')).toBe('true');
    await userEvent.unhover(page.elementLocator(el));
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
  });

  it('shows on keyboard focus and hides on blur', async () => {
    const el = await mount({ compact: true });
    el.focus();
    await el.updateComplete;
    expect(bubble(el)).not.toBeNull();
    anchor(el).blur();
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
  });

  it('Escape hides it until the next hover or focus', async () => {
    const el = await mount({ compact: true });
    el.focus();
    await el.updateComplete;
    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
    anchor(el).blur();
    el.focus();
    await el.updateComplete;
    expect(bubble(el)).not.toBeNull();
  });

  it('is hoverable: the pointer can move onto the bubble and it stays, then hides when both are left', async () => {
    const el = await mount({ compact: true });
    await userEvent.hover(page.elementLocator(el));
    await el.updateComplete;
    const tag = bubble(el);
    expect(tag).not.toBeNull();
    if (tag) await userEvent.hover(page.elementLocator(tag));
    await el.updateComplete;
    expect(bubble(el)).not.toBeNull();
    await userEvent.unhover(page.elementLocator(el));
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
  });

  it('is persistent: it stays while focus remains even when the pointer leaves', async () => {
    const el = await mount({ compact: true });
    el.focus();
    await userEvent.hover(page.elementLocator(el));
    await userEvent.unhover(page.elementLocator(el));
    await el.updateComplete;
    expect(bubble(el)).not.toBeNull();
  });

  it('is not clipped by a 3.5rem wide column with overflow visible: it is hit-testable beyond the column', async () => {
    const column = document.createElement('div');
    column.setAttribute('style', 'inline-size: var(--sk-layout-personal-rail-width); overflow: visible;');
    document.body.append(column);
    const el = await mount({ compact: true }, column);
    el.focus();
    await el.updateComplete;
    const tag = bubble(el);
    const box = tag?.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    expect(box).toBeDefined();
    expect(box?.left ?? 0).toBeGreaterThanOrEqual(columnBox.right - 1);
    expect(box?.width ?? 0).toBeGreaterThan(0);
    const hit = el.shadowRoot?.elementFromPoint((box?.left ?? 0) + (box?.width ?? 0) / 2, (box?.top ?? 0) + (box?.height ?? 0) / 2);
    expect(hit).toBe(tag);
  });

  it('adds the Escape listener only while shown and removes it on hide and on disconnect', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const keydown = (spy: typeof add): number => spy.mock.calls.filter(([type]) => type === 'keydown').length;
    const el = await mount({ compact: true });
    expect(keydown(add)).toBe(0);
    el.focus();
    await el.updateComplete;
    expect(keydown(add)).toBe(1);
    anchor(el).blur();
    await el.updateComplete;
    expect(keydown(remove)).toBe(1);
    el.focus();
    await el.updateComplete;
    expect(keydown(add)).toBe(2);
    el.remove();
    expect(keydown(remove)).toBe(2);
  });

  it('turning compact off while shown hides the bubble and removes the listener', async () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    const el = await mount({ compact: true });
    el.focus();
    await el.updateComplete;
    el.compact = false;
    await el.updateComplete;
    expect(bubble(el)).toBeNull();
    expect(remove.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
  });
});
