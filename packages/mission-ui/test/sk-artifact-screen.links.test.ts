// The inline links of the rendered document (IC-07): EV-1 (`sk-select-artifact`), EV-2 (`sk-open-link`), EV-3 (an inert link emits
// nothing) and EV-10 (a tab change emits nothing). Real pointer-equivalent clicks and real keyboard input on the real controls; every
// emit test asserts exactly one event with `bubbles` and `composed` true, `cancelable` false and the detail by deep equality; every
// no-event test has a positive control on the same listener; the name and description dump is exact.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, missionFacts, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';

const EVENT_NAMES = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-03'), ...props });
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
const markdown = (text: string): ArtifactContentView => ({ path: 'plan.md', kind: 'plan', mediaType: 'text/markdown', encoding: 'utf-8', sizeBytes: text.length, redacted: false, content: text });
const links = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('a[data-md="link"]'));
const linkText = (screen: Element, text: string): HTMLElement => {
  const found = links(screen).find((a) => (a.textContent ?? '').startsWith(text));
  if (found === undefined) throw new Error(`no link ${text}`);
  return found;
};
function record(screen: Element): CustomEvent[] {
  const events: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.addEventListener(name, (e) => events.push(e as CustomEvent));
  return events;
}
function expectOne(events: CustomEvent[], name: string, detail: unknown): void {
  expect(events.map((e) => e.type)).toEqual([name]);
  const [event] = events;
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}

describe('EV-1: an internal link emits sk-select-artifact', () => {
  const targets: Array<[string, { path: string; kind: string }]> = [
    ['data model', { path: 'data-model.md', kind: 'data_model' }],
    ['first work package', { path: 'tasks/WP01-example.md', kind: 'work_package_prompt' }],
    ['review cycle', { path: 'tasks/WP01-example/review-cycle-1.md', kind: 'review_cycle' }],
  ];

  it('carries the Mission id, the path and the kind of the target entry, once per click', async () => {
    let ran = 0;
    for (const [text, target] of targets) {
      const screen = await mount();
      const events = record(screen);
      linkText(screen, text).click();
      expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, ...target });
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('is activated by Enter exactly once, and by no other key (control: Enter on the same link)', async () => {
    const screen = await mount();
    const events = record(screen);
    linkText(screen, 'data model').focus();
    await userEvent.keyboard('a');
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowRight}');
    expect(events).toHaveLength(0);
    await userEvent.keyboard('{Enter}');
    expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' });
  });

  it('with no Mission an artifact link is drawn inert (no role, no tab stop) and emits nothing; with a Mission the same link is live (positive control on the same listener)', async () => {
    const screen = await mount({ mission: null });
    const events = record(screen);
    const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ');
    expect(links(screen).some((a) => text(a).startsWith('data model'))).toBe(false);
    const inert = Array.from(root(screen).querySelectorAll<HTMLElement>('span[data-md="inert-link"]')).find((s) => text(s).startsWith('data model'));
    if (inert === undefined) throw new Error('the artifact link is not drawn inert');
    expect(inert.hasAttribute('role')).toBe(false);
    expect(inert.hasAttribute('tabindex')).toBe(false);
    inert.click();
    inert.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    expect(events).toHaveLength(0);
    screen.mission = missionFacts;
    await settle(screen);
    expect(root(screen).querySelectorAll('span[data-md="inert-link"]').length).toBeLessThan(Array.from(root(screen).querySelectorAll('a[data-md="link"]')).length);
    linkText(screen, 'data model').click();
    expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' });
  });

  it('with no Mission an external link stays live and still emits (the Mission id is not part of its event)', async () => {
    const screen = await mount({ mission: null });
    const events = record(screen);
    linkText(screen, 'the project site').click();
    expectOne(events, 'sk-open-link', { href: 'https://example.org/docs/plan' });
  });
});

