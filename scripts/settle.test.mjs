import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settleNested } from '../apps/storybook/tests/visual/settle.mjs';

// Minimal DOM stand-ins: an element has a tag, children it can query, and an optional shadow root.
function el(localName, { children = [], shadow = null, updateComplete = Promise.resolve(true) } = {}) {
  return {
    localName,
    shadowRoot: shadow,
    updateComplete,
    children,
    querySelectorAll() {
      const out = [];
      const walk = (n) => n.children.forEach((c) => { out.push(c); walk(c); });
      walk(this);
      return out;
    },
  };
}
const opts = (over = {}) => ({ whenDefined: async () => undefined, timeoutMs: 50, maxPasses: 10, ...over });

test('settles every nested custom element, shadow roots included', async () => {
  const inner = el('x-inner');
  const host = el('x-host', { shadow: el('shadow', { children: [inner] }) });
  const root = el('x-root', { children: [host, el('div')] });
  assert.equal(await settleNested(root, opts()), 3);
});

test('a never-resolving updateComplete rejects within the timeout and names the element', async () => {
  const hung = el('x-hung', { updateComplete: new Promise(() => {}) });
  const started = Date.now();
  await assert.rejects(settleNested(el('x-root', { children: [hung] }), opts()), /<x-hung> did not settle within 50 ms/);
  assert.ok(Date.now() - started < 1000, 'stopped promptly');
});

test('an element that never becomes defined rejects within the timeout', async () => {
  await assert.rejects(
    settleNested(el('x-root'), opts({ whenDefined: () => new Promise(() => {}) })),
    /<x-root> did not settle/,
  );
});

test('a tree that keeps producing new elements stops after maxPasses', async () => {
  const root = el('x-root');
  let created = 0;
  // every settled element adds a fresh child, so no pass is ever empty
  const whenDefined = async () => { created += 1; root.children.push(el(`x-new-${created}`)); };
  await assert.rejects(settleNested(root, opts({ whenDefined, maxPasses: 4 })), /after 4 passes/);
  assert.ok(created <= 5, `bounded, created ${created}`);
});
