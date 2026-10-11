// The events of the Projects screen, asserted through the controls the screen draws (EV-1 to EV-5, EV-10): exactly one event
// per activation, `bubbles`, `composed`, not `cancelable`, the exact detail, and a positive control beside every no-event case.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { NOW, fiftyEntries, notOpenableEntries, rowErrorEntries, rowLoadingEntries, rowUnavailableEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { ENTRY_RETRY_LABEL, OPEN_PROJECT_LABEL } from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

const EVENT_NAMES = ['sk-open-project', 'sk-request-open-project', 'sk-retry-load', 'sk-action-row-activate'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-button, sk-page-header') ?? []).map((el) => el.updateComplete));
  return screen;
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
const rowOf = (screen: SkProjectsScreen, key: string): HTMLElement => one(root(screen), `li[data-key="${key}"]`);
/** The real control of an openable row: the native button inside the library row. */
const triggerOf = (screen: SkProjectsScreen, key: string): HTMLButtonElement => one(one<HTMLElement>(rowOf(screen, key), 'sk-action-row').shadowRoot as ShadowRoot, 'button');

/** Collects every event of the known names, on the host and from the document (one listener each). */
function collect(screen: SkProjectsScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectEvent(event: CustomEvent | undefined, name: string, detail: unknown): void {
  expect(event?.type).toBe(name);
  expect(event?.bubbles).toBe(true);
  expect(event?.composed).toBe(true);
  expect(event?.cancelable).toBe(false);
  expect(event?.detail).toEqual(detail);
}
const names = (seen: CustomEvent[]): string[] => seen.map((event) => event.type);

describe('EV-1: activating an openable row emits sk-open-project { key }', () => {
  it('emits one event for a pointer click', async () => {
    const screen = await mount();
    const seen = collect(screen);
    triggerOf(screen, 'meadow-sync').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: 'meadow-sync' });
  });

  it('emits one event for Enter and one for Space, on the focused row control', async () => {
    const screen = await mount();
    const seen = collect(screen);
    triggerOf(screen, 'harbor-ledger').focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: 'harbor-ledger' });
    await userEvent.keyboard(' ');
    expect(seen).toHaveLength(2);
    expectEvent(seen[1], 'sk-open-project', { key: 'harbor-ledger' });
  });

  it('carries only the host key: no location, no name', async () => {
    const screen = await mount();
    const seen = collect(screen);
    triggerOf(screen, 'quartz-notes').click();
    expect(Object.keys(seen[0]?.detail as object)).toEqual(['key']);
  });

  it('does not let the library row event out: the screen re-emits its own and stops the child event', async () => {
    const screen = await mount();
    const outside: string[] = [];
    document.body.addEventListener('sk-action-row-activate', (event) => outside.push(event.type));
    const seen = collect(screen);
    triggerOf(screen, 'harbor-ledger').click();
    expect(names(seen)).toEqual(['sk-open-project']);
    expect(outside).toHaveLength(0);
  });

  it('gives the event to the first matching key when the host repeats one (the host owns uniqueness)', async () => {
    const [first] = threeEntries() as [ProjectEntry];
    const screen = await mount({ entries: [first, { ...first }] });
    const seen = collect(screen);
    const rows = Array.from(root(screen).querySelectorAll<HTMLElement>('li[data-key]'));
    expect(rows).toHaveLength(2);
    one<HTMLButtonElement>(one<HTMLElement>(rows[1] as HTMLElement, 'sk-action-row').shadowRoot as ShadowRoot, 'button').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: first.key });
  });
});

describe('EV-2: a not-openable, loading or unavailable row emits nothing', () => {
  it('stays silent for each plain row, with an openable sibling beside it as the positive control', async () => {
    const entries = [...notOpenableEntries(), ...rowLoadingEntries().slice(1, 2), ...rowUnavailableEntries().slice(1, 2).map((entry) => ({ ...entry, key: 'gone' }))];
    const screen = await mount({ entries });
    const seen = collect(screen);
    let ran = 0;
    for (const key of ['plain', 'tidal-index', 'gone']) {
      const row = one<HTMLElement>(rowOf(screen, key), 'sk-action-row');
      expect(row.shadowRoot?.querySelectorAll('button'), key).toHaveLength(0);
      row.click();
      one<HTMLElement>(row, '[slot="title"]').click();
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(seen).toHaveLength(0);
    triggerOf(screen, 'openable').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: 'openable' });
  });

  it('puts only the openable row in the Tab order: the plain row has no native control to reach', async () => {
    const screen = await mount({ entries: notOpenableEntries() });
    const controls = Array.from(root(screen).querySelectorAll<HTMLElement>('li')).map((li) => one<HTMLElement>(li, 'sk-action-row').shadowRoot?.querySelectorAll('button').length);
    expect(controls).toEqual([1, 0]);
  });
});

