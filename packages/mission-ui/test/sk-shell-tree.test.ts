import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import { artifactItems, collapsedItems, workPackageItems } from '../src/elements/sk-shell-tree/fixtures.js';
import type { ShellNavigateDetail, TreeNode, TreeToggleDetail } from '../src/shell-types.js';

beforeEach(async () => {
  await page.viewport(1024, 768);
});

afterEach(async () => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

async function mount(props: Partial<SkShellTree> = {}): Promise<SkShellTree> {
  const el = document.createElement('sk-shell-tree');
  el.heading = 'Work Packages';
  el.label = 'Work packages';
  el.items = workPackageItems;
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

function rows(el: SkShellTree): HTMLElement[] {
  return Array.from(el.shadowRoot?.querySelectorAll<HTMLElement>('sk-action-row') ?? []);
}

function rowOf(el: SkShellTree, text: string): HTMLElement {
  const found = rows(el).find((r) => r.querySelector('[slot="title"]')?.textContent?.includes(text));
  if (!found) throw new Error(`row ${text} missing`);
  return found;
}

function anchorOf(row: HTMLElement): HTMLAnchorElement | null {
  return row.shadowRoot?.querySelector('a') ?? null;
}

function details(el: SkShellTree, text: string): HTMLDetailsElement {
  const found = Array.from(el.shadowRoot?.querySelectorAll('details') ?? []).find((d) =>
    d.querySelector('summary')?.textContent?.includes(text),
  );
  if (!found) throw new Error(`details ${text} missing`);
  return found;
}

// Cancels the click at the document so the real browser never follows an href; reports whether the tree cancelled it.
function clickAnchor(a: HTMLAnchorElement, init: MouseEventInit): boolean {
  let prevented = false;
  const swallow = (event: Event): void => {
    prevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', swallow);
  a.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true, ...init }));
  document.removeEventListener('click', swallow);
  return prevented;
}

function collect<T>(type: string): CustomEvent<T>[] {
  const seen: CustomEvent<T>[] = [];
  document.addEventListener(type, (event) => seen.push(event as CustomEvent<T>));
  return seen;
}

const settle = async (el: SkShellTree): Promise<void> => {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 50));
};

describe('sk-shell-tree rendering', () => {
  it('names the group through the label and shows the heading as visible text in the eyebrow slot', async () => {
    const el = await mount();
    const group = el.shadowRoot?.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Work packages');
    expect(el.shadowRoot?.querySelector('sk-section-header [slot="eyebrow"]')?.textContent?.trim()).toBe('Work Packages');
  });

  it('renders leaves as flush route rows with prefix and label as visible text and meta in the metadata slot', async () => {
    const el = await mount();
    const row = rowOf(el, 'Shell tree');
    expect(row.getAttribute('presentation')).toBe('flush');
    expect(row.getAttribute('href')).toBe('#/wp/03');
    expect(row.querySelector('[slot="title"]')?.textContent).toContain('WP03');
    expect(row.querySelector('[slot="metadata"]')?.textContent?.trim()).toBe('doing');
    expect(row.querySelector('[slot="marker"] svg')).not.toBeNull();
  });

  it('current marks only that leaf: its link announces aria-current=page and no other does', async () => {
    const el = await mount({ current: 'wp-03' });
    expect(rowOf(el, 'Shell tree').hasAttribute('selected')).toBe(true);
    expect(anchorOf(rowOf(el, 'Shell tree'))?.getAttribute('aria-current')).toBe('page');
    const pages = rows(el).filter((r) => anchorOf(r)?.getAttribute('aria-current') === 'page');
    expect(pages).toHaveLength(1);
    expect(rows(el).filter((r) => r.hasAttribute('selected'))).toHaveLength(1);
  });

  it('an empty current marks none', async () => {
    const el = await mount({ current: '' });
    expect(rows(el).filter((r) => r.hasAttribute('selected'))).toHaveLength(0);
    expect(rows(el).filter((r) => anchorOf(r)?.hasAttribute('aria-current'))).toHaveLength(0);
  });

  it('a current leaf inside a folder leaves the folder and its row without any current state', async () => {
    const el = await mount({ items: artifactItems, current: 'art-research-2' });
    const folderRow = rowOf(el, 'Research');
    expect(folderRow.hasAttribute('selected')).toBe(false);
    expect(folderRow.hasAttribute('aria-current')).toBe(false);
    expect(details(el, 'Research').hasAttribute('aria-current')).toBe(false);
    const pages = rows(el).filter((r) => anchorOf(r)?.getAttribute('aria-current') === 'page');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toBe(rowOf(el, 'Tier breakpoints'));
  });

  it('an unavailable leaf renders no link, is never selected, and is not navigable', async () => {
    const seen = collect<ShellNavigateDetail>('sk-navigate');
    const el = await mount({ current: 'wp-04' });
    const row = rowOf(el, 'Responsive shell');
    expect(row.hasAttribute('href')).toBe(false);
    expect(row.hasAttribute('selected')).toBe(false);
    expect(anchorOf(row)).toBeNull();
    row.click();
    expect(seen).toHaveLength(0);
  });
});