describe('EV-1: Enter on a link ignores chords and key repeat', () => {
  const press = (el: HTMLElement, init: KeyboardEventInit): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true, ...init });
    el.dispatchEvent(event);
    return event;
  };

  it('Alt, Ctrl, Meta and Shift with Enter emit nothing (positive control: plain Enter on the same link emits exactly once)', async () => {
    const screen = await mount();
    const events = record(screen);
    const link = linkText(screen, 'data model');
    for (const chord of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      expect(press(link, chord).defaultPrevented).toBe(false);
    }
    expect(events).toHaveLength(0);
    press(link, {});
    expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' });
  });

  it('a held Enter (a repeated keydown) emits nothing (positive control: the first keydown of the same press emits exactly once)', async () => {
    const screen = await mount();
    const events = record(screen);
    const link = linkText(screen, 'data model');
    expect(press(link, { repeat: true }).defaultPrevented).toBe(false);
    press(link, { repeat: true });
    expect(events).toHaveLength(0);
    press(link, { repeat: false });
    expectOne(events, 'sk-select-artifact', { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' });
  });
});

describe('EV-2: an external link emits sk-open-link', () => {
  it('carries only the href, once per click, and once for Enter', async () => {
    const screen = await mount();
    const events = record(screen);
    linkText(screen, 'the project site').click();
    expectOne(events, 'sk-open-link', { href: 'https://example.org/docs/plan' });
    events.length = 0;
    linkText(screen, 'the project site').focus();
    await userEvent.keyboard('{Enter}');
    expectOne(events, 'sk-open-link', { href: 'https://example.org/docs/plan' });
  });

  it('draws no href on any control and never navigates (the control is an anchor without an href; control: it still emits)', async () => {
    const screen = await mount();
    const events = record(screen);
    expect(links(screen)).toHaveLength(5);
    for (const a of links(screen)) {
      expect(a.localName).toBe('a');
      expect(a.hasAttribute('href')).toBe(false);
      expect(a.getAttribute('role')).toBe('link');
      expect(a.getAttribute('tabindex')).toBe('0');
    }
    const before = location.href;
    linkText(screen, 'the project site').click();
    expect(location.href).toBe(before);
    expect(events.map((e) => e.type)).toEqual(['sk-open-link']);
  });

  it('an image outside a link is an external control with the placeholder words, and emits the same event', async () => {
    const screen = await mount();
    const events = record(screen);
    const image = linkText(screen, 'Image: A diagram of the plan');
    image.click();
    expectOne(events, 'sk-open-link', { href: 'https://example.org/images/plan.png' });
  });
});

describe('a link whose text holds an autolink draws one control, not two', () => {
  const SOURCE = 'See [the <https://evil.example/x> page](data-model.md) and [also <mailto:a@b.example>](https://good.example/y).\n';

  /** The element that directly holds the text `needle`, the way a pointer or the keyboard reaches the inner words. */
  function holder(screen: Element, needle: string): HTMLElement {
    const walker = document.createTreeWalker(root(screen), NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if ((node.textContent ?? '').includes(needle) && node.parentElement !== null) return node.parentElement;
    }
    throw new Error(`no text ${needle}`);
  }
  const enter = (el: HTMLElement): void => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true, cancelable: true }));
  };

  it('a click and Enter on the inner text each emit exactly one event, the one of the OUTER link', async () => {
    const screen = await mount({ content: markdown(SOURCE), selectedPath: 'plan.md' });
    const events = record(screen);
    expect(links(screen)).toHaveLength(2);
    for (const a of links(screen)) expect(a.querySelector('a')).toBeNull();
    const first = { missionId: missionFacts.missionId, path: 'data-model.md', kind: 'data_model' };
    holder(screen, 'https://evil.example/x').click();
    expectOne(events, 'sk-select-artifact', first);
    events.length = 0;
    enter(holder(screen, 'https://evil.example/x'));
    expectOne(events, 'sk-select-artifact', first);
    events.length = 0;
    holder(screen, 'mailto:a@b.example').click();
    expectOne(events, 'sk-open-link', { href: 'https://good.example/y' });
    events.length = 0;
    enter(holder(screen, 'mailto:a@b.example'));
    expectOne(events, 'sk-open-link', { href: 'https://good.example/y' });
  });
});

