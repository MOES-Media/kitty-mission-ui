// FS-03 / R-18 "Copy protocol" on a real screen: a host whose copyText answers 'copied' twice. The controller sets
// copyResult = null, lets the view flush, then awaits the host. This test pins the observable sequence the element sees
// (null, copied, null, copied); it goes red when the controller's null step is removed. It does NOT prove that the
// afterRender = tick() flush is needed: replacing it by Promise.resolve() leaves the test green (Svelte's own flush
// microtask is queued first). That flush is verified by inspection only.
import { afterEach, describe, expect, it } from 'vitest';
import { destroyAll, mountAt, recordingHost, screenElement, settle } from './helpers';

afterEach(destroyAll);

/** The values with consecutive repeats removed: Svelte re-assigns an unchanged primitive when a sibling property changed. */
const distinct = (values: readonly unknown[]): unknown[] => values.filter((value, index) => index === 0 || value !== values[index - 1]);

/** Records every value assigned to a property of one element, starting from the value it holds now. */
function recordSets(element: HTMLElement, name: string): unknown[] {
  let descriptor: PropertyDescriptor | undefined;
  for (let proto: object | null = Object.getPrototypeOf(element); proto !== null && descriptor === undefined; proto = Object.getPrototypeOf(proto)) {
    descriptor = Object.getOwnPropertyDescriptor(proto, name);
  }
  if (descriptor?.get === undefined || descriptor.set === undefined) throw new Error(`${name} is not an accessor of the element`);
  const { get, set } = descriptor;
  const seen: unknown[] = [get.call(element)];
  Object.defineProperty(element, name, {
    configurable: true,
    get() {
      return get.call(this);
    },
    set(value: unknown) {
      seen.push(value);
      set.call(this, value);
    },
  });
  return seen;
}

describe('copy results reach the element each time (FS-03)', () => {
  it('copy: two consecutive copied answers are null, copied, null, copied on the Drift element', async () => {
    const host = recordingHost();
    const harness = await mountAt('/drift', { host });
    const drift = screenElement<HTMLElement & { copyResult: string | null }>(harness.shell, 'sk-drift-screen');
    const seen = recordSets(drift, 'copyResult');
    const copy = { text: 'sample command', missionId: 'sample', remedy: 'sample-remedy' };
    for (let press = 0; press < 2; press += 1) {
      drift.dispatchEvent(new CustomEvent('sk-copy-command', { detail: copy, bubbles: true, composed: true }));
      await settle(harness);
    }
    expect(host.count('copyText')).toBe(2);
    expect(distinct(seen)).toEqual([null, 'copied', null, 'copied']);
    expect(drift.copyResult).toBe('copied');
  });

  it('positive control: a host that answers manual after a copied shows manual', async () => {
    let answers: ('copied' | 'manual')[] = ['copied', 'manual'];
    const host = recordingHost({ copyText: () => Promise.resolve(answers.shift() ?? 'manual') });
    const harness = await mountAt('/drift', { host });
    const drift = screenElement<HTMLElement & { copyResult: string | null }>(harness.shell, 'sk-drift-screen');
    const seen = recordSets(drift, 'copyResult');
    for (let press = 0; press < 2; press += 1) {
      drift.dispatchEvent(new CustomEvent('sk-copy-command', { detail: { text: 'x', missionId: 'm', remedy: 'r' }, bubbles: true, composed: true }));
      await settle(harness);
    }
    answers = [];
    expect(distinct(seen)).toEqual([null, 'copied', null, 'manual']);
  });
});
