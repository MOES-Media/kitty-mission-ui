// The skeleton of the open-project dialog (IC-04b): one test per event, the native modal behaviour (open, close, focus capture
// and return), the status switch, the Open enablement and the layout cases.
//
// The dispatch methods are `protected` members of the dialog; the tests reach them through a type cast. NO test-only template
// hook exists and nothing is added to the shipped surface (surface-freeze.test.ts would fail if a property, event or method
// were). The folder listbox is a stub in this work package, so the options are not drawn: selection is driven through the handler,
// while Cancel, Escape, the backdrop, the close button and Open are exercised through the real controls.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import * as folderParts from '../src/elements/sk-open-project-dialog/folder-list-parts.js';
import { DIALOG_HINT, FOLDERS_EMPTY_TEXT, FOLDERS_ERROR_BODY, FOLDERS_LOADING_TEXT, FOLDER_LIST_LABEL, OPEN_DISABLED_REASON } from '../src/defaults/index.js';
import type { FolderEntry } from '../src/project-types.js';

/** The measured literals assume the bundled faces: wait for them, and fail loudly if one did not load (TESTS-001). */
beforeAll(async () => {
  for (const face of ['400 14px "Inter"', '600 14px "Inter"', '700 24px "Falling Sky"']) {
    const loaded = await document.fonts.load(face);
    expect(loaded.length, face).toBeGreaterThan(0);
    expect(loaded.every((font) => font.status === 'loaded'), face).toBe(true);
  }
  await document.fonts.ready;
});

interface Handlers {
  selectFolder(location: string): void;
  confirmOpen(): void;
  retryFolders(): void;
}
const handlersOf = (el: SkOpenProjectDialog): Handlers => el as unknown as Handlers;

const EVENT_NAMES = ['sk-browse-folder', 'sk-confirm-open-project', 'sk-retry-load'] as const;

const FOLDERS: FolderEntry[] = [
  { name: '..', location: '~/work', kind: 'parent', valid: false },
  { name: 'alpha', location: '~/work/alpha', kind: 'folder', valid: true },
  { name: 'beta', location: '~/work/beta', kind: 'folder', valid: false },
];

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(el: SkOpenProjectDialog): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkOpenProjectDialog> = {}, width = 1280): Promise<SkOpenProjectDialog> {
  await page.viewport(width, 900);
  const dialog = document.createElement('sk-open-project-dialog');
  Object.assign(dialog, { open: true, location: '~/work', folders: FOLDERS, selected: '~/work/alpha', ...props });
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
const nativeDialog = (el: SkOpenProjectDialog): HTMLDialogElement => one<HTMLDialogElement>(root(el), 'dialog');

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

describe('events: exactly one event with the exact payload', () => {
  it('sk-browse-folder { location } for a selected folder option', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    handlersOf(dialog).selectFolder('~/work/beta');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-browse-folder', { location: '~/work/beta' });
  });

  it('sk-confirm-open-project { location } through the real Open button, only for a selected valid folder', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    await userEvent.click(one(root(dialog), 'sk-button[variant="primary"]'));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-confirm-open-project', { location: '~/work/alpha' });
    // The handler itself refuses what the disabled button cannot send: an invalid, an unknown and no selection.
    let ran = 0;
    for (const selected of ['~/work/beta', '~/work/missing', null]) {
      dialog.selected = selected;
      await settle(dialog);
      handlersOf(dialog).confirmOpen();
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(seen).toHaveLength(1);
  });

  it('sk-retry-load { target: folders } through the real Try again button of a failed listing', async () => {
    const dialog = await mount({ status: 'error' });
    const seen = collect(dialog);
    await userEvent.click(one(root(dialog), '[data-state="error"] sk-button'));
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'folders' });
    handlersOf(dialog).retryFolders();
    expect(seen).toHaveLength(2);
    expectEvent(seen[1], 'sk-retry-load', { target: 'folders' });
  });

  it('Cancel, the close button, Escape and a backdrop click close the dialog and emit nothing (a click on Open does emit)', async () => {
    const dialog = await mount();
    const seen = collect(dialog);
    const closers: (() => Promise<void> | void)[] = [
      () => userEvent.click(one(root(dialog), '[data-cancel]')),
      () => userEvent.click(one(root(dialog), '[data-region="header"] sk-button')),
      () => userEvent.keyboard('{Escape}'),
      () => nativeDialog(dialog).click(),
    ];
    let ran = 0;
    for (const close of closers) {
      dialog.open = true;
      await settle(dialog);
      expect(nativeDialog(dialog).open).toBe(true);
      await close();
      await settle(dialog);
      expect(dialog.open).toBe(false);
      expect(nativeDialog(dialog).open).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(seen).toHaveLength(0);
    dialog.open = true;
    await settle(dialog);
    await userEvent.click(one(root(dialog), 'sk-button[variant="primary"]'));
    expect(seen).toHaveLength(1);
  });

  it('a click inside the card is not a backdrop click', async () => {
    const dialog = await mount();
    one<HTMLElement>(root(dialog), '[data-region="body"]').click();
    await settle(dialog);
    expect(dialog.open).toBe(true);
  });
});

