// Focus capture, trap and return of the open-project dialog (FR-018, PR-26 dialog share).
// Spike S6: in a native modal the Tab walk passes through one document-body stop before it wraps, so the walk asserts that no
// page control receives focus and does not demand a closed loop of dialog controls only.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { LOCATION, mixedFolders, validProject } from '../src/elements/sk-open-project-dialog/fixtures.js';

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
/** A label for the element that has focus: 'option:<location>', 'cancel', 'open', 'close', 'field', 'body', or 'page'. */
function where(dialog: SkOpenProjectDialog): string {
  const inner = root(dialog).activeElement;
  if (document.activeElement === dialog && inner !== null) {
    if (inner.getAttribute('role') === 'option') return `option:${inner.getAttribute('data-location')}`;
    if (inner.matches('[data-cancel]')) return 'cancel';
    if (inner.matches('[data-region="header"] sk-button')) return 'close';
    if (inner.matches('sk-button[variant="primary"]')) return 'open';
    if (inner.matches('sk-form-input')) return 'field';
    return `other:${inner.localName}`;
  }
  return document.activeElement === document.body ? 'body' : 'page';
}

describe('focus capture on open', () => {
  it('moves focus into the dialog, onto the selected option (else the first, else Cancel)', async () => {
    const selected = await mount();
    expect(where(selected)).toBe(`option:${validProject.location}`);
    const none = await mount({ selected: null });
    expect(where(none)).toBe(`option:${mixedFolders[0]?.location}`);
    const empty = await mount({ status: 'empty', folders: [], selected: null });
    expect(where(empty)).toBe('cancel');
  });
});

describe('the Tab trap', () => {
  it('Tab and Shift+Tab never reach a page control; the dialog controls are all visited (positive control: the page button is focusable when the dialog is closed)', async () => {
    const pageButton = document.createElement('button');
    pageButton.textContent = 'page control';
    document.body.prepend(pageButton);
    const dialog = await mount();
    const seen = new Set<string>();
    const walked: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      await userEvent.tab();
      walked.push(where(dialog));
      seen.add(where(dialog));
    }
    expect(walked).toHaveLength(14);
    expect(walked).not.toContain('page');
    expect(document.activeElement).not.toBe(pageButton);
    for (const stop of ['close', 'cancel', 'open', `option:${validProject.location}`]) expect(seen.has(stop), stop).toBe(true);
    const back: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      await userEvent.tab({ shift: true });
      back.push(where(dialog));
    }
    expect(back).toHaveLength(14);
    expect(back).not.toContain('page');
    // Positive control.
    dialog.open = false;
    await settle(dialog);
    pageButton.focus();
    expect(document.activeElement).toBe(pageButton);
  });
});

describe('focus return', () => {
  it('Escape, Cancel and a backdrop click each return focus to the opener', async () => {
    let ran = 0;
    const closers: ((dialog: SkOpenProjectDialog) => Promise<void> | void)[] = [
      () => userEvent.keyboard('{Escape}'),
      (dialog) => userEvent.click(one(root(dialog), '[data-cancel]')),
      (dialog) => one<HTMLElement>(root(dialog), 'dialog').click(),
    ];
    for (const close of closers) {
      const opener = document.createElement('button');
      opener.textContent = 'Open project';
      document.body.append(opener);
      opener.focus();
      const dialog = await mount();
      expect(document.activeElement).not.toBe(opener);
      await close(dialog);
      await settle(dialog);
      expect(dialog.open).toBe(false);
      expect(document.activeElement).toBe(opener);
      ran += 1;
      dialog.remove();
      opener.remove();
    }
    expect(ran).toBe(3);
  });

  it('does not throw when the opener is gone (positive control: a connected opener gets focus)', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const dialog = await mount();
    opener.remove();
    expect(() => {
      dialog.open = false;
    }).not.toThrow();
    await settle(dialog);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).not.toBe(opener);
    const connected = document.createElement('button');
    document.body.append(connected);
    connected.focus();
    dialog.open = true;
    await settle(dialog);
    dialog.open = false;
    await settle(dialog);
    expect(document.activeElement).toBe(connected);
  });
});

describe('focus survives a state change that detaches the focused control (A11Y-002)', () => {
  const retryOf = (dialog: SkOpenProjectDialog): HTMLElement => one<HTMLElement>(root(dialog), '[data-state="error"] sk-button');
  const inside = (dialog: SkOpenProjectDialog): boolean => document.activeElement === dialog && root(dialog).activeElement !== null;

  it('Retry, then loading, then ready: focus stays inside the dialog and never falls to the body', async () => {
    const dialog = await mount({ status: 'error', folders: [], selected: null });
    const retry = retryOf(dialog);
    retry.focus();
    expect(root(dialog).activeElement).toBe(retry);
    dialog.status = 'loading';
    await settle(dialog);
    await settle(dialog);
    expect(retry.isConnected).toBe(false);
    expect(inside(dialog)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
    dialog.folders = mixedFolders;
    dialog.status = 'ready';
    await settle(dialog);
    await settle(dialog);
    expect(inside(dialog)).toBe(true);
  });

  it('control: when the focused button stays connected through an update, focus does not move', async () => {
    const dialog = await mount({ status: 'error', folders: [], selected: null });
    const retry = retryOf(dialog);
    retry.focus();
    dialog.location = `${LOCATION}/other`;
    await settle(dialog);
    await settle(dialog);
    expect(retry.isConnected).toBe(true);
    expect(root(dialog).activeElement).toBe(retry);
  });
});
