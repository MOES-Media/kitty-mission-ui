// The events of the header, the list and the states (IC-04, T030): EV-1 `sk-select-finding`, EV-2 `sk-rescan-drift` (the header test holds
// the rest of Rescan), `sk-open-missions` and `sk-retry-load`. Real pointer and keyboard input on the real controls. Every emit test asserts
// exactly one event with `bubbles` and `composed` true, `cancelable` false and a `toEqual` detail; every no-event test has a positive control
// on the same target; every loop asserts how many times it ran.
// Revert check (temporary local edit, never committed): in list-parts.ts change the option's `@click=${() => p.onSelect(findingKey(finding))}`
// to call nothing; "a click on each option emits sk-select-finding once with that finding's key" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent, page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, refusalProps, reportProps, scopedMissionId, stateProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';

const EVENT_NAMES = ['sk-select-finding', 'sk-rescan-drift', 'sk-copy-command', 'sk-open-mission', 'sk-open-missions', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkDriftScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

const root = (screen: SkDriftScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const optionsOf = (screen: SkDriftScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('[role="option"]')];
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const innerButton = (host: Element): HTMLElement => one<HTMLElement>(host.shadowRoot as ShadowRoot, 'button');

/** Every event of the screen's surface, seen on the wrapper around it. */
function listenAll(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

function expectOne(events: CustomEvent[], name: string, detail: unknown): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe(name);
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual(detail);
}

const keyOf = (index: number): { missionId: string; kind: string; artifactPath: string } => {
  const f = reportPopulated.findings[index];
  if (f === undefined) throw new Error(`no finding ${index}`);
  return { missionId: f.missionId, kind: f.kind, artifactPath: f.artifactPath };
};

describe('EV-1 sk-select-finding', () => {
  it("a click on each option emits sk-select-finding once with that finding's key", async () => {
    const screen = await mount();
    const options = optionsOf(screen);
    expect(options).toHaveLength(5);
    const events = listenAll(screen);
    let visited = 0;
    for (const [index, option] of options.entries()) {
      events.length = 0;
      await userEvent.click(option);
      expectOne(events, 'sk-select-finding', keyOf(index));
      visited += 1;
    }
    expect(visited).toBe(5);
  });

  it('Enter and Space on a focused option each emit once with its key', async () => {
    const screen = await mount();
    const options = optionsOf(screen);
    expect(options).toHaveLength(5);
    const events = listenAll(screen);
    let visited = 0;
    for (const key of ['{Enter}', ' ']) {
      for (const [index, option] of options.entries()) {
        events.length = 0;
        option.focus();
        await userEvent.keyboard(key);
        expectOne(events, 'sk-select-finding', keyOf(index));
        visited += 1;
      }
    }
    expect(visited).toBe(10);
  });

  it('an incoming selectedFinding change emits nothing (a click on the same option is the positive control)', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    screen.selectedFinding = keyOf(3);
    await settle(screen);
    screen.selectedFinding = null;
    await settle(screen);
    screen.selectedFinding = keyOf(0);
    await settle(screen);
    expect(events).toHaveLength(0);
    await userEvent.click(optionsOf(screen)[2] as HTMLElement);
    expectOne(events, 'sk-select-finding', keyOf(2));
  });

  it('a host that ignores the event leaves the selection and the marker where they were', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    await userEvent.click(optionsOf(screen)[4] as HTMLElement);
    expect(events).toHaveLength(1);
    const selected = optionsOf(screen).filter((option) => option.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(optionsOf(screen)[1]);
    expect(screen.selectedFinding).toEqual(keyOf(1));
    // The positive control: a host that follows the event moves the marker.
    screen.selectedFinding = keyOf(4);
    await settle(screen);
    expect(optionsOf(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'false', 'true']);
  });

  it('a click on a row of a scoped scan carries the same key shape (no Mission column does not change the payload)', async () => {
    const screen = await mount(reportProps('reportScoped', { select: 0 }));
    const options = optionsOf(screen);
    expect(options).toHaveLength(3);
    const events = listenAll(screen);
    await userEvent.click(options[1] as HTMLElement);
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ missionId: scopedMissionId, kind: 'snapshot_disagrees_with_event_log', artifactPath: 'status.json' });
  });
});

describe('EV-2 sk-rescan-drift', () => {
  it('a click on Rescan emits once with null for the whole project', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    await userEvent.click(one(root(screen), '[data-rescan]'));
    expectOne(events, 'sk-rescan-drift', { missionId: null });
  });

  it('the same click while rescanning emits nothing; after the scan the positive control emits once', async () => {
    const screen = await mount({ rescanning: true });
    const events = listenAll(screen);
    await userEvent.click(one(root(screen), '[data-rescan]'));
    expect(events).toHaveLength(0);
    screen.rescanning = false;
    await settle(screen);
    await userEvent.click(one(root(screen), '[data-rescan]'));
    expectOne(events, 'sk-rescan-drift', { missionId: null });
  });
});

describe('sk-open-missions (Return to Missions)', () => {
  it('a click, Enter and Space on "Return to Missions" each emit once with an empty detail', async () => {
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    const button = one<HTMLElement>(root(screen), '[data-return]');
    expect((button.textContent ?? '').trim()).toBe('Return to Missions');
    await userEvent.click(button);
    expectOne(events, 'sk-open-missions', {});
    let ran = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      innerButton(button).focus();
      await userEvent.keyboard(key);
      expectOne(events, 'sk-open-missions', {});
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('emits nothing when the state draws no such control (the error state), and nothing from the other controls of the not-found state', async () => {
    const error = await mount(stateProps.error());
    expect(root(error).querySelectorAll('[data-return]')).toHaveLength(0);
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    await userEvent.click(one(root(screen), '[data-rescan]'));
    expect(events.map((event) => event.type)).toEqual(['sk-rescan-drift']);
    // The positive control: the Return control itself.
    events.length = 0;
    await userEvent.click(one(root(screen), '[data-return]'));
    expect(events.map((event) => event.type)).toEqual(['sk-open-missions']);
  });
});

describe('sk-retry-load (Retry)', () => {
  it('a click, Enter and Space on Retry each emit once with the drift-report target and null for the whole project', async () => {
    const screen = await mount(refusalProps('refusalScanUnreadable'));
    const events = listenAll(screen);
    const button = one<HTMLElement>(root(screen), '[data-retry]');
    expect((button.textContent ?? '').trim()).toBe('Try again');
    await userEvent.click(button);
    expectOne(events, 'sk-retry-load', { target: 'drift-report', missionId: null });
    let ran = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      innerButton(button).focus();
      await userEvent.keyboard(key);
      expectOne(events, 'sk-retry-load', { target: 'drift-report', missionId: null });
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('a scoped scan retries with its Mission id', async () => {
    const screen = await mount({ ...refusalProps('refusalScanUnreadable'), missionId: scopedMissionId });
    const events = listenAll(screen);
    await userEvent.click(one(root(screen), '[data-retry]'));
    expectOne(events, 'sk-retry-load', { target: 'drift-report', missionId: scopedMissionId });
  });

  it('is drawn only in the error state: not-found, loading and ready draw no Retry (the error state is the positive control)', async () => {
    let checked = 0;
    for (const props of [stateProps.notFound(), stateProps.loading(), reportProps('reportPopulated')]) {
      const screen = await mount(props);
      expect(root(screen).querySelectorAll('[data-retry]')).toHaveLength(0);
      checked += 1;
    }
    expect(checked).toBe(3);
    const error = await mount(stateProps.error());
    expect(root(error).querySelectorAll('[data-retry]')).toHaveLength(1);
  });
});
