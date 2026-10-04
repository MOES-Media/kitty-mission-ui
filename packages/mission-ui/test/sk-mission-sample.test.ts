import { afterEach, describe, expect, it } from 'vitest';
import '../src/index.js';
import { SkMissionSample } from '../src/elements/sk-mission-sample/sk-mission-sample.js';
import { exampleMission } from '../src/elements/sk-mission-sample/fixtures.js';
import type { ViewState } from '../src/view-state.js';

const PRIMITIVES = ['sk-card', 'sk-button', 'sk-notice', 'sk-pill-tag', 'sk-section-header', 'sk-status-indicator'];

async function mount(status: ViewState, extra: Partial<SkMissionSample> = {}): Promise<SkMissionSample> {
  const el = document.createElement('sk-mission-sample');
  el.status = status;
  Object.assign(el, extra);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

function present(el: SkMissionSample): string[] {
  return PRIMITIVES.filter((tag) => el.shadowRoot?.querySelector(tag) !== null);
}

function collect(name: string): CustomEvent[] {
  const seen: CustomEvent[] = [];
  document.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('sk-mission-sample rendering', () => {
  it('ready renders card, section header with the name in its title slot, pill tag and primary button only', async () => {
    const el = await mount('ready', { mission: exampleMission });
    expect(present(el)).toEqual(['sk-card', 'sk-button', 'sk-pill-tag', 'sk-section-header']);
    const title = el.shadowRoot?.querySelector('sk-section-header > h3[slot="title"]');
    expect(title?.textContent?.trim()).toBe(exampleMission.name);
    expect(el.shadowRoot?.querySelector('sk-button')?.getAttribute('variant')).toBe('primary');
    expect(el.shadowRoot?.querySelector('sk-pill-tag')?.textContent?.trim()).toBe('3/8');
  });

  it('empty renders an info notice only', async () => {
    const el = await mount('empty');
    expect(present(el)).toEqual(['sk-notice']);
    const notice = el.shadowRoot?.querySelector('sk-notice');
    expect(notice?.getAttribute('tone')).toBe('info');
    expect(notice?.hasAttribute('message')).toBe(false);
    expect(notice?.textContent?.trim()).toBe('No mission to show yet.');
  });

  it('loading renders a pulsing indicator and marks the host busy', async () => {
    const el = await mount('loading');
    expect(present(el)).toEqual(['sk-status-indicator']);
    expect(el.shadowRoot?.querySelector('sk-status-indicator')?.hasAttribute('pulsing')).toBe(true);
    expect(el.getAttribute('aria-busy')).toBe('true');
  });

  it('error renders a danger notice and a secondary retry button only', async () => {
    const el = await mount('error');
    expect(present(el)).toEqual(['sk-button', 'sk-notice']);
    expect(el.shadowRoot?.querySelector('sk-notice')?.getAttribute('tone')).toBe('danger');
    expect(el.shadowRoot?.querySelector('sk-button')?.getAttribute('variant')).toBe('secondary');
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('error puts the message in the notice default slot and the retry button in its actions slot', async () => {
    const el = await mount('error', { errorMessage: 'Example failure.' });
    const notice = el.shadowRoot?.querySelector('sk-notice');
    expect(notice?.hasAttribute('message')).toBe(false);
    expect(notice?.textContent).toContain('Example failure.');
    const retry = notice?.querySelector('sk-button');
    expect(retry?.getAttribute('slot')).toBe('actions');
    expect(retry?.textContent?.trim()).toBe('Retry');
  });

  it('ready with a null mission renders the empty view', async () => {
    const el = await mount('ready', { mission: null });
    expect(present(el)).toEqual(['sk-notice']);
  });
});

describe('sk-mission-sample button labels', () => {
  it('every button shows visible slotted text (the default slot is the visible label)', async () => {
    const ready = await mount('ready', { mission: exampleMission });
    const error = await mount('error');
    for (const el of [ready, error]) {
      const button = el.shadowRoot?.querySelector('sk-button');
      expect(button?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('sk-mission-sample status indicator label', () => {
  it('loading shows visible slotted text inside sk-status-indicator', async () => {
    const el = await mount('loading');
    const indicator = el.shadowRoot?.querySelector('sk-status-indicator');
    expect(indicator?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});

describe('sk-mission-sample events', () => {
  it('open click emits exactly one composed, bubbling sk-open-mission with the slug', async () => {
    const seen = collect('sk-open-mission');
    const el = await mount('ready', { mission: exampleMission });
    el.shadowRoot?.querySelector<HTMLElement>('sk-button')?.click();
    expect(seen).toHaveLength(1);
    const event = seen[0] as CustomEvent;
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail, 'plant-unit-slug: detail.slug missing').toHaveProperty('slug');
    expect(event.detail.slug).toBe(exampleMission.slug);
  });

  it('the event map types the open detail without a cast', async () => {
    const el = await mount('ready', { mission: exampleMission });
    const slugs: string[] = [];
    el.addEventListener('sk-open-mission', (event) => slugs.push(event.detail.slug));
    el.shadowRoot?.querySelector<HTMLElement>('sk-button')?.click();
    expect(slugs).toEqual([exampleMission.slug]);
  });

  it('retry click emits exactly one composed, bubbling sk-mission-retry', async () => {
    const seen = collect('sk-mission-retry');
    const el = await mount('error');
    el.shadowRoot?.querySelector<HTMLElement>('sk-button')?.click();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
  });
});

describe('design-system definitions', () => {
  it.each(PRIMITIVES)('%s is defined', (tag) => {
    expect(customElements.get(tag)).toBeDefined();
  });
});

describe('registration contract', () => {
  it('evaluating the package entry a second time does not throw, while a raw second define does', async () => {
    const before = customElements.get('sk-mission-sample');
    expect(before).toBe(SkMissionSample);
    // Fresh module instance of index.ts (query string defeats the module cache): runs the guarded define again.
    const again = '../src/index.js?second-evaluation';
    await expect(import(/* @vite-ignore */ again)).resolves.toBeDefined();
    expect(customElements.get('sk-mission-sample')).toBe(before);
    // The failure mode the guard prevents: an unguarded second define of the same tag throws.
    class Another extends HTMLElement {}
    expect(() => customElements.define('sk-mission-sample', Another)).toThrow();
  });
});
