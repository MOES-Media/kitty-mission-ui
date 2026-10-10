// Events EV-6..EV-9 of the open-project dialog, through the real controls (the listbox options, Open, the retry button, the closers).
// Every emit test asserts exactly one event, bubbles, composed, not cancelable and the detail with toEqual; every no-event test
// carries a positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { LOCATION, mixedFolders, otherValidProject, parentFolder, plainFolder, validProject } from '../src/elements/sk-open-project-dialog/fixtures.js';

const EVENT_NAMES = ['sk-browse-folder', 'sk-confirm-open-project', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(el: SkOpenProjectDialog): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(props: Partial<SkOpenProjectDialog> = {}): Promise<SkOpenProjectDialog> {
  await page.viewport(1280, 900);
  const dialog = document.createElement('sk-open-project-dialog');
  Object.assign(dialog, { open: true, location: LOCATION, folders: mixedFolders, selected: validProject.location, ...props });
  document.body.append(dialog);
  await settle(dialog);
  return dialog;
}
function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const option = (el: SkOpenProjectDialog, location: string): HTMLElement => one<HTMLElement>(root(el), `[role="option"][data-location="${location}"]`);
function collect(el: SkOpenProjectDialog): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) el.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectEvent(event: CustomEvent | undefined, name: string, detail: unknown): void {
  expect(event?.type).toBe(name);
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}
const openButton = (el: SkOpenProjectDialog): HTMLElement => one<HTMLElement>(root(el), 'sk-button[variant="primary"]');

describe('EV-6: Open emits sk-confirm-open-project with the selected valid folder, and only then', () => {
  it('a valid selection: one event with its location', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    await userEvent.click(openButton(dialog));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-confirm-open-project', { location: validProject.location });
  });

  it('the second valid project sends its own location (the payload follows the selection, not the first valid folder)', async () => {
    const dialog = await mount({ selected: otherValidProject.location });
    const seen = collect(dialog);
    await userEvent.click(openButton(dialog));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-confirm-open-project', { location: otherValidProject.location });
  });

  it('an ordinary folder, the parent row, an unknown location and no selection: Open is disabled and a click emits nothing', async () => {
    let ran = 0;
    for (const selected of [plainFolder.location, parentFolder.location, '~/work/missing', null]) {
      const dialog = await mount({ selected });
      const seen = collect(dialog);
      expect(openButton(dialog).hasAttribute('disabled'), String(selected)).toBe(true);
      openButton(dialog).click();
      expect(seen, String(selected)).toHaveLength(0);
      ran += 1;
      dialog.remove();
    }
    expect(ran).toBe(4);
    // Positive control: the valid selection does emit.
    const valid = await mount();
    const seen = collect(valid);
    await userEvent.click(openButton(valid));
    expect(seen).toHaveLength(1);
  });
});

describe('EV-7: Cancel, the close button, Escape and a backdrop click close the dialog and emit no confirm', () => {
  it('four closers: open becomes false, nothing is emitted; Open on the same selection does emit', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    const closers: (() => Promise<void> | void)[] = [
      () => userEvent.click(one(root(dialog), '[data-cancel]')),
      () => userEvent.click(one(root(dialog), '[data-region="header"] sk-button')),
      () => userEvent.keyboard('{Escape}'),
      () => one<HTMLElement>(root(dialog), 'dialog').click(),
    ];
    let ran = 0;
    for (const close of closers) {
      dialog.open = true;
      await settle(dialog);
      await close();
      await settle(dialog);
      expect(dialog.open).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(seen).toHaveLength(0);
    dialog.open = true;
    await settle(dialog);
    await userEvent.click(openButton(dialog));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-confirm-open-project', { location: validProject.location });
  });
});

describe('EV-8: selecting a folder option emits sk-browse-folder with its location', () => {
  it('a click on each option of the listing: one event each, in listing order', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    let ran = 0;
    for (const folder of mixedFolders) {
      await userEvent.click(option(dialog, folder.location));
      expect(seen).toHaveLength(ran + 1);
      expectEvent(seen[ran], 'sk-browse-folder', { location: folder.location });
      ran += 1;
    }
    expect(ran).toBe(4);
    // Selection is controlled by the host: the element did not select anything itself.
    expect(dialog.selected).toBe(validProject.location);
    expect(option(dialog, validProject.location).getAttribute('aria-selected')).toBe('true');
    expect(option(dialog, plainFolder.location).getAttribute('aria-selected')).toBe('false');
  });

  it('Enter and Space on a focused option each emit one event; Arrow keys on it emit none', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    option(dialog, plainFolder.location).focus();
    await userEvent.keyboard('{ArrowUp}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Home}');
    await userEvent.keyboard('{End}');
    expect(seen).toHaveLength(0);
    option(dialog, plainFolder.location).focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-browse-folder', { location: plainFolder.location });
    await userEvent.keyboard(' ');
    expect(seen).toHaveLength(2);
    expectEvent(seen[1], 'sk-browse-folder', { location: plainFolder.location });
  });
});

describe('EV-9: retry on a failed listing emits sk-retry-load { target: folders }', () => {
  it('the retry button: one event; a ready listing has no retry button (positive control above)', async () => {
    const dialog = await mount({ status: 'error', folders: [], selected: null });
    const seen = collect(dialog);
    await userEvent.click(one(root(dialog), '[data-state="error"] sk-button'));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'folders' });
    const ready = await mount();
    expect(root(ready).querySelector('[data-state="error"]')).toBeNull();
  });
});
