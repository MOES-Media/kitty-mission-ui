// The folder listbox and the listing states of the open-project dialog: options, the "valid project" pill, the parent row, the
// four states with their reasons, foreign text drawn raw, the long name, and the measured box of the options.
/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cdp, page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { FOLDERS_EMPTY_TEXT, FOLDERS_ERROR_BODY, FOLDERS_LOADING_TEXT, OPEN_DISABLED_REASON, PARENT_FOLDER_TEXT, VALID_PROJECT_TEXT } from '../src/defaults/index.js';
import {
  LOCATION,
  longNameFolders,
  mixedFolders,
  otherValidProject,
  parentFolder,
  plainFolder,
  readyFolders,
  validProject,
} from '../src/elements/sk-open-project-dialog/fixtures.js';

/** The measured literals assume the bundled faces: wait for them, and fail loudly if one did not load (TESTS-001). */
beforeAll(async () => {
  for (const face of ['400 14px "Inter"', '600 14px "Inter"', '700 24px "Falling Sky"']) {
    const loaded = await document.fonts.load(face);
    expect(loaded.length, face).toBeGreaterThan(0);
    expect(loaded.every((font) => font.status === 'loaded'), face).toBe(true);
  }
  await document.fonts.ready;
});

/** The visible reason is adjacent to Open in reading order: the last block of the body, right before the actions region, with no control between. */
function expectReasonBeforeOpen(dialog: SkOpenProjectDialog): void {
  const reason = one<HTMLElement>(root(dialog), '#open-reason');
  const open = one<HTMLElement>(root(dialog), 'sk-button[variant="primary"]');
  expect(reason.textContent).toBe(OPEN_DISABLED_REASON);
  expect(reason.nextElementSibling).toBeNull();
  expect(reason.parentElement?.nextElementSibling?.contains(open)).toBe(true);
  expect(open.hasAttribute('aria-describedby')).toBe(false);
}

/** The text an element holds, reading slotted light-DOM content through its slots. */
function flatText(el: Element): string {
  const own = Array.from(el.childNodes).map((node) => {
    if (node instanceof HTMLSlotElement) return node.assignedNodes({ flatten: true }).map((assigned) => assigned.textContent ?? '').join('');
    return node instanceof Element ? flatText(node) : (node.textContent ?? '');
  });
  return own.join('');
}

