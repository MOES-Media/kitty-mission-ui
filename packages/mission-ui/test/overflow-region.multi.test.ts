// The named additive edit of `src/overflow-region.ts` (IC-06b, PLAN-FRESH3-001 (a)): several targets measured by one controller,
// an axis choice, and a per-target result. The single-target default is unchanged (its two present users keep their tests).
import { LitElement, html } from 'lit';
import { afterEach, describe, expect, it } from 'vitest';
import { OverflowRegion, type OverflowAxis } from '../src/overflow-region.js';

const settle = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

class MultiHost extends LitElement {
  readonly region: OverflowRegion;
  constructor(axis?: OverflowAxis) {
    super();
    this.region = new OverflowRegion(this, {
      target: () => this.renderRoot.querySelector('#a'),
      targets: () => Array.from(this.renderRoot.querySelectorAll('.box')),
      ...(axis === undefined ? {} : { axis }),
    });
  }
  protected override render() {
    return html`<style>.box { width: 100px; height: 50px; overflow: auto; display: block; } .w { width: 300px; height: 10px; } .t { width: 10px; height: 200px; }</style>
      <div class="box" id="a"><div id="a-in" style="width:20px;height:10px"></div></div>
      <div class="box" id="b"><div id="b-in" style="width:20px;height:10px"></div></div>`;
  }
}
let host: MultiHost | undefined;
customElements.define('sk-overflow-multi-host', MultiHost);

async function mount(axis?: OverflowAxis): Promise<MultiHost> {
  const el = new MultiHost(axis);
  host = el;
  document.body.append(el);
  await el.updateComplete;
  await settle();
  return el;
}
const box = (el: MultiHost, id: string): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>(`#${id}`)!;
const inner = (el: MultiHost, id: string): HTMLElement => el.shadowRoot!.querySelector<HTMLElement>(`#${id}-in`)!;
const flags = (el: MultiHost): boolean[] => el.region.results.map((r) => r.overflowing);

afterEach(() => {
  host?.remove();
  host = undefined;
});

describe('OverflowRegion with several targets', () => {
  it('reports one result per target, in order, and only the wide one is on', async () => {
    const el = await mount();
    expect(el.region.results).toHaveLength(2);
    expect(flags(el)).toEqual([false, false]);
    inner(el, 'b').style.width = '300px';
    await settle();
    expect(flags(el)).toEqual([false, true]);
    expect(el.region.overflowingTargets.has(box(el, 'b'))).toBe(true);
    expect(el.region.overflowingTargets.has(box(el, 'a'))).toBe(false);
  });

  it('flips on for content that grows inside a box of unchanged size, and off again when it shrinks (control: content that fits stays off)', async () => {
    const el = await mount();
    const before = box(el, 'a').getBoundingClientRect();
    inner(el, 'a').style.width = '90px';
    await settle();
    expect(flags(el)[0]).toBe(false);
    inner(el, 'a').style.width = '400px';
    await settle();
    const after = box(el, 'a').getBoundingClientRect();
    expect([after.width, after.height]).toEqual([before.width, before.height]);
    expect(flags(el)[0]).toBe(true);
    inner(el, 'a').style.width = '20px';
    await settle();
    expect(flags(el)[0]).toBe(false);
  });

  it('flips on for a child appended directly, with no host update (the mutation is seen)', async () => {
    const el = await mount();
    const wide = document.createElement('div');
    wide.style.width = '500px';
    wide.style.height = '5px';
    box(el, 'a').append(wide);
    await settle();
    expect(flags(el)[0]).toBe(true);
    const narrow = document.createElement('div');
    narrow.style.width = '5px';
    box(el, 'b').append(narrow);
    await settle();
    expect(flags(el)[1]).toBe(false);
    wide.remove();
    await settle();
    expect(flags(el)[0]).toBe(false);
  });

  it('measures horizontally by default: vertical overflow does not count; vertical and both count it', async () => {
    for (const [axis, expected] of [[undefined, false], ['horizontal', false], ['vertical', true], ['both', true]] as const) {
      const el = await mount(axis);
      inner(el, 'a').style.height = '300px';
      await settle();
      expect(flags(el)[0], String(axis)).toBe(expected);
      inner(el, 'a').style.height = '10px';
      inner(el, 'a').style.width = '300px';
      await settle();
      expect(flags(el)[0], `${String(axis)} horizontal`).toBe(axis !== 'vertical');
      el.remove();
    }
  });

  it('asks the host to update when a result changes and not otherwise', async () => {
    const el = await mount();
    let updates = 0;
    const original = el.requestUpdate.bind(el);
    el.requestUpdate = ((...args: Parameters<typeof original>) => {
      updates += 1;
      return original(...args);
    }) as typeof el.requestUpdate;
    el.region.measure();
    el.region.measure();
    expect(updates).toBe(0);
    inner(el, 'a').style.width = '400px';
    await settle();
    expect(updates).toBeGreaterThan(0);
  });

  it('keeps the single-target behaviour: `overflowing` follows the one target, horizontal only', async () => {
    class OneHost extends LitElement {
      region = new OverflowRegion(this, { target: () => this.renderRoot.querySelector('#one') });
      protected override render() {
        return html`<div id="one" style="width:100px;height:50px;overflow:auto"><div id="in" style="width:20px;height:300px"></div></div>`;
      }
    }
    customElements.define('sk-overflow-one-host', OneHost);
    const one = new OneHost();
    document.body.append(one);
    await one.updateComplete;
    await settle();
    expect(one.region.overflowing).toBe(false);
    one.shadowRoot!.querySelector<HTMLElement>('#in')!.style.width = '400px';
    one.shadowRoot!.querySelector<HTMLElement>('#one')!.dispatchEvent(new Event('scroll'));
    one.region.measure();
    expect(one.region.overflowing).toBe(true);
    one.remove();
  });
});
