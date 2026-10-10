// The payload rules of the state controls (IC-08): EV-5 `sk-open-mission`, EV-6 `sk-retry-load` for the content, EV-7 `sk-retry-load`
// for the listing, and each branch of the `missionId` builder. Every emit test asserts exactly one event, `bubbles` and `composed`
// true, `cancelable` false and the detail by deep equality; every no-event test has a positive control on the same listener.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, missionFacts, missionBare, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { SkArtifactRetryDetail } from '../src/retry-types.js';

const EVENT_NAMES = ['sk-select-artifact', 'sk-open-link', 'sk-select-work-package', 'sk-open-mission', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}
async function mount(id: PairingId, props: Partial<ArtifactScreenProps> = {}): Promise<SkArtifactScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps(id), ...props });
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
function control(screen: Element): HTMLElement {
  const found = root(screen).querySelector<HTMLElement>('[data-state-panel] sk-button, [data-refusal] sk-button');
  if (found === null) throw new Error('no control');
  return found;
}
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

describe('EV-5: "Return to Pipeline" emits sk-open-mission', () => {
  it('carries the Mission id and the slug, once (EV-5)', async () => {
    const screen = await mount('AV-23');
    const events = record(screen);
    control(screen).click();
    expectOne(events, 'sk-open-mission', { missionId: missionFacts.missionId, slug: missionFacts.slug });
  });

  it('is activated by the keyboard exactly once (Enter), and only on the control', async () => {
    const screen = await mount('AV-23');
    const events = record(screen);
    await userEvent.keyboard('{Enter}');
    expect(events).toHaveLength(0);
    (control(screen).shadowRoot?.querySelector('button') ?? control(screen)).focus();
    await userEvent.keyboard('{Enter}');
    expectOne(events, 'sk-open-mission', { missionId: missionFacts.missionId, slug: missionFacts.slug });
  });

  it('carries the slug of a Mission with the identity only (the bare Mission)', async () => {
    const screen = await mount('AV-23', { mission: missionBare });
    const events = record(screen);
    control(screen).click();
    expectOne(events, 'sk-open-mission', { missionId: missionBare.missionId, slug: missionBare.slug });
  });

  it('emits nothing when there is no Mission, while a click on the Retry of the same screen kind does (positive control on the same listener)', async () => {
    const inert = await mount('AV-23', { mission: null });
    const inertEvents = record(inert);
    control(inert).click();
    expect(inertEvents).toHaveLength(0);
    const live = await mount('AV-23');
    const liveEvents = record(live);
    control(live).click();
    expect(liveEvents.map((e) => e.type)).toEqual(['sk-open-mission']);
  });
});

describe('EV-6: Retry on a failed or refused content read emits sk-retry-load for the content', () => {
  it('carries the Mission id, the target `content` and the open path, once (the retryable refusal)', async () => {
    const screen = await mount('AV-13');
    const events = record(screen);
    control(screen).click();
    const detail: SkArtifactRetryDetail = { missionId: missionFacts.missionId, target: 'content', path: 'spec.md' };
    expectOne(events, 'sk-retry-load', detail);
  });

  it('carries the open path of another selection, and works for a failed read too (contentStatus error)', async () => {
    const screen = await mount('AV-13', { contentStatus: 'error', refusalCode: null, selectedPath: 'tasks/WP01-example.md', errorMessage: 'No answer.' });
    const events = record(screen);
    await userEvent.click(control(screen));
    expectOne(events, 'sk-retry-load', { missionId: missionFacts.missionId, target: 'content', path: 'tasks/WP01-example.md' });
  });

  it('is inert without a Mission (control: the same click emits with one)', async () => {
    const inert = await mount('AV-13', { mission: null });
    const inertEvents = record(inert);
    control(inert).click();
    expect(inertEvents).toHaveLength(0);
    const live = await mount('AV-13');
    const liveEvents = record(live);
    control(live).click();
    expect(liveEvents.map((e) => e.type)).toEqual(['sk-retry-load']);
  });

  it('has no control on the final refusals, so nothing can be emitted for them (control: the retryable one has it)', async () => {
    const final = await mount('AV-13', { refusalCode: 'artifact_secret' });
    expect(root(final).querySelector('[data-refusal] sk-button')).toBeNull();
    const retryable = await mount('AV-13');
    expect(root(retryable).querySelector('[data-refusal] sk-button')).not.toBeNull();
  });
});

describe('EV-7: Retry on the listing error emits sk-retry-load for the listing', () => {
  it('carries the Mission id and the target `listing`, with no path, once', async () => {
    const screen = await mount('AV-14');
    const events = record(screen);
    control(screen).click();
    expectOne(events, 'sk-retry-load', { missionId: missionFacts.missionId, target: 'listing' });
    expect(Object.keys(events[0]?.detail as object).sort()).toEqual(['missionId', 'target']);
  });

  it('keeps the listing target when a path is selected (the listing failure is not the content failure)', async () => {
    const screen = await mount('AV-14', { selectedPath: 'spec.md' });
    const events = record(screen);
    control(screen).click();
    expectOne(events, 'sk-retry-load', { missionId: missionFacts.missionId, target: 'listing' });
  });

  it('is inert without a Mission (control: the same click emits with one)', async () => {
    const inert = await mount('AV-14', { mission: null });
    const inertEvents = record(inert);
    control(inert).click();
    expect(inertEvents).toHaveLength(0);
    const live = await mount('AV-14');
    const liveEvents = record(live);
    control(live).click();
    expect(liveEvents.map((e) => e.type)).toEqual(['sk-retry-load']);
  });
});