describe('the native modal: showModal on open, close on close, focus capture and return', () => {
  it('is modal while open, reflects open, and starts closed by default', async () => {
    const closed = await mount({ open: false });
    expect(nativeDialog(closed).open).toBe(false);
    expect(closed.hasAttribute('open')).toBe(false);
    closed.open = true;
    await settle(closed);
    expect(nativeDialog(closed).open).toBe(true);
    expect(nativeDialog(closed).matches(':modal')).toBe(true);
    expect(closed.hasAttribute('open')).toBe(true);
  });

  it('moves focus into the dialog (the selected option, now that the listbox is drawn) and returns it to the opener on close', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open project';
    document.body.append(opener);
    opener.focus();
    const dialog = await mount();
    expect(root(dialog).activeElement).toBe(one(root(dialog), '[role="option"][aria-selected="true"]'));
    dialog.open = false;
    await settle(dialog);
    expect(document.activeElement).toBe(opener);
  });

  it('does not restore focus to an opener that is gone (positive control: the connected opener above got it back)', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const dialog = await mount();
    opener.remove();
    dialog.open = false;
    await settle(dialog);
    expect(document.activeElement).not.toBe(opener);
    expect(opener.isConnected).toBe(false);
  });
});

describe('the folder field, the listing states and the Open enablement', () => {
  it('shows the host location in a read-only field', async () => {
    const dialog = await mount({ location: '~/work/some-place' });
    const field = one<HTMLElement & { readonly: boolean; value: string }>(root(dialog), 'sk-form-input');
    expect(field.readonly).toBe(true);
    expect(field.value).toBe('~/work/some-place');
  });

  it('states loading, empty and error in words, and draws neither the other two', async () => {
    let ran = 0;
    for (const [status, text] of [
      ['loading', FOLDERS_LOADING_TEXT],
      ['empty', FOLDERS_EMPTY_TEXT],
      ['error', FOLDERS_ERROR_BODY],
    ] as const) {
      const dialog = await mount({ status });
      const states = Array.from(root(dialog).querySelectorAll('[data-state]')).map((el) => el.getAttribute('data-state'));
      expect(states, status).toEqual([status]);
      expect(one(root(dialog), `[data-state="${status}"]`).textContent).toContain(text);
      expect(dialog.getAttribute('status')).toBe(status);
      ran += 1;
      dialog.remove();
    }
    expect(ran).toBe(3);
    const ready = await mount({ status: 'ready' });
    expect(root(ready).querySelector('[data-state]')).toBeNull();
    const unknown = await mount({ status: 'bogus' as unknown as SkOpenProjectDialog['status'] });
    expect(root(unknown).querySelector('[data-state="empty"]')).not.toBeNull();
  });

  it('disables Open with a text reason unless the selected folder is a valid project, and states it as visible text beside Open', async () => {
    const valid = await mount();
    const openValid = one<HTMLElement & { disabled: boolean }>(root(valid), 'sk-button[variant="primary"]');
    expect(openValid.hasAttribute('disabled')).toBe(false);
    expect(root(valid).querySelector('#open-reason')).toBeNull();
    expect(openValid.hasAttribute('aria-describedby')).toBe(false);
    let ran = 0;
    for (const selected of ['~/work/beta', null, '~/work/missing']) {
      const invalid = await mount({ selected });
      const open = one<HTMLElement & { disabled: boolean }>(root(invalid), 'sk-button[variant="primary"]');
      expect(open.hasAttribute('disabled'), String(selected)).toBe(true);
      expect(one(root(invalid), '#open-reason').textContent).toBe(OPEN_DISABLED_REASON);
      expect(open.hasAttribute('aria-describedby')).toBe(false);
      expect(one(root(invalid), '#open-reason').nextElementSibling).toBeNull();
      ran += 1;
      invalid.remove();
    }
    expect(ran).toBe(3);
  });
});

