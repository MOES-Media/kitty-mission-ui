import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkFilterToggleGroup } from '../src/elements/sk-filter-toggle-group/sk-filter-toggle-group.js';
import { defaultOptions, groupLabel, longLabelOptions, syntheticOptions } from '../src/elements/sk-filter-toggle-group/fixtures.js';

beforeEach(async () => {
  await page.viewport(1024, 768);
});

afterEach(async () => {
  document.body.replaceChildren();
  await page.viewport(414, 896);
});

async function mount(props: Partial<SkFilterToggleGroup> = {}, host: HTMLElement = document.body): Promise<SkFilterToggleGroup> {
  const el = document.createElement('sk-filter-toggle-group');
  el.options = defaultOptions;
  el.value = 'all';
  el.label = groupLabel;
  Object.assign(el, props);
  host.append(el);
  await el.updateComplete;
  return el;
}

function buttons(el: SkFilterToggleGroup): HTMLButtonElement[] {
  return [...(el.shadowRoot?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
}

function pressedIds(el: SkFilterToggleGroup): string[] {
  return buttons(el)
    .map((b, i) => (b.getAttribute('aria-pressed') === 'true' ? (el.options[i]?.id ?? '?') : ''))
    .filter((id) => id !== '');
}

function button(el: SkFilterToggleGroup, label: string): HTMLButtonElement {
  const found = buttons(el).find((b) => b.textContent?.trim() === label);
  if (!found) throw new Error(`button ${label} missing`);
  return found;
}

function collect(target: EventTarget): CustomEvent<{ filter: string }>[] {
  const seen: CustomEvent<{ filter: string }>[] = [];
  target.addEventListener('sk-filter-change', (event) => seen.push(event as CustomEvent<{ filter: string }>));
  return seen;
}

describe('structure', () => {
  it('renders a named group with one native button per option in array order', async () => {
    const el = await mount();
    const group = el.shadowRoot?.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Mission status filter');
    const all = buttons(el);
    expect(all.length).toBe(6);
    expect(all.map((b) => b.textContent?.trim())).toEqual(defaultOptions.map((o) => o.label));
    expect(all.map((b) => b.type)).toEqual(Array(6).fill('button'));
    let checked = 0;
    for (const b of all) {
      expect(b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-pressed') === 'false').toBe(true);
      checked += 1;
    }
    expect(checked).toBe(6);
  });

  it('presses exactly the option whose id matches value', async () => {
    const el = await mount({ value: 'stale' });
    expect(pressedIds(el)).toEqual(['stale']);
    expect(buttons(el).filter((b) => b.getAttribute('aria-pressed') === 'false').length).toBe(5);
  });

  it('presses nothing for a value that matches no option', async () => {
    const el = await mount({ value: 'nonexistent' });
    expect(buttons(el).length).toBe(6);
    expect(pressedIds(el)).toEqual([]);
    expect(buttons(el).filter((b) => b.getAttribute('aria-pressed') === 'false').length).toBe(6);
  });

  it('takes its accessible name from the label property and reflects the value attribute', async () => {
    const el = await mount({ label: 'Pick one', value: 'done' });
    expect(el.shadowRoot?.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Pick one');
    expect(el.getAttribute('value')).toBe('done');
  });

  it('knows no vocabulary: options x, y, z render and press correctly', async () => {
    const el = await mount({ options: syntheticOptions, value: 'y' });
    expect(buttons(el).map((b) => b.textContent?.trim())).toEqual(['Option X', 'Option Y', 'Option Z']);
    expect(pressedIds(el)).toEqual(['y']);
    const events = collect(el);
    button(el, 'Option Z').click();
    await el.updateComplete;
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ filter: 'z' });
    expect(pressedIds(el)).toEqual(['z']);
  });
});

describe('event', () => {
  it('emits sk-filter-change once when another option is activated, and flips the state', async () => {
    const el = await mount();
    const events = collect(el);
    button(el, 'Stale').click();
    await el.updateComplete;
    expect(events.length).toBe(1);
    const event = events[0] as CustomEvent<{ filter: string }>;
    expect(event.detail).toEqual({ filter: 'stale' });
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(el.value).toBe('stale');
    expect(pressedIds(el)).toEqual(['stale']);
    expect(el.getAttribute('value')).toBe('stale');
  });

  it('emits nothing for the pressed option (positive control: a different option emits on the same listener)', async () => {
    const el = await mount({ value: 'active' });
    const events = collect(el);
    button(el, 'Active').click();
    await el.updateComplete;
    expect(events.length).toBe(0);
    expect(el.value).toBe('active');
    expect(pressedIds(el)).toEqual(['active']);
    button(el, 'Done').click();
    await el.updateComplete;
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ filter: 'done' });
  });

  it('emits nothing when the host assigns value (positive control)', async () => {
    const el = await mount();
    const events = collect(el);
    el.value = 'planned';
    await el.updateComplete;
    expect(events.length).toBe(0);
    expect(pressedIds(el)).toEqual(['planned']);
    el.setAttribute('value', 'done');
    await el.updateComplete;
    expect(events.length).toBe(0);
    expect(pressedIds(el)).toEqual(['done']);
    button(el, 'Stale').click();
    await el.updateComplete;
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ filter: 'stale' });
  });

  it('emits nothing for library events or other clicks inside the group (positive control)', async () => {
    const el = await mount();
    const events = collect(el);
    const group = el.shadowRoot?.querySelector<HTMLElement>('[role="group"]');
    group?.click();
    group?.dispatchEvent(new CustomEvent('sk-press', { bubbles: true, composed: true }));
    group?.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail: { filter: 'done' } }));
    await el.updateComplete;
    expect(events.length).toBe(0);
    expect(el.value).toBe('all');
    button(el, 'Done').click();
    expect(events.length).toBe(1);
  });

  it('crosses a shadow boundary: a listener on an outer host receives it', async () => {
    const outer = document.createElement('div');
    const shadow = outer.attachShadow({ mode: 'open' });
    document.body.append(outer);
    const el = await mount({}, shadow as unknown as HTMLElement);
    const atOuter = collect(outer);
    const atDocument = collect(document);
    button(el, 'Planned').click();
    expect(atOuter.length).toBe(1);
    expect(atDocument.length).toBe(1);
    expect(atOuter[0]?.detail).toEqual({ filter: 'planned' });
  });
});