describe('EV-3: an inert link emits nothing', () => {
  const SOURCE = 'A [missing](missing.md) file, a [section](#top) and a [real one](data-model.md).\n';

  it('a link to a path outside the listing and a fragment link are spans with the destination in the title, and click or Enter emits nothing (positive control: the real link emits)', async () => {
    const screen = await mount({ content: markdown(SOURCE), selectedPath: 'plan.md' });
    const events = record(screen);
    const inert = Array.from(root(screen).querySelectorAll<HTMLElement>('span[data-md="inert-link"]'));
    expect(inert).toHaveLength(2);
    for (const span of inert) {
      expect(span.hasAttribute('tabindex')).toBe(false);
      expect(span.hasAttribute('role')).toBe(false);
      span.click();
      span.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true }));
    }
    expect(events).toHaveLength(0);
    linkText(screen, 'real one').click();
    expect(events.map((e) => e.type)).toEqual(['sk-select-artifact']);
  });
});

describe('the name and description of the three link kinds, in one paragraph', () => {
  it('dumps exactly: the text then the hidden word of what it does, and the destination in the title for an external and an inert link', async () => {
    const source = 'Go to [the data model](data-model.md), to [the site](https://example.org/x) or [nowhere](missing.md).\n';
    const screen = await mount({ content: markdown(source), selectedPath: 'plan.md' });
    const paragraph = root(screen).querySelector('article p:nth-of-type(2)')!;
    const parts = Array.from(paragraph.querySelectorAll<HTMLElement>('a[data-md="link"], span[data-md="inert-link"]'));
    const dump = parts.map((el) => ({ tag: el.localName, role: el.getAttribute('role'), name: (el.textContent ?? '').replace(/\s+/g, ' ').trim(), title: el.getAttribute('title') }));
    expect(dump).toEqual([
      { tag: 'a', role: 'link', name: 'the data model opens another artifact', title: null },
      { tag: 'a', role: 'link', name: 'the site opens in your browser', title: 'https://example.org/x' },
      { tag: 'span', role: null, name: 'nowhere not a followable link', title: 'Not followed: missing.md' },
    ]);
    // The hidden word is out of the layout (0 x 0) but still in the tree.
    for (const part of parts) {
      const suffix = part.querySelector<HTMLElement>('[data-md="suffix"]')!;
      expect(suffix.getBoundingClientRect().width).toBe(0);
      expect(suffix.textContent?.trim().length).toBeGreaterThan(0);
    }
    // The look differs by more than colour: followable links are underlined, the inert one is not.
    expect(getComputedStyle(parts[0]!).textDecorationLine).toBe('underline');
    expect(getComputedStyle(parts[1]!).textDecorationLine).toBe('underline');
    expect(getComputedStyle(parts[2]!).textDecorationLine).toBe('none');
  });
});

describe('EV-10: a tab change is not a link event', () => {
  it('switching to Raw and back emits nothing, and the links work again afterwards (positive control on the same listener)', async () => {
    const screen = await mount();
    const events = record(screen);
    const tab = (name: string): HTMLElement => Array.from(root(screen).querySelectorAll<HTMLElement>('[role="tab"]')).find((t) => t.textContent === name)!;
    tab('Raw').click();
    await settle(screen);
    expect(links(screen)).toHaveLength(0);
    tab('Rendered').click();
    await settle(screen);
    expect(events).toHaveLength(0);
    linkText(screen, 'the project site').click();
    expect(events.map((e) => e.type)).toEqual(['sk-open-link']);
  });
});