describe('the dialog chrome (E-32 (c)): eyebrow, separators, muted text and the marker folders in code', () => {
  it('draws the eyebrow in mono, uppercase, 12px with 0.08em tracking, and a separator under the header and above the actions', async () => {
    const dialog = await mount();
    const eyebrow = getComputedStyle(one(root(dialog), '[data-eyebrow]'));
    expect(eyebrow.textTransform).toBe('uppercase');
    expect(eyebrow.fontSize).toBe('12px');
    expect(eyebrow.fontFamily).toContain('JetBrains Mono');
    expect(eyebrow.letterSpacing).toBe('0.96px');
    expect(getComputedStyle(one(root(dialog), '[data-region="header"]')).borderBottomWidth).toBe('1px');
    expect(getComputedStyle(one(root(dialog), '[data-region="actions"]')).borderTopWidth).toBe('1px');
    expect(getComputedStyle(one(root(dialog), '[data-region="body"]')).borderTopWidth).toBe('0px');
  });

  it('draws the two marker folders of the hint as code in the mono family, and the whole hint text unchanged', async () => {
    const dialog = await mount({ selected: null });
    const hint = one(root(dialog), '[data-hint]');
    const codes = Array.from(hint.querySelectorAll('code'));
    expect(codes.map((code) => code.textContent)).toEqual(['.kittify/', 'kitty-specs/']);
    expect(codes).toHaveLength(2);
    let mono = 0;
    for (const code of codes) {
      expect(getComputedStyle(code).fontFamily).toContain('JetBrains Mono');
      mono += 1;
    }
    expect(mono).toBe(2);
    expect(hint.textContent?.replace(/\s+/g, ' ').trim()).toBe(DIALOG_HINT);
    // The hint and the disabled reason share the muted colour, which differs from the dialog's body colour.
    const muted = getComputedStyle(hint).color;
    expect(getComputedStyle(one(root(dialog), '[data-reason]')).color).toBe(muted);
    expect(muted).not.toBe(getComputedStyle(one(root(dialog), 'h2')).color);
  });

  it('sets the type scale of E-32 (d): the hint is 14px, the title 18px in the display face, the field label weight 600, and the header band is 78.39px as in the prototype', async () => {
    const dialog = await mount();
    expect(getComputedStyle(one(root(dialog), '[data-hint]')).fontSize).toBe('14px');
    const title = getComputedStyle(one(root(dialog), 'h2'));
    expect(title.fontSize).toBe('18px');
    expect(title.fontFamily).toContain('Falling Sky');
    const input = one<HTMLElement>(root(dialog), 'sk-form-input');
    await (input as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(getComputedStyle(one(input.shadowRoot as ShadowRoot, 'label')).fontWeight).toBe('600');
    // E-32 (e): the base line-height 1.5 and the title's 1.3 are the prototype page's, so the band is the prototype's 78.39px.
    expect(getComputedStyle(one(root(dialog), '[data-hint]')).lineHeight).toBe('21px');
    expect(getComputedStyle(one(root(dialog), 'h2')).lineHeight).toBe('23.4px');
    expect(one<HTMLElement>(root(dialog), '[data-region="header"]').getBoundingClientRect().height).toBeCloseTo(78.39, 1);
    // Body spacing and the actions gap are the prototype's 20px, 12px and 16px.
    const body = getComputedStyle(one(root(dialog), '[data-region="body"]'));
    expect([body.paddingTop, body.paddingLeft, body.rowGap]).toEqual(['20px', '20px', '12px']);
    expect(getComputedStyle(one(root(dialog), '[data-region="actions"]')).columnGap).toBe('16px');
  });
});

describe('the polite status region inside the dialog follows the listing shown', () => {
  const live = (el: SkOpenProjectDialog): string => (root(el).querySelector('[data-live]')?.textContent ?? '').trim();

  it('is one polite status region inside the dialog, empty at first render, and announces each change of the listing', async () => {
    const dialog = await mount({ status: 'loading' });
    const region = one(root(dialog), '[data-live]');
    expect(nativeDialog(dialog).contains(region)).toBe(true);
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(live(dialog)).toBe('');
    dialog.status = 'ready';
    await settle(dialog);
    expect(live(dialog)).toBe(`${FOLDER_LIST_LABEL}, ${FOLDERS.length}`);
    dialog.status = 'error';
    await settle(dialog);
    expect(live(dialog)).toBe(FOLDERS_ERROR_BODY);
    dialog.status = 'empty';
    await settle(dialog);
    expect(live(dialog)).toBe(FOLDERS_EMPTY_TEXT);
    dialog.status = 'loading';
    await settle(dialog);
    expect(live(dialog)).toBe(FOLDERS_LOADING_TEXT);
    // An update that changes nothing shown announces nothing new.
    const seq = root(dialog).querySelector('[data-seq]')?.getAttribute('data-seq');
    dialog.location = '~/elsewhere';
    await settle(dialog);
    expect(root(dialog).querySelector('[data-seq]')?.getAttribute('data-seq')).toBe(seq);
  });
});

// At 620 the browser's own modal rule (`max-width: calc(100% - 6px - 2em)`, with the dialog's 14px em) is narrower than the ruled
// `calc(100vw - 32px)`: 586 against 588. The prototype's dialog has the same two rules, so it is 586 there too.
describe('layout: the dialog is min(680px, the viewport minus 32px), clamped by the UA modal rule, at the four widths', () => {
  it('1280, 1100, 800 and 620', async () => {
    let ran = 0;
    for (const [viewport, expected] of [
      [1280, 680],
      [1100, 680],
      [800, 680],
      [620, 586],
    ] as const) {
      const dialog = await mount({}, viewport);
      expect(nativeDialog(dialog).getBoundingClientRect().width, String(viewport)).toBe(expected);
      ran += 1;
      dialog.remove();
    }
    expect(ran).toBe(4);
  });
});

describe('the part: the stub exists at the contract signature (the body belongs to the region work package)', () => {
  it('exports the folder list renderer and its styles', () => {
    expect(Object.keys(folderParts).sort()).toEqual(['folderListStyles', 'renderFolderList']);
  });
});