describe('keyboard', () => {
  it('makes every option one tab stop in DOM order', async () => {
    const el = await mount();
    const all = buttons(el);
    expect(all.map((b) => b.tabIndex)).toEqual(Array(6).fill(0));
    await userEvent.tab();
    const visited: string[] = [];
    for (let i = 0; i < all.length; i += 1) {
      visited.push(el.shadowRoot?.activeElement?.textContent?.trim() ?? '');
      await userEvent.tab();
    }
    expect(visited).toEqual(defaultOptions.map((o) => o.label));
    expect(visited.length).toBe(6);
  });

  it('activates with Enter and with Space, one event each', async () => {
    const el = await mount();
    const events = collect(el);
    button(el, 'Active').focus();
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(events.length).toBe(1);
    expect(events[0]?.detail).toEqual({ filter: 'active' });
    button(el, 'Done').focus();
    await userEvent.keyboard(' ');
    await el.updateComplete;
    expect(events.length).toBe(2);
    expect(events[1]?.detail).toEqual({ filter: 'done' });
    expect(pressedIds(el)).toEqual(['done']);
  });

  it('shows a visible focus indicator on the focused option', async () => {
    const el = await mount();
    await userEvent.tab();
    const focused = el.shadowRoot?.activeElement as HTMLElement;
    expect(focused.textContent?.trim()).toBe('All');
    const style = getComputedStyle(focused);
    const visible = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
    const shadowed = style.boxShadow !== 'none';
    expect(visible || shadowed).toBe(true);
  });
});

