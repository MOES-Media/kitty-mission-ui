// The listbox keyboard model (spike S7): one roving tab stop, Arrow/Home/End move focus only, Enter and Space select.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { LOCATION, mixedFolders, otherValidProject, parentFolder, plainFolder, validProject } from '../src/elements/sk-open-project-dialog/fixtures.js';

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
const options = (el: SkOpenProjectDialog): HTMLElement[] => Array.from(root(el).querySelectorAll<HTMLElement>('[role="option"]'));
const stops = (el: SkOpenProjectDialog): string[] => options(el).filter((o) => o.tabIndex === 0).map((o) => o.getAttribute('data-location') ?? '');
const focused = (el: SkOpenProjectDialog): string | null => root(el).activeElement?.getAttribute('data-location') ?? null;
const selectedOf = (el: SkOpenProjectDialog): string[] =>
  options(el).filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.getAttribute('data-location') ?? '');

const ORDER = mixedFolders.map((folder) => folder.location);

describe('the listbox: roles, selection and the roving tab stop', () => {
  it('is a labelled listbox of options, one per folder in host order, and aria-selected follows the selection', async () => {
    const dialog = await mount();
    const box = root(dialog).querySelector('[role="listbox"]');
    expect(box?.getAttribute('aria-label')).toBe('Folders');
    expect(options(dialog).map((o) => o.getAttribute('data-location'))).toEqual(ORDER);
    expect(options(dialog)).toHaveLength(4);
    expect(selectedOf(dialog)).toEqual([validProject.location]);
    dialog.selected = plainFolder.location;
    await settle(dialog);
    expect(selectedOf(dialog)).toEqual([plainFolder.location]);
    dialog.selected = null;
    await settle(dialog);
    expect(selectedOf(dialog)).toEqual([]);
  });

  it('has exactly one tab stop: the selected option, else the first', async () => {
    const withSelection = await mount();
    expect(stops(withSelection)).toEqual([validProject.location]);
    expect(options(withSelection).filter((o) => o.tabIndex === -1)).toHaveLength(3);
    const none = await mount({ selected: null });
    expect(stops(none)).toEqual([parentFolder.location]);
    const unknown = await mount({ selected: '~/work/missing' });
    expect(stops(unknown)).toEqual([parentFolder.location]);
  });

  it('an Arrow press followed by a host re-select leaves exactly one tab stop, on the re-selected option', async () => {
    const dialog = await mount();
    options(dialog)[1]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(stops(dialog)).toEqual([ORDER[2] ?? '']);
    dialog.selected = ORDER[3] ?? null;
    await settle(dialog);
    expect(stops(dialog)).toEqual([ORDER[3] ?? '']);
    expect(options(dialog).filter((o) => o.tabIndex === -1)).toHaveLength(3);
    dialog.selected = ORDER[0] ?? null;
    await settle(dialog);
    expect(stops(dialog)).toEqual([ORDER[0] ?? '']);
  });
});

describe('the roving tab stop survives an unrelated re-render (A11Y-006)', () => {
  it('an arrow press, then a change of the location, leaves the tab stop on the arrowed option (positive control: a selected change resets it)', async () => {
    const dialog = await mount();
    options(dialog)[1]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(stops(dialog)).toEqual([ORDER[2] ?? '']);
    dialog.location = `${LOCATION}/other`;
    await settle(dialog);
    expect(stops(dialog)).toEqual([ORDER[2] ?? '']);
    expect(options(dialog).filter((o) => o.tabIndex === -1)).toHaveLength(3);
    dialog.selected = ORDER[3] ?? null;
    await settle(dialog);
    expect(stops(dialog)).toEqual([ORDER[3] ?? '']);
  });
});

describe('Arrow, Home and End move focus only', () => {
  it('ArrowDown and ArrowUp step through the options and clamp at the ends; nothing is selected or emitted', async () => {
    const dialog = await mount({ selected: parentFolder.location });
    const seen: Event[] = [];
    dialog.addEventListener('sk-browse-folder', (event) => seen.push(event));
    options(dialog)[0]?.focus();
    expect(focused(dialog)).toBe(ORDER[0]);
    await userEvent.keyboard('{ArrowUp}');
    expect(focused(dialog)).toBe(ORDER[0]);
    const walked: (string | null)[] = [];
    for (let i = 0; i < 4; i += 1) {
      await userEvent.keyboard('{ArrowDown}');
      walked.push(focused(dialog));
    }
    expect(walked).toEqual([ORDER[1], ORDER[2], ORDER[3], ORDER[3]]);
    await userEvent.keyboard('{ArrowUp}');
    expect(focused(dialog)).toBe(ORDER[2]);
    expect(seen).toHaveLength(0);
    expect(selectedOf(dialog)).toEqual([parentFolder.location]);
  });

  it('Home goes to the first option and End to the last; the tab stop follows the focus', async () => {
    const dialog = await mount();
    options(dialog)[1]?.focus();
    await userEvent.keyboard('{End}');
    expect(focused(dialog)).toBe(ORDER[3]);
    expect(stops(dialog)).toEqual([ORDER[3] ?? '']);
    await userEvent.keyboard('{Home}');
    expect(focused(dialog)).toBe(ORDER[0]);
    expect(stops(dialog)).toEqual([ORDER[0] ?? '']);
  });

  it('a key that is not part of the model does nothing (positive control: ArrowDown moves)', async () => {
    const dialog = await mount();
    options(dialog)[1]?.focus();
    await userEvent.keyboard('a');
    await userEvent.keyboard('{PageDown}');
    expect(focused(dialog)).toBe(ORDER[1]);
    await userEvent.keyboard('{ArrowDown}');
    expect(focused(dialog)).toBe(ORDER[2]);
  });
});

describe('modified chords are left to the browser (A11Y-001)', () => {
  it('Alt, Ctrl, Meta and Shift with an arrow, Home or End neither prevent default nor move focus (positive control: plain ArrowDown moves)', async () => {
    const dialog = await mount();
    const opts = options(dialog);
    const chords: [string, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'][] = [
      ['ArrowDown', 'altKey'],
      ['Home', 'ctrlKey'],
      ['End', 'shiftKey'],
      ['ArrowUp', 'metaKey'],
    ];
    for (const [key, modifier] of chords) {
      opts[1]?.focus();
      const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, [modifier]: true });
      opts[1]?.dispatchEvent(event);
      expect(event.defaultPrevented, `${modifier}+${key}`).toBe(false);
      expect(focused(dialog), `${modifier}+${key}`).toBe(ORDER[1]);
    }
    opts[1]?.focus();
    const plain = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true });
    opts[1]?.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    expect(focused(dialog)).toBe(ORDER[2]);
  });
});

describe('Enter and Space select the focused option', () => {
  it('each emits sk-browse-folder for that option only; the selection stays the host\'s', async () => {
    const dialog = await mount();
    const seen: CustomEvent[] = [];
    dialog.addEventListener('sk-browse-folder', (event) => seen.push(event as CustomEvent));
    options(dialog)[2]?.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(seen.map((event) => event.detail)).toEqual([{ location: otherValidProject.location }, { location: otherValidProject.location }]);
    expect(seen).toHaveLength(2);
    expect(selectedOf(dialog)).toEqual([validProject.location]);
    // The host re-feeds the selection; the option now carries it.
    dialog.selected = otherValidProject.location;
    await settle(dialog);
    expect(selectedOf(dialog)).toEqual([otherValidProject.location]);
  });
});