describe('sk-navigate', () => {
  it('a primary click emits { id, href } once, composed, bubbling, and cancels the default', async () => {
    const seen = collect<ShellNavigateDetail>('sk-navigate');
    const el = await mount();
    const a = anchorOf(rowOf(el, 'Library elements'));
    if (!a) throw new Error('anchor missing');
    const prevented = clickAnchor(a, { button: 0 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toEqual({ id: 'wp-02', href: '#/wp/02' });
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
    expect(prevented).toBe(true);
  });

  it('Enter on a focused leaf link emits { id, href }', async () => {
    const seen = collect<ShellNavigateDetail>('sk-navigate');
    const el = await mount();
    anchorOf(rowOf(el, 'Foundation'))?.focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toEqual({ id: 'wp-01', href: '#/wp/01' });
    expect(window.location.hash).toBe('');
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    'a modified click %o emits nothing and leaves the default alone',
    async (init) => {
      const seen = collect<ShellNavigateDetail>('sk-navigate');
      const el = await mount();
      const a = anchorOf(rowOf(el, 'Library elements'));
      if (!a) throw new Error('anchor missing');
      const prevented = clickAnchor(a, init);
      expect(seen).toHaveLength(0);
      expect(prevented).toBe(false);
    },
  );

  it('sk-action-row-activate does not escape the element', async () => {
    const leaked: Event[] = [];
    document.addEventListener('sk-action-row-activate', (event) => leaked.push(event));
    const el = await mount();
    rowOf(el, 'Library elements').dispatchEvent(
      new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true, detail: {} }),
    );
    expect(leaked).toHaveLength(0);
  });
});

describe('folders', () => {
  it('start from expanded and expose the open state on a summary', async () => {
    const el = await mount({ items: [...artifactItems, ...collapsedItems] });
    expect(details(el, 'Research').open).toBe(true);
    expect(details(el, 'Contracts').open).toBe(false);
    expect(details(el, 'Contracts').querySelector('summary')).not.toBeNull();
  });

  it('a user toggle emits { id, expanded } for the requested state, each time', async () => {
    const seen = collect<TreeToggleDetail>('sk-tree-toggle');
    const el = await mount({ items: collapsedItems });
    const summary = details(el, 'Contracts').querySelector('summary');
    summary?.click();
    await settle(el);
    expect(details(el, 'Contracts').open).toBe(true);
    expect(seen.map((e) => e.detail)).toEqual([{ id: 'art-contracts', expanded: true }]);
    summary?.click();
    await settle(el);
    expect(seen.map((e) => e.detail)).toEqual([
      { id: 'art-contracts', expanded: true },
      { id: 'art-contracts', expanded: false },
    ]);
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
  });

  it('Enter on a focused summary toggles and emits', async () => {
    const seen = collect<TreeToggleDetail>('sk-tree-toggle');
    const el = await mount({ items: collapsedItems });
    details(el, 'Contracts').querySelector('summary')?.focus();
    await userEvent.keyboard('{Enter}');
    await settle(el);
    expect(seen.map((e) => e.detail)).toEqual([{ id: 'art-contracts', expanded: true }]);
  });

  it('emits no toggle on the first render', async () => {
    const seen = collect<TreeToggleDetail>('sk-tree-toggle');
    const el = await mount({ items: [...artifactItems, ...collapsedItems] });
    await settle(el);
    expect(seen).toHaveLength(0);
  });

  it('emits no toggle when items is reset, and the reset re-renders open from the new model', async () => {
    const seen = collect<TreeToggleDetail>('sk-tree-toggle');
    const el = await mount({ items: collapsedItems });
    details(el, 'Contracts').querySelector('summary')?.click();
    await settle(el);
    expect(seen).toHaveLength(1);
    el.items = collapsedItems.map((n) => ({ ...n }));
    await settle(el);
    expect(details(el, 'Contracts').open).toBe(false);
    expect(seen).toHaveLength(1);
    el.items = artifactItems;
    await settle(el);
    expect(details(el, 'Research').open).toBe(true);
    expect(seen).toHaveLength(1);
  });

  it('a host that writes the state back does not loop', async () => {
    const seen = collect<TreeToggleDetail>('sk-tree-toggle');
    const el = await mount({ items: collapsedItems });
    const write = (event: Event): void => {
      const { id, expanded } = (event as CustomEvent<TreeToggleDetail>).detail;
      const next = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((n) => {
          const copy: TreeNode = { ...n };
          if (n.id === id) copy.expanded = expanded;
          if (n.children) copy.children = next(n.children);
          return copy;
        });
      el.items = next(el.items);
    };
    el.addEventListener('sk-tree-toggle', write);
    details(el, 'Contracts').querySelector('summary')?.click();
    await settle(el);
    await settle(el);
    expect(details(el, 'Contracts').open).toBe(true);
    expect(seen.map((e) => e.detail)).toEqual([{ id: 'art-contracts', expanded: true }]);
    details(el, 'Contracts').querySelector('summary')?.click();
    await settle(el);
    expect(seen.map((e) => e.detail)).toEqual([
      { id: 'art-contracts', expanded: true },
      { id: 'art-contracts', expanded: false },
    ]);
  });

  it('a folder row has no link and emits no navigation', async () => {
    const seen = collect<ShellNavigateDetail>('sk-navigate');
    const el = await mount({ items: collapsedItems });
    const row = rowOf(el, 'Contracts');
    expect(row.hasAttribute('href')).toBe(false);
    row.click();
    expect(seen).toHaveLength(0);
  });
});