describe('layout tiers', () => {
  async function overflow(width: number, options = defaultOptions): Promise<{ scroll: number; client: number; rows: number }> {
    await page.viewport(width, 768);
    const el = await mount({ options });
    const group = el.shadowRoot?.querySelector<HTMLElement>('[role="group"]') as HTMLElement;
    const rows = new Set(buttons(el).map((b) => Math.round(b.getBoundingClientRect().top))).size;
    return { scroll: Math.max(el.scrollWidth, group.scrollWidth), client: el.clientWidth, rows };
  }

  it('wraps onto several rows in a narrow container without overflow', async () => {
    await page.viewport(800, 768);
    const wrapper = document.createElement('div');
    wrapper.style.inlineSize = '320px';
    document.body.append(wrapper);
    const el = await mount({}, wrapper);
    const group = el.shadowRoot?.querySelector<HTMLElement>('[role="group"]') as HTMLElement;
    const rows = new Set(buttons(el).map((b) => Math.round(b.getBoundingClientRect().top))).size;
    expect(rows).toBeGreaterThan(1);
    expect(group.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
    expect(el.clientWidth).toBeLessThanOrEqual(320);
  });

  it('fits one row at 1024 px and does not overflow at 800 px or 414 px', async () => {
    const wide = await overflow(1024);
    expect(wide.rows).toBe(1);
    expect(wide.scroll).toBeLessThanOrEqual(wide.client);
    document.body.replaceChildren();
    const mid = await overflow(800);
    expect(mid.scroll).toBeLessThanOrEqual(mid.client);
    document.body.replaceChildren();
    const small = await overflow(414);
    expect(small.scroll).toBeLessThanOrEqual(small.client);
  });

  it('wraps long labels inside their buttons without overflow', async () => {
    const result = await overflow(414, longLabelOptions);
    expect(result.scroll).toBeLessThanOrEqual(result.client);
    expect(result.rows).toBe(3);
  });
});

describe('one joined segmented control (operator Storybook review, item 1)', () => {
  /** The pixel radius a token resolves to, read off a probe element. */
  function radiusOf(token: string): string {
    const probe = document.createElement('div');
    probe.style.borderTopLeftRadius = `var(${token})`;
    probe.style.width = '40px';
    probe.style.height = '40px';
    document.body.append(probe);
    const value = getComputedStyle(probe).borderTopLeftRadius;
    probe.remove();
    return value;
  }

  const corners = (b: HTMLElement): string[] => {
    const s = getComputedStyle(b);
    return [s.borderTopLeftRadius, s.borderBottomLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius];
  };

  it('only the first segment keeps the outer left corners and only the last keeps the outer right corners', async () => {
    const el = await mount();
    const all = buttons(el);
    const token = radiusOf('--sk-radius-sm');
    expect(token).not.toBe('0px');
    expect(corners(all[0] as HTMLElement)).toEqual([token, token, '0px', '0px']);
    for (const middle of all.slice(1, -1)) expect(corners(middle)).toEqual(['0px', '0px', '0px', '0px']);
    expect(corners(all[all.length - 1] as HTMLElement)).toEqual(['0px', '0px', token, token]);
  });

  it('the segments touch: no gap and no doubled border between neighbours', async () => {
    const el = await mount();
    const all = buttons(el);
    for (let i = 1; i < all.length; i += 1) {
      const previous = (all[i - 1] as HTMLElement).getBoundingClientRect();
      const next = (all[i] as HTMLElement).getBoundingClientRect();
      expect(Math.abs(next.left - previous.right), `gap before segment ${i}`).toBeLessThanOrEqual(0.5);
      expect(getComputedStyle(all[i] as HTMLElement).borderLeftWidth, `second edge of segment ${i}`).toBe('0px');
    }
    expect(getComputedStyle(all[0] as HTMLElement).borderLeftWidth).not.toBe('0px');
  });
});

describe('wrapped rows are each a rounded segmented group (operator Storybook review, item 1b)', () => {
  const radii = (b: HTMLElement): string => {
    const s = getComputedStyle(b);
    return [s.borderTopLeftRadius, s.borderBottomLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius].join(' ');
  };
  function token(): string {
    const probe = document.createElement('div');
    probe.style.borderTopLeftRadius = 'var(--sk-radius-sm)';
    probe.style.height = '40px';
    document.body.append(probe);
    const value = getComputedStyle(probe).borderTopLeftRadius;
    probe.remove();
    return value;
  }
  function rowsOf(el: SkFilterToggleGroup): HTMLButtonElement[][] {
    const rows: HTMLButtonElement[][] = [];
    let top = Number.NaN;
    for (const b of buttons(el)) {
      if (b.offsetTop !== top) {
        rows.push([]);
        top = b.offsetTop;
      }
      (rows[rows.length - 1] as HTMLButtonElement[]).push(b);
    }
    return rows;
  }
  function expectRowGroups(el: SkFilterToggleGroup): void {
    const t = token();
    const rows = rowsOf(el);
    for (const row of rows) {
      row.forEach((b, i) => {
        const left = i === 0 ? t : '0px';
        const right = i === row.length - 1 ? t : '0px';
        expect(radii(b), `${b.textContent?.trim()} (${rows.length} rows)`).toBe(`${left} ${left} ${right} ${right}`);
        expect(getComputedStyle(b).borderLeftWidth === '0px', `${b.textContent?.trim()} inner edge`).toBe(i !== 0);
      });
    }
  }
  const settled = async (): Promise<void> => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };

  it('at a narrow width every row rounds its own first and last segment; a segment alone on a row rounds both ends', async () => {
    await page.viewport(800, 768);
    const wrapper = document.createElement('div');
    wrapper.style.inlineSize = '320px';
    document.body.append(wrapper);
    const el = await mount({}, wrapper);
    await settled();
    expect(rowsOf(el).length).toBeGreaterThan(1);
    expectRowGroups(el);
    const lastRow = rowsOf(el).pop() as HTMLButtonElement[];
    const alone = lastRow[lastRow.length - 1] as HTMLButtonElement;
    expect(alone.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('at full width only the first and last are rounded; resizing back and forth keeps the rows right', async () => {
    await page.viewport(1024, 768);
    const wrapper = document.createElement('div');
    wrapper.style.inlineSize = '900px';
    document.body.append(wrapper);
    const el = await mount({}, wrapper);
    await settled();
    expect(rowsOf(el).length).toBe(1);
    expectRowGroups(el);
    wrapper.style.inlineSize = '320px';
    await settled();
    expect(rowsOf(el).length).toBeGreaterThan(1);
    expectRowGroups(el);
    wrapper.style.inlineSize = '900px';
    await settled();
    expect(rowsOf(el).length).toBe(1);
    expectRowGroups(el);
  });
});

// The library's segmented-choice sheet is what paints the buttons, so the wiring is asserted on
// computed style, not left to the visual baselines alone.
describe('the library sheet is adopted and paints the buttons', () => {
  it('a pressed segment is double-bordered and semibold, an unpressed one solid and normal, both with a pointer cursor', async () => {
    const el = await mount({ value: 'all' });
    const [pressed, plain] = [button(el, defaultOptions[0]?.label ?? ''), button(el, defaultOptions[1]?.label ?? '')];
    expect(pressed.getAttribute('aria-pressed')).toBe('true');
    expect(plain.getAttribute('aria-pressed')).toBe('false');
    const probe = document.createElement('div');
    document.body.append(probe);
    const weightOf = (token: string): string => {
      probe.style.fontWeight = `var(${token})`;
      return getComputedStyle(probe).fontWeight;
    };
    const on = getComputedStyle(pressed);
    const off = getComputedStyle(plain);
    expect(on.borderTopStyle).toBe('double');
    expect(off.borderTopStyle).toBe('solid');
    expect(on.fontWeight).toBe(weightOf('--sk-weight-semibold'));
    expect(off.fontWeight).toBe(weightOf('--sk-weight-normal'));
    expect(on.cursor).toBe('pointer');
    expect(off.cursor).toBe('pointer');
    probe.remove();
  });

  it('the focus ring is the library focus ring (token colour, solid), not the browser default', async () => {
    const el = await mount({ value: 'all' });
    await userEvent.tab();
    const ringed = el.shadowRoot?.activeElement;
    expect(ringed).toBeInstanceOf(HTMLButtonElement);
    const probe = document.createElement('div');
    probe.style.borderColor = 'var(--sk-border-focus)';
    probe.style.borderStyle = 'solid';
    document.body.append(probe);
    const focusColour = getComputedStyle(probe).borderTopColor;
    probe.remove();
    expect(getComputedStyle(ringed as Element).outlineColor).toBe(focusColour);
    expect(getComputedStyle(ringed as Element).outlineStyle).toBe('solid');
  });
});