afterEach(async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
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
const pillsOf = (el: Element): HTMLElement[] => Array.from(el.querySelectorAll<HTMLElement>('sk-pill-tag'));

describe('the options', () => {
  it('draw the folder name raw, the parent row with its words and no pill, and the pill on every valid folder', async () => {
    const dialog = await mount();
    const rows = Array.from(root(dialog).querySelectorAll<HTMLElement>('[role="option"]'));
    expect(rows).toHaveLength(4);
    const names = rows.map((row) => one(row, '[data-name]').textContent);
    expect(names).toEqual(['..', validProject.name, otherValidProject.name, plainFolder.name]);
    expect(option(dialog, parentFolder.location).textContent).toContain(PARENT_FOLDER_TEXT);
    expect(pillsOf(option(dialog, parentFolder.location))).toHaveLength(0);
    // The pill sits on the selected valid folder and on the valid folder that is not selected; an ordinary folder has none.
    let pills = 0;
    for (const folder of [validProject, otherValidProject]) {
      const found = pillsOf(option(dialog, folder.location));
      expect(found, folder.name).toHaveLength(1);
      expect(found[0]?.textContent?.trim()).toBe(VALID_PROJECT_TEXT);
      expect(found[0]?.getAttribute('status')).toBe('success');
      pills += 1;
    }
    expect(pills).toBe(2);
    expect(pillsOf(option(dialog, plainFolder.location))).toHaveLength(0);
    expect(option(dialog, otherValidProject.location).getAttribute('aria-selected')).toBe('false');
  });

  it('the parent words come from the kind, not from the name; a foreign name is drawn as given', async () => {
    const dialog = await mount({ folders: [{ name: '[path]', location: 'host:1', kind: 'folder', valid: false }, { name: 'up', location: 'host:2', kind: 'parent', valid: false }], selected: null });
    expect(one(option(dialog, 'host:1'), '[data-name]').textContent).toBe('[path]');
    expect(option(dialog, 'host:1').textContent).not.toContain(PARENT_FOLDER_TEXT);
    expect(option(dialog, 'host:2').textContent).toContain(PARENT_FOLDER_TEXT);
    expect(root(dialog).textContent).not.toContain('undefined');
  });

  it('a long name wraps inside the option and the listing does not overflow the dialog', async () => {
    const dialog = await mount({ folders: longNameFolders, selected: null }, 620);
    const body = one<HTMLElement>(root(dialog), '[data-region="body"]');
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
    const long = longNameFolders[1];
    expect(long).toBeDefined();
    if (long === undefined) return;
    const row = option(dialog, long.location).getBoundingClientRect();
    expect(row.right).toBeLessThanOrEqual(one<HTMLElement>(root(dialog), 'dialog').getBoundingClientRect().right);
  });

  it('paints the selected option and hover with the pill surface, and the others transparent (E-33)', async () => {
    const dialog = await mount();
    const selected = getComputedStyle(option(dialog, validProject.location));
    const other = getComputedStyle(option(dialog, plainFolder.location));
    expect(selected.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(other.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(selected.color).not.toBe(other.color);
  });
});

describe('the listing states: each stated in words, no listbox, Open disabled with the reason', () => {
  const CASES = [
    ['loading', FOLDERS_LOADING_TEXT],
    ['empty', FOLDERS_EMPTY_TEXT],
    ['error', FOLDERS_ERROR_BODY],
  ] as const;

  it('loading, empty and error draw their words and no option; the ready listing draws options and no state', async () => {
    let ran = 0;
    for (const [status, text] of CASES) {
      const dialog = await mount({ status, folders: [], selected: null });
      expect(root(dialog).querySelector('[role="listbox"]'), status).toBeNull();
      expect(root(dialog).querySelectorAll('[role="option"]'), status).toHaveLength(0);
      expect(one(root(dialog), `[data-state="${status}"]`).textContent).toContain(text);
      expect(one(root(dialog), 'sk-button[variant="primary"]').hasAttribute('disabled')).toBe(true);
      expect(one(root(dialog), '#open-reason').textContent).toBe(OPEN_DISABLED_REASON);
      ran += 1;
      dialog.remove();
    }
    expect(ran).toBe(3);
    const ready = await mount();
    expect(root(ready).querySelector('[role="listbox"]')).not.toBeNull();
    expect(root(ready).querySelector('[data-state]')).toBeNull();
  });

  it('loading is busy and error is a danger notice that does not announce (the polite region is the one announcer)', async () => {
    const loading = await mount({ status: 'loading', folders: [], selected: null });
    expect(one(root(loading), '[data-state="loading"]').getAttribute('aria-busy')).toBe('true');
    const error = await mount({ status: 'error', folders: [], selected: null });
    expect(one(root(error), '[data-state="error"] sk-notice').getAttribute('tone')).toBe('danger');
    expect(one(root(error), '[data-state="error"] sk-notice').getAttribute('announce')).toBe('off');
  });

  it('exactly one live or alert carrier holds the error sentence, after the listing fails (A11Y-003)', async () => {
    const dialog = await mount({ status: 'ready' });
    dialog.status = 'error';
    await settle(dialog);
    const notice = one<HTMLElement & { updateComplete?: Promise<unknown> }>(root(dialog), '[data-state="error"] sk-notice');
    await notice.updateComplete;
    const selector = '[role="alert"], [role="status"], [aria-live]';
    const carriers = (scope: Element | ShadowRoot): Element[] =>
      [...(scope instanceof Element && scope.matches(selector) ? [scope] : []), ...Array.from(scope.querySelectorAll(selector))].filter(
        (el) => el.getAttribute('aria-live') !== 'off' && flatText(el).includes(FOLDERS_ERROR_BODY),
      );
    const found = [...carriers(root(dialog)), ...(notice.shadowRoot === null ? [] : carriers(notice.shadowRoot))];
    // The notice host and its inner nodes count too (the host's own role, if any, is a carrier).
    if (notice.matches(selector) && notice.getAttribute('aria-live') !== 'off') found.push(notice);
    // Positive control: the region carries the sentence; the notice carries none of its own.
    expect(one(root(dialog), '[data-live]').textContent).toContain(FOLDERS_ERROR_BODY);
    expect(found).toHaveLength(1);
    expect(found[0]?.hasAttribute('data-live')).toBe(true);
  });

  it('the listing error keeps Try again 12px under the notice, the screen error spacing', async () => {
    const error = await mount({ status: 'error', folders: [], selected: null });
    const notice = one<HTMLElement>(root(error), '[data-state="error"] sk-notice');
    const retry = one<HTMLElement>(root(error), '[data-state="error"] sk-button');
    expect(Math.round(retry.getBoundingClientRect().top - notice.getBoundingClientRect().bottom)).toBe(12);
  });

  it('a non-ready state with a still-valid selection keeps Open disabled, states the reason and emits nothing; the ready state beside it enables Open', async () => {
    let ran = 0;
    for (const status of ['loading', 'empty', 'error'] as const) {
      const dialog = await mount({ status });
      const seen: Event[] = [];
      dialog.addEventListener('sk-confirm-open-project', (event) => seen.push(event));
      const open = one<HTMLElement>(root(dialog), 'sk-button[variant="primary"]');
      expect(open.hasAttribute('disabled'), status).toBe(true);
      expect(one(root(dialog), '#open-reason').textContent).toBe(OPEN_DISABLED_REASON);
      expectReasonBeforeOpen(dialog);
      (dialog as unknown as { confirmOpen(): void }).confirmOpen();
      open.click();
      expect(seen, status).toHaveLength(0);
      ran += 1;
      dialog.remove();
    }
    expect(ran).toBe(3);
    const ready = await mount();
    expect(one(root(ready), 'sk-button[variant="primary"]').hasAttribute('disabled')).toBe(false);
  });
});

describe('the measured box of the options (the prototype: 46px minimum, 8px and 12px padding, 18px glyph)', () => {
  it('pads each option 8px and 12px, draws an 18px glyph, and stacks the options flush', async () => {
    const dialog = await mount();
    const row = option(dialog, plainFolder.location);
    const style = getComputedStyle(row);
    expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual(['8px', '12px', '8px', '12px']);
    const glyph = one<SVGElement>(row, 'svg').getBoundingClientRect();
    expect([glyph.width, glyph.height]).toEqual([18, 18]);
    expect(style.columnGap).toBe('12px');
    const box = getComputedStyle(one(root(dialog), '[role="listbox"]'));
    expect([box.paddingTop, box.paddingLeft]).toEqual(['8px', '8px']);
  });
});

describe('the prototype measures: the pill, the footer buttons, the field and the dialog (E-31 (d), E-32 (f))', () => {
  it('the pill, the footer buttons, the field and the dialog have the prototype geometry, derived from their own computed styles', async () => {
    const dialog = await mount({ folders: readyFolders });
    const host = one<HTMLElement>(option(dialog, validProject.location), 'sk-pill-tag');
    const tag = one<HTMLElement>(host.shadowRoot as ShadowRoot, '[part="tag"]');
    const tagStyle = getComputedStyle(tag);
    const px = (value: string): number => Number.parseFloat(value);
    const pill = tag.getBoundingClientRect();
    // The pill is mono, which is not bundled: its height is its own explicit line (1.2 x 12px) + 4px + 4px + the 1px outline, and
    // its width is the text it holds + 8px + 8px + the outline, whatever face the text falls back to.
    expect(tagStyle.lineHeight).toBe('14.4px');
    expect([tagStyle.paddingTop, tagStyle.paddingLeft, tagStyle.borderTopWidth]).toEqual(['4px', '8px', '1px']);
    expect(pill.height).toBeCloseTo(px(tagStyle.lineHeight) + px(tagStyle.paddingTop) + px(tagStyle.paddingBottom) + px(tagStyle.borderTopWidth) + px(tagStyle.borderBottomWidth), 1);
    expect(pill.height).toBeCloseTo(24.4, 1);
    const text = document.createRange();
    text.selectNodeContents(host);
    expect(pill.width).toBeCloseTo(text.getBoundingClientRect().width + px(tagStyle.paddingLeft) + px(tagStyle.paddingRight) + px(tagStyle.borderLeftWidth) + px(tagStyle.borderRightWidth), 0);
    const cancel = one<HTMLElement>(root(dialog), '[data-cancel]').getBoundingClientRect();
    const open = one<HTMLElement>(root(dialog), 'sk-button[variant="primary"]').getBoundingClientRect();
    // Both footer buttons are the 44px minimum, and Inter (bundled, guarded above) sets their widths.
    expect([Math.round(cancel.width), cancel.height]).toEqual([81, 44]);
    expect([Math.round(open.width), open.height]).toEqual([71, 44]);
    expect(cancel.height).toBe(open.height);
    // The field is its parts stacked with their margins and the 8px gap: the label is one 21px line and the control keeps its 46px minimum.
    const field = one<HTMLElement>(root(dialog), 'sk-form-input');
    const fieldPart = one<HTMLElement>(field.shadowRoot as ShadowRoot, '[part="field"]');
    const stacked = Array.from(fieldPart.children).filter((child) => getComputedStyle(child).display !== 'none');
    const label = getComputedStyle(one<HTMLElement>(field.shadowRoot as ShadowRoot, '[part="label"]'));
    const control = one<HTMLElement>(field.shadowRoot as ShadowRoot, '[part="control"]');
    expect(px(getComputedStyle(control).minHeight)).toBe(46);
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(46);
    expect(px(label.lineHeight)).toBe(21);
    expect(stacked.length).toBeGreaterThanOrEqual(2);
    const gap = px(getComputedStyle(fieldPart).rowGap);
    expect(gap).toBe(8);
    expect(field.getBoundingClientRect().height).toBeCloseTo(stacked.reduce((sum, child) => sum + child.getBoundingClientRect().height + px(getComputedStyle(child).marginTop) + px(getComputedStyle(child).marginBottom), 0) + gap * (stacked.length - 1), 0);
    // The dialog is its three regions inside the 1px border.
    const box = one<HTMLElement>(root(dialog), 'dialog');
    const boxStyle = getComputedStyle(box);
    const regions = ['header', 'body', 'actions'].map((name) => one<HTMLElement>(root(dialog), `[data-region="${name}"]`).getBoundingClientRect().height);
    expect(box.getBoundingClientRect().height).toBeCloseTo(regions.reduce((a, b) => a + b, 0) + px(boxStyle.borderTopWidth) + px(boxStyle.borderBottomWidth), 0);
    const seen = getComputedStyle(one<HTMLElement>(root(dialog), '[data-cancel]'));
    expect(seen.fontSize).toBe('14px');
  });

  it('the focus ring on an option is the 2px token outline with a 2px offset', async () => {
    const dialog = await mount();
    const style = getComputedStyle(option(dialog, validProject.location));
    expect(style.outlineWidth).toBe('2px');
    expect(style.outlineOffset).toBe('2px');
  });
});

describe('forced colours: the selected option keeps a border (TESTS-004)', () => {
  const emulate = (value: 'active' | 'none'): Promise<unknown> => cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value }] });

  it('under forced-colors: active the selected option has a solid border and the unselected ones none (control: emulation off, no border)', async () => {
    const dialog = await mount();
    const selected = option(dialog, validProject.location);
    const others = mixedFolders.filter((folder) => folder.location !== validProject.location).map((folder) => option(dialog, folder.location));
    expect(others).toHaveLength(3);
    // Control first: without the emulation the selected option has no border.
    await emulate('none');
    expect(matchMedia('(forced-colors: active)').matches).toBe(false);
    expect(getComputedStyle(selected).borderTopStyle).toBe('none');
    await emulate('active');
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    expect(getComputedStyle(selected).borderTopStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(selected).borderTopWidth)).toBeGreaterThanOrEqual(1);
    for (const other of others) expect(getComputedStyle(other).borderTopStyle).toBe('none');
  });
});
