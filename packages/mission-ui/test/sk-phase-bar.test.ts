import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { SkPhaseBar } from '../src/elements/sk-phase-bar/sk-phase-bar.js';
import {
  allPendingPhases,
  defaultPhases,
  sevenUnknownPhases,
  threeUnknownPhases,
} from '../src/elements/sk-phase-bar/fixtures.js';
import type { PhaseView } from '../src/contract/types.js';
import { PHASES_LABEL, PHASE_GLYPH, PHASE_STATUS_TEXT } from '../src/defaults/index.js';

async function mount(phases: PhaseView[], extra: Partial<SkPhaseBar> = {}): Promise<SkPhaseBar> {
  const el = document.createElement('sk-phase-bar');
  el.phases = phases;
  Object.assign(el, extra);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

function items(el: SkPhaseBar): HTMLLIElement[] {
  return [...(el.shadowRoot?.querySelectorAll('ol > li') ?? [])] as HTMLLIElement[];
}

function labelOf(li: HTMLLIElement): string {
  return li.querySelector('[data-phase-label]')?.textContent?.trim() ?? '';
}

function statusOf(li: HTMLLIElement): string {
  return li.querySelector('[data-phase-status]')?.textContent?.trim() ?? '';
}

function glyphOf(li: HTMLLIElement): string {
  return li.querySelector('sk-status-indicator [slot="marker"]')?.textContent?.trim() ?? '';
}

afterEach(async () => {
  document.body.replaceChildren();
  await page.viewport(414, 896);
});

describe('sk-phase-bar data-driven rendering', () => {
  it('renders the default five phases in array order with the default words', async () => {
    const el = await mount(defaultPhases);
    expect(items(el)).toHaveLength(5);
    expect(items(el).map(labelOf)).toEqual(['Specify', 'Plan', 'Tasks', 'Implement', 'Review']);
  });

  it('renders exactly 3 phases with unknown names, raw, in order', async () => {
    const el = await mount(threeUnknownPhases);
    expect(items(el)).toHaveLength(3);
    expect(items(el).map(labelOf)).toEqual(['discover', 'build', 'ship']);
  });

  it('renders exactly 7 phases with unknown names, raw, in order', async () => {
    const el = await mount(sevenUnknownPhases);
    expect(items(el)).toHaveLength(7);
    expect(items(el).map(labelOf)).toEqual(['discover', 'shape', 'prototype', 'build', 'verify', 'rollout', 'retire']);
  });

  it('keeps array order for a reversed list (no sorting by a known order)', async () => {
    const el = await mount([...defaultPhases].reverse());
    expect(items(el).map(labelOf)).toEqual(['Review', 'Implement', 'Tasks', 'Plan', 'Specify']);
  });

  it('empty phases renders an empty list', async () => {
    const el = await mount([]);
    expect(el.shadowRoot?.querySelectorAll('ol')).toHaveLength(1);
    expect(items(el)).toHaveLength(0);
  });

  it('7 phases lie inside the list box at 800 px (layout, not only the DOM count)', async () => {
    await page.viewport(800, 600);
    const el = await mount(sevenUnknownPhases);
    const list = el.shadowRoot?.querySelector('ol');
    const box = list?.getBoundingClientRect();
    expect(box).toBeDefined();
    const rows = items(el);
    expect(rows).toHaveLength(7);
    let checked = 0;
    for (const li of rows) {
      const r = li.getBoundingClientRect();
      expect(r.left, labelOf(li)).toBeGreaterThanOrEqual((box?.left ?? 0) - 0.5);
      expect(r.right, labelOf(li)).toBeLessThanOrEqual((box?.right ?? 0) + 0.5);
      checked += 1;
    }
    expect(checked).toBe(7);
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
  });
});

describe('sk-phase-bar labels', () => {
  it('uses the phase hook first, with the raw name as its argument', async () => {
    const seen: string[] = [];
    const el = await mount(threeUnknownPhases, {
      labels: {
        phase: (name: string) => {
          seen.push(name);
          return name === 'build' ? 'Building' : undefined;
        },
      },
    });
    expect(items(el).map(labelOf)).toEqual(['discover', 'Building', 'ship']);
    expect(seen).toEqual(['discover', 'build', 'ship']);
  });

  it('falls back to the default word without a hook and to the raw name for a name like constructor', async () => {
    const el = await mount([
      { name: 'plan', status: 'pending', basis: 'artifact' },
      { name: 'constructor', status: 'pending', basis: 'artifact' },
    ] as PhaseView[]);
    expect(items(el).map(labelOf)).toEqual(['Plan', 'constructor']);
  });
});

describe('sk-phase-bar states', () => {
  it('shows the glyph, tone and status text of each state from the tables', async () => {
    const el = await mount(defaultPhases);
    const rows = items(el);
    expect(rows.map(glyphOf)).toEqual([PHASE_GLYPH.done, PHASE_GLYPH.done, PHASE_GLYPH.done, PHASE_GLYPH.current, PHASE_GLYPH.pending]);
    expect(rows.map(statusOf)).toEqual([
      PHASE_STATUS_TEXT.done,
      PHASE_STATUS_TEXT.done,
      PHASE_STATUS_TEXT.done,
      PHASE_STATUS_TEXT.current,
      PHASE_STATUS_TEXT.pending,
    ]);
    expect(rows.map((li) => li.querySelector('sk-status-indicator')?.getAttribute('tone'))).toEqual([
      'success',
      'success',
      'success',
      'info',
      'neutral',
    ]);
  });

  it('renders an unknown status word as pending', async () => {
    const el = await mount(sevenUnknownPhases);
    const rollout = items(el)[5];
    expect(rollout).toBeDefined();
    expect(statusOf(rollout as HTMLLIElement)).toBe(PHASE_STATUS_TEXT.pending);
    expect(rollout?.querySelector('sk-status-indicator')?.getAttribute('tone')).toBe('neutral');
    expect(rollout?.hasAttribute('aria-current')).toBe(false);
  });

  it('marks aria-current="step" on the current item only, asserted on every item', async () => {
    const el = await mount(defaultPhases);
    const marked = items(el).map((li, index) => (li.getAttribute('aria-current') === 'step' ? index : -1)).filter((i) => i >= 0);
    expect(items(el)).toHaveLength(5);
    expect(marked).toEqual([3]);
    for (const [index, li] of items(el).entries()) {
      if (index !== 3) expect(li.hasAttribute('aria-current')).toBe(false);
    }
  });

  it('marks every in-progress phase current', async () => {
    const el = await mount([
      { name: 'a', status: 'in_progress', basis: 'artifact' },
      { name: 'b', status: 'complete', basis: 'artifact' },
      { name: 'c', status: 'in_progress', basis: 'artifact' },
    ] as PhaseView[]);
    const marked = items(el).map((li, index) => (li.getAttribute('aria-current') === 'step' ? index : -1)).filter((i) => i >= 0);
    expect(items(el)).toHaveLength(3);
    expect(marked).toEqual([0, 2]);
  });

  it('all pending: no item is current and every glyph is empty', async () => {
    const el = await mount(allPendingPhases);
    expect(items(el)).toHaveLength(5);
    expect(items(el).filter((li) => li.hasAttribute('aria-current'))).toHaveLength(0);
    expect(items(el).map(glyphOf)).toEqual(['', '', '', '', '']);
  });

  it('draws the connector between items, none after the last', async () => {
    const el = await mount(defaultPhases);
    const rows = items(el);
    expect(rows.map((li) => li.querySelector('[data-connector]') !== null)).toEqual([true, true, true, true, false]);
  });

  it('a foreign vocabulary (names and statuses) still renders every item as pending', async () => {
    const foreign = ['alpha', 'beta', 'gamma'].map((name) => ({ name, status: `x-${name}`, basis: 'artifact' })) as unknown as PhaseView[];
    const el = await mount(foreign);
    expect(items(el)).toHaveLength(3);
    expect(items(el).map(labelOf)).toEqual(['alpha', 'beta', 'gamma']);
    expect(items(el).map(statusOf)).toEqual(['pending', 'pending', 'pending']);
  });
});

describe('sk-phase-bar accessible names', () => {
  it('names the list by the default label and by the label property', async () => {
    const el = await mount(defaultPhases);
    expect(el.shadowRoot?.querySelector('ol')?.getAttribute('aria-label')).toBe(PHASES_LABEL);
    el.label = 'Steps';
    await el.updateComplete;
    expect(el.shadowRoot?.querySelector('ol')?.getAttribute('aria-label')).toBe('Steps');
  });

  it('reads as the phase name then its status word', async () => {
    const el = await mount(defaultPhases);
    const text = items(el).map((li) => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(text[0]).toContain('Specify');
    expect(text[0]).toContain('complete');
    expect(text[3]).toContain('Implement');
    expect(text[3]).toContain('in progress');
  });

  it('emits no event', async () => {
    const el = await mount(defaultPhases);
    const seen: Event[] = [];
    for (const type of ['click', 'sk-select-work-package', 'change']) el.addEventListener(type, (e) => seen.push(e));
    // positive control: a click on the host reaches the same listener
    el.click();
    expect(seen.map((e) => e.type)).toEqual(['click']);
    el.shadowRoot?.querySelector('ol')?.dispatchEvent(new Event('noop'));
    expect(seen).toHaveLength(1);
  });
});
