// bindIntents on a bare node (plan IC-06, T029): a handler entry is bound once and forwards (tag, event, detail) to the
// controller; a `via` entry is never bound, so a nested pattern element's event is handled only through its host.
import { describe, expect, it } from 'vitest';
import { bindIntents } from '../../src/ui/bind-intents';
import { INTENT_TABLE, type HostingTag } from '../../src/intents/table';

type Table = Record<string, Record<string, unknown>>;
const table = INTENT_TABLE as unknown as Table;

function rig() {
  const calls: unknown[][] = [];
  return { calls, controller: { intent: (...args: unknown[]) => (calls.push(args), Promise.resolve()) } };
}

const fire = (node: Element, event: string, detail: unknown): void => {
  node.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
};

describe('bindIntents binds handler entries and skips via entries', () => {
  for (const [tag, events] of Object.entries(table)) {
    it(`binds ${tag} by its own entries`, () => {
      const { calls, controller } = rig();
      const node = document.createElement('div');
      const action = bindIntents(node, { tag: tag as HostingTag, controller });
      let handled = 0;
      for (const [event, entry] of Object.entries(events)) {
        const detail = { probe: `${tag} ${event}` };
        const before = calls.length;
        fire(node, event, detail);
        if (typeof entry === 'function') {
          handled += 1;
          expect(calls.slice(before), `${tag} ${event} is bound once`).toEqual([[tag, event, detail]]);
        } else {
          expect(calls.slice(before), `${tag} ${event} is a via entry and is not bound`).toEqual([]);
        }
      }
      action.destroy();
      // After destroy no listener remains (positive control: the same events reached the controller before).
      const before = calls.length;
      for (const event of Object.keys(events)) fire(node, event, {});
      expect(calls.length).toBe(before);
      expect(handled).toBe(Object.values(events).filter((entry) => typeof entry === 'function').length);
    });
  }

  it('the table has handler entries and via entries, so both branches are exercised', () => {
    const entries = Object.values(table).flatMap((events) => Object.values(events));
    expect(entries.filter((entry) => typeof entry === 'function').length).toBe(35);
    expect(entries.filter((entry) => typeof entry === 'object').length).toBe(5);
  });

  it('update re-binds to a new tag and releases the old listeners', () => {
    const { calls, controller } = rig();
    const node = document.createElement('div');
    const action = bindIntents(node, { tag: 'sk-ops-screen', controller });
    fire(node, 'sk-load-more', { cursor: 'a' });
    expect(calls.length).toBe(1);
    action.update({ tag: 'sk-projects-screen', controller });
    fire(node, 'sk-load-more', { cursor: 'b' });
    expect(calls.length).toBe(1);
    fire(node, 'sk-request-open-project', null);
    expect(calls.length).toBe(2);
    action.destroy();
  });
});
