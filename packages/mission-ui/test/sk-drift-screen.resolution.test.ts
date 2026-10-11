// The suggested resolution: command, Copy, the result region and the manual selection (DR-02, DR-11, DR-12, DR-13, FR-021).
// Revert check for this file: in `resolution-parts.ts` render the result without the `result` argument (always empty) and
// "copied" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { COPY_ACCESSIBLE_LABEL, COPY_LABEL, COPY_MANUAL_FALLBACK, COPY_RESULT_TEXT } from '../src/defaults/index.js';

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

const COMMAND = 'spec-kitty agent status materialize --mission sample-slug-01';

async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 800);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
async function settle(screen: SkDriftScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => queueMicrotask(() => resolve(null)));
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
const resultText = (screen: SkDriftScreen): string | null => (root(screen).querySelector('[data-copy-result]') as HTMLElement | null)?.innerText.trim() ?? null;
const press = (screen: SkDriftScreen): void => (root(screen).querySelector('[data-copy]') as HTMLElement).click();
const keyAt = (screen: SkDriftScreen) => screen.selectedFinding;

describe('the command and Copy', () => {
  it('DR-02: the command is the text of a code element under an eyebrow, with a Copy button; the region is named by its eyebrow', async () => {
    const screen = await mount();
    expect(root(screen).querySelector('[data-command]')?.textContent).toBe(COMMAND);
    expect(root(screen).querySelector('[data-command]')?.tagName).toBe('CODE');
    expect(root(screen).querySelector('[data-copy]')?.textContent?.trim()).toBe('Copy');
    const region = root(screen).querySelector('[data-region="resolution"]');
    expect(root(screen).getElementById(region?.getAttribute('aria-labelledby') ?? '')?.textContent?.trim()).toBe('Suggested resolution');
    expect(root(screen).querySelectorAll('[data-copy]')).toHaveLength(1);
  });

  // A11Y-005: "Copy" alone does not say what it copies. The name starts with the visible word (WCAG 2.5.3).
  it('Copy has an accessible name that says what it copies and starts with its visible word (positive control: the visible word is still "Copy")', async () => {
    const screen = await mount();
    expect(COPY_ACCESSIBLE_LABEL).toBe('Copy command');
    expect(COPY_ACCESSIBLE_LABEL.startsWith(COPY_LABEL)).toBe(true);
    const copy = root(screen).querySelector('[data-copy]') as HTMLElement;
    expect(copy.textContent?.trim()).toBe(COPY_LABEL);
    expect(copy.shadowRoot?.querySelector('button')?.getAttribute('aria-label')).toBe(COPY_ACCESSIBLE_LABEL);
    await expect.element(page.getByRole('button', { name: COPY_ACCESSIBLE_LABEL, exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: COPY_LABEL, exact: true })).not.toBeInTheDocument();
  });

  it('no remedy draws no resolution region (DR-04, DR-05, DR-07b)', async () => {
    for (const select of [0, 2, 3, 4]) {
      const screen = await mount(reportProps('reportPopulated', { select }));
      expect(root(screen).querySelector('[data-region="resolution"]'), `finding ${select}`).toBeNull();
    }
    expect(root(await mount()).querySelector('[data-region="resolution"]')).not.toBeNull();
  });

  it('DR-11: an unknown remedy draws neither command nor Copy nor a sentence of a command', async () => {
    const screen = await mount(reportProps('reportUnknownRemedy', { select: 1 }));
    expect(root(screen).querySelector('[data-command]')).toBeNull();
    expect(root(screen).querySelector('[data-copy]')).toBeNull();
    expect(root(screen).querySelector('[data-resolution-note]')).toBeNull();
  });

  it('DR-13: a Mission the host does not list gives one sentence and no command', async () => {
    const screen = await mount(reportProps('reportMissionUnlisted', { select: 0 }));
    expect(root(screen).querySelector('[data-command]')).toBeNull();
    expect(root(screen).querySelector('[data-copy]')).toBeNull();
    const notes = root(screen).querySelectorAll('[data-resolution-note]');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent?.trim()).toBe('This Mission was not found in the Missions list, so no command is shown.');
  });

  // BOUNDARY-006: the region is drawn in one place, for the command and for the note alike, with one title id.
  it('the region is one section named by one title, for the command and for the note (positive control: the no-remedy finding has none)', async () => {
    for (const [name, props] of [
      ['command', reportProps('reportPopulated', { select: 1 })],
      ['note', reportProps('reportMissionUnlisted', { select: 0 })],
    ] as const) {
      const screen = await mount(props);
      const sections = root(screen).querySelectorAll('[data-region="resolution"]');
      expect(sections, name).toHaveLength(1);
      expect(root(screen).querySelectorAll('#resolution-title'), name).toHaveLength(1);
      expect(root(screen).getElementById(sections[0]?.getAttribute('aria-labelledby') ?? '')?.textContent?.trim(), name).toBe('Suggested resolution');
      expect(getComputedStyle(root(screen).querySelector('#resolution-title') as Element).textTransform, `${name} eyebrow`).toBe('uppercase');
      document.body.replaceChildren();
    }
    expect(root(await mount(reportProps('reportPopulated', { select: 0 }))).querySelectorAll('[data-region="resolution"]')).toHaveLength(0);
  });
});