describe('EV-3: "Open project" emits sk-request-open-project, without a payload', () => {
  it('emits one event for the header button, also with nothing to list', async () => {
    let ran = 0;
    for (const status of ['ready', 'empty'] as const) {
      const screen = await mount({ status, entries: status === 'ready' ? threeEntries() : [] });
      const seen = collect(screen);
      const buttons = page.getByRole('button', { name: OPEN_PROJECT_LABEL });
      expect(buttons.elements(), status).toHaveLength(1);
      one<HTMLElement>(root(screen), '[data-region="header"] > sk-button').click();
      expect(seen, status).toHaveLength(1);
      expectEvent(seen[0], 'sk-request-open-project', null);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(2);
  });

  it('emits from the keyboard on the focused button, once per key', async () => {
    const screen = await mount({ status: 'empty', entries: [] });
    const seen = collect(screen);
    one<HTMLElement>(root(screen), '[data-region="header"] > sk-button').focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-request-open-project', null);
  });
});

describe('EV-4: Retry on a failed row emits sk-retry-load { target: "project", key }', () => {
  it('emits one event for the failed row only, and the row itself opens nothing', async () => {
    const screen = await mount({ entries: rowErrorEntries() });
    const seen = collect(screen);
    one<HTMLElement>(rowOf(screen, 'tidal-index'), 'sk-button').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'project', key: 'tidal-index' });
    // Positive control for the silence beside it: an openable sibling still emits its own event.
    triggerOf(screen, 'harbor-ledger').click();
    expect(names(seen)).toEqual(['sk-retry-load', 'sk-open-project']);
  });

  it('emits from the keyboard on the focused retry button', async () => {
    const screen = await mount({ entries: rowErrorEntries() });
    const seen = collect(screen);
    one<HTMLElement>(rowOf(screen, 'tidal-index'), 'sk-button').focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'project', key: 'tidal-index' });
    expect(page.getByRole('button', { name: `${ENTRY_RETRY_LABEL}, tidal-index` }).elements()).toHaveLength(1);
  });
});

describe('EV-5: Retry on the failed list emits sk-retry-load { target: "projects" }', () => {
  it('emits one event without a key', async () => {
    const screen = await mount({ status: 'error', entries: [] });
    const seen = collect(screen);
    one<HTMLElement>(root(screen), '[data-region="state"] sk-button').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-retry-load', { target: 'projects' });
  });
});

describe('EV-10: state-only interaction emits nothing', () => {
  it('stays silent for focus, hover and scroll, and emits for an activation on the same listener', async () => {
    const screen = await mount({ entries: fiftyEntries() });
    const seen = collect(screen);
    const trigger = triggerOf(screen, 'project-03');
    trigger.focus();
    expect(root(screen).querySelector('li[data-key="project-03"]')).not.toBeNull();
    await page.elementLocator(trigger).hover();
    await userEvent.tab();
    await userEvent.tab({ shift: true });
    window.scrollTo(0, 400);
    root(screen).querySelector<HTMLElement>('li[data-key="project-40"]')?.scrollIntoView();
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(seen).toHaveLength(0);
    // Positive control: a real activation reaches the same listener.
    triggerOf(screen, 'project-40').click();
    expect(seen).toHaveLength(1);
    expectEvent(seen[0], 'sk-open-project', { key: 'project-40' });
  });

  it('stays silent when the properties change (status, entries, now) and when a hook runs', async () => {
    const screen = await mount();
    const seen = collect(screen);
    screen.now = '2026-10-04T09:30:00Z';
    screen.entries = threeEntries().reverse();
    await settle(screen);
    screen.status = 'loading';
    await settle(screen);
    expect(seen).toHaveLength(0);
    screen.status = 'ready';
    await settle(screen);
    one<HTMLElement>(root(screen), '[data-region="header"] > sk-button').click();
    expect(names(seen)).toEqual(['sk-request-open-project']);
  });
});