describe('the result region (FR-021, DR-12)', () => {
  it('copied and manual: shown after a press and a later answer, with the words of the defaults; the region has no live role of its own', async () => {
    const screen = await mount();
    expect(resultText(screen)).toBe('');
    press(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    expect(resultText(screen)).toBe(COPY_RESULT_TEXT.copied);
    expect(root(screen).querySelector('[data-copy-result]')?.hasAttribute('aria-live')).toBe(false);
    press(screen);
    await settle(screen);
    expect(resultText(screen)).toBe('');
    screen.copyResult = null;
    await settle(screen);
    screen.copyResult = 'manual';
    await settle(screen);
    expect(resultText(screen)).toBe(COPY_RESULT_TEXT.manual);
  });

  it('a stale copyResult at press shows nothing until the property changes (positive control: the change shows it)', async () => {
    const screen = await mount({ copyResult: 'copied' });
    expect(resultText(screen)).toBe('');
    press(screen);
    await settle(screen);
    expect(resultText(screen)).toBe('');
    screen.copyResult = 'manual';
    await settle(screen);
    expect(resultText(screen)).toBe(COPY_RESULT_TEXT.manual);
  });

  it('a result is dropped when another finding is selected, and is not shown for it (the wrong-finding case)', async () => {
    const screen = await mount();
    const first = keyAt(screen);
    press(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    expect(resultText(screen)).toBe(COPY_RESULT_TEXT.copied);
    const other = reportProps('reportPopulated', { select: 0 }).selectedFinding;
    screen.selectedFinding = other;
    await settle(screen);
    expect(root(screen).querySelector('[data-copy-result]')).toBeNull();
    screen.selectedFinding = first;
    await settle(screen);
    expect(resultText(screen)).toBe('');
  });

  it('the result region keeps a line of room when empty, so a result does not shift the layout', async () => {
    const screen = await mount();
    const region = root(screen).querySelector('[data-copy-result]') as HTMLElement;
    const empty = region.getBoundingClientRect().height;
    const before = (root(screen).querySelector('[data-region="resolution"]') as HTMLElement).getBoundingClientRect().height;
    press(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    const after = (root(screen).querySelector('[data-region="resolution"]') as HTMLElement).getBoundingClientRect().height;
    // One line of room: the 1.5em floor of the region, from its computed font size, not a pixel literal.
    expect(empty).toBeGreaterThanOrEqual(parseFloat(getComputedStyle(region).fontSize) * 1.5 - 0.5);
    expect(after).toBe(before);
  });
});

describe('manual selection of the command text (S5)', () => {
  it('manual selects the command in the shadow root: the document selection reads back the exact command', async () => {
    const screen = await mount();
    expect(document.getSelection()?.toString()).toBe('');
    press(screen);
    screen.copyResult = 'manual';
    await settle(screen);
    expect(document.getSelection()?.toString()).toBe(COMMAND);
  });

  it('S5 fallback: when the read-back differs from the command the region says to select it by hand and never claims it is selected', async () => {
    const screen = await mount();
    const original = document.getSelection.bind(document);
    const fake = { toString: () => '', setBaseAndExtent: () => undefined, removeAllRanges: () => undefined } as unknown as Selection;
    document.getSelection = () => fake;
    try {
      press(screen);
      screen.copyResult = 'manual';
      await settle(screen);
      await settle(screen);
      expect(resultText(screen)).toBe(COPY_MANUAL_FALLBACK);
      expect(resultText(screen)).not.toMatch(/is selected/);
    } finally {
      document.getSelection = original;
    }
  });

  it('FR-021: when the read-back fails the live region announces the fallback words, never "the command is selected" (positive control: a working selection announces the manual words)', async () => {
    const live = (screen: SkDriftScreen): string => (root(screen).querySelector('[data-live]')?.textContent ?? '').trim();
    const good = await mount();
    press(good);
    good.copyResult = 'manual';
    await settle(good);
    await settle(good);
    expect(live(good)).toBe(COPY_RESULT_TEXT.manual);
    const screen = await mount();
    const original = document.getSelection.bind(document);
    const fake = { toString: () => '', setBaseAndExtent: () => undefined, removeAllRanges: () => undefined } as unknown as Selection;
    document.getSelection = () => fake;
    try {
      press(screen);
      screen.copyResult = 'manual';
      await settle(screen);
      await settle(screen);
      expect(live(screen)).toBe(COPY_MANUAL_FALLBACK);
      expect(live(screen)).not.toMatch(/is selected/);
      expect(root(screen).querySelectorAll('[data-live] [data-seq]')).toHaveLength(1);
    } finally {
      document.getSelection = original;
    }
  });

  it('a host re-render while manual does not steal a partial selection of the user; a new manual answer selects the whole command again', async () => {
    const screen = await mount();
    press(screen);
    screen.copyResult = 'manual';
    await settle(screen);
    expect(document.getSelection()?.toString()).toBe(COMMAND);
    const code = root(screen).querySelector('[data-command]') as HTMLElement;
    const text = [...code.childNodes].find((node) => node.nodeType === Node.TEXT_NODE) as Text;
    document.getSelection()?.setBaseAndExtent(text, 0, text, 5);
    expect(document.getSelection()?.toString()).toBe(COMMAND.slice(0, 5));
    screen.now = '2026-10-06T09:30:00Z';
    await settle(screen);
    screen.rescanning = true;
    await settle(screen);
    expect(document.getSelection()?.toString()).toBe(COMMAND.slice(0, 5));
    press(screen);
    await settle(screen);
    screen.copyResult = null;
    await settle(screen);
    screen.copyResult = 'manual';
    await settle(screen);
    expect(document.getSelection()?.toString()).toBe(COMMAND);
  });

  it('copied does not select (positive control: manual does, above)', async () => {
    const screen = await mount();
    press(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    expect(document.getSelection()?.toString()).toBe('');
  });
});

// TESTS-004: the tests above run at the two-pane tier (the stories' tier), not at the 414 px default, which is the shell's mobile tier.
describe('the tier of this file', () => {
  it('mounts at the two-pane tier: the list and the detail sit side by side (positive control: at 414 px they stack)', async () => {
    const screen = await mount({});
    const layout = root(screen).querySelector('[data-layout]') as HTMLElement;
    expect(window.innerWidth).toBe(1280);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(2);
    await page.viewport(414, 800);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(1);
  });
});
